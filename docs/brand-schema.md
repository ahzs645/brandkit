# brand.json

One JSON document is a whole identity. brandkit draws every file of a kit from it: logos,
symbols, patterns, icons, templates, the brand guide, logo sheets, web files. Two complete examples
are in this repository:

- [`brands/ddcnorth/brand.json`](../brands/ddcnorth/brand.json): a real identity, written by hand
  from the original kit's Python source. The engine reproduces that kit's vector files byte for
  byte (`test/parity.test.js`).
- [`brands/northwind/brand.json`](../brands/northwind/brand.json): made by the starter
  (`npm run make:example`), which is also what the app's **New brand** does.
- [`brands/bc-province-1977/brand.json`](../brands/bc-province-1977/brand.json) and
  [`brands/bc-hydro-1983/brand.json`](../brands/bc-hydro-1983/brand.json): two historical identity
  programs, written by `npm run make:bc` from scripts that carry each manual measurement with its
  source. They exercise composed signatures, colourways, departments, and templates in
  millimetres.

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

## Signatures, colourways and departments

A brand whose logo is composed rather than fixed defines `signatures` instead of `families`. The
Province's 1977 ministerial signature sets any ministry's name on one cap-height grid; BC Hydro's
four signatures are fixed artwork in up to three colours. Both are described the same way:

```json
"signatures": [{
  "id": "horizontal", "label": "Flush-left, horizontal", "departmental": true, "use": "Stationery and advertising.",
  "metrics": { "font": "medium", "capHeight": 100, "baseline": 100, "logotypeX": 590 },
  "elements": [
    { "type": "symbol", "x": 0, "y": 0, "height": 390 },
    { "type": "stack", "id": "province", "x": 590, "y": 100, "items": [{ "text": "Province of", "size": 137.17, "font": "medium", "leading": 145 }, …] },
    { "type": "stack", "id": "ministry", "x": 1890, "y": 100, "items": [{ "field": "ministry", "size": 137.17, "font": "regular", "leading": 145, "wrap": 1300 }, …] },
    { "type": "rule", "x1": 590, "x2": "auto", "y1": "after:ministry,province+95", "width": 11.4, "when": "address" }
  ]
}]
```

Signature elements, in any units (the canvas is fitted to what is drawn):

