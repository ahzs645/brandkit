# Template Printer integration

Template Printer is pinned as a Git submodule at `vendor/template-printer`. Its frontend exports
one React component, `TemplatePrinter` (`frontend/src/embed`, documented in the submodule's
`docs/embedding.md`), which its own website renders across the page and brandkit renders in the
**Template Printer** tab, inside the page: no frame, no second build, no message passing. Its
styles are scoped to its own root, so neither app's CSS reaches the other.

## Using both applications

In **Templates**, select a design, fill its fields and choose **Edit & print**.
The full printer opens with its artwork, fields, fonts, back and variants already
loaded. **Printer package** downloads the same portable ZIP for use in a separate
Template Printer deployment. No manual SVG or font handoff is needed.

**Use on the Template Printer website** offers **Template files (.zip)** and an
**Open Template Printer website** link in both Templates and the printer tab.
The ZIP contains your current Brand Kit field values, artwork, fonts, sides and
variants. On the website, choose **Design → Import SVG → Open** and select it.
Unzip the same file if you need the editable source folder instead. SVG, PNG,
PDF and all-template ZIP exports remain available in Templates.

OTE's staff card also offers **Open published original directly**, using the
provided public package URL. This opens the original saved sample data. Current
browser edits travel in the downloaded package; they are not uploaded or added
to a public URL. The external website has its own library and browser storage.
Use **Share → Download package** there and import it into Brand Kit to return.

