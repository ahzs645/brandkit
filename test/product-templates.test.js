// Product family options beyond the arrangements (endorsed variants, the family key, naming) and
// templates: a family's system kept apart from a brand, applied to another, and saved with a brand
// or into the revision that proposes it.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  BUILT_IN_PRODUCT_TEMPLATES, PRODUCT_TEMPLATE_FORMAT, applyProductTemplate, newProduct, planKit, productDocument, productFamilyHome,
  productFamilyKey, productLockup, productLockupSpec, productTemplateFrom, productVariant, productsOf, validateBrand, validateProductTemplate,
  withProductFamily, withRevision
} from '../src/engine/index.js'

const northwind = JSON.parse(readFileSync(new URL('../brands/northwind/brand.json', import.meta.url), 'utf8'))
const compared = BUILT_IN_PRODUCT_TEMPLATES.find((entry) => entry.id === 'endorsed-comparison')
const withFamily = (template = compared, extra = {}) => {
  const products = applyProductTemplate(northwind, template)
  return { ...structuredClone(northwind), products: { ...products, ...extra } }
}

test('every built-in template is valid and makes a valid family for a brand', () => {
  for (const template of BUILT_IN_PRODUCT_TEMPLATES) {
    assert.deepEqual(validateProductTemplate(template), [], template.id)
    const brand = { ...northwind, products: applyProductTemplate(northwind, template) }
    assert.deepEqual(validateBrand(brand), [], template.id)
    assert.equal(brand.products.parent.family, northwind.families[0].id, 'the brand supplies the parent')
    assert.equal(brand.products.items.length, 3, 'placeholders when the template has no starters')
  }
})

test('a template drops faces the brand lacks, and keeps the brand’s own products', () => {
  const { displayRegular: _dropped, ...fonts } = northwind.fonts
  const products = applyProductTemplate({ ...northwind, fonts }, compared)
  const matched = products.variants.find((entry) => entry.id === 'matched')
  assert.equal(matched.lockup.name.font, undefined, 'a face the brand lacks is dropped')
  assert.equal(matched.lockup.name.size, 1.353, 'the rest of the setting stays')
  assert.equal(applyProductTemplate(northwind, compared).variants.find((entry) => entry.id === 'matched').lockup.name.font, 'displayRegular')
  const kept = applyProductTemplate({ ...northwind, products: { items: [{ id: 'chart', name: 'Chart', accent: '#337F9E' }] } }, compared)
  assert.deepEqual(kept.items.map((item) => item.id), ['chart'])
  const given = applyProductTemplate(northwind, { ...compared, products: [{ name: 'Tide Table', accent: '#CD6448' }, { name: 'Tide table' }] })
  assert.deepEqual(given.items.map((item) => item.id), ['tide-table', 'tide-table-2'])
  assert.equal(given.items[0].accent, '#CD6448')
})

test('template mistakes are named', () => {
  const problems = (change) => { const next = structuredClone(compared); change(next); return validateProductTemplate(next).join(' ') }
  assert.match(problems((t) => { t.format = 'x' }), /`format` must be/)
  assert.match(problems((t) => { t.id = 'Not Ok' }), /`id` of lower-case/)
  assert.match(problems((t) => { t.family.items = [] }), /carries no `items`/)
  assert.match(problems((t) => { t.family.parent = { family: 'x' } }), /carries no parent logo/)
  assert.match(problems((t) => { t.products = [{ name: 'A', accent: 'blue' }] }), /six-digit hex/)
  assert.throws(() => applyProductTemplate(northwind, { ...compared, format: 'nope' }), /format/)
})

