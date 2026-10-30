import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DOMParser } from '@xmldom/xmldom'
import { additionalForms, additionalFormSources } from '../scripts/brands/bc-hydro-forms.mjs'
import { renderTemplate, templateFields, toUnits, wrapLines } from '../src/engine/templates.js'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { lockup } from '../src/engine/artwork.js'

const folder = new URL('../brands/bc-hydro-1983/', import.meta.url)
const brand = JSON.parse(readFileSync(new URL('brand.json', folder)))
const fonts = await loadBrandFontsFromDisk(brand, folder.pathname)
const ctx = { brand, fonts }
const mm = (points) => points * 25.4 / 72

test('Hydro form formats distinguish documented legal size from measured odd-size scans', () => {
  const tender = additionalForms.find(form => form.id === 'form-tender')
  assert.deepEqual(tender.physical, ['612pt', '1008pt'])
  assert.equal(tender.dimensionStatus, 'source-specified')
  for (const id of ['form-employee-transfer', 'form-service-application']) {
    const form = additionalForms.find(form => form.id === id)
    assert.equal(form.dimensionStatus, 'scan-derived')
    assert.match(form.description, /not official|no total dimensions/i)
  }
  for (const form of additionalForms) {
    assert.ok(additionalFormSources[form.id].includes('H19'))
    assert.ok(!form.elements.some(e => e.type === 'rect' && e.stroke && e.x === 0 && e.y === 0 && e.width === form.width && e.height === form.height), `${form.id}: no printed outside border`)
  }
})

test('Hydro form headers fit, point sizes remain explicit, and Formal bottom baseline aligns', () => {
  for (const form of additionalForms) {
    const title = form.elements.find(e => e.id === 'form-name')
    const logo = form.elements.find(e => e.type === 'logo')
    const master = lockup(ctx, { signature: logo.signature, colourway: logo.colourway })
    const scale = mm(logo.points) * brand.fonts.body.capHeight / master.metrics.capHeight
    const logoLeft = logo.x - master.width * scale
    const titleRight = title.x + fonts.width(title.text, 'body', toUnits(title.size, 'mm'))
    assert.equal(title.size, '20pt')
    assert.ok(logoLeft - titleRight > mm(3), `${form.id}: clear space between title and signature`)
    if (logo.signature === 'formal') {
      assert.equal(logo.points, 14)
      // The fixed master exposes two line origins; test the actual lower one,
      // so aligning the first line by mistake cannot pass this check.
      const origins = [...master.art.matchAll(/data-text="[^"]+" transform="matrix\([^)]*? ([\d.]+)\)"/g)].map(match => Number(match[1]))
      assert.equal(origins.length, 2)
      const lowerBaseline = logo.y + (Math.max(...origins) - master.metrics.baseline) * scale
      assert.ok(Math.abs(lowerBaseline - title.y) < 0.002, 'Formal lower line aligned to 20pt form-name baseline')
    } else assert.equal(logo.points, 20)
  }
})

test('Hydro form entry fields edit independently and rendered default copy stays within the sheet', () => {
  const edits = { 'tenderer-name': 'Example supplier', 'transfer-new-salary': '500', 'service-customer-name': 'Example customer', 'service-install-yes': 'x', 'formal-form-reference': 'Reference 123' }
  for (const form of additionalForms) {
    const fields = templateFields(form, brand)
    assert.equal(new Set(fields.map(f => f.id)).size, fields.length)
    assert.ok(fields.length >= 6)
    const rendered = renderTemplate({ ...ctx, values: edits }, form)
    assert.doesNotMatch(rendered.svg, /(?:[=(\s])(?:NaN|Infinity)(?:["\s)]|$)|="undefined"/)
    const doc = new DOMParser().parseFromString(rendered.svg, 'image/svg+xml')
    const nodes = [...Array.from(doc.getElementsByTagName('*'))]
    const ids = nodes.map(node => node.getAttribute('id')).filter(Boolean)
    assert.equal(new Set(ids).size, ids.length, `${form.id}: unique SVG identifiers`)
    for (const [id, content] of Object.entries(edits)) if (fields.some(f => f.id === id)) {
      assert.equal(nodes.find(node => node.getAttribute('id') === id)?.textContent, content)
    }
    for (const element of form.elements.filter(e => ['text', 'paragraph'].includes(e.type) && e.text)) {
      const size = toUnits(element.size, 'mm')
      const key = element.font ?? 'body'
      const lines = element.type === 'paragraph' ? wrapLines(element.text, element.width, text => fonts.width(text, key, size)) : [element.text]
      const lastBaseline = element.y + (lines.length - 1) * (element.leading ?? 0)
      assert.ok(lastBaseline <= form.height, `${form.id}: text below page: ${element.id ?? element.text}`)
      for (const content of lines) assert.ok(element.x + fonts.width(content, key, size) <= form.width + 0.02, `${form.id}: text beyond right edge: ${content}`)
    }
  }
})
