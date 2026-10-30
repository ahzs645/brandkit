// The three additional form examples in the 1983 manual (PDF H21–H23), plus a
// demonstration of the Formal signature exception stated on H19. These are
// editable reconstructions, not operational/current company forms. Dimensions
// explicitly printed in the source are distinguished from scan measurements.
import { box, inch, line, locked, pt, round, text } from './common.mjs'

const CAP = 0.662
const p = pt
const cap = (size) => round(CAP * p(size))
const rule = (x1, y1, x2, y2) => line(p(x1), p(y1), p(x2), p(y2), '0.5pt')
const label = (value, x, y, size = 9, extra = {}) => locked(value, p(x), p(y), `${size}pt`, { font: 'body', colour: 'ink', ...extra })
const value = (id, x, y, size = 10, extra = {}) => text(id, '', p(x), p(y), `${size}pt`, { font: 'body', colour: 'ink', ...extra })
const para = (id, content, x, y, width, size = 10, leading = 12, extra = {}) => ({ type: 'paragraph', id: id ?? `fixed-${x}-${y}`, text: content, x: p(x), y: p(y), width: p(width), size: `${size}pt`, leading: p(leading), font: 'body', colour: 'ink', ...extra })
const check = (id, x, y, size = 9) => [box(p(x), p(y), p(size), p(size)), value(id, x + 1, y + size - 1, size, { label: `${id.replaceAll('-', ' ')} (type x to mark)` })]
const page = (id, label, width, height, description, elements, extra = {}) => ({
  id, label, group: 'Forms', unit: 'mm', width: p(width), height: p(height), physical: [`${width}pt`, `${height}pt`], raster: Math.round(width / 72 * 200),
  title: `B.C.Hydro / ${label}`, description, elements: [{ type: 'background', fill: 'paper' }, ...elements], ...extra
})
// artwork.json's Formal signature exposes the FIRST line as its baseline. Its
// second line is 110 artwork units lower, against an 87.384-unit cap height.
// Align the bottom line of that two-line signature with the form title.
const formalBaselineOffset = (points) => p(points) * CAP * 110 / 87.384
const header = (title, width, { left = 30, top = 27, signature = 'standard', signaturePoints = 20 } = {}) => [
  text('form-name', title, p(left), round(p(top) + cap(20)), '20pt', { font: 'body', colour: 'ink' }),
  { type: 'logo', signature, colourway: 'black', points: signaturePoints, x: p(width - 72), y: round(p(top) + cap(20) - (signature === 'formal' ? formalBaselineOffset(signaturePoints) : 0)), anchorX: 'end', anchorY: 'baseline' }
]

