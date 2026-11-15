// Node-only delivery builder. Uses the existing Brandkit publication, font and PDF engines.
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { validateBrand } from '../engine/brand.js'
import { TABLE_STYLES } from '../engine/documentation.js'
import { loadBrandFontsFromDisk } from '../fonts/node.js'
import { createNodeRenderer, pdfFromDocx } from '../export/node.js'
import { assertHandover } from './record.js'
import { PACK_DOCUMENTS, documentBrand, packFiles, packManifest, packOptions, preparePack } from './pack.js'
import { welcomeCoverVariant } from './cover-variants.js'

const json = value => `${JSON.stringify(value, null, 2)}\n`
const data = (bytes, mime) => `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`

async function loadBrand(file) {
  const absolute = resolve(file)
  const bytes = await readFile(absolute)
  const brand = JSON.parse(bytes)
  const problems = validateBrand(brand)
  if (problems.length) throw new Error(`Invalid brand ${basename(file)}: ${problems.join('; ')}`)
  const definitionFolder = dirname(absolute)
  const folder = basename(definitionFolder) === 'source' && basename(absolute) === 'brand.json' ? dirname(definitionFolder) : definitionFolder
  const fonts = await loadBrandFontsFromDisk(brand, folder)
  if (fonts.failures.length) throw new Error(`Required brand fonts could not be loaded: ${fonts.failures.map(({ key, error }) => `${key}: ${error.message}`).join('; ')}`)
  return { brand, fonts, bytes }
}

/** Build into a new or empty directory; no existing delivery is overwritten. */
export async function buildHandover({ recordPath, providerPath, clientPath, outDir, paper, pdf = false, issue = false, cover, coverVariant, tableStyle, documents, sections, brandSections, providerLogoPath, sourceRevision } = {}) {
  if (!recordPath || !providerPath || !clientPath || !outDir) throw new Error('recordPath, providerPath, clientPath and outDir are required.')
  if (paper !== undefined && !['letter', 'a4'].includes(paper)) throw new Error('paper must be letter or a4.')
  if (cover !== undefined && typeof cover !== 'boolean') throw new TypeError('cover must be a boolean; use coverVariant to select a design.')
  // Choices given here are checked before any source is read.
  if (coverVariant !== undefined) welcomeCoverVariant(coverVariant)
  if (tableStyle !== undefined && !TABLE_STYLES.includes(tableStyle)) throw new Error(`Unknown table style: ${String(tableStyle)}. Choose ${TABLE_STYLES.join(', ')}.`)
  const overrides = Object.fromEntries(Object.entries({ paper, issue, cover: cover || undefined, coverVariant, tableStyle, documents, sections, brandSections }).filter(([, value]) => value !== undefined))
  packOptions({ pack: {} }, { ...overrides, coverVariant: undefined })
  const recordBytes = await readFile(resolve(recordPath))
  if (recordBytes.length > 2 * 1024 * 1024) throw new Error('A handover record must be smaller than 2 MB.')
  const record = JSON.parse(recordBytes)
  assertHandover(record, { forIssue: issue })
  const [provider, client] = await Promise.all([loadBrand(providerPath), loadBrand(clientPath)])
  const source = sourceRevision ? String(sourceRevision).trim() : undefined
  const renderer = await createNodeRenderer()
  let originalLogo, providerLogo
  if (providerLogoPath) {
    const bytes = await readFile(resolve(providerLogoPath))
    if (!bytes.length || bytes.length > 25 * 1024 * 1024) throw new Error('Provider logo must be a nonempty PNG/JPEG smaller than 25 MB.')
    const mime = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg' : null
    if (!mime) throw new Error('Provider logo must be an original PNG or JPEG image.')
    originalLogo = { bytes, mime }
    providerLogo = { src: data(bytes, mime), alt: `${provider.brand.name} supplied logo`, widthMm: Math.max(40, provider.brand.logoPolicy?.minimumWidthMm ?? provider.brand.lockup?.minimumHorizontalWidthMm ?? 0), heightMm: 45 }
  }
  const args = { record, provider, client, options: overrides, png: renderer.png, providerLogo, sourceRevision: source, pdf, originalLogo, providerLogoSrc: providerLogo?.src }
  const prepared = await preparePack(args)
  const target = resolve(outDir)
  const existing = await lstat(target).catch(error => { if (error.code === 'ENOENT') return null; throw error })
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink() || (await readdir(target)).length)) throw new Error('Output must be a new or empty directory; existing deliveries are never overwritten.')
  await mkdir(dirname(target), { recursive: true })
  const work = await mkdtemp(join(dirname(target), '.brandkit-handover-'))
  try {
    const files = await packFiles(prepared, args)
    for (const [path, bytes] of files) {
      await mkdir(dirname(join(work, path)), { recursive: true })
      await writeFile(join(work, path), bytes)
    }
    // PDFs need LibreOffice: each Word master is converted beside itself.
    if (pdf) for (const item of PACK_DOCUMENTS) if (prepared.publications[item.id]) {
      const ctx = documentBrand(item.id, { provider, client })
      await pdfFromDocx(join(work, `${item.file}.docx`), { outDir: work, ctx })
      files.push([`${item.file}.pdf`, await readFile(join(work, `${item.file}.pdf`))])
    }
    const manifest = await packManifest(prepared, files, args)
    await writeFile(join(work, 'manifest.json'), json(manifest))
    await rename(work, target)
    return manifest
  } catch (error) {
    await rm(work, { recursive: true, force: true })
    throw error
  }
}
