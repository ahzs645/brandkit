// Inspection layers: the manual's construction drawings, as annotations that name what they
// measure (see src/engine/template-guides.js). They are drawn in a margin outside the trim, as
// the manual draws them, and follow the artwork: a dimension to the name's baseline moves with
// the name and goes when the name is cleared. Labels carry the values the manual prints; where a
// value is a reconstruction choice the notes say so instead of drawing it as a rule.
import { pt } from './common.mjs'

const crop = (src, label, note) => ({ src: `reference/${src}.webp`, label, note })
const note = 'Printed dimensions govern the editable layout. The scanned page has small registration and typesetting differences; TeX Gyre Termes substitutes for the original Times Roman.'

const LOGO = 'brand-logo'
const logo = (edge, offset) => ({ element: LOGO, edge, ...(offset ? { offset } : {}) })
const of = (element, edge) => ({ element, edge })
const flow = (id, edge) => ({ flow: id, edge })
const dimension = (axis, from, to, label, side, extra = {}) => ({ type: 'dimension', axis, from, to, label, ...(side ? { side } : {}), ...extra })
const band = (from, to, label, side, extra = {}) => dimension('y', from, to, label, side, { ends: 'none', ...extra })
const callout = (target, label, side, extra = {}) => ({ type: 'callout', target, label, ...(side ? { side } : {}), ...extra })
const align = (axis, refs, extra = {}) => ({ type: 'align', axis, refs, ...extra })
const rule = (label, side) => ({ type: 'note', label, ...(side ? { side } : {}) })

// Signature widths printed on H16–H18: 1½ in for Corporate and Gas, 2⅛ in for Rail.
const signatureWidth = (set) => (set === 'rail' ? '2 1/8"' : '1 1/2"')

// H16–H18: the letterhead's dimensions above it and to its right.
const letterhead = (set) => [
  dimension('x', logo('left'), 'trim.right', '4"'),
  dimension('x', logo('left'), logo('right'), signatureWidth(set)),
  dimension('y', 'trim.top', logo('baseline'), '1"'),
  dimension('y', logo('baseline'), of('address', 'firstBaseline'), '3/16"'),
  callout({ element: 'address' }, '10 on 11 point', 'right'),
  ...(set === 'rail' ? [dimension('x', 'trim.left', of('bce-route-letterhead', 'left'), '3/4"')] : [])
]

// H16–H18: the envelope's left portion, dimensioned from its top-left corner.
const envelope = (set) => [
  dimension('x', 'trim.left', of('form-number', 'left'), '1/4"'),
  dimension('x', 'trim.left', logo('left'), '1/2"'),
  dimension('x', logo('left'), logo('right'), signatureWidth(set)),
  dimension('y', 'trim.top', of('form-number', 'baseline'), '1/4"', 'left'),
  dimension('y', 'trim.top', logo('baseline'), '3/4"', 'left'),
  ...(set === 'standard' ? [] : [dimension('y', logo('baseline'), of('return-address', 'baseline'), '3/16"', 'left')]),
  // H14 prints the sizes: form number 6 point, return statement and return address 10 point.
  callout({ element: 'form-number' }, '6 point', 'top'),
  callout({ element: 'return-statement' }, '10 point', 'top'),
  ...(set === 'standard' ? [] : [callout({ element: 'return-address' }, '10 point', 'bottom', { at: 'left' })])
]

// H16–H18: the card, dimensioned above and to the right, its type sizes beside it.
const card = (set) => [
  dimension('x', logo('left'), 'trim.right', '2 1/2"'),
  dimension('x', logo('left'), logo('right'), signatureWidth(set)),
  dimension('y', 'trim.top', logo('baseline'), '5/8"'),
  dimension('y', 'trim.top', of('name', 'baseline'), '1 1/8"'),
  dimension('y', of('card-details', 'lastBaseline'), 'trim.bottom', '1/4"'),
  callout({ element: LOGO }, 'blind embossed\nsignature', 'right', { at: 'middle' }),
  callout({ element: 'name' }, '12 point', 'right'),
  callout({ element: 'card-details' }, '8 on 9 point', 'right', { at: 'firstBaseline' }),
  // H14: "The right side of the telephone number is aligned below the left side of the symbol."
  ...(set === 'rail'
    ? [dimension('x', of('bce-route-card', 'left'), of('bce-route-card', 'right'), '1"', 'bottom'), dimension('x', of('bce-route-card', 'right'), of('card-details', 'left'), '1/16"', 'bottom')]
    : [align('x', [logo('left'), of('card-telephone', 'right')], { side: 'bottom' })])
]

