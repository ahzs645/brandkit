// Renders a small WebP of every page in manuals/<pack>/pages, for the manual library's grids.
//
// The thumbnails are drawn from the site's own copies of the rebuilt pages (see
// import_visual_guides.py), never from the reference scans. Needs Playwright with a Chromium; it is
// not a dependency of the site, so run it where Playwright is installed:
//
//   node scripts/render-guide-thumbnails.mjs [pack]        (default: bc)

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const guides = join(root, 'manuals', process.argv[2] ?? 'bc', 'pages')
const WIDTH = 320

const require = createRequire(import.meta.url)
let chromium
try {
  ({ chromium } = require('playwright'))
} catch {
  ({ chromium } = await import(join(process.env.PLAYWRIGHT_DIR ?? '', 'playwright', 'index.mjs')))
}

const browser = await chromium.launch()
const page = await browser.newPage()
let count = 0
for (const book of readdirSync(guides, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
  const folder = join(guides, book.name)
  for (const file of readdirSync(folder).filter((name) => name.endsWith('.svg'))) {
    const svg = readFileSync(join(folder, file), 'utf8')
    const webp = await page.evaluate(async ({ svg, width }) => {
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
      const image = new Image()
      await new Promise((done, fail) => { image.onload = done; image.onerror = fail; image.src = url })
      const [, , w, h] = svg.match(/viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/).slice(1).map(Number)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = Math.round(width * h / w)
      const context = canvas.getContext('2d')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      return canvas.toDataURL('image/webp', 0.82).split(',')[1]
    }, { svg, width: WIDTH })
    writeFileSync(join(folder, file.replace(/\.svg$/, '.webp')), Buffer.from(webp, 'base64'))
    count++
  }
}
await browser.close()
console.log(`${count} thumbnails`)
