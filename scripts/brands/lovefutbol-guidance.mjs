// Practical decisions for a researched kit. These are deliberately kept separate
// from source-issued rules: love.fútbol has not supplied approval for these defaults.
import { createGuideKit } from '../../src/engine/guide.js'
import { svgDocument } from '../../src/engine/artwork.js'
import { luminance } from '../../src/engine/brand.js'

export const lovefutbolAssumptions = {
  schema: 'brandkit/application-assumptions/1',
  brandId: 'lovefutbol',
  reviewed: '2026-10-30',
  status: 'Local recommendations informed by public website evidence; not organization-issued standards.',
  logo: {
    clearSpace: { measure: 'complete artwork height', ratio: 0.25, official: false },
    recommendedPrintWidthMm: 32,
    recommendedScreenWidthCssPx: 144,
    documentWidthMm: 48,
    documentReservedSpaceMm: 8,
    enforcement: 'Recommendations, not source-verified export limits. Review secondary small marks and proof the actual output.',
    rationale: 'One quarter of the full artwork height gives a scalable reserve without editing the paths. The official raster’s smallest transparent inset is about 0.259 of its visible artwork height, supporting this as an inference rather than an official rule. Screen sizes were compared as rendered specimens; the print starting size is a local design judgment requiring a physical proof.',
    sources: ['lf-header-raster', 'lf-community-practices-pdf']
  },
  typography: {
    display: { font: 'Bahianita', webStartPx: 48, webEndPx: 88, printTitlePt: 38, trackingEm: 0, use: 'Short display headings; keep diacritics and natural word spacing.' },
    body: { font: 'Red Hat Text', webPx: 18, webLineHeight: 1.5, printPt: 10.5, printLineHeight: 1.45 },
    secondary: { printHeadingPt: 20, printCaptionPt: 9, webCaptionPx: 16 },
    status: 'Font roles are observed; this reusable scale is a local application choice.',
    sources: ['lf-home', 'lf-projects', 'lf-methodology', 'lf-child-css']
  },
  layout: {
    printMarginsMm: 20,
    webSpaceUnitPx: 8,
    textMeasureCh: 65,
    responsive: 'Use content-led wrapping: stack image/text and partner groups when readable widths no longer fit. Keep logical reading order.',
    status: 'Local defaults, not extracted mandatory breakpoints or official grid ratios.'
  },
  rules: [
    { id: 'logo-space', title: 'Give the complete mark room', basis: 'Local geometry-based recommendation, corroborated by source raster margins', confidence: 'medium', decision: 'Reserve at least one quarter of the complete logo height on every side. Document layouts retain their larger 8 mm reserve. Keep red flag, pitch and lettering together.', sources: ['lf-about', 'lf-header-raster', 'lf-community-practices-pdf'], limit: 'No official numeric exclusion zone was recovered; image padding alone does not establish one.' },
    { id: 'logo-size', title: 'Start at a practical readable size', basis: 'Local specimen review', confidence: 'medium', decision: 'Start primary logos at 32 mm in print or 144 CSS px on screen; use 48 mm for report covers. Small secondary marks need an output-size review.', sources: ['lf-header-raster'], limit: 'These are recommendations, not official minima. A screen rendering is not a physical print proof.' },
    { id: 'colour-roles', title: 'Separate colour evidence from readable use', basis: 'Observed website roles plus calculated contrast', confidence: 'high', decision: 'Keep green and light green for project surfaces, terracotta for emphasis, and cyan for an additional website accent. Use charcoal on these surfaces; reserve red for the source flag within this kit.', sources: ['lf-home', 'lf-projects', 'lf-partners', 'w3c-contrast'], limit: 'Website observations do not establish print conversions or fixed colour percentages.' },
    { id: 'type-scale', title: 'Use expressive titles and readable supporting text', basis: 'Observed font roles; local sizes', confidence: 'high', decision: 'Use Bahianita for short titles and Red Hat Text for paragraphs, labels, captions and numbers. Start web body at 18 px/1.5 and document body at 10.5 pt/1.45. Allow wrapping instead of squeezing translated text.', sources: ['lf-home', 'lf-methodology', 'lf-projects', 'lf-child-css'], limit: 'Some project-detail H1 elements match the DK Brush Crush CSS rule; browser font loading was not measured. This kit does not recreate or redistribute that face.' },
    { id: 'project-record', title: 'Lead with the place and the people', basis: 'Editorial synthesis of official project and methodology pages', confidence: 'high', decision: 'Record project/community name, city and country, verified project identifier, status or reporting period, local leadership, activities, stewardship and evidence. Keep a proposed project distinct from an observed project profile.', sources: ['lf-projects', 'lf-methodology', 'lf-faq'], limit: 'Project numbers and locations need project-specific verification; global counters do not identify a project.' },
    { id: 'audience-action', title: 'Choose one primary action for each audience', basis: 'Observed homepage audience routes; local content structure', confidence: 'high', decision: 'Use a community enquiry for a proposed space, a partnership conversation for collaborators, a sponsorship conversation for project funders, and giving links for individual supporters. Specify the audience, destination and next step.', sources: ['lf-home', 'lf-donate', 'lf-starting-squad', 'lf-contact'], limit: 'Verify current destinations and local-language routes. Campaign amounts and supporter programs are not permanent identity tokens.' },
    { id: 'partners', title: 'Keep partner attribution separate from the mark', basis: 'Observed partner groupings; local layout convention', confidence: 'medium', decision: 'Use a separate acknowledgement area with named roles. Keep the full love.fútbol logo clear, give other approved marks their own space and balance prominence optically. Use text placeholders until approved assets and relationships are supplied.', sources: ['lf-partners', 'lf-home'], limit: 'No fixed official partner-logo size ratio or fused co-brand lockup was recovered.' },
    { id: 'photography', title: 'Show context and credit the image', basis: 'Observed project storytelling; local editorial convention', confidence: 'high', decision: 'Use real community-led activity, the space and its ongoing use. Provide a concise caption with place, date and creator. Keep essential text off busy images. For before/after comparisons, identify both dates and the same location.', sources: ['lf-home', 'lf-methodology', 'lf-inclusion'], limit: 'Public images are research references, not a stock-photo licence; frames stay empty until suitable assets are provided.' },
    { id: 'community-voice', title: 'Attribute quotations precisely', basis: 'Observed homepage community voices', confidence: 'high', decision: 'Use a verified exact quotation with the speaker’s approved name or role, community, date and source. Identify any translation. Leave placeholder copy visibly instructional until it is replaced.', sources: ['lf-home', 'lf-culture'], limit: 'Do not invent testimonials or let a local quotation stand in for a measured population outcome.' },
    { id: 'metrics', title: 'Keep the definition with the number', basis: 'Observed impact counters; evidence-quality convention', confidence: 'high', decision: 'Pair every metric with its unit, geography or population, period, source and whether it is observed, estimated or a target. Use a dated source; distinguish visits, unique participants, annual reach and cumulative reach.', sources: ['lf-home', 'lf-governance'], limit: 'Inconsistent or undated site totals are not frozen into default assets.' },
    { id: 'languages', title: 'Preserve the identity across languages', basis: 'Observed English, Spanish and Brazilian Portuguese routes', confidence: 'high', decision: 'Keep love.fútbol unchanged. Preserve place-name accents, review translation with local speakers, adapt dates and numbers to the chosen locale, and keep each call to action in the destination language.', sources: ['lf-home', 'lf-es-home', 'lf-pt-home'], limit: 'The kit remains an English authoring interface; locale guidance and glyph coverage do not imply a complete translated UI.' },
    { id: 'site-quality', title: 'Use recurring design evidence, review content inconsistencies', basis: 'Cross-page source review', confidence: 'high', decision: 'Record conflicting captions, inherited return-link labels and placeholder controls as source-quality observations. Confirm names and destinations against stronger project text before publishing.', sources: ['lf-home', 'lf-projects'], limit: 'A visible website inconsistency is not an identity rule to reproduce.' }
  ]
}

