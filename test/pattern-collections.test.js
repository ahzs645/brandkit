// Integration checks for the six brand-specific supporting collections. The committed fixture
// records original definitions and legacy renders from 48f7248 before these additions, with
// the explicit OTE identity/package refresh recorded in source.overrides. It was
// captured once with `git show <commit>:brands/<id>/brand.json`, canonical JSON SHA-256 hashes,
// and planKit({ rasters:false, pdfs:false, assets:false }) with the original local brand fonts.
// Refreshing it is an explicit, reviewed baseline change; tests never record or rewrite it and
// do not require a .git directory. See the fixture's source description for the recording scope.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateBrand, colour } from '../src/engine/brand.js'
import { pattern } from '../src/engine/artwork.js'
import { planKit } from '../src/engine/kit.js'
import { guideSheets } from '../src/engine/guide.js'
import { renderTemplate, templateFields } from '../src/engine/templates.js'
import { loadBrandFontsFromDisk, findAsset } from '../src/fonts/node.js'

const root = new URL('../', import.meta.url).pathname
const extension = 'pattern-explorations'
const ids = ['ddcnorth', 'firstform', 'northwind', 'overtheedge', 'bc-hydro-1983', 'bc-province-1977']
const definitions = new Map(ids.map(id => [id, JSON.parse(readFileSync(join(root, 'brands', id, 'brand.json'), 'utf8'))]))
const fixture = JSON.parse(readFileSync(new URL('./fixtures/pattern-collections-baseline.json', import.meta.url), 'utf8'))
const baseline = new Map(Object.entries(fixture.brands))
const fontsFor = new Map()
const fonts = async id => {
  if (!fontsFor.has(id)) fontsFor.set(id, loadBrandFontsFromDisk(definitions.get(id), join(root, 'brands', id)))
  return fontsFor.get(id)
}
const additions = values => (values ?? []).filter(value => value?.extension === extension)
const original = values => (values ?? []).filter(value => value?.extension !== extension)
const unique = (values, label) => assert.equal(new Set(values).size, values.length, label)
const sha = text => createHash('sha256').update(text).digest('hex')
const canonical = value => Array.isArray(value)
  ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
    : JSON.stringify(value)
const digest = value => sha(canonical(value))

test('all six collections validate and preserve the identifying definitions and historical material', () => {
  const changedFields = new Set(['patternCollection', 'patterns', 'templates', 'documents', 'files', 'symbols', 'guide'])
  const arrayFields = new Set(['patterns', 'templates', 'documents', 'files'])
  assert.equal(fixture.version, 1)
  assert.deepEqual([...baseline.keys()].sort(), [...ids].sort(), 'all six original baselines are recorded')
  for (const id of ids) {
    const brand = definitions.get(id), before = baseline.get(id)
    assert.deepEqual(validateBrand(brand), [], id)
    assert.ok(brand.patternCollection, `${id}: installed collection metadata`)
    assert.equal(brand.patternCollection.page, 'docs/pattern-explorer.html')
    for (const key of Object.keys(brand)) if (!before.keys.includes(key)) assert.ok(changedFields.has(key), `${id}: unexpected top-level change ${key}`)
    for (const key of arrayFields) assert.equal(digest(original(brand[key])), before.arrays[key], `${id}: original ${key} preserved`)
    for (const key of before.symbols.keys) {
      assert.ok(Object.hasOwn(brand.symbols ?? {}, key), `${id}: existing symbol ${key} retained`)
      assert.equal(digest(brand.symbols[key]), before.symbols.fields[key], `${id}: existing symbol ${key}`)
    }
    for (const key of Object.keys(brand.symbols ?? {})) if (!before.symbols.keys.includes(key)) assert.ok(key.startsWith('explore-'), `${id}: supporting symbol namespaced`)
    for (const key of before.guide.keys) {
      assert.ok(Object.hasOwn(brand.guide, key), `${id}: existing guide ${key} retained`)
      assert.equal(digest(key === 'sheets' ? original(brand.guide.sheets) : brand.guide[key]), before.guide.fields[key], `${id}: existing guide ${key}`)
    }
    for (const key of Object.keys(brand.guide)) if (!before.guide.keys.includes(key)) assert.equal(key, 'sheets', `${id}: only supporting guide sheets may be added`)
    assert.equal(digest(original(brand.guide.sheets)), before.guide.sheets, `${id}: existing guide sheets preserved`)
    for (const key of before.keys) {
      assert.ok(Object.hasOwn(brand, key), `${id}: existing ${key} retained`)
      let value = brand[key]
      if (arrayFields.has(key)) value = original(value)
      if (key === 'symbols') value = Object.fromEntries(before.symbols.keys.map(name => [name, brand.symbols[name]]))
      if (key === 'guide') value = Object.fromEntries(before.guide.keys.map(name => [name, name === 'sheets' ? original(brand.guide.sheets) : brand.guide[name]]))
      assert.equal(digest(value), before.fields[key], `${id}: established ${key} is unchanged`)
    }
  }
})

