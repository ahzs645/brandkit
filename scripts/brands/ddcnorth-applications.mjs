// ddcnorth's application system: what the BC identity manuals set out, applied to ddcnorth.
//
// The Province's 1977 program and BC Hydro's 1983 standards cover far more than ddcnorth's kit
// (cards, an A4 letterhead, two social formats and a slide): a stationery set, memoranda and
// releases, forms, publication covers and mastheads, advertising, audio-visual, signs, vehicles
// and uniforms, and the guide pages on backgrounds and incorrect usage. This script adds that
// system to brands/ddcnorth/brand.json, each piece citing the manual pages it is modelled on.
//
// The original kit's templates and guide pages are left exactly as they are (the parity test
// holds them to the Python kit byte for byte); everything added carries `extension:
// 'applications'`, so running this again replaces it.
//
//   npm run make:ddcnorth

import { readFileSync, writeFileSync } from 'node:fs'
import { shelf, source, updateManifest } from './common.mjs'
import { illustration } from './illustrations.mjs'

const file = new URL('../../brands/ddcnorth/brand.json', import.meta.url)
const brand = JSON.parse(readFileSync(file, 'utf8'))
const EXTENSION = 'applications'

// --- Helpers, in the original templates' terms: px at 96 per inch, Inter Display headlines at
// -0.04 em, Space Mono labels at +0.12 em, the motif cropped at an edge.

const MM = 96 / 25.4
const px = (mm) => Math.round(mm * MM)
const print = (widthMm, heightMm) => ({ physical: [`${widthMm}mm`, `${heightMm}mm`] })

const template = (id, label, group, width, height, elements, { description, sources = [], raster, ...extra } = {}) => ({
  id, label, group, width, height, ...extra,
  raster: raster ?? Math.min(2400, Math.max(1080, width * 2)),
  title: `{name} / ${label.toLowerCase()}`,
  description: description ?? `${label}: part of the ddcnorth application system, modelled on the BC identity manuals. Text is live and editable.`,
  extension: EXTENSION,
  sources: sources.map(source),
  elements
})

const text = (id, value, x, y, size, extra = {}) => ({ type: 'text', ...(id ? { id } : { locked: true }), text: value, x, y, size, colour: 'ink', ...extra })
const display = (id, value, x, y, size, extra = {}) => text(id, value, x, y, size, { font: 'display', tracking: -0.04 * size, ...extra })
const label = (id, value, x, y, size, extra = {}) => text(id, value, x, y, size, { font: 'label', tracking: Math.round(0.12 * size * 10) / 10, ...extra })
const paragraph = (id, value, x, y, width, size, leading, extra = {}) => ({ type: 'paragraph', id, text: value, x, y, width, size, leading, colour: 'ink', font: 'body', ...extra })
const rule = (x1, y, x2, extra = {}) => ({ type: 'path', d: `M${x1} ${y}H${x2}`, stroke: 'rule', strokeWidth: 1, ...extra })
const rect = (x, y, width, height, fill, extra = {}) => ({ type: 'rect', x, y, width, height, fill, ...extra })
const logo = (x, y, width, colour = 'ink', extra = {}) => ({ type: 'logo', x, y, width, colour, ...extra })
const motif = (x, y, width, height, colour, extra = {}) => ({ type: 'motif', x, y, width, height, colour, align: 'right', ...extra })
const symbol = (x, y, height, colour = 'primary') => ({ type: 'symbol', x, y, height, colour })
const flow = (x, y, items, extra = {}) => ({ type: 'flow', x, y, items, ...extra })

/** An arrow of length `s` centred on (cx, cy), pointing right, left, up or down. */
const arrow = (cx, cy, s, direction = 'right') => {
  const points = [[-0.5, -0.12], [0.08, -0.12], [0.08, -0.4], [0.5, 0], [0.08, 0.4], [0.08, 0.12], [-0.5, 0.12]]
  const turn = { right: ([x, y]) => [x, y], left: ([x, y]) => [-x, y], up: ([x, y]) => [y, -x], down: ([x, y]) => [y, x] }[direction]
  return { type: 'path', d: `M${points.map(turn).map(([x, y]) => `${Math.round(cx + x * s)} ${Math.round(cy + y * s)}`).join('L')}Z`, fill: 'light' }
}

// The letterhead's footer, shared by every A4 document.
const a4Footer = (y = 1015) => [rule(62, y, 732), text('footer-contact', '[Contact details]', 62, y + 41, 12, { colour: 'muted' })]
const a4Head = (kind) => [
  { type: 'background', fill: 'reverse' },
  logo(62, 58, 200),
  label(null, kind, 732, 92, 13, { colour: 'primary', anchor: 'end' }),
  rule(62, 150, 732)
]
const A4 = { ...print(210, 297), raster: 1588 }

// --- Stationery (Reproduction Manual pp. 2–8; General Manual pp. 10–11).

