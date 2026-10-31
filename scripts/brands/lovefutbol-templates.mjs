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

const sourceNote = 'Local Brandkit application informed by love.fútbol’s community model (lovefutbol.org/about-us and /faq), Projects-page Bahianita / Red Hat Text and green / terracotta treatments (lovefutbol.org/projects), the homepage cyan accent (lovefutbol.org), and dark / light-green treatments in methodology and governance materials, observed 30 October 2026. The complete logo preserves paths from love.fútbol’s 2025 Community-Driven Sport Spaces guide published by U.S. Soccer. This is not an official love.fútbol template: layouts, spacing, type sizes and content fields are local proposals. Replace bracketed instructions with reviewed content; retain the relevant dates, sources, credits and limits of any claim.'
const application = { extension: 'lovefutbol-local-applications', description: sourceNote, use: sourceNote }
const localGuides = (title, labelSize, elements) => ({
  title: `Local ${title} construction`, labelSize,
  elements: [...elements, { type: 'note', label: 'Local application defaults; not published love.fútbol standards.' }]
})
const insetGuide = (margin, unit) => ({ type: 'dimension', axis: 'x', from: 'trim.left', to: { element: 'brand-logo', edge: 'left' }, label: `${margin} ${unit} / local inset` })
const logoGuide = (width, unit) => ({ type: 'dimension', axis: 'x', from: { element: 'brand-logo', edge: 'left' }, to: { element: 'brand-logo', edge: 'right' }, label: `${width} ${unit} / complete logo` })
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
    const add = (kind, name, elements, extra = {}) => templates.push({ id: `${kind}-${paperId}`, label: `${name} / ${label}`, title: `{name} / ${name} / ${label}`, ...base, elements, ...extra })
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

    const profileUse = `${sourceNote} Record a completed or otherwise documented project as a dated snapshot, separate from a proposal. Identify local leadership and continuing stewardship. Insert the reviewed photograph in the exported document or SVG, replace its instruction, and retain its caption and credit. A photograph alone does not establish impact.`
    const column = (w - 52) / 2
    add('project-profile', 'Community project profile', [bg(), logo(20, 16, 43), eyebrow('Documented project', 83, 24), para('profile-location', '[Community / location]', 83, 35, w - 103, 9, { maxLines: 2 }), rule(20, w - 20, 52),
      display('profile-title', '[Project name]', 20, 69, w - 40, 30, { maxLines: 2 }),
      para('profile-observation', '[Recorded stage / completion date · Observation period]', 20, 94, w - 40, 9.5, { maxLines: 2 }),
      rect('profile-image-frame', 20, 108, w - 40, 52, 'off-white', { stroke: 'light-green', strokeWidth: .4 }),
      para('profile-image-note', '[Insert a reviewed project photograph]', w / 2, 135, w - 56, 12, { anchor: 'middle', maxLines: 2 }),
      para('profile-image-credit', '[What is shown / place / image date / creator]', 20, 167, w - 40, 8.5, { maxLines: 2 }),
      text(null, 'Local leadership', 20, 186, 10.5, 'ink', { font: 'bold' }),
      text(null, 'Ongoing stewardship', 32 + column, 186, 10.5, 'ink', { font: 'bold' }),
      para('profile-leadership', '[Name the local people or group shaping decisions and describe their role.]', 20, 195, column, 9.5, { maxLines: 5 }),
      para('profile-stewardship', '[Describe agreed access, upkeep and local responsibilities as of the date above.]', 32 + column, 195, column, 9.5, { maxLines: 5 }),
      text(null, 'Evidence and further detail', 20, 228, 9, 'ink', { font: 'bold' }),
      para('profile-sources', '[Sources / dates / methods / contact or link for further information]', 20, 236, w - 40, 8.5, { maxLines: 3 }),
      ...footer(w, h)
    ], { use: profileUse, guides: localGuides('project profile', 3, [
      insetGuide(20, 'mm'), logoGuide(43, 'mm'),
      { type: 'dimension', axis: 'y', from: { element: 'profile-image-frame', edge: 'top' }, to: { element: 'profile-image-frame', edge: 'bottom' }, label: '52 mm / image frame' },
      { type: 'note', label: 'Dated snapshot. Keep local roles, image credit and sources with the project.' }
    ]) })

    sets.push(
      { id: `letterhead-${paperId}`, label: `Letterhead / ${label}`, group: 'Documents', use: sourceNote, variants: [{ template: `letterhead-${paperId}`, label: 'First page' }, { template: `continuation-${paperId}`, label: 'Continuation' }] },
      { id: `project-brief-${paperId}`, label: `Community project brief / ${label}`, group: 'Documents', use: sourceNote, variants: [{ template: `project-brief-${paperId}`, label: 'Brief' }, { template: `continuation-${paperId}`, label: 'Supporting detail' }] },
      { id: `project-profile-${paperId}`, label: `Community project profile / ${label}`, group: 'Documents', use: profileUse, variants: [{ template: `project-profile-${paperId}`, label: 'Project snapshot' }, { template: `continuation-${paperId}`, label: 'Supporting evidence' }] }
    )
    documents.push(
      { id: `letterhead-${paperId}`, label: `${label} letterhead`, format: 'docx', pages: [`letterhead-${paperId}`, `continuation-${paperId}`], use: sourceNote },
      { id: `project-brief-${paperId}`, label: `${label} community project brief`, format: 'docx', pages: [`project-brief-${paperId}`, `continuation-${paperId}`], use: sourceNote },
      { id: `project-profile-${paperId}`, label: `${label} community project profile`, format: 'docx', pageMode: 'sequence', pages: [`project-profile-${paperId}`, `continuation-${paperId}`], use: profileUse }
    )
  }

  const slideBase = { ...application, width: 338.667, height: 190.5, unit: 'mm', physical: ['338.667mm', '190.5mm'], raster: 1920, group: 'Presentations' }
  const slide = (id, label, elements, extra = {}) => templates.push({ id: `presentation-${id}`, label, title: `{name} / ${label}`, ...slideBase, elements, ...extra })
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
  slide('comparison', 'Presentation comparison', [...slideHeader('[Place across two dates]'),
    para('comparison-location', '[Community / location / scope of comparison]', 18, 67, 302, 10.5, { maxLines: 1 }),
    para('before-date', '[Before · date / viewpoint]', 18, 77, 144, 10, { font: 'bold', maxLines: 2 }),
    para('after-date', '[After · date / viewpoint]', 176, 77, 144, 10, { font: 'bold', maxLines: 2 }),
    rect('before-image-frame', 18, 85, 144, 59, 'off-white', { stroke: 'light-green', strokeWidth: .4 }),
    rect('after-image-frame', 176, 85, 144, 59, 'off-white', { stroke: 'light-green', strokeWidth: .4 }),
    para('before-image-note', '[Insert earlier image]', 90, 116, 128, 12, { anchor: 'middle', maxLines: 2 }),
    para('after-image-note', '[Insert later image]', 248, 116, 128, 12, { anchor: 'middle', maxLines: 2 }),
    para('before-caption', '[What is shown / creator / source]', 18, 152, 144, 9, { maxLines: 2 }),
    para('after-caption', '[What is shown / creator / source]', 176, 152, 144, 9, { maxLines: 2 }),
    para('comparison-context', '[State the observable changes and relevant limits. Images alone do not establish the cause of change.]', 18, 169, 302, 9.5, { maxLines: 2 }),
    para('comparison-source', '[Evidence source / image permissions / reporting date]', 18, 183, 302, 8, { maxLines: 1 })
  ], { use: `${sourceNote} Compare two dated views with equal image frames. Identify location, dates, viewpoints and creators; keep meaningful context when cropping. Describe only what the evidence supports. Before-and-after images alone do not establish that an intervention caused a change. Insert reviewed images in the exported SVG or PowerPoint.`, guides: localGuides('comparison slide', 3.5, [
    { type: 'dimension', axis: 'x', from: 'trim.left', to: { element: 'before-image-frame', edge: 'left' }, label: '18 mm / local inset' },
    { type: 'dimension', axis: 'x', from: { element: 'before-image-frame', edge: 'left' }, to: { element: 'before-image-frame', edge: 'right' }, label: '144 mm / each image' },
    { type: 'dimension', axis: 'x', from: { element: 'before-image-frame', edge: 'right' }, to: { element: 'after-image-frame', edge: 'left' }, label: '14 mm / gap' },
    { type: 'note', label: 'Equal frames; retain dates, location, credits and limits. No causal claim is implied.' }
  ]) })
  slide('community-voice', 'Presentation community voice', [bg('charcoal'), logo(280, 14, 40, 'reverse'), display('slide-title', '[Community perspective]', 18, 32, 246, 30, { colour: 'light-green', maxLines: 2 }), rule(18, 320.667, 56),
    rect('voice-accent', 18, 67, 5, 72, 'cyan'),
    para('voice-quotation', '[Insert a short, exact approved quotation. Keep the complete quotation within four lines.]', 31, 86, 277, 26, { colour: 'off-white', leading: pt(34), maxLines: 4 }),
    para('voice-speaker', '[Speaker name]', 18, 151, 210, 14, { colour: 'white', font: 'bold', maxLines: 1 }),
    para('voice-date', '[Date]', 320, 151, 80, 9, { colour: 'white', anchor: 'end', maxLines: 1 }),
    para('voice-role-place', '[Speaker’s role / community / place]', 18, 163, 302, 10, { colour: 'off-white', maxLines: 2 }),
    para('voice-source', '[Original source / permission for this use / approved translation, if applicable]', 18, 181, 302, 8.5, { colour: 'off-white', maxLines: 2 })
  ], { use: `${sourceNote} A flat charcoal surface, light-green title and reversed complete logo apply the observed dark contrast treatment without inventing a grain or pattern system. Use a short quotation approved for the intended audience and context. Preserve its exact words and meaning, identify the speaker’s role, place, date and source, and record permission for this use. Check that the complete quotation fits within four lines; otherwise select a separately approved shorter quotation or another layout. A translated quotation requires a reviewed translation; do not invent a testimonial or convert a paraphrase into a direct quotation.`, guides: localGuides('community voice slide', 3.5, [
    { type: 'dimension', axis: 'x', from: 'trim.left', to: { element: 'voice-accent', edge: 'left' }, label: '18 mm / local inset' },
    { type: 'dimension', axis: 'x', from: { element: 'voice-accent', edge: 'left' }, to: { element: 'voice-accent', edge: 'right' }, label: '5 mm / cyan accent' },
    { type: 'callout', target: { box: [31, 79.5, 277, 43] }, label: '26 / 34 pt Red Hat Text\nComplete quote / four lines maximum', side: 'right' },
    { type: 'note', label: 'Keep speaker, role, place, date and source with the quotation.' }
  ]) })
  const slideIds = ['cover', 'section', 'content', 'evidence', 'comparison', 'community-voice']
  const slideLabel = id => id === 'community-voice' ? 'Community voice' : id.charAt(0).toUpperCase() + id.slice(1)
  sets.push({ id: 'presentation', label: 'Presentation', group: 'Presentations', use: sourceNote, variants: slideIds.map(id => ({ template: `presentation-${id}`, label: slideLabel(id) })) })
  documents.push({ id: 'presentation', label: 'Presentation / six layouts', format: 'pptx', layouts: slideIds.map(id => `presentation-${id}`), use: sourceNote })

  const digital = (id, label, width, height, elements, extra = {}) => templates.push({ id, label, title: `{name} / ${label}`, ...application, width, height, raster: width, group: 'Digital applications', elements, ...extra })
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
  digital('social-impact', 'Impact measure / square', 1080, 1080, [bg('off-white'), logo(72, 64, 220),
    pxText('impact-context', '[Community / project / measure]', 72, 270, 26, { font: 'bold', fitWidth: 936 }),
    pxText('impact-value', '[Value + unit]', 72, 455, 152, { font: 'bold', fitWidth: 936 }),
    pxPara('impact-definition', '[Define exactly what the value counts]', 72, 540, 936, 42, { leading: 54, maxLines: 2 }),
    pxPara('impact-qualification', '[Scope or methodological limit relevant to this value]', 72, 661, 936, 27, { leading: 36, maxLines: 2 }),
    rect('impact-accent', 72, 730, 936, 8, 'cyan'),
    pxPara('impact-geography', '[Geography / people or places included]', 72, 794, 936, 28, { leading: 36, maxLines: 2 }),
    pxText('impact-period', '[Reporting period / as-of date]', 72, 881, 28, { fitWidth: 936 }),
    pxPara('impact-source', '[Source / method / link to full evidence]', 72, 944, 936, 24, { leading: 32, maxLines: 2 }),
    pxText(null, 'lovefutbol.org', 72, 1040, 22)
  ], { use: `${sourceNote} Publish one verified measure with its unit, precise definition, geography, reporting period and source. Preserve qualifications that affect interpretation; do not describe participation, capacity or a project count as a causal outcome. Use the caption or linked source for full methodology.`, guides: localGuides('impact card', 22, [
    insetGuide(72, 'px'), logoGuide(220, 'px'),
    { type: 'callout', target: { element: 'impact-value' }, label: 'Value + unit\nRed Hat Text Bold; shrink to fit', side: 'right' },
    { type: 'note', label: 'Keep definition, geography, period, source and relevant limits with the value.' }
  ]) })
  digital('social-call-to-action', 'Community invitation / square', 1080, 1080, [bg('light-green'), logo(72, 64, 220),
    pxText('cta-audience', '[Who this invitation is for]', 72, 270, 26, { font: 'bold', fitWidth: 936 }),
    pxPara('cta-headline', '[What people can do]', 72, 382, 936, 92, { font: 'display', leading: 106, maxLines: 2 }),
    pxPara('cta-context', '[Why this matters here, and what to expect.]', 72, 600, 936, 34, { leading: 46, maxLines: 3 }),
    rect(null, 0, 768, 1080, 312, 'off-white'),
    rect('cta-action-panel', 72, 802, 936, 116, 'cyan'),
    pxPara('cta-action', '[One clear action]', 540, 852, 840, 38, { font: 'bold', anchor: 'middle', leading: 45, maxLines: 2 }),
    pxPara('cta-destination', '[Destination URL / access details]', 72, 969, 936, 28, { leading: 34, maxLines: 2 }),
    pxText('cta-contact', '[Contact or accessibility details]', 72, 1040, 22, { fitWidth: 936 })
  ], { use: `${sourceNote} Address one audience, ask for one concrete action and provide a verified destination or access instruction. State relevant participation or accessibility details. This static artwork has no working button: include the usable URL or access information in the post and caption. Donation amounts, incentives and promises require separately verified content.`, guides: localGuides('community invitation', 22, [
    insetGuide(72, 'px'), logoGuide(220, 'px'),
    { type: 'dimension', axis: 'x', from: { element: 'cta-action-panel', edge: 'left' }, to: { element: 'cta-action-panel', edge: 'right' }, label: '936 px / action panel' },
    { type: 'note', label: 'One audience, one action, one verified destination. Cyan uses charcoal text.' }
  ]) })
  sets.push({ id: 'social', label: 'Community announcements', group: 'Digital applications', use: sourceNote, variants: [{ template: 'social-post', label: 'Square announcement' }, { template: 'social-story', label: 'Portrait story' }, { template: 'social-impact', label: 'Impact measure' }, { template: 'social-call-to-action', label: 'Community invitation' }] })

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
