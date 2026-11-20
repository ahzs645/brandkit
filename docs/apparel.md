# Clothing studio

Open **Clothing** in a brand that has logo artwork, or use `?brand=northwind&view=clothing`.

The first clothing adapter contains a generic crewneck sweatshirt and pullover hoodie. Both have a static drape, independent front/back/sleeve texture maps, five illustrative sizes, ribbing and fabric shading. The hoodie also has separate hood, lining, pocket and drawcord geometry. These are procedural preview garments, not matched Gildan/ATC assets or supplier patterns.

## User workflow

1. **Product:** search and select the crewneck or hoodie.
2. **Configure:** select garment colour and size. Size changes keep every artwork dimension and offset unchanged in millimetres.
3. **Artwork:** add independent layers using original logo variants from the open brand. Select a region, change width and position numerically, preserve the artwork aspect ratio, choose a decoration method, duplicate, reorder, hide or lock a layer.
4. **Review:** save a named project, download portable JSON, export the current 3D/flat preview as PNG, or download an SVG review sheet with front/back views and per-layer dimensions.

The preview offers perspective, front, back and both upper-sleeve camera views. Mouse or touch orbit is enabled on the 3D stage; numerical placement controls remain available on narrow screens. If the browser cannot create a WebGL renderer, the studio opens the editable flat layout automatically and disables the unavailable 3D toggle. Mobile layout uses stacked preview and inspector sections. Actual phone GPU/touch qualification is separate from emulated viewport testing.

## Data and geometry

`apparel-layout.js` owns the `brandkit-apparel-mockup/1` schema. Projects pin asset and surface version 1. Layers contain their own stable ID, original brand-artwork ID, area, physical width, aspect ratio, offsets, rotation, decoration method, visibility and lock state. The selected garment size changes its geometry and texture-to-millimetre scale; it does not change saved artwork coordinates.

`apparel-garment.js` produces the static geometry. `apparel-studio.js` uses UV textures composited from the original brand SVGs, so prints inherit the mesh’s drape and fabric lighting. It does not change a logo’s lettering or proportions. The stage renders on demand, caps display pixel ratio at 1.5, bounds the image cache, and disposes replaced geometry and textures.

`apparel-flat.js` draws the same physical placements in a flat review sheet. One common scale fits the complete garment and sleeve bounds for all five sizes, with separate front/back panels and a gutter. A 3D PNG is exported at 2000 × 1600; flat PNG is rendered at 2320 pixels wide. PNG and SVG review exports omit the editor’s region guides and selected-artwork box. The SVG sheet includes every visible layer’s dimensions and method, including retained unplaced layers identified for review.

The left-chest, front, back and upper-sleeve regions have deliberately conservative generic dimensions. A hoodie’s front region ends above its pocket, and its back region starts below the hood. If switching products makes artwork unsuitable, its physical data is retained and the layer is marked unplaced. Returning to the original garment restores its availability. An explicit size/position edit fits the complete rotated footprint; a patch preview includes its backing margin in that calculation.

## Persistence and portability

The small current draft is stored per brand in browser storage. Named designs use the shared `MockupProjects` component and IndexedDB project store, with explicit revision updates. The Review section remains mounted when another inspector tab is selected, preserving the active saved project and revision. Editing is disabled while a PNG export captures the selected project. Imported JSON is validated before it can replace the current design. Unknown garments, asset versions, layer IDs, artwork references, methods, invalid booleans and nonfinite dimensions are rejected.

Opening an external JSON file detaches the previous named project, so **Update saved** cannot accidentally target the design that was open before import. Unreadable or unsupported local drafts are copied verbatim to unique browser recovery keys and verified before the new draft may autosave. If that backup fails, the original slot remains protected and autosave is paused; the recovery notice offers the original data as a download.

Artwork references belong to the open brand. Portable JSON does not bundle the brand pack; reopen the matching brand before loading the mockup. Named designs are browser-local. Download JSON to keep a portable copy.

## Decoration and production limits

Screen print and DTF/DTG share the cloth-shaded artwork preview. Embroidery adds a modest relief appearance; patch preview adds a backing and border. These modes record design intent and do not generate stitch files, print-provider jobs, separations or production templates. No universal embroidery limits are imposed. Confirm actual garment construction, supplier print areas, thread details and digitization separately.

This pilot does not yet include SKU-matched garment scans/photos, knitted-in designs, all-over pattern-piece layouts, full-zip/quarter-zip geometry, uploaded garment models or supplier catalogue adapters. Those can be added through the same physical artwork model after the source assets and surface definitions are qualified.

## Verification

- `node --test test/apparel.test.js`: physical dimension round trips; all-size preservation; retained crewneck/hoodie placements; rotated region bounds; independent source references; duplicate identity; malformed import rejection; review-sheet artwork/dimensions; distinct UV garment components.
- `node --test test/mockup-draft.test.js`: untouched valid drafts, exact malformed/newer-format preservation, collision handling, failed-copy protection and unavailable storage.
- `npm run build` followed by `CHROMIUM_PATH=/usr/bin/chromium node test/browser/apparel.check.mjs`: built-app controls, layer lock/visibility, separate logo selection, hoodie/size switching, named save and reload, portable JSON, PNG dimensions, SVG review download and a 390-pixel viewport. `SCREENSHOT_DIR` sets the output directory.

The browser check must actually complete before its results are reported as passing. The mere presence of the script is not evidence of visual or mobile acceptance.
