// Vehicle mockups in the app, for every vehicle brandkit has: it loads; lettering placed on each of
// its prepared areas lands on painted body (the editor marks the selected area when it does); and
// each wrap coverage projects onto it. Run it after adding or changing a vehicle (docs/vehicles.md):
//
//   npm run build && npm run test:vehicles:browser
//
// Screenshots of each vehicle, wrapped in full, go to .documentation/vehicles-browser (or
// SCREENSHOT_DIR). Set VEHICLES=truck-canopy,shc to check only some.

import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { VEHICLES } from '../../src/mockups/vehicle-layout.js'
import { VEHICLE_MODELS } from '../../src/mockups/vehicle-models.js'

const root = fileURLToPath(new URL('../../', import.meta.url))
const screenshotDir = resolve(process.env.SCREENSHOT_DIR ?? '.documentation/vehicles-browser')
mkdirSync(screenshotDir, { recursive: true })
// Software WebGL where there is no GPU (CI, containers).
const args = process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
const only = process.env.VEHICLES?.split(',').filter(Boolean)
const models = Object.keys(VEHICLE_MODELS).filter((id) => !only || only.includes(id))

const server = await preview({ root, logLevel: 'silent', preview: { port: 0, host: '127.0.0.1' } })
const base = server.resolvedUrls.local[0]
let browser
const failures = []
try {
  browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${base}?brand=northwind&view=vehicles`)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  const stage = page.locator('.vehicle-stage')
  const settled = (timeout = 180000) => page.waitForFunction(() => {
    const element = document.querySelector('.vehicle-stage')
    const text = document.querySelector('.vehicle-stage__status')?.textContent ?? ''
    return element && Number(element.dataset.decals) > 0 && !/Loading|Applying/.test(text) && !document.querySelector('.vehicles__controls [aria-busy="true"]')
  }, null, { timeout }).then(() => page.waitForTimeout(600))
  // A Segmented control becomes a dropdown when its options are many or long.
  const choose = async (label, option) => {
    const combobox = page.getByRole('combobox', { name: label })
    if (await combobox.count()) {
      await combobox.click()
      await page.getByRole('option', { name: option, exact: true }).click()
    } else await page.getByRole('group', { name: label }).getByRole('button', { name: option, exact: true }).click()
  }
  await settled()
  for (const id of models) {
    const label = VEHICLE_MODELS[id].label
    await choose('Vehicle', label)
    await settled()
    console.log(`${id} (${label})`)
    for (const [area, spec] of Object.entries(VEHICLES[id].areas)) {
      await choose('Body area', spec.label)
      await settled()
      const landed = (await stage.getAttribute('data-active-area')) === area
      console.log(`  ${landed ? 'ok  ' : 'FAIL'} lettering on ${area} (${spec.label})`)
      if (!landed) failures.push(`${id}: lettering on ${area} found no painted body`)
    }
    for (const coverage of ['Sides', 'Rear half', 'Full body']) {
      await page.getByRole('group', { name: 'Wrap coverage' }).getByRole('button', { name: coverage, exact: true }).click()
      await page.waitForFunction(() => /Wrap applied/.test(document.querySelector('.vehicle-stage__status')?.textContent ?? ''), null, { timeout: 60000 })
      await page.waitForTimeout(1200)
      const meshes = Number(await stage.getAttribute('data-wraps'))
      console.log(`  ${meshes > 0 ? 'ok  ' : 'FAIL'} ${coverage.toLowerCase()} wrap (${meshes} meshes)`)
      if (!(meshes > 0)) failures.push(`${id}: the ${coverage.toLowerCase()} wrap projected nothing`)
    }
    await page.getByRole('button', { name: 'Perspective' }).click()
    await page.waitForTimeout(600)
    await stage.screenshot({ path: `${screenshotDir}/${id}.png` })
    await page.getByRole('group', { name: 'Wrap coverage' }).getByRole('button', { name: 'None', exact: true }).click()
    await page.waitForTimeout(400)
  }
  assert.deepEqual(errors, [], `page errors: ${errors.join(' | ')}`)
  assert.deepEqual(failures, [], failures.join('\n'))
  console.log(`Vehicles: ${models.length} checked. Screenshots in ${screenshotDir}`)
} finally {
  await browser?.close()
  await new Promise((done) => server.httpServer.close(done))
}
