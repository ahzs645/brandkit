# love.fútbol — practical application guide

Version 1.1 · reviewed 30 October 2026

This guide makes usable working assumptions where the public material does not specify a rule. It accompanies the [site research](SITE-RESEARCH.md), [original identity research](RESEARCH.md) and machine-readable [application assumptions](../reference/application-assumptions.json). The original logo geometry and sourced font files remain unchanged.

## The proposed working defaults

| Decision | Local starting point | How to interpret it |
| --- | --- | --- |
| Logo reserve | One quarter of the full artwork height on each side | External layout space; preserve the actual SVG paths and canvas. |
| Primary print logo | Start at 32 mm wide | Practical recommendation; proof at actual size for the output process. |
| Primary screen logo | Start at 144 CSS px wide | Rendered specimen review; smaller secondary marks require review. |
| Report logo and page | 48 mm logo, 8 mm reserve, 20 mm margins | Existing document defaults, with room beyond the proportional reserve. |
| Web body | Red Hat Text, 18 px / 1.5 | Local readable default, not a mandatory website-computed value. |
| Document body | Red Hat Text, 10.5 pt / 1.45 | Current document profile. Use the correct regular, bold and italic faces. |
| Display type | Bahianita; start around 48–88 px for web and 38 pt for report titles | Short headings; wrap translated text rather than compressing its width. |
| Captions and labels | Red Hat Text; 16 px web / 9 pt document starting points | Increase when the final display or print conditions require it. |
| Web spacing and measure | 8 px spacing steps; roughly 65 characters per line | Local layout convention. Stack columns when readable widths do not fit. |

The 144 CSS px recommendation comes from comparing 96, 120, 144, 180 and 240 px versions in both colourways. All original geometry is retained. See the [size-study PNG](logo-size-study.png) or [vector version](logo-size-study.svg) at actual scale. The printed 32 mm recommendation is a design judgment, not a measured reproduction limit. Secondary guide headers and navigation marks may be smaller and need their own context review.

The proportional reserve is about 14.21% of the logo width. At 48 mm wide this is 6.82 mm; the document profile keeps its larger 8 mm reserve. This calculation uses the complete source-artwork bounds, including the flag.

## Twelve decisions and their evidence

### 1. Give the complete mark room

**Decision:** Reserve at least one quarter of the complete logo height on every side. Document layouts retain their larger 8 mm reserve. Keep red flag, pitch and lettering together.

**Basis:** Local geometry-based recommendation, corroborated by source raster margins. Confidence in this proposed application: **medium**. This confidence describes the evidence and design judgment, not organizational approval.

**Limit:** No official numeric exclusion zone was recovered; image padding alone does not establish one.

