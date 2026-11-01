// Serves installed brand packs at real paths, so a pack's own pages work as they do in a kit:
//
//   <base>packs/<brand id>/<path in the pack>
//
// A page from a pack (a brand-details page, a website, a motion library) opened from a blob: URL has
// no folder around it, so its relative links (an image beside it, ../fonts/…, another page) lead
// nowhere. Under this worker the page has a real address, and everything it asks for relative to
// it is answered from the same IndexedDB store the app keeps packs in (src/app/pack-store.js):
// the brand's record maps each path to a SHA-256, and the file is the blob stored under it. A path
// the pack left to brandkit's library (or never had) is looked for in <base>library/.
//
// The worker's scope is <base>packs/ only: it never sees the app's own requests.

const BASE = self.location.pathname.replace(/pack-sw\.js$/, '')
const PREFIX = `${BASE}packs/`

const TYPES = {
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', ico: 'image/x-icon',
  html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
  json: 'application/json', txt: 'text/plain; charset=utf-8', md: 'text/markdown; charset=utf-8', csv: 'text/csv; charset=utf-8', xml: 'application/xml',
  pdf: 'application/pdf', ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2', mp4: 'video/mp4', webm: 'video/webm', zip: 'application/zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
}
const typeOf = (path) => TYPES[/\.([a-z0-9]+)$/i.exec(path)?.[1]?.toLowerCase()] ?? 'application/octet-stream'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

let database = null
const db = () => {
  if (database) return database
  database = new Promise((resolve, reject) => {
    const request = indexedDB.open('brandkit-packs')
    // The app creates the stores; a worker that gets here first finds nothing installed.
    request.onupgradeneeded = () => {
      const created = request.result
      if (!created.objectStoreNames.contains('blobs')) created.createObjectStore('blobs', { keyPath: 'hash' })
      if (!created.objectStoreNames.contains('packs')) created.createObjectStore('packs', { keyPath: 'id' })
    }
    request.onsuccess = () => {
      const opened = request.result
      // Let the app upgrade the database without waiting on this connection.
      opened.onversionchange = () => { opened.close(); database = null }
      resolve(opened)
    }
    request.onerror = () => { database = null; reject(request.error) }
  })
  return database
}
const get = (store, key) => db().then((opened) => new Promise((resolve, reject) => {
  const request = opened.transaction(store).objectStore(store).get(key)
  request.onsuccess = () => resolve(request.result ?? null)
  request.onerror = () => reject(request.error)
}))

/** A path as the pack stores it: decoded, no leading slash, nothing that climbs out of the brand. */
const clean = (value) => {
  let path
  try { path = decodeURIComponent(value) } catch { return null }
  path = path.replace(/^\/+/, '')
  if (path === '' || path.endsWith('/')) path += 'index.html'
  return path.split('/').some((part) => part === '..' || part === '.') ? null : path
}

// What brandkit's library holds (<base>library/index.json), read once per worker.
let library = null
const libraryFiles = () => {
  library ??= fetch(`${BASE}library/index.json`).then((response) => (response.ok ? response.json() : [])).then((paths) => new Set(paths)).catch(() => { library = null; return new Set() })
  return library
}

const notFound = () => new Response('Not in this brand’s pack.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

const answer = async (url) => {
  const rest = url.pathname.slice(PREFIX.length)
  const slash = rest.indexOf('/')
  const id = decodeURIComponent(slash < 0 ? rest : rest.slice(0, slash))
  if (slash < 0) return Response.redirect(`${url.origin}${PREFIX}${encodeURIComponent(id)}/`, 302)
  const path = clean(rest.slice(slash + 1))
  if (!path) return notFound()
  const record = await get('packs', id)
  if (!record) return notFound()
  const hash = record.files?.[path]
  if (hash) {
    const entry = await get('blobs', hash)
    if (entry) return new Response(entry.blob, { headers: { 'Content-Type': typeOf(path), 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' } })
  }
  // Left to brandkit's library by the pack (under the library's path for it), or never in it but
  // named by the brand (a starter brand's faces): served from the library, if it has the file.
  const shared = record.library?.[path] ?? path
  if (!(await libraryFiles()).has(shared)) return notFound()
  const response = await fetch(`${BASE}library/${shared.split('/').map(encodeURIComponent).join('/')}`).catch(() => null)
  return response?.ok ? response : notFound()
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(PREFIX) || event.request.method !== 'GET') return
  event.respondWith(answer(url).catch(() => new Response('This brand’s files could not be read.', { status: 500 })))
})
