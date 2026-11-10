// Product families (brand.products): named products under one parent logo, which every lockup
// embeds exactly as lockup() draws it. On northwind with a family added here, since the brands that
// have one are kept outside this repository.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  brandCss, colour, consumerProfile, contrast, inPack, lockup, n, planKit, productArrangements, productDirections, productDocument,
  productLockup, productTile, productTileStyles, productTokens, productsOf, hasProducts, tokens, validateBrand, withRevision
} from '../src/engine/index.js'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'

const BRAND_DIR = fileURLToPath(new URL('../brands/northwind/', import.meta.url))
const northwind = JSON.parse(readFileSync(new URL('brand.json', `file://${BRAND_DIR}`), 'utf8'))

const ICONS = {
  size: 64,
  attrs: { stroke: 'currentColor', 'stroke-width': '2', fill: 'none' },
  items: [
    { id: 'chart', content: '<path d="M10 52V30M26 52V14M42 52V38M58 52V22"/>' },
    { id: 'route', content: '<path d="M12 52C12 30 52 34 52 12"/><circle cx="12" cy="52" r="4" fill="currentColor" stroke="none"/>' }
  ]
}
const PRODUCTS = {
  label: 'Products',
  status: 'proposed',
  note: 'The northwind logo is the fixed parent.',
  directions: [
    { id: 'a', label: 'A · Endorsed', arrangement: 'endorsed', tile: 'symbol', summary: 'The company leads.' },
    { id: 'b', label: 'B · Product-led', arrangement: 'product-led', tile: 'icon' }
  ],
  items: [
    { id: 'chart', name: 'Chart', fullName: 'Northwind Chart', descriptor: 'Passage planning', role: 'platform', accent: '#7FA6BA', icon: 'chart', symbol: 'Bars', accentName: 'Slate', accentOnDark: '#9DBCCB' },
    { id: 'route', name: 'Route', descriptor: 'Voyage logging', accent: '#CD6448', icon: 'route' },
    { id: 'harbour', name: 'Harbour', accent: 'primary', accentText: 'ink', icon: { content: '<circle cx="32" cy="32" r="18"/>' } },
    { id: 'tide', name: 'Tide', accent: 'light' }
  ]
}
const withProducts = (products = PRODUCTS, extra = {}) => ({ ...structuredClone(northwind), icons: structuredClone(ICONS), products: structuredClone(products), ...extra })
const brand = withProducts()
const ALL = ['endorsed', 'label', 'product-led', 'compact']
const fontsReady = loadBrandFontsFromDisk(northwind, BRAND_DIR)

test('a product family validates, and its mistakes are named', () => {
  assert.deepEqual(validateBrand(brand), [])
  assert.ok(hasProducts(brand))
  assert.ok(!hasProducts(northwind))
  const problems = (change) => { const next = withProducts(); change(next.products); return validateBrand(next) }
  assert.match(problems((p) => { p.items = [] }).join(' '), /`products\.items` needs at least one product/)
  assert.match(problems((p) => { p.items[1].id = 'chart' }).join(' '), /Product `chart` is listed twice/)
  assert.match(problems((p) => { p.items[0].id = 'Chart Plotter' }).join(' '), /lower-case letters, digits and hyphens/)
  assert.match(problems((p) => { delete p.items[0].name }).join(' '), /Product `chart` needs a name/)
  assert.match(problems((p) => { p.items[0].accent = 'teal-ish' }).join(' '), /Product `chart`: `accent` must be/)
  assert.match(problems((p) => { p.items[0].onAccent = 'nope' }).join(' '), /`onAccent` must be/)
  assert.match(problems((p) => { p.items[0].icon = 'anchor' }).join(' '), /names icon `anchor`, which is not in `icons\.items`/)
  assert.match(problems((p) => { p.items[2].icon = { size: 64 } }).join(' '), /`icon` must be an icon id or \{ content \}/)
  assert.match(problems((p) => { p.parent = { family: 'nope' } }).join(' '), /`products\.parent\.family` names family `nope`/)
  assert.match(problems((p) => { p.lockup = { arrangements: ['endorsed', 'sideways'] } }).join(' '), /Product arrangement `sideways` is not one of/)
  assert.match(problems((p) => { p.lockup = { name: { size: 0 } } }).join(' '), /`products\.lockup\.name\.size` must be a positive number/)
  assert.match(problems((p) => { p.lockup = { name: { leadSize: -1 } } }).join(' '), /`products\.lockup\.name\.leadSize` must be a positive number/)
  assert.match(problems((p) => { p.lockup = { label: { font: 'gothic' } } }).join(' '), /names font `gothic`/)
  assert.match(problems((p) => { p.tile = { styles: ['glass'] } }).join(' '), /Product tile style `glass`/)
  assert.match(problems((p) => { p.directions[0].arrangement = 'sideways' }).join(' '), /Product direction `a`: arrangement `sideways`/)
  assert.match(problems((p) => { p.direction = 'z' }).join(' '), /`products\.direction` names direction `z`/)
  assert.deepEqual(problems((p) => { p.direction = 'b' }), [])
})

