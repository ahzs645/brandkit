// The Province's 1977 applications beyond stationery, and its brand guide: memoranda and news
// releases (General Manual p. 12), publications (p. 8), advertising (p. 9), uniform insignia
// (p. 13), vehicles (Vehicle Manual) and signs (Sign Manual). Measurements are the manuals' where
// they give them and, where they give none (publications, advertising, insignia), proportions
// measured from the drawings, as recorded in each template's description.

import { g, HEROS_CAP as CAPR, inch, line, locked, pt, round, shelf, text } from './common.mjs'

const W = 215.9 // letter
const H = 279.4

/** A signature sized so its logotype capitals are `capMm` tall. */
const pointsForCap = (capMm) => round(capMm / (CAPR * 25.4 / 72), 2)

// --- Memorandum and news release (General Manual p. 12): a brown band across the top of an
// 8½ × 11 sheet with the symbol and logotypes reversed, the heading word right-aligned, hairlines
// down both sides; the fields typed in Courier.
const band = { x: inch(0.25), y: inch(0.25), width: inch(8), height: 24.6 }
const header = (word) => [
  { type: 'rect', id: 'band', x: band.x, y: band.y, width: band.width, height: band.height, fill: 'primary' },
  { type: 'symbol', id: 'band-symbol', x: round(band.x + pt(11)), y: round(band.y + pt(7.6)), height: pt(52), colour: 'reverse' },
  { type: 'lines', x: round(band.x + pt(91)), y: round(band.y + pt(33)), leading: pt(14), size: '12.5pt', font: 'medium', colour: 'reverse', lines: [{ text: 'Province of', locked: true }, { text: 'British Columbia', locked: true }] },
  // The ministry has the 40 mm between its column and the heading word; three lines fit the band.
  { type: 'paragraph', id: 'ministry', x: round(band.x + pt(218)), y: round(band.y + pt(33)), width: 38, size: '12.5pt', leading: pt(14), maxLines: 3, font: 'regular', colour: 'reverse' },
  locked(word, round(band.x + band.width - pt(27.5)), round(band.y + pt(word === 'MEMORANDUM' ? 49 : 45)), '30pt', { font: 'regular', colour: 'reverse', anchor: 'end' }),
  line(band.x, band.y + band.height, band.x, H, '0.5pt', { stroke: 'ink' }),
  line(band.x + band.width, band.y + band.height, band.x + band.width, H, '0.5pt', { stroke: 'ink' })
]
const typed = (extra = {}) => ({ font: 'typewriter', colour: 'ink', size: '12pt', ...extra })

const memo = {
  id: 'memorandum', label: 'Memorandum', group: 'Memoranda and news releases', unit: 'mm', width: W, height: H, physical: ['8.5in', '11in'], raster: 1700,
  title: 'Province of British Columbia / standard memorandum',
  description: 'Standard memorandum (General Manual p. 12): the provincial signature, with or without the ministry, and the heading in a brown band; receiver, date and subject typed. No dimensions are printed; positions are measured from the drawing on an 8½ × 11 sheet.',
  elements: [
    { type: 'background', fill: 'paper' },
    ...header('MEMORANDUM'),
    text('to', 'To: John Doe', inch(1.25), inch(1.68), '12pt', typed()),
    text('to-ministry', 'Ministry of Abc', inch(1.58), inch(1.87), '12pt', typed()),
    { type: 'text', id: 'date', compose: 'Date: {date}', x: inch(5.82), y: inch(1.69), ...typed() },
    text('subject', 'Re: Subject of the memorandum', inch(1.54), inch(2.56), '12pt', typed()),
    line(inch(1.54), round(inch(2.56) + pt(3)), inch(6.4), round(inch(2.56) + pt(3)), '0.5pt'),
    { type: 'paragraph', id: 'body', text: '[Memorandum text, single-spaced.]', x: inch(1.54), y: inch(2.94), width: round(inch(7.55) - inch(1.54)), size: '12pt', leading: pt(13), maxLines: 50, font: 'typewriter', colour: 'ink' }
  ]
}
const news = {
  id: 'news-release', label: 'News release', group: 'Memoranda and news releases', unit: 'mm', width: W, height: H, physical: ['8.5in', '11in'], raster: 1700,
  title: 'Province of British Columbia / standard news release',
  description: 'Standard news release (General Manual p. 12): the provincial signature and the words NEWS RELEASE; contact, release time and headline typed, the text double-spaced.',
  elements: [
    { type: 'background', fill: 'paper' },
    ...header('NEWS RELEASE'),
    locked('Contact :', inch(1.5), inch(1.58), '12pt', typed()),
    { type: 'text', id: 'contact', compose: '{contact-name}   {telephone}', x: inch(2.89), y: inch(1.58), ...typed() },
    text('contact-ministry', 'Ministry of Abc', inch(2.88), inch(1.77), '12pt', typed()),
    locked('For Release:', inch(1.51), inch(2.35), '12pt', typed()),
    { type: 'text', id: 'release', compose: '{date} 1400 (2 pm)', x: inch(2.81), y: inch(2.35), ...typed() },
    text('headline', 'Headline of the release', inch(1.5), inch(2.9), '12pt', typed()),
    line(inch(1.5), round(inch(2.9) + pt(3)), inch(5.5), round(inch(2.9) + pt(3)), '0.5pt'),
    { type: 'paragraph', id: 'body', text: '[Release text, double-spaced.]', x: inch(1.5), y: inch(3.47), width: round(inch(7.6) - inch(1.5)), size: '12pt', leading: pt(26.7), maxLines: 26, font: 'typewriter', colour: 'ink' }
  ]
}

