# Illustrations

ManualKit's source-based drawings of what the identity is applied to: the uniforms of the General
Manual (p. 13), the vehicles and equipment of the General and Vehicle Manuals, BC Hydro's vans,
trucks, equipment and rolling stock (Graphic Standards Manual pp. 43–47), and forty signs (General
Manual p. 16, the Sign Manual, Graphic Standards pp. 38–40). Ninety-nine views, from ManualKit's
R2 release, which also redrew the trailers and tractor-trailers and V12's box truck; its own notes
are in `MANUALKIT-README.md`, its inventory in `manifest.json` and `inventory.csv`, and its checks
in `verification.json`. (The release's `example-outlined.svg` files are left out: each is the
same as its `display.svg`. So are the `previous-blank.svg` files, which git already has.)

A vehicle, uniform or piece of equipment's folder holds:

- `blank.svg`: the object, with no identity on it
- `branding-zones.svg`: the same, with the placement guides drawn
- `revision.json`: the source page, the view box (in the page's coordinates times
  `svg_units_per_pdf_point`), what was redrawn, and the branding zones
- `with-markings.svg` and `applied-markings.svg` or `markings-only.svg`, where the source shows
  reflective striping or the like; `unbranded.svg` (the object with its markings) and
  `geometry-only.svg`, where the release has them

A sign's folder holds:

- `example-editable-text.svg`: the sign in layers (its face and supports, printed rules, example
  content with the wording as live text, and the example identity)
- `display.svg`: the same with the wording outlined, as the source shows it
- `blank.svg`, `face-only.svg`, `unbranded.svg` and `branding-zones.svg`
- `revision.json`: the source page, the face's bounds, and the face and identity zones

They are used twice:

- `scripts/brands/illustrations.mjs` makes each one a template in the Province or BC Hydro brand,
  with the identity set into its zones (`npm run make:bc`). A sign's wording becomes a field for
  each line, set in the brand's face, and its identity zone takes the brand's sign signature.
- `scripts/apply-illustrations.mjs` puts each one into its manual page in place of the earlier
  draft, with the identity in its zones, keeping the page's notes and callouts; a sign goes in as
  `display.svg`, replacing the earlier sign's face, posts and wording. Run it on the pages as they
  were before any drawings went in (it adds, so a second run on its own output doubles up), then
  `scripts/render-guide-thumbnails.mjs`.

They are illustrative reconstructions, not production artwork or engineering drawings; see each
`revision.json` for its limits.
