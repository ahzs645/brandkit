// A brand's publication system: designed documents and slides as data in brand.json (`publications`),
// written by document-kit (src/export/designed-publication.js) as Word, PDF and HTML from one document.
//
//   publications: {
//     label?, status?, summary?, style?, home?: { name?, point: [longitude, latitude] },
//     grounds?: [{ id, name, colour, tint?, amount?, status?, summary? }],
//     styles: [{ id, name, label?, status?, summary?, ground?, cover, page, close }],
//     kinds:  [{ id, name, format: 'page' | 'slide', paper?, orientation?, skeleton, description? }],
//     documents?: [{ id, kind, label?, style?, product?, title, short?, edition?, status?, seed?, sections?, pages }]
//   }
//
// A style is three parts, each a design brandkit draws and a plate:
//   cover  { design: 'sheet' | 'band' | 'field', plate?, ground? }       the first page or title slide
//   page   { running: 'title-block' | 'bar' | 'dot-index' | 'plain', look: 'ruled' | 'solid' | 'card', table?, mark?: 'symbol' }
//   close  { design: 'sheet' | 'band' | 'field' | 'night', plate? }      the closing page or slide
// A plate is { type: 'contour' | 'profile' | 'field' | 'dots', motif?, seed?, reach?, routes? } (plates.js).
// See docs/brand-schema.md, "Publication system".

import { colour } from './brand.js'
import { productsOf } from './products.js'
import { DOT_MOTIFS, PLATE_TYPES, mixHex } from './plates.js'
import { blockProblems, blockSources } from './publication-blocks.js'
import { TABLE_STYLES } from './documentation.js'

export const COVER_DESIGNS = Object.freeze(['sheet', 'band', 'field'])
export const CLOSE_DESIGNS = Object.freeze(['sheet', 'band', 'field', 'night'])
export const RUNNING_DESIGNS = Object.freeze(['title-block', 'bar', 'dot-index', 'plain'])
export const BLOCK_LOOKS = Object.freeze(['ruled', 'solid', 'card'])
export const PAGE_LAYOUTS = Object.freeze(['cover', 'content', 'closing'])
export const KIND_FORMATS = Object.freeze(['page', 'slide'])

/** Paper a kind can name, in points, portrait: a slide is 16:9 at 20 × 11.25 in (1920 × 1080 px at 96 dpi). */
export const PUBLICATION_PAPERS = Object.freeze({
  letter: { id: 'letter', label: 'US Letter', width: 612, height: 792 },
  a4: { id: 'a4', label: 'A4', width: 595.28, height: 841.89 },
  slide: { id: 'slide', label: 'Slide 16:9', width: 810, height: 1440 }
})

/** Kinds every brand has, when it defines none: what a publication system is made of. */
export const DEFAULT_KINDS = Object.freeze([
  { id: 'white-paper', name: 'White paper', format: 'page', paper: 'letter', skeleton: ['cover', 'content', 'content', 'closing'], description: 'A long argument with evidence: cover, sections, references and a closing offer.' },
  { id: 'catalog', name: 'Catalog', format: 'page', paper: 'letter', skeleton: ['cover', 'content', 'content', 'closing'], description: 'Capabilities listed by group, with contents and a closing page.' },
  { id: 'brochure', name: 'Brochure', format: 'page', paper: 'letter', skeleton: ['cover', 'content', 'content'], description: 'A short, illustrated overview.' },
  { id: 'product-sheet', name: 'Product sheet', format: 'page', paper: 'letter', skeleton: ['sheet'], description: 'One page: the lockup, the offer and a next step.' },
  { id: 'briefing', name: 'Briefing letter', format: 'page', paper: 'letter', skeleton: ['cover', 'content', 'closing'], description: 'An internal decision briefing from the company itself.' },
  { id: 'presentation', name: 'Presentation', format: 'slide', paper: 'slide', orientation: 'landscape', skeleton: ['cover', 'content', 'content', 'closing'], description: '16:9 slides, one a page, in PDF, Word and HTML.' }
])

const object = (value) => value && typeof value === 'object' && !Array.isArray(value)
const text = (value) => typeof value === 'string' && value.trim().length > 0
const ID = /^[a-z0-9][a-z0-9-]*$/
const HEX = /^#[0-9a-f]{6}$/i

