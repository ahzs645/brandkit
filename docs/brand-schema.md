# brand.json

One JSON document is a whole identity. brandkit draws every file of a kit from it: logos,
symbols, patterns, icons, templates, the brand guide, logo sheets, web files. Worked examples
are in this repository:

- [`brands/ddcnorth/brand.json`](../brands/ddcnorth/brand.json): a real identity, written by hand
  from the original kit's Python source. The engine reproduces that kit's vector files byte for
  byte (`test/parity.test.js`).
- [`brands/northwind/brand.json`](../brands/northwind/brand.json): made by the starter
  (`npm run make:example`), which is also what the app's **New brand** does.
- [`brands/firstform/brand.json`](../brands/firstform/brand.json): written by
  `npm run make:firstform` from a kit that had only PNG logos. Its symbol is `paths` (two
  even-odd blocks, with heavier `microPaths`), and its wordmark is two outlined lines.
- [`brands/bc-province-1977/brand.json`](../brands/bc-province-1977/brand.json) and
  [`brands/bc-hydro-1983/brand.json`](../brands/bc-hydro-1983/brand.json): two historical identity
  programs, written by `npm run make:bc` from scripts that carry each manual measurement with its
  source. They exercise composed signatures, colourways, departments, and templates in
  millimetres.
- [`brands/unbc/brand.json`](../brands/unbc/brand.json): complete supplied institutional
  artwork, permitted logo colours, minimum physical size, source resources and separate
  department/subdepartment document text. `npm run make:unbc` records the official rules and
  local application defaults separately.

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
| `fonts` | Faces by role: `body`, `bold`, `display`, `displayRegular`, `extra`, `label`. Each `{ family, stack, weight, style?, file, web, label, slant?, office?, consumerFamily?, officialFamily?, note? }`. `file` (TTF or OTF) is used to outline text; `web` (WOFF2 or any) goes in `@font-face`. `slant` (degrees) shears outlines for a face with no italic. See the font distinctions below. |
| `typography` | Headline, body and label settings for tokens and CSS. `labels.textTransform` accepts `none`, `uppercase`, `lowercase` or `capitalize`; omitted or unrecognized values retain the existing `uppercase` default. |
| `logoPolicy` | Optional permitted paint, standalone-symbol, physical-width and clear-space controls. |
| `organization` | Institutional name and separate document-text naming configuration. |
| `brandArchitecture` | Related brands with explicit relationship labels and notes. |
| `officialResources` | Source-resource metadata and links; supplied local files must also be listed in `files`. |

### Official faces and rendering substitutes

`fonts.*.family` names the actual font program loaded by the engine. `office` names the face
requested in Office documents. Set `consumerFamily` when a downstream application's intended
body face differs from the bundled renderer; design tokens and the portable profile then use
that family. `officialFamily` records the authoritative identity face without claiming that its
font program is included. `stack` remains the CSS fallback stack, and `note` explains the choice.

For example, UNBC declares `family: "Helvetica Neue LT Pro"`, `office: "Arial"`,
`consumerFamily: "Arial"` and `officialFamily: "Helvetica Neue"`. The bundled LT Pro faces set
the artwork; Arial, the university's documented alternative, is what Office files, email and
web pages name, because the faces' licence allows preview and print embedding only. The consumer profile exposes this distinction as `family`,
`renderingFamily`, `officialFamily` and `note`; it contains no font binaries. Logo artwork stays
outlined and does not depend on any of these body-font selections.

### Fixed institutional artwork

For artwork that permits only specified variants, define one fixed `art` signature and explicit
colourways, then declare the optional controls:

```json
"logoPolicy": {
  "allowedColours": ["green", "black", "white"],
  "allowInheritedColour": false,
  "standaloneSymbol": false,
  "minimumWidthMm": 38.1,
  "clearSpaceRatio": 0.036905884246591095,
  "note": "Use the complete supplied logo and observe its permitted background rules."
},
"web": { "icons": false }
```

