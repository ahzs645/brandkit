// Product family templates: a family's system (how its lockups are drawn, the variants and
// directions being compared, its tiles and naming) kept apart from any one brand, so it can be
// applied to another. A template never carries a parent logo: the brand it is applied to supplies
// that, and its colours and faces.
//
//   {
//     format: 'brandkit-product-family-template', version: 1,
//     id, label, summary?,
//     family: { label?, status?, note?, lockup?, tile?, variants?, variant?, directions?, direction?, naming?, positioning?, decision? },
//     products?: [{ name, descriptor?, role?, accent?, accentName? }]   starter products, accents as hex
//   }
//
// applyProductTemplate(brand, template) returns a `products` object for that brand; withProductFamily()
// puts one into a brand (or into one of its revisions), which is how a family is saved with its brand.

import { colour as resolveColour } from './brand.js'
import { productsOf } from './products.js'

export const TEMPLATE_FORMAT = 'brandkit-product-family-template'

/** Accents to start a family from: distinct hues, mid in value, so each has a usable text tone. */
export const STARTER_ACCENTS = [
  { hex: '#337F9E', name: 'Blue' }, { hex: '#3F7055', name: 'Green' }, { hex: '#CD6448', name: 'Ember' }, { hex: '#AD8A4E', name: 'Ochre' },
  { hex: '#7FA6BA', name: 'Slate blue' }, { hex: '#8A5A9E', name: 'Plum' }, { hex: '#4E8A86', name: 'Teal' }, { hex: '#B0496A', name: 'Berry' }
]

