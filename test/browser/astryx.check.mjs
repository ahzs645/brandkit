// Build examples/astryx first. Exercise the published Astryx components, not replicas.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('../../', import.meta.url))
const example = resolve(root, 'examples/astryx')
const requireExample = createRequire(resolve(example, 'package.json'))
const { preview } = await import(requireExample.resolve('vite'))
const config = JSON.parse(await readFile(resolve(example, 'generated/theme.json'), 'utf8'))
const secondary = JSON.parse(await readFile(resolve(example, 'generated/secondary-theme.json'), 'utf8'))
const captures = resolve(process.env.SCREENSHOT_DIR ?? resolve(root, '.documentation/astryx-example'))
await mkdir(captures, { recursive: true })
const server = await preview({ root: example, logLevel: 'silent', preview: { host: '127.0.0.1', port: 0 } })
const base = server.resolvedUrls.local[0]
const args = process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : ['--no-sandbox', '--disable-dev-shm-usage']
let browser
const results = []

const hexRgb = (hex) => `rgb(${hex.slice(1).match(/../g).map((part) => parseInt(part, 16)).join(', ')})`
const token = (theme, name, mode) => {
  const value = theme.tokens[name]
  assert.ok(value, `The exported theme has ${name}`)
  return hexRgb(Array.isArray(value) ? value[mode === 'light' ? 0 : 1] : value)
}
const style = (locator, property) => locator.evaluate((element, name) => getComputedStyle(element)[name], property)

try {
  browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args })
  const page = await browser.newPage({ viewport: { width: 1280, height: 1040 }, reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { level: 1 }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  assert.ok(await page.locator('.brand-logo').evaluate((image) => image.complete && image.naturalWidth > 0), 'Outlined source logo loads')
  assert.ok(await page.evaluate(() => [...document.fonts].some((face) => face.family === 'Inter' && face.status === 'loaded')), 'The real local Inter web font loads')
  assert.match(await style(page.getByLabel('Workspace name'), 'fontFamily'), /Inter/, 'Input consumes the brand body font')
  assert.match(await style(page.getByRole('heading', { level: 1 }), 'fontFamily'), /Inter Display/, 'Heading consumes the brand display font')

  for (const mode of ['light', 'dark']) {
    await page.getByRole('button', { name: mode === 'light' ? 'Light' : 'Dark', exact: true }).click()
    await page.waitForFunction((expected) => document.documentElement.getAttribute('data-theme') === expected, mode)
    assert.equal(await style(page.getByRole('button', { name: 'Save preferences', exact: true }), 'backgroundColor'), token(config, '--color-accent', mode), `${mode}: root primary button uses generated fill`)
    assert.equal(await style(page.getByTestId('root-accent-text'), 'color'), token(config, '--color-text-accent', mode), `${mode}: root accent text uses generated text colour`)
    assert.equal(await style(page.getByRole('button', { name: 'Open scoped dialog', exact: true }), 'backgroundColor'), token(secondary, '--color-accent', mode), `${mode}: nested primary button uses its own fill`)
    assert.equal(await style(page.getByTestId('secondary-accent-text'), 'color'), token(secondary, '--color-text-accent', mode), `${mode}: nested accent text uses its own colour`)
    assert.notEqual(token(config, '--color-accent', mode), token(secondary, '--color-accent', mode), `${mode}: distinct themes remain distinct`)
    await page.screenshot({ path: resolve(captures, `${mode}.png`), fullPage: true })
    await page.getByRole('combobox', { name: 'Scoped selection' }).click()
    const scopedOption = page.getByRole('option', { name: 'Brand files', exact: true })
    await scopedOption.waitFor()
    assert.equal(await style(scopedOption.getByTestId('scoped-option-brand'), 'color'), token(secondary, '--color-text-accent', mode), `${mode}: popup retains nested accent`)
    await scopedOption.click()
    await page.getByRole('button', { name: 'Open scoped dialog', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Scoped theme preview' })
    await dialog.waitFor()
    assert.equal(await style(page.getByTestId('dialog-accent-text'), 'color'), token(secondary, '--color-text-accent', mode), `${mode}: modal keeps nested accent in the top layer`)
    assert.equal(await style(dialog.getByRole('button', { name: 'Done', exact: true }), 'backgroundColor'), token(secondary, '--color-accent', mode), `${mode}: modal primary button keeps nested fill`)
    await page.screenshot({ path: resolve(captures, `${mode}-dialog.png`) })
    await dialog.getByRole('button', { name: 'Done', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Open scoped dialog', 'Closing dialog returns focus to trigger')
    results.push(`${mode}: buttons, accent text, independent theme scope, selection popup and modal`)
  }
  await page.getByLabel('Workspace name').fill('Northern research team')
  await page.getByRole('combobox', { name: 'Export format' }).click()
  await page.getByRole('option', { name: 'Documents and slides', exact: true }).click()
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'Saved “Northern research team” with Documents and slides.' }).waitFor()
  results.push('Controlled input, selector portal and save action')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: resolve(captures, 'mobile-dark.png'), fullPage: true })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Mobile layout does not scroll horizontally')
  await page.getByRole('button', { name: 'Open scoped dialog', exact: true }).click()
  const mobileDialog = page.getByRole('dialog', { name: 'Scoped theme preview' })
  await mobileDialog.waitFor()
  const bounds = await mobileDialog.boundingBox()
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390, 'Mobile dialog fits the viewport')
  await page.screenshot({ path: resolve(captures, 'mobile-dark-dialog.png') })
  await page.keyboard.press('Escape')
  await mobileDialog.waitFor({ state: 'hidden' })
  results.push('390px mobile layout and modal dismissal')
  assert.deepEqual(errors, [], 'No browser exceptions or failed resources')
  await writeFile(resolve(captures, 'report.json'), `${JSON.stringify({ package: '@astryxdesign/core', version: '0.7.11', passed: results, errors }, null, 2)}\n`)
  console.log(`Astryx 0.7.11: ${results.length} browser journeys passed. Captures: ${captures}`)
} finally {
  await browser?.close()
  await new Promise((done) => server.httpServer.close(done))
}
