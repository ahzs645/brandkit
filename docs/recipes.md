# Document Kit recipes in Brand Kit

A recipe job carries its Document Kit recipe, components, data and figure sources in one JSON file. Brand Kit supplies the selected identity, font roles and logo. Recipe authors keep project records and reference material in their own repository.

## Set up

From the Brand Kit checkout, run these commands with Node 22 or newer. The submodule pins the document engine version used to compile the recipe and write the Word file.

```sh
git submodule update --init vendor/document-kit
npm ci
npm run setup:document-kit
```

For CLI jobs containing Mermaid, use `npx playwright install chromium` or set `CHROME_PATH` to an installed Chromium executable. For PDF, install LibreOffice or set `SOFFICE_PATH` to its executable. Browser exports use the browser already running the app.

## Generate a document

In the app, open a brand, choose **Templates → Documents → Generate Word from recipe**, then select the job JSON. The generated Word file downloads immediately.

```sh
node bin/brandkit.mjs recipe brands/northwind/brand.json \
  --input examples/recipes/brief.json --out dist/recipe-example --pdf
```

The CLI creates `proposal.docx`, optional `proposal.pdf` and the editable source for each figure (`.mmd` for Mermaid and `.<renderer>.json` for other renderers). Use a separate output folder per job. The browser-safe API is `recipeDocx(ctx, job, {png, mermaid})` from `brandkit/recipes`. `exportRecipe(ctx, job, {outDir, pdf})` from `brandkit/recipes/node` handles local export.

## Recipes supplied by a brand pack

A brand can list jobs under `documentation.recipes` in its `brand.json`. Each entry has a `label`, a pack-relative job `file` and an optional `sampleData` path. Include the files in the pack. In **Templates → Documents**, choose the brand recipe and generate Word, or download its editable sample data. The job contains the data used for that export. Regenerate a derived job with its authoring tool after changing the underlying records.

## Job fields

| Field | Value |
|---|---|
| schema | `brandkit/recipe/1` |
| recipe | Document Kit recipe object. Its ID identifies the document. Its parts refer to shared or supplied components. |
| components | Array of project components. Use an empty array for jobs that use only Document Kit’s shared library. |
| data | JSON values referenced by recipe tags. A value of `{"$image":"team"}` resolves the named image. |
| images | Optional dictionary. A keyed image can be a renderer/source pair or `{"mermaid":"flowchart LR\n  a --> b"}` or `{"type":"image/png","base64":"…"}`. JPEG is also supported. |

The adapter supplies the data fields `brandName`, `logo`, `logoWidth` and `logoHeight`. The logo box preserves the selected logo’s aspect ratio. Data tables inherit the brand’s publication design from `documentation.tables.style`. Mark column headings with the header row role so Word applies the heading style and repeats them across pages. An explicit recipe-level table theme opts into a custom design. The exporter reports unresolved completion fields with Document Kit’s field information.

The minimal example is in `examples/recipes/brief.json`. The engine’s recipe reference is in `vendor/document-kit/docs/recipe.md`.

## Diagram adapters

Use a renderer ID and its source for new figures. D3 reads data and uses the selected brand's font outlines and colour roles. Mermaid accepts a definition string. Current jobs using the short `{"mermaid":"…"}` form continue to work. Both forms resolve through Document Kit’s registry.

```json
{"renderer":"d3","source":{"type":"gantt","title":"Delivery","data":{"unit":"Week","tasks":[{"label":"Build","start":0,"end":3},{"label":"Launch","start":3}]}}}
```

### Device mockups

The `devices` renderer puts screenshots on brandkit's drawn hardware, as in the Devices tab: laptops, phones, tablets, monitors and browser windows. A slot names a device from `src/mockups/device-catalog.js` and its screen; a screen is a PNG or JPEG given as `{"type","base64"}`, a data URL, or `{"$image":id}` naming another entry in the job's `images`. Phones and tablets show a status bar above the screenshot, so nothing sits under the camera cutout; set a slot's `status` to `false` to fill the screen, or to `{"colour":"#ffffff","time":"9:41"}` to style the bar. `preset` (default `laptop-phone`) chooses the arrangement and fills any slot without a device; `canvas`, `background` (a hex colour, or none for transparent) and `shadow` follow the Devices tab. The photographed frame sets need their image files or a browser, so recipes accept the drawn devices only.

```json
{"renderer":"devices","source":{"preset":"laptop-phone","slots":[
  {"device":"laptop-14","screen":{"$image":"home-desktop"}},
  {"device":"phone-island","screen":{"$image":"home-phone"}}]}}
```

For a new engine, pass a `diagrams` array of `{id, render(source)}` adapters to `exportRecipe`, `browserRecipeDocx` or `recipeDocx`. The callback returns `{svg}` or `{bytes}`. Use outlined SVG text or return PNG bytes carrying the engine’s typography. JSON recipes can use any renderer registered by their host. Word contains the rendered figure. Edit the diagram source and regenerate to change its structure.
