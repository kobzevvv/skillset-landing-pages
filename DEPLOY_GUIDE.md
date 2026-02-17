# Deployment Guide — Skillset Landing Pages

Как публиковать лендинги из этого репозитория на Webflow.

---

## Обзор архитектуры

Каждый лендинг — **автономный HTML-файл** (CSS + JS внутри). Лендинг публикуется на Webflow как **отдельная страница** с кастомным кодом (page-specific Head + Body), а **НЕ** через site-wide код.

- **Webflow Designer** → Pages → New Page → Settings → Custom Code
- **Head**: весь блок `<style>` + подключение шрифта
- **Body**: весь HTML (`<div class="sklst-root">...</div>`) + `<script>`

---

## Пошаговый процесс (через Playwright MCP)

### 1. Подготовка кода

Из файла `index.html` нужно извлечь два блока:

**Head code** (вставляется в Head):
```
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap" rel="stylesheet">
<style>
  /* весь CSS из <style> тега */
</style>
```

**Body code** (вставляется в Body):
```
<div class="sklst-root">
  <!-- весь HTML контент -->
</div>
<script>
  /* весь JS */
</script>
```

### 2. Открыть Webflow Designer

```
browser_navigate → https://webflow.com/dashboard
```

Перейти на сайт "Skillset Landing Page" (ID: `684002a63d872da986e15d46`).

### 3. Создать страницу

1. Открыть Pages panel (левая панель)
2. Нажать "+" → New Page
3. Задать slug (например `ai-recruiter`)
4. Открыть Page Settings → Custom Code

### 4. Инъекция Head-кода

Head-код обычно небольшой (~2-3 KB) и вставляется напрямую:

```js
// Находим первый CodeMirror (Head)
var cm = document.querySelectorAll('.CodeMirror')[0].CodeMirror;
cm.setValue(`<link href="..." rel="stylesheet">\n<style>...</style>`);
```

### 5. Инъекция Body-кода (Base64 chunking)

Body-код обычно 10-15 KB — это слишком много для одного вызова `browser_evaluate`. Решение: **Base64 + chunking**.

#### Почему нужен Base64?

Playwright MCP передаёт JS-код как строковый параметр. Если HTML содержит кавычки, переносы строк, спецсимволы — они ломают синтаксис JS-строки. **Base64** кодирует любые данные в безопасный набор символов `A-Za-z0-9+/=`.

#### Почему нужен chunking?

Base64 добавляет ~33% к размеру. Для 12 KB HTML получается ~16 KB base64. `browser_evaluate` имеет практический лимит ~5-6 KB на вызов. Поэтому данные разбиваются на чанки.

#### Алгоритм:

```bash
# 1. Сохранить body-код в файл
# /tmp/wf_page_body.txt

# 2. Разбить на чанки по 4000 байт RAW (до кодирования!)
split -b 4000 /tmp/wf_page_body.txt /tmp/wf_bchunk_

# 3. Закодировать каждый чанк в base64
for f in /tmp/wf_bchunk_*; do base64 -i "$f" > "${f}.b64"; done
```

```js
// 4. Инъекция чанков (каждый отдельным browser_evaluate)
window._c1 = atob("PGRpdiBjbGFzcz0i...");  // chunk 1
window._c2 = atob("bGluZWNhcD0icm91...");  // chunk 2
window._c3 = atob("ICAgPGxpPjxzcGFu...");  // chunk 3

// 5. Сборка и установка в CodeMirror
var body = window._c1 + window._c2 + window._c3;
var cm = document.querySelectorAll('.CodeMirror')[1].CodeMirror;
cm.setValue(body);
delete window._c1; delete window._c2; delete window._c3;
```

### 6. Сохранить и опубликовать

```js
// Нажать кнопку Create / Save в page settings
// Затем Publish → выбрать домены → Publish
```

---

## Что работает

- **Page-specific Custom Code** — надёжный способ размещения лендинга
- **Base64 chunking** — единственный рабочий метод для передачи больших HTML через Playwright MCP
- **CSS namespace `sklst-`** — полностью изолирует стили от Webflow
- **IntersectionObserver** в `<script>` — fade-in анимации работают корректно

## Что НЕ работает

| Метод | Почему не работает |
|-------|--------------------|
| `require('fs')` в browser_evaluate | Sandbox Playwright MCP не поддерживает Node.js модули |
| `import('fs')` (dynamic) | `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING` — заблокировано в sandbox |
| Одна большая base64 строка (~16 KB) | Превышает лимит browser_evaluate |
| Конкатенация двух base64 строк | `InvalidCharacterError` — padding-символы `=` ломают `atob()`. Нужно разбивать **сырой текст**, а не base64 |
| Site-wide Custom Code | Заменяет контент **всех** страниц, включая homepage. **ЗАПРЕЩЕНО!** |
| Webflow REST API v2 (pages) | API не поддерживает создание страниц. Только скрипты и публикация |

---

## Узкие места и оптимизация

### Почему деплой медленный?

1. **Лимит browser_evaluate**: ~5 KB на вызов → для 12 KB body нужно 3+ вызова
2. **Base64 overhead**: +33% к размеру данных
3. **Сериальность**: каждый чанк — отдельный API round-trip через MCP
4. **CodeMirror**: Webflow использует CodeMirror, нужно через его API

### Возможные ускорения

| Подход | Экономия | Сложность |
|--------|----------|-----------|
| **Минификация HTML/CSS** перед base64 | 30-50% меньше байт → меньше чанков | Низкая |
| **gzip → base64** с декодированием через `DecompressionStream` | ~70% меньше, но нужен async decode в браузере | Средняя |
| **Clipboard API** через Playwright | Без лимитов на размер, но нужна поддержка paste в CodeMirror | Средняя |
| **Прямой URL fetch** в браузере | Загрузить файл с GitHub raw → без base64 вообще | Низкая |
| **Page.evaluate с file** (если MCP обновится) | Нативная передача больших данных | Зависит от MCP |

#### Рекомендуемый подход: Fetch с GitHub Raw

Самый перспективный вариант — загрузка кода напрямую из GitHub:

```js
// В browser_evaluate:
var resp = await fetch('https://raw.githubusercontent.com/kobzevvv/skillset-landing-pages/master/landings/ai-recruiter/index.html');
var html = await resp.text();
// Извлечь body-часть и вставить в CodeMirror
```

Плюсы: нет лимита на размер, нет base64 overhead, один вызов вместо трёх.
Минус: нужен публичный репозиторий (у нас он публичный).

#### Минификация (быстрый выигрыш)

```bash
# Установить
npm install -g html-minifier-terser

# Минифицировать
html-minifier-terser --collapse-whitespace --remove-comments \
  --minify-css true --minify-js true \
  landings/ai-recruiter/index.html -o /tmp/min.html
```

Обычно уменьшает HTML на 30-50%, что может уложить body в 2 чанка вместо 3.

---

## Чеклист перед публикацией

- [ ] Лендинг работает локально (открыть index.html в браузере)
- [ ] Все классы с префиксом `sklst-`
- [ ] Ссылки ведут на `app.skillset.ae/signup`
- [ ] Slug задан правильно (соответствует рекламной кампании)
- [ ] **Homepage (/) НЕ затронут** — проверить после публикации!
- [ ] Оба домена работают (sklst.ai и skillset.ae)

---

## GitHub Pages Preview

Все лендинги доступны для просмотра через GitHub Pages:

```
https://kobzevvv.github.io/skillset-landing-pages/landings/ai-recruiter/index.html
```

Используй для проверки и полировки **до** публикации на Webflow.
