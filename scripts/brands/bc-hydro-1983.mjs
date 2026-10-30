// Writes brands/bc-hydro-1983/brand.json: BC Hydro's identity as its 1983 Graphic Standards
// Manual sets it out (manual pages H01–H48 in the BC manual pack).
//
// The four signatures are fixed artwork (artwork.json, imported from PofBC by
// scripts/import-pofbc.mjs); everything else is measured from the manual's pages. Times Roman is
// set in TeX Gyre Termes, its open-licence equivalent.
//
//   node scripts/brands/bc-hydro-1983.mjs

import { extendBrandPatterns } from './pattern-collections.mjs'
import { readFileSync } from 'node:fs'
import { box, cite, g, inch, line, locked, pt, readJson, round, shelf, text, writeBrand } from './common.mjs'
import { loadBrandFonts } from '../../src/fonts/provider.js'
import { illustrated } from './illustrations.mjs'
import { hydroLibrary, writeMotion } from './bc-motion.mjs'
import { loadBrandFontsFromDisk } from '../../src/fonts/node.js'
import { bceRouteIllustrations, writeBceRouteAssets } from './bc-hydro-bce-route.mjs'
import { additionalForms, additionalFormSources } from './bc-hydro-forms.mjs'
import { additionalPublications, additionalPublicationSources } from './bc-hydro-publications.mjs'
import { attachHydroGuides } from './bc-hydro-guides.mjs'

const folder = new URL('../../brands/bc-hydro-1983/', import.meta.url)
const art = readJson(new URL('artwork.json', folder))
// Termes itself, to measure lines whose width sets a sign's size.
const termes = await loadBrandFonts({ fonts: { body: { file: 'fonts/texgyretermes-regular.otf' }, bold: { file: 'fonts/texgyretermes-bold.otf' } } }, (file) => { const bytes = readFileSync(new URL(file, folder)); return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) })
const measure = (value, sizeMm, face = 'body', trackingEm = 0) => Math.max(...value.split('\n').map((line) => termes.width(line, face, sizeMm, trackingEm)))
const CAP = 0.662 // Termes capitals, per em
const cap = (points) => round(CAP * pt(points))

// Signature geometry, in signature units (see artwork.json's metrics).
const sig = (id) => art.signatures[id]
const widthOf = (id) => sig(id).bounds[2] - sig(id).bounds[0]
/** Where the logotype's "B" lands when signature `id` is placed `width` mm wide at `x`. */
const logotypeAt = (id, x, width) => round(x + sig(id).metrics.logotypeX * width / widthOf(id))

const SIGNATURE_WIDTH = { standard: inch(1.5), gas: inch(1.5), rail: inch(2.125) }

// Stationery (H15–H18): one design for the three sets, Corporate, Gas Operations and Rail.
const SETS = [
  { id: 'standard', name: 'Corporate', letterLines: [{ compose: '{street}, {city}, B.C. {postal-code}' }, { compose: 'Telex {telex}' }], envelopeAddress: false, cardLines: [{ compose: '{title}, {division}' }, { compose: '{street}, {city}, B.C. {postal-code}' }], cardPhone: [{ compose: '{telephone}' }] },
  { id: 'gas', name: 'Gas Operations', letterLines: [{ compose: '{street}, {city}, B.C. {postal-code}' }, { compose: 'Telephone {telephone}' }], envelopeAddress: true, cardLines: [{ compose: '{title}, {department}' }, { text: 'Gas Operations', locked: true }, { compose: '{street}' }, { compose: '{city}, B.C. {postal-code}' }], cardPhone: [{ compose: '{telephone}' }, { compose: 'Local {local}', alignLeft: 'above' }] },
  { id: 'rail', name: 'B.C.Hydro Rail', letterLines: [{ compose: '{street}, {city}, B.C. {postal-code}' }, { compose: 'Telex {telex}  Telephone {telephone}' }], envelopeAddress: true, cardLines: [{ compose: '{title}' }, { compose: '{street}' }, { compose: '{city}, B.C. {postal-code}' }, { compose: '{telephone}  Telex {telex}' }], cardPhone: [] }
]

const stationery = SETS.flatMap((set) => {
  const width = SIGNATURE_WIDTH[set.id]
  const group = `Stationery, ${set.name}`
  const letterX = inch(8.5 - 4) // symbol 4 in from the right trim
  const envelopeX = inch(0.5)
  const cardX = inch(1)
  return [
    {
      id: `letterhead-${set.id}`, label: 'Letterhead', group, unit: 'mm', width: 215.9, height: 279.4, physical: ['8.5in', '11in'], raster: 1700,
      title: `B.C.Hydro / ${set.name} letterhead`,
      description: `${set.name} letterhead (Graphic Standards Manual p. ${{ standard: 15, gas: 16, rail: 17 }[set.id]}): signature 4 in from the right trim with its baseline 1 in from the top; address in 10 on 11 point Times Roman, 3/16 in below, under the "B".`,
      elements: [
        { type: 'background', fill: 'paper' },
        { type: 'logo', signature: set.id, colourway: 'black', x: letterX, y: inch(1), width, anchorY: 'baseline' },
        { type: 'lines', id: 'address', x: logotypeAt(set.id, letterX, width), y: round(inch(1) + inch(3 / 16)), leading: pt(11), size: '10pt', font: 'body', colour: 'ink', lines: set.letterLines },
        // H18: ¾ in left is printed; width and bottom alignment are measured from the scan.
        ...(set.id === 'rail' ? [{ type: 'illustration', id: 'bce-route-letterhead', illustration: 'bce-route-outline', x: inch(0.75), y: round(inch(1 + 3 / 16) + pt(11) + pt(2.5) - inch(1.375) * 150 / 415), width: inch(1.375) }] : [])
      ]
    },
    {
      id: `envelope-${set.id}`, label: 'Envelope, No. 10', group, unit: 'mm', width: 241.3, height: 104.775, physical: ['9.5in', '4.125in'], raster: 1900,
      title: `B.C.Hydro / ${set.name} envelope, No. 10`,
      description: `${set.name} envelope: form number 6 point, return statement 10 point, signature ½ in from the left and its baseline ¾ in from the top. The manual shows only the left portion; the No. 10 overall size is an adopted reconstruction format.`,
      elements: [
        { type: 'background', fill: 'paper' },
        text('form-number', '12345', inch(0.25), inch(0.25), '6pt', { font: 'body', colour: 'ink' }),
        text('return-statement', 'Return in ten days', logotypeAt(set.id, envelopeX, width), inch(0.25), '10pt', { font: 'body', colour: 'ink' }),
        { type: 'logo', signature: set.id, colourway: 'black', x: envelopeX, y: inch(0.75), width, anchorY: 'baseline' },
        ...(set.envelopeAddress ? [{ type: 'text', id: 'return-address', compose: '{street}, {city}, B.C. {postal-code}', x: logotypeAt(set.id, envelopeX, width), y: round(inch(0.75) + inch(3 / 16)), size: '10pt', font: 'body', colour: 'ink' }] : [])
      ]
    },
    {
      id: `card-${set.id}`, label: 'Business card', group, unit: 'mm', width: 88.9, height: 50.8, physical: ['3.5in', '2in'], raster: 1400,
      title: `B.C.Hydro / ${set.name} business card`,
      description: `${set.name} business card: signature blind embossed, 1 in from the left; name 12 point; the rest 8 on 9 point, its last line ¼ in from the bottom; the telephone ends where the symbol begins.`,
      elements: [
        { type: 'background', fill: 'paper' },
        { type: 'logo', signature: set.id, colourway: 'blind', x: cardX, y: inch(0.625), width, anchorY: 'baseline' },
        text('name', undefined, logotypeAt(set.id, cardX, width), inch(1.125), '12pt', { font: 'body', colour: 'ink' }),
        { type: 'lines', id: 'card-details', x: logotypeAt(set.id, cardX, width), y: inch(1.75), align: 'bottom', leading: pt(9), size: '8pt', font: 'body', colour: 'ink', lines: set.cardLines },
        ...(set.cardPhone.length ? [{ type: 'lines', id: 'card-telephone', x: cardX, y: inch(1.75), align: 'bottom', anchor: 'end', leading: pt(9), size: '8pt', font: 'body', colour: 'ink', lines: set.cardPhone }] : []),
        // H18 dimensions the separate blue mark at 1 in with 1/16 in to the address.
        ...(set.id === 'rail' ? [{ type: 'illustration', id: 'bce-route-card', illustration: 'bce-route-card', x: round(logotypeAt(set.id, cardX, width) - inch(1 + 1 / 16)), y: round(inch(1.75) - inch(1) * 105 / 300), width: inch(1) }] : [])
      ]
    }
  ]
})

