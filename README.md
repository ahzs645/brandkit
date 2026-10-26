# brandkit

Brand kits from one `brand.json`, made in the browser.

A brand is one JSON document: its colours and their roles, the symbol's geometry, the wordmark's
outlines, lockup proportions, typefaces, and every template and guide page as a list of elements.
brandkit draws the whole kit from it:

- **Logos**: every family in horizontal, stacked, wordmark and symbol layouts, in each colour, as
  SVG, PNG and PDF, plus editable-text alternatives. Or, for an identity that composes its
  signatures, every signature in every colourway, set for every department (a ministry, a
  division) it defines. A brand with a motion library also has its logo animations here, playing
  in place, each downloadable as an animated SVG.
- **Colour**: every colour with hex, RGB, CMYK and Pantone (the manual's recipe where it gives
  one, otherwise converted and marked so), the role pairs text is set in graded against WCAG 2,
  every text-on-ground pair, and tints in 20% steps. Edit brand warns as a role change drops a
  pair below AA.
- **Motion**: for a brand with a motion library (`motion.page`), its studies in a list like the
  templates', the chosen one playing on a stage with Replay, Pause and repeat, beside its timing
  and use, then the shared tokens (copied as CSS or W3C design tokens), rules and guardrails.
  Studies drawn in SVG export as MP4 or WebM (in four frame shapes) and GIF, made in the browser;
  a motion pack zips the tokens, rules, animated SVGs and library page. The two BC identities
  carry example libraries (`scripts/brands/bc-motion.mjs`), made from their own artwork.
- **Templates**: business cards (front and back, with trim and safe area), letterhead, envelopes,
  social posts and banners, presentation covers. Fill in the fields once and download SVG (text
  still editable), PNG or PDF, or all of them zipped. Variants of one thing are one item: a card's
  fronts and back, a letterhead in each size or rank, with a PDF of every variant.
- **Office documents**: the documents people type, as Word templates (letterheads with their
  continuation sheet, memoranda, releases, invoices, reports, envelopes), the slides as a
  PowerPoint template with a layout for each slide type, and the email signature as HTML ready to
  paste into a mail program. They are made from the same templates: the artwork drawn behind,
  the fields as real text in the brand's faces (embedded in the Word files where their licence
  allows), lines that share a baseline on tab stops.
