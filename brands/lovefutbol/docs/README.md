# love.fútbol — researched application kit

Sources reviewed 2026-10-30. Version 1.1 preserves original vector logo geometry, extends the live-site research and supplies 19 editable local layouts. The evidence and practical assumptions are labelled separately. This is not an organization-issued standards manual.

## What is included

- Complete logo in black/red and white/red, with the original red flag retained. SVG, PNG and PDF exports use the preserved source paths.
- Observed digital colours, including the active homepage cyan accent; Bahianita and Red Hat Text with original font files, OFL notices and source hashes.
- 12 guide pages; Letter/A4 stationery, proposed project briefs and documented project profiles; six presentation layouts; four social layouts and an email signature.
- Editable Word publications and stationery, a six-slide PowerPoint and HTML email signature through the existing export pipeline.
- Web tokens, CSS and a React full-logo component. The additional application guidance does not change the app into a translated website or add unsupported photo-upload controls.

## Evidence and practical choices

[Original research](RESEARCH.md) covers identity and artwork provenance. [Extended site research](SITE-RESEARCH.md) covers page patterns, audiences, language routes and source inconsistencies. [Application guide](APPLICATION-GUIDE.md) turns this evidence into twelve explicit local decisions, with sources and limits. The [source index](../reference/sources.json), [site evidence](../reference/site-visual-evidence.json), [content model](../reference/content-patterns.json) and [identity record](../reference/identity-rules.json) are included in the exported pack.

The vector source is love.fútbol’s 2025 guide contributed to U.S. Soccer. Its white/red artwork is preserved; the black/red variant changes only the main path fill to match the official website. See [extraction evidence](../reference/logo-extraction.json).

Bahianita is observed across several current pages, not only Projects. Some live project-detail H1 headings inherit DK Brush Crush, and H3 rules declare Acumin. Those commercial font files are not bundled. Annual reports and campaign pages use context-specific treatments. See [font sources](../fonts/source-manifest.json).

Local recommendations reserve one quarter of the complete logo height, start primary logos at 32 mm or 144 CSS px, and retain the report profile’s 48 mm artwork, 8 mm reserve and 20 mm margins. The [size specimens](logo-size-study.png) support visual review; the numbers are not official minima or a physical print proof. Dark text on green, light green, terracotta and cyan gives readable starter combinations.

## Rebuild and use

Run `npm run make:lovefutbol` to regenerate the definition, guide, local-assumption records, reference pages and instructions without network access. For an independent logo check, run `python scripts/extract-lovefutbol-logo.py --help`.

Use **Logos**, **Colour**, **Typography**, **Templates**, **Guide** and **Documents**. Replace every instructional placeholder. Add verified project information, dated metric definitions, exact approved quotations and suitable image files. Use the photo frames in exported SVG or PowerPoint for insertion; they are not an image-upload feature. Partner marks are supplied separately by their owners.

See [USE.md](../USE.md) for document and consumer integration instructions, and [validation](VALIDATION.md) for what was checked.
