// Existing local pack ZIPs in, a canonical catalog out. Never recompress originals or fetch links.
import { lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { createHash } from 'node:crypto'
import { readPackFiles } from './archive-node.js'
import { buildCatalog, catalogProblems, inspectBrandFiles } from './host.js'

export const catalogUsage = 'usage: brandkit catalog <pack.zip or folder>… [--out catalog.json] [--name "Catalog name"] [--check] [--quiet]'
export const catalog = (argv) => {
  const inputs = [], options = { out: 'catalog.json', name: undefined, check: false, quiet: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--out' || arg === '--name') {
      const value = argv[++i]
      if (!value || value.startsWith('--')) throw new Error(`${arg} needs a value.`)
      options[arg.slice(2)] = value
    } else if (arg === '--check') options.check = true
    else if (arg === '--quiet') options.quiet = true
    else if (arg === '--help' || arg === '-h') { console.log(catalogUsage); return null }
    else if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`)
    else inputs.push(resolve(arg))
  }
  if (!inputs.length) throw new Error(catalogUsage)
  const paths = []
  for (const input of inputs) {
    const stat = lstatSync(input)
    if (stat.isSymbolicLink()) throw new Error('Catalog inputs must not be symbolic links.')
    if (stat.isDirectory()) paths.push(...readdirSync(input, { withFileTypes: true }).filter(entry => entry.isFile() && /\.zip$/i.test(entry.name)).map(entry => resolve(input, entry.name)))
    else if (stat.isFile() && /\.zip$/i.test(input)) paths.push(input)
    else throw new Error('Catalog inputs must be pack ZIPs or folders of pack ZIPs.')
  }
  if (!paths.length) throw new Error('No pack ZIPs found.')
  const out = resolve(options.out)
  const packs = [...new Set(paths)].sort().map(path => {
    if (lstatSync(path).size > 32 * 1024 * 1024) throw new Error('Pack exceeds the archive size limit.')
    const bytes = readFileSync(path)
    const entries = readPackFiles(bytes)
    if (!entries.has('brandkit-pack.json') || !entries.has('brand.json')) throw new Error('Catalog entries need canonical brand packs. Use brandkit pack for source folders first.')
    const inspected = inspectBrandFiles(entries)
    return { manifest: inspected.manifest, bytes, sha256: createHash('sha256').update(bytes).digest('hex'),
      file: relative(dirname(out), path).split(sep).join('/'), menuLogo: null }
  })
  const result = buildCatalog(packs, { name: options.name })
  const problems = catalogProblems(result)
  if (problems.length) throw new Error(problems.join(' '))
  if (options.check) {
    const existing = JSON.parse(readFileSync(out, 'utf8'))
    const normalize = value => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalize(item)])) : value
    if (JSON.stringify(normalize(existing)) !== JSON.stringify(normalize(result))) throw new Error('Catalog is stale. Run brandkit catalog without --check.')
  } else writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`)
  if (!options.quiet) console.log(`${options.check ? 'Validated' : 'Wrote'} ${out}: ${packs.length} packs.`)
  return result
}