| Field | Behaviour |
| --- | --- |
| `allowedColours` | Required when `logoPolicy` is present. Nonempty array of keys in `colours`. Logo rendering checks the resolved paint, including every role in a colourway, against this set. A literal resolving to a permitted colour is accepted. |
| `allowInheritedColour` | `false` rejects `currentColor` and removes the inherited-colour export. The generated fixed-artwork React component selects explicit colourways and their configured backgrounds. |
| `standaloneSymbol` | `false` rejects symbol/motif rendering and standalone symbol export, and omits symbol files and corresponding previews. The required `symbol` data may hold the complete source artwork for structural compatibility; that does not make it a permitted isolated mark. |
| `minimumWidthMm` | Positive minimum width. Native templates reject complete-logo placements below this physical width. Use the same value in `lockup.minimumHorizontalWidthMm`, which the shared document profile also reads. |
| `clearSpaceRatio` | Nonnegative ratio of logo width used to calculate surrounding space. Record whether it is an official numeric rule or an implementation measurement of an official visual rule. |
| `note` | Plain-language restrictions and context, carried to consumers. Background and approval requirements must remain explicit in the source notes. |
| `web.icons` | `false` omits generated favicon/app-icon files and links. Direct favicon/app-icon render calls reject instead of shrinking the logo into a new mark. |

`logoDimensions(brand, widthMm)` from `brandkit/engine` validates the width and returns
`widthMm`, `minimumWidthMm`, `clearSpaceMm` and `totalWidthMm`. The reserved space is the larger
of `widthMm × clearSpaceRatio` and `documentation.logo.clearSpaceMm`. A document's spacing can
therefore exceed the identity minimum without redefining it. Preserve the artwork's aspect
ratio and distinguish its visible width from any padded canvas. UNBC's source signature has
zero intrinsic padding so 38.1 mm means 38.1 mm of visible full artwork.

The fixed-artwork React component also preserves proportional sizing and reserves the measured
clear space. Its numeric width is in CSS pixels, with the print minimum mapped at 96 px/in;
that mapping is an implementation choice, not a separately published digital standard.
Use `colourways.*.ground` for the intended preview/component background. The paint check does
not infer whether every surrounding photograph or separately authored page obeys the source's
background guidance.

For UNBC, the 38.1 mm minimum and the B-to-N clear-space definition come from the official
manual. The numeric ratio is a conservative measurement of the supplied SVG. The default
55 mm document logo, 8 mm reserved space and page-layout measurements are local decisions.
See [`brands/unbc/reference/identity-rules.json`](../brands/unbc/reference/identity-rules.json)
for the source pages and measured values. Other brands without these controls retain their
existing behaviour.

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
| `stack` | Lines one under another, each item with its own size, face and `leading`, `gapBefore`, `wrap`, `openers` (words such as "and" and "&" that open a wrapped line rather than end one), `caps`, `join` (set a multi-line field on one line), `when` (only if a field is filled). |
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
chosen one. An item may also carry a `group` (the menus list items under it), a `path` (where the
unit sits in the organization), `alternateOf` (the full name of a short form) and `matched` (the
official artwork its line breaks were matched to). Optional `departments.note` explains the list.

A brand with departmental signatures and `departments` has a **Departments** view: a sub-logo
editor for any listed unit or a typed name, whose wrapping follows the signature's `wrap` and
`openers` and which warns when a word is too long to break. UNBC's sub-logo is one `art` element
(the full logo) and one `stack` hanging the `department` field under it.

## Organizational names and relationships

Use `organization` when names should be editable document attribution beneath a fixed logo.
This differs from `departments`, which composes signatures according to an established source
construction. The **Departments** view is shown for brands with either. When a brand has both, as
UNBC does, the sub-logo chosen there also names its documents and templates.

