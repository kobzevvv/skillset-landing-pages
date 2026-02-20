# Skillset Design System & Landing Page Guide

> Extracted from **skillset.ae** main website. Use this as the single source of truth for all landing pages.

---

## 1. Brand Identity

- **Product**: Skillset — AI-powered hiring copilot
- **Tagline**: "Your AI hiring copilot"
- **Meta Description**: "We understand that people make all the difference. Skillset helps companies achieve their business objectives by hiring the best talent to drive success."
- **App URL**: `https://app.skillset.ae/signup`
- **Contact**: `sales@skillset.ae`

---

## 2. Color Palette

### Primary Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--main-accent` | `#0055FF` | Primary CTA buttons, active links, interactive elements |
| `--brand-empower-peach` | `#FFB38A` | Feature step headings, warm accent |
| `--system-okay` | `#226600` | Success/solution tags |
| `--destructive` | `#B20F00` | Problem tags, error states |

### Background Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--_apps---colors--background` | `#D8DCE5` | Page background (light grayish-blue) |
| `--bg-dark` | `#151A24` | Dark sections, dark mode backgrounds |
| `--_apps---colors--card` | `#FFFFFF` | Card backgrounds |
| Problem card gradient | `#23888E` → `#31688E` → `#39568C` → `#414487` | Solution cards (teal-to-indigo gradient spectrum) |

### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Body text | `#000000` | Primary text on light backgrounds |
| White text | `#FFFFFF` | Text on dark/colored backgrounds |
| `--grayed-out` | `#858AA6` | Secondary text, muted labels |
| `--grayed-out-darker` | `#70758C` | Tertiary text, borders |
| `--grayed-out-lighter` | `#ADB2CC` | Light muted text, nav links on dark bg |
| `--bg-slightly-darker` | `#BDC1D6` | Subtle UI elements |

### Key Insight
The main site uses a **cool, blue-gray palette** — NOT purple. The background is grayish-blue `#D8DCE5`, accents are pure blue `#0055FF`, and warm peach `#FFB38A` is used sparingly for feature highlights. This is a professional, restrained color scheme.

---

## 3. Typography

### Fonts

| Font | Usage | Fallback |
|------|-------|----------|
| **Satoshi** | Headings, buttons, body text (main site) | Verdana, sans-serif |
| **Inter** | Alternative for landing pages | Arial, sans-serif |

> The main site uses **Satoshi** as the primary font. For landing pages where Satoshi isn't available via Google Fonts, **Inter** is an acceptable substitute (already loaded on the site).

### Heading Scale

| Level | Size | Weight | Line-Height | Context |
|-------|------|--------|-------------|---------|
| H1 | 50px | 700 | 60px | Hero main title |
| H2 | 30px | 700 | 35px | Section headings |
| H3 | 30px | 700 | 35px | Card headings (same as H2) |
| H4 | 20px | 700 | 25px | Sub-section headings |
| H5 | 18px | 700 | 25px | Feature step labels |

### Body Text

| Size | Weight | Line-Height | Usage |
|------|--------|-------------|-------|
| 20px | 400 | 25px | Main body paragraphs |
| 16px | 400-700 | 20px | Secondary text, nav links |
| 14px | 400 | 18px | Small labels, tags |

### Key Insight
Typography is **clean and minimal** — no letter-spacing adjustments, no text-transform on headings. Font weight 700 for all headings. Body text is relatively large (20px) for readability.

---

## 4. Layout & Spacing

### Container
- No explicit max-width container on the main site — content is edge-to-edge with section padding
- Sections use `padding: 80px` on all sides
- Hero section: `padding: 0 0 80px 0` (no top padding)
- Footer: `padding: 100px 20px 20px`

### Section Pattern
```
section.main-sct {
  padding: 80px;
}
```

Sections often have modifier classes: `.who`, `.bigfeatures`, `.plain`, `.candidatespov`, `.puzzles`, `.consultation`

### Grid System
- The site uses CSS flexbox/grid layouts (Webflow-based)
- Cards are arranged in horizontal rows (3 columns for "who" cards)
- Feature steps are vertical lists with sidebar content

---

## 5. Components

### Buttons

#### Primary CTA
```css
background: #0055FF;
color: white;
border-radius: 1000px;  /* fully rounded pill */
font-size: 20px;
font-weight: 700;
font-family: Satoshi;
```
Example: "Solve your problem" — large blue pill button

#### Secondary / Ghost Button
```css
background: rgba(68, 75, 89, 0.5);  /* semi-transparent dark */
color: white;
border-radius: 10px;
font-size: 16px;
font-weight: 700;
```

#### Form Submit Button
Full-width blue button within form context.

### Cards

#### Solution/Problem Cards
```css
border-radius: 20px;
padding: 40px 80px 40px 40px;
background: linear gradient from teal (#23888E) to indigo (#414487);
color: white;
```
- Cards have a "Problem" tag (red `#B20F00` background)
- Expandable details with "Solution" and "Impact" sub-sections
- "See a solution" link at bottom

#### Who Cards (Audience Segments)
- Dark background with gradient overlay
- Background image
- H2 heading + "Learn more" link
- Hover/interaction to expand

#### Feature Bento Cards
- Dark background `#1F2126`
- Contains app UI screenshots
- Rounded corners `20px`
- Mix of full-width and half-width cards

