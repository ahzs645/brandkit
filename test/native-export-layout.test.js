import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { strFromU8, unzipSync } from 'fflate'
import { DOMParser } from '@xmldom/xmldom'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { renderTemplate, templateFields, toUnits } from '../src/engine/templates.js'
import { docxFile, signatureHtml } from '../src/export/office.js'
import { createPrinterPackage, importPrinterPackage, readPrinterPackage } from '../src/printer/package.js'
import { nodes, parseSvg } from '../src/printer/svg.js'

const folder = new URL('../brands/bc-hydro-1983/', import.meta.url)
const brand = JSON.parse(readFileSync(new URL('brand.json', folder)))
const fonts = await loadBrandFontsFromDisk(brand, folder.pathname)
const ctx = { brand, fonts }
const template = (id) => brand.templates.find((item) => item.id === id)
const pixel = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'))
const xmlOf = (bytes) => strFromU8(unzipSync(bytes)['word/document.xml'])

test('Printer interchange omits construction guides even when the preview shows them', async () => {
  const cover = template('cover-report')
  assert.ok(cover.guides.elements.length)
  const { bytes, manifest } = await createPrinterPackage({ ...ctx, brand: { ...brand, sets: [] }, showLayoutGuides: true }, cover)
  const { files } = readPrinterPackage(bytes)
  const svg = strFromU8(files[manifest.sides.front.file])
  assert.doesNotMatch(svg, /layout-guides|data-layout-guide|1\/3 cover width|2 cap-heights/)
  assert.equal(manifest.sides.front.fields.length, templateFields(cover, brand).length)
  assert.ok(manifest.sides.front.fields.every((field) => templateFields(cover, brand).some((declared) => declared.id === field.sourceId)))
})

test('blank form paragraphs retain physical size, coordinates, wrapping and editable targets in Printer packages', async () => {
  const tender = template('form-tender')
  const { bytes, manifest } = await createPrinterPackage({ ...ctx, brand: { ...brand, sets: [] } }, tender)
  const { files } = readPrinterPackage(bytes)
  const doc = parseSvg(strFromU8(files[manifest.sides.front.file]))
  assert.equal(doc.documentElement.getAttribute('width'), '612pt')
  assert.equal(doc.documentElement.getAttribute('height'), '1008pt')
  const fields = manifest.sides.front.fields
  assert.equal(fields.length, templateFields(tender, brand).length)
  const blanks = tender.elements.filter((item) => item.type === 'paragraph' && item.id && !item.locked && item.text === '')
  assert.equal(blanks.length, 8, 'all eight initially blank Tender table columns are real entry fields')
  for (const blank of blanks) {
    const field = fields.find((item) => item.sourceId === blank.id)
    assert.ok(field, blank.id)
    assert.ok(doc.getElementById(blank.id), 'an empty field still has an SVG replacement target')
    assert.ok(Math.abs(field.x - blank.x / tender.width * 100) < 0.00001)
    assert.ok(Math.abs(field.y - blank.y / tender.height * 100) < 0.00001)
    assert.equal(field.wrapWidth, toUnits(blank.width, tender.unit))
    assert.equal(field.lineHeight, toUnits(blank.leading, tender.unit))
    assert.equal(field.maxLines, blank.maxLines)
    assert.equal(manifest.sampleData[field.id], '')
  }
  const imported = importPrinterPackage({ ...brand, templates: [], sets: [] }, bytes, { id: 'tender-roundtrip' })
  const returned = imported.brand.templates.find((item) => item.id === 'tender-roundtrip-front')
  const field = fields.find((item) => item.sourceId === blanks[0].id)
  const drawn = parseSvg(renderTemplate({ brand: imported.brand, fonts, values: { [returned.printer.fieldKeys[field.id]]: 'One\nTwo' } }, returned).svg)
  assert.equal(nodes(drawn.getElementById(field.sourceId), 'tspan').map((span) => span.textContent).join('\n'), 'One\nTwo')
})

test('artwork-only Office renders discard flow guides before their fields are removed', async () => {
  const backgrounds = []
  const png = async (svg) => { backgrounds.push(svg); return pixel }
  const bytes = await docxFile({ ...ctx, showLayoutGuides: true }, { id: 'cover', pages: ['cover-report'] }, { png })
  assert.match(xmlOf(bytes), /Electric System/)
  assert.equal(backgrounds.length, 1)
  assert.doesNotMatch(backgrounds[0], /layout-guides|data-layout-guide/)

  // The cropped HTML-signature artwork has the same filtering contract.
  const signature = {
    id: 'guided-email', width: 400, height: 100, elements: [
      { type: 'rect', x: 0, y: 0, width: 40, height: 40, fill: 'ink' },
      { type: 'flow', x: 100, y: 30, items: [{ id: 'email-name', text: 'Example name', size: 14, font: 'body' }] }
    ],
    guides: { elements: [{ type: 'callout', target: { flow: 'email-name' }, label: '14 point name', side: 'right' }] }
  }
  const html = await signatureHtml({ ...ctx, brand: { ...brand, templates: [signature] }, showLayoutGuides: true }, { template: signature.id }, { png })
  assert.match(html.html, /Example name/)
  assert.doesNotMatch(backgrounds[1], /layout-guides|data-layout-guide/)
})

test('sequence Word export includes every page with separate positioned columns and final printing code', async () => {
  const backgrounds = []
  const bytes = await docxFile(ctx, { id: 'report', pageMode: 'sequence', pages: ['cover-report', 'publication-text', 'cover-back'] }, { png: async (svg) => { backgrounds.push(svg); return pixel } })
  const xml = xmlOf(bytes)
  assert.equal((xml.match(/<w:sectPr[ >]/g) ?? []).length, 3)
  assert.equal(backgrounds.length, 3)
  for (const svg of backgrounds) assert.doesNotMatch(svg, /layout-guides|data-layout-guide/)
  assert.match(xml, /Electric System/)
  assert.ok(xml.includes(template('cover-back').elements.find((item) => item.id === 'printing-code').text))
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  const columns = template('publication-text').elements.filter((item) => item.type === 'paragraph' && /column/.test(item.id ?? ''))
  assert.equal(columns.length, 2)
  for (const column of columns) {
    const paragraph = nodes(document, 'w:p').find((node) => node.textContent.includes(column.text.split(/\s+/).slice(0, 3).join(' ')))
    const frame = nodes(paragraph, 'w:framePr')[0]
    assert.ok(frame, column.id)
    assert.equal(Number(frame.getAttribute('w:x')), Math.round(column.x * 72 / 25.4 * 20))
    assert.equal(Number(frame.getAttribute('w:w')), Math.round(column.width * 72 / 25.4 * 20))
  }
})

test('legacy Word letters retain first/rest headers and their flowing native paragraphs', async () => {
  const bytes = await docxFile(ctx, { id: 'legacy-report', pages: ['cover-report', 'publication-text'], continue: true }, { png: async () => pixel })
  const xml = xmlOf(bytes)
  assert.equal((xml.match(/<w:sectPr[ >]/g) ?? []).length, 1)
  assert.match(xml, /<w:titlePg/)
  assert.match(xml, /w:type="first"/)
  assert.match(xml, /<w:pageBreakBefore/)
  assert.doesNotMatch(xml, /<w:framePr/)
})