// --- Publications (General Manual p. 8; Reproduction Manual p. 13). Helvetica for covers,
// titling and heads; the flush-left vertical signature top or bottom left; the centred format on
// back covers. Proportions measured from the drawings.
const titlePage = (() => {
  const w = inch(6)
  const h = inch(9)
  return {
    id: 'publication-title-page', label: 'Title page, vertical signature', group: 'Publications', unit: 'mm', width: w, height: h, physical: ['6in', '9in'], raster: 1200,
    title: 'Province of British Columbia / publication title page',
    description: 'A title page (General Manual p. 8): flush-left vertical signature top left, a rule, then the title in Helvetica Regular. The manual prints no sizes; proportions are measured from its drawing.',
    elements: [
      { type: 'background', fill: 'paper' },
      { type: 'logo', signature: 'vertical', colourway: 'positive', x: round(0.086 * w), y: round(0.03 * h), points: pointsForCap(round(0.031 * h / 1.45)) },
      // The drawing's rule is at 0.285 of the depth for a two-line ministry; this leaves room for
      // three lines and a branch.
      line(round(0.086 * w), round(0.36 * h), round(0.957 * w), round(0.36 * h), '0.65pt'),
      { type: 'paragraph', id: 'publication-title', text: 'Forest Research\nProcedures', x: round(0.086 * w), y: round(0.44 * h), width: round(0.87 * w), size: '40pt', leading: pt(38), maxLines: 4, font: 'regular', colour: 'ink' }
    ]
  }
})()
const blackCover = (() => {
  const w = inch(5.5)
  const h = inch(9)
  return {
    id: 'publication-cover-reverse', label: 'Cover, reverse', group: 'Publications', unit: 'mm', width: w, height: h, physical: ['5.5in', '9in'], raster: 1100,
    title: 'Province of British Columbia / publication cover, reverse',
    description: 'A solid cover with everything reversed (General Manual p. 8): title top left in Helvetica Regular; the provincial signature, flush-left vertical, bottom left.',
    elements: [
      { type: 'background', fill: 'ink' },
      { type: 'paragraph', id: 'publication-title', text: 'Management/Executive\nDental and\nExtended Health\nCare Plans', x: round(0.067 * w), y: round(0.114 * h), width: round(0.86 * w), size: '30pt', leading: round(0.048 * h), maxLines: 6, font: 'regular', colour: 'reverse' },
      { type: 'logo', signature: 'vertical', colourway: 'reverse', values: { ministry: '', 'ministry-split': '', address: '' }, x: round(0.064 * w), y: round(0.762 * h), points: pointsForCap(round(0.026 * h / 1.45)) }
    ]
  }
})()
const annualReport = {
  id: 'publication-annual-report', label: 'Annual report cover', group: 'Publications', unit: 'mm', width: W, height: H, physical: ['8.5in', '11in'], raster: 1700,
  title: 'Province of British Columbia / annual report cover',
  description: 'An annual report cover in provincial brown (General Manual p. 8): the provincial signature top left, reversed; the issuing body, a rule and the title in one column; the ministry at the foot.',
  elements: [
    { type: 'background', fill: 'primary' },
    { type: 'logo', signature: 'horizontal', colourway: 'reverse', values: { ministry: '', 'ministry-split': '', address: '' }, x: round(0.093 * W), y: round(0.051 * H), points: pointsForCap(round(0.025 * H / 1.45)) },
    { type: 'paragraph', id: 'issuing-body', text: 'Public Service\nCommission', x: round(0.26 * W), y: round(0.408 * H), width: 140, size: '34pt', leading: round(0.05 * H), maxLines: 3, font: 'regular', colour: 'reverse' },
    line(round(0.261 * W), round(0.473 * H), round(0.965 * W), round(0.473 * H), '0.65pt', { stroke: 'reverse' }),
    { type: 'paragraph', id: 'publication-title', text: 'Annual Report\n1976', x: round(0.26 * W), y: round(0.547 * H), width: 150, size: '52pt', leading: round(0.059 * H), maxLines: 3, font: 'regular', colour: 'reverse' },
    { type: 'paragraph', id: 'ministry-line', text: 'Ministry of the Provincial Secretary\nand Travel Industry', x: round(0.253 * W), y: round(0.898 * H), width: 150, size: '17pt', leading: round(0.025 * H), maxLines: 3, font: 'regular', colour: 'reverse' }
  ]
}
const statementPage = (() => {
  const w = inch(6)
  const h = inch(9)
  return {
    id: 'publication-statement-page', label: 'Title page, publication statement', group: 'Publications', unit: 'mm', width: w, height: h, physical: ['6in', '9in'], raster: 1200,
    title: 'Province of British Columbia / title page with publication statement',
    description: 'A centred title page (General Manual p. 8): title, a rule, and the publication statement, the centred ministerial signature, grouped at the foot. Leave a 4 × 4 in space on the back for the cataloguing data.',
    elements: [
      { type: 'background', fill: 'paper' },
      { type: 'paragraph', id: 'publication-title', text: 'Special Report on the\nEffects of Tourism', x: round(w / 2), y: round(0.234 * h), width: round(0.82 * w), size: '26pt', leading: pt(30), maxLines: 4, anchor: 'middle', font: 'regular', colour: 'ink' },
      line(round(0.088 * w), round(0.498 * h), round(0.912 * w), round(0.498 * h), '0.65pt'),
      { type: 'logo', signature: 'centred', colourway: 'positive', x: round(w / 2), y: round(0.7 * h), anchorX: 'logotype', points: pointsForCap(round(0.119 * w / 4)) }
    ]
  }
})()

