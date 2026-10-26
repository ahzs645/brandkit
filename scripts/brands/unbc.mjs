// Rebuild the UNBC application kit from vendored, attributable source artwork.
// Source guidance: UNBC Graphics Standards Manual, February 2020, pp. 2–9 and 18.
// The full source logo remains one fixed artwork; all document layouts are local extensions.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { validateBrand } from '../../src/engine/brand.js'
import { logoDocument } from '../../src/engine/artwork.js'
import { loadBrandFontsFromDisk } from '../../src/fonts/node.js'
import { documentationMarkdown } from '../../src/engine/documentation.js'
import { menuLogo } from '../../src/app/masthead.js'
import { updateManifest } from './common.mjs'
import { unbcTemplates } from './unbc-templates.mjs'

const folder = new URL('../../brands/unbc/', import.meta.url).pathname
for (const dir of ['docs', 'reference', 'fonts', 'official-templates']) mkdirSync(`${folder}${dir}`, { recursive: true })
const write = (path, content) => writeFileSync(`${folder}${path}`, content)
const json = value => `${JSON.stringify(value, null, 2)}\n`
const hash = file => createHash('sha256').update(readFileSync(`${folder}${file}`)).digest('hex')
const BASE = 'https://www.unbc.ca/sites/default/files/sections/communications-and-marketing/'
const SOURCES = {
  guidance: 'https://www.unbc.ca/communications-and-marketing/logos-and-graphic-standards',
  manual: `${BASE}unbc_gsm_feb2020.pdf`,
  logos: `${BASE}Official-UNBC-Logo.zip`,
  vector: 'https://www.unbc.ca/themes/custom/unbc/gfx/logo-unbc-green.svg',
  templates: 'https://www.unbc.ca/communications-and-marketing/branded-templates'
}
const retrieved = '2026-10-26'
const suppliedSvg = readFileSync(`${folder}reference/logo-website.svg`, 'utf8')
const viewBox = suppliedSvg.match(/viewBox="([^"]+)"/)?.[1].split(/\s+/).map(Number)
if (!viewBox || viewBox.join(' ') !== '0 0 434.89 74.97') throw new Error('Unexpected UNBC source logo dimensions. Review the source artwork before regenerating.')
// Strip only document wrappers and style selectors. All original path/point coordinates survive.
const artwork = suppliedSvg.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  .replace(/<defs>[\s\S]*?<\/defs>/, '').replace(/<title>[\s\S]*?<\/title>/, '')
  .replaceAll('class="logo-evenodd"', 'fill="{logo}" fill-rule="evenodd"')
  .replaceAll('class="logo"', 'fill="{logo}"')
