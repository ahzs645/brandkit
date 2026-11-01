// Making brand packs and catalogs from brand folders on disk (Node only). See ./format.js for what
// a pack holds; `node scripts/pack.mjs` and `brandkit pack` are the commands.
//
// A pack is made to be small and to come out the same every time:
//
// - Files brandkit ships in library/ (the open-licence faces) are left out when the brand's copy
//   is byte for byte the library's, at the same path or any other.
// - A file the brand keeps at several paths is zipped once; the others become aliases.
// - Images, fonts and other compressed formats are stored; text, SVG and JSON are deflated hard.
// - Entries are sorted and dated 1980-01-01, so the same folder always makes the same bytes and the
//   same SHA-256, which is how a browser knows a pack has not changed.
//
// This module imports nothing but fflate and Node, so a host can pack brands without installing
// the rest of brandkit's dependencies.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { zipSync } from 'fflate'
import { CATALOG_FORMAT, CATALOG_VERSION, PACK_FORMAT, PACK_MANIFEST, PACK_VERSION, STORED, cleanPath, pageIndex } from './format.js'

export const LIBRARY_DIR = fileURLToPath(new URL('../../library/', import.meta.url))

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const FIXED_DATE = new Date('1980-01-01T00:00:00Z')

/** What a pack leaves out of a brand's folder: its history and anything that is only for the repository. */
export const DEFAULT_EXCLUDE = [/^history\//, /(^|\/)\.[^/]+$/, /(^|\/)node_modules\//, /\.pack\.zip$/]

const walk = (folder) => {
  const out = []
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (entry.isFile()) out.push(relative(folder, path).split(sep).join('/'))
    }
  }
  visit(folder)
  return out.sort()
}

/** brandkit's own library: path → SHA-256, and SHA-256 → path. */
export const libraryIndex = (libraryDir = LIBRARY_DIR) => {
  const byPath = new Map()
  const byHash = new Map()
  if (!existsSync(libraryDir)) return { byPath, byHash }
  for (const path of walk(libraryDir)) {
    const digest = hash(readFileSync(join(libraryDir, path)))
    byPath.set(path, digest)
    if (!byHash.has(digest)) byHash.set(digest, path)
  }
  return { byPath, byHash }
}

/**
 * Packs one brand folder. Returns `{ bytes, manifest, sha256, stats }`; `stats` says what the
 * optimisations saved: `{ files, bytes, aliased, aliasedBytes, library, libraryBytes, zipped }`.
 */
export const buildPack = (folder, { library = libraryIndex(), exclude = DEFAULT_EXCLUDE, createdAt } = {}) => {
  const definition = join(folder, 'brand.json')
  if (!existsSync(definition)) throw new Error(`${folder} has no brand.json`)
  const brand = JSON.parse(readFileSync(definition, 'utf8'))

  const tree = {}
  const aliases = {}
  const libraryFiles = {}
  const kept = new Map()
  const stats = { files: 0, bytes: 0, aliased: 0, aliasedBytes: 0, library: 0, libraryBytes: 0, zipped: 0 }

  for (const path of walk(folder)) {
    if (exclude.some((pattern) => pattern.test(path))) continue
    const clean = cleanPath(path)
    if (!clean || clean === PACK_MANIFEST) continue
    const bytes = readFileSync(join(folder, path))
    const digest = hash(bytes)
    stats.files += 1
    stats.bytes += bytes.byteLength
    // brand.json and the menu logo always travel, even if the library happened to hold the same bytes.
    const essential = clean === 'brand.json' || clean === 'logo-menu.svg'
    if (!essential && library.byPath.get(clean) === digest) {
      libraryFiles[clean] = digest
      stats.library += 1
      stats.libraryBytes += bytes.byteLength
      continue
    }
    if (!essential && library.byHash.has(digest)) {
      // The same bytes as a library file kept at another path: served from the library.
      aliases[clean] = `library:${library.byHash.get(digest)}`
      libraryFiles[library.byHash.get(digest)] = digest
      stats.library += 1
      stats.libraryBytes += bytes.byteLength
      continue
    }
    if (kept.has(digest)) {
      aliases[clean] = kept.get(digest)
      stats.aliased += 1
      stats.aliasedBytes += bytes.byteLength
      continue
    }
    kept.set(digest, clean)
    tree[clean] = [new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength), { level: STORED.test(clean) ? 0 : 9, mtime: FIXED_DATE }]
  }

  const pages = brand.manuals ? pageIndex(brand) : null
  const manifest = {
    format: PACK_FORMAT,
    version: PACK_VERSION,
    id: brand.id,
    name: brand.name ?? brand.id,
    ...(brand.version ? { brandVersion: String(brand.displayVersion ?? brand.version) } : {}),
    ...(brand.extension ? { extension: brand.extension } : {}),
    ...(tree['logo-menu.svg'] ? { menuLogo: 'logo-menu.svg' } : {}),
    ...(createdAt ? { createdAt } : {}),
    files: { count: stats.files, bytes: stats.bytes },
    ...(Object.keys(aliases).length ? { aliases: Object.fromEntries(Object.entries(aliases).sort()) } : {}),
    ...(Object.keys(libraryFiles).length ? { library: Object.fromEntries(Object.entries(libraryFiles).sort()) } : {}),
    ...(pages && Object.keys(pages).length ? { pages } : {})
  }
  const ordered = { [PACK_MANIFEST]: [new TextEncoder().encode(`${JSON.stringify(manifest, null, 1)}\n`), { level: 9, mtime: FIXED_DATE }] }
  for (const key of Object.keys(tree).sort()) ordered[key] = tree[key]
  const bytes = zipSync(ordered)
  stats.zipped = bytes.byteLength
  return { bytes, manifest, sha256: hash(bytes), stats }
}

/** The brand folders under a directory: every child folder holding a brand.json. */
export const brandFolders = (root) => readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(root, entry.name, 'brand.json')))
  .map((entry) => join(root, entry.name))
  .sort()

/**
 * A catalog for some built packs. `url` in each entry is relative to the catalog (the pack's file
 * name), so the folder can be served from anywhere; `baseUrl` makes them absolute instead.
 */
export const buildCatalog = (packs, { name, baseUrl, description } = {}) => ({
  format: CATALOG_FORMAT,
  version: CATALOG_VERSION,
  ...(name ? { name } : {}),
  ...(description ? { description } : {}),
  packs: packs.map(({ manifest, sha256, bytes, file, description: about }) => ({
    id: manifest.id,
    name: manifest.name,
    url: baseUrl ? new URL(file, baseUrl).href : file,
    sha256,
    bytes: bytes.byteLength,
    ...(manifest.brandVersion ? { brandVersion: manifest.brandVersion } : {}),
    ...(about ? { description: about } : {}),
    ...(manifest.menuLogo ? { menuLogo: baseUrl ? new URL(`${manifest.id}.logo.svg`, baseUrl).href : `${manifest.id}.logo.svg` } : {}),
    ...(manifest.pages ? { pages: manifest.pages } : {})
  }))
})

export const isFolder = (path) => existsSync(path) && statSync(path).isDirectory()
