# Deployment Guide — Skillset Landing Pages

Как публиковать лендинги из этого репозитория на Webflow.

---

## Обзор архитектуры

Каждый лендинг — **автономный HTML-файл** (CSS + JS внутри). Лендинг публикуется на Webflow как **отдельная страница** с кастомным кодом (page-specific Head + Body), а **НЕ** через site-wide код.

- **Webflow Designer** → Pages → New Page → Settings → Custom Code
- **Head**: весь блок `<style>` + подключение шрифта
- **Body**: весь HTML от `<body>` до `</body>` + `<script>`

---

## Быстрый деплой (через скрипт)

### Шаг 1: Подготовка

```bash
cd skillset-landing-pages
./scripts/prepare-chunks.sh landings/ai-recruiter/index.html
```

Скрипт:
1. Извлекает Head (CSS + шрифт) и Body (HTML + JS) из index.html
2. Минифицирует код (если установлен `html-minifier-terser`)
3. Разбивает на base64-чанки по 4 KB
4. Генерирует готовые JS-файлы для каждого `browser_evaluate`
5. Выводит пошаговую инструкцию

Пример вывода:
```
Head JS #1: /tmp/wf_inject_head_1.js (5336 b64 chars)
Head JS #2: /tmp/wf_inject_head_2.js (5336 b64 chars)
Head JS #3: /tmp/wf_inject_head_3.js (4008 b64 chars)
Head FINAL: /tmp/wf_inject_head_final.js
Body JS #1: /tmp/wf_inject_body_1.js (5336 b64 chars)
Body JS #2: /tmp/wf_inject_body_2.js (5336 b64 chars)
Body JS #3: /tmp/wf_inject_body_3.js (5100 b64 chars)
Body FINAL: /tmp/wf_inject_body_final.js

Всего browser_evaluate вызовов: 8
```

### Шаг 2: Webflow Designer

1. Открыть Webflow Designer: `browser_navigate → https://webflow.com/dashboard`
2. Перейти на сайт "Skillset Landing Page" (ID: `684002a63d872da986e15d46`)
3. Pages → "+" → New Page → задать slug → Page Settings → Custom Code

### Шаг 3: Инъекция (Claude читает готовые JS-файлы)

Claude должен **прочитать каждый файл** из `/tmp/wf_inject_*.js` и выполнить его содержимое через `browser_evaluate`:

```
1. Прочитать и выполнить /tmp/wf_inject_head_1.js
2. Прочитать и выполнить /tmp/wf_inject_head_2.js
3. Прочитать и выполнить /tmp/wf_inject_head_3.js
4. Прочитать и выполнить /tmp/wf_inject_head_final.js
5. Прочитать и выполнить /tmp/wf_inject_body_1.js
6. Прочитать и выполнить /tmp/wf_inject_body_2.js
7. Прочитать и выполнить /tmp/wf_inject_body_3.js
8. Прочитать и выполнить /tmp/wf_inject_body_final.js
```

### Шаг 4: Публикация

1. Нажать Create/Save в page settings
2. Publish → выбрать все домены → Publish
3. **ПРОВЕРИТЬ**, что homepage (/) не затронут!

---

## Зачем нужен Base64 и чанкинг?

### Проблема

Playwright MCP (browser_evaluate) передаёт JavaScript-код как строковый параметр. Если HTML содержит кавычки (`"`, `'`), переносы строк, обратные слеши — они ломают синтаксис JS.

### Решение: Base64

**Base64** — это кодировка, которая превращает любые данные в безопасный набор из 64 символов: `A-Z`, `a-z`, `0-9`, `+`, `/`, `=`. Никаких кавычек или спецсимволов!

```
Исходный HTML: <div class="hello">It's "great"</div>
Base64:        PGRpdiBjbGFzcz0iaGVsbG8iPkl0J3MgImdyZWF0IjwvZGl2Pg==
```

В браузере `atob()` декодирует обратно.

### Проблема: размер

Base64 увеличивает данные на ~33%. Наш body (12 KB) → 16 KB base64. А `browser_evaluate` имеет практический лимит ~5-6 KB на вызов.

### Решение: Chunking

