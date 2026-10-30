# BC Hydro 1983: manual coverage and overlay review

Checked 2026-10-30.

All 48 source pages are inventoried against the kit. The audit includes original/reconstructed page overlays, template mappings, the report-cover rules and both BCE route vectors. Coverage does not mean an exact facsimile or an authenticated production master.

## Inventory

- 48 original PDF pages inventoried.
- 48 existing rebuilt manual SVG pages available for comparison.
- 65 editable examples in the current kit.
- 47 examples with embedded, toggleable layout rules.
- 6 template source comparisons.
- 11 added examples and 4 changed clean previews relative to e470434.

Counts establish presence, not exactness or production readiness.

## Source and method

Before/current comparisons retain painted SVG content and remove the complete optional layout-guides group, title, description, metadata, root brand-version attribute, comments and nonpainted formatting whitespace. Changed-preview counts describe clean artwork changes, not added annotations or descriptive text; they are not pixel-similarity scores.

BC Hydro Graphic Standards Manual - 1983.pdf, June 1983, 48 PDF pages (cover and printed pp. 1–47).

SHA-256: `ca5e1bc22d8908d69b7f56e75ff84bbfbe7e7e2a4f45260d44bc7372ff775b18`

The HTML report embeds the original scans, the existing rebuilt manual SVGs with their fonts, and current template renderings. Full manual pages use nominal 612 × 792 pt alignment; no similarity score is claimed. Template crop coordinates, dimensions and padding are in `reference/manual-source.json`.

### Automated checks

- All 48 original image hashes match the import manifest.
- All 48 rebuilt manual SVG files exist.
- Every current template renders with its local brand fonts.
- All template-to-manual page references resolve.

## Limitations

- The four signature masters remain PofBC reconstructions; Times Roman is represented by TeX Gyre Termes and screen colours approximate the specified inks.
- The illustrated cover still needs its original high-quality illustration. The tinted panel is marked as a placeholder.
- Undimensioned form trims, spine thicknesses and example canvases are identified as reconstruction choices. Three-dimensional signs still require the official large-scale drawings.
- Scans are slightly skewed/scaled; written measurements take precedence over raw page pixels.
- The manual directs users to separate official reproduction proofs, grids, larger color swatches and 3D production drawings. Those production originals are not supplied.
- No uniforms chapter appears in this 48-page manual.
- Historical phototype is approximated by TeX Gyre Termes; signature artwork must remain fixed outlined paths.
- Original scan and rebuilt manual pages are aligned to their nominal 612 × 792 point canvases. Individual pages retain scan drift and redraw differences; this is a visual comparison, not a feature-registered pixel acceptance test.
- The manual-page reconstruction is separate from the editable templates. A corrected template does not automatically correct the older reconstructed manual page.
- No whole-page similarity percentage is reported: font substitution, scan noise, source annotations and illustrative artwork prevent a defensible single score. The separate BCE crop metrics measure only those traced source masks.
- The separate original reproduction proofs, construction grids, large color swatches and three-dimensional production drawings referenced by the manual are not supplied.

## “the BCE route” vectors and overlay checks

The legacy locomotive is separate from the Rail signature (PDF p. 3 / printed p. 2). The rail stationery shows a black outline on the letterhead and a blue silhouette with white lettering on the card (PDF p. 18 / printed p. 17). The two source forms were traced independently.

| Form | Ink intersection over union | Vector precision | Source recall | Maximum mask distance |
| --- | ---: | ---: | ---: | ---: |
| Letterhead outline | 92.03% | 95.19% | 96.51% | 2 native px |
| Blue card silhouette | 97.78% | 98.46% | 99.30% | 1 native px |

These are same-canvas, native-pixel comparisons with segmented scan crops. They do not certify original printing masters or whole-page fidelity. Black in the difference images indicates shared ink; cyan is source-only ink and magenta is vector-only ink.

- Letterhead outline: `assets/bce-route-outline-black.svg`; difference image: `reference/bce-route-overlay-outline.png`.
- Blue card silhouette: `assets/bce-route-card-blue.svg`; difference image: `reference/bce-route-overlay-card.png`.

Detailed method and limits: `reference/bce-route-provenance.md` and `reference/bce-route-overlay-metrics.json`.

## All 48 pages

