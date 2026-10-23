# Reference

What the identity is built from, recorded in `PROVENANCE.json`.

The legacy Staff Card is kept separately at `templates/staff-card.zip`. Its
source, archive hash, included fonts and relationship to the Forest press
identity are recorded in [the integration guide](../../../docs/template-printer.md).

- `logo-site.svg` and `logo-site-dark.svg`: the logo exactly as overtheedge.unbc.ca draws it in its header, in the site's light and dark colours. Only the per-request id, the root's size and class attributes and the colour variables were changed (listed in PROVENANCE.json). `scripts/brands/overtheedge-logo.mjs` reads the wordmark and the O from `logo-site.svg`.
- `site-icons.json`: the site's five stroke icons as it serves them, with where each one comes from.
- The two 2025 print covers are recorded by URL, SHA-256 and the pixels sampled for Sage and Moss. They are not copied here: everything under `brands/` is published with the app, and the covers carry photographs.

The stacked masthead is extracted from page 1 of the [September 2025 PDF](https://overtheedge.unbc.ca/wp-content/uploads/2025/12/OTE-Issue-1-Sept-2025-.pdf) as `logo-cover-stacked.svg`. Its 33 vector paths retain the subtext beside THE. Refresh it with `python scripts/import-overtheedge-cover.py /path/to/issue.pdf`; the source PDF hash and output hash are recorded in `PROVENANCE.json`. The issue photographs are not included.
