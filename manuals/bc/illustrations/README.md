# Illustrations

ManualKit's source-based drawings of what the identity is applied to: the uniforms of the General
Manual (p. 13), the vehicles and equipment of the General and Vehicle Manuals, and BC Hydro's vans,
trucks, equipment and rolling stock (Graphic Standards Manual pp. 43–47). Fifty-nine views, from
the release of 18 October 2026; its own notes are in `MANUALKIT-README.md`, its inventory in
`manifest.json`, and its checks in `verification.json`.

Each folder holds:

- `blank.svg`: the object, with no identity on it
- `branding-zones.svg`: the same, with the placement guides drawn
- `revision.json`: the source page, the view box (in the page's coordinates times
  `svg_units_per_pdf_point`), what was redrawn, and the branding zones
- `with-markings.svg` and `applied-markings.svg`, where the source shows reflective striping or the
  like

They are used twice:

- `scripts/brands/illustrations.mjs` makes each one a template in the Province or BC Hydro brand,
  with the identity set into its zones (`npm run make:bc`).
- `scripts/apply-illustrations.mjs` puts each one into its manual page in place of the earlier
  draft, with the identity in its zones, keeping the page's notes and callouts. Run
  `scripts/render-guide-thumbnails.mjs` after it.

They are illustrative reconstructions, not production artwork or engineering drawings; see each
`revision.json` for its limits.