const clone = (value) => (value == null ? value : structuredClone(value))
export const productSlug = (value) => String(value ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'product'

// Six endorsed variants to compare (A1 to A6), as lockup settings.
const ENDORSED_VARIANTS = [
  { id: 'rule', label: 'A1 · Rule', summary: 'A thin rule in the accent; the name in the display face, a step smaller than the lettering.', lockup: {} },
  { id: 'matched', label: 'A2 · Matched', summary: 'The name set as large as the lettering, in the regular display face, so product and company read as siblings.', lockup: { name: { font: 'displayRegular', size: 1.353, tracking: -0.016 } } },
  { id: 'plain', label: 'A3 · Plain', summary: 'No rule, only space. The lockup carries no colour; the accent lives in tiles, tabs and maps.', lockup: { separator: 'space' } },
  { id: 'accent', label: 'A4 · Accent name', summary: 'A quiet neutral rule and the name in the accent’s text tone.', lockup: { separator: 'neutral', name: { colour: 'accent' } } },
  { id: 'mono', label: 'A5 · Mono', summary: 'The name in the label face, in capitals, like a technical label.', lockup: { name: { font: 'label', caps: true, size: 0.36, tracking: 0.12 } } },
  { id: 'stacked', label: 'A6 · Stacked', summary: 'The name under the logo, the accent rule between them. For square and narrow spaces.', lockup: { stack: true, name: { size: 0.8 } } }
]

const DIRECTIONS = [
  { id: 'a', label: 'A · Endorsed', arrangement: 'endorsed', tile: 'symbol', variant: 'rule', summary: 'The parent logo, a rule in the product accent, then the product name on the lettering’s baseline.' },
  { id: 'b', label: 'B · Product-led', arrangement: 'product-led', tile: 'icon', summary: 'A tile in the product accent and the product name lead; the parent logo signs off beneath.' },
  { id: 'c', label: 'C · Label', arrangement: 'label', tile: 'paper', summary: 'The parent logo with the product as a label beneath its lettering. The quietest option.' }
]

const LETTERING = {
  name: { font: 'display', tracking: -0.04, size: 0.9 },
  label: { font: 'label', tracking: 0.12, caps: true, size: 0.28 }
}

/** Templates every brand can start from. */
export const BUILT_IN_PRODUCT_TEMPLATES = [
  {
    format: TEMPLATE_FORMAT, version: 1, id: 'endorsed-comparison', label: 'Endorsed family, compared',
    summary: 'Products named beside the parent logo. Three directions (endorsed, product-led, label) and six endorsed variants to compare before one is chosen.',
    family: {
      label: 'Products', status: 'proposed',
      naming: { fullName: '{parent} {name}' },
      lockup: { arrangements: ['endorsed', 'label', 'product-led', 'compact'], ...LETTERING },
      tile: { styles: ['symbol', 'icon', 'paper'] },
      variants: ENDORSED_VARIANTS, directions: DIRECTIONS
    }
  },
  {
    format: TEMPLATE_FORMAT, version: 1, id: 'endorsed-rule', label: 'Endorsed family, decided',
    summary: 'The endorsed lockup with an accent rule (A1), the compact form for small sizes, and the accent-band app icon. The other variants are kept as archived options.',
    family: {
      label: 'Products', status: 'proposed · direction chosen',
      naming: { fullName: '{parent} {name}' },
      lockup: { arrangements: ['endorsed', 'label', 'product-led', 'compact'], ...LETTERING },
      tile: { styles: ['symbol', 'icon', 'paper'] },
      variants: ENDORSED_VARIANTS.map((entry) => ({ ...entry, status: entry.id === 'rule' ? 'chosen' : 'archived' })),
      variant: 'rule',
      directions: DIRECTIONS.map((entry) => ({ ...entry, status: entry.id === 'a' ? 'chosen' : 'archived' })),
      direction: 'a'
    }
  },
  {
    format: TEMPLATE_FORMAT, version: 1, id: 'product-led', label: 'Product-led family',
    summary: 'Each product leads with an accent tile and its name; the parent logo signs off beneath. Strongest product recognition.',
    family: {
      label: 'Products',
      naming: { fullName: '{parent} {name}' },
      lockup: { arrangements: ['product-led', 'compact'], ...LETTERING },
      tile: { styles: ['icon', 'symbol'] },
      directions: [{ ...DIRECTIONS[1], status: 'chosen' }], direction: 'b'
    }
  },
  {
    format: TEMPLATE_FORMAT, version: 1, id: 'modules', label: 'Modules of the company',
    summary: 'The parent logo with each product as a label under its lettering. Products read as modules of one company.',
    family: {
      label: 'Modules',
      naming: { fullName: '{parent} {name}' },
      lockup: { arrangements: ['label', 'compact'], ...LETTERING },
      tile: { styles: ['paper', 'symbol'] },
      directions: [{ ...DIRECTIONS[2], status: 'chosen' }], direction: 'c'
    }
  }
]

/** A template's problems, as sentences; empty when it can be applied. */
export const validateProductTemplate = (template) => {
  const problems = []
  const need = (ok, message) => { if (!ok) problems.push(message) }
  need(template && typeof template === 'object', 'A template must be a JSON object.')
  if (!template || typeof template !== 'object') return problems
  need(template.format === TEMPLATE_FORMAT, `A template’s \`format\` must be \`${TEMPLATE_FORMAT}\`.`)
  need(typeof template.id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(template.id), 'A template needs an `id` of lower-case letters, digits and hyphens.')
  need(typeof template.label === 'string' && template.label.trim(), 'A template needs a `label`.')
  need(template.family && typeof template.family === 'object' && !Array.isArray(template.family), 'A template needs a `family` object.')
  need(!template.family?.items, 'A template’s `family` carries no `items`; starter products go in `products`.')
  need(!template.family?.parent, 'A template carries no parent logo; the brand it is applied to supplies one.')
  if (template.products != null) {
    need(Array.isArray(template.products), '`products` must be a list.')
    for (const item of Array.isArray(template.products) ? template.products : []) {
      need(typeof item?.name === 'string' && item.name.trim(), 'Each starter product needs a `name`.')
      if (item?.accent != null) need(/^#[0-9a-f]{6}$/i.test(item.accent), `Starter product \`${item?.name ?? '?'}\`: \`accent\` must be a six-digit hex value.`)
    }
  }
  return problems
}

/** A new product for a family: its id made from its name (unique among `taken`), an accent from the starters. */
export const newProduct = (name, { taken = [], index = taken.length, accent, ...rest } = {}) => {
  const base = productSlug(name)
  let id = base
  for (let count = 2; taken.includes(id); count += 1) id = `${base}-${count}`
  const starter = STARTER_ACCENTS[index % STARTER_ACCENTS.length]
  return { id, name: String(name), ...rest, accent: accent ?? starter.hex, ...(accent ? {} : { accentName: starter.name }) }
}

/** Faces a template names that this brand lacks are dropped, so the brand's own defaults apply. */
const fitLockup = (brand, spec) => {
  if (!spec || typeof spec !== 'object') return spec
  const out = clone(spec)
  for (const key of ['name', 'label']) if (out[key]?.font && !brand.fonts?.[out[key].font]) delete out[key].font
  return out
}

/**
 * The family a template makes for a brand. Its products are, in order of preference: `items`
 * given, the brand's own products (kept as they are), the template's starters, or three placeholders.
 * The parent is the brand's existing one, else the brand's first logo.
 */
export const applyProductTemplate = (brand, template, { items, keepProducts = true } = {}) => {
  const problems = validateProductTemplate(template)
  if (problems.length) throw new Error(problems.join(' '))
  const family = clone(template.family)
  if (family.lockup) family.lockup = fitLockup(brand, family.lockup)
  if (family.variants) family.variants = family.variants.map((entry) => ({ ...entry, ...(entry.lockup && { lockup: fitLockup(brand, entry.lockup) }) }))
  // Arrangements and tiles that need a standalone symbol are not offered where it may not stand alone.
  if (brand.logoPolicy?.standaloneSymbol === false) {
    if (family.lockup?.arrangements) family.lockup.arrangements = family.lockup.arrangements.filter((id) => id !== 'compact')
    if (family.tile?.styles) family.tile.styles = family.tile.styles.filter((id) => id !== 'symbol')
    for (const entry of family.directions ?? []) if (entry.tile === 'symbol') entry.tile = family.tile?.styles?.[0] ?? 'paper'
  }
  const existing = keepProducts ? brand.products?.items : null
  const starters = template.products?.length ? template.products : [{ name: 'One' }, { name: 'Two' }, { name: 'Three' }]
  const made = []
  const products = items ?? (existing?.length ? clone(existing) : starters.map((starter, index) => {
    const { name, ...rest } = starter
    const item = newProduct(name, { taken: made, index, ...rest, status: rest.status ?? 'proposed' })
    made.push(item.id)
    return item
  }))
  const parent = brand.products?.parent ?? (brand.families?.length ? { family: brand.families[0].id } : brand.signatures?.length ? { signature: brand.signatures[0].id } : undefined)
  return {
    ...family,
    ...(parent && { parent: clone(parent) }),
    // What the brand already said about its family stays.
    ...(brand.products?.note && { note: brand.products.note }),
    ...(brand.products?.positioning && !family.positioning && { positioning: clone(brand.products.positioning) }),
    template: template.id,
    items: products
  }
}

/**
 * A brand's family as a template: everything but its parent and its products, which become
 * starters (name, descriptor, role and accent as hex) when `products` is true.
 */
export const productTemplateFrom = (brand, { id, label, summary, products = false } = {}) => {
  const source = brand?.products
  if (!source) throw new Error(`${brand?.name ?? 'This brand'} has no product family to make a template from.`)
  const { items, parent, template: _from, decision, ...family } = clone(source)
  const resolved = products ? productsOf(brand) : []
  return {
    format: TEMPLATE_FORMAT,
    version: 1,
    id: productSlug(id ?? `${brand.id}-${source.label ?? 'products'}`),
    label: label ?? `${brand.name} ${source.label ?? 'products'}`,
    ...(summary && { summary }),
    family: { ...family, ...(decision && { decision }) },
    ...(products && {
      products: resolved.map((item) => ({
        name: item.name,
        ...(item.descriptor && { descriptor: item.descriptor }),
        ...(item.role && { role: item.role }),
        accent: /^#[0-9a-f]{6}$/i.test(item.accent) ? item.accent.toUpperCase() : resolveColour(brand, item.accent),
        ...(item.accentName && { accentName: item.accentName })
      }))
    })
  }
}

/**
 * A brand with this family saved in it: in `products`, or, given a revision id, in that
 * revision's `changes.products` (a proposed family stays a proposal). `null` removes the family.
 */
export const withProductFamily = (brand, products, { revision } = {}) => {
  const next = clone(brand)
  if (revision) {
    const entry = next.revisions?.find((candidate) => candidate.id === revision)
    if (!entry) throw new Error(`${brand.name} has no revision called ${revision}.`)
    entry.changes = { ...(entry.changes ?? {}) }
    if (products) entry.changes.products = clone(products)
    else delete entry.changes.products
    return next
  }
  if (products) next.products = clone(products)
  else delete next.products
  return next
}

/**
 * Where a brand's family is saved while a revision is shown: in that revision when it carries the
 * family, or when the approved definition has none (a new family starts as a proposal); otherwise
 * in the definition.
 */
export const productFamilyHome = (base, revisionId) => {
  const revision = revisionId ? base?.revisions?.find((entry) => entry.id === revisionId) : null
  if (!revision) return null
  return revision.changes?.products || !base.products ? revision.id : null
}
