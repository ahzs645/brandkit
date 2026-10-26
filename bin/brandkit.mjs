#!/usr/bin/env node
// Portable brand assets and complete documentation packs from the same brand definition.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep, basename } from 'node:path'
import { buildKit, groupOf } from '../src/engine/kit.js'
import { validateBrand } from '../src/engine/brand.js'
import { assetRecord } from '../src/engine/catalog.js'
import { indexHtml } from '../src/engine/web.js'
import { loadBrandFontsFromDisk, readAssetFromDisk } from '../src/fonts/node.js'

const [command, file, ...rest] = process.argv.slice(2)
const option = (name) => {
  const index = rest.indexOf(name)
  if (index < 0) return undefined
  const value = rest[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} needs a value.`)
  return value
}
const has = (name) => rest.includes(name)
const validateOptions = () => {
  const valued = new Set(command === 'pdf' ? ['--out', '--brand'] : command === 'check' ? [] : ['--out', '--pack', '--paper', '--purpose', '--values', '--content', '--source-revision'])
  const flags = new Set(['build', 'documents'].includes(command) ? ['--office', '--pdf', '--zip'] : [])
  for (let i = 0; i < rest.length; i++) {
    if (valued.has(rest[i])) { option(rest[i]); i++; continue }
    if (!flags.has(rest[i])) throw new Error(`Unknown option: ${rest[i]}`)
  }
}
const encoder = new TextEncoder()
const json = (value) => encoder.encode(`${JSON.stringify(value, null, 2)}\n`)
const usage = `usage: brandkit check <brand.json>
       brandkit build <brand.json> [--out folder] [--pack complete|documents|presentations|web|print] [--office]
       brandkit documents <brand.json> [--out folder] [--paper letter|a4|both] [--purpose product|report|brief|portfolio] [--values values.json | --content publication.json] [--pdf] [--zip]
       brandkit pdf <master.docx> [--out folder] [--brand brand.json]

The documents command creates native Word files, printable HTML, editable content JSON and brand assets.
--pdf exports each Word master using LibreOffice; set SOFFICE_PATH when it is not on PATH.
The pdf command refreshes a PDF after a Word master has been edited. --brand supplies its fonts.
The build command keeps its vector/text default; --office enables generated Office files in Node.`

const load = async (path) => {
  const absolute = resolve(path)
  // Downloaded kits put their definition in source/ and their assets beside that folder.
  const definitionFolder = dirname(absolute)
  const folder = basename(definitionFolder) === 'source' && basename(absolute) === 'brand.json' ? dirname(definitionFolder) : definitionFolder
  const brand = JSON.parse(await readFile(absolute, 'utf8'))
  const problems = validateBrand(brand)
  if (problems.length) throw new Error(problems.join('\n'))
  const fonts = await loadBrandFontsFromDisk(brand, folder)
  return { brand, fonts, folder }
}

const main = async () => {
  if (!command || command === '--help' || command === 'help') { console.log(usage); return }
  if (!file || !['build', 'check', 'documents', 'pdf'].includes(command)) throw new Error(usage)
  validateOptions()
  if (command === 'pdf') {
    const { pdfFromDocx } = await import('../src/export/node.js')
    const brandPath = option('--brand')
    const ctx = brandPath ? await load(brandPath) : undefined
    const result = await pdfFromDocx(file, { outDir: option('--out') ?? dirname(resolve(file)), ctx })
    console.log(`PDF exported from the Word master: ${result}`)
    return
  }
  if (command === 'check') {
    const brand = JSON.parse(await readFile(resolve(file), 'utf8'))
    const problems = validateBrand(brand)
    if (problems.length) throw new Error(problems.join('\n'))
    console.log(`${brand.name}: no problems found`)
    return
  }
  const { brand, fonts, folder } = await load(file)
  if (fonts.failures.length) throw new Error(`Required brand fonts could not be loaded: ${fonts.failures.map(({ key, error }) => `${key}: ${error.message}`).join('; ')}`)
  const valuesPath = option('--values')
  const contentPath = option('--content')
  if (valuesPath && contentPath) throw new Error('Choose either --values or --content.')
  const values = valuesPath ? JSON.parse(await readFile(resolve(valuesPath), 'utf8')) : undefined
  const ctx = { brand, fonts, values, sourceRevision: option('--source-revision') }
  const out = resolve(option('--out') ?? `${brand.id}-${command === 'documents' ? 'documents' : 'kit'}`)
  const paper = option('--paper') ?? 'both'
  const purpose = option('--purpose')
  const purposes = purpose?.split(',')
  if (!['both', 'letter', 'a4'].includes(paper)) throw new Error('--paper must be letter, a4 or both.')
  if (purposes?.some((entry) => !['product', 'report', 'brief', 'portfolio'].includes(entry))) throw new Error('--purpose must be product, report, brief or portfolio, or a comma-separated list of these.')
  const withOffice = command === 'documents' || has('--office')
  if ((contentPath || has('--pdf')) && !withOffice) throw new Error('--content and --pdf require documents or build --office.')
  const renderer = withOffice ? await (await import('../src/export/node.js')).createNodeRenderer() : undefined
  const filter = (entry) => {
    if (entry.document) {
      if (contentPath) return false
      if ((paper !== 'both' || purpose) && !entry.document.publication) return false
      if (entry.document.publication && ((paper !== 'both' && entry.document.paper !== paper) || (purposes && !purposes.includes(entry.document.purpose)))) return false
    }
    if (paper !== 'both' && /^source\/document-profile-/.test(entry.path)) return entry.path.endsWith(`-${paper}.json`)
    return true
  }
  const result = await buildKit(ctx, {
    renderer, readAsset: (src) => readAssetFromDisk(folder, src), rasters: false, pdfs: false,
    office: withOffice, documentation: true, pack: command === 'documents' ? 'documents' : option('--pack') ?? 'complete',
    sourceRevision: option('--source-revision'), filter
  })
  if (result.skipped.length) throw new Error(`Export incomplete: ${result.skipped.map(({ path, error }) => `${path}: ${error.message}`).join('; ')}`)
  const files = result.files
  const publicationMetadata = new Map(JSON.parse(new TextDecoder().decode(files.get('web/asset-catalog.json'))).assets
    .filter((record) => record.purpose).map((record) => [record.path, { publication: true, purpose: record.purpose, paper: record.paper, profileVersion: record.profileVersion }]))
  if (contentPath) {
    const { validatePublication } = await import('../src/engine/documentation.js')
    const { publicationDocx, publicationHtml } = await import('../src/export/publication.js')
    const publication = JSON.parse(await readFile(resolve(contentPath), 'utf8'))
    const problems = validatePublication(publication)
    if (problems.length) throw new Error(problems.join('\n'))
    if (publication.profile.brandId !== brand.id) throw new Error('The publication and brand definition must have the same brand id.')
    const stem = `${brand.id}-${String(publication.id).replace(/[^a-z0-9_-]/gi, '-')}`
    files.set(`documents/${stem}.docx`, await publicationDocx(ctx, publication, { png: renderer.png }))
    files.set(`documents/${stem}.html`, encoder.encode(publicationHtml(ctx, publication)))
    files.set(`documents/${stem}.json`, json(publication))
    for (const extension of ['docx', 'html', 'json']) publicationMetadata.set(`documents/${stem}.${extension}`, {
      publication: true, purpose: publication.purpose, paper: publication.paper, profileVersion: publication.profile.status.documentationVersion
    })
  }
  await mkdir(out, { recursive: true })
  for (const [relative, bytes] of files) {
    const target = resolve(out, relative)
    if (!target.startsWith(out + sep)) throw new Error(`An export path escapes the output folder: ${relative}`)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, bytes)
  }
  if (has('--pdf')) {
    const { pdfFromDocx } = await import('../src/export/node.js')
    for (const path of [...files.keys()].filter((path) => path.endsWith('.docx'))) {
      const pdf = await pdfFromDocx(join(out, path), { outDir: dirname(join(out, path)), ctx })
      files.set(path.replace(/\.docx$/, '.pdf'), new Uint8Array(await readFile(pdf)))
    }
  }
  // Refresh the catalog/index after custom content or canonical PDF conversion.
  const records = await Promise.all([...files].filter(([path]) => !['index.html', 'web/asset-catalog.json'].includes(path))
    .map(async ([path, bytes]) => {
      const document = publicationMetadata.get(path) ?? (path.endsWith('.pdf') ? publicationMetadata.get(path.replace(/\.pdf$/, '.docx')) : undefined)
      const record = await assetRecord(brand, path, bytes, groupOf(path), { document })
      if (path.endsWith('.pdf') && files.has(path.replace(/\.pdf$/, '.docx'))) record.derivedFrom = path.replace(/\.pdf$/, '.docx')
      return record
    }))
  files.set('web/asset-catalog.json', json({ schema: 'brandkit/asset-catalog/2', brand: brand.name, brandId: brand.id, version: brand.version, sourceRevision: option('--source-revision') ?? null, pathBase: 'Package root, one folder above this catalog', assetCount: records.length, assets: records }))
  files.set('index.html', encoder.encode(indexHtml(ctx, records)))
  await mkdir(join(out, 'web'), { recursive: true })
  await writeFile(join(out, 'web/asset-catalog.json'), files.get('web/asset-catalog.json'))
  await writeFile(join(out, 'index.html'), files.get('index.html'))
  if (has('--zip')) {
    const { zip } = await import('../src/export/render.js')
    await writeFile(`${out}.zip`, await zip(files, basename(out)))
  }
  console.log(`${brand.name}: ${files.size} files written to ${out}${has('--zip') ? ` and ${out}.zip` : ''}`)
}

main().catch((error) => { console.error(error.message); process.exitCode = 1 })
