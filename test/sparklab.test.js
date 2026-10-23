import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildKit, planKit } from '../src/engine/kit.js'
import { validateBrand } from '../src/engine/brand.js'
import { logoDocument, pattern } from '../src/engine/artwork.js'
import { guidePages, guideSheets } from '../src/engine/guide.js'
import { renderTemplate, templateFields } from '../src/engine/templates.js'
import { loadBrandFontsFromDisk, readAssetFromDisk } from '../src/fonts/node.js'
import { officeFile } from '../src/export/office.js'
import { unzipSync, strFromU8 } from 'fflate'
import { ARROW_STUDIES, arrowField, arrowGeometry } from '../scripts/brands/sparklab-arrows.mjs'
import { loadSparkLogo } from '../scripts/brands/sparklab-logo.mjs'

const folder = new URL('../brands/sparklab/', import.meta.url).pathname
const read = (file) => readFileSync(`${folder}${file}`, 'utf8')
const brand = JSON.parse(read('brand.json'))
const fonts = await loadBrandFontsFromDisk(brand, folder)
const ctx = { brand, fonts }

test('SPARK Lab: source artwork and website palette survive in colour and monochrome exports', () => {
  assert.deepEqual(validateBrand(brand), [])
  assert.deepEqual(fonts.failures, [])
  const source = read('reference/logo-site.svg')
  const paths = [...source.matchAll(/<path\s+d="([^"]+)"/g)].map((m) => m[1])
  const positive = logoDocument(ctx, { signature: 'original', colourway: 'positive' })
  const polygon = /<polygon\s+points="([^"]+)"/.exec(source)[1].trim().split(/[\s,]+/).map(Number)
  const arrow = brand.symbol.paths[0]
  assert.deepEqual(arrow.match(/-?\d+(?:\.\d+)?/g).map(Number), polygon, 'arrow coordinates retained in pairs')
  assert.match(arrow, /^M-?[\d.]+ -?[\d.]+(?:L-?[\d.]+ -?[\d.]+)+Z$/)
  for (const path of paths) assert.ok(positive.includes(`d="${path}"`), 'original path retained')
  assert.ok(positive.includes('fill="#F85C14"') && positive.includes('fill="#122738"'))
  for (const way of ['navy', 'white']) {
    const svg = logoDocument(ctx, { signature: 'original', colourway: way })
    assert.ok(!svg.includes('#F85C14'), `${way} is monochrome`)
  }
  const css = read('reference/theme-site.css.txt')
  for (const hex of Object.values(brand.colours)) assert.ok(css.toLowerCase().includes(hex.toLowerCase()), `${hex} is sourced`)
})

test('SPARK Lab: every template and guide renders finite geometry and usable editable fields', () => {
  for (const template of brand.templates) {
    const fields = templateFields(template, brand)
    assert.ok(fields.length, `${template.id} has editable fields`)
    const { svg } = renderTemplate({ ...ctx, values: { [fields[0].id]: '<&>' } }, template)
    assert.match(svg, /&lt;&amp;&gt;/, template.id)
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, template.id)
  }
  for (const page of [...guidePages(ctx), ...guideSheets(ctx)]) {
    const svg = page.svg ?? page.render()
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, page.name ?? page.path)
    assert.doesNotMatch(svg, /<text\b/, 'guide lettering is outlined')
  }
})

