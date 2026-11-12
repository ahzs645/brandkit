// Brand packs: one brand, everything it needs, as one zip a browser can be handed by URL.
//
//   brandkit-pack.json   what the pack is (see PackManifest below)
//   brand.json           the definition
//   …                    every file the brand's folder holds, at the same paths
//
// A pack is still a brand folder zipped, so anything that opens one of those (Open… in the app,
// `brandkit build`) opens a pack too. The manifest adds what a folder cannot say on its own:
//
// - `aliases`: a file the brand keeps at two or more paths (a logo in reference/ and in site/) is
//   in the zip once; every other path names the one that is there.
// - `library`: files the brand uses that brandkit itself ships (the open-licence Inter and Space
//   Mono in library/), left out of the pack because every copy of the app already has them.
// - `pages`: which manual pages the brand's templates, signatures and guide pages are built from,
//   so the manual library can link to a brand that is not installed yet.
//
// Nothing here touches the DOM or Node: it runs in the app, the CLI and the tests alike.

import { unzipSync } from 'fflate'

export const PACK_FORMAT = 'brandkit-pack'
export const PACK_VERSION = 1
export const PACK_MANIFEST = 'brandkit-pack.json'
export const CATALOG_FORMAT = 'brandkit-catalog'
export const CATALOG_VERSION = 1
export const BUNDLE_FORMAT = 'brandkit-bundle'
export const BUNDLE_VERSION = 1
export const BUNDLE_MANIFEST = 'brandkit-bundle.json'

/** A pack's files are never larger than this, so a bad link cannot exhaust the device. */
export const MAX_PACK_BYTES = 160 * 1024 * 1024

/** Files that are already compressed: zipped as they are, not deflated again. */
export const STORED = /\.(png|jpe?g|webp|gif|avif|woff2?|zip|pdf|mp4|webm|mov|docx|pptx|xlsx|gz|ico)$/i

/** A brand id as the app and the catalog use it: lowercase letters, digits and dashes. */
export const isBrandId = (value) => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(value)

const hex = (buffer) => Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')

/** SHA-256 of some bytes, as hex: how packs, catalogs and the browser store recognise a file. */
export const sha256 = async (bytes) => hex(await globalThis.crypto.subtle.digest('SHA-256', bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)))

/** The path a pack or brand file is kept under, or null for one that has no business in a pack. */
export const cleanPath = (path) => {
  const value = String(path).replaceAll('\\', '/').replace(/^\.\/+/, '')
  if (!value || value.startsWith('/') || value.split('/').some((part) => part === '..' || part === '' || part === '.')) return null
  if (value.includes('__MACOSX') || value.split('/').some((part) => part === '.DS_Store')) return null
  return value
}

/**
 * Which manual pages a brand builds from: `{ 'book/page': [[kind, id, label], …] }`. The same index
 * brands/index.json carries for the brands built into the app.
 */
export const pageIndex = (brand) => {
  const index = {}
  const add = (kind, id, label, sources) => {
    for (const entry of sources ?? []) (index[`${entry.book}/${entry.page}`] ??= []).push([kind, id, label])
  }
  for (const template of brand.templates ?? []) add('template', template.id, template.label, template.sources)
  for (const signature of brand.signatures ?? []) add('signature', signature.id, signature.label, signature.sources)
  brand.guide?.pages?.forEach((page, index) => add('guide', `guide-${String(index + 1).padStart(2, '0')}`, page.name ?? page.title, page.sources))
  return index
}

/**
 * Checks a pack manifest, returning the problems (none for a good one). A manifest from a newer
 * brandkit is refused rather than half-read.
 *
 * @typedef {object} PackManifest
 * @property {'brandkit-pack'} format
 * @property {number} version
 * @property {string} id            the brand's id, as in brand.json
 * @property {string} name
 * @property {string} [brandVersion] the brand's own version (brand.json `version`)
 * @property {string} [extension]   a brand extension the app provides by this name (see src/extensions)
 * @property {string} [menuLogo]    the brand menu's logo, a path in the pack
 * @property {Record<string, string>} [aliases]  path → the path in the pack holding the same bytes
 * @property {Record<string, string>} [library]  path → SHA-256 of brandkit's own copy
 * @property {Record<string, Array>} [pages]
 * @property {{ count: number, bytes: number }} [files]
 */
export const manifestProblems = (manifest) => {
  if (!manifest || typeof manifest !== 'object') return ['The pack has no manifest.']
  const problems = []
  if (manifest.format !== PACK_FORMAT) problems.push(`Not a brandkit pack (format ${JSON.stringify(manifest.format)}).`)
  if (!Number.isInteger(manifest.version) || manifest.version < 1) problems.push('The pack has no format version.')
  else if (manifest.version > PACK_VERSION) problems.push(`This pack is format ${manifest.version}; this brandkit reads up to ${PACK_VERSION}. Update brandkit to open it.`)
  if (!isBrandId(manifest.id)) problems.push(`The pack's brand id ${JSON.stringify(manifest.id)} is not a valid id.`)
  if (manifest.aliases && typeof manifest.aliases !== 'object') problems.push('The pack’s aliases are not a map.')
  return problems
}

