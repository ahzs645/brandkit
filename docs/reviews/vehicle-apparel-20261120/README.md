# Vehicle and clothing studio: implementation review

**20 November 2026 — phase 1 pilot**

This change implements the working foundation described in the supplied vehicle/apparel review:
configurable generic pickups, independent artwork layers, recoverable placements, named projects
and a clothing pilot. It preserves the brand's original logo artwork and approved variants.

**Validation:** the full local suite passed **256 tests, 0 failures**, and the production build
passed. Build output includes nonblocking chunk-size/dynamic-import warnings. The managed Chrome
browser had WebGL disabled, so the live acceptance journey and screenshots below demonstrate the
implemented **editable flat fallback**. They do not establish full Playwright/WebGL acceptance or
physical-phone performance.

## What is implemented

| Area | Result |
| --- | --- |
| Vehicle library | Search, category filters, favourites and recently used selections for the existing generic vehicles. |
| Pickup configuration | Open bed, tonneau, cab-high, raised and commercial canopies; solid/window/hatch sides; optional rack; separate component paint. |
| Artwork | Independent layers with original brand artwork, physical dimensions, surface selection, visibility, locking, duplication, ordering and readable opposite-side copying. |
| Recovery | Removing a component retains its artwork under **Unplaced artwork**. Restoring the original compatible surface restores its placement; another surface requires explicit remapping. |
| Clothing | Generic garment previews and flat placement layouts, garment size/colour selection, independent front/back artwork and decoration-method settings. |
| Projects | Shared IndexedDB library, explicit save/update, revision conflict checks, portable JSON and draft recovery. Importing a project detaches the previous named-project binding. |
| Review | PNG export and self-contained SVG review sheets carrying configuration and artwork dimensions. The sheets contain rendered images, not production cutting paths. |

The Three.js renderer remains available when WebGL works. The new SVG fallback edits the same
canonical project, exposes real layer/configuration controls, and clearly labels its output as a
generic flat preview. It does not substitute a screenshot of an imported GLB.

## Walk through the interface

1. **Product:** choose a vehicle or garment. The library identifies the selected product and its
   generic preview status. Vehicle favourites and recent selections make alternatives easier to
   revisit.
2. **Configure:** select cover, canopy sides, rack and finish, or garment size and colour. The
   preview updates from the current configuration. Removed or changed vehicle surfaces produce
   a retained-artwork notice.
3. **Artwork:** select a layer, choose an original logo variant, set its surface and dimensions,
   then position it. Vehicles also accepts uploaded artwork. Locks protect placement edits. Use **Unplaced
   artwork** to restore an original configuration or explicitly place the layer on another
   surface.
4. **Review:** name and save the design, reopen an alternative, or export PNG/JSON/review sheets.
   **Save as new** keeps another alternative. **Update saved** checks the revision before
   replacing the selected saved copy.

Existing version 1/2 vehicle projects migrate to `brandkit-vehicle-mockup/3`: each old placement
becomes an independently editable layer. The legacy raised-canopy/service-body defaults retain
their geometry. Saved snapshots include asset/surface versions and model references; incompatible
versions are rejected before a saved design is accepted.

## Observed browser results

- **Canopy recovery:** a three-layer raised-canopy design changed to **Open bed** with two layers
  retained as unplaced. Every placement remained unchanged. Restoring **Raised canopy** restored
  the exact original layer JSON.
- **Durable project updates:** real IndexedDB accepted revision 2 and rejected an attempted
  update using stale revision 1. Importing a portable project cleared the previous named-save
  binding, preventing an imported design from silently updating that saved project.
- **Clothing dimensions:** the exported XL hoodie project contains an **80 mm** chest layer using
  the original horizontal white logo, locked, plus a **220 mm** back layer using the original
  stacked white logo.
- **Narrow layout:** the 390 px browser frame produced a 375 px document viewport. Both
  `clientWidth` and `scrollWidth` were 375 px, showing no horizontal document overflow in that
  check. These are browser viewport checks, not physical-phone testing.
- **Actual exports:** vehicle PNG is **2400 × 1500**; clothing PNG is **2320 × 1514**. The flat
  vehicle review sheet contains four distinct elevations: left, right, front and rear.

See [browser-evidence.json](browser-evidence.json) for the recorded acceptance evidence and
[local-validation.json](local-validation.json) for the automated verification summary.

## Screenshots

| Capture | What it shows |
| --- | --- |
| [Vehicle catalogue](vehicle-catalogue.jpg) | Searchable library and live flat vehicle preview |
| [Vehicle layers](vehicle-layers.jpg) | Independent artwork and configuration |
| [Open bed with retained artwork](vehicle-open-retained.jpg) | Component removal without placement loss |
| [Hoodie artwork](hoodie-artwork.jpg) | Garment preview and independent brand artwork |
| [Project revision conflict](project-revision-conflict.jpg) | A stale saved-project update rejected |
| [Vehicle at 390 px](vehicle-390px.jpg) | Narrow vehicle layout |
| [Clothing at 390 px](clothing-390px.jpg) | Narrow garment preview |
| [Clothing controls at 390 px](clothing-390px-controls.jpg) | Narrow editing controls |

## Reopen and inspect the exports

| Vehicle files | Clothing files |
| --- | --- |
| [vehicle-project.json](vehicle-project.json) | [hoodie-project.json](hoodie-project.json) |
| [vehicle-open-retained.json](vehicle-open-retained.json) | [hoodie-layout.png](hoodie-layout.png) |
| [vehicle-layout.png](vehicle-layout.png) | [hoodie-review.svg](hoodie-review.svg) |
| [vehicle-review.svg](vehicle-review.svg) | |

JSON files reopen in the corresponding studio. Review sheets and PNGs are approval aids; preserve
the JSON when further editing is needed.

## Implementation map

- Vehicles: [`Vehicles.jsx`](../../../src/app/views/Vehicles.jsx),
  [`vehicle-studio.js`](../../../src/mockups/vehicle-studio.js),
  [`vehicle-flat-studio.js`](../../../src/mockups/vehicle-flat-studio.js),
  [`vehicle-layout.js`](../../../src/mockups/vehicle-layout.js),
  [`vehicle-configuration.js`](../../../src/mockups/vehicle-configuration.js) and
  [`work-truck.js`](../../../src/mockups/work-truck.js).
- Clothing: [`Clothing.jsx`](../../../src/app/views/Clothing.jsx),
  [`apparel-layout.js`](../../../src/mockups/apparel-layout.js),
  [`apparel-studio.js`](../../../src/mockups/apparel-studio.js) and
  [`apparel-flat.js`](../../../src/mockups/apparel-flat.js).
- Shared projects: [`MockupProjects.jsx`](../../../src/mockups/MockupProjects.jsx) and
  [`mockup-project-store.js`](../../../src/mockups/mockup-project-store.js), with unreadable-draft
  protection in [`mockup-draft.js`](../../../src/mockups/mockup-draft.js).

## Remaining qualification

No actual F-150 or Tacoma model, SKU-matched garment, supplier production template or embroidery
machine file is included. Actual models and compatible accessories need the preparation and
evidence in the [vehicle asset intake guide](../../vehicle-asset-intake.md). WebGL rendering,
its complete automated browser suite, GPU performance and representative physical phones still
need qualification in an environment supporting them. See the [vehicle guide](../../vehicles.md)
for the implemented format and remaining limits.
