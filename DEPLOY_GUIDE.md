# Deployment Guide — Skillset Landing Pages

How to publish landing pages from this repository to Webflow.

---

## Architecture Overview

Each landing page is a **standalone HTML file** (CSS + JS inline). It is published on Webflow as a **separate page** with custom code (page-specific Head + Body).

- **Webflow site**: "Skillset Landing Page" in Olga's Workspace
- **Domains**: `sklst.ai`, `www.sklst.ai`, `skillset.ae`, `www.skillset.ae` (publish to all)
- **GitHub**: `kobzevvv/skillset-landing-pages` (public)
- **Webflow Designer** → Pages → select page → Settings (⚙️) → Custom Code
- **Head** (`Inside <head> tag`): `<style>` block + font link
- **Body** (`Before </body> tag`): all HTML from `<body>` to `</body>` + `<script>`

### CodeMirror Mapping (critical!)

In Webflow Page Settings → Custom Code there are **three** CodeMirror editors:

| Index | Field | What goes there |
|-------|-------|-----------------|
| `c[0]` | Schema markup | **EMPTY** — do not insert anything! |
| `c[1]` | Inside `<head>` tag | `<meta robots noindex>` + CSS + font (`<link>` + `<style>`) |
| `c[2]` | Before `</body>` tag | HTML body + `<script>` |

> **Note**: previously we assumed 2 editors. If code ended up in the wrong fields — re-deploy using the script below.

### Project Status: Experiment / Research

All ad landing pages are an **experiment**. We're testing which value propositions, segments, and details work. Therefore:

- Landing pages are NOT part of the main site
- They are accessible ONLY via direct links from ad campaigns
- They cannot be reached through navigation or search

### SEO Isolation (CRITICAL!)

All ad landing pages **MUST** be hidden from search engines:

1. **`noindex, nofollow`** — every landing page contains `<meta name="robots" content="noindex, nofollow">` in `<head>`. **Do not remove!**
2. **Sitemap** — do NOT add landing pages to sitemap.xml. Neither Webflow sitemap nor robots.txt
3. **Homepage** — do NOT link to landing pages from the homepage or site navigation
4. **Internal links** — landing pages do NOT link to each other (only to skillset.ae, app.skillset.ae, Calendly)
5. **Single entry point** — via direct URL from ad (Google Ads, Cold Email)

> **Why**: we're experimenting with positioning. We don't yet know which VPs work. Indexing experimental pages hurts the main site's SEO.

### Publishing Rules

- **Publish to all domains** (`sklst.ai`, `www.sklst.ai`, `skillset.ae`, `www.skillset.ae`)
- **Site-wide Custom Code** is used only for GTM/analytics — **NOT** for landing page content
- **Page-specific Custom Code** — for each landing page's content
- **Webflow Page Settings → SEO**: disable "Index this page" if available

---

## Two Deployment Methods

| | Method 1: GitHub Fetch | Method 2: Base64 Chunking |
|---|---|---|
| **Script** | `scripts/deploy-via-fetch.js` | `scripts/prepare-chunks.sh` |
| **Speed** | ~3 seconds, 1-2 calls | ~30 seconds, 8+ calls |
| **Cost** | Minimal | High (base64 via LLM) |
| **Requirements** | Public GitHub repo | Local files only |
| **When to use** | Always (primary method) | If GitHub is unavailable |

---

## Method 1: GitHub Fetch (primary)

The fastest and cheapest method. The browser fetches HTML from GitHub Raw, parses it, and inserts into CodeMirror.

### Prerequisites

1. Code must be pushed to GitHub
2. Repository must be public
3. Webflow Designer open on the target page → Page Settings → Custom Code

### Deploy in 1 Call

Claude executes **one** `browser_evaluate`:

```js
(async () => {
  var r = await fetch('https://raw.githubusercontent.com/kobzevvv/skillset-landing-pages/master/landings/PAGE_NAME/index.html');
  var h = await r.text();
  var hm = h.match(/<meta name="robots"[^>]*>[\s\S]*?<\/style>/);
  var bm = h.match(/<body[^>]*>([\s\S]*)<\/body>/);
  if (!hm || !bm) return 'ERROR: regex failed';
  var c = document.querySelectorAll('.CodeMirror');
  c[0].CodeMirror.setValue('');        // Schema markup — clear
  c[1].CodeMirror.setValue(hm[0]);     // Inside <head> — noindex + CSS + font
  c[2].CodeMirror.setValue(bm[1].trim()); // Before </body> — HTML + JS
  return 'OK: schema=cleared head=' + hm[0].length + ' body=' + bm[1].trim().length;
})()
```

