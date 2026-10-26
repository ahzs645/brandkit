// Regenerate source-facing use guides and the factual blocks in First Form's reference page.
// This deliberately does not write brand.json or change any identity artwork.
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { DOCUMENTATION_VERSION, documentationGuide, documentationMarkdown } from '../../src/engine/documentation.js'

const root = fileURLToPath(new URL('../../', import.meta.url))
const manifest = JSON.parse(await readFile(`${root}brands/index.json`, 'utf8'))
const args = process.argv.slice(2)
const check = args.includes('--check')
const selected = args.filter((arg) => arg !== '--check')
const ids = manifest.map((item) => item.id).filter((id) => !selected.length || selected.includes(id))
for (const id of selected) if (!ids.includes(id)) throw new Error(`Unknown brand: ${id}`)

const stale = []
const update = async (path, contents) => {
  let before = null
  try { before = await readFile(path, 'utf8') } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (before === contents) return
  if (check) { stale.push(path.slice(root.length)); return }
  await writeFile(path, contents)
}
const html = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const replaceBlock = (source, id, contents) => {
  const pattern = new RegExp(`(<!-- brandkit:${id} -->)[\\s\\S]*?(<!-- /brandkit:${id} -->)`)
  if (!pattern.test(source)) throw new Error(`Missing generated reference block ${id}.`)
  return source.replace(pattern, (_, open, close) => `${open}${contents}${close}`)
}

for (const id of ids) {
  const folder = `${root}brands/${id}/`
  const brand = JSON.parse(await readFile(`${folder}brand.json`, 'utf8'))
  await update(`${folder}USE.md`, documentationMarkdown(brand))
  if (id === 'firstform') {
    const guide = documentationGuide(brand)
    let reference = await readFile(`${folder}docs/brand-details.html`, 'utf8')
    reference = replaceBlock(reference, 'edition', `Identity version ${html(guide.version)} · Document applications ${DOCUMENTATION_VERSION}`)
    reference = replaceBlock(reference, 'artwork-status', 'The original supplied kit contained 372 px PNG references. The current kit exports SVG, PNG and PDF artwork. The mark and Sora Bold wordmark are vector reconstructions; original vector masters have not been supplied.')
    for (const side of ['front', 'back']) {
      const template = guide.catalog.find((item) => item.id === `business-card-${side}`)
      reference = replaceBlock(reference, `card-size-${side}`, html(template.sizeLabel))
    }
    await update(`${folder}docs/brand-details.html`, reference)
  }
}

if (stale.length) {
  console.error(`Documentation needs regeneration:\n${stale.map((path) => `- ${path}`).join('\n')}`)
  process.exitCode = 1
} else {
  console.log(`${check ? 'Checked' : 'Updated'} documentation for ${ids.length} brand${ids.length === 1 ? '' : 's'}.`)
}
