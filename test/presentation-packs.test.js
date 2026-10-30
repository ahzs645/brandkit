import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { planKit } from '../src/engine/kit.js'
import { KIT_PACKS } from '../src/engine/packs.js'

const ids = ['ddcnorth', 'firstform', 'overtheedge', 'sparklab', 'northwind', 'bc-province-1977', 'bc-hydro-1983']
const brands = ids.map((id) => JSON.parse(readFileSync(new URL(`../brands/${id}/brand.json`, import.meta.url), 'utf8')))
// Presentations share the documents pack; 'presentations' remains an alias for the CLI.
const preset = KIT_PACKS.find((pack) => pack.id === 'documents')

test('presentation packs carry the artwork for every actual PowerPoint layout, including historical and explore layouts', () => {
  for (const brand of brands) {
    const entries = planKit(brand, { ...preset.options, pack: preset.id })
    const paths = new Set(entries.map((entry) => entry.path))
    for (const document of brand.documents.filter((item) => item.format === 'pptx')) {
      assert.ok(paths.has(`documents/${brand.id}-${document.id}.pptx`), `${brand.id}/${document.id}: native presentation`)
      for (const layout of document.layouts) assert.ok(paths.has(`templates/${layout}.svg`), `${brand.id}/${layout}: editable slide artwork`)
    }
    assert.ok(!entries.some((entry) => /templates\/(?:png\/|pdf\/)?[^/]*letterhead/.test(entry.path)), `${brand.id}: unrelated stationery stays outside this pack`)
  }
})

test('referenced presentation artwork retains requested PNG and PDF variants without bulk unrelated templates', () => {
  const brand = brands.find((item) => item.id === 'bc-hydro-1983')
  const entries = planKit(brand, { ...preset.options, pack: preset.id, rasters: true, pdfs: true })
  const paths = new Set(entries.map((entry) => entry.path))
  for (const id of ['av-title', 'explore-reservoir-presentation']) {
    assert.ok(paths.has(`templates/${id}.svg`))
    assert.ok(paths.has(`templates/png/${id}.png`))
    assert.ok(paths.has(`templates/pdf/${id}.pdf`))
  }
  assert.ok(!paths.has('templates/letterhead-standard.svg'))
  assert.ok(!paths.has('templates/png/letterhead-standard.png'))
  assert.ok(!paths.has('templates/pdf/letterhead-standard.pdf'))
})