if (/<(?:text|style|script|image)\b/.test(artwork) || !artwork.includes('<polygon')) throw new Error('UNBC artwork must be self-contained original geometry.')
const width = viewBox[2], height = viewBox[3]
// The manual defines a geometric rule, not a numeric ratio. 16.05 is a conservative measurement
// of the B/N top difference in the supplied 434.89 × 74.97 SVG (B top approximately 16.02).
const clearSpaceRatio = 16.05 / width
const font = (file, weight = 400, style = 'normal') => ({
  family: 'TeX Gyre Heros', consumerFamily: 'Arial', officialFamily: 'Helvetica Neue', stack: '"Helvetica Neue", Arial, "TeX Gyre Heros", sans-serif',
  office: 'Arial', weight, style, capHeight: .729,
  file: `fonts/texgyreheros-${file}.otf`, web: `fonts/texgyreheros-${file}.otf`,
  label: `Arial fallback / open render substitute (${weight}${style === 'italic' ? ' italic' : ''})`,
  note: 'Helvetica Neue is the official face; Arial is the official alternative. TeX Gyre Heros is a bundled open rendering substitute, not a UNBC-approved typeface.'
})
const applications = unbcTemplates()
const gl = (text, x, y, colour = 'muted') => ({ type: 'label', text, x, y, colour, size: 16 })
const gt = (text, x, y, size = 42, colour = 'ink') => ({ type: 'text', text, x, y, size, font: 'bold', colour })
const gp = (text, x, y, width = 1260, size = 27, colour = 'ink') => ({ type: 'para', text, x, y, width, size, colour, line: 1.4 })
const logo = (x, y, width, colourway = 'green') => ({ type: 'logo', x, y, width, signature: 'official', colourway })
const nested = (id, x, y, width, height) => ({ type: 'nested', src: `templates/${id}`, x, y, width, height })
const rect = (x, y, width, height, fill, stroke) => ({ type: 'rect', x, y, width, height, fill, ...(stroke ? { stroke } : {}) })
const officialTemplates = [
  ['lhopt1official.docx', 'Official UNBC letterhead', 'Original UNBC template supplied by Communications and Marketing.'],
  ['lhopt3officialaddress.docx', 'Official UNBC letterhead with address', 'Original UNBC template supplied by Communications and Marketing.'],
  ['documentcoverunbcgreen.docx', 'Official UNBC green document cover', 'Original university cover template; retained without editing.'],
  ['documentcoverinteractive.docx', 'Official UNBC interactive document cover', 'Original university cover template; retained without editing.'],
  ['unbcpowerpointtemplate.pptx', 'Official UNBC PowerPoint template', 'Original university slide template; separate from the local four-layout presentation.']
]
const officialResources = [
  { title: 'UNBC logos and graphic standards', url: SOURCES.guidance, format: 'web', note: 'Current official landing page for identity resources.' },
  { title: 'Graphics Standards Manual February 2020', url: SOURCES.manual, localPath: 'reference/unbc-graphics-standards-2020.pdf', format: 'pdf', note: 'Source of the full-logo, colour, clear-space, size and typeface rules.' },
  { title: 'Official UNBC logo download', url: SOURCES.logos, format: 'zip', note: 'Original EPS and raster masters. No artwork has been retyped or rearranged.' },
  { title: 'Official branded template catalogue', url: SOURCES.templates, format: 'web', note: 'University-supplied document and presentation originals.' },
  ...officialTemplates.map(([file, title, note]) => ({ title, url: `${BASE}${file}`, localPath: `official-templates/${file}`, format: file.split('.').at(-1), note }))
]
const brand = {
  id: 'unbc', name: 'UNBC', version: '1.0', displayVersion: '1.0',
  source: `University of Northern British Columbia, Graphics Standards Manual February 2020 (${SOURCES.manual}), original official website vector (${SOURCES.vector}) and official logo/template downloads. Retrieved ${retrieved}.`,
  status: 'Official source artwork and published identity rules with local document applications. Department names are ordinary document text; custom sub-logos require artwork supplied by UNBC Communications and Marketing.',
  organization: {
    name: 'University of Northern British Columbia', shortName: 'UNBC', kind: 'university',
    naming: { mode: 'document-text', levels: ['department', 'subdepartment'], sourceUrl: SOURCES.manual,
      note: 'Use verified department and subdepartment names as document text, clearly separate from the university logo. Communications and Marketing supplies official departmental brand extensions; this kit does not create approved sub-logos.' }
  },
  brandArchitecture: { relatedBrands: [
    { id: 'sparklab', label: 'SPARK Lab', relationship: 'UNBC lab', note: 'A separate identity already in this kit; inclusion does not establish an approved UNBC sub-logo.' },
    { id: 'overtheedge', label: 'Over the Edge', relationship: 'Independent student newspaper', note: 'Associated with the UNBC community; not a university department.' }
  ] },
  officialResources,
  colours: { green: '#035642', gold: '#B79527', black: '#000000', white: '#FFFFFF', muted: '#4D4D4D', line: '#D9D9D9', light: '#F2F2F2' },
  colourNames: { green: 'UNBC Green', gold: 'UNBC Gold', black: 'Black', white: 'White', muted: 'Document text grey', line: 'Document rule grey', light: 'Document panel grey' },
  roles: { ink: 'black', paper: 'white', muted: 'muted', primary: 'green', light: 'light', reverse: 'white', line: 'line', rule: 'line' },
  logoColours: ['green', 'black', 'white'], rasterColours: ['green', 'black', 'white'],
  print: { pantone: { green: '343 C / 3435 U', gold: '125 C / 117 U' }, cmyk: { green: 'C95 M15 Y62 K58', gold: 'C8 M31 Y100 K19' },
    note: 'Official recipes: Graphics Standards Manual p. 8. Neutral document greys are local layout defaults, not additions to the official university palette. Gold is an accent and must never colour the logo. The secondary university palette is reserved for Communications and Marketing.' },
  fonts: { body: font('regular'), regular: font('regular'), bold: font('bold', 700), display: font('bold', 700), displayRegular: font('regular'), label: font('regular'), italic: font('italic', 400, 'italic'), boldItalic: font('bolditalic', 700, 'italic') },
  typography: { headlines: { family: 'Arial', weight: 700, trackingEm: 0 }, body: { family: 'Arial', weight: 400 }, labels: { family: 'Arial', weight: 400, trackingEm: 0, textTransform: 'none' }, note: 'Helvetica Neue is official; Arial is the recommended alternative. Packaged TeX Gyre Heros only supplies portable preview/outlining and PDF rendering.' },
  symbol: { name: 'Complete official UNBC logo', viewBox, markup: artwork },
  signatures: [{ id: 'official', label: 'Official full logo', use: 'Required for official documents and external audiences.', padding: 0, elements: [{ type: 'art', bounds: [0, 0, width, height], markup: artwork }] }],
  colourways: { green: { label: 'UNBC Green on white', all: 'green', ground: 'white' }, black: { label: 'Black for monochrome reproduction', all: 'black', ground: 'white' }, white: { label: 'White on UNBC Green', all: 'white', ground: 'green' } },
  defaultColourway: 'green',
  lockup: { canvasPadding: 0, minimumHorizontalWidthMm: 38.1, minimumHorizontalWidthPx: 144,
    clearspaceRecommendation: 'Reserve the vertical distance between the top of B and the top of N on every side of the complete logo, including to page edges. This source artwork is measured conservatively as 16.05/434.89 of its visible width.' },
  logoPolicy: { allowedColours: ['green', 'black', 'white'], allowInheritedColour: false, standaloneSymbol: false, minimumWidthMm: 38.1, clearSpaceRatio,
    note: 'Preserve the full logo and its proportions. Green is used only on white; black is for black-only reproduction on a white or light ground; white is preferred on UNBC Green. Gold, tints, rearrangements, separated lettering and generic small icons are excluded.' },
  fields: {
    department: { label: 'Department or academic unit', placeholder: '', multiline: true },
    subdepartment: { label: 'Subdepartment or team', placeholder: '', multiline: true },
    author: { label: 'Author or contact name', placeholder: '[Name]' },
    'author-role': { label: 'Author or contact role', placeholder: '[Role]' },
    'document-date': { label: 'Document date', placeholder: '[Date]' },
    'document-reference': { label: 'Document reference or version', placeholder: '[Reference or version]' },
    'contact-email': { label: 'Email address', placeholder: '[Email]' },
    'contact-website': { label: 'Website', placeholder: '[Web address]' }
  },
  copy: { svgDescription: 'Complete official University of Northern British Columbia artwork. Original path geometry retained; green normalized to the published #035642 identity recipe.',
    logoLabel: 'University of Northern British Columbia official full logo', motifLabel: 'Complete UNBC logo, not an isolated symbol',
    templateDescription: 'Local editable document application using official UNBC artwork. Department and subdepartment names remain separate document text.',
    tagline: 'University of Northern British Columbia', descriptor: 'Official identity resources and document applications' },
  templates: applications.templates, sets: applications.sets, documents: applications.documents,
  documentation: {
    defaultPurpose: 'report', publishedPurposes: ['report', 'portfolio', 'brief'],
    margins: { topMm: 20, rightMm: 20, bottomMm: 20, leftMm: 20 },
    typography: { title: { font: 'bold', sizePt: 30, lineHeight: 1.12 }, heading1: { font: 'bold', sizePt: 22 }, heading2: { font: 'bold', sizePt: 14 }, body: { font: 'body', sizePt: 10.5, lineHeight: 1.4 }, label: { font: 'label', sizePt: 8.5, trackingEm: 0 } },
    logo: { widthMm: 55, clearSpaceMm: 8, options: { signature: 'official', colourway: 'green' } },
    affiliation: { mode: 'document-text', departmentSizePt: 12, subdepartmentSizePt: 10.5, lineHeight: 1.3, gapAfterMm: 5, maxCharacters: 180,
      note: 'Names are document metadata, not an official departmental sub-logo. Type sizes and page spacing are local report defaults; no official sub-logo sizing formula is claimed.' },
    footer: { text: 'University of Northern British Columbia' },
    examples: {
      report: { title: 'Research report', subtitle: 'Question methods findings and implications', summaryTitle: 'Research question and summary', detailTitle: 'Methods and scope', productName: 'Study design',
        introduction: 'Use this report to document a defined research question, the evidence examined and the findings it supports. Replace the instructional text with reviewed content and cite the source for each result.',
        summary: 'State the research question and principal finding. Explain why it matters, the population or setting examined, and the limits of the available evidence.',
        detail: 'Describe the study design, source data, collection period, preparation and analysis. Include the information needed to understand the result and reproduce the essential method.',
        scope: 'Describe inclusion and exclusion criteria, uncertainty and any limits on interpretation. Separate planned work from completed analysis.',
        closingTitle: 'Implications and next steps' },
      portfolio: { title: 'UNBC brand portfolio', subtitle: 'Organizational relationships identity resources and applications' },
      brief: { title: 'Decision brief', subtitle: 'Evidence options and the decision requested' }
    }
  },
  guide: { width: 1440, height: 1020, frame: { background: 'white', logo: { x: 64, y: 30, width: 250, signature: 'official', colourway: 'green' }, header: 'UNBC / IDENTITY AND APPLICATIONS', footer: 'UNBC / Source guidance February 2020 / Kit applications v1.0' }, pages: [
    { name: 'Identity', title: 'University of Northern British Columbia', subtitle: 'One complete official logo for documents and external audiences.', elements: [logo(96, 285, 1200), gp('The original university logo is retained as fixed vector artwork. Use the complete logo on official documents and material intended for external audiences.', 64, 590, 1250, 31), gp('This kit pairs official identity resources with local editable applications. Local page layouts do not establish university approval of a report or a departmental logo.', 64, 765, 1250, 27), gl('SOURCE: GRAPHICS STANDARDS MANUAL / PAGES 2 AND 18', 64, 935)] },
    { name: 'Size and clear space', title: 'Size the artwork and protect its space', subtitle: 'Official minimum width and geometric clear-space rule.', elements: [rect(100, 280, 1230, 285, 'light'), rect(144, 324, 1142, 197, 'white'), logo(144, 324, 1142), gp('Full logo: at least 38.1 mm (1.5 inches) wide. Width refers to visible artwork, excluding any surrounding blank space. Preserve the original aspect ratio.', 64, 630, 1250, 29), gp('On every side, reserve the difference between the top of B and the top of N. The supplied SVG measures approximately 0.03691 × full logo width: a 55 mm logo needs at least 2.03 mm clear. Documents reserve 8 mm as a local layout default.', 64, 776, 1250, 27), gl('SOURCE: MANUAL PAGES 3–4 / NUMERIC RATIO MEASURED FROM SOURCE ARTWORK', 64, 950)] },
    { name: 'Colour', title: 'Use green white and black for the logo', subtitle: 'Gold is an accent colour and never a logo colour.', elements: [logo(88, 298, 570), rect(730, 246, 640, 210, 'green'), logo(765, 298, 570, 'white'), gp('Green on white. White preferably on solid UNBC Green. Black only for black-only reproduction on white or a light ground. No tints or other logo colours.', 64, 525, 1250, 28), rect(64, 650, 560, 100, 'green'), rect(750, 650, 560, 100, 'gold'), gt('UNBC Green  #035642', 64, 805, 32), gt('UNBC Gold  #B79527', 750, 805, 32), gp('RGB 3, 86, 66\nCMYK 95, 15, 62, 58\nPantone 343 C / 3435 U', 64, 855, 580, 22), gp('RGB 183, 149, 39\nCMYK 8, 31, 100, 19\nPantone 125 C / 117 U', 750, 855, 580, 22)] },
    { name: 'Department names', title: 'Keep names separate from logo artwork', subtitle: 'Editable document hierarchy with no invented sub-logo approval.', elements: [logo(80, 280, 930), gt('Department or academic unit', 80, 540, 38), { type: 'text', text: 'Subdepartment or team', x: 80, y: 602, size: 33, font: 'body', colour: 'ink' }, gp('Enter verified names. Long names wrap at word boundaries; do not condense, stretch or rebuild the university logo. Omit a level when it does not apply.', 64, 708, 1250, 29), gp('Communications and Marketing supplies official department brand extensions. The manual provides examples but no public sizing algorithm. This document hierarchy is ordinary text and uses local 12 pt / 10.5 pt defaults.', 64, 842, 1250, 26)] },
    { name: 'Typography', title: 'Helvetica Neue with Arial as the alternative', subtitle: 'The logo always uses its original outlined artwork.', elements: [gl('OFFICIAL FAMILY', 64, 290), gt('Helvetica Neue', 64, 364, 68), gp('Use the licensed face where it is available. UNBC encourages variation in weight within the family.', 64, 442, 1250, 29), gl('OFFICIAL ALTERNATIVE', 64, 570), gt('Arial', 64, 640, 64), gp('Word and PowerPoint request Arial. The kit bundles open TeX Gyre Heros for reproducible previews and vector rendering; it is an implementation substitute, not a new official UNBC face.', 64, 730, 1250, 29), gl('SOURCE: GRAPHICS STANDARDS MANUAL / PAGE 9', 64, 935)] },
    { name: 'Reports and briefs', title: 'Explain the question evidence and decision', subtitle: 'Editable Letter and A4 applications for research and administration.', elements: [nested('report-cover-letter', 64, 270, 380, 492), nested('report-page-letter', 530, 270, 380, 492), nested('brief-letter', 996, 270, 380, 492), gp('Use the Documents editor for flowing reports, evidence figures, comparison tables, citations and editable Word masters. Use Templates for fixed stationery and graphic layouts.', 64, 850, 1250, 28)] },
    { name: 'Brand portfolio', title: 'Describe each relationship accurately', subtitle: 'University units and independent organizations have different relationships.', elements: [nested('portfolio-cover-letter', 64, 270, 380, 492), gp('The portfolio records a unit or initiative, its purpose, audience, organizational relationship, identity resources and applications.', 520, 295, 820, 30), gt('SPARK Lab', 520, 520, 38), gp('An existing UNBC lab identity in this kit. Its presence does not establish an approved departmental sub-logo.', 520, 577, 820, 27), gt('Over the Edge', 520, 730, 38), gp('An independent student newspaper associated with the UNBC community, not a university department.', 520, 787, 820, 27)] },
    { name: 'Presentations and digital', title: 'Keep the same identity across applications', subtitle: 'Local slide and announcement layouts preserve the university logo.', elements: [nested('presentation-cover', 64, 260, 720, 405), nested('presentation-evidence', 64, 710, 430, 242), nested('social-post', 900, 260, 460, 460), gp('Four editable slide layouts. Keep figures at a readable size, explain the evidence and retain source captions.', 550, 750, 790, 28), gp('Official university templates are also included unchanged in official-templates/.', 550, 875, 790, 25)] },
    { name: 'Sources and production', title: 'Keep official sources alongside local applications', subtitle: 'Original resources hashes and reproducible generators.', elements: [gp('Original university resources: full logo EPS/GIF files, official website vector, Graphics Standards Manual, two letterheads, two document covers and the PowerPoint template.', 64, 285, 1250, 30), gp('Local additions: report, decision brief and brand portfolio models; editable Letter and A4 stationery; four slide layouts; social announcement and HTML email signature; this guide and the portable consumer profile.', 64, 470, 1250, 30), gp('Source differences are recorded in reference/PROVENANCE.json. The website logo uses #00573D; generated artwork retains every original path but uses the manual’s #035642. The manual’s gold RGB 183,149,39 agrees with #B79527; the website table’s 183,149,3 does not.', 64, 670, 1250, 26), gp('Rebuild with npm run make:unbc. Review fonts, pagination and source content before sharing a finished document.', 64, 885, 1250, 26)] }
  ] },
  web: { componentName: 'UNBCLogo', symbolComponentName: 'UNBCFullLogo', cssPrefix: 'unbc', icons: false,
    intro: { eyebrow: 'University of Northern British Columbia', headline: 'UNBC\nIdentity and documents', body: 'Official full-logo artwork and source guidance, with editable department names, research reports, decision briefs and a brand portfolio.', edition: 'Kit v{displayVersion}', typeSample: 'Research and\ncommunication', footer: 'UNBC identity sources / local document applications' },
    landing: { eyebrow: 'University of Northern British Columbia', headline: 'UNBC identity\nand document resources', body: 'Explore source artwork, official standards and local document applications.', cta: 'Official UNBC resources', contactEyebrow: 'Source guidance', contactBody: 'unbc.ca/communications-and-marketing', footer: 'Official resources remain authoritative.' } },
  files: []
}

