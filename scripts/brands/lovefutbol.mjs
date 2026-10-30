// Rebuild love.fútbol from preserved vector paths and dated public-source evidence.
// This is a researched application kit, not an official brand standards manual.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { validateBrand } from '../../src/engine/brand.js'
import { logoDocument } from '../../src/engine/artwork.js'
import { guidePages } from '../../src/engine/guide.js'
import { documentationMarkdown } from '../../src/engine/documentation.js'
import { createNodeRenderer } from '../../src/export/node.js'
import { loadBrandFontsFromDisk } from '../../src/fonts/node.js'
import { menuLogo } from '../../src/app/masthead.js'
import { updateManifest } from './common.mjs'
import { lovefutbolTemplates } from './lovefutbol-templates.mjs'

const folder = new URL('../../brands/lovefutbol/', import.meta.url).pathname
for (const dir of ['docs', 'reference']) mkdirSync(`${folder}${dir}`, { recursive: true })
const read = path => JSON.parse(readFileSync(`${folder}${path}`, 'utf8'))
const write = (path, value) => writeFileSync(`${folder}${path}`, value)
const json = value => `${JSON.stringify(value, null, 2)}\n`
const retrieved = '2026-10-30'
const geometry = read('reference/logo-geometry.json')
const { viewBox, markup } = geometry
if (geometry.pathCount !== 13 || (markup.match(/\{logo\}/g) ?? []).length !== 12 || !markup.includes('#ED1C24') || /<(?:image|text|script|foreignObject)\b/i.test(markup)) {
  throw new Error('Expected the 13 preserved source paths, including a fixed red flag. Recheck the extraction record.')
}
const sourceUrl = 'https://www.ussoccer.com/soccer-forward/resource-hub/best-practices-for-community-driven-sport-spaces'
const applications = lovefutbolTemplates()
const font = (file, weight = 400, style = 'normal') => ({
  family: 'Red Hat Text', stack: '"Red Hat Text", Arial, sans-serif', office: 'Red Hat Text',
  weight, style, file: `fonts/RedHatText-${file}.ttf`, web: `fonts/RedHatText-${file}.ttf`,
  license: 'fonts/RedHatText-OFL.txt', label: `Red Hat Text ${file}`,
  usage: style === 'italic' ? 'Document emphasis; a bundled local application choice.' : 'Observed website body and supporting type. SIL Open Font License.',
  note: 'Original static upstream font. The website observation does not establish a universal corporate typography rule.'
})
const display = {
  family: 'Bahianita', stack: '"Bahianita", "Red Hat Text", sans-serif', office: 'Bahianita', weight: 400,
  file: 'fonts/Bahianita-Regular.ttf', web: 'fonts/Bahianita-Regular.ttf', license: 'fonts/Bahianita-OFL.txt',
  label: 'Bahianita Regular', usage: 'Observed Projects-page display headings; use for short, large headings.',
  note: 'The Projects page explicitly uses Bahianita. Other site headings declare DK Brush Crush or Acumin; those commercial faces are not bundled.'
}
const rect = (x, y, width, height, fill) => ({ type: 'rect', x, y, width, height, fill })
const text = (value, x, y, size = 30, font = 'bold', colour = 'ink') => ({ type: 'text', text: value, x, y, size, font, colour })
const para = (value, x, y, width = 1240, size = 28, extra = {}) => ({ type: 'para', text: value, x, y, width, size, colour: 'ink', ...extra })
const logo = (x, y, width, colourway = 'positive') => ({ type: 'logo', x, y, width, signature: 'full', colourway })
const nested = (id, x, y, width, height) => ({ type: 'nested', src: `templates/${id}`, x, y, width, height })

