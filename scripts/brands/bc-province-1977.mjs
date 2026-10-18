// Writes brands/bc-province-1977/brand.json: the Province of British Columbia's Visual Identity
// Program of 1977 (General, Reproduction, Sign and Vehicle manuals in the BC manual pack, books
// "general", "reproduction", "sign", "vehicle"), as a brand.
//
// The Provincial Symbol is PofBC's reconstruction (artwork.json, via scripts/import-pofbc.mjs).
// Signatures are composed: the Reproduction Manual sets every ministerial signature on one
// cap-height grid, so they are defined here once and set for any ministry. Helvetica is set in
// TeX Gyre Heros, its open-licence equivalent; Courier, for typed fields, in TeX Gyre Cursor.
//
//   node scripts/brands/bc-province-1977.mjs

import { box, cite, HEROS_CAP, hung, locked, pt, readJson, round, writeBrand } from './common.mjs'
import { applications, guide } from './bc-province-1977-applications.mjs'
import { illustrated } from './illustrations.mjs'

const folder = new URL('../../brands/bc-province-1977/', import.meta.url)
const art = readJson(new URL('artwork.json', folder))

// TeX Gyre Heros, measured: capitals 0.729 em; "British Columbia" in the bold is 8.001 em.
const CAPR = HEROS_CAP

// ---------------------------------------------------------------------------------------------
// Signatures. Units: c = 100, the logotype's cap height (Reproduction Manual p. 12, "Line-Spacing
// Principles", and sheet 15B as measured): lines 1.45 c apart; the provincial and ministerial
// groups 2 c apart; the symbol 3.9 c, the depth of three lines; 2 c from symbol to type and from
// the logotype to the ministry column; branch capitals 0.73 c, the ministry's x-height.
const C = 100
const S = round(C / CAPR)
const P = 145
const SB = round(73 / CAPR)
const SA = round(78 / CAPR)
const RULE = 11.4 // a 1 point rule, where c is the cap height of 12 point type
const MINISTRY_X = 590 + 1300 // 13 c from the logotype's left edge

const province = (size = S, leading = P) => [{ text: 'Province of', size, font: 'medium', leading }, { text: 'British Columbia', size, font: 'medium', leading }]
const ministry = (extra = {}) => ({ field: 'ministry', size: S, font: 'regular', leading: P, wrap: 1300, ...extra })
const branch = (extra = {}) => ({ field: 'ministry-split', caps: true, size: SB, font: 'regular', leading: P, gapBefore: 55, ...extra })
const address = (x, y, anchor) => [
  { type: 'rule', x1: anchor === 'middle' ? -700 : x, x2: anchor === 'middle' ? 700 : 'auto', y1: `after:${y}+95`, width: RULE, when: 'address' },
  { type: 'stack', id: 'address', x, y: `after:${y}+245`, anchor, items: [{ field: 'address', size: SA, font: 'regular', leading: 115, wrap: 3400, when: 'address' }] }
]
const metrics = (baseline, logotypeX = 0) => ({ font: 'medium', capHeight: C, baseline, logotypeX })

