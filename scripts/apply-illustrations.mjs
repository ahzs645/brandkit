// Puts ManualKit's source-based drawings (manuals/bc/illustrations) into the rebuilt manual pages
// (manuals/bc/pages), in place of the earlier drafts.
//
// Each drawing is registered to its source page: its view box is in the page's coordinates times
// `svg_units_per_pdf_point`. On its page, inside that box, the script removes the earlier
// drawing's geometry and the identity drawn on it (logos, unit numbers, ministry lettering), keeps
// everything else (notes, captions, dimension callouts, the frames around figures), and puts in the
// new drawing with the identity set into its branding zones, as the brands' templates set it.
//
// A sign goes in as ManualKit's outlined example (display.svg), its wording and identity as the
// source shows them; on its page, every word inside the sign's face goes, since the new sign
// carries its own, and captions, dimension rules and tables around it stay.
//
// Needs Playwright with a Chromium, for measuring the pages' elements (as
// render-guide-thumbnails.mjs does); run that afterwards to redraw the thumbnails:
//
//   node scripts/apply-illustrations.mjs [asset-id-prefix …]
//   node scripts/render-guide-thumbnails.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { illustrationArt } from '../src/engine/illustrations.js'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { illustration, inner, MANIFEST, sourceZones } from './brands/illustrations.mjs'

const ROOT = new URL('../', import.meta.url)
const BOOK = { G: 'general', V: 'vehicle', H: 'hydro', S: 'sign' }

const require = createRequire(import.meta.url)
let chromium
try {
  ({ chromium } = require('playwright'))
} catch {
  ({ chromium } = await import(join(process.env.PLAYWRIGHT_DIR ?? '', 'playwright', 'index.mjs')))
}

const contexts = {}
const contextFor = async (brandId) => {
  if (!contexts[brandId]) {
    const folder = new URL(`brands/${brandId}/`, ROOT)
    const brand = JSON.parse(readFileSync(new URL('brand.json', folder), 'utf8'))
    contexts[brandId] = { brand, fonts: await loadBrandFontsFromDisk(brand, folder.pathname), outline: true, values: {} }
  }
  return contexts[brandId]
}

// What the page's earlier drawings are made of, by data-role: geometry, and identity drawn on it.
const DRAWING_ROLES = /^(authored-(?!rule$).*|source-registered-cropped-car-view|vehicle-door-seam|shared-vector-logo|reused-native-vehicle-signature|curved-live-decal-letter|source-registered-shared-native-artwork)$/
const TEXT_ROLES = '[data-role="live-lettering"], [data-role="source-registered-live-type"], [data-role="source-registered-prose"]'
// Lettering that is identity, not a note: unit numbers, the logotype, ministry names, functions.
const IDENTITY_TEXT = /^\s*(\d{4}\s*-\s*\d{4}|Province\b|of\b|British\b|Columbia\b|Ministry\b|Agriculture|Forests|Abcdefghijk|Security|Job\b|Function|B\.?\s?C\.?\s?Hydro|Rail\b|Danger|High\b|Voltage)/i

const prefixes = process.argv.slice(2)
const assets = MANIFEST.assets.filter((asset) => !prefixes.length || prefixes.some((prefix) => asset.id.startsWith(prefix)))
const byPage = Map.groupBy(assets, (asset) => asset.id.split('-')[0])

const browser = await chromium.launch()
const tab = await browser.newPage()
await tab.setContent('<!doctype html><body></body>')