| Type | What it is |
| --- | --- |
| `symbol` | A brand symbol (`brand.symbol`, or one of `brand.symbols` by `symbol`) at a height. |
| `art` | Fixed artwork with `bounds`; `{role}` placeholders in its markup take the colourway's colours. |
| `text` | A line: `text`, or a `field` filled from the values (a ministry, a branch). |
| `stack` | Lines one under another, each item with its own size, face and `leading`, `gapBefore`, `wrap`, `caps`, `join` (set a multi-line field on one line), `when` (only if a field is filled). |
| `run` | One line in several faces: "**Province of British Columbia** Ministry of …". |
| `rule` | A rule; `y` may be `after:<stack>+gap`, `x2` may be `auto` (to the artwork's edge), `when` a field. |

`metrics` (the logotype's cap height, baseline and left edge, in signature units) let a template
place a signature the way manuals measure it: as "a 36 point signature" hanging from its cap line,
or with the left of its logotype on a column.

`colourways` say what each colour role is painted in: `{ "positive": { "label": …, "roles": {
"symbol": "brown", "type": "black" } }, "black": { "all": "black" }, … }`. `defaultColourway`
picks the one used when none is named; a colourway's `ground` is the background it is shown on.

`departments` are the units a signature is set for: `{ "label": "Ministry", "field": "ministry",
"items": [{ "id": "forests", "name": "Ministry of Forests", "years": "1976–1986", "values": {
"ministry": "Ministry of\nForests" } }] }`. The kit sets every `departmental` signature for every
item (`logos/<folder>/<id>/`); the app's logos view and template studio fill their fields from the
chosen one.

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

Templates in `mm` may also use:

- `symbol` (`{ x, y, height, colour }`), and `logo` with a `signature`, a `colourway`, `values`
  overriding the fields for that signature alone, and `points` / `anchorX: 'logotype'` /
  `anchorY: 'baseline' | 'cap'` to size and hang it as a manual specifies.
- `flow`: fields stacked down the page, each item's first baseline `gap` below the last baseline
  of the one before, so a longer title pushes what follows it down.
- `lines` with `align: 'bottom'` (y is the last baseline, as on a card whose address is set from
  its foot) and `anchor`.

Every `text` element with an `id` is a **field**: the app's template studio shows a box for it,
and the value replaces the placeholder. Fields are shared by id across templates, so a name typed
once fills the card, the letterhead and the envelope. A `lines` element is a block of fields with
fixed leading that closes up around empty lines (an address with an optional second line). A
`paragraph` is one field wrapped to a width, at the words and at any line break typed into it, up to
`maxLines` (a ministry name on a letterhead, which breaks differently in each template's column).
A `text` with `compose` (`"Phone: {telephone}"`) builds one line from other fields, and is left
out when any of them has been cleared. `brand.fields` (`{ "telephone": { "label": "Telephone",
"placeholder": "(604) 000-0000" } }`) names fields and gives composed lines their defaults.

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

## Revisions

Proposed changes are kept beside the approved identity instead of replacing it:

```json
"revisions": [{
  "id": "rising", "title": "Rising symbol", "version": "2.2-rising", "displayVersion": "2.2",
  "status": "proposed", "date": "2026-10-18",
  "summary": "…", "rationale": ["…"],
  "changes": { "symbol": { "centres": [[216, 40], …], "rows": [1, 2, 3] } }
}]
```

`changes` is merged into the definition (objects key by key; arrays and other values replace;
`null` removes). The app's revision switcher shows every page, and builds the whole kit, as the
revision would make it. The approved kit carries each revision in `revisions/<id>/`: its logos and
symbols, a `README.md` with the rationale, its own `brand.json`, and any guide sheet with
`"group": "revisions"` and a `path` there, such as a side-by-side comparison. Guide `logo` and
`symbol` elements take `"revision": "<id>"` to draw a proposal's artwork for such a sheet.
Approving a revision means moving its `changes` into the definition and removing the entry.

## Illustrations

Drawings of what the identity goes on (a van, a cab door, a blazer, a locomotive), each with
branding zones, the places the identity goes:

```json
"illustrations": { "V13-cab-door": { "title": "…", "viewBox": [x, y, w, h], "object": "<g>…</g>", "markings": "…",
  "zones": [{ "id": "door-signature", "kind": "signature", "box": [x, y, w, h], "quad": [[x, y], …], "colour": "#ffffff", "default": "Agriculture" }] } }
```

A zone's `quad` is its corners, top left first, so a zone on a surface seen at an angle is a
parallelogram. A template places an illustration and fills its zones:

```json
{ "type": "illustration", "illustration": "V13-cab-door", "x": 0, "y": 0, "width": 1600, "fields": ["ministry"],
  "zones": { "door-signature": { "signature": "vehicle", "defaults": { "ministry": "Ministry of\nAgriculture" } },
             "unit": { "id": "unit-number", "text": "1604-2103", "font": "regular" } } }
```

A zone takes a signature (with fixed `values`, or `defaults` that give way to the template's
fields), a `symbol`, or text (an `id` makes it a field; `curve` sets it on an arc). It is drawn in
the zone's colour unless it names one, fitted inside the zone, and turned and skewed with it. The
BC brands' illustrations come from `manuals/bc/illustrations`.

## Sources

A brand rebuilt from a manual can say where each piece comes from. Templates, signatures and guide
pages take `sources`, the manual pages they are built from:

```json
"sources": [{ "book": "reproduction", "page": "R08", "manual": "Reproduction Manual", "title": "General Use stationery", "printed": "7" }]
```

`book` and `page` are ids in a manual pack, which `manuals: { "pack": "bc" }` names; the rest is
there so the citation reads on its own. The app shows sources as links into its manual library,
and the library lists, under each page, what the built-in brands build from it (indexed in
`brands/index.json` by `scripts/brands/common.mjs`, whose `cite()` also refuses to write a brand
with anything uncited).

## Web, patterns, icons, files

- `patterns`: the symbol repeated (`repeat: { x: [from, to, step], y: […], scale, colour }`) or
  placed (`place: [{ x, y, scale, colour }]`) on a background.
- `icons`: `{ size, attrs, items: [{ id, content }] }`, drawn in `currentColor`.
- `web`: React component names, CSS variable prefix, app icon and favicon settings, and the copy
  for the kit's index.html and landing template.
- `files`: supplied files copied into the kit as they are (fonts, licences, documents).
  `{ "to": "README.md", "from": "docs/README.md" }` or a bare path.
