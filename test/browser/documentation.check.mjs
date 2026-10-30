// Production Documents workflow, including real browser downloads and import recovery.
// npm run build && CHROMIUM_PATH=/usr/bin/chromium npm run test:documents:browser
// Optional: SCREENSHOT_DIR=/path/to/captures; CHROMIUM_ARGS='["--no-sandbox", ...]'.
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { unzipSync, strFromU8 } from 'fflate'

const root = fileURLToPath(new URL('../../', import.meta.url))
const ids = JSON.parse(readFileSync(resolve(root, 'brands/index.json'), 'utf8')).map((entry) => entry.id)
const shotDir = process.env.SCREENSHOT_DIR ? resolve(process.env.SCREENSHOT_DIR) : null
if (shotDir) mkdirSync(shotDir, { recursive: true })
const launchArgs = process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : ['--no-sandbox', '--disable-dev-shm-usage']
assert.ok(Array.isArray(launchArgs) && launchArgs.every((arg) => typeof arg === 'string'), 'CHROMIUM_ARGS must be a JSON array of arguments')
const report = { brands: [], downloads: 0, editing: [], mobileWidths: [] }
const server = await preview({ root, logLevel: 'silent', preview: { port: 0, host: '127.0.0.1' } })
let browser

const download = async (page, name) => {
  const [file] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    page.getByRole('button', { name, exact: true }).click()
  ])
  assert.equal(await file.failure(), null, `${name}: completed download`)
  const bytes = readFileSync(await file.path())
  assert.ok(bytes.length > 0, `${name}: nonempty file`)
  report.downloads++
  return { bytes, name: file.suggestedFilename() }
}

const sourceOf = async (page) => {
  const file = await download(page, 'Download source')
  assert.match(file.name, /\.json$/)
  return { ...file, model: JSON.parse(file.bytes.toString('utf8')) }
}

const waitForPreview = async (page, title) => {
  await page.waitForFunction((expected) => {
    const doc = document.querySelector('.documents-preview iframe')?.contentDocument
    return doc?.querySelectorAll('article.page').length === 6 && (!expected || doc.querySelector('.s-Title')?.textContent === expected)
  }, title)
  await page.locator('.documents-preview iframe').evaluate(async (frame) => {
    await frame.contentDocument.fonts.ready
    await Promise.all([...frame.contentDocument.images].map((image) => image.decode()))
  })
}

const previewText = (page) => page.frameLocator('.documents-preview iframe').locator('body').innerText()

const checkWord = (file, title) => {
  assert.match(file.name, /\.docx$/)
  const parts = unzipSync(file.bytes)
  assert.ok(parts['word/document.xml'], 'Word file contains its native document part')
  const xml = strFromU8(parts['word/document.xml'])
  assert.ok(xml.includes(title), 'The title is editable Word text')
  assert.match(xml, /<w:tbl[ >]/, 'The comparison is a native Word table')
  assert.ok(Object.keys(parts).some((name) => /^word\/media\/.+\.png$/.test(name)), 'Word includes rendered artwork')
  assert.ok(parts['word/styles.xml'], 'Word carries reusable text styles')
  return { parts, xml }
}

const uploadSource = async (page, bytes, name = 'publication.json') => {
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Open document source', exact: true }).click()
  await (await chooser).setFiles({ name, mimeType: 'application/json', buffer: bytes })
}

const screenshot = async (page, name) => {
  if (shotDir) {
    await page.evaluate(() => scrollTo(0, 0))
    await page.screenshot({ path: resolve(shotDir, name), fullPage: true })
  }
}