const SIGNATURES = [
  {
    id: 'provincial', label: 'Provincial signature', use: 'The symbol with the provincial logotype alone: covers, the Province as a whole (General Manual pp. 3–5).',
    metrics: metrics(1160, 0),
    elements: [{ type: 'symbol', x: 0, y: 0, height: 1000 }, { type: 'text', text: 'Province of British Columbia', x: 500, y: 1160, size: S, font: 'medium', anchor: 'middle', role: 'type' }]
  },
  {
    id: 'horizontal', label: 'Flush-left, horizontal', departmental: true, use: 'Stationery and advertising. The ministry in two or more lines to the right of the logotype; component and address below a 1 point rule.',
    metrics: metrics(100, 590),
    elements: [
      { type: 'symbol', x: 0, y: 0, height: 390 },
      { type: 'stack', id: 'province', x: 590, y: 100, items: province() },
      { type: 'stack', id: 'ministry', x: MINISTRY_X, y: 100, items: [ministry(), branch()] },
      ...address(590, 'ministry,province')
    ]
  },
  {
    id: 'vertical', label: 'Flush-left, vertical', departmental: true, use: 'Top left or bottom left on the front or back covers of publications; advertisements.',
    metrics: metrics(590, 0),
    elements: [
      { type: 'symbol', x: 0, y: 0, height: 390 },
      { type: 'stack', id: 'main', x: 0, y: 590, items: [...province(), ministry({ gapBefore: 55 }), branch()] },
      ...address(0, 'main')
    ]
  },
  {
    id: 'stacked', label: 'Stacked, centred', departmental: true, use: 'Small one-column advertisements; brochures.',
    metrics: metrics(620, 0),
    elements: [
      { type: 'symbol', x: 0, y: 0, height: 390 },
      { type: 'stack', id: 'main', x: 195, y: 620, anchor: 'middle', items: [...province(), ministry({ gapBefore: 55 }), branch()] },
      ...address(195, 'main', 'middle')
    ]
  },
  {
    id: 'centred', label: 'Centred', departmental: true, use: 'Posters, brochures, back covers of books, large advertisements.',
    metrics: metrics(530, 0),
    elements: [
      { type: 'symbol', x: -200, y: 0, height: 400 },
      { type: 'stack', id: 'main', x: 0, y: 530, anchor: 'middle', items: [{ text: 'Province of British Columbia', size: S, font: 'medium', leading: P }, ministry({ join: true, wrap: undefined }), branch({ gapBefore: 0 })] },
      ...address(0, 'main', 'middle')
    ]
  },
  {
    id: 'one-line', label: 'One line', departmental: true, use: 'Stationery and advertising where depth is short.',
    metrics: metrics(200, 690),
    elements: [
      { type: 'symbol', x: 0, y: 0, height: 450 },
      { type: 'run', x: 690, y: 200, parts: [{ text: 'Province of British Columbia', size: S, font: 'medium' }, { field: 'ministry', size: S, font: 'regular' }] },
      { type: 'stack', id: 'branch', x: 690, y: 400, items: [branch({ gapBefore: 0 })] },
      ...address(690, 'branch')
    ]
  },
  {
    id: 'sign-centred', label: 'Signs: centred', departmental: true, use: 'Primary identification signs only (Sign Manual p. 8, fig. 1): the upper half of the sign.',
    metrics: metrics(1430, 0),
    elements: [
      { type: 'symbol', x: -500, y: 0, height: 1000 },
      { type: 'text', text: 'Province of British Columbia', x: 0, y: 1430, size: round(270 / CAPR), font: 'medium', anchor: 'middle' },
      { type: 'stack', x: 0, y: 2100, anchor: 'middle', items: [ministry({ join: true, wrap: undefined, size: round(450 / CAPR), leading: 600 })] }
    ]
  },
  {
    id: 'sign-horizontal', label: 'Signs: horizontal', departmental: true, use: 'Standard information, warning and regulatory signs (Sign Manual p. 8, fig. 2): the signature band at the foot.',
    metrics: metrics(410, 1220),
    elements: [
      { type: 'symbol', x: 0, y: 0, height: 1000 },
      { type: 'stack', x: 1220, y: 410, items: province(round(210 / CAPR), 310) },
      // The ministry follows "British Columbia" (8.001 em of the bold at a 210 cap) by 0.13 h.
      { type: 'stack', x: round(1220 + 8.001 * 210 / CAPR + 130), y: 720, items: [ministry({ join: true, wrap: undefined, size: round(350 / CAPR) })] }
    ]
  },
  {
    // The insignia on uniforms (General Manual p. 13): the job patch's symbol, the logotype on two
    // lines, and the ministry beneath in a larger regular. Measured from the patch.
    id: 'insignia', label: 'Uniform insignia', departmental: true, use: 'Patches, crests and badges on uniforms (General Manual p. 13): the symbol over the logotype on two lines, the ministry beneath.',
    metrics: metrics(1250, 0),
    elements: [
      { type: 'symbol', x: -500, y: 0, height: 1000 },
      { type: 'stack', x: 0, y: 1250, anchor: 'middle', items: [...province(round(130 / CAPR), 175), ministry({ size: round(150 / CAPR), leading: 190, wrap: 1700, gapBefore: 60 })] }
    ]
  },
  {
    id: 'vehicle', label: 'Vehicles: door marking', departmental: true, use: 'Driver and passenger doors (Vehicle Manual p. 3): a 5 in symbol over a ½ in logotype and a 1 in ministry name, centred and centre-marked.',
    metrics: metrics(1250, 0),
    elements: [
      { type: 'symbol', x: -500, y: 0, height: 1000 },
      { type: 'text', text: 'Province of British Columbia', x: 0, y: 1250, size: round(100 / CAPR), font: 'medium', anchor: 'middle' },
      { type: 'stack', x: 0, y: 1600, anchor: 'middle', items: [ministry({ size: round(200 / CAPR), leading: 290, wrap: 2600 }), branch({ size: round(100 / CAPR), leading: 290, gapBefore: 0 })] }
    ]
  }
]

