// Inspection layers are authored separately from printable content. Flow anchors follow edits.
import { inch, pt, round } from './common.mjs'

const GUIDE = '#9A2455'
const cap = (size) => 0.662 * pt(size)
const rule = (x1, y1, x2, y2, extra = {}) => ({ type: 'line', x1, y1, x2, y2, stroke: GUIDE, strokeWidth: 0.18, ...extra })
const label = (text, x, y, extra = {}) => ({ type: 'text', text, x, y, size: '8pt', font: 'italic', colour: GUIDE, ...extra })
const tick = (x, y) => rule(x, y - 1, x, y + 1)
const hMeasure = (x1, x2, y, text) => [rule(x1, y, x2, y), tick(x1, y), tick(x2, y), label(text, (x1 + x2) / 2, y - 1.5, { anchor: 'middle' })]
const flow = (id, edge, offset = 0) => ({ flow: id, edge, offset })
const crop = (src, label, note) => ({ src: `reference/${src}.webp`, label, note })
const note = 'Printed dimensions govern the editable layout. The scanned page has small registration and typesetting differences; TeX Gyre Termes substitutes for the original Times Roman.'

const coverGuides = (template) => {
  const size = template.id === 'cover-display' ? 24 : 36
  const x = template.width / 3
  const y = template.height / 4
  const c = cap(size)
  const edge = template.width - 3
  // Keep the annotations on a slim right-hand track, as in the report-cover example.
  const track = template.width - (template.id === 'cover-display' ? 6 : 12)
  const items = template.elements.find((element) => element.type === 'flow').items
  const elements = [
    ...hMeasure(2, x, y * 0.45, '1/3 of cover width'),
    rule(x, 3, x, y), rule(x - 1, y, x + 1, y),
    label('1/4 of cover depth', x + 2, y * 0.26),
    rule(track - 16, y, edge, y), rule(track - 16, y + c, edge, y + c),
    label(`${size} point signature`, edge, y - 2, { anchor: 'end' }),
    label('2 cap-heights', edge, flow('cover-title', 'top', -c / 2), { anchor: 'end' }),
    rule(track - 16, flow('cover-title', 'top'), edge, flow('cover-title', 'top')),
    rule(track - 16, flow('cover-title', 'lastBaseline'), edge, flow('cover-title', 'lastBaseline')),
    label(`${size} on ${size} point`, edge, flow('cover-title', 'firstBaseline', 3.5), { anchor: 'end' })
  ]
  for (let index = 1; index < items.length; index++) {
    const previous = items[index - 1].id
    const current = items[index].id
    elements.push(
      label('1 cap-height', edge, flow(current, 'top', -2), { anchor: 'end', requiresFlow: [previous, current] }),
      rule(track - 16, flow(current, 'top'), edge, flow(current, 'top')),
      rule(track - 16, flow(current, 'lastBaseline'), edge, flow(current, 'lastBaseline')),
      label(`${size / 2} on ${size / 2} point`, edge, flow(current, 'firstBaseline', 2), { anchor: 'end' })
    )
  }
  return { title: 'Cover proportions and type', notes: ['B of the logotype and all written matter align at one-third of the cover width. The symbol hangs to the left.', 'Cap-height means the dominant signature/title size, including the gap before authorship. Multi-line text is set solid. Rules follow the edited text.', note], elements }
}

