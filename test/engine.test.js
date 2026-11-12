// The engine's general behaviour, on the example brand brandkit ships (northwind). The brands made
// with brandkit are tested where they are kept, against this engine, with their own reference files.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { allFields, colour, interpolate, n, planKit, renderTemplate, scopeIds, templateFields, toUnits, validateBrand } from '../src/engine/index.js'
import { guidePages, guideSheets } from '../src/engine/guide.js'
import { createStarterBrand, STARTER_FONTS } from '../src/engine/starter.js'
import { findAsset, loadBrandFontsFromDisk } from '../src/fonts/node.js'

const BRAND_DIR = fileURLToPath(new URL('../brands/northwind/', import.meta.url))
const brand = JSON.parse(readFileSync(new URL('brand.json', `file://${BRAND_DIR}`), 'utf8'))

test('numbers print the way the original Python builder printed them', () => {
  assert.equal(n(16), '16')
  assert.equal(n(0.46875), '0.46875')
  assert.equal(n(144.727272727), '144.72727273')
  assert.equal(n(-0.000000001), '0')
})

test('colours resolve by palette key, by role, and pass literals through', () => {
  assert.equal(colour(brand, 'primary'), '#1F4E46')
  assert.equal(colour(brand, 'reverse'), '#FFFFFF', 'a role names a palette key')
  assert.equal(colour(brand, 'currentColor'), 'currentColor')
})

test('copy placeholders fill from the brand, and unknown ones stay visible', () => {
  assert.equal(interpolate('{name} v{displayVersion}', { name: 'x', displayVersion: '2' }), 'x v2')
  assert.equal(interpolate('{nope}', {}), '{nope}')
})

test('print measurements convert to the template unit', () => {
  assert.ok(Math.abs(toUnits('10pt', 'mm') - 3.5278) < 1e-4)
  assert.equal(toUnits('4mm', 'mm'), 4)
  assert.equal(toUnits(12, 'mm'), 12)
})

test('ids are scoped so repeated artwork stays valid in one document', () => {
  assert.equal(scopeIds('<g id="a"><use href="#a"/><path fill="url(#a)"/></g>', 'p'), '<g id="p-a"><use href="#p-a"/><path fill="url(#p-a)"/></g>')
})

test('the built-in brand validates, and a bad definition does not', () => {
  assert.deepEqual(validateBrand(brand), [])
  assert.ok(validateBrand({ id: 'Bad Id' }).length > 3)
})

test('fields are the templates’ text ids, shared across templates by name', () => {
  const fields = allFields(brand.templates)
  assert.ok(fields.length > 0)
  for (const field of fields) for (const id of field.templates) assert.ok(brand.templates.some((template) => template.id === id), `${field.id}: ${id}`)
  const shared = fields.find((field) => field.templates.length > 1)
  assert.ok(shared, 'some field is shared between templates')
})

test('a field value replaces the placeholder, escaped', () => {
  const template = brand.templates.find((entry) => templateFields(entry).length)
  const [field] = templateFields(template)
  const { svg } = renderTemplate({ brand, values: { [field.id]: 'Ada & Co <ltd>' } }, template)
  assert.match(svg, /Ada &amp; Co &lt;ltd&gt;/)
})

test('millimetre templates with point sizes and line blocks render', () => {
  const template = {
    id: 'card', width: 88.9, height: 50.8, unit: 'mm',
    elements: [
      { type: 'background', fill: 'reverse' },
      { type: 'symbol', x: 4, y: 6, height: 12.5, colour: 'primary' },
      { type: 'lines', x: 20, y: 9, leading: '4mm', size: '9pt', lines: [{ id: 'a', text: 'Province of', font: 'bold' }, { id: 'skip', text: '' }, { id: 'b', text: 'British Columbia', font: 'bold' }] },
      { type: 'line', x1: 20, y1: 19.5, x2: 85, y2: 19.5, strokeWidth: '0.5pt' }
    ]
  }
  const { svg, physical } = renderTemplate({ brand }, template)
  assert.deepEqual(physical, ['88.9mm', '50.8mm'])
  assert.match(svg, /font-size="3\.175"/)
  assert.match(svg, /<text id="b" x="20" y="13"/, 'an empty line closes up')
})

