import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { findAsset } from '../src/fonts/node.js'
import { buildHandover } from '../src/handover/node.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const brandFolder = join(root, 'brands', 'northwind')
const coverVariants = ['hero', 'blocks', 'grid', 'index']
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')

// A restricted-embedding test font: change only OS/2.fsType in a temporary copy.
// The source font and the repository's licence information remain untouched.
function restrictedFont(bytes) {
  const copy = Buffer.from(bytes)
  for (let offset = 12; offset < 12 + copy.readUInt16BE(4) * 16; offset += 16) {
    if (copy.subarray(offset, offset + 4).toString() !== 'OS/2') continue
    copy.writeUInt16BE(2, copy.readUInt32BE(offset + 8) + 8)
    return copy
  }
  throw new Error('The font fixture needs an OS/2 embedding-permission table.')
}

test('a real managed-site build preserves snapshots and safe assets without overwriting a delivery', async t => {
  const folder = await mkdtemp(join(tmpdir(), 'brandkit-handover-node-test-'))
  t.after(() => rm(folder, { recursive: true, force: true }))
  const base = JSON.parse(await readFile(join(brandFolder, 'brand.json'), 'utf8'))
  const provider = structuredClone(base)
  const client = structuredClone(base)
  provider.id = 'test-provider'
  provider.name = 'Test Provider'
  client.id = 'test-client'
  client.name = 'Test Client'
  // This source markup is inert test data. Output assets must remove its handlers.
  client.symbol = {
    viewBox: [0, 0, 256, 256],
    markup: '<g onload="alert(1)"><rect width="256" height="256"/></g><style>@import url(https://example.invalid/style.css);</style>'
  }
  client.documentation = { margins: { leftMm: 22, rightMm: 22 } }
  const providerFolder = join(folder, 'provider')
  const clientFolder = join(folder, 'client')
  await Promise.all([mkdir(providerFolder), mkdir(clientFolder)])
  const restricted = restrictedFont(await readFile(findAsset(brandFolder, provider.fonts.body.file)))
  provider.fonts.body.file = 'restricted-fixture.ttf'
  await writeFile(join(providerFolder, provider.fonts.body.file), restricted)
  const providerBytes = Buffer.from(JSON.stringify(provider))
  const clientBytes = Buffer.from(JSON.stringify(client))
  const providerPath = join(providerFolder, 'brand.json')
  const clientPath = join(clientFolder, 'brand.json')
  const record = JSON.parse(await readFile(join(root, 'examples/managed-site/ddc-north.json'), 'utf8'))
  record.provider.name = provider.name
  record.provider.brandId = provider.id
  record.client.name = 'Client <img src=x onerror="alert(1)"> & Company'
  record.client.brandId = client.id
  const recordPath = join(folder, 'record.json')
  const providerLogoPath = join(folder, 'original-provider.png')
  await Promise.all([
    writeFile(providerPath, providerBytes), writeFile(clientPath, clientBytes),
    writeFile(recordPath, JSON.stringify(record)), writeFile(providerLogoPath, pixel)
  ])
  const outDir = join(folder, 'delivery')
  const options = { recordPath, providerPath, clientPath, providerLogoPath, outDir, paper: 'a4', sourceRevision: 'test-revision' }
  const manifest = await buildHandover(options)
  assert.equal(manifest.status, 'draft')
  assert.equal(manifest.cover, null)
  assert.equal(manifest.coverVariant, null)
  assert.equal(manifest.paper, 'a4')
  assert.equal(manifest.sourceRevision, 'test-revision')
  assert.equal(manifest.provider.sha256, digest(providerBytes))
  assert.equal(manifest.client.sha256, digest(clientBytes))
  assert.equal(manifest.provider.originalLogo.sha256, digest(pixel))
  assert.deepEqual(await readFile(join(outDir, 'sources/provider-brand.json')), providerBytes)
  assert.deepEqual(await readFile(join(outDir, 'sources/client-brand.json')), clientBytes)
  assert.deepEqual(JSON.parse(await readFile(join(outDir, 'sources/handover.json'), 'utf8')), record)
  assert.deepEqual(await readFile(join(outDir, 'assets/provider-logo-original.png')), pixel)
  for (const entry of manifest.files) {
    const bytes = await readFile(join(outDir, entry.path))
    assert.equal(bytes.length, entry.bytes, entry.path)
    assert.equal(digest(bytes), entry.sha256, entry.path)
  }
  for (const stem of ['welcome-guide', 'quick-start', 'brand-reference']) {
    assert.ok(manifest.files.some(file => file.path === `${stem}.docx`))
    assert.ok(manifest.files.some(file => file.path === `${stem}.html`))
  }
  assert.ok(!manifest.files.some(file => file.path.endsWith('.pdf')))
  assert.ok(!manifest.files.some(file => file.path.startsWith('front-cover.')))
  for (const variant of ['primary', 'black', 'reverse']) {
    const svg = await readFile(join(outDir, `assets/client-logo-${variant}.svg`), 'utf8')
    assert.doesNotMatch(svg, /onload|onerror|@import|<script/i)
  }
  const profile = JSON.parse(await readFile(join(outDir, 'sources/client-consumer.json'), 'utf8'))
  assert.ok(Object.values(profile.logos).every(logo => !/onload|@import|<script/i.test(logo.svg)))
  const html = await readFile(join(outDir, 'index.html'), 'utf8')
  assert.doesNotMatch(html, /href="front-cover\./)
  assert.doesNotMatch(html, /<img src=x|<script/i)
  assert.match(html, /&lt;img src=x/)
  assert.ok(!html.includes(restricted.toString('base64')), 'restricted font bytes must not leak into the index')
  assert.match(html, /@font-face/, 'permitted brand faces remain available')
  for (const match of html.matchAll(/src="data:image\/svg\+xml;base64,([^"]+)"/g)) {
    assert.doesNotMatch(Buffer.from(match[1], 'base64').toString(), /onload|@import|<script/i)
  }

  await t.test('existing delivery is refused and its manifest stays unchanged', async () => {
    const previous = await readFile(join(outDir, 'manifest.json'))
    await assert.rejects(buildHandover(options), /new or empty directory/)
    assert.deepEqual(await readFile(join(outDir, 'manifest.json')), previous)
    assert.ok(!(await readdir(folder)).some(name => name.startsWith('.brandkit-handover-')))
  })

  await t.test('issue mode rejects an example before creating output', async () => {
    const issueOut = join(folder, 'must-not-be-issued')
    await assert.rejects(buildHandover({ ...options, outDir: issueOut, issue: true }), /Only a client record/)
    await assert.rejects(access(issueOut), { code: 'ENOENT' })
  })

  await t.test('the cover CLI exports a standalone native publication with traceable source metadata', async () => {
    const coverOut = join(folder, 'delivery-with-cover')
    const result = spawnSync(process.execPath, [join(root, 'bin/brandkit.mjs'), 'handover', recordPath,
      '--provider', providerPath, '--client', clientPath, '--out', coverOut,
      '--paper', 'letter', '--source-revision', 'cover-test-revision', '--cover'
    ], { encoding: 'utf8', cwd: root, timeout: 60000 })
    assert.equal(result.status, 0, result.stderr || result.error?.message)
    const built = JSON.parse(await readFile(join(coverOut, 'manifest.json'), 'utf8'))
    assert.equal(built.cover, 'brandkit/welcome-cover/2')
    assert.equal(built.coverVariant, 'hero', '--cover alone takes the recommended design')
    assert.equal(built.status, 'draft')
    assert.equal(built.sourceRevision, 'cover-test-revision')
    assert.equal(built.provider.sha256, digest(providerBytes))
    assert.equal(built.client.sha256, digest(clientBytes))
    assert.equal(built.provider.originalLogo, null, 'the selected provider definition supplies its primary artwork')
    for (const path of ['front-cover.publication.json', 'front-cover.html', 'front-cover.docx', 'assets/cover-artwork.svg', 'assets/provider-logo-primary.svg']) {
      const entry = built.files.find(file => file.path === path)
      assert.ok(entry, path)
      const bytes = await readFile(join(coverOut, path))
      assert.equal(digest(bytes), entry.sha256, path)
    }
    const welcome = JSON.parse(await readFile(join(coverOut, 'welcome-guide.publication.json'), 'utf8'))
    const front = JSON.parse(await readFile(join(coverOut, 'front-cover.publication.json'), 'utf8'))
    assert.equal(front.pages.length, 1)
    assert.deepEqual(front.pages[0], welcome.pages[0])
    assert.equal(front.pages[0].cover.variant, 'hero')
    assert.equal(front.pages[0].cover.preparedBy, provider.name)
    assert.match(front.pages[0].cover.status, /Example · draft/)
    const page = await readFile(join(coverOut, 'front-cover.html'), 'utf8')
    assert.match(page, /name="brandkit-source-revision" content="cover-test-revision"/)
    assert.match(page, /Your website\.<br>Start here\./)
    assert.doesNotMatch(page, /<img src=x|Prepared by Managed by/i)
    assert.deepEqual(await readFile(join(coverOut, 'sources/provider-brand.json')), providerBytes)
    assert.deepEqual(JSON.parse(await readFile(join(coverOut, 'sources/handover.json'), 'utf8')), record)
  })

  await t.test('a variant alone enables an index cover throughout the delivery', async () => {
    const coverOut = join(folder, 'delivery-index')
    const result = spawnSync(process.execPath, [join(root, 'bin/brandkit.mjs'), 'handover', recordPath,
      '--provider', providerPath, '--client', clientPath, '--out', coverOut,
      '--cover-variant', 'index'
    ], { encoding: 'utf8', cwd: root, timeout: 60000 })
    assert.equal(result.status, 0, result.stderr || result.error?.message)
    const built = JSON.parse(await readFile(join(coverOut, 'manifest.json'), 'utf8'))
    assert.equal(built.cover, 'brandkit/welcome-cover/2')
    assert.equal(built.coverVariant, 'index')
    assert.equal(built.status, 'draft')
    const welcome = JSON.parse(await readFile(join(coverOut, 'welcome-guide.publication.json'), 'utf8'))
    const front = JSON.parse(await readFile(join(coverOut, 'front-cover.publication.json'), 'utf8'))
    assert.equal(front.pages.length, 1)
    assert.deepEqual(front.pages[0], welcome.pages[0])
    assert.equal(front.pages[0].cover.variant, 'index')
    assert.equal(front.pages[0].cover.sections.length, 3, 'the index lists the pack’s contents')
    assert.equal(front.pages[0].cover.clientName, record.client.name)
    assert.equal(front.pages[0].cover.preparedBy, provider.name)
    assert.match(front.pages[0].cover.status, /Example · draft/)
    for (const path of ['front-cover.publication.json', 'front-cover.html', 'front-cover.docx', 'assets/cover-artwork.svg', 'assets/provider-logo-primary.svg']) {
      const entry = built.files.find(file => file.path === path)
      assert.ok(entry, path)
      assert.equal(digest(await readFile(join(coverOut, path))), entry.sha256, path)
    }
    const page = await readFile(join(coverOut, 'front-cover.html'), 'utf8')
    assert.match(page, /Your website\.<br>Start here\./)
    assert.match(page, />Your brand</, 'contents entries are native text')
    assert.doesNotMatch(page, /<img src=x|<script/i)
    const index = await readFile(join(coverOut, 'index.html'), 'utf8')
    assert.match(index, /href="front-cover\.html"/)
    assert.match(index, /href="front-cover\.docx"/)
    assert.doesNotMatch(index, /href="front-cover\.pdf"/)
  })

  await t.test('an explicit grid selection takes precedence when --cover is also supplied', async () => {
    const coverOut = join(folder, 'delivery-grid')
    const result = spawnSync(process.execPath, [join(root, 'bin/brandkit.mjs'), 'handover', recordPath,
      '--provider', providerPath, '--client', clientPath, '--out', coverOut,
      '--cover', '--cover-variant', 'grid'
    ], { encoding: 'utf8', cwd: root, timeout: 60000 })
    assert.equal(result.status, 0, result.stderr || result.error?.message)
    const built = JSON.parse(await readFile(join(coverOut, 'manifest.json'), 'utf8'))
    assert.equal(built.cover, 'brandkit/welcome-cover/2')
    assert.equal(built.coverVariant, 'grid')
    const welcome = JSON.parse(await readFile(join(coverOut, 'welcome-guide.publication.json'), 'utf8'))
    const front = JSON.parse(await readFile(join(coverOut, 'front-cover.publication.json'), 'utf8'))
    assert.deepEqual(front.pages[0], welcome.pages[0])
    assert.equal(front.pages[0].cover.variant, 'grid')
    assert.match(front.pages[0].cover.artwork.src, /^data:image\/png;base64,/)
    const entry = built.files.find(file => file.path === 'assets/cover-artwork.svg')
    assert.ok(entry)
    const graphic = await readFile(join(coverOut, entry.path), 'utf8')
    assert.equal(digest(Buffer.from(graphic)), entry.sha256)
    assert.doesNotMatch(graphic, /onload|onerror|@import|<script/i)
    assert.notEqual(graphic, await readFile(join(folder, 'delivery-with-cover/assets/cover-artwork.svg'), 'utf8'), 'the explicit selection produces different artwork from the default')
    assert.match(await readFile(join(coverOut, 'index.html'), 'utf8'), /href="front-cover\.html"/)
  })
})