// ---------------------------------------------------------------------------------------------
// Ministries: every ministry from 1976 to 1986 (PofBC's ministry history), and the split
// ministries and branches of the Reproduction Manual's repro-sheet list (p. 14).
const SPLITS = [
  ['Ministry of Health', ['COMMUNITY HEALTH', 'MEDICAL AND HOSPITAL PROGRAMS']],
  ['Ministry of Highways and Public Works', ['HIGHWAYS', 'PUBLIC WORKS']],
  ['Ministry of Municipal Affairs and Housing', ['HOUSING', 'MUNICIPAL AFFAIRS']],
  ['Ministry of the Provincial Secretary and Travel Industry', ['PROVINCIAL SECRETARY', 'TRAVEL INDUSTRY']]
]
const slug = (value) => value.toLowerCase().replace(/^ministry of (the )?/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
/** "Ministry of Forests" → "Ministry of\nForests": the manual sets "Ministry of" on its own line. */
export const ministryLines = (name) => {
  const match = /^(Ministry of(?: the)?)\s+(.+)$/i.exec(name)
  return match ? `${match[1]}\n${match[2]}` : name
}
const named = (name) => name.replace(/\. (?=[A-Z])/g, ', ').replace('Ministry of Provincial Secretary', 'Ministry of the Provincial Secretary')
const seen = new Set()
const ministries = []
for (const { name: raw, from, to } of art.ministries) {
  const name = named(raw)
  let id = slug(name)
  if (seen.has(id)) id = `${id}-${from}`
  seen.add(id)
  ministries.push({ id, name, years: `${from}–${to ?? ''}`, values: { ministry: ministryLines(name), 'ministry-split': '' } })
  for (const [whole, branches] of SPLITS) {
    if (whole === name) for (const part of branches) ministries.push({ id: `${id}-${slug(part)}`, name: `${name}: ${part}`, years: `${from}–${to ?? ''}`, values: { ministry: ministryLines(name), 'ministry-split': part } })
  }
}
ministries.push({ id: 'public-service-commission', name: 'Public Service Commission', years: '1976–', values: { ministry: 'Public Service\nCommission', 'ministry-split': '' } })

// ---------------------------------------------------------------------------------------------
const FONT = (file, label, extra = {}) => ({ family: 'TeX Gyre Heros', stack: '"TeX Gyre Heros", Helvetica, Arial, sans-serif', weight: 400, capHeight: CAPR, file: `fonts/${file}`, web: `fonts/${file}`, label, ...extra })

export const brand = {
  schema: 'brandkit/1',
  id: 'bc-province-1977',
  name: 'Province of British Columbia',
  version: '1977-09',
  displayVersion: '1977',
  source: 'Visual Identity Program, 1977: the General, Reproduction, Sign and Vehicle manuals, as rebuilt in the BC manual pack (manuals/bc); the Provincial Symbol from PofBC’s reconstruction.',
  status: 'A historical reconstruction for reference and study. Not the Province’s current identity, which is published by the Government of British Columbia.',
  colours: { brown: '#5C462B', black: '#000000', white: '#FFFFFF', gold: '#A8894A', cream: '#F6F1E3', kraft: '#C9A877', yellow: '#FFE600', red: '#C8102E', grey: '#8A8A8A' },
  colourNames: { brown: 'Brown (PMS 462)', gold: 'Gold (engraved)', cream: 'Cream parchment', kraft: 'Kraft (catalogue envelopes)', yellow: 'Warning yellow', red: 'Regulatory red' },
  roles: { ink: 'black', paper: 'white', muted: 'black', primary: 'brown', light: 'cream', reverse: 'white', line: '#CFC8BA', rule: 'black' },
  print: { pantone: { brown: '462' }, cmyk: null, note: 'The program names Pantone 462 (brown) for print and gives paint, decal and sign-material references (Reproduction Manual p. 28). Screen colours are approximations.' },
  colourways: {
    positive: { label: 'Two colours: brown symbol, black type', roles: { symbol: 'brown', type: 'black' } },
    brown: { label: 'One colour: brown', all: 'brown' },
    black: { label: 'One colour: black', all: 'black' },
    reverse: { label: 'Reverse: white', all: 'white', ground: 'brown' },
    gold: { label: 'Gold crest, black type', roles: { symbol: 'gold', type: 'black' } }
  },
  defaultColourway: 'positive',
  logoColours: ['brown', 'black', 'white', 'currentColor'],
  rasterColours: ['brown', 'black', 'white'],
  fonts: {
    regular: FONT('texgyreheros-regular.otf', 'Helvetica Regular (TeX Gyre Heros)'),
    medium: FONT('texgyreheros-bold.otf', 'Helvetica Medium (TeX Gyre Heros Bold)', { weight: 700 }),
    italic: FONT('texgyreheros-italic.otf', 'Helvetica Regular Italic (TeX Gyre Heros Italic)', { style: 'italic' }),
    light: FONT('texgyreheros-regular.otf', 'Helvetica Ultra Light (set in Regular: no open Ultra Light)'),
    typewriter: { family: 'TeX Gyre Cursor', stack: '"TeX Gyre Cursor", "Courier New", Courier, monospace', weight: 400, capHeight: 0.563, file: 'fonts/texgyrecursor-regular.otf', web: 'fonts/texgyrecursor-regular.otf', label: 'Courier (TeX Gyre Cursor)' },
    body: FONT('texgyreheros-regular.otf', 'Helvetica Regular'),
    bold: FONT('texgyreheros-bold.otf', 'Helvetica Medium', { weight: 700 }),
    display: FONT('texgyreheros-bold.otf', 'Helvetica Medium', { weight: 700 }),
    displayRegular: FONT('texgyreheros-regular.otf', 'Helvetica Regular'),
    extra: FONT('texgyreheros-bold.otf', 'Helvetica Medium', { weight: 700 }),
    label: FONT('texgyreheros-regular.otf', 'Helvetica Regular')
  },
  typography: {
    headlines: { family: 'Helvetica Medium', weight: 700, trackingEm: 0 },
    body: { family: 'Helvetica Regular', weight: 400 },
    labels: { family: 'Helvetica Regular', weight: 400, trackingEm: 0.06 },
    note: 'Helvetica Medium for the provincial logotype, Helvetica Regular for ministerial logotypes and component designations, upper and lower case; capitals only for branches and split ministries (General Manual p. 6; Reproduction Manual p. 12).'
  },
  symbol: { name: 'provincial-symbol', title: 'Provincial Symbol', masterTitle: 'Provincial Symbol (crest and ring)', masterDescription: 'The Provincial Coat of Arms within its band: positive form. The manual’s reverse form is separate artwork (the Union Jack stays black and the Sun white); this reconstruction has the positive form only.', ...art.symbol },
  signatures: SIGNATURES.map(({ id, label, use, metrics: m, elements, departmental }) => ({ id, label, use, metrics: m, elements, ...(departmental ? { departmental } : {}) })),
  lockup: { canvasPadding: 0, clearspaceRecommendation: 'The signature is reproduced as it appears in the manual: never modified, never with another design superimposed, and the symbol never without the provincial logotype.', minimumHorizontalWidthPx: 96, minimumHorizontalWidthMm: 25, minimumSymbolHeightPx: 48, minimumSymbolHeightMm: 12.5 },
  departments: {
    label: 'Ministry',
    field: 'ministry',
    folder: 'ministries',
    colourways: ['positive'],
    items: ministries
  },
  fields: {
    ministry: { label: 'Ministry', placeholder: 'Ministry of\nAbcdefghijk\nLmnopqrstuvw', multiline: true },
    'ministry-split': { label: 'Split ministry name or branch', placeholder: 'Branch' },
    component: { label: 'Organizational component', placeholder: 'Organizational Component', multiline: true },
    address: { label: 'Component and address (signature)', placeholder: '' },
    street: { label: 'Address', placeholder: 'Address' },
    city: { label: 'City', placeholder: 'City' },
    'postal-code': { label: 'Postal code', placeholder: 'Postal Code' },
    telephone: { label: 'Telephone', placeholder: '(604) 000-0000' },
    name: { label: 'Name', placeholder: 'Name' },
    title: { label: 'Title', placeholder: 'Title' },
    board: { label: 'Board or commission', placeholder: 'Board or\nCommission', multiline: true },
    organization: { label: 'Ministry or organization', placeholder: 'Ministry or\nOrganizational Name', multiline: true },
    portfolio: { label: 'Portfolio', placeholder: 'Minister of Ministry Name' }
  },
  copy: {
    svgDescription: 'Province of British Columbia Visual Identity Program, 1977, reconstructed for reference. Not the Province’s current identity. Helvetica is set in TeX Gyre Heros.',
    templateDescription: 'Province of British Columbia application, 1977 Visual Identity Program, reconstructed. Not the Province’s current identity.',
    logoLabel: 'Province of British Columbia signature',
    motifLabel: 'Provincial Symbol',
    tagline: 'One signature, for every ministry.'
  },
  patterns: [],
  templates: [],
  web: {
    componentName: 'BcProvinceSignature',
    symbolComponentName: 'BcProvincialSymbol',
    cssPrefix: 'bcvip',
    appIcon: { background: 'paper', colour: 'primary', size: 860 },
    favicon: { light: '#5C462B', dark: '#FFFFFF', size: 60, micro: false, title: '{name} favicon' },
    intro: { eyebrow: 'Visual Identity Program / 1977', headline: 'Province of\nBritish Columbia', body: 'The Province’s 1977 identity, reconstructed from its four manuals: the Provincial Symbol, the ministerial signature for every ministry, Helvetica, Pantone 462, and the stationery, forms, publications, vehicles and signs built on them. A historical reference, not the Province’s current identity.', edition: '1977 reconstruction', footer: 'Province of British Columbia Visual Identity Program, 1977. A reconstruction for reference; not the current provincial identity.' },
    landing: { eyebrow: 'Historical reference', headline: 'Province of\nBritish Columbia\n1977', body: 'A reconstruction of the 1977 Visual Identity Program.', cta: 'Read the manuals', contactEyebrow: 'Not current guidance', contactBody: 'For the Province’s current identity, see the Government of British Columbia.', footer: 'Visual Identity Program, 1977 (reconstruction).' }
  },
  files: [
    { to: 'README.md', from: 'docs/README.md' },
    'fonts/GUST-FONT-LICENSE.txt', 'fonts/FONT-NOTICE.txt', 'fonts/texgyrecursor-regular.otf',
    ...['regular', 'bold', 'italic', 'bolditalic'].map((weight) => `fonts/texgyreheros-${weight}.otf`)
  ]
}

// ---------------------------------------------------------------------------------------------
// Stationery (Reproduction Manual pp. 2–8; General Manual pp. 10–11). Every rank shares the
// General Use grid except the Premier's and Special Use, which are centred.
const PROVINCE_LINES = [{ text: 'Province of', locked: true }, { text: 'British Columbia', locked: true }]
const office = (rank) => ({ type: 'lines', x: 36, y: round(hung(9, 10) + 3 * 4.25 - 2.5, 2), leading: 2.5, size: '6pt', font: 'regular', colour: 'type', lines: [{ text: 'OFFICE OF THE', locked: true }, { text: rank, locked: true }] })
const officeEnvelope = (rank) => ({ ...office(rank), x: 31, y: round(hung(8, 9) + 3 * 4 - 2.5, 2) })

const letterhead = ({ id, label, rank, col2 = { type: 'paragraph', id: 'ministry', x: 91, y: hung(9, 10), width: 52, size: '10pt', leading: 4.25, maxLines: 3, font: 'regular', colour: 'type' }, split = true, col3 = ['component', 'street', 'city', 'postal-code', 'telephone'], extra = [], symbolColour = 'symbol', design }) => ({
  id, label, group: `Stationery: ${rank}`, unit: 'mm', width: 215.9, height: 279.4, physical: ['8.5in', '11in'], raster: 1700,
  title: `Province of British Columbia / ${label}`,
  description: `${label}, design ${design} (Reproduction Manual). The General Use grid: 9 | 18 | 9 | 55 | 55 | 70 mm; type hangs 9 mm from the top; rule at 29 mm.`,
  elements: [
    { type: 'background', fill: 'paper' },
    { type: 'symbol', id: 'symbol', x: 8.5, y: 9, height: 19, colour: symbolColour },
    { type: 'lines', x: 36, y: hung(9, 10), leading: 4.25, size: '10pt', font: 'medium', colour: 'type', lines: PROVINCE_LINES },
    col2,
    ...(split ? [{ type: 'text', id: 'ministry-split', x: 91, y: round(hung(9, 10) + 3 * 4.25, 2), size: '6pt', caps: true, font: 'regular', colour: 'type' }] : []),
    { type: 'lines', x: 146, y: hung(9, 8), leading: 3.25, size: '8pt', font: 'regular', colour: 'type', lines: col3.map((key) => ({ component: { id: 'component' }, street: { id: 'street' }, city: { compose: '{city}, British Columbia' }, 'postal-code': { id: 'postal-code' }, telephone: { compose: 'Telephone: {telephone}' } }[key])) },
    { type: 'line', id: 'rule', x1: 36, y1: 29, x2: 186, y2: 29, stroke: 'type', strokeWidth: '0.5pt' },
    ...extra
  ]
})

const envelope = ({ id, label, rank, col2 = { type: 'paragraph', id: 'ministry', x: 65, y: hung(8, 9), width: 32, size: '9pt', leading: 4, maxLines: 3, font: 'regular', colour: 'type' }, split = true, extra = [], design, symbolColour = 'symbol', typeColour = 'type', stock = 'paper' }) => ({
  id, label, group: `Stationery: ${rank}`, unit: 'mm', width: 241.3, height: 104.78, physical: ['9.5in', '4.125in'], raster: 1900,
  title: `Province of British Columbia / ${label}`,
  description: `${label}, design ${design}. Grid 8 | 15 | 8 | 34 | 34 mm; type hangs 8 mm from the top; rule at 24 mm; return address below it.`,
  elements: [
    { type: 'background', fill: stock },
    { type: 'symbol', id: 'symbol', x: 7.5, y: 8, height: 16, colour: symbolColour },
    { type: 'lines', x: 31, y: hung(8, 9), leading: 4, size: '9pt', font: 'medium', colour: typeColour, lines: PROVINCE_LINES },
    { ...col2, colour: typeColour },
    ...(split ? [{ type: 'text', id: 'ministry-split', x: 65, y: round(hung(8, 9) + 3 * 4, 2), size: '6pt', caps: true, font: 'regular', colour: typeColour }] : []),
    { type: 'paragraph', id: 'component', x: 99, y: hung(8, 9), width: 34, size: '9pt', leading: 4, maxLines: 3, font: 'regular', colour: typeColour },
    { type: 'line', id: 'rule', x1: 31, y1: 24, x2: 138, y2: 24, stroke: typeColour, strokeWidth: '0.5pt' },
    { type: 'text', id: 'return-address', compose: '{street}, {city}, British Columbia, {postal-code}', x: 31, y: 27.6, size: '8pt', font: 'regular', colour: typeColour },
    ...extra
  ]
})

const card = ({ id, label, rank, col2 = { type: 'paragraph', id: 'ministry', x: 50, y: hung(6, 9), width: 35, size: '9pt', leading: 3.8, maxLines: 3, font: 'regular', colour: 'type' }, split = true, design }) => ({
  id, label, group: `Stationery: ${rank}`, unit: 'mm', width: 88.9, height: 50.8, physical: ['3.5in', '2in'], raster: 1400, print: { trim: [88.9, 50.8], bleed: 0, unit: 'mm' },
  title: `Province of British Columbia / ${label}`,
  description: `${label}, design ${design}: 4 | 12 | 4 | 30 | 39 mm; 9 point above the rule, 7 point below (name in Medium, title and component in Italic, address on 3 mm leading).`,
  elements: [
    { type: 'background', fill: 'paper' },
    { type: 'symbol', id: 'symbol', x: 3.75, y: 6, height: 12.5, colour: 'symbol' },
    { type: 'lines', x: 20, y: hung(6, 9), leading: 3.8, size: '9pt', font: 'medium', colour: 'type', lines: PROVINCE_LINES },
    col2,
    ...(split ? [{ type: 'text', id: 'ministry-split', x: 50, y: 18.3, size: '6pt', caps: true, font: 'regular', colour: 'type' }] : []),
    { type: 'line', id: 'rule', x1: 20, y1: 19.5, x2: 85, y2: 19.5, stroke: 'type', strokeWidth: '0.5pt' },
    { type: 'text', id: 'name', x: 20, y: 23.2, size: '7pt', font: 'medium', colour: 'type' },
    { type: 'text', id: 'title', x: 20, y: 26.2, size: '7pt', font: 'italic', colour: 'type' },
    { type: 'paragraph', id: 'component', x: 20, y: 29.2, width: 28, size: '7pt', leading: 3, maxLines: 2, font: 'italic', colour: 'type' },
    { type: 'text', id: 'phone-line', compose: 'Phone: {telephone}', x: 20, y: 38.2, size: '7pt', font: 'regular', colour: 'type' },
    { type: 'lines', x: 50, y: 23.2, leading: 3, size: '7pt', font: 'regular', colour: 'type', lines: [{ id: 'street' }, { compose: '{city}' }, { text: 'British Columbia', locked: true }, { id: 'postal-code' }] }
  ]
})

// The centred cards (Premier, Ministers, Deputy Ministers, Special Use): 38 | 12 | 38 mm.
const centredCard = ({ id, label, rank, lines, design, symbolColour = 'symbol' }) => ({
  id, label, group: `Stationery: ${rank}`, unit: 'mm', width: 88.9, height: 50.8, physical: ['3.5in', '2in'], raster: 1400,
  title: `Province of British Columbia / ${label}`,
  description: `${label}, design ${design}: centred; symbol 12.5 mm, 7 mm from the top.`,
  elements: [
    { type: 'background', fill: 'paper' },
    { type: 'symbol', id: 'symbol', x: round((88.9 - 12.5) / 2, 2), y: 7, height: 12.5, colour: symbolColour },
    ...lines.map(([content, y, size, font, caps]) => ({ type: 'text', ...(content.startsWith('{') && content.endsWith('}') && !content.includes(' ') ? { id: content.slice(1, -1) } : content.includes('{') ? { compose: content } : { text: content, locked: true }), x: 44.45, y, size: `${size}pt`, font, anchor: 'middle', caps, colour: 'type' }))
  ]
})

const centredLetterhead = ({ id, label, rank, lines, foot, design, symbolColour = 'gold' }) => ({
  id, label, group: `Stationery: ${rank}`, unit: 'mm', width: 215.9, height: 279.4, physical: ['8.5in', '11in'], raster: 1700,
  title: `Province of British Columbia / ${label}`,
  description: `${label}, design ${design}: centred (99 | 18 | 99 mm), symbol 14 mm from the top; the address centred 15 mm from the foot. Crest gold engraved, ring blind embossed.`,
  elements: [
    { type: 'background', fill: 'paper' },
    { type: 'symbol', id: 'symbol', x: 98.45, y: 14, height: 19, colour: symbolColour },
    ...lines.map(([content, y, size, font, caps]) => ({ type: 'text', ...(content.includes('{') ? (content.match(/^\{[\w-]+\}$/) ? { id: content.slice(1, -1) } : { compose: content }) : { text: content, locked: true }), x: 107.95, y, size: `${size}pt`, font, anchor: 'middle', caps, colour: 'type' })),
    { type: 'text', ...(foot.includes('{') ? { compose: foot } : { text: foot, locked: true }), x: 107.95, y: 264.4, size: '10pt', font: rank === 'Premier' ? 'light' : 'regular', anchor: 'middle', colour: 'type' }
  ]
})

const paragraph2 = (id, x, y, width, size, leading) => ({ type: 'paragraph', id, x, y, width, size, leading, maxLines: 3, font: 'regular', colour: 'type' })

const stationery = [
  // General Use (R08)
  letterhead({ id: 'gu-letterhead', label: 'Letterhead, General Use', rank: 'General Use', design: 'GULH 77-1-27' }),
  envelope({ id: 'gu-envelope', label: 'Envelope No. 10, General Use', rank: 'General Use', design: 'GUE 77-1-29' }),
  envelope({ id: 'gu-envelope-kraft', label: 'Catalogue envelope (kraft), General Use', rank: 'General Use', design: 'GUE 77-1-29, corner printed in Pantone 462', typeColour: 'symbol', stock: 'kraft' }),
  card({ id: 'gu-card', label: 'Calling card, General Use', rank: 'General Use', design: 'GUCC 77-1-28' }),
  // Ministers (R05): the rank line, no organizational component.
  letterhead({ id: 'minister-letterhead', label: 'Letterhead, Minister', rank: 'Ministers', design: 'MLH 77-1-21', col3: ['street', 'city', 'postal-code', 'telephone'], extra: [office('MINISTER')] }),
  envelope({ id: 'minister-envelope', label: 'Envelope No. 10, Minister', rank: 'Ministers', design: 'ME 77-1-22', extra: [officeEnvelope('MINISTER'), box(167.3, 6, 74, 40, { id: 'postage-area', stroke: 'line', strokeWidth: '0.25pt' })] }),
  centredCard({ id: 'minister-card', label: 'Calling card, Minister', rank: 'Ministers', design: 'MCC 77-1-23', lines: [['Province of British Columbia', 25.8, 9, 'medium'], ['{name}', 31.6, 11, 'regular'], ['{portfolio}', 35.4, 7, 'italic'], ['Phone {telephone}', 41.4, 7, 'regular'], ['Parliament Buildings, Victoria, B.C.  V8V 1X4', 44.6, 7, 'regular']] }),
  // Deputy Ministers (R06)
  letterhead({ id: 'deputy-letterhead', label: 'Letterhead, Deputy Minister', rank: 'Deputy Ministers', design: 'DMLH 77-1-24', extra: [office('DEPUTY MINISTER')] }),
  envelope({ id: 'deputy-envelope', label: 'Envelope No. 10, Deputy Minister', rank: 'Deputy Ministers', design: 'DME 77-1-25', extra: [officeEnvelope('DEPUTY MINISTER'), box(167.3, 6, 74, 40, { id: 'postage-area', stroke: 'line', strokeWidth: '0.25pt' })] }),
  centredCard({ id: 'deputy-card', label: 'Calling card, Deputy Minister', rank: 'Deputy Ministers', design: 'DMCC 77-1-26', lines: [['Province of British Columbia', 25.8, 9, 'medium'], ['{name}', 31.6, 11, 'regular'], ['Deputy {portfolio}', 35.4, 7, 'italic'], ['Phone {telephone}', 41.4, 7, 'regular'], ['{street}, {city}, B.C., {postal-code}', 44.6, 7, 'regular']] }),
  // Boards and Commissions (R07): the board's name in place of the ministry, no split line.
  letterhead({ id: 'board-letterhead', label: 'Letterhead, Board or Commission', rank: 'Boards and Commissions', design: 'BCLH 77-1-30', col2: { ...paragraph2('board', 91, hung(9, 10), 52, '10pt', 4.25) }, split: false }),
  envelope({ id: 'board-envelope', label: 'Envelope No. 10, Board or Commission', rank: 'Boards and Commissions', design: 'BCE 77-1-31', col2: paragraph2('board', 65, hung(8, 9), 32, '9pt', 4), split: false }),
  card({ id: 'board-card', label: 'Calling card, Board or Commission', rank: 'Boards and Commissions', design: 'BCCC 77-1-32', col2: paragraph2('board', 50, hung(6, 9), 35, '9pt', 3.8), split: false }),
  // Premier (R04): centred, Ultra Light, gold crest.
  centredLetterhead({ id: 'premier-letterhead', label: 'Letterhead, Premier', rank: 'Premier', design: 'PLH 77-1-18', lines: [['Province of British Columbia', round(38 + CAPR * pt(12), 2), 12, 'regular'], ['OFFICE OF THE PREMIER', 44, 7, 'light']], foot: 'Parliament Buildings, Victoria, British Columbia  V8V 4R3' }),
  {
    id: 'premier-envelope', label: 'Envelope No. 10, Premier', group: 'Stationery: Premier', unit: 'mm', width: 241.3, height: 104.78, physical: ['9.5in', '4.125in'], raster: 1900,
    title: 'Province of British Columbia / Premier’s envelope', description: 'Premier’s envelope, design PE 77-1-19: symbol at 8 mm; OFFICE OF THE PREMIER and the Victoria address beneath, flush left with the symbol.',
    elements: [
      { type: 'background', fill: 'paper' },
      { type: 'symbol', id: 'symbol', x: 8, y: 8, height: 16, colour: 'gold' },
      locked('OFFICE OF THE PREMIER', 8, 29, '9pt', { font: 'light', colour: 'type' }),
      locked('VICTORIA, BRITISH COLUMBIA  V8V 4R3', 8, 32.6, '7pt', { font: 'light', colour: 'type' })
    ]
  },
  centredCard({ id: 'premier-card', label: 'Calling card, Premier', rank: 'Premier', design: 'PCC 77-1-20', symbolColour: 'gold', lines: [['Province of British Columbia', 26.6, 9, 'light'], ['{name}', 34, 11, 'light', true], ['PREMIER', 38, 7, 'light']] }),
  // Special Use (R09): centred, gold crest, blue-white parchment.
  centredLetterhead({ id: 'special-letterhead', label: 'Letterhead, Special Use', rank: 'Special Use', design: 'SULH 77-1-33', lines: [['Province of British Columbia', round(38 + CAPR * pt(12), 2), 12, 'medium'], ['{organization}', 46.5, 12, 'regular'], ['{component}', 51.5, 7, 'regular', true]], foot: '{street}, {city}, British Columbia, {postal-code}, Telephone: {telephone}' }),
  envelope({ id: 'special-envelope', label: 'Envelope No. 10, Special Use', rank: 'Special Use', design: 'SUE 77-1-34', col2: paragraph2('organization', 65, hung(8, 9), 32, '9pt', 4), split: false, symbolColour: 'gold' }),
  centredCard({ id: 'special-card', label: 'Calling card, Special Use', rank: 'Special Use', design: 'SUCC 77-1-35', symbolColour: 'gold', lines: [['Province of British Columbia', 25.8, 9, 'medium'], ['{organization}', 29.6, 9, 'regular'], ['{name}', 35.4, 11, 'regular'], ['{component}', 40.2, 7, 'regular', true], ['{street}, {city}, British Columbia, {telephone}', 43.6, 7, 'regular']] })
]

// The stationery's colour roles: the symbol in brown (or gold), the type in black.
brand.roles.symbol = 'brown'
brand.roles.type = 'black'

// The drawings of uniforms and vehicles (ManualKit's source-registered illustrations), each a
// template with the identity in its branding zones.
const drawn = illustrated('province', ['G15', 'G16', 'G17', 'V03', 'V06', 'V07', 'V08', 'V09', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17', 'V18'])
brand.illustrations = drawn.drawings

brand.templates = [...stationery, ...applications(brand), ...drawn.templates]
brand.guide = guide(brand)

// The manual pages each piece is built from (page ids in manuals/bc). General Manual G12 is
// Format A (the component's address printed), G13 Format B (typed); R03 explains the spec sheets.
const STATIONERY_SHEET = { 'gu': 'R08', minister: 'R05', deputy: 'R06', board: 'R07', premier: 'R04', special: 'R09' }
const SIGNS = ['S07', 'S08']
cite(brand, {
  pack: 'bc',
  templates: {
    ...Object.fromEntries(stationery.map((template) => {
      const rank = template.id.split('-')[0]
      return [template.id, [STATIONERY_SHEET[rank], ...(rank === 'gu' ? ['G12'] : []), 'R03']]
    })),
    memorandum: ['G14', 'R14'],
    'news-release': ['G14', 'R14'],
    'publication-title-page': ['G10', 'R14'],
    'publication-cover-reverse': ['G10', 'R14'],
    'publication-annual-report': ['G10', 'R14'],
    'publication-statement-page': ['G10', 'R14'],
    'advert-tender': ['G11', 'R14'],
    'advert-announcement': ['G11', 'R14'],
    'uniform-flash': ['G15'],
    'uniform-security': ['G15'],
    'vehicle-door': ['V05', 'V06', 'V07', 'G17'],
    'vehicle-van-truck': ['V12', 'V13', 'V05', 'G17'],
    'vehicle-van-truck-rear': ['V12', 'V13', 'G17'],
    'sign-primary-identification': ['S12', 'S13', 'S10', ...SIGNS, 'G18'],
    'sign-standard-information': ['S16', 'S18', 'S10', ...SIGNS],
    'sign-secondary-identification': ['S14', 'S15', ...SIGNS],
    'sign-directional': ['S19', 'S20', ...SIGNS],
    'sign-warning': ['S23', 'S24', 'S10', ...SIGNS],
    'sign-regulatory': ['S23', 'S24', 'S10', ...SIGNS],
    ...Object.fromEntries(Object.entries(drawn.sources).map(([id, pages]) => [id, [...pages, ...(pages[0].startsWith('V') && pages[0] !== 'V18' ? ['V05'] : [])]]))
  },
  signatures: {
    provincial: ['G05', 'G06', 'G07', 'R31', 'R32'],
    ...Object.fromEntries(['horizontal', 'vertical', 'stacked', 'centred', 'one-line'].map((id) => [id, ['R13', 'R16', 'R17', 'R11', 'G08']])),
    'sign-centred': ['S10', 'R18'],
    'sign-horizontal': ['S10', 'R18'],
    vehicle: ['V05', 'V04'],
    insignia: ['G15']
  },
  guide: [
    ['G05', 'G06', 'G07', 'R32'],
    ['R13', 'R15', 'R16'],
    ['R32', 'R13', 'G08'],
    ['G07', 'R34', 'R35'],
    ['R10', 'G08'],
    ['R03', 'R08', 'G12', 'G13'],
    ['G14', 'G10', 'G11', 'R14'],
    ['V05', 'G16', 'G17'],
    ['S07', 'S10', 'G18']
  ]
})

writeBrand(new URL('brand.json', folder), brand)