// The app's dropdowns are styled comboboxes, not <select>: open one, then pick the option.
const choose = async (page, name, option) => {
  await page.getByRole('combobox', { name: new RegExp(`^${name}`) }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

const checkFirstFormEditing = async (page) => {
  await choose(page, 'Document purpose', 'Project report')
  await waitForPreview(page, 'Project report')
  await choose(page, 'Document purpose', 'Decision brief')
  await page.getByRole('group', { name: 'Paper size' }).getByRole('button', { name: 'A4', exact: true }).click()
  await waitForPreview(page, 'Decision brief')
  const changed = (await sourceOf(page)).model
  assert.equal(changed.purpose, 'brief')
  assert.equal(changed.paper, 'a4')
  assert.equal(changed.profile.paper.widthMm, 210)
  assert.equal(changed.profile.paper.heightMm, 297)

  await choose(page, 'Document purpose', 'Brand portfolio')
  await waitForPreview(page, 'First Form brand portfolio')
  const department = 'College of Science and Management and Interdisciplinary Research'
  const subdepartment = 'Natural Resources and Environmental Studies Research Laboratory'
  await page.locator('summary', { hasText: 'Department naming' }).click()
  await page.getByLabel('Department or school', { exact: true }).fill(department)
  await page.getByLabel('Subdepartment or unit', { exact: true }).fill(subdepartment)
  await page.frameLocator('.documents-preview iframe').getByText(subdepartment, { exact: true }).waitFor()
  const named = (await sourceOf(page)).model
  assert.deepEqual(named.affiliation, { department, subdepartment })
  assert.equal(named.purpose, 'portfolio')
  assert.equal(named.profile.affiliation.mode, 'document-text')
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('brandkit:affiliation:firstform')))
  assert.deepEqual(stored, { department, subdepartment }, 'Names persist independently of document content')
  const wordNames = checkWord(await download(page, 'Download Word'), named.title).xml
  assert.ok(wordNames.includes(department) && wordNames.includes(subdepartment), 'Both names remain native Word text')
  assert.match(wordNames, /w:pStyle w:val="AffiliationDepartment"/)
  await choose(page, 'Document purpose', 'Decision brief')
  await waitForPreview(page, 'Decision brief')
  report.editing.push('brand portfolio, named unit, native Word styles and shared naming persistence')

  const title = page.getByLabel('Title', { exact: true })
  await title.fill('A temporary document title')
  await waitForPreview(page, 'A temporary document title')
  await title.fill('')
  await waitForPreview(page, 'Decision brief')
  assert.equal(await page.getByRole('button', { name: 'Download Word', exact: true }).isEnabled(), true, 'Clearing the title restores a usable example')
  assert.equal(await page.locator('.documents-preview [role="alert"]').count(), 0, 'Clearing the title does not crash or leave an error')
  report.editing.push('purpose and paper selection', 'title edit and clear recovery')

  const finalTitle = 'First Form document workflow browser check'
  await title.fill(finalTitle)
  await waitForPreview(page, finalTitle)
  // Capture the actual tested interface, then exercise the user image-upload path.
  const capture = await page.locator('.documents-head').screenshot()
  await page.locator('summary', { hasText: 'Screenshot or evidence' }).click()
  await page.getByLabel('Figure caption', { exact: true }).fill('Figure 1. The document workflow in the tested application.')
  await page.getByLabel('Image description', { exact: true }).fill('The First Form document editor heading and download controls.')
  await page.getByLabel('Source and capture date', { exact: true }).fill('Local production application; browser verification capture.')
  await page.getByLabel('PNG or JPEG image', { exact: true }).setInputFiles({ name: 'documents-interface.png', mimeType: 'image/png', buffer: capture })
  await page.frameLocator('.documents-preview iframe').locator('figure img').waitFor()
  await waitForPreview(page, finalTitle)
  const edited = await sourceOf(page)
  const figure = edited.model.pages.flatMap((item) => item.blocks).find((block) => block.type === 'figure')
  assert.equal(figure.placeholder, false)
  assert.match(figure.src, /^data:image\/png;base64,/)
  assert.equal(Buffer.compare(Buffer.from(figure.src.split(',')[1], 'base64'), capture), 0, 'The uploaded screenshot bytes are preserved')
  assert.match(figure.caption, /The document workflow/)
  assert.match(figure.caption, /Source: Local production application/)
  assert.equal(figure.provenance, 'Local production application; browser verification capture.')
  assert.match(await previewText(page), /Source: Local production application/)
  report.editing.push('actual screenshot upload, caption and provenance')

  const invalid = structuredClone(edited.model)
  invalid.profile.logo.clearSpaceMm = '0mm" data-invalid="true'
  await uploadSource(page, Buffer.from(JSON.stringify(invalid)), 'invalid-publication.json')
  const alert = page.locator('.documents-preview [role="alert"]')
  await alert.waitFor()
  assert.match(await alert.innerText(), /logo clear space/i)
  assert.equal(await title.isEnabled(), true, 'Rejected source does not put the editor into imported mode')
  assert.deepEqual((await sourceOf(page)).model, edited.model, 'Rejected source leaves the current draft unchanged')
  await waitForPreview(page, finalTitle)
  report.editing.push('invalid import rejection without draft loss')

  await uploadSource(page, edited.bytes)
  await page.getByRole('button', { name: 'Start a new example', exact: true }).waitFor()
  assert.equal(await title.isDisabled(), true, 'An imported source is clearly opened in source mode')
  assert.deepEqual((await sourceOf(page)).model, edited.model, 'Valid source round trip retains the complete model')
  assert.equal(await page.locator('.documents-preview [role="alert"]').count(), 0, 'A valid import clears the prior error')
  await waitForPreview(page, finalTitle)
  const word = checkWord(await download(page, 'Download Word'), finalTitle)
  assert.match(word.xml, /Local production application/, 'Word retains screenshot provenance as editable text')
  assert.ok(Object.keys(word.parts).filter((name) => /^word\/media\/.+\.png$/.test(name)).length >= 2, 'Word contains both brand artwork and the supplied screenshot')
  const html = (await download(page, 'Download print view')).bytes.toString('utf8')
  assert.ok(html.includes(finalTitle))
  assert.ok(html.includes(figure.src), 'The standalone HTML embeds the supplied screenshot')
  assert.match(html, /Local production application/)
  report.editing.push('valid source round trip to Word and HTML')
  await screenshot(page, 'documents-firstform-edited-desktop.png')
}

