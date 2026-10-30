// Reads the illustrations in manuals/bc/illustrations (ManualKit's source-based drawings of the
// vehicles, uniforms, equipment and signs the manuals show) into brand.illustrations entries.
//
// A vehicle or uniform's folder holds blank.svg (the object, no identity), revision.json (its
// source page, view box and branding zones) and, where the source shows them, applied-markings.svg
// or markings-only.svg (reflective striping and the like, without the object).
//
// A sign's folder holds example-editable-text.svg, in layers: the object (face and supports), the
// printed rules, the example content (pictograms and arrows, and the wording as text) and the
// example identity. Its object, rules and pictograms are the drawing; its wording becomes
// `lettering`, a field for each line; its identity zone takes the brand's signature. A sign with
// no identity zone keeps its identity as drawn (B.C.Hydro's identification signs, which are the
// signature).

import { existsSync, readFileSync } from 'node:fs'
import { GUIDE_BOOKS } from '../../manuals/bc/books.js'

const ROOT = new URL('../../manuals/bc/illustrations/', import.meta.url)

export const MANIFEST = JSON.parse(readFileSync(new URL('manifest.json', ROOT), 'utf8'))

/** An SVG written with a namespace prefix (`<ns0:svg xmlns:ns0="…">`, as Python writes it) without one. */
export const unprefixed = (svg) => svg.replace(/<(\/?)ns0:/g, '<$1').replace(/\sxmlns:ns0="[^"]*"/, ' xmlns="http://www.w3.org/2000/svg"')

