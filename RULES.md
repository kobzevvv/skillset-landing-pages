# Skillset Landing Pages — Rules & Guidelines

## Critical Rules

1. **NEVER replace or modify the main homepage** (`/`) on any domain (skillset.ae, sklst.ai)
2. Landing pages are **only for advertising campaigns** (Google Ads, Facebook, etc.)
3. Each landing page lives at its own URL path: `/campaign-keyword` or `/ad-group-name`
4. The main website content must remain untouched at all times
5. All landing page CSS classes must be prefixed with `sklst-` to avoid conflicts with main site styles

## Webflow Deployment

- **Site**: "Skillset Landing Page" (ID: `684002a63d872da986e15d46`)
- **Domains**: sklst.ai, www.sklst.ai, skillset.ae, www.skillset.ae
- Landing pages are deployed as **separate Webflow pages** with page-specific custom code
- Site-wide custom code (Head/Footer) is reserved for the main site — do not inject landing pages there
- Publishing affects ALL domains — use hostname-conditional code if landing pages must only appear on specific domains

## File Structure

```
skillset-landing-pages/
  RULES.md              — This file (rules & guidelines)
  STYLE_GUIDE.md        — Design system & frontend guide
  templates/            — Reusable HTML templates
  landings/             — Individual landing pages
    ai-recruiter/       — Example: /ai-recruiter campaign
      index.html
      meta.md           — Campaign context, keywords, ad group
```

## Workflow

1. Read `STYLE_GUIDE.md` for design system reference
2. Create landing page HTML following the guide
3. Test locally before deploying
4. Deploy to Webflow as a separate page (not homepage)
5. Verify both domains still work correctly after publishing