| Source | Subject | Before revision | Current coverage | Linked editable examples |
| --- | --- | --- | --- | --- |
| H01 / PDF 1 / cover | Manual cover | reference-only | Source reference | — |
| H02 / PDF 2 / p. 1 | Introduction, contents and terminology | reference-only | Source reference | — |
| H03 / PDF 3 / p. 2 | Four signatures and BCE route distinction | represented | Editable example represented | `explore-current-announcement`, `explore-reservoir-presentation` |
| H04 / PDF 4 / p. 3 | Official color signatures and fixed artwork | represented | Editable example represented | `explore-current-announcement`, `explore-reservoir-presentation` |
| H05 / PDF 5 / p. 4 | Corporate green / blue / black | represented | Guidance represented | — |
| H06 / PDF 6 / p. 5 | Gas Operations blue | represented | Guidance represented | — |
| H07 / PDF 7 / p. 6 | Single-color backgrounds | represented | Guidance represented | — |
| H08 / PDF 8 / p. 7 | Corporate-color backgrounds and value scale | represented | Guidance represented | — |
| H09 / PDF 9 / p. 8 | Incorrect use examples 1–5 | represented | Guidance represented | — |
| H10 / PDF 10 / p. 9 | Incorrect use examples 6–10 | represented | Guidance represented | — |
| H11 / PDF 11 / p. 10 | Incorrect use examples 11–15 | represented | Guidance represented | — |
| H12 / PDF 12 / p. 11 | Corporate typeface | represented | Editable example represented | `form-tender`, `publication-text` |
| H13 / PDF 13 / p. 12 | Signature minimum sizes | represented | Guidance represented | — |
| H14 / PDF 14 / p. 13 | Stationery/forms general | represented | Editable example represented | `letterhead-standard`, `envelope-standard`, `card-standard`, `letterhead-gas`, `envelope-gas`, `card-gas`, `letterhead-rail`, `envelope-rail`, `card-rail` |
| H15 / PDF 15 / p. 14 | Stationery design principles | represented | Editable example represented | `letterhead-standard`, `envelope-standard`, `card-standard`, `letterhead-gas`, `envelope-gas`, `card-gas`, `letterhead-rail`, `envelope-rail`, `card-rail` |
| H16 / PDF 16 / p. 15 | Corporate stationery | represented | Editable example represented | `letterhead-standard`, `envelope-standard`, `card-standard` |
| H17 / PDF 17 / p. 16 | Gas Operations stationery | represented | Editable example represented | `letterhead-gas`, `envelope-gas`, `card-gas` |
| H18 / PDF 18 / p. 17 | Rail stationery and BCE route marks | partial | Editable example represented | `letterhead-rail`, `envelope-rail`, `card-rail` |
| H19 / PDF 19 / p. 18 | Forms design rules | partial | Editable example represented | `form-bulletin`, `form-tender`, `form-employee-transfer`, `form-service-application`, `form-formal-header` |
| H20 / PDF 20 / p. 19 | Bulletin form | represented | Editable example represented | `form-bulletin` |
| H21 / PDF 21 / p. 20 | Tender Form | application-missing | Editable example represented | `form-tender` |
| H22 / PDF 22 / p. 21 | Salary Employee Transfer | application-missing | Editable example represented | `form-employee-transfer` |
| H23 / PDF 23 / p. 22 | Application for Service | application-missing | Editable example represented | `form-service-application` |
| H24 / PDF 24 / p. 23 | Publication formats | partial | Editable example represented | `publication-text` |
| H25 / PDF 25 / p. 24 | Cover proportions and back-cover rule | partial | Editable example with limitations | `cover-report`, `cover-illustrated`, `cover-display`, `cover-back`, `cover-back-display`, `spine-broad`, `spine-narrow` |
| H26 / PDF 26 / p. 25 | Report cover with dimensions | represented | Editable example represented | `cover-report` |
| H27 / PDF 27 / p. 26 | Illustrated publication cover | partial | Editable example with limitations | `cover-illustrated` |
| H28 / PDF 28 / p. 27 | 4×9 display cover | represented | Editable example represented | `cover-display` |
| H29 / PDF 29 / p. 28 | Publication spines | application-missing | Editable example represented | `spine-broad`, `spine-narrow` |
| H30 / PDF 30 / p. 29 | Newsletter mastheads | represented | Editable example represented | `masthead-band`, `masthead-rule` |
| H31 / PDF 31 / p. 30 | Publication text and graphics | application-missing | Editable example represented | `publication-text` |
| H32 / PDF 32 / p. 31 | Advertising/AV/display general | represented | Editable example represented | `advert-display`, `advert-classified`, `display-panel`, `advert-single-column` |
| H33 / PDF 33 / p. 32 | Display advertisement | represented | Editable example represented | `advert-display` |
| H34 / PDF 34 / p. 33 | Single-column and classified advertisements | partial | Editable example represented | `advert-classified`, `advert-single-column` |
| H35 / PDF 35 / p. 34 | Audio-visual and television | represented | Editable example represented | `av-title` |
| H36 / PDF 36 / p. 35 | Displays and 3D signature | application-missing | Editable example represented | `display-panel` |
| H37 / PDF 37 / p. 36 | Outdoor and specialty advertising | reference-only | Source reference | — |
| H38 / PDF 38 / p. 37 | Sign general rules | represented | Editable example represented | `sign-office-identification`, `sign-gas-identification`, `sign-horizontal-facility`, `sign-vertical-facility`, `sign-danger`, `sign-guide`, `illustrated-h39-office`, `illustrated-h39-gas`, `illustrated-h39-freight`, `illustrated-h39-plant`, `illustrated-h40-advisory`, `illustrated-h40-customer-service`, `illustrated-h40-shipping`, `illustrated-h40-directional`, `illustrated-h41-danger`, `illustrated-h41-authorized-vehicles`, `illustrated-h41-employees-only` |
| H39 / PDF 39 / p. 38 | Identification signs | represented | Editable example represented | `sign-office-identification`, `sign-gas-identification`, `sign-horizontal-facility`, `sign-vertical-facility`, `illustrated-h39-office`, `illustrated-h39-gas`, `illustrated-h39-freight`, `illustrated-h39-plant` |
| H40 / PDF 40 / p. 39 | Guide signs | represented | Editable example represented | `sign-guide`, `illustrated-h40-advisory`, `illustrated-h40-customer-service`, `illustrated-h40-shipping`, `illustrated-h40-directional` |
| H41 / PDF 41 / p. 40 | Control signs | represented | Editable example represented | `sign-danger`, `illustrated-h41-danger`, `illustrated-h41-authorized-vehicles`, `illustrated-h41-employees-only` |
| H42 / PDF 42 / p. 41 | Vehicles general | represented | Editable example represented | `vehicle-van-black`, `vehicle-van-white` |
| H43 / PDF 43 / p. 42 | Vehicle positive/reverse background rules | represented | Editable example represented | `vehicle-van-black`, `vehicle-van-white`, `illustrated-h48-boxcar`, `illustrated-h47-generator`, `illustrated-h47-crawler-side`, `illustrated-h48-locomotive`, `illustrated-h47-crawler-front`, `illustrated-h44-van-side`, `illustrated-h45-stepvan-rear`, `illustrated-h44-van-rear`, `illustrated-h44-van-door`, `illustrated-h47-seat-panel`, `illustrated-h46-flatbed`, `illustrated-h45-stepvan-side`, `illustrated-h46-cab-door`, `illustrated-h45-roller-truck-rear`, `illustrated-h46-tractor-trailer` |
| H44 / PDF 44 / p. 43 | Light vehicles | represented | Editable example represented | `vehicle-van-black`, `vehicle-van-white`, `illustrated-h44-van-side`, `illustrated-h44-van-rear`, `illustrated-h44-van-door` |
| H45 / PDF 45 / p. 44 | Heavy trucks | represented | Editable example represented | `illustrated-h45-stepvan-rear`, `illustrated-h45-stepvan-side`, `illustrated-h45-roller-truck-rear` |
| H46 / PDF 46 / p. 45 | Tractor trailers / mobile generators | represented | Editable example represented | `illustrated-h46-flatbed`, `illustrated-h46-cab-door`, `illustrated-h46-tractor-trailer` |
| H47 / PDF 47 / p. 46 | Equipment | represented | Editable example represented | `illustrated-h47-generator`, `illustrated-h47-crawler-side`, `illustrated-h47-crawler-front`, `illustrated-h47-seat-panel` |
| H48 / PDF 48 / p. 47 | Railway rolling stock | represented | Editable example represented | `illustrated-h48-boxcar`, `illustrated-h48-locomotive` |

