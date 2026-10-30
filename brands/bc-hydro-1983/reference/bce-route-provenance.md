# “the BCE route” locomotive: source and overlay check

These are **scan-derived vector reconstructions**, not original BC Hydro master artwork.
The locomotive and its original lettering are editable SVG paths in separate named groups.
No raster image or font is embedded in either asset.

## What the manual actually shows

The source is the supplied *BC Hydro Graphic Standards Manual* (1983), SHA-256
`ca5e1bc22d8908d69b7f56e75ff84bbfbe7e7e2a4f45260d44bc7372ff775b18`.
PDF page numbers include the cover; printed page numbers do not.

| Evidence | PDF page / printed page | Implementation |
| --- | --- | --- |
| The locomotive may be retained where recognition of “the BCE route” is required; it is not part of the Rail signature, and the two should not be put close together. | 3 / 2 (`H03`) | The locomotive is a separate illustration asset, not a fifth signature or a combined Rail lockup. The manual gives no numerical clear-space distance between the two. |
| Black outline locomotive on the Rail letterhead. | 18 / 17 (`H18`) | `assets/bce-route-outline-black.svg`; illustration ID `bce-route-outline`. |
| Filled blue locomotive with white lettering on the Rail card. | 18 / 17 (`H18`) | `assets/bce-route-card-blue.svg`; illustration ID `bce-route-card`. This source form is independently traced, not a reversed outline. |
| Letterhead mark starts ¾ inch from the left. | 18 / 17 (`H18`) | Printed dimension. Its width is not labelled; the full-size scan measures approximately 1⅜ inches. Bottom alignment with the last address line's ink is measured from the scan, not a separately printed rule. |
| Card mark is 1 inch wide, with 1/16 inch between it and the address text. | 18 / 17 (`H18`) | Both dimensions are printed on the source page. |

The white lettering on the card is an opaque white path. It will remain white if the
asset is placed on another background. The blue is the kit's existing `#0069A2`
screen rendering of Hydro blue, not a colour measurement of the aged scan.

## Registration and tracing

The original page image is 2562 × 3311 pixels. These small source crops were extracted
from that image without resizing, sharpening, deskewing or colour correction:

| Form | Native crop, `[left, top, right, bottom]` | Canvas | Source crop |
| --- | --- | --- | --- |
| Letterhead outline | `[198, 281, 613, 431]` | 415 × 150 px | `bce-route-source-outline.png` |
| Blue card mark | `[1126, 2842, 1426, 2947]` | 300 × 105 px | `bce-route-source-card.png` |

The outline is segmented at luminance `<150`; the separate vertical dimension line
at the left of the crop is excluded by connected-component selection. The card is
segmented at luminance `<175`, which retains its very dark thin railings as well as
the blue body. Components of four pixels or fewer and isolated print speckles are
excluded from the card; lettering cutouts greater than three pixels are retained.

The two body masks and two lettering masks were traced with `node-potrace` 2.1.8:
threshold 128 on the prepared binary masks; `turdSize: 0`, `optCurve: true`,
`optTolerance: 0.15`; `alphaMax: 0.75` for locomotive outlines and `1` for lettering.
The resulting cubic paths, source crop hashes, segmentation details and packed
source comparison masks are frozen in `bce-route-trace.json`.

To regenerate the assets from those recorded vector masters:

```sh
node scripts/brands/bc-hydro-bce-route.mjs
node --test test/bc-hydro-bce-route.test.js
```

The generator exports `bceRouteIllustrations({ blue })` for the existing illustration
renderer and `writeBceRouteAssets({ blue })` for standalone exports. It needs no
tracing dependency when rebuilding the kit.

## Correction to rebuilt manual page H18

The imported `manuals/bc/pages/hydro/H18.svg` previously used the same approximate
blue locomotive and live Times lettering for both examples. Those two artwork
groups have been replaced with the corresponding source traces. The letterhead now
uses the black outline; the card uses the independent blue silhouette with white
outlined lettering. One associated dimension line has also been corrected as
described below. The page's other artwork, layout, rules and typography are unchanged.