const tender = page('form-tender', 'Form: Tender, legal', 612, 1008,
  'Editable reconstruction of the Tender Form (printed p. 20 / PDF H21), on the explicitly specified 8½ × 14 in legal sheet. The scan shortens the long table using break marks; this template restores a continuous table at legal height. Form name and signature are 20 point, ⅜ in down, signature 1 in from the right. Readable historical labels and text are retained; line positions and entry areas are reconstructed, not certified facsimile measurements.', [
    ...header('Tender Form', 612),
    label('To', 30, 76, 9),
    para('tender-addressee', 'Purchasing Department\nB.C.Hydro\n1265 Howe Street, Suite 200\nVancouver, B.C.\nV6Z 2G8', 30, 89, 250, 11, 11),
    ...[['Date', 'tender-date', 78], ["Tenderer’s reference", 'tenderer-reference', 102], ['B.C.Hydro’s reference', 'hydro-reference', 126]].flatMap(([name, id, y]) => [label(name, 312, y, 9), value(id, 415, y, 10), rule(312, y + 3, 540, y + 3)]),
    // The date line is printed for the year: "Date ______ 19__".
    label('19', 503, 78, 9),
    para('tender-offer', 'The Tenderer hereby offers to furnish to British Columbia Hydro and Power Authority (herein called “B.C.Hydro”) any part or all of any one of the following payment items, for the following prices, on the Terms and Conditions contained herein and in the Invitation to Tender and attachments thereto.', 30, 160, 264, 11, 12.5),
    para('tender-tax-note', 'For purposes of adjustment pursuant to clause 4 of the Invitation to Tender, Federal Sales Tax is included at ____ % and Duty is included at ____ %.', 312, 160, 264, 11, 12.5),
    para('tender-delivery-note', 'Delivery shall be as required in the Invitation to Tender or as noted below.', 312, 220, 264, 11, 12.5, { font: 'italic' }),
    rule(30, 249, 576, 249), rule(30, 294, 576, 294), rule(30, 866, 576, 866),
    ...[100, 152, 204, 440, 512].map(x => rule(x, 249, x, 866)),
    rule(486, 294, 486, 866), rule(558, 294, 558, 866),
    para(null, '1. Payment\n    item\n    number', 33, 262, 64, 8.5, 10, { locked: true }),
    para(null, '2. Handling\n    unit (each,\n    lb. doz. etc.)', 103, 262, 47, 8, 10, { locked: true }),
    para(null, '3. Number of\n    handling\n    units', 155, 262, 47, 8, 10, { locked: true }),
    label('4. Description of the payment item', 207, 262, 8.5),
    para(null, 'Very important: unit price in column 5 must be for the handling unit specified in column 2', 214, 274, 220, 8, 9, { font: 'italic', locked: true }),
    para(null, '5. Specify price\n    per unit (see\n    note in column 4)', 443, 262, 67, 8, 10, { locked: true }),
    para(null, '6. Extended\n    totals', 515, 262, 58, 8.5, 10, { locked: true }),
    ...[['payment-item-numbers', 34, 62], ['handling-units', 104, 44], ['handling-quantities', 156, 44], ['payment-item-descriptions', 208, 228], ['unit-prices', 444, 38], ['unit-price-cents', 489, 19], ['extended-totals', 516, 38], ['extended-cents', 561, 12]].map(([id, x, w]) => para(id, '', x, 310, w, 10, 15, { maxLines: 37 })),
    label('Full name of tenderer', 30, 882, 10), value('tenderer-name', 128, 882), rule(30, 886, 576, 886),
    label('Address', 30, 902, 10), value('tenderer-address', 70, 902), label('Phone number', 440, 902, 10), value('tenderer-phone', 502, 902, 9), rule(30, 906, 576, 906),
    label('Place and date of incorporation, if applicable', 30, 922, 9), value('incorporation-place-date', 208, 922, 9), rule(30, 926, 576, 926),
    label('Signature', 30, 942, 10), value('tenderer-signature', 78, 942), label('Title', 312, 942, 10), value('tenderer-title', 336, 942), rule(30, 946, 576, 946),
    text('form-number', '60742  82-02', p(30), p(990), '6pt', { font: 'body', colour: 'ink' })
  ], { dimensionStatus: 'source-specified', reconstruction: { pdfPage: 21, printedPage: 20, paper: '8.5 × 14 in specified on printed p. 18.', note: 'Continuous legal-height grid replaces the scan’s shortening marks; entry-area spacing is reconstructed.' } })

