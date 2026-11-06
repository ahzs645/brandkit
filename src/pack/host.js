// Data-only contract for hosts which already inspect and bound their archives.
// No filesystem, network, DOM, rendering or automatic library downloads.
import { CATALOG_FORMAT, CATALOG_VERSION, PACK_MANIFEST, isBrandId, manifestProblems } from './format.js'

export class BrandPackError extends Error {
  constructor(message, code = 'invalid_pack') { super(message); this.name = 'BrandPackError'; this.code = code }
}
const fail = (message, code) => { throw new BrandPackError(message, code) }
const object = (bytes, name) => {
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes))
    if (value && typeof value === 'object' && !Array.isArray(value)) return value
  } catch { /* Return a useful contract error below. */ }
  return fail(`${name} must contain a JSON object.`)
}
export const packMemberPath = (value) => {
  if (typeof value !== 'string' || !value || value.length > 512 || /[\\\u0000-\u001f\u007f]/.test(value)
    || value.startsWith('/') || /^[a-z]:/i.test(value) || value.split('/').some(part => !part || part === '.' || part === '..')) {
    return fail('Use a relative path inside the brand pack.')
  }
  return value
}

/** All explicit brand definitions, allowing a host to offer selection instead of choosing one. */
export const brandDefinitions = (entries) => [...entries.keys()].filter(path => /(^|\/)brand\.json$/.test(path))

/**
 * Interpret a previously verified file map. The caller owns ZIP bounds, CRCs, links and duplicates.
 * `definitionPath` selects exactly one brand. Original members are distinguished from aliases so
 * a host can produce a portable, scoped export without duplicating alias bytes.
 */
export const inspectBrandFiles = (entries, { definitionPath = 'brand.json', maxManifestBytes = 256 * 1024, maxAliases = 4000 } = {}) => {
  packMemberPath(definitionPath)
  if (!(entries instanceof Map) || !entries.has(definitionPath)) return fail('The selected brand.json is absent from the archive.')
  for (const [path, bytes] of entries) {
    packMemberPath(path)
    if (!(bytes instanceof Uint8Array)) return fail('Brand files must contain byte arrays.')
  }
  const root = definitionPath.slice(0, -'brand.json'.length)
  const assetRoot = root.endsWith('source/') ? root.slice(0, -7) : root
  const definitions = brandDefinitions(entries)
  const children = definitions.filter(path => path !== definitionPath).map(path => path.slice(0, -'brand.json'.length))
    .filter(path => path !== assetRoot && path.startsWith(assetRoot))
  const files = new Map([...entries].filter(([path]) => path.startsWith(assetRoot) && !children.some(child => path.startsWith(child)))
    .map(([path, bytes]) => [path.slice(assetRoot.length), bytes]))
  const archiveFiles = new Set(files.keys())
  const brand = object(entries.get(definitionPath), 'brand.json')
  if (!isBrandId(brand.id) || typeof brand.name !== 'string' || !brand.name.trim() || brand.name.length > 200) {
    return fail('Each brand.json needs a stable id (lowercase letters, digits and dashes, up to 64 characters) and a name (up to 200 characters).')
  }
  const warnings = []
  const library = new Map()
  let manifest = null
  if (files.has(PACK_MANIFEST)) {
    const bytes = files.get(PACK_MANIFEST)
    if (bytes.byteLength > maxManifestBytes) return fail('Pack manifest exceeds its size limit.', 'limit_exceeded')
    manifest = object(bytes, PACK_MANIFEST)
    const problems = manifestProblems(manifest)
    if (problems.length || manifest.id !== brand.id) return fail(`Unsupported brand pack version or mismatched brand id. ${problems.join(' ')}`.trim())
    const aliases = manifest.aliases === undefined ? {} : manifest.aliases
    if (!aliases || typeof aliases !== 'object' || Array.isArray(aliases)) return fail('Invalid pack aliases.')
    if (Object.keys(aliases).length > maxAliases) return fail('The pack contains too many aliases.', 'limit_exceeded')
    const resolve = (path, seen = new Set()) => {
      if (seen.has(path) || seen.size > 20) return fail('Pack aliases contain a cycle.')
      seen.add(path)
      if (files.has(path)) return { bytes: files.get(path) }
      const target = Object.hasOwn(aliases, path) ? aliases[path] : undefined
      if (typeof target !== 'string') return null
      if (target.startsWith('library:')) return { libraryPath: packMemberPath(target.slice(8)) }
      return resolve(packMemberPath(target), seen)
    }
    for (const [path, target] of Object.entries(aliases)) {
      packMemberPath(path)
      if (typeof target !== 'string') return fail('Invalid pack alias target.')
      const resolved = resolve(path)
      if (resolved?.bytes) files.set(path, resolved.bytes)
      else if (resolved?.libraryPath) {
        library.set(path, resolved.libraryPath)
        warnings.push(`Shared brandkit library file unavailable in this pack: ${path} → library:${resolved.libraryPath}.`)
      } else return fail(`Missing pack alias target: ${path}.`)
    }
    if (manifest.library !== undefined) {
      if (!manifest.library || typeof manifest.library !== 'object' || Array.isArray(manifest.library)) return fail('Invalid shared library map.')
      for (const [path, digest] of Object.entries(manifest.library)) {
        packMemberPath(path)
        if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/i.test(digest)) return fail('Invalid shared library checksum.')
        library.set(path, path)
        warnings.push(`Shared brandkit library dependency: ${path}. Supply permitted font files before using them.`)
      }
    }
  }
  files.set('brand.json', entries.get(definitionPath))
  if (root.endsWith('source/')) archiveFiles.delete(definitionPath.slice(assetRoot.length))
  archiveFiles.add('brand.json')
  return { brand, manifest, root, assetRoot, files, archiveFiles, library, warnings: [...new Set(warnings)], exportOriginal: !root && definitions.length === 1 }
}

