// npm run build, then CHROMIUM_PATH=/usr/bin/chromium node test/browser/apparel.check.mjs
// Uses the built application and real controls; artifacts are optional via SCREENSHOT_DIR.
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { validateApparelProject } from '../../src/mockups/apparel-layout.js'

const root = fileURLToPath(new URL('../../', import.meta.url))
const screenshotDir = resolve(process.env.SCREENSHOT_DIR ?? '.documentation/apparel-browser')
await mkdir(screenshotDir, { recursive: true })
const server = await preview({ root, logLevel: 'silent', preview: { port: 0, host: '127.0.0.1' } })
const base = server.resolvedUrls.local[0]
const args = process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
let browser
try {
  browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${base}?brand=northwind&view=clothing`)
  const settled = async () => {
    await page.waitForSelector('.apparel-stage[data-ready="true"]', { timeout: 180000 })
    await page.waitForTimeout(250)
  }
  const section = (name) => page.getByRole('navigation', { name: 'Clothing inspector' }).getByRole('button', { name, exact: true }).click()
  const draft = () => page.evaluate(() => JSON.parse(localStorage.getItem('brandkit-apparel-draft:northwind')))
  await settled()
  let initial = await draft()
  assert.ok(initial.layers[0].logo, 'original brand artwork loaded')
  await page.screenshot({ path: `${screenshotDir}/apparel-crewneck-desktop.png`, fullPage: true })

  await section('Artwork')
  await page.getByRole('spinbutton', { name: 'Artwork width', exact: true }).fill('80')
  await settled()
  let project = await draft()
  assert.equal(project.layers[0].widthMm, 80)
  await page.getByRole('button', { name: 'Lock Brand lockup', exact: true }).click()
  assert.equal(await page.getByRole('spinbutton', { name: 'Artwork width', exact: true }).isDisabled(), true)
  await page.getByRole('button', { name: 'Unlock Brand lockup', exact: true }).click()
  await page.getByRole('button', { name: 'Hide Brand lockup', exact: true }).click()
  await settled()
  assert.equal(await page.locator('.apparel-stage').getAttribute('data-layers'), '0')
  await page.getByRole('button', { name: 'Show Brand lockup', exact: true }).click()
  await page.getByRole('button', { name: '+ Add', exact: true }).click()
  await page.getByRole('textbox', { name: 'Layer name', exact: true }).fill('Back identity')
  const options = await page.getByRole('combobox', { name: 'Garment brand artwork' }).locator('option').evaluateAll((items) => items.map((item) => item.value))
  const other = options.find((id) => id !== initial.layers[0].logo)
  if (other) await page.getByRole('combobox', { name: 'Garment brand artwork' }).selectOption(other)
  await settled()
  project = await draft()
  assert.equal(project.layers.length, 2)
  if (other) assert.notEqual(project.layers[0].logo, project.layers[1].logo, 'separate artwork references')
  assert.equal(project.layers[0].widthMm, 80, 'editing another layer leaves chest size alone')

  await section('Product')
  await page.getByRole('button', { name: /Pullover hoodie Hood/ }).click()
  await section('Configure')
  const beforeSize = (await draft()).layers
  await page.getByRole('combobox', { name: 'Garment size' }).selectOption('XL')
  await settled()
  assert.deepEqual((await draft()).layers, beforeSize, 'size changes preserve exact physical placements')
  await page.getByRole('button', { name: 'Heather grey', exact: true }).click()
  await page.getByRole('group', { name: 'Garment view' }).getByRole('button', { name: 'Perspective', exact: true }).click()
  await settled()
  await page.screenshot({ path: `${screenshotDir}/apparel-hoodie-desktop.png`, fullPage: true })

  await section('Review')
  await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('Apparel acceptance option')
  await page.getByRole('button', { name: 'Save as new', exact: true }).click()
  await page.getByRole('button', { name: /Apparel acceptance option Revision 1/ }).waitFor()
  await section('Configure')
  await page.getByRole('combobox', { name: 'Garment size' }).selectOption('XXL')
  await section('Review')
  assert.equal(await page.getByRole('button', { name: 'Update saved', exact: true }).isEnabled(), true, 'saved-project revision survives inspector navigation')
  await page.getByRole('button', { name: 'Update saved', exact: true }).click()
  await page.getByRole('button', { name: /Apparel acceptance option Revision 2/ }).waitFor()
  const beforeReload = await draft()
  await page.reload()
  await settled()
  assert.deepEqual(await draft(), beforeReload, 'browser reload recovers draft')
  await section('Review')
  await page.getByRole('button', { name: /Apparel acceptance option Revision 2/ }).click()
  await settled()

  const jsonPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click()
  const json = await jsonPromise
  const jsonText = await readFile(await json.path(), 'utf8')
  assert.deepEqual(validateApparelProject(JSON.parse(jsonText)), await draft())

  const pngPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export PNG', exact: true }).click()
  const png = await readFile(await (await pngPromise).path())
  assert.equal(png.readUInt32BE(16), 2000)
  assert.equal(png.readUInt32BE(20), 1600)

  const sheetPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download review sheet', exact: true }).click()
  const sheet = await readFile(await (await sheetPromise).path(), 'utf8')
  assert.ok(sheet.includes('80 ×'))
  assert.ok(sheet.includes('Generic garment preview'))
  await page.getByRole('button', { name: 'Flat layout', exact: true }).click()
  await page.screenshot({ path: `${screenshotDir}/apparel-flat-layout.png`, fullPage: true })

  await page.getByRole('button', { name: '3D preview', exact: true }).click()
  await section('Artwork')
  await page.setViewportSize({ width: 390, height: 844 })
  await settled()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, 'no mobile horizontal overflow')
  await page.screenshot({ path: `${screenshotDir}/apparel-mobile.png`, fullPage: true })
  assert.deepEqual(errors, [], `page errors: ${errors.join(' | ')}`)
  console.log('Apparel: artwork identity, independent layers, physical sizing, lock, visibility, garment switching, draft + named recovery, JSON, PNG, SVG and mobile layout passed.')
} finally {
  await browser?.close()
  await new Promise((done) => server.httpServer.close(done))
}