const stationery = [
  template('letterhead-letter', 'US Letter letterhead', 'Stationery', 816, 1056, [
    { type: 'background', fill: 'reverse' },
    logo(62, 58, 285),
    rule(62, 184, 754),
    text('letter-date', '[Date]', 62, 238, 14),
    text('recipient-name', '[Recipient]', 62, 287, 16, { font: 'bold' }),
    text('recipient-address', '[Address]', 62, 313, 14, { colour: 'muted' }),
    text('letter-subject', '[Subject]', 62, 404, 30, { weight: 500 }),
    text('letter-content', '[Letter content]', 62, 453, 16),
    rule(62, 948, 754),
    text('footer-contact', '[Contact details]', 62, 989, 12, { colour: 'muted' })
  ], { physical: ['8.5in', '11in'], raster: 1632, sources: ['R08', 'G12'], description: 'The A4 letterhead’s layout on US Letter, for correspondence to the United States: the same logo, rules and fields.' }),
  template('letterhead-continuation', 'A4 continuation sheet', 'Stationery', 794, 1123, [
    { type: 'background', fill: 'reverse' },
    symbol(62, 56, 40),
    { type: 'text', compose: '{recipient-name} · Page {page-number}', x: 732, y: 84, size: 12, colour: 'muted', anchor: 'end' },
    rule(62, 120, 732),
    text('letter-content-continued', '[Letter content, continued]', 62, 180, 16),
    ...a4Footer()
  ], { ...A4, sources: ['G13', 'R03'], description: 'Second and later sheets of a letter: the symbol alone, the recipient and page number, and the letterhead’s footer.' }),
  template('envelope-dl', 'DL envelope', 'Stationery', px(220), px(110), [
    { type: 'background', fill: 'reverse' },
    logo(38, 36, 200),
    paragraph('return-address', '[Return address]', 40, 124, 300, 11, 15, { colour: 'muted', maxLines: 4 }),
    rect(px(20), px(50), px(90), px(45), 'none', { id: 'address-window', stroke: 'line', strokeWidth: 1 }),
    label(null, 'ADDRESS WINDOW / NOT PRINTED', px(20) + 10, px(50) + 18, 9, { colour: 'muted' }),
    motif(600, 236, 260, 220, 'light')
  ], { ...print(220, 110), raster: 1664, sources: ['G12', 'R08'], description: 'DL envelope (220 × 110 mm): the logo and return address top left, the window clear, the motif cropped at the corner.' }),
  template('compliments-slip', 'Compliments slip', 'Stationery', px(210), px(99), [
    { type: 'background', fill: 'reverse' },
    logo(62, 48, 240),
    display(null, 'With compliments', 62, 214, 44, { colour: 'primary' }),
    text('footer-contact', '[Contact details]', 62, 322, 12, { colour: 'muted' }),
    motif(560, 150, 300, 260, 'light')
  ], { ...print(210, 99), raster: 1588, sources: ['R09'], description: 'A third of A4: the logo, “With compliments”, and the contact line.' }),
  template('email-signature', 'Email signature', 'Stationery', 640, 200, [
    { type: 'background', fill: 'reverse' },
    logo(28, 40, 116, 'ink', { layout: 'stacked' }),
    { type: 'line', x1: 172, y1: 36, x2: 172, y2: 164, stroke: 'line', strokeWidth: 1 },
    text('contact-name', '[Name]', 196, 66, 20, { font: 'bold' }),
    text('contact-role', '[Role]', 196, 92, 14, { colour: 'muted' }),
    text('contact-email', '[Email]', 196, 128, 13),
    text('contact-phone', '[Phone]', 196, 148, 13),
    text('contact-website', '[Website]', 196, 168, 13, { colour: 'primary' })
  ], { raster: 1280, sources: ['R08'], description: 'An email signature at 640 × 200 px (use it at half size): the stacked logo and the card’s contact fields.' }),
  template('business-card-front-light', 'Business card, front (light)', 'Business cards', 960, 560, [
    { type: 'background', fill: 'paper' },
    logo(140, 205, 680, 'primary'),
    text('brand-tagline', 'BUILT FOR WHAT’S NEXT.', 150, 430, 22, { colour: 'muted', font: 'label', tracking: 3 }),
    { type: 'printGuides', colour: 'graphite', trim: { id: 'trim-90x50mm', x: 30, y: 30, width: 900, height: 500 }, safe: { id: 'safe-3mm-inside-trim', x: 60, y: 60, width: 840, height: 440 } }
  ], { physical: ['96mm', '56mm'], raster: 1920, print: { trim: [90, 50], bleed: 3, unit: 'mm' }, sources: ['R08', 'H16'], description: 'The card front on the paper colour, for printers or stock where the midnight flood is not wanted.' })
]

// --- Documents: memoranda, releases, forms (General Manual p. 12; Graphic Standards pp. 18–22).

