# document-kit in brandkit

[document-kit](../vendor/document-kit/README.md) is the document library brandkit shares with
nalsreport and PGMaps. It runs in the browser and in Node and never reaches the network: fonts,
pictures and Word files arrive as bytes. It is a git submodule at `vendor/document-kit` and a
`file:` dependency (`"document-kit": "file:vendor/document-kit"`).

Every brandkit document (a publication from **Documents**, a brand's designed publication or slide
deck, a recipe job, each document of a client pack with its designed welcome cover, the documents of
a kit) is one document in document-kit's block model. From it come:

- **the Word file** (`writeDocx`), the master people edit;
- **the PDF** (that Word file laid out by `document-kit/layout`), which the on-screen preview shows,
  "Download PDF" saves, "Print or save PDF" prints and the command line writes;
- **the print view** (`writeHtml`), one self-contained HTML page from the same document.

So the Word file, the preview and the PDF look the same: the preview *is* the PDF, and the PDF is
the Word file laid out. One set of brand faces goes into all three.

## What brandkit uses it for

| Feature | Kit entry | Where |
| --- | --- | --- |
| Publications as the block model, written as Word | `document-kit` builders, `document-kit/docx` (`writeDocx`) | `publicationDocument` and `publicationDocx` in `src/export/publication.js` |
| A designed welcome cover: artwork behind the page, words in frames set with exact leading | `frame`, `floatingImage`, `{ exact }` line heights | `welcomeCoverSection` in `src/export/welcome-cover.js`, the publication's first section |
| A brand's designed publications and slides (`publications` in brand.json) | sections per page, `floatingImage` grounds and plates, `frame`s, `pinned`, tables, exact line heights | `designedPublicationDocument` in `src/export/designed-publication.js` ([brand-schema.md](brand-schema.md#publication-system)) |
| Print views (Documents' *Download print view*, kit `documents/*.html`, pack `*.html`) | `document-kit/html` (`writeHtml`) | `publicationPrintHtml` in `src/export/publication.js` |
| Recipe jobs | `document-kit/recipe`, `document-kit/docx`, `document-kit/diagrams` | `src/recipes/` ([recipes.md](recipes.md)) |
| The PDF of any Word file | `document-kit/layout` (`layoutDocx`) | `src/export/layout.js`, run in `src/export/layout.worker.js` in the app and directly in Node (`layoutPdf` in `src/export/node.js`) |
| The preview: the PDF drawn with PDF.js | `document-kit/pdf-preview` (`createPdfSource`, `openPdfPreview`) | `src/ui/PdfPages.jsx`, `src/export/document-source.js`, `src/export/document-pdf.js` |
| Table designs | `tableGrid` | `applyTableLook` in `src/export/table-look.js` (publications and recipes) |
| Brand faces and their licences | `fontEmbeddingReport`, `fontFileInfo`, `NamedFont` | `src/export/brand-faces.js` |

### One snapshot, one Word file, one PDF

`documentSnapshot({ word, title, faces, name })` is a document as it stands. `wordFor(snapshot)`
writes its Word file once; `pdfFor(snapshot)` lays that Word file out once (`createPdfSource`).
The preview, **Download Word**, **Download PDF** and **Print or save PDF** all ask the same
snapshot, so they are the same bytes. An edit makes a new snapshot. The preview waits for typing
to settle, keeps the pages it shows while the next PDF is laid out, draws a page only near the
visible area, and lists what the layout could not draw as given (`layoutNotices`).

### Fonts

The layout draws Office faces with open stand-ins that have their widths (Arimo for Arial, Tinos
for Times New Roman, Carlito for Calibri…), served by the app from `document-kit/fonts`
(`src/export/layout-fonts.js`, `?url` imports) and read from disk in Node
(`src/export/layout-fonts-node.js`). The brand's own faces (`brandFaces(ctx)`) are passed by the
family name the documents give them (`officeFont`: a weight Word cannot call regular or bold is its
own family, "Inter SemiBold"), as `namedFonts` to the layout, `embedFonts` to `writeDocx` and
`fonts` to `writeHtml`:

- Word embeds TrueType faces whose licence allows installable or editable embedding; the rest are
  left out and listed, with the reason, in the file's `brandkit.fontRequirements` property.
- The PDF draws every brand face but one whose licence forbids embedding (restricted, or bitmaps
  only): that one is drawn with its stand-in and the preview says so. OpenType (CFF) faces are
  embedded in the PDF whole.
- A face that stands in for an installed Office face (`office` differs from `family`) is not
  passed: the documents name the installed face, which Word, the layout's stand-in and the browser
  all use.

### Keeping it off the first load

The layout engine (about 700 kB minified) and the stand-in fonts live only in the layout worker's
chunks (`worker: { format: 'es' }` in `vite.config.js`); the worker starts the first time a PDF is
asked for. PDF.js and its worker load with the first preview. The app's first load carries only
document-kit's model (builders, the table grid, the font report: about 34 kB).

## Designed publications

A brand's `publications` (styles, kinds, documents) are written page by page as sections:

- a cover or closing page is a section with no foot margin; its ground, plate, lockup and accent band
  are one picture (SVG drawn as PNG by the app's canvas or resvg) floating behind the page from the
  section's header, and its words flow from the design's text box, with the meta lines and the
  closing foot in frames;
- a running page's ground and furniture (neatline, title-block rules, bar, band, dot index, the
  symbol) are the same kind of picture, and its running words (owner, document, section, edition,
  page) are frames in the header; its body is the blocks in the flow;
- a slide is a 16:9 landscape section (1440 × 810 pt), its heading in a frame, its body in the flow;
- every role's line height is exact (`{ exact: pt }`, the design's CSS line height times its size).

