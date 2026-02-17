# Deployment Guide — Skillset Landing Pages

Как публиковать лендинги из этого репозитория на Webflow.

---

## Обзор архитектуры

Каждый лендинг — **автономный HTML-файл** (CSS + JS внутри). Лендинг публикуется на Webflow как **отдельная страница** с кастомным кодом (page-specific Head + Body), а **НЕ** через site-wide код.

- **Webflow Designer** → Pages → New Page → Settings → Custom Code
- **Head**: весь блок `<style>` + подключение шрифта
- **Body**: весь HTML от `<body>` до `</body>` + `<script>`

---

## Два метода деплоя

| | Метод 1: GitHub Fetch | Метод 2: Base64 Chunking |
|---|---|---|
| **Скрипт** | `scripts/deploy-via-fetch.js` | `scripts/prepare-chunks.sh` |
| **Скорость** | ~3 секунды, 1-2 вызова | ~30 секунд, 8+ вызовов |
| **Стоимость** | Минимальная | Высокая (base64 через LLM) |
| **Требования** | Публичный GitHub-репо | Только локальные файлы |
| **Когда использовать** | Всегда (основной метод) | Если GitHub недоступен |

---

## Метод 1: GitHub Fetch (основной)

Самый быстрый и дешёвый способ. Браузер сам загружает HTML из GitHub Raw, парсит его и вставляет в CodeMirror.

### Подготовка

1. Код должен быть запушен в GitHub
2. Репозиторий должен быть публичным
3. Webflow Designer открыт на нужной странице → Page Settings → Custom Code

### Деплой за 1 вызов

Claude выполняет **один** `browser_evaluate`:

```js
(async()=>{
  var r = await fetch('https://raw.githubusercontent.com/kobzevvv/skillset-landing-pages/master/landings/PAGE_NAME/index.html');
  var h = await r.text();
  var hm = h.match(/(<link[^>]*fontshare[\s\S]*?<\/style>)/);
  var bm = h.match(/<body[^>]*>([\s\S]*)<\/body>/);
  var c = document.querySelectorAll('.CodeMirror');
  c[0].CodeMirror.setValue(hm[1]);
  c[1].CodeMirror.setValue(bm[1].trim());
  return 'OK: head=' + hm[1].length + ' body=' + bm[1].trim().length;
})()
```

Замени `PAGE_NAME` на slug лендинга (`ai-recruiter`, `resume-screening`, `compare`, и т.д.)

### Полный процесс

1. Запушить код в GitHub
2. Открыть Webflow Designer → создать новую страницу → задать slug
3. Page Settings → Custom Code
4. Выполнить `browser_evaluate` с JS выше (подставив PAGE_NAME)
5. Нажать Create/Save → Publish
6. **Проверить**, что homepage (/) не затронут!

### Подробный скрипт

Полная версия с обработкой ошибок: `scripts/deploy-via-fetch.js`

---

## Метод 2: Base64 Chunking (запасной)

Используй если GitHub недоступен из Webflow (блокировка, приватный репо, сетевые проблемы).

### Подготовка

```bash
./scripts/prepare-chunks.sh landings/ai-recruiter/index.html
```

Скрипт:
1. Извлекает Head (CSS + шрифт) и Body (HTML + JS)
2. Минифицирует код (если установлен `html-minifier-terser`)
3. Разбивает на base64-чанки по 4 KB
4. Генерирует готовые JS-файлы для `browser_evaluate`

### Деплой

```
1. browser_evaluate: /tmp/wf_inject_head_1.js
2. browser_evaluate: /tmp/wf_inject_head_2.js
3. browser_evaluate: /tmp/wf_inject_head_3.js
4. browser_evaluate: /tmp/wf_inject_head_final.js
5. browser_evaluate: /tmp/wf_inject_body_1.js
6. browser_evaluate: /tmp/wf_inject_body_2.js
7. browser_evaluate: /tmp/wf_inject_body_3.js
8. browser_evaluate: /tmp/wf_inject_body_final.js
9. Click Create/Save → Publish
```

