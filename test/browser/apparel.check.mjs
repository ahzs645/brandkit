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
const args = process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : ['--no-sandbox', '--disable-dev-shm-usage']
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
  await page.screenshot({ path: `${screenshotDir}/apparel-imported-hoodie-desktop.png`, fullPage: true })

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

  assert.equal(initial.product, 'zip-hoodie')
  assert.equal(initial.assetId, 'elvaerwyn-zip-hoodie-2018-v1')
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

  // Earlier named designs remain downloadable even when their retired asset cannot open.
  const legacy = { ...beforeReload, schema: 'brandkit-apparel-mockup/1', product: 'crewneck' }
  await page.evaluate((project) => new Promise((resolve, reject) => {
    const request = indexedDB.open('brandkit-mockup-projects', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, transaction = db.transaction('projects', 'readwrite')
      transaction.objectStore('projects').put({ id: 'legacy-apparel-fixture', brandId: 'northwind', kind: 'apparel', name: 'Preserved earlier garment', revision: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), project })
      transaction.oncomplete = () => { db.close(); resolve() }
      transaction.onabort = () => { db.close(); reject(transaction.error) }
    }
  }), legacy)
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  const beforeFailedOpen = await draft()
  await page.getByRole('button', { name: /Preserved earlier garment Revision 1/ }).click()
  await page.getByText(/This draft uses the retired illustrative garment/).first().waitFor()
  assert.deepEqual(await draft(), beforeFailedOpen, 'failed legacy open leaves active work untouched')
  const legacyPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download Preserved earlier garment JSON', exact: true }).click()
  assert.deepEqual(JSON.parse(await readFile(await (await legacyPromise).path(), 'utf8')), legacy, 'legacy project recovered without editor validation or remapping')
  assert.deepEqual(await draft(), beforeFailedOpen)

  const jsonPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click()
  const json = await jsonPromise
  const jsonText = await readFile(await json.path(), 'utf8')
  assert.deepEqual(validateApparelProject(JSON.parse(jsonText)), await draft())

  const pngPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export PNG', exact: true }).click()
  const png = await readFile(await (await pngPromise).path())
  assert.equal(png.readUInt32BE(16), 1600)
  assert.equal(png.readUInt32BE(20), await page.locator('.apparel-stage').evaluate((element) => Math.round(1600 * element.clientHeight / element.clientWidth)))

  const sheetPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download review sheet', exact: true }).click()
  const sheet = await readFile(await (await sheetPromise).path(), 'utf8')
  assert.ok(sheet.includes('80 ×'))
  assert.ok(sheet.includes('Elvaerwyn'))
  assert.equal((sheet.match(/<image /g) ?? []).length, 2, 'source model renders, no drawn replacement garments')
  await page.getByRole('button', { name: '2D views', exact: true }).click()
  await page.getByRole('group', { name: 'Garment view' }).getByRole('button', { name: 'Front', exact: true }).click()
  await settled()
  const frontPixels = await page.locator('.apparel-stage canvas').evaluate((canvas) => canvas.toDataURL())
  await page.screenshot({ path: `${screenshotDir}/apparel-orthographic-front.png`, fullPage: true })
  await page.getByRole('group', { name: 'Garment view' }).getByRole('button', { name: 'Back', exact: true }).click()
  await settled()
  assert.notEqual(await page.locator('.apparel-stage canvas').evaluate((canvas) => canvas.toDataURL()), frontPixels, 'front and back use different views of the mesh')
  await page.screenshot({ path: `${screenshotDir}/apparel-orthographic-back.png`, fullPage: true })

  await page.getByRole('button', { name: '3D preview', exact: true }).click()
  await section('Artwork')
  await page.setViewportSize({ width: 390, height: 844 })
  await settled()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, 'no mobile horizontal overflow')
  await page.screenshot({ path: `${screenshotDir}/apparel-mobile.png`, fullPage: true })
  assert.deepEqual(errors, [], `page errors: ${errors.join(' | ')}`)
  console.log('Apparel: artwork identity, independent layers, physical sizing, lock, visibility, source model, 3D/orthographic views, draft + legacy named recovery, JSON, PNG, SVG and mobile layout passed.')
} finally {
  await browser?.close()
  await new Promise((done) => server.httpServer.close(done))
}