const text = (value, x, y, size = 30, font = 'bold', colour = 'ink') => ({ type: 'text', text: value, x, y, size, font, colour })
const para = (value, x, y, width, size = 27) => ({ type: 'para', text: value, x, y, width, size, colour: 'ink' })
const rect = (x, y, width, height, fill, extra = {}) => ({ type: 'rect', x, y, width, height, fill, ...extra })
const logo = (x, y, width) => ({ type: 'logo', x, y, width, signature: 'full', colourway: 'positive' })
const nested = (id, x, y, width, height) => ({ type: 'nested', src: `templates/${id}`, x, y, width, height })

export const lovefutbolGuidancePages = viewBox => {
  const h = 380 * viewBox[3] / viewBox[2]
  const reserve = h / 4
  return [
    { name: 'Local sizing and spacing', title: 'Practical defaults you can apply', subtitle: 'These are local recommendations. Official minimum sizes and numeric clear space remain unverified.', elements: [
      rect(90, 300, 500, 385, 'off-white'),
      rect(150 - reserve, 365 - reserve, 380 + reserve * 2, h + reserve * 2, 'white', { stroke: 'green', dash: '7 6' }),
      logo(150, 365, 380),
      text('Reserve = one quarter of logo height', 90, 727, 24),
      text('Print: start at 32 mm', 700, 310, 36),
      para('Use 48 mm on report covers. Retain the document profile’s 8 mm reserve when it is larger than the proportional space.', 700, 370, 650, 28),
      text('Screen: start at 144 CSS px', 700, 545, 36),
      para('This is a conservative starting point for the primary mark. Review small secondary marks at actual size and proof printed output.', 700, 606, 650, 28),
      para('Keep the original proportions and red flag. The reserve is surrounding layout space; it does not change the logo canvas or its source paths.', 64, 840, 1260, 27)
    ] },
    { name: 'Project content pattern', title: 'Give each project a complete record', subtitle: 'A proposed brief and a documented project profile have different jobs.', elements: [
      nested('project-profile-a4', 64, 275, 425, 600),
      text('Place and people first', 590, 300, 34),
      para('Name the community, city and country. Add a verified project number only when the project source supports it. Record the period or project stage.', 590, 360, 760, 28),
      text('Show who shapes the space', 590, 530, 34),
      para('Describe local leadership, participation, access and ongoing care. Name partners by their role. Keep estimates and proposed activities explicit.', 590, 590, 760, 28),
      text('Keep a source trail', 590, 760, 34),
      para('Credit images and give dates and sources for factual claims. Project records, news and site labels can disagree; verify the relevant project.', 590, 820, 760, 26)
    ] },
    { name: 'Images, voices and evidence', title: 'Make the evidence easy to understand', subtitle: 'New comparison, quotation and metric layouts keep their context editable.', elements: [
      nested('presentation-comparison', 64, 280, 790, 445),
      text('Before and after', 920, 300, 34),
      para('Identify the same place, both dates and the image creator. A visual change does not establish every claimed social outcome.', 920, 360, 430, 27),
      text('Community voices', 920, 560, 34),
      para('Use an exact approved quotation, speaker role, place and source. Identify translated wording.', 920, 620, 430, 27),
      rect(64, 790, 1312, 125, 'cyan'),
      para('Metric cards need a measure, unit, geography, period and source. Label a target or estimate. Keep annual reach, unique participants and visits distinct.', 90, 832, 1250, 26)
    ] },
    { name: 'Audiences and languages', title: 'Make the next step relevant', subtitle: 'Website audiences inform the content; these layouts and copy structures are local choices.', elements: [
      text('Communities', 64, 300, 32), para('Describe a place, its priorities and local leadership. Use the current community-enquiry route.', 64, 355, 610, 27),
      text('Partners and sponsors', 770, 300, 32), para('Explain the proposed contribution and next conversation. Keep partner identities in a separate attribution area.', 770, 355, 600, 27),
      text('Individual supporters', 64, 560, 32), para('Choose the current giving program and destination. Keep donation amounts and anniversary campaigns out of permanent brand tokens.', 64, 615, 610, 27),
      text('English / español / português', 770, 560, 30), para('Keep love.fútbol unchanged. Preserve names and accents, allow natural wrapping, review translations locally and match the link’s language.', 770, 615, 600, 27),
      para('One primary action per layout. Verify its destination before publishing. The kit has editable content and multilingual guidance; its interface remains English.', 64, 867, 1260, 25)
    ] }
  ]
}

