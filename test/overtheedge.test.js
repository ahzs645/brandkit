// Over the Edge: the paper's own logo, read from the site's SVG, in its "Forest press" identity
// (scripts/brands/overtheedge.mjs). Requirement ids are docs/PLANS.md M2's.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { colour, lockup, planKit, renderTemplate, validateBrand } from '../src/engine/index.js'
import { logoDocument } from '../src/engine/artwork.js'
import { guidePages, guideSheets } from '../src/engine/guide.js'
import { findAsset, loadBrandFontsFromDisk } from '../src/fonts/node.js'

const root = new URL('..', import.meta.url).pathname
const folder = `${root}brands/overtheedge/`
const brand = JSON.parse(readFileSync(`${folder}brand.json`, 'utf8'))
const read = (path) => readFileSync(`${folder}${path}`, 'utf8')
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const fonts = await loadBrandFontsFromDisk(brand, folder)

// --- Helpers, written independently of the brand's script ----------------------------------------

/** WCAG 2 contrast between two hex colours. */
const contrast = (a, b) => {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** The SVG's paths with the ids and data-names of the groups around them. */
const pathsOf = (svg) => {
  const stack = []
  const out = []
  for (const match of svg.matchAll(/<(\/?)(g|path)\b([^>]*)>/g)) {
    const [, close, tag, attrs] = match
    if (tag === 'g') { if (close) stack.pop(); else stack.push(attrs); continue }
    out.push({ within: stack.join(' '), d: /\bd="([^"]+)"/.exec(attrs)[1], groupIndex: stack.length })
  }
  return out
}

/** Bounds of a path of M/L/H/V/C/S/Z commands, sampling curves at 32 points. */
const bounds = (d) => {
  const nums = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)/g)
  const box = [Infinity, Infinity, -Infinity, -Infinity]
  const add = (x, y) => { box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y) }
  let [x, y, sx, sy, cmd, i, last] = [0, 0, 0, 0, '', 0, null]
  const next = () => Number(nums[i++])
  const curve = (p1, p2, p3) => {
    for (let k = 1; k <= 32; k++) {
      const t = k / 32
      const mt = 1 - t
      add(mt ** 3 * x + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t ** 3 * p3[0], mt ** 3 * y + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t ** 3 * p3[1])
    }
    last = p2
    ;[x, y] = p3
  }
  while (i < nums.length) {
    if (/[A-Za-z]/.test(nums[i])) cmd = nums[i++]
    const rel = cmd >= 'a'
    const at = () => (rel ? [x + next(), y + next()] : [next(), next()])
    const C = cmd.toUpperCase()
    if (C === 'M') { [x, y] = at(); [sx, sy] = [x, y]; add(x, y); cmd = rel ? 'l' : 'L'; last = null }
    else if (C === 'L') { [x, y] = at(); add(x, y); last = null }
    else if (C === 'H') { x = rel ? x + next() : next(); add(x, y); last = null }
    else if (C === 'V') { y = rel ? y + next() : next(); add(x, y); last = null }
    else if (C === 'C') { const p1 = at(); const p2 = at(); curve(p1, p2, at()) }
    else if (C === 'S') { const p1 = last ? [2 * x - last[0], 2 * y - last[1]] : [x, y]; const p2 = at(); curve(p1, p2, at()) }
    else if (C === 'Z') { [x, y] = [sx, sy]; last = null }
    else throw new Error(`command ${cmd}`)
  }
  return box
}
const unite = (boxes) => boxes.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])])

const palette = new Set(Object.values(brand.colours).map((hex) => hex.toUpperCase()))
/** Every hex colour an SVG paints with. */
const paints = (svg) => [...svg.matchAll(/(?:fill|stroke|stop-color|color)="(#[0-9a-fA-F]{3,8})"/g)].map((m) => m[1].toUpperCase())

const templateGround = (template, element) => colour(brand, element.ground ?? template.elements.find((e) => e.type === 'background')?.fill)

// --- OTE-001 Fonts --------------------------------------------------------------------------------

