# Over the Edge - brand kit v1.0

UNBC's Independent Student Newspaper. News · Clubs · Events · Calendar.

"Forest press": the paper's own lettering, forest green on newsprint, Source Serif headlines, Anton on the front page, and the printed issue's dashed index.

## Start here

1. Open `index.html` to browse every file offline.
2. Open `guidelines/brand-details.html` for the full reference: voice, logo, colour with contrast, type, icons, print devices, templates and motion.
3. Open `motion/index.html` for the motion library: the logo printing in, loaders and interface motion.
4. Read `guidelines/overtheedge-brand-guide.pdf` for the guide.
5. Use `logos/outlined/overtheedge-horizontal-forest.svg` as the primary logo, on Newsprint (#F5F1E6) or White.
6. Below 288 px wide on screen, or 58 mm in print, use `logos/outlined/words-horizontal-forest.svg` (without the subtext). Below 96 px or 20 mm, use the O (`symbol/`).
7. Install the fonts in `fonts/` before editing live text in the templates.

## What this kit is built from

- **The logo** is the SVG overtheedge.unbc.ca serves in its header, read on 22 October 2026. Its paths are used as they are: OVER, THE and EDGE, the line UNBC'S STUDENT NEWSPAPER and its apostrophe. Nothing is redrawn or reset in a font. The O on its own is the symbol.
- **The site's two-colour original** (forest words, ink subtext) is in `logos/source/`, for the light and dark themes. Every other logo in this kit is one colour.
- **Colours** come from the site's theme and the April 2025 print cover.
- **Type**: Source Serif 4 and Inter are the site's faces. Anton and Gochi Hand stand in for the print covers' faces, which are not known; replace them if the print team has the originals.

## Rules in brief

- One colour per logo: Forest on Newsprint or White; White or Lichen on Forest, Pine or Moss.
- Clear space is half the height of the O on every side.
- Forest is the brand. Pine, Lichen, Sage and Moss support it. Kraft and Pulp are for rules only. Proof red is for "Breaking" and "Correction" and nothing else.
- Headlines in Source Serif 4 Bold; front-page lines and page numbers in Anton, capitals only; interface text in Inter; datelines in IBM Plex Mono, capitals; at most one hand-written note per piece, never for information.
- Print devices: dashed index rules, two-digit page numbers, the forest masthead block and date box, and a white keyline inside a forest photo frame. Corners are square.
- On the press pass, "UNBC'S STUDENT NEWSPAPER" under the logo is a Plex Mono label, as on the October 2025 cover, not a fifth logo.

## Package contents

| Folder | Contents |
|---|---|
| `logos/` | Full, without subtext and stacked logos as SVG, PNG and PDF, in Forest, Ink, White, Lichen and currentColor; the site's two-colour originals in `source/` |
| `symbol/` | The O in each colour |
| `patterns/` | The O repeated, cropped and placed on Lichen |
| `icons/` | The site's search, sun, moon, close and arrow, plus newspaper, calendar, clubs, pen and archive, on one 24 px grid and 2 px stroke |
| `templates/` | Business card, press pass, letterhead, issue cover, story, new-issue and event posts, vertical story, link preview, banner and three slides |
| `motion/` | The motion library (`index.html`), `motion.css` with every token and keyframe, `motion-tokens.json` and a README |
| `web/` | React components, CSS, tokens, landing template, app icons and favicons |
| `fonts/` | Source Serif 4, Anton, Inter, IBM Plex Mono and Gochi Hand, with their licences |
| `guidelines/` | The guide, the logo reference sheet and the brand details page |
| `source/` | `brand.json`, from which every file here is generated |