/** The brand's publication system, or null. */
export const publicationsOf = (brand) => (object(brand?.publications) ? brand.publications : null)
export const hasPublications = (brand) => Boolean(publicationsOf(brand)?.styles?.length)
export const publicationStyles = (brand) => (publicationsOf(brand)?.styles ?? []).filter(object)
export const publicationKinds = (brand) => {
  const own = publicationsOf(brand)?.kinds
  return Array.isArray(own) && own.length ? own.filter(object) : DEFAULT_KINDS.map((kind) => ({ ...kind }))
}
export const publicationDocuments = (brand) => (publicationsOf(brand)?.documents ?? []).filter(object)
export const publicationStyle = (brand, id) => {
  const styles = publicationStyles(brand)
  const wanted = id ?? publicationsOf(brand)?.style
  return styles.find((entry) => entry.id === wanted) ?? styles[0] ?? null
}
export const publicationKind = (brand, id) => publicationKinds(brand).find((entry) => entry.id === id) ?? null

/** A ground's colour: a palette colour or role, or a tint of one (`amount` percent of `tint` in `colour`). */
export const groundColour = (brand, ground) => {
  const base = colour(brand, ground.colour ?? 'paper')
  if (!ground.tint) return base
  return mixHex(colour(brand, ground.tint), base, Number(ground.amount ?? 0) / 100)
}

const plateProblems = (plate, where, brand) => {
  const problems = []
  const need = (condition, message) => { if (!condition) problems.push(`${where}: ${message}`) }
  if (plate == null) return problems
  if (!object(plate)) return [`${where}: a plate must be an object.`]
  need(PLATE_TYPES.includes(plate.type), `plate type \`${plate.type}\` is not one of ${PLATE_TYPES.join(', ')}.`)
  if (plate.type === 'dots') {
    need(plate.motif == null || DOT_MOTIFS.includes(plate.motif), `motif \`${plate.motif}\` is not one of ${DOT_MOTIFS.join(', ')}.`)
    need(Array.isArray(brand.symbol?.centres) && brand.symbol.centres.length > 0, 'a dots plate needs a symbol drawn as circles (`symbol.centres`).')
  }
  if (plate.seed != null) need(Number.isInteger(plate.seed), 'seed must be a whole number.')
  if (plate.reach != null) need(typeof plate.reach === 'number' && plate.reach > 0 && plate.reach <= 1, 'reach must be a number from 0 to 1.')
  if (plate.points != null) need(Array.isArray(plate.points) && plate.points.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)), 'points are [longitude, latitude] pairs.')
  return problems
}

/** What a closing page's contact person may give. */
const CONTACT_KEYS = ['name', 'role', 'org', 'email', 'phone']

/** Problems with a page of a designed document, as the writer reads it. */
const pageProblems = (page, where, { sections, format, widthMm, heightMm }) => {
  const problems = []
  const need = (condition, message) => { if (!condition) problems.push(`${where} ${message}`) }
  if (!object(page)) return [`${where} must be an object.`]
  need(PAGE_LAYOUTS.includes(page.layout), `layout must be ${PAGE_LAYOUTS.join(', ')}.`)
  for (const key of ['kicker', 'title', 'subtitle', 'text', 'fine', 'signoff', 'note', 'section']) if (page[key] != null) need(typeof page[key] === 'string', `${key} must be text.`)
  // A closing page's contact: a line of text, or a person to write to (a client document's contact page).
  if (page.contact != null) {
    if (object(page.contact)) {
      need(page.layout === 'closing', 'contact as a person belongs on a closing page.')
      need(text(page.contact.name), 'contact needs a name.')
      for (const key of Object.keys(page.contact)) need(CONTACT_KEYS.includes(key), `contact has an unknown field “${key}” (${CONTACT_KEYS.join(', ')}).`)
      for (const key of CONTACT_KEYS) if (page.contact[key] != null) need(typeof page.contact[key] === 'string', `contact ${key} must be text.`)
    } else need(typeof page.contact === 'string', 'contact must be text, or a person: { name, role, org, email, phone }.')
  }
  if (page.section != null && sections?.length) need(sections.includes(page.section), `names section “${page.section}”, which the document does not list.`)
  for (const key of ['lines', 'meta']) if (page[key] != null) need(Array.isArray(page[key]) && page[key].every((line) => typeof line === 'string'), `${key} must be lines of text.`)
  if (page.asks != null) need(Array.isArray(page.asks) && page.asks.length <= 4 && page.asks.every((ask) => Array.isArray(ask) && ask.length === 2 && ask.every((item) => typeof item === 'string')), 'asks are up to four [label, text] pairs.')
  if (page.hero != null) need(object(page.hero) && typeof page.hero.src === 'string', 'hero needs a src.')
  if (page.layout === 'cover' || page.layout === 'closing') need(text(page.title), 'needs a title.')
  if (page.layout === 'content') {
    need(Array.isArray(page.blocks), 'needs a blocks array.')
    if (format === 'slide') need(text(page.title), 'needs a title (a slide’s heading).')
    for (const [index, block] of (page.blocks ?? []).entries()) problems.push(...blockProblems(block, `${where}, block ${index + 1}`, { widthMm, heightMm }))
  }
  return problems
}

