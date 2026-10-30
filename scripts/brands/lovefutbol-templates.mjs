// Local love.fútbol applications informed by observed public website styling.
// These layouts, margins and type sizes are Brandkit choices, not an official manual.
// The complete source logo is approximately 1.759:1: reserve its full height.

const MM_PER_PT = 25.4 / 72
const pt = value => value * MM_PER_PT
const bg = (fill = 'white') => ({ type: 'background', fill })
const logo = (x, y, width = 43, colourway = 'positive') => ({ type: 'logo', x, y, width, signature: 'full', colourway })
const rect = (id, x, y, width, height, fill = 'off-white', extra = {}) => ({ type: 'rect', id, x, y, width, height, fill, ...extra })
const rule = (x1, x2, y, colour = 'light-green', strokeWidth = .35) => ({ type: 'line', x1, x2, y1: y, y2: y, stroke: colour, strokeWidth })
const text = (id, value, x, y, points = 10.5, colour = 'ink', extra = {}) => ({ type: 'text', id, text: value, x, y, size: pt(points), font: 'body', colour, ...extra })
const para = (id, value, x, y, width, points = 10.5, extra = {}) => ({ type: 'paragraph', id, text: value, x, y, width, size: pt(points), leading: pt(points * 1.4), font: 'body', colour: 'ink', ...extra })
const display = (id, value, x, y, width, points = 30, extra = {}) => para(id, value, x, y, width, points, { font: 'display', leading: pt(points * 1.15), ...extra })
const eyebrow = (value, x, y, points = 8.5) => text(null, value, x, y, points, 'ink', { font: 'bold', caps: true, tracking: pt(points * .06) })
const pxText = (id, value, x, y, size = 28, extra = {}) => ({ type: 'text', id, text: value, x, y, size, font: 'body', colour: 'ink', ...extra })
const pxPara = (id, value, x, y, width, size = 32, extra = {}) => ({ type: 'paragraph', id, text: value, x, y, width, size, leading: size * 1.4, font: 'body', colour: 'ink', ...extra })

const sourceNote = 'Local Brandkit application informed by love.fútbol’s observed website styling and sourced logo artwork; not an official love.fútbol template. Margins and type sizes are local defaults. Replace bracketed instructions and insert reviewed content before use.'
const application = { extension: 'lovefutbol-local-applications', description: sourceNote, use: sourceNote }
const papers = { letter: { width: 215.9, height: 279.4, label: 'Letter' }, a4: { width: 210, height: 297, label: 'A4' } }
const footer = (width, height) => [
  rule(20, width - 20, height - 22),
  text('document-reference', '[Reference / version]', 20, height - 15, 8),
  text(null, 'lovefutbol.org', width - 20, height - 15, 8, 'ink', { anchor: 'end' })
]

