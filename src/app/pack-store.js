// Brand packs kept in this browser, in IndexedDB, so a brand opened from a link or a catalog is
// still here after a reload, offline, without the site carrying it.
//
// Files are stored by content: each distinct file once, under its SHA-256, however many brands
// (or versions of one brand) hold it. A brand is a record naming its files' hashes. Installing an
// update stores only the files that changed; removing a brand deletes only the files no other
// brand still uses.
//
//   blobs  { hash, blob, size }                       one per distinct file
//   packs  { id, name, files: { path: hash }, … }     one per installed brand
//
// IndexedDB keeps Blobs on disk, so opening a brand does not read its files into memory: each is
// read when it is first drawn or downloaded.

import { MAX_PACK_BYTES, readPack, sha256 } from '../pack/format.js'

const DB_NAME = 'brandkit-packs'
const DB_VERSION = 1

let opening = null
const db = () => {
  if (opening) return opening
  opening = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('This browser has no IndexedDB, so brands cannot be kept in it.')); return }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains('blobs')) database.createObjectStore('blobs', { keyPath: 'hash' })
      if (!database.objectStoreNames.contains('packs')) database.createObjectStore('packs', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened.'))
    request.onblocked = () => reject(new Error('Another brandkit tab is upgrading its storage; close it and try again.'))
  })
  opening.catch(() => { opening = null })
  return opening
}

const done = (transaction) => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve()
  transaction.onerror = () => reject(transaction.error)
  transaction.onabort = () => reject(transaction.error ?? new Error('The browser refused to store the brand (it may be out of space).'))
})
const result = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

/** Every installed brand's record, without its file list (for menus). */
export const installedPacks = async () => {
  try {
    const database = await db()
    const records = await result(database.transaction('packs').objectStore('packs').getAll())
    return records.map(({ files: _files, library: _library, ...rest }) => rest).sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    // No storage (private browsing, blocked): nothing is installed.
    return []
  }
}

/** One installed brand's full record, or null. */
export const installedPack = async (id) => {
  try {
    const database = await db()
    return (await result(database.transaction('packs').objectStore('packs').get(id))) ?? null
  } catch { return null }
}

/**
 * Stores a pack (or any zip holding a brand). Returns the brand's record. `origin` says where it
 * came from: `{ url, catalog }` for a link or a catalog entry, nothing for a file from disk.
 */
export const installPack = async (bytes, origin = {}) => {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes instanceof Blob ? await bytes.arrayBuffer() : bytes)
  const packHash = await sha256(data)
  const { manifest, brand, files, library } = readPack(data)

  // Hash each distinct file once; a file the pack holds at several paths is one blob.
  const byPath = {}
  const distinct = new Map()
  let logical = 0
  for (const [path, value] of files) {
    const hash = await sha256(value)
    byPath[path] = hash
    logical += value.byteLength
    if (!distinct.has(hash)) distinct.set(hash, value)
  }

  const database = await db()
  const store = database.transaction('blobs').objectStore('blobs')
  const present = new Set(await Promise.all([...distinct.keys()].map(async (hash) => ((await result(store.getKey(hash))) ? hash : null))))
  const now = new Date().toISOString()
  const previous = await installedPack(brand.id)
  const record = {
    id: brand.id,
    name: brand.name ?? manifest?.name ?? brand.id,
    brandVersion: manifest?.brandVersion ?? (brand.version ? String(brand.displayVersion ?? brand.version) : null),
    extension: brand.extension ?? null,
    packHash,
    packBytes: data.byteLength,
    url: origin.url ?? null,
    catalog: origin.catalog ?? null,
    installedAt: previous?.installedAt ?? now,
    updatedAt: now,
    etag: origin.etag ?? null,
    // The menu's logo is kept in the record, so the brand menu can draw it without opening the brand.
    menuLogoSvg: (() => {
      const logo = files.get(manifest?.menuLogo ?? 'logo-menu.svg')
      return logo && logo.byteLength < 96 * 1024 ? new TextDecoder().decode(logo) : null
    })(),
    pages: manifest?.pages ?? null,
    files: byPath,
    library: Object.fromEntries(library),
    bytes: logical,
    newBytes: 0
  }

  const transaction = database.transaction(['blobs', 'packs'], 'readwrite')
  const blobs = transaction.objectStore('blobs')
  for (const [hash, value] of distinct) {
    if (present.has(hash)) continue
    record.newBytes += value.byteLength
    blobs.put({ hash, size: value.byteLength, blob: new Blob([value]) })
  }
  transaction.objectStore('packs').put(record)
  await done(transaction)
  // An update leaves the previous version's files behind; drop the ones nothing uses now.
  if (previous) await collect()
  const { files: _files, library: _library, ...summary } = record
  return summary
}

/** Deletes every stored file that no installed brand names. */
export const collect = async () => {
  const database = await db()
  const transaction = database.transaction(['blobs', 'packs'], 'readwrite')
  const packs = await result(transaction.objectStore('packs').getAll())
  const used = new Set(packs.flatMap((pack) => Object.values(pack.files)))
  const blobs = transaction.objectStore('blobs')
  const keys = await result(blobs.getAllKeys())
  for (const key of keys) if (!used.has(key)) blobs.delete(key)
  await done(transaction)
}

