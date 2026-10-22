# Reference

What the identity is built from, recorded in `PROVENANCE.json`.

- `logo-site.svg` and `logo-site-dark.svg`: the logo exactly as overtheedge.unbc.ca draws it in its header, in the site's light and dark colours. Only the per-request id, the root's size and class attributes and the colour variables were changed (listed in PROVENANCE.json). `scripts/brands/overtheedge-logo.mjs` reads the wordmark and the O from `logo-site.svg`.
- `site-icons.json`: the site's five stroke icons as it serves them, with where each one comes from.
- The two 2025 print covers are recorded by URL, SHA-256 and the pixels sampled for Sage and Moss. They are not copied here: everything under `brands/` is published with the app, and the covers carry photographs.
