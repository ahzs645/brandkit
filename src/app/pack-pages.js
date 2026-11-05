// Real addresses for the pages inside installed brand packs. public/pack-sw.js serves
// <base>packs/<id>/<path> from IndexedDB, so a page from a pack opens in a folder of its own and
// its relative links (images beside it, ../fonts/…, other pages) resolve.
//
// The worker's scope is <base>packs/: it answers documents opened there (a new tab, an iframe)
// and what they load, never the app's own requests. So only pages get these addresses; the
// images and fonts the app draws itself keep their blob: URLs.

const BASE = import.meta.env?.BASE_URL ?? '/'
const SCOPE = `${BASE}packs/`

let ready = false
let registering = null

/** Whether pack pages can be given real addresses now. */
export const packPagesReady = () => ready

/**
 * Registers the worker once; resolves to true when it is active, false where it cannot run (no
 * service workers, a private window that refuses them, a file:// page) or after `wait` ms.
 */
export const registerPackPages = ({ wait = 4000 } = {}) => {
  if (!registering) {
    registering = (async () => {
      const workers = globalThis.navigator?.serviceWorker
      if (!workers || !globalThis.isSecureContext) return false
      try {
        const registration = await workers.register(`${BASE}pack-sw.js`, { scope: SCOPE })
        const worker = registration.active ?? registration.waiting ?? registration.installing
        if (!registration.active && worker) {
          await new Promise((resolve) => {
            const check = () => { if (worker.state === 'activated' || worker.state === 'redundant') resolve() }
            worker.addEventListener('statechange', check)
            check()
          })
        }
        ready = Boolean(registration.active)
        return ready
      } catch {
        return false
      }
    })()
  }
  return Promise.race([registering, new Promise((resolve) => setTimeout(resolve, wait, false))])
}

/** A page's address inside an installed pack, or null if pack pages cannot be served here. */
export const packPageUrl = (id, path) => (ready ? `${SCOPE}${encodeURIComponent(id)}/${path.split('/').map(encodeURIComponent).join('/')}` : null)

/** A page, rather than a file the app itself draws: what gets a real address. */
export const isPage = (path) => /\.html?$/i.test(path)
