// brandkit's Vite plugin: serves a manual pack's page files, and copies them into the build.
//
//   import { manualPages } from 'brandkit/vite'
//   plugins: [manualPages({ pack: 'bc', mount: 'visual-guides' })]
//
// The pages are then at `${base}visual-guides/<book>/<page>.svg`, in `vite dev` and in the built
// site alike, which is what the library's `pageUrl` should point at.

import { cpSync, createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const TYPES = { '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json' }

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
