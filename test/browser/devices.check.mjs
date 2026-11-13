// Device mockups in the app: the tab opens on the brand's screens; every device brandkit has
// draws with a screenshot on its screen, upright and (where it turns) on its side; every scene
// draws; a screenshot can be added from a file; and the PNG and SVG exports carry the picture.
// Run it after adding or changing a device or a scene (docs/devices.md):
//
//   npm run build && npm run test:devices:browser
//
// Screenshots of each scene go to .documentation/devices-browser (or SCREENSHOT_DIR).

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { Resvg } from '@resvg/resvg-js'
import { DEVICES, PRESETS } from '../../src/mockups/device-catalog.js'
import { createProject } from '../../src/mockups/device-project.js'

const root = fileURLToPath(new URL('../../', import.meta.url))
const screenshotDir = resolve(process.env.SCREENSHOT_DIR ?? '.documentation/devices-browser')
mkdirSync(screenshotDir, { recursive: true })
const work = mkdtempSync(join(tmpdir(), 'brandkit-devices-'))
const red = new Resvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="#ff0000"/></svg>', { fitTo: { mode: 'width', value: 8 } }).render().asPng()
const RED = `data:image/png;base64,${Buffer.from(red).toString('base64')}`
writeFileSync(join(work, 'red.png'), red)
const upload = { kind: 'upload', fit: 'cover', file: null, upload: { name: 'red.png', dataUrl: RED, width: 8, height: 8 } }
const saved = (name, project) => { const path = join(work, `${name}.json`); writeFileSync(path, JSON.stringify(project)); return path }

const server = await preview({ root, logLevel: 'silent', preview: { port: 0, host: '127.0.0.1' } })
const base = server.resolvedUrls.local[0]
let browser
try {
  browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${base}?brand=northwind&view=devices`)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  const stage = page.locator('.device-stage img')
  await stage.waitFor({ timeout: 60000 })

  /** How much of the stage's picture is pure red: the screenshot, wherever the screens are. */
  const redShare = () => stage.evaluate(async (image) => {
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 400; canvas.height = Math.round(400 * image.naturalHeight / image.naturalWidth)
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
    let count = 0
    for (let at = 0; at < data.length; at += 4) if (data[at] > 240 && data[at + 1] < 20 && data[at + 2] < 20 && data[at + 3] > 240) count += 1
    return count / (data.length / 4)
  })
  const open = async (name, project) => {
    const before = await stage.getAttribute('src')
    await page.locator('.devices__files input[type=file]').setInputFiles(saved(name, project))
    await page.waitForFunction((old) => document.querySelector('.device-stage img')?.getAttribute('src') !== old, before, { timeout: 30000 })
    await page.waitForFunction(() => /opened/.test(document.querySelector('.device-stage__status')?.textContent ?? ''), null, { timeout: 30000 })
  }

  // A new mockup shows the brand, not a blank screen: its primary colour fills the screens.
  assert.equal(await redShare(), 0)
  assert.ok(await stage.evaluate((image) => image.naturalWidth > 0), 'the opening scene draws')
  await page.screenshot({ path: join(screenshotDir, 'opening.png') })

  // Every device, alone, with a red screenshot: upright, and on its side where it turns.
  for (const [id, device] of Object.entries(DEVICES)) {
    for (const turned of device.rotates ? [false, true] : [false]) {
      const project = createProject('single')
      project.canvas = 'fit'
      project.slots = [{ device: id, finish: device.finishes[0], turned, screen: upload }]
      await open(`${id}${turned ? '-turned' : ''}`, project)
      const share = await redShare()
      assert.ok(share > (device.category === 'watch' ? 0.02 : 0.12), `${id}${turned ? ' turned' : ''}: the screenshot is on its screen (${share.toFixed(3)})`)
    }
  }

  // Every scene, each device with the screenshot.
  for (const [id, preset] of Object.entries(PRESETS)) {
    const project = createProject(id)
    project.slots = project.slots.map((slot) => ({ ...slot, screen: upload }))
    await open(`scene-${id}`, project)
    assert.ok(await redShare() > 0.05, `${id}: its screens show the screenshot`)
    assert.equal(await page.locator('.devices__slot').count(), preset.slots.length, `${id}: one set of controls per device`)
    await page.screenshot({ path: join(screenshotDir, `${id}.png`) })
  }

  // A file that is not a mockup is refused with a sentence, and the scene stays.
  const kept = await stage.getAttribute('src')
  await page.locator('.devices__files input[type=file]').setInputFiles(saved('not-a-mockup', { schema: 'something-else' }))
  await page.waitForFunction(() => /not a device mockup/.test(document.querySelector('.device-stage__status--error')?.textContent ?? ''), null, { timeout: 10000 })
  assert.equal(await stage.getAttribute('src'), kept)

  // A screenshot added from a file lands on the device it was added to.
  await open('brand-screens', createProject('desktop-phone'))
  assert.equal(await redShare(), 0)
  await page.locator('.devices__slot').nth(1).locator('input[type=file]').setInputFiles(join(work, 'red.png'))
  await page.waitForFunction(() => /placed on device 2/.test(document.querySelector('.device-stage__status')?.textContent ?? ''), null, { timeout: 10000 })
  const phoneOnly = await redShare()
  assert.ok(phoneOnly > 0.003 && phoneOnly < 0.12, `only the phone carries it (${phoneOnly.toFixed(4)})`)
  // The draft is kept: the same scene is there after a reload.
  await page.reload()
  await stage.waitFor({ timeout: 60000 })
  assert.ok(Math.abs(await redShare() - phoneOnly) < 0.01, 'the draft comes back')

  // Exports carry the picture.
  const [png] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export PNG' }).click()])
  const pngBytes = readFileSync(await png.path())
  assert.equal(png.suggestedFilename(), 'northwind-desktop-phone.png')
  assert.deepEqual([...pngBytes.subarray(1, 4)].map((byte) => String.fromCharCode(byte)).join(''), 'PNG')
  assert.equal(pngBytes.readUInt32BE(16), 2400, 'at the chosen width')
  const [svg] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export SVG' }).click()])
  const svgText = readFileSync(await svg.path(), 'utf8')
  assert.ok(svgText.startsWith('<svg') && svgText.includes(RED) && (svgText.match(/<clipPath /g) ?? []).length === 2)

  assert.deepEqual(errors, [], 'no page errors')
  console.log(`Device mockups: ${Object.keys(DEVICES).length} devices and ${Object.keys(PRESETS).length} scenes drew in the app. Screenshots in ${screenshotDir}.`)
} finally {
  await browser?.close()
  await server.close()
}
