// deploy-via-fetch.js — Webflow deployment via GitHub Raw fetch
//
// Использование: Claude читает этот файл и выполняет каждую функцию
// через browser_evaluate в Webflow Designer (Page Settings → Custom Code)
//
// Требования:
// - Webflow Designer открыт на нужной странице
// - Page Settings → Custom Code видна (оба CodeMirror доступны)
// - Файл уже запушен в GitHub (публичный репо)
//
// Параметры (подставь перед запуском):
var REPO = 'kobzevvv/skillset-landing-pages';
var BRANCH = 'master';
// var PAGE_PATH = 'landings/ai-recruiter/index.html';  // подставить нужный

// ============================================================
// STEP 1: Инъекция Head (CSS + шрифт) — один browser_evaluate
// ============================================================
// Скопируй и выполни в browser_evaluate, подставив PAGE_PATH:

async function injectHead(pagePath) {
  var url = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/' + pagePath;
  var resp = await fetch(url);
  if (!resp.ok) throw new Error('Fetch failed: HTTP ' + resp.status);
  var html = await resp.text();

  // Извлекаем head: от <link...fontshare до </style>
  var headMatch = html.match(/(<link[^>]*fontshare[\s\S]*?<\/style>)/);
  if (!headMatch) throw new Error('Head CSS not found in HTML');

  var cm = document.querySelectorAll('.CodeMirror')[0];
  if (!cm) throw new Error('Head CodeMirror not found');
  cm.CodeMirror.setValue(headMatch[1]);

  return 'HEAD OK: ' + headMatch[1].length + ' bytes';
}

// ============================================================
// STEP 2: Инъекция Body (HTML + JS) — один browser_evaluate
// ============================================================

async function injectBody(pagePath) {
  var url = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/' + pagePath;
  var resp = await fetch(url);
  if (!resp.ok) throw new Error('Fetch failed: HTTP ' + resp.status);
  var html = await resp.text();

  // Извлекаем body: всё между <body> и </body>
  var bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
  if (!bodyMatch) throw new Error('Body content not found in HTML');

  var body = bodyMatch[1].trim();
  var cm = document.querySelectorAll('.CodeMirror')[1];
  if (!cm) throw new Error('Body CodeMirror not found');
  cm.CodeMirror.setValue(body);

  return 'BODY OK: ' + body.length + ' bytes';
}

// ============================================================
// STEP 3 (опционально): Всё за один вызов
// ============================================================

async function injectAll(pagePath) {
  var url = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/' + pagePath;
  var resp = await fetch(url);
  if (!resp.ok) throw new Error('Fetch failed: HTTP ' + resp.status);
  var html = await resp.text();

  var headMatch = html.match(/(<link[^>]*fontshare[\s\S]*?<\/style>)/);
  var bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);

  if (!headMatch) throw new Error('Head CSS not found');
  if (!bodyMatch) throw new Error('Body content not found');

  var cms = document.querySelectorAll('.CodeMirror');
  if (cms.length < 2) throw new Error('Need 2 CodeMirrors, found ' + cms.length);

  cms[0].CodeMirror.setValue(headMatch[1]);
  cms[1].CodeMirror.setValue(bodyMatch[1].trim());

  return 'ALL OK — Head: ' + headMatch[1].length + ' bytes, Body: ' + bodyMatch[1].trim().length + ' bytes';
}

// ============================================================
// Для Claude: скопируй одну из этих строк в browser_evaluate:
// ============================================================
//
// Всё за один вызов (рекомендуется):
// (async()=>{var r=await fetch('https://raw.githubusercontent.com/kobzevvv/skillset-landing-pages/master/landings/PAGE_NAME/index.html');var h=await r.text();var hm=h.match(/(<link[^>]*fontshare[\s\S]*?<\/style>)/);var bm=h.match(/<body[^>]*>([\s\S]*)<\/body>/);var c=document.querySelectorAll('.CodeMirror');c[0].CodeMirror.setValue(hm[1]);c[1].CodeMirror.setValue(bm[1].trim());return'OK: head='+hm[1].length+' body='+bm[1].trim().length})()
//
// Замени PAGE_NAME на slug лендинга (ai-recruiter, resume-screening, etc.)