try {
  browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: launchArgs })
  // Keep an explicit context alive between brands. Some packaged Chromium builds close their
  // single process when an implicit newPage context is destroyed with its last page.
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, reducedMotion: 'reduce' })
  for (const id of ids) {
    const brand = JSON.parse(readFileSync(resolve(root, `brands/${id}/brand.json`), 'utf8'))
    const page = await context.newPage()
    page.setDefaultTimeout(45000)
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
    page.on('requestfailed', (request) => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`${request.failure()?.errorText} ${request.url()}`) })
    try {
      await page.goto(`${server.resolvedUrls.local[0]}?brand=${id}&view=documents`, { waitUntil: 'networkidle' })
      await page.getByRole('heading', { name: `Write a document with ${brand.name}`, exact: true }).waitFor()
      const defaultPurpose = brand.documentation?.defaultPurpose ?? 'product'
      const defaultTitle = brand.documentation?.examples?.[defaultPurpose]?.title ?? { product: 'Product overview', report: 'Project report', brief: 'Decision brief', portfolio: `${brand.name} brand portfolio` }[defaultPurpose]
      await waitForPreview(page, defaultTitle)
      assert.equal(await page.locator('.documents-preview [role="alert"]').count(), 0, `${id}: usable document preview`)

      const source = await sourceOf(page)
      assert.equal(source.name, `${id}-${defaultPurpose}-letter.json`)
      assert.equal(source.model.schema, 'brandkit/publication/1')
      assert.equal(source.model.profile.brandId, id)
      assert.equal(source.model.pages.length, 6)
      assert.equal(source.model.profile.typography.body.family, brand.fonts.body.family)
      checkWord(await download(page, 'Download Word'), source.model.title)
      const html = await download(page, 'Download print view')
      assert.equal(html.name, `${id}-${defaultPurpose}-letter.html`)
      const htmlText = html.bytes.toString('utf8')
      assert.equal((htmlText.match(/<article class="page /g) ?? []).length, 6, `${id}: HTML contains all six document layouts`)
      assert.match(htmlText, /data:image\/svg\+xml;base64,/, `${id}: HTML embeds its brand artwork`)
      assert.doesNotMatch(htmlText, /<script\b/i, `${id}: downloaded print view has no executable scripts`)

      const consumer = await download(page, 'Export for another app')
      assert.equal(consumer.name, `${id}-consumer-profile.json`)
      const profile = JSON.parse(consumer.bytes.toString('utf8'))
      assert.equal(profile.schema, 'brandkit/consumer-profile/1')
      assert.equal(profile.id, id)
      for (const key of ['primary', 'black', 'reverse']) {
        assert.match(profile.logos[key].svg, /<svg\b/)
        assert.doesNotMatch(profile.logos[key].svg, /<(?:text|image|script|foreignObject)\b/i)
        assert.equal(profile.logos[key].viewBox.length, 4)
      }
      if (id === 'bc-province-1977') {
        assert.match(await previewText(page), /historical reconstruction/i, 'Historical source status remains visible in the document')
        assert.match(await previewText(page), /modern document layout/i, 'Historical brand examples label the modern layout extension')
      }
      await screenshot(page, `documents-${id}-desktop.png`)
      if (id === 'firstform') await checkFirstFormEditing(page)

      await page.setViewportSize({ width: 390, height: 844 })
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${id}: no outer horizontal overflow at 390 px`)
      assert.equal(await page.getByRole('heading', { name: `Write a document with ${brand.name}`, exact: true }).isVisible(), true)
      await screenshot(page, `documents-${id}-mobile.png`)
      assert.deepEqual(errors, [], `${id}: no JavaScript or resource errors`)
      report.brands.push(id)
      report.mobileWidths.push({ brand: id, width: 390 })
      console.log(`PASS ${id}: six layouts, Word/source/HTML/consumer downloads, 390 px layout${id === 'firstform' ? ', editing and import recovery' : ''}`)
    } catch (error) {
      await screenshot(page, `documents-${id}-failure.png`).catch(() => {})
      console.error(`${id} browser errors: ${JSON.stringify(errors)}`)
      throw error
    } finally { await page.close() }
  }
  if (shotDir) writeFileSync(resolve(shotDir, 'documentation-summary.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(`Documents production check passed: ${report.brands.length} brands, ${report.downloads} real downloads, ${report.editing.length} editing/import checks.`)
} finally {
  await browser?.close()
  await new Promise((done) => server.httpServer.close(done))
}
