# Validation — love.fútbol 1.0

Reviewed 30 October 2026.

## Source fidelity

- Source PDF SHA-256 and all 13 paths are checked by `scripts/extract-lovefutbol-logo.py`.
- The source white/red SVG preserves the original path and transform values. A parent translation normalizes the canvas; no curve simplification or tracing is used.
- Four-times-resolution comparison with the PDF source: logo-body intersection over union 0.9999868145; flag 0.9986023760. Four antialiased boundary pixels differ in each mask. See `reference/logo-extraction.json`.
- The positive black/red rendering was visually compared with the original official website raster.
- Original static font programs and licences have immutable upstream revisions and SHA-256 hashes in `fonts/source-manifest.json`.

## Application and export checks

- `npm run make:lovefutbol`: generates the definition, menu logo, guide, offline reference and use instructions.
- `node scripts/brands/documentation.mjs --check`: source guides match every registered brand.
- `npm test`: all 38 test files pass, including manifest/brand validation, document profiles, template integrity and export checks.
- `npm run build`: production build passes. Existing bundle-size and mixed static/dynamic-import warnings remain.
- Full `build --office` export: all assets resolve; 12 DOCX publications/stationery, one four-slide PPTX and one HTML email signature are produced. Office XML parses successfully and Word fonts are embedded.
- All eight guide pages and 13 native templates render with the bundled fonts. Rendered pages were visually inspected; the guide has no measured text outside its canvas.
- Native Letter letterhead converts to one PDF page. Report Letter and report A4 each convert to six PDF pages. All three covers were visually checked; no text spans leave page bounds across the 13 pages. The reports use a serif fallback only for three bullet glyphs, not substantive text.
- The offline pack includes `USE.md`, source evidence, fonts/licences and the linked reference files.
- No fabricated standalone mark, favicon, partner logo, impact figures or licensed commercial font files are included.

## Testing boundary

A live browser smoke test could not be completed: the connected-browser request timed out and the cloud browser could not reach this workspace’s local preview. This is not claimed as a passed desktop/mobile interaction test. The PR workflow supplies the repository’s existing browser and document gates. No merge or live-site deployment is part of this change.

`docs/brand-details.html` is an offline reference intended to be opened with its adjacent exported folders. It is not a deployed route; Vite’s raw hashed asset URL does not preserve those relative file links.