test('installed collection references, appended IDs and exported file paths are complete and unique', () => {
  for (const id of ids) {
    const brand = definitions.get(id), collection = brand.patternCollection
    const patterns = additions(brand.patterns), templates = additions(brand.templates)
    assert.ok(patterns.length >= 6, `${id}: at least six supporting studies`)
    assert.ok(templates.length >= 2, `${id}: two editable applications`)
    assert.deepEqual(new Set(collection.patterns), new Set(patterns.map(p => p.id)), `${id}: pattern metadata`)
    assert.deepEqual(new Set(collection.templates), new Set(templates.map(t => t.id)), `${id}: template metadata`)
    for (const key of ['patterns', 'templates', 'documents']) unique((brand[key] ?? []).map(item => item.id), `${id}: ${key} IDs`)
    for (const item of [...patterns, ...templates]) assert.ok(item.id.startsWith('explore-'), `${id}: supporting study ID`)
    const paths = planKit(brand).map(entry => entry.path)
    unique(paths, `${id}: planned paths`)
    for (const path of ['docs/pattern-explorer.html', 'docs/patterns-guide.html', 'guidelines/pattern-studies.svg', ...patterns.map(p => `patterns/${p.id}.svg`), ...templates.map(t => `templates/${t.id}.svg`)]) assert.ok(paths.includes(path), `${id}: ${path}`)
    for (const file of additions(brand.files)) {
      const src = file.from ?? file, target = file.to ?? file
      assert.ok(typeof src === 'string' && typeof target === 'string', `${id}: file source and destination`)
      assert.ok(readFileSync(findAsset(join(root, 'brands', id), src)).length, `${id}: ${src} is present`)
    }
  }
})