const documents = [
  template('memorandum', 'Memorandum', 'Documents', 794, 1123, [
    ...a4Head('MEMORANDUM'),
    ...[['TO', 'memo-to', '[Recipient]'], ['FROM', 'memo-from', '[Name]'], ['DATE', 'letter-date', '[Date]'], ['SUBJECT', 'letter-subject', '[Subject]']].flatMap(([name, id, value], row) => [
      label(null, name, 62, 205 + row * 35, 11, { colour: 'muted' }),
      text(id, value, 180, 205 + row * 35, 15, row === 3 ? { font: 'bold' } : {})
    ]),
    rule(62, 345, 732),
    paragraph('memo-body', '[Memo content]', 62, 400, 670, 15, 24, { maxLines: 24 }),
    ...a4Footer()
  ], { ...A4, sources: ['G14', 'R14'], description: 'Internal memorandum: the logo and the word MEMORANDUM, To / From / Date / Subject on one column, then the body.' }),
  template('media-release', 'Media release', 'Documents', 794, 1123, [
    ...a4Head('MEDIA RELEASE'),
    label(null, 'FOR IMMEDIATE RELEASE', 62, 205, 12, { colour: 'muted' }),
    flow(62, 275, [
      { id: 'release-headline', text: '[Headline]', size: 40, font: 'display', tracking: -1.6, leading: 46, wrap: 670, maxLines: 3 },
      { id: 'release-dateline', text: '[City], [Date] —', size: 15, font: 'bold', gap: 70 },
      { id: 'release-body', text: '[Release content]', size: 15, leading: 24, wrap: 670, maxLines: 14, gap: 32 }
    ]),
    text(null, '###', 397, 860, 15, { colour: 'muted', anchor: 'middle' }),
    label(null, 'MEDIA CONTACT', 62, 905, 11, { colour: 'muted' }),
    text('contact-name', '[Name]', 62, 932, 15, { font: 'bold' }),
    text('contact-email', '[Email]', 62, 955, 14),
    text('contact-phone', '[Phone]', 62, 977, 14),
    ...a4Footer()
  ], { ...A4, sources: ['G14', 'R14'], description: 'Media release: the headline, dateline and body as one flow, the end mark, and the media contact above the footer.' }),
  template('invoice', 'Invoice', 'Documents', 794, 1123, [
    ...a4Head('INVOICE'),
    ...[['NUMBER', 'invoice-number', '[Invoice no.]', 62], ['DATE', 'letter-date', '[Date]', 290], ['DUE', 'invoice-due', '[Due date]', 518]].flatMap(([name, id, value, x]) => [
      label(null, name, x, 205, 11, { colour: 'muted' }), text(id, value, x, 232, 15, { font: 'bold' })
    ]),
    label(null, 'BILL TO', 62, 300, 11, { colour: 'muted' }),
    paragraph('bill-to', '[Client name and address]', 62, 326, 320, 14, 20, { maxLines: 4 }),
    rule(62, 450, 732, { stroke: 'ink' }),
    label(null, 'DESCRIPTION', 62, 478, 11, { colour: 'muted' }),
    label(null, 'AMOUNT', 732, 478, 11, { colour: 'muted', anchor: 'end' }),
    ...[1, 2, 3, 4].flatMap((n) => [
      text(`item-${n}`, `[Item ${n}]`, 62, 478 + n * 44, 15),
      text(`item-${n}-amount`, '[0.00]', 732, 478 + n * 44, 15, { anchor: 'end' }),
      rule(62, 478 + n * 44 + 16, 732)
    ]),
    label(null, 'TOTAL', 62, 720, 13, { colour: 'primary' }),
    display('invoice-total', '[0.00]', 732, 724, 30, { anchor: 'end' }),
    rule(62, 746, 732, { stroke: 'ink' }),
    paragraph('invoice-terms', '[Payment terms and remittance details]', 62, 800, 670, 13, 20, { colour: 'muted', maxLines: 5 }),
    ...a4Footer()
  ], { ...A4, sources: ['H19', 'H21'], description: 'Invoice on the forms grid: number, date and due date across the top, four line items, the total, and payment terms.' })
]

// --- Publications: covers, interior pages, mastheads (General Manual p. 8; Graphic Standards pp. 23–30).

const cover = (id, labelText, ground, colours) => template(id, labelText, 'Publications', 794, 1123, [
  { type: 'background', fill: ground },
  motif(330, 640, 620, 540, colours.motif),
  logo(62, 62, 240, colours.logo),
  label('report-type', 'REPORT', 62, 330, 13, { colour: colours.kicker }),
  flow(62, 400, [
    { id: 'report-title', text: '[Report title]', size: 54, font: 'display', tracking: -2.2, leading: 58, wrap: 620, maxLines: 3, colour: colours.title },
    { id: 'report-subtitle', text: '[Subtitle]', size: 20, leading: 28, wrap: 560, maxLines: 3, gap: 56, colour: colours.subtitle }
  ]),
  text('report-date', '[Month Year]', 62, 1060, 14, { colour: colours.subtitle })
], { ...A4, sources: ['H25', 'H26', 'G10'], description: `${labelText}: the logo top left; the kind of report, title and subtitle as one unit a quarter of the way down; the motif cropped at the foot.` })

const publications = [
  cover('report-cover', 'Report cover', 'paper', { motif: 'primary', logo: 'ink', kicker: 'primary', title: 'ink', subtitle: 'muted' }),
  cover('report-cover-reverse', 'Report cover, reversed', 'primary', { motif: 'light', logo: 'reverse', kicker: 'light', title: 'reverse', subtitle: 'light' }),
  template('report-page', 'Report page', 'Publications', 794, 1123, [
    { type: 'background', fill: 'reverse' },
    symbol(62, 46, 22),
    label('report-title', '[Report title]', 98, 63, 11, { colour: 'muted', caps: true }),
    label('page-number', '2', 732, 63, 11, { colour: 'muted', anchor: 'end' }),
    rule(62, 90, 732),
    flow(62, 170, [
      { id: 'section-kicker', text: '[01]', size: 12, font: 'label', tracking: 1.4, colour: 'primary' },
      { id: 'section-title', text: '[Section title]', size: 34, font: 'display', tracking: -1.4, leading: 40, wrap: 670, maxLines: 2, gap: 52 },
      { id: 'section-body', text: '[Section content]', size: 15, leading: 24, wrap: 670, maxLines: 30, gap: 46 }
    ]),
    rule(62, 1070, 732),
    text('footer-contact', '[Contact details]', 62, 1098, 11, { colour: 'muted' })
  ], { ...A4, sources: ['H31', 'G10'], description: 'An interior page: the symbol and the report’s title as a running head, the page number, then the section’s kicker, title and text as one flow.' }),
  template('newsletter', 'Newsletter', 'Publications', 794, 1123, [
    { type: 'background', fill: 'reverse' },
    rect(0, 0, 794, 250, 'primary'),
    logo(62, 50, 210, 'reverse'),
    display('newsletter-name', 'North Notes', 62, 198, 64, { colour: 'reverse' }),
    label('newsletter-issue', '[ISSUE 01] · [MONTH YEAR]', 732, 198, 12, { colour: 'light', anchor: 'end' }),
    flow(62, 320, [
      { id: 'article-kicker', text: '[TOPIC]', size: 12, font: 'label', tracking: 1.4, colour: 'primary' },
      { id: 'article-title', text: '[Article title]', size: 34, font: 'display', tracking: -1.4, leading: 40, wrap: 670, maxLines: 2, gap: 48 },
      { id: 'article-body', text: '[Article content]', size: 15, leading: 24, wrap: 670, maxLines: 24, gap: 44 }
    ]),
    rule(62, 1070, 732),
    text('footer-contact', '[Contact details]', 62, 1098, 11, { colour: 'muted' })
  ], { ...A4, sources: ['H30'], description: 'A newsletter’s first page: a masthead band with the logo, the newsletter’s name and issue line, then the lead article.' })
]

