// Where a brand's definition and files come from: built into the app, opened from a zip or a
// brand.json, or created here and kept in this browser's storage.
//
// A source answers two questions about a path relative to the brand's folder: its URL (for an
// <img> or a @font-face) and its bytes (for outlining type and building the kit). A path the
// brand does not carry itself (a starter brand names the shared Inter and Space Mono files) is
// looked up in the built-in brands' folders.

import { unzip } from '../export/render.js'

// A brand's history (an earlier definition kept for the record) is not served with the app.
const FILES = import.meta.glob(['../../brands/**/*', '!../../brands/*/history/**'], { query: '?url', import: 'default', eager: true })
const DEFINITIONS = import.meta.glob('../../brands/*/brand.json', { import: 'default' })

const idOf = (path) => path.split('/').at(-2)
// The brand menu's names come from a small manifest (brands/index.json, checked by the tests), so
// no definition is bundled until it is chosen.
import MANIFEST from '../../brands/index.json'
export const builtInName = (id) => MANIFEST.find((entry) => entry.id === id)?.name ?? id
/** The built-in brand's logo for the brand menu, pre-drawn by scripts/menu-logos.mjs, or null. */
export const menuLogoUrl = (id) => FILES[`../../brands/${id}/logo-menu.svg`] ?? null
export const BUILT_IN = Object.keys(DEFINITIONS).map(idOf).sort((a, b) => (a === 'ddcnorth' ? -1 : b === 'ddcnorth' ? 1 : a.localeCompare(b)))

const libraryUrl = (relative) => {
  for (const id of BUILT_IN) {
    const url = FILES[`../../brands/${id}/${relative}`]
    if (url) return url
  }
  return null
}

const fetchBytes = async (url, relative) => {
  if (!url) throw new Error(`${relative} is not in this brand's files`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${relative}: ${response.status}`)
  return response.arrayBuffer()
}

const urlSource = (urlOf, label) => ({
  label,
  url: urlOf,
  read: (relative) => fetchBytes(urlOf(relative), relative),
  has: (relative) => Boolean(urlOf(relative))
})

export const loadBuiltIn = async (id) => {
  const brand = await DEFINITIONS[`../../brands/${id}/brand.json`]()
  return { brand: structuredClone(brand), source: urlSource((relative) => FILES[`../../brands/${id}/${relative}`] ?? libraryUrl(relative), 'built in') }
}

/** A source over files held in memory (an opened zip), falling back to the built-in library. */
export const memorySource = (files, label) => {
  const urls = new Map()
  const urlOf = (relative) => {
    const bytes = files.get(relative)
    if (!bytes) return libraryUrl(relative)
    if (!urls.has(relative)) urls.set(relative, URL.createObjectURL(new Blob([bytes])))
    return urls.get(relative)
  }
  return {
    label,
    url: urlOf,
    read: async (relative) => (files.has(relative) ? files.get(relative).slice().buffer : fetchBytes(libraryUrl(relative), relative)),
    has: (relative) => files.has(relative) || Boolean(libraryUrl(relative))
  }
}

export const librarySource = () => urlSource(libraryUrl, 'library')

/** Add a brand's portable imported files to any existing source. */
export const withBrandAssets = (brand, source) => {
  if (!brand.assets) return source
  const files = new Map(Object.entries(brand.assets).map(([path, data]) => [path, Uint8Array.from(atob(data), (char) => char.charCodeAt(0))]))
  const urls = new Map()
  return {
    label: source.label,
    url: (path) => {
      if (!files.has(path)) return source.url(path)
      if (!urls.has(path)) urls.set(path, URL.createObjectURL(new Blob([files.get(path)])))
      return urls.get(path)
    },
    read: (path) => files.has(path) ? Promise.resolve(files.get(path).slice().buffer) : source.read(path),
    has: (path) => files.has(path) || source.has(path)
  }
}

/**
 * Opens a brand from a dropped or chosen file: a brand.json on its own, or a zip holding one
 * (a brand folder, or a whole kit, whose definition is at source/brand.json).
 */
export const openBrandFile = async (file) => {
  if (/\.json$/i.test(file.name)) {
    return { brand: JSON.parse(await file.text()), source: librarySource(), files: null }
  }
  const all = await unzip(await file.arrayBuffer())
  const candidates = [...all.keys()].filter((path) => path.endsWith('brand.json')).sort((a, b) => a.split('/').length - b.split('/').length)
  if (!candidates.length) throw new Error('There is no brand.json in this zip.')
  const definition = candidates[0]
  // The brand's folder is the one holding brand.json; in a kit that is source/, and the kit's
  // root (one up) holds the fonts.
  let root = definition.slice(0, -'brand.json'.length)
  if (root.endsWith('source/')) root = root.slice(0, -'source/'.length)
  const files = new Map([...all].filter(([path]) => path.startsWith(root)).map(([path, bytes]) => [path.slice(root.length), bytes]))
  const brand = JSON.parse(new TextDecoder().decode(all.get(definition)))
  return { brand, source: memorySource(files, file.name), files }
}

// Brands made or edited here are kept in localStorage, definitions only: their fonts come from
// the built-in library.
const STORE = 'brandkit:brands'

export const savedBrands = () => {
  try { return JSON.parse(localStorage.getItem(STORE) ?? '{}') } catch { return {} }
}

export const saveBrand = (brand, { strict = false } = {}) => {
  const all = savedBrands()
  all[brand.id] = brand
  try { localStorage.setItem(STORE, JSON.stringify(all)) } catch (error) {
    if (strict) throw new Error('This brand could not be saved in browser storage. Free some space or use a smaller package; your source package is unchanged.', { cause: error })
  }
}

export const forgetBrand = (id) => {
  const all = savedBrands()
  delete all[id]
  localStorage.setItem(STORE, JSON.stringify(all))
}