// --- Advertising (General Manual p. 9): every advertisement carries the ministerial signature.
const tender = (() => {
  const w = inch(4.2)
  const h = inch(5.5)
  return {
    id: 'advert-tender', label: 'Advertisement: tender', group: 'Advertising', unit: 'mm', width: w, height: h, physical: ['4.2in', '5.5in'], raster: 1000,
    title: 'Province of British Columbia / standard tender advertisement',
    description: 'A standard operative advertisement (General Manual p. 9): subject and the word Tender between 1 point rules, copy, and the flush-left horizontal signature beneath. Proportions measured from the drawing.',
    elements: [
      { type: 'background', fill: 'paper' },
      { type: 'paragraph', id: 'subject', text: 'Excavation for\nPipe Line', x: round(0.065 * w), y: round(0.089 * h), width: round(0.5 * w), size: '16pt', leading: round(0.044 * h), maxLines: 2, font: 'regular', colour: 'ink' },
      locked('Tender', round(0.941 * w), round(0.136 * h), '38pt', { font: 'regular', colour: 'ink', anchor: 'end' }),
      line(round(0.07 * w), round(0.165 * h), round(0.941 * w), round(0.165 * h), '1pt'),
      { type: 'paragraph', id: 'body', text: 'Sealed tenders for the work described will be received by the undersigned until 2:00 p.m., [date]. Tender documents may be obtained from the address below.', x: round(0.07 * w), y: round(0.23 * h), width: round(0.87 * w), size: '9pt', leading: pt(11), maxLines: 30, font: 'regular', colour: 'ink' },
      line(round(0.07 * w), round(0.812 * h), round(0.941 * w), round(0.812 * h), '1pt'),
      // The drawing's symbol is 0.13 of the width; a longer ministry shrinks the signature to fit.
      { type: 'logo', signature: 'horizontal', colourway: 'black', x: round(0.065 * w), y: round(0.829 * h), width: round(0.87 * w), height: round(0.155 * h) }
    ]
  }
})()
const announcement = (() => {
  const w = inch(2.1)
  const h = inch(7)
  return {
    id: 'advert-announcement', label: 'Advertisement: one-column announcement', group: 'Advertising', unit: 'mm', width: w, height: h, physical: ['2.1in', '7in'], raster: 600,
    title: 'Province of British Columbia / one-column announcement',
    description: 'A narrow newspaper announcement (General Manual p. 9): head, copy, and the centred ministerial signature at the foot over a closing rule.',
    elements: [
      { type: 'background', fill: 'paper' },
      { type: 'paragraph', id: 'headline', text: 'Black Creek\nAnnouncement', x: round(0.107 * w), y: round(0.049 * h), width: round(0.8 * w), size: '13pt', leading: round(0.037 * h), maxLines: 3, font: 'regular', colour: 'ink' },
      { type: 'paragraph', id: 'body', text: '[Announcement copy, set in one newspaper column.]', x: round(0.09 * w), y: round(0.14 * h), width: round(0.82 * w), size: '7pt', leading: pt(8.2), maxLines: 60, font: 'regular', colour: 'ink' },
      { type: 'logo', signature: 'centred', colourway: 'black', x: round(w / 2), y: round(0.80 * h), anchorX: 'logotype', points: pointsForCap(round(0.149 * w / 4)) },
      line(round(0.084 * w), round(0.945 * h), round(0.916 * w), round(0.945 * h), '0.4pt')
    ]
  }
})()

// --- Uniform insignia (General Manual p. 13): the ministerial signature is the most prominent
// device. No sizes are given; proportions are the drawing's.
const flash = {
  id: 'uniform-flash', label: 'Shoulder flash: job function', group: 'Uniform insignia', unit: 'mm', width: 100, height: 116, physical: ['100mm', '116mm'], raster: 800,
  title: 'Province of British Columbia / shoulder flash, job function',
  description: 'A shield-shaped shoulder flash (General Manual p. 13): white field, brown outline, the job function in a band at the top, and the stacked ministerial signature, positive.',
  elements: [
    { type: 'path', id: 'flash', d: 'M1 13 Q50 -9 99 13 L94.5 99 Q93.5 111 81.5 111 L18.5 111 Q6.5 111 5.5 99 Z', fill: 'paper', stroke: 'primary', strokeWidth: 1.7 },
    { type: 'path', d: 'M3 31 Q50 10 97 31', fill: 'none', stroke: 'primary', strokeWidth: 0.8 },
    { type: 'path', d: 'M3 34 Q50 13 97 34', fill: 'none', stroke: 'primary', strokeWidth: 0.8 },
    text('job-function', 'Job Function', 50, 15.5, '14pt', { font: 'regular', anchor: 'middle', colour: 'ink' }),
    { type: 'logo', signature: 'stacked', colourway: 'positive', values: { address: '' }, x: 19, y: 38, width: 62, height: 66, align: 'center' }
  ]
}
const securityFlash = {
  id: 'uniform-security', label: 'Shoulder flash: security', group: 'Uniform insignia', unit: 'mm', width: 103, height: 118, physical: ['103mm', '118mm'], raster: 800,
  title: 'Province of British Columbia / shoulder flash, security',
  description: 'A brown shoulder flash with a black band (General Manual p. 13): the function reversed in the band, the provincial signature reversed beneath.',
  elements: [
    { type: 'path', d: 'M0 0H103V104L51.5 118L0 104Z', fill: 'primary' },
    { type: 'rect', x: 0, y: 0, width: 103, height: 25, fill: 'ink' },
    text('job-function', 'Security', 51.5, 17, '22pt', { font: 'regular', anchor: 'middle', colour: 'reverse' }),
    { type: 'logo', signature: 'provincial', colourway: 'reverse', x: 10, y: 34, width: 83, height: 66, align: 'center' }
  ]
}

