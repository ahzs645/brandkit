# Vehicles

The **Vehicles** tab combines a searchable vehicle library, configurable generic pickup
components, independent artwork layers and saved projects. A wrap covers the painted body;
separate logos, contact details and other artwork can sit on different surfaces. Export the
current view as a PNG or create a four-view review sheet with the configuration and layer sizes.

All current vehicles are **generic previews**. This expansion does not import a model-matched
Ford, Toyota or other manufacturer's truck. The [asset intake guide](vehicle-asset-intake.md)
describes how the first actual vehicle and compatible canopy should be prepared and verified.

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
| **Vehicle library** | Search, category filters, favourites and recently used entries for the five existing vehicles: a generic pickup, service truck, hatchback and two SUVs. The selected model and configuration remain above the preview. |
| **Pickup configuration** | Open bed, tonneau, cab-high canopy, raised canopy or commercial canopy. Canopies have solid sides, windows or access hatches. A ladder rack is independently selectable, including on the service truck. |
| **Paint** | Body colour plus a separate canopy/component finish, or a finish matched to the body. Neutral and brand swatches are available. |
| **Artwork layers** | Up to 32 independently named layers, each with its own artwork, surface, dimensions, rotation, visibility and lock. Add, duplicate, reorder, remove, centre, fit, and copy to the other side without reversing lettering. |
| **Artwork recovery** | Layers retain their original model, component configuration and placement. Removing a canopy or changing a surface moves affected layers into **Unplaced artwork**. Restoring the same surface restores them; explicit remapping places them on a different surface. |
| **Wrap** | **Sides**, **Rear half** or **Full body** coverage, using brand graphics, patterns, brand files or uploads. Scale, offsets and mirroring remain separate from the independent lettering layers. |
| **Brand designs** | Existing `brand.vehicles.liveries` definitions still open. Their shared lettering is migrated into independently editable layers, one for each saved placement. |
| **Scene and interaction** | Studio, dark, brand and outdoor backdrops; perspective, side, front, rear and above cameras. Drag artwork, resize or rotate with handles, use arrow keys to nudge, or enter position values. Switch to **Rotate** to orbit the vehicle. |
| **Saved projects** | Named projects in the browser, explicit **Save as new** and **Update saved**, revision checks against stale updates, undo/redo, per-brand draft recovery, and portable JSON import/export. |
| **Review exports** | A 2400 × 1500 PNG without editor guides, or a self-contained SVG sheet containing perspective, left, right and rear PNG views plus layer dimensions. Required model credit remains in exported renders. |
| **Artwork handling** | SVG, PNG, JPEG and WebP uploads. SVGs are checked for scripts, event handlers and external references before image loading. Brand files must be declared by the open brand. |

Dimensions describe the generic vehicle as displayed. They help judge proportion and placement;
they do not establish a production template for cutting vinyl. Windows and hatch hardware also
reduce the available artwork regions. The configuration resolver supplies those different bounds.

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

1. **Product:** search the vehicle library, choose a body, or start from one of the brand's
   existing liveries. New drafts use the first livery where available, otherwise the raised
   canopy truck with fleet lettering. Favourites and recently used vehicles help find it again.
2. **Configure:** choose the pickup cover, canopy sides, rack and finish. Set the overall body
   paint and any wrap. The stage heading identifies the selected configuration. If a component
   change makes a layer unavailable, the retained-artwork notice links to **Artwork**.
3. **Artwork:** choose a layer or select **Add layer**. Set its source, name, visibility and lock;
   choose its surface and adjust the placement. A layer can use a brand logo, the fleet layout,
   a declared brand file, an upload or no lettering. **Duplicate** creates another independent
   layer. **Move up/down** changes overlap order. Copying to the other side creates readable,
   independently editable artwork there.
4. **Unplaced artwork:** restore the original vehicle/configuration to recover an existing layer
   at its original placement, or choose **New surface → Place on selected surface** to remap it.
   A changed canopy side is reviewed explicitly rather than silently squeezing an old design
   into a smaller rectangle. Locked layers cannot be repositioned until unlocked.
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