test('accents resolve with a text tone that reads on paper and a colour that reads on the accent', () => {
  const items = productsOf(brand)
  const paper = colour(brand, 'paper')
  assert.deepEqual(items.map((item) => item.id), ['chart', 'route', 'harbour', 'tide'])
  for (const item of items) {
    assert.match(item.accent, /^#[0-9A-F]{6}$/i, item.id)
    assert.ok(contrast(item.accentText, paper) >= 4.5, `${item.id}: ${item.accentText} on paper`)
    assert.ok(contrast(item.onAccent, item.accent) >= 3, `${item.id}: ${item.onAccent} on ${item.accent}`)
  }
  const [chart, route, harbour, tide] = items
  assert.equal(harbour.accent, colour(brand, 'primary'), 'a role names the accent')
  assert.equal(harbour.accentText, colour(brand, 'ink'), 'an item keeps its own text tone')
  assert.notEqual(chart.accentText, chart.accent, 'a light accent is darkened for text')
  assert.equal(route.onAccent, colour(brand, 'reverse'), 'reverse wherever it reaches 3 : 1')
  assert.equal(chart.onAccent, colour(brand, 'primary'), 'else the primary colour')
  assert.equal(tide.onAccent, colour(brand, 'primary'))
  assert.equal(productsOf(withProducts({ ...PRODUCTS, items: [{ ...PRODUCTS.items[0], onAccent: 'ink' }] }))[0].onAccent, colour(brand, 'ink'), 'an item keeps its own onAccent')
  assert.equal(chart.symbol, 'Bars', 'keys the engine does not use are kept')
  // Beside a reversed logo the rule takes a tone that shows on the brand's dark ground.
  const ground = colour(brand, 'primary')
  for (const item of items) assert.ok(contrast(item.accentOnDark, ground) >= 3, `${item.id}: ${item.accentOnDark} on ${ground}`)
  assert.notEqual(harbour.accentOnDark, harbour.accent, 'an accent that is the dark ground itself is lightened')
  const rule = (paint) => /data-product-rule="" d="[^"]+" fill="none" stroke="([^"]+)"/.exec(productLockup({ brand }, { product: 'harbour', arrangement: 'endorsed', colour: paint }).art)[1]
  assert.equal(rule('#000000'), harbour.accent, 'the accent itself beside a dark logo')
  assert.equal(rule('#FFFFFF'), harbour.accentOnDark, 'its dark-ground tone beside a reversed logo')
  assert.equal(productsOf(withProducts({ ...PRODUCTS, items: [{ ...PRODUCTS.items[0], accentOnDark: '#ABCDEF' }] }))[0].accentOnDark, '#ABCDEF', 'an item keeps its own')
  assert.deepEqual(Object.keys(productTokens(brand).chart), ['name', 'fullName', 'descriptor', 'accent', 'accentText', 'onAccent', 'accentOnDark'])
})

test('what a family offers follows the brand: arrangements, tiles and directions', () => {
  assert.deepEqual(productArrangements(brand), ALL)
  assert.deepEqual(productTileStyles(brand), ['symbol', 'icon', 'paper'])
  assert.deepEqual(productDirections(brand).map((entry) => entry.id), ['a', 'b'])
  const fixed = withProducts(PRODUCTS, { logoPolicy: { allowedColours: ['ink', 'white', 'primary'], standaloneSymbol: false } })
  assert.deepEqual(productArrangements(fixed), ['endorsed', 'label', 'product-led'], 'no compact lockup without a standalone symbol')
  assert.deepEqual(productTileStyles(fixed), ['icon', 'paper'])
  assert.throws(() => productLockup({ brand: fixed }, { product: 'chart', arrangement: 'compact' }), /complete-logo placement/)
  assert.throws(() => productLockup({ brand }, { product: 'nope' }), /no product called nope/)
  assert.throws(() => productLockup({ brand }, { product: 'chart', arrangement: 'sideways' }), /Unknown product arrangement/)
})

for (const loaded of [false, true]) {
  test(`every lockup embeds the parent logo exactly as lockup() draws it (${loaded ? 'faces loaded' : 'no faces'})`, async () => {
    const ctx = { brand, fonts: loaded ? await fontsReady : undefined }
    const pad = brand.lockup.canvasPadding
    for (const paint of ['#14171A', '#FFFFFF', 'currentColor']) {
      const parent = lockup(ctx, { family: 'northwind', layout: 'horizontal', colour: paint })
      for (const item of productsOf(brand)) {
        for (const arrangement of ['endorsed', 'label', 'product-led']) {
          for (const descriptor of [false, true]) {
            const drawn = productLockup(ctx, { product: item.id, arrangement, colour: paint, descriptor })
            const where = `${item.id} ${arrangement} ${paint}`
            // The parent's artwork, byte for byte, moved but never scaled.
            assert.ok(drawn.art.includes(`<g data-parent-logo="northwind" transform="translate(${drawn.parent.x} ${drawn.parent.y})">${parent.art}</g>`), where)
            assert.equal(drawn.art.split('data-parent-logo').length, 2, `${where}: the parent once`)
            assert.deepEqual([drawn.parent.width, drawn.parent.height], [parent.width, parent.height], where)
            assert.ok(drawn.parent.x >= 0 && drawn.parent.y >= 0 && drawn.parent.x + parent.width <= drawn.width + 1e-9 && drawn.parent.y + parent.height <= drawn.height + 1e-9, `${where}: the canvas holds the parent's`)
            assert.ok(drawn.width > parent.width || drawn.height > parent.height, `${where}: and the product beside or under it`)
            assert.equal(/<text\b/.test(drawn.art), !loaded, `${where}: lettering is ${loaded ? 'outlined' : 'live'}`)
            // The accent appears only when the logo has a colour of its own: the accent itself, or
            // beside a reversed logo its dark-ground tone on the rule and bar (a filled tile keeps the accent).
            const tone = paint === '#FFFFFF' && arrangement !== 'product-led' ? item.accentOnDark : item.accent
            assert.equal(drawn.art.includes(tone), paint !== 'currentColor', where)
          }
        }
        const compact = productLockup(ctx, { product: item.id, arrangement: 'compact', colour: paint })
        assert.equal(compact.parent, null)
        assert.ok(!compact.art.includes('data-parent-logo') && compact.art.includes('data-brand-symbol'))
        assert.equal(compact.height, parent.height, 'the symbol at the parent logo’s height')
        assert.ok(compact.width > pad * 2)
      }
    }
  })
}

test('arrangements follow the geometry the schema documents', async () => {
  const ctx = { brand, fonts: await fontsReady }
  const pad = brand.lockup.canvasPadding
  const parent = lockup(ctx, { family: 'northwind', layout: 'horizontal', colour: '#14171A' })
  const H = parent.height - 2 * pad
  const endorsed = productLockup(ctx, { product: 'route', arrangement: 'endorsed', colour: '#14171A' })
  assert.deepEqual(endorsed.parent, { x: 0, y: 0, width: parent.width, height: parent.height })
  assert.equal(endorsed.height, parent.height, 'a name without descenders keeps the parent’s height')
  assert.ok(endorsed.art.includes(`<path data-product-rule="" d="M${n(parent.width - pad + 0.3 * H)} ${n(pad)}V${n(pad + H)}" fill="none" stroke="#CD6448" stroke-width="${n(H / 48)}"/>`), 'the rule, 0.3 H past the artwork')
  const described = productLockup(ctx, { product: 'route', arrangement: 'endorsed', colour: '#14171A', descriptor: true })
  assert.ok(described.width >= endorsed.width && described.height > endorsed.height, 'a descriptor grows the canvas')
  assert.match(described.art, /aria-label="VOYAGE LOGGING"/, 'set in capitals in the label face')
  const led = productLockup(ctx, { product: 'route', arrangement: 'product-led', colour: '#14171A' })
  assert.deepEqual(led.parent, { x: 0, y: 1.5 * H + 0.3 * H, width: parent.width, height: parent.height })
  assert.ok(led.art.includes(`<rect data-product-tile="" x="${n(pad)}" y="${n(pad)}" width="${n(1.5 * H)}" height="${n(1.5 * H)}" rx="${n(0.24 * H)}" fill="#CD6448"/>`), 'the tile, 1.5 H square')
  assert.ok(led.art.includes('stroke="#FFFFFF"'), 'the pictogram in the colour that reads on the accent')
  const plain = productLockup(ctx, { product: 'route', arrangement: 'product-led', colour: '#14171A', accent: false })
  assert.ok(!plain.art.includes('#CD6448') && /data-product-tile="" [^>]*fill="none" stroke="#14171A"/.test(plain.art), 'one colour: an outlined tile')
  // A product with no pictogram takes the brand symbol in its tile.
  assert.ok(productLockup(ctx, { product: 'tide', arrangement: 'product-led', colour: '#14171A' }).art.split('data-brand-symbol').length === 3)
  // Sizes are data.
  const larger = productLockup({ ...ctx, brand: withProducts({ ...PRODUCTS, lockup: { name: { size: 0.9 } } }) }, { product: 'route', arrangement: 'endorsed', colour: '#14171A' })
  assert.ok(larger.width > endorsed.width)
})

test('lockup and tile files are whole SVG documents', async () => {
  const ctx = { brand, fonts: await fontsReady }
  const svg = productDocument(ctx, { product: 'chart', arrangement: 'endorsed', colourKey: 'primary' })
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*aria-label="northwind \/ Chart \/ endorsed \/ primary"/)
  assert.ok(svg.includes(colour(brand, 'primary')) && svg.includes('#7FA6BA'))
  const inherited = productDocument(ctx, { product: 'chart', arrangement: 'label', colourKey: 'currentColor' })
  assert.match(inherited, /aria-label="northwind \/ Chart \/ label \/ currentcolor"/)
  assert.ok(!inherited.includes('#7FA6BA') && inherited.includes('currentColor'))
  for (const style of ['symbol', 'icon', 'paper']) {
    for (const item of productsOf(brand)) {
      const tile = productTile(ctx, { product: item.id, style })
      assert.match(tile, /viewBox="0 0 1024 1024"/, `${item.id} ${style}`)
      assert.ok(!/<text\b|currentColor/.test(tile), `${item.id} ${style}: self-contained`)
      assert.ok(tile.includes(style === 'paper' ? colour(brand, 'paper') : item.accent), `${item.id} ${style}`)
    }
  }
  assert.throws(() => productTile(ctx, { product: 'chart', style: 'glass' }), /Unknown product tile style/)
})

test('the kit carries every product in every arrangement and colour, or the chosen direction alone', () => {
  const before = planKit(northwind).map((entry) => entry.path)
  const plan = planKit(brand)
  const paths = plan.map((entry) => entry.path)
  assert.equal(new Set(paths).size, paths.length, 'no path twice')
  const added = paths.filter((path) => !before.includes(path))
  // The fixture also adds two icons; everything else new is the family's.
  assert.deepEqual(added.filter((path) => !/^(logos\/products|web\/products|icons)\//.test(path)), [])
  assert.deepEqual(before.filter((path) => !paths.includes(path)), [], 'nothing the brand had is lost')
  for (const id of ['chart', 'route', 'harbour', 'tide']) {
    for (const arrangement of ALL) {
      for (const paint of ['ink', 'white', 'primary']) {
        assert.ok(paths.includes(`logos/products/${id}/${arrangement}-${paint}.svg`), `${id} ${arrangement} ${paint}`)
        assert.ok(paths.includes(`logos/products/${id}/png/${arrangement}-${paint}-2048.png`))
        assert.ok(paths.includes(`logos/products/${id}/pdf/${arrangement}-${paint}.pdf`))
      }
      assert.ok(paths.includes(`logos/products/${id}/${arrangement}-currentcolor.svg`))
      assert.ok(!paths.includes(`logos/products/${id}/png/${arrangement}-currentcolor-2048.png`), 'no image of an inherited colour')
    }
    for (const style of ['symbol', 'icon', 'paper']) {
      assert.ok(paths.includes(`web/products/${id}-tile-${style}.svg`))
      assert.ok(paths.includes(`web/products/${id}-tile-${style}-512.png`) && paths.includes(`web/products/${id}-tile-${style}-1024.png`))
    }
  }
  assert.ok(plan.filter((entry) => /\/products\//.test(entry.path)).every((entry) => entry.product), 'each entry names its product')
  assert.equal(plan.find((entry) => entry.path === 'logos/products/chart/endorsed-ink.svg').group, 'Logos')

  // Text files alone (no renderer): only the SVGs.
  const vector = planKit(brand, { rasters: false, pdfs: false }).map((entry) => entry.path).filter((path) => /\/products\//.test(path))
  assert.ok(vector.length > 0 && vector.every((path) => path.endsWith('.svg')))

  // A chosen direction: its arrangement and the compact one, and its tile.
  const chosen = planKit(withProducts({ ...PRODUCTS, direction: 'b' })).map((entry) => entry.path)
  const arrangements = new Set(chosen.filter((path) => path.startsWith('logos/products/chart/') && path.endsWith('.svg')).map((path) => path.split('/').pop().replace(/-(ink|white|primary|currentcolor)\.svg$/, '')))
  assert.deepEqual([...arrangements].sort(), ['compact', 'product-led'])
  assert.deepEqual(chosen.filter((path) => path.startsWith('web/products/chart-tile-') && path.endsWith('.svg')), ['web/products/chart-tile-icon.svg'])

  // A brand that makes no web icons makes no tiles either.
  assert.ok(!planKit(withProducts(PRODUCTS, { web: { ...northwind.web, icons: false } })).some((entry) => entry.path.startsWith('web/products/')))

  // Packs: the logos pack takes the family's lockups (not the inherited-colour SVGs), the website pack takes both.
  const logos = planKit(brand, { pack: 'logos' }).map((entry) => entry.path)
  assert.ok(logos.includes('logos/products/chart/endorsed-ink.svg') && logos.includes('logos/products/chart/png/endorsed-ink-2048.png'))
  assert.ok(!logos.includes('logos/products/chart/endorsed-currentcolor.svg') && !logos.some((path) => path.startsWith('web/products/')))
  const web = planKit(brand, { pack: 'web' }).map((entry) => entry.path)
  assert.ok(web.includes('logos/products/chart/endorsed-currentcolor.svg') && web.includes('web/products/chart-tile-icon.svg'))
  assert.ok(inPack({ path: 'logos/products/chart/label-ink.svg' }, 'print'))
})

test('a brand without products plans, and writes, what it always did', async () => {
  const fonts = await fontsReady
  assert.ok(!planKit(northwind).some((entry) => /products/.test(entry.path)))
  assert.ok(!('products' in tokens({ brand: northwind })))
  assert.ok(!brandCss({ brand: northwind }).includes('-product-'))
  assert.ok(!('products' in consumerProfile({ brand: northwind, fonts })))
})

test('tokens, CSS and the consumer profile gain the family', async () => {
  const fonts = await fontsReady
  const family = tokens({ brand }).products
  assert.deepEqual(Object.keys(family), ['chart', 'route', 'harbour', 'tide'])
  assert.deepEqual(family.route, { name: 'Route', fullName: null, descriptor: 'Voyage logging', accent: '#CD6448', accentText: productsOf(brand)[1].accentText, onAccent: '#FFFFFF', accentOnDark: productsOf(brand)[1].accentOnDark })
  const css = brandCss({ brand })
  assert.ok(css.includes('  --northwin-product-route: #CD6448;\n  --northwin-product-route-text: ') && css.includes('  --northwin-product-route-on: #FFFFFF;'))
  assert.ok(css.indexOf('-product-') < css.indexOf('--northwin-font-body'), 'with the colours, inside :root')
  const profile = consumerProfile({ brand, fonts })
  assert.deepEqual(profile.products.map((item) => item.id), ['chart', 'route', 'harbour', 'tide'])
  const parent = lockup({ brand, fonts }, { family: 'northwind', layout: 'horizontal', colour: colour(brand, 'primary') })
  for (const item of profile.products) {
    assert.deepEqual(Object.keys(item), ['id', 'name', 'fullName', 'descriptor', 'accent', 'accentText', 'onAccent', 'accentOnDark', 'logo'])
    assert.ok(!/<text\b/.test(item.logo.svg) && item.logo.svg.includes(parent.art), `${item.id}: outlined, around the parent logo`)
    assert.equal(item.logo.viewBox.length, 4)
  }
  // The profile uses the chosen direction's arrangement once there is one.
  const led = consumerProfile({ brand: withProducts({ ...PRODUCTS, direction: 'b' }), fonts }).products[0].logo
  assert.ok(led.svg.includes('data-product-tile') && led.viewBox[3] > profile.products[0].logo.viewBox[3])
  // Without the faces the lettering would be live text, which a consumer may not rely on.
  assert.throws(() => consumerProfile({ brand }), /self-contained vector geometry/)
})

test('a proposed family is a revision: the approved brand is unchanged, the revised one has the products', () => {
  const proposed = {
    ...structuredClone(northwind),
    revisions: [{ id: 'product-family', title: 'Product family', version: '1.1-products', displayVersion: '1.1', status: 'proposed', summary: 'Four products under the northwind logo.',
      changes: { products: structuredClone(PRODUCTS), icons: structuredClone(ICONS) } }]
  }
  assert.deepEqual(validateBrand(proposed), [])
  assert.ok(!hasProducts(proposed))
  const approved = planKit(proposed, { rasters: false, pdfs: false }).map((entry) => entry.path)
  assert.ok(!approved.some((path) => /^(logos|web)\/products\//.test(path)), 'the approved kit has no product files of its own')
  // …but carries the proposal's lockups beside it, as vector files.
  assert.ok(approved.includes('revisions/product-family/logos/products/chart/endorsed-ink.svg'))
  assert.ok(approved.includes('revisions/product-family/logos/products/tide/compact-currentcolor.svg'))
  assert.ok(approved.includes('revisions/product-family/brand.json'))
  const revised = withRevision(proposed, 'product-family')
  assert.deepEqual(validateBrand(revised), [])
  assert.ok(hasProducts(revised))
  const paths = planKit(revised).map((entry) => entry.path)
  assert.ok(paths.includes('logos/products/chart/endorsed-ink.svg') && paths.includes('web/products/route-tile-icon.svg'))
  // A revision whose family is wrong says so under its name.
  const broken = structuredClone(proposed)
  broken.revisions[0].changes.products.items[0].icon = 'anchor'
  assert.match(validateBrand(broken).join(' '), /Revision `product-family`: Product `chart` names icon `anchor`/)
  // Choosing a direction is one more change.
  const decided = structuredClone(proposed)
  decided.revisions[0].changes.products.direction = 'a'
  const kept = planKit(withRevision(decided, 'product-family')).map((entry) => entry.path).filter((path) => path.startsWith('logos/products/route/') && path.endsWith('-ink.svg'))
  assert.deepEqual(kept.sort(), ['logos/products/route/compact-ink.svg', 'logos/products/route/endorsed-ink.svg'])
})
