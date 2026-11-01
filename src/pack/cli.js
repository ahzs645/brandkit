// `brandkit pack` (and `node scripts/pack.mjs`): brand folders in, packs and a catalog out.
//
//   pack <folder>… [--out dir] [--name "Catalog name"] [--base-url https://…/] [--quiet]
//
// Each <folder> is a brand's folder (it holds brand.json) or a folder of them. For every brand it
// writes <id>.zip, and <id>.logo.svg for the brand menu, then catalog.json listing them all.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { brandFolders, buildCatalog, buildPack, isFolder, libraryIndex } from './build.js'

const size = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`)

export const packUsage = `usage: brandkit pack <brand folder or folder of brands>… [--out folder] [--name "Catalog name"] [--base-url https://host/path/] [--quiet]

Writes <id>.zip and <id>.logo.svg for each brand, and catalog.json listing them, to --out
(default dist/packs). Open a pack in brandkit with ?url=<its address>, or point brandkit at the
catalog (?catalog=<address>, or VITE_BRANDKIT_CATALOGS when building the site).`

export const pack = (argv) => {
  const folders = []
  const options = { out: 'dist/packs', name: null, baseUrl: null, quiet: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const value = () => {
      const next = argv[++i]
      if (!next || next.startsWith('--')) throw new Error(`${arg} needs a value.\n\n${packUsage}`)
      return next
    }
    if (arg === '--out') options.out = value()
    else if (arg === '--name') options.name = value()
    else if (arg === '--base-url') options.baseUrl = value()
    else if (arg === '--quiet') options.quiet = true
    else if (arg === '--help' || arg === '-h') { console.log(packUsage); return null }
    else if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}\n\n${packUsage}`)
    else folders.push(arg)
  }
  if (!folders.length) throw new Error(packUsage)

  const brands = []
  for (const folder of folders.map((entry) => resolve(entry))) {
    if (!isFolder(folder)) throw new Error(`${folder} is not a folder.`)
    try { readFileSync(join(folder, 'brand.json')); brands.push(folder) } catch { brands.push(...brandFolders(folder)) }
  }
  if (!brands.length) throw new Error('No brand folders (folders holding a brand.json) were found.')

  const out = resolve(options.out)
  mkdirSync(out, { recursive: true })
  const library = libraryIndex()
  const built = []
  const ids = new Set()
  for (const folder of brands) {
    const result = buildPack(folder, { library })
    if (ids.has(result.manifest.id)) throw new Error(`Two brands have the id ${result.manifest.id}.`)
    ids.add(result.manifest.id)
    const file = `${result.manifest.id}.zip`
    writeFileSync(join(out, file), result.bytes)
    if (result.manifest.menuLogo) writeFileSync(join(out, `${result.manifest.id}.logo.svg`), readFileSync(join(folder, result.manifest.menuLogo)))
    const definition = JSON.parse(readFileSync(join(folder, 'brand.json'), 'utf8'))
    built.push({ ...result, file, description: definition.description ?? definition.tagline ?? null })
    if (!options.quiet) {
      const { stats } = result
      const saved = [stats.aliased && `${stats.aliased} duplicate${stats.aliased === 1 ? '' : 's'} aliased (${size(stats.aliasedBytes)})`, stats.library && `${stats.library} library file${stats.library === 1 ? '' : 's'} left out (${size(stats.libraryBytes)})`].filter(Boolean).join(', ')
      console.log(`${file}: ${stats.files} files, ${size(stats.bytes)} → ${size(stats.zipped)}${saved ? `; ${saved}` : ''}`)
    }
  }
  const catalog = buildCatalog(built, { name: options.name ?? undefined, baseUrl: options.baseUrl ?? undefined })
  writeFileSync(join(out, 'catalog.json'), `${JSON.stringify(catalog, null, 1)}\n`)
  if (!options.quiet) {
    const raw = built.reduce((sum, entry) => sum + entry.stats.bytes, 0)
    const zipped = built.reduce((sum, entry) => sum + entry.stats.zipped, 0)
    console.log(`catalog.json: ${built.length} brands, ${size(raw)} of files in ${size(zipped)} of packs → ${out}`)
  }
  return { out, packs: built, catalog }
}
