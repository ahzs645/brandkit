import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { strToU8, strFromU8, zipSync } from 'fflate'
import { createPrinterPackage, importPrinterPackage, readPrinterPackage } from '../src/printer/package.js'
import { nodes, parseSvg, sanitizeSvg } from '../src/printer/svg.js'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { buildKit, planKit, renderTemplate, templateFields, validateBrand } from '../src/engine/index.js'

const brand = JSON.parse(readFileSync(new URL('../brands/overtheedge/brand.json', import.meta.url)))
const folder = new URL('../brands/overtheedge/', import.meta.url).pathname
const source = readFileSync(`${folder}templates/staff-card.zip`)
const fonts = await loadBrandFontsFromDisk(brand, folder)
const front = brand.templates.find((entry) => entry.id === 'staff-card-front')
const nameKey = front.printer.fieldKeys['fullname-first-linebreak-last_1']

test('OTE has the original staff card as a front/back template set, with its fonts and kit assets', () => {
  assert.deepEqual(validateBrand(brand), [])
  assert.deepEqual(fonts.failures, [])
  assert.equal(brand.printer.packages.find((entry) => entry.id === 'staff-card').sourceUrl, 'https://projects.ahmadjalil.com/builds/configs/staff_card.zip')
  const set = brand.sets.find((entry) => entry.id === 'staff-card')
  assert.deepEqual(set.variants.map((entry) => entry.template), ['staff-card-front', 'staff-card-back'])
  assert.equal(templateFields(front, brand).find((entry) => entry.id === nameKey).label, 'Full name')
  const rendered = renderTemplate({ brand, fonts, values: { [nameKey]: 'Alex Example' } }, front)
  assert.match(rendered.svg, /font-size:15px/)
  assert.equal(nodes(parseSvg(rendered.svg).getElementById('fullName_First_LineBreak_Last'), 'tspan').map((span) => span.textContent).join(' '), 'Alex Example')
  const outlined = renderTemplate({ brand, fonts, values: { [nameKey]: 'Alex Example' }, outline: true }, front)
  assert.doesNotMatch(outlined.svg, /<text\b|NaN|undefined/)
  assert.match(outlined.svg, /<path/)
  for (const path of ['templates/staff-card-front.svg', 'templates/staff-card-back.svg', 'templates/staff-card.zip']) assert.ok(planKit(brand).some((entry) => entry.path === path), path)
})

test('editing an imported card round-trips both sides, fonts, mappings and sample values', async () => {
  const { bytes, manifest } = await createPrinterPackage({ brand, fonts, values: { [nameKey]: 'Alex Example' } }, front, { readAsset: (path) => readFileSync(`${folder}${path}`) })
  const original = readPrinterPackage(source)
  const result = readPrinterPackage(bytes)
  assert.deepEqual(manifest.sides, original.manifest.sides)
  assert.deepEqual(manifest.fonts, original.manifest.fonts)
  assert.equal(manifest.sampleData['fullname-first-linebreak-last_1'], 'Alex Example')
  for (const font of manifest.fonts) assert.deepEqual(result.files[font.file], original.files[font.file])
  const imported = importPrinterPackage(brand, bytes, { id: 'edited-staff-card' })
  const card = imported.brand.templates.find((entry) => entry.id === 'edited-staff-card-front')
  const svg = parseSvg(renderTemplate({ brand: imported.brand, fonts }, card).svg)
  assert.equal(nodes(svg.getElementById('fullName_First_LineBreak_Last'), 'tspan').map((span) => span.textContent).join(' '), 'Alex Example')
})