/** The drawing inside an exported SVG: its children, less title, desc and the empty branding group. */
export const inner = (svg) => {
  let body = unprefixed(svg).replace(/^<\?xml[^>]*>\s*/, '').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  body = body.replace(/<title>[\s\S]*?<\/title>/, '').replace(/<desc>[\s\S]*?<\/desc>/, '').replace(/<g id="branding"[^>]*(\/>|>\s*<\/g>)/, '')
  // Ids are kept only where something refers to them (a gradient, a clip); the rest go, so two
  // drawings can share a document. Every path's round joins move to one wrapper.
  const referenced = new Set([...body.matchAll(/(?:url\(#|href="#)([^)"]+)/g)].map((match) => match[1]))
  body = body.replace(/ id="([^"]+)"/g, (match, id) => (referenced.has(id) ? match : ''))
  body = body.replace(/ stroke-linejoin="round" stroke-linecap="round"/g, '').replace(/ data-layer="[^"]*"/g, '')
  return body.replace(/>\s+</g, '><').trim()
}

const round = (value) => Math.round(value * 100) / 100

/** A layer of an SVG (`<g … data-layer="name">…</g>`), whole, nested groups and all. */
const layerOf = (svg, name) => {
  const start = svg.search(new RegExp(`<g\\b[^>]*data-layer="${name}"`))
  if (start < 0) return ''
  const open = svg.slice(start).match(/^<g\b[^>]*?(\/?)>/)
  if (open[1]) return ''
  let depth = 0
  const tag = /<(\/?)g\b[^>]*?(\/?)>/g
  tag.lastIndex = start
  for (let match = tag.exec(svg); match; match = tag.exec(svg)) {
    if (match[2]) continue
    depth += match[1] ? -1 : 1
    if (!depth) return svg.slice(start, tag.lastIndex)
  }
  return ''
}

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1]
const unescapeXml = (text) => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')

/** A sign specimen as an illustration: its drawing, its wording as lettering, its identity zone. */
const sign = (id, folder, revision) => {
  const svg = unprefixed(readFileSync(new URL('example-editable-text.svg', folder), 'utf8'))
  const viewBox = attr(svg.match(/<svg\b[^>]*>/)[0], 'viewBox').split(/[\s,]+/).map(Number)
  const content = layerOf(svg, 'replaceable-example-content')
  const identity = layerOf(svg, 'replaceable-example-identity')
  const zone = revision.branding_zones.find((entry) => entry.id === 'identity')
  const lettering = [...content.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map(([, attributes, text]) => {
    const tag = `<text${attributes}>`
    return {
      text: unescapeXml(text), x: Number(attr(tag, 'x')), y: Number(attr(tag, 'y')), size: Number(attr(tag, 'font-size')),
      bold: attr(tag, 'data-bold') === 'true' || Number(attr(tag, 'font-weight')) >= 600, family: attr(tag, 'data-font-family') ?? 'sans',
      anchor: attr(tag, 'text-anchor') ?? 'start', fill: attr(tag, 'fill') ?? '#000', ...(attr(tag, 'textLength') ? { width: Number(attr(tag, 'textLength')), ...(attr(tag, 'lengthAdjust') === 'spacing' ? { adjust: 'spacing' } : {}) } : {})
    }
  })
  const drawing = [layerOf(svg, 'object'), layerOf(svg, 'printed-rules'), content.replace(/<text\b[^>]*>[^<]*<\/text>/g, ''), zone ? '' : identity].join('')
  // The identity's colour and ministry, as the example sets them.
  const ministry = [...identity.matchAll(/<text\b[^>]*data-part="ministry-caption"[^>]*>([^<]*)<\/text>/g)].map((match) => unescapeXml(match[1]))[0]
  // The logotype on one line is the centred sign format; on two ("Province of" / "British Columbia"), the horizontal.
  const logotypeLines = [...identity.matchAll(/data-part="identity-caption"/g)].length
  return {
    title: revision.title,
    source: { page: id.split('-')[0], unitsPerPoint: revision.svg_units_per_pdf_point },
    viewBox,
    object: inner(`<svg>${drawing}</svg>`),
    lettering,
    zones: zone ? [{ id: 'identity', label: zone.label, kind: 'sign-identity', box: zone.bbox.map(round), colour: attr(identity.match(/<g\b[^>]*\sfill="[^"]*"[^>]*>|<text\b[^>]*>/)?.[0] ?? '', 'fill') ?? '#000000', default: ministry ?? null, ...(logotypeLines ? { format: logotypeLines === 1 ? 'centred' : 'horizontal' } : {}) }] : []
  }
}

/** brand.illustrations[id] for one drawing. */
export const illustration = (id) => {
  const folder = new URL(`${id}/`, ROOT)
  const revision = JSON.parse(readFileSync(new URL('revision.json', folder), 'utf8'))
  if (existsSync(new URL('example-editable-text.svg', folder))) return sign(id, folder, revision)
  const markings = [new URL('applied-markings.svg', folder), new URL('markings-only.svg', folder)].find((file) => existsSync(file))
  return {
    title: revision.title,
    source: { page: id.split('-')[0], unitsPerPoint: revision.svg_units_per_pdf_point },
    viewBox: revision.vb,
    object: `<g stroke-linejoin="round" stroke-linecap="round">${inner(readFileSync(new URL('blank.svg', folder), 'utf8'))}</g>`,
    ...(markings ? { markings: `<g stroke-linejoin="round" stroke-linecap="round">${inner(readFileSync(markings, 'utf8'))}</g>` } : {}),
    zones: revision.branding_zones.map((zone) => ({
      id: zone.id, label: zone.label, kind: zone.kind, box: zone.box.map(round), quad: zone.quad.map((point) => point.map(round)), colour: zone.colour, default: zone.default
    }))
  }
}

/** Every drawing whose id starts with one of `prefixes` (page ids: 'V13', 'H44'). */
export const illustrationsFor = (prefixes) => MANIFEST.assets.map((asset) => asset.id).filter((id) => prefixes.some((prefix) => id.startsWith(`${prefix}-`)))

// --- What goes in each kind of zone, as the source pages show it.

const PROVINCIAL = { ministry: '', 'ministry-split': '' }
const ministryOf = (name) => ({ ministry: `Ministry of\n${name}`, 'ministry-split': '' })

/** The Province's identity for a zone: the vehicle signature on vehicles, the insignia on uniforms. */
const provinceZone = (zone, uniform) => {
  const signature = uniform ? 'insignia' : 'vehicle'
  switch (zone.kind) {
    case 'signature':
    case 'transfer-sheet':
    case 'applied-identity': {
      // V18's decal, seen through its transfer sheet and then applied, carries a ministry; a zone
      // whose default is the Province itself (or a uniform's function) carries none.
      if (zone.kind !== 'signature') return { signature, defaults: ministryOf('Abcdefghijk'), ...(zone.kind === 'transfer-sheet' ? { opacity: 0.3 } : {}) }
      const named = zone.default && !['Province of British Columbia', 'Security'].includes(zone.default)
      return named ? { signature, defaults: ministryOf(zone.default) } : { signature, values: PROVINCIAL }
    }
    case 'patch': return { signature: 'insignia', values: PROVINCIAL }
    // A sign's identity: the centred sign signature where it heads the face (primary
    // identification), the horizontal one where it runs along the foot (information, control).
    case 'sign-identity': {
      const ministry = zone.default ? { ministry: zone.default.replace(/^Ministry of\s+/, 'Ministry of\n'), 'ministry-split': '' } : PROVINCIAL
      return { signature: zone.format === 'centred' ? 'sign-centred' : 'sign-horizontal', defaults: ministry, inset: 0 }
    }
    case 'unit': return { id: 'unit-number', text: zone.default, font: 'regular', fill: 0.86 }
    case 'nameplate': return { id: 'job-function', text: zone.default, font: 'medium', fill: 0.62 }
    case 'curved-name': return { id: 'job-function', text: zone.default, font: 'regular', curve: 0.3, fill: 0.62 }
    default: return null // a process surface: where the marking is applied, nothing printed on it
  }
}

/** B.C.Hydro's: the Corporate signature, or Gas Operations' where the page shows the flame, or Rail. */
const hydroZone = (zone, id) => {
  switch (zone.kind) {
    case 'hydro': return { signature: 'standard' }
    case 'hydro-gas': return { signature: id.startsWith('H44-') ? 'gas' : 'standard' }
    case 'hydro-rail': return { signature: 'rail' }
    // H47: the generator's safety wording is flush left, under the signature's symbol.
    case 'caption': return { text: zone.default, font: 'body', leading: 1.05, fill: 0.9, align: 'start' }
    case 'sign-identity': return { signature: 'standard', inset: 0 }
    default: return null
  }
}

/** The zones of drawing `id` filled for `brand` ('province' or 'hydro'), as its page shows them. */
export const sourceZones = (brand, id, drawing) => Object.fromEntries(drawing.zones
  .map((zone) => {
    const spec = brand === 'hydro' ? hydroZone(zone, id) : provinceZone(zone, id.startsWith('G15-'))
    // A signature whose zone runs down over a unit number's (V17's compressor) stops above it.
    const unit = spec?.signature && drawing.zones.find((other) => other.kind === 'unit' && other.box[1] > zone.box[1] && other.box[1] < zone.box[1] + zone.box[3]
      && other.box[0] < zone.box[0] + zone.box[2] && other.box[0] + other.box[2] > zone.box[0])
    return [zone.id, unit ? { ...spec, bottom: Math.round(((unit.box[1] - zone.box[1]) / zone.box[3]) * 1000) / 1000 } : spec]
  })
  .filter(([, spec]) => spec))

// The faces a drawing's wording is set in: the Province's Helvetica, Hydro's Times Roman.
const LETTERING = {
  province: { sans: { regular: 'regular', bold: 'medium' } },
  hydro: { serif: { regular: 'body', bold: 'bold' }, sans: { regular: 'body', bold: 'bold' } }
}

/** The fields a drawing's template offers: a ministry where a zone takes one, then its text zones. */
export const zoneFields = (zones) => (Object.values(zones).some((spec) => spec.defaults?.ministry != null) ? ['ministry', 'ministry-split'] : [])

/**
 * One template per drawing: the drawing with the identity in its zones, at the drawing's own
 * proportions, `width` px wide.
 */
export const illustrationTemplate = (brand, id, drawing, { group, sources, width = 1600 }) => {
  const [, , vw, vh] = drawing.viewBox
  const zones = sourceZones(brand, id, drawing)
  const height = Math.round((width * vh) / vw)
  return {
    id: `illustrated-${id.toLowerCase()}`,
    label: drawing.title.replace(/\s+[—-]\s+/g, ', '),
    group,
    width,
    height,
    raster: width,
    title: `${drawing.title} (${id.split('-')[0]})`,
    description: drawing.lettering
      ? `${drawing.title}, as on page ${id.split('-')[0]}: ManualKit’s source-registered sign, its wording a field for each line${drawing.zones.length ? ', its identity set from the brand’s signature' : ''}.`
      : `${drawing.title}, as on page ${id.split('-')[0]}: ManualKit’s source-registered drawing, with the identity set into each of its branding zones (${drawing.zones.map((zone) => zone.label.toLowerCase()).join(', ')}).`,
    elements: [
      { type: 'background', fill: '#ffffff' },
      { type: 'illustration', illustration: id, x: 0, y: 0, width, height, fields: zoneFields(zones), zones, ...(drawing.lettering?.length ? { lettering: { prefix: id.toLowerCase(), fonts: LETTERING[brand] } } : {}) }
    ],
    ...(sources ? { sources } : {})
  }
}

const PAGE_TITLES = new Map(GUIDE_BOOKS.flatMap((book) => book.pages.map((page) => [page.id, { book: book.title, title: page.title }])))

/**
 * A drawing's subject: its manual and the page's subject. A placement page belongs with the page
 * before it (Vehicle Manual p. 13, "Tractor cabs and trailers: placement", with p. 12).
 */
export const groupFor = (id) => {
  const pageId = id.split('-')[0]
  let page = PAGE_TITLES.get(pageId)
  if (/:\s*placement$/i.test(page.title)) page = PAGE_TITLES.get(`${pageId[0]}${String(Number(pageId.slice(1)) - 1).padStart(2, '0')}`) ?? page
  return `${page.book.replace(' Manual', '')}: ${page.title.replace(/:\s*placement$/i, '').replace(/;.*$/, '')}`
}

/**
 * Illustrations and their templates for every drawing on the given pages, all in one template
 * group, and sets that make each subject's views one item (a van truck's cab door, side and rear).
 */
export const illustrated = (brand, pages, extraSources = [], group = 'Drawn applications', subjectOf = null) => {
  const ids = illustrationsFor(pages)
  const drawings = Object.fromEntries(ids.map((id) => [id, illustration(id)]))
  const templates = ids.map((id) => illustrationTemplate(brand, id, drawings[id], { group }))
  const sources = Object.fromEntries(ids.map((id) => [`illustrated-${id.toLowerCase()}`, [id.split('-')[0], ...extraSources]]))
  const subjects = new Map()
  for (const template of templates) {
    const asset = template.id.replace(/^illustrated-/, '').toUpperCase()
    const subject = subjectOf?.(asset) ?? groupFor(asset).replace(/^[^:]+:\s*/, '')
    if (!subjects.has(subject)) subjects.set(subject, [])
    // A subject drawn on several pages (a ranger station in the General Manual and the Sign Manual) names the page.
    subjects.get(subject).push({ template: template.id, label: subjectOf ? `${template.label} (${asset.split('-')[0]})` : template.label })
  }
  const sets = [...subjects].map(([label, variants]) => ({ id: `drawn-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, label, variants }))
  return { drawings, templates, sources, sets }
}
