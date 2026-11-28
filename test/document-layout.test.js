// The Word files brandkit writes, laid out by document-kit as the app's preview, its downloads and the
// command line lay them out: the pages, their paper, their text and what the layout could not draw.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { layoutDocx } from 'document-kit/layout'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { TABLE_STYLES, publicationModel } from '../src/engine/documentation.js'
import { publicationDocx, publicationPrintHtml } from '../src/export/publication.js'
import { createNodeRenderer, layoutPdf } from '../src/export/node.js'
import { nodeFontProvider } from '../src/export/layout-fonts-node.js'
import { brandFaces, layoutFaces } from '../src/export/brand-faces.js'
import { layoutDocument, layoutNotices } from '../src/export/layout.js'
import { documentSnapshot, documentSource } from '../src/export/document-source.js'
import { recipeDocx } from '../src/recipes/index.js'

const brand = JSON.parse(readFileSync(new URL('../brands/northwind/brand.json', import.meta.url), 'utf8'))
const fonts = await loadBrandFontsFromDisk(brand, fileURLToPath(new URL('../brands/northwind/', import.meta.url)))
const ctx = { brand, fonts }
const renderer = await createNodeRenderer()
const standIns = nodeFontProvider()
const PAPERS = { letter: [612, 792], a4: [595.28, 841.89] }
const baseFonts = (pdf) => [...Buffer.from(pdf).toString('latin1').matchAll(/\/BaseFont\s*\/(?:[A-Z]{6}\+)?([\w-]+)/g)].map((match) => match[1])

const photo = async () => `data:image/png;base64,${Buffer.from(await renderer.png('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#2d6a4f"/><circle cx="200" cy="150" r="90" fill="#f4f1de"/></svg>', 400)).toString('base64')}`

const publication = async (paper, style = 'grid') => {
  const model = publicationModel(brand, { paper, purpose: 'report', values: { title: 'Layout check' } })
  model.profile.tables = { style }
  // A real picture beside the example's placeholder, so both kinds of figure are laid out.
  model.pages.push({ id: 'photo', kind: 'content', title: 'A photograph', blocks: [
    { type: 'heading', text: 'A photograph' },
    { type: 'figure', src: await photo(), alt: 'A pale disc on green', caption: 'The figure keeps its proportions.', widthMm: 80 }
  ] })
  return model
}

test('a publication lays out a page a section, on its paper, with every heading and caption, in the brand’s own faces', async () => {
  for (const paper of ['letter', 'a4']) {
    const model = await publication(paper)
    const docx = await publicationDocx(ctx, model, renderer)
    const laid = await layoutDocx(docx, { fonts: standIns, namedFonts: brandFaces(ctx) })
    assert.equal(laid.pageCount, model.pages.length, `${paper}: one page a page of the publication`)
    for (const size of laid.pageSizes) assert.deepEqual([size.widthPt, size.heightPt].map(Math.round), PAPERS[paper].map(Math.round), paper)
    assert.deepEqual(layoutNotices(laid.losses), [], `${paper}: nothing substituted, degraded or dropped`)
    model.pages.forEach((page, index) => {
      for (const block of page.blocks.filter((item) => item.type === 'heading')) assert.ok(laid.pageText[index].includes(block.text.split('\n')[0]), `${paper}: “${block.text}” on page ${index + 1}`)
    })
    assert.match(laid.pageText.at(-1), /The figure keeps its proportions\./)
    assert.match(laid.toPages().pages.at(-1), /<image\b/, `${paper}: the photograph is drawn`)
    for (const [index, text] of laid.pageText.entries()) assert.match(text, new RegExp(`${index + 1}\\s*$`), `${paper}: page ${index + 1} is numbered in its footer`)
    const pdf = laid.toPdf().bytes
    const faces = baseFonts(pdf)
    assert.ok(faces.includes('Inter-Regular') && faces.includes('SpaceMono-Regular'), `${paper}: the brand’s faces are in the PDF (${faces})`)
    assert.ok(!faces.some((face) => /^(Arimo|Tinos|Carlito)/.test(face)), `${paper}: no stand-in replaces a brand face`)
  }
})

test('every table design lays out with its text, in Word’s pages and the print view of the same document', async () => {
  for (const style of TABLE_STYLES) {
    const model = await publication('letter', style)
    const table = model.pages.flatMap((page) => page.blocks).find((block) => block.type === 'table')
    const pdf = await layoutPdf(await publicationDocx(ctx, model, renderer), { ctx })
    assert.equal(pdf.pageCount, model.pages.length, style)
    assert.deepEqual(pdf.notices, [], style)
    const text = pdf.pageText.join('\n')
    for (const cell of [...table.headers, ...table.rows.flat()]) for (const word of String(cell).split(/\s+/).filter((item) => item.length > 3)) {
      assert.ok(text.toLowerCase().includes(word.toLowerCase()), `${style}: “${word}” is laid out`)
    }
    const html = await publicationPrintHtml(ctx, model, renderer)
    for (const cell of table.headers) assert.ok(html.includes(`>${cell}</span>`), `${style}: ${cell} in the print view`)
  }
})

