// Reusable publication content and document rules, derived from a brand without changing it.
// The same model is consumed by the Word and printable HTML exporters. These are contemporary
// document applications; a historical identity remains explicitly identified as a reconstruction.

import { colour, fill, logoOptions, paintOptions } from './brand.js'

export const DOCUMENTATION_VERSION = '1.0'

export const DOCUMENT_PURPOSES = Object.freeze([
  { id: 'product', label: 'Product overview', description: 'Explain an offering and its supported scope without implying previous client delivery.' },
  { id: 'report', label: 'Project report', description: 'Present findings, their evidence, decisions and follow-up work.' },
  { id: 'brief', label: 'Decision brief', description: 'Explain the decision needed, compare options and identify the next step.' }
])

const PAPERS = {
  letter: { id: 'letter', label: 'US Letter', widthMm: 215.9, heightMm: 279.4 },
  a4: { id: 'a4', label: 'A4', widthMm: 210, heightMm: 297 }
}

const LAYOUTS = [
  { id: 'cover', label: 'Cover', description: 'Brand artwork, title, scope and edition.' },
  { id: 'content', label: 'Content', description: 'A clear summary, explanatory paragraphs and a short list.' },
  { id: 'product', label: 'Product detail', description: 'Audience, purpose, workflow and supported scope.' },
  { id: 'screenshot', label: 'Screenshot or evidence', description: 'A real capture or clearly labelled placeholder, with an explanatory caption.' },
  { id: 'comparison', label: 'Comparison', description: 'Options or capabilities compared against the same criteria.' },
  { id: 'closing', label: 'Closing', description: 'Next steps, supplied contact details and source status.' }
]

const SOURCE_GENERATORS = {
  firstform: { command: 'npm run make:firstform', files: ['scripts/brands/firstform.mjs'] },
  ddcnorth: { command: 'npm run make:ddcnorth', files: ['scripts/brands/ddcnorth-applications.mjs', 'scripts/brands/ddcnorth-accept-v23.mjs'] },
  overtheedge: { command: 'npm run make:overtheedge', files: ['scripts/brands/overtheedge.mjs'] },
  sparklab: { command: 'npm run make:sparklab', files: ['scripts/brands/sparklab.mjs'] },
  'bc-province-1977': { command: 'npm run make:bc', files: ['scripts/brands/bc-province-1977.mjs'] },
  'bc-hydro-1983': { command: 'npm run make:bc', files: ['scripts/brands/bc-hydro-1983.mjs'] },
  northwind: { command: 'npm run make:example', files: ['scripts/make-example-brand.mjs'] }
}

const clone = (value) => structuredClone(value)
const text = (value, fallback = '') => value == null ? fallback : String(value).trim()
const clean = (value) => text(value).replace(/[\r\n]+/g, ' ')
const positive = (value, fallback, name, minimum = 0) => {
  if (value == null) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= minimum) throw new TypeError(`${name} must be a number greater than ${minimum}.`)
  return value
}
const nonnegative = (value, fallback, name) => {
  if (value == null) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new TypeError(`${name} must be a non-negative number.`)
  return value
}

const assertBrand = (brand) => {
  if (!brand || typeof brand !== 'object' || !brand.id || !brand.name) throw new TypeError('A brand with id and name is required.')
}

const purposeOf = (purpose = 'product') => {
  const found = DOCUMENT_PURPOSES.find((item) => item.id === purpose)
  if (!found) throw new RangeError(`Unknown document purpose: ${purpose}. Choose product, report or brief.`)
  return found
}

/** The six reusable page kinds. The returned records can be safely edited by a caller. */
export const publicationLayouts = () => clone(LAYOUTS)

const statusOf = (brand) => {
  const declared = brand.documentation?.status ?? {}
  // A custom document profile cannot silently remove a built-in historical reference label.
  const historical = /^bc-(?:province-1977|hydro-1983)$/.test(brand.id) || Boolean(declared.historical) || /historical reconstruction/i.test(brand.status ?? '')
  const reconstruction = historical || /reconstruct|rebuilt as vectors/i.test(`${brand.source ?? ''} ${brand.status ?? ''}`)
  const note = text(brand.status, historical ? 'Historical reconstruction for reference; not current identity guidance.' : 'Uses the identity artwork supplied by this brand kit.')
  return {
    historical, reconstruction, note,
    extension: historical ? 'Modern document layout extension using a historical reconstruction' : 'Document layout extension using the current brand kit',
    source: text(brand.source),
    identityVersion: text(brand.displayVersion ?? brand.version),
    documentationVersion: DOCUMENTATION_VERSION
  }
}

const faceStyle = (brand, key, defaults, override = {}) => {
  const font = override.font ?? key
  if (!brand.fonts?.[font]) throw new TypeError(`Unknown document font role: ${font}.`)
  const face = brand.fonts[font]
  return {
    font, family: face.family, ...(face.office ? { office: face.office } : {}),
    weight: face.weight ?? 400, italic: face.style === 'italic',
    sizePt: positive(override.sizePt, defaults.sizePt, `${font} sizePt`),
    lineHeight: positive(override.lineHeight, defaults.lineHeight ?? 1.4, `${font} lineHeight`),
    spaceAfterPt: nonnegative(override.spaceAfterPt, defaults.spaceAfterPt ?? 6, `${font} spaceAfterPt`),
    trackingEm: Number.isFinite(override.trackingEm) ? override.trackingEm : defaults.trackingEm ?? 0
  }
}