export const attachHydroGuides = (brand, art) => {
  for (const template of brand.templates) {
    if (['cover-report', 'cover-illustrated', 'cover-display'].includes(template.id)) {
      template.guides = coverGuides(template)
      template.reference = crop({ 'cover-report': 'report-cover-source', 'cover-illustrated': 'cover-illustrated-source', 'cover-display': 'display-cover-source' }[template.id], `Original manual · printed p. ${{ 'cover-report': 25, 'cover-illustrated': 26, 'cover-display': 27 }[template.id]}`, note)
      template.fidelity = { status: template.id === 'cover-illustrated' ? 'partial-artwork' : 'reconstructed', label: 'Measured cover layout', note: template.id === 'cover-illustrated' ? 'The cover grid and editable text are reconstructed. The tinted illustration area is a placeholder; the original drawing remains visible in the scan overlay.' : 'The published proportions and point sizes are implemented. The lettering uses the kit’s substitute typeface; this is not an original production master.' }
    }
    if (template.id.startsWith('letterhead-')) {
      const logo = template.elements.find((element) => element.type === 'logo')
      template.guides = { title: 'Letterhead placement', notes: ['Signature baseline 1 inch from top; symbol 4 inches from right edge. Address 10 on 11 point, 3/16 inch below the signature baseline and aligned under the B.', ...(template.id === 'letterhead-rail' ? ['The BCE mark is separate from the Rail signature. Its ¾ inch left inset is specified; its 1⅜ inch width and vertical alignment are measured from the scan.'] : [])], elements: [
        ...hMeasure(logo.x, template.width, 8, '4 in to right edge'),
        rule(logo.x - 3, 0, logo.x - 3, inch(1)), label('1 in to baseline', logo.x - 5, inch(0.6), { anchor: 'end' }),
        rule(logo.x, inch(1), template.width - 5, inch(1)),
        rule(logo.x, inch(1 + 3 / 16), template.width - 5, inch(1 + 3 / 16)),
        label('3/16 in · 10 on 11 point', template.width - 5, inch(1 + 3 / 16) + 12, { anchor: 'end' })
      ] }
      if (template.id === 'letterhead-rail') {
        template.guides.elements.push(...hMeasure(0, inch(0.75), 8, '3/4 in'))
        template.reference = crop('rail-letterhead-source', 'Original Rail letterhead · printed p. 17', 'Header-only excerpt registered on a Letter canvas. The envelope and business card below it have been excluded. Shared editable contact values differ from the printed sample.')
      }
    }
    if (template.id.startsWith('envelope-')) {
      template.guides = { title: 'Envelope left-side construction', notes: ['Only the left portion of the envelope is shown in the manual. The No. 10 overall canvas is an adopted format.', 'Form number 6 point; return instruction 10 point; signature starts ½ inch from the left with its baseline ¾ inch from the top.'], elements: [
        ...hMeasure(0, inch(0.5), inch(1.3), '1/2 in'),
        rule(inch(0.5), 0, inch(0.5), inch(0.75)), label('3/4 in to signature baseline', inch(2.3), inch(0.75) + 2),
        rule(inch(0.5), inch(0.75), inch(2.2), inch(0.75)), label('6 point form number', inch(0.25), inch(0.5)),
        label('10 point return instruction', inch(1), inch(0.12))
      ] }
    }
    if (template.id.startsWith('card-')) {
      const logo = template.elements.find((element) => element.type === 'logo')
      template.guides = { title: 'Business-card construction', notes: ['The signature is blind embossed: the grey preview represents relief, not printing ink. Name 12 point; remaining information 8 on 9 point.', 'The last body baseline is ¼ inch from the bottom. Corporate/Gas telephone ends at the left edge of the symbol.', ...(template.id === 'card-rail' ? ['The separate blue BCE locomotive is 1 inch wide, with 1/16 inch between its right edge and the address.'] : [])], elements: [
        ...hMeasure(0, logo.x, 3, '1 in'),
        rule(logo.x, 0, logo.x, inch(0.625)), label('5/8 in · embossed', template.width - 2, 5.5, { anchor: 'end' }),
        rule(template.width - 2, inch(1.75), template.width - 2, template.height), label('1/4 in', template.width - 3, template.height - 1, { anchor: 'end' }),
        label('12 point name', template.width - 2, inch(1.125) - 5, { anchor: 'end' }),
        label('8 on 9 point', 1.5, inch(1.28))
      ] }
      if (template.id === 'card-rail') {
        const emblem = template.elements.find((element) => element.illustration === 'bce-route-card')
        if (emblem) template.guides.elements.push(...hMeasure(emblem.x, emblem.x + emblem.width, template.height - 1.6, '1 in · BCE mark'))
        template.reference = crop('rail-card-source', 'Original Rail business card · printed p. 17', 'Cropped to the printed card border; nominal size 3½ × 2 inches. The original sample contact details and scan proportions differ slightly.')
      }
    }
    if (template.id === 'form-bulletin' || template.id === 'form-tender' || template.id === 'form-formal-header') {
      template.guides = { title: 'Form header rules', notes: ['Form name 20 point, upper and lower case. Ordinary signature 20 point, 1 inch from the right trim; cap line ⅜ inch from the top.', 'Formal signature is the two-line exception: 14 point, aligned with the 20 point form name at the baseline. Rules are ½ point, boxes have square corners; form number 6 point bottom left.'], elements: [
        rule(3, inch(0.375), template.width - 3, inch(0.375)), label('3/8 in to cap line · 20 point name', inch(0.5), inch(0.375) - 2),
        ...hMeasure(template.width - inch(1), template.width, inch(0.9), '1 in'),
        label('1/2 point rules', template.width - 5, template.height / 2, { anchor: 'end' }),
        label('6 point form number', inch(0.5), template.height - inch(0.5))
      ] }
      if (template.id === 'form-bulletin') template.reference = crop('bulletin-source', 'Original Bulletin form · printed p. 19', note)
    }
    if (template.id.startsWith('cover-back')) {
      template.guides = { title: 'Back-cover rule', notes: ['No signature and no printer name appear on the back cover. The printing code is 6 point at bottom right.', 'This example uses a ½ inch inset; the manual does not specify the inset.'], elements: [label('No signature on the back', template.width / 2, template.height / 2, { anchor: 'middle', size: '12pt' }), label('6 point printing code', template.width - inch(0.5), template.height - inch(0.7), { anchor: 'end' })] }
    }
    if (template.id.startsWith('spine-')) {
      template.guides = { title: 'Spine reading direction', notes: ['Read left to right when the publication lies on its back. The signature precedes the title.', template.id === 'spine-broad' ? 'On a broad spine the signature/title use the cover’s 36 point size and the title starts under the B.' : 'On a narrow spine both share a line. Reduce the size to fit; this specimen uses 24 point.'], elements: [rule(5, template.height - 3, template.width - 5, template.height - 3, { stroke: '#E8A7C3' }), label('Read left to right with publication on its back', template.width / 2, template.height - 4.5, { anchor: 'middle', colour: '#E8A7C3' })] }
    }
    if (template.id === 'display-panel') {
      const c = cap(96)
      template.guides = { title: 'Portable display clearance', notes: ['At least half a cap-height on all four sides of the complete signature, measured from its visible extent.', 'This flat panel is not a three-dimensional fabrication master. The manual calls for official large-scale drawings for fabrication.'], elements: [
        { type: 'rect', x: c / 2, y: c / 2, width: template.width - c, height: template.height - c, fill: 'none', stroke: GUIDE, strokeWidth: 0.18, dash: '1 1' },
        ...hMeasure(0, c / 2, template.height / 2, '1/2 cap'), label('1/2 cap-height border', template.width / 2, template.height - 2, { anchor: 'middle' })
      ] }
    }
    if (template.id.startsWith('illustrated-')) {
      const placed = template.elements.find((element) => element.type === 'illustration')
      const drawing = brand.illustrations[placed.illustration]
      const [vx, vy, vw, vh] = drawing.viewBox
      const scale = Math.min(placed.width / vw, placed.height / vh)
      const dx = placed.x + (placed.width - vw * scale) / 2
      const dy = placed.y + (placed.height - vh * scale) / 2
      template.guides = { title: 'Registered drawing zones', notes: ['Outlined regions identify the reconstructed drawing’s identity and lettering zones. Their positions are measured from the example, not official fabrication dimensions.', ...(template.group.includes('Vehicles') ? ['Vehicle signatures use black on 0–30% background value and white on 31–100%; no corporate-colour vehicle signatures.'] : ['Use the sign-specific rules for type, borders and contrast.'])], elements: drawing.zones.flatMap((zone) => {
        const [x, y, w, h] = zone.box
        return [{ type: 'rect', x: dx + (x - vx) * scale, y: dy + (y - vy) * scale, width: w * scale, height: h * scale, fill: 'none', stroke: GUIDE, strokeWidth: 2, dash: '8 5' }, { type: 'text', text: zone.label, x: dx + (x - vx) * scale, y: dy + (y - vy) * scale - 8, size: 22, font: 'italic', colour: GUIDE }]
      }) }
      // An identity-only sign can have no replacement zones; still offer its border for review.
      if (!template.guides.elements.length) template.guides.elements.push({ type: 'rect', x: 2, y: 2, width: template.width - 4, height: template.height - 4, fill: 'none', stroke: GUIDE, strokeWidth: 2, dash: '8 5' })
      template.fidelity = { status: 'drawing-reconstruction', label: 'Source-based vector drawing', note: 'The vehicle/equipment/sign illustration is a reconstruction of the manual example. Dimensions and shape details are not certified manufacturing specifications.' }
    }
  }
  return brand
}