// Forms (H19–H20): name 20 point top left and the signature at 20 point top right, both ⅜ in
// from the top; ½ point rules; the form number 6 point at the bottom left.
const formTop = inch(0.375)
const formLeft = inch(0.65)
const formRules = [1.1, 1.433, 1.767].map(inch)
const bulletin = {
  id: 'form-bulletin', label: 'Form: Bulletin', group: 'Forms', unit: 'mm', width: 215.9, height: 279.4, physical: ['8.5in', '11in'], raster: 1700,
  title: 'B.C.Hydro / Bulletin form, Gas Operations',
  description: 'An 8½ × 11 form (Graphic Standards Manual p. 19): form name 20 point Times Roman top left, a 20 point signature top right 1 in from the right edge, both ⅜ in from the top; ½ point rules; squared boxes; the form number 6 point at the bottom left.',
  elements: [
    { type: 'background', fill: 'paper' },
    text('form-name', 'Bulletin', formLeft, round(formTop + cap(20)), '20pt', { font: 'body', colour: 'ink' }),
    { type: 'logo', signature: 'gas', colourway: 'black', points: 20, x: inch(7.5), y: formTop, anchorX: 'end', anchorY: 'cap' },
    ...formRules.flatMap((y, row) => [
      line(formLeft, y, inch(4.125), y, '0.5pt'),
      line(inch(4.5), y, inch(6.375), y, '0.5pt'),
      locked(['Originator', 'To', ''][row], formLeft, round(y - 1.2), '8pt', { font: 'body', colour: 'ink' }),
      locked(['Bulletin number', 'Page', 'Effective date'][row], inch(4.5), round(y - 1.2), '8pt', { font: 'body', colour: 'ink' })
    ]),
    locked('of', inch(5.45), round(formRules[1] - 1.2), '8pt', { font: 'body', colour: 'ink' }),
    // H20: one justified 12 point flow across two 88.6 mm columns, lines 4.49 mm apart: three lines
    // in the first, ending mid-sentence, and two in the second.
    { type: 'paragraph', id: 'instructions', locked: true, text: 'This bulletin shall be used for circulating general information (local or division-wide); or information which clarifies, but does not alter the intent of,', x: formLeft, y: 55.06, width: 88.6, size: '12pt', leading: 4.49, align: 'justify', alignLast: 'justify', font: 'body', colour: 'ink' },
    { type: 'paragraph', id: 'instructions-2', locked: true, text: 'an approved standard practice instruction or job breakdown.', x: inch(4.5), y: 55.06, width: 88.6, size: '12pt', leading: 4.49, align: 'justify', font: 'body', colour: 'ink' },
    box(formLeft, inch(2.6), round(inch(8) - formLeft), inch(7.85)),
    line(formLeft, inch(9.95), inch(8), inch(9.95), '0.5pt'),
    line(inch(3), inch(9.95), inch(3), inch(10.45), '0.5pt'),
    line(inch(5.6), inch(9.95), inch(5.6), inch(10.45), '0.5pt'),
    text('form-number', 'D68-394', formLeft, inch(10.75), '6pt', { font: 'body', colour: 'ink' }),
    text('division', 'Gas Transmission and Distribution Division', inch(8), inch(10.75), '14pt', { font: 'body', colour: 'ink', anchor: 'end' })
  ]
}

// Publications (H25–H30): the signature and title as one unit, starting ¼ of the cover's depth
// down and ⅓ of its width across; title two cap-heights below the signature's baseline, the
// subtitle half the size one cap-height below that.
const cover = ({ id, label, width, height, physical, size, colourway, illustration, items }) => {
  const x = round(width / 3)
  const capTop = round(height / 4)
  const baseline = capTop + cap(size)
  const half = size / 2
  return {
    id, label, group: 'Publications', unit: 'mm', width, height, physical, raster: Math.round(width / 25.4 * 200),
    title: `B.C.Hydro / ${label}`,
    description: `${label} (Graphic Standards Manual pp. 24–27): a ${size} point signature and title as one unit, ¼ down and ⅓ across; title ${size} on ${size}, two cap-heights below the signature; subordinate matter ${half} on ${half}, one cap-height apart.`,
    elements: [
      { type: 'background', fill: 'paper' },
      { type: 'logo', signature: 'standard', colourway, points: size, x, y: capTop, anchorX: 'logotype', anchorY: 'cap' },
      {
        type: 'flow', x, y: round(baseline + 3 * cap(size)), font: 'body', colour: 'ink',
        items: items.map((item, index) => ({ ...item, size: `${index === 0 ? size : half}pt`, leading: pt(index === 0 ? size : half), gap: index === 0 ? undefined : round(cap(size) + cap(half) + (index === 0 ? 0 : 0)) }))
      },
      ...(illustration ? [{ type: 'rect', id: 'illustration', fill: 'light', ...illustration }] : []),
      ...(illustration?.label ? [locked(illustration.label, round(illustration.x + illustration.width / 2), round(illustration.y + illustration.height / 2), '12pt', { font: 'italic', colour: 'primary', anchor: 'middle' })] : [])
    ]
  }
}

const publications = [
  cover({ id: 'cover-report', label: 'Report cover', width: 215.9, height: 279.4, physical: ['8.5in', '11in'], size: 36, colourway: 'black', items: [{ id: 'cover-title', text: 'Electric System\nPlans 1984-1994' }, { id: 'cover-subtitle', text: 'A report on meeting\nelectrical load growth\nin British Columbia' }, { id: 'cover-credits', text: 'System Engineering Division\nVancouver\nDecember 1983' }] }),
  // H27's blue line drawing spreads nearly edge to edge below the subtitle (2–95% across, to 89%
  // down); the kit marks that area with a dashed outline, a placeholder for the artwork.
  cover({ id: 'cover-illustrated', label: 'Illustrated cover', width: 215.9, height: 279.4, physical: ['8.5in', '11in'], size: 36, colourway: 'corporate', items: [{ id: 'cover-title', text: 'Energy Conservation\nPrograms' }, { id: 'cover-subtitle', text: 'A review of residential\nand business practices' }], illustration: { x: round(215.9 * 0.02), y: round(279.4 * 0.5), width: round(215.9 * 0.93), height: round(279.4 * 0.39), fill: 'none', stroke: 'primary', strokeWidth: '0.75pt', dash: '3 2', label: '[Illustration: line drawing in corporate blue]' } }),
  // H28's block is a vivid green, the manual's stand-in for the picture.
  cover({ id: 'cover-display', label: 'Display cover, 4 × 9', width: 101.6, height: 228.6, physical: ['4in', '9in'], size: 24, colourway: 'corporate', items: [{ id: 'cover-title', text: 'Revelstoke Dam\nVisitor Centre' }, { id: 'cover-subtitle', text: 'A tour of Revelstoke’s history\nand the Columbia River system' }], illustration: { x: round(101.6 / 3), y: inch(4.25), width: round(101.6 - 101.6 / 3 - inch(0.3)), height: inch(3.5), fill: 'green' } })
]

