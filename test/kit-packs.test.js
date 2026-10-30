import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { planKit } from '../src/engine/kit.js'
import { inPack, KIT_PACKS, packId } from '../src/engine/packs.js'

const load = (id) => JSON.parse(readFileSync(new URL(`../brands/${id}/brand.json`, import.meta.url), 'utf8'))
const plan = (brand, pack, extra = {}) => planKit(brand, { ...KIT_PACKS.find((item) => item.id === pack).options, pack, ...extra })

test('the logos pack is the logo in its approved colours at one PNG size, the colour files and the index', () => {
  const brand = load('ddcnorth')
  const paths = plan(brand, 'logos', { department: '' }).map((entry) => entry.path)
  assert.ok(paths.includes('logos/outlined/ddcnorth-horizontal-black.svg'))
  assert.ok(paths.includes('logos/png/ddcnorth-horizontal-black-2048.png'))
  assert.ok(paths.includes('logos/pdf/ddcnorth-horizontal-black.pdf'))
  assert.ok(paths.includes('logos/png/ddcnorth-stacked-black-2048.png'), 'stacked logos come at 2048 too')
  for (const path of ['guidelines/COLOURS.json', 'guidelines/ddcnorth-palette.gpl', 'index.html']) assert.ok(paths.includes(path), path)
  assert.ok(!paths.some((path) => /-1024\.png$/.test(path) && path.startsWith('logos/')), 'one PNG size')
  assert.ok(!paths.some((path) => /currentcolor|symbol-master|^fonts\/|^documents\/|^templates\//.test(path)))
  assert.ok(paths.length < 100, `${paths.length} files`)
})

test('a department adds its own logo in the pack’s formats; all departments add the folder as SVG', () => {
  const brand = load('unbc')
  const folder = 'logos/sub-logos/school-of-nursing'
  const none = plan(brand, 'logos', { department: '' })
  assert.ok(!none.some((entry) => entry.path.startsWith('logos/sub-logos/')))
  const own = plan(brand, 'logos', { department: 'school-of-nursing' }).map((entry) => entry.path)
  for (const path of [`${folder}/sub-logo-green.svg`, `${folder}/png/sub-logo-green-2048.png`, `${folder}/pdf/sub-logo-green.pdf`]) assert.ok(own.includes(path), path)
  assert.ok(own.length >= 20 && own.length <= 45, `${own.length} files`)
  assert.ok(!own.some((path) => path.startsWith('logos/outlined/sub-logo-')), 'no placeholder or duplicate sub-logo beside the department folder')
  assert.equal(own.filter((path) => path.startsWith('logos/sub-logos/')).length, 9)
  const all = plan(brand, 'logos', { department: ['school-of-nursing', '*'] }).filter((entry) => entry.unit)
  assert.equal(all.filter((entry) => entry.kind === 'text').length, brand.departments.items.length * 3)
  assert.equal(all.filter((entry) => entry.kind !== 'text').length, 6, 'only the chosen unit is rasterised')
  // The Word pack has a renderer for its documents, so the unit's PNG comes with it.
  const documents = plan(brand, 'documents', { department: 'school-of-nursing' }).map((entry) => entry.path)
  assert.ok(documents.includes(`${folder}/png/sub-logo-green-2048.png`))
  assert.ok(!documents.some((path) => /\/pdf\//.test(path) && path.startsWith(folder)))
  assert.equal(plan(brand, 'complete', { department: '' }).filter((entry) => entry.unit).length, brand.departments.items.length * 3, 'everything keeps every department')
})

test('documents and slides is one pack, and the old presentations id still resolves to it', () => {
  assert.equal(packId('presentations'), 'documents')
  assert.throws(() => packId('nonsense'), /Unknown export pack/)
  const brand = load('bc-province-1977')
  const entries = plan(brand, 'documents', { department: '' })
  assert.ok(entries.some((entry) => entry.path.endsWith('.docx')) && entries.some((entry) => entry.path.endsWith('.pptx')))
  assert.equal(entries.filter((entry) => entry.kind === 'png' && entry.path.startsWith('logos/')).length, 1, 'one PNG logo')
  assert.ok(entries.length < 100, `${entries.length} files`)
  assert.deepEqual(planKit(brand, { pack: 'presentations', department: '' }).map((entry) => entry.path), planKit(brand, { pack: 'documents', department: '' }).map((entry) => entry.path))
  assert.ok(inPack({ path: 'index.html', kind: 'index' }, 'presentations'))
})