Replace `PAGE_NAME` with the landing page slug (`ai-recruiter`, `resume-screening`, `compare`, etc.)

### Full Process

1. Push code to GitHub
2. Open Webflow Designer → create new page → set slug
3. Page Settings (⚙️) → Custom Code
4. Run `browser_evaluate` with the JS above (substituting PAGE_NAME)
5. Click Save → Publish (all domains)
6. **Verify** that the homepage (/) was not affected!

### Detailed Script

Full version with error handling: `scripts/deploy-via-fetch.js`

---

## Method 2: Base64 Chunking (fallback)

Use if GitHub is unavailable from Webflow (blocked, private repo, network issues).

### Preparation

```bash
./scripts/prepare-chunks.sh landings/ai-recruiter/index.html
```

The script:
1. Extracts Head (CSS + font) and Body (HTML + JS)
2. Minifies code (if `html-minifier-terser` is installed)
3. Splits into base64 chunks of 4 KB each
4. Generates ready-to-use JS files for `browser_evaluate`

### Deploy

```
1. browser_evaluate: /tmp/wf_inject_head_1.js
2. browser_evaluate: /tmp/wf_inject_head_2.js
3. browser_evaluate: /tmp/wf_inject_head_3.js
4. browser_evaluate: /tmp/wf_inject_head_final.js
5. browser_evaluate: /tmp/wf_inject_body_1.js
6. browser_evaluate: /tmp/wf_inject_body_2.js
7. browser_evaluate: /tmp/wf_inject_body_3.js
8. browser_evaluate: /tmp/wf_inject_body_final.js
9. Click Save → Publish (all domains)
```

Claude reads each file and inserts its contents into `browser_evaluate`.

---

## Analytics & Tracking

### Site-wide GTM

GTM snippet `GTM-TWM9H2Z6` is installed via **Webflow Site Settings → Custom Code** (site-wide):

- **Head code**: GTM script + CSS (hide-scrollbar)
- **Footer code**: GTM noscript fallback

> **Important**: site-wide code is for analytics only (GTM, pixels). Landing page content goes ONLY through page-specific Custom Code.

### What is Tracked via GTM

| Service | Status | Description |
|---------|--------|-------------|
| Yandex.Metrika (106836145) | Active | Webvisor, goals, pageview — via official GTM Gallery template |
| GA4 | Being configured | GA4 tags in GTM container GTM-TWM9H2Z6 |

### Analytics Guide

Full analytics setup (GA4, Yandex.Metrika, conversions, goals) is documented in a separate guide:

> **TODO**: `ANALYTICS_GUIDE.md` — create after GTM container setup is complete.
> Should contain: GA4 Measurement ID, event structure, Google Ads conversion setup, Yandex.Metrika goals, ad campaign integrations.

---

## Why Base64?

### Problem

Playwright MCP (`browser_evaluate`) passes JavaScript as a string. HTML with quotes, newlines, and special characters breaks JS syntax.

### Solution

**Base64** encodes data into safe characters `A-Za-z0-9+/=`. In the browser, `atob()` decodes it back.

```
HTML:   <div class="hello">It's "great"</div>
Base64: PGRpdiBjbGFzcz0iaGVsbG8iPkl0J3MgImdyZWF0IjwvZGl2Pg==
```

### Why Chunking?

Base64 increases data size by ~33%. `browser_evaluate` has a ~5-6 KB limit. Therefore:
1. Split **raw text** into 4 KB chunks
2. Encode each chunk separately (~5.3 KB base64)
3. Send each chunk via a separate call
4. Reassemble in the final call

**Important**: you cannot split an already-encoded base64 string — padding `=` in the middle breaks `atob()`.

### Why Method 1 is Better

GitHub fetch bypasses all these problems — the browser loads data via HTTP, without base64, without chunks, without LLM tokens.

---

## What Works

- **Page-specific Custom Code** — reliable way to host a landing page
- **Site-wide Custom Code** — for GTM/analytics (not for content!)
- **GitHub Raw fetch** — fast 1-call deploy (primary method)
- **Base64 chunking** via `prepare-chunks.sh` — reliable fallback method
- **CSS namespace `sklst-`** — fully isolates styles from Webflow
- **IntersectionObserver** in `<script>` — fade-in animations work correctly

## What Does NOT Work

| Method | Why |
|--------|-----|
| `require('fs')` in browser_evaluate | Sandbox does not support Node.js |
| `import('fs')` dynamic | Blocked in sandbox |
| Single base64 string >6 KB | Exceeds browser_evaluate limit |
| Concatenating base64 strings | Padding `=` breaks `atob()` |
| Site-wide code for landing pages | Affects homepage. **FORBIDDEN!** |
| Custom HTML tags in GTM for Yandex | Google flags as malware. Use the official Gallery template |

