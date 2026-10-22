// A golden manifest of what an engine draws for ddcnorth: the SHA-256 of every vector and text file
// in its kit plan, approved and as the 2.2 rising revision; asset files by path and the source
// file's hash; and each top-level key of brand.json. test/regression.test.js compares the working
// tree with the manifest made from the branch's base, so a change to the approved identity shows.
//
//   git archive a2eeb09 | tar -x -C /tmp/brandkit-base
//   node scripts/golden-base.mjs /tmp/brandkit-base > test/fixtures/base-a2eeb09.json
//
// The checkout path decides which engine and which brand.json are used, so the same function
// serves both sides of the comparison.

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const sha = (data) => createHash('sha256').update(data).digest('hex')

/** Keys sorted at every level, so a key's hash does not depend on how the file was indented. */
const canonical = (value) => Array.isArray(value)
  ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
    : JSON.stringify(value)

const sorted = (object) => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)))

/** Every entry an engine's kit plan makes without a browser, keyed by path. */
const renders = (engine, brand, folder) => {
  const out = {}
  for (const entry of engine.planKit(brand, { rasters: false, pdfs: false, assets: true })) {
    if (entry.kind === 'text') out[entry.path] = sha(entry.make({ brand }))
    else if (entry.kind === 'index') out[entry.path] = 'index'
    else if (entry.kind === 'asset') out[entry.path] = `asset:${sha(readFileSync(join(folder, entry.src)))}`
  }
  return sorted(out)
}

export const computeManifest = async (root) => {
  const base = resolve(root)
  const engine = await import(pathToFileURL(join(base, 'src/engine/index.js')).href)
  const folder = join(base, 'brands/ddcnorth')
  const brand = JSON.parse(readFileSync(join(folder, 'brand.json'), 'utf8'))
  return {
    keys: sorted(Object.fromEntries(Object.keys(brand).map((key) => [key, sha(canonical(brand[key]))]))),
    approved: renders(engine, brand, folder),
    rising: renders(engine, engine.withRevision(brand, 'rising'), folder)
  }
}

/** The differences between two render maps: changed, missing and added paths. */
export const compareRenders = (expected, actual) => ({
  changed: Object.keys(expected).filter((path) => path in actual && actual[path] !== expected[path]),
  missing: Object.keys(expected).filter((path) => !(path in actual)),
  added: Object.keys(actual).filter((path) => !(path in expected))
})

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2]
  if (!root) {
    console.error('Usage: node scripts/golden-base.mjs <checkout of the base commit>')
    process.exit(1)
  }
  process.stdout.write(`${JSON.stringify(await computeManifest(root), null, 1)}\n`)
}
