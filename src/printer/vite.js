// Reusable build and hosting adapter. Hosts supply source paths and a mount.
import { cpSync, createReadStream, existsSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const runtime = fileURLToPath(new URL('./runtime/', import.meta.url))
export const buildTemplatePrinter = async ({ frontend, outDir, base = '/', mount = 'template-printer/', typecheck = true }) => {
  const viteEntry = join(frontend, 'node_modules/vite/dist/node/index.js')
  if (!existsSync(viteEntry)) throw new Error('Install the Template Printer submodule frontend before building it.')
  if (typecheck) {
    const checked = spawnSync(process.execPath, [join(frontend, 'node_modules/typescript/bin/tsc'), '-b'], { cwd: frontend, stdio: 'inherit' })
    if (checked.status !== 0) throw new Error('Template Printer type checking failed.')
  }
  const { build, loadConfigFromFile, mergeConfig } = await import(pathToFileURL(viteEntry).href)
  const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, join(frontend, 'vite.config.ts'), frontend)
  return build(mergeConfig(loaded.config, {
    configFile: false, root: frontend,
    define: { 'import.meta.env.VITE_STORAGE_MODE': JSON.stringify('local') },
    resolve: { alias: [
      { find: '@template-printer/main', replacement: join(frontend, 'src/main.tsx') },
      { find: '@template-printer/package-url', replacement: join(frontend, 'src/lib/packageUrl.ts') }
    ] },
    plugins: [{
      name: 'template-printer-host-bridge',
      enforce: 'pre',
      resolveId(source, importer) {
        if (importer?.replaceAll('\\', '/').endsWith('/src/App.tsx') && source === './lib/packageUrl') return join(runtime, 'package-url.js')
      },
      transformIndexHtml: {
        order: 'pre',
        handler: (html) => html.replace('/src/main.tsx', `/@fs/${join(runtime, 'entry.js')}`)
          .replace('<title>id-card-maker</title>', '<title>Template Printer</title>').replace(/\s*<link rel="icon"[^>]*>/, '')
      }
    }],
    base: `${base.replace(/\/$/, '')}/${mount.replace(/^\//, '').replace(/\/?$/, '/')}`,
    build: { outDir, emptyOutDir: true }
  }))
}

export const templatePrinter = ({ dir = fileURLToPath(new URL('../../.template-printer/', import.meta.url)), mount = 'template-printer' } = {}) => {
  let config
  const root = resolve(dir)
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.zip': 'application/zip', '.json': 'application/json' }
  return {
    name: 'template-printer-static',
    configResolved(resolved) { config = resolved },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const prefix = `${config.base}${mount}/`
        const pathname = (request.url ?? '').split('?')[0]
        if (!pathname.startsWith(prefix)) return next()
        let relative
        try { relative = decodeURIComponent(pathname.slice(prefix.length)) || 'index.html' } catch { response.writeHead(400).end('Invalid path'); return }
        const file = resolve(root, relative)
        if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) { response.writeHead(404).end('Template Printer file not found.'); return }
        response.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream')
        createReadStream(file).pipe(response)
      })
    },
    writeBundle() {
      if (!existsSync(join(root, 'index.html'))) throw new Error('Build Template Printer first.')
      cpSync(root, join(resolve(config.root, config.build.outDir), mount), { recursive: true })
    }
  }
}
