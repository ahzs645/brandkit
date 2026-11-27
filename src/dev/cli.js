// `brandkit dev`: work on a brand in its own repository and see it in brandkit as you save.
//
//   brandkit dev [brand folder or folder of brands]… [--build "command"] [--watch path]… [--ignore path]…
//                [--site folder] [--port 8790] [--app checkout|hosted|none] [--app-url url] [--config file]
//
// A brand's repository installs brandkit (`npm i -D github:ahzs645/brandkit`) and runs this. On
// every change it runs the build (if any), packs the brand folders the way `brandkit pack` does,
// and serves, from one address:
//
//   /brandkit/   brandkit, offered the packs and reloaded after every rebuild
//   /packs/      the packs and their catalog.json
//   /            the repository's own site (a design system's catalog page), if it has one
//
// brandkit comes from a checkout when there is one (this package itself when it is a clone with
// `npm ci` done, or --app <folder>): its source runs in Vite, so brandkit's own edits show too.
// Installed as a dependency, there is no app to run, so the published site is served instead
// (package.json `homepage`, or --app-url), kept in a cache so it opens offline afterwards.
// Nothing is written to the repository: packs go to a temporary folder.
//
// Settings come from brandkit.dev.json in the current folder (or --config); the command line
// overrides them:
//
//   {
//     "brands": ["dist"],                  brand folders (holding brand.json) or folders of them
//     "build": "npm run build",            run before packing, after every change (optional)
//     "watch": ["source", "src"],          what to watch (default: the brands, or with a build, the repository)
//     "ignore": ["src/generated"],         never a reason to rebuild (outputs written inside watched folders)
//     "site": "dist",                      served at / with live reload (optional)
//     "port": 8790
//   }

import { createServer } from 'node:http'
import { createServer as netServer } from 'node:net'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, watch, writeFileSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { basename, dirname, extname, join, normalize, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { pack } from '../pack/cli.js'

export const devUsage = `usage: brandkit dev [brand folder or folder of brands]… [--build "command"] [--watch path]… [--ignore path]…
                    [--site folder] [--port 8790] [--app checkout|hosted|none] [--app-url url] [--config file]

Rebuilds and repacks the brands on every save and serves them with brandkit from one address,
reloading it after each rebuild. Settings can live in brandkit.dev.json (see docs/brand-packs.md).
With no brands named anywhere, the current folder is the brand (or the folder of brands).
--app takes a brandkit checkout's folder, "hosted" for the published site, or "none".`

const BRANDKIT_ROOT = fileURLToPath(new URL('../../', import.meta.url))
const APP = '/brandkit/'
// Folders that are outputs, caches or tooling almost everywhere: a change there is never a source edit.
const SKIP_SEGMENTS = new Set(['node_modules', 'dist', 'release', 'build', 'out', 'coverage', 'test-results', '__pycache__'])
const SKIP_FILE = /(~|\.swp|\.swx|\.tmp)$|^4913$|^\.#/
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.zip': 'application/zip',
  '.pdf': 'application/pdf', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.ts': 'text/plain; charset=utf-8', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.wasm': 'application/wasm', '.map': 'application/json; charset=utf-8'
}
const RELOAD = '<script>new EventSource("/__brandkit_dev").onmessage=()=>location.reload()</script>'
const withReload = (html) => html.replace(/<\/body>|$/i, (end) => `${RELOAD}${end}`)
const dim = (text) => `\x1b[2m${text}\x1b[0m`, green = (text) => `\x1b[32m${text}\x1b[0m`, red = (text) => `\x1b[31m${text}\x1b[0m`