// H19–H21: name and signature 20 point, both ⅜ in from the top to the cap line; the signature
// 1 in from the right; the form number 6 point at the bottom left.
const formHeader = (template, { formal = false, top = true } = {}) => [
  ...(top ? [dimension('y', 'trim.top', of('form-name', 'cap'), '3/8"', 'left')] : []),
  ...(top && !formal ? [dimension('y', 'trim.top', logo('cap'), '3/8"', 'right')] : []),
  dimension('x', logo('right'), 'trim.right', '1"'),
  callout({ element: 'form-name' }, formal ? '20 point form name' : '20 point Times Regular', 'top'),
  callout({ element: LOGO }, formal ? '14 point Formal signature' : '20 point signature', 'top'),
  callout({ element: 'form-number' }, '6 point form number', 'bottom')
]

const COVERS = { 'cover-report': 25, 'cover-illustrated': 26, 'cover-display': 27 }

// H26–H28: ⅓ across to the B, ¼ down to the signature's cap line, then each element's size and
// the space before it as bands beside the type (left of the narrow display cover, as on H28).
const coverGuides = (template) => {
  const size = template.id === 'cover-display' ? 24 : 36
  const side = template.id === 'cover-display' ? 'left' : 'right'
  const items = template.elements.find((element) => element.type === 'flow').items
  const elements = [
    dimension('x', 'trim.left', logo('logotype'), '1/3 of cover width'),
    dimension('y', 'trim.top', logo('cap'), '1/4 of cover depth', side === 'right' ? 'left' : 'right'),
    band(logo('cap'), logo('baseline'), `${size} point`, side),
    band(logo('baseline'), flow(items[0].id, 'top'), '2 cap-heights', side, { requiresFlow: [items[0].id] }),
    band(flow(items[0].id, 'top'), flow(items[0].id, 'lastBaseline'), `${size} on ${size} point`, side),
    align('x', [logo('logotype'), ...items.map((item) => flow(item.id, 'left'))])
  ]
  for (let index = 1; index < items.length; index++) {
    const current = items[index].id
    // The space before an element is measured from whichever element is above it, so there is a
    // band for each earlier one, drawn only while the elements between them are empty.
    for (let earlier = index - 1; earlier >= 0; earlier--) {
      const previous = items[earlier].id
      const between = items.slice(earlier + 1, index).map((item) => item.id)
      elements.push(band(flow(previous, 'lastBaseline'), flow(current, 'top'), '1 cap-height', side, { requiresFlow: [previous, current], ...(between.length ? { requiresEmptyFlow: between } : {}) }))
    }
    elements.push(band(flow(current, 'top'), flow(current, 'lastBaseline'), `${size / 2} on ${size / 2} point`, side))
  }
  if (template.elements.some((element) => element.id === 'illustration')) elements.push(callout({ element: 'illustration' }, 'illustrative matter collected as a unit', 'bottom', { outline: true }))
  return {
    title: 'Cover proportions and type',
    notes: ['The B of the logotype and all written matter align at one-third of the cover width; the symbol hangs to the left. The signature’s cap line is one-quarter of the cover depth down.', 'Cap-height means the dominant signature/title size, including the space before authorship. Multi-line elements are set solid. The bands follow the edited text, and go with an emptied element.', note],
    elements
  }
}

// H43–H48: where the manual places each signature, in its own words.
const VEHICLE_PLACES = {
  'illustrated-h44-van-side': { 'side-signature': 'upper rear panel' },
  'illustrated-h44-van-rear': { 'rear-signature': 'centred in the upper part\nof the left door, below the window,\nclear of contours and handle' },
  'illustrated-h44-van-door': { 'door-signature': 'front door, below the window,\nclear of contours and mouldings' },
  'illustrated-h45-stepvan-side': { 'side-signature': 'upper rear position' },
  'illustrated-h45-stepvan-rear': { 'rear-signature': 'high in the left-hand position,\nbelow the window of a hinged door' },
  'illustrated-h45-roller-truck-rear': { 'rear-signature': 'near the top of a roll-up door' },
  'illustrated-h46-tractor-trailer': { 'trailer-signature': 'upper rear position of the trailer' },
  'illustrated-h46-cab-door': { 'door-signature': 'on both doors of the cab' },
  'illustrated-h46-flatbed': { 'deck-signature': 'side signatures only,\ntowards the back wheels' },
  'illustrated-h47-crawler-side': { 'seat-signature': 'where it is subject\nto the least wear' },
  'illustrated-h47-crawler-front': { 'front-signature': 'where it is subject\nto the least wear' },
  'illustrated-h47-seat-panel': { 'seat-panel-signature': 'where it is subject\nto the least wear' },
  'illustrated-h47-generator': { 'side-signature': 'a signature on each side', 'safety-caption': 'safety wording (example)' },
  'illustrated-h48-locomotive': { 'cab-rail-signature': 'below the cab windows' },
  'illustrated-h48-boxcar': { 'rail-signature': 'at one end, towards the top' }
}