// --- Vehicles (Vehicle Manual pp. 2–15). Markings are white, or black on white and near-white
// bodies. Symbol heights: 5 in on doors, 16 in on truck boxes and trailers; unit numbers 2 in or
// 4 in; placements as the manual gives them.
const FT = 304.8
const vehicleSignature = (height) => pointsForCap(height * 0.1) // the logotype is a tenth of the symbol
const door = {
  id: 'vehicle-door', label: 'Vehicle door marking', group: 'Vehicles', unit: 'mm', width: inch(40), height: inch(30), physical: ['40in', '30in'], raster: 1600,
  title: 'Province of British Columbia / vehicle door marking',
  description: 'The ministerial signature on a driver’s or passenger’s door (Vehicle Manual pp. 3–5): a 5 in symbol, ½ in logotype, 1 in ministry name; centred on the door, 2 in below the edge of its upper panel. White on a brown body.',
  elements: [
    { type: 'background', fill: 'primary' },
    { type: 'path', id: 'door', d: `M${inch(2)} ${inch(1)}H${inch(38)}V${inch(29)}H${inch(2)}Z`, fill: 'none', stroke: '#3E2F1C', strokeWidth: 3 },
    line(inch(2), inch(8), inch(38), inch(8), 2, { stroke: '#3E2F1C' }),
    { type: 'logo', signature: 'vehicle', colourway: 'reverse', x: inch(20), y: inch(10), anchorX: 'logotype', points: vehicleSignature(inch(5)) }
  ]
}
const boxSide = {
  id: 'vehicle-van-truck', label: 'Van truck, box side', group: 'Vehicles', unit: 'mm', width: 14 * FT, height: 7 * FT, physical: ['168in', '84in'], raster: 2400,
  title: 'Province of British Columbia / van truck box side',
  description: 'A van truck’s box (Vehicle Manual pp. 10–11): a 16 in provincial signature in the top rear corner, 16 in from the edge and 8 in from the top; a 4 in unit number in the top front corner, 8 in from top and side. Black on a white or aluminium box.',
  elements: [
    { type: 'background', fill: 'paper' },
    { type: 'rect', x: 4, y: 4, width: 14 * FT - 8, height: 7 * FT - 8, fill: 'none', stroke: 'grey', strokeWidth: 8 },
    { type: 'logo', signature: 'provincial', colourway: 'black', x: inch(16), y: inch(8), points: vehicleSignature(inch(16)) },
    text('unit-number', '1604-2103', round(14 * FT - inch(8)), round(inch(8) + inch(4)), `${round(inch(4) / CAPR / 25.4 * 72)}pt`, { font: 'regular', anchor: 'end', colour: 'ink' })
  ]
}
const stripes = (x0) => Array.from({ length: 6 }, (_, index) => ({ type: 'rect', x: round(x0 + inch(4) + index * inch(8)), y: round(7 * FT - inch(8) - inch(16)), width: inch(4), height: inch(16), fill: 'reverse', stroke: 'grey', strokeWidth: 2 }))
const boxRear = {
  id: 'vehicle-van-truck-rear', label: 'Van truck, rear doors', group: 'Vehicles', unit: 'mm', width: 8 * FT, height: 7 * FT, physical: ['96in', '84in'], raster: 1600,
  title: 'Province of British Columbia / van truck rear doors',
  description: 'The rear of a van truck’s box (Vehicle Manual pp. 10–11): the provincial signature centred on the top of the left door, 8 in down; the unit number top right of the right door, 8 in from top and side; 4 in reflective stripes 16 in long, 4 in apart, starting 8 in from the bottom, six to a door.',
  elements: [
    { type: 'background', fill: 'paper' },
    { type: 'rect', x: 4, y: 4, width: 8 * FT - 8, height: 7 * FT - 8, fill: 'none', stroke: 'grey', strokeWidth: 8 },
    line(4 * FT, 0, 4 * FT, 7 * FT, 6, { stroke: 'grey' }),
    { type: 'logo', signature: 'provincial', colourway: 'black', x: 2 * FT, y: inch(8), anchorX: 'logotype', points: vehicleSignature(inch(16)) },
    text('unit-number', '1604-2103', round(8 * FT - inch(8)), round(inch(8) + inch(4)), `${round(inch(4) / CAPR / 25.4 * 72)}pt`, { font: 'regular', anchor: 'end', colour: 'ink' }),
    ...stripes(0), ...stripes(4 * FT)
  ]
}
// The vehicle signature is centred on its own axis, so 'logotype' anchoring places that axis.
door.elements[3].anchorX = 'logotype'
boxRear.elements[3].anchorX = 'logotype'