test('SPARK Lab: the exported kit carries every local dependency and working standalone page links', async () => {
  const plan = planKit(brand)
  const paths = plan.map((entry) => entry.path)
  assert.equal(new Set(paths).size, paths.length, 'no duplicate output paths')
  for (const entry of plan.filter((entry) => entry.kind === 'asset')) assert.ok(existsSync(`${folder}${entry.src}`), entry.src)
  const { files, skipped } = await buildKit(ctx, { rasters: false, pdfs: false, readAsset: (src) => readAssetFromDisk(folder, src) })
  assert.deepEqual(skipped, [])
  for (const path of ['site/index.html', 'motion/index.html', 'docs/brand-details.html', 'guidelines/brand-details.html', 'docs/patterns-and-templates.html', 'docs/arrow-patterns.html']) {
    assert.ok(files.has(path), path)
    const html = strFromU8(files.get(path))
    assert.doesNotMatch(html, /(?:src|href)=["']https?:\/\/[^"']+["'][^>]*(?:stylesheet|script)|<script[^>]+src=/)
    for (const [, href] of html.matchAll(/href="([^"#][^"]*)"/g)) {
      if (/^(https?:|mailto:|data:)/.test(href)) continue
      const target = resolve('/', path, '..', href).slice(1)
      assert.ok(files.has(target), `${path} → ${target}`)
    }
  }
  for (const [path, bytes] of files) if (path.endsWith('.svg')) assert.doesNotMatch(strFromU8(bytes), /NaN|undefined|Infinity/, path)
  assert.ok(files.has('source/brand.json') && files.has('motion/tokens.json') && files.has('fonts/Outfit-OFL.txt'))
})

test('SPARK Lab: Word, PowerPoint and email exports retain editable user content', async () => {
  const png = async () => Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'))
  for (const doc of brand.documents) {
    const file = await officeFile({ ...ctx, values: { 'letter-subject': 'Workshop invitation', 'project-title': 'Research prototype', 'deck-title': 'Build together', 'contact-name': 'Avery Example', 'notes-title': 'Make. Test. Learn.' } }, doc, { png, readAsset: (src) => readAssetFromDisk(folder, src) })
    if (doc.format === 'html') {
      assert.match(strFromU8(file.bytes), /Avery Example/)
      assert.match(strFromU8(file.bytes), /mailto:sparklab@unbc.ca/)
      continue
    }
    const parts = unzipSync(file.bytes)
    if (doc.format === 'docx') {
      const xml = strFromU8(parts['word/document.xml'])
      assert.match(xml, doc.id === 'letterhead' ? /Workshop invitation/ : doc.id === 'lab-notes' ? /Make\. Test\. Learn\./ : /Research prototype/)
      assert.ok(parts['word/header1.xml'])
    } else {
      const slides = Object.keys(parts).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
      assert.equal(slides.length, doc.layouts.length)
      assert.ok(slides.some((path) => strFromU8(parts[path]).includes('Build together')))
    }
  }
})

test('SPARK Lab: supporting graphics export palette colours and keep panel geometry inside its canvas', () => {
  const palette = new Set(Object.values(brand.colours).map(hex => hex.toUpperCase()))
  for (const spec of brand.patterns) {
    const svg = pattern(ctx, spec)
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, spec.id)
    for (const [, hex] of svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)) assert.ok(palette.has(hex.toUpperCase()), `${spec.id}: ${hex}`)
    for (const line of spec.lines ?? []) for (const [x, y] of line.points) {
      assert.ok(x >= 0 && x <= spec.width && y >= 0 && y <= spec.height, `${spec.id}: panel point ${x},${y}`)
    }
  }
})

test('SPARK Lab: filled repeats preserve the source arrow at three scales and point inward correctly', () => {
  const geometry = arrowGeometry(loadSparkLogo(`${folder}reference/logo-site.svg`))
  assert.deepEqual(brand.symbols.arrow.paths, [geometry.path])
  assert.deepEqual(brand.symbols.arrow.viewBox, [0, 0, geometry.width, geometry.height])
  const source = /<polygon\s+points="([^"]+)"/.exec(read('reference/logo-site.svg'))[1].trim().split(/[\s,]+/).map(Number)
  const minX = Math.min(...source.filter((_, i) => i % 2 === 0)), minY = Math.min(...source.filter((_, i) => i % 2 === 1))
  geometry.vertices.forEach(([x, y], i) => {
    assert.ok(Math.abs(x - (source[i * 2] - minX)) < 1e-8)
    assert.ok(Math.abs(y - (source[i * 2 + 1] - minY)) < 1e-8)
  })
  const studies = brand.patterns.filter(p => p.id.startsWith('arrows-'))
  assert.equal(studies.length, ARROW_STUDIES.length)
  for (const spec of studies) {
    assert.ok(spec.place.every(p => ['arrow', 'spark'].includes(p.symbol)))
    const svg = pattern(ctx, spec)
    if (spec.place.some(p => p.symbol === 'arrow')) assert.ok(svg.includes(`d="${geometry.path}"`))
    if (spec.place.some(p => p.symbol === 'spark')) assert.ok(svg.includes(`d="${brand.symbol.paths[1]}"`), 'the spark source path is retained')
    else assert.ok(!svg.includes(brand.symbol.paths[1]))
    assert.deepEqual(spec.place, arrowField(geometry, spec.id.slice(7)).place, 'preset and explorer use identical geometry')
    assert.deepEqual(spec.dots, arrowField(geometry, spec.id.slice(7)).dots)
  }
  assert.equal(new Set(studies.find(s => s.id === 'arrows-mixed').place.map(p => p.scale)).size, 3)
  assert.equal(new Set(studies.find(s => s.id === 'arrows-pinwheel').place.map(p => p.scale)).size, 2)
  const inward = studies.find(s => s.id === 'arrows-inward')
  for (const p of inward.place) {
    const cx = p.x + geometry.width * p.scale / 2, cy = p.y + geometry.height * p.scale / 2
    const desired = Math.atan2(inward.height / 2 - cy, inward.width / 2 - cx)
    const actual = (geometry.heading + (p.rotation ?? 0)) * Math.PI / 180
    assert.ok(Math.cos(actual - desired) > .999999, 'the arrow points at the centre')
  }
  const field = arrowField(geometry, 'rows')
  assert.ok(arrowField(geometry, 'rows', 960, 600, { density: 150 }).place.length > field.place.length)
  assert.ok(arrowField(geometry, 'rows', 960, 600, { size: 150 }).place[0].scale > field.place[0].scale)
})