## Page findings and rules

### H01 · PDF 1 · cover — Manual cover

**Current coverage:** Source reference.

Before this revision (reference-only):

- No original source scan comparison; reconstructed guide is separate from historical cover.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H02 · PDF 2 · printed 1 — Introduction, contents and terminology

**Current coverage:** Source reference.

Source rules:

- Signature means symbol plus logotype; symbol/logotype are distinct terms.
- Manual dated June 1983.

Before this revision (reference-only):

- No full terminology/contents audit surfaced in template studio.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H03 · PDF 3 · printed 2 — Four signatures and BCE route distinction

**Current coverage:** Editable example represented.

Source rules:

- Four signatures: Corporate, Gas Operations, B.C.Hydro Rail, Formal.
- Only one signature at a time. Corporate covers electrical/general and gas/rail as part of whole organization.
- Each signature is inseparable symbol and specially cut/spaced logotype; no resetting, movement or reproportioning.
- BCE route locomotive is an independent legacy mark, not part of Rail signature; do not place close together.
- Formal signature wording and two-line arrangement may not be abbreviated or moved.
- Official reproduction proofs / grid versions were separate controlled artwork, not included as production masters in this scan.

Before this revision (represented):

- BCE legacy-mark constraint is documented but mark itself is missing.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H04 · PDF 4 · printed 3 — Official color signatures and fixed artwork

**Current coverage:** Editable example represented.

Source rules:

- Four signatures: Corporate, Gas Operations, B.C.Hydro Rail, Formal.
- Only one signature at a time. Corporate covers electrical/general and gas/rail as part of whole organization.
- Each signature is inseparable symbol and specially cut/spaced logotype; no resetting, movement or reproportioning.
- BCE route locomotive is an independent legacy mark, not part of Rail signature; do not place close together.
- Formal signature wording and two-line arrangement may not be abbreviated or moved.
- Official reproduction proofs / grid versions were separate controlled artwork, not included as production masters in this scan.

Before this revision (represented):

- Production-master fidelity cannot be established from this scan; artwork is reconstructed.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H05 · PDF 5 · printed 4 — Corporate green / blue / black

**Current coverage:** Guidance represented.

Source rules:

- Green non-process376; process C50 Y100 (coated/uncoated).
- Blue non-process314; coated C90 M20 Y25; uncoated C90 M15 Y25.
- Black100%.
- Green/blue occur in symbol only; logotypes black. Gas flame and H are same blue/value.
- Printed manual swatches explicitly unsuitable for color production testing; original larger swatches were required.

Before this revision (represented):

- Digital hex colors are approximations; source says its small swatches are inadequate for production matching.

Existing manual-page reconstruction notes:

- The reused reconstructed Hydro glyph/star contours and compatible Times cut still differ subtly from the historical artwork.
- Source-derived green and blue are screen approximations; Pantone/process specifications are live source text, not calibrated ink measurements.

### H06 · PDF 6 · printed 5 — Gas Operations blue

**Current coverage:** Guidance represented.

Source rules:

- Green non-process376; process C50 Y100 (coated/uncoated).
- Blue non-process314; coated C90 M20 Y25; uncoated C90 M15 Y25.
- Black100%.
- Green/blue occur in symbol only; logotypes black. Gas flame and H are same blue/value.
- Printed manual swatches explicitly unsuitable for color production testing; original larger swatches were required.

Before this revision (represented):

- Production swatches are not available in supplied source.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H07 · PDF 7 · printed 6 — Single-color backgrounds

**Current coverage:** Guidance represented.

Source rules:

- Normal print: black on white preferred; black on backgrounds0–20% value; dark>=70% single-color on white only; white reverse on80–100% value.
- Avoid intermediate print backgrounds21–79%.
- Corporate color positive on white only; no artificial white windows or white fill inside symbol.
- Transparent backgrounds inside symbol match outer background.
- AV/backlit and3D exceptions elsewhere.

Before this revision (represented):

- Embedded construction/background rules not available as toggle on templates.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H08 · PDF 8 · printed 7 — Corporate-color backgrounds and value scale

**Current coverage:** Guidance represented.

Source rules:

- Normal print: black on white preferred; black on backgrounds0–20% value; dark>=70% single-color on white only; white reverse on80–100% value.
- Avoid intermediate print backgrounds21–79%.
- Corporate color positive on white only; no artificial white windows or white fill inside symbol.
- Transparent backgrounds inside symbol match outer background.
- AV/backlit and3D exceptions elsewhere.

Before this revision (represented):

- Source value chart exists in reference; no direct original-scan overlay.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H09 · PDF 9 · printed 8 — Incorrect use examples 1–5

**Current coverage:** Guidance represented.

Source rules:

