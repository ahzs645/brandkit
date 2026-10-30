// Applications absent from the original kit. Printed page numbers are PDF page minus one.
// Dimensions not specified in the manual are explicitly identified as reconstruction choices.
import { inch, pt, round, text, locked, line } from './common.mjs'

const CAP = 0.662
const cap = (points) => CAP * pt(points)
const paper = { type: 'background', fill: 'paper' }
const para = (id, value, x, y, width, size = 11, leading = 13, extra = {}) => ({ type: 'paragraph', id, text: value, x, y, width, size: `${size}pt`, leading: pt(leading), font: 'body', colour: 'ink', ...extra })
const reconstruction = (note) => ({ status: 'reconstructed', label: 'Rule-based reconstruction', note })

export const additionalPublications = (art) => {
  const standard = art.signatures.standard
  const widthAt = (size) => (standard.bounds[2] - standard.bounds[0]) * pt(size) * CAP / standard.metrics.capHeight
  const logotypeOffset = (size) => standard.metrics.logotypeX * pt(size) * CAP / standard.metrics.capHeight
  const back = (id, width, height, physical) => ({
    id, label: `Back cover, ${physical.join(' × ')}`, group: 'Publications', unit: 'mm', width, height, physical, raster: 1400,
    title: 'B.C.Hydro / publication back cover',
    description: 'Graphic Standards Manual p. 24: the back cover carries no signature. Only the printing code appears at the bottom right, in 6 point; no printer name. The ½ inch inset here is a reconstruction choice, not a specified margin.',
    fidelity: reconstruction('The absence of a signature and the 6 point printing code are prescribed. The bottom/right inset is a practical choice.'),
    elements: [paper, text('printing-code', '83-12 · 1000', width - inch(0.5), height - inch(0.5), '6pt', { anchor: 'end', font: 'body', colour: 'ink' })]
  })

  // H29's binder: corporate blue with the signature and title reversed white, set tight. On a
  // broad spine the title's baseline is 2 cap-heights under the signature's and the pair is
  // centred across the spine (from the signature's cap line to the title's baseline); on a narrow
  // one the title follows a cap-height after the signature.
  const spine = (narrow) => {
    const size = narrow ? 24 : 36
    const width = inch(11)
    const height = inch(narrow ? 0.75 : 2)
    const start = inch(11) / 4
    const base = narrow ? (height + cap(size)) / 2 : (height - 3 * cap(size)) / 2 + cap(size)
    return {
      id: `spine-${narrow ? 'narrow' : 'broad'}`, label: `${narrow ? 'Narrow' : 'Broad'} publication spine`, group: 'Publications', unit: 'mm', width, height,
      physical: ['11in', narrow ? '0.75in' : '2in'], raster: 1800,
      title: `B.C.Hydro / ${narrow ? 'narrow' : 'broad'} spine, laid on its back`,
      description: `Graphic Standards Manual p. 28: read left to right with the publication lying on its back. Signature precedes title; ${narrow ? 'both occupy one line, with a reduced typesize to fit' : 'signature and title occupy separate lines, at the cover’s 36 point size; title aligns under the B'}. This is a flat spine strip; its ${narrow ? '¾ inch' : '2 inch'} thickness is an example, not a prescribed binder size.`,
      fidelity: reconstruction('The reading direction and signature/title relationship follow the manual. Spine thickness and the narrow-spine 24 point size are example settings. Confirm the actual binding before printing.'),
      elements: [
        { type: 'background', fill: 'primary' },
        { type: 'logo', signature: 'standard', colourway: 'white', points: size, x: start, y: base, anchorY: 'baseline' },
        text('spine-title', 'Training in Basic Supervision', narrow ? start + widthAt(size) + cap(size) : start + logotypeOffset(size), narrow ? base : base + 2 * cap(size), `${size}pt`, { font: 'body', colour: 'reverse', tracking: `${-0.04 * size}pt`, fitWidth: round(width - (narrow ? start + widthAt(size) + cap(size) : start + logotypeOffset(size)) - inch(0.5)) })
      ]
    }
  }

  // H34 Example 2, measured at full size: 3.34 × 5.5 in between the outer edges of 1 mm (2.9
  // point) rules; a 73 mm measure 5.6 mm in; a 30 point headline on 31 point, set tight; 11 on
  // 11½ point copy with 18 point italic date subheads; the signature 1.76 in wide, flush left
  // with the copy, its baseline 5.8 mm above the foot.
  const singleColumn = () => {
    const width = inch(3.34)
    const height = inch(5.5)
    const left = 5.6
    const measure = 73
    // Line limits keep the longest copy clear of the signature: 3 lines of introduction, a line
    // for each subhead and 6 for each paragraph, as in the example.
    const body = (id, value, gap, maxLines = 6) => ({ id, text: value, size: '11pt', leading: pt(11.5), gap, wrap: measure, maxLines })
    const subhead = (id, value) => ({ id, text: value, size: '18pt', font: 'italic', leading: pt(18), gap: 8.3, wrap: measure, maxLines: 1 })
    return {
      id: 'advert-single-column', label: 'Advertisement, single column', group: 'Advertising', unit: 'mm', width, height, physical: ['3.34in', '5.5in'], raster: 800,
      title: 'B.C.Hydro / single-column advertisement',
      description: 'Graphic Standards Manual p. 33, Example 2: a single-column advertisement between heavy rules: the headline in upper and lower case, the copy with italic subheads (the manual’s choice for emphasis), and the positive signature flush left as the final element.',
      fidelity: reconstruction('Format, type sizes and positions are measured from the full-size example. The copy is sample wording in the example’s structure, not a production advertisement.'),
      elements: [paper,
        line(0, pt(1.45), width, pt(1.45), '2.9pt'),
        {
          type: 'flow', x: left, y: 15.3, font: 'body', colour: 'ink',
          items: [
            { id: 'single-ad-headline', text: 'Brief power\ninterruptions in\nthe Hope area', size: '30pt', leading: pt(31), tracking: '-1.5pt', wrap: measure, maxLines: 4 },
            body('single-ad-intro', 'Power will be off for short periods in parts of the Hope area while crews replace equipment on the lines that serve it.', 9.5, 3),
            subhead('single-ad-subhead-1', 'Tuesday, August 16'),
            body('single-ad-copy-1', 'Between 9 am and noon, power to [streets affected] will be interrupted for up to fifteen minutes at a time. Please switch off sensitive equipment before the work begins. Replace this sample wording with the notice’s own details before use.', 5.3),
            subhead('single-ad-subhead-2', 'Saturday, August 20'),
            body('single-ad-copy-2', 'Between 1 pm and 4 pm, power to [streets affected] will be interrupted for short periods while the work is completed. If the work is postponed, the new date will be announced here. For information, call [telephone].', 5.3)
          ]
        },
        { type: 'logo', signature: 'standard', colourway: 'black', x: left, y: round(height - 5.8), width: inch(1.76), anchorY: 'baseline' },
        line(0, height - pt(1.45), width, height - pt(1.45), '2.9pt')
      ]
    }
  }

  return [
    back('cover-back', 215.9, 279.4, ['8.5in', '11in']),
    back('cover-back-display', 101.6, 228.6, ['4in', '9in']),
    spine(false), spine(true),
    {
      id: 'publication-text', label: 'Publication text page', group: 'Publications', unit: 'mm', width: 215.9, height: 279.4, physical: ['8.5in', '11in'], raster: 1700,
      title: 'B.C.Hydro / publication contents layout',
      description: 'Graphic Standards Manual pp. 11 and 30: consistent text size, column widths and spacing; compact groups of paragraphs and headings; generous outer margins. This editable two-column page applies those principles. The manual does not prescribe this particular text-page grid or a table-of-contents design.',
      fidelity: reconstruction('A new usable text-page example based on the written principles, not a facsimile of a historical publication. Body 11 on 13 point; two columns approximately 45–55 characters wide.'),
      elements: [paper,
        text('publication-heading', 'Planning for the electrical system', inch(0.75), inch(0.9), '24pt', { font: 'body', colour: 'ink' }),
        para('publication-intro', 'A consistent page layout makes long reports easier to read. Use a clear hierarchy of headings and group related text and graphics together.', inch(0.75), inch(1.3), inch(7), 12, 14),
        para('publication-column-1', 'The purpose of this report\n\nDescribe the question, the evidence and the proposed action. Keep the type size and line spacing consistent across the publication.\n\nOrganizing information\n\nUse upper and lower case. Set body copy in Times Roman at 10 to 12 point. Use italic for emphasis and reserve bold for occasional distinctions.\n\nPlace related paragraphs together. Use the surrounding margins to give the page room instead of separating every small element.', inch(0.75), inch(2.15), inch(3.3), 11, 13),
        para('publication-column-2', 'Charts and illustrations\n\nInclude a graphic when it communicates relevant information. Keep line weights and rendering styles consistent.\n\nColour and contrast\n\nUse black text on a light ground. Limit coloured type to a few larger headings where it improves understanding.\n\nSource and interpretation\n\nState the source, unit and period next to each table or graphic. Give the reader enough context to interpret the evidence.', inch(4.45), inch(2.15), inch(3.3), 11, 13),
        text('publication-page', '2', inch(7.75), inch(10.35), '10pt', { anchor: 'end', font: 'body', colour: 'ink' })
      ]
    },
    {
      id: 'display-panel', label: 'Portable display panel', group: 'Display', unit: 'mm', width: round(widthAt(96) + cap(96)), height: round((standard.bounds[3] - standard.bounds[1]) * pt(96) * CAP / standard.metrics.capHeight + cap(96)), raster: 1700,
      title: 'B.C.Hydro / portable display identification',
      description: 'Graphic Standards Manual p. 35: a portable panel has at least ½ logotype cap-height of clear border on all four sides of the complete signature. This is the two-dimensional panel application; it is not a fabrication drawing for a three-dimensional sign.',
      fidelity: reconstruction('The half-cap border is measured from the visible complete signature, including the ring and descenders. Overall panel size is an example. Three-dimensional work still requires the official large-scale drawings.'),
      elements: [paper, { type: 'logo', signature: 'standard', colourway: 'corporate', points: 96, x: cap(96) / 2, y: cap(96) / 2 }]
    },
    singleColumn()
  ]
}

export const additionalPublicationSources = {
  'cover-back': ['H25'], 'cover-back-display': ['H25'],
  'spine-broad': ['H29', 'H25'], 'spine-narrow': ['H29', 'H25'],
  'publication-text': ['H31', 'H12', 'H24'],
  'display-panel': ['H36', 'H32'],
  'advert-single-column': ['H34', 'H32']
}