// Mastheads (H30, printed full size): signature left, title right in the same size, subordinate
// matter below; with a band of light colour or with a rule. Measured from the page: the
// signature 61.6 mm wide, 5.8 mm inside the band; the title's first baseline shared with the
// signature's, 19.9 mm below the band top; title lines 12 mm apart, set tight; the dateline 7.7 mm
// below the band (or 7.9 mm below the rule, itself 5.6 mm under the title), the headline 16 mm
// below that and the 12 on 12 columns 7 mm below the headline.
const band = { x: inch(0.63), y: inch(0.5), width: round(inch(7.7) - inch(0.63)), height: inch(1.5) }
const mastheadSignatureX = inch(0.86)
const mastheadSignatureWidth = 61.6
const titleSize = round(sig('standard').metrics.capHeight * mastheadSignatureWidth / widthOf('standard') / CAP / 25.4 * 72, 1)
const titleBaseline = round(band.y + 19.9)
const titleLeading = pt(34)
const titleX = inch(3.8)
// The title keeps the signature's inset from the band's far end: a longer title shrinks to fit
// (fitWidth) rather than running out of the band.
const titleMeasure = round(band.x + band.width - (mastheadSignatureX - band.x) - titleX)
const masthead = (variant) => {
  const rule = round(titleBaseline + titleLeading + 5.6)
  const dateline = round(variant === 'band' ? band.y + band.height + 7.7 : rule + 7.9)
  const headline = round(dateline + 16)
  const columns = round(headline + 7)
  return {
    id: `masthead-${variant}`, label: variant === 'band' ? 'Newsletter masthead, colour band' : 'Newsletter masthead, rule', group: 'Publications', unit: 'mm', width: 215.9, height: 279.4, physical: ['8.5in', '11in'], raster: 1700,
    title: `B.C.Hydro / newsletter masthead (${variant})`,
    description: 'Masthead (Graphic Standards Manual p. 29): signature and title side by side in one size, subordinate matter below; a band of colour of no more than 20% value, or a heavy rule. A longer title is set smaller to stay inside the band.',
    elements: [
      { type: 'background', fill: 'paper' },
      ...(variant === 'band' ? [{ type: 'rect', ...band, fill: 'light' }] : [line(band.x, rule, band.x + band.width, rule, '2.9pt')]),
      { type: 'logo', signature: 'standard', colourway: 'black', x: mastheadSignatureX, y: titleBaseline, width: mastheadSignatureWidth, anchorY: 'baseline' },
      // Set as tight as the manual's phototype: about -0.065 em.
      { type: 'lines', id: 'masthead-title-block', x: titleX, y: titleBaseline, leading: titleLeading, size: `${titleSize}pt`, tracking: `${round(-0.065 * titleSize, 2)}pt`, fitWidth: titleMeasure, font: 'body', colour: 'ink', lines: [{ id: 'masthead-title', text: 'Human Resources' }, { id: 'masthead-title-2', text: 'Newsletter' }] },
      text('dateline', 'November 15, 1983    Contact: Earl Simmons 663-0000', titleX, dateline, '12pt', { font: 'body', colour: 'ink' }),
      text('headline', 'Autumn sessions in Electricity Fundamentals', round(band.x + band.width / 2), headline, '27pt', { font: 'body', colour: 'ink', anchor: 'middle', tracking: '-1.35pt', fitWidth: round(band.width - 2 * (mastheadSignatureX - band.x)) }),
      { type: 'paragraph', id: 'column-1', text: '[Story text, two justified columns of 12 on 12 point Times Roman.]', x: band.x, y: columns, width: inch(3.375), size: '12pt', leading: pt(12), maxLines: 44, align: 'justify', font: 'body', colour: 'ink' },
      { type: 'paragraph', id: 'column-2', text: '[Second column.]', x: round(band.x + band.width - inch(3.375)), y: columns, width: inch(3.375), size: '12pt', leading: pt(12), maxLines: 44, align: 'justify', font: 'body', colour: 'ink' }
    ]
  }
}

// Advertising (H32–H34): rules top and bottom, the headline first, the positive signature last.
// H33's example measures 8.82 in between the outer edges of its 1 mm (2.9 point) rules, with 17
// lines in a column (13 in the third, above the signature) ending 8 mm above the foot, where the
// signature's baseline also sits.
const advertHeight = inch(8.82)
const advertRule = pt(2.9)
const advertLastBaseline = round(advertHeight - 8)
const advertColumns = round(advertLastBaseline - 16 * pt(12))
const advert = {
  id: 'advert-display', label: 'Advertisement, display', group: 'Advertising', unit: 'mm', width: inch(6.57), height: advertHeight, physical: ['6.57in', '8.82in'], raster: 1300,
  title: 'B.C.Hydro / display advertisement',
  description: 'A display advertisement (Graphic Standards Manual p. 32): heavy rules at top and foot; the headline, a 3:2 picture, three columns of copy; the positive signature last, one column wide at the foot of the third column.',
  elements: [
    { type: 'background', fill: 'paper' },
    line(0, round(advertRule / 2), inch(6.57), round(advertRule / 2), '2.9pt'),
    line(0, round(advertHeight - advertRule / 2), inch(6.57), round(advertHeight - advertRule / 2), '2.9pt'),
    { type: 'paragraph', id: 'headline', text: 'Your electricity bill now tells you\nmore about the energy\nyou use.', x: inch(0.66), y: round(inch(0.4) + cap(30)), width: inch(5.85), size: '30pt', leading: pt(31), tracking: '-1.2pt', maxLines: 4, font: 'body', colour: 'ink' },
    { type: 'rect', id: 'illustration', x: inch(0.66), y: inch(1.97), width: inch(5.23), height: inch(3.46), fill: '#E7E7E7' },
    ...[0, 1, 2].map((column) => ({ type: 'paragraph', id: `column-${column + 1}`, text: column === 0 ? '[Copy in three columns, 12 point leading.]' : '', x: round(column * inch(2.24)), y: advertColumns, width: inch(2.1), size: '10.5pt', leading: pt(12), maxLines: column === 2 ? 13 : 17, font: 'body', colour: 'ink' })),
    { type: 'logo', signature: 'standard', colourway: 'black', x: inch(6.57), y: advertLastBaseline, width: inch(2.07), anchorX: 'end', anchorY: 'baseline' }
  ]
}
const classified = {
  id: 'advert-classified', label: 'Advertisement, classified', group: 'Advertising', unit: 'mm', width: inch(1.55), height: inch(2.81), physical: ['1.55in', '2.81in'], raster: 500,
  title: 'B.C.Hydro / classified advertisement',
  description: 'A classified advertisement (Graphic Standards Manual p. 33): thin rules, an upper and lower case headline centred, the copy, and the signature centred at the foot, above its minimum size.',
  elements: [
    { type: 'background', fill: 'paper' },
    line(0, pt(0.55), inch(1.55), pt(0.55), '1.1pt'),
    line(0, round(inch(2.81) - pt(0.55)), inch(1.55), round(inch(2.81) - pt(0.55)), '1.1pt'),
    // H34, measured: the 14 on 14½ point headline's baseline 6.9 mm below the top, the 8½ on 10
    // point copy's first baseline 16.8 mm, 13 lines of it, and the signature's baseline 3.3 mm
    // above the foot.
    { type: 'paragraph', id: 'headline', text: 'Invitation\nto tender', x: round(inch(1.55) / 2), y: 6.9, width: inch(1.5), size: '14pt', leading: pt(14.5), maxLines: 3, anchor: 'middle', font: 'body', colour: 'ink' },
    { type: 'paragraph', id: 'body', text: 'Sealed tenders, marked with the tender number, will be received at the Purchasing Department until the date shown.', x: 0.5, y: 16.8, width: round(inch(1.55) - 1), size: '8.5pt', leading: pt(10), maxLines: 13, font: 'body', colour: 'ink' },
    { type: 'logo', signature: 'standard', colourway: 'black', x: round((inch(1.55) - inch(1.18)) / 2), y: round(inch(2.81) - 3.3), width: inch(1.18), anchorY: 'baseline' }
  ]
}

// Audio-visual (H35): back-lit, so the reverse is preferred, and the corporate colours may be
// reversed: logotype and circle white, the H green and blue, on a dark neutral ground.
const slide = {
  id: 'av-title', label: 'Audio-visual title', group: 'Audio-visual', width: 1440, height: 1080, raster: 1440,
  title: 'B.C.Hydro / audio-visual title frame',
  description: 'A 4:3 title frame (Graphic Standards Manual p. 34): the corporate-colour signature in reverse (logotype and circle white, the H green over blue) on a dark neutral ground; titles in the corporate typeface.',
  elements: [
    { type: 'background', fill: '#141414' },
    { type: 'logo', signature: 'standard', colourway: 'reverseCorporate', x: 340, y: 340, width: 760 },
    text('av-title', 'Revelstoke Dam: the first ten years', 720, 820, 56, { font: 'body', colour: 'reverse', anchor: 'middle' })
  ]
}

