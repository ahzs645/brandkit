import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'
import { DOMParser } from '@xmldom/xmldom'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { TABLE_STYLES, documentProfile, publicationModel, validatePublication } from '../src/engine/documentation.js'
import { publicationDocx, publicationHtml } from '../src/export/publication.js'
import { tableLook } from '../src/export/table-styles.js'
import { handoverPublications } from '../src/handover/publications.js'
import { createNodeRenderer } from '../src/export/node.js'

const renderer = await createNodeRenderer()

const brand = JSON.parse(readFileSync(new URL('../brands/northwind/brand.json', import.meta.url), 'utf8'))
const fonts = await loadBrandFontsFromDisk(brand, fileURLToPath(new URL('../brands/northwind/', import.meta.url)))
const ctx = { brand, fonts }
const WORD = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const parse = value => new DOMParser().parseFromString(Buffer.from(value).toString('utf8'), 'application/xml')
const elements = (node, name) => Array.from(node.getElementsByTagNameNS(WORD, name))
const attr = (node, name) => node?.getAttributeNS(WORD, name)

function model(style) {
  const result = publicationModel(brand, { paper: 'letter', purpose: 'report', values: { title: 'Tables' } })
  if (style) result.profile.tables = { style }
  result.pages = [{ id: 'tables', kind: 'content', title: 'Tables', blocks: [
    { type: 'table', headers: ['Name', 'Value', 'Note'], rows: [['Website', 'https://example.org', 'One'], ['Contact', 'someone@example.org', 'Two'], ['Renewal', 'To confirm', 'Three']], widths: [0.7, 1.4, 2] }
  ] }]
  return result
}
const cellsOf = async (style) => {
  const document = parse(unzipSync(await publicationDocx(ctx, model(style), renderer))['word/document.xml'])
  const table = elements(document, 'tbl')[0]
  return { table, rows: elements(table, 'tr').map(row => elements(row, 'tc')) }
}
const border = (cell, side) => {
  const node = elements(elements(cell, 'tcBorders')[0], side)[0]
  return { val: attr(node, 'val'), size: Number(attr(node, 'sz') ?? 0), colour: attr(node, 'color') }
}

test('a brand chooses its table style once; grid stays the default and an unknown style is refused', () => {
  assert.equal(documentProfile(brand).tables.style, 'grid')
  for (const style of TABLE_STYLES) assert.equal(documentProfile({ ...brand, documentation: { tables: { style } } }).tables.style, style)
  assert.throws(() => documentProfile({ ...brand, documentation: { tables: { style: 'zebra' } } }), /Unknown table style: zebra/)
  const bad = model('zebra')
  assert.match(validatePublication(bad).join('\n'), /table style must be one of/)
})

test('every style fills the table width exactly, in Word and in HTML', async () => {
  for (const style of TABLE_STYLES) {
    const { table } = await cellsOf(style)
    const grid = elements(table, 'gridCol').reduce((sum, col) => sum + Number(attr(col, 'w')), 0)
    assert.equal(grid, Number(attr(elements(table, 'tblW')[0], 'w')), `${style}: the columns add up to the table`)
    const html = publicationHtml(ctx, model(style))
    assert.match(html, new RegExp(`<table class="s-TableText t-${style}">`))
    assert.match(html, new RegExp(`table\\.t-${style}\\{`))
  }
})

test('ruled has no boxes or fills: a heavy rule under the header, a light one under each row, flush columns', async () => {
  const { rows } = await cellsOf('ruled')
  const profile = documentProfile(brand)
  for (const row of rows) for (const cell of row) {
    for (const side of ['left', 'right', 'top']) assert.equal(border(cell, side).val, 'none')
    assert.equal(elements(cell, 'shd').length, 0, 'no fill')
  }
  assert.equal(border(rows[0][0], 'bottom').size, 8, '1 pt under the header')
  assert.equal(border(rows[0][0], 'bottom').colour, profile.colours.ink.slice(1))
  assert.equal(border(rows[1][0], 'bottom').size, 4, '0.5 pt between rows')
  assert.equal(attr(elements(elements(rows[1][0], 'tcMar')[0], 'left')[0], 'w'), '0', 'the first column starts on the text edge')
  const header = elements(rows[0][1], 'rPr')[0]
  assert.ok(elements(header, 'caps').length, 'header labels in capitals')
})

test('ledger frames the table and sets its first column as labels; panel and accent fill what they should', async () => {
  const ledger = await cellsOf('ledger')
  assert.equal(border(ledger.rows[0][0], 'top').size, 12, '1.5 pt above')
  assert.equal(border(ledger.rows.at(-1)[0], 'bottom').size, 12, '1.5 pt below')
  assert.ok(elements(elements(ledger.rows[2][0], 'rPr')[0], 'caps').length, 'first column as labels')

  const profile = documentProfile(brand)
  const panel = await cellsOf('panel')
  const ground = tableLook({ ...profile, tables: { style: 'panel' } }, brand).ground.slice(1)
  for (const row of panel.rows) for (const cell of row) assert.equal(attr(elements(cell, 'shd')[0], 'fill'), ground)
  assert.equal(border(panel.rows[1][0], 'bottom').colour, profile.colours.paper.slice(1), 'rows parted by paper')
  assert.match(publicationHtml(ctx, model('panel')), /table\.t-panel\{[^}]*border-radius:3mm/)

  const accent = await cellsOf('accent')
  assert.equal(attr(elements(accent.rows[0][0], 'shd')[0], 'fill'), profile.colours.accent.slice(1))
  assert.equal(elements(accent.rows[1][0], 'shd').length, 0)
})

test('a handover build can try a table style on every publication, and refuses an unknown one', () => {
  const record = JSON.parse(readFileSync(new URL('../examples/managed-site/ddc-north.json', import.meta.url), 'utf8'))
  const options = { providerBrand: { ...brand, id: record.provider.brandId }, clientBrand: { ...brand, id: record.client.brandId } }
  const built = handoverPublications(record, { ...options, tableStyle: 'ledger' })
  for (const publication of Object.values(built)) assert.equal(publication.profile.tables.style, 'ledger')
  assert.throws(() => handoverPublications(record, { ...options, tableStyle: 'zebra' }), /Unknown table style/)
})