const brand = {
  id: 'lovefutbol', name: 'love.fútbol', version: '1.0', displayVersion: '1.0',
  source: 'Original logo paths from love.fútbol’s 2025 Community-Driven Sport Spaces guide, published by U.S. Soccer; website styling observed 30 October 2026; official About, FAQ, history, culture and report resources.',
  status: 'Researched application kit. Source vector geometry is preserved; website colours and typography are observed usage. Templates and spacing are local proposals, not an official love.fútbol standards manual or endorsement.',
  officialResourcesNote: 'Published identity context and original source material. Website observations, preserved artwork and local application choices are documented separately in the research record.',
  officialResources: [
    { title: 'About love.fútbol', url: 'https://www.lovefutbol.org/about-us', format: 'Official website', note: 'Purpose and the meaning of the imperfect grassroots pitch.' },
    { title: 'Name, dot and community model', url: 'https://www.lovefutbol.org/faq', format: 'Official FAQ', note: 'Naming and the role of community ownership.' },
    { title: 'Community-Driven Sport Spaces, 2025', url: sourceUrl, format: 'love.fútbol contribution to U.S. Soccer', note: 'Source of the preserved full-logo vector paths; a methodology guide, not a brand manual.' },
    { title: 'Projects: observed website styling', url: 'https://www.lovefutbol.org/projects', format: 'Official website', note: 'Bahianita display headings, Red Hat Text and green/terracotta page treatments.' },
    { title: 'Governance, culture and annual reports', url: 'https://www.lovefutbol.org/governance-transparency', format: 'Official resource collection', note: 'Voice, values and dated reports; reports use different design treatments.' }
  ],
  colours: { green: '#489D60', 'light-green': '#88C59B', terracotta: '#D17F2D', 'off-white': '#F5F4EF', charcoal: '#1D1D1B', forest: '#081913', black: '#000000', white: '#FFFFFF', red: '#ED1C24', amber: '#F5A300' },
  colourNames: { green: 'Website green', 'light-green': 'Projects light green', terracotta: 'Projects terracotta', 'off-white': 'Website off-white', charcoal: 'Charcoal text', forest: 'Dark-green body text', red: 'Source logo flag red', amber: 'Mobile menu amber' },
  roles: { ink: 'charcoal', paper: 'white', muted: 'charcoal', primary: 'green', light: 'off-white', reverse: 'white', line: 'light-green', rule: 'green', link: 'forest' },
  logoColours: ['black', 'white'], rasterColours: ['black', 'white'],
  print: { note: 'Palette values are observed digital usage, not published print specifications. No official Pantone or CMYK recipes were verified. Any automatic conversion shown by Brandkit is an approximation; request production specifications for print.' },
  fonts: { body: font('Regular'), regular: font('Regular'), bold: font('Bold', 700), italic: font('Italic', 400, 'italic'), display, displayRegular: display, label: font('Regular') },
  typography: {
    headlines: { family: 'Bahianita', weight: 400, trackingEm: 0 },
    body: { family: 'Red Hat Text', weight: 400 }, labels: { family: 'Red Hat Text', weight: 400, trackingEm: 0, textTransform: 'none' },
    note: 'This kit follows the observed Projects-page Bahianita / Red Hat Text pairing. Global H1 rules also declare DK Brush Crush and H3 rules Acumin Pro Condensed; no commercial font binaries are included. The outlined logo lettering is separate artwork.'
  },
  symbol: { name: 'Complete source love.fútbol logo', viewBox, markup },
  signatures: [{ id: 'full', label: 'Complete pitch and wordmark', padding: 0,
    use: 'Preserve the complete source geometry and red flag. Positive black/red matches observed website usage; reverse white/red is the source PDF treatment.',
    elements: [{ type: 'art', bounds: viewBox, markup }] }],
  colourways: {
    // Only {logo} consumes this paint. The red flag is a fixed literal in the source markup.
    // The existing masthead can therefore switch the main artwork for light/dark app chrome.
    positive: { label: 'Black with red flag', all: 'black', ground: 'white' },
    reverse: { label: 'White with red flag', all: 'white', ground: 'charcoal' }
  },
  defaultColourway: 'positive',
  logoPolicy: { allowedColours: ['black', 'white'], allowInheritedColour: false, standaloneSymbol: false,
    note: 'Conservative source-preservation controls for this kit. Only the complete black/red and white/red treatments are offered. The flag keeps its source red. No official minimum-size or numeric clear-space standard was found; local layouts reserve space without claiming an official rule.' },
  lockup: { canvasPadding: 0, clearspaceRecommendation: 'Keep the complete artwork clear and proportional. No source-verified numeric clear-space or minimum-width rule is recorded. Document layouts reserve 8 mm as a local application choice.' },
  copy: {
    tagline: 'More than a place to play', descriptor: 'Community-led places for play and connection',
    logoLabel: 'love.fútbol complete pitch and wordmark with red flag',
    svgDescription: 'love.fútbol source logo geometry from its 2025 U.S. Soccer resource. Original paths retained; black/red treatment follows the official website. Application kit, not a brand standards manual.',
    templateDescription: 'Editable local application informed by observed love.fútbol website styling. Placeholder content must be replaced with verified project information.'
  },
  patterns: [],
  templates: applications.templates, sets: applications.sets, documents: applications.documents,
  documentation: {
    defaultPurpose: 'report', publishedPurposes: ['report', 'brief', 'portfolio'],
    margins: { topMm: 20, rightMm: 20, bottomMm: 20, leftMm: 20 },
    typography: { title: { font: 'display', sizePt: 38, lineHeight: 1.1, colour: 'charcoal' }, heading1: { font: 'bold', sizePt: 20, colour: 'charcoal' }, heading2: { font: 'bold', sizePt: 13.5 }, body: { font: 'body', sizePt: 10.5, lineHeight: 1.45 }, label: { font: 'label', sizePt: 9, trackingEm: 0 } },
    colours: { accent: 'charcoal', tableHeader: 'light-green', tableHeaderText: 'charcoal' },
    logo: { widthMm: 48, clearSpaceMm: 8, options: { signature: 'full', colourway: 'positive' } },
    footer: { text: 'love.fútbol · Local document application' },
    affiliation: { note: 'Project, community and partner names are separate document text. Their inclusion does not create an official sub-logo or imply a confirmed partnership.' },
    examples: {
      report: { title: 'Community project report', subtitle: 'Local priorities, shared decisions and evidence', summaryTitle: 'Community priorities and progress', detailTitle: 'Process and participation', productName: 'Community project',
        introduction: 'Use this editable report to explain a specific community project, the people involved and the evidence available. Replace instructional copy with verified information and cite each result.',
        summary: 'Describe the priorities identified by local participants, the decisions taken together and what has changed during the stated reporting period.',
        summaryItems: ['Name the community and reporting period.', 'Describe local leadership and participation.', 'Separate verified outcomes from plans and estimates.'],
        detail: 'Record how residents and local organizations helped shape the project. Explain site selection, access, design choices, responsibilities and maintenance arrangements.',
        scope: 'State what the evidence covers, how it was collected and whose perspectives may be missing. Give dates and sources for all impact figures.',
        closingTitle: 'Shared responsibilities and next steps' },
      brief: { title: 'Community project brief', subtitle: 'Priorities, options and the next shared decision', summaryTitle: 'The decision to make together' },
      portfolio: { title: 'love.fútbol brand reference', subtitle: 'Source artwork, observed styling and local applications', summary: 'This reference separates the preserved logo, dated website observations and proposed application layouts. It does not establish organization approval or replace an official brand manual.' },
      product: { title: 'Community initiative overview', subtitle: 'Purpose, participation and proposed scope', productName: 'Initiative name', introduction: 'Describe the initiative and its evidence. Replace all example content and identify proposed work clearly.' }
    }
  },
  guide: { width: 1440, height: 1020,
    frame: { background: 'white', logo: { x: 64, y: 13, width: 110, signature: 'full', colourway: 'positive' }, header: 'LOVE.FÚTBOL / RESEARCHED APPLICATION KIT', footer: 'Public sources reviewed 30 October 2026 / Local applications v1.0' },
    pages: [
      { name: 'Identity and context', title: 'People, play and a shared place', subtitle: 'An evidence-based reference with local applications; no organization approval is implied.', elements: [
        logo(90, 310, 420), text('love.fútbol', 620, 302, 72, 'display'),
        para('The name connects passion and the game. Its dot represents a meeting point; the intentionally imperfect pitch reflects grassroots spaces made by people.', 620, 375, 730, 29),
        para('Describe communities as active partners and local leaders. Keep the complete logo and its custom lettering intact.', 620, 600, 730, 29),
        rect(64, 780, 1312, 108, 'light-green'), para('Identity context: official About and FAQ. Visual styling: observed website. Page layouts: local Brandkit proposals.', 90, 823, 1250, 25)
      ] },
      { name: 'Logo artwork', title: 'Preserve the source artwork', subtitle: 'Thirteen original vector paths; a red flag retained in both treatments.', elements: [
        logo(108, 315, 430), rect(750, 280, 610, 340, 'charcoal'), logo(815, 315, 480, 'reverse'),
        text('Website treatment: black and red', 95, 675, 28), text('PDF source treatment: white and red', 760, 675, 28),
        para('The vector comes from love.fútbol’s 2025 guide published by U.S. Soccer. A single translation normalizes the canvas; the original paths and proportions remain intact.', 64, 748, 1250, 26),
        para('No isolated pitch, retyped wordmark, arbitrary recolours or invented favicon is generated. Official minimum size and numeric clear space remain unverified.', 64, 850, 1250, 24)
      ] },
      { name: 'Digital palette', title: 'Colours observed on the website', subtitle: 'Use accents as surfaces and emphasis; keep small text dark and readable.', elements: [
        ...[['green', 'Website green', '#489D60'], ['light-green', 'Projects light green', '#88C59B'], ['terracotta', 'Projects terracotta', '#D17F2D'], ['off-white', 'Website off-white', '#F5F4EF']].flatMap(([key, label, hex], i) => [rect(64 + i * 336, 285, 304, 165, key), text(label, 64 + i * 336, 492, 24), text(hex, 64 + i * 336, 531, 25, 'body')]),
        para('Supporting values: charcoal #1D1D1B, dark-green body text #081913 and mobile-menu amber #F5A300. The logo uses black/white with source flag red #ED1C24.', 64, 620, 1250, 28),
        para('White text on green, terracotta or light green does not reach 4.5:1. These templates use charcoal text on those accents. Verify the final pair and type size in Colour.', 64, 745, 1250, 28),
        para('No official Pantone or CMYK recipes were found. Website colours are observations, not print specifications.', 64, 875, 1250, 23)
      ] },
      { name: 'Typography', title: 'Keep the type roles distinct', subtitle: 'Original font files under the SIL Open Font License are included.', elements: [
        text('Bahianita', 64, 330, 90, 'display'), para('Observed on the Projects page’s large country headings. Use for short display copy; this kit does not claim it is the only headline typeface.', 600, 290, 740, 27),
        text('Red Hat Text', 64, 525, 48), para('Observed body, navigation and supporting type. Regular and Bold set these applications; Italic is an additional document-emphasis choice.', 600, 465, 740, 27),
        para('Other site rules declare DK Brush Crush for H1 and Acumin Pro Condensed for H3. Those commercial font files are not bundled. The 2024 and 2025 reports use other type combinations.', 64, 675, 1250, 28),
        para('The logo’s custom wordmark is vector artwork. Never replace it with Bahianita, Red Hat Text or typed letters.', 64, 850, 1250, 28)
      ] },
      { name: 'Language and voice', title: 'Write with community agency', subtitle: 'Editorial recommendations derived from the official mission, FAQ and culture resources.', elements: [
        text('Keep the name intact', 64, 295, 32), para('Use love.fútbol in running copy: lower case, a dot, and an accented ú. Use lovefutbol only where URLs or file identifiers require it.', 64, 352, 610, 28),
        text('Describe participation', 770, 295, 32), para('Name local leaders, shared decisions and ongoing responsibilities. Make the community’s role visible in the story.', 770, 352, 600, 28),
        text('Support every impact claim', 64, 595, 32), para('Give the measure, period, geography and source. Do not turn illustrative project placeholders into reported achievements.', 64, 652, 610, 28),
        text('Respect language and context', 770, 595, 32), para('Retain people’s names and place names accurately. Review translations locally. Use consented photography and meaningful captions.', 770, 652, 600, 28)
      ] },
      { name: 'Document applications', title: 'Useful pages for community projects', subtitle: 'Local layouts informed by the website; not recovered official stationery.', elements: [
        nested('letterhead-letter', 64, 275, 370, 480), nested('project-brief-letter', 535, 275, 370, 480),
        para('Letter and A4 stationery and project briefs. Use the Documents editor for flowing reports, decision briefs and brand references with editable Word output.', 980, 310, 385, 27),
        para('Add verified local information and sources. The 48 mm document logo, 8 mm reserved space and 20 mm margins are local defaults, not published brand rules.', 64, 835, 1250, 27)
      ] },
      { name: 'Presentation and digital', title: 'Carry the same identity into each format', subtitle: 'Editable slide, social and email applications with explicit placeholders.', elements: [
        nested('presentation-cover', 64, 275, 750, 422), nested('social-post', 910, 275, 430, 430),
        para('Four slide layouts support an opening, section break, content and evidence. Social layouts and email signatures keep contact and project information editable.', 64, 790, 1250, 28),
        para('Use approved project photography and captions. Partner logos and endorsements need separate confirmation.', 64, 895, 1250, 23)
      ] },
      { name: 'Sources and open questions', title: 'Keep evidence with the assets', subtitle: 'The research record separates published facts, observed implementations and local choices.', elements: [
        text('Preserved and documented', 64, 290, 34), para('Original vector paths and source PDF. Official website logo reference. Sanitized Projects-page evidence. Source URLs and hashes. Original open-licence font files.', 64, 355, 610, 28),
        text('Still unverified', 770, 290, 34), para('A current official brand standards manual; minimum sizes; numeric clear space; print recipes; partner lockup rules; official stationery and motion guidance.', 770, 355, 600, 28),
        para('Research: docs/RESEARCH.md. Source index: reference/sources.json. Logo extraction and comparison: reference/logo-extraction.json. Font origins: fonts/source-manifest.json.', 64, 655, 1250, 27),
        para('Rebuild with npm run make:lovefutbol. Update source evidence before changing a claimed brand rule. Public availability does not grant blanket permission for trademarks or photography.', 64, 810, 1250, 27)
      ] }
    ]
  },
  web: { componentName: 'LoveFutbolLogo', symbolComponentName: 'LoveFutbolFullLogo', cssPrefix: 'lovefutbol', icons: false,
    intro: { eyebrow: 'Source artwork and observed website styling', headline: 'love.fútbol\nBrand reference', body: 'Preserved logo geometry, documented digital colours and fonts, and editable local applications for community projects.', edition: 'Researched kit v{displayVersion}', typeSample: 'More than a\nplace to play', footer: 'Public sources / local applications / 30 October 2026' },
    landing: { eyebrow: 'love.fútbol', headline: 'More than a\nplace to play', body: 'A local application example. Replace this text with reviewed project information before publishing.', cta: 'Explore community projects', contactEyebrow: 'Project details', contactBody: 'Add verified local contact information.', footer: 'Local application example; organization approval is not implied.' }
  },
  files: []
}