// The outline around the source example represents its cut paper, not a printed
// outside border. The snap-set strip is expressed as a guide, hidden in exports.
const transfer = page('form-employee-transfer', 'Form: Salary Employee Transfer', 414, 666,
  'Editable reconstruction of Salary Employee Transfer (printed p. 21 / PDF H22). The manual calls this an odd-size snap set without specifying its paper dimensions. This 5¾ × 9¼ in canvas and 7/12 in snap strip are rounded measurements from the scan, not official trim sizes. The 20 point header, ½ point grid and readable historical instructions are retained; the generic 1 in signature inset is applied. No printed outside border is added.', [
    ...header('Salary Employee Transfer', 414, { left: 36, top: 69 }),
    box(p(36), p(106), p(342), p(96)),
    ...[130, 154, 178].map(y => rule(36, y, 378, y)), rule(266, 106, 266, 202),
    ...[['To', 'transfer-to', 122], ['From', 'transfer-from', 146], ['Competition', 'transfer-competition', 170], ['Employee', 'transfer-employee', 194]].flatMap(([name, id, y]) => [label(name, 42, y, 9), value(id, 105, y, 9)]),
    label('Date', 272, 115, 9), label('Day    |    Month    |    Year', 278, 128, 6.5), value('transfer-date', 298, 116, 8),
    label('cc:', 272, 140, 9), value('transfer-cc', 290, 147, 8),
    label('Bulletin number', 272, 163, 8.5), value('transfer-bulletin-number', 272, 174, 8),
    label('Social insurance number', 272, 187, 8.5), value('transfer-social-insurance-number', 276, 199, 8),
    ...Array.from({ length: 8 }, (_, i) => rule(278 + i * 11, 197, 278 + i * 11, 202)),
    para('transfer-selection-notice', 'The above employee has been informed of selection and quoted a salary', 36, 220, 342, 10, 11),
    label('upon transfer of $', 36, 231, 10), value('transfer-new-salary', 111, 231, 10), label('per', 148, 231, 10), value('transfer-pay-period', 168, 231, 10), label(', Group', 218, 231, 10), value('transfer-new-group', 252, 231, 10),
    para('transfer-date-instructions', 'Would you please contact the employee’s present supervisor to make mutually satisfactory arrangements for date of transfer.', 36, 247, 342, 10, 11),
    label('The following action is required:', 36, 280, 10),
    ...[
      ['complete-change-status', 292, 'Please complete form number 80405, Employee Change of Status, and route per PPI AF-140.'],
      ['advise-personnel', 320, 'Advise Personnel Department of effective date of transfer in order to prepare a change of status.'],
      ['change-status-attached', 347, 'A form 80405, Employee Change of Status is attached for completion as follows:'],
      ['fill-effective-date', 373, 'Fill in the effective date of transfer. (Please refer to page __, section __, of the current OTEU Agreement regarding replacement time limits.)'],
      ['retain-copy', 401, 'Retain the copy for your records.']
    ].flatMap(([id, y, instruction]) => [...check(id, 36, y - 8, 10), para(null, instruction, 59, y, 319, 9.5, 10.5, { locked: true })]),
    label('If required, the employee’s current status is shown below.', 36, 420, 10),
    box(p(36), p(432), p(342), p(132)),
    ...[454, 476, 498, 520, 542].map(y => rule(36, y, 378, y)), rule(288, 432, 288, 476),
    ...[['Present job title', 'present-job-title', 448], ['Present job code', 'present-job-code', 470], ['Division', 'present-division', 492], ['Department name', 'present-department', 514], ['Department number', 'present-department-number', 536]].flatMap(([name, id, y]) => [label(name, 42, y, 8.5), value(id, 130, y, 8.5)]),
    // H22: the salary after a "$" a fifth of the way along the row, "Group" about half way.
    label('Present salary', 42, 558, 8.5), label('$', 105, 558, 8.5), value('present-salary', 113, 558, 8.5), label('Group', 212, 558, 8.5), value('present-group', 240, 558, 8.5),
    ...check('status-ftr', 299, 439, 9), label('FTR', 312, 447, 8), ...check('status-ftt', 338, 439, 9), label('FTT', 351, 447, 8),
    ...check('status-ptr', 299, 461, 9), label('PTR', 312, 469, 8), ...check('status-ptt', 338, 461, 9), label('PTT', 351, 469, 8),
    para(null, 'White – Receiving supervisor\nPink – Losing supervisor\nGreen – Employee’s file\nBuff – Competition file\nWhite – Additional admin. (Use when required)\nBlue – Manpower Planning', 36, 575, 207, 8, 8.5, { locked: true }),
    rule(235, 605, 378, 605), label('Originator (Personnel Department)', 235, 615, 8), value('transfer-originator', 238, 600, 9),
    label('Losing supervisor', 36, 640, 9), value('losing-supervisor', 115, 640, 9), label('Local', 296, 640, 9), value('losing-supervisor-local', 325, 640, 9), rule(36, 644, 378, 644),
    text('form-number', '80431', p(36), p(656), '6pt', { font: 'body', colour: 'ink' })
  ], {
    dimensionStatus: 'scan-derived',
    reconstruction: { pdfPage: 22, printedPage: 21, paper: 'Approx. 5.75 × 9.25 in including snap strip; source says odd-size, no overall dimension printed.', note: 'Dimensions rounded from the scanned paper outline; the generic header inset is used rather than treating scanner offsets as official dimensions.' }
    // Its layout rules, including the scan-derived snap-set strip, are in bc-hydro-guides.mjs.
  })

