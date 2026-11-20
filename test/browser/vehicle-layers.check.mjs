// Vehicle product/configuration/layer/project journeys through the real UI.
// npm run build && node test/browser/vehicle-layers.check.mjs
// BASE_URL skips local preview; CDP_URL connects to an existing browser with a NEW isolated context.
// CHROMIUM_PATH / CHROMIUM_ARGS select a browser. SCREENSHOT_DIR receives screenshots and exports.
// EXPECTED_RENDERER=webgl|software3d optionally requires one renderer. Both paths draw the source
// 3D meshes; results identify the path and do not treat software rendering as GPU qualification.

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { IMPORTED_PICKUP_ASSET_SHA256 } from '../../src/mockups/imported-pickup.js'

const root = fileURLToPath(new URL('../../', import.meta.url))
const output = resolve(process.env.SCREENSHOT_DIR ?? '.documentation/vehicle-layers-browser')
mkdirSync(output, { recursive: true })
const args = process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
const expectedRenderer = process.env.EXPECTED_RENDERER ?? null
assert.ok(expectedRenderer === null || ['webgl', 'software3d'].includes(expectedRenderer), 'EXPECTED_RENDERER must be webgl or software3d')
const draftKey = 'brandkit-vehicle-mockup:northwind'
const records = []
const pageErrors = []
let server, browser, context, mobileContext, page, alternate
let failure = null
let renderer = null

const step = (name, details = {}) => { records.push({ name, ...details }); console.log(`PASS ${name}`) }
const task = (p, id) => p.locator(`#vehicle-tab-${id}`).click()
const ready = async (p) => {
  await p.waitForFunction(() => {
    const stage = document.querySelector('.vehicle-stage')
    const button = [...document.querySelectorAll('.vehicles__files button')].find((item) => item.textContent === 'Save JSON')
    return stage?.dataset.preview === 'model' && ['webgl', 'software3d'].includes(stage.dataset.renderer)
      && button && !button.disabled && stage.querySelector('canvas')
  }, null, { timeout: 180000 })
  await p.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
}
const choose = async (p, label, option) => {
  let combo = p.getByRole('combobox', { name: label, exact: true })
  if (!await combo.count()) combo = p.locator('label.field').filter({ hasText: label }).getByRole('combobox')
  if (await combo.count()) {
    await combo.click()
    await p.getByRole('option', { name: option, exact: true }).click()
  } else {
    await p.getByRole('group', { name: label, exact: true }).getByRole('button', { name: option, exact: true }).click()
  }
  await ready(p)
}
const textField = async (p, label, value) => {
  const input = p.getByRole('textbox', { name: label, exact: true })
  await input.fill(value)
  await input.press('Tab')
}
const readDraft = (p) => p.evaluate((key) => JSON.parse(localStorage.getItem(key)), draftKey)
const waitLayer = (p, name, tagline) => p.waitForFunction(({ key, name, tagline }) => {
  const project = JSON.parse(localStorage.getItem(key) ?? 'null')
  const layer = project?.layers?.find((item) => item.name === name)
  return layer && (tagline === undefined || layer.artwork.tagline === tagline)
}, { key: draftKey, name, tagline }, { timeout: 30000 })
const selectLayer = (p, name) => p.locator('.vehicles__layer').filter({ has: p.getByText(name, { exact: true }) }).click()
const shot = async (p, name, { fullPage = false } = {}) => {
  await ready(p)
  await p.locator('.vehicles__controls').evaluate((element) => { element.scrollTop = 0 })
  await p.evaluate(() => window.scrollTo(0, 0))
  const path = resolve(output, `${name}.png`)
  await p.screenshot({ path, fullPage })
  return path
}
const download = async (p, buttonName, name) => {
  const pending = p.waitForEvent('download', { timeout: 180000 })
  await p.getByRole('button', { name: buttonName, exact: true }).click()
  const file = await pending
  assert.equal(await file.failure(), null, `${buttonName} download failed`)
  const path = resolve(output, name)
  await file.saveAs(path)
  return path
}
const jsonSnapshot = async (p, name) => JSON.parse(readFileSync(await download(p, 'Save JSON', name), 'utf8'))
const watch = (p) => p.on('pageerror', (error) => pageErrors.push(error.message))
const stageDigest = async (p, name) => {
  await ready(p)
  const pixels = await p.locator('.vehicle-stage__canvas').screenshot({ ...(name ? { path: resolve(output, `${name}.png`) } : {}) })
  return createHash('sha256').update(pixels).digest('hex')
}
const projection = async (p, label, value) => {
  await choose(p, 'Model projection', label)
  assert.equal(await p.locator('.vehicle-stage').getAttribute('data-projection'), value)
}
const camera = async (p, name) => {
  await p.getByRole('group', { name: 'Camera', exact: true }).getByRole('button', { name, exact: true }).click()
  await ready(p)
}