// --- Advertising (General Manual p. 9; Graphic Standards pp. 31–33, 36).

const advertising = [
  template('print-ad', 'Print advertisement, A5', 'Advertising', px(148), px(210), [
    { type: 'background', fill: 'reverse' },
    rect(0, 0, px(148), 10, 'primary'),
    flow(40, 92, [{ id: 'ad-headline', text: '[Headline]', size: 40, font: 'display', tracking: -1.6, leading: 44, wrap: 479, maxLines: 3 }]),
    rect(40, 270, 479, 300, 'light', { id: 'image-area' }),
    label(null, 'IMAGE / 3:2', 279, 425, 11, { colour: 'primary', anchor: 'middle' }),
    paragraph('ad-copy', '[Advertisement copy]', 40, 612, 479, 13, 19, { maxLines: 4 }),
    logo(40, 708, 190),
    text('contact-website', '[Website]', 519, 738, 13, { colour: 'primary', anchor: 'end' }),
    rect(0, px(210) - 10, px(148), 10, 'primary')
  ], { ...print(148, 210), raster: 1118, sources: ['H33', 'G11'], description: 'A display advertisement: heavy rules at head and foot, the headline, a 3:2 picture, the copy, and the logo as the final element.' }),
  template('job-posting', 'Job posting', 'Advertising', 1080, 1350, [
    { type: 'background', fill: 'paper' },
    motif(640, 940, 520, 450, 'primary'),
    logo(80, 76, 330),
    label('job-kicker', 'WE’RE HIRING', 80, 380, 24, { colour: 'primary' }),
    flow(80, 500, [
      { id: 'job-title', text: '[Role title]', size: 96, font: 'display', tracking: -3.8, leading: 100, wrap: 900, maxLines: 3 },
      { id: 'job-details', text: '[Location] · [Full time]', size: 32, gap: 90, colour: 'muted' }
    ]),
    text('job-cta', 'Apply at [Website]', 80, 1250, 30, { font: 'bold' })
  ], { raster: 1080, sources: ['H34', 'G11'], description: 'A recruitment post (4:5): the classified advertisement’s order of kicker, title, details and response line.' }),
  template('event-announcement', 'Event announcement', 'Advertising', 1080, 1350, [
    { type: 'background', fill: 'light' },
    motif(700, 1010, 460, 400, 'primary'),
    logo(80, 76, 330, 'primary'),
    label('event-kicker', '[EVENT]', 80, 380, 24, { colour: 'primary' }),
    flow(80, 500, [{ id: 'event-title', text: '[Event title]', size: 96, font: 'display', tracking: -3.8, leading: 100, wrap: 900, maxLines: 3, colour: 'primary' }]),
    { type: 'lines', x: 80, y: 1010, size: 32, leading: 46, colour: 'primary', lines: [{ id: 'event-date', text: '[Date]' }, { id: 'event-time', text: '[Time]' }, { id: 'event-place', text: '[Place]' }] }
  ], { raster: 1080, sources: ['G11', 'H37'], description: 'An announcement (4:5) on the ice ground: kicker, title, and date, time and place.' }),
  template('social-story', 'Social story', 'Advertising', 1080, 1920, [
    { type: 'background', fill: 'primary' },
    motif(560, -60, 600, 520, 'light'),
    logo(80, 140, 380, 'reverse'),
    flow(80, 860, [
      { id: 'story-headline', text: 'From insight to impact.', size: 120, font: 'display', tracking: -4.8, leading: 120, wrap: 920, maxLines: 4, colour: 'reverse' },
      { id: 'story-message', text: '[Your message here]', size: 36, leading: 48, wrap: 900, maxLines: 4, gap: 110, colour: 'light' }
    ]),
    label('story-cta', '[CALL TO ACTION]', 80, 1780, 26, { colour: 'light' })
  ], { raster: 1080, sources: ['G11'], description: 'A 9:16 story: the logo high, the headline and message as one flow, the call to action at the foot.' }),
  template('web-banner-mpu', 'Web banner, 300 × 250', 'Advertising', 300, 250, [
    { type: 'background', fill: 'primary' },
    motif(196, 150, 130, 112, 'light'),
    logo(20, 22, 150, 'reverse'),
    paragraph('banner-headline', 'Intelligence in motion.', 20, 112, 250, 26, 29, { font: 'display', tracking: -1, colour: 'reverse', maxLines: 2 }),
    rect(20, 186, 128, 40, 'light'),
    label('banner-cta', 'LEARN MORE', 84, 211, 12, { colour: 'primary', anchor: 'middle' })
  ], { raster: 600, sources: ['G11'], description: 'The medium rectangle: logo, a two-line headline, and a button.' }),
  template('web-banner-leaderboard', 'Web banner, 728 × 90', 'Advertising', 728, 90, [
    { type: 'background', fill: 'primary' },
    logo(20, 28, 150, 'reverse'),
    display('banner-headline', 'Intelligence in motion.', 196, 56, 24, { colour: 'reverse' }),
    rect(590, 25, 118, 40, 'light'),
    label('banner-cta', 'LEARN MORE', 649, 50, 12, { colour: 'primary', anchor: 'middle' })
  ], { raster: 1456, sources: ['G11'], description: 'The leaderboard: logo, headline and button on one line.' })
]

