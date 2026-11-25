import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as fflate from 'fflate'
import { unzipSync, strFromU8 } from 'fflate'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { createNodeRenderer } from '../src/export/node.js'
import { recipeDocx, XLSX_TYPE } from '../src/recipes/index.js'

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

test('a recipe can show screenshots on brandkit devices, with screens taken from the job images', async () => {
  const screen = Buffer.from(await renderer.png('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="10"><rect width="16" height="10" fill="#ff0000"/></svg>', 16)).toString('base64')
  const job = structuredClone(sample)
  job.images = {
    desktop: { type: 'image/png', base64: screen },
    phone: { type: 'image/png', base64: screen },
    scene: { renderer: 'devices', source: { preset: 'laptop-phone', slots: [{ device: 'laptop-14', screen: { $image: 'desktop' } }, { device: 'phone-island', screen: { $image: 'phone' } }] } }
  }
  job.data = { scene: { $image: 'scene' } }
  job.recipe.sections[0].parts = [{ id: 'scene', use: 'figure', with: { image: '{{ scene }}', width: 90, height: 45 } }]
  const bytes = await recipeDocx(ctx, job, renderer)
  const parts = unzipSync(bytes)
  assert.equal((strFromU8(parts['word/document.xml']).match(/<w:drawing>/g) ?? []).length, 1)
  assert.deepEqual(job.images.scene.source.slots[0].screen, { $image: 'desktop' })
})

