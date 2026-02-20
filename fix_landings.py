#!/usr/bin/env python3
"""Apply 4 fixes to all landing pages."""
import re
import os
import glob

LANDINGS_DIR = "/Users/vova/Documents/GitHub/skillset-landing-pages/landings"

dirs = [
    "agencies", "ai-recruiter", "ai-recruiting", "ai-sourcing", "ats",
    "automation", "compare", "customers", "demo", "diversity", "dubai",
    "free-trial", "integrations", "job-description", "pricing",
    "resume-screening", "security", "small-business", "video-screening"
]

for d in dirs:
    filepath = os.path.join(LANDINGS_DIR, d, "index.html")
    if not os.path.isfile(filepath):
        print(f"MISSING: {filepath}")
        continue

    with open(filepath, "r") as f:
        content = f.read()

    original = content

    # ========== FIX 1: Add JS fallback setTimeout ==========
    old_js = "document.querySelectorAll('.sklst-fade').forEach(function(el) { o.observe(el); });"
    new_js = (
        "document.querySelectorAll('.sklst-fade').forEach(function(el) { o.observe(el); });\n"
        "setTimeout(function() { document.querySelectorAll('.sklst-fade:not(.visible)').forEach(function(el) { el.classList.add('visible'); }); }, 3000);"
    )
    if "setTimeout" not in content:
        content = content.replace(old_js, new_js)

    # ========== FIX 2: Add noscript + prefers-reduced-motion + scroll-margin-top ==========
    old_css = "    .sklst-fade.visible { opacity: 1; transform: translateY(0); }\n  </style>"
    new_css = (
        "    .sklst-fade.visible { opacity: 1; transform: translateY(0); }\n"
        "\n"
        "    /* Reduced motion */\n"
        "    @media (prefers-reduced-motion: reduce) {\n"
        "      .sklst-fade { transition: none; opacity: 1; transform: none; }\n"
        "    }\n"
        "\n"
        "    /* Scroll offset for fixed nav */\n"
        "    [id] { scroll-margin-top: 80px; }\n"
        "  </style>\n"
        '  <noscript><style>.sklst-fade { opacity: 1 !important; transform: none !important; }</style></noscript>'
    )
    if "prefers-reduced-motion" not in content:
        content = content.replace(old_css, new_css)

    # ========== FIX 3: Show CTA button on mobile ==========
    old_mobile = "      .sklst-nav-links { display: none; }"
    new_mobile = (
        "      .sklst-nav-links { display: none; }\n"
        "      .sklst-nav-links .sklst-btn-primary { display: flex; }\n"
        "      .sklst-nav { display: flex; justify-content: space-between; align-items: center; }"
    )
    if ".sklst-nav-links .sklst-btn-primary { display: flex; }" not in content:
        content = content.replace(old_mobile, new_mobile)

    # ========== FIX 4: Add target="_blank" to external CTA links ==========
    # For platform.skillset.ae/ links - add target="_blank" rel="noopener" if not present
    # Match <a href="https://platform.skillset.ae/" ...> WITHOUT existing target="_blank"
    def add_target_blank_signup(match):
        full = match.group(0)
        if 'target="_blank"' in full:
            return full
        # Insert target="_blank" rel="noopener" after the href attribute
        return full.replace(match.group(1), match.group(1) + '" target="_blank" rel="noopener', 1)

    # Process platform.skillset.ae/ links
    content = re.sub(
        r'(<a\s+href="https://app\.skillset\.ae/signup")([^>]*>)',
        lambda m: m.group(0) if 'target="_blank"' in m.group(0) else m.group(1) + ' target="_blank" rel="noopener"' + m.group(2),
        content
    )

    # Process calendly links WITHOUT onclick - these should get target="_blank"
    # Do NOT touch calendly links that have onclick (popup handlers)
    def fix_calendly_links(match):
        full = match.group(0)
        if 'target="_blank"' in full:
            return full
        if 'onclick' in full:
            return full
        # Add target="_blank" rel="noopener"
        href_part = match.group(1)
        rest = match.group(2)
        return href_part + ' target="_blank" rel="noopener"' + rest

    content = re.sub(
        r'(<a\s+href="https://calendly\.com/[^"]*")([^>]*>)',
        fix_calendly_links,
        content
    )

    if content != original:
        with open(filepath, "w") as f:
            f.write(content)
        print(f"FIXED: {d}/index.html")
    else:
        print(f"NO CHANGES: {d}/index.html")

print("\nDone! All 19 files processed.")