```json
"organization": {
  "name": "University of Northern British Columbia",
  "shortName": "UNBC",
  "kind": "university",
  "naming": {
    "mode": "document-text",
    "levels": ["department", "subdepartment"],
    "note": "Department names are document text; official departmental logos are supplied separately.",
    "sourceUrl": "https://www.unbc.ca/communications-and-marketing/logos-and-graphic-standards"
  }
},
"brandArchitecture": {
  "relatedBrands": [{
    "id": "sparklab",
    "label": "SPARK Lab",
    "relationship": "UNBC lab",
    "note": "A separate identity in this kit; this relationship does not establish an approved sub-logo."
  }]
},
"officialResources": [{
  "title": "Official UNBC letterhead",
  "url": "https://www.unbc.ca/sites/default/files/sections/communications-and-marketing/lhopt1official.docx",
  "format": "docx",
  "localPath": "official-templates/lhopt1official.docx",
  "note": "Original university template retained without edits."
}]
```

`organization.name` is required and `organization.naming.mode` must be `document-text`.
The current naming workflow has two fields, `department` and `subdepartment`; `levels` describes
them and does not create arbitrary extra hierarchy levels. Names are normalized to one line
of source text, have at most 180 characters each and wrap at the available width, including
long words. A subdepartment requires a department in the naming/publication workflow. Save
through **Departments**, or edit the affiliation fields in **Documents**, to carry the names
into both publication values and the native template fields with those IDs. The sizing-preview
width is a calculator setting, not a change to `documentation.logo.widthMm`.

Publishers and CLI callers supply `values.affiliation: { department, subdepartment }`; the flat
`values.department` and `values.subdepartment` aliases are also accepted. The exported
publication stores `affiliation` separately from the logo. Importing its JSON retains the names
as editable content. Empty levels disappear. Native templates should leave their naming defaults
empty and reserve sufficient space for the supported name lengths.

`brandArchitecture.relatedBrands` records links to other brand IDs with `label`, `relationship`
and `note`; it does not inherit their artwork, merge identities or prove that an associated
organization is a department. UNBC records SPARK Lab as a university lab and Over the Edge as
an independent newspaper. Use evidence for the relationship and retain any qualification.

`officialResources` is descriptive metadata, not a download instruction. `localPath` identifies
an already-supplied file relative to the brand directory; list it in `files` to include its
bytes. For brands with `logoPolicy`, supplied files under `reference/` and
`official-templates/` are retained in task packs when asset inclusion is enabled. The source
identity/provenance JSON and notes travel with the assets. Preserve official originals and
record retrieval dates, source URLs, hashes and any transformations separately from local
application templates.

## Families and lockups

```json
"families": [{ "id": "ddcnorth", "wordmark": "ddcnorth", "typeHeight": 120, "label": "ddcnorth" }, …],
"lockup": { "iconHeight": 120, "iconGap": 8, "stackedIconHeight": 128, "stackedTypeHeight": 88,
            "stackedGap": 28, "canvasPadding": 16, "wordmarkHeight": 120, … }
```

Each family is drawn in four layouts: `horizontal`, `stacked`, `wordmark`, `symbol`.

A variant may carry its own `height` (wordmark units), used in place of `wordmark.height` when that
variant is scaled: a wordmark without its subtext line, or one stacked on several lines, is a
different height from the rest. A family whose logo is its lettering alone sets `lockupSymbol:
false`: its `horizontal` layout is its wordmark at `typeHeight` with no symbol beside it, and its
`stacked` layout is the variant named by `stackedWordmark` (or its own) at `stackedTypeHeight`, with
no symbol above it. The `wordmark` and `symbol` layouts are unchanged. Over the Edge uses both
([`brands/overtheedge/brand.json`](../brands/overtheedge/brand.json)).

A family with `stackedWordmark` also supports the `wordmark-stacked` layout, which draws only that lettering in its original proportions. The kit includes separately named horizontal and stacked wordmark exports. In the overview, Layout is a dropdown and Wordmark is an independent checkbox.

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

In any unit, a stroked `rect`, `path` or `line` may take `dash` (an SVG `stroke-dasharray`, such as
`"6 5"`): Over the Edge's issue index is ruled with dashed `path`s.

