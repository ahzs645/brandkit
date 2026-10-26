// Local UNBC document applications. Dimensions and text hierarchy below are kit defaults; the
// type follows www.unbc.ca: Helvetica Black titles (gold on covers, over a 6 px warm rule), small
// bold capitals for eyebrows, and teal for web addresses.

const MM_PER_PT = 25.4 / 72
const pt = value => value * MM_PER_PT
const bg = (fill = 'white') => ({ type: 'background', fill })
const text = (id, value, x, y, points = 10.5, colour = 'ink', extra = {}) => ({ type: 'text', id, text: value, x, y, size: pt(points), font: 'body', colour, ...extra })
const para = (id, value, x, y, width, points = 10.5, extra = {}) => ({ type: 'paragraph', id, text: value, x, y, width, size: pt(points), leading: pt(points * 1.4), font: 'body', colour: 'ink', ...extra })
const logo = (x, y, width = 55, colourway = 'green') => ({ type: 'logo', x, y, width, signature: 'official', colourway })
// A cover's eyebrow, as unbc.ca sets one: small bold capitals, tracked, in the muted grey.
const eyebrow = (value, x, y, points = 9) => text(null, value, x, y, points, 'muted', { font: 'bold', caps: true, tracking: pt(points * 0.08) })
const rule = (x1, x2, y, colour = 'line', strokeWidth = .25) => ({ type: 'line', x1, x2, y1: y, y2: y, stroke: colour, strokeWidth })
const affiliation = (x, y, width, { departmentPt = 12, subdepartmentPt = 10.5, colour = 'ink' } = {}) => ({
  type: 'flow', x, y, items: [
    { id: 'department', text: '', label: 'Department or academic unit', size: pt(departmentPt), leading: pt(departmentPt * 1.3), font: 'bold', colour, wrap: width },
    { id: 'subdepartment', text: '', label: 'Subdepartment or team', size: pt(subdepartmentPt), leading: pt(subdepartmentPt * 1.3), gap: pt(subdepartmentPt * 1.3 + 3), font: 'body', colour, wrap: width }
  ]
})
const footer = (width, height) => [
  rule(20, width - 20, height - 22),
  text('document-reference', '[Reference or version]', 20, height - 15, 8, 'muted'),
  text(null, 'University of Northern British Columbia', width - 20, height - 15, 8, 'muted', { anchor: 'end' })
]
const paper = { letter: { width: 215.9, height: 279.4, label: 'Letter' }, a4: { width: 210, height: 297, label: 'A4' } }
const sourceNote = 'Local document layout using the official UNBC logo and identity rules. Department and subdepartment fields are ordinary text, separate from the logo. Replace bracketed instructional content before use.'

