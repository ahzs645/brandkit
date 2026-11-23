import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { unzipSync, strFromU8 } from 'fflate'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { createNodeRenderer } from '../src/export/node.js'
import { recipeDocx } from '../src/recipes/index.js'

const dir = fileURLToPath(new URL('../brands/northwind/', import.meta.url))
const brand = JSON.parse(await readFile(new URL('../brands/northwind/brand.json', import.meta.url)))
const ctx = { brand, fonts: await loadBrandFontsFromDisk(brand, dir) }
const renderer = await createNodeRenderer()
const sample = JSON.parse(await readFile(new URL('../examples/recipes/brief.json', import.meta.url)))

test('recipe jobs bind brand and figures without altering caller data', async () => {
  const source = structuredClone(sample)
  const bytes = await recipeDocx(ctx, source, { ...renderer, mermaid: async (graph, profile) => {
    assert.match(graph, /Project manager/)
    assert.equal(profile.id, brand.id)
    return renderer.png(profile.logos.primary.svg, 100)
  } })
  const parts = unzipSync(bytes)
  assert.match(strFromU8(parts['word/document.xml']), /coordinates delivery and review/)
  assert.ok(Object.keys(parts).some(name => name.startsWith('word/media/') && name.endsWith('.png')))
  assert.deepEqual(source, sample)
})

test('recipe jobs name missing image bindings before producing a document', async () => {
  await assert.rejects(recipeDocx(ctx, { ...sample, images: {} }, renderer), /Unknown recipe image: coordination/)
})

test('recipe tables use the ruled publication profile for headings, row rules and edge padding', async () => {
  const printBrand = { ...brand, documentation: { ...brand.documentation, tables: { style: 'ruled' } } }
  const job = structuredClone(sample)
  job.recipe.sections[0].parts = [{ id: 'hours', use: 'data-table', with: { columns: ['Role', 'Hours'], rows: [['Design', '12']] } }]
  job.images = {}
  delete job.data.chart
  const bytes = await recipeDocx({ ...ctx, brand: printBrand }, job, renderer)
  const xml = strFromU8(unzipSync(bytes)['word/document.xml'])
  const cells = xml.match(/<w:tc>.*?<\/w:tc>/gs)
  assert.equal(cells.length, 4)
  assert.doesNotMatch(xml, /<w:shd /)
  assert.match(cells[0], /<w:caps\b/)
  assert.match(cells[0], /<w:bottom [^>]*w:sz="8"/)
  assert.match(cells[2], /<w:bottom [^>]*w:sz="4"/)
  assert.match(cells[2], /<w:left [^>]*w:w="0"/)
  assert.match(cells[2], /<w:left [^>]*w:val="none"/)
})

test('a portable recipe can mix D3, Mermaid and an application adapter', async () => {
  const job = structuredClone(sample)
  job.images = {
    staff: { renderer: 'd3', source: { type: 'bars', title: 'Capacity', data: { values: [{ label: 'Review', value: 2 }] } } },
    route: { renderer: 'mermaid', source: 'flowchart LR\nA-->B' },
    custom: { renderer: 'stamp', source: { width: 22 } }
  }
  job.data = Object.fromEntries(Object.keys(job.images).map(key => [key, { $image: key }]))
  job.recipe.sections[0].parts = Object.keys(job.images).map(id => ({
    id, use:'figure', with: {image:'{{ '+id+' }}', width:90,height:45}
  }))
  const calls = []
  const bytes = await recipeDocx(ctx, job, {
    ...renderer,
    mermaid: async source => { calls.push(source); return renderer.png('<svg xmlns="http://www.w3.org/2000/svg" width="5" height="2"><rect width="5" height="2"/></svg>', 40) },
    diagrams: [{ id:'stamp', render(source) { calls.push(source.width); return { svg:'<svg xmlns="http://www.w3.org/2000/svg" width="22" height="12"><circle cx="6" cy="6" r="5"/></svg>' } } }]
  })
  assert.deepEqual(calls, ['flowchart LR\nA-->B', 22])
  const parts = unzipSync(bytes)
  assert.equal((strFromU8(parts['word/document.xml']).match(/<w:drawing>/g) ?? []).length, 3)
  assert.equal(Object.keys(parts).filter(name=>name.startsWith('word/media/') && name.endsWith('.png')).length,3)
})