test('a brand without its own fonts is given the library’s, and the guide and outlined templates set text as paths', async () => {
  // northwind names the starter's Inter and Space Mono and carries none of them.
  for (const face of Object.values(brand.fonts)) {
    assert.ok(!existsSync(`${BRAND_DIR}${face.file}`), `${face.file} is the library's, not northwind's`)
    assert.ok(findAsset(BRAND_DIR, face.file).includes(`${'/library/'}`), face.file)
  }
  const fonts = await loadBrandFontsFromDisk(brand, BRAND_DIR)
  assert.deepEqual(fonts.failures, [])
  const pages = guidePages({ brand, fonts })
  assert.ok(pages.length >= 8)
  for (const page of [...pages, ...guideSheets({ brand, fonts })]) assert.ok(!/<text\b/.test(page.render()), `${page.id} has live text`)
  for (const template of brand.templates) assert.ok(!/<text\b/.test(renderTemplate({ brand, fonts, outline: true }, template).svg), `${template.id} has live text`)
})

test('the starter makes a complete, valid brand from a few choices', async () => {
  const fonts = await loadBrandFontsFromDisk({ fonts: STARTER_FONTS }, BRAND_DIR)
  const made = createStarterBrand({ name: 'Harbour & Co', parent: 'H&C', symbol: { grid: 2, cells: [[0, 0], [1, 1]], shape: 'square' } }, fonts)
  assert.equal(made.id, 'harbour-co')
  assert.deepEqual(validateBrand(made), [])
  assert.equal(made.families.length, 2)
  assert.equal(made.symbol.paths.length, 2)
  assert.ok(planKit(made).length > 100)
  for (const page of guidePages({ brand: made, fonts })) assert.ok(page.render().startsWith('<svg'))
})

test('the kit plan covers every family, layout and colour, and the guide', () => {
  const paths = planKit(brand).map((entry) => entry.path)
  assert.ok(paths.some((path) => path.startsWith('logos/')))
  assert.ok(paths.some((path) => path.startsWith('guidelines/') && path.endsWith('.pdf')))
  assert.ok(paths.includes('source/brand.json'))
  assert.equal(new Set(paths).size, paths.length, 'no path twice')
})

test('a paragraph field wraps to its width and keeps typed line breaks', () => {
  const template = { id: 'p', width: 100, height: 50, unit: 'mm', elements: [{ type: 'paragraph', id: 'ministry', text: 'Ministry of\nForests, Lands and Natural Resource Operations', x: 10, y: 10, width: 30, size: '10pt', leading: '4.25mm', maxLines: 3 }] }
  const { svg } = renderTemplate({ brand }, template)
  const lines = [...svg.matchAll(/<text id="ministry-(\d)"[^>]*>([^<]*)</g)].map((match) => match[2])
  assert.equal(lines[0], 'Ministry of')
  assert.equal(lines.length, 3, 'capped at maxLines')
  assert.ok(templateFields(template)[0].multiline)
})

test('a composed line fills from shared fields, and goes when one is cleared', () => {
  const owner = { ...brand, fields: { telephone: { label: 'Telephone', placeholder: '(604) 000-0000' } } }
  const template = { id: 'c', width: 100, height: 50, elements: [{ type: 'text', id: 'phone-line', compose: 'Phone: {telephone}', x: 0, y: 10, size: 10 }] }
  assert.match(renderTemplate({ brand: owner }, template).svg, />Phone: \(604\) 000-0000</)
  assert.match(renderTemplate({ brand: owner, values: { telephone: '250 555 0100' } }, template).svg, />Phone: 250 555 0100</)
  assert.doesNotMatch(renderTemplate({ brand: owner, values: { telephone: '' } }, template).svg, /Phone/)
  assert.deepEqual(templateFields(template, owner).map(({ id, label }) => [id, label]), [['telephone', 'Telephone']])
})