/**
 * Reads a pack, or any zip holding a brand (a brand folder or a whole kit), into its definition and
 * files. Aliased paths are filled in, so a reader never sees the difference.
 *
 * Returns `{ manifest, brand, files, library }`: `manifest` is null for a zip that is not a pack,
 * `files` a Map of path (relative to the brand's folder) → bytes, and `library` a Map of path →
 * the library path holding the same bytes, for files the pack left to brandkit's own library.
 */
export const readPack = (bytes) => {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  if (data.byteLength > MAX_PACK_BYTES) throw new Error(`That file is larger than the ${Math.round(MAX_PACK_BYTES / 1024 / 1024)} MB a brand pack may be.`)
  let entries
  try { entries = unzipSync(data) } catch (error) { throw new Error('That file is not a zip brandkit can read.', { cause: error }) }
  const all = new Map()
  let expanded = 0
  for (const [path, value] of Object.entries(entries)) {
    if (path.endsWith('/')) continue
    const clean = cleanPath(path)
    if (!clean) continue
    expanded += value.byteLength
    if (expanded > MAX_PACK_BYTES * 2) throw new Error('That zip expands to more than a brand pack may hold.')
    all.set(clean, value)
  }

  const decode = (value) => JSON.parse(new TextDecoder().decode(value))
  if (all.has(PACK_MANIFEST)) {
    const manifest = decode(all.get(PACK_MANIFEST))
    const problems = manifestProblems(manifest)
    if (problems.length) throw new Error(problems.join(' '))
    if (!all.has('brand.json')) throw new Error('The pack has no brand.json.')
    const files = new Map([...all].filter(([path]) => path !== PACK_MANIFEST))
    const library = new Map()
    for (const [path, target] of Object.entries(manifest.aliases ?? {})) {
      const clean = cleanPath(path)
      if (!clean || files.has(clean) || typeof target !== 'string') continue
      if (target.startsWith('library:')) {
        const from = cleanPath(target.slice('library:'.length))
        if (from) library.set(clean, from)
        continue
      }
      const from = cleanPath(target)
      if (from && files.has(from)) files.set(clean, files.get(from))
    }
    const brand = decode(files.get('brand.json'))
    if (brand.id !== manifest.id) throw new Error(`The pack says it is ${manifest.id}, but its brand.json is ${brand.id}.`)
    return { manifest, brand, files, library }
  }

  // Not a pack: a brand folder zipped, or a kit (whose definition is at source/brand.json).
  const candidates = [...all.keys()].filter((path) => path === 'brand.json' || path.endsWith('/brand.json')).sort((a, b) => a.split('/').length - b.split('/').length)
  if (!candidates.length) throw new Error('There is no brand.json in this zip.')
  const definition = candidates[0]
  let root = definition.slice(0, -'brand.json'.length)
  // In a kit the definition is in source/, and the kit's root (one up) holds the fonts.
  if (root.endsWith('source/')) root = root.slice(0, -'source/'.length)
  const files = new Map([...all].filter(([path]) => path.startsWith(root)).map(([path, value]) => [path.slice(root.length), value]))
  if (definition !== `${root}brand.json`) files.set('brand.json', all.get(definition))
  return { manifest: null, brand: decode(all.get(definition)), files, library: new Map() }
}

/**
 * Checks a catalog and resolves its pack URLs against where it was fetched from. Entries that are
 * not usable are dropped rather than failing the whole list.
 *
 * A catalog: `{ format: 'brandkit-catalog', version: 1, name?, packs: [{ id, name, url, sha256?,
 * bytes?, brandVersion?, description?, menuLogo?, pages? }] }`.
 */
export const readCatalog = (catalog, baseUrl) => {
  if (!catalog || catalog.format !== CATALOG_FORMAT) throw new Error('That is not a brandkit catalog.')
  if (catalog.version > CATALOG_VERSION) throw new Error(`That catalog is format ${catalog.version}; this brandkit reads up to ${CATALOG_VERSION}.`)
  const resolve = (value) => {
    if (!value) return null
    try {
      const url = new URL(value, baseUrl)
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null
    } catch { return null }
  }
  const packs = []
  for (const entry of Array.isArray(catalog.packs) ? catalog.packs : []) {
    const url = resolve(entry?.url)
    if (!isBrandId(entry?.id) || !url) continue
    packs.push({
      id: entry.id,
      name: typeof entry.name === 'string' && entry.name ? entry.name : entry.id,
      url,
      ...(typeof entry.sha256 === 'string' ? { sha256: entry.sha256 } : {}),
      ...(Number.isFinite(entry.bytes) ? { bytes: entry.bytes } : {}),
      ...(typeof entry.brandVersion === 'string' ? { brandVersion: entry.brandVersion } : {}),
      ...(typeof entry.description === 'string' ? { description: entry.description } : {}),
      ...(resolve(entry.menuLogo) ? { menuLogo: resolve(entry.menuLogo) } : {}),
      ...(entry.pages && typeof entry.pages === 'object' ? { pages: entry.pages } : {})
    })
  }
  return { name: typeof catalog.name === 'string' ? catalog.name : null, url: baseUrl, packs }
}

