// Reads the illustrations in manuals/bc/illustrations (ManualKit's source-based drawings of the
// vehicles, uniforms and equipment the manuals show) into brand.illustrations entries.
//
// Each folder holds blank.svg (the object, no identity), revision.json (its source page, view box
// and branding zones) and, where the source shows them, applied-markings.svg (reflective striping
// and the like, without the object).

import { existsSync, readFileSync } from 'node:fs'
import { GUIDE_BOOKS } from '../../manuals/bc/books.js'

const ROOT = new URL('../../manuals/bc/illustrations/', import.meta.url)

export const MANIFEST = JSON.parse(readFileSync(new URL('manifest.json', ROOT), 'utf8'))

/** The drawing inside an exported SVG: its children, less title, desc and the empty branding group. */
const inner = (svg) => {
  let body = svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  body = body.replace(/<title>[\s\S]*?<\/title>/, '').replace(/<desc>[\s\S]*?<\/desc>/, '').replace(/<g id="branding"[^>]*(\/>|>\s*<\/g>)/, '')
  // Ids are kept only where something refers to them (a gradient, a clip); the rest go, so two
  // drawings can share a document. Every path's round joins move to one wrapper.
  const referenced = new Set([...body.matchAll(/(?:url\(#|href="#)([^)"]+)/g)].map((match) => match[1]))
  body = body.replace(/ id="([^"]+)"/g, (match, id) => (referenced.has(id) ? match : ''))
  body = body.replace(/ stroke-linejoin="round" stroke-linecap="round"/g, '').replace(/ data-layer="[^"]*"/g, '')
  return body.replace(/>\s+</g, '><').trim()
}

const round = (value) => Math.round(value * 100) / 100

/** brand.illustrations[id] for one drawing. */
export const illustration = (id) => {
  const folder = new URL(`${id}/`, ROOT)
  const revision = JSON.parse(readFileSync(new URL('revision.json', folder), 'utf8'))
  const markings = new URL('applied-markings.svg', folder)
  return {
    title: revision.title,
    source: { page: id.split('-')[0], unitsPerPoint: revision.svg_units_per_pdf_point },
    viewBox: revision.vb,
    object: `<g stroke-linejoin="round" stroke-linecap="round">${inner(readFileSync(new URL('blank.svg', folder), 'utf8'))}</g>`,
    ...(existsSync(markings) ? { markings: `<g stroke-linejoin="round" stroke-linecap="round">${inner(readFileSync(markings, 'utf8'))}</g>` } : {}),
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
    case 'caption': return { text: zone.default, font: 'body', leading: 1.05, fill: 0.9 }
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
    description: `${drawing.title}, as on page ${id.split('-')[0]}: ManualKit’s source-registered drawing, with the identity set into each of its branding zones (${drawing.zones.map((zone) => zone.label.toLowerCase()).join(', ')}).`,
    elements: [
      { type: 'background', fill: '#ffffff' },
      { type: 'illustration', illustration: id, x: 0, y: 0, width, height, fields: zoneFields(zones), zones }
    ],
    ...(sources ? { sources } : {})
  }
}

const PAGE_TITLES = new Map(GUIDE_BOOKS.flatMap((book) => book.pages.map((page) => [page.id, { book: book.title, title: page.title }])))

/** A drawing's template group: its manual and the page's subject, placement pages with their pair. */
export const groupFor = (id) => {
  const page = PAGE_TITLES.get(id.split('-')[0])
  return `${page.book.replace(' Manual', '')}: ${page.title.replace(/:\s*placement$/i, '').replace(/;.*$/, '')}`
}

/** Illustrations and their templates for every drawing on the given pages. */
export const illustrated = (brand, pages, extraSources = []) => {
  const ids = illustrationsFor(pages)
  const drawings = Object.fromEntries(ids.map((id) => [id, illustration(id)]))
  const templates = ids.map((id) => illustrationTemplate(brand, id, drawings[id], { group: groupFor(id) }))
  const sources = Object.fromEntries(ids.map((id) => [`illustrated-${id.toLowerCase()}`, [id.split('-')[0], ...extraSources]]))
  return { drawings, templates, sources }
}
