# ddcnorth - brand kit v2.1

## Start here

This complete update replaces the former symbol with the supplied **six-dot, right-aligned 3-2-1 icon**, while preserving the original kit's wordmark artwork, typography and colours.

1. Open `index.html` to preview colours and layouts and browse every asset offline.
2. Read `guidelines/ddcnorth-brand-guide.pdf` for the eight-page identity guide.
3. Use `logos/outlined/ddcnorth-horizontal-black.svg` as the primary logo.
4. Use `logos/png/ddcnorth-horizontal-black-2048.png` when a transparent image is easier.
5. Install the desktop fonts in `fonts/desktop/` and `fonts/SpaceMono-Regular.ttf` before editing live application text.

`guidelines/brand-overview.png` provides a quick view of the updated system.

## What changed

The new symbol uses six true circles with identical horizontal and vertical gaps. The top row has three dots, the middle row has the two rightmost dots, and the bottom row has one dot on the right. Viewed as columns, the counts are 1, 2 and 3 from left to right. The arrangement is not mirrored or rotated.

The primary horizontal symbol and wordmark now have equal visible height, with a close internal gap reflecting the supplied reference. The secondary stacked layouts, standalone symbol, parent `ddc` family, patterns, supporting icons, templates, browser, React components, favicon, app icon, PDF guide and all PNG/PDF exports have been updated.

The complete `wordmark` object in `source/brand.json` is unchanged from v1: the custom `d` and `c` paths, both `d` positions, the `north` outline, spacing and font metadata all remain identical. Layout transforms around that lettering change to accommodate the new icon.

## Package contents

| Folder | Contents |
|---|---|
| `logos/outlined/` | Horizontal, stacked and wordmark-only SVGs for ddcnorth and ddc; black, white, midnight and currentColor |
| `logos/png/` | Transparent 1024 px-wide images, plus 2048 px horizontal logos |
| `logos/pdf/` | Individual vector PDFs for black, white and midnight logos |
| `logos/ddcnorth-logo-sheets.pdf` | Three vector reference sheets |
| `logos/editable-text/` | Hybrid and fully live-text alternatives, explicitly labeled as font-dependent approximations |
| `symbol/` | Six-circle master, colour variants, micro variant and transparent PNGs |
| `symbol/pdf/` | Individual vector symbol PDFs |
| `patterns/` | Repeat, crop and ice-field six-dot graphics, with PNG previews |
| `icons/` | Signal, direction, network, cycle and clarity supporting icons |
| `templates/` | Editable cards, A4 letterhead, post, banner and presentation cover; PNG previews and PDF layout proofs |
| `web/` | React components, CSS, tokens, landing template, app icons, adaptive SVG favicon and multi-size ICO |
| `fonts/` | Exact matching Inter release, Space Mono, official licences and source/version records |
| `guidelines/` | Eight-page guide, outlined guide artwork, logo sheets, overview, palette, typography notes and validation |
| `source/` | Shared JSON geometry and builders for artwork, templates, web, guide and exports |
| `reference/` | Current icon reference and historical v1 reconstruction evidence |

## Typography

- **Production ddc:** original custom vector outlines, not retyped.
- **Production north:** original Inter Display Regular outline, version `4.001;git-9221beed3`, tracking -0.016 em.
- **Display headings:** Inter Display Medium 500, tracking -0.04 em.
- **Body and UI:** Inter Regular 400.
- **Labels:** Space Mono Regular 400, tracking +0.12 em.

The new reference image's wordmark font is not used. The bundled Inter files match the version named in the original kit. Space Mono is version 1.003. See `guidelines/FONTS.md` and `fonts/font-manifest.json` for details.

Production SVG logos and all guide-page typography are paths and need no installed fonts. Template content stays live and editable. The offline browser loads the included fonts locally.

## Symbol geometry and spacing

The standard master has viewBox `0 0 256 256`, radius 40, and centres `(40,40)`, `(128,40)`, `(216,40)`, `(128,128)`, `(216,128)`, `(216,216)`. Centre spacing is 88 units in both directions, giving an equal 8-unit edge-to-edge gap between adjacent circles. The horizontal spacing has been tightened to match the previous vertical spacing, preserving dot size and total symbol height.

In the primary horizontal lockup, the icon and lettering are both 120 units high and the visible internal gap is 8 units. External clearspace is separate: allow at least one dot diameter around visible artwork. The small padding within each SVG is not a substitute for this surrounding space.

Recommended minimums are 220 px overall width / 55 mm for the complete horizontal file, or 32 px / 8 mm visible height for the standard symbol. The micro symbol retains all six centres and reduces the radius from 40 to 36 for smaller screen icons. Use the standard artwork for ordinary logos and the micro artwork only for small screen uses. The supplied favicon is the micro version.

## Colour

The original palette is preserved: black `#000000`, off-white `#F7F6F3`, graphite `#4B4F56`, midnight `#0B2B4A`, ice `#C8D7E8`. White `#FFFFFF` is available for reversal. No gradients are used.

White SVGs, PNGs and production PDFs are white artwork on transparency; a white viewer background may make them look empty. The browser and logo sheets show them against midnight for inspection.

## Website use

Use the outlined files directly, or import `web/DdcNorthLogo.tsx`. The React component supports `family`, `layout`, `title` and decorative modes; see its documented type definitions. `DdcNorthSymbol` is also exported.

```html
<link rel="stylesheet" href="web/brand.css">
<img src="logos/outlined/ddcnorth-horizontal-black.svg" alt="ddcnorth" width="280">
```

`currentColor` inherits the host colour when SVG is inline, including React. An SVG loaded through an `<img>` does not inherit the surrounding page's CSS colour. The browser uses fixed-colour assets for its image previews.

The offline browser and landing template do not contact external font services. The landing page's contact area is a placeholder for the intended website editor.

## Editing and print layouts

Template sizes are unchanged: cards 96 x 56 mm canvas with 90 x 50 mm trim and 3 mm bleed; letterhead A4; social post 1080 x 1080 px; banner 1584 x 396 px; presentation cover 1920 x 1080 px. Replace every bracketed placeholder. The content text remains live in SVGs; the logo groups remain outlined.

Template PDFs are vector layout proofs with placeholder text. They are not PDF/X-certified press files. For a print job, use the printer's colour profile, proof the conversion and request their required trim/bleed/mark setup. No unverified Pantone or CMYK equivalence is asserted.

## Rebuild

The original kit's single SVG-only generator has been expanded into builders covering the complete output. See `source/README.md` for requirements and commands. Core logo/pattern/icon SVG generation remains standard-library Python; full guide generation needs fontTools, and PNG/PDF exports use Inkscape and pypdf.

## Reference and version history

The current symbol comes from `reference/six-dot-reference.png`. The former board, proof and font comparison are retained only in `reference/legacy-v1/`; they are historical evidence and are not the current identity. Current artwork and documentation use the six-dot system.

The original v1 lettering was itself a reconstruction. This update preserves that supplied lettering; it does not recover or authenticate an earlier designer's master. See `reference/PROVENANCE.json`, `CHANGELOG.md` and `guidelines/VALIDATION.json`.