- 15 examples: wrong symbol placement; repeated isolated symbol; incorrect symbol colors; wrong blue; mismatched gas blue; colored Rail word; undersized color; reset logotype; abbreviated formal; reformatted formal; colored single-color on color; corporate colors on nonwhite; corporate colors on colored background; white forced inside symbol; colored fill in reverse signature.

Before this revision (represented):

- Guide condenses violations; not all original illustrations separately reproduced.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H10 · PDF 10 · printed 9 — Incorrect use examples 6–10

**Current coverage:** Guidance represented.

Source rules:

- 15 examples: wrong symbol placement; repeated isolated symbol; incorrect symbol colors; wrong blue; mismatched gas blue; colored Rail word; undersized color; reset logotype; abbreviated formal; reformatted formal; colored single-color on color; corporate colors on nonwhite; corporate colors on colored background; white forced inside symbol; colored fill in reverse signature.

Before this revision (represented):

- Guide condenses violations; original examples are source reference, not editable test cases.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H11 · PDF 11 · printed 10 — Incorrect use examples 11–15

**Current coverage:** Guidance represented.

Source rules:

- 15 examples: wrong symbol placement; repeated isolated symbol; incorrect symbol colors; wrong blue; mismatched gas blue; colored Rail word; undersized color; reset logotype; abbreviated formal; reformatted formal; colored single-color on color; corporate colors on nonwhite; corporate colors on colored background; white forced inside symbol; colored fill in reverse signature.

Before this revision (represented):

- Guide condenses violations; original examples are source reference, not editable test cases.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H12 · PDF 12 · printed 11 — Corporate typeface

**Current coverage:** Editable example represented.

Source rules:

- Times Roman regular is primary; matched Times Italic for emphasis; other styles illustrated.
- Upper/lower case; no all-cap settings. Sentence-case headings; initial capitals for first/principal words of titles and forms.
- Company name in copy: B.C.Hydro with no spaces.
- Body10–12pt,35–55 characters per line.
- Bold sparingly; black on white preferred.

Before this revision (represented):

- Times replacement disclosed; original phototype and special logotype are not the font itself.

Existing manual-page reconstruction notes:

- Real compatible Times cuts are used; the exact 1983 printing cut is not authenticated.
- Times Adweight and Times Heavyweight use compatible bold as disclosed substitutes; those distinct original cuts are unavailable.
- Large specimen ink rectangles match the scan; different compatible glyph shapes remain and require a historical-cut proof.

### H13 · PDF 13 · printed 12 — Signature minimum sizes

**Current coverage:** Guidance represented.

Source rules:

- Minimum widths differ by signature, color treatment and background; see minimum-widths.json.
- This table concerns the printed page, not a universal screen-pixel minimum.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H14 · PDF 14 · printed 13 — Stationery/forms general

**Current coverage:** Editable example represented.

Source rules:

- White stock/black copy normally; colored stock only special needs such as multipart forms.
- Enlarge signature/type for lower-contrast stock.
- Corporate/Gas/Rail principal stationery coordinated; copy10/11pt Times Roman address.
- Envelope form number6pt and return statement10pt.
- Business card12pt name,8/9pt details, blind-embossed signature.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H15 · PDF 15 · printed 14 — Stationery design principles

**Current coverage:** Editable example represented.

Source rules:

- White stock/black copy normally; colored stock only special needs such as multipart forms.
- Enlarge signature/type for lower-contrast stock.
- Corporate/Gas/Rail principal stationery coordinated; copy10/11pt Times Roman address.
- Envelope form number6pt and return statement10pt.
- Business card12pt name,8/9pt details, blind-embossed signature.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H16 · PDF 16 · printed 15 — Corporate stationery

**Current coverage:** Editable example represented.

Source rules:

- Letterhead, envelope, business card full-size fragments.
- Signature1.5in wide; letterhead signature baseline1in from top, address first baseline3/16in below signature.
- Letterhead dimension4in from symbol left to right trim; generator uses x4.5in on8.5in Letter, consistent with this annotated dimension.
- Envelope symbol left0.5in, signature baseline0.75in down; form number0.25in in/down.
- Card details use source dimensional diagram; signature baseline5/8in, name baseline1⅛in, lower copy baseline0.25in above bottom.

Before this revision (represented):

- No scan overlay or dimension layer.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H17 · PDF 17 · printed 16 — Gas Operations stationery

**Current coverage:** Editable example represented.

Source rules:

- Same coordinated letterhead/envelope/card sizing as Corporate; signature1.5in wide measured across whole mark.
- Envelope preprinted return address10pt with3/16in spacing below signature.
- Card includes telephone local beneath number at left.

Before this revision (represented):

- No scan overlay or dimension layer.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H18 · PDF 18 · printed 17 — Rail stationery and BCE route marks

**Current coverage:** Editable example represented.

- Both BCE route variants are now present on Rail stationery and available separately in Logos.

Source rules:

- Rail signature2⅛in wide; same logotype type size/location as Corporate/Gas.
- Letterhead BCE outline isolated at left, left-edge dimension0.75in shown.
- Card BCE blue silhouette with white text1in wide;1/16in gap to right copy; telephone in bottom body-copy line.
- Blue BCE card variant has no black outline; white lettering is knocked out.

Before this revision (partial):

- BCE outline absent on letterhead.
- BCE blue silhouette/white-type mark absent on card.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.
- The two BCE route drawings use source-page vector traces: black outline on the letterhead and blue with white lettering on the card. The card-width extension line ends above the Rail signature as in the source. Other artwork and typography retain the earlier reconstruction limits.

### H19 · PDF 19 · printed 18 — Forms design rules

**Current coverage:** Editable example represented.

Source rules:

- Letter8.5×11in normal; black on white.
- Form title/signature20pt on all form sizes; title top left aligns body; signature top right1in from right edge; both3/8in from top.
- Formal signature14pt and aligned to form-name baseline.
- Ruled lines0.5pt; no outside border; localized boxes allowed with square corners.
- Form number6pt bottom left.