// The compact example on H23 differs from the spacious generic form header:
// title and signature both occupy its right half. Preserve that arrangement,
// rather than inventing a larger official trim to force a one-inch inset.
const serviceTickRow = (y, from = 6, to = 288) => Array.from({ length: Math.floor((to - from) / 13) }, (_, i) => rule(from + (i + 1) * 13, y - 5, from + (i + 1) * 13, y))
const service = page('form-service-application', 'Form: Application for Service', 576, 360,
  'Editable reconstruction of the compact Application for Service (printed p. 22 / PDF H23). The approximately 8 × 5 in landscape trim and dense grid are measured/rounded from the scan; no total dimensions are stated. The 20 point title and signature share the right half as shown, with compact scan-derived insets rather than the generic 1 in form inset. Historical labels and readable agreement wording are retained; spacing, field entry areas and some minor grid subdivisions are reconstructed. The paper edge is not printed as an outside border.', [
    // Set tight, as H23's title is (59 mm against Termes' 66 mm), for the clear space H19 asks for
    // before the signature; a longer title shrinks rather than run into it.
    text('form-name', 'Application for Service', p(294), round(p(13) + cap(20)), '20pt', { font: 'body', colour: 'ink', tracking: '-1pt', fitWidth: round(p(570) - 29.64 - 5 - p(294)) }),
    { type: 'logo', signature: 'standard', colourway: 'black', points: 20, x: p(570), y: p(13), anchorX: 'end', anchorY: 'cap' },
    rule(288, 0, 288, 360),
    ...[36, 58, 80, 102, 124, 146, 168, 190, 212, 234, 256, 278, 300, 322, 337].map(y => rule(0, y, 288, y)),
    ...[36, 58, 66, 88, 110, 117, 132, 146, 166, 188, 208, 264, 278, 292, 313, 335, 342].map(y => rule(288, y, 576, y)),
    ...[28, 55, 110, 178, 205, 232, 259].map(x => rule(x, 20, x, 36)),
    label('Cycle', 6, 19, 6.5), label('Area', 34, 19, 6.5), label('Ledger', 73, 19, 6.5), label('Folio', 129, 19, 6.5), label('Date issued', 231, 11, 6.5), label('Day     Month    Year', 215, 19, 6.5),
    value('service-cycle', 8, 32, 8), value('service-area', 35, 32, 8), value('service-ledger', 65, 32, 8), value('service-folio', 120, 32, 8), value('service-date-issued', 209, 32, 7),
    label('Name', 6, 43, 7), value('service-customer-name', 6, 54, 8), ...serviceTickRow(58), ...serviceTickRow(80),
    label('Service address – defined', 6, 87, 7), label('Premises number      St.   Dir.', 6, 95, 6.5), label('Street name', 175, 87, 7), value('service-premises-number', 7, 100, 7), value('service-street-name', 110, 99, 8), ...serviceTickRow(102),
    label('St. suffix     Prem. definer', 6, 110, 6.5), label('Postal code', 128, 110, 6.5), value('service-street-suffix', 7, 120, 7), value('service-premises-definer', 50, 120, 7), value('service-defined-postal-code', 130, 120, 8), ...serviceTickRow(124),
    label('Service address – undefined', 6, 132, 7), value('service-undefined-address', 6, 143, 8), ...serviceTickRow(146), label('Postal code', 224, 154, 6.5), value('service-undefined-postal-code', 210, 164, 8), ...serviceTickRow(168),
    label('Town', 6, 176, 7), value('service-town', 6, 187, 8), ...serviceTickRow(190),
    label('Mailing address', 6, 198, 7), value('service-mailing-address', 6, 209, 8), ...serviceTickRow(212), value('service-mailing-address-line-2', 6, 231, 8), ...serviceTickRow(234), label('Postal code', 224, 242, 6.5), value('service-mailing-postal-code', 210, 253, 8), ...serviceTickRow(256),
    ...[55, 110, 164, 219].map(x => rule(x, 256, x, 322)),
    label('Rate', 76, 262, 6.5), label('Number of units', 115, 262, 6), label('Premises code', 169, 262, 6), label('Conn. load – kW', 227, 262, 6),
    label('Electricity', 6, 270, 7), label('Gas', 6, 292, 7), label('Flat rate', 6, 314, 7),
    value('service-electricity-rate', 60, 275, 8), value('service-electricity-units', 115, 275, 8), value('service-electricity-premises-code', 169, 275, 8), value('service-connected-load', 224, 275, 8),
    value('service-gas-rate', 60, 297, 8), value('service-gas-units', 115, 297, 8), label('El. htg.', 170, 286, 6.5), label('Credit type', 224, 286, 6.5), value('service-electric-heat', 169, 297, 8), value('service-credit-type', 224, 297, 8),
    value('service-flat-rate', 60, 319, 8), label('REA number', 124, 308, 6.5), value('service-rea-number', 115, 319, 8), label('Ownership', 187, 308, 6.5), label('Rent     Own', 183, 318, 6.5),
    label('Special minimums – flat rates', 94, 330, 7),
    ...[12, 24, 110, 190, 216].map(x => rule(x, 337, x, 360)),
    label('SV', 1, 343, 6), label('type', 1, 350, 6), label('Min.', 13, 343, 6), label('cde', 13, 350, 6), label('Min. or flat rate amt.', 30, 343, 6), label('Starting date', 130, 343, 6), label('Day   Month   Year', 113, 350, 6), label('Cont.', 193, 343, 6), label('lgth.', 193, 350, 6), label('Type of contract', 222, 343, 6),
    value('service-minimum-amount', 30, 357, 7), value('service-starting-date', 113, 357, 7), value('service-contract-length', 192, 357, 7), value('service-contract-type', 220, 357, 7),
    label('Date service required', 294, 43, 7), value('service-date-required', 294, 54, 8), rule(435, 36, 435, 58), label('ESO number', 441, 45, 6.5), value('service-eso-number', 495, 45, 7), label('GSO number', 441, 54, 6.5), value('service-gso-number', 495, 54, 7),
    label('Install service', 294, 64, 6.5), ...check('service-install-yes', 352, 59, 5), label('Yes', 360, 64, 6), ...check('service-install-no', 387, 59, 5), label('No', 395, 64, 6), label('Meters', 473, 64, 6.5),
    ...[305, 349, 367, 468, 505, 543].map(x => rule(x, 66, x, 88)),
    ...[['Wires', 'service-wires', 290, 6], ['Amps', 'service-amps', 318, 7], ['Phase', 'service-phase', 350, 6], ['Volts', 'service-volts', 408, 7], ['kW·h', 'service-kwh', 478, 7], ['Dem.', 'service-demand', 516, 7], ['Gas', 'service-meter-gas', 553, 7]].flatMap(([name, id, x, size]) => [label(name, x, 72, size), value(id, x, 84, 7)]),
    rule(386, 88, 386, 110), rule(484, 88, 484, 110), label('Customer’s P.O. number', 304, 95, 7), value('service-purchase-order', 294, 106, 8), label('Credit check', 415, 95, 7), value('service-credit-check', 391, 106, 8), label('Credit approval', 512, 95, 7), value('service-credit-approval', 490, 106, 8),
    label('Connection charge', 337, 116, 7), label('Other charges', 493, 116, 7),
    ...[303, 341, 419, 442, 480, 557].map(x => rule(x, 117, x, 146)),
    ...[['Amount', 311], ['Receipt number', 357], ['Bill', 425], ['Amount', 451], ['Receipt number', 497], ['Bill', 561]].map(([s, x]) => label(s, x, 124, 6.5)),
    label('E', 293, 139, 7), label('G', 293, 145, 7),
    value('service-connection-amount', 307, 139, 7), value('service-connection-receipt', 344, 139, 7), value('service-other-amount', 446, 139, 7), value('service-other-receipt', 484, 139, 7),
    label('Former account at', 294, 154, 7), value('service-former-account', 294, 163, 8), rule(430, 166, 430, 188), rule(504, 166, 504, 188), label('Closing date', 446, 173, 7), value('service-closing-date', 435, 184, 8), label('Closing acct. issue', 516, 173, 7), ...check('service-closing-yes', 517, 179, 5), label('Yes', 525, 184, 6), ...check('service-closing-no', 549, 179, 5), label('No', 557, 184, 6),
    label('Reference, or employer’s name and address', 294, 196, 7), value('service-reference', 294, 205, 8),
    para('service-agreement', 'AGREEMENT: The undersigned agrees to take and pay for electricity and/or gas from the British Columbia Hydro and Power Authority in accordance with this application which includes clause(s) ____ on the back hereof and the rates, terms and conditions contained in the Authority’s electric and/or gas tariffs as amended from time to time and available for inspection at any general office of the Authority.', 294, 216, 276, 6.5, 7.3),
    label('Signed', 294, 261, 7), value('service-signed', 322, 261, 8), label('Telephone', 471, 261, 7), value('service-telephone', 518, 261, 7),
    label('Per', 294, 275, 7), value('service-signatory', 314, 275, 8), label('Title', 405, 275, 7), value('service-signatory-title', 428, 275, 8), label('Date', 471, 275, 7), value('service-signature-date', 495, 275, 7),
    ...[303, 341, 419].map(x => rule(x, 292, x, 335)),
    label('Sec', 290, 301, 6), label('Dep', 290, 308, 6), label('Rev', 290, 322, 6), label('Def', 290, 329, 6), label('Amount', 311, 299, 7), label('Receipt number', 356, 299, 7),
    value('service-deposit-amount', 307, 310, 8), value('service-deposit-receipt', 345, 310, 8), value('service-revenue-deferral', 307, 331, 8),
    label('Special instructions on back', 294, 341, 7), ...check('service-instructions-on-back', 416, 336, 5), rule(397, 342, 397, 360),
    label('Issued by', 294, 350, 7), value('service-issued-by', 294, 358, 7), label('Issuing office', 404, 350, 7), value('service-issuing-office', 465, 357, 8)
  ], { dimensionStatus: 'scan-derived', reconstruction: { pdfPage: 23, printedPage: 22, paper: 'Approx. 8 × 5 in, rounded from scanned form outline; not a stated specification.', note: 'The compact header in the source shares the right half, unlike the generous margins of the general form rule. Blank entry areas are editable; minor cell subdivisions and insets are reconstructed.' } })

