#!/usr/bin/env node
// Build reviewable Word masters and optional matching PDFs for every registered brand.
// Outputs are build artifacts, never inputs to the identity generators.
import { execFile as execFileCallback } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { DOCUMENTATION_VERSION, DOCUMENT_PURPOSES, documentProfile } from '../src/engine/documentation.js'

const execFile = promisify(execFileCallback)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
let out = resolve(root, '.documentation/published')
let pdf = false
let selected
for (let index = 0; index < args.length; index++) {
  const option = args[index]
  if (option === '--pdf') { pdf = true; continue }
  if (['--out', '--brands'].includes(option)) {
    const value = args[++index]
    if (!value || value.startsWith('--')) throw new Error(`${option} needs a value.`)
    if (option === '--out') out = resolve(value)
    else selected = value.split(',')
    continue
  }
  throw new Error(`Unknown option: ${option}`)
}
const registry = JSON.parse(await readFile(join(root, 'brands/index.json'), 'utf8'))
if (selected?.some((id) => !registry.some((entry) => entry.id === id))) throw new Error('--brands must name registered brand ids.')
const brands = registry.filter((entry) => !selected || selected.includes(entry.id))
const revision = (await execFile('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim()
if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Release publishing needs the full source commit SHA.')
if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== revision) throw new Error('GITHUB_SHA does not match the checked-out source commit.')
const workingTree = (await execFile('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: root })).stdout.trim()
if (workingTree) throw new Error('Commit source changes before publishing versioned document starters. Use the documents CLI for working drafts.')
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
const safe = (value) => String(value).replace(/[^a-zA-Z0-9._-]/g, '-')
const releases = []
await mkdir(out, { recursive: true })
for (const entry of brands) {
  const brandPath = join(root, 'brands', entry.id, 'brand.json')
  const brand = JSON.parse(await readFile(brandPath, 'utf8'))
  const purposes = brand.documentation?.publishedPurposes ?? ['report']
  if (!Array.isArray(purposes) || !purposes.length || new Set(purposes).size !== purposes.length || purposes.some((purpose) => !DOCUMENT_PURPOSES.some((entry) => entry.id === purpose))) throw new Error(`${brand.id} publishedPurposes must contain unique known document purposes.`)
  const version = `v${safe(brand.version)}-docs-${safe(DOCUMENTATION_VERSION)}-${safe(revision.slice(0, 12))}`
  const folder = `${entry.id}/${version}`
  const destination = join(out, folder)
  const command = [join(root, 'bin/brandkit.mjs'), 'documents', brandPath, '--paper', 'both', '--purpose', purposes.join(','), '--source-revision', revision, '--zip', '--out', destination]
  if (pdf) command.push('--pdf')
  const result = await execFile(process.execPath, command, { cwd: root, maxBuffer: 1024 * 1024 })
  process.stdout.write(result.stdout)
  const archive = `${entry.id}/${entry.id}-${version}.zip`
  await rename(`${destination}.zip`, join(out, archive))
  const bytes = await readFile(join(out, archive))
  const profile = documentProfile(brand)
  releases.push({
    id: entry.id, name: brand.name, brandVersion: brand.version,
    documentationVersion: DOCUMENTATION_VERSION, sourceRevision: revision,
    status: profile.status.note, archive, bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    catalog: `${folder}/web/asset-catalog.json`, logo: `${folder}/${profile.logo.assets.svg}`,
    examples: purposes.flatMap((purpose) => ['letter', 'a4'].map((paper) => {
      const stem = `${folder}/documents/${entry.id}-publication-${purpose}-${paper}`
      return { paper, purpose, label: DOCUMENT_PURPOSES.find((entry) => entry.id === purpose).label, filename: `${entry.id}-${version}-${purpose}-${paper}`, word: `${stem}.docx`, ...(pdf ? { pdf: `${stem}.pdf` } : {}), html: `${stem}.html`, source: `${stem}.json` }
    }))
  })
}
const manifest = { schema: 'brandkit/documentation-release/1', documentationVersion: DOCUMENTATION_VERSION, sourceRevision: revision, generatedAt: new Date().toISOString(), brands: releases }
await writeFile(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
const links = (example) => `<li><strong>${escape(example.label)} · ${example.paper === 'letter' ? 'US Letter' : 'A4'}</strong> · <a href="${escape(example.word)}" download="${escape(example.filename)}.docx">Word master</a>${example.pdf ? ` · <a href="${escape(example.pdf)}" download="${escape(example.filename)}.pdf">PDF</a>` : ''} · <a href="${escape(example.html)}">Print preview</a> · <a href="${escape(example.source)}" download="${escape(example.filename)}.json">Editable source</a></li>`
await writeFile(join(out, 'index.html'), `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Brandkit document starters</title><style>
body{margin:0;font:17px/1.6 system-ui,sans-serif;color:#17232b;background:#f4f6f7}main{max-width:1000px;margin:auto;padding:40px 24px}h1{line-height:1.15}h2{margin-top:0}a{color:#154faa}section{background:white;border:1px solid #dce1e4;padding:28px;margin:24px 0;border-radius:12px}img{display:block;max-width:280px;max-height:75px;margin-bottom:22px}ul{padding-left:22px}li{margin:9px 0}.meta{font-size:14px;color:#46525d}code{overflow-wrap:anywhere}
</style><main><h1>Document starters for every brand</h1>
<p>Download an editable Word master and its matching PDF. Each starter demonstrates six reusable page layouts in US Letter and A4. Replace the instructional text and screenshot placeholder before sharing a finished document.</p>
<p>Each brand can publish report, brand portfolio and decision brief starters. All four document purposes, including product overviews, are available from the app’s Documents view. Export a new PDF from the Word master after editing it.</p>
<p class="meta">Document layouts ${escape(DOCUMENTATION_VERSION)} · Source revision <code>${escape(revision)}</code> · <a href="manifest.json">Release manifest and checksums</a></p>
${releases.map((release) => `<section><img src="${escape(release.logo)}" alt="${escape(release.name)} logo"><h2>${escape(release.name)}</h2><p class="meta">Identity ${escape(release.brandVersion)} · ${escape(release.status)}</p><ul>${release.examples.map(links).join('')}</ul><p><a href="${escape(release.archive)}" download>Download the document pack</a> · <a href="${escape(release.catalog)}">Asset catalog</a></p></section>`).join('\n')}
</main></html>\n`)
console.log(`Published ${releases.length} brands with ${releases.reduce((count, release) => count + release.examples.length, 0)} Word masters${pdf ? ' and matching PDFs' : ''}: ${out}`)
