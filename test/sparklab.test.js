import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildKit, planKit } from '../src/engine/kit.js'
import { validateBrand } from '../src/engine/brand.js'
import { logoDocument } from '../src/engine/artwork.js'
import { guidePages, guideSheets } from '../src/engine/guide.js'
import { renderTemplate, templateFields } from '../src/engine/templates.js'
import { loadBrandFontsFromDisk, readAssetFromDisk } from '../src/fonts/node.js'
import { officeFile } from '../src/export/office.js'
import { unzipSync, strFromU8 } from 'fflate'

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
    const { svg } = renderTemplate({ ...ctx, values: { [fields[0].id]: 'Ideas & <prototypes>' } }, template)
    assert.match(svg, /Ideas &amp; &lt;prototypes&gt;/, template.id)
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
  for (const path of ['site/index.html', 'motion/index.html', 'docs/brand-details.html', 'guidelines/brand-details.html']) {
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
    const file = await officeFile({ ...ctx, values: { 'letter-subject': 'Workshop invitation', 'project-title': 'Research prototype', 'deck-title': 'Build together', 'contact-name': 'Avery Example' } }, doc, { png, readAsset: (src) => readAssetFromDisk(folder, src) })
    if (doc.format === 'html') {
      assert.match(strFromU8(file.bytes), /Avery Example/)
      assert.match(strFromU8(file.bytes), /mailto:sparklab@unbc.ca/)
      continue
    }
    const parts = unzipSync(file.bytes)
    if (doc.format === 'docx') {
      const xml = strFromU8(parts['word/document.xml'])
      assert.match(xml, doc.id === 'letterhead' ? /Workshop invitation/ : /Research prototype/)
      assert.ok(parts['word/header1.xml'])
    } else {
      const slides = Object.keys(parts).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
      assert.equal(slides.length, doc.layouts.length)
      assert.ok(slides.some((path) => strFromU8(parts[path]).includes('Build together')))
    }
  }
})