Before this revision (partial):

- Formal 14pt baseline-aligned header exception not demonstrated.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H20 · PDF 20 · printed 19 — Bulletin form

**Current coverage:** Editable example represented.

Source rules:

- Letter8.5×11; full-size form example; fields, paired header areas and department/division name at lower right.

Before this revision (represented):

- Editable reconstruction; source text/field layout partly adapted, not an exact facsimile.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H21 · PDF 21 · printed 20 — Tender Form

**Current coverage:** Editable example represented.

- The legal-size tender layout is now present; scan break marks are excluded from the printable form.

Source rules:

- Legal8.5×14; scan uses breaks, not vertically compressed printed dimensions.
- Two-column body for35–55-character lines; italic emphasis; sentence-case table headings.

Before this revision (application-missing):

- Legal Tender Form absent.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H22 · PDF 22 · printed 21 — Salary Employee Transfer

**Current coverage:** Editable example represented.

- The employee-transfer layout is present; its snap-set trim is scan-derived.

Source rules:

- Odd-size snap-set example; exact overall paper size not stated.
- Same20pt header/signature and0.5pt ruled lines; checkboxes and multipart-copy color distribution.

Before this revision (application-missing):

- Odd-size transfer form absent; physical overall size not explicitly stated.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H23 · PDF 23 · printed 22 — Application for Service

**Current coverage:** Editable example represented.

- The compact service layout is present; its trim and compact header placement are scan-derived.

Source rules:

- Compact landscape form divided down middle; title/signature retain standard size/left-right relationship.
- Exact overall physical dimensions not stated in text; small dense grid can only be measured from scan.

Before this revision (application-missing):

- Compact landscape service form absent; physical overall size not explicitly stated.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H24 · PDF 24 · printed 23 — Publication formats

**Current coverage:** Editable example represented.

Source rules:

- Letter8.5×11in first choice; vertical4×9in rack format; occasional3¾×8½in substitute.
- Vertical design retained unless technical contents force horizontal.
- Signature first element near cover top; no noninformational decoration.
- Relevant graphics grouped; avoid additional logos/symbols.

Before this revision (partial):

- Publication back cover/spines/content starter absent.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H25 · PDF 25 · printed 24 — Cover proportions and back-cover rule

**Current coverage:** Editable example with limitations.

- Cover rules can be shown or hidden. Both standard back-cover sizes now omit the signature and use a 6 point printing code.

Source rules:

- Text begins1/3 cover width across and1/4 depth down.
- All text flush with B; symbol hangs left.
- Signature/title same type size;2 dominant cap-heights from signature baseline to title cap top.
- Letter signature/title36/36pt, subtitle/authorship18/18pt. Rack signature/title24/24pt, subordinate12/12pt.
- Subtitle1 dominant cap-height below title; authorship/location/date1 dominant cap-height below previous element.
- No extra leading within multiline elements.
- Letter example includes0.5in binding allowance; proportions same with/without binding.
- Back cover no signature,6pt printing code lower right; no printer name.
- Photo/illustration cover and rack cover also shown.

Before this revision (partial):

- Back-cover printing-code template absent.
- Construction guides cannot be toggled.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H26 · PDF 26 · printed 25 — Report cover with dimensions

**Current coverage:** Editable example represented.

- The ⅓-width, ¼-depth, 36/36 and 18/18 rules are implemented and follow editable cover text. Scan overlay is available.

Source rules:

- Text begins1/3 cover width across and1/4 depth down.
- All text flush with B; symbol hangs left.
- Signature/title same type size;2 dominant cap-heights from signature baseline to title cap top.
- Letter signature/title36/36pt, subtitle/authorship18/18pt. Rack signature/title24/24pt, subordinate12/12pt.
- Subtitle1 dominant cap-height below title; authorship/location/date1 dominant cap-height below previous element.
- No extra leading within multiline elements.
- Letter example includes0.5in binding allowance; proportions same with/without binding.
- Back cover no signature,6pt printing code lower right; no printer name.
- Photo/illustration cover and rack cover also shown.

Before this revision (represented):

- Construction guides and original-page overlay absent; numeric cover formula is already correct.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H27 · PDF 27 · printed 26 — Illustrated publication cover

**Current coverage:** Editable example with limitations.

- Text/grid are implemented; the illustration area remains a disclosed placeholder, with the original visible in the overlay.

Source rules:

- Text begins1/3 cover width across and1/4 depth down.
- All text flush with B; symbol hangs left.
- Signature/title same type size;2 dominant cap-heights from signature baseline to title cap top.
- Letter signature/title36/36pt, subtitle/authorship18/18pt. Rack signature/title24/24pt, subordinate12/12pt.
- Subtitle1 dominant cap-height below title; authorship/location/date1 dominant cap-height below previous element.
- No extra leading within multiline elements.
- Letter example includes0.5in binding allowance; proportions same with/without binding.
- Back cover no signature,6pt printing code lower right; no printer name.
- Photo/illustration cover and rack cover also shown.

Before this revision (partial):

- Plain tinted illustration placeholder instead of historical source drawing.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H28 · PDF 28 · printed 27 — 4×9 display cover

**Current coverage:** Editable example represented.

Source rules:

- Text begins1/3 cover width across and1/4 depth down.
- All text flush with B; symbol hangs left.
- Signature/title same type size;2 dominant cap-heights from signature baseline to title cap top.
- Letter signature/title36/36pt, subtitle/authorship18/18pt. Rack signature/title24/24pt, subordinate12/12pt.
- Subtitle1 dominant cap-height below title; authorship/location/date1 dominant cap-height below previous element.
- No extra leading within multiline elements.
- Letter example includes0.5in binding allowance; proportions same with/without binding.
- Back cover no signature,6pt printing code lower right; no printer name.
- Photo/illustration cover and rack cover also shown.