const problems = validateBrand(brand)
if (problems.length) throw new Error(problems.join('\n'))
const fonts = await loadBrandFontsFromDisk(brand, folder)
if (fonts.failures.length) throw new Error(`Fonts failed to load: ${JSON.stringify(fonts.failures)}`)
const resourceRecords = [
  { file: 'reference/logo-website.svg', url: SOURCES.vector, status: 'Original website bytes; original fill #00573D retained in this reference.' },
  { file: 'reference/unbc-graphics-standards-2020.pdf', url: SOURCES.manual, status: 'Original official manual, February 2020.' },
  ...['green', 'black', 'white'].flatMap(colour => ['eps', 'gif'].map(ext => ({ file: `reference/logo-${colour}.${ext}`, url: SOURCES.logos, archiveMember: `Official-UNBC-Logo/${colour[0].toUpperCase() + colour.slice(1)} UNBC Logo/logo_${colour}.${ext}`, status: 'Original file from the official logo archive; extracted without editing.' }))),
  ...officialTemplates.map(([file]) => ({ file: `official-templates/${file}`, url: `${BASE}${file}`, status: 'Original university template; unmodified.' }))
].map(item => ({ ...item, retrieved, bytes: readFileSync(`${folder}${item.file}`).length, sha256: hash(item.file) }))
const rules = {
  schema: 'brandkit/identity-rules/1', brandId: 'unbc', source: SOURCES.manual, sourceEdition: 'February 2020', retrieved,
  official: {
    fullLogo: { requiredFor: ['official university documents', 'external audiences'], minimumWidthMm: 38.1, printedPages: [2, 4] },
    lettermark: { minimumWidthMm: 12.7, permittedAudience: 'Internal or already familiar audiences; promotional clothing, merchandise and selected digital media.', includedAsSeparateAsset: false, printedPages: [2, 4] },
    clearSpace: { rule: 'Distance between the top of B and top of N on all sides, including page edges.', printedPage: 3 },
    logoColours: { green: { hex: '#035642', background: 'white only' }, black: { hex: '#000000', background: 'white or light', use: 'black-only applications' }, white: { hex: '#FFFFFF', background: 'prefer solid UNBC Green; other backgrounds must provide clarity' }, printedPage: 3 },
    palette: { green: { hex: '#035642', rgb: [3, 86, 66], cmyk: [95, 15, 62, 58], pantoneCoated: '343', pantoneUncoated: '3435' }, gold: { hex: '#B79527', rgb: [183, 149, 39], cmyk: [8, 31, 100, 19], pantoneCoated: '125', pantoneUncoated: '117', usage: 'accent only, never logo' }, secondaryPalette: 'Reserved for Communications and Marketing.', printedPages: [7, 8] },
    type: { primary: 'Helvetica Neue', alternative: 'Arial', printedPage: 9 },
    departmentLogos: { supplier: 'UNBC Communications and Marketing', publicSizingFormula: null, rule: 'Individual units do not create their own logos or unit identifiers.', printedPage: 5 },
    protectedArtwork: { rule: 'Do not alter proportions, colours, typography, parts or positions; do not isolate lettering or combine the logo with another logo.', printedPage: 18 }
  },
  implementation: {
    clearSpaceMeasurement: { sourceViewBox: viewBox, conservativeTopDifference: 16.05, ratioOfFullWidth: clearSpaceRatio, status: 'Measured from the supplied SVG; not a numeric ratio printed by UNBC.' },
    digitalMinimumWidthPx: { value: 144, status: '1.5 inches at 96 CSS pixels per inch; local web sizing rule, not a separately published pixel minimum.' },
    documentLayout: { logoWidthMm: 55, reservedClearSpaceMm: 8, marginsMm: 20, departmentPt: 12, subdepartmentPt: 10.5, bodyPt: 10.5, status: 'Local application defaults, not official letterhead or sub-logo dimensions.' },
    typography: { office: 'Arial', portableRenderer: 'TeX Gyre Heros', note: 'Open rendering substitute. No Helvetica Neue or Arial font program is redistributed.' },
    generatedSublogos: false, patternGeneration: false, crestOrHeraldicAssetsIncluded: false
  }
}
write('reference/PROVENANCE.json', json({ schema: 'brandkit/source-record/1', retrieved, resources: resourceRecords, transformations: [
  { input: 'reference/logo-website.svg', output: 'brand.json/signatures/official', changes: 'Remove the SVG wrapper, style selector definitions and title; replace logo class selectors with per-path colour placeholders; preserve all d and points values and the complete original arrangement.' },
  { input: 'reference/logo-website.svg', output: 'generated green artwork', changes: 'Replace website #00573D with the Graphics Standards Manual p. 8 official green #035642. Original bytes remain in reference/.' }
], discrepancies: [
  { topic: 'Green', websiteSvg: '#00573D', officialManual: '#035642', decision: 'Use the manual’s explicit digital colour recipe for generated artwork; retain website geometry and original source bytes.' },
  { topic: 'Gold RGB', websiteTable: [183, 149, 3], officialManual: [183, 149, 39], hex: '#B79527', decision: 'Use the manual RGB, which agrees with the hex value on both sources.' }
] }))
write('reference/identity-rules.json', json(rules))
for (const colourway of ['green', 'black', 'white']) write(`reference/logo-${colourway}.svg`, logoDocument({ brand }, { signature: 'official', colourway }))

