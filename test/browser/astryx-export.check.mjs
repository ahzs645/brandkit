// Run against the production build: npm run build && npm run test:astryx:browser.
// This verifies the UI handoff; astryx.check.mjs verifies the separate upstream consumer.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { astryxThemeConfig, astryxThemeModule, astryxThemeReport, astryxReadme } from '../../src/engine/astryx.js'

const root = fileURLToPath(new URL('../../', import.meta.url))
const brand = JSON.parse(await readFile(new URL('../../brands/northwind/brand.json', import.meta.url), 'utf8'))
const ctx = { brand }
assert.equal(brand.web?.page, undefined, 'the fixture must exercise a brand without a website specification')
const screenshotDir = resolve(process.env.SCREENSHOT_DIR ?? '.documentation/astryx-browser')
await mkdir(screenshotDir, { recursive: true })
const server = await preview({ root, logLevel: 'silent', preview: { port: 0, host: '127.0.0.1' } })
let browser
let page
const errors = []
try {
  browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : ['--no-sandbox', '--disable-dev-shm-usage']
  })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, reducedMotion: 'reduce' })
  page = await context.newPage()
  page.setDefaultTimeout(15000)
  page.setDefaultNavigationTimeout(30000)
  page.on('pageerror', error => errors.push(error.message))
  const url = new URL(server.resolvedUrls.local[0])
  url.searchParams.set('brand', brand.id)
  url.searchParams.set('view', 'web')
  await page.goto(url.href)
  const panel = page.getByRole('region', { name: 'Astryx theme' })
  await panel.waitFor()
  assert.equal(new URL(page.url()).searchParams.get('view'), 'web', 'the direct Web link must not fall back to Overview')
  assert.equal(await page.getByRole('heading', { name: 'Website components' }).count(), 0)

  const files = [
    ['Download theme', 'theme.js', astryxThemeModule(ctx)],
    ['Theme JSON', 'theme.json', `${JSON.stringify(astryxThemeConfig(ctx), null, 2)}\n`],
    ['Setup guide', 'README.md', astryxReadme(ctx)],
    ['Compatibility report', 'report.json', `${JSON.stringify(astryxThemeReport(ctx), null, 2)}\n`]
  ]
  for (const [label, name, expected] of files) {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      panel.getByRole('button', { name: label, exact: true }).click()
    ])
    assert.equal(download.suggestedFilename(), name)
    assert.equal(await readFile(await download.path(), 'utf8'), expected, `${name} must contain the current brand export`)
  }
  await panel.getByText('View theme source', { exact: true }).click()
  assert.equal(await panel.getByLabel('Astryx theme source').textContent(), astryxThemeModule(ctx))
  await page.screenshot({ path: resolve(screenshotDir, 'astryx-desktop.png'), fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'source and downloads must fit a phone viewport')
  await page.screenshot({ path: resolve(screenshotDir, 'astryx-phone.png'), fullPage: true })

  url.searchParams.set('share', '1')
  await page.goto(url.href)
  await page.getByRole('region', { name: 'Astryx theme' }).waitFor()
  assert.equal(new URL(page.url()).searchParams.get('view'), 'web', 'shared Web links must also remain available')
  assert.equal(await page.getByRole('button', { name: 'Download theme', exact: true }).isEnabled(), true)
  assert.deepEqual(errors, [], 'the new routes must not emit uncaught browser errors')
  await writeFile(resolve(screenshotDir, 'report.json'), `${JSON.stringify({ passed: ['Direct and shared Web routes', 'Four current-brand downloads', 'Theme source', '390px layout'], errors }, null, 2)}\n`)
  console.log('Astryx export UI: direct and shared Web routes, four downloads, source and phone layout passed.')
} catch (error) {
  if (page) await page.screenshot({ path: resolve(screenshotDir, 'failure.png'), fullPage: true, timeout: 5000 }).catch(() => {})
  await writeFile(resolve(screenshotDir, 'report.json'), `${JSON.stringify({ errors, failure: error.stack ?? error.message }, null, 2)}\n`)
  throw error
} finally {
  await browser?.close()
  await new Promise((done, reject) => server.httpServer.close(error => error ? reject(error) : done()))
}
