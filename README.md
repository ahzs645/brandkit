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
- **The brand guide**: eight framed pages, logo reference sheets and a one-page overview, as SVG
  and as one PDF, read in the same viewer as the manual library.
- **Motion**: for a brand that defines it, a motion library (timing tokens, rules and animated
  studies of the logo, loading states and interface) shown in the app's **Motion** tab and carried
  in the kit as `motion/`, with a reusable `motion.css`. First Form has one.
- **Web files**: CSS variables, design tokens, a typed React component, a landing-page starter,
  favicon (SVG and multi-size `.ico`) and app icons.
- **The kit itself**: every file in one zip (379 for ddcnorth) with an offline `index.html` to browse them,
  and `source/brand.json` so the kit can be rebuilt.

Nothing is uploaded: the drawing, the PNGs (canvas), the PDFs (jsPDF and svg2pdf) and the zip
(fflate) are all made in the page.

**[Open brandkit](https://projects.ahmadjalil.com/brandkit/)**

## Brands

| | |
| --- | --- |
| [`brands/ddcnorth`](brands/ddcnorth) | The ddcnorth six-dot identity, v2.3. From its v2.1 definition (kept in `history/2.1/brand.json`) the engine reproduces the original kit's 48 vector files (logos, symbols, patterns, icons, templates, favicon, app icon) byte for byte, and its eight guide pages page for page. On top of that, `npm run make:ddcnorth` adds an application system modelled on the BC manuals: 39 templates and 6 guide pages covering stationery, documents, publications, advertising, presentations and video, signs, vehicles and apparel, backgrounds, and incorrect usage. Each one cites the manual pages it follows. **v2.3**, *data, design, connection*, approved 22 October 2026, adds the descriptor "Data · Design · Connection", four dot patterns, eight templates for findings, briefs, workshops and social, five icons, four guide pages, a brand details page, the redesigned website in `site/`, and a motion library of eighteen studies for the Motion tab. `npm run make:ddcnorth-v23` records it as proposed in the v2.1 definition, then `scripts/brands/ddcnorth-accept-v23.mjs` merges it into brand.json with the history: v2.1 superseded, the 2.2 rising proposal archived, v2.3 approved. |
| [`brands/firstform`](brands/firstform) | First Form, a consulting, design and development practice, from its V1.0 kit. That kit had the logo only as PNGs, so `npm run make:firstform` rebuilds it as vectors: the two-block mark redrawn on its isometric geometry, and the FIRST / FORM wordmark set in Sora Bold. It adds twelve templates (card, part tag, letterhead, proposal cover, social, link preview, slides), eight icons, a motion library of sixteen studies, a nine-page guide, a brand details page and a redesigned website in `site/`. The original PNGs are kept in `reference/`. |
| [`brands/overtheedge`](brands/overtheedge) | Over the Edge, UNBC's independent student newspaper, in a "Forest press" identity: an evolution of the paper's look. `npm run make:overtheedge` reads the logo path for path from the SVG its website serves (the full logo, without its subtext, stacked OVER / THE / EDGE, and the O as the symbol), and adds a palette from the site and its 2025 print covers, Source Serif 4, Anton, Inter, IBM Plex Mono and Gochi Hand, fourteen templates (cards, press pass, letterhead, issue cover, social posts, slides), ten icons, three patterns and an eight-page guide. Two engine options let a logo be its lettering alone: a wordmark variant's own `height`, and a family's `lockupSymbol: false` with `stackedWordmark`. |
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

brandkit is meant to be a git submodule. [PofBC](https://github.com/ahzs645/PofBC) uses it at
`vendor/brandkit` for its Visual Guides (the manual library) and its 1977 stationery (the template
studio with a BC brand definition and PofBC's own Helvetica).

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
exports; `opentype.js` only for `brandkit/fonts`).

| Import | What it is |
| --- | --- |
| `brandkit` / `brandkit/engine` | The engine: `renderTemplate`, `lockup`, `guidePages`, `planKit`, `buildKit`, `createStarterBrand`… Plain functions over strings; no DOM, runs in Node. |
| `brandkit/fonts` | `loadBrandFonts`, `createFontProvider`: opentype.js faces as the measure-and-outline provider the engine takes. A host may pass its own provider instead. |
| `brandkit/export` | `rasterise`, `pdf`, `ico`, `zip`, `download`, `createBrowserRenderer`. |
| `brandkit/studio` | `<TemplateStudio brand fonts />`: the template list, preview, fields and downloads. |
| `brandkit/manuals` | `<ManualLibrary books families pageUrl />`: families of books, a page grid, one page at a time. |
| `brandkit/manuals/bc` | The BC pack's books and families. |
| `brandkit/vite` | `manualPages()`, the Vite plugin that serves and copies a pack's page files. |

The library components read the host page's custom properties (`--surface`, `--ink`,
`--radius`…) with neutral fallbacks, so they take on the host's theme.

## Development

```sh
npm install
npm run dev                                    # the app
npm test                                       # engine, manual pack, and parity (see below)
npx playwright install chromium && npm run test:browser   # the Motion tab and pages, in Chromium
node bin/brandkit.mjs build brands/ddcnorth/brand.json --out ddcnorth-kit   # vector and text files from a terminal
node bin/brandkit.mjs check path/to/brand.json # validate a definition
```

`npm run test:browser` checks ddcnorth v2.3 in the app's Motion tab and its motion and
brand-details pages, in Chromium at desktop and phone widths (it is not run in CI). Set
`CHROMIUM_PATH` to use a Chromium you already have.

`test/parity.test.js` compares the engine with the original ddcnorth kit, which is not in this
repository; set `DDCNORTH_KIT` to an unzipped copy to run it. The CLI writes everything except
images and PDFs, which are drawn by a browser.

GitHub Pages builds from `main` (`.github/workflows/pages.yml`).
