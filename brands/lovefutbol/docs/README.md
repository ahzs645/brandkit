# love.fútbol — researched application kit

Sources reviewed 2026-10-30. This kit preserves original vector logo geometry, records the official identity story, and adds 13 editable local layouts. It is not an official standards manual and does not imply organization approval.

## What is included

- Complete logo in black/red and white/red, with the original red flag retained. SVG, PNG and PDF exports use genuine vector source geometry.
- Observed digital colours, Bahianita and Red Hat Text, their original font files and SIL Open Font License notices.
- 8 guide pages; Letter/A4 stationery and project briefs; four presentation layouts; social and email applications.
- Documents profiles for project reports, decision briefs, brand references and initiative overviews, with editable Word and printable HTML output.
- CSS, tokens and a React full-logo component through the existing web export pipeline.

## Evidence and choices

[Research](RESEARCH.md) explains the name, identity, history, community model, visual sources and unresolved questions. [Source index](../reference/sources.json) records the research trail. [Identity rules](../reference/identity-rules.json) distinguishes published facts, observed implementation and local choices. [Logo extraction](../reference/logo-extraction.json) records the source PDF and path/raster comparison; [font sources](../fonts/source-manifest.json) record immutable upstream revisions and hashes.

The vector source is love.fútbol’s 2025 guide contributed to U.S. Soccer. Its white/red artwork is preserved; the black/red variant changes only the main path fill to match the official website. The website capture contains a different raster canvas and does not establish numerical clear space. The raw capture, request headers, tracking data and commercial font files are not part of the kit.

The Projects page uses Bahianita display headings and Red Hat Text. Other website styles declare DK Brush Crush and Acumin, and annual reports have different typography. The kit therefore describes its pairing as an observed application, not a universal official font specification.

No official minimum size, clear-space measurement, Pantone/CMYK recipe, partner lockup or stationery standard was found. The 48 mm document logo, 8 mm space and 20 mm margins are local choices. Dark text is used on green and terracotta surfaces because white on those accents does not satisfy 4.5:1 for normal text.

## Rebuild and use

Run `npm run make:lovefutbol` to regenerate the definition, guide, menu logo and use instructions from local source files; no network access is needed. For an independent logo extraction check, run `python scripts/extract-lovefutbol-logo.py --help`. The source PDF and original font files are preserved with hashes.

Use the app’s **Logos**, **Colour**, **Typography**, **Templates**, **Guide** and **Documents** views. Replace all project, contact and image placeholders. Keep local communities central in the copy, preserve the dot and accent in love.fútbol, and cite dated sources for every impact measure. Partner logos and project photographs are not bundled.

See [USE.md](../USE.md) for reusable document and consumer integration instructions.