export const lovefutbolLogoSizeStudy = ctx => {
  const kit = createGuideKit(ctx)
  let art = kit.rect(0, 0, 1280, 690, 'white')
    + kit.text('Local logo-size study', 32, 45, 30, 'bold')
    + kit.text('Compare at 100% / 1 image pixel per CSS pixel. These are not official minimum sizes.', 32, 82, 18)
  for (const [i, width] of [96, 120, 144, 180, 240].entries()) {
    const x = 32 + i * 250
    art += kit.logo(x, 130, width, { signature: 'full', colourway: 'positive' })
    art += kit.text(`${width} CSS px`, x, 302, 20)
    if (width === lovefutbolAssumptions.logo.recommendedScreenWidthCssPx) art += kit.text('Suggested starting width', x, 330, 15, 'bold')
  }
  art += kit.rect(0, 360, 1280, 330, 'charcoal')
  for (const [i, width] of [96, 120, 144, 180, 240].entries()) {
    const x = 32 + i * 250
    art += kit.logo(x, 410, width, { signature: 'full', colourway: 'reverse' })
    art += kit.text(`${width} CSS px`, x, 585, 20, 'body', 'white')
  }
  art += kit.text('A scaled preview cannot establish physical print legibility. Make a proof for the intended process.', 32, 650, 18, 'body', 'white')
  return svgDocument(ctx, 1280, 690, art, 'love.fútbol local size-study specimens / not official minima')
}

