#!/bin/bash
# prepare-chunks.sh — подготовка HTML для инъекции в Webflow через Playwright MCP
#
# Использование:
#   ./scripts/prepare-chunks.sh landings/ai-recruiter/index.html
#
# Результат:
#   /tmp/wf_head_code.txt       — код для Head CodeMirror (CSS + шрифт)
#   /tmp/wf_page_body.txt       — код для Body CodeMirror (HTML + JS)
#   /tmp/wf_bchunk_*.b64        — base64-чанки для поэтапной инъекции
#   /tmp/wf_inject_head.js      — JS для инъекции Head (один вызов)
#   /tmp/wf_inject_body_N.js    — JS для инъекции Body (по чанкам)
#   /tmp/wf_inject_body_final.js — JS для финальной сборки чанков

set -euo pipefail

INPUT="${1:?Укажи путь к index.html}"

if [ ! -f "$INPUT" ]; then
  echo "Файл не найден: $INPUT"
  exit 1
fi

echo "=== Подготовка: $INPUT ==="
echo ""

# --- Извлечение Head (от <link до </style>) ---
HEAD_CODE=$(sed -n '/<link.*fontshare/,/<\/style>/p' "$INPUT")
printf '%s\n' "$HEAD_CODE" > /tmp/wf_head_code.txt
HEAD_SIZE=$(wc -c < /tmp/wf_head_code.txt | tr -d ' ')
echo "Head code: ${HEAD_SIZE} bytes → /tmp/wf_head_code.txt"

# --- Извлечение Body (всё между <body> и </body>) ---
# Используем awk для надёжного многострочного извлечения
awk '/<body>/{found=1; next} /<\/body>/{found=0} found' "$INPUT" > /tmp/wf_page_body.txt
BODY_SIZE=$(wc -c < /tmp/wf_page_body.txt | tr -d ' ')
echo "Body code: ${BODY_SIZE} bytes → /tmp/wf_page_body.txt"

if [ "$BODY_SIZE" -lt 10 ]; then
  echo "ОШИБКА: Body слишком маленький (${BODY_SIZE} bytes). Проверь формат HTML."
  exit 1
fi

# --- Минификация (опционально) ---
BODY_FILE="/tmp/wf_page_body.txt"
if command -v html-minifier-terser &>/dev/null; then
  echo "<html><body>" > /tmp/wf_body_wrap.html
  cat /tmp/wf_page_body.txt >> /tmp/wf_body_wrap.html
  echo "</body></html>" >> /tmp/wf_body_wrap.html
  if html-minifier-terser \
    --collapse-whitespace \
    --remove-comments \
    --minify-css true \
    --minify-js true \
    /tmp/wf_body_wrap.html 2>/dev/null | \
    sed 's/^<html><body>//;s/<\/body><\/html>$//' > /tmp/wf_page_body_min.txt; then
    MIN_SIZE=$(wc -c < /tmp/wf_page_body_min.txt | tr -d ' ')
    if [ "$MIN_SIZE" -gt 10 ]; then
      echo "Minified:  ${MIN_SIZE} bytes ($(( 100 - MIN_SIZE * 100 / BODY_SIZE ))% reduction)"
      BODY_FILE="/tmp/wf_page_body_min.txt"
    fi
  fi
else
  echo "(html-minifier-terser не установлен — 'npm i -g html-minifier-terser' для ~40% экономии)"
fi

# --- Разбиение на base64 чанки ---
CHUNK_SIZE=4000
rm -f /tmp/wf_bchunk_*

