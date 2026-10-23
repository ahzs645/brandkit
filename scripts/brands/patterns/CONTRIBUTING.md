# Pattern collections

Each brand has a module named `<brand-id>.mjs`. Work only in your assigned module and optional
`test/patterns-<brand-id>.test.js`; the coordinator integrates brand definitions, generators,
gallery pages, shared engine support, docs and export checks.

Export:

- `STUDIES`: 6–8 entries `{ id, name, description, palette, kind: 'tile' | 'focal' }`.
  IDs must start with `explore-` and be unique within the brand. Keep tile claims accurate.
- `PALETTES`: 2–3 entries `{ id, name, background, ink, accent, secondary }`. Colour values
  are existing palette keys (or documented roles), not new hex values.
- `supportingSymbols(brand)`: returns an object of optional additional `brand.symbols`.
  Use `explore-` names; do not alter any existing symbol or identifying signature.
- `buildPattern(brand, studyId, options = {})`: a **self-contained pure function** with no
  external imports, captured module variables, Node calls, randomness, time or side effects.
  All helpers/constants needed at runtime must be inside this function. The explorer serializes
  it verbatim into an offline page. `options` contains `{ scale: 100, density: 100, palette }`,
  where `palette` is a PALETTES entry. Make sensible defaults if absent. Both sliders range
  50–150. The passed brand includes the results of supportingSymbols.
  Return a 960×600 spec `{ id, width, height, background, place?, dots?, lines? }`.
  `place`: `{ x, y, scale, colour, symbol?, rotation? }`. Rotation is around the chosen symbol's
  viewBox centre. Without `symbol`, place uses the original symbol. Prefer normalized custom
  symbols with viewBox `[0,0,w,h]`. `dots`: `{ cx, cy, r, colour }`.
  `lines`: `{ points: [[x,y],...], colour, width, opacity? }`. Clip line coordinates to the canvas.
  Return stable finite geometry. Use varied scale, direction and rhythm where appropriate.
- `APPLICATIONS`: two entries `{ id, name, pattern, layout: 'square' | 'presentation',
  description, eyebrow, exampleTitle }`. IDs also start with `explore-`; `pattern` names a
  STUDIES ID. The coordinator builds editable layouts and makes example previews.
- `INTRO`: a short explanation of the brand's new supporting graphics and any source context.

Use the actual brand's artwork and visual language, not SPARK arrows copied to every brand.
Historical BC work should be clearly described as new supporting studies informed by the
manuals, without claiming manual approval. Keep Province heraldry complete and upright;
derive repeating graphics from supporting geometry or floral forms instead of fragmenting
the coat of arms. Preserve all existing assets, approvals, revisions and historical material.

Render an actual comparison board of your studies with the existing `pattern()` function and
Playwright/Chromium; inspect it with view_image, refine any awkward overlaps or poor contrast,
and save screenshots in `/workspace/artifacts/brand-patterns/<brand-id>/`. Report the module,
tests, strongest studies and any limitations. Do not commit, push or edit shared files.
