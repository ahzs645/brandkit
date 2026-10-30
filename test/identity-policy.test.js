import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Script } from 'node:vm'
import { paintOptions, validateBrand } from '../src/engine/brand.js'
import { logoDocument, mark, symbolDocument } from '../src/engine/artwork.js'
import { logoDimensions } from '../src/engine/identity.js'
import { consumerProfile } from '../src/engine/consumer.js'
import { appIconSvg, faviconSvg, reactComponent, brandCss, tokens, indexHtml, landingHtml } from '../src/engine/web.js'
import { renderTemplate, wrapLines } from '../src/engine/templates.js'
import { signatureLayout } from '../src/engine/office.js'
import { signatureHtml } from '../src/export/office.js'
import { planKit } from '../src/engine/kit.js'
import { KIT_PACKS } from '../src/engine/packs.js'
import { readAffiliation, writeAffiliation } from '../src/app/affiliation.js'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'

const folder = new URL('../brands/unbc/', import.meta.url).pathname
const brand = JSON.parse(readFileSync(`${folder}brand.json`, 'utf8'))
const fonts = await loadBrandFontsFromDisk(brand, folder)
const ctx = { brand, fonts }

test('fixed artwork restrictions apply to logo, symbol, motif and icon entry points', () => {
  assert.deepEqual(validateBrand(brand), [])
  assert.equal(paintOptions(brand).some(paint => paint.id === 'currentcolor'), false)
  for (const colour of ['#B79527', 'gold', 'currentColor', '#123456']) assert.throws(() => logoDocument(ctx, { signature: 'official', colour }), /permitted|only use/)
  for (const colourway of ['green', 'black', 'white']) assert.match(logoDocument(ctx, { signature: 'official', colourway }), /<path/)
  assert.throws(() => symbolDocument(ctx, { colourKey: 'green' }), /standalone/)
  assert.throws(() => mark(ctx, '#B79527'), /complete-logo/)
  assert.throws(() => appIconSvg(ctx), /approved app icon/)
  assert.throws(() => faviconSvg(ctx), /approved favicon/)
  for (const type of ['symbol', 'motif']) assert.throws(() => renderTemplate(ctx, { id: 'small-art', width: 100, height: 100, unit: 'mm', elements: [{ type, x: 20, y: 20, width: 20, height: 20, colour: 'gold' }] }), /complete-logo/)
  assert.throws(() => renderTemplate(ctx, { id: 'small-logo', width: 100, height: 100, unit: 'mm', elements: [{ type: 'logo', signature: 'official', colourway: 'green', x: 20, y: 20, width: 20 }] }), /38\.1 mm/)
})

test('physical sizing and portable profiles carry source rules and explicit font substitution', () => {
  assert.throws(() => logoDimensions(brand, 38), /38\.1 mm/)
  const minimum = logoDimensions(brand, 38.1)
  const larger = logoDimensions(brand, 250)
  assert.equal(minimum.totalWidthMm, minimum.widthMm + 2 * minimum.clearSpaceMm)
  assert.ok(larger.clearSpaceMm >= 250 * brand.logoPolicy.clearSpaceRatio)
  const profile = consumerProfile(ctx)
  assert.equal(profile.typography.body.family, 'Arial')
  assert.equal(profile.typography.body.renderingFamily, 'Helvetica Neue LT Pro')
  assert.equal(profile.typography.body.officialFamily, 'Helvetica Neue')
  assert.equal(profile.identity.minimumLogoWidthMm, 38.1)
  assert.equal(profile.identity.organization.naming.mode, 'document-text')
  assert.equal(profile.affiliation.departmentSizePt, 12)
  assert.equal(tokens(ctx).font.body, 'Arial')
})

test('portable web outputs have supported colourways, mobile space and no unavailable assets', () => {
  const component = reactComponent(ctx)
  assert.doesNotMatch(component, /currentColor|export function UNBCMark|const SYMBOL/)
  assert.match(component, /minWidth: 144/)
  assert.match(component, /colourway\?: keyof typeof ARTWORK/)
  assert.match(brandCss(ctx), /\.unbc-label[^}]+text-transform: none/)
  const records = planKit(brand, { rasters: false, pdfs: false, office: false }).map(entry => ({ path: entry.path, group: entry.group, bytes: 100 }))
  const html = indexHtml(ctx, records)
  assert.doesNotMatch(html, /href="web\/favicon\.svg"|value="symbol">Symbol/)
  assert.match(html, /id="background" disabled/)
  assert.match(html, /@media\(max-width:480px\).*grid-template-columns:1fr/)
  const script = html.match(/<script>([\s\S]+)<\/script>/)[1]
  assert.doesNotThrow(() => new Script(script), 'offline index script parses')
  const landing = landingHtml(ctx)
  assert.doesNotMatch(landing, /href="favicon\.svg"|src="\.\.\/symbol\//)
  assert.match(landing, /header img\{[^}]*padding:8\.71px\}/, 'the logo sits on the page, not on a painted box')
  assert.doesNotMatch(landing, /background:#fff\}/)
})

test('identity sources accompany every portable task pack, and official originals every pack used to make something', () => {
  for (const pack of KIT_PACKS) {
    const paths = planKit(brand, { ...pack.options, pack: pack.id }).map(entry => entry.path)
    for (const path of ['reference/identity-rules.json', 'reference/PROVENANCE.json', 'reference/README.md']) assert.ok(paths.includes(path), `${pack.id}: ${path}`)
    // The logos pack is artwork alone; the Word and PowerPoint originals travel with the rest.
    for (const path of ['official-templates/lhopt1official.docx', 'official-templates/unbcpowerpointtemplate.pptx']) assert.equal(paths.includes(path), pack.id !== 'logos', `${pack.id}: ${path}`)
    assert.ok(!paths.some(path => /^symbol\/|favicon|app-icon/.test(path)), pack.id)
  }
})