export const unbcTemplates = () => {
  const templates = []
  const sets = []
  const documents = []
  for (const [id, spec] of Object.entries(paper)) {
    const { width: w, height: h, label } = spec
    const base = { width: w, height: h, unit: 'mm', physical: [`${w}mm`, `${h}mm`], raster: 1700, group: 'Documents', extension: 'unbc-document-applications', description: sourceNote }
    const add = (kind, name, elements, extra = {}) => templates.push({ id: `${kind}-${id}`, label: `${name} / ${label}`, title: `{name} / ${name} / ${label}`, ...base, elements, ...extra })
    const header = [bg(), logo(20, 18), affiliation(20, 35, w - 40), rule(20, w - 20, 82)]
    const compactHeader = [bg(), logo(20, 18), affiliation(20, 35, w - 40, { departmentPt: 10.5, subdepartmentPt: 9 }), rule(20, w - 20, 71)]
    add('letterhead', 'Letterhead', [...header,
      text('letter-date', '[Date]', 20, 93),
      para('recipient', '[Recipient]\n[Address]', 20, 106, w - 40, 10.5, { maxLines: 3 }),
      para('letter-subject', '[Subject]', 20, 130, w - 40, 16, { font: 'bold', maxLines: 2 }),
      para('letter-body', '[Explain the purpose of the letter, the supporting information and the action requested.]', 20, 150, w - 40, 10.5, { maxLines: 13 }),
      text('author', '[Name]', 20, h - 48), text('author-role', '[Role]', 20, h - 41, 10.5, 'muted'), ...footer(w, h)
    ])
    add('continuation', 'Continuation sheet', [...compactHeader,
      para('continued-heading', '[Section heading]', 20, 84, w - 40, 18, { font: 'display', maxLines: 2 }),
      para('continued-content', '[Continue the document here. Word output keeps this text editable and allows it to flow across pages.]', 20, 98, w - 40, 10.5, { maxLines: 27 }), ...footer(w, h)
    ])
    add('memo', 'Memorandum', [...header,
      text(null, 'Memorandum', 20, 97, 22, 'ink', { font: 'display' }),
      text('memo-to', '[To]', 20, 112), text('memo-from', '[From]', 20, 122), text('memo-date', '[Date]', 20, 132),
      para('memo-subject', '[Subject]', 20, 150, w - 40, 15, { font: 'bold', maxLines: 2 }),
      para('memo-body', '[State the purpose, the supporting information and any decision or action requested.]', 20, 173, w - 40, 10.5, { maxLines: 14 }), ...footer(w, h)
    ])
    add('report-cover', 'Research report cover', [bg(), logo(20, 20, 65), affiliation(20, 52, w - 40),
      eyebrow('Research report', 20, 103),
      para('report-title', '[Report title]', 20, 126, w - 40, 30, { font: 'display', colour: 'gold-text', maxLines: 3, leading: pt(35) }),
      rule(20, w - 20, 163, 'line', 1.6),
      para('report-subtitle', '[Question, scope and reporting period]', 20, 174, w - 40, 13, { maxLines: 3 }),
      text('author', '[Prepared by]', 20, h - 62, 11), text('document-date', '[Date]', 20, h - 51, 10.5, 'muted'), ...footer(w, h)
    ])
    add('report-page', 'Research report content', [...compactHeader,
      para('report-section', '[Section heading]', 20, 84, w - 40, 22, { font: 'display', maxLines: 2 }),
      para('report-body', '[Describe the research question, methods, findings and limitations. Connect each conclusion to its evidence.]', 20, 103, w - 40, 10.5, { maxLines: 17 }),
      text('evidence-label', '[Evidence or figure caption]', 20, h - 77, 9, 'muted'),
      para('evidence-source', '[Source and access or capture date]', 20, h - 66, w - 40, 8.5, { colour: 'muted', maxLines: 3 }), ...footer(w, h)
    ])
    add('brief', 'Decision brief', [...compactHeader,
      para('brief-title', '[Decision title]', 20, 84, w - 40, 22, { font: 'display', maxLines: 2 }),
      text(null, 'Decision requested', 20, 105, 12, 'green', { font: 'bold' }),
      para('decision', '[State the specific decision and why it is needed.]', 20, 115, w - 40, 10.5, { maxLines: 4 }),
      text(null, 'Evidence and options', 20, 147, 12, 'green', { font: 'bold' }),
      para('options', '[Describe the relevant evidence, available options and their tradeoffs.]', 20, 157, w - 40, 10.5, { maxLines: 6 }),
      text(null, 'Recommendation and next step', 20, 200, 12, 'green', { font: 'bold' }),
      para('recommendation', '[Give the recommendation, its rationale and the next action.]', 20, 210, w - 40, 10.5, { maxLines: 5 }), ...footer(w, h)
    ])
    add('portfolio-cover', 'Brand portfolio cover', [bg(), logo(20, 20, 65), affiliation(20, 52, w - 40),
      eyebrow('Brand portfolio', 20, 103),
      para('portfolio-title', '[Portfolio title]', 20, 126, w - 40, 30, { font: 'display', colour: 'gold-text', maxLines: 3, leading: pt(35) }),
      rule(20, w - 20, 163, 'line', 1.6),
      para('portfolio-subtitle', '[Units, initiatives and relationships included in this portfolio]', 20, 174, w - 40, 13, { maxLines: 3 }),
      text('author', '[Prepared by]', 20, h - 62, 11), text('document-date', '[Date]', 20, h - 51, 10.5, 'muted'), ...footer(w, h)
    ])
    add('portfolio-page', 'Brand portfolio entry', [...compactHeader,
      para('portfolio-entry', '[Unit or initiative name]', 20, 84, w - 40, 22, { font: 'display', maxLines: 2 }),
      text(null, 'Purpose and audience', 20, 106, 12, 'green', { font: 'bold' }),
      para('portfolio-purpose', '[Describe this unit or initiative and the people it serves.]', 20, 117, w - 40, 10.5, { maxLines: 4 }),
      text(null, 'Relationship to the university', 20, 151, 12, 'green', { font: 'bold' }),
      para('portfolio-relationship', '[State the verified organizational relationship. Distinguish a department, a lab, an initiative and an independent organization.]', 20, 162, w - 40, 10.5, { maxLines: 5 }),
      text(null, 'Identity and applications', 20, 202, 12, 'green', { font: 'bold' }),
      para('portfolio-assets', '[Identify approved artwork, the source of the identity guidance and the applications that use it.]', 20, 213, w - 40, 10.5, { maxLines: 5 }), ...footer(w, h)
    ])
    sets.push({ id: `letterhead-${id}`, label: `Letterhead / ${label}`, group: 'Documents', variants: [{ template: `letterhead-${id}`, label: 'First page' }, { template: `continuation-${id}`, label: 'Continuation' }] },
      { id: `report-${id}`, label: `Research report / ${label}`, group: 'Documents', variants: [{ template: `report-cover-${id}`, label: 'Cover' }, { template: `report-page-${id}`, label: 'Content' }] },
      { id: `portfolio-${id}`, label: `Brand portfolio / ${label}`, group: 'Documents', variants: [{ template: `portfolio-cover-${id}`, label: 'Cover' }, { template: `portfolio-page-${id}`, label: 'Entry' }] })
    documents.push({ id: `letterhead-${id}`, label: `${label} letterhead`, format: 'docx', pages: [`letterhead-${id}`, `continuation-${id}`] },
      { id: `memo-${id}`, label: `${label} memorandum`, format: 'docx', pages: [`memo-${id}`, `continuation-${id}`] },
      { id: `report-${id}`, label: `${label} research report`, format: 'docx', pages: [`report-cover-${id}`, `report-page-${id}`], continue: true },
      { id: `brief-${id}`, label: `${label} decision brief`, format: 'docx', pages: [`brief-${id}`, `continuation-${id}`] },
      { id: `portfolio-${id}`, label: `${label} brand portfolio`, format: 'docx', pages: [`portfolio-cover-${id}`, `portfolio-page-${id}`], continue: true })
  }
  const slideBase = { width: 338.667, height: 190.5, unit: 'mm', physical: ['338.667mm', '190.5mm'], raster: 1920, group: 'Presentations', extension: 'unbc-document-applications', description: sourceNote }
  const slide = (id, label, elements) => templates.push({ id: `presentation-${id}`, label, title: `{name} / ${label}`, ...slideBase, elements })
  slide('cover', 'Presentation cover', [bg('green'), logo(20, 18, 80, 'white'), affiliation(20, 61, 298, { departmentPt: 16, subdepartmentPt: 14, colour: 'white' }),
    para('deck-title', '[Presentation title]', 20, 120, 298, 36, { font: 'display', colour: 'white', leading: pt(43), maxLines: 3 }),
    text('presenter', '[Presenter and date]', 20, 174, 16, 'white')])
  slide('section', 'Presentation section', [bg(), logo(20, 18, 65), text('section-number', '[01]', 20, 70, 20, 'gold-text', { font: 'display' }),
    para('section-title', '[Section title]', 20, 97, 298, 36, { font: 'display', leading: pt(43), maxLines: 3 }),
    para('section-summary', '[Explain the question or finding for this section.]', 20, 153, 298, 18, { maxLines: 2 })])
  slide('content', 'Presentation content', [bg(), logo(20, 14, 55), para('slide-title', '[Slide title]', 20, 53, 298, 28, { font: 'display', maxLines: 2 }),
    para('slide-body', '[Key finding]\n[Supporting evidence]\n[Implication or next step]', 20, 91, 280, 21, { leading: pt(31), maxLines: 7 }),
    text('slide-source', '[Source]', 20, 179, 10, 'muted')])
  slide('evidence', 'Presentation evidence', [bg(), logo(20, 14, 55), para('slide-title', '[Evidence title]', 20, 53, 298, 28, { font: 'display', maxLines: 2 }),
    { type: 'rect', x: 20, y: 77, width: 181, height: 80, fill: 'light', stroke: 'line', strokeWidth: .3 },
    text(null, '[Insert a figure or screenshot]', 110.5, 118, 14, 'muted', { anchor: 'middle' }),
    para('evidence-explanation', '[Explain what this evidence shows and how it supports the conclusion.]', 215, 86, 104, 17, { maxLines: 8 }),
    para('slide-source', '[Figure caption and source]', 20, 174, 298, 10, { colour: 'muted', maxLines: 2 })])
  sets.push({ id: 'presentation', label: 'Presentation', group: 'Presentations', variants: ['cover', 'section', 'content', 'evidence'].map(id => ({ template: `presentation-${id}`, label: id.charAt(0).toUpperCase() + id.slice(1) })) })
  documents.push({ id: 'presentation', label: 'Presentation / four layouts', format: 'pptx', layouts: ['presentation-cover', 'presentation-section', 'presentation-content', 'presentation-evidence'] })

  const px = (id, label, width, height, elements) => templates.push({ id, label, title: `{name} / ${label}`, width, height, raster: width, group: 'Digital applications', extension: 'unbc-document-applications', description: sourceNote, elements })
  px('social-post', 'Social announcement', 1080, 1080, [bg(), logo(74, 74, 460),
    { ...affiliation(74, 252, 932), items: [{ id: 'department', text: '', size: 20, leading: 26, wrap: 932, font: 'bold', colour: 'ink' }, { id: 'subdepartment', text: '', size: 18, leading: 24, gap: 32, wrap: 932, font: 'body', colour: 'ink' }] },
    { ...para('announcement-title', '[Announcement title]', 74, 500, 932), size: 72, leading: 86, font: 'display', maxLines: 3 },
    { ...para('announcement-detail', '[Relevant event or project details]', 74, 830, 932), size: 30, leading: 43, maxLines: 3 },
    text('announcement-link', '[Web address]', 74, 1003, 62, 'teal')])
  // Email export's left artwork pane uses an untouched full logo; contact details stay text.
  px('email-signature', 'Email signature', 1000, 540, [bg(), logo(24, 50, 290),
    { type: 'line', x1: 350, x2: 350, y1: 30, y2: 510, stroke: 'line', strokeWidth: 1 },
    { type: 'flow', x: 382, y: 61, items: [
      { id: 'author', text: '[Name]', size: 26, leading: 32, font: 'bold', colour: 'ink', wrap: 586 },
      { id: 'author-role', text: '[Role]', size: 20, leading: 26, gap: 36, font: 'body', colour: 'ink', wrap: 586 },
      { id: 'department', text: '', size: 20, leading: 27, gap: 34, font: 'bold', colour: 'ink', wrap: 586 },
      { id: 'subdepartment', text: '', size: 18, leading: 25, gap: 31, font: 'body', colour: 'ink', wrap: 586 },
      { id: 'contact-email', text: '[Email]', size: 18, leading: 25, gap: 37, font: 'body', colour: 'ink', wrap: 586 },
      { id: 'contact-website', text: '[Web address]', size: 18, leading: 25, gap: 30, font: 'body', colour: 'teal', wrap: 586 }
    ] }])
  documents.push({ id: 'email-signature', label: 'Email signature', format: 'html', template: 'email-signature', emailLayout: { compactArtwork: true } })
  return { templates, sets, documents }
}