const formal = page('form-formal-header', 'Form: Formal signature header study', 612, 792,
  'A new demonstration of the explicit Formal-signature exception on printed p. 18 / PDF H19, not an additional historical form. A 20 point form name is ⅜ in from the top; the two-line Formal signature is 14 point with its bottom baseline aligned to the form name, 1 in from the right. ½ point rules and a 6 point form number demonstrate the same general form system.', [
    ...header('Form name', 612, { signature: 'formal', signaturePoints: 14 }),
    label('Reference', 30, 84, 10), value('formal-form-reference', 92, 84), rule(30, 90, 540, 90),
    para('formal-form-body', 'Enter the form text here.', 30, 120, 510, 12, 14),
    label('Authorized signature', 30, 710, 10), value('formal-authorized-signature', 125, 710), rule(30, 716, 355, 716),
    label('Date', 390, 710, 10), value('formal-form-date', 417, 710), rule(390, 716, 540, 716),
    text('form-number', 'Form number', p(30), p(774), '6pt', { font: 'body', colour: 'ink' })
  ], { dimensionStatus: 'source-specified', reconstruction: { pdfPage: 19, printedPage: 18, paper: 'Generic 8.5 × 11 in form.', note: 'New rule demonstration. Source specifies the 14/20pt relationship and baseline alignment, not this body layout.' } })

export const additionalForms = [tender, transfer, service, formal]
export const additionalFormSources = {
  'form-tender': ['H21', 'H19', 'H12'],
  'form-employee-transfer': ['H22', 'H19'],
  'form-service-application': ['H23', 'H19'],
  'form-formal-header': ['H19']
}