Every `text` element with an `id` is a **field**: the app's template studio shows a box for it,
and the value replaces the placeholder. Fields are shared by id across templates, so a name typed
once fills the card, the letterhead and the envelope. A `lines` element is a block of fields with
fixed leading that closes up around empty lines (an address with an optional second line). A
`paragraph` is one field wrapped to a width, at the words and at any line break typed into it, up to
`maxLines` (a ministry name on a letterhead, which breaks differently in each template's column).
A `text` with `compose` (`"Phone: {telephone}"`) builds one line from other fields, and is left
out when any of them has been cleared. `brand.fields` (`{ "telephone": { "label": "Telephone",
"placeholder": "(604) 000-0000" } }`) names fields and gives composed lines their defaults.

### Sets

`sets` make variants of one thing one item in the studio, with a switcher between them and a PDF
of them all:

```json
"sets": [{ "id": "business-card", "label": "Business card", "group": "Business cards",
  "variants": [{ "template": "business-card-front", "label": "Front" }, { "template": "business-card-back", "label": "Back" }] }]
```

The templates stay templates (the kit still writes each one's files); the set only groups them.

### Office documents

`documents` are the Office files made from templates:

```json
"documents": [
  { "id": "letterhead-a4", "label": "Letterhead, A4", "format": "docx", "pages": ["letterhead-a4", "letterhead-continuation"] },
  { "id": "report", "label": "Report", "format": "docx", "pages": ["report-cover", "report-page"], "continue": true },
  { "id": "presentation", "label": "Presentation", "format": "pptx", "layouts": ["presentation-cover", "presentation-section"] },
  { "id": "email-signature", "label": "Email signature", "format": "html", "template": "email-signature" }
]
```

A Word document takes its first page from the first template and later pages' header and footer
from the second (with `continue`, the second's body text follows on a new page, as a report's
first page of text follows its cover). Each page's artwork (everything but its text) is drawn
behind it. Text with a field becomes real text: in the header (above the lowest rule in the top
quarter, or a masthead band), in the body, or in the footer (below the lowest rule in the last
quarter); in the body, labels beside the fields come too, lines sharing a baseline go on tab
stops, and rules become borders. A PowerPoint template gets a slide layout per template, its
fields as placeholders (the largest worded one the title), and a sample slide of each. An email
signature is a table: the drawing left of the text as an image, then the text, line by line,
with mail, phone and web links.

A face's `office` name is the font a document asks for, where it differs from the face itself:
the Province's TeX Gyre Heros stands in for Helvetica, so its documents name Helvetica. Faces with
no `office` name are embedded in Word files when they are TrueType.

### Document applications

The optional `documentation` object adjusts the shared document profiles without changing
identity artwork or adding layouts to `templates`. All brands derive useful defaults when it
is absent. `documentProfile(brand, { paper: 'letter' | 'a4' })` resolves the brand's fonts,
colours, preferred supplied logo, physical margins and source status. `publicationModel`
produces a shared editable content model for Word and printable HTML, with cover, content,
product detail, screenshot/evidence, comparison and closing page kinds.

```json
"documentation": {
  "margins": { "topMm": 20, "rightMm": 18, "bottomMm": 18, "leftMm": 20 },
  "typography": {
    "title": { "font": "display", "sizePt": 32, "lineHeight": 1.12 },
    "body": { "font": "body", "sizePt": 10.5, "lineHeight": 1.45 }
  },
  "colours": { "paper": "white", "ink": "ink" },
  "logo": { "widthMm": 60, "clearSpaceMm": 8 },
  "affiliation": {
    "mode": "document-text",
    "departmentSizePt": 12,
    "subdepartmentSizePt": 10.5,
    "lineHeight": 1.3,
    "gapAfterMm": 5,
    "maxCharacters": 180,
    "note": "Local document hierarchy; not a departmental-logo specification."
  },
  "defaultPurpose": "report",
  "publishedPurposes": ["report", "portfolio", "brief"]
}
```

Typography overrides select an existing font role and change `sizePt`, `lineHeight`,
`spaceAfterPt` or `trackingEm`; family and weight remain those of the selected brand face. A style
may also take a `colour` (a colour key or role), `caps: true`, and `ruleBelow: { widthPt, colour,
gapPt }`; Word styles and the print view both carry them. UNBC sets its title as unbc.ca sets a
page title: `{ "font": "display", "colour": "gold-text", "ruleBelow": { "widthPt": 4.5, "colour":
"line" } }`, with running heads as small tracked capitals. `colours.tableHeader` and
`colours.tableHeaderText` colour table header rows (default: ink and reverse).
Logo `options` may select an existing family/layout or signature/colourway; `logo.departmental`
names a departmental signature to put on the cover when the document names a department, in
place of the plain logo with the department as text (UNBC: `"sub-logo"`). Its width cannot
fall below the brand's minimum. Extra layout spacing does not replace the existing identity
clear-space rule. `header.text` and `footer.text` can set running text. Historical brands
retain explicit reconstruction and modern-layout labels.

Affiliation sizes must be 8–24 pt, with subdepartment type no larger than department type.
Line height is 1–2, spacing after the block is 0–20 mm, and the character limit is fixed at 180
per field. `defaultPurpose` selects the initial Documents starter; `publishedPurposes` selects
which purposes the release publisher emits in both paper sizes. `documentation.examples`
can provide per-purpose copy defaults, with caller-supplied values taking precedence.

Publication content is a separate `brandkit/publication/1` source model, not part of the
identity definition. The supported purposes are `product`, `report`, `brief` and `portfolio`. Product
defaults do not imply previous client delivery and contact information is omitted unless
supplied. Figure data is embedded PNG/JPEG, with alt text and an explanatory caption;
placeholders are visibly labelled. `validatePublication` returns problems for invalid JSON
structures, unsafe image sources, inconsistent tables or unusable dimensions.

See [Documents from a brand](documentation.md) for the complete model, value fields,
source-maintenance commands and rendering guidance.

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

A revision can add to a list instead of replacing it: `{ "$append": [ … ] }` in place of an array
appends its items (or makes the array when there is none). ddcnorth's v2.3 proposal adds templates,
patterns, icons, guide pages and files this way:

```json
"changes": { "templates": { "$append": [ … ] }, "icons": { "items": { "$append": [ … ] } }, "motion": { … } }
```

An object with `$append` and any other key, or a `$append` that is not an array, is an error, and
so is `$append` anywhere outside a revision's `changes`; items inside a `$append` are kept as
written. This changes what `mergePatch` (exported by the engine) does with such an object; every
other patch behaves as before, with one edge: an object under a key the base does not have is now
merged into an empty object, so a `null` inside it removes nothing and is dropped rather than kept. A revision whose `changes` leave the logo and symbol alone (no
`symbol`, `wordmark`, `families`, `lockup`, `colours`, `roles` or `logoColours`) carries, in the
approved kit's `revisions/<id>/`, the patterns, templates, icons and files it adds instead of copies
of the unchanged logos, and its README says what approving it appends.

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

An illustration may carry `lettering`, the words drawn on it (a sign's wording), each line `{ text,
x, y, size, bold, family, anchor, fill, width? }`. The template element's `lettering: { prefix,
fonts: { sans: { regular, bold }, serif: { … } } }` makes each line a field (`<prefix>-1`, …) set in
the brand's faces, narrowed to the source's set `width` if it runs longer. Those fields are local to
their drawing: a set of signs shows only the shown sign's lines.

The element's `materials` repaint the drawing by material (`{ "paint": "primary", "fabric":
"graphite" }`), so one drawing serves any brand's colours. A zone takes a signature (with fixed
`values`, or `defaults` that give way to the template's fields), a fixed `logo` (horizontal in a
long zone, stacked in a squarer one), a `symbol`, or text (an `id` makes it a field; `curve` sets it on an arc). It is drawn in
the zone's colour unless it names one, fitted inside the zone, and turned and skewed with it. The
BC brands' illustrations come from `manuals/bc/illustrations`.

## Sources

A brand rebuilt from a manual can say where each piece comes from. Templates, signatures and guide
pages take `sources`, the manual pages they are built from:

```json
"sources": [{ "book": "reproduction", "page": "R08", "manual": "Reproduction Manual", "title": "General Use stationery", "printed": "7" }]
```

`book` and `page` are ids in a manual pack, which `manuals: { "pack": "bc" }` names; the rest is
there so the citation reads on its own.

Templates and guide pages may carry an `extension` name: ddcnorth's application system is
`"extension": "applications"`, so its script can replace it without touching the original kit's
templates, and the parity test can leave it out. The app shows sources as links into its manual library,
and the library lists, under each page, what the built-in brands build from it (indexed in
`brands/index.json` by `scripts/brands/common.mjs`, whose `cite()` also refuses to write a brand
with anything uncited).

## Web, patterns, icons, files

- `patterns`: the symbol repeated (`repeat: { x: [from, to, step], y: […], scale, colour }`) or
  placed (`place: [{ x, y, scale, colour, symbol?, rotation? }]`) on a background, over any `dots`
  (`[{ cx, cy, r, colour, opacity? }]`) and `lines` (`[{ points: [[x, y], …], colour, width, opacity? }]`).
  A placement's optional `symbol` selects a named entry in `symbols`; otherwise it uses the
  main symbol. `rotation` is in degrees clockwise around that symbol's viewBox centre,
  after scaling. `x` and `y` locate the unrotated symbol origin.
  Templates draw the same with a `dots` element (`{ type: 'dots', dots: [[cx, cy, r], …], fill,
  opacity? }`) and a `polyline` element (`{ type: 'polyline', points, stroke, strokeWidth?, opacity? }`).
  A `{ type: 'pattern', pattern: patternId, x, y, width, height, fit?: 'cover' | 'contain', id? }`
  template element places an existing pattern in an explicitly clipped panel. Its default cover
  fit preserves proportions and crops to the panel; contain shows the complete field.
- `patternCollection`: optional discovery metadata `{ page, guide, status, patterns: [id, …],
  templates: [id, …], palettes, description }`. `page` names a self-contained explorer included
  in `files`; the Logos tab links to it. The six additional collections use
  `extension: 'pattern-explorations'` on their patterns, templates, documents, files and guide
  sheets, preserving existing identity definitions and historical material. A guide sheet may
  set `pdf: true` to export an individual PDF alongside its SVG and PNG.
- `icons`: `{ size, attrs, items: [{ id, content }] }`, drawn in `currentColor`.
- `web`: React component names, CSS variable prefix, app icon and favicon settings, and the copy
  for the kit's index.html and landing template.
- `web.page`: the brand's own website anatomy as components: `colours` (masthead gradient, call to
  action, title, rule, link, text, muted, surface, warm, accent, aside bar), `fonts` (body, bold,
  display), `logo` (the signature and colourway for the header, and for the footer), `cta`, `menu`,
  `tabs`, `breadcrumbs`, sample `content` (intro, button, aside, cards, table, note) and `footer`
  (address, acknowledgement, links, legal links). `webComponents(ctx, { department })` returns
  each component (header, tabs, title, breadcrumbs, intro, button, aside, cards, table, note,
  footer, legal bar) as `{ id, label, use, html, css }` over shared custom-property tokens;
  `webPage` composes them into a page. The app's **Web** tab previews each component and the page,
  set for a department, and the kit carries `web/page-template.html` and `web/components/`. UNBC's
  follow www.unbc.ca as the UNBC chrome and the NHHR Atlas measured it.
- `files`: supplied files copied into the kit as they are (fonts, licences, documents).
  `{ "to": "README.md", "from": "docs/README.md" }` or a bare path.
- `motion`: `{ page, css?, tokens, rules, studies }`. `page` is a self-contained HTML motion
  library in the brand's folder; when the brand's files hold it, the app shows a **Motion** tab
  with it. `tokens` (`durations` in ms, `easings`, `stagger`), `rules` (`[{ title, text }]`) and
  `studies` (`[{ id, name, kind, group, timing, use, description }]`) describe it as data. List
  the page and its CSS in `files` to carry them in the kit. See `scripts/brands/firstform-motion.mjs`.
  ddcnorth's proposed v2.3 adds `motion.guardrails` (`{ do: [...], dont: [...] }`) and
  `motion.groups` (`[{ id, label, kinds }]`, the library's filters), and a study may say `loop` and
  its `background`. See `scripts/brands/ddcnorth-motion.mjs`. A study needs an id, name, kind,
  timing, use and description, ids are unique, and durations are positive numbers of milliseconds.
  `motion.note` is shown above the Motion tab's studies: the BC identities use it to say their
  libraries are brandkit's examples (`scripts/brands/bc-motion.mjs`), since neither manual covers motion.
- `history`: what became of earlier versions and proposals, newest last, shown on the Overview:
  `{ version, displayVersion, status: 'superseded', summary, definition }` for a version replaced
  (`definition` the path of its brand.json, kept in the brand's folder), a revision record with
  `status: 'archived'` and its `changes` kept (so it can be proposed again), or `status: 'approved'`
  once merged. A revision is approved by merging it into the definition and recording it here: see
  `scripts/brands/ddcnorth-accept-v23.mjs`. Revisions still open stay in `revisions`.
- `print`: `{ pantone: { colourKey: "376" }, cmyk: { colourKey: "C50 Y100" }, note }`, the values a
  manual gives for printing. The Colour tab shows them beside hex and RGB; a colour without a CMYK
  recipe gets one converted from its screen value, marked as converted.

## Template Printer packages and imported SVG

Native templates keep their existing `elements`. A package import adds a template
with sanitized `svg`, `elements: []` and a `printer` record containing its package
id, side/file, fields, mappings, sample data, native field-key mapping and optional
card area. Rendering handles the SVG's original geometry and fonts; its fields are
exposed through `templateFields`, just like native templates.

`brand.printer.packages` records each archive's id, name, asset path, manifest and
the template ids for its sides and variants. It also supplies the current brand's
printer presets; no brand-specific preset is hard-coded into the app. A package's
optional `sourceUrl` links to its published original (HTTP(S), with cross-origin
fetching allowed). `brand.printer.website` can select a different standalone
Template Printer website. Current edits transfer by ZIP download and upload;
the original link opens the published sample data.

`brand.assets` optionally maps relative paths to base64 bytes. Imported brands use
this for portable archives and fonts that must survive saving a JSON file or
reopening browser storage. The font provider and kit builder read these bytes
before consulting the host's asset reader. `brand.files` still names the files
that should be included in a kit. Repository generators can instead write the
returned asset Map to disk and set `embedAssets: false`.

The complete source archive retains printer-only data, including editable canvas
scenes, variant selection rules and additional manifest properties. See
[Template Printer integration](template-printer.md) for the public package,
browser bridge and Vite APIs, supported features and the runnable host example.

For a brand with an optional subtext line, `wordmark.optionalSubtext` can declare
`{ withFamily, withoutFamily, colour }`. Both fields name existing families, so
the checkbox switches to artwork with the correct dimensions rather than leaving
an empty gap. OTE uses it for “UNBC’s Student Newspaper” in both arrangements.
The wordmark colour control is independent of the main logo colour and is kept
when the line is switched off and on. `logoDocument` accepts `subtextColour` for
parts marked `data-line="subtext"`, or `wordmarkColour` for all lettering. These
options accept colour keys or CSS colours and carry through SVG, PNG and PDF
exports. `lockup({ brand }, { showWordmark: false })` renders only the symbol for
ordinary symbol-and-lettering logos.