// --- Presentations and video (Graphic Standards p. 34: audio-visual).

const slides = [
  template('presentation-section', 'Presentation section', 'Presentations', 1920, 1080, [
    { type: 'background', fill: 'primary' },
    motif(1400, 600, 580, 500, 'light'),
    display('section-number', '01', 136, 470, 240, { colour: 'light' }),
    flow(136, 650, [{ id: 'section-title', text: '[Section title]', size: 96, font: 'display', tracking: -3.8, leading: 100, wrap: 1180, maxLines: 2, colour: 'reverse' }]),
    logo(136, 950, 240, 'reverse')
  ], { raster: 1920, sources: ['H35'], description: 'A section divider: the number large in ice, the title reversed, the logo at the foot.' }),
  template('presentation-content', 'Presentation content', 'Presentations', 1920, 1080, [
    { type: 'background', fill: 'paper' },
    label('slide-kicker', '[TOPIC]', 136, 150, 22, { colour: 'primary' }),
    flow(136, 250, [
      { id: 'slide-title', text: '[Slide title]', size: 72, font: 'display', tracking: -2.9, leading: 78, wrap: 1500, maxLines: 2 },
      { id: 'slide-body', text: '[Slide content]', size: 32, leading: 46, wrap: 1200, maxLines: 10, gap: 90 }
    ]),
    symbol(1736, 944, 48),
    label('slide-number', '02', 136, 990, 18, { colour: 'muted' })
  ], { raster: 1920, sources: ['H35'], description: 'A content slide: kicker, title and body as one flow; the symbol and slide number at the foot.' }),
  template('presentation-closing', 'Presentation closing', 'Presentations', 1920, 1080, [
    { type: 'background', fill: 'primary' },
    motif(1200, 325, 650, 560, 'light'),
    logo(136, 95, 445, 'reverse'),
    display('closing-line', 'Thank you.', 136, 560, 132, { colour: 'reverse' }),
    { type: 'lines', x: 140, y: 720, size: 32, leading: 48, colour: 'light', lines: [{ id: 'contact-name', text: '[Name]' }, { id: 'contact-email', text: '[Email]' }, { id: 'contact-website', text: '[Website]' }] }
  ], { raster: 1920, sources: ['H35'], description: 'The closing slide: the logo, a closing line, and the presenter’s contact details.' }),
  template('video-lower-third', 'Video lower third', 'Video', 1920, 1080, [
    rect(96, 816, 900, 150, 'primary'),
    symbol(126, 846, 90, 'reverse'),
    display('contact-name', '[Name]', 262, 885, 46, { colour: 'reverse' }),
    text('contact-role', '[Role]', 264, 935, 26, { colour: 'light' })
  ], { raster: 1920, sources: ['H35'], description: 'A lower third on a transparent 1920 × 1080 frame: the symbol and the speaker’s name and role on a midnight bar.' }),
  template('video-end-card', 'Video end card', 'Video', 1920, 1080, [
    { type: 'background', fill: 'primary' },
    logo(560, 380, 800, 'reverse'),
    label('end-tagline', 'BUILT FOR WHAT’S NEXT.', 960, 700, 26, { colour: 'light', anchor: 'middle' }),
    text('contact-website', '[Website]', 960, 780, 34, { colour: 'reverse', anchor: 'middle' })
  ], { raster: 1920, sources: ['H35'], description: 'The last frame of a video: the logo centred, the tagline and the website.' }),
  template('virtual-background', 'Virtual background', 'Video', 1920, 1080, [
    { type: 'background', fill: 'paper' },
    motif(1150, 520, 900, 760, 'light'),
    logo(96, 80, 300)
  ], { raster: 1920, sources: ['H35'], description: 'A video-call background: the logo top left, the motif cropped bottom right, the middle left clear for the speaker.' })
]

// --- Signs (the Sign Manual's grid: one square is a twelfth of the longest side; Graphic Standards pp. 37–40).