- **Template Printer**: the full [Template Printer](https://github.com/ahzs645/template-printer)
  frontend, built from the Git submodule at `vendor/template-printer`. Its own tab offers card
  design, people, exports, calibration and settings, with the linked **Staff Card** package ready
  to open (front, back, fonts and sample values). It runs with browser storage, on the same site,
  and can open in a separate tab. **Edit & print** sends a filled brand template with its fonts,
  sides and variants directly to the editor; edited packages can be imported back into the brand.
  The website handoff offers an editable ZIP/source folder, an external printer link and a
  direct link to OTE's published original. SVG, PNG and PDF exports stay in Templates.
  Reusable package, browser-bridge and Vite APIs, plus a plain-JavaScript host example, are
  documented in [docs/template-printer.md](docs/template-printer.md).
- **The brand guide**: eight framed pages, logo reference sheets and a one-page overview, as SVG
  and as one PDF, read in the same viewer as the manual library.
- **Motion**: for a brand that defines it, a motion library (timing tokens, rules and animated
  studies of the logo, loading states and interface) shown in the app's **Motion** tab and carried
  in the kit as `motion/`, with a reusable `motion.css`. First Form has one.
- **Web files**: CSS variables, design tokens, a typed React component, a landing-page starter,
  favicon (SVG and multi-size `.ico`) and app icons. A brand that describes its own website
  (`web.page`) also has a **Web** tab: each page component (header, audience tabs, title,
  breadcrumbs, introduction, button, aside, cards, table, note, footer, legal bar) previewed on
  its own with its HTML and CSS to copy or download, and the page they compose, set for a
  department. UNBC's follow www.unbc.ca, with the department's sub-logo in the header.
- **The kit itself**: every file in one zip (379 for ddcnorth) with an offline `index.html` to browse them,
  and `source/brand.json` so the kit can be rebuilt.

Nothing is uploaded: the drawing, the PNGs (canvas), the PDFs (jsPDF and svg2pdf) and the zip
(fflate) are all made in the page.

**[Open brandkit](https://projects.ahmadjalil.com/brandkit/)**

## Brands

| | |
| --- | --- |
| [`brands/ddcnorth`](brands/ddcnorth) | The ddcnorth six-dot identity, v2.3. From its v2.1 definition (kept in `history/2.1/brand.json`) the engine reproduces the original kit's 48 vector files (logos, symbols, patterns, icons, templates, favicon, app icon) byte for byte, and its eight guide pages page for page. On top of that, `npm run make:ddcnorth` adds an application system modelled on the BC manuals: 39 templates and 6 guide pages covering stationery, documents, publications, advertising, presentations and video, signs, vehicles and apparel, backgrounds, and incorrect usage. Each one cites the manual pages it follows. **v2.3**, *data, design, connection*, approved 22 October 2026, adds the descriptor "Data · Design · Connection", four dot patterns, eight templates for findings, briefs, workshops and social, five icons, four guide pages, a brand details page, the redesigned website in `site/`, and a motion library of eighteen studies for the Motion tab. `npm run make:ddcnorth-v23` records it as proposed in the v2.1 definition, then `scripts/brands/ddcnorth-accept-v23.mjs` merges it into brand.json with the history: v2.1 superseded, the 2.2 rising proposal archived, v2.3 approved. |
| [`brands/firstform`](brands/firstform) | First Form, a consulting, design and development practice, from its V1.0 kit. That kit had the logo only as PNGs, so `npm run make:firstform` rebuilds it as vectors: the two-block mark redrawn on its isometric geometry, and the FIRST / FORM wordmark set in Sora Bold. It adds fourteen templates (card, part tag, letterhead, proposal cover, social, link preview, slides), eight icons, a motion library of sixteen studies, a nine-page guide, a brand details page and a redesigned website in `site/`. The original PNGs are kept in `reference/`. |
| [`brands/overtheedge`](brands/overtheedge) | Over the Edge, UNBC's independent student newspaper, in a "Forest press" identity: an evolution of the paper's look. `npm run make:overtheedge` reads the logo path for path from the SVG its website serves (the full logo, without its subtext, stacked OVER / THE / EDGE, and the O as the symbol), and adds a palette from the site and its 2025 print covers, Source Serif 4, Anton, Inter, IBM Plex Mono and Gochi Hand, sixteen templates (cards, press pass, letterhead, issue cover, social posts, slides), ten icons, ten patterns and a nine-page guide. Two engine options let a logo be its lettering alone: a wordmark variant's own `height`, and a family's `lockupSymbol: false` with `stackedWordmark`. |
| [`brands/sparklab`](brands/sparklab) | SPARK Lab, UNBC’s product creation lab, from [sparklab.unbc.ca](https://sparklab.unbc.ca/). `npm run make:sparklab` preserves the original arrow, spark and lettering, with the website’s orange/navy/cream palette, Outfit and Source Serif 4. It adds four logo arrangements and four colourways, thirty templates for stationery, projects, workshops, social, slides and lab materials, editable Word and PowerPoint files and an email signature, ten icons, twenty-one patterns, a fifteen-page guide, sixteen motion studies, a brand details page and an offline website preview. Arrows, Signal, Connections and Layers pair eighteen patterns with twelve applications, including Word lab notes and a project report, three PowerPoint covers, and an interactive comparison board in `docs/patterns-and-templates.html`. `docs/arrow-patterns.html` explores twelve arrow and spark studies, including mixed directions at three scales, loose scatter, cross currents, orbit and constellations, with live scale, density and colour controls and SVG download. Source notes and font licences accompany the kit; layouts and motion are kit extensions. |
| [`brands/unbc`](brands/unbc) | University of Northern British Columbia. `npm run make:unbc` preserves the complete official vector artwork and records the [February 2020 Graphics Standards Manual](https://www.unbc.ca/sites/default/files/sections/communications-and-marketing/unbc_gsm_feb2020.pdf). Green, black and white are the permitted logo colours; the full logo is at least 38.1 mm wide. The **Departments** view sets a department sub-logo for any of 88 listed units or a typed name, in Helvetica Neue 95 Black on the construction of UNBC's own sub-logos (from the `unbc-logo` submodule), and carries the name into Documents and Templates; the kit includes every listed unit's sub-logo in three colours. Documents, templates and the **Web** components take www.unbc.ca's look (measured from the UNBC chrome and the NHHR Atlas): a gold Helvetica Black title over a warm rule, BC Sans web text, teal links and warm neutrals, with the department's sub-logo on document covers. The kit adds 22 native templates, ten Word applications, a four-layout PowerPoint, an HTML email signature and nine guide pages. Research report, decision brief and brand portfolio publications have Letter/A4 profiles. Five original university Office templates, the manual and source logo files remain unchanged alongside the local applications, with provenance and hashes. |
| [`brands/northwind`](brands/northwind) | An example made by the starter, to show nothing in the engine is particular to ddcnorth. |
| [`brands/bc-province-1977`](brands/bc-province-1977) | The Province of British Columbia’s 1977 Visual Identity Program, reconstructed from its four manuals in the manual library: the Provincial and ministerial signatures in nine formats, set for every ministry of 1976–1986; stationery for every rank (Premier, Ministers, Deputy Ministers, Boards and Commissions, General and Special Use); memorandum and news release; publications; advertising; uniform insignia; vehicle markings; signs on the Sign Manual’s grid; and a guide. |
| [`brands/bc-hydro-1983`](brands/bc-hydro-1983) | BC Hydro’s 1983 Graphic Standards Manual: the Corporate, Gas Operations, Rail and Formal signatures in their colourways; Corporate, Gas and Rail stationery; forms; publication covers and mastheads; advertising; audio-visual; signs; vehicles; and a guide with the background-value rules, incorrect usage and minimum sizes. |

The two BC brands are historical reconstructions for reference, not current guidance. Helvetica,
Times and Courier are set in TeX Gyre Heros, Termes and Cursor (GUST Font License). Their artwork
comes from [PofBC](https://github.com/ahzs645/PofBC) (`npm run import:pofbc -- /path/to/PofBC`),
and their definitions are written by `npm run make:bc`, from scripts that keep each manual
measurement next to the page it comes from.

Both carry ManualKit's drawings of the vehicles, uniforms, equipment and signs the manuals show (99
views, in `manuals/bc/illustrations`): each is a template with the signature, ministry and unit
number set into its branding zones, or a sign with its wording as fields, and each is in its manual
page in place of the earlier draft.

Every template, signature and guide page in them cites the manual pages it is built from. In the
app, those pages show as thumbnails under it that open the page in the manual library; and a page
in the library lists what is built from it, linking back.

**Revisions** keep a proposed change beside the approved identity: ddcnorth carries one, the
*rising symbol* (the six dots flipped so they climb to the right). Choosing it in the header shows
every page, and builds every file, as it would make them; the approved kit includes it, with a
side-by-side comparison, in `revisions/rising/`.

**Share** in the header gives a link for the people who use a brand rather than make it
(`?brand=ddcnorth&share=1`, optionally with `&view=templates` and so on). It opens the brand as its
own brand centre: the approved identity's overview, logos, templates, guide and kit, under the
brand's own logo, without revisions, editing, other brands, the manual library or the
manual pages templates cite. It is a presentation, not access control: the full app is the same
address without `share`.

**New brand** in the app makes a starting point from a name, a palette, a symbol drawn on a grid
and a typed wordmark (outlined, so the logo needs no font). **Open…** takes a `brand.json`, a
brand folder zipped, or a whole kit's zip. **Edit brand** changes colours, roles and copy by form
and anything else as JSON. Brands made or edited are kept in the browser until downloaded.

The definition is documented in [docs/brand-schema.md](docs/brand-schema.md).

## Organizational names and identity rules

A brand can declare an `organization` with separate department and subdepartment names. The
**Departments** view shows the complete logo, its minimum width and surrounding space, and the
document text hierarchy. Save the names once to use them in **Documents** and native
**Templates**. Names remain editable, wrap without condensing and allow up to 180 characters
per level; a subdepartment requires its parent department. The width control is a sizing
calculator. It does not change a document's configured print profile.

A brand that composes department sub-logos (departmental `signatures` and a `departments`
list) gets a sub-logo editor in the same view: pick a listed unit or type a name, see it in each
colourway and download it. For UNBC, choosing the unit there is also how documents and templates
are named, so it has no separate naming form; the Province of British Columbia (1977) uses the
same editor for its ministerial signatures.

UNBC uses the full logo and published colour, size and clear-space rules. Its sub-logos set the
unit's name under NORTHERN BRITISH COLUMBIA in Helvetica Neue 95 Black, on the construction
measured from UNBC's own sub-logos. The construction, the 88 listed units and the line breaks
matched to official artwork come from the [UNBC logo package](https://github.com/ahzs645/unbc-logo)
(the `vendor/unbc-logo` submodule) that the door-sign generator also uses, and a test holds the
kit's line breaks to the package's for every name it records. Its 12 pt department and 10.5 pt
subdepartment document text, 55 mm report logo and 20 mm page margins are local document
defaults. The brand portfolio links SPARK Lab as a UNBC lab and Over the Edge as an independent
student newspaper; a relationship is not a claim of sub-logo approval.

Optional `logoPolicy` controls restrict logo paint, disable standalone symbols and enforce a
minimum physical size in native templates. `web.icons: false` omits favicons and app icons.
These rules also travel in the portable consumer profile. UNBC's artwork is set in Helvetica
Neue LT Pro, the faces the UNBC logo package ships; email, web pages and Word files name Arial,
the documented alternative, since that licence allows preview and print embedding only. See [the schema](docs/brand-schema.md) and
[consumer contract](docs/consuming-brandkit.md) for the data fields and integration rules.

## Pattern library

Every brand has a **Patterns** tab, with a searchable gallery of its registered patterns,
individual SVG/PNG downloads, source and motif notes, and previews of the actual templates that
use them. Direct links retain the selected pattern, including in shared mode. The library
shows existing artwork and documented relationships without changing the identity definition.

Links from this section also open the existing interactive explorers, including SPARK Lab's
arrow/spark studies and its pattern/application comparison board. These show additional ways
to arrange the iconography and adjust scale, density and colour. Six brands have
[pattern collections](brands/patterns.html) with 45 supporting studies, 12 editable applications,
individual reference sheets and PowerPoint layouts. Historical BC collections retain their
source and reconstruction notices.

Rebuild the source collections with `npm run make:patterns`; the per-brand generators also
install them. `npm run test:patterns:view:browser` checks the dedicated section, and
`npm run test:patterns:browser` checks the existing explorers, downloads and export packs.

## Manual library

Identity manuals rebuilt page by page as drawings, from the ManualKit reconstruction project:
the Province of British Columbia's **Visual Identity Program** (the General, Reproduction, Sign
and Vehicle manuals of 1977, and the 1982 policy memo) and **BC Hydro's Graphic Standards Manual**
of 1983, 156 pages in all, in [`manuals/bc`](manuals/bc). Only the rebuilt pages are here, not the
reference scans: the pages are live text in open-licence stand-ins (TeX Gyre and Noto, licences in
`manuals/bc/pages/font-licences/`) and drawn geometry. Four pages of the 1982 memo carried cropped
pieces of the scan, two photographs and two handwritten signatures; each is replaced by a labelled
placeholder. `scripts/import_visual_guides.py` copies the pages from a ManualKit checkout and
writes `manuals/bc/books.js`; `scripts/render-guide-thumbnails.mjs` renders the grid images.

## Using it from another project

For applications that only need artwork and brand roles, import the generated
`source/consumer-profile.json`. It includes three outlined logo variants, resolved colours,
font metadata and provenance for every configured brand. See [the consumer contract](docs/consuming-brandkit.md).
This avoids rebuilding logo geometry in each application.

For the engine, document exporter, manual library or template studio, Brandkit can be a pinned
git submodule. The [PofBC](https://github.com/ahzs645/PofBC) integration on its historical
`brandkit-submodule` branch is an adoption example; it is not present on PofBC's current main.
The example below shows the source aliases needed by a host application.

```sh
git submodule add https://github.com/ahzs645/brandkit vendor/brandkit
```

```js
// vite.config.js: alias the entry points to the submodule's source (as package.json's
// `exports` maps them), keep one copy of React, and serve a manual pack's pages.
import { manualPages } from './vendor/brandkit/src/vite.js'
const brandkit = (path) => fileURLToPath(new URL(`./vendor/brandkit/${path}`, import.meta.url))

resolve: {
  alias: [
    { find: /^brandkit\/studio$/, replacement: brandkit('src/studio/TemplateStudio.jsx') },
    { find: /^brandkit\/manuals$/, replacement: brandkit('src/manuals/index.js') },
    { find: /^brandkit\/manuals\/bc$/, replacement: brandkit('manuals/bc/index.js') },
    { find: /^brandkit$/, replacement: brandkit('src/engine/index.js') }
  ],
  dedupe: ['react', 'react-dom']
},
plugins: [manualPages({ pack: 'bc', mount: 'visual-guides' })]
```

The host installs the dependencies the parts it uses need (`jspdf`, `svg2pdf.js` and `fflate` for
exports; `opentype.js` for `brandkit/fonts`; `@xmldom/xmldom` and `bwip-js` for the
engine's imported SVG and barcode support). Installing brandkit as a package installs these
dependencies automatically; a source submodule host installs them itself.

| Import | What it is |
| --- | --- |
| `brandkit` / `brandkit/engine` | The engine: `renderTemplate`, `lockup`, `guidePages`, `planKit`, `buildKit`, `createStarterBrand`… Plain functions over strings; no DOM, runs in Node. |
| `brandkit/fonts` | `loadBrandFonts`, `createFontProvider`: opentype.js faces as the measure-and-outline provider the engine takes. A host may pass its own provider instead. |
| `brandkit/export` | `rasterise`, `pdf`, `ico`, `zip`, `download`, `createBrowserRenderer`. |
| `brandkit/studio` | `<TemplateStudio brand fonts />`: the template list, preview, fields and downloads. |
| `brandkit/manuals` | `<ManualLibrary books families pageUrl />`: families of books, a page grid, one page at a time. |
| `brandkit/manuals/bc` | The BC pack's books and families. |
| `brandkit/vite` | `manualPages()`, the Vite plugin that serves and copies a pack's page files. |
| `brandkit/printer` | Portable package import/export for native templates and imported card designs, in browsers and Node. |
| `brandkit/printer/bridge` | A framework-independent session and message protocol for an iframe or popup. |
| `brandkit/printer/vite` | Builds and mounts any compatible upstream Template Printer frontend, with configurable paths and deployment prefix. |

The library components read the host page's custom properties (`--surface`, `--ink`,
`--radius`…) with neutral fallbacks, so they take on the host's theme.

## Development

```sh
git submodule update --init --recursive
npm install
npm run setup:printer                          # install the pinned Template Printer frontend
npm run dev                                    # the app
npm test                                       # engine, manual pack, and parity (see below)
npx playwright install chromium && npm run test:browser   # the Motion tab and pages, in Chromium
npm run build && npm run test:printer           # Template Printer integration, in Chromium
node bin/brandkit.mjs build brands/ddcnorth/brand.json --out ddcnorth-kit   # vector and text files from a terminal
node bin/brandkit.mjs check path/to/brand.json # validate a definition
npm run make:documentation -- --check           # all brand use guides match their definitions
npm run test:documents                         # model, Office and cross-brand export checks
npm run build && npm run test:documents:browser # edit, import and download at desktop/phone widths
npm run make:unbc                               # rebuild UNBC from its vendored official sources
npm run build:documentation -- --pdf            # configured brand starters: Word masters + PDFs
```

`npm run test:browser` checks ddcnorth v2.3 in the app's Motion tab and its motion and
brand-details pages, in Chromium at desktop and phone widths (it is not run in CI). Set
`CHROMIUM_PATH` to use a Chromium you already have.

`test/parity.test.js` compares the engine with the original ddcnorth kit, which is not in this
repository; set `DDCNORTH_KIT` to an unzipped copy to run it. `build` keeps its vector/text
default. `build --office` and `documents` also render the artwork needed by Office documents in
Node. Graphic PDF collections use the browser renderer; `documents --pdf` exports the actual
Word masters with LibreOffice.

GitHub Pages builds from `main` (`.github/workflows/pages.yml`).

## Write, review and share documents

Every configured brand has a **Documents** view, US Letter and A4 profiles, and four editable
starters: product overview, project report, decision brief and brand portfolio. Six page layouts cover a title
page, explanatory content, product/workstream detail, screenshot with caption, comparison table
and closing page. Add your copy and an actual PNG/JPEG capture, then download Word, printable
HTML or the editable publication JSON. Source JSON can be opened again for export.

Headings, lists, tables, captions and running text remain native Word content. The logo uses
the selected brand's complete artwork, and the document uses its actual type weights. Font
requirements and permitted embedding are recorded in the document. Historical BC identities
retain their reconstruction notices; the new page layouts are identified as modern extensions.

**Download kit** offers task packs for documents, presentations, websites and print, plus the
complete kit. Office output has its own toggle. Focused packs include an offline index and a
versioned asset catalog with MIME types, byte sizes and SHA-256 checksums. Each brand also has a
generated `brands/<id>/USE.md` with artwork provenance and physical specifications.

```sh
# Build one report in both paper sizes; a PDF is exported from each Word master.
node bin/brandkit.mjs documents brands/firstform/brand.json --purpose report --paper both --pdf --zip --out .documentation/firstform

# Supply content values, or use --content for a complete exported publication model.
node bin/brandkit.mjs documents brands/sparklab/brand.json --purpose product --paper a4 --values my-content.json --out .documentation/sparklab

# Refresh the PDF after editing the maintained Word master.
node bin/brandkit.mjs pdf .documentation/firstform/documents/firstform-publication-report-letter.docx --brand brands/firstform/brand.json

# Publish versioned report examples for every registered brand (requires LibreOffice).
npm run build:documentation -- --pdf --out dist/documentation
```

`soffice` must be available for PDF conversion; set `SOFFICE_PATH` for another installation.
Release publishing requires a clean committed checkout and records that exact commit in the
release folder, download filename and manifest. Use the `documents` command for working drafts.
The browser's print view is useful for review, but use the Word master to produce a PDF with
the same pagination as the maintained document. Editing a Word file does not update its
original JSON; choose Word or the content model as the source for that publication.

CI checks all brand guides, runs the document tests and browser workflow, and builds the configured
Word/PDF example pairs for review: a report in both paper sizes for the seven earlier brands,
plus a report, portfolio and brief in both sizes for UNBC, for 20 pairs. On main, the [published starters](https://projects.ahmadjalil.com/brandkit/documentation/)
ship with the site. PR runs attach them as an artifact without deploying. See
[the document model and editing rules](docs/documentation.md) for custom pages, screenshot
provenance, copy conventions and font details.