export const lovefutbolTemplates = () => {
  const templates = []
  const sets = []
  const documents = []

  for (const [paperId, paper] of Object.entries(papers)) {
    const { width: w, height: h, label } = paper
    const base = { ...application, width: w, height: h, unit: 'mm', physical: [`${w}mm`, `${h}mm`], raster: 1700, group: 'Documents' }
    const add = (kind, name, elements) => templates.push({ id: `${kind}-${paperId}`, label: `${name} / ${label}`, title: `{name} / ${name} / ${label}`, ...base, elements })
    const header = [bg(), logo(20, 16, 43), text('team-region', '[Team or region]', w - 20, 26, 9, 'ink', { anchor: 'end' }), text(null, 'lovefutbol.org', w - 20, 34, 9, 'ink', { anchor: 'end' }), rule(20, w - 20, 52)]

    add('letterhead', 'Letterhead', [...header,
      text('letter-date', '[Date]', 20, 65),
      para('recipient', '[Recipient]\n[Address]', 20, 78, w - 40, 10.5, { maxLines: 3 }),
      para('letter-subject', '[Subject]', 20, 107, w - 40, 14, { font: 'bold', leading: pt(18), maxLines: 2 }),
      para('letter-body', '[Explain the purpose of this letter, the community context and the action or response requested.]', 20, 130, w - 40, 10.5, { maxLines: 17 }),
      text('author', '[Name]', 20, h - 47, 10.5, 'ink', { font: 'bold' }),
      text('author-role', '[Role]', 20, h - 39, 10),
      ...footer(w, h)
    ])

    add('continuation', 'Continuation sheet', [bg(), logo(20, 16, 32), text('running-title', '[Document title]', w - 20, 28, 9, 'ink', { anchor: 'end' }), rule(20, w - 20, 46),
      display('continued-heading', '[Section heading]', 20, 65, w - 40, 26, { maxLines: 2 }),
      para('continued-content', '[Continue the letter or project brief here. Describe the evidence, responsibilities, decisions and next steps in clear language.]', 20, 95, w - 40, 10.5, { maxLines: paperId === 'a4' ? 31 : 28 }),
      ...footer(w, h)
    ])

    add('project-brief', 'Community project brief', [bg(), logo(20, 16, 43), eyebrow('Community project brief', 83, 24), para('project-location', '[Community / location]', 83, 35, w - 103, 9, { maxLines: 2 }), rule(20, w - 20, 52),
      display('project-title', '[Project title]', 20, 69, w - 40, 30, { maxLines: 2 }),
      text('project-period', '[Reporting period or project stage]', 20, 94, 9),
      rect(null, 20, 106, w - 40, 9, 'light-green'), text(null, 'Community context', 23, 112.5, 10, 'ink', { font: 'bold' }),
      para('project-context', '[Describe the place, the people leading the work and the locally identified need.]', 20, 124, w - 40, 10.5, { maxLines: 4 }),
      rect(null, 20, 151, w - 40, 9, 'light-green'), text(null, 'The proposed space and approach', 23, 157.5, 10, 'ink', { font: 'bold' }),
      para('project-approach', '[Describe what is proposed, how residents will shape it and the responsibilities agreed with partners.]', 20, 169, w - 40, 10.5, { maxLines: 4 }),
      rect(null, 20, 196, w - 40, 9, 'light-green'), text(null, 'Stewardship and next steps', 23, 202.5, 10, 'ink', { font: 'bold' }),
      para('project-stewardship', '[Explain access, upkeep, local decision-making and the next agreed action. Add dated evidence where available.]', 20, 214, w - 40, 10.5, { maxLines: 5 }),
      ...footer(w, h)
    ])

    sets.push(
      { id: `letterhead-${paperId}`, label: `Letterhead / ${label}`, group: 'Documents', use: sourceNote, variants: [{ template: `letterhead-${paperId}`, label: 'First page' }, { template: `continuation-${paperId}`, label: 'Continuation' }] },
      { id: `project-brief-${paperId}`, label: `Community project brief / ${label}`, group: 'Documents', use: sourceNote, variants: [{ template: `project-brief-${paperId}`, label: 'Brief' }, { template: `continuation-${paperId}`, label: 'Supporting detail' }] }
    )
    documents.push(
      { id: `letterhead-${paperId}`, label: `${label} letterhead`, format: 'docx', pages: [`letterhead-${paperId}`, `continuation-${paperId}`], use: sourceNote },
      { id: `project-brief-${paperId}`, label: `${label} community project brief`, format: 'docx', pages: [`project-brief-${paperId}`, `continuation-${paperId}`], use: sourceNote }
    )
  }

  const slideBase = { ...application, width: 338.667, height: 190.5, unit: 'mm', physical: ['338.667mm', '190.5mm'], raster: 1920, group: 'Presentations' }
  const slide = (id, label, elements) => templates.push({ id: `presentation-${id}`, label, title: `{name} / ${label}`, ...slideBase, elements })
  const slideHeader = title => [bg(), logo(280, 14, 40), display('slide-title', title, 18, 32, 246, 30, { maxLines: 2 }), rule(18, 320.667, 56)]

  slide('cover', 'Presentation cover', [bg('light-green'), logo(18, 16, 54), eyebrow('Community / project', 90, 30, 12),
    display('deck-title', '[Presentation title]', 18, 85, 302, 46, { maxLines: 3 }),
    para('deck-summary', '[Place, purpose and scope]', 18, 148, 302, 18, { maxLines: 2 }),
    text('presenter', '[Presenter / date]', 18, 178, 12)
  ])
  slide('section', 'Presentation section', [bg('terracotta'), logo(18, 16, 45), text('section-number', '[01]', 18, 66, 14, 'ink', { font: 'bold' }),
    display('section-title', '[Section title]', 18, 97, 302, 46, { maxLines: 3 }),
    para('section-summary', '[The question or purpose of this section.]', 18, 163, 302, 17, { maxLines: 2 })
  ])
  slide('content', 'Presentation content', [...slideHeader('[Slide title]'),
    para('slide-body', '[Key point]\n[Supporting evidence]\n[What this means for the community]', 18, 79, 292, 22, { leading: pt(30), maxLines: 8 }),
    para('slide-source', '[Source and reporting period]', 18, 181, 302, 9, { maxLines: 1 })
  ])
  slide('evidence', 'Presentation evidence', [...slideHeader('[Evidence title]'),
    // The native engine has no image-upload element: reserve a real, empty frame and make
    // its instruction editable. Insert the approved image in the exported SVG or PowerPoint.
    rect('evidence-image-frame', 18, 67, 180, 89, 'off-white', { stroke: 'light-green', strokeWidth: .4 }),
    para('evidence-image-note', '[Insert a sourced image or chart]', 108, 109, 162, 13, { anchor: 'middle', maxLines: 2 }),
    para('evidence-caption', '[Caption / creator / date]', 18, 166, 180, 9, { maxLines: 2 }),
    eyebrow('What it shows', 215, 71, 9),
    para('evidence-explanation', '[Describe the evidence, what it supports and any limits on interpretation.]', 215, 85, 105, 17, { leading: pt(22), maxLines: 9 }),
    para('slide-source', '[Source / permission / reporting period]', 18, 183, 302, 9, { maxLines: 1 })
  ])
  const slideIds = ['cover', 'section', 'content', 'evidence']
  sets.push({ id: 'presentation', label: 'Presentation', group: 'Presentations', use: sourceNote, variants: slideIds.map(id => ({ template: `presentation-${id}`, label: id.charAt(0).toUpperCase() + id.slice(1) })) })
  documents.push({ id: 'presentation', label: 'Presentation / four layouts', format: 'pptx', layouts: slideIds.map(id => `presentation-${id}`), use: sourceNote })

  const digital = (id, label, width, height, elements) => templates.push({ id, label, title: `{name} / ${label}`, ...application, width, height, raster: width, group: 'Digital applications', elements })
  digital('social-post', 'Social announcement / square', 1080, 1080, [bg('light-green'), logo(72, 64, 260),
    pxText('post-context', '[Community / project]', 72, 286, 26, { font: 'bold' }),
    pxPara('post-title', '[Announcement title]', 72, 398, 936, 92, { font: 'display', leading: 106, maxLines: 3 }),
    rect(null, 0, 734, 1080, 346, 'off-white'),
    pxPara('post-detail', '[Share the relevant details and the next action.]', 72, 808, 936, 32, { leading: 45, maxLines: 3 }),
    pxText('post-website', 'lovefutbol.org', 72, 1008, 26)
  ])
  digital('social-story', 'Community story / portrait', 1080, 1920, [bg('off-white'), logo(80, 200, 260),
    pxText('story-context', '[Community / location]', 80, 416, 28, { font: 'bold' }),
    pxPara('story-title', '[Story title]', 80, 532, 920, 104, { font: 'display', leading: 116, maxLines: 2 }),
    rect('story-image-frame', 80, 756, 920, 554, 'light-green'),
    pxPara('story-image-note', '[Insert a community photograph]', 540, 1035, 820, 30, { anchor: 'middle', maxLines: 2 }),
    pxPara('story-caption', '[Caption / creator / date]', 80, 1372, 920, 24, { leading: 34, maxLines: 2 }),
    pxPara('story-detail', '[Explain what happened and who shaped the work.]', 80, 1500, 920, 34, { leading: 48, maxLines: 3 }),
    pxText('story-website', 'lovefutbol.org', 80, 1702, 26)
  ])
  sets.push({ id: 'social', label: 'Community announcements', group: 'Digital applications', use: sourceNote, variants: [{ template: 'social-post', label: 'Square announcement' }, { template: 'social-story', label: 'Portrait story' }] })

  digital('email-signature', 'Email signature', 620, 320, [bg(), logo(24, 28, 160),
    { type: 'line', x1: 210, x2: 210, y1: 20, y2: 296, stroke: 'light-green', strokeWidth: 1 },
    { type: 'flow', x: 234, y: 46, items: [
      { id: 'author', text: '[Name]', size: 23, leading: 29, font: 'bold', colour: 'ink', wrap: 360, maxLines: 2 },
      { id: 'author-role', text: '[Role]', size: 17, leading: 23, gap: 31, font: 'body', colour: 'ink', wrap: 360, maxLines: 2 },
      { id: 'team-region', text: '[Team or region]', size: 15, leading: 21, gap: 27, font: 'body', colour: 'ink', wrap: 360, maxLines: 2 },
      { id: 'contact-email', text: '[Email]', size: 15, leading: 21, gap: 31, font: 'body', colour: 'ink', wrap: 360, maxLines: 2 },
      { id: 'contact-website', text: 'lovefutbol.org', size: 15, leading: 21, gap: 27, font: 'body', colour: 'ink', wrap: 360, maxLines: 2 }
    ] }
  ])
  documents.push({ id: 'email-signature', label: 'Email signature', format: 'html', template: 'email-signature', emailLayout: { compactArtwork: true }, use: sourceNote })

  return { templates, sets, documents }
}