/**
 * Brand bundles: several brands in one zip, for a client, an agency or a family of brands that
 * travel together. A bundle is a catalog and its packs, zipped:
 *
 *   brandkit-bundle.json   { format: 'brandkit-bundle', version: 1, name?, description?,
 *                            packs: [{ id, name, file, sha256, bytes, brandVersion?, description?, menuLogo? }] }
 *   <id>.zip               each brand's pack, exactly as `brandkit pack` writes it
 *   <id>.logo.svg          each brand's menu logo
 *
 * Each pack inside is an ordinary pack, so opening a bundle is opening each of its packs; a pack
 * taken out of a bundle opens on its own anywhere.
 */
export const isBundle = (bytes) => {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  try { return Boolean(unzipSync(data, { filter: (file) => file.name === BUNDLE_MANIFEST })[BUNDLE_MANIFEST]) } catch { return false }
}

/** Checks a bundle manifest, returning the problems (none for a good one). */
export const bundleProblems = (manifest) => {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return ['The bundle has no manifest.']
  const problems = []
  if (manifest.format !== BUNDLE_FORMAT) problems.push(`Not a brandkit bundle (format ${JSON.stringify(manifest.format)}).`)
  if (!Number.isInteger(manifest.version) || manifest.version < 1) problems.push('The bundle has no format version.')
  else if (manifest.version > BUNDLE_VERSION) problems.push(`This bundle is format ${manifest.version}; this brandkit reads up to ${BUNDLE_VERSION}. Update brandkit to open it.`)
  if (!Array.isArray(manifest.packs) || !manifest.packs.length) problems.push('The bundle lists no brands.')
  const ids = new Set()
  for (const entry of Array.isArray(manifest.packs) ? manifest.packs : []) {
    if (!isBrandId(entry?.id)) problems.push(`The bundle lists a brand id ${JSON.stringify(entry?.id)} that is not a valid id.`)
    else if (ids.has(entry.id)) problems.push(`The bundle lists ${entry.id} twice.`)
    ids.add(entry?.id)
    if (typeof entry?.file !== 'string' || !cleanPath(entry.file)) problems.push(`The bundle gives ${entry?.id ?? 'a brand'} no file.`)
  }
  return problems
}

/**
 * Reads a bundle into its manifest and the bytes of each brand's pack, in the manifest's order:
 * `{ manifest, packs: [{ entry, bytes, menuLogo }] }`. The packs are not read here: hand each to
 * readPack (or installPack). A pack's SHA-256, where listed, is checked by verifyBundle.
 */
export const readBundle = (bytes) => {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  if (data.byteLength > MAX_PACK_BYTES) throw new Error(`That file is larger than the ${Math.round(MAX_PACK_BYTES / 1024 / 1024)} MB a brand bundle may be.`)
  let entries
  try { entries = unzipSync(data) } catch (error) { throw new Error('That file is not a zip brandkit can read.', { cause: error }) }
  if (!entries[BUNDLE_MANIFEST]) throw new Error('That zip is not a brand bundle.')
  let manifest
  try { manifest = JSON.parse(new TextDecoder().decode(entries[BUNDLE_MANIFEST])) } catch { manifest = null }
  const problems = bundleProblems(manifest)
  if (problems.length) throw new Error(problems.join(' '))
  const packs = manifest.packs.map((entry) => {
    const file = cleanPath(entry.file)
    if (!entries[file]) throw new Error(`The bundle lists ${entry.id} as ${file}, which it does not hold.`)
    const logo = entry.menuLogo && cleanPath(entry.menuLogo)
    return { entry, bytes: entries[file], menuLogo: logo && entries[logo] ? entries[logo] : null }
  })
  return { manifest, packs }
}

/** Checks each pack in a read bundle against the SHA-256 and size its manifest lists. */
export const verifyBundle = async ({ packs }) => {
  for (const { entry, bytes } of packs) {
    if (Number.isFinite(entry.bytes) && entry.bytes !== bytes.byteLength) throw new Error(`${entry.id} in this bundle is not the size its manifest says; rebuild the bundle.`)
    if (typeof entry.sha256 === 'string' && entry.sha256.toLowerCase() !== await sha256(bytes)) throw new Error(`${entry.id} in this bundle does not match its manifest's SHA-256; rebuild the bundle.`)
  }
  return true
}