const signs = [
  template('sign-exterior', 'Exterior identification sign', 'Signs', 2400, 1200, [
    { type: 'background', fill: 'primary' },
    motif(1700, 600, 800, 680, 'light'),
    logo(200, 260, 1400, 'reverse'),
    text('sign-occupant', '[Suite 100 · Main entrance]', 200, 820, 80, { colour: 'reverse', font: 'display', tracking: -3.2 }),
    text('sign-address', '[Street address]', 200, 940, 60, { colour: 'light' })
  ], { ...print(2400, 1200), raster: 2400, sources: ['S12', 'S07', 'H39'], description: 'Primary identification, 2400 × 1200 mm, on a grid of 200 mm (a twelfth of the length): the logo seven squares wide, two squares in from the left.' }),
  template('sign-door', 'Door sign', 'Signs', 1200, 600, [
    { type: 'background', fill: 'reverse' },
    symbol(72, 72, 72),
    display('room-name', '[Room name]', 72, 360, 110),
    label('room-number', '[000]', 72, 470, 48, { colour: 'muted' }),
    rect(0, 570, 1200, 30, 'primary')
  ], { ...print(300, 150), raster: 1200, sources: ['S14', 'S16'], description: 'Secondary identification, 300 × 150 mm: the symbol, the room’s name and number, a midnight base.' }),
  template('sign-directional', 'Directional sign', 'Signs', 1800, 1350, [
    { type: 'background', fill: 'primary' },
    ...[['right', 'direction-1'], ['left', 'direction-2'], ['up', 'direction-3']].flatMap(([direction, id], row) => [
      arrow(225, row * 450 + 225, 250, direction),
      display(id, '[Destination]', 420, row * 450 + 268, 120, { colour: 'reverse' }),
      ...(row ? [{ type: 'line', x1: 0, y1: row * 450, x2: 1800, y2: row * 450, stroke: 'light', strokeWidth: 6 }] : [])
    ])
  ], { ...print(1800, 1350), raster: 1800, sources: ['S19', 'S20', 'H40'], description: 'Three directional blades, 1800 × 450 mm each: one destination to a blade, the arrow first, a keyline between.' }),
  template('pull-up-banner', 'Pull-up banner', 'Signs', 850, 2000, [
    { type: 'background', fill: 'primary' },
    motif(250, 1450, 700, 600, 'light'),
    logo(100, 150, 650, 'reverse'),
    flow(100, 780, [
      { id: 'pullup-headline', text: 'Intelligence in motion.', size: 110, font: 'display', tracking: -4.4, leading: 110, wrap: 660, maxLines: 4, colour: 'reverse' },
      { id: 'pullup-message', text: '[Your message here]', size: 36, leading: 48, wrap: 650, maxLines: 3, gap: 110, colour: 'light' }
    ]),
    text('contact-website', '[Website]', 100, 1380, 40, { colour: 'reverse', font: 'bold' })
  ], { ...print(850, 2000), raster: 1700, sources: ['H36'], description: 'A pull-up banner, 850 × 2000 mm: the logo at eye height and above, headline and message, the motif at the foot where stands hide it least.' })
]

// --- Vehicles and apparel, on ManualKit's drawings (Vehicle Manual; General Manual pp. 13–15;
// Graphic Standards pp. 41–47). The body or cloth takes a brand colour; the identity goes in the
// branding zones the manuals marked: the logo (stacked in square zones, horizontal in long
// ones), a fleet number in Space Mono where the manuals put a unit number.

const zonesFor = (drawing, colour) => Object.fromEntries(drawing.zones.map((zone) => {
  if (['signature', 'hydro', 'hydro-gas', 'hydro-rail', 'applied-identity'].includes(zone.kind)) return [zone.id, { logo: true, colour }]
  if (zone.kind === 'unit') return [zone.id, { id: 'fleet-number', text: 'DDC 01', font: 'label', colour, fill: 0.8 }]
  if (zone.kind === 'nameplate' || zone.kind === 'curved-name') return [zone.id, { id: 'team-name', text: 'FIELD TEAM', font: 'label', colour, fill: 0.6 }]
  if (zone.kind === 'patch') return [zone.id, { symbol: true, colour }]
  return [zone.id, null]
}).filter(([, spec]) => spec))

const DRAWN = [
  ['V10-van-perspective', 'Van', 'Vehicles', { paint: 'primary' }, 'reverse'],
  ['V11-van-side', 'Van, side', 'Vehicles', { paint: 'primary' }, 'reverse'],
  ['V11-van-rear', 'Van, rear', 'Vehicles', { paint: 'primary' }, 'reverse'],
  ['V08-pickup-perspective', 'Pickup', 'Vehicles', { paint: 'reverse' }, 'primary'],
  ['V07-side-car', 'Car, side', 'Vehicles', { paint: 'light' }, 'primary'],
  ['H44-van-door', 'Van door', 'Vehicles', { paint: 'primary' }, 'reverse'],
  ['G15-jacket-back', 'Jacket, back', 'Apparel', { fabric: 'primary' }, 'reverse'],
  ['G15-field-jacket', 'Field jacket, sleeve', 'Apparel', { fabric: 'graphite' }, 'primary'],
  ['G15-blazer', 'Blazer, pocket', 'Apparel', { fabric: 'graphite' }, 'reverse'],
  ['G15-hard-hat', 'Hard hat', 'Apparel', {}, 'primary']
]

const illustrations = {}
const drawn = DRAWN.map(([id, labelText, group, materials, colour]) => {
  const drawing = illustration(id)
  illustrations[id] = drawing
  const [, , vw, vh] = drawing.viewBox
  const width = 1600
  const height = Math.round((width * vh) / vw)
  const zones = zonesFor(drawing, colour)
  return template(`drawn-${id.toLowerCase()}`, labelText, group, width, height, [
    { type: 'background', fill: '#ffffff' },
    { type: 'illustration', illustration: id, x: 0, y: 0, width, height, markings: false, materials, zones }
  ], {
    raster: 1600,
    sources: [id.split('-')[0], ...(id.startsWith('V') ? ['V05'] : id.startsWith('H') ? ['H43'] : [])],
    description: `${labelText}: ManualKit’s drawing from page ${id.split('-')[0]}, in ddcnorth’s colours, with the identity in the branding zones the manual marked (${drawing.zones.map((zone) => zone.label.toLowerCase()).join(', ')}).`
  })
})

