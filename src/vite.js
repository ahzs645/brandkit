// brandkit's Vite plugin: serves a manual pack's page files, and copies them into the build.
//
//   import { manualPages } from 'brandkit/vite'
//   plugins: [manualPages({ pack: 'bc', mount: 'visual-guides' })]
//
// The pages are then at `${base}visual-guides/<book>/<page>.svg`, in `vite dev` and in the built
// site alike, which is what the library's `pageUrl` should point at.

import { cpSync, createReadStream, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const TYPES = {
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2'
}

export const packDir = (pack) => fileURLToPath(new URL(`../manuals/${pack}/pages`, import.meta.url))

export const manualPages = ({ pack = 'bc', mount = 'visual-guides', dir = packDir(pack) } = {}) => {
  let config
  const root = resolve(dir)
  return {
    name: `brandkit-manual-pages:${pack}`,
    configResolved(resolved) { config = resolved },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const prefix = `${config.base}${mount}/`
        const url = (request.url ?? '').split('?')[0]
        if (!url.startsWith(prefix)) return next()
        const file = normalize(join(root, decodeURIComponent(url.slice(prefix.length))))
        if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) return next()
        response.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream')
        createReadStream(file).pipe(response)
      })
    },
    writeBundle() {
      cpSync(root, join(resolve(config.root, config.build.outDir), mount), { recursive: true })
    }
  }
}

export const libraryDir = () => fileURLToPath(new URL('../library', import.meta.url))

const VIRTUAL = 'virtual:brandkit-library'
const filesIn = (root, dir = root) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name)
  return entry.isDirectory() ? filesIn(root, path) : entry.isFile() ? [path.slice(root.length + 1).split(sep).join('/')] : []
}).sort()

/**
 * brandkit's library (library/: the open-licence faces every starter brand uses), served as it is
 * at `${base}library/` in `vite dev` and the built site, and listed by the module
 * `virtual:brandkit-library` (an array of paths). Served by path rather than bundled, so a page
 * from a brand pack, served by the pack worker, can reach a library file the pack left out.
 */
export const brandkitLibrary = ({ dir = libraryDir(), mount = 'library' } = {}) => {
  const serve = manualPages({ pack: 'library', mount, dir })
  const root = resolve(dir)
  const index = () => `${JSON.stringify(filesIn(root))}\n`
  let config
  return {
    ...serve,
    name: 'brandkit-library',
    configResolved(resolved) { config = resolved; serve.configResolved(resolved) },
    // index.json lists the library, for the pack worker, which serves only what is in it.
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if ((request.url ?? '').split('?')[0] !== `${config.base}${mount}/index.json`) return next()
        response.setHeader('Content-Type', 'application/json')
        response.end(index())
      })
      serve.configureServer(server)
    },
    writeBundle() {
      serve.writeBundle()
      writeFileSync(join(resolve(config.root, config.build.outDir), mount, 'index.json'), index())
    },
    resolveId(id) { return id === VIRTUAL ? `\0${VIRTUAL}` : null },
    load(id) { return id === `\0${VIRTUAL}` ? `export default ${JSON.stringify(filesIn(root))}` : null }
  }
}
