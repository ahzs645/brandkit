# Qualifying the first model-matched vehicle

The vehicle and apparel expansion adds independent vehicle artwork layers, retained unplaced
artwork, a searchable catalogue and configurable **generic** pickups. It does not include an
acquired Ford, Toyota or other manufacturer's matched truck. All five catalogue entries remain
labelled generic. The next actual-model pilot should pass the process below before its label
changes to “model matched.”

This guide describes the implementation in this repository. There is no end-user “import any
GLB” button, automatic canopy fitting or general external model manifest loader. Adding a
qualified vehicle still means supplying its asset and registering it in the two existing tables.

## 1. Pick one exact configuration

Record the make, model, body generation, supported years, cab, bed length and wheelbase before
choosing an asset. A crew-cab short-bed model is not interchangeable with a regular-cab long-bed
model. Keep a separate asset/variant identifier whenever the actual body changes.

The catalogue's current `length` is a display normalization. It rescales an imported model to
that length; it does **not** verify its wheelbase, width, door geometry or bed dimensions. Do not
stretch an entire vehicle to produce another bed length.

An intake record should accompany the model in the PR:

| Evidence | Record |
| --- | --- |
| Identity | Make, model, generation, years, cab, bed and wheelbase variant |
| Source | Original asset listing, creator, source file name and retrieval date |
| Asset | Prepared GLB path, SHA-256, processing recipe and asset version |
| Dimensions | Overall length/width/height and wheelbase, their units and source references |
| Matching | Reference photographs supporting the body and trim being represented |
| Surfaces | Named panel IDs, coordinate frames, version and excluded windows/hardware |
| Accessories | Exact supported vehicle IDs, mounting transforms and accessory asset versions |
| Review | Screenshots, test results, remaining uncertainties and reviewer |

Retain the source/credit record alongside the model, following the existing
[`models/NOTICES.md`](../src/mockups/models/NOTICES.md). The first pilot can use a source already
available to the project; this expansion does not require a marketplace purchase.

## 2. Inspect the source before changing the application

```bash
node scripts/vehicle-model.mjs path/to/candidate.glb
```

The dependency-free inspector prints the checksum, material names, mesh/triangle counts and
accessor bounds. Its size estimate does **not** apply scene-node transforms, so it cannot establish
the final physical dimensions. Inspect the transformed scene in the renderer or a modelling tool.

Check these properties in the actual asset:

- Painted exterior panels use separate materials and meshes from glazing, rubber, lights and trim.
- Each painted mesh has a single material. The current loader rejects multi-material paint meshes.
- The exterior is usable without invisible interiors consuming most of the rendering budget.
- Left and right geometry have suitable outward normals and can carry independent readable artwork.
- Recolouring retains useful normal, roughness and bump detail. Avoid baking a manufacturer's paint
  colour or branding into a texture that the application must discard.
- The model is self-contained. The current loader parses GLB bytes with an empty resource base path;
  unbundled external textures are not a supported intake result.

