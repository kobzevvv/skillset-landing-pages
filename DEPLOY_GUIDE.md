# Deployment Guide — Skillset Landing Pages

Как публиковать лендинги из этого репозитория на Webflow.

---

## Обзор архитектуры

Каждый лендинг — **автономный HTML-файл** (CSS + JS внутри). Лендинг публикуется на Webflow как **отдельная страница** с кастомным кодом (page-specific Head + Body).

- **Webflow site**: "Skillset Landing Page" в Olga's Workspace
- **Домен**: `sklst.ai` (единственный домен для публикации)
- **GitHub**: `kobzevvv/skillset-landing-pages` (публичный)
- **Webflow Designer** → Pages → выбрать страницу → Settings (⚙️) → Custom Code
- **Head** (`Inside <head> tag`): блок `<style>` + подключение шрифта
- **Body** (`Before </body> tag`): весь HTML от `<body>` до `</body>` + `<script>`

### CodeMirror маппинг (критически важно!)

В Webflow Page Settings → Custom Code **три** CodeMirror-редактора:

| Индекс | Поле | Что туда идёт |
|--------|------|---------------|
| `c[0]` | Schema markup | **ПУСТОЙ** — ничего не вставлять! |
| `c[1]` | Inside `<head>` tag | CSS + шрифт (`<link>` + `<style>`) |
| `c[2]` | Before `</body>` tag | HTML body + `<script>` |

> **Ошибка**: ранее предполагалось 2 редактора. Если код попал в неправильные поля — перезалить через скрипт ниже.

### Правила публикации

- **Публикуем ТОЛЬКО на `sklst.ai`** — не выбирать skillset.ae, www.sklst.ai, www.skillset.ae, staging
- **Site-wide Custom Code** используется только для GTM/аналитики — **НЕ** для контента лендингов
- **Page-specific Custom Code** — для контента каждого лендинга

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
(async () => {
  var r = await fetch('https://raw.githubusercontent.com/kobzevvv/skillset-landing-pages/master/landings/PAGE_NAME/index.html');
  var h = await r.text();
  var hm = h.match(/<link[^>]*fonts[\s\S]*?<\/style>/);
  var bm = h.match(/<body[^>]*>([\s\S]*)<\/body>/);
  if (!hm || !bm) return 'ERROR: regex failed';
  var c = document.querySelectorAll('.CodeMirror');
  c[0].CodeMirror.setValue('');        // Schema markup — очистить
  c[1].CodeMirror.setValue(hm[0]);     // Inside <head> — CSS + шрифт
  c[2].CodeMirror.setValue(bm[1].trim()); // Before </body> — HTML + JS
  return 'OK: schema=cleared head=' + hm[0].length + ' body=' + bm[1].trim().length;
})()
```

Замени `PAGE_NAME` на slug лендинга (`ai-recruiter`, `resume-screening`, `compare`, и т.д.)

### Полный процесс

1. Запушить код в GitHub
2. Открыть Webflow Designer → создать новую страницу → задать slug
3. Page Settings (⚙️) → Custom Code
4. Выполнить `browser_evaluate` с JS выше (подставив PAGE_NAME)
5. Нажать Save → Publish (**только sklst.ai!**)
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
9. Click Save → Publish (только sklst.ai!)
```

Claude читает каждый файл и вставляет его содержимое в `browser_evaluate`.

---

## Аналитика и трекинг

### Site-wide GTM

GTM-сниппет `GTM-TWM9H2Z6` установлен через **Webflow Site Settings → Custom Code** (site-wide):

- **Head code**: GTM script + CSS (hide-scrollbar)
- **Footer code**: GTM noscript fallback

> **Важно**: site-wide код — только для аналитики (GTM, пиксели). Контент лендингов идёт ТОЛЬКО через page-specific Custom Code.

### Что трекается через GTM

| Сервис | Статус | Описание |
|--------|--------|----------|
| Яндекс.Метрика (106836145) | Работает | Вебвизор, goals, pageview — через официальный шаблон GTM |
| GA4 | Настраивается | Теги GA4 в контейнере GTM-TWM9H2Z6 |

### Гайд по аналитике

Полная настройка аналитики (GA4, Яндекс.Метрика, конверсии, цели) описана в отдельном гайде:

> **TODO**: `ANALYTICS_GUIDE.md` — создать после завершения настройки GTM-контейнера.
> Должен содержать: GA4 Measurement ID, структуру событий, настройку конверсий для Google Ads, Яндекс.Метрика goals, интеграцию с рекламными кампаниями.

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
- **Site-wide Custom Code** — для GTM/аналитики (не для контента!)
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
| Site-wide код для лендингов | Затрагивает homepage. **ЗАПРЕЩЕНО!** |
| Custom HTML теги в GTM для Яндекса | Google флагит как malware. Использовать официальный шаблон из Gallery |

---

## Чеклист перед публикацией

- [ ] Лендинг работает на GitHub Pages (проверить preview URL)
- [ ] Все классы с префиксом `sklst-`
- [ ] Ссылки ведут на `app.skillset.ae/signup`
- [ ] Slug соответствует рекламной кампании
- [ ] `git push` выполнен (для метода 1)
- [ ] CodeMirror маппинг: c[0]=пустой, c[1]=head, c[2]=body
- [ ] Публикация **только на sklst.ai** (не выбирать другие домены!)
- [ ] **Homepage (/) НЕ затронут** — проверить после публикации!
- [ ] GTM загружается на странице (проверить network requests)
- [ ] Обновить статус в [Google Sheet — Landing Pages](https://docs.google.com/spreadsheets/d/1bpbZhL1wh0huFHeEP9XjcPjZy4KGfrWAABveAVmrL5s/edit#gid=0&range=Landing%20Pages)

---

## GitHub Pages Preview

Все лендинги доступны для превью (для дизайнера и маркетолога):

```
https://kobzevvv.github.io/skillset-landing-pages/landings/{slug}/index.html
```

Workflow: правки → push → проверка на Pages → деплой на Webflow (метод 1 или 2).

---

## Список лендингов

| Slug | Кампания | Preview (GitHub Pages) | Production (sklst.ai) |
|------|----------|------------------------|-----------------------|
| `ai-recruiter` | AI Recruiter (general) | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/ai-recruiter/index.html) | [live](https://sklst.ai/ai-recruiter) |
| `ai-recruiting` | US AI Recruiting Core | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/ai-recruiting/index.html) | [live](https://sklst.ai/ai-recruiting) |
| `resume-screening` | US AI Resume Screening | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/resume-screening/index.html) | [live](https://sklst.ai/resume-screening) |
| `ai-sourcing` | US AI Candidate Sourcing | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/ai-sourcing/index.html) | [live](https://sklst.ai/ai-sourcing) |
| `compare` | Competitor Conquest | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/compare/index.html) | [live](https://sklst.ai/compare) |
| `dubai` | Dubai / UAE | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/dubai/index.html) | [live](https://sklst.ai/dubai) |
| `automation` | Recruitment Automation | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/automation/index.html) | [live](https://sklst.ai/automation) |
| `small-business` | SMB High Intent | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/small-business/index.html) | [live](https://sklst.ai/small-business) |
| `agencies` | Agency Recruiting | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/agencies/index.html) | [live](https://sklst.ai/agencies) |
| `demo` | Demo Booking | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/demo/index.html) | [live](https://sklst.ai/demo) |

> **Полный список с маркетинговыми данными**: [Google Sheet — Landing Pages](https://docs.google.com/spreadsheets/d/1bpbZhL1wh0huFHeEP9XjcPjZy4KGfrWAABveAVmrL5s/edit#gid=0)