split -b $CHUNK_SIZE "$BODY_FILE" /tmp/wf_bchunk_
CHUNKS=(/tmp/wf_bchunk_*)
NUM_CHUNKS=${#CHUNKS[@]}

echo ""
echo "--- Чанки ---"
echo "Чанков: ${NUM_CHUNKS} (по ${CHUNK_SIZE} bytes сырого текста)"

for f in "${CHUNKS[@]}"; do
  base64 -i "$f" | tr -d '\n' > "${f}.b64"
done

# --- Head injection JS ---
HEAD_B64=$(base64 -i /tmp/wf_head_code.txt | tr -d '\n')
HEAD_B64_LEN=${#HEAD_B64}

if [ "$HEAD_B64_LEN" -le 6000 ]; then
  cat > /tmp/wf_inject_head.js <<HEADEOF
var head = atob('${HEAD_B64}');
var cm = document.querySelectorAll('.CodeMirror')[0].CodeMirror;
cm.setValue(head);
head.length + ' bytes set in Head';
HEADEOF
  echo "Head JS:   /tmp/wf_inject_head.js (один вызов, ${HEAD_B64_LEN} b64 chars)"
  HEAD_STEPS=1
else
  # Head тоже нужен chunking
  rm -f /tmp/wf_hchunk_*
  split -b $CHUNK_SIZE /tmp/wf_head_code.txt /tmp/wf_hchunk_
  HCHUNKS=(/tmp/wf_hchunk_*)
  NUM_HCHUNKS=${#HCHUNKS[@]}
  hi=1
  for hf in "${HCHUNKS[@]}"; do
    HB64=$(base64 -i "$hf" | tr -d '\n')
    HB64_LEN=${#HB64}
    cat > "/tmp/wf_inject_head_${hi}.js" <<HCHUNKEOF
window._h${hi} = atob('${HB64}');
'head chunk ${hi}/${NUM_HCHUNKS}: ' + window._h${hi}.length + ' bytes decoded';
HCHUNKEOF
    echo "Head JS #${hi}: /tmp/wf_inject_head_${hi}.js (${HB64_LEN} b64 chars)"
    hi=$((hi + 1))
  done
  # Head final assembly
  HFINAL="var head = "
  for ((hj=1; hj<=NUM_HCHUNKS; hj++)); do
    [ $hj -gt 1 ] && HFINAL+=" + "
    HFINAL+="window._h${hj}"
  done
  HFINAL+=";\n"
  HFINAL+="document.querySelectorAll('.CodeMirror')[0].CodeMirror.setValue(head);\n"
  for ((hj=1; hj<=NUM_HCHUNKS; hj++)); do
    HFINAL+="delete window._h${hj};\n"
  done
  HFINAL+="'OK: ' + head.length + ' bytes injected into Head';"
  printf "$HFINAL" > /tmp/wf_inject_head_final.js
  echo "Head FINAL: /tmp/wf_inject_head_final.js (сборка и установка)"
  HEAD_STEPS=$((NUM_HCHUNKS + 1))
fi

# --- Body injection JS (по чанкам) ---
i=1
for f in "${CHUNKS[@]}"; do
  B64=$(cat "${f}.b64")
  B64_LEN=${#B64}
  cat > "/tmp/wf_inject_body_${i}.js" <<CHUNKEOF
window._c${i} = atob('${B64}');
'chunk ${i}/${NUM_CHUNKS}: ' + window._c${i}.length + ' bytes decoded';
CHUNKEOF
  echo "Body JS #${i}: /tmp/wf_inject_body_${i}.js (${B64_LEN} b64 chars)"
  i=$((i + 1))
done

# --- Финальная сборка ---
FINAL="var body = "
for ((j=1; j<=NUM_CHUNKS; j++)); do
  [ $j -gt 1 ] && FINAL+=" + "
  FINAL+="window._c${j}"
done
FINAL+=";\n"
FINAL+="document.querySelectorAll('.CodeMirror')[1].CodeMirror.setValue(body);\n"
for ((j=1; j<=NUM_CHUNKS; j++)); do
  FINAL+="delete window._c${j};\n"
done
FINAL+="'OK: ' + body.length + ' bytes injected into Body';"

printf "$FINAL" > /tmp/wf_inject_body_final.js
echo "Body FINAL: /tmp/wf_inject_body_final.js (сборка и установка)"

# --- Сводка ---
echo ""
echo "========================================="
echo "ГОТОВО! Инструкция для Claude:"
echo "========================================="
echo ""
STEP=1
echo "1. Открой Webflow Designer → Page Settings → Custom Code"
STEP=2
if [ "${HEAD_STEPS:-1}" -eq 1 ]; then
  echo "${STEP}. browser_evaluate с /tmp/wf_inject_head.js"
  STEP=$((STEP + 1))
else
  for ((hj=1; hj<=NUM_HCHUNKS; hj++)); do
    echo "${STEP}. browser_evaluate с /tmp/wf_inject_head_${hj}.js"
    STEP=$((STEP + 1))
  done
  echo "${STEP}. browser_evaluate с /tmp/wf_inject_head_final.js"
  STEP=$((STEP + 1))
fi
for ((j=1; j<=NUM_CHUNKS; j++)); do
  echo "${STEP}. browser_evaluate с /tmp/wf_inject_body_${j}.js"
  STEP=$((STEP + 1))
done
echo "${STEP}. browser_evaluate с /tmp/wf_inject_body_final.js"
STEP=$((STEP + 1))
echo "${STEP}. Нажми Create/Save, затем Publish"
echo ""
TOTAL_CALLS=$((HEAD_STEPS + NUM_CHUNKS + 1))
echo "Всего browser_evaluate вызовов: ${TOTAL_CALLS}"
echo "========================================="
