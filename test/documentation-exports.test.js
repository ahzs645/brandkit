import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, writeFile, rm, copyFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { planKit, buildKit } from '../src/engine/kit.js'
import { KIT_PACKS } from '../src/engine/packs.js'
import { consumerProfile } from '../src/engine/consumer.js'
import { DOCUMENTATION_VERSION, documentProfile, publicationModel } from '../src/engine/documentation.js'
import { tokens } from '../src/engine/web.js'
import { loadBrandFontsFromDisk, readAssetFromDisk } from '../src/fonts/node.js'
import { createNodeRenderer } from '../src/export/node.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const registry = JSON.parse(await readFile(join(root, 'brands/index.json'), 'utf8'))
const load = async (id) => {
  const folder = join(root, 'brands', id)
  const brand = JSON.parse(await readFile(join(folder, 'brand.json'), 'utf8'))
  const fonts = await loadBrandFontsFromDisk(brand, folder)
  assert.deepEqual(fonts.failures, [])
  return { brand, fonts, folder }
}
const decode = (bytes) => new TextDecoder().decode(bytes)
const exec = promisify(execFile)

test('all registered brands expose the same document choices without changing their identities', async () => {
  assert.ok(registry.length > 0)
  for (const { id } of registry) {
    const { brand } = await load(id)
    const before = JSON.stringify(brand)
    const plan = planKit(brand, { pack: 'documents', ...KIT_PACKS.find((pack) => pack.id === 'documents').options })
    const masters = plan.filter((entry) => entry.kind === 'office' && entry.document.publication)
    assert.equal(masters.length, 8, id)
    for (const paper of ['letter', 'a4']) for (const purpose of ['product', 'report', 'brief', 'portfolio']) {
      for (const extension of ['docx', 'html', 'json']) assert.ok(plan.some((entry) => entry.path === `documents/${id}-publication-${purpose}-${paper}.${extension}`), `${id} ${purpose} ${paper} ${extension}`)
    }
    assert.ok(plan.some((entry) => entry.path === documentProfile(brand).logo.assets.png), `${id}: preferred Word logo is included without the bulk PNG collection`)
    assert.equal(JSON.stringify(brand), before)
    for (const pack of KIT_PACKS) {
      const entries = planKit(brand, { ...pack.options, pack: pack.id })
      for (const path of ['index.html', 'web/asset-catalog.json', 'web/brand.css', ...(brand.web?.icons === false ? [] : ['web/favicon.svg']), 'source/brand.json']) assert.ok(entries.some((entry) => entry.path === path), `${id}/${pack.id}: offline index dependency ${path}`)
    }
    const independentlyEnabled = planKit(brand, { rasters: false, pdfs: false, office: true })
    assert.ok(independentlyEnabled.some((entry) => entry.kind === 'office'))
    assert.ok(!independentlyEnabled.some((entry) => entry.kind === 'png'))
    assert.ok(!planKit(brand, { office: false }).some((entry) => entry.kind === 'office'))
  }
})