for (const [pageId, pageAssets] of byPage) {
  const file = new URL(`manuals/bc/pages/${BOOK[pageId[0]]}/${pageId}.svg`, ROOT)
  const svg = readFileSync(file, 'utf8')
  const replacements = []
  for (const asset of pageAssets) {
    const folder = new URL(`manuals/bc/illustrations/${asset.id}/`, ROOT)
    if (!asset.vb) {
      // A sign: the outlined example as the source shows it, in the page's own coordinates.
      const display = readFileSync(new URL('display.svg', folder), 'utf8')
      const [x, y, w, h] = display.match(/viewBox="([^"]+)"/)[1].split(/[\s,]+/).map(Number)
      const revision = JSON.parse(readFileSync(new URL('revision.json', folder), 'utf8'))
      const units = asset.svg_units_per_pdf_point ?? 1
      const [fx, fy, fw, fh] = revision.face_bounds
      replacements.push({
        id: asset.id, sign: true,
        region: [x / units, y / units, w / units, h / units],
        face: [fx / units, fy / units, fw / units, fh / units],
        markup: `<g data-role="manualkit-illustration" data-illustration="${asset.id}" transform="scale(${1 / units})">${inner(display)}</g>`
      })
      continue
    }
    const ctx = await contextFor(pageId.startsWith('H') ? 'bc-hydro-1983' : 'bc-province-1977')
    const drawing = illustration(asset.id)
    const units = asset.svg_units_per_pdf_point
    const [x, y, w, h] = asset.vb
    const art = illustrationArt(ctx, drawing, { zones: sourceZones(pageId.startsWith('H') ? 'hydro' : 'province', asset.id, drawing), markings: true })
    replacements.push({
      id: asset.id,
      region: [x / units, y / units, w / units, h / units],
      markup: `<g data-role="manualkit-illustration" data-illustration="${asset.id}" transform="scale(${1 / units})">${art}</g>`
    })
  }
  const result = await tab.evaluate(({ svg, replacements, drawingRoles, identityText, textRoles }) => {
    const drawingRe = new RegExp(drawingRoles)
    const identityRe = new RegExp(identityText, 'i')
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const root = document.adoptNode(doc.documentElement)
    document.body.replaceChildren(root)
    const toUser = root.getScreenCTM().inverse()
    const boxOf = (element) => {
      if (typeof element.getBBox !== 'function') return null
      let local
      try { local = element.getBBox() } catch { return null }
      if (!local || (local.width === 0 && local.height === 0)) return null
      const matrix = toUser.multiply(element.getScreenCTM())
      const corners = [[local.x, local.y], [local.x + local.width, local.y], [local.x, local.y + local.height], [local.x + local.width, local.y + local.height]]
        .map(([px, py]) => new DOMPoint(px, py).matrixTransform(matrix))
      const xs = corners.map((point) => point.x)
      const ys = corners.map((point) => point.y)
      return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]
    }
    const overlapOne = (box, region) => {
      const w = Math.min(box[0] + box[2], region[0] + region[2]) - Math.max(box[0], region[0])
      const h = Math.min(box[1] + box[3], region[1] + region[3]) - Math.max(box[1], region[1])
      if (w < 0 || h < 0) return 0
      const area = Math.max(box[2], 0.01) * Math.max(box[3], 0.01)
      return (Math.max(w, 0.01) * Math.max(h, 0.01)) / area
    }
    // The share of a box inside any of the regions (they do not overlap one another much).
    const overlap = (box, regions) => Math.min(1, regions.reduce((sum, region) => sum + overlapOne(box, region), 0))
    const parse = (markup) => document.importNode(new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, 'image/svg+xml').documentElement.firstChild, true)
    const roleOf = (element) => element.getAttribute?.('data-role') ?? ''
    const report = []
    for (const replacement of replacements) {
      const [rx, ry, rw, rh] = replacement.region
      const pad = Math.max(rw, rh) * 0.02
      const region = [rx - pad, ry - pad, rw + 2 * pad, rh + 2 * pad]
      // A sign takes only its own face and posts, measured from the new drawing; its box can reach
      // over a neighbouring sign that stands in front of its posts.
      let regions = [region]
      if (replacement.sign) {
        const probe = parse(replacement.markup)
        root.appendChild(probe)
        const parts = [...probe.querySelectorAll('[data-part="panel"], [data-part="supports"] > *')].map(boxOf).filter(Boolean)
        probe.remove()
        const edge = Math.max(rw, rh) * 0.01
        if (parts.length) regions = parts.map(([x, y, w, h]) => [x - edge, y - edge, w + 2 * edge, h + 2 * edge])
      }
      const removed = []
      const centreIn = (element, box) => {
        const own = boxOf(element)
        if (!own || !box) return false
        const [cx, cy] = [own[0] + own[2] / 2, own[1] + own[3] / 2]
        return cx > box[0] && cx < box[0] + box[2] && cy > box[1] && cy < box[1] + box[3]
      }
      // On a sign every word inside its face is the sign's own; on a vehicle only identity is.
      const isIdentity = (element) => identityRe.test(element.textContent) || Boolean(replacement.sign && centreIn(element, replacement.face))
      const notes = (element) => [...element.querySelectorAll('text')].filter((text) => !isIdentity(text))
      // A group of notes and dimension callouts: text, rules and arrowheads, nothing solid larger
      // than an arrowhead.
      const callouts = (element) => [...element.querySelectorAll('path, rect, polygon, circle, ellipse')].every((shape) => {
        const fill = shape.getAttribute('fill') ?? shape.closest('[fill]')?.getAttribute('fill') ?? '#000'
        if (fill === 'none' || fill === 'transparent') return true
        const box = boxOf(shape)
        return !box || box[2] * box[3] < 0.004 * rw * rh
      })
      const visit = (element) => {
        const box = boxOf(element)
        if (!box) return
        const share = overlap(box, regions)
        // The frame round a figure (as large as the drawing's box, or larger) stays.
        const frame = !replacement.sign && element.tagName === 'rect' && box[2] * box[3] >= 0.8 * rw * rh
        if (share >= 0.6 && !frame) {
          if (element.tagName === 'text') {
            if (isIdentity(element)) removed.push(element)
          } else if (element.children.length && notes(element).length) {
            // Notes and callouts the earlier drawing carried stay; its geometry and identity go.
            if (callouts(element)) [...element.querySelectorAll('text')].filter(isIdentity).forEach((text) => removed.push(text))
            else [...element.children].forEach(visit)
          } else removed.push(element)
        } else if (share > 0 && element.children.length) [...element.children].forEach(visit)
      }
      const outermost = [...root.querySelectorAll('[data-role]')].filter((element) => drawingRe.test(roleOf(element)) && !element.parentElement.closest('[data-role]'))
      // On a sign, the earlier pictograms' unlabelled shapes (a disc, an octagon, a bar) go too.
      if (replacement.sign) outermost.push(...[...root.children].filter((element) => !element.hasAttribute('data-role') && ['circle', 'ellipse', 'polygon', 'polyline', 'path', 'rect', 'line', 'g'].includes(element.tagName)))
      outermost.forEach(visit)
      // Identity lettering inside the drawing's box goes too; notes and callouts stay.
      for (const element of root.querySelectorAll(textRoles)) {
        if (replacement.sign ? centreIn(element, replacement.face) : centreIn(element, region) && identityRe.test(element.textContent)) removed.push(element)
      }
      // The new drawing goes where the earlier one began, so what was drawn over it still is.
      const first = removed.find((element) => element.isConnected)
      const anchor = first ? [...root.children].find((child) => child.contains(first)) : root.querySelector('[data-role="paper"]')?.nextSibling
      root.insertBefore(parse(replacement.markup), anchor ?? null)
      for (const element of removed) element.remove()
      report.push({ id: replacement.id, removed: removed.length })
    }
    return { svg: new XMLSerializer().serializeToString(root), report }
  }, { svg, replacements, drawingRoles: DRAWING_ROLES.source, identityText: IDENTITY_TEXT.source, textRoles: TEXT_ROLES })
  writeFileSync(file, result.svg.startsWith('<svg') ? result.svg : result.svg)
  console.log(pageId, result.report.map((entry) => `${entry.id}: ${entry.removed} removed`).join('; '))
}
await browser.close()