// Signs (H38–H41): black on white, upper and lower case, flush left; borders half the
// logotype's cap height (a full cap height above the Gas flame); a facility name directly under
// the signature, its capitals the logotype's, one x-height below.
const C = 40 // the logotype's cap height on these examples, in mm
const signScale = (id) => C / sig(id).metrics.capHeight
const xHeight = round(C * 0.45 / CAP)
const signWidth = (id) => round(widthOf(id) * signScale(id))
const signTop = (id) => (id === 'gas' ? C : C / 2) // to the logotype's cap line
const identification = (id, { name, label, layout }) => {
  const nameSize = `${round(C / CAP / 25.4 * 72, 1)}pt`
  const nameLines = name ? name.split('\n').length : 0
  // H39: a vertical sign's name is as wide as the signature above it; Termes at the logotype's
  // cap height runs wider than the manual's Times, so its longest line is tracked in to that width.
  const longest = name ? name.split('\n').reduce((a, b) => (measure(b, C / CAP) > measure(a, C / CAP) ? b : a)) : ''
  const tracking = layout === 'vertical' && longest ? Math.min(0, (signWidth(id) - measure(longest, C / CAP)) / (Array.from(longest).length - 1)) : 0
  const capLine = signTop(id)
  const baseline = capLine + C
  const nameBaseline = baseline + xHeight + C
  // Name lines are set solid: descenders just clear the line below (about 1.25 C apart).
  const height = round(name ? nameBaseline + (nameLines - 1) * C * 1.25 + C / 2 : baseline + C / 2)
  const width = round(Math.max(signWidth(id), name ? measure(name, C / CAP, 'body', tracking / (C / CAP)) : 0) + C)
  return {
    id: `sign-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`, label: `Sign: ${label.toLowerCase()}`, group: 'Signs', unit: 'mm', width, height, raster: 1600,
    title: `B.C.Hydro / identification sign, ${label.toLowerCase()}`,
    description: 'An identification sign (Graphic Standards Manual p. 38): the full signature, borders of half its logotype’s cap height (a full cap height above the Gas logotype, to accommodate its flame), and any facility name immediately below, with capitals as tall as the logotype’s, one x-height under it.',
    elements: [
      { type: 'background', fill: 'paper' },
      { type: 'rect', x: 0, y: 0, width, height, fill: 'none', stroke: 'ink', strokeWidth: 1 },
      { type: 'logo', signature: id, colourway: id === 'gas' ? 'corporate' : layout === 'horizontal' ? 'black' : 'corporate', x: C / 2, y: capLine, anchorY: 'cap', points: round(C / CAP / 25.4 * 72, 2) },
      // A little slack past the measured width, so a point size rounded up does not wrap the name.
      ...(name ? [{ type: 'paragraph', id: 'facility', text: name, x: C / 2, y: round(nameBaseline), width: width - C + 4, size: nameSize, leading: round(C * 1.25), maxLines: 3, ...(tracking ? { tracking: `${round(tracking / pt(1), 2)}pt` } : {}), font: 'body', colour: 'ink' }] : [])
    ]
  }
}
// H41 Example 1, measured at full size (the 84.4 mm example × 3.945): the signature 160 mm wide
// at the top left; "Danger" bold, letterspaced to the measure "Keep away" fills (287 mm), their
// baselines 132 and 198 mm down; the explanation regular, its lines as wide as that measure
// (92 point here), baselines 254 mm down and 29.7 mm apart.
const dangerSign = () => {
  const size = pt(175)
  const measureWidth = measure('Keep away', size, 'bold')
  const tracking = round((measureWidth - measure('Danger', size, 'bold')) / ('Danger'.length - 1) / pt(1), 1)
  return {
    id: 'sign-danger', label: 'Sign: danger', group: 'Signs', unit: 'mm', width: 333, height: 387, raster: 1000,
    title: 'B.C.Hydro / danger sign', description: 'A safety control sign (Graphic Standards Manual p. 40): black on yellow, the signature top left where identity is not otherwise apparent, the warning in bold, letterspaced to the measure, the explanation in regular, all flush left.',
    elements: [
      { type: 'background', fill: 'yellow' },
      { type: 'logo', signature: 'standard', colourway: 'black', x: 26, y: 22, width: 160 },
      text('warning', 'Danger', 25, 132, '175pt', { font: 'bold', colour: 'ink', tracking: `${tracking}pt`, fitWidth: round(measureWidth + 4) }),
      text('instruction', 'Keep away', 25, 198, '175pt', { font: 'bold', colour: 'ink', fitWidth: round(measureWidth + 4) }),
      { type: 'paragraph', id: 'explanation', text: 'Dangerous undertow\nand current from\npower plant operation', x: 25, y: 254, width: 292, size: '92pt', leading: 29.7, maxLines: 4, font: 'body', colour: 'ink' }
    ]
  }
}

// H40 Example 4, measured: rows 60 mm deep with names whose capitals are half that (128 point),
// so the borders are ½ cap-height; the names start 78.5 mm in and are set tight (-0.05 em, as the
// manual's are), shrinking to keep a ½ cap border on the right; heavy arrows a cap-height square.
const guideSign = () => {
  const C = round(CAP * pt(128))
  const nameX = 78.5
  const arrow = { left: 18, size: round(C), weight: round(0.18 * C, 1) }
  // Arrow tips are mitred, so the drawn points sit a stroke-half × √2 inside the box.
  const tip = round(arrow.weight / Math.SQRT2)
  const half = round(arrow.size / 2 - arrow.weight / 2)
  const up = (top) => { const cx = round(arrow.left + arrow.size / 2); return `M${cx} ${round(top + arrow.size)}V${round(top + tip)}M${round(cx - half)} ${round(top + tip + half)}L${cx} ${round(top + tip)}L${round(cx + half)} ${round(top + tip + half)}` }
  const right = (top) => { const cy = round(top + arrow.size / 2); const end = round(arrow.left + arrow.size - tip); return `M${arrow.left} ${cy}H${end}M${round(end - half)} ${round(cy - half)}L${end} ${cy}L${round(end - half)} ${round(cy + half)}` }
  const rows = [15, 75] // cap lines: ½ cap below the top of each 60 mm row
  return {
    id: 'sign-guide', label: 'Sign: guide, directional', group: 'Signs', unit: 'mm', width: 340, height: 120, raster: 1000,
    title: 'B.C.Hydro / directional guide sign', description: 'A guide sign (Graphic Standards Manual p. 39): one destination to a row, rows divided by a keyline, each with its arrow; the names aligned on one left edge; borders ½ cap-height.',
    elements: [
      { type: 'background', fill: 'paper' },
      { type: 'rect', x: 0, y: 0, width: 340, height: 120, fill: 'none', stroke: 'ink', strokeWidth: 0.8 },
      line(0, 60, 340, 60, 0.8),
      { type: 'path', d: up(rows[0]), fill: 'none', stroke: 'ink', strokeWidth: arrow.weight },
      { type: 'path', d: right(rows[1]), fill: 'none', stroke: 'ink', strokeWidth: arrow.weight },
      ...['Visitor Parking', 'Electric Shop'].map((name, index) => text(`destination-${index + 1}`, name, nameX, round(rows[index] + C), '128pt', { font: 'body', colour: 'ink', tracking: '-6.4pt', fitWidth: round(340 - C / 2 - nameX) }))
    ]
  }
}

const signs = [
  identification('standard', { label: 'Office identification' }),
  identification('gas', { label: 'Gas identification' }),
  identification('rail', { label: 'Horizontal facility', name: 'Huntingdon Freight Office', layout: 'horizontal' }),
  identification('gas', { label: 'Vertical facility', name: 'Liquefied\nNatural Gas\nPlant', layout: 'vertical' }),
  dangerSign(),
  guideSign()
]

