# First Form - brand kit v1.0

Consulting · Design · Development. *From first idea to first form.*

## Start here

For the source repository, begin with [`../USE.md`](../USE.md). For an exported kit, the paths below start at the kit root. [Open First Form directly](https://projects.ahmadjalil.com/brandkit/?brand=firstform&share=1); [open its document examples](https://projects.ahmadjalil.com/brandkit/?brand=firstform&share=1&view=documents).

1. Open `index.html` to browse every file offline.
2. Open `guidelines/brand-details.html` for the full reference: positioning and voice, logo rules, colour, type, icons, patterns, form styles, templates and where the brand can go next.
3. Open `motion/index.html` for the motion library: logo animations, loaders and interface motion.
4. Read `guidelines/firstform-brand-guide.pdf` for the nine-page guide.
5. Use `logos/outlined/firstform-horizontal-black.svg` as the primary logo, on Ash (#DFDFDF) or White.
6. Install the Sora files in `fonts/` before editing live text in the templates.

## What this kit is built from

First Form Brand Kit V1.0 supplied the logo as PNGs only. This kit draws the logo as vectors:

- **The mark** is redrawn on its own geometry: two identical isometric blocks on a 3 : 5 slope, the second turned 180° about the centre, each with its front face left open inside a thin outline. A heavier-outline small-size version is used for favicons.
- **The wordmark** is FIRST / FORM set in Sora Bold and outlined, on the original lockup's proportions. Sora Bold is the nearest open face to the original lettering, not the lettering itself.

When vector masters of the original logo exist, replace the mark's paths and the wordmark's glyphs in `source/brand.json` and rebuild.

That edit path applies to an exported standalone kit. In this repository, `brands/firstform/brand.json` is generated: persist changes in `scripts/brands/firstform.mjs` and rerun `npm run make:firstform`. Regenerate source use guides and reference metadata with `node scripts/brands/documentation.mjs`. The documentation system derives its defaults without changing the identity definition; optional `brand.documentation` overrides belong in the generator so they survive a rebuild.

## Rules in brief

- Black logo on Ash or White; white logo on Black or the darkest greys. Never on Graphite (#484848).
- Clear space is the cap height of the F on every side. Minimum size: full logo 40 px / 12 mm tall, mark 24 px / 7 mm.
- Strictly monochrome: Black, Graphite, Ash, White, with Ink, Coal, Rule, Steel and Mist as support greys.
- One typeface, Sora: SemiBold 600 for headlines, Regular 400 for body and labels, Light 300 for large captions.
- Panels have a 24 px radius; buttons are full pills.

## Documents and screenshots

The document examples use the light paper and ink roles with First Form's own Sora files and supplied logo. Reports and product overviews have editable headings, body text, tables and captions. US Letter and A4 profiles share the same six layouts: cover, content, product detail, screenshot or evidence, comparison and closing.

Keep screenshots in their application colours and make their labels readable at the final document size. Explain the visible action or result in the caption. Label examples, diagrams and placeholders accurately; a placeholder is not evidence of a working feature.

Product copy describes capabilities and supported scope. It does not imply that a client has received the product. Add delivery history, compatibility, results and contact details only when the document's source material supports them. The sample publication contains instructional copy and a labelled image placeholder, ready to replace with the actual material.

## Package contents

| Folder | Contents |
|---|---|
| `logos/` | Horizontal, stacked and wordmark-only logos as SVG, PNG and PDF, in black, white and currentColor |
| `symbol/` | The two-block mark, its small-size variant and colour versions |
| `patterns/` | Repeat, crop and field graphics from the mark |
| `icons/` | Consultation, design, prototyping, website, forms, build, systems and research, in one 2 px stroke |
| `templates/` | Business card, part tag, letterhead, proposal cover, social posts and banner, link preview and three slides |
| `motion/` | The motion library (`index.html`), `motion.css` with every token and keyframe, `motion-tokens.json` and a README |
| `web/` | React components, CSS, tokens, landing template, app icons and favicons |
| `fonts/` | Sora Light, Regular, SemiBold and Bold, with the SIL Open Font License |
| `guidelines/` | The guide, logo sheet, brand details page |
| `source/` | `brand.json`, from which every file here is generated |
