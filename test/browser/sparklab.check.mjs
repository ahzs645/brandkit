// End-to-end SPARK Lab checks in Chromium. No files from other brands are changed.
// npm run build && CHROMIUM_PATH=/usr/bin/chromium npm run test:sparklab:browser
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { createServer, preview } from 'vite'
import { chromium } from 'playwright'

const root = new URL('../../', import.meta.url).pathname
const brand = JSON.parse(readFileSync(`${root}brands/sparklab/brand.json`, 'utf8'))
const server = await createServer({ root, logLevel: 'silent', server: { port: 0 } })
await server.listen()
const base = server.resolvedUrls.local[0]
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) })
const shotDir = `${root}brands/sparklab/site/screenshots/`
mkdirSync(shotDir, { recursive: true })
const pages = ['site/index.html', 'docs/brand-details.html', 'motion/index.html']
const open = async (url, options = {}) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, ...options })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  return { page, errors }
}
try {
  for (const path of pages) for (const width of [1440, 390]) {
    const { page, errors } = await open(`${base}brands/sparklab/${path}`, { viewport: { width, height: 1000 } })
    assert.deepEqual(errors, [], path)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${path} at ${width} fits`)
    assert.ok(await page.locator('h1').isVisible())
    assert.equal(await page.locator('img').evaluateAll((images) => images.filter((img) => !img.complete || !img.naturalWidth).length), 0)
    if (path === 'site/index.html') await page.screenshot({ path: `${shotDir}${width === 1440 ? 'desktop' : 'mobile'}.jpg`, fullPage: true, type: 'jpeg', quality: 82 })
    await page.close()
  }
  console.log('Standalone pages: desktop and phone passed.')
  const { page: motion } = await open(`${base}brands/sparklab/motion/index.html`)
  assert.equal(await motion.locator('.stage[data-study]').count(), brand.motion.studies.length)
  await motion.getByRole('button', { name: 'Pause Ignite', exact: true }).click()
  assert.equal(await motion.locator('.stage[data-study="ignite"]').evaluate((el) => el.classList.contains('is-paused')), true)
  await motion.getByRole('button', { name: 'Replay Ignite', exact: true }).click()
  assert.equal(await motion.locator('.stage[data-study="ignite"]').evaluate((el) => el.classList.contains('is-paused')), false)
  await motion.close()
  const { page: reduced } = await open(`${base}brands/sparklab/motion/index.html`, { reducedMotion: 'reduce' })
  assert.equal(await reduced.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length), 0)
  assert.equal(await reduced.locator('.sp-words').first().evaluate((el) => getComputedStyle(el).opacity), '1')
  await reduced.close()
  console.log('Motion: replay, pause and reduced motion passed.')

  const { page: app, errors } = await open(`${base}?brand=sparklab`)
  await app.getByRole('tab', { name: 'Motion', exact: true }).count().then(async (count) => {
    if (count) await app.getByRole('tab', { name: 'Motion', exact: true }).click()
    else await app.locator('nav.tabs').getByRole('button', { name: 'Motion', exact: true }).click()
  })
  await app.locator('nav[aria-label="Motion studies"] button').first().waitFor()
  assert.equal(await app.locator('nav[aria-label="Motion studies"] button').count(), brand.motion.studies.length)
  await app.locator('.motion-stage-panel .motion-stage').waitFor()
  await app.waitForFunction(() => Boolean(document.querySelector('.motion-stage-panel .motion-stage')?.shadowRoot?.querySelector('svg')))
  await app.locator('nav.tabs').getByRole('button', { name: 'Templates', exact: true }).click()
  await app.locator('.studio__stage svg, .studio__stage img').first().waitFor()
  await app.locator('nav.tabs').getByRole('button', { name: 'Guide', exact: true }).click()
  await app.locator('main img').first().waitFor()
  assert.deepEqual(errors, [], 'app requests and rendering')
  if (process.env.SPARKLAB_KIT_OUT) {
    const downloaded = app.waitForEvent('download', { timeout: 180000 })
    const result = await app.evaluate(async () => {
      const [{ loadBuiltIn }, { loadBrandFonts }, { buildKit }, { createBrowserRenderer, download, zip }] = await Promise.all([
        import('/src/app/brands.js'), import('/src/fonts/provider.js'), import('/src/engine/kit.js'), import('/src/export/render.js')
      ])
      const { brand, source } = await loadBuiltIn('sparklab')
      const fonts = await loadBrandFonts(brand, source.read)
      const { files, skipped } = await buildKit({ brand, fonts }, { renderer: createBrowserRenderer(), readAsset: source.read })
      const errors = skipped.map(({ path, error }) => `${path}: ${error.message}`)
      if (!errors.length) download(new Blob([await zip(files, 'sparklab-kit')], { type: 'application/zip' }), 'sparklab-kit.zip')
      return { files: files.size, errors }
    })
    assert.deepEqual(result.errors, [], 'complete browser kit export')
    mkdirSync(dirname(process.env.SPARKLAB_KIT_OUT), { recursive: true })
    await (await downloaded).saveAs(process.env.SPARKLAB_KIT_OUT)
    console.log(`Complete kit: ${result.files} files including PNGs, PDFs and Office documents.`)
  }
  await app.close()
  const { page: shared, errors: shareErrors } = await open(`${base}?brand=sparklab&share=1&view=motion`)
  await shared.locator('nav[aria-label="Motion studies"] button').first().waitFor()
  assert.deepEqual(shareErrors, [])
  await shared.close()
  console.log('App: Motion, Templates, Guide and shared brand centre passed.')

  // The build hashes standalone HTML URLs; verify those emitted assets work in production too.
  const built = await preview({ root, base: process.env.BASE_PATH || '/brandkit/', logLevel: 'silent', preview: { port: 0 } })
  try {
    const { page: production, errors: productionErrors } = await open(`${built.resolvedUrls.local[0]}?brand=sparklab&view=motion`)
    assert.deepEqual(productionErrors, [], 'production resources')
    await production.locator('nav[aria-label="Motion studies"] button').first().waitFor()
    await production.waitForFunction(() => Boolean(document.querySelector('.motion-stage-panel .motion-stage')?.shadowRoot?.querySelector('svg')))
    assert.deepEqual(productionErrors, [], 'production build')
    await production.close()
  } finally { await new Promise((done) => built.httpServer.close(done)) }
  console.log('SPARK Lab: desktop, phone, offline pages, app, shared view, reduced motion and production build passed.')
} finally {
  await browser.close()
  await server.close()
}
