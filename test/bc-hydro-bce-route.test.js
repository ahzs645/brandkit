import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { Resvg } from '@resvg/resvg-js'
import { BCE_ROUTE_SOURCE, bceRouteIllustrations, bceRouteSvg } from '../scripts/brands/bc-hydro-bce-route.mjs'
import { H18_BCE_NOTE, updateH18Bce } from '../scripts/update-bc-hydro-manual-bce.mjs'

const folder = new URL('../brands/bc-hydro-1983/', import.meta.url)
const trace = JSON.parse(readFileSync(new URL('reference/bce-route-trace.json', folder), 'utf8'))

test('BCE locomotive stays a separate, font-independent mark in its two source forms', () => {
  const illustrations = bceRouteIllustrations()
  assert.deepEqual(Object.keys(illustrations), ['bce-route-outline', 'bce-route-card'])
  assert.match(BCE_ROUTE_SOURCE.rule, /not part of the B.C.Hydro Rail signature/)
  assert.match(BCE_ROUTE_SOURCE.rule, /must not be put close/)
  const outline = bceRouteSvg('bce-route-outline')
  const card = bceRouteSvg('bce-route-card')
  for (const svg of [outline, card]) {
    assert.doesNotMatch(svg, /<(?:image|text|script)\b|data:image|@font-face/)
    assert.match(svg, /data-part="locomotive"/)
    assert.match(svg, /data-part="lettering"/)
    assert.match(svg, /Scan-derived vector reconstruction/)
  }
  assert.match(outline, /data-part="locomotive" fill="#000000"/)
  assert.match(card, /data-part="locomotive" fill="#0069A2"/)
  assert.match(card, /data-part="lettering" aria-label="the BCE route" fill="#FFFFFF"/)
  assert.notEqual(illustrations['bce-route-outline'].object, illustrations['bce-route-card'].object)
})

for (const [source, id, filename, minimumIou] of [
  ['outline', 'bce-route-outline', 'bce-route-outline-black.svg', 0.91],
  ['card', 'bce-route-card', 'bce-route-card-blue.svg', 0.97]
]) test(`${source} BCE vector retains native-pixel agreement with the registered source crop`, () => {
  const geometry = trace.variants[source]
  const bitmap = inflateSync(Buffer.from(geometry.validationMask.data, 'base64'))
  const svg = bceRouteSvg(id)
  assert.equal(readFileSync(new URL(`assets/${filename}`, folder), 'utf8'), svg, 'committed asset must match the reproducible vector master')
  const sourceBytes = readFileSync(new URL(`reference/${geometry.sourceFile}`, folder))
  assert.equal(createHash('sha256').update(sourceBytes).digest('hex'), geometry.sourceSha256)
  const rendered = new Resvg(svg, { background: '#FFFFFF' }).render()
  assert.equal(rendered.width, geometry.width)
  assert.equal(rendered.height, geometry.height)
  const rgba = rendered.pixels
  let intersection = 0, union = 0
  for (let pixel = 0; pixel < geometry.validationMask.pixels; pixel++) {
    const reference = Boolean(bitmap[pixel >> 3] & (1 << (7 - (pixel & 7))))
    const [red, green, blue] = rgba.subarray(pixel * 4, pixel * 4 + 3)
    const actual = source === 'outline' ? (red + green + blue) / 3 < 128 : red < 145 && green - red > 25 && blue - red > 35
    if (reference && actual) intersection++
    if (reference || actual) union++
  }
  assert.ok(intersection / union >= minimumIou, `native-pixel IoU ${intersection / union} is below ${minimumIou}`)
})

test('H18 embeds the two correct BCE source forms at the original scan coordinates', () => {
  const svg = readFileSync(new URL('../manuals/bc/pages/hydro/H18.svg', import.meta.url), 'utf8')
  const placements = [
    ['H18-bce-route-letterhead', 'bce-route-outline', '46.08 66.24'],
    ['H18-bce-route-card', 'bce-route-card', '268.8 680.88']
  ]
  for (const [id, variant, position] of placements) {
    assert.ok(svg.includes(`id="${id}" data-role="source-registered-bce-vector" transform="translate(${position}) scale(0.24)"`), `${id}: source crop placement`)
    assert.ok(svg.includes(bceRouteIllustrations()[variant].object.replaceAll('id="bce-route-', 'id="H18-bce-route-')), `${id}: canonical outlined artwork`)
  }
  assert.doesNotMatch(svg, /manual-18-4-letterhead-rail-3|manual-18-14-business-card-rail-layout-6/)
  const dimension = svg.match(/<line\b[^>]*id="H18-card-width-extension"[^>]*\/>/)?.[0]
  assert.ok(dimension, 'card-width extension line is individually identified')
  assert.match(dimension, /x1="318\.96" y1="560\.16" x2="318\.96" y2="605\.52"/, 'source line stops above the Rail signature and cannot cross the locomotive')
  assert.doesNotMatch(svg, /x1="318" y1="563" x2="318" y2="742"/)
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
  assert.equal(ids.length, new Set(ids).size, 'manual page IDs remain unique')
  assert.ok(svg.includes(H18_BCE_NOTE))
  assert.ok(updateH18Bce(svg) === svg, 'reapplying the local correction is byte-stable')
})