### The Apex example

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
| Hatchback, SUVs (shown 4.7 m long) | `left`, `right` 2.8 × 0.70 (the doors' lower half) · `hood` 1.38 × 0.72 · `rear` 1.4 × 0.60 |
| Raised solid canopy, legacy configuration (6.77 m) | `left`, `right` doors 2.0 × 0.72 · `left-body`, `right-body` canopy 2.4 × 1.0 · `hood` 1.6 × 1.0 · `rear` 1.7 × 1.45 |
| Service-body truck (6.83 m) | doors as above · `left-body`, `right-body` service body 2.4 × 1.15 · `hood` 1.6 × 1.0 · `rear` 1.7 × 1.15 |

Those are the legacy/default frames. Configured pickups also offer `left-bed`, `right-bed`,
`canopy-rear` and, without a rack, `canopy-roof`. Open and tonneau beds omit all canopy surfaces.
The tailgate and canopy-side bounds change for other cover/side configurations. Always obtain the
current areas through `areasFor(model, configuration)`; do not reuse the legacy dimensions for a
windowed canopy. See [`vehicle-configuration.js`](../src/mockups/vehicle-configuration.js) for the
actual origins, dimensions and permitted combinations.

## Adding a vehicle to brandkit

A vehicle is added once, in this repository, and every brand gets it. There are two ways.
For a named actual vehicle, follow the [asset intake guide](vehicle-asset-intake.md) as well as the
registration steps here. A detailed mesh alone does not establish an exact body variant or
accessory fitment.

| | A downloaded model (GLB) | A vehicle drawn in code |
| --- | --- | --- |
| Good for | A realistic car, van or truck that exists under a usable licence | Simple bodies with big flat panels: box trucks, service bodies, trailers, vans |
| Looks | As detailed as the model | Clean and simplified |
| Panels | Whatever the model's author made | Exactly the surfaces wraps and lettering need |
| Licence | The model's (must allow use and adaptation; credit if it asks) | None of its own |
| Size | Megabytes per model, loaded on demand | A few kilobytes of code |
| Example | `shc`, `suv`, `compact` | `truck-canopy`, `truck-service` ([`work-truck.js`](../src/mockups/work-truck.js)) |

### Licences for downloaded models

Only use a model whose licence allows use, adaptation and redistribution in a private tool:
**CC0** (no conditions) or **CC BY 4.0** (credit the author). Avoid "editorial", "non-commercial"
(CC BY-NC), "no derivatives" (CC BY-ND) and store licences that forbid redistribution, and check
that the model is not a manufacturer's trademarked design sold as a likeness. Sources that worked:
Innerscene's library (CC0) and Sketchfab's downloadable CC-licensed models. Record the creator,
source, licence and download address in [`src/mockups/models/NOTICES.md`](../src/mockups/models/NOTICES.md).

### A downloaded model, step by step

1. **Get a GLB** (binary glTF). A `.gltf` with separate files can be packed into one GLB with
   gltf-transform (`gltf-transform copy model.gltf model.glb`) without changing its geometry.
   Keep it small: under 5 MB loads comfortably.
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
   body, update its catalogue classification and component resolver too. The generic pickup
   configuration resolver does not automatically fit accessories to an arbitrary GLB.
5. **Tune the areas in the app.** `npm run dev`, choose the vehicle, and select each area: the
   tinted rectangle shows where it is. Move `origin` (its centre) and change `width` and `height`
   until each sits on flat painted panel, clear of windows, handles and arches.
6. **Check it:**

   ```bash
   npm test
   npm run build && npm run test:vehicles:browser
   ```

   `npm test` checks area frames, model checksums, configuration geometry, layer migration and
   retained-placement behavior. The vehicle browser check loads models, places lettering,
   exercises wrap coverage and captures renders in `.documentation/vehicles-browser/`.
   `VEHICLES=<id>` limits it to selected models; where Playwright's browser is not installed,
   `CHROMIUM_PATH` can name a compatible installed Chromium. Add acceptance cases for the new
   vehicle/configuration, including surface fit, save/reload and exported appearance. A nonzero
   decal count by itself is not sufficient visual qualification.
7. **Record the licence** in `NOTICES.md`, and add the vehicle to the table at the top of this
   guide.

### A vehicle drawn in code

[`work-truck.js`](../src/mockups/work-truck.js) is the pattern. A body is a few **side profiles**
(THREE.Shape: the outline seen from the side, with arcs for the wheel arches) **extruded across
the width** with rounded edges, which gives flat, clean side panels; details (windows, seams,
handles, lamps, bumpers, mirrors, wheels, flares, a ladder rack) are small meshes added on top.

- Work in metres, front towards −x, left side towards +z, wheels on y = 0, centred on x and z:
  a drawn vehicle is shown exactly as built (it is not rescaled), so its areas are in its own
  coordinates.
- Name materials as the editor expects: the painted body `paint`, glass `glass`; anything else
  (trim, chrome, tyres, lamps) is left as it is and stays clear of artwork.
- Keep glazing and its frame out of the permitted print region. New windowed canopy variants
  have holes in their side-panel geometry and narrower branding areas below the windows.
- Export a `build…` function and give the vehicle a `build: { … }` entry in `VEHICLE_MODELS`
  (instead of `url`) and its areas and length in `VEHICLES`. The `back: 'canopy' | 'service'`
  option selects the structural pickup/service-body variant. Pickup covers are configured
  separately; do not invent another `back` value.
- The Node test for the truck casts rays at each area's centre and corners and fails if one hits
  glass or misses paint; copy it for a new drawn vehicle.

The generic pickup's supported builder contract is:

```js
buildWorkTruck({
  back: 'canopy',
  configuration: {
    cover: 'open', // open | tonneau | cab-high | raised | commercial
    sides: 'solid', // solid | windows | hatches; normalized to solid without a canopy
    rack: false,
    canopyPaint: null // null follows body paint, otherwise a six-digit hex colour
  }
})
```

`back: 'service'` selects the service body and defaults to its legacy ladder rack. Unknown `back`
values throw. Named component groups and `userData.paintRole` let the studio colour the canopy
or service body independently from the cab. The current generic geometry has no manufacturer
fitment claim.

Further geometry candidates include a cargo van, box truck and enclosed trailer. A model-matched
pickup needs the asset and dimensional evidence described in the intake guide.

### Checklist

- [ ] Licence allows use and adaptation; credit recorded (`NOTICES.md`, `creditRequired`)
- [ ] `VEHICLE_MODELS` entry: paint and glass names, rotation (front towards −x), group and label
- [ ] `VEHICLES` entry: areas on flat painted panels, length, rear-half start
- [ ] `npm test` and `npm run test:vehicles:browser` pass; screenshots look right from every side
- [ ] Wraps checked at each coverage, with a graphic and with a pattern
- [ ] This guide's tables updated, and the vehicle list in [brand-schema.md → Vehicles](brand-schema.md#vehicles)

## How it works inside

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

**Colour.** Rendering uses neutral tone mapping (filmic tone mapping shifts saturated brand colours),
lights mirrored on both sides, an environment turned so neither side is favoured, satin vinyl
without a clear coat, and clear-coated paint. Measured on a side panel, Apex red `#D9021C`
(217, 2, 28) renders as 210–216 on either side (it was 248, 92, 96 before calibration), and a
white body at about 235.

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

- **Generic vehicles.** The current five entries are generic. Actual-model pickups, compatible
  branded canopies, make/model/year filters and manufacturer dimension evidence require a
  separate asset intake. No marketplace vehicle has been acquired by this expansion.
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
| [`src/mockups/vehicle-studio.js`](../src/mockups/vehicle-studio.js) | The 3D editor: scene, projection, wraps, gestures, undo, export |
| [`src/mockups/vehicle-layout.js`](../src/mockups/vehicle-layout.js) | Vehicles' areas and lengths, placement math, wrap window, mockup validation |
| [`src/mockups/vehicle-models.js`](../src/mockups/vehicle-models.js) | The vehicle list: files or drawings, paint material, credit |
| [`src/mockups/work-truck.js`](../src/mockups/work-truck.js) | Generic pickup/service geometry with named components |
| [`src/mockups/vehicle-configuration.js`](../src/mockups/vehicle-configuration.js) | Cover/side/rack validation and configuration-dependent printable surfaces |
| [`src/mockups/VehicleCatalog.jsx`](../src/mockups/VehicleCatalog.jsx) | Search, category, favourites and recently used catalogue controls |
| [`src/mockups/MockupProjects.jsx`](../src/mockups/MockupProjects.jsx) | Shared named-project library UI for vehicles and clothing |
| [`src/mockups/mockup-project-store.js`](../src/mockups/mockup-project-store.js) | Transactional IndexedDB snapshots with revision checks |
| [`src/mockups/vehicle-review-sheet.js`](../src/mockups/vehicle-review-sheet.js) | Four rendered views, configuration and layer dimensions in an SVG sheet |
| [`src/mockups/vehicle-artwork.js`](../src/mockups/vehicle-artwork.js) | Brand logos for vehicles, fleet layout, wrap graphics, brand patterns, backdrops |
| [`src/mockups/vehicle-livery.js`](../src/mockups/vehicle-livery.js) | Brand liveries: checks (run by `validateBrand`) and livery → mockup |
| [`src/mockups/models/`](../src/mockups/models/) | The downloaded models and `NOTICES.md` |
| [`scripts/vehicle-model.mjs`](../scripts/vehicle-model.mjs) | Inspects a GLB before adding it |
| [`test/vehicle-mockups.test.js`](../test/vehicle-mockups.test.js) | Existing placement, validation, artwork, livery and legacy geometry tests |
| [`test/vehicle-configuration.test.js`](../test/vehicle-configuration.test.js) | Component options, cavity geometry and raycasts for permitted artwork areas |
| [`test/vehicle-layers.test.js`](../test/vehicle-layers.test.js) | Layer migration, retention, independent edits, versions and recovery |
| [`test/mockup-project-store.test.js`](../test/mockup-project-store.test.js) | Metadata and failure handling; real persistence is exercised in browser acceptance |
| [`docs/vehicle-asset-intake.md`](vehicle-asset-intake.md) | Preparation and acceptance requirements for an actual vehicle asset |
| [`test/browser/vehicles.check.mjs`](../test/browser/vehicles.check.mjs) | Browser check of every vehicle's areas and wraps |
