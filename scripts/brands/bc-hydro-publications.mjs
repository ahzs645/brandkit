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

  const spine = (narrow) => {
    const size = narrow ? 24 : 36
    const width = inch(11)
    const height = inch(narrow ? 0.75 : 2)
    const start = inch(11) / 4
    const base = narrow ? (height + cap(size)) / 2 : inch(0.35) + cap(size)
    return {
      id: `spine-${narrow ? 'narrow' : 'broad'}`, label: `${narrow ? 'Narrow' : 'Broad'} publication spine`, group: 'Publications', unit: 'mm', width, height,
      physical: ['11in', narrow ? '0.75in' : '2in'], raster: 1800,
      title: `B.C.Hydro / ${narrow ? 'narrow' : 'broad'} spine, laid on its back`,
      description: `Graphic Standards Manual p. 28: read left to right with the publication lying on its back. Signature precedes title; ${narrow ? 'both occupy one line, with a reduced typesize to fit' : 'signature and title occupy separate lines, at the cover’s 36 point size; title aligns under the B'}. This is a flat spine strip; its ${narrow ? '¾ inch' : '2 inch'} thickness is an example, not a prescribed binder size.`,
      fidelity: reconstruction('The reading direction and signature/title relationship follow the manual. Spine thickness and the narrow-spine 24 point size are example settings. Confirm the actual binding before printing.'),
      elements: [
        { type: 'background', fill: 'ink' },
        { type: 'logo', signature: 'standard', colourway: 'white', points: size, x: start, y: base, anchorY: 'baseline' },
        text('spine-title', 'Training in Basic Supervision', narrow ? start + widthAt(size) + inch(0.18) : start + logotypeOffset(size), narrow ? base : base + cap(size) + pt(size), `${size}pt`, { font: 'body', colour: 'reverse' })
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
    {
      id: 'advert-single-column', label: 'Advertisement, single column', group: 'Advertising', unit: 'mm', width: inch(2.15), height: inch(6), physical: ['2.15in', '6in'], raster: 800,
      title: 'B.C.Hydro / single-column advertisement',
      description: 'Graphic Standards Manual p. 33: a single-column advertisement with rules, a headline in upper and lower case, body copy and the positive signature as the final element. The example canvas and copy are reconstructed; the source does not specify a universal column width.',
      fidelity: reconstruction('Applies the single-column example’s hierarchy and signature placement. The original copy and newspaper column dimensions are not production specifications.'),
      elements: [paper,
        line(0, pt(0.6), inch(2.15), pt(0.6), '1.2pt'),
        para('single-ad-headline', 'Overhead lines\nand your safety', inch(0.08), inch(0.3), inch(1.99), 18, 19),
        para('single-ad-copy', 'Before starting work near overhead electrical lines, find out what precautions are required.\n\nPlan the work so that people, vehicles and equipment remain clear. Contact B.C.Hydro for information before beginning.\n\nThis specimen demonstrates the historic advertising layout. Replace this sample wording with reviewed, applicable copy before use.', inch(0.08), inch(1.15), inch(1.99), 10, 12),
        { type: 'logo', signature: 'standard', colourway: 'black', x: inch(0.25), y: inch(5.65), width: inch(1.65), anchorY: 'baseline' },
        line(0, inch(6) - pt(0.6), inch(2.15), inch(6) - pt(0.6), '1.2pt')
      ]
    }
  ]
}

export const additionalPublicationSources = {
  'cover-back': ['H25'], 'cover-back-display': ['H25'],
  'spine-broad': ['H29', 'H25'], 'spine-narrow': ['H29', 'H25'],
  'publication-text': ['H31', 'H12', 'H24'],
  'display-panel': ['H36', 'H32'],
  'advert-single-column': ['H34', 'H32']
}