test('email exports preserve logo space and long names without a full-canvas image or duplicate line gaps', async () => {
  const document = brand.documents.find(item => item.format === 'html')
  const template = brand.templates.find(item => item.id === document.template)
  const layout = signatureLayout(ctx, template, document.emailLayout)
  assert.ok(layout.image.elements.some(item => item.type === 'background' && item.fill === 'white'))
  assert.ok(layout.image.height < 100, 'short signatures do not inherit the 540 px canvas height')
  const crop = layout.image.viewport
  const logo = template.elements.find(item => item.type === 'logo')
  const clear = logo.width * brand.logoPolicy.clearSpaceRatio
  const logoHeight = logo.width * brand.symbol.viewBox[3] / brand.symbol.viewBox[2]
  assert.ok(logo.x - crop.x >= clear && crop.x + crop.width - logo.x - logo.width >= clear, 'horizontal logo clear space survives the crop')
  assert.ok(logo.y - crop.y >= clear && crop.y + crop.height - logo.y - logoHeight >= clear, 'vertical logo clear space survives the crop')
  let rasterSource
  const png = async svg => { rasterSource = svg; return new Uint8Array([0]) }
  const result = await signatureHtml(ctx, document, { png })
  assert.match(rasterSource, /fill="#FFFFFF"/)
  assert.ok(rasterSource.includes(`viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}"`), 'cropping retains source coordinates and scale')
  assert.match(result.html, /background-color:#FFFFFF/)
  assert.match(result.html, /font-family:'Arial'/)
  assert.doesNotMatch(result.html, /font-family:'Helvetica Neue LT Pro'/)
  assert.equal((result.html.match(/valign="top"/g) ?? []).length, 2, 'both logo and text align at the top')
  assert.ok(result.html.includes(`height="${layout.image.height}"`))
  assert.ok(result.html.includes(`width:${layout.textWidth}px;max-width:${layout.textWidth}px`), 'the text pane has a wrapping width')

  const longName = 'W'.repeat(180)
  const long = await signatureHtml({ ...ctx, values: { department: longName, subdepartment: longName } }, document, { png })
  const paragraphs = [...long.html.matchAll(/<p style="([^"]*)">([\s\S]*?)<\/p>/g)]
  assert.equal(paragraphs.filter(([, , text]) => text === longName).length, 2, 'wrapping does not insert spaces into either unit name')
  for (const [, style] of paragraphs) {
    const gap = Number(/margin:([\d.]+)(?:px)? 0 0/.exec(style)?.[1])
    assert.ok(Number.isFinite(gap) && gap < 40, 'multiline field height is not added to the next field margin')
    assert.match(style, /overflow-wrap:anywhere;word-break:break-word/)
  }
  const legacy = await signatureHtml(ctx, { ...document, emailLayout: undefined }, { png })
  assert.match(legacy.html, /valign="middle"/)
  assert.ok(legacy.html.includes(`height="${template.height}"`), 'other brands retain their existing canvas layout unless they opt in')
})

test('unit selection persists to native fields without losing unrelated content', () => {
  const map = new Map([['brandkit:fields:unbc', '{"author":"Retained author"}']])
  const storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) }
  writeAffiliation('unbc', { department: '  Faculty of\nEnvironment ', subdepartment: 'Research\tunit' }, storage)
  assert.deepEqual(readAffiliation('unbc', storage), { department: 'Faculty of Environment', subdepartment: 'Research unit' })
  assert.deepEqual(JSON.parse(map.get('brandkit:fields:unbc')), { author: 'Retained author', department: 'Faculty of Environment', subdepartment: 'Research unit' })
  assert.throws(() => writeAffiliation('unbc', { subdepartment: 'Child alone' }, storage), /parent department/)
  assert.throws(() => writeAffiliation('unbc', { department: 'W'.repeat(181) }, storage), /180/)
  assert.equal(readAffiliation('unbc', storage).department, 'Faculty of Environment')
  const fields = JSON.parse(map.get('brandkit:fields:unbc'))
  storage.setItem('brandkit:fields:unbc', JSON.stringify({ ...fields, subdepartment: 'Edited in a native template' }))
  assert.equal(readAffiliation('unbc', storage).subdepartment, 'Edited in a native template')
  storage.setItem('brandkit:fields:unbc', '{}')
  assert.deepEqual(readAffiliation('unbc', storage), { department: '', subdepartment: '' }, 'clearing native fields clears the shared selection')
  for (const invalid of ['null', '[]', 'invalid JSON']) {
    storage.setItem('brandkit:fields:unbc', invalid)
    assert.equal(readAffiliation('unbc', storage).department, 'Faculty of Environment', 'invalid native records fall back to saved names')
  }
  map.delete('brandkit:fields:unbc')
  assert.equal(readAffiliation('unbc', storage).department, 'Faculty of Environment')
})

test('wrapping preserves every character of long unit names without horizontal overflow', () => {
  const name = 'W'.repeat(180)
  const lines = wrapLines(name, 80, value => fonts.width(value, 'bold', 12), { breakWords: true })
  assert.deepEqual(wrapLines(name, 80, value => fonts.width(value, 'bold', 12)), [name], 'existing designs retain word-boundary wrapping unless they opt in')
  assert.equal(lines.join(''), name)
  assert.ok(lines.length > 1)
  for (const line of lines) assert.ok(fonts.width(line, 'bold', 12) <= 80)
  assert.deepEqual(wrapLines('a short name', 100, value => value.length), ['a short name'])
})
