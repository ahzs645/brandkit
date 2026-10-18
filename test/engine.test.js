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
  // The original guide's eight pages, and the application system's six before the last.
  assert.equal(pages.length, 14)
  for (const page of [...pages, ...guideSheets({ brand, fonts })]) assert.ok(!/<text\b/.test(page.render()), `${page.id} has live text`)
  for (const template of brand.templates) assert.ok(!/<text\b/.test(renderTemplate({ brand, fonts, outline: true }, template).svg), `${template.id} has live text`)
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

test('a revision patches the definition, and the kit carries it beside the approved files', async () => {
  const { withRevision, mergePatch } = await import('../src/engine/revisions.js')
  assert.deepEqual(mergePatch({ a: { b: 1, c: [1, 2] }, d: 1 }, { a: { c: [3] }, d: null }), { a: { b: 1, c: [3] } })
  const rising = withRevision(brand, 'rising')
  assert.equal(rising.version, '2.2-rising')
  assert.deepEqual(rising.symbol.rows, [1, 2, 3])
  assert.equal(rising.symbol.radius, brand.symbol.radius, 'untouched keys survive')
  assert.equal(brand.symbol.rows.join(), '3,2,1', 'the approved definition is not changed')
  assert.ok(!rising.guide.sheets.some((sheet) => sheet.group === 'revisions'))
  const paths = planKit(brand).map((entry) => entry.path)
  for (const path of ['revisions/rising/comparison.svg', 'revisions/rising/brand.json', 'revisions/rising/README.md', 'revisions/rising/logos/ddcnorth-horizontal-black.svg', 'revisions/rising/symbol/ddcnorth-symbol-micro.svg']) assert.ok(paths.includes(path), path)
  assert.ok(!planKit(rising).some((entry) => entry.path.startsWith('revisions/')), 'a revised kit does not nest revisions')
  const approved = planKit(brand).find((entry) => entry.path === 'logos/outlined/ddcnorth-horizontal-black.svg').make({ brand })
  const proposed = planKit(brand).find((entry) => entry.path === 'revisions/rising/logos/ddcnorth-horizontal-black.svg').make({ brand })
  assert.notEqual(approved, proposed)
})

test('the BC example brands validate, and draw every template, signature and guide page', async () => {
  for (const id of ['bc-province-1977', 'bc-hydro-1983']) {
    const folder = new URL(`../brands/${id}/`, import.meta.url).pathname
    const bc = JSON.parse(readFileSync(`${folder}brand.json`, 'utf8'))
    assert.deepEqual(validateBrand(bc), [], id)
    const fonts = await loadBrandFontsFromDisk(bc, folder)
    assert.deepEqual(fonts.failures, [], `${id} fonts`)
    for (const template of bc.templates) {
      const { svg } = renderTemplate({ brand: bc, fonts, outline: true }, template)
      assert.ok(svg.includes('</svg>') && !svg.includes('NaN') && !svg.includes('undefined'), `${id}/${template.id}`)
    }
    for (const page of [...guidePages({ brand: bc, fonts }), ...guideSheets({ brand: bc, fonts })]) assert.ok(!/NaN|undefined/.test(page.render()), `${id}/${page.id}`)
    const plan = planKit(bc).map((entry) => entry.path)
    assert.equal(new Set(plan).size, plan.length, `${id}: no path twice`)
  }
})

test('a ministry sets into every departmental Province signature, and an empty field drops its line', async () => {
  const { logoDocument } = await import('../src/engine/artwork.js')
  const bc = JSON.parse(readFileSync(new URL('../brands/bc-province-1977/brand.json', import.meta.url), 'utf8'))
  const forests = bc.departments.items.find((item) => item.id === 'forests')
  assert.equal(forests.values.ministry, 'Ministry of\nForests')
  const svg = logoDocument({ brand: bc, values: forests.values }, { signature: 'horizontal', colourway: 'positive' })
  assert.match(svg, />Forests</)
  assert.match(svg, /fill="#5C462B"/, 'the symbol in brown')
  assert.doesNotMatch(svg, /stroke-width/, 'no rule without an address')
  const split = bc.departments.items.find((item) => item.values['ministry-split'] === 'PUBLIC WORKS')
  assert.match(logoDocument({ brand: bc, values: split.values }, { signature: 'vertical', colourway: 'black' }), />PUBLIC WORKS</)
  assert.ok(planKit(bc).some((entry) => entry.path === 'logos/ministries/forests/horizontal-positive.svg'))
})