const problems = validateBrand(brand)
if (problems.length) throw new Error(problems.join('\n'))
const fonts = await loadBrandFontsFromDisk(brand, folder)
if (fonts.failures.length) throw new Error(`Font loading failed: ${JSON.stringify(fonts.failures)}`)
write('reference/identity-rules.json', json({
  schema: 'brandkit/identity-rules/1', brandId: brand.id, reviewed: retrieved,
  published: { naming: 'love.fútbol', nameSource: 'https://www.lovefutbol.org/faq', logoMeaningSource: 'https://www.lovefutbol.org/about-us', vectorSource: sourceUrl },
  observed: { website: 'https://www.lovefutbol.org/projects', paletteEvidence: 'website-projects-brand-evidence.json', fonts: ['Bahianita project headings', 'Red Hat Text body and supporting type'], otherDeclaredFonts: ['DK Brush Crush H1', 'Acumin Pro Condensed H3'] },
  unverified: { officialBrandManual: null, minimumLogoWidthMm: null, numericClearSpace: null, pantone: null, cmyk: null, coBrandingRules: null, officialTemplates: null },
  implementation: { logoGeometry: 'Preserved 13 source vector paths; normalize canvas by translation only.', positiveTreatment: 'Source white body paths painted black to match observed official website logo; flag remains #ED1C24.', documentLogoWidthMm: 48, documentReservedSpaceMm: 8, documentMarginsMm: 20, templates: 'Local applications, not official stationery.', typography: 'Projects-page pairing; Italic added for document emphasis.', standaloneSymbol: false, faviconGeneration: false, partnerLogoGeneration: false, photographyIncluded: false }
}))
write('docs/README.md', `# love.fútbol — researched application kit\n\nSources reviewed ${retrieved}. This kit preserves original vector logo geometry, records the official identity story, and adds ${brand.templates.length} editable local layouts. It is not an official standards manual and does not imply organization approval.\n\n## What is included\n\n- Complete logo in black/red and white/red, with the original red flag retained. SVG, PNG and PDF exports use genuine vector source geometry.\n- Observed digital colours, Bahianita and Red Hat Text, their original font files and SIL Open Font License notices.\n- ${brand.guide.pages.length} guide pages; Letter/A4 stationery and project briefs; four presentation layouts; social and email applications.\n- Documents profiles for project reports, decision briefs, brand references and initiative overviews, with editable Word and printable HTML output.\n- CSS, tokens and a React full-logo component through the existing web export pipeline.\n\n## Evidence and choices\n\n[Research](RESEARCH.md) explains the name, identity, history, community model, visual sources and unresolved questions. [Source index](../reference/sources.json) records the research trail. [Identity rules](../reference/identity-rules.json) distinguishes published facts, observed implementation and local choices. [Logo extraction](../reference/logo-extraction.json) records the source PDF and path/raster comparison; [font sources](../fonts/source-manifest.json) record immutable upstream revisions and hashes.\n\nThe vector source is love.fútbol’s 2025 guide contributed to U.S. Soccer. Its white/red artwork is preserved; the black/red variant changes only the main path fill to match the official website. The website capture contains a different raster canvas and does not establish numerical clear space. The raw capture, request headers, tracking data and commercial font files are not part of the kit.\n\nThe Projects page uses Bahianita display headings and Red Hat Text. Other website styles declare DK Brush Crush and Acumin, and annual reports have different typography. The kit therefore describes its pairing as an observed application, not a universal official font specification.\n\nNo official minimum size, clear-space measurement, Pantone/CMYK recipe, partner lockup or stationery standard was found. The 48 mm document logo, 8 mm space and 20 mm margins are local choices. Dark text is used on green and terracotta surfaces because white on those accents does not satisfy 4.5:1 for normal text.\n\n## Rebuild and use\n\nRun \`npm run make:lovefutbol\` to regenerate the definition, guide, menu logo and use instructions from local source files; no network access is needed. For an independent logo extraction check, run \`python scripts/extract-lovefutbol-logo.py --help\`. The source PDF and original font files are preserved with hashes.\n\nUse the app’s **Logos**, **Colour**, **Typography**, **Templates**, **Guide** and **Documents** views. Replace all project, contact and image placeholders. Keep local communities central in the copy, preserve the dot and accent in love.fútbol, and cite dated sources for every impact measure. Partner logos and project photographs are not bundled.\n\nSee [USE.md](../USE.md) for reusable document and consumer integration instructions.\n`)