The current `GLTFLoader` setup does not register Draco, Meshopt or KTX2 decoders. Supply an asset
that works with that setup, or add and test the required decoder as part of the asset PR. The
official [GLTFLoader API](https://threejs.org/docs/pages/GLTFLoader.html) describes those explicit
registration methods. An optimized asset that silently depends on an unconfigured decoder is not
ready for the catalogue.

## 3. Prepare coordinates and material roles

The studio's coordinate convention is:

| Axis or origin | Meaning |
| --- | --- |
| `-x` | Vehicle front |
| `+z` | Left side |
| `+y` | Up |
| `y = 0` | Ground under the tyres |
| Centred `x`, `z` | Camera and placement reference |
| Metres | All stored vehicle artwork dimensions |

An imported GLB is rotated, uniformly scaled to `length`, centred and grounded by
[`vehicle-studio.js`](../src/mockups/vehicle-studio.js). Procedural geometry is already prepared
in those coordinates and is not rescaled.

For a separate canopy, define an attachment transform against measured bed-rail landmarks. Do
not reuse the generic pickup's transform merely because the nominal bed lengths sound similar.
The pilot should first support one explicit compatible truck/canopy pair.

The generic builder now supplies named `cab`, `bed`, `canopy`, `service`, `rack` and `chassis`
groups. Its painted meshes keep the paint material name used for decal selection and carry
`userData.paintRole = 'body' | 'canopy'`. This is how the studio applies independent canopy or
service-body paint. A prepared imported component must supply equivalent roles, or the adapter
must assign them before material replacement.

## 4. Register the model and surfaces

The runtime model registry is `VEHICLE_MODELS` in
[`vehicle-models.js`](../src/mockups/vehicle-models.js). The corresponding geometry/layout registry
is `VEHICLES` in [`vehicle-layout.js`](../src/mockups/vehicle-layout.js).

| Registry field | Required purpose |
| --- | --- |
| `url` | Bundled `new URL('./models/file.glb', import.meta.url).href` |
| `paint`, optional `glass` | Material names inspected in that exact asset |
| `rotation` | Orientation adjustment about the vertical axis |
| `group`, `label`, `note`, `category` | Catalogue description of the actual variant |
| `cab` | Cab configuration when applicable |
| `fidelity` | `generic` until the matching evidence has been reviewed |
| `assetVersion`, `surfaceVersion` | Version identifiers for geometry and placement definitions |
| `sha256` | Checksum of the committed GLB |
| `title`, `creator`, `source`, `licence`, `licenceUrl`, `creditRequired` | Existing source and credit fields |
| Layout `length` | Verified display length in metres |
| Layout `rearHalf` | Where rear-half wrapping begins, in the normalized coordinates |
| Layout `areas` | Stable surface IDs and their placement frames |

Each area has a readable `label`, outward `normal`, readable horizontal `uAxis`, upward `vAxis`,
`origin`, `width` and `height`. The axes must form an orthonormal frame. Right-side artwork uses
the opposite horizontal axis so lettering remains readable after copying.

Keep a panel's ID stable when its physical meaning stays the same. Change its surface version
when its placement frame or permitted dimensions change. The new layer recovery logic compares
the complete surface definition before automatically restoring a placement. A different canopy
surface requires an explicit placement/remapping decision instead of silently shrinking a design.
Saved project snapshots include `assetReferences` for the selected vehicle and vehicles retained
in unplaced layers. The studio checks their asset version, surface version and GLB checksum when
opening them, including through the named-project library. Keep the older asset available or
supply an explicit migration when a replacement would otherwise reject an existing project.

The generic component resolver is
[`vehicle-configuration.js`](../src/mockups/vehicle-configuration.js). It currently supports only
`truck-canopy` and `truck-service`. Do not flag a new manufacturer vehicle `configurable: true`
without also implementing its compatible component geometry and surface resolver. The generic
canopy is not an automatically fitting accessory for imported pickups.

## 5. Qualify each advertised branding area

Check the centre, corners and representative interior points of every permitted rectangle against
the actual painted geometry. The generic truck tests provide a working raycast pattern in
[`vehicle-configuration.test.js`](../test/vehicle-configuration.test.js).

For each side and configuration, verify that:

- A ray finds paint at the expected depth and outward orientation.
- Glazing, seams, handles, lamps and arches do not obscure permitted artwork.
- Different artwork remains independent on the two doors, canopy sides and rear.
- Opposite-side copying leaves text readable.
- Removing a component retains its layers as unplaced; restoring the same component recovers
  their original dimensions and positions.
- A windowed or hatch configuration changes both the visible geometry and the permitted region.
- Full-body and rear-half wraps leave glazing and trim clear.

Projected decals can distort across corners; Three.js calls this out in the
[DecalGeometry documentation](https://threejs.org/docs/pages/DecalGeometry.html). Split a broad
area into prepared panels where needed. A nonzero projected-mesh count is only a loading smoke
check; it does not prove visual fit or a production-safe cutting template.

## 6. Record performance and review images

The generic models in this expansion range from approximately 30,000 to 46,000 triangles in the
tested raised-solid, open, tonneau, cab-high-solid and commercial-hatches/rack examples, before
wraps and lettering. Those scene counts are context, not an FPS benchmark or a universal limit.

Measure the proposed asset in the complete app: initial load, model switch, configuration change,
artwork editing, repeated switching and PNG export. Include a representative mobile viewport and
an actual phone when available. Preserve demand rendering and the bounded model cache. Report
hardware/browser, viewport, texture sizes and the exact tested configuration with any frame-rate
claim.

Capture perspective, left, right, front, rear and roof views with the same artwork and camera
settings used for verification. A catalogue thumbnail should come from the committed geometry.
Record any uncertain dimensions directly beside the review image or in its configuration notes.

## 7. Acceptance commands and outcome

```bash
node --test test/vehicle-mockups.test.js test/vehicle-configuration.test.js
npm run build
CHROMIUM_PATH=/usr/bin/chromium npm run test:vehicles:browser
```

Run the new layer and project acceptance checks included with the expansion as well. Add a
focused browser case for the new vehicle ID rather than assuming the generic pickup establishes
its compatibility. Check the final source revision, saved-project round trip and export result.

A successful intake results in one named, evidenced vehicle variant with prepared surfaces and
one explicitly supported accessory configuration. It remains a visual approval aid until a
separate measured supplier template has qualified production dimensions.
