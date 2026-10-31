# Validation — love.fútbol 1.1

Reviewed 30 October 2026.

## Source fidelity

- Source PDF SHA-256 and all 13 paths are checked by `scripts/extract-lovefutbol-logo.py`.
- The source white/red SVG preserves the original path and transform values. A parent translation normalizes the canvas; no curve simplification or tracing is used.
- Four-times-resolution comparison with the PDF source: logo-body intersection over union 0.9999868145; flag 0.9986023760. Four antialiased boundary pixels differ in each mask. See `reference/logo-extraction.json`.
- The positive black/red rendering was visually compared with the original official website raster.
- Original static font programs and licences have immutable upstream revisions and SHA-256 hashes in `fonts/source-manifest.json`.
- The expanded register contains 56 unique source IDs. All source references in the content model and application assumptions resolve; the EN/ES/pt-BR labels and landing routes were checked against their public pages.
- Site HTML and matching CSS establish the recorded declarations. DK Brush Crush on detail-page H1 elements is identified as a cascade inference; browser-computed style and font loading were not measured.
- Official raster alpha bounds are `[205,172,1137,704]` in a 1275 × 875 canvas. The smallest inset is 138/532 = approximately 0.259 of visible artwork height. The local quarter-height reserve remains an inference, not an official specification.
- The guide diagram uses the complete source bounds, including the flag. At 48 mm width, a quarter-height reserve is 6.821827 mm, below the retained 8 mm document reserve. The 32 mm / 144 CSS px starting sizes are labelled local recommendations. The size-study SVG and PNG show five screen widths in both treatments.

## Application and export checks

- `npm run make:lovefutbol`: generates the definition, menu logo, guide, offline reference and use instructions.
- `node scripts/brands/documentation.mjs --check`: source guides match every registered brand.
- `npm test`: all 38 test files pass, including manifest/brand validation, document profiles, template integrity and export checks.
- `npm run build`: production build passes. Existing bundle-size and mixed static/dynamic-import warnings remain.
- Full `build --office` export: 110 files; 14 DOCX publications/stationery, one six-slide PPTX and one HTML email signature are produced. All Office XML parses successfully; fonts remain embedded and offline HTML/Markdown links resolve.
- All 12 guide pages and 19 native templates render with the bundled fonts. The changed palette/type pages and four additional guide pages were visually reviewed. The new templates have no default clipping, out-of-canvas text or missing glyphs; their construction-rule overlays render correctly.
- Native Letter letterhead converts to one PDF page. Report Letter and report A4 each convert to six PDF pages. All three covers were visually checked; no text spans leave page bounds across the 13 pages. The reports use a serif fallback only for three bullet glyphs, not substantive text.
- Both new project-profile DOCX files convert to exactly two PDF pages, preserving the parallel content columns and supporting-evidence continuation. Their covers were visually checked. PowerPoint converts to six PDF slides; the comparison and dark community-voice slides were visually checked.
- The offline pack includes `USE.md`, source evidence, fonts/licences and the linked reference files.
- No fabricated standalone mark, favicon, partner logo, impact figures or licensed commercial font files are included.

## Testing boundary

A manual live-browser smoke test could not be completed: the connected-browser request timed out and the cloud browser could not reach this workspace’s local preview. This is not claimed as a passed manual desktop/mobile interaction test.

The initial published revision passed the complete [PR workflow](https://github.com/ahzs645/brandkit/actions/runs/41146866924): tests, build, Word pagination, document browser workflow, all-brand Word/PDF starters, UNBC naming/export checks, pattern-library checks and BC Hydro browser comparisons. The PR checks show the corresponding result for the follow-up commit; this note does not substitute the earlier run for the latest one. Deployment is skipped for pull requests. No merge or live-site deployment is part of this work.

The new image frames support inserting reviewed images in the exported SVG/PowerPoint. They do not add a photo-upload control to the app. Locale guidance and verified labels are authoring presets, not a complete translated application interface.

`docs/brand-details.html` is an offline reference intended to be opened with its adjacent exported folders. It is not a deployed route; Vite’s raw hashed asset URL does not preserve those relative file links.
