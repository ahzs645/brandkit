# Reference

What the identity is built from, recorded in `PROVENANCE.json`.

The Staff Card is kept separately at `templates/staff-card.zip`. It is the
paper's press pass. Its source, archive hash and included fonts are recorded in
[the integration guide](../../../docs/template-printer.md).

- `logo-site.svg` and `logo-site-dark.svg`: the logo exactly as overtheedge.unbc.ca draws it in its header, in the site's light and dark colours. Only the per-request id, the root's size and class attributes and the colour variables were changed (listed in PROVENANCE.json). `scripts/brands/overtheedge-logo.mjs` reads the wordmark and the O from `logo-site.svg`.
- `site-icons.json`: the site's five stroke icons as it serves them, with where each one comes from.
- The two 2025 print covers are recorded by URL, SHA-256 and the pixels sampled for Sage and Moss. They are not copied here: everything under `brands/` is published with the app, and the covers carry photographs.

The stacked masthead is extracted from page 1 of the [September 2025 PDF](https://overtheedge.unbc.ca/wp-content/uploads/2025/12/OTE-Issue-1-Sept-2025-.pdf) as `logo-cover-stacked.svg`. Its 33 vector paths retain the subtext beside THE. Refresh it with `python scripts/import-overtheedge-cover.py /path/to/issue.pdf`; the source PDF hash and output hash are recorded in `PROVENANCE.json`. The issue photographs are not included.

`identity/` holds downsized copies of the team's own Doodle identity files, the source of the palette, type, doodles and the social, slide and calendar templates (`scripts/brands/overtheedge-doodle.mjs`). `PROVENANCE.json` lists each one under `identity`, with the original file it was cut from and the colours sampled from them. Files with photographs of people were not copied.

- `palette-and-type.jpg`: the slide that names the four colours and the three typefaces.
- `doodle-concept.jpg` and `doodle-wall.jpg`: the concept and the doodles.
- `logo-colourways.jpg`: the stacked masthead on its four grounds.
- `post-*.jpg`, `reel-cover.jpg` and `month-sticker.jpg`: the applications the templates follow.