const signBorder = 'Borders ½ cap-height on all four sides.'
// H38–H41: the sign rules, pointed at the lettering they govern. The traced signs' borders and
// signatures are drawing, not measured parts, so those rules are stated rather than drawn.
const SIGNS = {
  'illustrated-h39-office': { notes: [signBorder], elements: [rule('Border ½ cap-height on all four sides')] },
  'illustrated-h39-gas': { notes: ['As for the Corporate sign, except that the Gas signature needs a full cap-height above the logotype.'], elements: [rule('Border ½ cap-height; a full cap-height above the Gas signature')] },
  'illustrated-h39-freight': { notes: ['The name accompanies the signature in a horizontal format: an x-height between the signature’s baseline and the name’s top line. Borders ½ cap-height (a full cap-height on top for the Gas signature).'], elements: [callout({ lettering: 0 }, 'name an x-height below\nthe signature baseline', 'right', { at: 'cap' }), rule('Border ½ cap-height')] },
  'illustrated-h39-plant': { notes: ['Vertical counterpart: an x-height from the signature’s baseline to the name’s top line; the name’s lines have no extra space between them. Borders ½ cap-height (a full cap-height on top for the Gas signature).'], elements: [callout({ lettering: 0 }, 'name an x-height below\nthe signature baseline', 'right', { at: 'cap' }), callout({ lettering: [0, 2] }, 'no extra space\nbetween lines', 'right', { at: 'middle' }), rule('Border ½ cap-height; a full cap-height on top for the Gas signature')] },
  'illustrated-h40-advisory': { notes: ['Sentence form, initial capital only. Borders ½ cap-height; spacing between lines of copy is x-height.'], elements: [dimension('y', { lettering: 0, edge: 'baseline' }, { lettering: 1, edge: 'cap' }, 'x-height'), callout({ lettering: [0, 2] }, 'sentence form,\ninitial capital only', 'right', { at: 'lastBaseline' }), rule(signBorder)] },
  'illustrated-h40-customer-service': { notes: ['Initial capitals on principal words. The cap-height of subordinate copy equals the x-height of the dominant copy.'], elements: [dimension('y', { lettering: 0, edge: 'baseline' }, { lettering: 1, edge: 'cap' }, 'x-height'), callout({ lettering: 1 }, 'cap-height = x-height\nof the dominant copy', 'right'), rule(signBorder)] },
  'illustrated-h40-shipping': { notes: ['Key information conveyed quickly: ampersand, lower-case “am” and “pm”.'], elements: [dimension('y', { lettering: 0, edge: 'baseline' }, { lettering: 1, edge: 'cap' }, 'x-height'), callout({ lettering: 0 }, 'ampersand', 'right'), callout({ lettering: 1 }, 'lower-case am and pm', 'right'), rule(signBorder)] },
  'illustrated-h40-directional': { notes: ['Directional sign: spacing between lines of copy is a cap-height, and a ruled line divides them.'], elements: [dimension('y', { lettering: 0, edge: 'baseline' }, { lettering: 1, edge: 'cap' }, 'cap-height'), rule('Lines a cap-height apart, divided by a ruled line')] },
  'illustrated-h41-danger': { notes: ['Black lettering on yellow for safety. A signature is included where the identity might not be apparent, or to reinforce the legal implication.'], elements: [callout({ zone: 'identity' }, 'Corporate, Gas or Rail\nsignature as relevant', 'right', { outline: true }), callout({ lettering: [0, 1] }, 'black on yellow', 'right', { at: 'middle' })] },
  'illustrated-h41-authorized-vehicles': { notes: ['A conventional UTCD “do not enter” red symbol on white, with the signature.'], elements: [callout({ zone: 'identity' }, 'signature where identity\nmight not be apparent', 'right', { outline: true }), callout({ lettering: [0, 1] }, 'UTCD convention', 'right', { at: 'middle' })] },
  'illustrated-h41-employees-only': { notes: ['An indoor sign restricting public access: black on white, no signature required.'], elements: [callout({ lettering: 0 }, 'black on white;\nno signature required', 'right', { at: 'middle' })] }
}