// --- Signs (Sign Manual). The grid square y is 1/12 of the longest side; information,
// identification and directional signs are provincial brown with white graphics, warning signs
// yellow with black, regulatory signs white with black. Helvetica Medium throughout.
const sign = (feetLong, feetHigh) => ({ A: feetLong * FT, B: feetHigh * FT, y: feetLong * FT / 12 })
const capSize = (capMm) => `${round(capMm / CAPR / 25.4 * 72, 1)}pt`

const primary = (() => {
  const { A, B, y } = sign(8, 4)
  return {
    id: 'sign-primary-identification', label: 'Sign: primary identification, 4 × 8 ft', group: 'Signs', unit: 'mm', width: A, height: B, physical: ['96in', '48in'], raster: 2400,
    title: 'Province of British Columbia / primary identification sign',
    description: 'Primary identification (Sign Manual pp. 10–11): centred. The ministerial signature, centred format, fills the upper half; a hairline at mid-height; the facility’s name, centred, capitals at most one grid square, in the lower half. Grid square y = 8 in.',
    elements: [
      { type: 'background', fill: 'primary' },
      { type: 'logo', signature: 'sign-centred', colourway: 'reverse', x: 0.75 * y, y: 0.5 * y, width: 10.5 * y, height: 2 * y, align: 'center' },
      line(0.5 * y, 3 * y, 11.5 * y, 3 * y, 3, { stroke: 'reverse' }),
      { type: 'paragraph', id: 'facility', text: 'Provincial Government\nAccess Centre', x: 6 * y, y: round(4.25 * y), width: 10.5 * y, size: capSize(0.64 * y), leading: round(0.9 * y), maxLines: 2, anchor: 'middle', font: 'medium', colour: 'reverse' }
    ]
  }
})()
const information = (() => {
  const { A, B, y } = sign(8, 4)
  return {
    id: 'sign-standard-information', label: 'Sign: standard information, 4 × 8 ft', group: 'Signs', unit: 'mm', width: A, height: B, physical: ['96in', '48in'], raster: 2400,
    title: 'Province of British Columbia / standard information sign',
    description: 'Standard information (Sign Manual pp. 14–15): a one-line title, capitals one grid square; the message, its size set by its length (Chart B); a hairline at 5 y and the horizontal ministerial signature in the 1 y band below. All flush left at 0.75 y.',
    elements: [
      { type: 'background', fill: 'primary' },
      text('sign-title', 'Forest Nursery', 0.75 * y, 1.5 * y, capSize(y), { font: 'medium', colour: 'reverse' }),
      { type: 'paragraph', id: 'sign-message', text: 'Seedlings for the province’s reforestation are grown here. Visitors welcome weekdays.', x: 0.75 * y, y: round(2 * y + inch(3)), width: 10.5 * y, size: capSize(inch(3)), leading: inch(4.9375), maxLines: 4, font: 'medium', colour: 'reverse' },
      line(0.75 * y, 5 * y, 11.25 * y, 5 * y, 3, { stroke: 'reverse' }),
      { type: 'logo', signature: 'sign-horizontal', colourway: 'reverse', x: 0.75 * y, y: 5.15 * y, width: 10.5 * y, height: 0.7 * y }
    ]
  }
})()
const blade = (() => {
  const { A, y } = sign(8, 1)
  return {
    id: 'sign-secondary-identification', label: 'Sign: secondary identification blade', group: 'Signs', unit: 'mm', width: A, height: inch(12), physical: ['96in', '12in'], raster: 2400,
    title: 'Province of British Columbia / secondary identification blade',
    description: 'Secondary identification (Sign Manual pp. 12–13): one facility per 12 in × 8 ft blade, flush left; 6 in capitals, 3 in margins above and below, 6 in from the left.',
    elements: [
      { type: 'background', fill: 'primary' },
      text('facility', 'Seed Extractory', inch(6), inch(9), capSize(inch(6)), { font: 'medium', colour: 'reverse' })
    ],
    _grid: y
  }
})()
delete blade._grid