test('portable profiles contain primary black and reverse outlined logos and resolved brand roles', async () => {
  for (const { id } of registry) {
    const ctx = await load(id)
    const profile = consumerProfile(ctx)
    assert.equal(profile.schema, 'brandkit/consumer-profile/1')
    assert.equal(profile.id, id)
    assert.equal(profile.typography.body.family, ctx.brand.fonts.body.consumerFamily ?? ctx.brand.fonts.body.family)
    for (const [role, value] of Object.entries(profile.colours)) assert.match(value, /^#[0-9a-f]{6}$/i, `${id}: ${role}`)
    for (const variant of ['primary', 'black', 'reverse']) {
      const { svg, viewBox } = profile.logos[variant]
      assert.deepEqual(viewBox, profile.logos.primary.viewBox)
      assert.ok(viewBox[2] > 0 && viewBox[3] > 0)
      assert.doesNotMatch(svg, /<(?:text|image|script|foreignObject)\b|(?:href|xlink:href)\s*=/i)
      assert.match(svg, /<(?:path|circle|polygon|ellipse)\b/)
    }
  }
  const { brand } = await load('firstform')
  assert.equal(tokens({ brand }).typeScale.h1.weight, 600)
  assert.equal(tokens({ brand }).typeScale.label.weight, 400)
  const conflicting = structuredClone(brand)
  conflicting.colours.ink = '#112233'
  conflicting.colours.readable = '#AABBCC'
  conflicting.roles.ink = 'readable'
  assert.equal(tokens({ brand: conflicting }).roles.ink, '#AABBCC')
  assert.equal(consumerProfile({ brand: conflicting }).colours.ink, '#AABBCC')
})

test('document catalog identifies the actual Word bytes and publication settings', async () => {
  const ctx = await load('firstform')
  const renderer = await createNodeRenderer()
  const result = await buildKit(ctx, {
    ...KIT_PACKS.find((pack) => pack.id === 'documents').options, pack: 'documents', renderer,
    sourceRevision: 'reviewed-revision', readAsset: (path) => readAssetFromDisk(ctx.folder, path),
    filter: (entry) => !entry.document || (entry.document.publication && entry.document.purpose === 'report' && entry.document.paper === 'a4')
  })
  assert.deepEqual(result.skipped, [])
  const catalog = JSON.parse(decode(result.files.get('web/asset-catalog.json')))
  assert.equal(catalog.sourceRevision, 'reviewed-revision')
  const word = catalog.assets.find((entry) => entry.path.endsWith('.docx'))
  assert.equal(word.paper, 'a4')
  assert.equal(word.purpose, 'report')
  assert.equal(word.profileVersion, DOCUMENTATION_VERSION)
  assert.equal(word.sha256, createHash('sha256').update(result.files.get(word.path)).digest('hex'))
  assert.equal(word.bytes, result.files.get(word.path).length)
  assert.ok(word.fontDependencies.some((file) => file.includes('SemiBold')))
  assert.ok(result.files.has(documentProfile(ctx.brand).logo.assets.png))
})

test('CLI source round trip retains custom content, catalog metadata and exported-kit font roots', async () => {
  const work = await mkdtemp(join(tmpdir(), 'brandkit-cli-test-'))
  const cli = join(root, 'bin/brandkit.mjs')
  const run = (args) => exec(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 })
  try {
    const { brand } = await load('firstform')
    const publication = publicationModel(brand, { paper: 'a4', purpose: 'brief', values: { title: 'A reviewed example', summary: 'Retain this exact content.' } })
    const source = join(work, 'publication.json')
    await writeFile(source, JSON.stringify(publication))
    const out = join(work, 'custom')
    await run(['documents', 'brands/firstform/brand.json', '--content', source, '--out', out])
    const catalog = JSON.parse(await readFile(join(out, 'web/asset-catalog.json'), 'utf8'))
    const master = catalog.assets.find((entry) => entry.path.endsWith('.docx'))
    assert.equal(master.purpose, 'brief')
    assert.equal(master.paper, 'a4')
    assert.equal(master.profileVersion, DOCUMENTATION_VERSION)
    const content = JSON.parse(await readFile(join(out, master.path.replace('.docx', '.json')), 'utf8'))
    assert.equal(content.title, 'A reviewed example')
    assert.match(await readFile(join(out, master.path.replace('.docx', '.html')), 'utf8'), /Retain this exact content\./)
    // A uniquely named font exists only in the exported pack, never in the built-in fallback.
    const exportedPath = join(out, 'source/brand.json')
    const exported = JSON.parse(await readFile(exportedPath, 'utf8'))
    await copyFile(join(out, exported.fonts.body.file), join(out, 'fonts/Only-In-This-Export.ttf'))
    exported.fonts.body.file = 'fonts/Only-In-This-Export.ttf'
    await writeFile(exportedPath, JSON.stringify(exported))
    await run(['documents', exportedPath, '--paper', 'letter', '--purpose', 'report,portfolio', '--out', join(work, 'rebuilt')])
    const rebuilt = JSON.parse(await readFile(join(work, 'rebuilt/web/asset-catalog.json'), 'utf8'))
    assert.deepEqual(rebuilt.assets.filter((entry) => entry.path.endsWith('.docx')).map((entry) => entry.purpose).sort(), ['portfolio', 'report'])
    await assert.rejects(run(['build', 'brands/firstform/brand.json', '--content', source, '--out', join(work, 'invalid')]), { code: 1 })
    await assert.rejects(readFile(join(work, 'invalid/source/brand.json')), { code: 'ENOENT' })
    await assert.rejects(run(['check', 'brands/firstform/brand.json', '--unknown']), { code: 1 })
  } finally { await rm(work, { recursive: true, force: true }) }
})