const preferredLogo = (brand, override = {}) => {
  const entry = logoOptions(brand)[0]
  if (!entry) throw new TypeError('The brand has no logo or signature.')
  const paint = paintOptions(brand).find((item) => item.raster && !/reverse|white|blind/i.test(item.id))
    ?? paintOptions(brand).find((item) => item.raster)
  const options = {
    ...(entry.signature ? { signature: entry.signature } : { family: entry.family, layout: entry.layout }),
    ...(paint?.colourway ? { colourway: paint.colourway } : { colourKey: paint?.colour ?? 'ink' }),
    ...clone(override.options ?? {})
  }
  const selected = logoOptions(brand).find((item) => options.signature ? item.signature === options.signature : item.family === options.family && item.layout === options.layout)
  if (!selected) throw new TypeError('The preferred document logo must be one of the brand’s supplied logos.')
  const selectedPaint = paintOptions(brand).find((item) => options.colourway ? item.colourway === options.colourway : item.colour === options.colourKey)
  if (!selectedPaint) throw new TypeError('The preferred document logo must use a supplied colour or colourway.')
  const minimumWidthMm = brand.lockup?.minimumHorizontalWidthMm ?? 20
  const widthMm = positive(override.widthMm, Math.max(55, minimumWidthMm), 'logo widthMm')
  if (widthMm < minimumWidthMm) throw new RangeError(`Document logo width must be at least ${minimumWidthMm} mm.`)
  const stem = `${selected.key}-${selectedPaint.id}`
  const status = statusOf(brand)
  return {
    options, widthMm, minimumWidthMm,
    // Layout spacing supplements the native artwork padding; the quoted identity rule remains
    // authoritative. It is not a claim that an arbitrary 8 mm equals every brand's clear space.
    clearSpaceMm: nonnegative(override.clearSpaceMm, 8, 'logo clearSpaceMm'),
    clearSpaceRule: text(brand.lockup?.clearspaceRecommendation, 'Keep the supplied artwork clear of adjacent content.'),
    alt: fill(brand, brand.copy?.logoLabel ?? `${brand.name} logo`),
    assets: {
      svg: `logos/outlined/${stem}.svg`,
      png: `logos/png/${stem}-2048.png`,
      pdf: `logos/pdf/${stem}.pdf`
    },
    provenance: { kind: status.reconstruction ? 'reconstruction' : 'kit-artwork', source: status.source, note: status.note }
  }
}

/**
 * A light document profile in physical units. Identity fonts, colours and artwork come from the
 * brand; optional brand.documentation overrides select roles and adjust document measurements.
 * This function does not mutate the brand or introduce templates into its identity definition.
 */
