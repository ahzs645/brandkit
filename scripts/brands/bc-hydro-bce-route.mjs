// Scan-derived vector masters of the separate BCE route locomotive mark.
// Geometry is frozen in the trace record; rebuilding these SVGs needs only Node.
// This is not a fifth BC Hydro signature. Printed p. 2 requires separation from Rail.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const folder = new URL('../../brands/bc-hydro-1983/', import.meta.url)
const trace = JSON.parse(readFileSync(new URL('reference/bce-route-trace.json', folder), 'utf8'))
const escape = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

export const BCE_ROUTE_SOURCE = {
  ...trace.source,
  status: 'Scan-derived vector reconstruction; not original master artwork.',
  rule: 'The locomotive is retained where recognition of “the BCE route” is required. It is not part of the B.C.Hydro Rail signature and must not be put close to it.',
  rulePdfPage: 3,
  rulePrintedPage: 2,
  rulePageId: 'H03'
}

const variants = {
  'bce-route-outline': { source: 'outline', filename: 'bce-route-outline-black.svg', title: '“the BCE route” locomotive / black outline', body: '#000000', lettering: '#000000', use: 'Rail letterhead, printed p. 17.' },
  'bce-route-card': { source: 'card', filename: 'bce-route-card-blue.svg', title: '“the BCE route” locomotive / blue card mark', body: '#0069A2', lettering: '#FFFFFF', use: 'Rail business card, printed p. 17: filled blue locomotive with white lettering.' }
}

/** Existing template illustration elements can place these without a new renderer type. */
export function bceRouteIllustrations({ blue = '#0069A2' } = {}) {
  return Object.fromEntries(Object.entries(variants).map(([id, variant]) => {
    const geometry = trace.variants[variant.source]
    const body = id === 'bce-route-card' ? blue : variant.body
    const object = `<g id="${id}-locomotive" data-part="locomotive" fill="${escape(body)}"><path d="${geometry.body}" fill-rule="evenodd"/></g>`
      + `<g id="${id}-lettering" data-part="lettering" aria-label="the BCE route" fill="${variant.lettering}"><path d="${geometry.lettering}" fill-rule="evenodd"/></g>`
    return [id, {
      title: variant.title,
      viewBox: [0, 0, geometry.width, geometry.height],
      object,
      zones: [],
      source: { ...BCE_ROUTE_SOURCE, cropNativePixels: geometry.cropNativePixels, use: variant.use },
      provenance: BCE_ROUTE_SOURCE.status
    }]
  }))
}

export function bceRouteSvg(id, options) {
  const variant = variants[id]
  if (!variant) throw new Error(`Unknown BCE route variant: ${id}`)
  const illustration = bceRouteIllustrations(options)[id]
  const [, , width, height] = illustration.viewBox
  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${id}-title ${id}-description">\n`
    + `<title id="${id}-title">${escape(variant.title)}</title>\n`
    + `<desc id="${id}-description">${escape(`${BCE_ROUTE_SOURCE.status} ${variant.use} ${BCE_ROUTE_SOURCE.rule} Source: BC Hydro Graphic Standards Manual, 1983, PDF page 18 / printed page 17. All lettering is outlined; no font or raster image is required.`)}</desc>\n`
    + `<metadata>${escape(JSON.stringify(illustration.source))}</metadata>\n`
    + `${illustration.object}\n</svg>\n`
}

export function writeBceRouteAssets(options) {
  const target = new URL('assets/', folder)
  mkdirSync(target, { recursive: true })
  for (const [id, variant] of Object.entries(variants)) writeFileSync(new URL(variant.filename, target), bceRouteSvg(id, options))
  return Object.values(variants).map(variant => `assets/${variant.filename}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  for (const path of writeBceRouteAssets()) console.log(`BC Hydro: ${path}`)
}