export const lovefutbolReadme = brand => `# love.fútbol — researched application kit

Sources reviewed 2026-10-30. Version ${brand.version} preserves original vector logo geometry, extends the live-site research and supplies ${brand.templates.length} editable local layouts. The evidence and practical assumptions are labelled separately. This is not an organization-issued standards manual.

## What is included

- Complete logo in black/red and white/red, with the original red flag retained. SVG, PNG and PDF exports use the preserved source paths.
- Observed digital colours, including the active homepage cyan accent; Bahianita and Red Hat Text with original font files, OFL notices and source hashes.
- ${brand.guide.pages.length} guide pages; Letter/A4 stationery, proposed project briefs and documented project profiles; six presentation layouts; four social layouts and an email signature.
- Editable Word publications and stationery, a six-slide PowerPoint and HTML email signature through the existing export pipeline.
- Web tokens, CSS and a React full-logo component. The additional application guidance does not change the app into a translated website or add unsupported photo-upload controls.

## Evidence and practical choices

[Original research](RESEARCH.md) covers identity and artwork provenance. [Extended site research](SITE-RESEARCH.md) covers page patterns, audiences, language routes and source inconsistencies. [Application guide](APPLICATION-GUIDE.md) turns this evidence into twelve explicit local decisions, with sources and limits. The [source index](../reference/sources.json), [site evidence](../reference/site-visual-evidence.json), [content model](../reference/content-patterns.json) and [identity record](../reference/identity-rules.json) are included in the exported pack.

The vector source is love.fútbol’s 2025 guide contributed to U.S. Soccer. Its white/red artwork is preserved; the black/red variant changes only the main path fill to match the official website. See [extraction evidence](../reference/logo-extraction.json).

Bahianita is observed across several current pages, not only Projects. Some live project-detail H1 headings inherit DK Brush Crush, and H3 rules declare Acumin. Those commercial font files are not bundled. Annual reports and campaign pages use context-specific treatments. See [font sources](../fonts/source-manifest.json).

Local recommendations reserve one quarter of the complete logo height, start primary logos at 32 mm or 144 CSS px, and retain the report profile’s 48 mm artwork, 8 mm reserve and 20 mm margins. The [size specimens](logo-size-study.png) support visual review; the numbers are not official minima or a physical print proof. Dark text on green, light green, terracotta and cyan gives readable starter combinations.

## Rebuild and use

Run \`npm run make:lovefutbol\` to regenerate the definition, guide, local-assumption records, reference pages and instructions without network access. For an independent logo check, run \`python scripts/extract-lovefutbol-logo.py --help\`.

Use **Logos**, **Colour**, **Typography**, **Templates**, **Guide** and **Documents**. Replace every instructional placeholder. Add verified project information, dated metric definitions, exact approved quotations and suitable image files. Use the photo frames in exported SVG or PowerPoint for insertion; they are not an image-upload feature. Partner marks are supplied separately by their owners.

See [USE.md](../USE.md) for document and consumer integration instructions, and [validation](VALIDATION.md) for what was checked.
`