test('brands/index.json lists every built-in brand by its name', async () => {
  const { readdirSync, existsSync } = await import('node:fs')
  const manifest = JSON.parse(readFileSync(new URL('../brands/index.json', import.meta.url), 'utf8'))
  const folders = readdirSync(new URL('../brands/', import.meta.url)).filter((id) => existsSync(new URL(`../brands/${id}/brand.json`, import.meta.url)))
  assert.deepEqual(manifest.map(({ id }) => id).sort(), folders.sort())
  for (const { id, name } of manifest) assert.equal(name, JSON.parse(readFileSync(new URL(`../brands/${id}/brand.json`, import.meta.url), 'utf8')).name, id)
})

test('every BC template, signature and guide page cites manual pages that exist, and the manifest indexes them back', async () => {
  const { GUIDE_BOOKS } = await import('../manuals/bc/books.js')
  const pages = new Set(GUIDE_BOOKS.flatMap((book) => book.pages.map((page) => `${book.id}/${page.id}`)))
  const manifest = JSON.parse(readFileSync(new URL('../brands/index.json', import.meta.url), 'utf8'))
  for (const id of ['bc-province-1977', 'bc-hydro-1983']) {
    const definition = JSON.parse(readFileSync(new URL(`../brands/${id}/brand.json`, import.meta.url), 'utf8'))
    assert.equal(definition.manuals.pack, 'bc')
    const items = [...definition.templates, ...definition.signatures, ...definition.guide.pages]
    for (const item of items) {
      assert.ok(item.sources?.length, `${id}: ${item.id ?? item.title} has no sources`)
      for (const source of item.sources) assert.ok(pages.has(`${source.book}/${source.page}`), `${id}: ${source.book}/${source.page}`)
    }
    const index = manifest.find((entry) => entry.id === id).pages
    const indexed = Object.values(index).flat().length
    assert.equal(indexed, items.reduce((sum, item) => sum + item.sources.length, 0), id)
    for (const key of Object.keys(index)) assert.ok(pages.has(key), key)
  }
})

test('every ManualKit drawing is a template with its zones filled, and sits in its manual page', async () => {
  const manifest = JSON.parse(readFileSync(new URL('../manuals/bc/illustrations/manifest.json', import.meta.url), 'utf8'))
  const books = { G: 'general', V: 'vehicle', H: 'hydro' }
  for (const asset of manifest.assets) {
    const id = asset.id.startsWith('H') ? 'bc-hydro-1983' : 'bc-province-1977'
    const definition = JSON.parse(readFileSync(new URL(`../brands/${id}/brand.json`, import.meta.url), 'utf8'))
    const template = definition.templates.find((entry) => entry.id === `illustrated-${asset.id.toLowerCase()}`)
    assert.ok(template, asset.id)
    const { svg } = renderTemplate({ brand: definition }, template)
    const filled = (svg.match(/data-zone="/g) ?? []).length
    assert.ok(filled >= asset.branding_zones.filter((zone) => zone.kind !== 'process-surface').length, `${asset.id}: ${filled} zones filled`)
    const page = readFileSync(new URL(`../manuals/bc/pages/${books[asset.id[0]]}/${asset.id.split('-')[0]}.svg`, import.meta.url), 'utf8')
    assert.ok(page.includes(`data-illustration="${asset.id}"`), `${asset.id} is not on its page`)
  }
})