test('SPARK Lab: free directions mix eight headings and three scales, with reproducible spark studies', () => {
  const geometry = arrowGeometry(loadSparkLogo(`${folder}reference/logo-site.svg`))
  const directions = arrowField(geometry, 'directions')
  assert.equal(new Set(directions.place.map(p => p.rotation ?? 0)).size, 8)
  assert.equal(new Set(directions.place.map(p => p.scale)).size, 3)
  const scatter = arrowField(geometry, 'scatter')
  assert.ok(new Set(scatter.place.map(p => p.rotation ?? 0)).size > 8)
  assert.equal(new Set(scatter.place.map(p => p.scale)).size, 3)
  assert.deepEqual(scatter, arrowField(geometry, 'scatter'), 'scatter stays fixed across builds')
  const currents = arrowField(geometry, 'currents')
  const vx = p => Math.cos((geometry.heading + (p.rotation ?? 0)) * Math.PI / 180)
  assert.ok(currents.place.some(p => vx(p) > .8) && currents.place.some(p => vx(p) < -.8), 'streams travel in opposite directions')
  const mixed = arrowField(geometry, 'spark-mix')
  assert.deepEqual(new Set(mixed.place.map(p => p.symbol)), new Set(['arrow', 'spark']))
  const stars = arrowField(geometry, 'constellation')
  assert.ok(stars.place.every(p => p.symbol === 'spark') && stars.dots.length)
  assert.equal(new Set(stars.place.map(p => p.scale)).size, 4)
  assert.ok(brand.symbols.spark.markup.includes(`d="${geometry.spark.path}"`))
})

test('Pattern placements select a named symbol, rotate around its viewBox centre and reject invalid data', () => {
  const placed = { id: 'test-arrow', width: 100, height: 100, background: 'cream', place: [{ x: 10, y: 20, scale: .25, colour: 'orange', symbol: 'arrow', rotation: 90 }] }
  const svg = pattern(ctx, placed)
  const centre = /scale\(\.25\) rotate\(90 ([\d.]+) ([\d.]+)\)/.exec(svg)
  assert.ok(centre)
  assert.ok(Math.abs(Number(centre[1]) - brand.symbols.arrow.viewBox[2] / 2) < 1e-8)
  assert.ok(Math.abs(Number(centre[2]) - brand.symbols.arrow.viewBox[3] / 2) < 1e-8)
  for (const [change, message] of [[{ symbol: 'missing' }, /uses symbol `missing`/], [{ rotation: Infinity }, /numeric rotation/], [{ scale: -1 }, /positive scale/]]) {
    const invalid = { ...placed, place: [{ ...placed.place[0], ...change }] }
    assert.ok(validateBrand({ ...brand, patterns: [invalid] }).some(problem => message.test(problem)))
  }
})