export const lovefutbolApplicationMarkdown = (brand, register) => {
  const sources = new Map(register.sources.map(source => [source.id, source]))
  const cite = ids => ids.map(id => {
    const source = sources.get(id)
    if (!source) throw new Error(`Application assumption references an unregistered source: ${id}`)
    return `[${source.title}](${source.url})`
  }).join(' · ')
  const contrast = (a, b) => {
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (values[0] + .05) / (values[1] + .05)
  }
  const rows = ['green', 'light-green', 'terracotta', 'cyan', 'off-white'].map(key => {
    const dark = contrast(brand.colours[key], brand.colours.charcoal)
    const white = contrast(brand.colours[key], brand.colours.white)
    return `| ${brand.colourNames[key]} | \`${brand.colours[key]}\` | ${dark.toFixed(2)}:1 | ${white.toFixed(2)}:1 |`
  }).join('\n')
  const rules = lovefutbolAssumptions.rules.map((rule, i) => `### ${i + 1}. ${rule.title}

**Decision:** ${rule.decision}

**Basis:** ${rule.basis}. Confidence in this proposed application: **${rule.confidence}**. This confidence describes the evidence and design judgment, not organizational approval.

**Limit:** ${rule.limit}

Sources: ${cite(rule.sources)}.
`).join('\n')
  return `# love.fútbol — practical application guide

Version ${brand.version} · reviewed 30 October 2026

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

The proportional reserve is about ${(25 * brand.symbol.viewBox[3] / brand.symbol.viewBox[2]).toFixed(2)}% of the logo width. At 48 mm wide this is ${(12 * brand.symbol.viewBox[3] / brand.symbol.viewBox[2]).toFixed(2)} mm; the document profile keeps its larger 8 mm reserve. This calculation uses the complete source-artwork bounds, including the flag.

## Twelve decisions and their evidence

${rules}
## Colour combinations for starter content

The following WCAG relative-luminance calculations use the exact RGB tokens. For normal text, the WCAG AA threshold is 4.5:1; large text has a 3:1 threshold. Logo artwork is exempt from that text criterion, but the kit still uses strong figure/background separation. These calculations check pairs, not whole-document accessibility. Source: ${cite(['w3c-contrast'])}.

| Surface | Hex | Charcoal \`#1D1D1B\` text | White text |
| --- | --- | ---: | ---: |
${rows}

Charcoal works for normal text on all five surfaces above. White is not a normal-text default on the accent colours. The live site sometimes uses cyan text against white; reproducing an observed value does not make every use accessible. For links on white, use the existing dark-green \`forest\` role and a visible text decoration. Red remains the logo flag detail in this kit; colour alone should not carry a status or instruction.

## Content models and template choices

Use a **project brief** for proposed work, an unsettled decision or a requested contribution. Use a **project profile** to document a specific place and its observed state. The profile carries location, date or period, local leadership, activities, stewardship, photograph credit and sources. Event date and article-update date are distinct facts.

Use the **comparison slide** for dated views of the same place. Use the **community-voice slide** for an exact, attributable statement. Use the **metric card** when the measure, period, place and evidence can be filled in together. Use the **call-to-action card** to present one audience, action and reviewed destination. The existing evidence slide remains useful for a sourced chart or image with an explanation of its limits.

The [content model](../reference/content-patterns.json) records editable fields and audience routes. It is authoring guidance, not a data feed or a guarantee that every source page contains complete information. English, Spanish and Brazilian Portuguese are observed website locales. Preserve \`love.fútbol\` and proper names in every locale; have translated claims and destinations reviewed locally. Empty placeholders never represent real outcomes or endorsements.

## What this research does not settle

No organization-issued current manual, official numerical logo minimum, fixed clear-space ratio, Pantone/CMYK recipe, mandatory partner arrangement or complete approved template family was recovered. The source record retains these as unresolved rather than changing their status when a local default is added. Original logo paths, licence files and public evidence remain independently auditable.
`
}