1. **Разбиваем сырой текст** (до кодирования!) на куски по 4 KB
2. Кодируем каждый кусок в base64 отдельно (~5.3 KB каждый — влезает в лимит)
3. Передаём каждый чанк отдельным `browser_evaluate` вызовом
4. В финальном вызове собираем куски обратно

**Важно**: нельзя сначала закодировать всё, потом разрезать base64 строку. Padding-символы `=` в середине строки ломают `atob()`.

### Почему это медленно?

| Причина | Влияние |
|---------|---------|
| Каждый чанк = отдельный API round-trip (LLM → MCP → браузер → MCP → LLM) | ~3-5 сек на чанк |
| LLM генерирует и читает base64 текст (~5 KB) как часть своего ответа | Много output-токенов |
| 8 вызовов × ~5 KB = ~40 KB текста проходит через LLM | Основная стоимость |

---

## Оптимизация: как ускорить/удешевить

### 1. Скрипт prepare-chunks.sh (уже сделано)

Экономит: **~50% токенов**, потому что Claude не генерирует base64 вручную, а просто читает готовые файлы.

### 2. Минификация HTML/CSS

```bash
npm install -g html-minifier-terser
```

Скрипт автоматически минифицирует, если инструмент установлен. Обычно -30-50% размера → меньше чанков.

### 3. Fetch с GitHub Raw (перспективно)

Вместо base64 инъекции, загружать код прямо из GitHub:

```js
// Один вызов browser_evaluate:
var resp = await fetch('https://raw.githubusercontent.com/kobzevvv/skillset-landing-pages/master/landings/ai-recruiter/index.html');
var html = await resp.text();
// Извлечь head/body и установить в CodeMirror
var bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
document.querySelectorAll('.CodeMirror')[1].CodeMirror.setValue(bodyMatch[1]);
```

Плюсы: нет base64, нет чанков, **1-2 вызова вместо 8**.
Минусы: репо должен быть публичным (наш — публичный).

### 4. gzip + DecompressionStream

```bash
# На стороне подготовки
gzip -c body.txt | base64 > body.gz.b64
```

```js
// В браузере
var compressed = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
var ds = new DecompressionStream('gzip');
// ... async decode
```

Экономия ~70% на размере, но async-код сложнее.

---

## Что работает

- **Page-specific Custom Code** — надёжный способ размещения лендинга
- **Base64 chunking** через `prepare-chunks.sh` — автоматизированный процесс
- **CSS namespace `sklst-`** — полностью изолирует стили от Webflow
- **IntersectionObserver** в `<script>` — fade-in анимации работают корректно

## Что НЕ работает

| Метод | Почему не работает |
|-------|--------------------|
| `require('fs')` в browser_evaluate | Sandbox Playwright MCP не поддерживает Node.js модули |
| `import('fs')` (dynamic) | `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING` — заблокировано в sandbox |
| Одна большая base64 строка (~16 KB) | Превышает лимит browser_evaluate |
| Конкатенация двух base64 строк | `InvalidCharacterError` — padding `=` ломают `atob()`. Разбивать **сырой текст** |
| Site-wide Custom Code | Заменяет контент **всех** страниц, включая homepage. **ЗАПРЕЩЕНО!** |
| Webflow REST API v2 (pages) | API не поддерживает создание страниц. Только скрипты и публикация |

---

## Чеклист перед публикацией

- [ ] Лендинг работает локально (открыть index.html в браузере)
- [ ] Проверен на GitHub Pages (ссылка ниже)
- [ ] Все классы с префиксом `sklst-`
- [ ] Ссылки ведут на `app.skillset.ae/signup`
- [ ] Slug задан правильно (соответствует рекламной кампании)
- [ ] `prepare-chunks.sh` отработал без ошибок
- [ ] **Homepage (/) НЕ затронут** — проверить после публикации!
- [ ] Оба домена работают (sklst.ai и skillset.ae)

---

## GitHub Pages Preview

Все лендинги доступны для превью через GitHub Pages **до** публикации на Webflow:

```
https://kobzevvv.github.io/skillset-landing-pages/landings/ai-recruiter/index.html
```

Workflow: правки в GitHub → проверка на Pages → `prepare-chunks.sh` → деплой на Webflow.