try {
  if (!process.env.BASE_URL) server = await preview({ root, logLevel: 'silent', preview: { port: 0, host: '127.0.0.1' } })
  const url = new URL(process.env.BASE_URL ?? server.resolvedUrls.local[0])
  url.searchParams.set('brand', 'northwind'); url.searchParams.set('view', 'vehicles')
  browser = process.env.CDP_URL
    ? await chromium.connectOverCDP(process.env.CDP_URL)
    : await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args })
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
  context.setDefaultTimeout(90000)
  page = await context.newPage(); watch(page)
  await page.goto(url.href)
  await ready(page)
  renderer = await page.locator('.vehicle-stage').getAttribute('data-renderer')
  assert.ok(['webgl', 'software3d'].includes(renderer), 'The editor must render the real model scene')
  if (expectedRenderer) assert.equal(renderer, expectedRenderer)
  assert.equal((await readDraft(page)).model, 'pickup')
  assert.equal((await readDraft(page)).assetReferences.pickup.sha256, IMPORTED_PICKUP_ASSET_SHA256)

  // Product catalogue: search, category and a persisted favourite through visible controls.
  await page.getByRole('searchbox', { name: 'Search vehicles', exact: true }).fill('crew cab')
  await page.getByRole('combobox', { name: 'Vehicle category', exact: true }).selectOption('Pickups')
  assert.equal(await page.locator('.vehicle-catalog__choose').count(), 1)
  await page.getByRole('button', { name: 'Favourite Crew-cab pickup', exact: true }).click()
  await page.getByRole('button', { name: '★ Favourites', exact: true }).click()
  assert.equal(await page.locator('.vehicle-catalog__choose').count(), 1)
  await page.getByRole('button', { name: '★ Favourites', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Search vehicles', exact: true }).fill('')
  await page.getByRole('combobox', { name: 'Vehicle category', exact: true }).selectOption('All vehicles')
  assert.equal(await page.locator('.vehicle-catalog__choose').count(), 4)
  assert.equal(await page.getByRole('button', { name: /Choose Work truck/ }).count(), 0, 'Legacy procedural assets are not offered for new designs')
  const thumbnails = await page.locator('.vehicle-catalog__choose img').evaluateAll((images) => images.map((image) => ({ src: image.src, alt: image.alt })))
  assert.equal(new Set(thumbnails.map((image) => image.src)).size, 4)
  assert.ok(thumbnails.every((image) => image.alt.includes('original 3D model')))
  await shot(page, '01-vehicle-library-desktop')
  step('Catalogue search, category and favourite', { renderer })

  // Doors and bed carry independent artwork references on the actual imported pickup.
  await task(page, 'artwork')
  await textField(page, 'Layer name', 'Door identity')
  await textField(page, 'Supporting line', 'FIELD SERVICES')
  await textField(page, 'Website', 'northwind.example')
  await waitLayer(page, 'Door identity', 'FIELD SERVICES')
  await choose(page, 'Body area', 'Left bed side')
  await textField(page, 'Layer name', 'Bed identity')
  await textField(page, 'Supporting line', 'FIELD OPERATIONS')
  await textField(page, 'Website', 'operations.example')
  await waitLayer(page, 'Bed identity', 'FIELD OPERATIONS')
  let project = await readDraft(page)
  assert.equal(project.layers.find((layer) => layer.name === 'Door identity').artwork.tagline, 'FIELD SERVICES')
  assert.equal(project.layers.find((layer) => layer.name === 'Door identity').artwork.website, 'northwind.example')
  const bedId = project.layers.find((layer) => layer.name === 'Bed identity').id
  step('Independent cab and bed artwork on the source pickup')

  // Numeric/keyboard controls update canonical physical placement and undo restores it.
  const width = page.getByRole('slider', { name: /^Width/ })
  const beforeWidth = project.layers.find((layer) => layer.id === bedId).placement.width
  // Decrease from the fitted default so the prepared area's height cannot clamp an increase.
  await width.focus(); await width.press('ArrowLeft'); await width.press('ArrowLeft'); await width.press('Tab')
  project = await readDraft(page)
  const afterWidth = project.layers.find((layer) => layer.id === bedId).placement.width
  assert.ok(afterWidth < beforeWidth, 'Width keyboard controls must change physical dimensions')
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await ready(page)
  assert.ok(Math.abs((await readDraft(page)).layers.find((layer) => layer.id === bedId).placement.width - (afterWidth + 0.01)) < 1e-9)
  await page.getByRole('button', { name: 'Redo', exact: true }).click(); await ready(page)
  assert.equal((await readDraft(page)).layers.find((layer) => layer.id === bedId).placement.width, afterWidth)
  await page.getByRole('spinbutton', { name: 'Across (m)', exact: true }).fill('0.08')
  await page.getByRole('spinbutton', { name: 'Across (m)', exact: true }).press('Tab')
  project = await readDraft(page)
  const exactBedPlacement = structuredClone(project.layers.find((layer) => layer.id === bedId).placement)
  step('Physical placement, keyboard editing, undo and redo')

  await page.getByRole('checkbox', { name: 'Lock artwork', exact: true }).check()
  assert.equal(await width.isDisabled(), true, 'Locked layer controls must be disabled')
  await page.locator('.vehicle-stage__canvas').focus().catch(() => {})
  await page.keyboard.press('ArrowLeft')
  assert.deepEqual((await readDraft(page)).layers.find((layer) => layer.id === bedId).placement, exactBedPlacement)
  await page.getByRole('checkbox', { name: 'Lock artwork', exact: true }).uncheck()
  const countBeforeHide = Number(await page.locator('.vehicle-stage').getAttribute('data-decals'))
  await page.getByRole('checkbox', { name: 'Visible', exact: true }).uncheck()
  await page.waitForFunction(() => document.querySelector('.vehicle-stage__selection')?.style.display === 'none')
  assert.equal((await readDraft(page)).layers.find((layer) => layer.id === bedId).visible, false)
  await page.waitForFunction((previous) => Number(document.querySelector('.vehicle-stage')?.dataset.decals) < previous, countBeforeHide)
  await page.getByRole('checkbox', { name: 'Visible', exact: true }).check()
  step('Lock prevents movement and visibility removes only its layer')

  await page.getByRole('button', { name: 'Duplicate', exact: true }).click()
  await textField(page, 'Layer name', 'Bed alternate')
  await textField(page, 'Supporting line', 'ALTERNATE ARTWORK')
  await waitLayer(page, 'Bed alternate', 'ALTERNATE ARTWORK')
  project = await readDraft(page)
  assert.equal(project.layers.filter((layer) => layer.area === 'left-bed').length, 2)
  assert.equal(project.layers.find((layer) => layer.id === bedId).artwork.tagline, 'FIELD OPERATIONS')
  await page.getByRole('button', { name: 'Remove layer', exact: true }).click()
  await selectLayer(page, 'Bed identity')
  step('Duplicate and remove independent artwork on the same surface')

  await page.getByRole('button', { name: 'Copy to right bed side', exact: true }).click()
  project = await readDraft(page)
  const opposite = project.layers.find((layer) => layer.area === 'right-bed')
  assert.ok(opposite, 'Opposite-side copy must create its own layer')
  assert.equal(opposite.artwork.tagline, 'FIELD OPERATIONS')
  assert.equal(opposite.placement.u, -exactBedPlacement.u)
  assert.equal(opposite.placement.rotation, -exactBedPlacement.rotation || 0)
  await page.getByRole('group', { name: 'Camera', exact: true }).getByRole('button', { name: 'Perspective', exact: true }).click()
  await shot(page, '02-independent-artwork-desktop')
  step('Opposite-side copy preserves readable orientation')

  // Orthographic views use the same source model and exact layer placements as perspective.
  const perspectiveLayers = structuredClone((await readDraft(page)).layers)
  const perspectivePixels = await stageDigest(page, '03-pickup-perspective')
  await projection(page, '2D elevations', 'orthographic')
  await camera(page, 'Left')
  const leftPixels = await stageDigest(page, '04-pickup-left-elevation')
  assert.notEqual(leftPixels, perspectivePixels, 'Changing projection must change the rendered view')
  assert.deepEqual((await readDraft(page)).layers, perspectiveLayers)
  const elevationPixels = [leftPixels]
  for (const view of ['Right', 'Front', 'Rear']) {
    await camera(page, view)
    elevationPixels.push(await stageDigest(page, `04-pickup-${view.toLowerCase()}-elevation`))
  }
  assert.equal(new Set(elevationPixels).size, 4, 'Each elevation must show its own model view')
  assert.deepEqual((await readDraft(page)).layers, perspectiveLayers)
  step('Perspective and four orthographic views preserve the same source artwork', { renderer })

  // Only the original cover nodes change. The six painted surfaces retain every layer exactly.
  await task(page, 'configure')
  await choose(page, 'Bed cover', 'Open bed')
  await camera(page, 'Above')
  const openLayers = structuredClone((await readDraft(page)).layers)
  const openPixels = await stageDigest(page, '05-original-open-bed')
  await choose(page, 'Bed cover', 'Tonneau cover')
  await camera(page, 'Above')
  project = await readDraft(page)
  assert.equal(project.configuration.cover, 'tonneau')
  assert.deepEqual(project.layers, openLayers)
  assert.ok(project.layers.every((layer) => !layer.unplaced))
  assert.equal(project.assetReferences.pickup.sha256, IMPORTED_PICKUP_ASSET_SHA256)
  const coverPixels = await stageDigest(page, '06-original-tonneau-cover')
  assert.notEqual(coverPixels, openPixels, 'Original tonneau must visibly cover the open bed')
  assert.equal(await page.getByRole('checkbox', { name: 'Roof / ladder rack', exact: true }).count(), 0)
  assert.equal(await page.getByRole('combobox', { name: 'Canopy sides', exact: true }).count(), 0)
  await choose(page, 'Bed cover', 'Open bed')
  await camera(page, 'Above')
  assert.deepEqual((await readDraft(page)).layers, openLayers)
  assert.equal(await stageDigest(page), openPixels, 'Restoring open bed must restore the same source-model pixels')
  step('Source open/tonneau toggle changes geometry visibility and preserves all artwork')

  // Product switching retains original model targets; restoring the pickup restores its layers.
  await task(page, 'product')
  await page.getByRole('button', { name: 'Choose Lightweight SUV', exact: true }).click(); await ready(page)
  project = await readDraft(page)
  assert.equal(project.model, 'suv')
  assert.ok(project.layers.every((layer) => layer.unplaced))
  const retainedLayers = project.layers.map(({ unplaced, unplacedReason, ...layer }) => layer)
  await task(page, 'artwork')
  assert.equal(await page.getByRole('heading', { name: 'Unplaced artwork', exact: true }).count(), 1)
  await shot(page, '07-suv-retained-pickup-artwork')
  await task(page, 'product')
  await page.getByRole('button', { name: 'Choose Crew-cab pickup', exact: true }).click(); await ready(page)
  project = await readDraft(page)
  assert.ok(project.layers.every((layer) => !layer.unplaced))
  assert.deepEqual(project.layers.find((layer) => layer.id === bedId).placement, exactBedPlacement)
  assert.deepEqual(project.layers.map(({ unplaced, unplacedReason, ...layer }) => layer), retainedLayers)
  step('Vehicle switching preserves original model artwork')

  // Named project, reload and two-tab optimistic revision check through the user controls.
  await task(page, 'review')
  const projectName = 'Vehicle acceptance · ' + Date.now()
  await page.getByRole('textbox', { name: 'Project name', exact: true }).fill(projectName)
  await page.getByRole('button', { name: 'Save as new', exact: true }).click()
  const record = page.locator('.mockup-projects__record').filter({ hasText: projectName })
  await record.waitFor()
  const projectId = await record.getAttribute('data-project-id')
  assert.ok(projectId)
  assert.match(await record.textContent(), /Revision 1/)
  await page.reload(); await ready(page); await task(page, 'review')
  await page.locator(`[data-project-id="${projectId}"] .mockup-projects__open`).click(); await ready(page)
  assert.match(await page.locator('.mockup-projects').textContent(), /revision 1/)
  const reopened = await jsonSnapshot(page, 'named-project-reopened.json')
  assert.equal(reopened.layers.find((layer) => layer.id === bedId).artwork.tagline, 'FIELD OPERATIONS')
  assert.deepEqual(reopened.layers.find((layer) => layer.id === bedId).placement, exactBedPlacement)
  alternate = await context.newPage(); watch(alternate)
  await alternate.goto(url.href); await ready(alternate); await task(alternate, 'review')
  await alternate.locator(`[data-project-id="${projectId}"] .mockup-projects__open`).click(); await ready(alternate)
  await task(page, 'artwork'); await selectLayer(page, 'Bed identity')
  await textField(page, 'Supporting line', 'REVISION TWO'); await waitLayer(page, 'Bed identity', 'REVISION TWO')
  await task(page, 'review'); await page.getByRole('button', { name: 'Update saved', exact: true }).click()
  await page.locator(`[data-project-id="${projectId}"]`).getByText(/Revision 2/).waitFor()
  await task(alternate, 'artwork'); await selectLayer(alternate, 'Bed identity')
  await textField(alternate, 'Supporting line', 'STALE TAB CHANGES'); await waitLayer(alternate, 'Bed identity', 'STALE TAB CHANGES')
  await task(alternate, 'review'); await alternate.getByRole('button', { name: 'Update saved', exact: true }).click()
  await alternate.locator('.mockup-projects__error').waitFor()
  assert.match(await alternate.locator('.mockup-projects__error').textContent(), /changed in another tab/)
  const retained = await jsonSnapshot(alternate, 'conflict-retained-work.json')
  assert.equal(retained.layers.find((layer) => layer.id === bedId).artwork.tagline, 'STALE TAB CHANGES')
  await shot(alternate, '08-project-revision-conflict')
  await alternate.getByRole('button', { name: 'Refresh', exact: true }).click()
  await alternate.locator(`[data-project-id="${projectId}"]`).getByText(/Revision 2/).waitFor()
  await alternate.locator(`[data-project-id="${projectId}"] .mockup-projects__open`).click(); await ready(alternate)
  const recovered = await jsonSnapshot(alternate, 'conflict-reopened-latest.json')
  assert.equal(recovered.layers.find((layer) => layer.id === bedId).artwork.tagline, 'REVISION TWO')
  await alternate.close(); alternate = null
  step('Named project reload and two-tab revision conflict with recovery')

  // Exported files are verified, then JSON is reopened using the same file input a user uses.
  const jsonPath = await download(page, 'Save JSON', 'vehicle-layer-project.json')
  const exportedProject = JSON.parse(readFileSync(jsonPath, 'utf8'))
  assert.equal(exportedProject.schema, 'brandkit-vehicle-mockup/3')
  assert.equal(exportedProject.assetReferences.pickup.assetVersion, 'innerscene-crew-cab-tonneau/1')
  assert.equal(exportedProject.assetReferences.pickup.surfaceVersion, 'innerscene-crew-cab/1')
  assert.equal(exportedProject.assetReferences.pickup.sha256, IMPORTED_PICKUP_ASSET_SHA256)
  await page.locator('.vehicles__files input[type="file"]').setInputFiles(jsonPath)
  await ready(page)
  await task(page, 'review')
  assert.equal(await page.getByRole('button', { name: 'Update saved', exact: true }).isDisabled(), true, 'JSON import must detach the named-project binding')
  assert.deepEqual((await jsonSnapshot(page, 'imported-pickup-project.json')).layers, exportedProject.layers)
  await projection(page, '2D elevations', 'orthographic')
  await camera(page, 'Left')
  const pngPath = await download(page, 'Export PNG', 'vehicle-layer-preview.png')
  const png = readFileSync(pngPath)
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(png.readUInt32BE(16), 2400)
  assert.equal(png.readUInt32BE(20), 1500)
  await task(page, 'review')
  const sheetPath = await download(page, 'Export review sheet', 'vehicle-layer-review.svg')
  const sheet = readFileSync(sheetPath, 'utf8')
  assert.equal((sheet.match(/<image\b/g) ?? []).length, 4)
  assert.equal((sheet.match(/href="data:image\/png;base64,/g) ?? []).length, 4)
  const reviewImages = [...sheet.matchAll(/href="(data:image\/png;base64,[^"]+)"/g)].map((match) => match[1])
  assert.equal(new Set(reviewImages).size, 4, 'Review views must contain four distinct source-model renders')
  for (const label of ['Left side', 'Right side', 'Front', 'Rear']) assert.ok(sheet.includes(label))
  assert.match(sheet, /Bed identity/)
  assert.match(sheet, /mm/)
  assert.ok(!/href="https?:/.test(sheet), 'Review sheet must keep its rendered views self-contained')
  const reviewPage = await context.newPage()
  await reviewPage.setContent(`<html><head><style>body{margin:0;background:#ddd}svg{display:block;width:900px;height:auto;margin:auto}</style></head><body>${sheet}</body></html>`)
  await reviewPage.evaluate(async () => {
    await Promise.all([...document.querySelectorAll('image')].map(async (element) => { const image = new Image(); image.src = element.getAttribute('href'); await image.decode() }))
  })
  await reviewPage.screenshot({ path: resolve(output, '09-exported-review-sheet.png'), fullPage: true })
  await reviewPage.close()
  step('JSON round-trip, 2400 × 1500 PNG and self-contained four-view review sheet')

  // A bad pinned asset version must fail without replacing the current work.
  const incompatible = structuredClone(exportedProject)
  incompatible.assetReferences.pickup.assetVersion = 'future-incompatible/999'
  await page.locator('.vehicles__files input[type="file"]').setInputFiles({ name: 'incompatible-vehicle.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(incompatible)) })
  await page.locator('.vehicle-stage__status--error').waitFor()
  assert.match(await page.locator('.vehicle-stage__status--error').textContent(), /different version/)
  const unchanged = await jsonSnapshot(page, 'after-rejected-import.json')
  assert.deepEqual(unchanged.layers, exportedProject.layers)
  step('Incompatible asset version rejected without replacing work')

  // Legacy recovery is an explicit older JSON import, never a new catalogue selection.
  const legacyFixture = {
    schema: 'brandkit-vehicle-mockup/2', model: 'truck-canopy', paint: exportedProject.paint,
    backdrop: 'studio', area: 'left-body', artwork: exportedProject.layers[0].artwork,
    wrap: exportedProject.wrap,
    placements: {
      left: { u: .02, v: .01, width: .72, rotation: 0 },
      'left-body': { u: .15, v: .07, width: 1, rotation: 0 }
    }
  }
  await page.locator('.vehicles__files input[type="file"]').setInputFiles({ name: 'legacy-saved-canopy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacyFixture)) })
  await ready(page)
  const legacy = await jsonSnapshot(page, 'legacy-project-migrated.json')
  assert.equal(legacy.model, 'truck-canopy')
  assert.equal(legacy.schema, 'brandkit-vehicle-mockup/3')
  assert.equal(legacy.layers.length, 2)
  for (const layer of legacy.layers) assert.deepEqual(layer.placement, legacyFixture.placements[layer.area])
  await task(page, 'configure')
  await choose(page, 'Bed cover', 'Open bed')
  const legacyOpen = await readDraft(page)
  assert.equal(legacyOpen.layers.find((layer) => layer.area === 'left-body').unplaced, true)
  assert.deepEqual(legacyOpen.layers.map((layer) => layer.placement), legacy.layers.map((layer) => layer.placement))
  await choose(page, 'Bed cover', 'Raised canopy')
  assert.deepEqual((await readDraft(page)).layers, legacy.layers)
  await shot(page, '10-legacy-json-recovery')
  await page.locator('.vehicles__files input[type="file"]').setInputFiles(jsonPath)
  await ready(page)
  assert.deepEqual((await jsonSnapshot(page, 'pickup-restored-after-legacy-check.json')).layers, exportedProject.layers)
  step('Explicit legacy JSON migration retains placements through removal and restoration')

  // Viewport/touch emulation is a responsive UI check, not qualification on physical phones.
  mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, acceptDownloads: true })
  mobileContext.setDefaultTimeout(90000)
  const mobile = await mobileContext.newPage(); watch(mobile)
  await mobile.goto(url.href); await ready(mobile)
  await mobile.locator('.vehicles__files input[type="file"]').setInputFiles(jsonPath); await ready(mobile)
  await mobile.locator('#vehicle-tab-artwork').tap()
  await selectLayer(mobile, 'Bed identity')
  await mobile.getByRole('spinbutton', { name: 'Across (m)', exact: true }).fill('0.06')
  await mobile.getByRole('spinbutton', { name: 'Across (m)', exact: true }).press('Tab')
  const mobileDraft = await readDraft(mobile)
  assert.equal(mobileDraft.layers.find((layer) => layer.id === bedId).placement.u, 0.06)
  assert.equal(mobileDraft.layers.find((layer) => layer.id === bedId).placement.width, exactBedPlacement.width)
  const metrics = await mobile.evaluate(() => ({ frameWidth: innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }))
  assert.ok(metrics.scrollWidth - metrics.clientWidth <= 1, `Mobile document overflows: ${JSON.stringify(metrics)}`)
  const taskSizes = await mobile.locator('.vehicles__tabs [role="tab"]').evaluateAll((tabs) => tabs.map((tab) => tab.getBoundingClientRect().height))
  assert.ok(taskSizes.every((height) => height >= 44), 'Mobile task buttons need at least 44 px height')
  await shot(mobile, '11-mobile-artwork', { fullPage: true })
  await mobile.locator('#vehicle-tab-configure').tap()
  await projection(mobile, '2D elevations', 'orthographic')
  await choose(mobile, 'Bed cover', 'Tonneau cover')
  await camera(mobile, 'Above')
  assert.equal((await readDraft(mobile)).configuration.cover, 'tonneau')
  assert.deepEqual((await readDraft(mobile)).layers, mobileDraft.layers)
  await shot(mobile, '12-mobile-components', { fullPage: true })
  step('390 px emulated touch viewport, numeric placement and original source cover', { ...metrics, renderer: await mobile.locator('.vehicle-stage').getAttribute('data-renderer') })

  assert.deepEqual(pageErrors, [], `Uncaught browser errors: ${pageErrors.join(' | ')}`)
  console.log(`Vehicle layer UI: ${records.length} journeys passed (${renderer}); screenshots and exports: ${output}`)
} catch (error) {
  failure = { message: error.message, stack: error.stack }
  if (page) await page.screenshot({ path: resolve(output, 'failure.png'), fullPage: true }).catch(() => {})
  throw error
} finally {
  writeFileSync(resolve(output, 'results.json'), JSON.stringify({ renderer, expectedRenderer, qualification: renderer === 'webgl' ? 'WebGL UI journey' : renderer === 'software3d' ? 'Source-mesh software 3D UI journey; not GPU qualification' : 'Renderer not reached', records, pageErrors, failure }, null, 2))
  await mobileContext?.close()
  await context?.close()
  await browser?.close()
  if (server) await new Promise((done) => server.httpServer.close(done))
}