export const documentProfile = (brand, { paper = 'letter' } = {}) => {
  assertBrand(brand)
  if (!PAPERS[paper]) throw new RangeError(`Unknown paper size: ${paper}. Choose letter or a4.`)
  const override = brand.documentation ?? {}
  const margins = Object.fromEntries(['topMm', 'rightMm', 'bottomMm', 'leftMm'].map((key) => [key, nonnegative(override.margins?.[key], 18, `margins.${key}`)]))
  const paperSize = clone(PAPERS[paper])
  if (margins.leftMm + margins.rightMm >= paperSize.widthMm - 50 || margins.topMm + margins.bottomMm >= paperSize.heightMm - 50) throw new RangeError('Document margins leave less than 50 mm of usable page space.')
  const type = override.typography ?? {}
  const typography = {
    title: faceStyle(brand, 'display', { sizePt: 30, lineHeight: 1.12, spaceAfterPt: 14, trackingEm: brand.typography?.headlines?.trackingEm ?? 0 }, type.title),
    subtitle: faceStyle(brand, 'body', { sizePt: 13, lineHeight: 1.4, spaceAfterPt: 10 }, type.subtitle),
    heading1: faceStyle(brand, 'display', { sizePt: 22, lineHeight: 1.2, spaceAfterPt: 12 }, type.heading1),
    heading2: faceStyle(brand, 'display', { sizePt: 14, lineHeight: 1.25, spaceAfterPt: 7 }, type.heading2),
    body: faceStyle(brand, 'body', { sizePt: 10.5, lineHeight: 1.45, spaceAfterPt: 7 }, type.body),
    caption: faceStyle(brand, 'label', { sizePt: 8.5, lineHeight: 1.35, spaceAfterPt: 9 }, type.caption),
    table: faceStyle(brand, 'body', { sizePt: 9.5, lineHeight: 1.3, spaceAfterPt: 3 }, type.table),
    label: faceStyle(brand, 'label', { sizePt: 8.5, lineHeight: 1.3, spaceAfterPt: 6, trackingEm: brand.typography?.labels?.trackingEm ?? 0 }, type.label),
    footer: faceStyle(brand, 'label', { sizePt: 8, lineHeight: 1.2, spaceAfterPt: 0 }, type.footer)
  }
  const colourRoles = { ink: 'ink', muted: 'muted', accent: 'primary', paper: 'paper', light: 'light', line: 'line', reverse: 'reverse' }
  const colours = Object.fromEntries(Object.entries(colourRoles).map(([key, role]) => {
    // Resolve semantic roles explicitly: a palette's name "Ink" need not be its text role.
    const value = colour(brand, override.colours?.[key] ?? brand.roles?.[role] ?? role)
    if (!/^#[0-9a-f]{6}$/i.test(value ?? '')) throw new TypeError(`Document colour ${key} must resolve to a six-digit hex colour.`)
    return [key, value]
  }))
  const status = statusOf(brand)
  return {
    id: `${brand.id}-${paper}`, brandId: brand.id, brandName: brand.name, paper: paperSize, margins, typography, colours,
    header: { text: text(override.header?.text, brand.name) },
    footer: { text: text(override.footer?.text, status.historical ? 'Historical reconstruction · Modern document layout' : brand.name) },
    logo: preferredLogo(brand, override.logo), status,
    rules: {
      print: 'Use the light paper and ink roles for document pages; retain the brand’s own typefaces and logo proportions.',
      screenshots: 'Keep application colours and legible interface text. Use actual captures; label placeholders, mockups and diagrams explicitly.',
      captions: 'Explain the visible action or result. Record source, capture date and context when relevant.',
      copy: 'Describe verified capabilities. Do not imply client delivery, endorsement, results or compatibility without supporting evidence.',
      contact: 'Include contact details only when explicitly supplied. Do not use a template placeholder as a real contact.',
      editing: 'Keep headings, body text, captions and tables editable. Recheck pagination after changing content or fonts.'
    }
  }
}

const heading = (value, level = 1, style) => ({ type: 'heading', level, ...(style ? { style } : {}), text: value })
const paragraph = (value, style) => ({ type: 'paragraph', ...(style ? { style } : {}), text: value })
const list = (items, ordered = false) => ({ type: 'list', ordered, items })
const valueList = (value, defaults) => Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : clone(defaults)

const EXAMPLES = {
  product: {
    title: 'Product overview', subtitle: 'Audience, capability and supported scope',
    introduction: 'This editable example organizes a product offering around the reader’s needs. Replace the example text with verified product details and real screenshots before sharing it externally.',
    summaryTitle: 'Explain the outcome',
    summary: 'Begin with the task the product helps someone complete. Describe the input, the user’s action and the resulting output in language the intended reader uses.',
    summaryItems: ['Name the intended users and the work they need to complete.', 'Describe current capabilities and identify configuration or environment requirements.', 'Use evidence to support compatibility, results and delivery claims.'],
    detailTitle: 'Describe one product', productName: 'Product name',
    detail: 'Give this product a specific purpose. Explain how someone starts, what they do and what they receive. Keep implementation details only where they help the reader assess fit.',
    scope: 'State supported inputs, outputs and integration boundaries. Distinguish an available capability from a proposed extension or an environment-dependent configuration.',
    steps: ['Prepare a representative input.', 'Complete the main workflow.', 'Review the output and confirm the supported destination.'],
    comparisonTitle: 'Compare the available options',
    comparison: { headers: ['Criterion', 'Option A', 'Option B'], rows: [['Intended user', 'Describe the primary user.', 'Describe the alternative user.'], ['Input and output', 'State supported formats.', 'State supported formats.'], ['Configuration', 'Describe what must be configured.', 'Describe what must be configured.'], ['Evidence', 'Link a verified demonstration.', 'Link a verified demonstration.']] },
    closingTitle: 'Define the next conversation',
    closing: 'Use a representative document or workflow to confirm fit. Agree the required output, the receiving environment and the evidence needed to review the result.',
    nextSteps: ['Identify one priority workflow.', 'Supply representative inputs and receiving-system requirements.', 'Agree the review criteria and the next decision.']
  },
  report: {
    title: 'Project report', subtitle: 'Findings, evidence and next steps',
    introduction: 'This editable example provides a report structure for a defined piece of work. Replace instructions with the actual scope, evidence, findings and decisions; do not invent results to fill the layout.',
    summaryTitle: 'State the principal finding',
    summary: 'Lead with what the evidence supports and why it matters to the reader. Explain the period and scope examined, then separate observations from interpretation.',
    summaryItems: ['State the scope and the question examined.', 'Identify the evidence that supports each finding.', 'Explain remaining uncertainty and what would resolve it.'],
    detailTitle: 'Explain a workstream', productName: 'Workstream or finding',
    detail: 'Describe the work performed, the evidence gathered and the resulting finding. Include enough method detail for the reader to assess the conclusion without reproducing every implementation step.',
    scope: 'Name the boundaries of the evidence. Record relevant exclusions and explain whether the finding can be generalized beyond the material examined.',
    steps: ['Identify the source material and period.', 'Explain the analysis or verification.', 'Connect the result to a decision or follow-up action.'],
    comparisonTitle: 'Compare findings and implications',
    comparison: { headers: ['Area', 'Evidence to include', 'Implication to explain'], rows: [['Main finding', 'Relevant observation or measurement.', 'What changes because of it.'], ['Alternative explanation', 'Evidence for and against it.', 'What remains uncertain.'], ['Limitation', 'Material not examined or unresolved.', 'How the conclusion is bounded.'], ['Next step', 'The check or decision required.', 'Owner and timing when known.']] },
    closingTitle: 'Record decisions and follow-up',
    closing: 'Separate decisions already made from recommendations awaiting a decision. Assign owners and dates only when they have been agreed.',
    nextSteps: ['Confirm the principal finding with the responsible reviewer.', 'Record the decision and its supporting evidence.', 'Assign the remaining action when its owner and timing are known.']
  },
  brief: {
    title: 'Decision brief', subtitle: 'Context, options and a proposed next step',
    introduction: 'This editable example supports a specific decision. Replace the example content with the actual question, options, evidence and recommendation; keep assumptions visible.',
    summaryTitle: 'Name the decision needed',
    summary: 'Explain what must be decided, why the decision is needed now and what outcome matters. Keep the scope narrow enough for the reader to act.',
    summaryItems: ['State the decision and the decision maker’s role.', 'Explain the criteria that distinguish the options.', 'Identify the recommendation and any conditions attached to it.'],
    detailTitle: 'Describe the proposed approach', productName: 'Proposed approach',
    detail: 'Explain how the approach would work and which need it addresses. Use future or conditional language for work that has not been carried out.',
    scope: 'Identify what is included in the decision and what remains a later choice. Distinguish confirmed constraints from assumptions requiring validation.',
    steps: ['Confirm the decision criteria.', 'Evaluate the available options against those criteria.', 'Record the decision, conditions and next action.'],
    comparisonTitle: 'Compare the alternatives',
    comparison: { headers: ['Criterion', 'Option A', 'Option B'], rows: [['Expected outcome', 'Describe the intended result.', 'Describe the intended result.'], ['Effort and dependencies', 'Use confirmed estimates or mark them unknown.', 'Use confirmed estimates or mark them unknown.'], ['Trade-off', 'Explain the principal limitation.', 'Explain the principal limitation.'], ['Evidence needed', 'Name the remaining validation.', 'Name the remaining validation.']] },
    closingTitle: 'Make the decision reviewable',
    closing: 'Present the proposed next action with its conditions. State which information would change the recommendation and who should review it.',
    nextSteps: ['Confirm the preferred option or request the missing evidence.', 'Record conditions and unresolved assumptions.', 'Assign the next action and review date when agreed.']
  }
}

const contactLines = (contact) => {
  if (!contact || typeof contact !== 'object') return []
  return ['name', 'role', 'organization', 'email', 'telephone', 'website', 'address']
    .map((key) => clean(contact[key]))
    .filter((value) => value && !/\[[^\]]+\]/.test(value))
}

