// The top-level Patterns view, against the production app and the deployed base path.
// npm run build && BASE_PATH=/brandkit/ CHROMIUM_PATH=/usr/bin/chromium npm run test:patterns:view:browser
// Optional SCREENSHOT_DIR keeps desktop/mobile captures and a small JSON summary.
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { pattern } from '../../src/engine/artwork.js'
import { patternLibrary } from '../../src/engine/pattern-catalog.js'

const root = fileURLToPath(new URL('../../', import.meta.url))
const ids = ['firstform', 'ddcnorth', 'overtheedge', 'sparklab', 'northwind', 'bc-province-1977', 'bc-hydro-1983']
const shotDir = process.env.SCREENSHOT_DIR ? resolve(process.env.SCREENSHOT_DIR) : null
if (shotDir) mkdirSync(shotDir, { recursive: true })
const args = process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : ['--no-sandbox', '--disable-dev-shm-usage']
assert.ok(Array.isArray(args) && args.every((arg) => typeof arg === 'string'), 'CHROMIUM_ARGS must be a JSON array')
const server = await preview({ root, logLevel: 'silent', preview: { port: 0, host: '127.0.0.1' } })
const base = server.resolvedUrls.local[0]
const report = { brands: [], patterns: 0, applications: 0, downloads: 0, sourceNoteDownloads: 0, resourceLinks: 0 }
let browser

const open = async (url, width = 1440) => {
  const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 }, acceptDownloads: true, reducedMotion: 'reduce' })
  page.setDefaultTimeout(45000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  page.on('requestfailed', (request) => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`${request.failure()?.errorText} ${request.url()}`) })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.locator('.patterns-view').waitFor()
  return { page, errors }
}

const waitForCards = (page, count) => page.waitForFunction((expected) => document.querySelectorAll('.pattern-card').length === expected, count)
const detailId = (page) => page.locator('#pattern-detail').getAttribute('data-pattern-id')
const waitForSelected = async (page, id) => {
  await page.waitForFunction((expected) => document.querySelector('#pattern-detail')?.dataset.patternId === expected && new URLSearchParams(location.search).get('pattern') === expected, id)
  await page.locator('.patterns-detail__art img').evaluate((image) => image.decode())
}

const capture = async (page, name) => {
  if (!shotDir) return
  await page.locator('.patterns-view img').evaluateAll(async (images) => {
    await Promise.all(images.map((image) => { image.loading = 'eager'; return image.decode() }))
  })
  await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: resolve(shotDir, name), fullPage: true })
}

const getDownload = async (page, format) => {
  const [file] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    page.locator('.patterns-detail__exports').getByRole('button', { name: new RegExp(format + '$') }).click()
  ])
  assert.equal(await file.failure(), null)
  report.downloads++
  return { name: file.suggestedFilename(), bytes: readFileSync(await file.path()) }
}