/** Metadata for reference pickers / chat. It is untrusted data, never model instructions. */
export const brandReferenceSummary = (brand) => {
  const keys = ['id', 'name', 'version', 'displayVersion', 'source', 'status', 'colours', 'colourNames', 'roles', 'typography', 'fonts', 'logoPolicy', 'organization', 'applicationGuidance', 'officialResourcesNote']
  return Object.fromEntries(keys.filter(key => brand[key] !== undefined).map(key => [key, brand[key]]))
}

/** Strict publishing/host checks; the browser's existing readCatalog keeps its filtering behavior. */
export const catalogProblems = (catalog) => {
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog) || catalog.format !== CATALOG_FORMAT) return ['Not a brandkit catalog.']
  if (catalog.version !== CATALOG_VERSION || !Array.isArray(catalog.packs)) return ['Unsupported brand catalog version or pack list.']
  const problems = [], ids = new Set()
  for (const entry of catalog.packs) {
    if (!entry || typeof entry !== 'object' || !isBrandId(entry.id) || ids.has(entry.id)) problems.push('Catalog contains an invalid or duplicate brand id.')
    ids.add(entry?.id)
    let url
    try { url = new URL(entry?.url, 'https://brandkit.invalid/catalog.json') } catch { /* Report below. */ }
    if (typeof entry?.url !== 'string' || !entry.url || !url || !['https:', 'http:'].includes(url.protocol) || url.username || url.password) problems.push('Catalog contains an invalid pack URL.')
    if (entry?.sha256 !== undefined && (typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(entry.sha256))) problems.push('Catalog contains an invalid SHA-256.')
    if (entry?.bytes !== undefined && (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0)) problems.push('Catalog contains an invalid byte size.')
  }
  return problems
}
export const verifyCatalogEntry = (entry, { sha256, bytes, id } = {}) => {
  const problems = catalogProblems({ format: CATALOG_FORMAT, version: CATALOG_VERSION, packs: [entry] })
  if (problems.length) return fail(problems.join(' '), 'invalid_catalog')
  if (typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(sha256) || !Number.isSafeInteger(bytes) || bytes < 0) return fail('Supply a computed SHA-256 and byte size.', 'catalog_integrity')
  if ((entry.sha256 !== undefined && entry.sha256.toLowerCase() !== sha256.toLowerCase()) || (entry.bytes !== undefined && entry.bytes !== bytes)
    || (id !== undefined && entry.id !== id)) return fail('Catalog checksum, size or identity mismatch.', 'catalog_integrity')
  return true
}
/** Match local archive members only. This resolves metadata; it never downloads catalog URLs. */
export const catalogEntriesForPath = (catalog, catalogPath, memberPath) => {
  const problems = catalogProblems(catalog)
  if (problems.length) return fail(problems.join(' '), 'invalid_catalog')
  packMemberPath(catalogPath); packMemberPath(memberPath)
  const base = new URL(catalogPath, 'https://brandkit.invalid/')
  return catalog.packs.filter(entry => {
    try {
      const url = new URL(entry.url, base)
      return url.origin === base.origin && !url.search && !url.hash && decodeURIComponent(url.pathname).slice(1) === memberPath
    } catch { return false }
  })
}

/** Existing buildCatalog contract, shared by source-folder builds and existing-ZIP indexing. */
export const buildCatalog = (packs, { name, baseUrl, description } = {}) => ({
  format: CATALOG_FORMAT,
  version: CATALOG_VERSION,
  ...(name ? { name } : {}),
  ...(description ? { description } : {}),
  packs: packs.map(({ manifest, sha256, bytes, file, description: about, menuLogo }) => ({
    id: manifest.id,
    name: manifest.name,
    url: baseUrl ? new URL(file, baseUrl).href : file,
    sha256,
    bytes: bytes.byteLength,
    ...(manifest.brandVersion ? { brandVersion: manifest.brandVersion } : {}),
    ...(about ? { description: about } : {}),
    ...(manifest.menuLogo && menuLogo !== null ? { menuLogo: baseUrl ? new URL(menuLogo ?? `${manifest.id}.logo.svg`, baseUrl).href : menuLogo ?? `${manifest.id}.logo.svg` } : {}),
    ...(manifest.pages ? { pages: manifest.pages } : {})
  }))
})
