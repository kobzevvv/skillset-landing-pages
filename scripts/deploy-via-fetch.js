// deploy-via-fetch.js — Webflow deployment via GitHub Raw fetch
//
// Использование: Claude выполняет функции через browser_evaluate
// в Webflow Designer (Page Settings → Custom Code)
//
// Требования:
// - Webflow Designer открыт на нужной странице
// - Page Settings → Custom Code видна (3 CodeMirror-редактора)
// - Файл уже запушен в GitHub (публичный репо)
//
// CodeMirror маппинг (3 поля):
//   c[0] = Schema markup       → ОЧИСТИТЬ (пустая строка)
//   c[1] = Inside <head> tag   → <meta robots noindex> + <link fontshare> + <style>...</style>
//   c[2] = Before </body> tag  → HTML body + <script>
//
// Параметры:
var REPO = 'kobzevvv/skillset-landing-pages';
var BRANCH = 'master';

// ============================================================
// Основная функция: инъекция за один вызов
// ============================================================

async function injectAll(pagePath) {
  var url = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/' + pagePath;
  var resp = await fetch(url);
  if (!resp.ok) throw new Error('Fetch failed: HTTP ' + resp.status);
  var html = await resp.text();

  // Head: от <meta name="robots"...> до </style> (включает noindex, шрифт, CSS)
  var headMatch = html.match(/<meta name="robots"[^>]*>[\s\S]*?<\/style>/);
  // Body: всё между <body> и </body>
  var bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);

  if (!headMatch) throw new Error('Head block not found (expected <meta robots>...<\/style>)');
  if (!bodyMatch) throw new Error('Body content not found');

  var cms = document.querySelectorAll('.CodeMirror');
  if (cms.length < 3) throw new Error('Need 3 CodeMirrors, found ' + cms.length);

  cms[0].CodeMirror.setValue('');              // Schema markup — очистить
  cms[1].CodeMirror.setValue(headMatch[0]);    // Inside <head>
  cms[2].CodeMirror.setValue(bodyMatch[1].trim()); // Before </body>

  return 'OK: schema=cleared head=' + headMatch[0].length + ' body=' + bodyMatch[1].trim().length;
}

// ============================================================
// Отдельные функции (если нужно обновить только head или body)
// ============================================================

async function injectHead(pagePath) {
  var url = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/' + pagePath;
  var resp = await fetch(url);
  if (!resp.ok) throw new Error('Fetch failed: HTTP ' + resp.status);
  var html = await resp.text();

  var headMatch = html.match(/<meta name="robots"[^>]*>[\s\S]*?<\/style>/);
  if (!headMatch) throw new Error('Head block not found');

  var cms = document.querySelectorAll('.CodeMirror');
  if (cms.length < 3) throw new Error('Need 3 CodeMirrors, found ' + cms.length);

  cms[0].CodeMirror.setValue('');           // Schema — очистить
  cms[1].CodeMirror.setValue(headMatch[0]); // Head

  return 'HEAD OK: ' + headMatch[0].length + ' bytes';
}

async function injectBody(pagePath) {
  var url = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/' + pagePath;
  var resp = await fetch(url);
  if (!resp.ok) throw new Error('Fetch failed: HTTP ' + resp.status);
  var html = await resp.text();

  var bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
  if (!bodyMatch) throw new Error('Body content not found');

  var cms = document.querySelectorAll('.CodeMirror');
  if (cms.length < 3) throw new Error('Need 3 CodeMirrors, found ' + cms.length);

  cms[2].CodeMirror.setValue(bodyMatch[1].trim()); // Body

  return 'BODY OK: ' + bodyMatch[1].trim().length + ' bytes';
}

// ============================================================
// Для Claude: one-liner для browser_evaluate
// ============================================================
//
// Замени PAGE_NAME на slug лендинга:
// ai-recruiter, ai-recruiting, resume-screening, ai-sourcing,
// compare, dubai, automation, small-business, agencies, demo,
// diversity, ats, job-description
//
// One-liner (рекомендуется):
// (async()=>{var r=await fetch('https://raw.githubusercontent.com/kobzevvv/skillset-landing-pages/master/landings/PAGE_NAME/index.html');var h=await r.text();var hm=h.match(/<meta name="robots"[^>]*>[\s\S]*?<\/style>/);var bm=h.match(/<body[^>]*>([\s\S]*)<\/body>/);if(!hm||!bm)return'ERROR: regex failed';var c=document.querySelectorAll('.CodeMirror');c[0].CodeMirror.setValue('');c[1].CodeMirror.setValue(hm[0]);c[2].CodeMirror.setValue(bm[1].trim());return'OK: schema=cleared head='+hm[0].length+' body='+bm[1].trim().length})()