test('device figures reject unknown screens and frames that need a browser', async () => {
  const { devicesAdapter, bindDeviceScreens } = await import('../src/recipes/devices.js')
  const adapter = devicesAdapter()
  assert.match(adapter.render({ preset: 'single' }).svg, /^<svg /)
  assert.throws(() => adapter.render({ slots: [{ device: 'not-a-device' }] }), /not one of brandkit's drawn devices/)
  assert.throws(() => adapter.render({ slots: [{ device: 'laptop-14', screen: 'https://example.com/a.png' }] }), /PNG or JPEG/)
  assert.throws(() => bindDeviceScreens({ slots: [{ screen: { $image: 'missing' } }] }, {}), /Unknown device screen image: missing/)
})

// A made-up two-sheet workbook as openpyxl writes one: formulas with no cached values, a grey header row, a merged band.
function budgetXlsx() {
  const { zipSync, strToU8 } = fflate
  const ns = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  const t = (ref, text, s = 0) => `<c r="${ref}" s="${s}" t="inlineStr"><is><t>${text}</t></is></c>`
  const n = (ref, value, s = 0) => `<c r="${ref}" s="${s}"><v>${value}</v></c>`
  const f = (ref, formula, s = 0) => `<c r="${ref}" s="${s}"><f>${formula}</f><v></v></c>`
  const sheet = (rows, extra = '') => `<worksheet ${ns}><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="30" customWidth="1"/><col min="2" max="3" width="14" customWidth="1"/></cols><sheetData>${rows.map((cells, i) => `<row r="${i + 1}">${cells.join('')}</row>`).join('')}</sheetData>${extra}</worksheet>`
  return zipSync({
    '[Content_Types].xml': strToU8(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>`),
    '_rels/.rels': strToU8(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': strToU8(`<workbook ${ns} xmlns:r="${rel}"><sheets><sheet name="Budget" sheetId="1" r:id="r1"/><sheet name="Breakdown" sheetId="2" r:id="r2"/></sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="r2" Type="${rel}/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="r3" Type="${rel}/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml': strToU8(`<styleSheet ${ns}><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7E6E6"/></patternFill></fill></fills><borders count="1"><border/></borders><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="0" applyNumberFormat="1" applyFont="1"/></cellXfs></styleSheet>`),
    'xl/worksheets/sheet1.xml': strToU8(sheet([
      [t('A1', 'TASK', 1), t('B1', 'HOURS', 1), t('C1', 'TOTAL', 1)],
      [t('A2', 'Planning'), n('B2', 40), f('C2', 'B2*90', 2)],
      [t('A3', 'Delivery'), n('B3', 60), f('C3', 'B3*90', 2)],
      [t('A4', 'TOTAL INCLUDING GST', 1), f('C4', 'SUM(C2:C3)*1.05', 2)]
    ], '<mergeCells count="1"><mergeCell ref="A4:B4"/></mergeCells>')),
    'xl/worksheets/sheet2.xml': strToU8(sheet([[t('A1', 'SHARE', 1)], [f('A2', 'Budget!C2/SUM(Budget!C2:C3)')]]))
  })
}

function sheetJob(spreadsheets, data) {
  const job = structuredClone(sample)
  job.images = {}
  job.spreadsheets = spreadsheets
  job.data = data
  job.recipe.sections = [{ id: 'budget', page: { paper: 'tabloid', orientation: 'landscape' }, parts: [
    { id: 'budget', use: 'spreadsheet', with: { workbook: '{{ budget }}', sheet: 'Budget' } },
    { id: 'share', use: 'spreadsheet', with: { workbook: '{{ budget }}', sheet: 'Breakdown' } }
  ] }]
  return job
}

test('a recipe prints workbook sheets named in the job, with their own look, on landscape 11 x 17 pages', async () => {
  const base64 = Buffer.from(budgetXlsx()).toString('base64')
  const job = sheetJob({ budget: { type: XLSX_TYPE, base64 } }, { budget: { $spreadsheet: 'budget' } })
  const xml = strFromU8(unzipSync(await recipeDocx(ctx, job, renderer))['word/document.xml'])
  assert.match(xml, /<w:pgSz w:w="24480" w:h="15840" w:orient="landscape"\/>/)
  assert.equal((xml.match(/<w:tbl>/g) ?? []).length, 2)
  // Formulas openpyxl left without values are evaluated: 40 x 90, and (3,600 + 5,400) x 1.05.
  assert.match(xml, /\$3,600\.00/)
  assert.match(xml, /\$9,450\.00/)
  assert.match(xml, />40\.0%<|>0\.4</)
  // The sheet keeps its grey header row, which repeats on each page; the brand's table look is not laid over it.
  const header = xml.slice(xml.indexOf('<w:tr>'), xml.indexOf('</w:tr>'))
  assert.match(header, /<w:tblHeader\/>/)
  assert.match(header, /w:fill="E7E6E6"/)
  assert.match(xml, /<w:gridSpan w:val="2"\/>/)
  assert.deepEqual(job.data, { budget: { $spreadsheet: 'budget' } })
})

test('recipe jobs name a missing spreadsheet, and only the command line reads a workbook by its path', async () => {
  await assert.rejects(recipeDocx(ctx, sheetJob({}, { budget: { $spreadsheet: 'budget' } }), renderer), /Unknown recipe spreadsheet: budget/)
  await assert.rejects(recipeDocx(ctx, sheetJob({ budget: { path: 'budget.xlsx' } }, { budget: { $spreadsheet: 'budget' } }), renderer), /only the command line reads files/)
  await assert.rejects(recipeDocx(ctx, sheetJob({ budget: { type: 'text/csv', base64: 'YQ==' } }, { budget: { $spreadsheet: 'budget' } }), renderer), /Expected an \.xlsx workbook/)
})

test('exportRecipe reads a workbook path relative to the job file', async () => {
  const { readJobFiles } = await import('../src/recipes/node.js')
  const folder = await mkdtemp(join(tmpdir(), 'brandkit-sheet-'))
  try {
    await mkdir(join(folder, 'pricing'))
    await writeFile(join(folder, 'pricing', 'budget.xlsx'), budgetXlsx())
    const job = sheetJob({ budget: { path: 'pricing/budget.xlsx' } }, { budget: { $spreadsheet: 'budget' } })
    const read = await readJobFiles(job, folder)
    assert.ok(read.spreadsheets.budget.bytes instanceof Uint8Array)
    assert.deepEqual(job.spreadsheets, { budget: { path: 'pricing/budget.xlsx' } })
    const xml = strFromU8(unzipSync(await recipeDocx(ctx, read, renderer))['word/document.xml'])
    assert.match(xml, /\$9,450\.00/)
  } finally {
    await rm(folder, { recursive: true, force: true })
  }
})