test('native templates export their fields, paragraph layout, physical size and distinct font faces', async () => {
  for (const id of ['business-card-back', 'letterhead-a4', 'story-post']) {
    const template = brand.templates.find((entry) => entry.id === id)
    const { bytes, manifest } = await createPrinterPackage({ brand, fonts }, template)
    const result = readPrinterPackage(bytes)
    assert.ok(manifest.sides.front.fields.length > 0, id)
    assert.equal(new Set(manifest.fonts.map((font) => font.name)).size, manifest.fonts.length)
    assert.ok(!manifest.missingFonts?.length)
    assert.ok(manifest.fonts.every((font) => result.files[font.file]?.length))
    assert.match(strFromU8(result.files['front.svg']), /width="/)
    const imported = importPrinterPackage(brand, bytes, { id: `test-${id}` })
    assert.deepEqual(validateBrand(imported.brand), [])
    const card = imported.brand.templates.find((entry) => entry.id === `test-${id}-front`)
    assert.equal(card.width, template.width)
    assert.deepEqual(card.physical, renderTemplate({ brand, fonts }, template).physical)
  }
})

test('embedded package assets survive JSON, font loading and a complete kit build without disk access', async () => {
  const imported = importPrinterPackage({ ...brand, templates: [], sets: [], files: [], fonts: {}, printer: undefined }, source)
  const portable = JSON.parse(JSON.stringify(imported.brand))
  const provider = await loadBrandFontsFromDisk(portable, '/does-not-exist')
  assert.deepEqual(provider.failures, [])
  const result = await buildKit({ brand: portable, fonts: provider }, { filter: (entry) => entry.kind === 'asset' || entry.path.startsWith('templates/') })
  assert.deepEqual(result.skipped, [])
  assert.ok(result.files.get('printer/staff-card/design.zip')?.length)
  assert.ok(result.files.get('templates/staff-card-front.svg')?.length)
})

const advancedPackage = () => {
  const artwork = '<svg xmlns="http://www.w3.org/2000/svg" width="54mm" height="86mm" viewBox="0 0 54 86"><text id="name" x="3" y="10">Example</text><image id="photo" x="3" y="15" width="20" height="20"/><text id="barcode" x="3" y="55">12345</text></svg>'
  const side = { file: 'front.svg', name: 'Advanced', fields: [{ id: 'name', sourceId: 'name', type: 'date', label: 'Date', x: 5, y: 10, required: true, maxLines: 2 }, { id: 'photo', sourceId: 'photo', type: 'image', label: 'Photo' }, { id: 'barcode', sourceId: 'barcode', type: 'barcode', label: 'Barcode', barcodeSymbology: 'code128', fontSize: 12 }], mappings: [{ svgLayerId: 'name', standardFieldName: 'expiryDate' }], cardArea: { formatId: 'custom', keepBleed: false, trimBox: { x: 0, y: 0, width: 54, height: 86 }, trimWidthMm: 54, trimHeightMm: 86 } }
  const manifest = { format: 'template-printer-package', version: 1, name: 'Advanced', sides: { front: side, back: { ...side, file: 'back.svg' } }, variants: [{ id: 'default', name: 'Default', front: side }, { id: 'green', name: 'Green', match: ['staff'], front: { ...side, file: 'variants/green.svg' } }], variantField: 'position', editor: { version: 1, widthMm: 54, heightMm: 86, front: 'editor/front.json' }, fonts: [], sampleData: { name: '2026-12-31', barcode: '12345' }, customExtension: { keep: true } }
  return { manifest, files: { 'manifest.json': strToU8(JSON.stringify(manifest)), 'front.svg': strToU8(artwork), 'back.svg': strToU8(artwork), 'variants/green.svg': strToU8(artwork), 'editor/front.json': strToU8('{"version":1,"objects":[]}') } }
}

test('variants, trim, canvas documents, image/date/barcode fields and extension metadata survive both directions', async () => {
  const example = advancedPackage()
  const imported = importPrinterPackage(brand, zipSync(example.files), { id: 'advanced' })
  const card = imported.brand.templates.find((entry) => entry.id === 'advanced-front')
  const drawn = renderTemplate({ brand: imported.brand, values: { 'advanced-barcode': '67890' } }, card)
  assert.match(drawn.svg, /<path/)
  const exported = await createPrinterPackage({ brand: imported.brand }, card)
  const result = readPrinterPackage(exported.bytes)
  assert.deepEqual(result.manifest, example.manifest)
  assert.deepEqual(result.files['editor/front.json'], example.files['editor/front.json'])
  assert.equal(imported.brand.templates.filter((entry) => entry.printer?.packageId === 'advanced').length, 3)
})

test('unsafe SVG and invalid archives are rejected or cleaned without dropping local artwork references', () => {
  const safe = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="bad()"><defs><path id="p" d="M0 0L1 1"/></defs><use href="#p"/><use href="https://bad.test/x.svg"/><script>bad()</script><foreignObject><div>bad</div></foreignObject><style>@import "https://bad.test";</style></svg>')
  assert.doesNotMatch(safe, /onload|<script|foreignObject|https:/)
  assert.match(safe, /href="#p"/)
  assert.throws(() => sanitizeSvg('<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg/>'), /entities/)
  const example = advancedPackage()
  assert.throws(() => readPrinterPackage(zipSync({ ...example.files, '../escape.svg': strToU8('bad') })), /unsafe path/)
  assert.throws(() => readPrinterPackage(zipSync({ ...example.files, 'manifest.json': strToU8(JSON.stringify({ ...example.manifest, version: 2 })) })), /Unsupported/)
  assert.throws(() => importPrinterPackage(brand, source, { id: 'business-card' }), /already uses/)
})