const arrowPath = (direction, x, top, D) => {
  const s = D * 0.8
  const c = { x: x + s / 2, y: top + D / 2 }
  const head = s * 0.45
  const rotate = { up: 0, 'up-left': -45, 'up-right': 45, right: 90, left: -90 }[direction]
  const r = (dx, dy) => {
    const a = rotate * Math.PI / 180
    return `${round(c.x + dx * Math.cos(a) - dy * Math.sin(a))} ${round(c.y + dx * Math.sin(a) + dy * Math.cos(a))}`
  }
  return `M${r(0, s / 2)}L${r(0, -s / 2)}M${r(-head, -s / 2 + head)}L${r(0, -s / 2)}L${r(head, -s / 2 + head)}`
}
const directional = (() => {
  const A = 8 * FT
  const B = inch(12)
  const D = inch(6)
  const rows = [['up', 'Information'], ['up-left', 'Washrooms'], ['up-right', 'Administration'], ['right', 'Inventory']]
  return {
    id: 'sign-directional', label: 'Sign: secondary directional, four blades', group: 'Signs', unit: 'mm', width: A, height: 4 * B, physical: ['96in', '48in'], raster: 2400,
    title: 'Province of British Columbia / secondary directional sign',
    description: 'Secondary directional blades (Sign Manual pp. 16–17), for low-speed areas: one destination per blade. Arrows pointing up or left sit at the left with the copy 10 in in; arrows pointing right sit at the right with the copy flush right. 6 in copy and arrows, 3 in margins.',
    elements: [
      { type: 'background', fill: 'primary' },
      ...rows.flatMap(([direction, label], index) => {
        const top = index * B
        const right = direction === 'right' || direction === 'up-right'
        return [
          ...(index ? [line(0, top, A, top, 3, { stroke: 'reverse' })] : []),
          { type: 'path', d: arrowPath(direction, right ? A - inch(3) - D * 0.8 : inch(3), top + inch(3), D), fill: 'none', stroke: 'reverse', strokeWidth: round(D * 0.19) },
          text(`destination-${index + 1}`, label, right ? A - inch(10) : inch(10), top + inch(9), capSize(D), { font: 'medium', colour: 'reverse', ...(right ? { anchor: 'end' } : {}) })
        ]
      })
    ]
  }
})()
const warning = (() => {
  const { A, B, y } = sign(4, 2)
  return {
    id: 'sign-warning', label: 'Sign: warning, 2 × 4 ft', group: 'Signs', unit: 'mm', width: B, height: A, physical: ['24in', '48in'], raster: 1200,
    title: 'Province of British Columbia / warning sign',
    description: 'Warning (Sign Manual pp. 20–21): yellow with black graphics; a short title, capitals one grid square; a bold message; a hairline at 11 y and the horizontal ministerial signature beneath. Grid square y = 4 in.',
    elements: [
      { type: 'background', fill: 'yellow' },
      { type: 'paragraph', id: 'sign-title', text: 'Poison\nBaits', x: 0.5 * y, y: 1.5 * y, width: 5 * y, size: capSize(y), leading: 1.5 * y, maxLines: 2, font: 'medium', colour: 'ink' },
      { type: 'paragraph', id: 'sign-message', text: 'Rodent control in progress. Keep children and pets away from bait stations.', x: 0.5 * y, y: 4.6 * y, width: 5 * y, size: capSize(inch(1.5)), leading: inch(2.3125), maxLines: 8, font: 'medium', colour: 'ink' },
      line(0.5 * y, 11 * y, 5.5 * y, 11 * y, 2),
      { type: 'logo', signature: 'sign-horizontal', colourway: 'black', x: 0.5 * y, y: 11.15 * y, width: 5 * y, height: 0.7 * y }
    ]
  }
})()
const octagon = (cx, top, size) => {
  const r = size / 2
  const k = r * Math.tan(Math.PI / 8)
  const cy = top + r
  return `M${round(cx - k)} ${round(cy - r)}H${round(cx + k)}L${round(cx + r)} ${round(cy - k)}V${round(cy + k)}L${round(cx + k)} ${round(cy + r)}H${round(cx - k)}L${round(cx - r)} ${round(cy + k)}V${round(cy - k)}Z`
}
const regulatory = (() => {
  const { A, B, y } = sign(4, 2)
  return {
    id: 'sign-regulatory', label: 'Sign: regulatory, 2 × 4 ft', group: 'Signs', unit: 'mm', width: B, height: A, physical: ['24in', '48in'], raster: 1200,
    title: 'Province of British Columbia / regulatory sign',
    description: 'Regulatory (Sign Manual pp. 20–21): white with black graphics, the symbol in its prescribed colour (a red STOP octagon); title and message; the ministerial signature always required. Grid square y = 4 in.',
    elements: [
      { type: 'background', fill: 'paper' },
      { type: 'rect', x: 0, y: 0, width: B, height: A, fill: 'none', stroke: 'ink', strokeWidth: 3 },
      { type: 'path', d: octagon(3 * y, 0.75 * y, 4.25 * y), fill: 'red' },
      locked('STOP', 3 * y, round(0.75 * y + 2.125 * y + 0.45 * y), capSize(0.9 * y), { font: 'medium', anchor: 'middle', colour: 'reverse' }),
      { type: 'paragraph', id: 'sign-title', text: 'Game\nCheck', x: 0.5 * y, y: 6.5 * y, width: 5 * y, size: capSize(y), leading: 1.5 * y, maxLines: 2, font: 'medium', colour: 'ink' },
      { type: 'paragraph', id: 'sign-message', text: 'Register all catches with inspector.', x: 0.5 * y, y: 9 * y, width: 5 * y, size: capSize(inch(1.5)), leading: inch(2.3125), maxLines: 3, font: 'medium', colour: 'ink' },
      line(0.5 * y, 11 * y, 5.5 * y, 11 * y, 2),
      { type: 'logo', signature: 'sign-horizontal', colourway: 'black', x: 0.5 * y, y: 11.15 * y, width: 5 * y, height: 0.7 * y }
    ]
  }
})()

export const applications = () => [memo, news, titlePage, blackCover, annualReport, statementPage, tender, announcement, flash, securityFlash, door, boxSide, boxRear, primary, information, blade, directional, warning, regulatory]

// --- The guide: the program as it applies across the four manuals, generated from the brand.
const signatureRow = (items, y, height, colourway = 'positive') => {
  const width = 1312 / items.length - 24
  return items.flatMap(([signature, label], index) => {
    const x = 64 + index * (width + 24)
    return [g.rect(x, y, width, height, 'reverse', 'line'), g.label(label, x + 16, y + 26), { type: 'logo', signature, colourway, x: x + 20, y: y + 44, width: width - 40, height: height - 64 }]
  })
}