/** Problems with one designed document, given the brand (its kinds, styles and products). */
export const publicationDocumentProblems = (brand, doc, where = `Publication \`${doc?.id ?? '?'}\``) => {
  const problems = []
  const need = (condition, message) => { if (!condition) problems.push(`${where}: ${message}`) }
  if (!object(doc)) return [`${where} must be an object.`]
  need(typeof doc.id === 'string' && ID.test(doc.id), '`id` must be lower-case letters, digits and hyphens.')
  const kind = publicationKind(brand, doc.kind)
  need(kind, `kind \`${doc.kind}\` is not one of the brand's publication kinds.`)
  if (doc.style != null) need(publicationStyles(brand).some((entry) => entry.id === doc.style), `style \`${doc.style}\` is not one of the brand's publication styles.`)
  if (doc.product != null) need(productsOf(brand).some((entry) => entry.id === doc.product), `product \`${doc.product}\` is not in \`products.items\`.`)
  need(text(doc.title), 'needs a title.')
  for (const key of ['label', 'short', 'edition', 'status']) if (doc[key] != null) need(typeof doc[key] === 'string', `\`${key}\` must be text.`)
  if (doc.sections != null) need(Array.isArray(doc.sections) && doc.sections.every((entry) => typeof entry === 'string'), '`sections` must be text.')
  if (doc.seed != null) need(Number.isInteger(doc.seed), '`seed` must be a whole number.')
  need(Array.isArray(doc.pages) && doc.pages.length > 0, 'needs at least one page.')
  if (!kind || !Array.isArray(doc.pages)) return problems
  const paper = PUBLICATION_PAPERS[kind.paper ?? (kind.format === 'slide' ? 'slide' : 'letter')]
  const landscape = kind.format === 'slide' || kind.orientation === 'landscape'
  const [w, h] = landscape ? [paper.height, paper.width] : [paper.width, paper.height]
  const ptMm = 25.4 / 72
  doc.pages.forEach((page, index) => problems.push(...pageProblems(page, `${where}, page ${index + 1}`, { sections: doc.sections, format: kind.format, widthMm: w * ptMm, heightMm: h * ptMm })))
  return problems
}

