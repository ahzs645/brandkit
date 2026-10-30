// Source-backed dimensions and completeness of the delivered audit, independent of generator helpers.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { layoutFlow } from '../src/engine/templates.js'

const folder = new URL('../brands/bc-hydro-1983/', import.meta.url)
const read = (path) => readFileSync(new URL(path, folder))
const json = (path) => JSON.parse(read(path))
const brand = json('brand.json')
const audit = json('docs/manual-audit.json')
const source = json('reference/manual-source.json')
const template = (id) => brand.templates.find((entry) => entry.id === id)
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 0.003, `${label}: ${actual} vs ${expected} mm`)

test('H25–H28 cover construction preserves printed proportions, sizes and dominant cap-height gaps', () => {
  for (const [id, size] of [['cover-report', 36], ['cover-illustrated', 36], ['cover-display', 24]]) {
    const page = template(id)
    const signature = page.elements.find((element) => element.type === 'logo')
    const flow = page.elements.find((element) => element.type === 'flow')
    const bounds = layoutFlow({ brand }, flow, 'mm').bounds
    const dominantCap = size * 25.4 / 72 * 0.662
    assert.equal(signature.points, size)
    close(signature.x, page.width / 3, `${id}: B at one-third width`)
    close(signature.y, page.height / 4, `${id}: signature cap at one-quarter depth`)
    assert.equal(signature.anchorX, 'logotype')
    assert.equal(signature.anchorY, 'cap')
    close(flow.x, signature.x, `${id}: text aligned under B`)
    close(bounds.get('cover-title').top - (signature.y + dominantCap), 2 * dominantCap, `${id}: two cap-heights before title`)
    for (let index = 0; index < flow.items.length; index++) {
      const item = flow.items[index]
      const pointSize = index ? size / 2 : size
      assert.equal(item.size, `${pointSize}pt`)
      close(item.leading, pointSize * 25.4 / 72, `${id}/${item.id}: solid leading`)
      if (index) close(bounds.get(item.id).top - bounds.get(flow.items[index - 1].id).lastBaseline, dominantCap, `${id}/${item.id}: dominant cap gap`)
    }
  }
  assert.equal(template('cover-illustrated').fidelity.status, 'partial-artwork', 'a placeholder illustration must not be reported as complete')
})

test('H18 Rail stationery preserves the separate locomotive sizes and printed spacing', () => {
  const card = template('card-rail')
  const emblem = card.elements.find((element) => element.illustration === 'bce-route-card')
  const address = card.elements.find((element) => element.type === 'lines')
  close(emblem.width, 25.4, 'card BCE width: 1 inch')
  close(address.x - emblem.x - emblem.width, 25.4 / 16, 'BCE to address: 1/16 inch')
  close(card.height - address.y, 25.4 / 4, 'final baseline: 1/4 inch from foot')
  const letterhead = template('letterhead-rail')
  close(letterhead.elements.find((element) => element.illustration === 'bce-route-outline').x, 25.4 * 3 / 4, 'letterhead BCE left inset: 3/4 inch')
  assert.equal(brand.signatures.length, 4, 'the heritage locomotive is not an additional official signature')
  assert.equal(brand.relatedMarks.find((mark) => mark.id === 'bce-route').variants.length, 2)
  for (const id of ['card-standard', 'card-gas']) {
    const page = template(id)
    const logo = page.elements.find((element) => element.type === 'logo')
    const phone = page.elements.find((element) => element.type === 'lines' && element.lines.some((line) => line.compose === '{telephone}'))
    assert.ok(phone, `${id}: telephone field`)
    close(phone.x, logo.x, `${id}: telephone right edge at symbol left edge`)
    assert.equal(phone.anchor, 'end')
  }
})

test('the complete source inventory and each registered crop are intact and included in the kit', () => {
  assert.equal(source.source.sha256, 'ca5e1bc22d8908d69b7f56e75ff84bbfbe7e7e2a4f45260d44bc7372ff775b18')
  assert.equal(source.pages.length, 48)
  assert.deepEqual(source.pages.map((page) => page.id), Array.from({ length: 48 }, (_, index) => `H${String(index + 1).padStart(2, '0')}`))
  const files = new Set(brand.files.map((file) => typeof file === 'string' ? file : file.from))
  for (const asset of [...source.pages, ...source.templateReferences]) {
    const bytes = read(asset.file)
    assert.equal(bytes.length, asset.bytes, asset.file)
    assert.equal(sha(bytes), asset.sha256, asset.file)
    assert.ok(files.has(asset.file), `${asset.file}: included in downloaded kit`)
    assert.ok(asset.width > 0 && asset.height > 0)
  }
  for (const reference of source.templateReferences) {
    assert.equal(template(reference.template).reference.src, reference.file)
    assert.equal(reference.printedPage, reference.pdfPage - 1)
    assert.ok(reference.note)
  }
  assert.match(source.templateReferences.find((item) => item.template === 'letterhead-rail').note, /blank lower area is not source evidence/)
})

test('the audit describes the exact current brand and newly represented application areas', () => {
  assert.equal(audit.brandDefinitionSha256, sha(read('brand.json')), 'regenerate the report after changing brand.json')
  assert.equal(audit.pages.length, 48)
  assert.equal(audit.counts.editableTemplates, brand.templates.length)
  assert.equal(audit.counts.templatesWithLayoutRules, brand.templates.filter((page) => page.guides?.elements?.length).length)
  assert.equal(audit.counts.templatesWithRegisteredScans, brand.templates.filter((page) => page.reference?.src).length)
  for (const id of ['form-tender', 'form-employee-transfer', 'form-service-application', 'form-formal-header', 'cover-back', 'cover-back-display', 'spine-broad', 'spine-narrow', 'publication-text', 'display-panel', 'advert-single-column']) {
    assert.ok(template(id), id)
    assert.ok(audit.templates.some((page) => page.id === id), `${id}: present in audit`)
  }
  close(template('form-tender').height, 14 * 25.4, 'tender: full legal height, despite the interrupted source illustration')
  for (const id of ['cover-back', 'cover-back-display']) {
    assert.ok(template(id).elements.every((element) => !['logo', 'symbol', 'illustration'].includes(element.type)), `${id}: no signature or printer mark`)
    assert.ok(template(id).elements.some((element) => element.type === 'text' && element.size === '6pt'), `${id}: 6 pt printing code`)
  }
})