export const attachHydroGuides = (brand, art) => {
  for (const template of brand.templates) {
    if (COVERS[template.id]) {
      template.guides = coverGuides(template)
      template.reference = crop({ 'cover-report': 'report-cover-source', 'cover-illustrated': 'cover-illustrated-source', 'cover-display': 'display-cover-source' }[template.id], `Original manual · printed p. ${COVERS[template.id]}`, note)
      template.fidelity = { status: template.id === 'cover-illustrated' ? 'partial-artwork' : 'reconstructed', label: 'Measured cover layout', note: template.id === 'cover-illustrated' ? 'The cover grid and editable text are reconstructed. The tinted illustration area is a placeholder; the original drawing remains visible in the scan overlay.' : 'The published proportions and point sizes are implemented. The lettering uses the kit’s substitute typeface; this is not an original production master.' }
    }
    const set = template.id.split('-').at(-1)
    if (template.id.startsWith('letterhead-')) {
      template.guides = { title: 'Letterhead placement', notes: ['Signature baseline 1 inch from the top; symbol 4 inches from the right edge. Address 10 on 11 point (H14), 3/16 inch below the signature baseline and aligned under the B.', ...(set === 'rail' ? ['The BCE mark is separate from the Rail signature. Its ¾ inch left inset is printed; its 1⅜ inch width and vertical alignment are measured from the scan, so only the inset is dimensioned.'] : [])], elements: letterhead(set) }
      if (set === 'rail') template.reference = crop('rail-letterhead-source', 'Original Rail letterhead · printed p. 17', 'Header-only excerpt registered on a Letter canvas. The envelope and business card below it have been excluded. Shared editable contact values differ from the printed sample.')
    }
    if (template.id.startsWith('envelope-')) {
      template.guides = { title: 'Envelope left-side construction', notes: ['Only the left portion of the envelope is shown in the manual. The No. 10 overall canvas is an adopted format.', 'Form number 6 point; return statement 10 point (H14). Form number ¼ inch in and down; signature ½ inch from the left with its baseline ¾ inch from the top.', ...(set === 'standard' ? [] : ['The preprinted return address is 10 point, 3/16 inch below the signature baseline.'])], elements: envelope(set) }
    }
    if (template.id.startsWith('card-')) {
      template.guides = { title: 'Business-card construction', notes: ['The signature is blind embossed: the grey preview represents relief, not printing ink. Name 12 point; remaining information 8 on 9 point.', 'The last body baseline is ¼ inch from the bottom. The signature’s symbol is 2½ inches from the right edge, so 1 inch from the left (derived, not printed).', ...(set === 'rail' ? ['The separate blue BCE locomotive is 1 inch wide, with 1/16 inch between its right edge and the address. The Rail telephone is in the bottom line.'] : ['The telephone number’s right side is aligned below the left side of the symbol (H14).'])], elements: card(set) }
      if (set === 'rail') template.reference = crop('rail-card-source', 'Original Rail business card · printed p. 17', 'Cropped to the printed card border; nominal size 3½ × 2 inches. The original sample contact details and scan proportions differ slightly.')
    }
    if (['form-bulletin', 'form-tender', 'form-formal-header'].includes(template.id)) {
      const formal = template.id === 'form-formal-header'
      template.guides = {
        title: 'Form header rules',
        notes: ['Form name 20 point, upper and lower case. Ordinary signature 20 point, 1 inch from the right trim; both cap lines ⅜ inch from the top.', 'Formal signature is the two-line exception: 14 point, its lower line aligned with the 20 point form name at the baseline.', 'Ruled lines are ½ point; boxes have square corners; no ruled border round the form. Form number 6 point, bottom left.'],
        elements: [
          ...formHeader(template, { formal }),
          // The Formal signature's metrics give its first line's baseline; its second line sits
          // 110 artwork units lower against an 87.384-unit cap height (see bc-hydro-forms.mjs).
          ...(formal ? [align('y', [of('form-name', 'baseline'), logo('baseline', pt(14) * 0.662 * 110 / 87.384)], { side: 'right', label: 'aligned at the baseline' })] : []),
          ...(template.id === 'form-bulletin' ? [callout({ element: 'division' }, 'department or division name', 'bottom')] : []),
          rule('Ruled lines ½ point; boxes with square corners')
        ]
      }
      if (template.id === 'form-bulletin') template.reference = crop('bulletin-source', 'Original Bulletin form · printed p. 19', note)
    }
    if (template.id === 'form-employee-transfer') {
      template.guides = {
        title: 'Snap-set form header',
        notes: ['Form name and signature keep the standard 20 point size; the signature 1 inch from the right.', 'The snap-set strip is measured from the scan, not printed: it is shown dashed as a reconstruction, not a rule.'],
        elements: [dimension('y', 'trim.top', { at: pt(42) }, 'snap-set strip\n(from the scan)', 'left', { ends: 'tick' }), ...formHeader(template, { top: false })]
      }
    }
    if (template.id.startsWith('cover-back')) {
      template.guides = { title: 'Back-cover rule', notes: ['No signature and no printer name appear on the back cover. The printing code is 6 point at bottom right.', 'This example uses a ½ inch inset; the manual does not specify the inset, so it is not dimensioned.'], elements: [callout({ element: 'printing-code' }, '6 point printing code', 'bottom', { at: 'right' }), rule('No signature on the back cover; no printer’s name', 'top')] }
    }
    if (template.id.startsWith('spine-')) {
      const broad = template.id === 'spine-broad'
      template.guides = {
        title: 'Spine reading direction',
        notes: ['Read left to right when the publication lies on its back. The signature precedes the title.', broad ? 'On a broad spine the signature and title are on separate lines at the cover’s 36 point size, the title starting under the B.' : 'On a narrow spine both share a line, the size reduced to fit; this specimen uses 24 point.'],
        elements: broad
          ? [callout({ element: LOGO }, '36 point signature', 'top', { at: 'logotype' }), callout({ element: 'spine-title' }, '36 point title', 'bottom', { at: 'left' }), align('x', [logo('logotype'), of('spine-title', 'left')]), rule('Reads left to right with the publication on its back →', 'bottom')]
          : [callout({ element: LOGO }, 'signature first', 'top'), callout({ element: 'spine-title' }, 'title on the same line,\nsize reduced to fit', 'bottom'), rule('Reads left to right with the publication on its back →', 'bottom')]
      }
    }
    if (template.id === 'display-panel') {
      template.guides = {
        title: 'Portable display clearance',
        notes: ['At least half a cap-height of border on all four sides of the complete signature, measured from its visible extent (H35).', 'This flat panel is not a three-dimensional fabrication master. The manual calls for official large-scale drawings for fabrication.'],
        elements: [
          dimension('x', 'trim.left', logo('left'), '1/2 cap-height'), dimension('x', logo('right'), 'trim.right', '1/2 cap-height'),
          dimension('y', 'trim.top', logo('top'), '1/2 cap-height'), dimension('y', logo('bottom'), 'trim.bottom', '1/2 cap-height')
        ]
      }
    }
    if (template.id.startsWith('illustrated-')) {
      const placed = template.elements.find((element) => element.type === 'illustration')
      const drawing = brand.illustrations[placed.illustration]
      const vehicle = template.group.includes('Vehicles')
      if (vehicle) {
        const places = VEHICLE_PLACES[template.id] ?? {}
        template.guides = {
          title: 'Signature positions',
          notes: ['Outlined regions are the reconstructed drawing’s identity zones, measured from the example, not official fabrication dimensions. Their labels quote the manual’s placement rules.', 'Vehicle signatures use black on 0–30% background value and white on 31–100%; no corporate-colour vehicle signatures (H43).'],
          elements: drawing.zones.map((zone) => callout({ zone: zone.id }, places[zone.id] ?? zone.label, undefined, { outline: true }))
        }
      } else {
        const sign = SIGNS[template.id]
        if (!sign) throw new Error(`No layout rules for ${template.id}`)
        template.guides = { title: 'Sign rules', notes: [...sign.notes, 'The sign is a traced reconstruction of the manual example; its proportions are measured from the scan.'], elements: sign.elements }
      }
      template.fidelity = { status: 'drawing-reconstruction', label: 'Source-based vector drawing', note: 'The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.' }
    }
  }
  return brand
}