/** Structural checks of `brand.publications`, as validateBrand reports them. */
export const publicationsProblems = (brand) => {
  const spec = brand?.publications
  if (spec == null) return []
  if (!object(spec)) return ['`publications` must be an object.']
  const problems = []
  const need = (condition, message) => { if (!condition) problems.push(message) }
  const unique = (list, what) => {
    const seen = new Set()
    for (const entry of list) {
      need(object(entry) && typeof entry.id === 'string' && ID.test(entry.id), `${what} \`${entry?.id ?? '?'}\`: \`id\` must be lower-case letters, digits and hyphens.`)
      need(!seen.has(entry?.id), `${what} \`${entry?.id}\` is listed twice.`)
      seen.add(entry?.id)
    }
    return seen
  }
  const isColour = (value) => HEX.test(colour(brand, value) ?? '')
  const grounds = unique(Array.isArray(spec.grounds) ? spec.grounds : [], 'Ground')
  for (const ground of spec.grounds ?? []) {
    need(text(ground?.name), `Ground \`${ground?.id}\` needs a name.`)
    need(isColour(ground?.colour ?? 'paper'), `Ground \`${ground?.id}\`: \`colour\` must be a palette colour, a role or a hex value.`)
    if (ground?.tint != null) {
      need(isColour(ground.tint), `Ground \`${ground.id}\`: \`tint\` must be a palette colour, a role or a hex value.`)
      need(typeof ground.amount === 'number' && ground.amount >= 0 && ground.amount <= 100, `Ground \`${ground.id}\`: \`amount\` is a percentage, 0 to 100.`)
    }
  }
  need(Array.isArray(spec.styles) && spec.styles.length > 0, '`publications.styles` needs at least one style.')
  const styles = unique(Array.isArray(spec.styles) ? spec.styles : [], 'Publication style')
  for (const style of Array.isArray(spec.styles) ? spec.styles : []) {
    const at = `Publication style \`${style?.id ?? '?'}\``
    if (!object(style)) continue
    need(text(style.name), `${at} needs a name.`)
    if (style.ground != null) need(grounds.has(style.ground) || isColour(style.ground), `${at}: ground \`${style.ground}\` is neither a ground in \`publications.grounds\` nor a colour.`)
    need(object(style.cover) && COVER_DESIGNS.includes(style.cover.design), `${at}: \`cover.design\` must be ${COVER_DESIGNS.join(', ')}.`)
    need(object(style.page) && RUNNING_DESIGNS.includes(style.page.running), `${at}: \`page.running\` must be ${RUNNING_DESIGNS.join(', ')}.`)
    need(object(style.page) && BLOCK_LOOKS.includes(style.page.look ?? 'ruled'), `${at}: \`page.look\` must be ${BLOCK_LOOKS.join(', ')}.`)
    if (style.page?.table != null) need(TABLE_STYLES.includes(style.page.table), `${at}: \`page.table\` must be ${TABLE_STYLES.join(', ')}.`)
    if (style.page?.mark != null) need(style.page.mark === 'symbol', `${at}: \`page.mark\` must be \`symbol\`.`)
    need(object(style.close) && CLOSE_DESIGNS.includes(style.close.design), `${at}: \`close.design\` must be ${CLOSE_DESIGNS.join(', ')}.`)
    problems.push(...plateProblems(style.cover?.plate, `${at}, cover`, brand), ...plateProblems(style.close?.plate, `${at}, close`, brand))
  }
  if (spec.style != null) need(styles.has(spec.style), `\`publications.style\` names style \`${spec.style}\`, which is not in \`publications.styles\`.`)
  if (spec.kinds != null) {
    need(Array.isArray(spec.kinds), '`publications.kinds` must be a list.')
    unique(Array.isArray(spec.kinds) ? spec.kinds : [], 'Publication kind')
    for (const kind of Array.isArray(spec.kinds) ? spec.kinds : []) {
      const at = `Publication kind \`${kind?.id ?? '?'}\``
      if (!object(kind)) continue
      need(text(kind.name), `${at} needs a name.`)
      need(KIND_FORMATS.includes(kind.format), `${at}: \`format\` must be page or slide.`)
      need(kind.paper == null || PUBLICATION_PAPERS[kind.paper], `${at}: \`paper\` must be ${Object.keys(PUBLICATION_PAPERS).join(', ')}.`)
      need(kind.format !== 'slide' || (kind.paper ?? 'slide') === 'slide', `${at}: slides are 16:9 (\`paper: "slide"\`).`)
      need(kind.orientation == null || ['portrait', 'landscape'].includes(kind.orientation), `${at}: \`orientation\` must be portrait or landscape.`)
      need(Array.isArray(kind.skeleton) && kind.skeleton.length > 0 && kind.skeleton.every((entry) => [...PAGE_LAYOUTS, 'sheet'].includes(entry)), `${at}: \`skeleton\` lists cover, content, sheet or closing pages.`)
    }
  }
  if (spec.home != null) need(object(spec.home) && Array.isArray(spec.home.point) && spec.home.point.length === 2 && spec.home.point.every(Number.isFinite), '`publications.home.point` must be [longitude, latitude].')
  if (spec.documents != null) {
    need(Array.isArray(spec.documents), '`publications.documents` must be a list.')
    unique(Array.isArray(spec.documents) ? spec.documents : [], 'Publication')
    for (const doc of Array.isArray(spec.documents) ? spec.documents : []) problems.push(...publicationDocumentProblems(brand, doc))
  }
  return problems
}

/** Every file a designed document's figures read from the brand. */
export const publicationAssets = (doc) => [...new Set([
  ...(doc?.pages ?? []).flatMap((page) => [...blockSources(page.blocks ?? []), ...(page.hero?.src ? [page.hero.src] : [])])
].filter((src) => !String(src).startsWith('data:')))]

/**
 * Everything the writer needs to know about a document, resolved against the brand: its kind and
 * page size in points, its style's parts, the owner (a product, or the company itself) and the
 * colours: `accent`, `accentText` (on light grounds), `accentDark` (on dark grounds) and the ground.
 */