test('OTE-001: six fonts and four licences, hashed in the fonts README; every file and web face resolves', () => {
  const readme = read('fonts/README.md')
  const own = ['Anton-Regular.ttf', 'SourceSerif4-Regular.ttf', 'SourceSerif4-Bold.ttf', 'SourceSerif4-It.ttf', 'IBMPlexMono-Medium.ttf', 'GochiHand-Regular.ttf', 'Anton-OFL.txt', 'IBMPlexMono-OFL.txt', 'GochiHand-OFL.txt', 'SourceSerif-OFL.md']
  for (const file of own) {
    const row = readme.split('\n').find((line) => line.startsWith(`| \`${file}\``))
    assert.ok(row && /https:\/\/raw\.githubusercontent\.com\//.test(row), `${file} has a source row`)
    assert.ok(row.includes(sha(`${folder}fonts/${file}`)), `${file} hash matches`)
  }
  assert.deepEqual(fonts.failures, [])
  for (const key of ['body', 'bold', 'display', 'displayRegular', 'deck', 'extra', 'label', 'hand']) assert.ok(fonts.has(key), key)
  assert.equal(brand.fonts.deck.style, 'italic')
  for (const face of Object.values(brand.fonts)) for (const path of [face.file, face.web]) assert.ok(readFileSync(findAsset(folder, path)).length > 0, path)
  for (const file of brand.files) assert.ok(readFileSync(findAsset(folder, typeof file === 'string' ? file : file.from)).length > 0, JSON.stringify(file))
  for (const file of ['fonts/Inter-OFL.txt', 'fonts/desktop/Inter-Regular.ttf', 'fonts/desktop/Inter-SemiBold.ttf', 'fonts/web/Inter-Regular.woff2', 'fonts/web/Inter-SemiBold.woff2']) assert.ok(brand.files.includes(file), file)
})

// --- OTE-002 Logo from source ---------------------------------------------------------------------

test('OTE-002: the wordmark and the O are the site SVG\'s own paths, and the copies are the ones recorded', () => {
  const provenance = JSON.parse(read('reference/PROVENANCE.json'))
  assert.equal(sha(`${folder}reference/logo-site.svg`), provenance.logo.files['logo-site.svg'].sha256)
  assert.equal(sha(`${folder}reference/logo-site-dark.svg`), provenance.logo.files['logo-site-dark.svg'].sha256)
  assert.equal(sha(`${folder}reference/site-icons.json`), provenance.icons.sha256)
  const light = read('reference/logo-site.svg')
  const dark = read('reference/logo-site-dark.svg')
  assert.equal(light.replaceAll('#155329', 'M').replaceAll('#262626', 'S'), dark.replaceAll('#e3efcf', 'M').replaceAll('#f7f7f7', 'S'), 'the two copies differ only in fills')

  const paths = pathsOf(light)
  const main = paths.filter((path) => path.within.includes('data-name="Main Logo"'))
  // The three unnamed groups inside Main Logo, in order: THE, EDGE, OVER.
  const groups = [...light.slice(light.indexOf('data-name="Main Logo"')).matchAll(/<g>([\s\S]*?)<\/g>/g)].slice(0, 3).map((m) => [...m[1].matchAll(/\bd="([^"]+)"/g)].map((d) => d[1]))
  assert.deepEqual(groups.map((group) => group.length), [3, 4, 4])
  const [the, edge, over] = groups
  const subtext = paths.filter((path) => path.within.includes('id="Subtext"')).map((path) => path.d)
  const apostrophe = paths.filter((path) => !path.within.includes('id="Subtext"') && !path.within.includes('Main Logo')).map((path) => path.d)
  assert.equal(main.length, 11)
  assert.equal(subtext.length, 21)
  assert.equal(apostrophe.length, 1)
  assert.equal(brand.wordmark.glyphs.over, over.join(''))
  assert.equal(brand.wordmark.glyphs.the, the.join(''))
  assert.equal(brand.wordmark.glyphs.edge, edge.join(''))
  assert.equal(brand.wordmark.glyphs.subtext, subtext.join(''))
  assert.equal(brand.wordmark.glyphs.apostrophe, apostrophe[0])
  assert.deepEqual(brand.symbol.paths, [over[0]])

  const near = (a, b, what) => assert.ok(Math.abs(a - b) <= 0.5, `${what}: ${a} vs ${b}`)
  const full = unite([...over, ...the, ...edge, ...subtext, ...apostrophe].map(bounds))
  near(brand.wordmark.variants.full.width, full[2], 'full width')
  near(brand.wordmark.height, full[3], 'full height')
  const words = unite([...over, ...the, ...edge].map(bounds))
  near(brand.wordmark.variants.words.width, words[2], 'words width')
  near(brand.wordmark.variants.words.height, words[3], 'words height')
  const lines = [over, the, edge].map((list) => unite(list.map(bounds)))
  near(brand.wordmark.variants.stacked.width, Math.max(...lines.map((box) => box[2] - box[0])), 'stacked width')
  near(brand.wordmark.variants.stacked.height, 200 + Math.max(...lines.map((box) => box[3])), 'stacked height')
  const o = bounds(over[0])
  near(brand.symbol.viewBox[2], o[2], 'O width')
  near(brand.symbol.viewBox[3], o[3], 'O height')
  assert.equal(brand.wordmark.left, 0)
})

// --- OTE-003 Engine options -----------------------------------------------------------------------

const box = (id) => `M0 0H${id}V10H0Z`
const fixture = (familyExtra = {}, variantExtra = {}) => ({
  ...brand,
  symbol: { name: 's', viewBox: [0, 0, 10, 10], paths: ['M0 0H10V10H0Z'] },
  wordmark: { height: 20, left: 0, glyphs: { a: box(40), b: box(30) }, variants: { one: { width: 40, parts: [{ glyph: 'a' }] }, two: { width: 30, parts: [{ glyph: 'b' }], ...variantExtra } } },
  families: [{ id: 'f', wordmark: 'one', typeHeight: 20, stackedTypeHeight: 20, ...familyExtra }],
  lockup: { iconHeight: 20, iconGap: 4, stackedIconHeight: 20, stackedTypeHeight: 20, stackedGap: 4, canvasPadding: 0, wordmarkHeight: 20 }
})

test('OTE-003: a variant height changes only that variant\'s scale', () => {
  const plain = fixture()
  const tall = fixture({}, { height: 10 })
  for (const layout of ['horizontal', 'stacked', 'wordmark']) assert.deepEqual(lockup({ brand: tall }, { family: 'f', layout }), lockup({ brand: plain }, { family: 'f', layout }), layout)
  const asTwo = (b) => ({ ...b, families: [{ ...b.families[0], wordmark: 'two' }] })
  const before = lockup({ brand: asTwo(plain) }, { family: 'f', layout: 'wordmark' })
  const after = lockup({ brand: asTwo(tall) }, { family: 'f', layout: 'wordmark' })
  assert.equal(before.width, 30)
  assert.equal(after.width, 60, 'scaled by wordmarkHeight / its own height')
})

test('OTE-003: lockupSymbol false draws the lettering alone, stacked uses stackedWordmark', () => {
  const b = fixture({ lockupSymbol: false, stackedWordmark: 'two' })
  const horizontal = lockup({ brand: b }, { family: 'f', layout: 'horizontal' })
  assert.ok(!horizontal.art.includes('data-brand-symbol'))
  assert.match(horizontal.art, /data-wordmark="one"/)
  assert.equal(horizontal.width, 40)
  const stacked = lockup({ brand: b }, { family: 'f', layout: 'stacked' })
  assert.ok(!stacked.art.includes('data-brand-symbol'))
  assert.match(stacked.art, /data-wordmark="two"/)
  assert.match(lockup({ brand: b }, { family: 'f', layout: 'symbol' }).art, /data-brand-symbol/)
  assert.match(lockup({ brand: fixture() }, { family: 'f', layout: 'horizontal' }).art, /data-brand-symbol/, 'default unchanged')
  const ours = logoDocument({ brand }, { family: 'overtheedge', layout: 'horizontal', colourKey: 'forest' })
  assert.ok(!ours.includes('data-brand-symbol'))
})

test('OTE-003: validation reports a missing stacked wordmark, a bad variant height and a non-boolean lockupSymbol', () => {
  assert.ok(validateBrand(fixture({ stackedWordmark: 'nope' })).some((p) => /stacked wordmark `nope`/.test(p)))
  assert.ok(validateBrand(fixture({}, { height: -1 })).some((p) => /`height` must be a positive number/.test(p)))
  assert.ok(validateBrand(fixture({}, { height: 'tall' })).some((p) => /`height` must be a positive number/.test(p)))
  assert.ok(validateBrand(fixture({ lockupSymbol: 'no' })).some((p) => /`lockupSymbol` must be true or false/.test(p)))
  assert.deepEqual(validateBrand(fixture({ lockupSymbol: false, stackedWordmark: 'two' }, { height: 10 })), [])
})

test('OTE-003: a template path with dash is dashed, one without is not; the schema documents all four', () => {
  const template = { id: 'x', width: 10, height: 10, elements: [{ type: 'path', id: 'a', d: 'M0 0H10', stroke: 'ink', dash: '6 5' }, { type: 'path', id: 'b', d: 'M0 5H10', stroke: 'ink' }] }
  const { svg } = renderTemplate({ brand }, template)
  assert.match(svg, /id="a"[^>]*stroke-dasharray="6 5"/)
  assert.doesNotMatch(/<path id="b"[^>]*>/.exec(svg)[0], /stroke-dasharray/)
  const schema = readFileSync(`${root}docs/brand-schema.md`, 'utf8')
  for (const key of ['lockupSymbol', 'stackedWordmark', 'own `height`', '`dash`']) assert.ok(schema.includes(key), key)
})

// --- OTE-004 Palette, roles, logos ----------------------------------------------------------------

test('OTE-004: the palette, roles and logo colours are as planned, and the kit has the logo files', () => {
  assert.deepEqual(brand.colours, { forest: '#155329', pine: '#0C3B1C', newsprint: '#F5F1E6', ink: '#262626', lichen: '#E3EFCF', sage: '#6AA380', moss: '#466855', kraft: '#D4C8AA', pulp: '#DBD0BA', bark: '#7D6B56', proof: '#B54A35', white: '#FFFFFF' })
  assert.deepEqual(brand.roles, { ink: 'ink', paper: 'newsprint', muted: 'bark', primary: 'forest', light: 'lichen', reverse: 'white', line: 'pulp', rule: 'kraft' })
  assert.deepEqual(brand.logoColours, ['forest', 'ink', 'white', 'lichen', 'currentColor'])
  assert.deepEqual(brand.rasterColours, ['forest', 'ink', 'white', 'lichen'])
  const plan = planKit(brand).map((entry) => entry.path)
  assert.equal(new Set(plan).size, plan.length, 'no path twice')
  for (const path of ['logos/outlined/overtheedge-horizontal-forest.svg', 'logos/outlined/overtheedge-stacked-forest.svg', 'logos/outlined/overtheedge-wordmark-forest.svg', 'symbol/overtheedge-symbol-forest.svg', 'logos/source/overtheedge-site-light.svg', 'logos/source/overtheedge-site-dark.svg']) assert.ok(plan.includes(path), path)
})

// --- OTE-005 Templates ----------------------------------------------------------------------------

const MINIMUM = { full: { px: 288, mm: 58 }, words: { px: 96, mm: 20 }, symbol: { px: 16, mm: 5 } }
const minimumFor = (family = brand.families[0].id, layout = 'horizontal') => (layout === 'stacked' || family === 'words' ? MINIMUM.words : MINIMUM.full)

test('OTE-005: fourteen templates render outlined, readable, with logos at or above their minimum', () => {
  assert.deepEqual(brand.templates.map((t) => t.id), ['business-card-front', 'business-card-back', 'press-pass', 'letterhead-a4', 'issue-cover', 'story-post', 'issue-out', 'event-post', 'story-vertical', 'share-image', 'social-banner', 'slide-title', 'slide-section', 'slide-close'])
  for (const template of brand.templates) {
    const { svg } = renderTemplate({ brand, fonts, outline: true }, template)
    assert.ok(svg.includes('</svg>') && !/NaN|undefined|<text/.test(svg), template.id)
    for (const hex of paints(svg)) assert.ok(palette.has(hex), `${template.id}: ${hex}`)
    const texts = template.elements.flatMap((e) => (e.type === 'flow' ? e.items.map((item) => ({ ...item, type: 'text', ground: e.ground })) : [e])).filter((e) => ['text', 'paragraph'].includes(e.type))
    assert.ok(texts.some((e) => e.id), `${template.id} has a field`)
    // Template units are CSS px, or for a print template its physical size converted at 96 dpi.
    const mmPerUnit = template.physical ? parseFloat(template.physical[0]) / template.width : null
    const cssPx = (units) => (mmPerUnit ? units * mmPerUnit * 96 / 25.4 : units)
    for (const e of texts) {
      const ratio = contrast(colour(brand, e.colour), templateGround(template, e))
      assert.ok(ratio >= (cssPx(e.size) >= 24 ? 3 : 4.5), `${template.id}/${e.id ?? e.text}: ${ratio.toFixed(2)} at ${cssPx(e.size).toFixed(1)} css px`)
      if (e.font === 'extra') assert.equal(e.text, e.text.toUpperCase(), `${template.id}/${e.id}: Anton in capitals`)
    }
    assert.ok(texts.filter((e) => e.font === 'hand').length <= 1, `${template.id}: one hand note at most`)
    for (const e of template.elements) {
      if (e.type === 'logo') {
        const minimum = minimumFor(e.family, e.layout)
        // A logo is placed by its visible width; fitted into a box (`height` set), the box may narrow it.
        const art = lockup({ brand }, { family: e.family, layout: e.layout ?? 'horizontal' })
        const pad = brand.lockup.canvasPadding
        const visible = e.height == null ? e.width : Math.min(e.width, e.height * (art.width - 2 * pad) / (art.height - 2 * pad))
        if (mmPerUnit) assert.ok(visible * mmPerUnit >= minimum.mm, `${template.id}: logo ${(visible * mmPerUnit).toFixed(1)} mm`)
        else assert.ok(visible >= minimum.px, `${template.id}: logo ${visible} px`)
        assert.ok(contrast(colour(brand, e.colour), templateGround(template, e)) >= 3, `${template.id}: logo contrast`)
      }
      if (e.type === 'symbol' && mmPerUnit) assert.ok(e.height * mmPerUnit >= MINIMUM.symbol.mm, `${template.id}: O height`)
      if (e.type === 'symbol' && !mmPerUnit) assert.ok(e.height >= MINIMUM.symbol.px, `${template.id}: O height`)
    }
  }
})

// --- Copy scan (OTE-005, OTE-008, OTE-010) --------------------------------------------------------

const SOURCED = ["UNBC's Independent Student Newspaper", "UNBC's Student Newspaper", 'Over the Edge is here!', 'Breaking news, vibrant clubs, can’t-miss events, and a shared university calendar.', 'News · Clubs · Events · Calendar', 'overtheedge.unbc.ca']
const LOCKED = ['IN THIS ISSUE', 'PRESS', 'CALENDAR', 'WHERE', 'WHEN', 'HOST', 'OVERTHEEDGE.UNBC.CA', 'READ AT OVERTHEEDGE.UNBC.CA', 'READ IT AT OVERTHEEDGE.UNBC.CA', 'OVERTHEEDGE.UNBC.CA/CALENDAR', "UNBC'S STUDENT NEWSPAPER", 'NEWS · CLUBS · EVENTS · CALENDAR']
// Sourced facts with digits, and where they come from.
const FACTS = {
  'VOLUME 32 · ISSUE 2 · OCTOBER 16, 2025': 'October 16, 2025 cover',
  'OCTOBER 16TH · IN THIS ISSUE': 'October 16, 2025 cover ("OCTOBER 16TH", "IN THIS ISSUE")'
}
// Exempt categories, as docs/PLANS.md records them: hex codes; measured sizes (px, mm), contrast ratios
// (": 1") and logo units; canvas dimensions; version numbers; the dates the sources were published or
// read; durations in ms (amended in M3); and names that contain a digit (Source Serif 4, A4).
const DATES = ['22 October 2026', 'April 2025', 'October 2025']
const EXEMPT = [/\d+ × \d+/g, /\d+ ms\b/g, /Source Serif 4/gi, /\bA4\b/g, /#[0-9A-F]{6}\b/gi, /\d+(?:\.\d+)? ?(?:px|mm)\b/g, /\d+(?:\.\d+)? : 1\b/g, /\bv\d+\.\d+\b/g, /^## \d+\.\d+ - /g, /\b\d+(?:\.\d+)? logo units\b/g, ...DATES.map((date) => new RegExp(date, 'g'))]
const strip = (text) => EXEMPT.reduce((value, pattern) => value.replace(pattern, ''), text.replace(/\[[^\]]*\]|\{[^}]*\}/g, ''))

const guideStrings = () => [...brand.guide.pages, ...brand.guide.sheets].flatMap((page) => [page.title, page.subtitle, ...(page.elements ?? []).flatMap((e) => [e.text, ...(e.rows ?? []).flat()])]).filter((value) => typeof value === 'string')
const templateStrings = () => brand.templates.flatMap((t) => t.elements.flatMap((e) => (e.items ?? [e]).map((item) => item.text))).filter((value) => typeof value === 'string')
const webStrings = () => [...Object.values(brand.copy), ...Object.values(brand.web.intro), ...Object.values(brand.web.landing)].filter((value) => typeof value === 'string')

test('copy scan: the exemptions let measured values through, and not invented figures', () => {
  for (const kept of ['160 ms', '288 px', '58 mm', '13.4 : 1', '#155329', '1080 × 1350', 'v1.0', '42.8 logo units', '22 October 2026', 'April 2025', 'Source Serif 4', 'A4']) assert.doesNotMatch(strip(kept), /\d/, kept)
  for (const caught of ['3.5 million readers', '(12)', '10 May 2024', 'March 2019', 'since 1994', 'RGB 1, 2, 3', '40% of students', '12 issues']) assert.match(strip(caught), /\d/, caught)
})

test('copy: no em dashes, sourced or bracketed template text, and digits only where exempt', () => {
  const docs = [read('docs/README.md'), read('docs/CHANGELOG.md')]
  for (const value of [...templateStrings(), ...guideStrings(), ...webStrings(), ...docs]) assert.ok(!value.includes('—'), value.slice(0, 60))
  for (const value of templateStrings()) {
    assert.ok(/\[[^\]]+\]/.test(value) || SOURCED.includes(value) || LOCKED.includes(value), `template text: ${value}`)
    assert.doesNotMatch(value.replace(/\[[^\]]*\]/g, ''), /\d/, `template digits: ${value}`)
  }
  for (const value of [...guideStrings(), ...webStrings()]) {
    if (FACTS[value]) continue
    assert.doesNotMatch(strip(value), /\d/, `digits: ${value}`)
  }
  // A numbered list's markers are structure, not figures.
  for (const doc of docs) for (const line of doc.split('\n')) assert.doesNotMatch(strip(line.replace(/^\d+\. /, '')), /\d/, `docs: ${line}`)
})