/**
 * Six complete, editable example pages. Values replace content, not identity. All user-supplied
 * factual claims remain the caller's content; defaults make no claims of previous client work.
 * The default figure is visibly labelled as a placeholder rather than an invented screenshot.
 */
export const publicationModel = (brand, { paper = 'letter', purpose = 'product', values = {} } = {}) => {
  const descriptor = purposeOf(purpose)
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new TypeError('Publication values must be an object.')
  const profile = documentProfile(brand, { paper })
  const example = EXAMPLES[purpose]
  const title = text(values.title, example.title)
  const subtitle = text(values.subtitle, example.subtitle)
  const edition = text(values.edition, 'Editable example')
  const contentWidth = profile.paper.widthMm - profile.margins.leftMm - profile.margins.rightMm
  const suppliedFigure = values.figure && typeof values.figure === 'object' ? values.figure : null
  const figure = {
    type: 'figure',
    ...(suppliedFigure?.src ? { src: text(suppliedFigure.src), placeholder: false } : { placeholder: true }),
    alt: text(suppliedFigure?.alt, suppliedFigure?.src ? 'Supplied evidence image' : 'Screenshot placeholder — replace with an actual capture'),
    caption: text(suppliedFigure?.caption, suppliedFigure?.src ? 'Supplied image. Add source, context and the visible result before publication.' : 'Screenshot placeholder. Add a real capture and explain the visible action or result.'),
    widthMm: Math.min(contentWidth, positive(suppliedFigure?.widthMm, contentWidth, 'figure widthMm')),
    heightMm: positive(suppliedFigure?.heightMm, 88, 'figure heightMm')
  }
  if (text(suppliedFigure?.provenance)) {
    figure.provenance = text(suppliedFigure.provenance)
    figure.caption += ` Source: ${figure.provenance}`
  }
  const comparison = values.comparison ?? example.comparison
  if (!Array.isArray(comparison.headers) || !comparison.headers.length || !Array.isArray(comparison.rows) || comparison.rows.some((row) => !Array.isArray(row) || row.length !== comparison.headers.length)) throw new TypeError('A comparison needs headers and rows with matching column counts.')
  const contacts = contactLines(values.contact)
  const pages = [
    { id: 'cover', kind: 'cover', title, blocks: [
      paragraph(`${brand.name} · ${descriptor.label}`, 'label'), heading(title, 1, 'title'), paragraph(subtitle, 'subtitle'), paragraph(edition, 'label'),
      paragraph(text(values.introduction, example.introduction)),
      ...(profile.status.historical ? [paragraph(profile.status.note, 'caption'), paragraph(profile.status.extension, 'caption')] : [])
    ] },
    { id: 'content', kind: 'content', title: text(values.summaryTitle, example.summaryTitle), blocks: [
      heading(text(values.summaryTitle, example.summaryTitle)), paragraph(text(values.summary, example.summary)),
      heading('What to include', 2), list(valueList(values.summaryItems, example.summaryItems)),
      paragraph('Keep the opening useful on its own. A reader should understand the scope and the main point before reaching the detailed pages.')
    ] },
    { id: 'product', kind: 'product', title: text(values.detailTitle, example.detailTitle), blocks: [
      heading(text(values.detailTitle, example.detailTitle)), heading(text(values.productName, example.productName), 2),
      paragraph(text(values.detail, example.detail)), heading('Workflow', 2), list(valueList(values.steps, example.steps), true),
      heading('Scope and requirements', 2), paragraph(text(values.scope, example.scope))
    ] },
    { id: 'screenshot', kind: 'screenshot', title: text(values.evidenceTitle, 'Show the evidence'), blocks: [
      heading(text(values.evidenceTitle, 'Show the evidence')), paragraph(text(values.evidenceIntroduction, 'Choose one image that helps the reader understand an action, a result or the evidence behind a claim. Keep the relevant labels legible at the final document size.')),
      figure, heading('What the reader should notice', 2), paragraph(text(values.evidenceExplanation, 'Explain the part of the image that supports the surrounding text. Distinguish a live application capture from a sample, a diagram or a proposed design.'))
    ] },
    { id: 'comparison', kind: 'comparison', title: text(values.comparisonTitle, example.comparisonTitle), blocks: [
      heading(text(values.comparisonTitle, example.comparisonTitle)), paragraph(text(values.comparisonIntroduction, 'Use the same criteria for each option. State unknowns directly rather than filling gaps with assumptions.')),
      { type: 'table', headers: comparison.headers.map(String), rows: comparison.rows.map((row) => row.map(String)), ...(comparison.widths ? { widths: clone(comparison.widths) } : {}), caption: text(comparison.caption, 'Example comparison structure. Replace the instructional cells with supported information.') },
      paragraph(text(values.comparisonConclusion, 'Explain which difference matters to the decision. A table should support the conclusion rather than replace its reasoning.'))
    ] },
    { id: 'closing', kind: 'closing', title: text(values.closingTitle, example.closingTitle), blocks: [
      heading(text(values.closingTitle, example.closingTitle)), paragraph(text(values.closing, example.closing)),
      heading('Next steps', 2), list(valueList(values.nextSteps, example.nextSteps), true),
      ...(contacts.length ? [heading('Contact', 2), ...contacts.map((line) => paragraph(line))] : []),
      heading('Document notes', 2), paragraph(text(values.notes, 'Keep the editable source with the shared PDF. Review headings, tables, image captions and page breaks after any content change.')),
      paragraph(profile.status.extension, 'caption'),
      ...(profile.status.historical ? [paragraph(profile.status.note, 'caption')] : [])
    ] }
  ]
  const model = { schema: 'brandkit/publication/1', id: `${brand.id}-${purpose}-${paper}`, title, subtitle, edition, purpose, paper, example: true, profile, logo: clone(profile.logo), status: clone(profile.status), pages }
  const problems = validatePublication(model)
  if (problems.length) throw new TypeError(problems.join(' '))
  return model
}