test('a revision patches the definition without changing the approved one', async () => {
  const { withRevision, mergePatch, approvedOnly, revisionsOf } = await import('../src/engine/revisions.js')
  assert.deepEqual(mergePatch({ a: { b: 1, c: [1, 2] }, d: 1 }, { a: { c: [3] }, d: null }), { a: { b: 1, c: [3] } })
  const proposed = { ...brand, revisions: [{ id: 'teal', title: 'Teal primary', status: 'proposed', version: '1.1', changes: { colours: { primary: '#0F6B6B' } } }] }
  const revised = withRevision(proposed, 'teal')
  assert.equal(colour(revised, 'primary'), '#0F6B6B')
  assert.equal(colour(proposed, 'primary'), '#1F4E46', 'the approved definition is not changed')
  assert.deepEqual(revisionsOf(approvedOnly(proposed)), [])
})

test('brands/index.json lists every built-in brand by its name', () => {
  const manifest = JSON.parse(readFileSync(new URL('../brands/index.json', import.meta.url), 'utf8'))
  const folders = readdirSync(new URL('../brands/', import.meta.url)).filter((id) => existsSync(new URL(`../brands/${id}/brand.json`, import.meta.url)))
  assert.deepEqual(manifest.map(({ id }) => id).sort(), folders.sort())
  for (const { id, name } of manifest) assert.equal(name, JSON.parse(readFileSync(new URL(`../brands/${id}/brand.json`, import.meta.url), 'utf8')).name, id)
})

test('every built-in brand has the menu logo scripts/menu-logos.mjs draws', () => {
  for (const { id } of JSON.parse(readFileSync(new URL('../brands/index.json', import.meta.url), 'utf8'))) {
    assert.ok(existsSync(new URL(`../brands/${id}/logo-menu.svg`, import.meta.url)), id)
  }
})

test('a two-colour symbol drawn as markup takes a colourway in its own files, the kit and the guide', async () => {
  const { symbolDocument } = await import('../src/engine/artwork.js')
  const base = JSON.parse(readFileSync(new URL('../brands/northwind/brand.json', import.meta.url), 'utf8'))
  const brand = {
    ...base,
    symbol: { name: 'two-tone', viewBox: [0, 0, 20, 10], markup: '<path fill="{primary}" d="M0 0H10V10H0Z"/><path fill="{secondary}" d="M10 0H20V10H10Z"/>' },
    colourways: { 'full-colour': { label: 'Full colour', roles: { primary: '#D9021C', secondary: '#231F20' } }, reverse: { roles: { primary: '#D9021C', secondary: '#FFFFFF' } } }
  }
  const svg = symbolDocument({ brand }, { colourway: 'full-colour' })
  assert.match(svg, /fill="#D9021C"/)
  assert.match(svg, /fill="#231F20"/)
  assert.doesNotMatch(symbolDocument({ brand }, { colourKey: 'ink' }), /#D9021C/, 'one colour paints every part')
  const paths = planKit(brand).map((entry) => entry.path)
  assert.ok(paths.includes('symbol/northwind-symbol-full-colour.svg') && paths.includes('symbol/northwind-symbol-reverse.svg'), 'each colourway is a symbol file')
  const [page] = guidePages({ brand: { ...brand, guide: { ...brand.guide, pages: [{ title: 'Emblem', elements: [{ type: 'symbol', x: 0, y: 0, height: 10, colourway: 'reverse' }] }] } } })
  assert.match(page.render(), /fill="#FFFFFF"/i, "the guide paints the symbol in its colourway")
})
