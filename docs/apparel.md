# Clothing studio: imported garment pilot

The Clothing view uses **Elvaerwyn's original fitted women's zip hoodie**, obtained from MakeHuman's official `shirts02` asset pack. The hood is down and the zip is closed. The garment is an authored third-party mesh, not a garment shape made for Brandkit. Only that qualified model is offered. Crewnecks, pullover hoodies, quarter-zips, supplier SKUs and supplier integrations are not implemented.

## Asset and provenance

The original `ladieshoodiedown1.obj` contains 9,935 vertices and 9,787 quads. Its GLB contains 19,574 triangles, 13,280 exported vertices (UV seam splits), the original texture coordinates, and embedded original 1,024-pixel diffuse and normal maps. The complete 1,045,176-byte GLB lives at `public/models/apparel/elvaerwyn-zip-hoodie.glb`.

The creator is Elvaerwyn. The original `.mhclo` and official pack specify **CC-BY** without a version; Brandkit preserves that exact designation. See [the official asset catalog](https://static.makehumancommunity.org/assets/assetpacks/shirts02.html), the original metadata/source files in `assets/apparel/elvaerwyn-zip-hoodie/`, and `public/models/apparel/NOTICES.md`. The catalog card uses the creator's actual thumbnail.

Run `blender --background --python scripts/convert-apparel-asset.py` to reproduce the conversion from the tracked source. It imports the original OBJ, converts its decimetre units to metres, centres it at the hem, smooths normals, and exports GLB. There is no new garment geometry. At runtime the dark-blue source diffuse map is desaturated and exposed to make a tintable colour preview; its original textile detail is retained. The original maps remain unchanged in the source GLB and tracked source folder.

## One scene for 3D and 2D

`apparel-garment.js` loads the real GLB through Three.js `GLTFLoader`. `apparel-studio.js` owns a single scene containing that garment and the visible artwork meshes.

The **3D preview** uses a perspective camera and OrbitControls. **2D views** use an orthographic camera looking at the exact same mesh, textures, layer visibility and physical placements. There is no separate drawn sweatshirt silhouette, photograph substitute or SVG garment fallback.

When WebGL cannot initialize, `model-preview.js` rasterizes that same Three scene to Canvas2D. It preserves geometry, depth, UV textures and projected decals and supports orbit/view changes. Its lighting is approximate; PBR environment reflections, texture normal/bump effects and cast shadows are not reproduced. The UI reports “software 3D” when it is in use. Both modes render on demand, cap interactive work, and dispose geometry, materials, textures, controls and resize observers when the view closes.

## Original artwork and physical placement

The artwork selector uses `vehicleLogos(brand, fonts)`, so it receives the open brand's original approved logo variants and lockups. The logo is rasterized without changing its proportions, then `DecalGeometry` clips its projection against the imported garment triangles. No floating rectangular logo plane substitutes for the fabric.

Each independent layer stores an original artwork reference, name, width in millimetres, aspect ratio, offsets, rotation, decoration method, visibility and lock state. There are chest regions on either side of the centre zip, a back region below the hood, and left/right outer sleeve regions. Rotated artwork and patch backing are constrained to their preview regions. Logo projection uses an outward-facing basis, so back and sleeve lettering reads correctly from outside the garment.

The five **preview sizes** scale the one reference mesh: S 0.96, M 1.00, L 1.04, XL 1.08 and XXL 1.12. They are explicitly labelled visual scales, not supplier grading. The M reference model is 625.16 mm high including its hood. Changing the mesh scale preserves each artwork's millimetre dimensions and offsets. These dimensions describe the calibrated reference mesh, not a measured real blank.

Screen print and DTF/DTG are appearance previews. Embroidery adds a light relief cue, and patch adds a backing/edge. They do not create machine stitches, digitization, cut patterns or manufacturing instructions.

## Persistence, recovery and exports

`brandkit-apparel-mockup/2` includes asset ID `elvaerwyn-zip-hoodie-2018-v1`, asset version 1 and placement version 2. Strict JSON validation rejects unsupported assets, unknown artwork references, duplicate layer IDs and invalid numeric values.

The retired v1 procedural garments are not silently remapped onto this different shape. `readMockupDraft` preserves their exact original JSON in a verified unique browser recovery copy, or disables draft overwrites if that copy cannot be stored. Clothing exposes **Download recovered draft**. Saved named records remain in IndexedDB, and their per-record **JSON ↓** button downloads the original project even if the current editor cannot open its old asset version. A failed open or a raw backup download does not change the active design or its saved-project binding.

Named project storage is shared with Vehicles. Saves are explicit and revision-checked. The Review inspector remains mounted across inspector navigation, preserving the revision binding; external JSON imports detach that binding. Browser storage is local to the device; JSON is the portable backup.

**Export PNG** captures the current model camera. **Download review sheet** renders front and back orthographic images from the same scene and embeds those PNGs in an SVG with artwork dimensions, methods, creator and asset ID. `apparel-review-sheet.js` only composes the page; it requires those real model images. It cannot manufacture a substitute garment drawing. Review sheets are not supplier production patterns.

## Verification

`node --test test/apparel.test.js` verifies source-vertex preservation, source credits and triangle count; schema/physical-size round trips; legacy rejection without mutation; rotated and patch bounds; actual source-mesh decal coverage in every region at all preview sizes; readable front/back UV orientation through the software renderer; and perspective/orthographic rendering of the same binary mesh. Recovery/store tests are separate.

`npm run test:apparel:browser` is the reproducible built-app interaction runner. It covers independent artwork, locking and visibility, preview sizes, named updates across inspector navigation, legacy named-record JSON recovery, reload, JSON/PNG/review exports, 2D front/back and mobile overflow. Its presence is not a claim that it ran in a given environment. Actual browser screenshot evidence is reported separately.