export const resolvePublication = (brand, doc, { style: styleId } = {}) => {
  const problems = publicationDocumentProblems(brand, doc)
  if (problems.length) throw new Error(`Invalid publication: ${problems.join(' ')}`)
  const kind = publicationKind(brand, doc.kind)
  const style = publicationStyle(brand, styleId ?? doc.style)
  if (!style) throw new Error(`${brand.name} defines no publication style.`)
  const paper = PUBLICATION_PAPERS[kind.paper ?? (kind.format === 'slide' ? 'slide' : 'letter')]
  const landscape = kind.format === 'slide' || kind.orientation === 'landscape'
  const [width, height] = landscape ? [paper.height, paper.width] : [paper.width, paper.height]
  const product = doc.product ? productsOf(brand).find((entry) => entry.id === doc.product) : null
  const role = (key) => colour(brand, key)
  const grounds = publicationsOf(brand)?.grounds ?? []
  const groundSpec = grounds.find((entry) => entry.id === style.ground)
  const ground = groundSpec ? groundColour(brand, groundSpec) : style.ground ? colour(brand, style.ground) : role('paper')
  const platform = productsOf(brand).find((entry) => entry.role === 'platform') ?? null
  return {
    doc, kind, style, paper: { ...paper, width, height, orientation: landscape ? 'landscape' : 'portrait' }, slide: kind.format === 'slide',
    product, platform, company: !product,
    owner: product ? { name: product.fullName ?? product.name, short: product.name } : { name: brand.name, short: brand.name },
    colours: {
      ink: role('ink'), paper: role('paper'), muted: role('muted'), primary: role('primary'), light: role('light'), reverse: role('reverse'), line: role('line'), rule: role('rule'),
      ground, groundName: groundSpec?.name ?? null,
      accent: product?.accent ?? role('primary'), accentText: product?.accentText ?? role('primary'), accentDark: product?.accentOnDark ?? role('light'),
      tint: mixHex(role('light'), ground, 0.32)
    },
    home: publicationsOf(brand)?.home?.point ?? null,
    sections: doc.sections ?? [],
    seed: doc.seed ?? 7
  }
}

const SKELETON_PAGES = {
  cover: (kind) => ({ layout: 'cover', kicker: `[${kind.name}]`, title: '[Document title] *[second tone]*', subtitle: '[One or two sentences saying who the document is for and what it covers.]' }),
  content: (kind, index) => kind.format === 'slide'
    ? { layout: 'content', section: '[Section]', title: '[A slide heading]', subtitle: '[What the audience should take from it]', blocks: [{ type: 'steps', columns: 1, items: [{ title: '[Point]', text: '[One line.]' }, { title: '[Point]', text: '[One line.]' }, { title: '[Point]', text: '[One line.]' }] }], note: '[A note line states the evidence level.]' }
    : { layout: 'content', section: '[Section]', blocks: [
      { type: 'opening', kicker: `${String(index).padStart(2, '0')} · [Section]`, title: '[Page heading, one or two lines]', lead: '[Lead paragraph: what this page is about.]' },
      { type: 'paragraph', text: '[Body text. Keep paragraphs to a few sentences. **Strong text** stands out.]' },
      { type: 'steps', columns: 2, items: [{ title: '[Step title]', text: '[Two or three lines.]' }, { title: '[Step title]', text: '[Two or three lines.]' }] },
      { type: 'callout', label: '[Callout label]', title: '[Callout heading.] *[Second tone.]*', text: '[An offer, a boundary or a question.]' }
    ] },
  sheet: () => ({ layout: 'content', section: '[Overview]', bare: true, blocks: [{ type: 'masthead', text: '[Product · Overview]' }, { type: 'opening', title: '[Sheet title]', lead: '[One line on the offer.]' }, { type: 'paragraph', text: '[Two or three sentences.]' }, { type: 'callout', strong: true, label: 'Next step', title: '[The ask in one line.]', field: '[Contact name · email · telephone]' }] }),
  closing: () => ({ layout: 'closing', kicker: '[Next step]', title: '[The offer in one line.] *[Second tone.]*', text: '[What the reader should do next.]', asks: [['[Label]', '[What to bring or agree.]'], ['[Label]', '[What to bring or agree.]'], ['[Label]', '[What to bring or agree.]']] })
}

/** A document of a kind with only its skeleton, in bracketed placeholders: where a new one starts. */
export const starterPublication = (brand, kindId, { product } = {}) => {
  const kind = publicationKind(brand, kindId)
  if (!kind) throw new Error(`Unknown publication kind: ${kindId}`)
  let content = 0
  const pages = kind.skeleton.map((entry) => (entry === 'content' ? SKELETON_PAGES.content(kind, ++content) : SKELETON_PAGES[entry](kind)))
  const owner = product ?? (kind.id === 'briefing' ? undefined : productsOf(brand)[0]?.id)
  return { id: `${kind.id}-starter`, kind: kind.id, ...(owner ? { product: owner } : {}), title: `[${kind.name} title]`, short: `[${kind.name}]`, edition: '[Month Year]', sections: ['[Section]', '[Overview]'], pages }
}
