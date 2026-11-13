// Builds the frame sets the Devices tab offers beside brandkit's own drawn frames, from clones of
// the projects they come from. Each set is a folder in src/mockups/frames/ with a set.json (what
// the frames are, measured here), the files the frames need, and the project's licence.
//
//   node scripts/device-frames.mjs --from <folder of clones> [--only open-device-frame,devices-css,react-mockframe]
//
// <folder of clones> holds `open-device-frame`, `devices.css` and `react-mockframe`, each a
// checkout of the project (see src/mockups/frames/NOTICES.md for their addresses). Measuring is
// done in Chromium through Playwright (CHROMIUM_PATH names the browser where it is not the
// default), so nothing has to be measured by hand: an image frame's screen opening is found from
// its transparency, and a CSS frame's size and screen from how the browser lays it out.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

const args = process.argv.slice(2)
const option = (name) => { const at = args.indexOf(`--${name}`); return at < 0 ? null : args[at + 1] }
const from = resolve(option('from') ?? 'device-frame-sources')
const only = option('only')?.split(',')
const out = fileURLToPath(new URL('../src/mockups/frames/', import.meta.url))
const wanted = (id) => !only || only.includes(id)
const commit = (dir) => { try { return execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() } catch { return null } }
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const write = (dir, set) => writeFileSync(join(dir, 'set.json'), `${JSON.stringify(set, null, 2)}\n`)
const fresh = (id) => { const dir = join(out, id); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true }); return dir }

const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 2400, height: 1600 } })

// ── Open Device Frame: transparent images of phones. The screen is the transparent area that
// the outside of the image cannot reach. ──
if (wanted('open-device-frame')) {
  const src = join(from, 'open-device-frame')
  const dir = fresh('open-device-frame')
  const devices = JSON.parse(readFileSync(join(src, 'catalog/generated/devices.json'), 'utf8')).filter((device) => device.status === 'published' && device.images?.frontOff)
  const frames = []
  for (const device of devices) {
    const file = join(src, 'public', device.images.frontOff)
    const url = `data:image/webp;base64,${readFileSync(file).toString('base64')}`
    const measured = await page.evaluate(async (address) => {
      const image = new Image()
      image.src = address
      await image.decode()
      const w = image.naturalWidth, h = image.naturalHeight
      const canvas = new OffscreenCanvas(w, h)
      const context = canvas.getContext('2d')
      context.drawImage(image, 0, 0)
      const alpha = context.getImageData(0, 0, w, h).data
      const clear = (x, y) => alpha[(y * w + x) * 4 + 3] < 24
      // Flood the transparency from the image's edges: what is left transparent is the screen.
      const outside = new Uint8Array(w * h)
      const stack = []
      const push = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h && !outside[y * w + x] && clear(x, y)) { outside[y * w + x] = 1; stack.push(x, y) } }
      for (let x = 0; x < w; x += 1) { push(x, 0); push(x, h - 1) }
      for (let y = 0; y < h; y += 1) { push(0, y); push(w - 1, y) }
      while (stack.length) { const y = stack.pop(), x = stack.pop(); push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1) }
      let left = w, top = h, right = -1, bottom = -1
      for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (clear(x, y) && !outside[y * w + x]) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y) }
      if (right < 0) return null
      // The corner radius: how far along its top row the opening begins.
      let first = left
      while (first < right && (!clear(first, top) || outside[top * w + first])) first += 1
      return { size: [w, h], screen: { x: left, y: top, width: right - left + 1, height: bottom - top + 1, radius: first - left } }
    }, url)
    if (!measured) { console.warn(`open-device-frame: no screen opening found in ${device.id}`); continue }
    const name = `${device.id}.webp`
    cpSync(file, join(dir, name))
    frames.push({ id: `odf-${device.id}`, label: `${device.brand} ${device.model}`, maker: device.brand, category: 'phone', image: name, ...measured, year: device.releaseYear ?? null })
  }
  cpSync(join(src, 'LICENSE'), join(dir, 'LICENSE'))
  write(dir, { id: 'open-device-frame', label: 'Open Device Frame', kind: 'image', source: { name: 'Open Device Frame', creator: 'Sina Karimi and contributors', url: 'https://github.com/SinaKarimi7/open-device-frame', licence: 'MIT', licenceUrl: 'https://github.com/SinaKarimi7/open-device-frame/blob/main/LICENSE', commit: commit(src) }, note: 'Community-drawn illustrations of phones, not manufacturers\' artwork.', frames })
  console.log(`open-device-frame: ${frames.length} frames`)
}