// --- Guide pages: what the manuals cover that ddcnorth's guide did not.

const ratio = (id) => { const entry = [...stationery, ...documents, ...publications, ...advertising, ...slides, ...signs, ...drawn].find((item) => item.id === id); return entry.width / entry.height }
const item = (id, labelText, frame = false) => ({ src: `templates/${id}`, ratio: ratio(id), label: labelText, frame })

const cell = (x, y, w, h, ground, stroke) => ({ type: 'rect', x, y, width: w, height: h, fill: ground, ...(stroke ? { stroke } : {}) })
const verdict = (x, y, ok, note) => [{ type: 'label', text: `${ok ? 'USE' : 'AVOID'} / ${note}`, x, y, colour: ok ? 'primary' : 'muted' }]

const CELL_W = 302
const groundCell = (index, ground, logoColour, ok, note, row) => {
  const x = 64 + index * (CELL_W + 32)
  const y = row ? 600 : 250
  return [cell(x, y, CELL_W, 220, ground, ground === 'reverse' || ground === 'paper' ? 'line' : undefined), { type: 'logo', x: x + 26, y: y + 84, width: CELL_W - 52, colour: logoColour }, ...verdict(x, y + 256, ok, note)]
}

const dontCell = (index, note, art) => {
  const x = 64 + (index % 4) * (CELL_W + 32)
  const y = 250 + Math.floor(index / 4) * 340
  return [cell(x, y, CELL_W, 230, 'reverse', 'line'), ...art(x, y), { type: 'label', text: note, x, y: y + 266, colour: 'ink' }]
}
const centre = (x, y) => [x + CELL_W / 2, y + 115]