const templates = [...stationery, bulletin, ...publications, masthead('band'), masthead('rule'), advert, classified, slide, ...signs]

// `office`: the face Word and PowerPoint should ask for (the manual's Times Roman).
const FONT = (file, label, extra = {}) => ({ family: 'TeX Gyre Termes', office: 'Times New Roman', stack: '"TeX Gyre Termes", "Times New Roman", Times, serif', weight: 400, capHeight: CAP, file: `fonts/${file}`, web: `fonts/${file}`, label, ...extra })

const brand = {
  schema: 'brandkit/1',
  id: 'bc-hydro-1983',
  name: 'B.C.Hydro',
  version: '1983-06',
  displayVersion: '1983',
  source: 'BC Hydro Graphic Standards Manual, June 1983, as rebuilt in the BC manual pack (manuals/bc, book "hydro"); signatures from PofBC’s reconstruction.',
  status: 'A historical reconstruction for reference and study. Not current BC Hydro brand guidance.',
  colours: { black: '#000000', white: '#FFFFFF', green: '#00AF00', blue: '#0069A2', tint: '#D3EDB8', grey: '#5A5A5A', yellow: '#FFF05A', emboss: '#9A958B' },
  colourNames: { tint: 'Light tint (≤ 20% value)', emboss: 'Blind emboss (no ink)' },
  roles: { ink: 'black', paper: 'white', muted: 'grey', primary: 'blue', light: 'tint', reverse: 'white', line: '#D3D3D3', rule: 'black' },
  print: { pantone: { green: '376', blue: '314' }, cmyk: { green: 'C50 Y100', blue: 'C90 M20 Y25 (coated); C90 M15 Y25 (uncoated)', black: 'K100' }, note: 'Pantone numbers and process recipes as the 1983 manual gives them. Screen colours are approximations.' },
  colourways: {
    corporate: { label: 'Corporate colours', roles: { ink: 'black', upper: 'green', lower: 'blue', symbol: 'black', type: 'black' } },
    black: { label: 'Positive, black', all: 'black' },
    white: { label: 'Reverse, white', all: 'white', ground: 'black' },
    reverseCorporate: { label: 'Corporate colours, reversed (audio-visual only)', roles: { ink: 'white', upper: 'green', lower: 'blue', symbol: 'white', type: 'white' }, ground: 'black' },
    blind: { label: 'Blind embossed', all: 'emboss' }
  },
  defaultColourway: 'corporate',
  logoColours: ['black', 'blue', 'white', 'currentColor'],
  rasterColours: ['black', 'blue', 'white'],
  fonts: {
    body: FONT('texgyretermes-regular.otf', 'Times Roman (TeX Gyre Termes)'),
    italic: FONT('texgyretermes-italic.otf', 'Times Italic (TeX Gyre Termes Italic)', { style: 'italic', capHeight: 0.653 }),
    bold: FONT('texgyretermes-bold.otf', 'Times Bold (TeX Gyre Termes Bold)', { weight: 700, capHeight: 0.676 }),
    boldItalic: FONT('texgyretermes-bolditalic.otf', 'Times Bold Italic', { weight: 700, style: 'italic', capHeight: 0.669 }),
    display: FONT('texgyretermes-regular.otf', 'Times Roman'),
    displayRegular: FONT('texgyretermes-regular.otf', 'Times Roman'),
    extra: FONT('texgyretermes-bold.otf', 'Times Bold', { weight: 700 }),
    label: FONT('texgyretermes-regular.otf', 'Times Roman')
  },
  typography: {
    headlines: { family: 'Times Roman', weight: 400, trackingEm: 0 },
    body: { family: 'Times Roman', weight: 400 },
    // H12: all-capital settings are incorrect, so labels are set as written, without letterspacing.
    labels: { family: 'Times Roman', weight: 400, trackingEm: 0, textTransform: 'none' },
    note: 'Times Roman throughout, upper and lower case; all-capitals settings are incorrect. 10 to 12 point for text, 35 to 55 characters a line; italics of the regular weight for emphasis, bold sparingly (Graphic Standards Manual p. 11).'
  },
  symbol: { name: 'bc-hydro-ring', title: 'symbol (ring)', masterTitle: 'symbol (ring), master', ...art.symbols.ring, masterDescription: 'A ring round the stylized H: two four-pointed stars, green over blue in corporate colours.' },
  symbols: { gas: { name: 'bc-hydro-gas', title: 'Gas Operations symbol (flame)', ...art.symbols.gas } },
  signatures: [
    { id: 'standard', label: 'Corporate', use: 'The parent signature: the company as a single entity. Electrical operations, all general functions, and Gas or Rail when shown as part of the whole.' },
    { id: 'gas', label: 'Gas Operations', use: 'Gas Operations identified on its own. The flame and the H are always the same blue.' },
    { id: 'rail', label: 'B.C.Hydro Rail', use: 'B.C.Hydro Rail identified on its own. The locomotive design is not part of it and is kept apart.' },
    { id: 'formal', label: 'Formal', artwork: 'authority', use: 'Reserved for highly formal legal situations. Never abbreviated or rearranged.' }
  ].map((entry) => {
    const source = art.signatures[entry.artwork ?? entry.id]
    return { id: entry.id, label: entry.label, use: entry.use, metrics: source.metrics, elements: [{ type: 'art', markup: source.markup, bounds: source.bounds }] }
  }),
  lockup: { canvasPadding: 0, clearspaceRecommendation: 'Signatures are used only from the official reproduction proofs, without adjustment; nothing is placed within the symbol.', minimumHorizontalWidthPx: 96, minimumHorizontalWidthMm: 25, minimumSymbolHeightPx: 24, minimumSymbolHeightMm: 6 },
  minimumSizes: {
    note: 'Minimum overall signature widths on the printed page (Graphic Standards Manual p. 12).',
    columns: ['Signature', 'Black on white', 'Black on 20%', 'Colour 70%+ on white', 'Corporate colours', 'Reverse on black', 'Reverse on 80%'],
    rows: [['Corporate', '1 in / 25 mm', '1¼ in / 32 mm', '1½ in / 38 mm', '1⅞ in / 48 mm', '1¼ in / 32 mm', '1½ in / 38 mm'], ['Gas Operations', '1 in / 25 mm', '1¼ in / 32 mm', '1½ in / 38 mm', '1⅞ in / 48 mm', '1¼ in / 32 mm', '1½ in / 38 mm'], ['B.C.Hydro Rail', '1½ in / 38 mm', '1¾ in / 44 mm', '2 in / 51 mm', '2¼ in / 57 mm', '2 in / 51 mm', '2¼ in / 57 mm'], ['Formal', '2 in / 51 mm', '2¼ in / 57 mm', '—', '2½ in / 63 mm', '2½ in / 63 mm', '2¾ in / 70 mm']]
  },
  departments: {
    label: 'Division or department',
    field: 'division',
    items: [
      { id: 'properties', name: 'Properties Division', values: { division: 'Properties Division' } },
      { id: 'system-engineering', name: 'System Engineering Division', values: { division: 'System Engineering Division' } },
      { id: 'gas-transmission', name: 'Gas Transmission and Distribution Division', values: { division: 'Gas Transmission and Distribution Division' } },
      { id: 'purchasing', name: 'Purchasing Department', values: { division: 'Purchasing Department' } },
      { id: 'personnel', name: 'Personnel Department', values: { division: 'Personnel Department' } },
      { id: 'advertising', name: 'Advertising Department', values: { division: 'Advertising Department' } }
    ]
  },
  fields: {
    name: { label: 'Name', placeholder: 'Mary E. Duncan' },
    title: { label: 'Title', placeholder: 'Land Use Planner' },
    division: { label: 'Division', placeholder: 'Properties Division' },
    department: { label: 'Department', placeholder: 'System Design Dept.' },
    street: { label: 'Street address', placeholder: '970 Burrard Street' },
    city: { label: 'City', placeholder: 'Vancouver' },
    'postal-code': { label: 'Postal code', placeholder: 'V6Z 1Y3' },
    telephone: { label: 'Telephone', placeholder: '(604) 663-0000' },
    local: { label: 'Local', placeholder: '123' },
    // The manual sets its telex numbers with a centred dot (H16–H18).
    telex: { label: 'Telex', placeholder: '04·54395' }
  },
  copy: {
    svgDescription: 'B.C.Hydro identity, 1983, reconstructed from its Graphic Standards Manual for reference. Not current BC Hydro brand guidance. Times Roman is set in TeX Gyre Termes.',
    templateDescription: 'B.C.Hydro application, 1983, reconstructed from its Graphic Standards Manual. Not current BC Hydro brand guidance.',
    logoLabel: 'B.C.Hydro signature',
    motifLabel: 'B.C.Hydro symbol',
    tagline: 'One signature, used the same way everywhere.'
  },
  patterns: [],
  templates,
  web: {
    componentName: 'BcHydroSignature',
    symbolComponentName: 'BcHydroSymbol',
    cssPrefix: 'bch',
    appIcon: { background: 'paper', colour: 'ink', size: 820 },
    favicon: { light: '#000000', dark: '#FFFFFF', size: 60, micro: false, title: '{name} favicon' },
    intro: { eyebrow: 'Graphic Standards Manual / June 1983', headline: 'B.C.Hydro\nGraphic standards.', body: 'BC Hydro’s 1983 identity, reconstructed from its manual: four signatures, two corporate colours, Times Roman, and the stationery, forms and publications built on them. A historical reference, not current BC Hydro guidance.', edition: '1983 reconstruction', footer: 'B.C.Hydro graphic standards, 1983. A reconstruction for reference; not current BC Hydro brand guidance.' },
    landing: { eyebrow: 'Historical reference', headline: 'B.C.Hydro\n1983', body: 'A reconstruction of BC Hydro’s 1983 graphic standards.', cta: 'Read the manual', contactEyebrow: 'Not current guidance', contactBody: 'For BC Hydro’s current identity, contact BC Hydro.', footer: 'B.C.Hydro graphic standards, 1983 (reconstruction).' }
  },
  files: [
    { to: 'README.md', from: 'docs/README.md' },
    'fonts/GUST-FONT-LICENSE.txt', 'fonts/FONT-NOTICE.txt',
    ...['regular', 'italic', 'bold', 'bolditalic'].map((weight) => `fonts/texgyretermes-${weight}.otf`)
  ]
}

