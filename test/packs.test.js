// Brand packs (src/pack): a brand folder in, one zip out, and back again without losing a byte.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { zipSync, strToU8 } from 'fflate'
import { buildCatalog, buildPack, libraryIndex } from '../src/pack/build.js'
import { PACK_MANIFEST, PACK_VERSION, cleanPath, readCatalog, readPack } from '../src/pack/format.js'
import { pack } from '../src/pack/cli.js'

const NORTHWIND = fileURLToPath(new URL('../brands/northwind/', import.meta.url))
const LIBRARY = fileURLToPath(new URL('../library/', import.meta.url))

/** A brand folder to pack: northwind renamed, with a duplicate, a library font and its history. */
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'brandkit-pack-'))
  const folder = join(root, 'southwind')
  cpSync(NORTHWIND, folder, { recursive: true })
  const brand = JSON.parse(readFileSync(join(folder, 'brand.json'), 'utf8'))
  brand.id = 'southwind'
  brand.name = 'southwind'
  writeFileSync(join(folder, 'brand.json'), JSON.stringify(brand))
  mkdirSync(join(folder, 'site/assets'), { recursive: true })
  writeFileSync(join(folder, 'notes.md'), '# Same words twice\n')
  writeFileSync(join(folder, 'site/assets/notes.md'), '# Same words twice\n')
  mkdirSync(join(folder, 'fonts/desktop'), { recursive: true })
  cpSync(join(LIBRARY, 'fonts/desktop/Inter-Regular.ttf'), join(folder, 'fonts/desktop/Inter-Regular.ttf'))
  cpSync(join(LIBRARY, 'fonts/SpaceMono-OFL.txt'), join(folder, 'licences/space-mono.txt'), { force: true, recursive: true })
  mkdirSync(join(folder, 'history/1.0'), { recursive: true })
  writeFileSync(join(folder, 'history/1.0/brand.json'), '{}')
  writeFileSync(join(folder, '.DS_Store'), 'junk')
  return { root, folder, brand }
}

