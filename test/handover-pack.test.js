import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { createNodeRenderer } from '../src/export/node.js'
import { assertHandover } from '../src/handover/record.js'
import { composePack, packHtml, packOptions, preparePack, sha256 } from '../src/handover/pack.js'

const base = JSON.parse(readFileSync(new URL('../brands/northwind/brand.json', import.meta.url), 'utf8'))
const fonts = await loadBrandFontsFromDisk(base, fileURLToPath(new URL('../brands/northwind/', import.meta.url)))
const record = JSON.parse(readFileSync(new URL('../examples/managed-site/ddc-north.json', import.meta.url), 'utf8'))
const provider = { brand: { ...structuredClone(base), id: record.provider.brandId, name: 'Provider' }, fonts }
const client = { brand: { ...structuredClone(base), id: record.client.brandId, name: 'Client' }, fonts }
const { png } = await createNodeRenderer()
const decode = (bytes) => new TextDecoder().decode(bytes)

test('choices come from the caller, then the record’s pack, then the defaults', () => {
  const all = packOptions(record)
  assert.deepEqual(all.documents, ['quickStart', 'welcome', 'brandGuide'], 'no cover, so no standalone cover document')
  assert.equal(all.coverVariant, null)
  assert.equal(all.tableStyle, undefined)
  const chosen = { ...record, cover: { variant: 'grid' }, pack: { documents: ['welcome', 'frontCover'], sections: ['support'], tableStyle: 'ruled', paper: 'a4' } }
  assertHandover(chosen)
  const fromRecord = packOptions(chosen)
  assert.deepEqual([fromRecord.documents, fromRecord.coverVariant, fromRecord.sections, fromRecord.tableStyle, fromRecord.paper], [['welcome', 'frontCover'], 'grid', ['support'], 'ruled', 'a4'])
  const overridden = packOptions(chosen, { coverVariant: 'index', paper: 'letter', tableStyle: 'panel' })
  assert.deepEqual([overridden.coverVariant, overridden.paper, overridden.tableStyle], ['index', 'letter', 'panel'])
  assert.equal(packOptions({ ...chosen, pack: { cover: 'off' } }).coverVariant, null, 'the pack can turn the record’s cover off')
  assert.equal(packOptions({ ...record, pack: { cover: 'on' } }).coverVariant, 'hero', 'on, with no design named, is the recommended one')
  assert.throws(() => packOptions(record, { documents: [] }), /at least one document/)
  assert.throws(() => packOptions(record, { sections: ['welcome'] }), /sections must list only/)
  assert.throws(() => assertHandover({ ...record, pack: { tableStyle: 'zebra' } }), /pack\.tableStyle must be one of/)
})

test('a pack holds only the chosen documents and sections, numbered in order', async () => {
  const prepared = await preparePack({ record, provider, client, png, dpi: 72, options: { cover: true, documents: ['welcome', 'brandGuide'], sections: ['services', 'support'], brandSections: ['files'] } })
  assert.deepEqual(Object.keys(prepared.publications), ['welcome', 'brandGuide'])
  const headings = (publication) => publication.pages.flatMap((page) => page.blocks.filter((block) => block.type === 'heading' && /^\d\d \//.test(block.text)).map((block) => block.text.slice(0, 5)))
  assert.deepEqual([...new Set(headings(prepared.publications.welcome))], ['01 / ', '02 / '])
  assert.ok(prepared.publications.welcome.pages[0].cover, 'the guide opens with its cover')
  assert.deepEqual(prepared.publications.brandGuide.pages.map((page) => page.id), ['brand-cover', 'brand-files'])
  const html = packHtml(prepared, { provider, client })
  assert.match(html.welcome, /01 \/ Services/)
  assert.doesNotMatch(html.welcome, /Getting started/)
})

test('the composed pack lists every file with its hash, in the browser’s shape', async () => {
  const { files, manifest } = await composePack({ record, provider, client, png, dpi: 72, options: { coverVariant: 'blocks', documents: ['quickStart', 'frontCover'], tableStyle: 'ledger' } })
  const paths = files.map(([path]) => path)
  for (const path of ['quick-start.docx', 'quick-start.html', 'front-cover.docx', 'index.html', 'READ-ME.txt', 'manifest.json', 'sources/handover.json', 'assets/cover-artwork.svg']) assert.ok(paths.includes(path), path)
  assert.ok(!paths.some((path) => path.startsWith('welcome-guide') || path.startsWith('brand-reference')), 'documents left out are not in the pack')
  assert.deepEqual([manifest.documents, manifest.coverVariant, manifest.tableStyle], [['quickStart', 'frontCover'], 'blocks', 'ledger'])
  const listed = new Map(manifest.files.map((file) => [file.path, file.sha256]))
  for (const [path, bytes] of files) if (path !== 'manifest.json') assert.equal(listed.get(path), await sha256(bytes), path)
  const index = decode(files.find(([path]) => path === 'index.html')[1])
  assert.match(index, /href="quick-start\.html"/)
  assert.doesNotMatch(index, /welcome-guide\.html|brand-reference\.html/)
})