/** Lays a CSS frame out in the browser and reads its size and where its screen is. */
const measureCss = async (css, markup, screenSelector) => {
  await page.setContent(`<!doctype html><style>body{margin:0;padding:200px}${css}</style><div id="stage" style="position:relative;display:inline-block">${markup.replace('{{screen}}', 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==')}</div>`)
  await page.waitForTimeout(60)
  return page.evaluate((selector) => {
    const stage = document.getElementById('stage')
    const device = stage.firstElementChild
    const origin = device.getBoundingClientRect()
    let left = origin.left, top = origin.top, right = origin.right, bottom = origin.bottom
    for (const element of device.querySelectorAll('*')) {
      const box = element.getBoundingClientRect()
      if (!box.width || !box.height) continue
      left = Math.min(left, box.left); top = Math.min(top, box.top); right = Math.max(right, box.right); bottom = Math.max(bottom, box.bottom)
    }
    // Pseudo-elements (buttons, feet) cannot be measured: leave a margin for them.
    const margin = 8
    left -= margin; top -= margin; right += margin; bottom += margin
    const screen = device.querySelector(selector)
    if (!screen) return null
    const box = screen.getBoundingClientRect()
    const round = (value) => Math.round(value * 100) / 100
    return { size: [round(right - left), round(bottom - top)], offset: [round(origin.left - left), round(origin.top - top)], box: [round(origin.width), round(origin.height)],
      screen: { x: round(box.left - left), y: round(box.top - top), width: round(box.width), height: round(box.height), radius: parseFloat(getComputedStyle(screen).borderTopLeftRadius) || 0 } }
  }, screenSelector)
}

// ── Devices.css: frames drawn in CSS, one class each. ──
if (wanted('devices-css')) {
  const src = join(from, 'devices.css')
  const dir = fresh('devices-css')
  const css = readFileSync(join(src, 'dist/devices.min.css'), 'utf8')
  const KIND = { 'phones.html': 'phone', 'tablets.html': 'tablet', 'watches.html': 'watch' }
  const COMPUTER = { 'device-macbook-pro': 'laptop', 'device-macbook-pro-2018': 'laptop', 'device-macbook': 'laptop', 'device-surface-book': 'laptop', 'device-imac': 'desktop', 'device-imac-pro': 'desktop', 'device-surface-studio': 'desktop', 'device-pro-display-xdr': 'desktop' }
  const frames = []
  const seen = new Set()
  // The demo pages name each device in their menu and show it as one block of the shared markup.
  const titles = new Map()
  for (const file of ['phones.html', 'tablets.html', 'computers.html', 'watches.html']) {
    const lines = readFileSync(join(src, 'docs', file), 'utf8').split('\n')
    for (const line of lines) for (const link of line.matchAll(/class="rework-title" href="[a-z]+\.html#([a-z0-9-]+)">([^<]+)</g)) titles.set(link[1], link[2].trim())
    for (let at = 0; at < lines.length; at += 1) {
      const open = /^(\s*)<div class="device (device-[a-z0-9-]+)[^"]*">\s*$/.exec(lines[at])
      if (!open) continue
      const [, indent, className] = open
      const end = lines.findIndex((line, index) => index > at && line === `${indent}</div>`)
      const category = KIND[file] ?? COMPUTER[className]
      const inner = lines.slice(at + 1, end).map((line) => line.trim()).join('')
      if (end < 0 || !category || seen.has(className) || !inner.includes('device-screen')) continue
      seen.add(className)
      const key = className.replace(/^device-/, '')
      const title = titles.get(key) ?? [...titles].find(([id]) => id.endsWith(key))?.[1] ?? { 'apple-watch-s8': 'Apple Watch Series 8' }[key] ?? key.replace(/-/g, ' ')
      // The colours the stylesheet gives this device, as second classes.
      const colours = [...new Set([...css.matchAll(new RegExp(`\\.${className}\\.device-([a-z-]+)`, 'g'))].map((found) => found[1]))]
      const markup = `<div class="device ${className}{{colour}}">${inner.replace(/<img class="device-screen"[^>]*>|<video class="device-screen"[^>]*>[\s\S]*?<\/video>/, '<img class="device-screen" src="{{screen}}" alt=""/>')}</div>`
      const measured = await measureCss(css, markup.replace('{{colour}}', ''), '.device-screen')
      if (!measured) continue
      frames.push({ id: `dcss-${key}`, label: title, category, className, colours, markup, ...measured })
    }
  }
  writeFileSync(join(dir, 'devices.min.css'), css)
  cpSync(join(src, 'LICENSE'), join(dir, 'LICENSE'))
  write(dir, { id: 'devices-css', label: 'Devices.css', kind: 'css', stylesheet: 'devices.min.css', source: { name: 'Devices.css', creator: 'Yan Zhu', url: 'https://github.com/picturepan2/devices.css', licence: 'MIT', licenceUrl: 'https://github.com/picturepan2/devices.css/blob/master/LICENSE', commit: commit(src) }, note: 'Frames drawn in CSS. They show in the tab and in PNG exports from a Chromium or Firefox browser.', frames })
  console.log(`devices-css: ${frames.length} frames`)
}

