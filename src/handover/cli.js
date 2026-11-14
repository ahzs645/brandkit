import { buildHandover } from './node.js'

const usage = 'usage: brandkit handover <record.json> --provider <brand.json> --client <brand.json> --out <folder> [--paper letter|a4] [--provider-logo <original.png>] [--source-revision <sha>] [--cover] [--cover-variant hero|blocks|grid|index] [--table-style grid|ruled|ledger|panel|accent] [--pdf] [--issue]\n--cover adds the designed cover: the record’s cover.variant, or hero. --cover-variant chooses the design. --table-style replaces each brand’s own table design for this build.'

export async function handover(args) {
  if (!args.length || args[0] === '--help') { console.log(usage); return }
  const [recordPath, ...rest] = args
  const valued = { '--provider': 'providerPath', '--client': 'clientPath', '--out': 'outDir', '--paper': 'paper', '--provider-logo': 'providerLogoPath', '--source-revision': 'sourceRevision', '--cover-variant': 'coverVariant', '--table-style': 'tableStyle' }
  const flags = { '--pdf': 'pdf', '--issue': 'issue', '--cover': 'cover' }
  const options = { recordPath }
  const seen = new Set()
  for (let i = 0; i < rest.length; i++) {
    const name = rest[i]
    if (seen.has(name)) throw new Error(`Duplicate option: ${name}`)
    seen.add(name)
    if (flags[name]) { options[flags[name]] = true; continue }
    if (!valued[name]) throw new Error(`Unknown handover option: ${name}\n${usage}`)
    const value = rest[++i]
    if (!value || value.startsWith('--')) throw new Error(`${name} needs a value.`)
    options[valued[name]] = value
  }
  const manifest = await buildHandover(options)
  console.log(`${manifest.status === 'issued' ? 'Issued' : 'Draft'} managed-site pack: ${options.outDir} (${manifest.files.length + 1} files).`)
}