// The guide: what the manual sets out, generated from the brand.
const signatureCell = (id, x, y, w, h, colourway = 'corporate', ground = 'reverse') => [g.rect(x, y, w, h, ground, ground === 'reverse' ? 'line' : undefined), { type: 'logo', signature: id, colourway, x: x + 28, y: y + 24, width: w - 56, height: h - 48 }]
brand.guide = {
  title: 'B.C.Hydro graphic standards',
  pdfTitle: 'B.C.Hydro / Graphic Standards Manual, 1983 (reconstruction)',
  sheetsPdfTitle: 'B.C.Hydro / signature sheet, 1983',
  pageTitle: 'B.C.Hydro / graphic standards / {page}',
  width: 1440,
  height: 1020,
  frame: { background: 'paper', logo: { x: 62, y: 30, width: 170 }, header: 'B.C.HYDRO / GRAPHIC STANDARDS / 1983', footer: 'RECONSTRUCTION FOR REFERENCE / NOT CURRENT BC HYDRO GUIDANCE' },
  pages: [
    {
      title: 'Four signatures.', name: 'Main elements', subtitle: 'Each a symbol and a unique configuration of the corporate typeface, Times Roman. Only one signature is used at a time.',
      elements: [
        ...signatureCell('standard', 64, 250, 640, 150), g.label('CORPORATE: THE COMPANY AS A WHOLE', 64, 430),
        ...signatureCell('gas', 736, 250, 640, 150), g.label('GAS OPERATIONS, IDENTIFIED AUTONOMOUSLY', 736, 430),
        ...signatureCell('rail', 64, 480, 640, 150), g.label('B.C.HYDRO RAIL, IDENTIFIED AUTONOMOUSLY', 64, 660),
        ...signatureCell('formal', 736, 480, 640, 150), g.label('FORMAL: LEGAL SITUATIONS ONLY', 736, 660),
        g.para('Symbol and logotype are inseparable: neither is used alone, and their relative positions and proportions never change. Signatures always come from the official reproduction proofs.', 64, 740, 1312, 22, { colour: 'ink' })
      ]
    },
    {
      title: 'Corporate colours.', name: 'Corporate colours', subtitle: 'Green and blue in the symbols only, black for the logotypes. A single-colour signature where colour is not warranted.',
      elements: [
        // Plain bars, as H05 shows them: the symbol is never used alone.
        { type: 'swatches', x: 64, y: 250, step: 330, width: 300, height: 260, colours: ['green', 'blue', 'black'], symbol: false },
        { type: 'specTable', x: 64, right: 1376, y: 740, step: 44, rows: [['Green', 'PMS 376; process: 100% yellow, 50% cyan'], ['Blue', 'PMS 314; coated: 25% yellow, 90% cyan, 20% magenta; uncoated: 15% magenta'], ['Black', '100% black'], ['Gas Operations', 'the flame and the H both in corporate blue; never two blues']] }
      ]
    },
    {
      title: 'Backgrounds and value.', name: 'Backgrounds', subtitle: 'Positive forms on backgrounds of 0 to 20% value, reverse forms on 80 to 100%. Values between are avoided. Colour signatures on white only.',
      elements: [
        // H07 enlarges the signature on tints and reverse grounds, by H13's minimum widths: 1 in on
        // white, 1¼ in on 20% and on black, 1½ in on 80%. The 80% ground is 80% black (#333333),
        // not the scan's lighter halftone.
        ...[['corporate', 'reverse', 'CORPORATE COLOURS ON WHITE', 1], ['black', 'reverse', 'BLACK ON WHITE: PREFERRED', 1], ['black', 'light', 'BLACK ON UP TO 20%', 1.25], ['white', 'ink', 'WHITE ON BLACK', 1.25], ['white', '#333333', 'WHITE ON 80% OR MORE', 1.5]].flatMap(([colourway, ground, label, scale], index) => {
          const x = 64 + (index % 3) * 448
          const y = 250 + Math.floor(index / 3) * 300
          const [w, h] = [(416 - 56) * scale / 1.5, (200 - 48) * scale / 1.5]
          return [g.rect(x, y, 416, 200, ground, ground === 'reverse' ? 'line' : undefined), { type: 'logo', signature: 'standard', colourway, x: x + (416 - w) / 2, y: y + (200 - h) / 2, width: w, height: h }, g.label(label, x, y + 230)]
        }),
        g.para('Signatures are enlarged on tints and on reverse grounds, where they lose definition: at least 1¼ in wide on 20% and on black, 1½ in on 80%, against 1 in on white (minimum sizes, p. 12).', 960, 560, 416, 20, { colour: 'ink' })
      ]
    },
    {
      title: 'Incorrect usage.', name: 'Incorrect usage', subtitle: 'Incorrect use gives the impression of disunity. Each of these is a rule.',
      elements: [
        { type: 'list', x: 64, detailX: 300, right: 1376, y: 270, step: 42, rows: [['POSITION', 'The symbol sits immediately left of its logotype, never above it.'], ['ALONE', 'The symbol is never decoration, pattern or border, and never used alone.'], ['COLOUR', 'Green over blue in the H; all black unless all three colours are used.'], ['BLUE', 'Only corporate blue; otherwise all black. Never two blues.'], ['LOGOTYPE', 'All of the logotype is black; it is never reset or highlighted.'], ['FORMAL', 'Never abbreviated, never rearranged onto one line.'], ['GROUND', 'A coloured single-colour signature on white only; colour signatures without background control go black.'], ['WINDOWS', 'No white forced inside the symbol: inside and outside are one background.'], ['REVERSE', 'A reverse signature is all white.'], ['SIZE', 'Never below the minimum sizes.']] }
      ]
    },
    {
      title: 'Times Roman.', name: 'Corporate typeface', subtitle: 'Used throughout all communications done in type, upper and lower case in regular weight. All-capitals settings are incorrect.',
      elements: [
        g.text('abcdefghijklmnopqrstuvwxyz', 62, 340, 72, { font: 'body' }),
        g.text('ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890', 62, 440, 60, { font: 'body' }),
        g.text('Times Italic for emphasis', 62, 540, 52, { font: 'italic' }),
        g.text('Times Bold, sparingly', 62, 630, 52, { font: 'bold' }),
        g.para('10 to 12 point for text, lines of 35 to 55 characters. The company name is set without spaces: B.C.Hydro. Black on white, or on no more than 20% value; reverse type avoided. This reconstruction sets Times Roman in TeX Gyre Termes.', 64, 720, 1312, 22, { colour: 'ink' })
      ]
    },
    {
      title: 'Minimum sizes.', name: 'Minimum sizes', subtitle: 'Overall signature widths on the printed page, by form and background.',
      elements: [{ type: 'specTable', x: 64, right: 1376, y: 280, step: 50, rows: brand.minimumSizes.rows.map(([name, ...cells]) => [name, cells.join('   ·   ')]) }, g.para(`Columns: ${brand.minimumSizes.columns.slice(1).join(' · ')}.`, 64, 520, 1312, 18)]
    },
    {
      title: 'Stationery and forms.', name: 'Stationery and forms', subtitle: 'One design for the Corporate, Gas Operations and Rail sets; the signature on forms at 20 point, top right.',
      elements: shelf([{ src: 'templates/letterhead-standard', ratio: 215.9 / 279.4, label: 'LETTERHEAD', frame: true }, { src: 'templates/envelope-gas', ratio: 241.3 / 104.775, label: 'ENVELOPE, GAS', frame: true }, { src: 'templates/card-rail', ratio: 3.5 / 2, label: 'CARD, RAIL', frame: true }, { src: 'templates/form-bulletin', ratio: 215.9 / 279.4, label: 'BULLETIN FORM', frame: true }], { y: 260, height: 460 })
    },
    {
      title: 'Publications.', name: 'Publications', subtitle: 'Signature and title as one unit, ¼ of the depth down and ⅓ of the width across. No borders or decorative devices.',
      elements: shelf([{ src: 'templates/cover-report', ratio: 215.9 / 279.4, label: 'REPORT COVER', frame: true }, { src: 'templates/cover-illustrated', ratio: 215.9 / 279.4, label: 'ILLUSTRATED', frame: true }, { src: 'templates/cover-display', ratio: 4 / 9, label: 'DISPLAY, 4 × 9', frame: true }, { src: 'templates/masthead-band', ratio: 215.9 / 279.4, label: 'MASTHEAD', frame: true }], { y: 260, height: 520 })
    },
    {
      title: 'Advertising, signs and vehicles.', name: 'Applications', subtitle: 'In all advertising the signature is the final element. Signs are black on white, flush left. Vehicles take single-colour signatures only.',
      elements: shelf([{ src: 'templates/advert-display', ratio: 6.57 / 8.82, label: 'DISPLAY AD', frame: true }, { src: 'templates/av-title', ratio: 4 / 3, label: 'AUDIO-VISUAL' }, { src: 'templates/sign-horizontal-facility', ratio: 2.9, label: 'IDENTIFICATION SIGN' }, { src: 'templates/illustrated-h44-van-side', ratio: 1600 / 624, label: 'PANEL VAN' }], { y: 300, height: 360 })
    }
  ],
  sheets: [
    {
      id: 'signature-sheet', group: 'logo-sheets', width: 1440, height: 1020, title: '{name} / signature sheet',
      elements: [
        g.rect(0, 0, 1440, 1020, 'paper'),
        g.text('Signature sheet', 64, 88, 42, { font: 'body' }),
        g.label('THE FOUR SIGNATURES IN THEIR FORMS', 64, 128),
        ...['standard', 'gas', 'rail', 'formal'].flatMap((id, row) => ['corporate', 'black', 'white'].flatMap((colourway, column) => signatureCell(id, 64 + column * 448, 170 + row * 205, 416, 180, colourway, colourway === 'white' ? 'ink' : 'reverse')))
      ]
    }
  ]
}

