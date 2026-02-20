#!/usr/bin/env node
// deploy-cdp.mjs — Deploy landing pages to Webflow via Chrome DevTools Protocol
//
// Usage: node scripts/deploy-cdp.mjs [page-slug] [page-slug] ...
// If no slugs given, deploys ALL pages.
//
// Prerequisites:
// - Chrome running with --remote-debugging-port=9223
// - Webflow Designer open (Page Settings → Custom Code visible for first page)
//
// The script:
// 1. Connects to Chrome via CDP
// 2. Finds the tab with Webflow Designer
// 3. For each page: navigates to Page Settings → Custom Code, injects code from GitHub

const CDP_PORT = 9223;
const REPO = 'kobzevvv/skillset-landing-pages';
const BRANCH = 'master';

const ALL_PAGES = [
  'ai-recruiter', 'ai-recruiting', 'resume-screening', 'ai-sourcing',
  'compare', 'dubai', 'automation', 'small-business', 'agencies',
  'demo', 'diversity', 'ats', 'job-description'
];

const pages = process.argv.length > 2 ? process.argv.slice(2) : ALL_PAGES;

// --- CDP Helper ---
class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
      this.ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      });
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || 'Eval error');
    }
    return result.result?.value;
  }

  close() {
    this.ws?.close();
  }
}

// --- Helpers ---
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getTabWSUrl(titleMatch) {
  const resp = await fetch(`http://localhost:${CDP_PORT}/json`);
  const tabs = await resp.json();
  const tab = tabs.find(t => t.title?.includes(titleMatch) || t.url?.includes(titleMatch));
  return tab?.webSocketDebuggerUrl;
}

async function createTab(url) {
  const resp = await fetch(`http://localhost:${CDP_PORT}/json/new?${url}`);
  const tab = await resp.json();
  return tab.webSocketDebuggerUrl;
}

// --- Deploy one page ---
async function deployPage(cdp, slug) {
  const pagePath = `landings/${slug}/index.html`;
  const rawUrl = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${pagePath}`;

  const result = await cdp.evaluate(`
    (async () => {
      try {
        var r = await fetch('${rawUrl}');
        if (!r.ok) return 'FETCH_ERROR: HTTP ' + r.status;
        var h = await r.text();
        var hm = h.match(/<meta name="robots"[^>]*>[\\s\\S]*?<\\/style>/);
        var bm = h.match(/<body[^>]*>([\\s\\S]*)<\\/body>/);
        if (!hm || !bm) return 'REGEX_ERROR: head=' + !!hm + ' body=' + !!bm;
        var c = document.querySelectorAll('.CodeMirror');
        if (c.length < 3) return 'CM_ERROR: found ' + c.length + ' CodeMirrors (need 3)';
        c[0].CodeMirror.setValue('');
        c[1].CodeMirror.setValue(hm[0]);
        c[2].CodeMirror.setValue(bm[1].trim());
        return 'OK: head=' + hm[0].length + ' body=' + bm[1].trim().length;
      } catch(e) {
        return 'JS_ERROR: ' + e.message;
      }
    })()
  `);

  return result;
}

// --- Main ---
async function main() {
  console.log(`\n🚀 Deploying ${pages.length} pages via CDP...\n`);

  // Find Webflow Designer tab
  let wsUrl = await getTabWSUrl('webflow.com/design');
  if (!wsUrl) {
    console.log('⚠️  No Webflow Designer tab found.');
    console.log('   Please open Webflow Designer and navigate to any page\'s');
    console.log('   Page Settings → Custom Code, then re-run this script.\n');
    console.log('   Or press Enter to open Webflow Designer now...');
    process.exit(1);
  }

  console.log('✓ Found Webflow Designer tab\n');

  const cdp = new CDPClient(wsUrl);
  await cdp.connect();
  console.log('✓ Connected via CDP\n');

  // Check if CodeMirror editors are visible
  const cmCount = await cdp.evaluate('document.querySelectorAll(".CodeMirror").length');
  if (cmCount < 3) {
    console.log(`⚠️  Found ${cmCount} CodeMirror editors (need 3).`);
    console.log('   Make sure Page Settings → Custom Code is open.\n');
    cdp.close();
    process.exit(1);
  }

  console.log(`✓ Found ${cmCount} CodeMirror editors\n`);
  console.log('--- Starting deployment ---\n');

  const results = [];
  for (const slug of pages) {
    process.stdout.write(`  ${slug.padEnd(20)}`);
    const start = Date.now();
    try {
      const result = await deployPage(cdp, slug);
      const ms = Date.now() - start;
      console.log(`${result}  (${ms}ms)`);
      results.push({ slug, result, ms });
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      results.push({ slug, result: 'ERROR', ms: 0 });
    }
  }

  console.log('\n--- Summary ---');
  const ok = results.filter(r => r.result?.startsWith('OK'));
  const err = results.filter(r => !r.result?.startsWith('OK'));
  console.log(`✓ Success: ${ok.length}/${results.length}`);
  if (err.length) {
    console.log(`✗ Failed: ${err.map(r => r.slug).join(', ')}`);
  }
  const totalMs = results.reduce((s, r) => s + r.ms, 0);
  console.log(`⏱ Total time: ${(totalMs / 1000).toFixed(1)}s\n`);

  console.log('⚠️  IMPORTANT: Changes are saved in Webflow Custom Code but NOT published.');
  console.log('   You still need to click "Publish" in Webflow Designer to deploy to production.\n');

  cdp.close();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
