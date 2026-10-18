# brandkit

Brand kits from one `brand.json`, made in the browser.

A brand is one JSON document: its colours and their roles, the symbol's geometry, the wordmark's
outlines, lockup proportions, typefaces, and every template and guide page as a list of elements.
brandkit draws the whole kit from it:

- **Logos**: every family in horizontal, stacked, wordmark and symbol layouts, in each colour, as
  SVG, PNG and PDF, plus editable-text alternatives. Or, for an identity that composes its
  signatures, every signature in every colourway, set for every department (a ministry, a
  division) it defines.
- **Templates**: business cards (front and back, with trim and safe area), letterhead, envelopes,
  social posts and banners, presentation covers. Fill in the fields once and download SVG (text
  still editable), PNG or PDF, or all of them zipped.
- **The brand guide**: eight framed pages, logo reference sheets and a one-page overview, as SVG
  and as one PDF, read in the same viewer as the manual library.
- **Web files**: CSS variables, design tokens, a typed React component, a landing-page starter,
  favicon (SVG and multi-size `.ico`) and app icons.
- **The kit itself**: around 190 files in a zip with an offline `index.html` to browse them,
  and `source/brand.json` so the kit can be rebuilt.

Nothing is uploaded: the drawing, the PNGs (canvas), the PDFs (jsPDF and svg2pdf) and the zip
(fflate) are all made in the page.

**[Open brandkit](https://projects.ahmadjalil.com/brandkit/)**

## Brands

| | |
| --- | --- |
| [`brands/ddcnorth`](brands/ddcnorth) | The ddcnorth six-dot identity, v2.1. The engine reproduces the original kit's 48 vector files (logos, symbols, patterns, icons, templates, favicon, app icon) byte for byte, and its guide page for page. |
| [`brands/northwind`](brands/northwind) | An example made by the starter, to show nothing in the engine is particular to ddcnorth. |
| [`brands/bc-province-1977`](brands/bc-province-1977) | The Province of British Columbia’s 1977 Visual Identity Program, reconstructed from its four manuals in the manual library: the Provincial and ministerial signatures in nine formats, set for every ministry of 1976–1986; stationery for every rank (Premier, Ministers, Deputy Ministers, Boards and Commissions, General and Special Use); memorandum and news release; publications; advertising; uniform insignia; vehicle markings; signs on the Sign Manual’s grid; and a guide. |
| [`brands/bc-hydro-1983`](brands/bc-hydro-1983) | BC Hydro’s 1983 Graphic Standards Manual: the Corporate, Gas Operations, Rail and Formal signatures in their colourways; Corporate, Gas and Rail stationery; forms; publication covers and mastheads; advertising; audio-visual; signs; vehicles; and a guide with the background-value rules, incorrect usage and minimum sizes. |

The two BC brands are historical reconstructions for reference, not current guidance. Helvetica,
Times and Courier are set in TeX Gyre Heros, Termes and Cursor (GUST Font License). Their artwork
comes from [PofBC](https://github.com/ahzs645/PofBC) (`npm run import:pofbc -- /path/to/PofBC`),
and their definitions are written by `npm run make:bc`, from scripts that keep each manual
measurement next to the page it comes from.

Every template, signature and guide page in them cites the manual pages it is built from. In the
app, those pages show as thumbnails under it that open the page in the manual library; and a page
in the library lists what is built from it, linking back.

**Revisions** keep a proposed change beside the approved identity: ddcnorth carries one, the
*rising symbol* (the six dots flipped so they climb to the right). Choosing it in the header shows
every page, and builds every file, as it would make them; the approved kit includes it, with a
side-by-side comparison, in `revisions/rising/`.

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
node bin/brandkit.mjs build brands/ddcnorth/brand.json --out ddcnorth-kit   # vector and text files from a terminal
node bin/brandkit.mjs check path/to/brand.json # validate a definition
```

`test/parity.test.js` compares the engine with the original ddcnorth kit, which is not in this
repository; set `DDCNORTH_KIT` to an unzipped copy to run it. The CLI writes everything except
images and PDFs, which are drawn by a browser.

GitHub Pages builds from `main` (`.github/workflows/pages.yml`).
