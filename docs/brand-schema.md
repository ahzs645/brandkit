# brand.json

One JSON document is a whole identity. brandkit draws every file of a kit from it: logos,
symbols, patterns, icons, templates, the brand guide, logo sheets, web files. Two complete examples
are in this repository:

- [`brands/ddcnorth/brand.json`](../brands/ddcnorth/brand.json): a real identity, written by hand
  from the original kit's Python source. The engine reproduces that kit's vector files byte for
  byte (`test/parity.test.js`).
- [`brands/northwind/brand.json`](../brands/northwind/brand.json): made by the starter
  (`npm run make:example`), which is also what the app's **New brand** does.

Paths to files (`fonts.*.file`, `files`) are relative to the folder holding brand.json. A path the
brand does not carry itself is looked up in the built-in brands' folders, which is how a starter
brand uses the shared Inter and Space Mono files.

Copy can refer to the definition with `{placeholders}`: `{name}`, `{upperName}`,
`{displayVersion}`, `{copy.tagline}`, `{symbol.viewBox.2}`, `{lockup.iconHeight}`,
`{derived.diameter}`, `{derived.gap}`, `{derived.dotCount}`, `{derived.rows}`, `{fonts.body.label}`…
An unknown placeholder is left as written, so a typo shows on the page.

## Identity

| Key | What it is |
| --- | --- |
| `id` | Lower-case slug. Prefixes file names (`symbol/<id>-symbol-black.svg`). |
| `name`, `version`, `displayVersion` | Shown in titles, the guide's running head, the kit's index. |
| `colours` | Palette: `{ "midnight": "#0B2B4A", … }`. Six-digit hex. Keys appear in file names. |
| `colourNames` | Optional display names, when title case of the key is not right. |
| `roles` | Which colour does which job: `ink`, `paper`, `muted`, `primary`, `light`, `reverse`, `line`, `rule`. Templates and guide pages ask for roles, so a new palette re-colours them. A role may name a palette key or a literal hex. |
| `logoColours` | Colours every logo is drawn in. `currentColor` gives the inheriting variant. |
| `rasterColours` | The subset that also gets PNG and PDF files. |
| `fonts` | Faces by role: `body`, `bold`, `display`, `displayRegular`, `extra`, `label`. Each `{ family, stack, weight, style?, file, web, label, slant? }`. `file` (TTF or OTF) is used to outline text; `web` (WOFF2 or any) goes in `@font-face`. `slant` (degrees) shears outlines for a face with no italic. |
| `typography` | Headline, body and label settings for tokens and CSS. |

## Symbol

```json
"symbol": { "name": "six-dot", "viewBox": [0, 0, 256, 256], "radius": 40, "microRadius": 36,
            "centres": [[40, 40], [128, 40], …], "horizontalPitch": 88, "verticalPitch": 88, "rows": [3, 2, 1] }
```

A symbol is one of:

- **circles**: `centres` and `radius` (and `microRadius` for the favicon variant);
- **paths**: `paths` (strings or `{ d, fillRule?, fill? }`), with optional `microPaths`;
- **markup**: `markup`, an SVG fragment drawn in the viewBox (for a mark that is artwork, not
  geometry). Shapes inherit the fill the engine sets, so leave them unfilled to recolour.

## Wordmark

```json
"wordmark": {
  "height": 82.5, "left": -0.5,
  "glyphs": { "d": "M66.5 0H48V31.7…", "c": "…", "north": "…" },
  "variants": {
    "ddcnorth": { "width": 438.910343, "parts": [{ "glyph": "d", "x": 0, "attrs": { "data-letter": "d" }, "fillRule": "evenodd" }, …] },
    "ddc": { "width": 203, "parts": […] }
  },
  "editable": { "hybrid": { … }, "text": { … } }
}
```

`glyphs` are outlines in wordmark units (`height` tall, baseline at the bottom). A variant places
them (`x`, `y`) and says where the artwork ends (`width`); `left` is any overhang before x = 0. A
part may instead be `{ "text": "acme", "font": "display", "size": 100, "x": 0, "y": 80 }`, set
from a face at render time; the starter outlines typed text once and stores the glyph, which is
the sturdier choice for a production logo. `editable` alternatives keep some lettering as live
`<text>` for people who need to edit it in a design tool.

## Families and lockups

```json
"families": [{ "id": "ddcnorth", "wordmark": "ddcnorth", "typeHeight": 120, "label": "ddcnorth" }, …],
"lockup": { "iconHeight": 120, "iconGap": 8, "stackedIconHeight": 128, "stackedTypeHeight": 88,
            "stackedGap": 28, "canvasPadding": 16, "wordmarkHeight": 120, … }
```

Each family is drawn in four layouts: `horizontal`, `stacked`, `wordmark`, `symbol`.

## Templates

A template is a canvas and a list of elements. Coordinates are in `unit` (`px` by default, or
`mm`); sizes may be written in points (`"10pt"`). See the comment at the top of
[`src/engine/templates.js`](../src/engine/templates.js) for every element type.

```json
{ "id": "business-card-back", "label": "Business card, back", "group": "Business cards",
  "width": 960, "height": 560, "physical": ["96mm", "56mm"], "raster": 1920,
  "print": { "trim": [90, 50], "bleed": 3, "unit": "mm" },
  "elements": [
    { "type": "background", "fill": "paper" },
    { "type": "text", "id": "contact-name", "text": "[Name]", "x": 90, "y": 140, "size": 44, "colour": "ink", "font": "bold" },
    { "type": "motif", "id": "card-symbol", "x": 725, "y": 327, "width": 150, "height": 128, "colour": "primary", "align": "right" },
    { "type": "printGuides", "colour": "muted", "trim": { … }, "safe": { … } }
  ] }
```

Every `text` element with an `id` is a **field**: the app's template studio shows a box for it,
and the value replaces the placeholder. Fields are shared by id across templates, so a name typed
once fills the card, the letterhead and the envelope. A `lines` element is a block of fields with
fixed leading that closes up around empty lines (an address with an optional second line).

## Guide

```json
"guide": {
  "width": 1440, "height": 1020,
  "frame": { "background": "paper", "logo": { "x": 62, "y": 30, "width": 165 }, "header": "…", "footer": "…" },
  "pages": [{ "title": "…", "subtitle": "…", "name": "Primary lockup", "elements": [ … ] }, …],
  "sheets": [{ "id": "logo-sheet-01", "group": "logo-sheets", "width": 1440, "height": 1020, "elements": [ … ] }]
}
```

Guide elements: `label`, `text`, `para` (wrapped), `rect`, `rule`, `path`, `logo` (scaled to
`width`, or fitted in a `width` × `height` box), `symbol`, `nested` (another kit file, e.g.
`"templates/social-post"`), and the composite blocks `symbolConstruction`, `specTable`,
`swatches`, `swatchStrip` and `list`. Text on guide pages is set as outlines.

## Web, patterns, icons, files

- `patterns`: the symbol repeated (`repeat: { x: [from, to, step], y: […], scale, colour }`) or
  placed (`place: [{ x, y, scale, colour }]`) on a background.
- `icons`: `{ size, attrs, items: [{ id, content }] }`, drawn in `currentColor`.
- `web`: React component names, CSS variable prefix, app icon and favicon settings, and the copy
  for the kit's index.html and landing template.
- `files`: supplied files copied into the kit as they are (fonts, licences, documents).
  `{ "to": "README.md", "from": "docs/README.md" }` or a bare path.