// ── React MockFrame: React components over one stylesheet. Each device is rendered once here, to
// plain markup, so the app needs neither React nor the package to show it. ──
if (wanted('react-mockframe')) {
  const src = join(from, 'react-mockframe/src/package')
  const dir = fresh('react-mockframe')
  const css = readFileSync(join(src, 'css/mockframe.css'), 'utf8')
  const root = fileURLToPath(new URL('../.device-frames-tmp/', import.meta.url))
  rmSync(root, { recursive: true, force: true })
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, 'index.html'), '<!doctype html><div id="out"></div><script type="module" src="/main.jsx"></script>')
  writeFileSync(join(root, 'main.jsx'), `import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MockFrame, DeviceOptions } from '/@fs${join(src, 'src/MockFrame.tsx')}'
const screen = h('img', { className: 'bk-screen', src: '{{screen}}', alt: '', style: { display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' } })
const markup = (device, landscape) => renderToStaticMarkup(h(MockFrame, { device, color: '__COLOUR__', landscape }, screen))
window.frames = Object.entries(DeviceOptions).map(([name, options]) => ({ name, colours: [...options.colors], landscape: options.hasLandscape, poses: options.poses ?? null,
  upright: markup(name, false), turned: options.hasLandscape ? markup(name, true) : null }))
`)
  const server = await createServer({ root, configFile: false, logLevel: 'silent', plugins: [react()], server: { port: 0, host: '127.0.0.1', fs: { strict: false } } })
  await server.listen()
  const frames = []
  try {
    await page.goto(server.resolvedUrls.local[0])
    await page.waitForFunction(() => Array.isArray(window.frames), null, { timeout: 60000 })
    const rendered = await page.evaluate(() => window.frames)
    // React adds a preload hint for the image; the frame is the markup after it.
    const xhtml = (html) => html.replace(/<link\b[^>]*>/g, '').replace(/ __COLOUR__/g, '{{colour}}').replace(/<img([^>]*?)\/?>/g, '<img$1/>')
    const KIND = (name) => (/iPad/.test(name) ? 'tablet' : /MacBook/.test(name) ? 'laptop' : 'phone')
    for (const frame of rendered) {
      if (frame.poses) continue // The foldable has three poses and two screens: not a single-screen frame.
      const upright = xhtml(frame.upright)
      const measured = await measureCss(css, upright.replace('{{colour}}', frame.colours[0] ? ` ${frame.colours[0]}` : ''), '.bk-screen')
      if (!measured) { console.warn(`react-mockframe: ${frame.name} could not be measured`); continue }
      const entry = { id: `rmf-${slug(frame.name)}`, label: frame.name, category: KIND(frame.name), colours: frame.colours, markup: upright, ...measured }
      if (frame.turned) {
        const turned = xhtml(frame.turned)
        const side = await measureCss(css, turned.replace('{{colour}}', frame.colours[0] ? ` ${frame.colours[0]}` : ''), '.bk-screen')
        if (side) entry.turned = { markup: turned, ...side }
      }
      frames.push(entry)
    }
  } finally {
    await server.close()
    rmSync(root, { recursive: true, force: true })
  }
  writeFileSync(join(dir, 'mockframe.css'), css)
  cpSync(join(from, 'react-mockframe/LICENSE'), join(dir, 'LICENSE'))
  write(dir, { id: 'react-mockframe', label: 'React MockFrame', kind: 'css', stylesheet: 'mockframe.css', source: { name: 'React MockFrame', creator: 'Mohammed Banani; frame styles adapted from Marvel devices.css (MIT, 2014 Marvelapp)', url: 'https://github.com/mbdev3/react-mockframe', licence: 'MIT', licenceUrl: 'https://github.com/mbdev3/react-mockframe/blob/main/LICENSE', commit: commit(join(from, 'react-mockframe')) }, note: 'Frames drawn in CSS, rendered here once to plain markup. They show in the tab and in PNG exports from a Chromium or Firefox browser.', frames })
  console.log(`react-mockframe: ${frames.length} frames`)
}

await browser.close()
console.log(`Frame sets written to ${out}. Run npm test.`)
