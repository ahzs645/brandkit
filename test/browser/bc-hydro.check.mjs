// npm run build && CHROMIUM_PATH=/path/to/chromium npm run test:hydro:browser
// Exercises the production bundle, including its hashed source/report assets and clean exports.
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { unzipSync, strFromU8 } from 'fflate'

const root = fileURLToPath(new URL('../../', import.meta.url))
const output = resolve(process.env.SCREENSHOT_DIR ?? '.documentation/bc-hydro-browser')
mkdirSync(output, { recursive: true })
const args = process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : ['--no-sandbox', '--disable-dev-shm-usage']
assert.ok(Array.isArray(args) && args.every((arg) => typeof arg === 'string'))
const server = await preview({ root, logLevel: 'silent', preview: { port: 0, host: '127.0.0.1' } })
const base = server.resolvedUrls.local[0]
const result = { checks: [], downloads: [], sourcePages: 0, mobileViews: [] }
const errors = []
let browser

try {
  browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, acceptDownloads: true, reducedMotion: 'reduce' })
  const page = await context.newPage()
  page.setDefaultTimeout(45000)
  const watch = (tab) => {
    tab.on('pageerror', (error) => errors.push(error.message))
    tab.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  }
  watch(page)
  const download = async (locator) => {
    const [file] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), locator.click()])
    assert.equal(await file.failure(), null)
    const bytes = readFileSync(await file.path())
    result.downloads.push({ file: file.suggestedFilename(), bytes: bytes.length })
    assert.ok(bytes.length > 100)
    return bytes
  }
  const studioButton = (name) => page.locator('.studio__stage').getByRole('button', { name, exact: true })
  const inspectSvg = async () => page.locator('.studio__preview').evaluate(async (image) => (await fetch(image.src)).text())
  const waitImages = async (tab, selector) => {
    await tab.locator(selector).first().waitFor()
    await tab.waitForFunction((selector) => [...document.querySelectorAll(selector)].every((image) => image.complete && image.naturalWidth > 0), selector)
  }
  const noOverflow = async (tab, name) => {
    assert.ok(await tab.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: no horizontal page overflow`)
    result.mobileViews.push(name)
  }

  await page.goto(`${base}?brand=bc-hydro-1983&view=templates&template=cover-report`, { waitUntil: 'networkidle' })
  await waitImages(page, '.studio__preview')
  await studioButton('↓ PNG').waitFor({ state: 'visible' })
  await page.waitForFunction(() => ![...document.querySelectorAll('.studio__stage button')].find((button) => button.textContent.trim() === '↓ PNG')?.disabled)
  assert.match(await inspectSvg(), /id="layout-guides"[^>]*display="none"/)
  const rules = page.getByRole('checkbox', { name: 'Show layout rules', exact: true })
  await rules.check()
  await page.waitForFunction(async () => {
    const image = document.querySelector('.studio__preview')
    return image && /id="layout-guides"[^>]*display="inline"/.test(await (await fetch(image.src)).text())
  })
  const clean = (await download(studioButton('↓ SVG'))).toString()
  const annotated = (await download(studioButton('↓ SVG with rules'))).toString()
  assert.match(clean, /id="layout-guides"[^>]*display="none"/)
  assert.match(annotated, /id="layout-guides"[^>]*display="inline"/)
  assert.match(annotated, /1\/3 of cover width/)
  assert.match(annotated, /36 on 36 point/)
  assert.doesNotMatch(clean, /report-cover-source|<image\b/)
  const pngWithInspection = await download(studioButton('↓ PNG'))
  const pdf = await download(studioButton('↓ PDF'))
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
  await rules.uncheck()
  const pngWithoutInspection = await download(studioButton('↓ PNG'))
  assert.deepEqual(pngWithInspection, pngWithoutInspection, 'preview annotations must not change a PNG export')
  result.checks.push('independent rules toggle', 'clean and annotated SVG downloads', 'identical clean PNG with rules on/off', 'PDF download')
  console.log('Clean SVG, annotated SVG, PNG and PDF exports passed.')

  await page.getByRole('textbox', { name: 'Cover title', exact: true }).fill('Electric System\nPlans 1984–1994\nUpdated study')
  const extended = (await download(studioButton('↓ SVG with rules'))).toString()
  assert.match(extended, /Updated study/)
  assert.match(extended, /2 cap-heights/)
  await page.getByRole('textbox', { name: 'Cover title', exact: true }).fill('')
  const blank = (await download(studioButton('↓ SVG with rules'))).toString()
  assert.doesNotMatch(blank, />2 cap-heights</)
  assert.equal((blank.match(/>1 cap-height</g) ?? []).length, 1, 'only the subtitle-to-credits gap remains when title is cleared')
  await page.getByRole('textbox', { name: 'Cover title', exact: true }).fill('Restore the example')
  await page.getByRole('button', { name: 'Clear every field', exact: true }).click()
  result.checks.push('edited and empty title update construction annotations')

  const overlay = page.getByRole('checkbox', { name: 'Overlay original scan', exact: true })
  await overlay.check()
  await waitImages(page, '.studio__reference')
  await page.getByRole('slider', { name: 'Scan opacity', exact: true }).fill('72')
  assert.equal(await page.locator('.studio__reference').evaluate((image) => getComputedStyle(image).opacity), '0.72')
  await page.getByRole('button', { name: 'Reset overlay', exact: true }).click()
  assert.equal(await page.getByRole('slider', { name: 'Scan opacity', exact: true }).inputValue(), '50')
  await rules.check()
  await page.getByRole('checkbox', { name: 'Larger preview', exact: true }).check()
  await page.locator('.studio__comparison').screenshot({ path: resolve(output, 'report-cover-overlay.png') })
  await overlay.uncheck()
  await page.locator('.studio__comparison').screenshot({ path: resolve(output, 'report-cover-rules.png') })
  await page.getByRole('button', { name: 'Display', exact: true }).click()
  assert.equal(await overlay.isChecked(), false)
  await overlay.check()
  assert.equal(await page.getByRole('slider', { name: 'Scan opacity', exact: true }).inputValue(), '50')
  await waitImages(page, '.studio__reference')
  result.checks.push('source crop loads from production asset URL', 'opacity/reset controls', 'template switch resets source overlay')
  console.log('Edited title, rule visibility and source overlay controls passed.')

  // The complete report must work as a self-contained asset, not depend on unhashed siblings.
  await page.getByText('Manual coverage and fidelity', { exact: true }).click()
  const [audit] = await Promise.all([context.waitForEvent('page'), page.getByRole('link', { name: 'Read the full manual audit ↗', exact: true }).click()])
  watch(audit)
  audit.setDefaultTimeout(60000)
  await audit.waitForFunction(() => document.querySelector('#page-select') && !document.querySelector('#page-select').disabled)
  assert.equal(await audit.locator('#page-select option').count(), 48)
  await waitImages(audit, '#manual-stage img')
  for (const id of await audit.locator('#page-select option').evaluateAll((options) => options.map((option) => option.value))) {
    await audit.locator('#page-select').selectOption(id)
    await waitImages(audit, '#manual-stage img')
    assert.match(await audit.locator('#selected-page-title').innerText(), new RegExp(`^${id} · `))
    result.sourcePages++
  }
  await audit.locator('#page-select').selectOption('H26')
  await audit.locator('#view-mode').selectOption('paired')
  assert.equal(await audit.locator('#manual-stage figure').count(), 2)
  await audit.locator('#view-mode').selectOption('overlay')
  await audit.locator('#page-opacity').fill('64')
  assert.equal(await audit.locator('#manual-stage .layer').evaluate((image) => getComputedStyle(image).opacity), '0.64')
  await audit.locator('#reset-page').click()
  assert.equal(await audit.locator('#page-opacity').inputValue(), '50')
  await audit.locator('#template-grid').getByRole('button', { name: 'Inspect this example', exact: true }).first().click()
  await audit.locator('#template-dialog').waitFor({ state: 'visible' })
  await audit.locator('#template-mode').selectOption('scan')
  await audit.locator('#template-rules').check()
  await waitImages(audit, '#template-stage img')
  await audit.locator('#template-dialog').screenshot({ path: resolve(output, 'audit-template-comparison.png') })
  assert.equal(await audit.locator('#template-mode option[value="before"]').count(), 0, 'adding rules does not falsely classify the clean report cover as changed')
  await audit.locator('#close-dialog').click()
  await audit.locator('#page-select').selectOption('H18')
  await audit.locator('#template-grid .template-card').filter({ hasText: 'Rail business card' }).getByRole('button', { name: 'Inspect this example', exact: true }).click()
  await audit.locator('#template-mode').selectOption('before')
  assert.equal(await audit.locator('#template-stage figure').count(), 2)
  await audit.locator('#close-dialog').click()
  await audit.locator('#page-select').selectOption('H26')
  await audit.locator('#page-comparison').screenshot({ path: resolve(output, 'manual-page-comparison.png') })
  result.checks.push('all 48 original/rebuilt manual pages load', 'self-contained report comparison modes', 'template scan/rules/before-current dialog')
  console.log('All 48 manual page comparisons and the template audit dialog passed.')

  await page.bringToFront()
  await page.goto(`${base}?brand=bc-hydro-1983&view=templates&template=card-rail`, { waitUntil: 'networkidle' })
  await waitImages(page, '.studio__preview')
  const rail = (await download(studioButton('↓ SVG'))).toString()
  assert.match(rail, /bce-route/)
  await page.getByRole('checkbox', { name: 'Overlay original scan', exact: true }).check()
  await waitImages(page, '.studio__reference')
  // A short card sits in the sticky stage; capture the page without repeatedly scrolling
  // its nested image against the sticky boundary while Playwright waits for element stability.
  await page.screenshot({ path: resolve(output, 'rail-card-overlay.png'), fullPage: true })
  const printerZip = unzipSync(await download(studioButton('↓ Printer package')))
  const printerSvgs = Object.entries(printerZip).filter(([path]) => path.endsWith('.svg'))
  assert.ok(printerSvgs.length > 0)
  for (const [path, bytes] of printerSvgs) assert.doesNotMatch(strFromU8(bytes), /layout-guides|layout-guide-/, `${path}: annotations must not become editable printer fields`)
  result.checks.push('BCE vector in Rail card', 'Rail source overlay', 'printer package omits annotation fields')

  await page.goto(`${base}?brand=bc-hydro-1983&view=templates&template=cover-report`, { waitUntil: 'networkidle' })
  const word = unzipSync(await download(studioButton('↓ Word')))
  const documentXml = strFromU8(word['word/document.xml'])
  assert.equal((documentXml.match(/<w:sectPr[\s>]/g) ?? []).length, 3, 'report exports cover, interior and back as three explicit sections')
  result.checks.push('three-page Word report sequence')

  await page.goto(`${base}?brand=bc-hydro-1983&view=logos&mark=bce-route`, { waitUntil: 'networkidle' })
  const marks = page.locator('#related-mark-bce-route')
  await marks.waitFor()
  assert.equal(await marks.locator('.asset-card').count(), 2)
  for (const card of await marks.locator('.asset-card').all()) {
    const svg = (await download(card.getByRole('button', { name: /SVG/ }))).toString()
    assert.match(svg, /<path\b/)
    assert.doesNotMatch(svg, /<(?:text|image)\b/)
  }
  await marks.screenshot({ path: resolve(output, 'bce-route-vectors.png') })
  result.checks.push('both BCE vector downloads have paths and no font/image dependency')

  await page.setViewportSize({ width: 390, height: 844 })
  await noOverflow(page, 'BCE marks')
  await page.goto(`${base}?brand=bc-hydro-1983&view=templates&template=cover-report`, { waitUntil: 'networkidle' })
  await page.getByRole('checkbox', { name: 'Show layout rules', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Overlay original scan', exact: true }).check()
  await waitImages(page, '.studio__reference')
  await noOverflow(page, 'Report cover and inspection controls')
  await page.locator('.studio__stage').screenshot({ path: resolve(output, 'template-mobile.png') })
  await audit.bringToFront()
  await audit.setViewportSize({ width: 390, height: 844 })
  await noOverflow(audit, '48-page audit')
  await audit.screenshot({ path: resolve(output, 'audit-mobile.png') })
  assert.deepEqual(errors, [], 'no runtime errors or failed production assets')
  writeFileSync(resolve(output, 'report.json'), `${JSON.stringify(result, null, 2)}\n`)
  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  writeFileSync(resolve(output, 'report.json'), `${JSON.stringify({ ...result, errors, failure: error.stack }, null, 2)}\n`)
  throw error
} finally {
  await browser?.close()
  await new Promise((done) => server.httpServer.close(done))
}