The **Template Printer** tab includes all upstream tools: SVG import, canvas design,
people, field mappings, photos, barcodes, front/back editing, variants, lanyards,
batch exports, printer layouts, colour calibration, fonts, sharing and settings.
Choose a brand template there and **Open in the printer**, or open a package belonging
to the brand (OTE's staff card). **Printer website** opens the standalone deployment.

To bring an edited design back, use the printer's **Share → Download package**: a
notice above the printer offers **Add it to [brand]'s templates**. It appears in the brand's
Templates list with editable fields, and is saved in this browser. Download the
brand JSON or kit to move it to another machine; imported files are embedded in
JSON and included in the kit. A failed browser save is reported instead of
claiming the imported brand was saved.

| Data | Compatibility |
| --- | --- |
| SVG artwork and physical dimensions | Preserved; brandkit previews and exports SVG, PNG and PDF. |
| Text, dates, photos and barcodes | Field definitions and mappings travel in the package. Brandkit supports text/date input, photo upload and vector barcode rendering; the full printer supplies its advanced field and photo controls. |
| Fonts | Font bytes travel with the design. Native brandkit font roles receive distinct family aliases to keep Regular, Bold and Italic from overwriting one another. |
| Front/back, variants and trim | All sides, variant selection rules and card-area metadata survive a package round trip. |
| Canvas scene documents | Retained intact for editing in Template Printer; brandkit shows the exported SVG representation. |
| People, layouts, calibration and application settings | Managed by the full printer, using its existing browser storage. They are not copied into a brand definition. |

The browser-only build uses IndexedDB on the site's origin. An Express, SQLite or
Convex service is not required. Shared server storage remains an upstream hosting
option. Brandkit's shared brand-centre views show the templates and package
downloads; the full editing workshop also provides the printer tab.

Native templates transfer as rendered SVG with editable fields. Their original
element-based layout rules stay in the original brand template; importing an
edited printer package adds an SVG template. Canvas scenes stay editable in the
full printer and travel intact in their packages.

## Over the Edge example

OTE contains a **Staff Card** set with `staff-card-front` and `staff-card-back` in
**Templates**, plus **Open staff card** in the printer. This is the supplied original
card, with its own artwork and Helvetica Neue faces, alongside the fourteen
Forest press templates. Importing the legacy card does not recolour it into the
newer identity.

The source archive at `brands/overtheedge/templates/staff-card.zip` is unchanged:

- Source: [staff_card.zip](https://projects.ahmadjalil.com/builds/configs/staff_card.zip).
- SHA-256: `1528ad01b4039be80ba833ccb9eb45e6eb542803970586d7679a35e4b8410457`.
- Size: 393,129 bytes; package format version 1, named `Staff Card`.
- Artwork: `front.svg`, `back.svg`; fonts: HelveticaNeue-Bold and HelveticaNeue-Medium.

`npm run make:overtheedge` imports it using the same public API used by other hosts,
writes its font assets and records the package in `brand.printer.packages` and
`brand.files`. The card's source lacks physical width/height; its viewBox is kept
and CSS-pixel dimensions are used consistently rather than assuming a card size.
The original manifest's fields and sample values are preserved.

## Public API for other projects

These entry points are independent of the React app:

| Entry point | Exports |
| --- | --- |
| `brandkit/printer` | `readPrinterPackage(bytes)`, `importPrinterPackage(brand, bytes, options)`, `createPrinterPackage(context, template, options)`; package size/format constants and base64 helpers. Works in browsers and Node. |
| `brandkit/printer/bridge` | `printerWebsiteUrl(packageUrl, { website })` and `PRINTER_WEBSITE`: a link to a standalone printer website, opening a published HTTP(S) package. |

A package import returns `{ brand, assets, record }`. By default, its complete
archive and font bytes are embedded in the brand's `assets` map so JSON and
browser storage remain portable. Use `{ id, file, embedAssets: false }` to write
those assets to a repository instead; `assets` is a Map of relative path to bytes.
Package names are namespaced, existing imports with the same id are updated, and
collisions with unrelated native templates are rejected.

Pass `sourceUrl` to `importPrinterPackage` to record an optional published original
HTTP(S) package URL. That enables a direct website link to that original; the
hosting server must allow cross-origin fetching. `brand.printer.website` optionally
selects another standalone deployment. `TemplateStudio` hosts opt into the website
panel with `printerWebsite={{ website }}` alongside `onPrinterPackage`.

```js
import { importPrinterPackage, createPrinterPackage } from 'brandkit/printer'

const imported = importPrinterPackage(brand, bytes, { id: 'staff-card' })
const nextBrand = imported.brand
const card = nextBrand.templates.find(t => t.id === 'staff-card-front')
const portable = await createPrinterPackage(
  { brand: nextBrand, fonts, values }, card,
  { readAsset: source.read }
)
// portable.bytes is a ZIP accepted by standalone Template Printer.
```

To show the printer in another React app, render the component itself:

```jsx
import { TemplatePrinter } from './vendor/template-printer/frontend/src/embed'
import './vendor/template-printer/frontend/src/embed/template-printer.css'

<div style={{ height: '80vh' }}>
  <TemplatePrinter initialPackage={portable.bytes} packageLabel="My app"
    onExportPackage={(bytes) => importPrinterPackage(brand, bytes)} />
</div>
```

The host needs React 19, `@tailwindcss/vite` and `resolve.dedupe: ['react', 'react-dom']`
(see `vite.config.js`), and the printer's dependencies installed with `npm run setup:printer`.

## Brand schema

Imported templates have `svg` (sanitized artwork), `printer` (fields, mappings,
package id, source file, sample values and optional card area), and an empty
`elements` array. Native templates retain their existing element representation.
`brand.printer.packages` links every imported archive to its sides and variants.
`brand.assets` maps paths to base64 bytes for portable imports; `brand.files` names
the files included in a kit. Engine rendering, the font provider and the kit
builder can read these assets in the browser or Node.

The original archive preserves canvas scenes, variant rules, font bytes and
additional manifest keys. Export updates field values and sanitized artwork while
retaining those records. Untrusted SVG loses scripts, HTML, event handlers and
external resource links; internal vector references and embedded bitmap images
remain. Package reads enforce version, size, expanded-data and relative-path checks.

## Development and deployment

```sh
git submodule update --init --recursive
npm ci
npm run setup:printer
npm run dev
npm test
npm run build
```

Use Node with Corepack; the submodule pins pnpm 10.11.0. CI uses Node 22 and checks out
submodules recursively. The printer is compiled with the app, by brandkit's own Vite and
Tailwind plugin, into the Template Printer tab's chunk, loaded only when the tab is opened. When
updating the submodule, reinstall its frontend (`npm run setup:printer`), then run the tests and
open the tab before recording the new pointer.