Before this revision (represented):

- No construction overlay; green block itself is source illustration placeholder.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H29 · PDF 29 · printed 28 — Publication spines

**Current coverage:** Editable example represented.

- Broad and narrow spine examples are now present, with source rules and example dimensions distinguished.

Source rules:

- Read left-to-right with book lying on back. Signature before title.
- Broad: signature/title separate lines, same36pt as cover; symbols align to cover, text to B.
- Narrow: one line; reduced to fit length.

Before this revision (application-missing):

- Broad and narrow spine templates absent.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H30 · PDF 30 · printed 29 — Newsletter mastheads

**Current coverage:** Editable example represented.

Source rules:

- Letter preferred; horizontal top masthead; signature left/title right at equal type size.
- Date/issue/contact below as part of masthead.
- With light band or without band; normal positive standards.
- No exact masthead point size dictated in text.

Before this revision (represented):

- No original-source overlay; point size/margins are reconstruction choices.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H31 · PDF 31 · printed 30 — Publication text and graphics

**Current coverage:** Editable example represented.

- A text-page template applies the written typography principles; it is a new example, not a source facsimile.

Source rules:

- Consistent size, column width and spacing. Compact reading units; excess whitespace better in margins.
- Consistent drawing line weights/rendering.
- Simple contrasting legend colors; avoid small colored type.
- Drafting-convention exception for engineering-drawing lettering; name still B.C.Hydro and covers use signature.

Before this revision (application-missing):

- No body/content layout template or explicit content guidance sheet.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H32 · PDF 32 · printed 31 — Advertising/AV/display general

**Current coverage:** Editable example represented.

Source rules:

- Corporate typeface/signature fundamentals across print, television, radio, exhibits, etc.
- Signature final element in advertising; upper/lower case typography.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H33 · PDF 33 · printed 32 — Display advertisement

**Current coverage:** Editable example represented.

Source rules:

- Large display ad, single-column notice, classified tender example.
- Signature positive at base/final element; minimum widths enforced.
- Times regular upper/lower case, nearest equivalent for publisher-setting; italics for emphasis.

Before this revision (represented):

- Ad graphic and copy adapted, not a facsimile; exact inch sizes are measured reconstruction values.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H34 · PDF 34 · printed 33 — Single-column and classified advertisements

**Current coverage:** Editable example represented.

- Display, single-column and classified advertisement variants are represented.

Source rules:

- Large display ad, single-column notice, classified tender example.
- Signature positive at base/final element; minimum widths enforced.
- Times regular upper/lower case, nearest equivalent for publisher-setting; italics for emphasis.

Before this revision (partial):

- Single-column notice absent, while classified is present.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H35 · PDF 35 · printed 34 — Audio-visual and television

**Current coverage:** Editable example represented.

Source rules:

- Reverse preferred to avoid white-screen eyestrain.
- Color reverse exception: white logotype/circle, green/blue retained; dark neutral background.
- Use highest-contrast single-color when backgrounds distort colors or change.
- Titles/credits/diagrams corporate typeface.

Before this revision (represented):

- 4:3 canvas is an implementation choice; not specified in text.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H36 · PDF 36 · printed 35 — Displays and 3D signature

**Current coverage:** Editable example represented.

- Portable-panel half-cap clearance is implemented. Three-dimensional fabrication remains dependent on official large-scale drawings.

Source rules:

- Portable panel border minimum0.5 cap-height all sides.
- Signature only main ID, not excess/decorative symbol.
- 3D from official large-scale drawings; scan diagram simplified.
- Diagram notes30deg bevel on H,20deg bevel on logotype, broad-stroke width:depth2:1.
- Color reverse allowed on appropriate neutral backgrounds in dimensional applications.
- Metallic finish H must match letters; avoid coarse/conflicting backgrounds.

Before this revision (application-missing):

- Portable display panel template absent.
- 3D construction reference absent; production drawings not supplied.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H37 · PDF 37 · printed 36 — Outdoor and specialty advertising

**Current coverage:** Source reference.

- Written out-of-home and specialty-media guidance is covered in the audit; this page supplies no fixed production template.

Source rules:

- Front-lit standard print rules; back-lit AV rules. Signature final element.
- Specialty items must suit imprint size/texture/contour. No uniform standards or uniform illustrations appear here.

Before this revision (reference-only):

- Outdoor/specialty lighting/context rules not surfaced as coverage entry.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H38 · PDF 38 · printed 37 — Sign general rules

**Current coverage:** Editable example represented.

Source rules:

- Black on white, upper/lower case, flush left general rule.
- Guide/control signature only when identity not already clear; at top.
- Guide lower-case letter height1in per50ft viewing (25mm per15m), with favorable conditions; enlarge when compromised.
- Roadway/railway traffic signs and some international safety signs are outside manual scope.

Before this revision (represented):

- Viewing-distance rule not directly represented in template controls.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H39 · PDF 39 · printed 38 — Identification signs

**Current coverage:** Editable example represented.

Source rules:

- Full signature only or facility name immediately below.
- Borders0.5 cap-height all sides; Gas top border is1 full cap-height above logotype.
- Name top1 x-height below signature baseline; tight multiline name (descenders just clear).
- Horizontal and vertical examples.

Before this revision (represented):

- Descriptions incorrectly call Gas top clearance above flame; source says above logotype.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H40 · PDF 40 · printed 39 — Guide signs

**Current coverage:** Editable example represented.

Source rules:

- Borders0.5 cap-height; copy line gap1 x-height as rule.
- Sentence copy sentence case; brief labels principal-word capitalization.
- Subordinate cap-height equals dominant x-height.
- Directional lines1 cap-height apart, ruled divider, source arrow style.
- 7:30 am to4:30 pm example uses lower-case am/pm and ampersand.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H41 · PDF 41 · printed 40 — Control signs

**Current coverage:** Editable example represented.

Source rules:

- Safety black on yellow with specific exceptions.
- Traffic/pedestrian follow UTCD conventions (historic source).
- Danger/prohibit access example; red do-not-enter circle with white bar; indoor Employees only black-on-white, no signature needed.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H42 · PDF 42 · printed 41 — Vehicles general

**Current coverage:** Editable example represented.

Source rules:

- Corporate/Gas/Rail single-color only; same logotype height on same vehicle type.
- Vehicle value thresholds differ: black0–30%, white31–100%.
- One per side, third rear where fits, extra pair on tractor cab; none on front.
- Unit numbers clear of signatures, not on fixed-chassis/cab doors; rear units right/signatures left.
- Transparent-carrier decal/die-cut; flat vertical placement preferred.
- Pool cars, aircraft, some security/other vehicles unmarked and omitted.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H43 · PDF 43 · printed 42 — Vehicle positive/reverse background rules

**Current coverage:** Editable example represented.

Source rules:

- Corporate/Gas/Rail single-color only; same logotype height on same vehicle type.
- Vehicle value thresholds differ: black0–30%, white31–100%.
- One per side, third rear where fits, extra pair on tractor cab; none on front.
- Unit numbers clear of signatures, not on fixed-chassis/cab doors; rear units right/signatures left.
- Transparent-carrier decal/die-cut; flat vertical placement preferred.
- Pool cars, aircraft, some security/other vehicles unmarked and omitted.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H44 · PDF 44 · printed 43 — Light vehicles

**Current coverage:** Editable example represented.

Source rules:

- Panel van side upper rear; rear upper left door below window/clear hardware.
- Without upper panels, front doors below windows; rear left only if clear.
- Passenger cars usually unmarked.

Before this revision (represented):

- Simplified van dimensions/proportions are implementation examples, not source dimensions.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H45 · PDF 45 · printed 44 — Heavy trucks

**Current coverage:** Editable example represented.

Source rules:

- Both side marks upper rear; if obstructed on either side, both on doors instead.
- Rear upper left below hinged-door window or near roll-up top; none on aerial equipment.
- Extreme protrusions require separate flat panel.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H46 · PDF 46 · printed 45 — Tractor trailers / mobile generators

**Current coverage:** Editable example represented.

Source rules:

- Upper rear both trailer sides; both cab doors; rear upper left.
- Flatbed side marks only, towards back wheels.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H47 · PDF 47 · printed 46 — Equipment

**Current coverage:** Editable example represented.

Source rules:

- One each side, third rear if appropriate; least-wear positions. Illustrative guidance, not exact dimensional specification.

Before this revision (represented):

- Equipment locations are explicitly guidelines, not dimensions.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

### H48 · PDF 48 · printed 47 — Railway rolling stock

**Current coverage:** Editable example represented.

Source rules:

- One signature per side. Locomotive below cab windows; railcars same end towards top.

Existing manual-page reconstruction notes:

- Source line positions and drop caps are restored in declared prose regions; compatible Times cuts differ from the historical printing face.
- Tables, specimen artwork and technical drawings outside the declared prose regions still have material source differences; see the per-page overlay review.
- Registered source text is OCR-derived; dense copy and subtle punctuation still require proofreading.

## Template fidelity

### letterhead-standard

B.C.Hydro / Corporate letterhead. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

Layout rules are available. No registered template scan is supplied.

### envelope-standard

B.C.Hydro / Corporate envelope, No. 10. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

Layout rules are available. No registered template scan is supplied.

### card-standard

B.C.Hydro / Corporate business card. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

Layout rules are available. No registered template scan is supplied.

### letterhead-gas

B.C.Hydro / Gas Operations letterhead. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

Layout rules are available. No registered template scan is supplied.

### envelope-gas

B.C.Hydro / Gas Operations envelope, No. 10. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

Layout rules are available. No registered template scan is supplied.

### card-gas

B.C.Hydro / Gas Operations business card. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

Layout rules are available. No registered template scan is supplied.

### letterhead-rail

B.C.Hydro / B.C.Hydro Rail letterhead. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

Layout rules are available. Original-scan comparison: Header-only excerpt registered on a Letter canvas. The envelope and business card below it have been excluded. Shared editable contact values differ from the printed sample.

### envelope-rail

B.C.Hydro / B.C.Hydro Rail envelope, No. 10. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

Layout rules are available. No registered template scan is supplied.

### card-rail

B.C.Hydro / B.C.Hydro Rail business card. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

Layout rules are available. Original-scan comparison: Cropped to the printed card border; nominal size 3½ × 2 inches. The original sample contact details and scan proportions differ slightly.

### form-bulletin

B.C.Hydro / Bulletin form, Gas Operations. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

Layout rules are available. Original-scan comparison: Printed dimensions govern the editable layout. The scanned page has small registration and typesetting differences; TeX Gyre Termes substitutes for the original Times Roman.

### cover-report

B.C.Hydro / Report cover. Measured cover layout.

The published proportions and point sizes are implemented. The lettering uses the kit’s substitute typeface; this is not an original production master.

Layout rules are available. Original-scan comparison: Printed dimensions govern the editable layout. The scanned page has small registration and typesetting differences; TeX Gyre Termes substitutes for the original Times Roman.

### cover-illustrated

B.C.Hydro / Illustrated cover. Measured cover layout.

The cover grid and editable text are reconstructed. The tinted illustration area is a placeholder; the original drawing remains visible in the scan overlay.

Layout rules are available. Original-scan comparison: Printed dimensions govern the editable layout. The scanned page has small registration and typesetting differences; TeX Gyre Termes substitutes for the original Times Roman.

### cover-display

B.C.Hydro / Display cover, 4 × 9. Measured cover layout.

The published proportions and point sizes are implemented. The lettering uses the kit’s substitute typeface; this is not an original production master.