test('a family makes a template, and the template makes the same family on another brand', () => {
  const brand = withFamily(compared, { positioning: { line: 'Plan the passage.' }, decision: { date: '2026-11-10' } })
  const template = productTemplateFrom(brand, { label: 'Northwind products', products: true })
  assert.equal(template.format, PRODUCT_TEMPLATE_FORMAT)
  assert.deepEqual(validateProductTemplate(template), [])
  assert.ok(!template.family.parent && !template.family.items)
  assert.deepEqual(template.products.map((item) => item.name), ['One', 'Two', 'Three'])
  assert.ok(template.products.every((item) => /^#[0-9A-F]{6}$/.test(item.accent)))
  const again = applyProductTemplate(northwind, template)
  assert.deepEqual(again.variants, brand.products.variants)
  assert.equal(again.positioning.line, 'Plan the passage.')
  assert.throws(() => productTemplateFrom(northwind), /has no product family/)
})

test('a family is saved in the brand, or in the revision that proposes it', () => {
  const products = applyProductTemplate(northwind, compared)
  const saved = withProductFamily(northwind, products)
  assert.deepEqual(saved.products, products)
  assert.ok(!northwind.products, 'the brand given is not changed')
  assert.ok(!withProductFamily(saved, null).products, 'null removes it')
  const proposing = { ...structuredClone(northwind), revisions: [{ id: 'family', title: 'Family', version: '2', status: 'proposed', changes: {} }] }
  assert.equal(productFamilyHome(proposing, 'family'), 'family', 'a new family starts as a proposal')
  assert.equal(productFamilyHome(proposing, null), null)
  assert.equal(productFamilyHome({ ...proposing, products }, 'family'), null, 'an approved family stays in the definition')
  const proposed = withProductFamily(proposing, products, { revision: 'family' })
  assert.ok(!proposed.products && proposed.revisions[0].changes.products)
  assert.deepEqual(withRevision(proposed, 'family').products.items, products.items)
  assert.throws(() => withProductFamily(proposing, products, { revision: 'nope' }), /no revision called nope/)
})

test('variants change only what they set, and are validated', () => {
  const brand = withFamily()
  assert.equal(productVariant(brand), null, 'none chosen in a comparison')
  assert.equal(productLockupSpec(brand, 'stacked').stack, true)
  assert.equal(productLockupSpec(brand, 'stacked').name.tracking, -0.04, 'merged over the family settings')
  const chosen = withFamily(compared, { direction: 'a' })
  assert.equal(productVariant(chosen).id, 'rule', 'the chosen direction’s variant')
  assert.equal(productVariant(withFamily(compared, { direction: 'a', variant: 'mono' })).id, 'mono', '`variant` wins')
  const problems = (change) => { const next = withFamily(); change(next.products); return validateBrand(next).join(' ') }
  assert.match(problems((p) => { p.variant = 'z' }), /`products\.variant` names variant `z`/)
  assert.match(problems((p) => { p.variants[1].id = 'rule' }), /variant `rule` is listed twice/)
  assert.match(problems((p) => { p.variants[2].lockup.separator = 'dots' }), /separator.*is not one of/)
  assert.match(problems((p) => { p.variants[0].lockup = { name: { colour: 'red' } } }), /name\.colour/)
  assert.match(problems((p) => { p.variants[0].lockup = { stack: 'yes' } }), /stack.*true or false/)
  assert.match(problems((p) => { p.directions[0].variant = 'z' }), /direction `a` names variant `z`/)
  assert.match(problems((p) => { p.naming.fullName = 'Northwind' }), /must be text containing \{name\}/)
})

test('separators, name colour and stacking draw as described', () => {
  const brand = withFamily()
  const ctx = { brand, fonts: null }
  const draw = (variant, colour = '#000000') => productLockup(ctx, { product: 'one', arrangement: 'endorsed', colour, variant })
  const item = productsOf(brand)[0]
  assert.match(draw('rule').art, new RegExp(`data-product-rule="" d="M[\\d.]+ [\\d.]+V[\\d.]+" fill="none" stroke="${item.accent}"`))
  assert.doesNotMatch(draw('plain').art, /data-product-rule/, 'space only: no rule')
  assert.match(draw('accent').art, /data-product-rule="neutral"/)
  assert.ok(draw('accent').art.includes(`fill="${item.accentText}"`), 'the name in the accent’s text tone')
  assert.ok(draw('accent', '#FFFFFF').art.includes(`fill="${item.accentOnDark}"`), 'on a dark ground, its dark-ground tone')
  assert.match(draw('mono').art, />ONE</, 'capitals')
  const stacked = draw('stacked')
  const flat = draw('rule')
  assert.match(stacked.art, /data-product-rule="" d="M[\d.]+ [\d.]+H[\d.]+"/, 'a horizontal rule')
  assert.ok(stacked.height > flat.height && stacked.width < flat.width, 'taller and narrower')
  assert.deepEqual(stacked.parent, flat.parent, 'the parent logo is placed the same way')
  assert.match(productDocument(ctx, { product: 'one', arrangement: 'endorsed', colourKey: 'ink', variant: 'stacked' }), /A6 · Stacked/)
})

test('the family key, naming and the kit', () => {
  const brand = withFamily()
  const key = productFamilyKey({ brand, fonts: null })
  assert.equal((key.match(/<rect data-product=/g) ?? []).length, 3)
  for (const item of productsOf(brand)) assert.ok(key.includes(`fill="${item.accent}"`))
  assert.deepEqual(productsOf(brand).map((item) => item.fullName), ['northwind One', 'northwind Two', 'northwind Three'])
  assert.equal(productsOf({ ...brand, products: { ...brand.products, items: [{ id: 'x', name: 'X', fullName: 'Own', accent: '#337F9E' }] } })[0].fullName, 'Own')
  assert.equal(newProduct('Café Map', { taken: ['cafe-map'] }).id, 'cafe-map-2')

  const paths = planKit(brand).map((entry) => entry.path)
  assert.ok(paths.includes('logos/products/family-key.svg'))
  assert.ok(paths.includes('logos/products/one/variants/stacked-ink.svg'), 'while comparing, each variant')
  const decided = planKit(withFamily(BUILT_IN_PRODUCT_TEMPLATES.find((entry) => entry.id === 'endorsed-rule'))).map((entry) => entry.path)
  assert.ok(!decided.some((path) => path.includes('/variants/')), 'once decided, only the chosen one')
})
