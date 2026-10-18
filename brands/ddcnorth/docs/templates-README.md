# Editable SVG templates

All six applications use the six-dot symbol with equal horizontal and vertical
dot spacing. The original `ddcnorth` wordmark outlines, colour palette and
typography remain in use.

## Files and dimensions

| File | Canvas / output size | Layout |
| --- | --- | --- |
| `business-card-front.svg` | 96 × 56 mm, including bleed | White primary logo on Midnight; Space Mono tagline |
| `business-card-back.svg` | 96 × 56 mm, including bleed | Off-white contact side with a Midnight six-dot symbol |
| `letterhead-a4.svg` | 210 × 297 mm | A4 letterhead, original bracketed content fields |
| `social-post.svg` | 1080 × 1080 px | Midnight square post with an Ice corner motif |
| `social-banner.svg` | 1584 × 396 px | Ice banner with Midnight logo and corner motif |
| `presentation-cover.svg` | 1920 × 1080 px | 16:9 cover with a large Midnight six-dot motif |

## Editing text

Logos are outlined vector geometry. All other text, including headlines,
taglines and bracketed fields, remains live and editable. Install the supplied
desktop fonts from the kit's `fonts/` folder before editing or exporting;
installation details are in [fonts/README.md](../fonts/README.md):

- **Inter Display** for headlines.
- **Inter** for body copy and contact information.
- **Space Mono** for the business-card tagline and other brand labels.

Font binaries are not embedded. Keep the supplied logo groups intact so their
appearance does not depend on installed fonts. Replace every bracketed
placeholder; none of the contact fields contain real account information.

The text layers have meaningful IDs, such as `contact-name`, `letter-subject`
and `presentation-details`. SVG text does not automatically wrap: add line
breaks in your vector editor, use separate text lines, or shorten copy as
needed. Proof the result after replacing placeholder text.

## Symbol and logo use

The square six-dot symbol has **three dots across the top, two right-aligned
dots in the middle, and one dot at the bottom right**, with the same spacing
between adjacent dots horizontally and vertically. Preserve that orientation
and spacing. Scale all six dots together; do not change individual radii,
move dots, stretch, rotate or mirror the logo.

The primary mark and wordmark share a 120-unit artwork height and an 8-unit
gap in the master. The templates scale that complete lockup uniformly. Large
motifs on the post and banner deliberately crop at the canvas edge; they are
supporting graphics and do not replace the complete logo.

## Business-card production

Both card SVGs have a **96 × 56 mm full canvas** and a **90 × 50 mm trim**,
with 3 mm of bleed on every edge. The backgrounds extend to the full canvas.
The viewBox uses 10 SVG units per millimetre:

- Trim rectangle: `x=30`, `y=30`, `width=900`, `height=500`.
- Minimum safe rectangle: `x=60`, `y=60`, `width=840`, `height=440`, which is
  3 mm inside the trim on all sides.
- Every key logo and text element is inside that safe rectangle.

Each card contains a hidden `print-guides` group with trim and safe rectangles.
Set its `display` attribute to `inline` to inspect the guides, then hide it
again before exporting. These rectangles are editing guides, not crop marks.

For press production, outline the final edited text, apply the printer's
specified colour profile, and ask the supplier to proof the layout and add any
required marks before exporting its required PDF format. SVG colours are RGB;
the editable files do not impose a generic CMYK conversion or PDF/X profile.

## Rebuilding

From the kit folder:

```sh
python source/build_templates.py --out rebuilt
```

This writes the six SVGs and this README into `rebuilt/templates/`. The builder
uses `source/brand.json` and the shared `lockup()` / `mark()` functions in
`source/build.py`; it does not depend on images, network access, or third-party
Python libraries.
