// Catalogs: lists of brand packs someone hosts, so the brand menu can offer brands this copy of
// brandkit does not carry. A catalog is a JSON file (see readCatalog in ../pack/format.js), made
// by `node scripts/pack.mjs` beside the packs it lists.
//
// Where catalogs come from:
// - VITE_BRANDKIT_CATALOGS, set when the site is built (space- or comma-separated URLs): the
//   site's own brands, offered to everyone who opens it.
// - ?catalog=<url> in a link, remembered in this browser from then on.
//
// The last copy of each catalog is kept in localStorage, so the menu still lists its brands
// offline; brands already installed open without it.

import { readCatalog } from '../pack/format.js'

const SAVED = 'brandkit:catalogs'
const CACHE = 'brandkit:catalog-cache'

const split = (value) => String(value ?? '').split(/[\s,]+/).map((entry) => entry.trim()).filter(Boolean)
const absolute = (value) => {
  try {
    const url = new URL(value, globalThis.location?.href)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch { return null }
}

/** The catalogs the site was built with. */
export const siteCatalogs = () => split(import.meta.env?.VITE_BRANDKIT_CATALOGS).map(absolute).filter(Boolean)

const readJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback } }
const writeJson = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* not kept */ } }

/** Catalogs added in this browser. */
export const addedCatalogs = () => readJson(SAVED, []).filter((entry) => typeof entry === 'string')

export const addCatalog = (url) => {
  const value = absolute(url)
  if (!value || siteCatalogs().includes(value)) return value
  writeJson(SAVED, [...new Set([...addedCatalogs(), value])])
  return value
}

export const removeCatalog = (url) => writeJson(SAVED, addedCatalogs().filter((entry) => entry !== url))

/** Every catalog to read: the site's, then this browser's. */
export const allCatalogs = () => [...new Set([...siteCatalogs(), ...addedCatalogs()])]

/** A catalog's last copy, from an earlier visit, or null. */
const cached = (url) => readJson(CACHE, {})[url] ?? null
const remember = (url, catalog) => writeJson(CACHE, { ...readJson(CACHE, {}), [url]: catalog })

/**
 * Reads one catalog, falling back to its last copy when the host cannot be reached. Returns
 * `{ url, name, packs, stale, error }`.
 */
export const fetchCatalog = async (url) => {
  try {
    const response = await fetch(url, { cache: 'no-cache', signal: AbortSignal.timeout?.(15_000) })
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    const catalog = readCatalog(await response.json(), response.url || url)
    remember(url, catalog)
    return { ...catalog, url, stale: false, error: null }
  } catch (error) {
    const last = cached(url)
    if (last) return { ...last, url, stale: true, error: error.message }
    return { url, name: null, packs: [], stale: true, error: error.message }
  }
}

/** Every catalog's brands, the first catalog to list an id winning. */
export const fetchCatalogs = async (urls = allCatalogs()) => {
  const catalogs = await Promise.all(urls.map(fetchCatalog))
  const brands = new Map()
  for (const catalog of catalogs) for (const pack of catalog.packs) if (!brands.has(pack.id)) brands.set(pack.id, { ...pack, catalog: catalog.url, catalogName: catalog.name })
  return { catalogs, brands }
}