Placement follows the supplied PDF's embedded page image, not a fitted visual
alignment. Its 2562 × 3311 native pixels occupy 614.88 × 794.64 pt. The PDF's
612 × 792 pt crop starts 1.44 pt from the image's left and 1.20 pt from its top.
Thus both crop coordinate systems map to page points as
`x = nativeX × 0.24 − 1.44`, `y = nativeY × 0.24 − 1.20`.
The PDF image matrix's sub-0.0001 pt decimal noise is rounded to these nominal values.

| Form | Crop origin on rebuilt page | Uniform scale | Crop extent on rebuilt page |
| --- | --- | --- | --- |
| Letterhead outline | `(46.08, 66.24)` pt | `0.24` pt per native pixel | `99.6 × 36` pt |
| Blue card mark | `(268.8, 680.88)` pt | `0.24` pt per native pixel | `72 × 25.2` pt |

These extents include the small margins in the source crop. They register the
historical examples on this manual page; they do not add new production dimensions
to the manual's written rules. Each illustration's body and lettering remain
separate vector groups, with page-scoped IDs. The page metadata records the correction,
source hash and transform while retaining the imported page's original provenance.
Its catalogue note also distinguishes the corrected marks from the remaining page
reconstruction limits.

The inherited card-width extension line incorrectly ran from `(318, 563)` to
`(318, 742)` pt, crossing the card locomotive. The supplied PDF contains an explicit
vector stroke from `(318.96, 560.16)` to `(318.96, 605.52)` pt, ending just above
the Rail signature. This single line now uses those source coordinates, with its
existing stroke colour and width retained. It has the stable ID
`H18-card-width-extension`; its source endpoints are also recorded in page metadata.
The regression test checks that the line stops at the source endpoint and the
incorrect long stroke is absent. No other dimension annotations have been changed.

To reapply the correction after importing the original ManualKit page, and redraw
only its 320 × 414 WebP thumbnail using the pack's existing quality setting:

```sh
CHROMIUM_PATH=/path/to/chromium node scripts/update-bc-hydro-manual-bce.mjs
node --test test/bc-hydro-bce-route.test.js test/manuals.test.js
```

Omit `CHROMIUM_PATH` when Playwright's matching Chromium is installed. This operation
is idempotent and does not rebuild or alter the rest of the manual pack. Regenerate
the full audit afterward so its embedded H18 drawing and reconstruction hash match.

## Overlay results

The vectors were rasterized at the source crop's native pixel dimensions with
`@resvg/resvg-js` 2.6.2 and compared at identical coordinates. There is no fitted
affine transform, separate scaling of letters, or per-feature warp. The comparison
uses the segmented source masks; it does not count the surrounding white paper as
successful agreement.

| Form | Ink intersection over union | Vector precision | Source recall | Maximum distance to the other mask |
| --- | ---: | ---: | ---: | ---: |
| Letterhead outline | 92.03% | 95.19% | 96.51% | 2 native pixels |
| Blue card silhouette | 97.78% | 98.46% | 99.30% | 1 native pixel |

The thin outline is more sensitive to subpixel contour smoothing than the filled
card mark. These figures describe agreement with these scan crops. They do not
establish that the scans reproduce the original artwork exactly, or that all
applications of the mark comply with the manual.

`bce-route-overlay-outline.png` and `bce-route-overlay-card.png` show agreement in
black, source-only ink in cyan and vector-only ink in magenta, magnified 3× with
nearest-neighbour scaling so the native-pixel differences remain visible.
`bce-route-overlay-metrics.json` contains the full counts and measurement limits.
The regression test repeats the source-mask comparison, verifies the crop hashes,
and checks that the card remains a blue silhouette with white lettering.

The source printing's small irregularities remain visible at large sizes,
particularly in the card's small reversed lettering. A higher-resolution original
master would be needed to establish ideal curves beyond the available evidence.
