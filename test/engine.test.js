// The engine's general behaviour, independent of any one brand's reference files.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { allFields, colour, interpolate, n, planKit, renderTemplate, scopeIds, templateFields, toUnits, validateBrand } from '../src/engine/index.js'
import { guidePages, guideSheets } from '../src/engine/guide.js'
import { createStarterBrand, STARTER_FONTS } from '../src/engine/starter.js'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { BRAND_DIR, brand } from './fixtures.js'

const northwind = JSON.parse(readFileSync(new URL('../brands/northwind/brand.json', import.meta.url), 'utf8'))

test('numbers print the way the original Python builder printed them', () => {
  assert.equal(n(16), '16')
  assert.equal(n(0.46875), '0.46875')
  assert.equal(n(144.727272727), '144.72727273')
  assert.equal(n(-0.000000001), '0')
})

test('colours resolve by palette key, by role, and pass literals through', () => {
  assert.equal(colour(brand, 'midnight'), '#0B2B4A')
  assert.equal(colour(brand, 'primary'), '#0B2B4A')
  assert.equal(colour(brand, 'line'), '#D9DCDF')
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

test('the built-in brands validate', () => {
  assert.deepEqual(validateBrand(brand), [])
  assert.deepEqual(validateBrand(northwind), [])
  assert.ok(validateBrand({ id: 'Bad Id' }).length > 3)
})

test('fields are the templates’ text ids, shared across templates by name', () => {
  const card = brand.templates.find((template) => template.id === 'business-card-back')
  assert.deepEqual(templateFields(card).map((field) => field.id), ['contact-name', 'contact-role', 'contact-email', 'contact-phone', 'contact-website'])
  const headline = allFields(brand.templates).find((field) => field.id === 'headline-line-1')
  assert.deepEqual(headline.templates, ['social-post', 'presentation-cover'])
})

test('a field value replaces the placeholder, escaped', () => {
  const card = brand.templates.find((template) => template.id === 'business-card-back')
  const { svg } = renderTemplate({ brand, values: { 'contact-name': 'Ada & Co <ltd>' } }, card)
  assert.match(svg, /<text id="contact-name"[^>]*>Ada &amp; Co &lt;ltd&gt;<\/text>/)
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

test('with fonts loaded, the guide and outlined templates set their text as paths', async () => {
  const fonts = await loadBrandFontsFromDisk(brand, BRAND_DIR)
  assert.deepEqual(fonts.failures, [])
  const pages = guidePages({ brand, fonts })
  assert.equal(pages.length, 8)
  for (const page of [...pages, ...guideSheets({ brand, fonts })]) assert.ok(!/<text\b/.test(page.render()), `${page.id} has live text`)
  const post = renderTemplate({ brand, fonts, outline: true }, brand.templates.find((template) => template.id === 'social-post')).svg
  assert.ok(!/<text\b/.test(post))
  assert.match(post, /aria-label="From insight"/)
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
  assert.ok(paths.includes('logos/outlined/ddc-stacked-white.svg'))
  assert.ok(paths.includes('guidelines/ddcnorth-brand-guide.pdf'))
  assert.ok(paths.includes('web/DdcNorthLogo.tsx'))
  assert.equal(new Set(paths).size, paths.length, 'no path twice')
})