test('new pattern SVGs use finite vector geometry and the established brand palette', () => {
  for (const id of ids) {
    const brand = definitions.get(id)
    const colours = new Set([...Object.values(brand.colours), ...Object.values(brand.roles ?? {}).map(value => colour(brand, value))].filter(value => /^#[0-9a-f]{6}$/i.test(value)).map(value => value.toUpperCase()))
    for (const spec of additions(brand.patterns)) {
      const label = `${id}/${spec.id}`
      assert.ok(Number.isFinite(spec.width) && spec.width > 0 && Number.isFinite(spec.height) && spec.height > 0, label)
      const svg = pattern({ brand }, spec)
      assert.doesNotMatch(svg, /NaN|Infinity|undefined/, label)
      assert.doesNotMatch(svg, /<image\b/, `${label}: vector artwork`)
      for (const [, value] of svg.matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/gi)) assert.ok(colours.has(value.toUpperCase()), `${label}: ${value}`)
      for (const line of spec.lines ?? []) {
        assert.ok(line.points.length >= 2, label)
        for (const [x, y] of line.points) assert.ok(Number.isFinite(x) && Number.isFinite(y) && x >= -1e-5 && x <= spec.width + 1e-5 && y >= -1e-5 && y <= spec.height + 1e-5, `${label}: clipped line`)
      }
      for (const dot of spec.dots ?? []) assert.ok(Number.isFinite(dot.cx) && Number.isFinite(dot.cy) && Number.isFinite(dot.r) && dot.r >= 0 && dot.cx >= -1e-5 && dot.cx <= spec.width + 1e-5 && dot.cy >= -1e-5 && dot.cy <= spec.height + 1e-5, `${label}: bounded dot centres`)
      for (const place of spec.place ?? []) {
        assert.ok(Number.isFinite(place.x) && Number.isFinite(place.y) && Number.isFinite(place.scale) && place.scale > 0, label)
        assert.ok(place.rotation == null || Number.isFinite(place.rotation), label)
        if (place.symbol) assert.ok(brand.symbols?.[place.symbol], `${label}: defined motif`)
      }
    }
  }
})

test('new applications retain editable fields and pattern panels in live and outlined exports', async () => {
  for (const id of ids) {
    const brand = definitions.get(id), provider = await fonts(id)
    assert.deepEqual(provider.failures, [], `${id}: local fonts`)
    for (const template of additions(brand.templates)) {
      const fields = templateFields(template, brand)
      assert.ok(fields.length > 0, `${id}/${template.id}: editable fields`)
      const panels = template.elements.filter(element => element.type === 'pattern')
      assert.ok(panels.length, `${id}/${template.id}: reusable pattern panel`)
      for (const panel of panels) assert.ok(brand.patternCollection.patterns.includes(panel.pattern), `${id}/${template.id}: known pattern`)
      const ctx = { brand, fonts: provider, values: { [fields[0].id]: '<&>' } }
      const live = renderTemplate(ctx, template).svg
      const outlined = renderTemplate({ ...ctx, outline: true }, template).svg
      assert.match(live, /&lt;&amp;&gt;/, `${id}/${template.id}: escaped field value`)
      assert.match(live, /<text\b/, `${id}/${template.id}: live editable type`)
      assert.doesNotMatch(outlined, /<text\b/, `${id}/${template.id}: outlined production type`)
      assert.doesNotMatch(live + outlined, /NaN|Infinity|undefined/, `${id}/${template.id}`)
    }
    const sheet = guideSheets({ brand, fonts: provider }).find(sheet => sheet.path === 'guidelines/pattern-studies')
    assert.ok(sheet, `${id}: pattern guide sheet`)
    assert.doesNotMatch(sheet.render(), /NaN|Infinity|undefined|<text\b/, `${id}: outlined pattern guide`)
  }
})

test('existing generated vector and text assets remain identical after collection installation', async () => {
  for (const id of ids) {
    const brand = definitions.get(id), before = baseline.get(id), provider = await fonts(id)
    const planOptions = { rasters: false, pdfs: false, assets: false }
    const current = new Map(planKit(brand, planOptions).filter(entry => entry.kind === 'text').map(entry => [entry.path, entry]))
    for (const [path, expected] of Object.entries(before.renders)) {
      assert.ok(current.has(path), `${id}: existing ${path} retained`)
      let actual = current.get(path).make({ brand, fonts: provider })
      if (path === 'web/tokens.json') {
        // Documentation corrects semantic colour resolution and source font weights. Assert
        // those values, then restore only the former token defaults for this artwork baseline.
        const values = JSON.parse(actual)
        assert.deepEqual(values.roles, Object.fromEntries(Object.entries(brand.roles ?? {}).map(([role, value]) => [role, colour(brand, value)])))
        for (const heading of ['h1', 'h2']) assert.equal(values.typeScale[heading].weight, brand.typography?.headlines?.weight ?? brand.fonts?.display?.weight ?? 500)
        values.roles = Object.fromEntries(Object.keys(brand.roles ?? {}).map((role) => [role, colour(brand, role)]))
        for (const [style, weight] of Object.entries({ h1: 500, h2: 500, body: 400, caption: 400, label: 400 })) values.typeScale[style].weight = weight
        actual = `${JSON.stringify(values, null, 2)}\n`
      }
      assert.equal(sha(actual), expected, `${id}: unchanged ${path}`)
    }
  }
})