write('reference/README.md', `# UNBC source record\n\nRetrieved ${retrieved}. The source of record is the [UNBC identity resource page](${SOURCES.guidance}) and its linked [February 2020 Graphics Standards Manual](${SOURCES.manual}).\n\nThe website SVG is original source artwork. Its path and polygon coordinates are preserved in the generated full logo; generated green is normalized from the website’s #00573D to the manual’s explicit #035642 recipe. EPS/GIF originals remain unchanged. The guide’s gold RGB 183,149,39 agrees with #B79527; the web table’s 183,149,3 is inconsistent.\n\nThe clear-space rule is official; the numeric ratio 16.05/434.89 is a conservative implementation measurement from this supplied artwork. Department/subdepartment font sizes, report margins and template layouts are local defaults. The university has not published a department-lockup sizing formula in this guide. Official departmental sub-logos must come from Communications and Marketing.\n\n\`PROVENANCE.json\` records source URLs, retrieval date, archive members, hashes and transformations. \`identity-rules.json\` separates official guidance from implementation decisions. No logo lettering is retyped, isolated, rearranged or used to invent a new mark.\n`)
write('fonts/README.md', `# UNBC typography\n\nThe official face is Helvetica Neue; Arial is the official alternative (Graphics Standards Manual p. 9). No commercial font program is redistributed. Office documents request Arial.\n\nThe kit bundles unmodified TeX Gyre Heros Regular, Bold, Italic and Bold Italic under the GUST Font License solely as portable rendering substitutes. This is a local implementation choice, not a UNBC-approved typeface. Install licensed Helvetica Neue or Arial for production workflows that require them; review pagination after a font change. The logo is source vector artwork and never depends on these fonts.\n\nSource: https://www.gust.org.pl/projects/e-foundry/tex-gyre and https://mirrors.ctan.org/fonts/tex-gyre.zip (shared unmodified files from the existing brandkit font collection).\n\n| File | SHA-256 |\n| --- | --- |\n${readdirSync(`${folder}fonts`).filter(name => name !== 'README.md').sort().map(file => `| ${file} | ${hash(`fonts/${file}`)} |`).join('\n')}\n`)
write('official-templates/README.md', `# Original UNBC templates\n\nThese files are the university-supplied originals linked from [UNBC branded templates](${SOURCES.templates}), retrieved ${retrieved}. They are retained without edits. They are distinct from the local document applications generated by this kit.\n\n${officialTemplates.map(([file, title]) => `- [${title}](${file}) — [official source](${BASE}${file})`).join('\n')}\n\nSource sizes and SHA-256 hashes are in \`../reference/PROVENANCE.json\`.\n`)
write('docs/README.md', `# UNBC identity and document applications\n\nThis kit preserves the official full UNBC logo and records the published identity rules. It adds editable department/subdepartment document metadata, ${brand.templates.length} native templates, ten Word stationery/report starters, a four-layout PowerPoint presentation, an HTML email signature, shared research report/decision brief/brand portfolio publications in Letter and A4, and nine guide pages.\n\nUse **Documents** for flowing report content, tables, figures and maintained Word masters. Use **Templates** for stationery, slide and social layouts. **Brand portfolio** documents distinguish the university, units, initiatives and independent organizations. The existing SPARK Lab and Over the Edge identities are linked with explicit relationship notes.\n\n## Naming and logo rules\n\nUse verified names in the department and subdepartment fields. They are ordinary document text, separated from the full university logo. The public guide gives sub-logo examples but no numerical construction formula; official department brand extensions must be supplied by Communications and Marketing. The generator does not fabricate them.\n\nThe full logo is at least 38.1 mm wide. Keep its proportions and the B/N top difference clear on every side. Green appears on white; black is for black-only reproduction on white/light ground; white is preferably on UNBC Green. Gold is an accent only. No tiny favicons, separated lettermark, crest patterns or arbitrary logo colours are generated.\n\n## Editable outputs and source files\n\n- Letter and A4: letterhead, continuation, memorandum, research report, decision brief, brand portfolio.\n- Presentations: cover, section, content and evidence layouts.\n- Digital: social announcement and HTML email signature.\n- Original university templates are retained separately in \`official-templates/\`.\n- Official resources, hashes and source discrepancies: \`reference/\`.\n- All new page layouts are local applications; original university template files remain unchanged.\n\nWord and PowerPoint request Arial, the university’s documented fallback. The open TeX Gyre Heros font files provide reproducible previews/outlines and PDF rendering, and are identified as substitutes.\n\nRebuild the definition and guides with \`npm run make:unbc\`, then \`npm run make:documentation\`.\n`)