### Tags/Badges
```css
border-radius: 3px;
padding: 0 5px;
font-size: 14px;
font-weight: 400;
text-transform: uppercase;
```
- "Problem" tag: bg `#B20F00`, white text
- "Solution" tag: border `#226600`, green text
- "Impact" tag: similar pattern

### Form
- Input fields with dark background
- Placeholder text in muted color
- "Select time" CTA button
- Clean, minimal form design

---

## 6. Section Architecture

The main site follows this section flow:

1. **Hero** (`.hero-sct`) — Problem cards slider + main title + CTA
2. **Who** (`.main-sct.who`) — 3 audience segment cards (Corporate HR, Agencies, Founders)
3. **Social Proof** — Statistics with impact numbers (67%, 44 days, $15,000)
4. **How It Works** (`.main-sct.bigfeatures`) — 5-step feature walkthrough with app screenshots
5. **Candidate Sources** — 4 source types (Application Page, AI Search, Manual Upload, Integrations)
6. **Boost Stats** — Key metrics section
7. **Candidate's POV** (`.main-sct.candidatespov`) — 4-step candidate journey
8. **Pre-screening** (`.main-sct.puzzles`) — AI assessment matching visualization
9. **More Features** (`.main-sct.plain`) — 8 minor feature cards in grid
10. **Consultation CTA** (`.main-sct.consultation`) — Book form + benefits list
11. **Footer** (`.footer-sct`) — Links organized by category

### Key Insight
The site heavily uses **dark backgrounds** for feature-rich sections (showcasing app UI) and **light backgrounds** for text-heavy sections. This creates a visual rhythm of dark/light alternation.

---

## 7. Visual Patterns & Design Language

### Overall Aesthetic
- **Professional, enterprise SaaS** feel — not playful or startup-y
- **High information density** — lots of text content, detailed explanations
- **Problem → Solution narrative** — every section frames a problem and shows the solution
- **Dark mode dominant** — most sections use dark backgrounds (#151A24, #1F2126)
- **App UI screenshots** integrated into feature sections — showing the actual product

### Rounded Corners
- Cards: `20px`
- Buttons (pill): `1000px`
- Buttons (rectangular): `10px`
- Tags: `3px`
- General UI: `10px` (set in `--_apps---sizes--radius`)

### Shadows
- Minimal shadow usage on the main site
- Subtle `rgba(0,0,0,0.2)` for overlays

### Gradients
- Problem cards use a teal → blue → indigo gradient spectrum
- No flashy gradients — colors are muted and professional

### Icons
- Minimal icon usage
- Small functional icons (18-24px) for navigation and UI
- No decorative icon system — content relies on text and screenshots

### Images
- Product screenshots are the primary visual content
- Team photos in hero section (small circular avatars)
- Logo: 138x35px SVG, white on dark background

---

## 8. Landing Page Template Guidelines

When creating landing pages for ad campaigns:

### DO
- Use the color palette from this guide (blue `#0055FF` accent, grayish `#D8DCE5` background)
- Keep font choices to Satoshi or Inter
- Use `20px` border-radius for cards
- Use pill-shaped (`border-radius: 1000px`) primary CTA buttons
- Follow the problem → solution narrative structure
- Include app screenshots where relevant
- Keep sections padded at `80px`
- Use dark sections for feature showcases
- Prefix all CSS classes with `sklst-` to avoid conflicts

### DON'T
- Don't use purple as primary color (that was the old landing — not aligned with main site)
- Don't use decorative gradients on text
- Don't add excessive animations or hover effects
- Don't deviate from the professional, enterprise tone
- Don't use fonts other than Satoshi/Inter
- Don't make buttons with sharp corners (minimum `10px` radius)

### CTA Links
- Primary signup: `https://app.skillset.ae/signup`
- Contact: `mailto:sales@skillset.ae`
- Main site: `https://skillset.ae`

### Required Sections (minimum for any landing page)
1. **Nav** — Logo + minimal links + CTA button
2. **Hero** — Problem statement + value proposition + CTA
3. **Features/Benefits** — 3-6 key selling points
4. **Social Proof** — Stats or testimonials
5. **CTA** — Final call to action
6. **Footer** — Copyright + links

---

## 9. CSS Variables Reference

```css
:root {
  /* Core palette */
  --main-accent: #0055FF;
  --brand-empower-peach: #FFB38A;
  --system-okay: #226600;

  /* Backgrounds */
  --bg-dark: #151A24;
  --bg-page: #D8DCE5;
  --bg-card: #FFFFFF;
  --bg-slightly-darker: #BDC1D6;

  /* Text */
  --grayed-out: #858AA6;
  --grayed-out-darker: #70758C;
  --grayed-out-lighter: #ADB2CC;

  /* Problem card spectrum */
  --problemcard-01-color: #23888E;
  --problemcard-02-color: #2A788E;
  --problemcard-03-color: #31688E;
  --problemcard-04-color: #39568C;
  --problemcard-05-color: #414487;

  /* Sizing */
  --radius: 10px;

  /* Fonts */
  --heading-font: Satoshi, Verdana, sans-serif;
  --body-font: Arial, "Helvetica Neue", Helvetica, sans-serif;
  --button-font: Satoshi, Verdana, sans-serif;
}
```

---

## 10. Satoshi Font Loading

Satoshi is not available on Google Fonts. For landing pages:

**Option A** — Use Satoshi from Fontshare (free):
```html
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap" rel="stylesheet">
```

**Option B** — Use Inter as fallback (already available via Google Fonts):
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

Inter is visually similar to Satoshi and is already loaded on the Webflow site.
