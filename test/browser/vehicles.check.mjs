// Every catalogue vehicle and prepared surface, through the production UI.
//   npm run build && npm run test:vehicles:browser
// Optional: BASE_URL=https://preview.example/brandkit/ CDP_URL=http://localhost:9222
// CHROMIUM_PATH/CHROMIUM_ARGS configure a local browser; SCREENSHOT_DIR saves captures.
// VEHICLES=truck-canopy,shc selects a subset. Browser contexts are isolated from user sessions.

import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { areasFor } from '../../src/mockups/vehicle-layout.js'
import { defaultConfiguration } from '../../src/mockups/vehicle-configuration.js'
import { VEHICLE_MODELS } from '../../src/mockups/vehicle-models.js'

const root = fileURLToPath(new URL('../../', import.meta.url))
const screenshotDir = resolve(process.env.SCREENSHOT_DIR ?? '.documentation/vehicles-browser')
mkdirSync(screenshotDir, { recursive: true })
const args = process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
const only = process.env.VEHICLES?.split(',').filter(Boolean)
const models = Object.keys(VEHICLE_MODELS).filter((id) => !only || only.includes(id))
assert.ok(models.length, 'VEHICLES must select at least one known model')
let server, browser, context, page
const failures = []
const errors = []
const checked = []

try {
  if (!process.env.BASE_URL) server = await preview({ root, logLevel: 'silent', preview: { port: 0, host: '127.0.0.1' } })
  const base = process.env.BASE_URL ?? server.resolvedUrls.local[0]
  const url = new URL(base)
  url.searchParams.set('brand', 'northwind'); url.searchParams.set('view', 'vehicles')
  browser = process.env.CDP_URL
    ? await chromium.connectOverCDP(process.env.CDP_URL)
    : await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args })
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(url.href)
  const stage = page.locator('.vehicle-stage')
  const ready = async () => { await page.waitForFunction(() => {
    const save = [...document.querySelectorAll('.vehicles__files button')].find((button) => button.textContent === 'Save JSON')
    return Boolean(document.querySelector('.vehicle-stage canvas') && save && !save.disabled)
  }, null, { timeout: 180000 }); await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))) }
  const choose = async (label, option) => {
    const combobox = page.getByRole('combobox', { name: label, exact: true })
    if (await combobox.count()) {
      await combobox.click()
      await page.getByRole('option', { name: option, exact: true }).click()
    } else await page.getByRole('group', { name: label, exact: true }).getByRole('button', { name: option, exact: true }).click()
  }
  const task = (id) => page.locator(`#vehicle-tab-${id}`).click()
  const waitLanded = (area) => page.waitForFunction((id) => document.querySelector('.vehicle-stage')?.dataset.activeArea === id, area, { timeout: 60000 })
  await ready()
  for (const id of models) {
    const label = VEHICLE_MODELS[id].label
    await task('product')
    await page.getByRole('button', { name: `Choose ${label}`, exact: true }).click()
    await ready()
    assert.equal(await page.locator('.vehicles__summary h1').textContent(), label)
    await task('artwork')
    // Foreign-model layers are deliberately retained. Start a new placement on this model.
    if (!(await stage.getAttribute('data-active-area'))) {
      await page.getByRole('button', { name: '+ Add layer', exact: true }).click()
      await page.waitForFunction(() => Boolean(document.querySelector('.vehicle-stage')?.dataset.activeArea), null, { timeout: 60000 })
    }
    const surfaces = []
    for (const [area, spec] of Object.entries(areasFor(id, defaultConfiguration(id)))) {
      await choose('Body area', spec.label)
      try { await waitLanded(area) } catch { failures.push(`${id}: ${area} found no painted body`) }
      const landed = (await stage.getAttribute('data-active-area')) === area
      surfaces.push({ area, label: spec.label, landed })
      console.log(`${id}: ${landed ? 'PASS' : 'FAIL'} ${area}`)
    }
    await task('configure')
    const wraps = []
    for (const coverage of ['Sides', 'Rear half', 'Full body']) {
      await choose('Wrap coverage', coverage)
      await page.waitForFunction(() => /Wrap applied/.test(document.querySelector('.vehicle-stage__status')?.textContent ?? '') && Number(document.querySelector('.vehicle-stage')?.dataset.wraps) > 0, null, { timeout: 60000 })
      const meshes = Number(await stage.getAttribute('data-wraps'))
      wraps.push({ coverage, meshes })
      assert.ok(meshes > 0, `${id}: ${coverage} projected no wrap geometry`)
    }
    await page.getByRole('group', { name: 'Camera', exact: true }).getByRole('button', { name: 'Perspective', exact: true }).click()
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
    await stage.screenshot({ path: resolve(screenshotDir, `${id}.png`) })
    await choose('Wrap coverage', 'None')
    await page.waitForFunction(() => Number(document.querySelector('.vehicle-stage')?.dataset.wraps) === 0)
    checked.push({ model: id, surfaces, wraps })
  }
  assert.deepEqual(errors, [], `page errors: ${errors.join(' | ')}`)
  assert.deepEqual(failures, [], failures.join('\n'))
  console.log(`Vehicles: ${models.length} checked. Screenshots in ${screenshotDir}`)
} catch (error) {
  failures.push(error.message)
  if (page) await page.screenshot({ path: resolve(screenshotDir, 'failure.png'), fullPage: true }).catch(() => {})
  throw error
} finally {
  writeFileSync(resolve(screenshotDir, 'results.json'), JSON.stringify({ checked, failures, pageErrors: errors }, null, 2))
  await context?.close()
  await browser?.close()
  if (server) await new Promise((done) => server.httpServer.close(done))
}