Sources: [About Us: origin and logo rationale](https://www.lovefutbol.org/about-us) · [Current full-logo raster](https://www.lovefutbol.org/hubfs/LoveFutbol_January2026/images/logo+love.futbol.webp) · [Core Principles and Best Practice in Establishing Community-Driven Sport Spaces](https://cdn.sanity.io/files/oyf3dba6/production/49cf0f4ff864cb7b66187236d4dd70bef71e32f4.pdf).

### 2. Start at a practical readable size

**Decision:** Start primary logos at 32 mm in print or 144 CSS px on screen; use 48 mm for report covers. Small secondary marks need an output-size review.

**Basis:** Local specimen review. Confidence in this proposed application: **medium**. This confidence describes the evidence and design judgment, not organizational approval.

**Limit:** These are recommendations, not official minima. A screen rendering is not a physical print proof.

Sources: [Current full-logo raster](https://www.lovefutbol.org/hubfs/LoveFutbol_January2026/images/logo+love.futbol.webp).

### 3. Separate colour evidence from readable use

**Decision:** Keep green and light green for project surfaces, terracotta for emphasis, and cyan for an additional website accent. Use charcoal on these surfaces; reserve red for the source flag within this kit.

**Basis:** Observed website roles plus calculated contrast. Confidence in this proposed application: **high**. This confidence describes the evidence and design judgment, not organizational approval.

**Limit:** Website observations do not establish print conversions or fixed colour percentages.

Sources: [love.fútbol global homepage](https://www.lovefutbol.org/) · [Projects](https://www.lovefutbol.org/projects) · [About Us: sponsor and partner galleries](https://www.lovefutbol.org/about-us#partners) · [WCAG 2.2 Understanding Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

### 4. Use expressive titles and readable supporting text

**Decision:** Use Bahianita for short titles and Red Hat Text for paragraphs, labels, captions and numbers. Start web body at 18 px/1.5 and document body at 10.5 pt/1.45. Allow wrapping instead of squeezing translated text.

**Basis:** Observed font roles; local sizes. Confidence in this proposed application: **high**. This confidence describes the evidence and design judgment, not organizational approval.

**Limit:** Some project-detail H1 elements match the DK Brush Crush CSS rule; browser font loading was not measured. This kit does not recreate or redistribute that face.

Sources: [love.fútbol global homepage](https://www.lovefutbol.org/) · [Methodology](https://www.lovefutbol.org/methodology) · [Projects](https://www.lovefutbol.org/projects) · [Current website child stylesheet](https://www.lovefutbol.org/hubfs/hub_generated/template_assets/1/205378236071/1793319989497/template_child.css).

### 5. Lead with the place and the people

**Decision:** Record project/community name, city and country, verified project identifier, status or reporting period, local leadership, activities, stewardship and evidence. Keep a proposed project distinct from an observed project profile.

**Basis:** Editorial synthesis of official project and methodology pages. Confidence in this proposed application: **high**. This confidence describes the evidence and design judgment, not organizational approval.

**Limit:** Project numbers and locations need project-specific verification; global counters do not identify a project.

Sources: [Projects](https://www.lovefutbol.org/projects) · [Methodology](https://www.lovefutbol.org/methodology) · [FAQ: naming, scope and ownership](https://www.lovefutbol.org/faq).

### 6. Choose one primary action for each audience

**Decision:** Use a community enquiry for a proposed space, a partnership conversation for collaborators, a sponsorship conversation for project funders, and giving links for individual supporters. Specify the audience, destination and next step.

**Basis:** Observed homepage audience routes; local content structure. Confidence in this proposed application: **high**. This confidence describes the evidence and design judgment, not organizational approval.

**Limit:** Verify current destinations and local-language routes. Campaign amounts and supporter programs are not permanent identity tokens.

Sources: [love.fútbol global homepage](https://www.lovefutbol.org/) · [Donate](https://www.lovefutbol.org/donate) · [Starting Squad](https://www.lovefutbol.org/starting-squad) · [Contact](https://www.lovefutbol.org/contact).

### 7. Keep partner attribution separate from the mark

**Decision:** Use a separate acknowledgement area with named roles. Keep the full love.fútbol logo clear, give other approved marks their own space and balance prominence optically. Use text placeholders until approved assets and relationships are supplied.

**Basis:** Observed partner groupings; local layout convention. Confidence in this proposed application: **medium**. This confidence describes the evidence and design judgment, not organizational approval.

**Limit:** No fixed official partner-logo size ratio or fused co-brand lockup was recovered.

Sources: [About Us: sponsor and partner galleries](https://www.lovefutbol.org/about-us#partners) · [love.fútbol global homepage](https://www.lovefutbol.org/).

### 8. Show context and credit the image

**Decision:** Use real community-led activity, the space and its ongoing use. Provide a concise caption with place, date and creator. Keep essential text off busy images. For before/after comparisons, identify both dates and the same location.

**Basis:** Observed project storytelling; local editorial convention. Confidence in this proposed application: **high**. This confidence describes the evidence and design judgment, not organizational approval.

**Limit:** Public images are research references, not a stock-photo licence; frames stay empty until suitable assets are provided.

Sources: [love.fútbol global homepage](https://www.lovefutbol.org/) · [Methodology](https://www.lovefutbol.org/methodology) · [LF Inclusion & Equity Framework](https://www.lovefutbol.org/hubfs/LF%20Inclusion%20%26%20Equity%20Framework.pdf?hsLang=en).

### 9. Attribute quotations precisely

**Decision:** Use a verified exact quotation with the speaker’s approved name or role, community, date and source. Identify any translation. Leave placeholder copy visibly instructional until it is replaced.

**Basis:** Observed homepage community voices. Confidence in this proposed application: **high**. This confidence describes the evidence and design judgment, not organizational approval.

**Limit:** Do not invent testimonials or let a local quotation stand in for a measured population outcome.

Sources: [love.fútbol global homepage](https://www.lovefutbol.org/) · [LF Organizational Culture](https://www.lovefutbol.org/hubfs/LF%20Organizational%20Culture.pdf?hsLang=en).

### 10. Keep the definition with the number

**Decision:** Pair every metric with its unit, geography or population, period, source and whether it is observed, estimated or a target. Use a dated source; distinguish visits, unique participants, annual reach and cumulative reach.

**Basis:** Observed impact counters; evidence-quality convention. Confidence in this proposed application: **high**. This confidence describes the evidence and design judgment, not organizational approval.

**Limit:** Inconsistent or undated site totals are not frozen into default assets.

Sources: [love.fútbol global homepage](https://www.lovefutbol.org/) · [Governance & Transparency](https://www.lovefutbol.org/governance-transparency).

### 11. Preserve the identity across languages

**Decision:** Keep love.fútbol unchanged. Preserve place-name accents, review translation with local speakers, adapt dates and numbers to the chosen locale, and keep each call to action in the destination language.

**Basis:** Observed English, Spanish and Brazilian Portuguese routes. Confidence in this proposed application: **high**. This confidence describes the evidence and design judgment, not organizational approval.

**Limit:** The kit remains an English authoring interface; locale guidance and glyph coverage do not imply a complete translated UI.

Sources: [love.fútbol global homepage](https://www.lovefutbol.org/) · [Spanish global homepage](https://www.lovefutbol.org/es/) · [Brazilian Portuguese global homepage](https://www.lovefutbol.org/pt-br/).

### 12. Use recurring design evidence, review content inconsistencies

**Decision:** Record conflicting captions, inherited return-link labels and placeholder controls as source-quality observations. Confirm names and destinations against stronger project text before publishing.

**Basis:** Cross-page source review. Confidence in this proposed application: **high**. This confidence describes the evidence and design judgment, not organizational approval.

**Limit:** A visible website inconsistency is not an identity rule to reproduce.

Sources: [love.fútbol global homepage](https://www.lovefutbol.org/) · [Projects](https://www.lovefutbol.org/projects).

## Colour combinations for starter content

The following WCAG relative-luminance calculations use the exact RGB tokens. For normal text, the WCAG AA threshold is 4.5:1; large text has a 3:1 threshold. Logo artwork is exempt from that text criterion, but the kit still uses strong figure/background separation. These calculations check pairs, not whole-document accessibility. Source: [WCAG 2.2 Understanding Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

| Surface | Hex | Charcoal `#1D1D1B` text | White text |
| --- | --- | ---: | ---: |
| Website green | `#489D60` | 5.04:1 | 3.35:1 |
| Projects light green | `#88C59B` | 8.45:1 | 2.00:1 |
| Projects terracotta | `#D17F2D` | 5.45:1 | 3.10:1 |
| Homepage cyan accent | `#3CB1EA` | 6.97:1 | 2.42:1 |
| Website off-white | `#F5F4EF` | 15.33:1 | 1.10:1 |

Charcoal works for normal text on all five surfaces above. White is not a normal-text default on the accent colours. The live site sometimes uses cyan text against white; reproducing an observed value does not make every use accessible. For links on white, use the existing dark-green `forest` role and a visible text decoration. Red remains the logo flag detail in this kit; colour alone should not carry a status or instruction.

## Content models and template choices

Use a **project brief** for proposed work, an unsettled decision or a requested contribution. Use a **project profile** to document a specific place and its observed state. The profile carries location, date or period, local leadership, activities, stewardship, photograph credit and sources. Event date and article-update date are distinct facts.

Use the **comparison slide** for dated views of the same place. Use the **community-voice slide** for an exact, attributable statement. Use the **metric card** when the measure, period, place and evidence can be filled in together. Use the **call-to-action card** to present one audience, action and reviewed destination. The existing evidence slide remains useful for a sourced chart or image with an explanation of its limits.

The [content model](../reference/content-patterns.json) records editable fields and audience routes. It is authoring guidance, not a data feed or a guarantee that every source page contains complete information. English, Spanish and Brazilian Portuguese are observed website locales. Preserve `love.fútbol` and proper names in every locale; have translated claims and destinations reviewed locally. Empty placeholders never represent real outcomes or endorsements.

## What this research does not settle

No organization-issued current manual, official numerical logo minimum, fixed clear-space ratio, Pantone/CMYK recipe, mandatory partner arrangement or complete approved template family was recovered. The source record retains these as unresolved rather than changing their status when a local default is added. Original logo paths, licence files and public evidence remain independently auditable.
