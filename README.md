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
- **Template Printer**: the full [Template Printer](https://github.com/ahzs645/template-printer),
  rendered in its own tab as a component from the Git submodule at `vendor/template-printer`:
  the same component the printer's website renders, inside this page rather than a frame. It
  offers card design, people, exports, calibration and settings, with the linked **Staff Card**
  package ready to open, and keeps its records in browser storage. **Edit & print** in Templates
  opens a filled brand template, with its fonts, sides and variants, in the printer; a package the
  printer saves (Share → Download package) can be added back to the brand's templates in one
  click. SVG, PNG and PDF exports stay in Templates. The package API is documented in
  [docs/template-printer.md](docs/template-printer.md).
- **The brand guide**: eight framed pages, logo reference sheets and a one-page overview, as SVG
  and as one PDF, read in the same viewer as the manual library.
- **Motion**: for a brand that defines it, a motion library (timing tokens, rules and animated
  studies of the logo, loading states and interface) shown in the app's **Motion** tab and carried
  in the kit as `motion/`, with a reusable `motion.css`. First Form has one.
- **Web files**: CSS variables, design tokens, a typed React component, a landing-page starter,
  favicon (SVG and multi-size `.ico`) and app icons. Every brand's **Web** tab also exports an
  [Astryx theme](docs/astryx-integration.md): light/dark interface colours and consumer typography,
  a JSON definition, setup instructions and a report of derived shades and contrast checks.
  These files travel in Website and Everything kit downloads. A brand that describes its own website
  (`web.page`) also has a **Web** tab: each page component (header, audience tabs, title,
  breadcrumbs, introduction, button, aside, cards, table, note, footer, legal bar) previewed on
  its own with its HTML and CSS to copy or download, and the page they compose, set for a
  department. UNBC's follow www.unbc.ca, with the department's sub-logo in the header.
- **Vehicles**: the brand on a vehicle in 3D: a work truck with a high canopy or a service
  body (drawn for brandkit), a hatchback and two SUVs. A **wrap** covers the painted body (both
  sides, the rear half (on the truck, its canopy or service body) or the full body, roof and hood
  included) in a graphic drawn in the brand's colours, one of its patterns, or uploaded artwork,
  scaled and moved within the panels and mirrored on the right side so the design leads from the
  front. A **logo or fleet lettering** sits on top: choose an area (doors, canopy, hood, rear) and
  drag it on the body (a corner resizes it, a round handle turns it, arrow keys nudge it). Both
  are projected onto painted panels only, so glass, lights and trim stay clear. Studio, dark,
  brand-tinted and outdoor backdrops, lit so the brand's colours read true on either side. Undo
  and redo, a draft kept in the browser, Save and Open (JSON), and a 2400 × 1500 PNG. Three.js
  and the models load only when the tab opens; their sources and licences are in
  [`src/mockups/models/NOTICES.md`](src/mockups/models/NOTICES.md). A visual mockup, not a
  template for cutting vinyl.
- **The kit itself**: every file in one zip (379 for ddcnorth) with an offline `index.html` to browse them,
  and `source/brand.json` so the kit can be rebuilt.

Nothing is uploaded: the drawing, the PNGs (canvas), the PDFs (jsPDF and svg2pdf) and the zip
(fflate) are all made in the page.

**[Open brandkit](https://projects.ahmadjalil.com/brandkit/)**

## Brands are packs

brandkit is the engine; a brand is data. One brand ships with it, **northwind**, an example made
by the starter. Every other brand is a **brand pack**: one zip with the brand's `brand.json` and
every file it uses (fonts, artwork, references, documents, its website), plus a small manifest.
brandkit opens a pack from:

- **a link**: `?url=https://…/brand.zip` downloads it, keeps it in the browser and opens it;
- **a catalog**: a `catalog.json` listing packs. A site built with `VITE_BRANDKIT_CATALOGS`
  offers its catalog's brands in the brand menu (**Available to add**), and `?brand=<id>`
  installs one on the way; `?catalog=<url>` adds another catalog in one browser;
- **a file**: drag it onto the page, or choose it with **⋯ → Open a brand…** (or **Brands → choose a
  file**): a pack, a brand folder or a whole kit zipped, or a `brand.json`.

A brand opened from a pack is kept in IndexedDB, so it opens again after a reload, offline,
without being downloaded. Files are stored once by their SHA-256, however many brands (or
versions of one brand) hold them: an update stores only what changed, and removing a brand frees
only the files no other brand uses. A revisit to the same link asks the host whether the pack
changed, and a catalog entry with a new SHA-256 is offered (and taken) as an update. A pack's own
pages (brand details, its website, its motion library) open at real addresses,
`/brandkit/packs/<id>/…`, served from the browser by a service worker, so the images, styles,
fonts and pages they link to load as they do in a downloaded kit.
**Brands** in the masthead lists what is kept, what it takes and what sharing saves, the
catalogs, and what they offer.

Hosts such as Zoer can call the [data-only host API](docs/zoer-integration.md)
for bounded ZIP intake, brand selection, alias/dependency handling and catalog
validation, without embedding the renderer. Existing ZIPs can be indexed with
`brandkit catalog path/to/packs --out catalog.json --check` (omit `--check` to
write it). These tools and the general brand-packs skill live here; each host
keeps its own users, storage and chat workflow.

Packs are made with `node scripts/pack.mjs <brand folders or a folder of brands> --out dist/packs`
(or `brandkit pack`), which writes `<id>.zip`, `<id>.logo.svg` for the menu, and `catalog.json`.
`--bundle` also writes a **brand bundle**: every pack in one zip, which adds all of its brands at
once when it is dropped, chosen or linked (`?url=`), for handing over a client's or an agency's
brands as one file.
A pack leaves out what it need not carry: files byte for byte the same as brandkit's own
`library/` (the open-licence Inter and Space Mono every starter brand uses), a second copy of a
file the brand keeps at two paths (an alias), and the brand's `history/`. Compressed formats are
stored and text deflated, and packs come out byte for byte the same from the same folder, so an
unchanged brand keeps its hash. A brand can keep source material (scans, research) out of its
pack with a `.packignore`. [docs/brand-packs.md](docs/brand-packs.md) documents the format, every
way of opening a pack, what happens to it afterwards, catalogs, hosting and the error messages.

The brands made with brandkit so far (ddcnorth, First Form, Over the Edge, SPARK Lab, UNBC,
love.fútbol, and the 1977 Province of British Columbia and 1983 BC Hydro reconstructions) are
kept, generated and tested outside this repository and published as packs; the features below
are described with them as examples.

**Share** in the header gives a link for the people who use a brand rather than make it
(`?brand=<id>&share=1`, optionally with `&view=templates` and so on). It opens the brand as its
own brand centre: the approved identity's overview, logos, templates, guide and kit, under the
brand's own logo, without revisions, editing, other brands, the manual library or the
manual pages templates cite. A brand from a pack that is not in the site's catalog travels with
its pack's address (`&url=`), so the link opens it for anyone. It is a presentation, not access
control: the full app is the same address without `share`.

**New brand** in the app makes a starting point from a name, a palette, a symbol drawn on a grid
and a typed wordmark (outlined, so the logo needs no font). **Edit brand** changes colours, roles
and copy by form and anything else as JSON. Brands made or edited are kept in the browser until
downloaded; **Download kit → Build sources** and `brandkit pack` turn one into a pack to share.

The definition is documented in [docs/brand-schema.md](docs/brand-schema.md).

## Organizational names and identity rules

A brand can declare an `organization` with separate department and subdepartment names. The
**Departments** view shows the complete logo, its minimum width and surrounding space, and the
document text hierarchy. Save the names once to use them in **Documents** and native
**Templates**. Names remain editable, wrap without condensing and allow up to 180 characters
per level; a subdepartment requires its parent department. The width control is a sizing
calculator. It does not change a document's configured print profile.

A brand can also name an `extension`: a package of its own that adds what brand.json cannot
describe (`src/extensions/`). UNBC's adds the unit's social-media profile pictures to Departments,
drawn by the UNBC logo package, and a **Door signs** tab with the editor from the
[door-sign](https://github.com/ahzs645/door-sign) package (the `vendor/door-sign` submodule, which
the UNBCDoor app also uses), opened on the department chosen here.

A brand that composes department sub-logos (departmental `signatures` and a `departments`
list) gets a sub-logo editor in the same view: pick a listed unit or type a name, see it in each
colourway and download it.

Optional `logoPolicy` controls restrict logo paint, disable standalone symbols and enforce a
minimum physical size in native templates. `web.icons: false` omits favicons and app icons.
These rules also travel in the portable consumer profile. See [the schema](docs/brand-schema.md) and
[consumer contract](docs/consuming-brandkit.md) for the data fields and integration rules.

## Pattern library

Every brand has a **Patterns** tab, with a searchable gallery of its registered patterns,
individual SVG/PNG downloads, source and motif notes, and previews of the actual templates that
use them. Direct links retain the selected pattern, including in shared mode. The library
shows existing artwork and documented relationships without changing the identity definition.

Links from this section also open the existing interactive explorers, including SPARK Lab's
arrow/spark studies and its pattern/application comparison board. These show additional ways
to arrange the iconography and adjust scale, density and colour. A brand can carry a pattern
collection (supporting studies, editable applications, reference sheets and PowerPoint layouts);
northwind's is rebuilt with `npm run make:patterns`.

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
| `brandkit/printer/bridge` | Links to a standalone Template Printer website, with a published package. |
| `brandkit/pack/host` | Typed data-only brand inspection, summaries, aliases and catalog validation. |
| `brandkit/pack/host-node` | Bounded Node/Bun ZIP intake with CRC, path and expansion checks. |
| `brandkit/pack/catalog-cli` | Canonical catalog generation/checking for existing pack ZIPs. |
| `brandkit/astryx` | Optional data-only theme configuration, ES module, contrast report and setup-guide exporters for Astryx 0.7.11. |

The library components read the host page's custom properties (`--surface`, `--ink`,
`--radius`…) with neutral fallbacks, so they take on the host's theme.

## Development

```sh
git submodule update --init --recursive
npm install
npm run setup:printer                          # install the Template Printer component's dependencies
npm run dev                                    # the app
npm test                                       # the engine, packs and manual pack, on northwind
npm run build && npm run test:packs:browser    # packs in Chromium: link, reload, catalog, update, remove
node bin/brandkit.mjs build brands/northwind/brand.json --out northwind-kit   # vector and text files from a terminal
node bin/brandkit.mjs check path/to/brand.json # validate a definition
node scripts/pack.mjs path/to/brands --out dist/packs   # brand packs and a catalog
npm run make:documentation -- --check           # the built-in brand's use guide matches its definition
npm run build:documentation -- --pdf            # Word masters + PDFs for the built-in brand
```

`VITE_BRANDKIT_CATALOGS=http://…/catalog.json npm run dev` offers a catalog's brands, as the site
does. Set `CHROMIUM_PATH` to use a Chromium you already have.

Tools that read brands from disk (the CLI, `src/fonts/node.js`) look for a file a brand does not
hold in `library/`, then in other brand folders: the built-in ones and any in `BRANDKIT_BRANDS`
(a folder of brands kept elsewhere). The brands made with brandkit are tested that way, against
this engine, where they are kept. `build` keeps its vector/text default. `build --office` and
`documents` also render the artwork needed by Office documents in Node. Graphic PDF collections
use the browser renderer; `documents --pdf` exports the actual Word masters with LibreOffice.

GitHub Pages builds from `main` (`.github/workflows/pages.yml`). Set the repository variable
`BRANDKIT_CATALOGS` to the catalogs the site should offer.

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
generated `USE.md` in its folder with artwork provenance and physical specifications.

```sh
# Build one report in both paper sizes; a PDF is exported from each Word master.
node bin/brandkit.mjs documents brands/northwind/brand.json --purpose report --paper both --pdf --zip --out .documentation/northwind

# Supply content values, or use --content for a complete exported publication model.
node bin/brandkit.mjs documents path/to/brand.json --purpose product --paper a4 --values my-content.json --out .documentation/my-brand

# Refresh the PDF after editing the maintained Word master.
node bin/brandkit.mjs pdf .documentation/northwind/documents/northwind-publication-report-letter.docx --brand brands/northwind/brand.json

# Publish versioned report examples for every brand in brands/index.json (requires LibreOffice).
npm run build:documentation -- --pdf --out dist/documentation
```

`soffice` must be available for PDF conversion; set `SOFFICE_PATH` for another installation.
Release publishing requires a clean committed checkout and records that exact commit in the
release folder, download filename and manifest. Use the `documents` command for working drafts.
The browser's print view is useful for review, but use the Word master to produce a PDF with
the same pagination as the maintained document. Editing a Word file does not update its
original JSON; choose Word or the content model as the source for that publication.

CI checks the built-in brand's guide, runs the engine and pack tests and the pack workflow in
Chromium, and builds northwind's Word masters for review (no LibreOffice in CI; add `--pdf` locally for PDFs). On main, the
[published starters](https://projects.ahmadjalil.com/brandkit/documentation/) ship with the site.
PR runs attach them as an artifact without deploying. See
[the document model and editing rules](docs/documentation.md) for custom pages, screenshot
provenance, copy conventions and font details.