---

## Pre-publish Checklist

- [ ] Landing page works on GitHub Pages (check preview URL)
- [ ] All classes prefixed with `sklst-`
- [ ] Links point to `app.skillset.ae/signup`
- [ ] Slug matches the ad campaign
- [ ] `git push` completed (for method 1)
- [ ] CodeMirror mapping: c[0]=empty, c[1]=head, c[2]=body
- [ ] `<meta name="robots" content="noindex, nofollow">` present in `<head>`
- [ ] Page is NOT added to sitemap
- [ ] No links to this page from homepage or navigation
- [ ] Published to all domains (sklst.ai, www.sklst.ai, skillset.ae, www.skillset.ae)
- [ ] **Homepage (/) NOT affected** — verify after publishing!
- [ ] GTM loads on the page (check network requests)
- [ ] Update status in [Google Sheet — Landing Pages](https://docs.google.com/spreadsheets/d/1bpbZhL1wh0huFHeEP9XjcPjZy4KGfrWAABveAVmrL5s/edit#gid=0&range=Landing%20Pages)

---

## GitHub Pages Preview

All landing pages are available for preview (for designer and marketer):

```
https://kobzevvv.github.io/skillset-landing-pages/landings/{slug}/index.html
```

Workflow: edits → push → check on Pages → deploy to Webflow (method 1 or 2).

---

## Landing Pages List

| Slug | Campaign | Preview (GitHub Pages) | Production |
|------|----------|------------------------|------------|
| `ai-recruiter` | AI Recruiter (general) | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/ai-recruiter/index.html) | [sklst.ai](https://sklst.ai/ai-recruiter) / [skillset.ae](https://skillset.ae/ai-recruiter) |
| `ai-recruiting` | US AI Recruiting Core | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/ai-recruiting/index.html) | [sklst.ai](https://sklst.ai/ai-recruiting) / [skillset.ae](https://skillset.ae/ai-recruiting) |
| `resume-screening` | US AI Resume Screening | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/resume-screening/index.html) | [sklst.ai](https://sklst.ai/resume-screening) / [skillset.ae](https://skillset.ae/resume-screening) |
| `ai-sourcing` | US AI Candidate Sourcing | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/ai-sourcing/index.html) | [sklst.ai](https://sklst.ai/ai-sourcing) / [skillset.ae](https://skillset.ae/ai-sourcing) |
| `compare` | Competitor Conquest | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/compare/index.html) | [sklst.ai](https://sklst.ai/compare) / [skillset.ae](https://skillset.ae/compare) |
| `dubai` | Dubai / UAE | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/dubai/index.html) | [sklst.ai](https://sklst.ai/dubai) / [skillset.ae](https://skillset.ae/dubai) |
| `automation` | Recruitment Automation | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/automation/index.html) | [sklst.ai](https://sklst.ai/automation) / [skillset.ae](https://skillset.ae/automation) |
| `small-business` | SMB High Intent | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/small-business/index.html) | [sklst.ai](https://sklst.ai/small-business) / [skillset.ae](https://skillset.ae/small-business) |
| `agencies` | Agency Recruiting | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/agencies/index.html) | [sklst.ai](https://sklst.ai/agencies) / [skillset.ae](https://skillset.ae/agencies) |
| `demo` | Demo Booking | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/demo/index.html) | [sklst.ai](https://sklst.ai/demo) / [skillset.ae](https://skillset.ae/demo) |
| `ats` | AI-Powered ATS | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/ats/index.html) | [sklst.ai](https://sklst.ai/ats) / [skillset.ae](https://skillset.ae/ats) |
| `job-description` | AI JD Generator | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/job-description/index.html) | [sklst.ai](https://sklst.ai/job-description) / [skillset.ae](https://skillset.ae/job-description) |
| `diversity` | Bias-Free Hiring (DEI) | [preview](https://kobzevvv.github.io/skillset-landing-pages/landings/diversity/index.html) | [sklst.ai](https://sklst.ai/diversity) / [skillset.ae](https://skillset.ae/diversity) |

> **Full list with marketing data**: [Google Sheet — Landing Pages](https://docs.google.com/spreadsheets/d/1bpbZhL1wh0huFHeEP9XjcPjZy4KGfrWAABveAVmrL5s/edit#gid=0)
> **Master List**: [Google Sheet — Master List](https://docs.google.com/spreadsheets/d/1fqmGeGKRG93RNxnXINrhHix8dtOf0z64EIR4I7m03z0/edit)