const guidePages = [
  {
    title: 'Backgrounds and contrast.', name: 'Backgrounds', subtitle: 'One colour for the whole logo, chosen for the ground: black or midnight on light grounds, white on dark ones.',
    sources: ['H07', 'H08', 'G07'],
    elements: [
      ...groundCell(0, 'paper', 'ink', true, 'BLACK ON PAPER', 0),
      ...groundCell(1, 'reverse', 'primary', true, 'MIDNIGHT ON WHITE', 0),
      ...groundCell(2, 'primary', 'reverse', true, 'WHITE ON MIDNIGHT', 0),
      ...groundCell(3, 'light', 'primary', true, 'MIDNIGHT ON ICE', 0),
      ...groundCell(0, 'graphite', 'reverse', true, 'WHITE ON GRAPHITE', 1),
      ...groundCell(1, 'ink', 'reverse', true, 'WHITE ON BLACK', 1),
      ...groundCell(2, 'paper', 'light', false, 'ICE ON PAPER', 1),
      ...groundCell(3, 'primary', 'ink', false, 'BLACK ON MIDNIGHT', 1),
      { type: 'para', text: 'Over a photograph, place the logo where the picture is plainest, or on a flat panel of the palette. Never a two-colour logo; never the logo in ice on a light ground.', x: 64, y: 920, width: 1312, size: 18 }
    ]
  },
  {
    title: 'Keep the logo intact.', name: 'Incorrect usage', subtitle: 'The logo is supplied artwork. These are the mistakes it most often meets; each is a rule.',
    sources: ['H09', 'H10', 'H11', 'G09'],
    elements: [
      ...dontCell(0, 'DO NOT STRETCH OR SQUASH', (x, y) => { const [cx, cy] = centre(x, y); return [{ type: 'logo', x: x + 36, y: y + 92, width: CELL_W - 72, transform: `translate(${cx} ${cy}) scale(1.18 0.62) translate(${-cx} ${-cy})` }] }),
      ...dontCell(1, 'DO NOT TURN IT', (x, y) => { const [cx, cy] = centre(x, y); return [{ type: 'logo', x: x + 36, y: y + 92, width: CELL_W - 72, transform: `rotate(-14 ${cx} ${cy})` }] }),
      ...dontCell(2, 'DO NOT SLANT IT', (x, y) => { const [cx, cy] = centre(x, y); return [{ type: 'logo', x: x + 36, y: y + 92, width: CELL_W - 72, transform: `translate(${cx} ${cy}) skewX(-18) translate(${-cx} ${-cy})` }] }),
      ...dontCell(3, 'DO NOT USE TWO COLOURS', (x, y) => [{ type: 'symbol', x: x + 36, y: y + 92, height: 50, colour: 'light' }, { type: 'logo', x: x + 96, y: y + 94, width: CELL_W - 132, layout: 'wordmark', colour: 'primary' }]),
      ...dontCell(4, 'DO NOT REARRANGE IT', (x, y) => [{ type: 'logo', x: x + 30, y: y + 96, width: CELL_W - 130, layout: 'wordmark' }, { type: 'symbol', x: x + CELL_W - 86, y: y + 92, height: 50 }]),
      ...dontCell(5, 'DO NOT RETYPE THE NAME', (x, y) => [{ type: 'symbol', x: x + 36, y: y + 92, height: 50 }, { type: 'text', text: 'DDC North', x: x + 98, y: y + 132, size: 36, font: 'bold' }]),
      ...dontCell(6, 'DO NOT FADE IT', (x, y) => [{ type: 'logo', x: x + 36, y: y + 92, width: CELL_W - 72, opacity: 0.35 }]),
      ...dontCell(7, 'DO NOT CROWD IT', (x, y) => [{ type: 'logo', x: x + 36, y: y + 92, width: CELL_W - 72 }, { type: 'text', text: 'Our new service', x: x + 40, y: y + 160, size: 22, font: 'bold' }]),
      { type: 'para', text: 'Use the supplied files. Leave at least one dot diameter clear on every side, and never set the logo smaller than the minimum sizes on page 14.', x: 64, y: 940, width: 1312, size: 18 }
    ]
  },
  {
    title: 'Stationery and documents.', name: 'Stationery and documents', subtitle: 'Letters on A4 or US Letter, with a continuation sheet; envelopes, slips and signatures; memoranda, releases and invoices on the same margins.',
    sources: ['R03', 'R08', 'G12', 'G14'],
    elements: [
      ...shelf([item('letterhead-letter', 'US LETTER', true), item('letterhead-continuation', 'CONTINUATION', true), item('memorandum', 'MEMORANDUM', true), item('media-release', 'MEDIA RELEASE', true), item('invoice', 'INVOICE', true)], { y: 250, height: 360 }),
      ...shelf([item('envelope-dl', 'DL ENVELOPE', true), item('compliments-slip', 'COMPLIMENTS SLIP', true), item('email-signature', 'EMAIL SIGNATURE', true)], { y: 700, height: 160 })
    ]
  },
  {
    title: 'Publications and advertising.', name: 'Publications and advertising', subtitle: 'Covers carry the logo top left and the title a quarter of the way down. In every advertisement the logo comes last.',
    sources: ['H25', 'H30', 'H33', 'G08', 'G11'],
    elements: [
      ...shelf([item('report-cover', 'REPORT COVER', true), item('report-cover-reverse', 'REVERSED'), item('report-page', 'INTERIOR', true), item('newsletter', 'NEWSLETTER', true), item('print-ad', 'A5 ADVERTISEMENT', true)], { y: 250, height: 360 }),
      ...shelf([item('job-posting', 'JOB POSTING'), item('event-announcement', 'ANNOUNCEMENT'), item('social-story', 'STORY'), item('web-banner-mpu', '300 × 250')], { y: 690, height: 190, width: 640 }),
      ...shelf([item('web-banner-leaderboard', '728 × 90')], { x: 760, y: 690, height: 76, width: 616 })
    ]
  },
  {
    title: 'Screens, signs and spaces.', name: 'Screens and signs', subtitle: 'Slides and video frames share the cover’s layout. Signs are set on a grid of one twelfth of their longest side.',
    sources: ['H35', 'S07', 'S12', 'S19'],
    elements: [
      ...shelf([item('presentation-section', 'SECTION'), item('presentation-content', 'CONTENT', true), item('presentation-closing', 'CLOSING'), item('video-lower-third', 'LOWER THIRD', true)], { y: 250, height: 190 }),
      ...shelf([item('sign-exterior', 'EXTERIOR SIGN'), item('sign-door', 'DOOR SIGN', true), item('sign-directional', 'DIRECTIONAL'), item('pull-up-banner', 'PULL-UP')], { y: 540, height: 330 })
    ]
  },
  {
    title: 'Vehicles and apparel.', name: 'Vehicles and apparel', subtitle: 'One colour of logo on one colour of body: white on midnight, midnight on white or ice. The logo goes where the manuals placed the signature; a fleet number where they placed the unit number.',
    sources: ['V04', 'V05', 'H43', 'G15'],
    elements: [
      ...shelf([item('drawn-v10-van-perspective', 'VAN'), item('drawn-v08-pickup-perspective', 'PICKUP'), item('drawn-h44-van-door', 'DOOR')], { y: 250, height: 260 }),
      ...shelf([item('drawn-g15-jacket-back', 'JACKET'), item('drawn-g15-field-jacket', 'SLEEVE'), item('drawn-g15-blazer', 'BLAZER'), item('drawn-g15-hard-hat', 'HARD HAT')], { y: 600, height: 260 })
    ]
  }
].map((page) => ({ ...page, extension: EXTENSION, sources: page.sources.map(source) }))

// --- Write: replace any earlier extension, keep everything else as it was.

const added = [...stationery, ...documents, ...publications, ...advertising, ...slides, ...signs, ...drawn]
brand.templates = [...brand.templates.filter((entry) => entry.extension !== EXTENSION), ...added]
const original = brand.guide.pages.filter((page) => page.extension !== EXTENSION)
// The new pages go before the closing page on files and minimum sizes.
brand.guide.pages = [...original.slice(0, -1), ...guidePages, original.at(-1)]
brand.illustrations = illustrations
brand.fields = {
  ...(brand.fields ?? {}),
  'recipient-name': { label: 'Recipient', placeholder: '[Recipient]' },
  'page-number': { label: 'Page number', placeholder: '2' },
  'fleet-number': { label: 'Fleet number', placeholder: 'DDC 01' },
  'team-name': { label: 'Team', placeholder: 'FIELD TEAM' }
}
brand.manuals = { pack: 'bc', relation: 'Modelled on' }

writeFileSync(file, `${JSON.stringify(brand, null, 2)}\n`)
updateManifest(brand)
console.log(`ddcnorth: ${added.length} templates added (${brand.templates.length} in all), ${guidePages.length} guide pages, ${Object.keys(illustrations).length} drawings`)