test('a pack holds the brand once: duplicates become aliases and library files stay out', () => {
  const { root, folder } = fixture()
  try {
    const { bytes, manifest, stats } = buildPack(folder, { library: libraryIndex() })
    assert.equal(manifest.format, 'brandkit-pack')
    assert.equal(manifest.version, PACK_VERSION)
    assert.equal(manifest.id, 'southwind')
    assert.equal(manifest.aliases['site/assets/notes.md'], 'notes.md')
    assert.equal(manifest.aliases['licences/space-mono.txt'], 'library:fonts/SpaceMono-OFL.txt', 'the same bytes as a library file at another path')
    assert.ok(manifest.library['fonts/desktop/Inter-Regular.ttf'], 'a byte-for-byte library font is left to the library')
    assert.ok(stats.libraryBytes > 100_000 && stats.aliased === 1)
    const { manifest: read, brand, files, library } = readPack(bytes)
    assert.deepEqual(read, manifest)
    assert.equal(brand.id, 'southwind')
    assert.equal(new TextDecoder().decode(files.get('site/assets/notes.md')), '# Same words twice\n', 'an alias reads as the file')
    assert.equal(library.get('licences/space-mono.txt'), 'fonts/SpaceMono-OFL.txt')
    assert.ok(!files.has('fonts/desktop/Inter-Regular.ttf'))
    for (const path of files.keys()) assert.ok(!path.startsWith('history/') && !path.endsWith('.DS_Store'), path)
    assert.ok(files.has('logo-menu.svg') && manifest.menuLogo === 'logo-menu.svg')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('the same folder always makes the same pack, byte for byte', () => {
  const { root, folder } = fixture()
  try {
    const first = buildPack(folder)
    const second = buildPack(folder)
    assert.equal(first.sha256, second.sha256)
    writeFileSync(join(folder, 'notes.md'), '# Changed\n')
    assert.notEqual(buildPack(folder).sha256, first.sha256)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('packs preserve the same ZIP epoch and bytes across timezones', () => {
  const folder = mkdtempSync(join(tmpdir(), 'brandkit-pack-timezone-'))
  try {
    writeFileSync(join(folder, 'brand.json'), JSON.stringify({ id: 'timezone', name: 'Timezone', version: '1' }))
    writeFileSync(join(folder, 'notes.txt'), 'The same content in every timezone.\n')
    const moduleUrl = new URL('../src/pack/build.js', import.meta.url).href
    const script = `
      import { buildPack } from ${JSON.stringify(moduleUrl)};
      const built = buildPack(process.argv[1], { library: { byPath: new Map(), byHash: new Map() } });
      process.stdout.write(JSON.stringify({ sha256: built.sha256, bytes: Buffer.from(built.bytes).toString('base64') }));
    `
    const results = ['UTC', 'America/Vancouver', 'Asia/Tokyo', 'Pacific/Kiritimati'].map((zone) => {
      const child = spawnSync(process.execPath, ['--input-type=module', '--eval', script, folder], {
        env: { ...process.env, TZ: zone }, encoding: 'utf8', timeout: 15000
      })
      assert.equal(child.status, 0, `${zone}: ${child.error?.message ?? child.stderr}`)
      return JSON.parse(child.stdout)
    })
    for (const result of results.slice(1)) assert.deepEqual(result, results[0], 'timezone cannot change a pack hash or its bytes')
    const bytes = Buffer.from(results[0].bytes, 'base64')
    assert.equal(bytes.readUInt32LE(0), 0x04034b50, 'first record is a ZIP local file header')
    assert.equal(bytes.readUInt16LE(10), 0, 'canonical DOS time is midnight')
    assert.equal(bytes.readUInt16LE(12), 0x0021, 'canonical DOS date stays January 1, 1980')
    assert.equal(readPack(bytes).brand.id, 'timezone', 'the timezone-independent archive still opens')
  } finally { rmSync(folder, { recursive: true, force: true }) }
})

test('northwind packs and reads back with every file it holds', () => {
  const { bytes } = buildPack(NORTHWIND)
  const { files } = readPack(bytes)
  for (const path of ['brand.json', 'logo-menu.svg']) assert.deepEqual(Buffer.from(files.get(path)), readFileSync(join(NORTHWIND, path)), path)
})

test('a zip that is not a pack still opens: a brand folder, or a kit with source/brand.json', () => {
  const definition = strToU8(JSON.stringify({ id: 'plain', name: 'Plain' }))
  const folder = readPack(zipSync({ 'plain/brand.json': definition, 'plain/fonts/a.ttf': new Uint8Array([1, 2]) }))
  assert.equal(folder.manifest, null)
  assert.equal(folder.brand.id, 'plain')
  assert.deepEqual([...folder.files.get('fonts/a.ttf')], [1, 2])
  const kit = readPack(zipSync({ 'plain-kit/source/brand.json': definition, 'plain-kit/fonts/a.ttf': new Uint8Array([3]) }))
  assert.equal(kit.brand.id, 'plain')
  assert.ok(kit.files.has('fonts/a.ttf') && kit.files.has('brand.json'))
})

test('a pack from a newer brandkit, a mismatched id, or paths outside the folder are refused or ignored', () => {
  const brand = strToU8(JSON.stringify({ id: 'x', name: 'X' }))
  const manifest = (extra) => strToU8(JSON.stringify({ format: 'brandkit-pack', version: 1, id: 'x', name: 'X', ...extra }))
  assert.throws(() => readPack(zipSync({ [PACK_MANIFEST]: manifest({ version: PACK_VERSION + 1 }), 'brand.json': brand })), /Update brandkit/)
  assert.throws(() => readPack(zipSync({ [PACK_MANIFEST]: manifest({ id: 'y' }), 'brand.json': brand })), /its brand.json is x/)
  assert.throws(() => readPack(new Uint8Array([1, 2, 3])), /not a zip/)
  const sneaky = readPack(zipSync({ [PACK_MANIFEST]: manifest({ aliases: { '../escape.txt': 'brand.json' } }), 'brand.json': brand, '../../etc/x': strToU8('no') }))
  assert.deepEqual([...sneaky.files.keys()], ['brand.json'])
  assert.equal(cleanPath('a/../b'), null)
  assert.equal(cleanPath('/abs'), null)
  assert.equal(cleanPath('fonts/a.ttf'), 'fonts/a.ttf')
})

test('a catalog lists packs relative to itself, and resolves them where it is fetched from', () => {
  const built = buildPack(NORTHWIND)
  const catalog = buildCatalog([{ ...built, file: 'northwind.zip', description: 'The example' }], { name: 'Examples' })
  assert.equal(catalog.format, 'brandkit-catalog')
  assert.equal(catalog.packs[0].url, 'northwind.zip')
  assert.equal(catalog.packs[0].sha256, built.sha256)
  const read = readCatalog(catalog, 'https://example.org/brands/catalog.json')
  assert.equal(read.packs[0].url, 'https://example.org/brands/northwind.zip')
  assert.equal(read.packs[0].menuLogo, 'https://example.org/brands/northwind.logo.svg')
  assert.equal(read.packs[0].description, 'The example')
  const filtered = readCatalog({ ...catalog, packs: [...catalog.packs, { id: 'Bad Id', url: 'x.zip' }, { id: 'js', url: 'javascript:alert(1)' }] }, 'https://example.org/')
  assert.deepEqual(filtered.packs.map((entry) => entry.id), ['northwind'])
  assert.throws(() => readCatalog({ format: 'other' }, 'https://example.org/'), /not a brandkit catalog/)
})

test('the pack command writes each brand’s zip and menu logo, and a catalog of them', () => {
  const { root, folder } = fixture()
  const out = join(root, 'out')
  try {
    const result = pack([root, '--out', out, '--name', 'Test brands', '--quiet'])
    assert.deepEqual(result.catalog.packs.map((entry) => entry.id), ['southwind'])
    const catalog = JSON.parse(readFileSync(join(out, 'catalog.json'), 'utf8'))
    assert.equal(catalog.name, 'Test brands')
    assert.equal(readPack(readFileSync(join(out, 'southwind.zip'))).brand.id, 'southwind')
    assert.deepEqual(readFileSync(join(out, 'southwind.logo.svg')), readFileSync(join(folder, 'logo-menu.svg')))
    assert.throws(() => pack(['--out', out]), /usage/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('.packignore keeps source material out of the pack, but never a file the kit lists', () => {
  const { root, folder, brand } = fixture()
  try {
    mkdirSync(join(folder, 'reference/scans'), { recursive: true })
    writeFileSync(join(folder, 'reference/scans/page-1.webp'), 'scan')
    writeFileSync(join(folder, 'reference/photo.jpg'), 'photo')
    writeFileSync(join(folder, 'reference/keep.jpg'), 'keep')
    writeFileSync(join(folder, '.packignore'), '# research, not for users\nreference/scans/\nreference/photo.jpg\n')
    const { manifest, stats, bytes } = buildPack(folder)
    const { files } = readPack(bytes)
    assert.ok(!files.has('reference/scans/page-1.webp') && !files.has('reference/photo.jpg') && !files.has('.packignore'))
    assert.ok(files.has('reference/keep.jpg'))
    assert.equal(stats.ignored, 2)
    assert.equal(manifest.files.count, stats.files, 'the manifest counts what the pack holds')
    writeFileSync(join(folder, 'brand.json'), JSON.stringify({ ...brand, files: [...(brand.files ?? []), 'reference/photo.jpg'] }))
    assert.throws(() => buildPack(folder), /kit lists in brand\.json files \(reference\/photo\.jpg\)/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