const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const localLinks = officialResources.map(item => `<li><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a>${item.localPath ? ` · <a href="../${escapeHtml(item.localPath)}">Included original</a>` : ''}<p>${escapeHtml(item.note)}</p></li>`).join('')
write('docs/brand-details.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UNBC identity and document applications</title><style>body{margin:0;background:#fff;color:#000;font:17px/1.55 Arial,sans-serif}main{max-width:1060px;margin:auto;padding:48px 24px}header{margin-bottom:64px}header svg{width:min(100%,620px);height:auto}h1{font-size:clamp(30px,5vw,52px);line-height:1.08;max-width:900px;margin:44px 0 22px}h2{font-size:30px;color:#035642;margin-top:52px}h3{font-size:21px}p{max-width:850px}a{color:#035642}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:14px;border-bottom:1px solid #d9d9d9;vertical-align:top}th{background:#f2f2f2}.tag{color:#4d4d4d}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:26px}.card{padding:22px;background:#f2f2f2}.green{background:#035642;color:white}.gold{border-top:8px solid #b79527}li{margin:18px 0}li p{margin:4px 0}.notice{border-left:4px solid #035642;padding:12px 22px;background:#f2f2f2}code{font-size:.9em}@media(max-width:600px){main{padding:28px 18px}table{font-size:14px}th,td{padding:9px}}@media print{main{padding:0}a{color:inherit}h2{break-after:avoid}.card{break-inside:avoid}}</style></head><body><main><header>${logoDocument({ brand }, { signature: 'official', colourway: 'green' }).replace(/^<\?xml[^>]*>\s*/, '')}<h1>UNBC identity and document applications</h1><p>Official full-logo artwork and published identity rules, with editable department names and local report, brief, portfolio and presentation layouts.</p><p class="tag">Source guidance February 2020 · Kit applications 1.0 · Sources retrieved ${retrieved}</p></header><section><h2>Logo sizing and colour</h2><div class="cards"><div class="card"><h3>38.1 mm minimum width</h3><p>Measure the visible full logo. Keep its original ${width}:${height} proportions.</p></div><div class="card"><h3>Clear space on every side</h3><p>Reserve the gap between the top of B and top of N. For this source artwork that is conservatively 0.03691 × logo width. At 55 mm width, reserve at least 2.03 mm; document layouts reserve 8 mm.</p></div><div class="card gold"><h3>Green white and black</h3><p>Green #035642 on white. Black for black-only reproduction. White preferably on UNBC Green. Gold #B79527 is an accent and is never used for the logo.</p></div></div></section><section><h2>Department and subdepartment names</h2><p>Enter verified names as ordinary document text below the logo. The main unit is 12 pt bold; a subdepartment is 10.5 pt regular; names wrap without changing the logo. These are local document defaults.</p><p class="notice">Official sub-logos are supplied by UNBC Communications and Marketing. The public manual shows examples but does not publish a numeric construction formula. This kit does not turn entered text into an approved departmental logo.</p></section><section><h2>Document and portfolio applications</h2><table><thead><tr><th>Application</th><th>Formats and content</th></tr></thead><tbody><tr><td>Research report</td><td>Letter and A4; question, scope, methods, findings, evidence, limitations and follow-up.</td></tr><tr><td>Decision brief</td><td>Decision, evidence, options, recommendation and next step.</td></tr><tr><td>Brand portfolio</td><td>Units and initiatives, purposes, audiences, verified organizational relationships and approved identity resources.</td></tr><tr><td>Stationery</td><td>Letterhead, continuation sheets and memoranda with editable affiliation fields.</td></tr><tr><td>Presentation and digital</td><td>Four editable PowerPoint layouts, social announcement and HTML email signature.</td></tr></tbody></table><p>Use the Documents editor for flowing content, figures and tables. Word is the maintained editable master; regenerate PDF after editing. The local layouts are separate from the unmodified university templates below.</p></section><section><h2>Typography and sources</h2><p>Helvetica Neue is official; Arial is the documented alternative. Office files request Arial. TeX Gyre Heros is bundled only for open portable rendering, with its licence and substitute notice.</p><p>Original vector coordinates are retained. Generated green follows the manual’s #035642 recipe rather than the website SVG’s #00573D. Gold uses the manual’s RGB 183,149,39, consistent with #B79527. Source bytes, transformations and hashes are recorded in <a href="../reference/PROVENANCE.json">PROVENANCE.json</a>; rules and local defaults in <a href="../reference/identity-rules.json">identity-rules.json</a>.</p></section><section><h2>Original UNBC resources</h2><ul>${localLinks}</ul></section><footer><p>Use the original university guidance for approval and brand-use questions. All local layouts and department text sizing are applications developed for this kit.</p></footer></main></body></html>\n`)
brand.files = [{ from: 'docs/README.md', to: 'README.md' }, 'docs/brand-details.html', { from: 'docs/brand-details.html', to: 'guidelines/brand-details.html' },
  ...['fonts', 'reference', 'official-templates'].flatMap(dir => readdirSync(`${folder}${dir}`).sort().map(file => `${dir}/${file}`))]
write('brand.json', json(brand))
write('logo-menu.svg', menuLogo(brand, fonts))
write('USE.md', documentationMarkdown(brand))
updateManifest(brand)
console.log(`UNBC: ${brand.templates.length} templates, ${brand.documents.length} Office/email applications, ${brand.guide.pages.length} guide pages; original university resources retained.`)