The lockups and the family key are drawn into the page picture rather than placed as inline
pictures in frames: the layout places an inline picture inside a frame at the top of the page.

## What stays as it was

- Template Studio letterheads and PowerPoint templates (`docxFile`, `pptxFile` in
  `src/export/office.js`) and the SVG-mastered artwork PDFs (logos, guide sheets, template sets).
  A kit's Word letterhead does get a PDF beside it, laid out the same way.
- `brandkit pdf --pdf-engine libreoffice` converts a Word file with LibreOffice, for a master edited
  in Word whose features the layout does not draw. Everything else lays out with document-kit and
  needs no office suite.

The docx-library publication writer (`coverPublicationDocx`, `welcomeCoverDocx`) and brandkit's own
print views (`publicationHtml`, `welcomeCoverHtml`) are gone: every publication, with or without a
designed cover, is written by document-kit.

## Known differences from the old writers

- Lists are document-kit's own (a round bullet, its own indents); headings are Word's Heading
  styles; text in a body paragraph styled as a label uses a **Label** style rather than **Header**.
- A table design's faces are set on the cells' runs (the kit escapes a run's font in the print view's
  `style` attributes); the old **Table Face N** character styles are gone.
- A designed cover's words keep their exact leading (Word's `lineRule="exact"`); the print view sets
  `line-height` in points, so a browser centres the text in the line box and a baseline can sit up to
  half the extra leading from the PDF's.
- The print view's `panel` tables have square corners, as Word's always had, and a table of facts
  no longer marks its first column as row headers (`<th scope="row">`): the block model has no row
  headers.
- In the PDF (and its preview) the layout paints a behind-text picture from a section's header over
  the body's table-cell and paragraph shading. A designed publication's ground is such a picture, so
  shaded callouts, table heads and figure mounts (the `solid` and `card` looks) and placeholder boxes
  lose their fills in the PDF; Word and the print view draw them. To be fixed in document-kit.
- The layout kerns only runs that ask for it (`w:kern`), which the block model cannot say yet. A
  design paginated by hand in a browser (which kerns) sets about 1–2% wider here, so a full page can
  run on to another.
- The print view paginates by the browser, approximately; the PDF is the layout's
  (`vendor/document-kit/docs/html.md`).

## How the submodule is built

The kit's `package.json` points every entry at `dist/`, which it does not commit.
`scripts/build-vendor-document-kit.mjs` builds it when `dist/` is missing or older than the kit's
sources and does nothing otherwise; `npm run vendor:build` runs it, and `pretest`, `predev` and
`prebuild` run that. `npm run setup:document-kit` installs the kit's build tools from its own
lockfile and builds it; the Pages workflow runs it after checking out submodules recursively.

## Moving the kit's pointer

1. Change the kit in its own repository; never edit `vendor/document-kit` here.
2. Here: `git -C vendor/document-kit fetch && git -C vendor/document-kit checkout <commit>`.
3. `npm install` (the kit's dependencies may have changed), then `npm run vendor:build`.
4. Run `npm test` and `npm run build`, and try **Documents** (preview, Word, PDF, print view) and
   **Client pack** (preview and *Download pack*) on a long document.
5. Commit the new submodule pointer with any `package-lock.json` change.