try {
  browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args })
  for (const id of ids) {
    const brand = JSON.parse(readFileSync(resolve(root, `brands/${id}/brand.json`), 'utf8'))
    const library = patternLibrary(brand)
    const { page, errors } = await open(`${base}?brand=${id}&view=patterns`)
    let selectedId
    let sharedUrl
    try {
      await page.getByRole('heading', { name: `Patterns for ${brand.name}`, exact: true }).waitFor()
      assert.equal(await page.locator('nav.tabs').getByRole('button', { name: 'Patterns', exact: true }).getAttribute('aria-current'), 'page')
      await waitForCards(page, brand.patterns.length)
      await page.waitForFunction((count) => document.querySelectorAll('.pattern-card__art img').length === count, brand.patterns.length)
      const previews = await page.locator('.pattern-card').evaluateAll(async (cards) => Promise.all(cards.map(async (card) => {
        const svg = await fetch(card.querySelector('img').src).then((response) => response.text())
        return { id: card.dataset.patternId, svg: /<svg\b/.test(svg), finite: !/NaN|Infinity|undefined/.test(svg), geometry: /<(?:g|path|circle|polyline|polygon)\b/.test(svg) }
      })))
      assert.deepEqual(previews.map((item) => item.id), brand.patterns.map((item) => item.id), `${id}: every registered pattern appears in source order`)
      assert.ok(previews.every((item) => item.svg && item.finite && item.geometry), `${id}: all cards contain actual finite SVG artwork`)

      const last = library.patterns.at(-1)
      // Search and filters show from twelve patterns; a smaller library is shown whole.
      if (library.patterns.length >= 12) {
        // A filtered fallback must become the URL selection and survive a full reload.
        const group = library.groups.find((item) => item.id !== library.patterns[0].groupId) ?? library.groups[0]
        await page.getByRole('combobox', { name: /^Collection/ }).click()
        await page.getByRole('option', { name: `${group.label} (${group.count})`, exact: true }).click()
        await waitForCards(page, group.count)
        const groupFirst = library.patterns.find((item) => item.groupId === group.id)
        await waitForSelected(page, groupFirst.id)
        await page.reload({ waitUntil: 'networkidle' })
        await waitForCards(page, brand.patterns.length)
        await waitForSelected(page, groupFirst.id)

        const composition = library.patterns.find((item) => item.kind !== library.patterns[0].kind) ?? library.patterns[0]
        await page.getByRole('combobox', { name: /^Composition/ }).click()
        await page.getByRole('option', { name: composition.kindLabel, exact: true }).click()
        await waitForCards(page, library.patterns.filter((item) => item.kind === composition.kind).length)
        await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
        await waitForCards(page, brand.patterns.length)
        const search = page.getByRole('searchbox', { name: 'Search patterns', exact: true })
        await search.fill(last.id)
        await page.locator(`.pattern-card[data-pattern-id="${last.id}"]`).waitFor()
        assert.ok(await page.locator('.pattern-card').count() < brand.patterns.length, `${id}: search narrows the library`)
        await search.fill('no-pattern-matches-this-qa-query')
        await waitForCards(page, 0)
        assert.match(await page.locator('.patterns-empty').innerText(), /No patterns match/)
        await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
        await waitForCards(page, brand.patterns.length)
      } else {
        assert.equal(await page.getByRole('searchbox', { name: 'Search patterns' }).count(), 0, `${id}: a small library has no filters`)
      }

      // Keyboard selection and byte-for-byte SVG parity with the existing engine.
      const choice = page.locator(`.pattern-card[data-pattern-id="${last.id}"] button`)
      await choice.focus()
      await choice.press('Enter')
      await waitForSelected(page, last.id)
      assert.equal(await choice.getAttribute('aria-pressed'), 'true')
      const svg = await getDownload(page, 'SVG')
      assert.equal(svg.name, `${id}-${last.id}.svg`)
      assert.equal(svg.bytes.toString('utf8'), pattern({ brand }, last.spec), `${id}: download preserves original engine geometry`)
      const png = await getDownload(page, 'PNG')
      assert.equal(png.name, `${id}-${last.id}.png`)
      assert.deepEqual([...png.bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
      assert.ok(png.bytes.readUInt32BE(16) > 0 && png.bytes.readUInt32BE(20) > 0, `${id}: raster dimensions are valid`)

      // The source-backed application preview opens its actual editable template.
      const applied = library.patterns.find((item) => item.applications.length)
      assert.ok(applied, `${id}: existing creative applications are discoverable`)
      await page.locator(`.pattern-card[data-pattern-id="${applied.id}"] button`).click()
      await waitForSelected(page, applied.id)
      assert.equal(await page.locator('.patterns-motif').count(), applied.motifs.length)
      assert.equal(await page.locator('.patterns-application').count(), library.applications.length)
      await page.waitForFunction((count) => document.querySelectorAll('.patterns-application__art img').length === count, library.applications.length)
      await page.locator('.patterns-application__art img').evaluateAll(async (images) => {
        await Promise.all(images.map((image) => { image.loading = 'eager'; return image.decode() }))
      })
      const applicationBounds = await page.locator('.patterns-application').evaluateAll((cards) => cards.map((card) => {
        const art = card.querySelector('.patterns-application__art').getBoundingClientRect()
        const image = card.querySelector('.patterns-application__art img').getBoundingClientRect()
        const body = card.querySelector('.patterns-application__body').getBoundingClientRect()
        return { id: card.dataset.templateId, contained: image.top >= art.top - 1 && image.bottom <= art.bottom + 1 && image.left >= art.left - 1 && image.right <= art.right + 1, separate: body.top >= art.bottom - 1 }
      }))
      assert.ok(applicationBounds.every((item) => item.contained && item.separate), `${id}: all application images stay inside their art panels and above their captions: ${JSON.stringify(applicationBounds.filter((item) => !item.contained || !item.separate))}`)
      await page.getByRole('checkbox', { name: `Related to ${applied.name}`, exact: true }).check()
      assert.equal(await page.locator('.patterns-application').count(), applied.applications.length)
      const related = applied.applications[0]
      const card = page.locator(`.patterns-application[data-template-id="${related.id}"]`)
      assert.match(await card.locator('.patterns-tag').innerText(), related.relationship === 'family' ? /pattern family/ : /selected pattern/)
      const deepUrl = page.url()
      await card.getByRole('link', { name: 'Open in Templates ↗', exact: true }).click()
      await page.locator('.studio__preview').waitFor()
      assert.equal(new URL(page.url()).searchParams.get('view'), 'templates')
      assert.equal(new URL(page.url()).searchParams.get('template'), related.id)
      await page.goto(deepUrl, { waitUntil: 'networkidle' })
      await waitForSelected(page, applied.id)
      selectedId = await detailId(page)

      const resources = page.locator('.patterns-resources a')
      assert.equal(await resources.count(), library.resources.length, `${id}: existing explorer and guide pages stay discoverable`)
      for (const href of await resources.evaluateAll((links) => links.map((link) => link.href))) {
        // Vite may inline a short source-note file as a data URL in production.
        const response = await page.evaluate(async (url) => {
          const resource = await fetch(url)
          return { status: resource.status, bytes: (await resource.arrayBuffer()).byteLength }
        }, href)
        assert.equal(response.status, 200, `${id}: resource resolves`)
        assert.ok(response.bytes > 0, `${id}: resource contains its actual source content`)
        report.resourceLinks++
      }
      const inlineNotes = page.locator('.patterns-resources a[download$=".md"]')
      if (await inlineNotes.count()) {
        const [notes] = await Promise.all([page.waitForEvent('download'), inlineNotes.first().click()])
        assert.equal(await notes.failure(), null, `${id}: inlined source notes download through a real click`)
        assert.match(notes.suggestedFilename(), /\.md$/)
        assert.ok(readFileSync(await notes.path(), 'utf8').trim().length > 100, `${id}: downloaded notes contain the supplied Markdown`)
        report.downloads++
        report.sourceNoteDownloads++
      }
      if (id === 'sparklab') {
        assert.equal(await page.locator('.patterns-resources a[href*="arrow-patterns"]').count(), 1)
        assert.equal(await page.locator('.patterns-resources a[href*="patterns-and-templates"]').count(), 1)
      }

      if (id === 'firstform') {
        await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(base).origin })
        await page.getByRole('button', { name: 'Share', exact: true }).click()
        const dialog = page.getByRole('dialog')
        await dialog.waitFor()
        await dialog.getByRole('button', { name: 'Copy link', exact: true }).click()
        await dialog.getByRole('button', { name: 'Copied', exact: true }).waitFor()
        sharedUrl = await page.evaluate(() => navigator.clipboard.readText())
        assert.equal(sharedUrl, await dialog.getByRole('textbox', { name: 'Share link', exact: true }).inputValue())
        const parsed = new URL(sharedUrl)
        assert.equal(parsed.searchParams.get('brand'), id)
        assert.equal(parsed.searchParams.get('view'), 'patterns')
        assert.equal(parsed.searchParams.get('pattern'), selectedId, 'Copied share link retains the selected pattern')
        assert.equal(parsed.searchParams.get('share'), '1')
        await dialog.getByRole('button', { name: 'Close', exact: true }).click()
      } else sharedUrl = `${base}?brand=${id}&view=patterns&pattern=${encodeURIComponent(selectedId)}&share=1`

      if (id.startsWith('bc-')) assert.match(await page.locator('.patterns-head').innerText(), /historical reconstruction/i)
      await capture(page, `patterns-${id}-desktop.png`)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${id}: desktop fits`)
      assert.deepEqual(errors, [], `${id}: no desktop script or resource errors`)
    } finally { await page.close() }

    const { page: mobile, errors: mobileErrors } = await open(sharedUrl, 390)
    try {
      assert.equal(await mobile.locator('.app--shared').count(), 1)
      await waitForCards(mobile, brand.patterns.length)
      await waitForSelected(mobile, selectedId)
      assert.equal(await mobile.locator('nav.tabs').getByRole('button', { name: 'Patterns', exact: true }).getAttribute('aria-current'), 'page')
      const another = library.patterns.find((item) => item.id !== selectedId) ?? library.patterns[0]
      await mobile.locator(`.pattern-card[data-pattern-id="${another.id}"] button`).click()
      await waitForSelected(mobile, another.id)
      assert.equal(new URL(mobile.url()).searchParams.get('share'), '1', 'Selecting a pattern retains shared mode')
      assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${id}: shared 390 px view has no outer horizontal overflow`)
      await capture(mobile, `patterns-${id}-mobile.png`)
      assert.deepEqual(mobileErrors, [], `${id}: no shared mobile script or resource errors`)
    } finally { await mobile.close() }
    report.brands.push({ id, patterns: brand.patterns.length, applications: library.applications.length, mobile: 390 })
    report.patterns += brand.patterns.length
    report.applications += library.applications.length
    console.log(`PASS ${id}: ${brand.patterns.length} patterns, search/filters, deep links, SVG/PNG, ${library.applications.length} applications, shared 390 px`)
  }
  assert.ok(report.sourceNoteDownloads > 0, 'At least one inlined Markdown resource was downloaded by clicking its link')
  if (shotDir) writeFileSync(resolve(shotDir, 'patterns-view-summary.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(`Patterns view passed: ${report.brands.length} brands, ${report.patterns} patterns, ${report.applications} applications, ${report.downloads} real downloads, ${report.resourceLinks} resource links.`)
} finally {
  await browser?.close()
  await new Promise((done) => server.httpServer.close(done))
}