// The drawings of vans, trucks, equipment and rolling stock (ManualKit's source-registered
// illustrations), each a template with the signature in its branding zones.
const drawn = illustrated('hydro', ['H44', 'H45', 'H46', 'H47', 'H48'], ['H43', 'H42'], 'Vehicles and equipment, drawn')
// Its signs, drawn: identification, guide and control, each line of wording a field.
const DRAWN_SIGN_KINDS = { H39: 'Identification signs', H40: 'Guide signs', H41: 'Control signs' }
const drawnSigns = illustrated('hydro', ['H39', 'H40', 'H41'], ['H38'], 'Signs, drawn', (asset) => DRAWN_SIGN_KINDS[asset.split('-')[0]])
brand.illustrations = { ...drawn.drawings, ...drawnSigns.drawings, ...bceRouteIllustrations({ blue: brand.colours.blue }) }
brand.templates.push(...additionalForms, ...additionalPublications(art), ...drawn.templates, ...drawnSigns.templates)
brand.relatedMarks = [{
  id: 'bce-route', label: 'BCE route heritage mark',
  use: 'The locomotive identifies “the BCE route”. It is separate from the four official signatures and must not be placed close to the Rail signature (printed p. 2). These two source-specific versions are traced from the Rail stationery on printed p. 17; they are scan-derived reconstructions, not original production masters.',
  sources: [{ book: 'hydro', page: 'H03', manual: 'Graphic Standards Manual', title: 'Main elements', printed: '2' }, { book: 'hydro', page: 'H18', manual: 'Graphic Standards Manual', title: 'Rail stationery', printed: '17' }],
  variants: [
    { id: 'outline', label: 'Black outline · letterhead', asset: 'assets/bce-route-outline-black.svg', illustration: 'bce-route-outline' },
    { id: 'card', label: 'Blue silhouette · business card', asset: 'assets/bce-route-card-blue.svg', illustration: 'bce-route-card' }
  ]
}]
brand.files.push(...writeBceRouteAssets({ blue: brand.colours.blue }),
  'reference/bce-route-provenance.md', 'reference/bce-route-trace.json', 'reference/bce-route-overlay-metrics.json',
  'reference/bce-route-source-outline.png', 'reference/bce-route-source-card.png',
  'reference/bce-route-overlay-outline.png', 'reference/bce-route-overlay-card.png')

// Variants of one thing are one item in the studio: a stationery piece in each division, a cover
// in each format, a sign in each kind.
const DIVISIONS = [['standard', 'Corporate'], ['gas', 'Gas Operations'], ['rail', 'B.C.Hydro Rail']]
const set = (id, label, variants, group) => ({ id, label, ...(group ? { group } : {}), variants: variants.map(([template, name]) => ({ template, label: name })) })
brand.sets = [
  set('letterhead', 'Letterhead', DIVISIONS.map(([division, name]) => [`letterhead-${division}`, name]), 'Stationery'),
  set('envelope', 'Envelope', DIVISIONS.map(([division, name]) => [`envelope-${division}`, name]), 'Stationery'),
  set('business-card', 'Business card', DIVISIONS.map(([division, name]) => [`card-${division}`, name]), 'Stationery'),
  set('cover', 'Publication cover', [['cover-report', 'Report'], ['cover-illustrated', 'Illustrated'], ['cover-display', 'Display']]),
  set('masthead', 'Masthead', [['masthead-band', 'Band'], ['masthead-rule', 'Rule']]),
  set('back-cover', 'Back cover', [['cover-back', 'Letter'], ['cover-back-display', 'Display']], 'Publications'),
  set('spine', 'Publication spine', [['spine-broad', 'Broad'], ['spine-narrow', 'Narrow']], 'Publications'),
  set('advertisement', 'Advertisement', [['advert-display', 'Display'], ['advert-classified', 'Classified'], ['advert-single-column', 'Single column']]),
  set('sign', 'Sign', [['sign-office-identification', 'Office identification'], ['sign-gas-identification', 'Gas identification'], ['sign-horizontal-facility', 'Facility, horizontal'], ['sign-vertical-facility', 'Facility, vertical'], ['sign-danger', 'Danger'], ['sign-guide', 'Guide']]),
  ...drawn.sets,
  ...drawnSigns.sets.map((entry) => ({ ...entry, id: entry.id.replace(/^drawn-/, 'drawn-sign-') }))
]