Layout rules are available. Original-scan comparison: Printed dimensions govern the editable layout. The scanned page has small registration and typesetting differences; TeX Gyre Termes substitutes for the original Times Roman.

### masthead-band

B.C.Hydro / newsletter masthead (band). Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

No registered template scan is supplied.

### masthead-rule

B.C.Hydro / newsletter masthead (rule). Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

No registered template scan is supplied.

### advert-display

B.C.Hydro / display advertisement. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

No registered template scan is supplied.

### advert-classified

B.C.Hydro / classified advertisement. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

No registered template scan is supplied.

### av-title

B.C.Hydro / audio-visual title frame. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

No registered template scan is supplied.

### sign-office-identification

B.C.Hydro / identification sign, office identification. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

No registered template scan is supplied.

### sign-gas-identification

B.C.Hydro / identification sign, gas identification. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

No registered template scan is supplied.

### sign-horizontal-facility

B.C.Hydro / identification sign, horizontal facility. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

No registered template scan is supplied.

### sign-vertical-facility

B.C.Hydro / identification sign, vertical facility. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

No registered template scan is supplied.

### sign-danger

B.C.Hydro / danger sign. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

No registered template scan is supplied.

### sign-guide

B.C.Hydro / directional guide sign. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

No registered template scan is supplied.

### vehicle-van-black

B.C.Hydro / panel van, positive. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

No registered template scan is supplied.

### vehicle-van-white

B.C.Hydro / panel van, reverse. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

No registered template scan is supplied.

### form-tender

B.C.Hydro / Form: Tender, legal. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

Layout rules are available. No registered template scan is supplied.

### form-employee-transfer

B.C.Hydro / Form: Salary Employee Transfer. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

Layout rules are available. No registered template scan is supplied.

### form-service-application

B.C.Hydro / Form: Application for Service. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

No registered template scan is supplied.

### form-formal-header

B.C.Hydro / Form: Formal signature header study. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

Layout rules are available. No registered template scan is supplied.

### cover-back

B.C.Hydro / publication back cover. Rule-based reconstruction.

The absence of a signature and the 6 point printing code are prescribed. The bottom/right inset is a practical choice.

Layout rules are available. No registered template scan is supplied.

### cover-back-display

B.C.Hydro / publication back cover. Rule-based reconstruction.

The absence of a signature and the 6 point printing code are prescribed. The bottom/right inset is a practical choice.

Layout rules are available. No registered template scan is supplied.

### spine-broad

B.C.Hydro / broad spine, laid on its back. Rule-based reconstruction.

The reading direction and signature/title relationship follow the manual. Spine thickness and the narrow-spine 24 point size are example settings. Confirm the actual binding before printing.

Layout rules are available. No registered template scan is supplied.

### spine-narrow

B.C.Hydro / narrow spine, laid on its back. Rule-based reconstruction.

The reading direction and signature/title relationship follow the manual. Spine thickness and the narrow-spine 24 point size are example settings. Confirm the actual binding before printing.

Layout rules are available. No registered template scan is supplied.

### publication-text

B.C.Hydro / publication contents layout. Rule-based reconstruction.

A new usable text-page example based on the written principles, not a facsimile of a historical publication. Body 11 on 13 point; two columns approximately 45–55 characters wide.

No registered template scan is supplied.

### display-panel

B.C.Hydro / portable display identification. Rule-based reconstruction.

The half-cap border is measured from the visible complete signature, including the ring and descenders. Overall panel size is an example. Three-dimensional work still requires the official large-scale drawings.

Layout rules are available. No registered template scan is supplied.

### advert-single-column

B.C.Hydro / single-column advertisement. Rule-based reconstruction.

Applies the single-column example’s hierarchy and signature placement. The original copy and newspaper column dimensions are not production specifications.

No registered template scan is supplied.

### illustrated-h48-boxcar

Boxcar — Hydro (H48). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h47-generator

Generator — Hydro (H47). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h47-crawler-side

Crawler Side — Hydro (H47). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h48-locomotive

Locomotive — Hydro (H48). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h47-crawler-front

Crawler Front — Hydro (H47). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h44-van-side

Van Side — Hydro (H44). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h45-stepvan-rear

Stepvan Rear — Hydro (H45). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h44-van-rear

Van Rear — Hydro (H44). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h44-van-door

Van Door — Hydro (H44). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h47-seat-panel

Seat Panel — Hydro (H47). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h46-flatbed

Flatbed — Hydro (H46). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h45-stepvan-side

Stepvan Side — Hydro (H45). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h46-cab-door

Cab Door — Hydro (H46). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h45-roller-truck-rear

Roller Truck Rear — Hydro (H45). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h46-tractor-trailer

Tractor Trailer — Hydro (H46). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h39-office

Office identification (H39). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h39-gas

Gas operations identification (H39). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h39-freight

Huntingdon Freight Office (H39). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h39-plant

Liquefied Natural Gas Plant (H39). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h40-advisory

Advisory information (H40). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h40-customer-service

Customer Service (H40). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h40-shipping

Shipping & Receiving (H40). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h40-directional

Visitor Parking / Electric Shop (H40). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h41-danger

Danger / Keep away (H41). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h41-authorized-vehicles

Authorized vehicles only (H41). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### illustrated-h41-employees-only

Employees only (H41). Source-based vector drawing.

The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.

Layout rules are available. No registered template scan is supplied.

### explore-current-announcement

{name} / Current bands / announcement. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

No registered template scan is supplied.

### explore-reservoir-presentation

{name} / Reservoir contours / presentation. Historical reconstruction.

Presence of an editable example does not establish exact fidelity to the original page or to an official production master.

No registered template scan is supplied.

## Reproduce

```sh
python3 scripts/import-bc-hydro-scan.py /path/to/original-manual.pdf
node scripts/audit-bc-hydro.mjs
```

Use `--baseline /path/to/baseline-brand.json` if commit e470434 is unavailable. The checked-in baseline inventory remains available even without the baseline Git history.