/**
 * Validate an editable publication before importing or exporting it. Return problems rather
 * than throwing so a JSON editor can keep the previous working document and explain the input.
 * Figure files must be embedded PNG/JPEG bytes; no network requests or executable SVG are needed.
 */
export const validatePublication = (publication) => {
  const problems = []
  const need = (condition, message) => { if (!condition) problems.push(message) }
  const object = (value) => value && typeof value === 'object' && !Array.isArray(value)
  const finite = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
  if (!object(publication)) return ['The publication must be an object.']
  need(publication.schema == null || publication.schema === 'brandkit/publication/1', 'Unsupported publication schema; use brandkit/publication/1.')
  need(typeof publication.title === 'string' && publication.title.trim(), 'The publication needs a title.')
  need(PAPERS[publication.paper], 'Publication paper must be letter or a4.')
  need(DOCUMENT_PURPOSES.some((entry) => entry.id === publication.purpose), 'Publication purpose must be product, report or brief.')
  const profile = publication.profile
  need(object(profile), 'The publication needs a document profile.')
  let contentWidth = 180
  let contentHeight = 250
  if (object(profile)) {
    const expected = PAPERS[publication.paper]
    need(object(profile.paper), 'The document profile needs paper dimensions.')
    if (object(profile.paper)) {
      need(profile.paper.id === publication.paper, 'Profile paper id must match publication paper.')
      need(finite(profile.paper.widthMm, 100, 500) && finite(profile.paper.heightMm, 100, 700), 'Profile paper dimensions must be finite physical sizes in millimetres.')
      if (expected) need(Math.abs(profile.paper.widthMm - expected.widthMm) < 0.1 && Math.abs(profile.paper.heightMm - expected.heightMm) < 0.1, 'Profile dimensions must match the selected paper size.')
    }
    need(object(profile.margins), 'The document profile needs margins.')
    if (object(profile.margins)) {
      for (const key of ['topMm', 'rightMm', 'bottomMm', 'leftMm']) need(finite(profile.margins[key], 0, 100), `Profile margin ${key} must be between 0 and 100 mm.`)
      contentWidth = (profile.paper?.widthMm ?? 0) - profile.margins.leftMm - profile.margins.rightMm
      contentHeight = (profile.paper?.heightMm ?? 0) - profile.margins.topMm - profile.margins.bottomMm
      need(contentWidth >= 50 && contentHeight >= 50, 'Profile margins must leave at least 50 mm of usable width and height.')
    }
    need(object(profile.typography), 'The document profile needs typography.')
    if (object(profile.typography)) {
      for (const key of ['title', 'subtitle', 'heading1', 'heading2', 'body', 'caption', 'table', 'label', 'footer']) {
        const style = profile.typography[key]
        need(object(style), `Missing typography style ${key}.`)
        if (!object(style)) continue
        need(typeof style.font === 'string' && style.font.length > 0, `Typography ${key} needs a font role.`)
        need(typeof style.family === 'string' && style.family.length > 0, `Typography ${key} needs a font family.`)
        need(finite(style.weight, 100, 1000), `Typography ${key} weight must be between 100 and 1000.`)
        need(finite(style.sizePt, 5, 120), `Typography ${key} size must be between 5 and 120 pt.`)
        need(finite(style.lineHeight, 0.8, 4), `Typography ${key} line height must be between 0.8 and 4.`)
        need(finite(style.spaceAfterPt, 0, 144), `Typography ${key} spacing must be between 0 and 144 pt.`)
        if (style.trackingEm != null) need(finite(style.trackingEm, -0.25, 1), `Typography ${key} tracking must be between -0.25 and 1 em.`)
      }
    }
    need(object(profile.colours), 'The document profile needs colours.')
    if (object(profile.colours)) for (const key of ['ink', 'muted', 'accent', 'paper', 'light', 'line', 'reverse']) need(/^#[0-9a-f]{6}$/i.test(profile.colours[key] ?? ''), `Profile colour ${key} must be a six-digit hex colour.`)
    need(object(profile.logo) && object(profile.logo?.options), 'The document profile needs preferred logo options.')
    if (object(profile.logo)) {
      need(finite(profile.logo.widthMm, 5, contentWidth), 'The preferred logo width must fit within the document content width.')
      need(finite(profile.logo.minimumWidthMm, 0, contentWidth), 'The preferred logo minimum width must fit within the document.')
      need(profile.logo.widthMm >= profile.logo.minimumWidthMm, 'The preferred logo is smaller than its stated minimum size.')
      if (profile.logo.clearSpaceMm != null) need(finite(profile.logo.clearSpaceMm, 0, 100), 'The preferred logo clear space must be a number between 0 and 100 mm.')
    }
    if (/^bc-(?:province-1977|hydro-1983)$/.test(profile.brandId ?? '')) {
      need(profile.status?.historical === true, 'Historical brands must retain their historical status.')
      need(/reconstruction/i.test(profile.status?.note ?? ''), 'Historical brands must retain a reconstruction note.')
      need(/modern.*layout/i.test(profile.status?.extension ?? ''), 'Historical brands must label the modern layout extension.')
    }
  }
  need(Array.isArray(publication.pages) && publication.pages.length > 0, 'The publication needs at least one page.')
  if (!Array.isArray(publication.pages)) return problems
  const pageIds = new Set()
  publication.pages.forEach((page, pageIndex) => {
    const at = `Page ${pageIndex + 1}`
    if (!object(page)) { problems.push(`${at} must be an object.`); return }
    need(typeof page.id === 'string' && page.id && !pageIds.has(page.id), `${at} needs a unique id.`)
    pageIds.add(page.id)
    need(LAYOUTS.some((layout) => layout.id === page.kind), `${at} has an unknown layout kind.`)
    need(Array.isArray(page.blocks), `${at} needs a blocks array.`)
    if (!Array.isArray(page.blocks)) return
    page.blocks.forEach((block, blockIndex) => {
      const where = `${at}, block ${blockIndex + 1}`
      if (!object(block)) { problems.push(`${where} must be an object.`); return }
      if (block.type === 'heading' || block.type === 'paragraph') {
        need(typeof block.text === 'string', `${where} needs text.`)
        if (block.type === 'heading' && block.level != null) need(Number.isInteger(block.level) && block.level >= 1 && block.level <= 3, `${where} heading level must be 1, 2 or 3.`)
      } else if (block.type === 'list') {
        need(Array.isArray(block.items) && block.items.every((item) => typeof item === 'string'), `${where} list items must be text.`)
        if (block.ordered != null) need(typeof block.ordered === 'boolean', `${where} ordered must be true or false.`)
      } else if (block.type === 'table') {
        const columns = Array.isArray(block.headers) ? block.headers.length : 0
        need(columns > 0 && block.headers.every((cell) => typeof cell === 'string'), `${where} table needs text headers.`)
        need(Array.isArray(block.rows) && block.rows.every((row) => Array.isArray(row) && row.length === columns && row.every((cell) => typeof cell === 'string' || (typeof cell === 'number' && Number.isFinite(cell)))), `${where} table rows must match the headers and contain text or finite numbers.`)
        if (block.widths != null) need(Array.isArray(block.widths) && block.widths.length === columns && block.widths.every((value) => finite(value, 0.001, 10000)), `${where} table widths must be positive relative weights matching the columns.`)
      } else if (block.type === 'figure') {
        for (const key of ['alt', 'caption', 'provenance']) if (block[key] != null) need(typeof block[key] === 'string', `${where} figure ${key} must be text.`)
        if (block.widthMm != null) need(finite(block.widthMm, 1, contentWidth), `${where} figure width must fit within the content width.`)
        if (block.heightMm != null) need(finite(block.heightMm, 1, contentHeight), `${where} figure height must fit within the content height.`)
        if (block.src) {
          const match = typeof block.src === 'string' && /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(block.src)
          need(match, `${where} figure must be an embedded PNG or JPEG data URL; external URLs and SVG are not accepted.`)
          if (match) {
            const bytes = match[2].length * 3 / 4 - (match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0)
            need(match[2].length % 4 === 0 && bytes <= 25 * 1024 * 1024, `${where} figure must contain valid base64 data no larger than 25 MB.`)
            try {
              const prefix = atob(match[2].slice(0, 24))
              const valid = match[1] === 'png' ? prefix.startsWith('\x89PNG\r\n\x1a\n') : prefix.startsWith('\xff\xd8\xff')
              need(valid, `${where} figure bytes do not match the declared image type.`)
            } catch { problems.push(`${where} figure contains invalid base64 data.`) }
          }
          need(typeof block.alt === 'string' && block.alt.trim(), `${where} figure needs alternative text.`)
        } else if (block.src != null) need(typeof block.src === 'string', `${where} empty figure src must be a string.`)
      } else problems.push(`${where} has an unknown block type.`)
    })
  })
  return problems
}

const mm = (value, fallbackUnit = 'px') => {
  const match = /^\s*([\d.]+)\s*(mm|cm|in|pt|px)?\s*$/.exec(String(value))
  if (!match) return null
  const amount = Number(match[1])
  return amount * ({ mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, px: 25.4 / 96 }[match[2] ?? fallbackUnit] ?? 1)
}
const round = (value) => Math.round(value * 100) / 100

/** Actual templates and physical sizes, for guides/catalogs rather than a second manual list. */
export const templateCatalogMetadata = (brand) => (brand.templates ?? []).map((template) => {
  const physical = template.physical ?? [template.width, template.height]
  const widthMm = mm(physical[0], template.unit ?? 'px')
  const heightMm = mm(physical[1], template.unit ?? 'px')
  const trim = template.print?.trim
  const sizeLabel = trim
    ? `${trim[0]} × ${trim[1]} ${template.print.unit ?? 'mm'} trim${template.print.bleed ? ` + ${template.print.bleed} ${template.print.unit ?? 'mm'} bleed` : ''}`
    : `${round(widthMm)} × ${round(heightMm)} mm`
  return { id: template.id, label: template.label ?? template.id, group: template.group ?? 'Templates', widthMm, heightMm, sizeLabel, ...(template.print ? { print: clone(template.print) } : {}), extension: template.extension ?? null }
})

/**
 * Additional document entries only. Existing brand.documents are not copied or changed. The
 * virtual publication descriptors are handled before normal template lookup by the exporter.
 */
export const documentationDocumentsFor = (brand) => {
  const declared = new Set((brand.documents ?? []).map((entry) => entry.id))
  const used = new Set((brand.documents ?? []).flatMap((entry) => entry.pages ?? []))
  const publications = DOCUMENT_PURPOSES.flatMap((purpose) => Object.values(PAPERS).map((paper) => ({
    id: `publication-${purpose.id}-${paper.id}`, label: `${purpose.label} · ${paper.label}`, format: 'docx', publication: true, purpose: purpose.id, paper: paper.id, extension: 'documentation-system'
  }))).filter((entry) => !declared.has(entry.id))
  const letterheads = (brand.templates ?? []).filter((template) => /letterhead/i.test(`${template.id} ${template.label ?? ''}`) && !/continuation/i.test(`${template.id} ${template.label ?? ''}`) && !used.has(template.id) && !declared.has(template.id))
    .map((template) => ({ id: template.id, label: template.label ?? 'Letterhead', format: 'docx', pages: [template.id], extension: 'documentation-system' }))
  return [...publications, ...letterheads]
}

/** Structured usage guide, suitable for a UI, JSON export or source-facing documentation. */
export const documentationGuide = (brand, { paper = 'letter' } = {}) => {
  const profile = documentProfile(brand, { paper })
  const source = SOURCE_GENERATORS[brand.id]
  const name = text(brand.name)
  return {
    schema: 'brandkit/documentation/1', brandId: brand.id, name, version: text(brand.displayVersion ?? brand.version),
    shareUrl: `https://projects.ahmadjalil.com/brandkit/?brand=${encodeURIComponent(brand.id)}&share=1`,
    documentsUrl: `https://projects.ahmadjalil.com/brandkit/?brand=${encodeURIComponent(brand.id)}&share=1&view=documents`,
    profile, preferredLogo: clone(profile.logo), status: clone(profile.status), rules: clone(profile.rules),
    assetAvailability: {
      scope: 'Logo paths describe formats generated by the complete kit; a focused pack contains only its selected formats.',
      catalog: 'web/asset-catalog.json', index: 'index.html', graphicPdfPacks: ['print', 'complete'],
      note: 'Use the package catalog to confirm which files are present. Word documents embed their logo; standalone PNG assets depend on the pack and rendering options.'
    },
    fonts: Object.entries(brand.fonts ?? {}).map(([role, face]) => ({ role, family: face.family, weight: face.weight ?? 400, file: face.file ?? null, office: face.office ?? null, licence: 'Respect the licence supplied with the font files and any embedding restrictions.' })),
    catalog: templateCatalogMetadata(brand), layouts: publicationLayouts(), purposes: clone(DOCUMENT_PURPOSES),
    documents: [...clone(brand.documents ?? []), ...documentationDocumentsFor(brand)],
    source: {
      definition: `brands/${brand.id}/brand.json`, generated: Boolean(source),
      generators: clone(source?.files ?? []), command: source?.command ?? null,
      usageGuideCommand: 'node scripts/brands/documentation.mjs',
      note: source
        ? 'In this repository, edit the generator inputs and rerun the listed command; direct changes to the generated brand.json may be overwritten. In an exported standalone kit, source/brand.json is the editable definition.'
        : 'Edit the brand definition, preserve a previous version, and rebuild the kit.',
      override: 'Optional brand.documentation changes document applications only. Persist repository overrides in the brand generator; keep publication content in its own source model.'
    }
  }
}

const mdCell = (value) => String(value ?? '').replaceAll('|', '\\|').replace(/[\r\n]+/g, ' ')

/** Generated source/kit use guide. It does not invent contacts or repeat stale asset counts. */
export const documentationMarkdown = (brand, options = {}) => {
  const guide = documentationGuide(brand, options)
  const { profile } = guide
  const fontRows = ['title', 'heading1', 'body', 'caption', 'table'].map((role) => {
    const face = profile.typography[role]
    return `| ${role} | ${mdCell(face.family)} | ${face.weight} | ${face.sizePt} pt | ${face.lineHeight} |`
  }).join('\n')
  const catalogRows = guide.catalog.map((entry) => `| ${mdCell(entry.label)} | ${mdCell(entry.sizeLabel)} | ${mdCell(entry.id)} |`).join('\n')
  return `# Using ${guide.name} in documents

<!-- Generated by scripts/brands/documentation.mjs. Edit the source definition or document rules, then regenerate. -->

[Open this brand](${guide.shareUrl}) · [Open document examples](${guide.documentsUrl})

Identity version ${guide.version}. Document application version ${DOCUMENTATION_VERSION}.

${guide.status.note}

${guide.status.extension}. These publication layouts do not replace or redraw the identity artwork.${guide.status.historical ? ' They are contemporary examples for reference, not historical originals or current official documents.' : ''}

## Start with the supplied assets

The complete brand kit generates \`${guide.preferredLogo.assets.svg}\` for vector placement, \`${guide.preferredLogo.assets.png}\` for Word-compatible raster placement, and \`${guide.preferredLogo.assets.pdf}\` for a vector proof. The repository generates these paths from \`brands/${brand.id}/brand.json\`.

Focused packs contain selected formats. Check \`${guide.assetAvailability.catalog}\` or the package’s \`${guide.assetAvailability.index}\` before using a path; these files list what was actually exported. Word documents embed their logo, while standalone PNG availability depends on the selected pack and rendering options. Choose the **Send to a printer** or **Complete brand kit** pack with graphic PDFs enabled when a separate vector PDF is required.

The preferred logo is ${guide.preferredLogo.options.signature ? `the supplied ${guide.preferredLogo.options.signature} signature` : `the ${guide.preferredLogo.options.layout} ${guide.preferredLogo.options.family} lockup`}. Keep its proportions. Minimum width: ${guide.preferredLogo.minimumWidthMm} mm. ${guide.preferredLogo.clearSpaceRule} The document profile adds ${guide.preferredLogo.clearSpaceMm} mm of layout spacing; the identity clear-space rule remains authoritative.

Artwork provenance: ${guide.preferredLogo.provenance.source || guide.preferredLogo.provenance.note}

## Document styles

The examples support US Letter and A4. This profile uses ${profile.paper.label} (${profile.paper.widthMm} × ${profile.paper.heightMm} mm), with ${profile.margins.topMm}/${profile.margins.rightMm}/${profile.margins.bottomMm}/${profile.margins.leftMm} mm top/right/bottom/left margins. Text and tables remain editable in Word. The printable HTML uses the same content model.

| Style | Family | Weight | Size | Line height |
| --- | --- | --- | --- | --- |
${fontRows}

Install the supplied fonts before editing outside the kit. The existing Word exporter embeds eligible fonts; a face with an explicit Office substitution uses that declared installed face. Font files and their licences remain in the kit.

${profile.rules.print}

Document colours: ink ${profile.colours.ink}; muted ${profile.colours.muted}; accent ${profile.colours.accent}; paper ${profile.colours.paper}; lines ${profile.colours.line}.

## Screenshots and figures

${profile.rules.screenshots} ${profile.rules.captions} Crop to the relevant region without hiding information needed to interpret the image. Verify labels at the final printed size. A screenshot placeholder is not evidence of a working feature.

## Write for the document purpose

${guide.purposes.map((purpose) => `- **${purpose.label}:** ${purpose.description}`).join('\n')}

${profile.rules.copy} ${profile.rules.contact} Product copy describes an offering; case-study language requires evidence of the work described. Historical identity examples keep their reconstruction and modern-layout labels.

## Six reusable layouts

${guide.layouts.map((layout) => `- **${layout.label}:** ${layout.description}`).join('\n')}

The sample model contains instructional content and a labelled screenshot placeholder. Replace its content through \`publicationModel(brand, { paper, purpose, values })\`, or edit the exported publication JSON. Keep this source model alongside the editable Word master and shared PDF.

## Existing template catalog

These sizes come from the template definitions rather than a separately maintained list. The six publication layouts above are additional document applications.

| Template | Physical size | Source id |
| --- | --- | --- |
${catalogRows}

## Supported edit path

${guide.source.note}

${guide.source.generators.length ? `Repository generator inputs: ${guide.source.generators.map((path) => `\`${path}\``).join(', ')}. Rebuild with \`${guide.source.command}\`.\n\n` : ''}${guide.source.override}

Regenerate these use guides with \`${guide.source.usageGuideCommand}\`. ${profile.rules.editing} Check every final page after changing fonts, images, tables or content. The output from one format does not by itself verify the other.
`
}