// Word templates for each division's letterhead and envelope, the bulletin form and the
// mastheads; the audio-visual title frame as a PowerPoint template.
brand.documents = [
  ...DIVISIONS.map(([division, name]) => ({ id: `letterhead-${division}`, label: `Letterhead, ${name}`, format: 'docx', pages: [`letterhead-${division}`] })),
  ...DIVISIONS.map(([division, name]) => ({ id: `envelope-${division}`, label: `Envelope, ${name}`, format: 'docx', pages: [`envelope-${division}`] })),
  { id: 'bulletin', label: 'Bulletin form', format: 'docx', pages: ['form-bulletin'] },
  { id: 'masthead-band', label: 'Newsletter, band masthead', format: 'docx', pages: ['masthead-band'] },
  { id: 'masthead-rule', label: 'Newsletter, ruled masthead', format: 'docx', pages: ['masthead-rule'] },
  { id: 'report', label: 'Report cover, text page and back cover', format: 'docx', pageMode: 'sequence', pages: ['cover-report', 'publication-text', 'cover-back'] },
  // Dense historic grids are editable in SVG/Template Printer; the flowing Word exporter is
  // appropriate for the simple header study, not a faithful export of the multi-cell forms.
  { id: 'form-formal-header', label: 'Formal form header', format: 'docx', pages: ['form-formal-header'] },
  { id: 'presentation', label: 'Presentation', format: 'pptx', layouts: ['av-title'] }
]

// The manual pages each piece is built from (page ids in manuals/bc: H<printed page + 1>).
const SET_PAGES = { standard: ['H16'], gas: ['H17'], rail: ['H18'] }
cite(brand, {
  pack: 'bc',
  templates: {
    ...Object.fromEntries(Object.entries(SET_PAGES).flatMap(([set, pages]) => ['letterhead', 'envelope', 'card'].map((kind) => [`${kind}-${set}`, [...pages, 'H15', 'H14']]))),
    'form-bulletin': ['H20', 'H19'],
    'cover-report': ['H26', 'H25'],
    'cover-illustrated': ['H27', 'H25'],
    'cover-display': ['H28', 'H25'],
    'masthead-band': ['H30'],
    'masthead-rule': ['H30'],
    'advert-display': ['H33', 'H32'],
    'advert-classified': ['H34', 'H32'],
    'av-title': ['H35'],
    ...additionalFormSources,
    ...additionalPublicationSources,
    ...Object.fromEntries(['sign-office-identification', 'sign-gas-identification', 'sign-horizontal-facility', 'sign-vertical-facility'].map((id) => [id, ['H39', 'H38']])),
    'sign-danger': ['H41', 'H38'],
    'sign-guide': ['H40', 'H38'],
    ...drawn.sources,
    ...drawnSigns.sources
  },
  signatures: {
    standard: ['H04', 'H03', 'H05', 'H13'],
    gas: ['H04', 'H06', 'H13'],
    rail: ['H04', 'H13'],
    formal: ['H04', 'H03']
  },
  guide: [
    ['H03', 'H04'],
    ['H05', 'H06'],
    ['H07', 'H08'],
    ['H09', 'H10', 'H11'],
    ['H12'],
    ['H13'],
    ['H14', 'H15', 'H16', 'H19'],
    ['H24', 'H25', 'H30'],
    ['H32', 'H38', 'H42']
  ]
})

// An example motion library from the brand's own artwork (the manual has none): its files in
// motion/, and the entry that gives the brand a Motion tab.
const motion = writeMotion(folder, hydroLibrary(brand, await loadBrandFontsFromDisk(brand, folder.pathname)))
brand.motion = motion.entry
brand.files.push(...motion.files)

await extendBrandPatterns(brand, folder)
attachHydroGuides(brand, art)
brand.manualAudit = {
  title: 'BC Hydro 1983: manual coverage and overlay review', pages: 48, checkedDate: '2026-10-30',
  report: 'docs/manual-audit.html',
  summary: 'All 48 source pages are inventoried against the kit. The audit includes original/reconstructed page overlays, template mappings, the report-cover rules and both BCE route vectors. Coverage does not mean an exact facsimile or an authenticated production master.',
  limitations: [
    'The four signature masters remain PofBC reconstructions; Times Roman is represented by TeX Gyre Termes and screen colours approximate the specified inks.',
    'A signature sized in points has the cap height of that size of Termes (0.662 em), so it matches its title as the manual asks. The printed examples’ Times has capitals about 12% taller at the same nominal size, so their signatures are about 15% wider (a 20 point signature is 34 mm on H20 and H23, 29.6 mm here; 36 point, 61 mm on H26 against 53 mm).',
    'The illustrated cover still needs its original high-quality illustration. Its area is a dashed, labelled placeholder.',
    'Undimensioned form trims, spine thicknesses and example canvases are identified as reconstruction choices. Three-dimensional signs still require the official large-scale drawings.'
  ],
  pageFindings: {
    H18: ['Both BCE route variants are now present on Rail stationery and available separately in Logos.'],
    H21: ['The legal-size tender layout is now present; scan break marks are excluded from the printable form.'],
    H22: ['The employee-transfer layout is present; its snap-set trim is scan-derived.'],
    H23: ['The compact service layout is present; its trim and compact header placement are scan-derived.'],
    H25: ['Cover rules can be shown or hidden. Both standard back-cover sizes now omit the signature and use a 6 point printing code.'],
    H26: ['The ⅓-width, ¼-depth, 36/36 and 18/18 rules are implemented and follow editable cover text. Scan overlay is available.'],
    H27: ['Text/grid are implemented; the illustration area remains a disclosed placeholder, with the original visible in the overlay.'],
    H29: ['Broad and narrow spines follow the binder shown: corporate blue with the signature and title reversed white. On the broad spine the title starts under the B, two cap-heights below the signature; on the narrow one it follows a cap-height after it. Spine thicknesses are example settings, not specified sizes.'],
    H30: ['Both mastheads are measured from the full-size example: a 61.6 mm signature with the title at its size, set tight, on a shared baseline; 12 mm between title lines; dateline 12 point, headline 27 point, columns 12 on 12. A longer typed title is set smaller to stay inside the band or rule.'],
    H31: ['A text-page template applies the written typography principles; it is a new example, not a source facsimile.'],
    H33: ['The display advertisement is 6.57 × 8.82 in between 2.9 point rules, with 17-line columns (13 in the third, above the signature) ending 8 mm above the foot.'],
    H34: ['The single-column advertisement is rebuilt to the measured example: 3.34 × 5.5 in between 2.9 point rules, a 73 mm measure, a 30 point headline, 11 on 11½ point copy with 18 point italic date subheads, and a 1.76 in signature flush left. Its copy is sample wording in the example’s structure.', 'The classified advertisement has the 14 point headline, 8½ on 10 point copy and the signature 3.3 mm above the foot, as measured.'],
    H36: ['Portable-panel half-cap clearance is implemented. Three-dimensional fabrication remains dependent on official large-scale drawings.'],
    H37: ['Written out-of-home and specialty-media guidance is covered in the audit; this page supplies no fixed production template.']
  }
}
brand.files.push('docs/manual-audit.html', 'docs/manual-audit.json', 'docs/manual-audit.md', 'reference/manual-source.json', 'reference/manual-audit-baseline.json',
  ...['report-cover-source', 'cover-illustrated-source', 'display-cover-source', 'bulletin-source', 'rail-card-source', 'rail-letterhead-source'].map((name) => `reference/${name}.webp`),
  ...Array.from({ length: 48 }, (_, index) => `reference/manual/H${String(index + 1).padStart(2, '0')}.webp`))
writeBrand(new URL('brand.json', folder), brand)
