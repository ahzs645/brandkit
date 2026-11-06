import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { zipSync, strToU8 } from 'fflate'
import { brandDefinitions, brandReferenceSummary, catalogEntriesForPath, catalogProblems, inspectBrandFiles, verifyCatalogEntry } from 'brandkit/pack/host'
import { readPackFiles } from 'brandkit/pack/host-node'
import { catalog } from '../src/pack/catalog-cli.js'
import { sha256 } from '../src/pack/format.js'

const json = value => strToU8(JSON.stringify(value))
const brand = id => json({ id, name: id, version: '1.0', colours: { ink: '#112233' } })
const manifest = extra => json({ format: 'brandkit-pack', version: 1, id: 'test', name: 'Test', brandVersion: '1.0', ...extra })
const pack = () => zipSync({ 'brandkit-pack.json': manifest(), 'brand.json': brand('test'), 'USE.md': strToU8('Visual guidance only.') })

test('public host API discovers and scopes one of several folder brands', () => {
  const files = readPackFiles(zipSync({ 'repo/brands/a/brand.json': brand('a'), 'repo/brands/a/logo.svg': strToU8('<svg/>'), 'repo/brands/b/brand.json': brand('b') }))
  assert.deepEqual(brandDefinitions(files), ['repo/brands/a/brand.json', 'repo/brands/b/brand.json'])
  const a = inspectBrandFiles(files, { definitionPath: brandDefinitions(files)[0] })
  assert.equal(a.brand.id, 'a')
  assert.deepEqual([...a.files.keys()], ['brand.json', 'logo.svg'])
  assert.equal(a.root, 'repo/brands/a/')
  assert.equal(a.exportOriginal, false)
  assert.equal(brandReferenceSummary(a.brand).colours.ink, '#112233')
})
test('host inspection resolves local chains and reports unresolved shared-library chains', () => {
  const files = new Map([
    ['brand.json', brand('test')], ['logo.svg', strToU8('<svg/>')],
    ['brandkit-pack.json', manifest({ aliases: { 'site/logo.svg': 'logo.svg', 'second.svg': 'site/logo.svg', 'body.ttf': 'font.ttf', 'font.ttf': 'library:fonts/body.ttf' } })],
  ])
  const result = inspectBrandFiles(files)
  assert.equal(result.files.get('second.svg'), result.files.get('logo.svg'))
  assert.equal(result.library.get('body.ttf'), 'fonts/body.ttf')
  assert(!result.archiveFiles.has('second.svg'))
  assert(result.warnings.some(message => message.includes('unavailable')))
  files.set('brandkit-pack.json', manifest({ aliases: { a: 'b', b: 'a' } }))
  assert.throws(() => inspectBrandFiles(files), /cycle/)
})
test('host inspection normalizes generated kits and rejects invalid manifests and alias paths', () => {
  const files = readPackFiles(zipSync({ 'kit/source/brand.json': brand('test'), 'kit/fonts/a.ttf': new Uint8Array([1, 2]) }))
  const result = inspectBrandFiles(files, { definitionPath: 'kit/source/brand.json' })
  assert(result.files.has('fonts/a.ttf'))
  assert(result.archiveFiles.has('brand.json'))
  assert(!result.archiveFiles.has('source/brand.json'))
  const bad = new Map([['brand.json', brand('test')], ['brandkit-pack.json', manifest({ version: 2 })]])
  assert.throws(() => inspectBrandFiles(bad), /Unsupported/)
  bad.set('brandkit-pack.json', manifest({ aliases: { logo: '../secret' } }))
  assert.throws(() => inspectBrandFiles(bad), /relative path/)
})
test('bounded archive intake rejects unsafe paths, links, encryption, duplicate members and ZIP64', () => {
  for (const name of ['../brand.json', '/brand.json', 'a/../brand.json', 'a\\brand.json', 'C:/brand.json']) {
    assert.throws(() => readPackFiles(zipSync({ [name]: brand('test') })), /relative path/)
  }
  const original = Buffer.from(zipSync({ 'same.txt': strToU8('a'), 'diff.txt': strToU8('b') }, { level: 0 }))
  const central = original.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]))
  const linked = Buffer.from(original); linked.writeUInt32LE((0o120777 << 16) >>> 0, central + 38)
  assert.throws(() => readPackFiles(linked), /links/)
  const encrypted = Buffer.from(original); encrypted.writeUInt16LE(1, central + 8)
  assert.throws(() => readPackFiles(encrypted), /Encrypted/)
  const duplicate = Buffer.from(original)
  const second = duplicate.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), central + 4)
  Buffer.from('same.txt').copy(duplicate, second + 46)
  assert.throws(() => readPackFiles(duplicate), /duplicate/)
  const large = Buffer.from(original); large.writeUInt16LE(0xffff, large.length - 12); large.writeUInt16LE(0xffff, large.length - 14)
  assert.throws(() => readPackFiles(large), /ZIP64/)
})
test('bounded archive intake verifies CRC and enforces limits before decompression', () => {
  const original = Buffer.from(zipSync({ 'brand.json': brand('test') }, { level: 0 }))
  const damaged = Buffer.from(original); damaged[30 + damaged.readUInt16LE(26) + damaged.readUInt16LE(28)] ^= 1
  assert.throws(() => readPackFiles(damaged), /CRC/)
  assert.throws(() => readPackFiles(original, { maxArchiveBytes: 1 }), /archive size/)
  assert.throws(() => readPackFiles(original, { maxExpandedBytes: 1 }), /expanded/)
  assert.throws(() => readPackFiles(original, { maxFileBytes: 1 }), /expanded/)
})
test('catalog validation resolves local archive members without fetching URLs', async () => {
  const bytes = pack(), hash = await sha256(bytes)
  const value = { format: 'brandkit-catalog', version: 1, packs: [{ id: 'test', name: 'Test', url: 'packs/test.zip', sha256: hash, bytes: bytes.length }] }
  assert.deepEqual(catalogProblems(value), [])
  const [entry] = catalogEntriesForPath(value, 'repo/catalog.json', 'repo/packs/test.zip')
  assert.equal(verifyCatalogEntry(entry, { sha256: hash, bytes: bytes.length, id: 'test' }), true)
  assert.throws(() => verifyCatalogEntry(entry, { sha256: '0'.repeat(64), bytes: bytes.length }), /checksum/)
  assert.throws(() => verifyCatalogEntry({ ...entry, sha256: 42 }, { sha256: hash, bytes: bytes.length }), /SHA-256/)
  assert(catalogProblems({ ...value, packs: [...value.packs, value.packs[0]] }).some(problem => problem.includes('duplicate')))
  assert(catalogProblems({ ...value, packs: [{ id: 'test', url: 'javascript:alert(1)' }] }).length)
  assert.equal(catalogEntriesForPath({ ...value, packs: [{ id: 'test', url: 'https://elsewhere.invalid/test.zip' }] }, 'repo/catalog.json', 'repo/test.zip').length, 0)
})
test('catalog command indexes original ZIPs, checks drift and rejects corrupt originals', async () => {
  const root = mkdtempSync(join(tmpdir(), 'brandkit-catalog-'))
  try {
    const file = join(root, 'test.zip'), out = join(root, 'catalog.json'), bytes = pack()
    writeFileSync(file, bytes)
    const result = catalog([file, '--out', out, '--name', 'Examples', '--quiet'])
    assert.equal(result.packs[0].sha256, await sha256(bytes))
    assert.equal(result.packs[0].url, 'test.zip')
    assert(!result.packs[0].menuLogo, 'indexing does not invent a menu logo outside the ZIP')
    assert.deepEqual(readFileSync(file), Buffer.from(bytes), 'original bytes are unchanged')
    catalog([file, '--out', out, '--name', 'Examples', '--check', '--quiet'])
    const changed = { ...result, name: 'Changed' }; writeFileSync(out, JSON.stringify(changed))
    assert.throws(() => catalog([file, '--out', out, '--name', 'Examples', '--check', '--quiet']), /stale/)
    assert.equal(JSON.parse(readFileSync(out)).name, 'Changed', '--check never writes')
    const damaged = Buffer.from(zipSync({ 'brandkit-pack.json': manifest(), 'brand.json': brand('test') }, { level: 0 }))
    damaged[30 + damaged.readUInt16LE(26) + damaged.readUInt16LE(28)] ^= 1
    writeFileSync(file, damaged)
    assert.throws(() => catalog([file, '--out', out, '--quiet']), /CRC/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
