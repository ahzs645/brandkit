# Vehicles

The **Vehicles** tab shows a brand on a vehicle in 3D: a wrap over the body, a logo or fleet
lettering on top, both placed directly on the vehicle and exported as an image. This guide covers
what it can do, how its parts fit together, how a brand carries its own vehicle designs, and how
to add more vehicles.

- [What it can do](#what-it-can-do)
- [How it fits together](#how-it-fits-together)
- [Using the tab](#using-the-tab)
- [Giving a brand its own vehicle designs](#giving-a-brand-its-own-vehicle-designs)
- [Adding a vehicle to brandkit](#adding-a-vehicle-to-brandkit)
- [How it works inside](#how-it-works-inside)
- [Limits, and what could come next](#limits-and-what-could-come-next)
- [Files](#files)

## What it can do

| | |
| --- | --- |
| **Vehicles** | A work truck with a high canopy on the bed, the same truck with a utility service body and ladder rack (both drawn in code for brandkit), a four-door hatchback, a lightweight SUV and a compact SUV (downloaded models; their licences are in [`src/mockups/models/NOTICES.md`](../src/mockups/models/NOTICES.md)). |
| **Wrap** | Covers the painted body: **Sides** (both, front to back), **Rear half** (on a truck, its canopy or service body), or **Full body** (sides, hood and roof, front and rear). Its artwork is a graphic drawn in two of the brand's colours (sweep, chevrons, stripes, two-tone), one of the brand's own patterns, the brand's own artwork file, or an upload. Scale it up to 4×, move it across and up within the panels, and choose whether the right side mirrors it. |
| **Logo and lettering** | On top of the wrap: any of the brand's logos in any colour it is drawn in, a fleet layout (logo, a supporting line, a rule and the website, set in the brand's own type), the brand's own lettering file, an upload, or none. Placed on a prepared area: doors, canopy or body side, hood, rear. Drag to move, a corner to resize, the round handle to rotate (Shift: 15° steps), arrow keys to nudge; or type the numbers. Copy to the other side keeps lettering reading front to back. |
| **Brand designs** | A brand can define its own vehicle designs (**liveries**) in `brand.json`. The tab lists them, opens on the first, and applies one in a click. Apex Site Services' service trucks are the worked example. |
| **Scene** | Studio, dark, brand-tinted and outdoor backdrops. Lighting calibrated so the brand's colours read true from either side. |
| **Keeping work** | Undo and redo (30 steps), a draft kept in the browser for each brand, **Save mockup** and **Open…** as a JSON file, and **Export PNG** at 2400 × 1500 without the editing guides. |
| **Safety** | Artwork is projected only onto painted panels: glass, lights, trim and tyres stay clear. Uploaded SVGs and a brand's own files are refused if they contain scripts, event handlers or links to anything outside themselves. |

It is a **visual mockup**: dimensions are in metres on the vehicle as shown, good for judging
proportion and placement, but it is not a template for cutting vinyl and the vehicles are not any
manufacturer's exact body.

## How it fits together

Three things, kept separate on purpose:

```
 brandkit (this repository)          a brand (brand.json + its files)        a mockup (what someone makes)
 ─────────────────────────           ─────────────────────────────────       ──────────────────────────────
 the vehicles: geometry,             vehicles.liveries: which vehicle,       the draft in the browser,
 paint material, prepared areas      paint, wrap, lettering, placements      a saved .json, an exported .png
 the editor: projection, wraps,      artwork files the liveries use          (made from a livery, or from
 gestures, backdrops, export         (e.g. artwork/vehicle/*.svg)            scratch, or both)
 the generators: fleet layout,       its logos, colours, faces, patterns
 wrap graphics, brand patterns       (which the generators draw from)
```

- **brandkit owns the vehicles.** A truck, a van or a car is added once, here, and every brand
  can use it. Brands never ship 3D models.
- **A brand owns its designs.** A livery is data in the brand's `brand.json`, and any artwork it
  needs is a file in the brand's folder, so the design travels with the brand pack, is versioned
  with the brand, and can be generated from the brand's own sources (as Apex's is).
- **A mockup is what someone makes** from the two. It names the brand's files by path but never
  copies them, and may only name files the brand's liveries use.

So a new vehicle in brandkit is immediately available to every brand, and a new livery in a brand
needs no change to brandkit.

## Using the tab

1. Open a brand and choose **Vehicles**. A new mockup starts from the brand's first livery, or,
   for a brand without one, the canopy truck with fleet lettering.
2. **Brand designs** (if the brand has any) applies a livery. Anything changed afterwards adapts it;
   **Undo** goes back.
3. **Vehicle**: the vehicle and its paint (neutral whites and greys first, then the brand's colours,
   or any colour).
4. **Wrap**: the coverage, then the artwork. A graphic takes a main and a second colour. **Scale**,
   **Across** and **Up** move the artwork within the panels; it always covers them and is never
   stretched.
5. **Logo and lettering**: what to place, then **Where**. On the stage, **Edit artwork** drags the
   lettering; **Rotate** turns the vehicle instead. The camera buttons jump to set views.
6. **Scene**: the backdrop.
7. **Save mockup** keeps a file to open later (with **Open…**); **Export PNG** makes the image,
   from the current camera, without the selection box or the highlighted area. The exported image
   of the hatchback carries its creator's credit, as its licence requires.

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
| Canopy truck (6.77 m) | `left`, `right` doors 2.0 × 0.72 · `left-body`, `right-body` canopy 2.4 × 1.0 · `hood` 1.6 × 1.0 · `rear` 1.7 × 1.45 |
| Service-body truck (6.83 m) | doors as above · `left-body`, `right-body` service body 2.4 × 1.15 · `hood` 1.6 × 1.0 · `rear` 1.7 × 1.15 |

## Adding a vehicle to brandkit

A vehicle is added once, in this repository, and every brand gets it. There are two ways.

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
   | `group`, `label`, `note` | How the vehicle list shows it (`group` heads a section: Cars, Work trucks, Vans…). |
   | `title`, `creator`, `licence`, `licenceUrl`, `source` | The credit shown under the stage. |
   | `creditRequired` | `true` for CC BY: exported images then carry the credit. |
   | `sha256` | From the inspector. A test checks the file still matches, and saved mockups record it. |

4. **Give it areas** in `VEHICLES` in [`vehicle-layout.js`](../src/mockups/vehicle-layout.js):
   `areas` (start from the car `AREAS` for a car, or `truckAreas` for a pickup), `length` (the
   length it is shown at, in metres: the model is scaled to it, so the areas are in real metres),
   and `rearHalf` (the x where a rear-half wrap starts; 0 is the middle, front is negative).
   Add the id to nothing else: `MODEL_IDS` and the vehicle list are read from these two tables.
5. **Tune the areas in the app.** `npm run dev`, choose the vehicle, and select each area: the
   tinted rectangle shows where it is. Move `origin` (its centre) and change `width` and `height`
   until each sits on flat painted panel, clear of windows, handles and arches.
6. **Check it:**

   ```bash
   npm test
   npm run build && npm run test:vehicles:browser
   ```

   `npm test` checks every area's frame and the model's checksum. The browser check loads every
   vehicle, places lettering on each of its areas and fails if any finds no painted body, applies
   each wrap coverage and fails if any projects nothing, and saves a screenshot of each vehicle
   wrapped in full to `.documentation/vehicles-browser/`. `VEHICLES=<id>` checks just one; where
   Playwright's own browser is not installed, `CHROMIUM_PATH` names another Chromium.
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
- Put windows a few millimetres outside the body, so the body behind them stays one surface.
- Export a `build…` function and give the vehicle a `build: { … }` entry in `VEHICLE_MODELS`
  (instead of `url`) and its areas and length in `VEHICLES`. The `back: 'canopy' | 'service'`
  option shows how one drawing can have variants.
- The Node test for the truck casts rays at each area's centre and corners and fails if one hits
  glass or misses paint; copy it for a new drawn vehicle.

Good next candidates: a cargo van (one long flat side), a box truck (cab and a box body), a
trailer, a crew-cab pickup without a canopy (the canopy truck with `back: 'bed'`).

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

**Saved mockups** are JSON (`brandkit-vehicle-mockup/2`; files from version 1 still open). Every
value is checked before use; uploads are embedded as data URLs (5 MB each at most); brand files are
named by path and must be ones the open brand's liveries use. Drafts are kept per brand in the
browser (`localStorage`, key `brandkit-vehicle-mockup:<brand id>`).

**Loading.** The tab, Three.js and the editor are a separate chunk loaded only when Vehicles opens;
models are fetched on first use and kept for the session.

## Limits, and what could come next

- **Areas are broad.** "Left doors" or "Left canopy", not a single door or panel. Per-panel areas
  (front door, rear door, quarter panel) would be more entries in `VEHICLES` for each vehicle;
  the editor already handles any number.
- **One lettering artwork per mockup.** The same lettering goes in every area it is placed in.
  Layers (a door block, a rear-door number, a tailgate web address, each its own artwork and
  placement) would be the next step, and liveries would list them.
- **Lettering moves as one piece.** The fleet layout's logo, line and website cannot be moved
  separately yet.
- **Not a production template.** No bleed, panel gaps or exact body dimensions; for a print-ready
  wrap a sign shop's template of the real vehicle is still needed. A useful addition would be
  exporting the wrap artwork per face, flat, at its size in metres, as a starting point.
- **Photographs.** A second mode could take a photo of the real vehicle, let you outline a panel
  and set its perspective corners, and place the design inside it.
- **Mobile.** Works on a phone's layout; dragging handles by touch is untested on devices.

## Files

| File | What it is |
| --- | --- |
| [`src/app/views/Vehicles.jsx`](../src/app/views/Vehicles.jsx) | The tab: controls, brand designs, reading brand files |
| [`src/mockups/vehicle-studio.js`](../src/mockups/vehicle-studio.js) | The 3D editor: scene, projection, wraps, gestures, undo, export |
| [`src/mockups/vehicle-layout.js`](../src/mockups/vehicle-layout.js) | Vehicles' areas and lengths, placement math, wrap window, mockup validation |
| [`src/mockups/vehicle-models.js`](../src/mockups/vehicle-models.js) | The vehicle list: files or drawings, paint material, credit |
| [`src/mockups/work-truck.js`](../src/mockups/work-truck.js) | The work truck, drawn in code |
| [`src/mockups/vehicle-artwork.js`](../src/mockups/vehicle-artwork.js) | Brand logos for vehicles, fleet layout, wrap graphics, brand patterns, backdrops |
| [`src/mockups/vehicle-livery.js`](../src/mockups/vehicle-livery.js) | Brand liveries: checks (run by `validateBrand`) and livery → mockup |
| [`src/mockups/models/`](../src/mockups/models/) | The downloaded models and `NOTICES.md` |
| [`scripts/vehicle-model.mjs`](../scripts/vehicle-model.mjs) | Inspects a GLB before adding it |
| [`test/vehicle-mockups.test.js`](../test/vehicle-mockups.test.js) | Node tests: placement, validation, artwork, liveries, the truck's areas |
| [`test/browser/vehicles.check.mjs`](../test/browser/vehicles.check.mjs) | Browser check of every vehicle's areas and wraps |