test('cover selection rejects invalid values before reading sources or creating output', async t => {
  const folder = await mkdtemp(join(tmpdir(), 'brandkit-handover-cover-options-'))
  t.after(() => rm(folder, { recursive: true, force: true }))
  const options = {
    recordPath: join(folder, 'missing-record.json'),
    providerPath: join(folder, 'missing-provider.json'),
    clientPath: join(folder, 'missing-client.json'),
    outDir: join(folder, 'must-not-exist')
  }
  for (const coverVariant of ['unknown-cover', '', null, false, 1, {}, [], '__proto__', 'constructor']) {
    await assert.rejects(buildHandover({ ...options, coverVariant }), error => {
      assert.match(error.message, /cover.?variant|welcome cover variant/i)
      assert.notEqual(error.code, 'ENOENT', 'selection is validated before source IO')
      return true
    })
  }
  // Every public selection reaches the expected missing source rather than being
  // rejected by a stale option allowlist; artwork behavior is covered separately.
  for (const coverVariant of coverVariants) {
    await assert.rejects(buildHandover({ ...options, coverVariant }), { code: 'ENOENT' })
  }
  const baseArgs = [join(root, 'bin/brandkit.mjs'), 'handover', options.recordPath,
    '--provider', options.providerPath, '--client', options.clientPath, '--out', options.outDir]
  for (const [args, expected] of [
    [['--cover-variant', 'unknown-cover'], /cover.?variant|welcome cover variant/i],
    [['--cover-variant'], /--cover-variant needs a value/],
    [['--cover-variant', 'index', '--cover-variant', 'grid'], /Duplicate option: --cover-variant/]
  ]) {
    const result = spawnSync(process.execPath, [...baseArgs, ...args], { encoding: 'utf8', cwd: root })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, expected)
    assert.doesNotMatch(result.stderr, /ENOENT/, 'invalid selection fails before loading a record')
  }
  await assert.rejects(access(options.outDir), { code: 'ENOENT' })
  assert.deepEqual(await readdir(folder), [], 'no output or staging directory is created')
})

test('handover CLI explains usage and refuses duplicate or incomplete options', () => {
  const cli = join(root, 'bin', 'brandkit.mjs')
  const run = args => spawnSync(process.execPath, [cli, 'handover', ...args], { encoding: 'utf8', cwd: root })
  const help = run(['--help'])
  assert.equal(help.status, 0)
  assert.match(help.stdout, /brandkit handover/)
  assert.match(help.stdout, /--cover/)
  assert.match(help.stdout, /--cover-variant/)
  const duplicate = run(['record.json', '--pdf', '--pdf'])
  assert.notEqual(duplicate.status, 0)
  assert.match(duplicate.stderr, /Duplicate option: --pdf/)
  const duplicateCover = run(['record.json', '--cover', '--cover'])
  assert.notEqual(duplicateCover.status, 0)
  assert.match(duplicateCover.stderr, /Duplicate option: --cover/)
  const incomplete = run(['record.json', '--provider'])
  assert.notEqual(incomplete.status, 0)
  assert.match(incomplete.stderr, /--provider needs a value/)
})