test('a recipe job lays out on its section’s paper in the brand’s faces', async () => {
  const sample = JSON.parse(readFileSync(new URL('../examples/recipes/brief.json', import.meta.url), 'utf8'))
  const job = structuredClone(sample)
  job.recipe.sections[0].parts = [
    { id: 'hours', use: 'data-table', with: { columns: ['Role', 'Hours'], rows: [['Design', '12'], ['Build', '30']] } }
  ]
  job.images = {}
  delete job.data.chart
  const docx = await recipeDocx(ctx, job, renderer)
  const pdf = await layoutPdf(docx, { ctx })
  assert.ok(pdf.pageCount >= 1)
  assert.deepEqual(pdf.pageSizes[0], { widthPt: 612, heightPt: 792 })
  assert.match(pdf.pageText.join('\n'), /Design[\s\S]*12[\s\S]*Build[\s\S]*30/)
  assert.deepEqual(pdf.notices, [])
  assert.ok(baseFonts(pdf.bytes).includes('Inter-Regular'), 'set in the brand’s body face')
})

test('a face whose licence forbids embedding is drawn with a stand-in, and the PDF says so', async () => {
  const restricted = Buffer.from(fonts.faces.body.bytes)
  for (let offset = 12; offset < 12 + restricted.readUInt16BE(4) * 16; offset += 16) {
    if (restricted.subarray(offset, offset + 4).toString() === 'OS/2') restricted.writeUInt16BE(2, restricted.readUInt32BE(offset + 8) + 8)
  }
  const faces = brandFaces(ctx).map((face) => (face.key === 'body' ? { ...face, bytes: new Uint8Array(restricted) } : face))
  assert.deepEqual(layoutFaces(faces).faces.map((face) => face.family), brandFaces(ctx).filter((face) => face.key !== 'body').map((face) => face.family))
  const model = publicationModel(brand, { paper: 'letter', purpose: 'brief', values: { title: 'Licence' } })
  const pdf = await layoutDocument(await publicationDocx({ brand, fonts: { ...fonts, faces: { ...fonts.faces, body: { ...fonts.faces.body, bytes: new Uint8Array(restricted) } } } }, model, renderer), standIns, { namedFonts: faces })
  assert.match(pdf.notices.join('\n'), /Inter forbids embedding/)
  assert.ok(!baseFonts(pdf.bytes).includes('Inter-Regular'), 'the restricted face is not in the PDF')
})

test('the preview and the downloads share one Word file and one PDF a snapshot', async () => {
  let words = 0
  let layouts = 0
  const model = publicationModel(brand, { paper: 'letter', purpose: 'brief', values: { title: 'Shared' } })
  const { wordFor, pdfFor } = documentSource(async (docx, options) => { layouts++; return layoutPdf(docx, { faces: options.namedFonts }) })
  const snapshot = documentSnapshot({ word: () => { words++; return publicationDocx(ctx, model, renderer) }, title: model.title, faces: brandFaces(ctx), name: model.id })
  const [preview, download] = await Promise.all([pdfFor(snapshot), pdfFor(snapshot)])
  assert.equal(preview, download, 'the preview and the download are the same PDF')
  assert.equal(await pdfFor(snapshot), preview)
  const word = await wordFor(snapshot)
  assert.equal(word, await wordFor(snapshot))
  assert.deepEqual([words, layouts], [1, 1], 'written once, laid out once')
  // The PDF is that Word file laid out: laying the downloaded Word file out again gives the same pages.
  const again = await layoutPdf(word, { faces: brandFaces(ctx) })
  assert.deepEqual(again.pageText, preview.pageText)
  // A changed document is a new snapshot, with files of its own.
  const changed = documentSnapshot({ ...snapshot, word: () => { words++; return publicationDocx(ctx, { ...model, title: 'Changed' }, renderer) } })
  assert.notEqual(await pdfFor(changed), preview)
  assert.deepEqual([words, layouts], [2, 2])
  // A build that fails can be asked for again.
  let fail = true
  const flaky = documentSnapshot({ word: () => { if (fail) { fail = false; throw new Error('not yet') } return publicationDocx(ctx, model, renderer) }, faces: [] })
  await assert.rejects(pdfFor(flaky), /not yet/)
  assert.ok((await pdfFor(flaky)).bytes.length > 1000)
})
