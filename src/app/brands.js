// Where a brand's definition and files come from: built into the app (brands/), installed in this
// browser from a pack (./pack-store.js), opened from a zip or a brand.json, or created here and kept
// in this browser's storage.
//
// A source answers two questions about a path relative to the brand's folder: its URL (for an
// <img> or a @font-face) and its bytes (for outlining type and building the kit). A path the
// brand does not carry itself (a starter brand names the shared Inter and Space Mono files) is
// looked up in brandkit's library/, then in the built-in brands' folders.

import { readPack } from '../pack/format.js'
import { isPage, packPageUrl } from './pack-pages.js'

// A brand's history (an earlier definition kept for the record) is not served with the app.
const FILES = import.meta.glob(['../../brands/**/*', '!../../brands/*/history/**'], { query: '?url', import: 'default', eager: true })
// brandkit's library (library/) is served as it is, at <base>library/ (see brandkitLibrary() in
// src/vite.js), so a pack page served by the pack worker can reach it by path too.
import LIBRARY_FILES from 'virtual:brandkit-library'
const LIBRARY = new Set(LIBRARY_FILES)
const LIBRARY_BASE = `${import.meta.env.BASE_URL}library/`
const DEFINITIONS = import.meta.glob('../../brands/*/brand.json', { import: 'default' })

const idOf = (path) => path.split('/').at(-2)
// The brand menu's names come from a small manifest (brands/index.json, checked by the tests), so
// no definition is bundled until it is chosen.
import MANIFEST from '../../brands/index.json'
export const builtInName = (id) => MANIFEST.find((entry) => entry.id === id)?.name ?? id
/** The built-in brands' entries in that manifest, with the manual pages each is built from. */
export const BUILT_IN_INDEX = MANIFEST
/** The built-in brand's logo for the brand menu, pre-drawn by scripts/menu-logos.mjs, or null. */
export const menuLogoUrl = (id) => FILES[`../../brands/${id}/logo-menu.svg`] ?? null
export const BUILT_IN = Object.keys(DEFINITIONS).map(idOf).sort((a, b) => (a === 'ddcnorth' ? -1 : b === 'ddcnorth' ? 1 : a.localeCompare(b)))

const libraryUrl = (relative) => {
  if (LIBRARY.has(relative)) return `${LIBRARY_BASE}${relative.split('/').map(encodeURIComponent).join('/')}`
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

// A blob URL is served with its Blob's type, and an image or page needs the right one: an SVG
// without image/svg+xml is not drawn by <img>, an HTML page without text/html is shown as text.
const TYPES = {
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', ico: 'image/x-icon',
  html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json', txt: 'text/plain', md: 'text/markdown',
  pdf: 'application/pdf', ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2', mp4: 'video/mp4', webm: 'video/webm', zip: 'application/zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
}
const typeOf = (path) => TYPES[/\.([a-z0-9]+)$/i.exec(path)?.[1]?.toLowerCase()] ?? ''
const objectUrl = (path, data) => {
  const type = typeOf(path)
  // Wrapping a Blob in another does not copy its bytes; it only gives the URL a type.
  return URL.createObjectURL(data instanceof Blob ? (data.type === type || !type ? data : new Blob([data], { type })) : new Blob([data], { type }))
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
    if (!urls.has(relative)) urls.set(relative, objectUrl(relative, bytes))
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

/**
 * A source over an installed brand's files (path → Blob, from IndexedDB). `library` maps paths the
 * pack left to brandkit's library to the library's path for them. Given the brand's `id`, its
 * pages get real addresses from the pack worker (./pack-pages.js) when it is running, so their
 * relative links resolve; everything else, and every page where the worker cannot run, is a blob:.
 */
export const blobSource = (files, library, label, { id } = {}) => {
  const urls = new Map()
  const fallback = (relative) => libraryUrl(library.get(relative) ?? relative)
  return {
    label,
    url: (relative) => {
      const blob = files.get(relative)
      const page = id && blob && isPage(relative) ? packPageUrl(id, relative) : null
      if (page) return page
      if (!blob) return fallback(relative)
      if (!urls.has(relative)) urls.set(relative, objectUrl(relative, blob))
      return urls.get(relative)
    },
    read: (relative) => (files.has(relative) ? files.get(relative).arrayBuffer() : fetchBytes(fallback(relative), relative)),
    has: (relative) => files.has(relative) || Boolean(fallback(relative))
  }
}

/** Add a brand's portable imported files to any existing source. */
export const withBrandAssets = (brand, source) => {
  if (!brand.assets) return source
  const files = new Map(Object.entries(brand.assets).map(([path, data]) => [path, Uint8Array.from(atob(data), (char) => char.charCodeAt(0))]))
  const urls = new Map()
  return {
    label: source.label,
    url: (path) => {
      if (!files.has(path)) return source.url(path)
      if (!urls.has(path)) urls.set(path, objectUrl(path, files.get(path)))
      return urls.get(path)
    },
    read: (path) => files.has(path) ? Promise.resolve(files.get(path).slice().buffer) : source.read(path),
    has: (path) => files.has(path) || source.has(path)
  }
}

/**
 * Opens a brand from a dropped or chosen file: a brand.json on its own, or a zip holding one (a
 * brand pack, a brand folder, or a whole kit, whose definition is at source/brand.json). A zip's
 * bytes come back too, so it can be kept in this browser (./pack-store.js).
 */
export const openBrandFile = async (file) => {
  if (/\.json$/i.test(file.name)) {
    return { brand: JSON.parse(await file.text()), source: librarySource(), files: null, bytes: null }
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { brand, files, library } = readPack(bytes)
  const source = memorySource(files, file.name)
  const url = source.url
  // A file a pack left to the library is served from the library, under the library's path.
  return { brand, source: { ...source, url: (relative) => (files.has(relative) ? url(relative) : libraryUrl(library.get(relative) ?? relative)) }, files, bytes }
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
