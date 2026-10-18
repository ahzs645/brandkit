# ManualKit UPDATED — All 59 updated views · SVG-only edition

**Revision:** 18 October 2026. **Contents:** 59 genuinely revised views.

This is the new source-based geometry release. It is NOT the earlier draft
repackaged, and it is NOT only an error report. Every blank SVG in this package
has a different geometry fingerprint from the audited draft; see verification.json.

## Open and edit

Extract this ordinary ZIP into its own folder and open **index.html** in a browser.
It works offline without a web server. Each book/part is independent; no archive
parts need to be joined. Open assets/<asset-id>/blank.svg in a vector editor to
edit the actual drawing. Every exported blank is vector geometry with named
parts and material attributes, with no embedded raster images.

The **branding** SVG group is reserved for replacement identity. The separate
branding-zones.svg export shows placement guides; revision.json records each
zone's bounds and quadrilateral. The guides are not part of the blank object.
Where supplied, with-markings.svg restores optional reflector/process markings;
applied-markings.svg supplies only those markings. No historical logo or type
is certified or flattened into the new blank geometry.

These are stand-alone SVG assets, not a patch that overwrites the ManualKit app.
The old application scene JSON has not been copied: doing so would reintroduce
its old geometry. Import the new SVGs into your preferred editor/application.

## Evidence

This compact package omits raster evidence. The independent General, Vehicles A, Vehicles B and Hydro packages include source, old-draft and updated-overlay evidence with the same new SVGs.

The source PDF and updated SVG were rendered in the recorded PDF-coordinate
system, accounting for units-per-point and pixel rounding. No fitted image
translation, scale, rotation, skew or local warp was applied to make the review
images match. Authored geometry and any reused corrected assembly placement
are recorded in the revision notes. All 59 views in the complete release were
visually reviewed as source / new vector / fixed-coordinate edge overlay.

Magenta edges in the overlay are a comparison visualization. Raster edge
extraction was used only to make proof images, not to generate vector paths.
Source lettering, dimensions, page frames and scan noise are intentionally not
counted as missing object linework.

## Important orientation corrections

V13-cab-door faces LEFT in its enlarged source; V13-truck-side faces RIGHT.
V03-policy-tractor faces LEFT; V14-tractor-trailer and G16-tractor face RIGHT.
The shared subject is not a reason to force every published view to face the
same way. Geometry and branding zones were rebuilt in the direction of each
individual source. Vehicle numbers and lettering were not mirrored.

## Reconstruction limits

- These are clean, editable illustrative reconstructions, not recovered original production artwork or engineering drawings.
- Source-cropped views remain cropped. Geometry hidden by another source object is not verified; any interpretation is recorded per asset.
- Historical logos, vehicle numbers, instruction lettering, dimensions, page frames and scan noise are deliberately excluded from the blank objects.
- Fine strokes, hand curves, curved surfaces and hatch spacing are regularized. Visual review does not guarantee exact reproduction of every printed stroke.
- Body geometry and placement guides have been revised. Authentic historical typography, exact colours and brand artwork are not certified by this release.

Read each asset's revision.json for more specific notes and limitations.
Global limitations apply even where the per-asset limits list is empty.

## Verification and provenance

manifest.json and manifest.csv inventory this package. verification.json records
old/new file and geometry hashes, element counts, ID/reference checks and SVG
rendering checks. SHA256SUMS.txt records the delivered files. SVG parsing and
hash changes do NOT establish perfect visual fidelity; the source overlays are
provided to make the actual geometry independently inspectable.

Original full PDFs are not bundled in these small downloads. Their exact names,
page numbers and SHA-256 hashes are recorded per asset. The source books are
the supplied General Manual, Vehicle Manual and BC Hydro 1983 manual.