Claude читает каждый файл и вставляет его содержимое в `browser_evaluate`.

---

## Зачем нужен Base64?

### Проблема

Playwright MCP (`browser_evaluate`) передаёт JavaScript как строку. HTML с кавычками, переносами строк и спецсимволами ломает JS-синтаксис.

### Решение

**Base64** кодирует данные в безопасные символы `A-Za-z0-9+/=`. В браузере `atob()` декодирует обратно.

```
HTML:   <div class="hello">It's "great"</div>
Base64: PGRpdiBjbGFzcz0iaGVsbG8iPkl0J3MgImdyZWF0IjwvZGl2Pg==
```

### Почему chunking?

Base64 увеличивает данные на ~33%. `browser_evaluate` лимит ~5-6 KB. Поэтому:
1. Разбиваем **сырой текст** на куски по 4 KB
2. Кодируем каждый кусок отдельно (~5.3 KB base64)
3. Передаём каждый чанк отдельным вызовом
4. Собираем обратно в финальном вызове

**Важно**: нельзя разрезать уже закодированную base64 строку — padding `=` в середине ломает `atob()`.

### Почему метод 1 лучше?

GitHub fetch обходит все эти проблемы — данные загружает сам браузер через HTTP, без base64, без чанков, без LLM-токенов.

---

## Что работает

- **Page-specific Custom Code** — надёжный способ размещения лендинга
- **GitHub Raw fetch** — быстрый деплой за 1 вызов (основной метод)
- **Base64 chunking** через `prepare-chunks.sh` — надёжный запасной метод
- **CSS namespace `sklst-`** — полностью изолирует стили от Webflow
- **IntersectionObserver** в `<script>` — fade-in анимации работают корректно

## Что НЕ работает

| Метод | Почему |
|-------|--------|
| `require('fs')` в browser_evaluate | Sandbox не поддерживает Node.js |
| `import('fs')` dynamic | Заблокировано в sandbox |
| Одна base64 строка >6 KB | Превышает лимит browser_evaluate |
| Конкатенация base64 строк | Padding `=` ломает `atob()` |
| Site-wide Custom Code | Затрагивает homepage. **ЗАПРЕЩЕНО!** |

---

## Чеклист перед публикацией

- [ ] Лендинг работает на GitHub Pages
- [ ] Все классы с префиксом `sklst-`
- [ ] Ссылки ведут на `app.skillset.ae/signup`
- [ ] Slug соответствует рекламной кампании
- [ ] `git push` выполнен (для метода 1)
- [ ] **Homepage (/) НЕ затронут** — проверить после публикации!
- [ ] Оба домена работают (sklst.ai и skillset.ae)

---

## GitHub Pages Preview

Все лендинги доступны для превью:

```
https://kobzevvv.github.io/skillset-landing-pages/landings/{slug}/index.html
```

Workflow: правки → push → проверка на Pages → деплой на Webflow (метод 1 или 2).

---

## Список лендингов

| Slug | Кампания | URL на Pages |
|------|----------|--------------|
| `ai-recruiter` | AI Recruiter (general) | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/ai-recruiter/index.html) |
| `ai-recruiting` | US AI Recruiting Core | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/ai-recruiting/index.html) |
| `resume-screening` | US AI Resume Screening | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/resume-screening/index.html) |
| `ai-sourcing` | US AI Candidate Sourcing | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/ai-sourcing/index.html) |
| `compare` | Competitor Conquest | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/compare/index.html) |
| `dubai` | Dubai / UAE | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/dubai/index.html) |
| `automation` | Recruitment Automation | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/automation/index.html) |
| `small-business` | SMB High Intent | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/small-business/index.html) |
| `agencies` | Agency Recruiting | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/agencies/index.html) |
| `demo` | Demo Booking | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/demo/index.html) |