/** Removes an installed brand, and the files only it used. */
export const removePack = async (id) => {
  const database = await db()
  const transaction = database.transaction('packs', 'readwrite')
  transaction.objectStore('packs').delete(id)
  await done(transaction)
  await collect()
}

/**
 * How much the installed brands take: `logical` is the sum of every brand's files as if each kept
 * its own copies, `stored` what is actually kept once shared files are counted once.
 */
export const storageUsage = async () => {
  try {
    const database = await db()
    const transaction = database.transaction(['blobs', 'packs'])
    const [packs, blobs] = await Promise.all([result(transaction.objectStore('packs').getAll()), result(transaction.objectStore('blobs').getAll())])
    const stored = blobs.reduce((sum, entry) => sum + entry.size, 0)
    return { brands: packs.length, files: blobs.length, logical: packs.reduce((sum, pack) => sum + (pack.bytes ?? 0), 0), stored }
  } catch {
    return { brands: 0, files: 0, logical: 0, stored: 0 }
  }
}

/**
 * Opens an installed brand: its definition and a map of path → Blob for a source (see
 * ./brands.js). Returns null if it is not installed.
 */
export const openInstalled = async (id) => {
  const record = await installedPack(id)
  if (!record) return null
  const database = await db()
  const store = database.transaction('blobs').objectStore('blobs')
  const hashes = [...new Set(Object.values(record.files))]
  const blobs = new Map((await Promise.all(hashes.map((hash) => result(store.get(hash))))).filter(Boolean).map((entry) => [entry.hash, entry.blob]))
  const files = new Map()
  const missing = []
  for (const [path, hash] of Object.entries(record.files)) {
    if (blobs.has(hash)) files.set(path, blobs.get(hash))
    else missing.push(path)
  }
  if (!files.has('brand.json')) throw new Error(`${record.name}'s files are no longer in this browser's storage. Remove it and add it again.`)
  const brand = JSON.parse(await files.get('brand.json').text())
  return { record, brand, files, library: new Map(Object.entries(record.library ?? {})), missing }
}

/** Gives up rather than hang on a host that never answers. */
export const FETCH_TIMEOUT_MS = 120_000

/**
 * Downloads a pack, reporting progress as `onProgress(received, total)` (total is null when the
 * host does not say). Returns `{ bytes, etag }`, or `{ notModified: true }` when `etag` is the
 * copy already installed and the host says it has not changed, so a revisit costs one request.
 * Errors say what went wrong: a host that blocks cross-origin requests needs a different fix from
 * a missing file.
 */
export const fetchPack = async (url, { onProgress, signal, etag } = {}) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  signal?.addEventListener('abort', () => controller.abort(), { once: true })
  const host = (() => { try { return new URL(url).host } catch { return url } })()
  try {
    let response
    try {
      // no-cache: the browser revalidates its own copy (a conditional request it makes itself, so no
      // CORS preflight), and an unchanged pack comes back from its cache.
      response = await fetch(url, { signal: controller.signal, redirect: 'follow', cache: 'no-cache' })
    } catch (error) {
      if (controller.signal.aborted) throw new Error(`Timed out downloading the brand from ${host}.`, { cause: error })
      throw new Error(`Could not reach ${host}. If the brand is on another site, that site has to allow cross-origin requests.`, { cause: error })
    }
    if (etag && response.ok && response.headers.get('etag') === etag) {
      response.body?.cancel?.().catch(() => {})
      return { notModified: true, etag }
    }
    if (!response.ok) throw new Error(`The brand could not be downloaded from ${host} (${response.status} ${response.statusText}).`)
    const total = Number(response.headers.get('content-length')) || null
    if (total && total > MAX_PACK_BYTES) throw new Error(`That brand is larger than the ${Math.round(MAX_PACK_BYTES / 1024 / 1024)} MB a pack may be.`)
    if (!response.body?.getReader) {
      const buffer = new Uint8Array(await response.arrayBuffer())
      onProgress?.(buffer.byteLength, total)
      return { bytes: buffer, etag: response.headers.get('etag') }
    }
    const reader = response.body.getReader()
    const chunks = []
    let received = 0
    for (;;) {
      const { done: finished, value } = await reader.read()
      if (finished) break
      received += value.byteLength
      if (received > MAX_PACK_BYTES) { controller.abort(); throw new Error(`That brand is larger than the ${Math.round(MAX_PACK_BYTES / 1024 / 1024)} MB a pack may be.`) }
      chunks.push(value)
      onProgress?.(received, total)
    }
    const bytes = new Uint8Array(received)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    return { bytes, etag: response.headers.get('etag') }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * The pack URL a link asks for (`?url=`), or null. Only http(s): a javascript: or data: URL here
 * would be a way round the checks a download goes through.
 */
export const readPackUrl = (search = globalThis.location?.search ?? '') => {
  const value = new URLSearchParams(search).get('url')?.trim()
  if (!value) return null
  try {
    const url = new URL(value, globalThis.location?.href)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch { return null }
}