// --- OTE-006 Icons, OTE-007 Patterns --------------------------------------------------------------

test('OTE-006: ten icons in currentColor, the site\'s five with its own geometry', () => {
  assert.deepEqual(brand.icons.items.map((icon) => icon.id), ['search', 'sun', 'moon', 'close', 'arrow-right', 'newspaper', 'calendar', 'clubs', 'pen', 'archive'])
  assert.equal(brand.icons.size, 24)
  assert.deepEqual(brand.icons.attrs, { stroke: 'currentColor', 'stroke-width': '2', fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
  for (const icon of brand.icons.items) {
    for (const [, value] of icon.content.matchAll(/(?:fill|stroke)="([^"]+)"/g)) assert.ok(['currentColor', 'none'].includes(value), `${icon.id}: ${value}`)
  }
  const geometry = (markup) => [...markup.matchAll(/<(path|circle|rect|line|polyline)\b([^>]*?)\/?>/g)].map(([, tag, attrs]) => [tag, ...['d', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'rx'].map((name) => new RegExp(`\\s${name}=["']([^"']*)["']`).exec(attrs)?.[1] ?? null)])
  const source = JSON.parse(read('reference/site-icons.json'))
  for (const entry of source.icons) {
    const icon = brand.icons.items.find((item) => item.id === entry.id)
    assert.deepEqual(geometry(icon.content), geometry(entry.markup.replace(/^<svg\b[^>]*>/, '')), entry.id)
  }
})

test('OTE-007: three patterns of the O in palette colours', () => {
  assert.deepEqual(brand.patterns.map((p) => p.id), ['o-repeat', 'o-crop', 'o-field'])
  const plan = planKit(brand)
  for (const id of ['o-repeat', 'o-crop', 'o-field']) {
    const entry = plan.find((e) => e.path === `patterns/${id}.svg`)
    const svg = entry.make({ brand, fonts })
    for (const hex of paints(svg)) assert.ok(palette.has(hex), `${id}: ${hex}`)
  }
})

// --- OTE-008 Guide --------------------------------------------------------------------------------

test('OTE-008: nine guide pages (amended in M3) and a logo sheet, in palette colours, with readable logos', () => {
  const pages = guidePages({ brand, fonts })
  assert.equal(pages.length, 9)
  assert.equal(brand.guide.frame.header, '{upperName} / BRAND GUIDE / V{displayVersion}')
  assert.equal(brand.guide.frame.footer, "{upperName} / UNBC'S INDEPENDENT STUDENT NEWSPAPER")
  assert.equal(brand.guide.frame.logo.family, 'words')
  for (const page of [...pages, ...guideSheets({ brand, fonts })]) {
    const svg = page.render()
    assert.ok(!/NaN|undefined/.test(svg), page.id)
    for (const hex of paints(svg)) assert.ok(palette.has(hex), `${page.id}: ${hex}`)
  }
  // Every guide logo element, and the frame logo, at screen size.
  const pad = brand.lockup.canvasPadding
  for (const e of [brand.guide.frame.logo, ...[...brand.guide.pages, ...brand.guide.sheets].flatMap((p) => p.elements).filter((e) => e.type === 'logo')]) {
    const art = lockup({ brand }, { family: e.family, layout: e.layout ?? 'horizontal' })
    const scale = e.height == null ? e.width / art.width : Math.min(e.width / art.width, e.height / art.height)
    const visible = (art.width - 2 * pad) * scale
    assert.ok(visible >= minimumFor(e.family, e.layout).px, `logo ${e.family ?? 'overtheedge'} ${e.layout ?? 'horizontal'}: ${visible.toFixed(0)} px`)
  }
  // The Colour page states every pair the plan measured, each matching the palette to its stated precision.
  const colourPage = brand.guide.pages[3].elements.map((e) => e.text ?? '').join(' ')
  const PAIRS = [['ink', 'newsprint'], ['bark', 'newsprint'], ['forest', 'newsprint'], ['white', 'forest'], ['lichen', 'forest'], ['white', 'pine'], ['lichen', 'pine'], ['white', 'moss'], ['ink', 'sage'], ['proof', 'newsprint'], ['white', 'proof'], ['sage', 'pine'], ['sage', 'forest']]
  for (const [fg, bg] of PAIRS) {
    const stated = new RegExp(`${fg} on ${bg} ([\\d.]+) : 1`).exec(colourPage)
    assert.ok(stated, `${fg} on ${bg} is stated`)
    const places = (stated[1].split('.')[1] ?? '').length
    assert.equal(Number(stated[1]), Number(contrast(brand.colours[fg], brand.colours[bg]).toFixed(places)), `${fg} on ${bg}`)
  }
  assert.match(colourPage, /bark on newsprint 4\.53 : 1/)
  assert.match(colourPage, /At 24 px and up only: sage on pine [\d.]+ : 1 · sage on forest [\d.]+ : 1/)
})

// --- OTE-009 Definition, OTE-010 Docs -------------------------------------------------------------

test('OTE-009 and OTE-010: valid, registered, documented', () => {
  assert.deepEqual(validateBrand(brand), [])
  const pkg = JSON.parse(readFileSync(`${root}package.json`, 'utf8'))
  assert.equal(pkg.scripts['make:overtheedge'], 'node scripts/brands/overtheedge.mjs')
  assert.ok(JSON.parse(readFileSync(`${root}brands/index.json`, 'utf8')).some((entry) => entry.id === 'overtheedge'))
  const readme = read('docs/README.md')
  for (const heading of ['## Start here', '## What this kit is built from', '## Rules in brief', '## Package contents', 'Anton and Gochi Hand stand in']) assert.ok(readme.includes(heading), heading)
  assert.match(read('docs/CHANGELOG.md'), /^## 1\.0 - 22 October 2026$/m)
  assert.ok(read('reference/README.md').includes('PROVENANCE.json'))
  const provenance = JSON.parse(read('reference/PROVENANCE.json'))
  assert.equal(provenance.covers.length, 2)
  for (const cover of provenance.covers) assert.match(cover.sha256, /^[0-9a-f]{64}$/)
  const root_readme = readFileSync(`${root}README.md`, 'utf8')
  assert.ok(root_readme.includes('[`brands/overtheedge`](brands/overtheedge)') && root_readme.includes('npm run make:overtheedge'))
})

// --- M3: motion, brand details and site ----------------------------------------------------------


/** Hex colours written in a stylesheet or page (embedded font data left out), each must be a palette colour. */
/** The faces a page embeds, as 'family weight style', sorted; every one must be a data: URI. */
const embedded = (text) => [...text.matchAll(/@font-face \{ font-family: '([^']+)'; font-weight: (\d+); font-style: (\w+);[^}]*src: url\(data:font\/(?:ttf|woff2);base64,/g)].map((m) => `${m[1]} ${m[2]} ${m[3]}`).sort()
const cssColours = (text) => [...text.replace(/base64,[A-Za-z0-9+/=]+/g, 'base64,').matchAll(/#([0-9a-fA-F]{3,8})\b/g)].map((m) => `#${m[1]}`.toUpperCase())

test('OTE-012: thirteen motion studies, their tokens as CSS variables, palette colours, in the kit', () => {
  const { motion } = brand
  const ids = motion.studies.map((study) => study.id)
  assert.equal(ids.length, 13)
  assert.equal(new Set(ids).size, ids.length, 'unique study ids')
  for (const study of motion.studies) assert.ok(study.name && study.kind && study.timing && study.use && study.description, study.id)
  assert.deepEqual(motion.studies.map((s) => s.kind), ['logo', 'logo', 'logo', 'loader', 'loader', 'loader', 'loader', 'interface', 'interface', 'interface', 'interface', 'interface', 'interface'])
  const page = read(motion.page)
  const css = read(motion.css)
  for (const id of ids) assert.match(page, new RegExp(`data-study="${id}"`), id)
  for (const key of [...Object.keys(motion.tokens.durations), ...Object.keys(motion.tokens.easings), 'stagger']) assert.match(css, new RegExp(`--ote-${key}:`), key)
  assert.match(css, /prefers-reduced-motion: reduce/)
  for (const text of [page, css]) {
    assert.ok(!/NaN|undefined/.test(text.replace(/base64,[A-Za-z0-9+/=]+/g, '')))
    for (const hex of cssColours(text)) assert.ok(palette.has(hex), hex)
    for (const [mix] of text.matchAll(/color-mix\(in srgb, ([^,]+), transparent\)|color-mix\([^)]*\)/g)) assert.match(mix, /^color-mix\(in srgb, var\(--ote-[a-z]+\) \d+%, transparent\)$/, mix)
    assert.doesNotMatch(text, /https?:\/\/fonts\.(googleapis|gstatic)/, 'no network fonts')
  }
  const tokensJson = JSON.parse(read('motion/motion-tokens.json'))
  for (const key of ['durations', 'easings', 'stagger', 'distance']) assert.deepEqual(tokensJson[key], motion.tokens[key], key)
  assert.match(css, /--ote-distance:/)
  // Colours are hex palette values or color-mix of palette variables, never other colour functions.
  for (const text of [page, css, read('docs/brand-details.html'), read('site/index.html')]) {
    const source = text.replace(/base64,[A-Za-z0-9+/=]+/g, 'base64,')
    assert.doesNotMatch(source, /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/, 'no other colour functions')
    assert.doesNotMatch(source, /(?:url\(|@import\s)['"]?https?:/, 'nothing fetched from elsewhere')
  }
  assert.deepEqual(embedded(page), ['Anton 400 normal', 'IBM Plex Mono 500 normal', 'Inter 400 normal', 'Source Serif 4 700 normal'])
  const plan = planKit(brand).map((entry) => entry.path)
  for (const file of ['motion/index.html', 'motion/motion.css', 'motion/motion-tokens.json', 'motion/README.md', 'guidelines/brand-details.html']) assert.ok(plan.includes(file), file)
  const readme = read('motion/README.md')
  for (const rule of motion.rules) assert.ok(readme.includes(rule.title), rule.title)
  for (const study of motion.studies) assert.ok(readme.includes(`| ${study.name} |`), study.name)
  for (const key of Object.keys(motion.tokens.durations)) assert.ok(readme.includes(`--ote-${key}`), key)
})

test('OTE-013: nine guide pages, the Motion page before Files, in palette colours', () => {
  const pages = guidePages({ brand, fonts })
  assert.equal(pages.length, 9)
  assert.deepEqual(brand.guide.pages.slice(-2).map((page) => page.name), ['Motion', 'Files'])
  const motion = pages[7].render()
  assert.ok(!/NaN|undefined/.test(motion))
  for (const hex of paints(motion)) assert.ok(palette.has(hex), hex)
  assert.equal(brand.guide.pages[7].elements.filter((e) => e.type === 'path' && e.d === brand.wordmark.glyphs.over).length, 4, 'OVER in each of four frames')
})

test('OTE-014: the brand details page is self-contained, in palette colours, and shipped', () => {
  const html = read('docs/brand-details.html')
  assert.ok(brand.files.some((file) => file.to === 'guidelines/brand-details.html' && file.from === 'docs/brand-details.html'))
  assert.ok(!/NaN|undefined/.test(html.replace(/base64,[A-Za-z0-9+/=]+/g, '')))
  assert.match(html, /<svg class="logo"/)
  assert.deepEqual(embedded(html), ['Anton 400 normal', 'Gochi Hand 400 normal', 'IBM Plex Mono 500 normal', 'Inter 400 normal', 'Source Serif 4 700 normal'])
  for (const hex of cssColours(html)) assert.ok(palette.has(hex), hex)
  assert.doesNotMatch(html, /(?:src|href)="https?:/, 'nothing loaded from elsewhere')
  assert.ok(!html.includes('—'))
})

test('OTE-015: the site uses the kit\'s motion CSS, its marked artwork, and only local files', () => {
  const site = read('site/index.html')
  assert.equal(read('site/assets/motion.css'), read(brand.motion.css))
  assert.match(site, /href="assets\/motion\.css"/)
  assert.match(site, /<!-- ote:logo --><svg class="ote-lockup"[\s\S]*?<\/svg><!-- \/ote:logo -->/)
  assert.match(site, /<!-- ote:issue-logo --><svg class="ote-lockup"[\s\S]*?<\/svg><!-- \/ote:issue-logo -->/)
  assert.match(site, /<!-- ote:loader --><svg class="ote-o"[\s\S]*?<\/svg><!-- \/ote:loader -->/)
  assert.match(site, /<!-- ote:fonts -->@font-face[\s\S]*?<!-- \/ote:fonts -->/)
  assert.deepEqual(embedded(site), ['Anton 400 normal', 'Gochi Hand 400 normal', 'IBM Plex Mono 500 normal', 'Inter 400 normal', 'Inter 600 normal', 'Source Serif 4 700 normal'])
  for (const asset of [...site.matchAll(/(?:src|href)="((?:assets|licenses)\/[^"]+)"/g)].map((m) => m[1])) assert.ok(existsSync(`${folder}site/${asset}`), asset)
  for (const file of ['Anton-OFL.txt', 'IBMPlexMono-OFL.txt', 'GochiHand-OFL.txt', 'SourceSerif-OFL.md', 'Inter-OFL.txt']) assert.equal(sha(`${folder}site/licenses/${file}`), sha(findAsset(folder, `fonts/${file}`)), file)
  for (const hex of cssColours(site)) assert.ok(palette.has(hex), hex)
  assert.ok(!site.includes('—'))
  for (const shot of ['desktop.jpg', 'mobile.jpg', 'desktop-full.jpg', 'mobile-full.jpg']) assert.ok(existsSync(`${folder}site/screenshots/${shot}`), shot)
  const readme = read('site/README.md')
  for (const heading of ['## Motion', 'ote:logo', 'screenshots/']) assert.ok(readme.includes(heading), heading)
  assert.ok(!brand.files.some((file) => String(file.to ?? file).startsWith('site/')), 'the site is not in the kit')
})

test('OTE-016: the README and change log describe motion and the brand details page', () => {
  const readme = read('docs/README.md')
  assert.ok(readme.includes('motion/index.html') && readme.includes('guidelines/brand-details.html'))
  assert.match(read('docs/CHANGELOG.md'), /^## 1\.0 - motion \(22 October 2026\)$/m)
})