export const guide = () => ({
  title: '{name}: Visual Identity Program',
  pdfTitle: 'Province of British Columbia / Visual Identity Program, 1977 (reconstruction)',
  sheetsPdfTitle: 'Province of British Columbia / signature sheets, 1977',
  pageTitle: 'Province of British Columbia / Visual Identity Program / {page}',
  width: 1440,
  height: 1020,
  frame: { background: 'paper', logo: { x: 64, y: 30, width: 330, height: 32, align: 'start', signature: 'one-line', colourway: 'positive', values: { ministry: '', 'ministry-split': '', address: '' } }, header: 'PROVINCE OF BRITISH COLUMBIA / VISUAL IDENTITY PROGRAM / 1977', footer: 'RECONSTRUCTION FOR REFERENCE / NOT THE CURRENT PROVINCIAL IDENTITY' },
  pages: [
    {
      title: 'The provincial signature.', name: 'The provincial signature', subtitle: 'The Provincial Symbol, the coat of arms within its band, with the provincial logotype. Never the symbol alone; never modified.',
      elements: [
        g.rect(64, 250, 560, 640, 'reverse', 'line'),
        { type: 'logo', signature: 'provincial', colourway: 'positive', x: 104, y: 300, width: 480, height: 540 },
        g.label('SYMBOL', 680, 270), g.para('The Provincial Coat of Arms surrounded by a band to focus attention upon it.', 680, 300, 680, 22, { colour: 'ink' }),
        g.label('LOGOTYPE', 680, 400), g.para('The name of the Province, and of the ministry, in Helvetica: Medium for the Province, Regular for the ministry.', 680, 430, 680, 22, { colour: 'ink' }),
        g.label('SIGNATURE', 680, 530), g.para('Symbol and logotype combined in a specific format. The provincial signature is the symbol with the provincial logotype; the ministerial signature adds the ministry.', 680, 560, 680, 22, { colour: 'ink' }),
        g.para('Reproduce the signature only as the manuals show it, from the reproduction sheets. Nothing is superimposed on it, and the symbol never appears without the provincial logotype (General Manual pp. 3–4).', 680, 720, 680, 20)
      ]
    },
    {
      title: 'Ministerial signatures.', name: 'Ministerial signature formats', subtitle: 'One set of formats for every ministry, set on a single grid. The flush-left formats are standard; one line and centred are alternates.',
      elements: [
        ...signatureRow([['horizontal', 'FLUSH-LEFT, HORIZONTAL / STATIONERY, ADVERTISING'], ['one-line', 'ONE LINE / STATIONERY, ADVERTISING']], 250, 200),
        ...signatureRow([['vertical', 'FLUSH-LEFT, VERTICAL / COVERS'], ['stacked', 'STACKED, CENTRED / SMALL ADS'], ['centred', 'CENTRED / POSTERS, BACK COVERS']], 480, 330),
        g.para('Ministry names are upper and lower case, on two or more lines in the flush-left formats. Branches and split ministries are in capitals, smaller, at the ministry’s x-height. Component and address go below a 1 point rule.', 64, 870, 1312, 19)
      ]
    },
    {
      title: 'One grid for every line.', name: 'Line spacing', subtitle: 'Cap height (c) and x-height (x) set every space in the signature, so a ministry of any length keeps the same relationships.',
      elements: [
        g.rect(64, 250, 1312, 330, 'reverse', 'line'),
        { type: 'logo', signature: 'horizontal', colourway: 'positive', x: 110, y: 290, width: 1220, height: 250 },
        { type: 'specTable', x: 64, right: 1376, y: 650, step: 46, rows: [['Baseline to baseline within a group', '1.45 c, about 2 x'], ['Provincial group to ministry group', '2 c'], ['Symbol height', 'about 4 c, the depth of three lines'], ['Symbol to logotype; logotype to ministry column', '2 c each'], ['Branch and split-ministry capitals', '0.73 c, the ministry’s x-height'], ['Below the ministry, a 1 point rule, then component and address', 'flush with the logotype']] }
      ]
    },
    {
      title: 'Colour.', name: 'Colour', subtitle: 'Pantone 462, provincial brown, is the program’s colour. Solid colour only: no screens, no tints.',
      elements: [
        { type: 'swatches', x: 64, y: 240, step: 334, width: 300, height: 220, colours: ['brown', 'black', 'white', 'gold'] },
        ...[['positive', 'TWO COLOURS', 'reverse'], ['brown', 'ONE COLOUR, BROWN', 'reverse'], ['black', 'ONE COLOUR, BLACK', 'reverse'], ['reverse', 'REVERSE ON BROWN', 'primary']].flatMap(([colourway, label, ground], index) => {
          const x = 64 + index * 334
          return [g.rect(x, 660, 310, 170, ground, ground === 'reverse' ? 'line' : undefined), g.label(label, x, 856), { type: 'logo', signature: 'provincial', colourway, x: x + 20, y: 672, width: 270, height: 146 }]
        }),
        g.para('The symbol and band are always one colour. In both forms the Union Jack is black and the Sun white: the reverse form is its own artwork, never an inversion of the positive (not reconstructed here).', 64, 890, 1312, 17)
      ]
    },
    {
      title: 'Helvetica.', name: 'Typography', subtitle: 'Two styles: Medium for the provincial logotype, Regular for ministry and component designations. Upper and lower case throughout.',
      elements: [
        g.label('HELVETICA MEDIUM (TEX GYRE HEROS BOLD)', 64, 280),
        g.text('Province of British Columbia', 62, 370, 72, { font: 'medium' }),
        g.label('HELVETICA REGULAR (TEX GYRE HEROS)', 64, 450),
        g.text('Ministry of Lands, Parks and Housing', 62, 540, 64, { font: 'regular' }),
        g.label('BRANCHES AND SPLIT MINISTRIES: CAPITALS, SMALLER', 64, 620),
        g.text('PARKS BRANCH', 64, 680, 36, { font: 'regular' }),
        g.para('Capitals are used only for branches and split ministries. Hand lettering is not recommended. Display type may be photo-lettered or dry-transfer Helvetica; all must match the British Columbia Helvetica Medium standard (Reproduction Manual p. 9). This reconstruction sets Helvetica in TeX Gyre Heros.', 64, 760, 1312, 20)
      ]
    },
    {
      title: 'Stationery.', name: 'Stationery', subtitle: 'One grid for letterhead, envelope and calling card at every rank but the Premier’s and Special Use, which are centred.',
      elements: [
        ...shelf([{ src: 'templates/gu-letterhead', ratio: 215.9 / 279.4, label: 'LETTERHEAD, GENERAL USE', frame: true }, { src: 'templates/gu-envelope', ratio: 241.3 / 104.78, label: 'ENVELOPE NO. 10' }, { src: 'templates/gu-card', ratio: 88.9 / 50.8, label: 'CALLING CARD', frame: true }], { y: 250, height: 470 }),
        g.para('Ranks: Premier · Ministers (OFFICE OF THE MINISTER) · Deputy Ministers · Boards and Commissions · General Use · Special Use. Format A typesets the component and address above the rule; Format B types them below it.', 64, 840, 1312, 19)
      ]
    },
    {
      title: 'Forms, publications and advertising.', name: 'Documents', subtitle: 'The memorandum and news release carry the signature in a brown band. Every advertisement carries the ministerial signature.',
      elements: shelf([{ src: 'templates/memorandum', ratio: 215.9 / 279.4, label: 'MEMORANDUM', frame: true }, { src: 'templates/publication-title-page', ratio: 6 / 9, label: 'TITLE PAGE', frame: true }, { src: 'templates/publication-annual-report', ratio: 215.9 / 279.4, label: 'ANNUAL REPORT' }, { src: 'templates/advert-tender', ratio: 4.2 / 5.5, label: 'TENDER', frame: true }, { src: 'templates/uniform-flash', ratio: 100 / 116, label: 'SHOULDER FLASH' }], { y: 260, height: 520 })
    },
    {
      title: 'Vehicles.', name: 'Vehicles', subtitle: 'Every vehicle carries the ministerial signature on its doors, the provincial signature on its rear, and a unit number. White markings, or black on white bodies.',
      elements: [
        ...shelf([{ src: 'templates/vehicle-door', ratio: 40 / 30, label: '5 IN SYMBOL, DOORS' }, { src: 'templates/vehicle-van-truck', ratio: 2, label: '16 IN SYMBOL, BOX SIDE', frame: true }, { src: 'templates/vehicle-van-truck-rear', ratio: 96 / 84, label: 'REAR, WITH STRIPING', frame: true }], { y: 250, height: 330 }),
        { type: 'specTable', x: 64, right: 1376, y: 720, step: 40, rows: [['Doors: ministerial signature', '5 in symbol, ½ in logotype, 1 in ministry'], ['Rear of cars, pickups, vans', '4 in provincial signature'], ['Truck boxes and trailers', '16 in signature, 16 in from the edge, 8 in down'], ['Unit numbers', '2 in on cars and cabs, 4 in on boxes and trailers']] }
      ]
    },
    {
      title: 'Signs.', name: 'Signs', subtitle: 'A grid square of one twelfth of the longest side sets every sign. Brown for information, identification and direction; yellow for warning; white for regulation.',
      elements: shelf([{ src: 'templates/sign-primary-identification', ratio: 2, label: 'PRIMARY IDENTIFICATION' }, { src: 'templates/sign-standard-information', ratio: 2, label: 'STANDARD INFORMATION' }, { src: 'templates/sign-warning', ratio: 0.5, label: 'WARNING' }, { src: 'templates/sign-regulatory', ratio: 0.5, label: 'REGULATORY', frame: true }], { y: 280, height: 440 })
    }
  ],
  sheets: [
    {
      id: 'signature-sheet', group: 'logo-sheets', width: 1440, height: 1020, title: '{name} / signature sheet',
      elements: [
        g.rect(0, 0, 1440, 1020, 'paper'),
        g.text('Signature sheet', 64, 88, 42, { font: 'medium' }),
        g.label('EVERY FORMAT, SET FOR ONE MINISTRY. THE KIT CARRIES THEM FOR EVERY MINISTRY OF 1976–1986.', 64, 128),
        ...signatureRow([['provincial', 'PROVINCIAL'], ['vertical', 'FLUSH-LEFT, VERTICAL'], ['stacked', 'STACKED'], ['centred', 'CENTRED']], 170, 360),
        ...signatureRow([['horizontal', 'FLUSH-LEFT, HORIZONTAL'], ['one-line', 'ONE LINE']], 560, 170),
        ...signatureRow([['sign-horizontal', 'SIGNS, HORIZONTAL'], ['vehicle', 'VEHICLE DOORS']], 760, 200, 'black')
      ]
    }
  ]
})