// An offline visual reference uses the same artwork, palette and type as the app.
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const positiveLogo = logoDocument({ brand }, { signature: 'full', colourway: 'positive' })
const reversedLogo = logoDocument({ brand }, { signature: 'full', colourway: 'reverse' })
write('docs/brand-details.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>love.fútbol — brand reference</title><style>
@font-face{font-family:RedHat;src:url('../fonts/RedHatText-Regular.ttf')}@font-face{font-family:RedHat;src:url('../fonts/RedHatText-Bold.ttf');font-weight:700}@font-face{font-family:Bahianita;src:url('../fonts/Bahianita-Regular.ttf')}
*{box-sizing:border-box}body{margin:0;color:#1d1d1b;background:#f5f4ef;font:17px/1.65 RedHat,Arial,sans-serif}header{background:#88c59b;padding:48px max(24px,calc((100vw - 1120px)/2))}header>svg{width:200px;height:auto}h1,h2{font-family:Bahianita,sans-serif;font-weight:400;line-height:1.1}h1{font-size:clamp(64px,10vw,120px);margin:32px 0 20px}h2{font-size:56px;margin:0 0 24px}h3{line-height:1.3}p{max-width:820px}main{max-width:1168px;margin:auto;padding:48px 24px}section{padding:40px 0;border-bottom:1px solid #489d60}.eyebrow{letter-spacing:.05em;text-transform:uppercase;font-size:12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}.card{background:white;padding:28px}.logo{display:grid;place-items:center;min-height:260px}.logo svg{width:min(100%,340px);height:auto}.dark{background:#1d1d1b;color:white}.swatch{height:110px;border:1px solid #1d1d1b20}.palette{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:24px}.palette h3{font-size:16px;margin-bottom:4px}a{color:#081913;text-decoration-thickness:2px}li{margin:12px 0}.notice{border-left:5px solid #d17f2d;padding:20px 24px;background:white}code{font-size:.9em;overflow-wrap:anywhere}footer{padding:32px 0;font-size:14px}.sample{font:72px/1.15 Bahianita,sans-serif}.body-sample{font-size:26px}@media print{header{padding:24px}main{padding:0}.card,section{break-inside:avoid}h1{font-size:64px}}
</style></head><body><header>${positiveLogo}<p class="eyebrow">Sources reviewed ${retrieved} · Local application kit 1.0</p><h1>More than a<br>place to play</h1><p>Original vector artwork, observed website styling and useful document applications for love.fútbol.</p></header><main><p class="notice">This is a researched reference, not an official brand standards manual. Website observations and local layout choices are identified separately; organization approval is not implied.</p><section><h2>The complete identity</h2><div class="grid"><div class="card logo">${positiveLogo}</div><div class="card logo dark">${reversedLogo}</div></div><p>The 13 original paths come from love.fútbol’s 2025 guide published by U.S. Soccer. Their geometry is preserved. Black/red matches the official website; white/red comes from the PDF source. The red flag remains unchanged.</p><p>The official About and FAQ explain the imperfect grassroots pitch and the dot as a meeting point. Keep the lowercase name and accent: <strong>love.fútbol</strong>.</p></section><section><h2>Observed digital colour</h2><div class="palette">${['green', 'light-green', 'terracotta', 'off-white', 'charcoal', 'forest', 'red', 'amber'].map(key => `<div><div class="swatch" style="background:${brand.colours[key]}"></div><h3>${escape(brand.colourNames[key])}</h3><code>${brand.colours[key]}</code></div>`).join('')}</div><p>These are observed website values and the source logo red, not a print specification. Use dark text on the accent surfaces. No official Pantone or CMYK recipes were verified.</p></section><section><h2>Type with a clear role</h2><div class="grid"><div class="card"><p class="sample">Places to play</p><h3>Bahianita</h3><p>Observed on Projects-page display headings. Short, large titles keep its condensed character legible.</p></div><div class="card"><p class="body-sample">Communities shape their own spaces.</p><h3>Red Hat Text</h3><p>Observed body and supporting type. Original Regular, Bold and Italic fonts are included with the SIL Open Font License.</p></div></div><p>Other site headings declare DK Brush Crush and Acumin Pro Condensed; those commercial font files are not bundled. Annual reports use different type combinations. The logo lettering remains original vector artwork.</p></section><section><h2>Applications that can be edited</h2><p>${brand.templates.length} native layouts support stationery, community project briefs, four presentation slides, social posts and email. The existing Documents editor also supplies reports, briefs and brand references in Letter and A4.</p><p>These page layouts are local proposals. Replace placeholders with verified community names, dates, project details and consented imagery. The 48 mm report logo, 8 mm reserved space and 20 mm margins are local defaults.</p></section><section><h2>Research and source record</h2><p><a href="RESEARCH.md">Read the full research dossier</a> · <a href="../reference/sources.json">Source index</a> · <a href="../reference/logo-extraction.json">Vector extraction evidence</a> · <a href="../USE.md">Use and rebuild instructions</a></p><ul>${brand.officialResources.map(item => `<li><a href="${escape(item.url)}">${escape(item.title)}</a> — ${escape(item.note)}</li>`).join('')}</ul><p class="notice">Still unverified: a current official brand manual, logo minimum sizes, numeric clear space, print recipes, partner lockups, official stationery and motion guidance.</p></section><footer>love.fútbol trademarks and source artwork remain their owners’ property. Public availability does not grant blanket rights to trademarks, photographs or partner identities.</footer></main></body></html>\n`)

// Keep a review image in the PR; it is rendered from the very same guide definition.
const renderer = await createNodeRenderer()
write('docs/preview.png', await renderer.png(guidePages({ brand, fonts })[0].render(), 1440))
const collect = (relative = '') => readdirSync(`${folder}${relative}`, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? collect(`${relative}${entry.name}/`) : [`${relative}${entry.name}`])
brand.files = [...collect().filter(path => /^(fonts|reference|docs)\//.test(path)), 'USE.md'].sort()
write('brand.json', json(brand))
write('logo-menu.svg', menuLogo(brand, fonts))
write('USE.md', documentationMarkdown(brand))
updateManifest(brand)
console.log(`love.fútbol: ${applications.templates.length} templates, ${applications.documents.length} native documents, ${brand.guide.pages.length} guide pages; ${geometry.pathCount} original logo paths.`)
