# Vehicles

The **Vehicles** tab offers four imported 3D assets for new designs: a crew-cab pickup, a
hatchback and two SUVs. Their catalogue thumbnails are rendered from the source GLBs. **3D**
and **2D elevations** use the same loaded meshes, configuration, original artwork and decal
geometry; changing to elevations selects an orthographic camera. When WebGL is unavailable,
a software 3D renderer draws the same scene with simpler lighting.

The pickup supports its original **Open bed** and **Tonneau cover** configurations. Independent
logos, contact details and other artwork can sit on its cab, bed sides, hood and tailgate, over
an optional body wrap. Export the current view as a PNG or create a four-view review sheet with
configuration and layer sizes.

These are downloaded **generic visualization models**, not manufacturer-qualified vehicles.
No Ford F-150, Toyota Tacoma or compatible canopy SKU has been qualified. The older procedural
canopy and service trucks remain addressable for saved-project recovery but are excluded from
new selection. The [asset intake guide](vehicle-asset-intake.md) describes the additional
evidence needed for a named vehicle and fitted accessory.

- [What it can do](#what-it-can-do)
- [How it fits together](#how-it-fits-together)
- [Using the tab](#using-the-tab)
- [Giving a brand its own vehicle designs](#giving-a-brand-its-own-vehicle-designs)
- [Adding a vehicle to brandkit](#adding-a-vehicle-to-brandkit)
- [How it works inside](#how-it-works-inside)
- [Limits, and what could come next](#limits-and-what-could-come-next)
- [Files](#files)

## What it can do

| Feature | Behavior |
| --- | --- |
| **Vehicle library** | Search, category filters, favourites and recently used entries for four imported models: crew-cab pickup, four-door hatchback, lightweight SUV and compact SUV. Each card uses a render of its source model. |
| **Pickup configuration** | Open bed or the original retractable tonneau. The adapter hides or shows exactly 19 existing source nodes; it does not generate a bed, canopy, rack or alternative body. |
| **Paint** | Body colour with neutral and brand swatches. The imported tonneau retains its original dark cover and metal slats. Separate canopy/service-body finishes remain available only when reopening legacy projects. |
| **Artwork layers** | Up to 32 independently named layers, each with its own artwork, surface, dimensions, rotation, visibility and lock. Add, duplicate, reorder, remove, centre, fit, and copy to the other side without reversing lettering. |
| **Artwork recovery** | Layers retain their original model, component configuration and placement. Changing vehicle or removing a legacy surface moves affected layers into **Unplaced artwork**. Restoring the same surface restores them; explicit remapping places them on a different surface. Open/tonneau uses the same six painted pickup areas. |
| **Wrap** | **Sides**, **Rear half** or **Full body** coverage, using brand graphics, patterns, brand files or uploads. Scale, offsets and mirroring remain separate from the independent lettering layers. |
| **Brand designs** | Current imported-model liveries can start a new design. Existing `brand.vehicles.liveries` definitions remain compatible, and shared lettering migrates into independently editable layers, one per saved placement. Legacy procedural liveries are excluded from the new-design picker. |
| **Scene and interaction** | Studio, dark, brand and outdoor backdrops. Choose **3D** for perspective/orbit or **2D elevations** for parallel left, right, front, rear and above views of the same model. Drag artwork, use resize/rotation handles, nudge with arrow keys or enter numbers. |
| **Renderer fallback** | WebGL and the software 3D renderer share the loaded scene, camera, mesh transforms, depth, texture coordinates and decals. The software renderer uses simpler lighting without environment reflections or shadow maps. |
| **Saved projects** | Named projects in the browser, explicit **Save as new** and **Update saved**, revision checks against stale updates, undo/redo, per-brand draft recovery, and portable JSON import/export. |
| **Review exports** | A 2400 × 1500 PNG without editor guides, or an SVG sheet containing four rendered PNGs and layer dimensions. Perspective review includes perspective, left, right and rear; elevation review includes left, right, front and rear. Required model credit remains in exported renders. |
| **Artwork handling** | SVG, PNG, JPEG and WebP uploads. SVGs are checked for scripts, event handlers and external references before image loading. Brand files must be declared by the open brand. |

Dimensions describe the source model at its declared display length. They help judge proportion
and placement; they do not establish a production cutting template. The imported pickup's six
prepared rectangles are raycast-checked against its original painted meshes, clear of glazing,
door handles and the rear number plate recess.

## How it fits together

| Owner | Data and responsibility |
| --- | --- |
| Brandkit | Vehicle geometry, material roles, catalogue metadata, component configurations, prepared surfaces, renderer and editor |
| A brand | Original logos, approved variants, fonts, colours, patterns and optional livery artwork files |
| A mockup project | Selected vehicle/configuration, asset references, layer collection, placements, wrap, paint and scene settings |

A vehicle is added once to Brandkit and becomes available to every brand. Brand packs contain
artwork and designs, not their own copies of the 3D models. The vehicle editor uses the original
brand artwork; supporting wording can be a separate layer without rebuilding the brand lockup.

Named vehicle and clothing projects share the same transactional storage component, with brand
and product-category isolation. Their geometry and physical placement rules remain specific to
the product adapter.

## Using the tab

1. **Product:** search the four-model library, choose a vehicle, or start from one of the brand's
   imported-model liveries. New drafts use the first eligible livery, otherwise the imported
   pickup with an open bed and fleet lettering. Favourites and recently used vehicles help find
   it again. Use **3D** or **2D elevations** above the stage to choose the projection.
2. **Configure:** choose **Open bed** or **Tonneau cover** for the pickup, then set body paint and
   any wrap. Both choices use the same source asset; its existing bed floor, walls and tailgate
   stay in place. Canopy sides, racks and separate canopy paint are legacy controls, shown only
   for a previously saved procedural truck.
3. **Artwork:** choose a layer or select **Add layer**. Set its source, name, visibility and lock;
   choose its surface and adjust the placement. A layer can use a brand logo, the fleet layout,
   a declared brand file, an upload or no lettering. **Duplicate** creates another independent
   layer. **Move up/down** changes overlap order. Copying to the other side creates readable,
   independently editable artwork there.
4. **Unplaced artwork:** restore the original vehicle/configuration to recover an existing layer
   at its original placement, or choose **New surface → Place on selected surface** to remap it.
   A different surface is reviewed explicitly before changing an existing placement. Locked
   layers cannot be repositioned until unlocked.
5. **Review:** choose a backdrop, name and save the design, reopen an alternative, or export a
   review sheet. **Update saved** replaces the selected saved revision; **Save as new** keeps a
   separate alternative. A stale update from another tab is rejected, with instructions to
   reopen or save a new project.
6. **Portable files:** **Save JSON** downloads the project; **Open…** imports it. **Export PNG**
   captures the current camera. These toolbar actions are available without leaving the stage.

The saved-project list is local to the browser. Download JSON to move work to another browser or
device. A named project is opened only by an explicit action; it is not automatically reopened
on the next page load in place of the current draft.

## Giving a brand its own vehicle designs

A livery is a few lines of `brand.json` plus, usually, one or two artwork files. The full format
is in [brand-schema.md → Vehicles](brand-schema.md#vehicles); this section is the how-to.

### The Apex example: legacy livery compatibility

This existing `truck-canopy` example documents the supported livery format and migration path.
Its procedural vehicle is retained for previously saved work; new catalogue designs use the
imported models. Keep the original model ID when recovering an existing design. A new pickup
livery should use `model: "pickup"` and the measured pickup areas below.

Apex Site Services' service trucks are lettered with the logo and contact details on the doors and
the emblem across the canopy. In the [1stform/Brands](https://github.com/1stform/Brands)
repository, `brands/apex/` carries:

```
brands/apex/
  brand.json                              vehicles.liveries: two designs (canopy truck, service body)
  artwork/vehicle/apex-truck-doors.svg    the door lettering
  artwork/vehicle/apex-truck-canopy-wrap.svg   the emblem, drawn for the rear half of the left side
  source/make-brand.mjs                   makes all three from the logo's paths and the brand's faces
```

and the first livery reads:

```json
{
  "id": "service-truck-canopy",
  "label": "Service truck, canopy",
  "description": "As the fleet is lettered: the emblem across the canopy, the logo and contact details on the doors.",
  "model": "truck-canopy",
  "paint": "white",
  "backdrop": "outdoor",
  "wrap": { "coverage": "rear", "file": "artwork/vehicle/apex-truck-canopy-wrap.svg", "mirror": false },
  "lettering": { "file": "artwork/vehicle/apex-truck-doors.svg" },
  "placements": {
    "left": { "u": 0.02, "v": 0.02, "width": 1.9, "rotation": 0 },
    "right": { "u": -0.02, "v": 0.02, "width": 1.9, "rotation": 0 }
  },
  "area": "left"
}
```

### Step by step

1. **Look at the real vehicle.** A photo of the fleet is the reference: what is on the doors, what
   covers the rear, what colour the body is. Keep it in the brand's `photography/` or `reference/`.
2. **Decide what is data and what is artwork.** If a built-in source does the job, no file is
   needed: a wrap `graphic` in two brand colours, a wrap `pattern`, lettering as a `logo` or
   `fleet`. Use a file when the design is the brand's own composition (Apex's door block, its
   emblem wrap).
3. **Make the artwork.**
   - **Lettering**: an SVG of exactly what goes on one door panel (or across both doors), cropped
     to its ink, with text **outlined** (the image renderer has no fonts). The same file is used
     on both sides and always reads normally.
   - **Wrap**: an SVG drawn for the vehicle's **left** side, its **front at the left edge** and
     rear at the right. Transparent where the paint should show. It is fitted to cover each panel
     (cropped, never stretched), so draw it at the proportions of what it covers:

     | Coverage | Draw it at about |
     | --- | --- |
     | Sides, Full body | 3 : 1 (a car or truck side) |
     | Rear half, canopy truck | 1.34 : 1 (Apex's canopy wrap is 1340 × 1000) |
     | Rear half, service body | 1.85 : 1, or use the canopy proportion with `offsetV: 1` to keep the top |

   - Prefer **generating** the files in the brand's generator, from the logo's own paths and the
     brand's fonts (see `vehicleSvg`, `logoPaths` and `loaded.path` in Apex's
     `source/make-brand.mjs`): they then follow any change to the logo or the details, and the
     generator writes them byte for byte the same each time.
4. **Write the livery** in `brand.vehicles.liveries` (from the generator, or by hand), and add its
   files to the brand's `files` list.
5. **Place the lettering.** Start with `u: 0, v: 0` and a `width` a little under the area's width
   (see [Areas](#areas-and-coordinates)), open the brand in the tab, drag it where it belongs, and
   copy the numbers from **Across**, **Up** and **Width** back into the livery. A placement too
   large for its area is made to fit, so a generous width is safe.
6. **Decide on mirroring.** `mirror: true` (the default) flips the wrap on the right side so a
   graphic leads from the front on both sides; this is right for sweeps and stripes. Set
   `mirror: false` for anything made from a logo: a logo is never flipped.
7. **Check**: `npm run check` in the Brands repository (or `brandkit check`) reports any problem
   with a livery: an unknown vehicle or area, a colour the brand does not have, a file outside the
   brand, a wrap with two sources. Then `npm run build`, open the pack in brandkit, and look at the
   design from both sides.

### Areas and coordinates

Lettering is placed on an **area**: a rectangle on one face of the vehicle. Positions are in
metres from the area's centre, `u` along it as the lettering reads and `v` up it, so the same
numbers mirrored (`u` negated) put lettering in the same place on the other side.

| Vehicle | Areas (width × height, metres) |
| --- | --- |
| Imported crew-cab pickup, open or tonneau (shown 5.69 m long) | `left`, `right` cab 1.70 × 0.30 · `left-bed`, `right-bed` 1.25 × 0.30 · `hood` 1.30 × 0.60 · `rear` 1.40 × 0.20 |
| Hatchback, SUVs (shown 4.7 m long) | `left`, `right` 2.8 × 0.70 (the doors' lower half) · `hood` 1.38 × 0.72 · `rear` 1.4 × 0.60 |
| Raised solid canopy, legacy configuration (6.77 m) | `left`, `right` doors 2.0 × 0.72 · `left-body`, `right-body` canopy 2.4 × 1.0 · `hood` 1.6 × 1.0 · `rear` 1.7 × 1.45 |
| Service-body truck, legacy configuration (6.83 m) | doors as above · `left-body`, `right-body` service body 2.4 × 1.15 · `hood` 1.6 × 1.0 · `rear` 1.7 × 1.15 |

The imported pickup's cab rectangle is centred at x = −0.55, y = 0.86; bed sides at x = 1.90,
y = 1.00; hood at x = −1.90; and tailgate at y = 1.01. These positions avoid the source model's
handles, glass and plate recess. The six frames remain identical between open and tonneau.

Legacy canopy configurations retain their additional `canopy-rear` and `canopy-roof` surfaces
and configuration-dependent bounds. Always obtain current areas through
`areasFor(model, configuration)`; never transfer another model's rectangles by assumption.
See [`vehicle-layout.js`](../src/mockups/vehicle-layout.js) and
[`vehicle-configuration.js`](../src/mockups/vehicle-configuration.js).

## Adding a vehicle to brandkit

A vehicle is added once, in this repository, and every brand gets it. New vehicles use imported
source models and views rendered from those models. Follow the
[asset intake guide](vehicle-asset-intake.md) as well as the registration steps below. A detailed
mesh alone does not establish an exact manufacturer, body variant or accessory fitment.

The current pickup is Innerscene's **Crew-cab pickup with tonneau cover**, stored unchanged as
`crew-cab-pickup.glb`. Its source and download address are in
[`models/NOTICES.md`](../src/mockups/models/NOTICES.md). The other selectable source assets are
SHCreations' hatchback and Innerscene's two SUVs. New vehicle views must come from those actual
meshes; the legacy procedural builders are compatibility implementations.

### Licences for downloaded models

The current Innerscene files carry **CC0** dedications; the SHCreations hatchback is **CC BY 4.0**
and requires credit. Record the actual creator, source page, licence, download address and any
conversion or geometry changes in [`src/mockups/models/NOTICES.md`](../src/mockups/models/NOTICES.md).
Keep required attribution in the stage and exports. Licence records describe provenance; they
do not establish manufacturer fitment or production dimensions.

### A downloaded model, step by step

1. **Get a GLB** (binary glTF). A `.gltf` with separate files can be packed into one GLB with
   gltf-transform (`gltf-transform copy model.gltf model.glb`) without changing its geometry.
   Record the file size and geometry complexity, then check loading and interaction on the
   intended devices. The current pickup is about 5.7 MB before transfer compression.
2. **Inspect it:**

   ```bash
   node scripts/vehicle-model.mjs path/to/model.glb
   ```

   It prints the checksum, the model's size on each axis (the longest is its length), its credit
   and licence if it records them, and its materials, with how many meshes and triangles use each.
   Note the **paint material**: the one the painted body uses (often named for its colour, such
   as `green` or `grey_car_paint`), and the **glass** material if its windows should be made
   opaque.

   The paint must be its own material on its own meshes: artwork is projected only onto meshes
   whose material has that name. If the body shares a material with trim, separate them in
   Blender first.
3. **Add the file** to `src/mockups/models/`, and its entry to `VEHICLE_MODELS` in
   [`vehicle-models.js`](../src/mockups/vehicle-models.js):

   | Field | What it is |
   | --- | --- |
   | `url` | `new URL('./models/<file>.glb', import.meta.url).href`, so the build bundles it. |
   | `thumbnail` | A bundled render of this same source model. Keep the render's source checksum alongside the preview. |
   | `paint` | The paint material's name. |
   | `glass` | The glass material's name, made opaque dark glass (optional). |
   | `rotation` | Radians about the vertical axis to turn the model so its length runs along x with its **front towards −x** and its left side towards +z. `0`, `±Math.PI / 2` or `Math.PI`. |
   | `group`, `label`, `note`, `category`, optional `cab` | Catalogue description of the actual body/configuration. |
   | `fidelity`, `assetVersion`, `surfaceVersion` | Generic/matched status and versions used by project compatibility checks. Do not label an unverified model as matched. |
   | `title`, `creator`, `licence`, `licenceUrl`, `source` | The credit shown under the stage. |
   | `creditRequired` | `true` for CC BY: exported images then carry the credit. |
   | `sha256` | From the inspector. A test checks the file still matches, and saved mockups record it. |

4. **Give it areas** in `VEHICLES` in [`vehicle-layout.js`](../src/mockups/vehicle-layout.js):
   `areas` (prepare them for the actual body), `length` (the display length in metres: the
   imported model is uniformly scaled to it),
   and `rearHalf` (the x where a rear-half wrap starts; 0 is the middle, front is negative).
   `MODEL_IDS` and the vehicle list use these tables. If adding another category or configurable
   body, update its catalogue classification and component resolver too. An accessory must come
   from qualified source geometry; a configuration key does not establish a compatible fit.
5. **Tune the areas in the app.** `npm run dev`, choose the vehicle, and select each area: the
   tinted rectangle shows where it is. Move `origin` (its centre) and change `width` and `height`
   until each sits on flat painted panel, clear of windows, handles and arches.
6. **Check it:**

   ```bash
   npm test
   npm run build
   npm run test:vehicles:browser
   npm run test:vehicle-layers:browser
   ```

   `npm test` checks area frames, model checksums, source geometry, layer migration and
   retained-placement behavior. The vehicle browser check loads models, places lettering,
   exercises wrap coverage and captures renders in `.documentation/vehicles-browser/`.
   `VEHICLES=<id>` limits it to selected imported models; legacy recovery uses an explicit JSON
   fixture in the layer journey. `EXPECTED_RENDERER=webgl` or `software3d` can require a specific
   rendering path. Where Playwright's browser is not installed,
   `CHROMIUM_PATH` can name a compatible installed Chromium. Add acceptance cases for the new
   vehicle/configuration, including surface fit, save/reload and exported appearance. A nonzero
   decal count by itself is not sufficient visual qualification. Record the renderer used: a
   software 3D browser check does not establish WebGL lighting or GPU performance.
7. **Render source previews** with [`scripts/render-model-previews.py`](../scripts/render-model-previews.py).
   This Blender script imports the GLB and renders perspective/elevation views; its generated
   `source.json` records the source checksum, geometry and camera setup. Catalogue cards use
   these renders, while the editor itself renders live geometry.
8. **Record the source and licence** in `NOTICES.md`, and update this guide's areas and model list.

### Imported pickup component adapter

[`imported-pickup.js`](../src/mockups/imported-pickup.js) recognises exactly the source's
`Seated retractable tonneau` and eighteen `Tonneau slat` nodes. It validates the complete node
inventory before changing visibility. **Open bed** hides those nodes; **Tonneau cover** shows
them. Geometry, materials, node transforms, the bed floor, bed sides and tailgate remain the
same. No replacement mesh or accessory is generated.

The source file has 146,508 triangles; hiding the original cover exposes 145,816. The adapter
and file checksum are tested together. Both configurations use identical prepared paint
surfaces; [`test/imported-pickup.test.js`](../test/imported-pickup.test.js) casts 325 rays across
each of the six areas in each configuration, checking paint, orientation and intervening
glass or fittings. It also checks source bounds, the existing bed floor, unchanged geometry
references and restoration of the original cover.

### Legacy procedural projects

`truck-canopy` and `truck-service` remain in the model registry with `legacy: true` so existing
drafts and JSON projects can reopen without losing their artwork or changing geometry. Their
[`work-truck.js`](../src/mockups/work-truck.js) builder and configuration rules preserve the old
canopy, side-panel and rack states. They are excluded from catalogue cards and new livery
selection. Maintain these contracts for recovery; use imported source geometry for new assets.

### Checklist

- [ ] Licence allows use and adaptation; credit recorded (`NOTICES.md`, `creditRequired`)
- [ ] `VEHICLE_MODELS` entry: paint and glass names, rotation (front towards −x), group and label
- [ ] `VEHICLES` entry: areas on flat painted panels, length, rear-half start
- [ ] Asset/surface versions, source checksum and source-rendered preview recorded
- [ ] Source-node configuration preserves geometry; raycasts qualify the available areas
- [ ] `npm test` and `npm run test:vehicles:browser` pass; screenshots look right from every side
- [ ] Wraps checked at each coverage, with a graphic and with a pattern
- [ ] This guide's tables updated, and the vehicle list in [brand-schema.md → Vehicles](brand-schema.md#vehicles)

## How it works inside

**One model, two projections.** `vehicle-studio.js` loads the source GLB once, applies its source
component configuration and normalises the display size. **3D** uses a perspective camera;
**2D elevations** uses an orthographic camera over that same scene. Paint, wraps, original
artwork textures, decal meshes and placement coordinates remain shared. Side, opposite, front,
rear and above are camera directions, not separately drawn vehicle assets.

**Software 3D rendering.** If the browser cannot create a WebGL context,
[`model-preview.js`](../src/mockups/model-preview.js) rasterises the same Three.js scene to a
canvas on the CPU. It uses the loaded mesh vertices and transforms, a depth buffer, camera
projection, UV textures and existing `DecalGeometry`. It keeps orbit, elevations, editing and
PNG export available. Lighting is simpler, without environment reflections or shadow maps;
performance depends on geometry and output size. The prior SVG schematic implementation is
an internal legacy path and is not used by the current vehicle tab.

**Lettering** is a decal: the artwork is projected along the area's normal onto the painted meshes
(three.js `DecalGeometry`), keeping only triangles that face out of the area, so it follows curves
and never wraps onto the far side. Dragging intersects the pointer with the plane through the
lettering, keeps the offset where it was grabbed, and clamps the whole rotated rectangle inside
the area ([`clampPlacement`](../src/mockups/vehicle-layout.js)).

**A wrap** is projected the same way, once per face it covers (left, right, top, front, rear), from
a box the size of everything painted facing that way. Each triangle of the body belongs to exactly
one face (the axis its normal mostly points along), so faces meet without overlapping. The
artwork's visible window on each face ([`wrapWindow`](../src/mockups/vehicle-layout.js)) covers it
at the face's own proportions: scale and position move only that window, without rebuilding
geometry. Wraps render under the lettering.

**Colour.** The WebGL scene uses neutral tone mapping, lights on both sides, satin vinyl and
clear-coated paint. The software renderer uses simpler diffuse/specular shading. Both preserve
the same artwork textures and paint choices, but their lighting is not interchangeable colour
proofing; inspect brand artwork and production colour specifications separately.

**Saved mockups** use `brandkit-vehicle-mockup/3`. Version 1 and 2 projects migrate deterministically:
each old placement becomes an independent layer with the original artwork reference and
coordinates; version 1 gains the default empty wrap. The legacy canopy/service choices retain
their default geometry.

A layer stores a stable ID, name, target model and configuration, area, artwork, placement,
aspect, visibility and lock. `layers` is authoritative; the old `artwork` and `placements` fields
remain derived aliases for existing controls and livery compatibility. Unplaced status is computed
from the current model and the complete target surface frame. A different vehicle, missing
component or changed surface cannot silently consume the original placement.

Project snapshots carry asset and surface versions plus per-model `assetReferences` for selected
and retained vehicles. Imported GLBs also carry their checksum. Opening a file or named project
checks those references before accepting it. Replacing geometry or surface definitions therefore
requires retaining the older asset or supplying an explicit migration.

The imported pickup is pinned as `innerscene-crew-cab-tonneau/1` with surface version
`innerscene-crew-cab/1`. Its SHA-256 is recorded in the registry and source notice, and the
binary test verifies it. Preview `source.json` records identify the exact GLB used to make the
catalogue images. Renderer tests exercise actual imported meshes, depth ordering, camera
projection, texture orientation and cover visibility; a screenshot alone cannot establish
those invariants.

Drafts remain per brand in `localStorage` under `brandkit-vehicle-mockup:<brand id>`. Named
projects use IndexedDB through [`mockup-project-store.js`](../src/mockups/mockup-project-store.js).
The store namespaces records by brand and category, copies serializable project snapshots,
checks the expected revision inside a read/write transaction and reports success only after the
transaction commits. Conflicting updates and deletes are rejected. A library error leaves JSON
export available as a portable backup.

**Loading and cleanup.** The tab and renderer are lazy-loaded. Imported model bytes are cached
with a limit of three entries; loading another evicts the oldest cached entry. Model switching
disposes the replaced scene, while removed or replaced artwork textures are disposed separately.
The viewport renders on demand, with capped pixel ratio; PNG export uses a separate higher
resolution pass. This cache is bounded by entry count, not a measured memory budget.

## Limits, and what could come next

- **Generic imported vehicles.** Four source models are selectable for new designs. The pickup
  is a downloaded Innerscene asset with its original tonneau, not a qualified F-150, Tacoma or
  another manufacturer SKU. A fitted canopy, racks, make/model/year filters and manufacturer
  dimension evidence require further intake. Legacy procedural trucks remain for recovery.
- **Renderer qualification.** The software path renders real 3D geometry with reduced lighting.
  Its successful browser workflow is separate evidence from a WebGL run. Physical-device
  performance and full GPU appearance still need checks on their intended environments.
- **Broad areas.** Door regions still cover a pair of doors. A qualified vehicle can add individual
  front/rear-door, quarter-panel and other surface definitions; it needs its own fit checks.
- **Fleet composition.** Each layer is independent, but the built-in fleet layout's logo,
  supporting line and website remain one composition within that layer. Use separate layers or
  uploaded/brand artwork when the elements need independent placement.
- **One wrap definition.** Lettering has independent layers; the body wrap remains one configured
  projection with shared scale, offsets and mirroring. It is not yet a per-panel production wrap
  editor or another arbitrary artwork layer.
- **Visual approval only.** The four-view sheet contains rendered PNGs and dimensions in an SVG
  document. It is not a vector cutting template and supplies no verified bleed, measured curved
  panel development or supplier production specification.
- **Local persistence.** Named projects live in this browser. There is no account-synced project
  service; JSON is the supported portable handoff.
- **Photos and further assets.** Calibrated vehicle-photo mockups, additional actual vehicle
  models and a general asset-import UI remain future work. Cloth/photo supplier integrations are
  separate from this vehicle adapter.
- **Phone qualification.** Controls use the responsive four-task layout and numeric placement
  inputs. Desktop/mobile viewport acceptance does not substitute for interaction and performance
  checks on representative physical phones.

## Files

| File | What it is |
| --- | --- |
| [`src/app/views/Vehicles.jsx`](../src/app/views/Vehicles.jsx) | The tab: controls, brand designs, reading brand files |
| [`src/mockups/vehicle-studio.js`](../src/mockups/vehicle-studio.js) | Shared scene, perspective/orthographic cameras, decals, wraps, gestures, undo and export |
| [`src/mockups/model-preview.js`](../src/mockups/model-preview.js) | Software 3D rasterizer for the same scene when WebGL is unavailable |
| [`src/mockups/vehicle-layout.js`](../src/mockups/vehicle-layout.js) | Vehicles' areas and lengths, placement math, wrap window, mockup validation |
| [`src/mockups/vehicle-models.js`](../src/mockups/vehicle-models.js) | Imported assets, source renders, material names, credits and version/checksum pins; legacy records for recovery |
| [`src/mockups/imported-pickup.js`](../src/mockups/imported-pickup.js) | Visibility-only adapter for the 19 original tonneau nodes |
| [`src/mockups/work-truck.js`](../src/mockups/work-truck.js) | Legacy procedural pickup/service geometry retained for saved projects |
| [`src/mockups/vehicle-configuration.js`](../src/mockups/vehicle-configuration.js) | Imported open/tonneau choices and legacy configuration/surface compatibility |
| [`src/mockups/VehicleCatalog.jsx`](../src/mockups/VehicleCatalog.jsx) | Search, category, favourites and recently used catalogue controls |
| [`src/mockups/MockupProjects.jsx`](../src/mockups/MockupProjects.jsx) | Shared named-project library UI for vehicles and clothing |
| [`src/mockups/mockup-project-store.js`](../src/mockups/mockup-project-store.js) | Transactional IndexedDB snapshots with revision checks |
| [`src/mockups/vehicle-review-sheet.js`](../src/mockups/vehicle-review-sheet.js) | Four rendered views, configuration and layer dimensions in an SVG sheet |
| [`src/mockups/vehicle-artwork.js`](../src/mockups/vehicle-artwork.js) | Brand logos for vehicles, fleet layout, wrap graphics, brand patterns, backdrops |
| [`src/mockups/vehicle-livery.js`](../src/mockups/vehicle-livery.js) | Brand liveries: checks (run by `validateBrand`) and livery → mockup |
| [`src/mockups/models/`](../src/mockups/models/) | The downloaded models and `NOTICES.md` |
| [`scripts/vehicle-model.mjs`](../scripts/vehicle-model.mjs) | Inspects a GLB before adding it |
| [`scripts/render-model-previews.py`](../scripts/render-model-previews.py) | Blender source-model renders and checksum provenance for catalogue previews |
| [`test/imported-pickup.test.js`](../test/imported-pickup.test.js) | Original GLB checksum/bounds, source-node preservation, bed floor and six-surface raycast checks |
| [`test/model-preview.test.js`](../test/model-preview.test.js) | Actual-mesh software rendering, depth, projection, UVs, decals and pickup cover restoration |
| [`test/vehicle-mockups.test.js`](../test/vehicle-mockups.test.js) | Existing placement, validation, artwork, livery and legacy geometry tests |
| [`test/vehicle-configuration.test.js`](../test/vehicle-configuration.test.js) | Legacy component options, cavity geometry and retained surface contracts |
| [`test/vehicle-layers.test.js`](../test/vehicle-layers.test.js) | Layer migration, retention, independent edits, versions and recovery |
| [`test/mockup-project-store.test.js`](../test/mockup-project-store.test.js) | Metadata and failure handling; real persistence is exercised in browser acceptance |
| [`docs/vehicle-asset-intake.md`](vehicle-asset-intake.md) | Preparation and acceptance requirements for an actual vehicle asset |
| [`test/browser/vehicles.check.mjs`](../test/browser/vehicles.check.mjs) | Browser check of the imported catalogue's areas and wraps, with source and renderer evidence |
| [`test/browser/vehicle-layers.check.mjs`](../test/browser/vehicle-layers.check.mjs) | Source cover/elevation workflow, layer preservation, real project conflicts, exports and explicit legacy JSON recovery |