const parse = (argv) => {
  const cli = { brands: [], watch: [], ignore: [] }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const value = () => {
      const next = argv[++i]
      if (next === undefined || next.startsWith('--')) throw new Error(`${arg} needs a value.\n\n${devUsage}`)
      return next
    }
    if (arg === '--build') cli.build = value()
    else if (arg === '--watch') cli.watch.push(value())
    else if (arg === '--ignore') cli.ignore.push(value())
    else if (arg === '--site') cli.site = value()
    else if (arg === '--port') cli.port = Number(value())
    else if (arg === '--app') cli.app = value()
    else if (arg === '--app-url') cli.appUrl = value()
    else if (arg === '--no-app') cli.app = 'none'
    else if (arg === '--config') cli.config = value()
    else if (arg === '--help' || arg === '-h') return null
    else if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}\n\n${devUsage}`)
    else cli.brands.push(arg)
  }
  return cli
}

/** A brandkit checkout Vite can run: its index.html and its own Vite installed. */
const viteIn = (folder) => {
  const entry = join(folder, 'node_modules', 'vite', 'package.json')
  if (!existsSync(join(folder, 'index.html')) || !existsSync(join(folder, 'vite.config.js')) || !existsSync(entry)) return null
  const exported = JSON.parse(readFileSync(entry, 'utf8')).exports?.['.']
  const file = typeof exported === 'string' ? exported : exported?.import?.default ?? exported?.import ?? exported?.default
  return typeof file === 'string' ? join(dirname(entry), file) : null
}

/** The settings: brandkit.dev.json (paths relative to it), then the command line (relative to the current folder). */
const settings = (cli) => {
  const configPath = cli.config ? resolve(cli.config) : resolve('brandkit.dev.json')
  let file = {}
  if (existsSync(configPath)) file = JSON.parse(readFileSync(configPath, 'utf8'))
  else if (cli.config) throw new Error(`No settings at ${configPath}`)
  const base = existsSync(configPath) ? dirname(configPath) : process.cwd()
  const fromFile = (path) => resolve(base, path)
  const fromCli = (path) => resolve(path)
  const list = (value) => (value == null ? [] : Array.isArray(value) ? value : [value])
  const brands = cli.brands.length ? cli.brands.map(fromCli) : list(file.brands).map(fromFile)
  const build = cli.build ?? file.build ?? null
  const site = cli.site ? fromCli(cli.site) : file.site ? fromFile(file.site) : null
  // Which brandkit: a checkout (named, or this package when it is one), else the published site.
  const asked = cli.app ?? process.env.BRANDKIT_APP ?? null
  let app
  if (asked === 'none') app = { mode: 'none' }
  else if (asked === 'hosted') app = { mode: 'hosted' }
  else if (asked) {
    const folder = resolve(asked)
    if (!viteIn(folder)) throw new Error(`${folder} is not a brandkit checkout with npm ci done (it needs index.html, vite.config.js and node_modules/vite).`)
    app = { mode: 'checkout', folder }
  } else app = viteIn(BRANDKIT_ROOT) ? { mode: 'checkout', folder: BRANDKIT_ROOT } : { mode: 'hosted' }
  if (app.mode === 'hosted') {
    app.url = cli.appUrl ?? process.env.BRANDKIT_APP_URL ?? JSON.parse(readFileSync(join(BRANDKIT_ROOT, 'package.json'), 'utf8')).homepage
    if (!app.url) throw new Error('No published brandkit to serve: pass --app-url, or --app <brandkit checkout>.')
    if (!app.url.endsWith('/')) app.url += '/'
  }
  return {
    root: base,
    brands: brands.length ? brands : [base],
    build,
    // With a build, the brand folders are its output, so the repository is watched instead.
    watch: cli.watch.length ? cli.watch.map(fromCli) : file.watch ? list(file.watch).map(fromFile) : build ? [base] : (brands.length ? brands : [base]),
    ignore: [...list(file.ignore).map(fromFile), ...cli.ignore.map(fromCli)],
    site,
    port: cli.port ?? file.port ?? 8790,
    app
  }
}

const freePort = (port, host) => new Promise((done) => {
  const probe = netServer().once('error', () => done(freePort(port + 1, host))).once('listening', () => probe.close(() => done(port)))
  probe.listen(port, host)
})

const runShell = (command, cwd) => new Promise((done, fail) => {
  const child = spawn(command, { cwd, shell: true, stdio: ['ignore', 'inherit', 'inherit'] })
  child.on('exit', (code) => (code === 0 ? done() : fail(new Error(`"${command}" exited with ${code}`))))
  child.on('error', fail)
})

/**
 * The published brandkit, served from this machine's address so it shares an origin with the
 * packs. Hashed assets are kept for good; everything else is fetched fresh and kept for offline use.
 */
const hostedApp = (appUrl) => {
  const upstream = new URL(appUrl)
  const cache = join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'brandkit', 'app', upstream.host, ...upstream.pathname.split('/').filter(Boolean))
  return async (rest) => {
    const path = rest === '' || rest.endsWith('/') ? `${rest}index.html` : rest
    const file = normalize(join(cache, path))
    if (!file.startsWith(cache + sep)) return { status: 403 }
    const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream'
    const kept = existsSync(file) && statSync(file).isFile()
    if (kept && path.startsWith('assets/')) return { status: 200, type, body: readFileSync(file) }
    try {
      const response = await fetch(new URL(path === 'index.html' ? rest : path, upstream), { signal: AbortSignal.timeout(20_000) })
      if (response.status === 404) return { status: 404 }
      if (!response.ok) throw new Error(`${response.status}`)
      const body = Buffer.from(await response.arrayBuffer())
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, body)
      return { status: 200, type, body }
    } catch (error) {
      if (kept) return { status: 200, type, body: readFileSync(file) }
      return { status: 502, body: Buffer.from(`brandkit could not be fetched from ${upstream.href} (${error.message}), and no copy is kept yet.`) }
    }
  }
}

export const dev = async (argv) => {
  const cli = parse(argv)
  if (!cli) { console.log(devUsage); return }
  const options = settings(cli)
  const host = '127.0.0.1'
  const out = mkdtempSync(join(tmpdir(), 'brandkit-dev-'))
  const clients = new Set()
  let packs = []
  let lastHashes = ''

  // One cycle: build, pack, announce. Cycles never overlap; a change during one queues another.
  let running = null, queued = false
  const cycle = () => {
    if (running) { queued = true; return running }
    running = (async () => {
      // Yield first: with no build, a cycle has nothing else to wait on, and has to finish after
      // `running` is set, not before.
      await null
      do {
        queued = false
        const started = Date.now()
        try {
          if (options.build) await runShell(options.build, options.root)
          const missing = options.brands.filter((folder) => !existsSync(folder))
          if (missing.length) throw new Error(`No brand folder at ${missing.map((folder) => relative(options.root, folder) || '.').join(', ')}${options.build ? ' after the build' : ''}`)
          const result = pack([...options.brands, '--out', out, '--name', `${basename(options.root)} (local)`, '--quiet'])
          packs = result.packs
          const hashes = packs.map((entry) => entry.sha256).join()
          const note = hashes === lastHashes ? ' (packs unchanged)' : ''
          lastHashes = hashes
          console.log(green(`✓ ${packs.map((entry) => entry.manifest.id).join(', ')} ready in ${((Date.now() - started) / 1000).toFixed(1)}s${note}`))
          for (const client of clients) client.write('data: rebuilt\n\n')
        } catch (error) {
          // The last good packs stay served; the next save tries again.
          console.error(red(`✗ ${error.message}`))
        }
      } while (queued)
      running = null
    })()
    return running
  }

  let vite = null
  const hosted = options.app.mode === 'hosted' ? hostedApp(options.app.url) : null
  const send = (response, { status, type, body }, method) => {
    if (status !== 200) { response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }).end(body ?? (status === 404 ? 'Not found' : '')); return }
    if (type.startsWith('text/html')) body = Buffer.from(withReload(body.toString('utf8')))
    response.writeHead(200, { 'Content-Type': type, 'Content-Length': body.byteLength })
    response.end(method === 'HEAD' ? undefined : body)
  }

  const server = createServer(async (request, response) => {
    const path = decodeURIComponent(new URL(request.url, 'http://local').pathname)
    // brandkit from a checkout: Vite's own middleware (it serves /brandkit/ and its module paths).
    if (vite && !path.startsWith('/packs/') && path !== '/__brandkit_dev' && (path.startsWith(APP) || path.startsWith('/@') || path.startsWith('/node_modules/') || !options.site)) {
      if (path === '/' || path === APP.slice(0, -1)) { response.writeHead(302, { Location: appLink() }).end(); return }
      vite.middlewares(request, response, () => response.writeHead(404).end('Not found'))
      return
    }
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Private-Network', 'true')
    response.setHeader('Cache-Control', 'no-cache')
    if (request.method === 'OPTIONS') { response.writeHead(204, { 'Access-Control-Allow-Headers': '*' }).end(); return }
    if (path === '/__brandkit_dev') {
      response.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive' })
      response.write(': connected\n\n')
      clients.add(response)
      request.on('close', () => clients.delete(response))
      return
    }
    if (running) await running
    if (hosted && (path === APP.slice(0, -1) || path.startsWith(APP))) { send(response, await hosted(path.slice(APP.length)), request.method); return }
    if (path === '/' && !options.site) {
      if (options.app.mode !== 'none') { response.writeHead(302, { Location: appLink() }).end(); return }
      const items = packs.map((entry) => `<li><b>${entry.manifest.name}</b> · <a href="/packs/${entry.file}">${entry.file}</a></li>`).join('')
      send(response, { status: 200, type: TYPES['.html'], body: Buffer.from(`<!doctype html><meta charset="utf-8"><title>brandkit dev</title><body style="font:15px system-ui;margin:2rem"><h1>brandkit dev</h1><p>Catalog: <a href="/packs/catalog.json">/packs/catalog.json</a></p><ul>${items}</ul></body>`) }, request.method)
      return
    }
    const [folder, rest] = path.startsWith('/packs/') ? [out, path.slice(7)] : [options.site, path.slice(1)]
    if (!folder) { send(response, { status: 404 }); return }
    let file = normalize(join(folder, rest))
    if (file !== folder && !file.startsWith(folder + sep)) { send(response, { status: 403 }); return }
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
      send(response, { status: 200, type: TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', body: await readFile(file) }, request.method)
    } catch {
      send(response, { status: 404 })
    }
  })

  await cycle()
  const port = await freePort(options.port, host)
  const origin = `http://${host}:${port}`
  const catalogUrl = `${origin}/packs/catalog.json`
  const appLink = () => `${origin}${APP}?catalog=${encodeURIComponent(catalogUrl)}${packs[0] ? `&brand=${packs[0].manifest.id}` : ''}`

  if (options.app.mode === 'checkout') {
    // The checkout's Vite, inside this server: same address, its config and plugins, offered the catalog.
    process.env.VITE_BRANDKIT_CATALOGS = catalogUrl
    const { createServer: createVite } = await import(pathToFileURL(viteIn(options.app.folder)).href)
    vite = await createVite({
      root: options.app.folder,
      base: APP,
      clearScreen: false,
      logLevel: 'warn',
      server: { middlewareMode: true, hmr: { server } },
      plugins: [{ name: 'brandkit-dev-reload', transformIndexHtml: withReload }]
    })
  }
  await new Promise((done) => server.listen(port, host, done))

  // Watching. A change counts only when the file's bytes differ from the last time it was seen, so
  // a build that rewrites a file inside a watched folder with the same bytes settles after one pass.
  const seen = new Map()
  const inside = (absolute, folder) => absolute === folder || absolute.startsWith(folder + sep)
  const skipped = (absolute, target) => {
    if (options.ignore.some((path) => inside(absolute, path))) return true
    // With a build, the brand folders and the site are what it writes.
    if (options.build && [...options.brands, options.site].some((path) => path && inside(absolute, path))) return true
    // Within what is watched: no hidden files or folders, outputs, caches or editor scratch files.
    const parts = relative(target, absolute).split(sep)
    return SKIP_FILE.test(parts.at(-1)) || parts.some((part) => part.startsWith('.') || SKIP_SEGMENTS.has(part))
  }
  const fingerprint = (absolute) => {
    try {
      const info = statSync(absolute)
      return info.isDirectory() ? null : createHash('sha1').update(readFileSync(absolute)).digest('hex')
    } catch { return 'gone' }
  }
  let timer = null
  const changed = new Set()
  for (const target of options.watch) {
    if (!existsSync(target)) { console.warn(`Not watching ${target}: it does not exist.`); continue }
    const directory = statSync(target).isDirectory()
    watch(target, { recursive: directory }, (_event, name) => {
      const absolute = directory ? (name ? join(target, String(name)) : target) : target
      if (skipped(absolute, target)) return
      const print = fingerprint(absolute)
      if (print === null || seen.get(absolute) === print) return
      seen.set(absolute, print)
      changed.add(relative(options.root, absolute) || basename(absolute))
      clearTimeout(timer)
      timer = setTimeout(() => {
        console.log(dim(`↻ ${[...changed].slice(0, 3).join(', ')}${changed.size > 3 ? ` and ${changed.size - 3} more` : ''}`))
        changed.clear()
        cycle()
      }, 150)
    })
  }

  const stop = async () => { await vite?.close(); rmSync(out, { recursive: true, force: true }); process.exit() }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)

  const from = { checkout: `from ${relative(process.cwd(), options.app.folder ?? '') || '.'}`, hosted: `published, from ${options.app.url}` }[options.app.mode]
  console.log('')
  if (options.app.mode !== 'none') console.log(`brandkit    ${appLink()}  ${dim(from)}`)
  if (options.site) console.log(`Site        ${origin}/`)
  console.log(`Packs       ${catalogUrl}`)
  console.log(dim(`Watching    ${options.watch.map((path) => relative(options.root, path) || '.').join(', ')}${options.build ? ` · build: ${options.build}` : ''}\n`))
}
