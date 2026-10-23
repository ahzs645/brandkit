// Exercise the bundled app against the production site, including non-root asset paths.
// npm run build && CHROMIUM_PATH=/path/to/chromium npm run test:printer
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { readPrinterPackage } from '../../src/printer/package.js'

const root = fileURLToPath(new URL('../../', import.meta.url))
const requirePrinter = createRequire(new URL('../../vendor/template-printer/frontend/package.json', import.meta.url))
const { PDFDocument } = requirePrinter('pdf-lib')
const server = await preview({ root, base: process.env.BASE_PATH || '/brandkit/', logLevel: 'silent', preview: { port: 0, host: '127.0.0.1' } })
let browser
const base = server.resolvedUrls.local[0]
const checks = []
const check = async (name, run) => {
  try { await run(); checks.push({ name, pass: true }); console.log('PASS', name) }
  catch (error) { checks.push({ name, pass: false }); console.error('FAIL', name, error.message) }
}

try {
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 950 }, acceptDownloads: true })
    const page = await context.newPage()
    const errors = []
    const external = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('requestfailed', (request) => errors.push(`Failed request: ${request.url()}`))
    page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`) })
    page.on('request', (request) => {
      if (/^https?:/.test(request.url()) && !request.url().startsWith(new URL(base).origin)) external.push(request.url())
    })
    const frame = () => page.frameLocator('iframe.printer__frame')
    const expandPanels = async () => {
      for (const name of ['Templates', 'Properties']) {
        const toggle = frame().getByTitle(`Expand ${name}`, { exact: true })
        if (await toggle.count()) await toggle.click()
      }
    }

    await check(`printer navigation and complete interface @${width}`, async () => {
      await page.goto(`${base}?brand=overtheedge&view=templates`, { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: 'Open Template Printer', exact: true }).click()
      await frame().getByRole('button', { name: 'Design', exact: true }).waitFor()
      assert.equal(new URL(page.url()).searchParams.get('view'), 'printer')
      for (const name of ['Users', 'Design', 'Export', 'Calibration', 'Settings']) {
        assert.equal(await frame().locator('nav.icon-nav').getByRole('button', { name, exact: true }).count(), 1)
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    })

    await check(`staff card imports both sides, fonts and editable sample data @${width}`, async () => {
      await page.getByRole('button', { name: 'Open staff card', exact: true }).click()
      await frame().getByText(/^Opened "Staff Card" from/).first().waitFor()
      await expandPanels()
      assert.equal(await frame().locator('#card-data-fullname-first-linebreak-last_1').inputValue(), 'Hyunseo Kim')
      assert.equal(await frame().locator('#card-data-position-allcaps_2').inputValue(), 'Research Assistant')
      assert.equal(await frame().getByRole('button', { name: 'card-front.svg', exact: true }).count(), 1)
      assert.equal(await frame().getByRole('button', { name: 'card-back.svg', exact: true }).count(), 1)
      assert.equal(await frame().getByRole('button', { name: /Fonts \(2\)/ }).count(), 1)
      const child = page.frames().find((entry) => entry.url().includes('/template-printer/'))
      assert.equal(await child.evaluate(() => document.fonts.check('12px HelveticaNeue-Bold')), true)
      assert.equal(await child.evaluate(() => document.fonts.check('12px HelveticaNeue-Medium')), true)
      await frame().locator('#card-data-fullname-first-linebreak-last_1').fill('Alex Example')
      await frame().locator('#card-data-position-allcaps_2').fill('Editor')
      assert.equal(await frame().locator('#card-data-fullname-first-linebreak-last_1').inputValue(), 'Alex Example')
    })

    await check(`PDF export produces a readable document @${width}`, async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        frame().getByRole('button', { name: 'Quick PDF', exact: true }).click()
      ])
      assert.match(download.suggestedFilename(), /\.pdf$/i)
      const pdf = await PDFDocument.load(readFileSync(await download.path()))
      assert.ok(pdf.getPageCount() >= 1)
    })

    await check(`people, export, calibration and settings remain available @${width}`, async () => {
      const nav = frame().locator('nav.icon-nav')
      for (const name of ['Users', 'Export', 'Calibration', 'Settings', 'Design']) {
        await nav.getByRole('button', { name, exact: true }).click()
        assert.equal(await nav.locator('.icon-nav__item--active').getAttribute('title'), name)
      }
    })

    await check(`reopening the preset reuses its templates @${width}`, async () => {
      await page.getByRole('button', { name: 'Open staff card', exact: true }).click()
      await frame().getByText(/^Reopened "Staff Card"/).first().waitFor()
      await expandPanels()
      assert.equal(await frame().getByRole('button', { name: 'card-front.svg', exact: true }).count(), 1)
      assert.equal(await frame().getByRole('button', { name: 'card-back.svg', exact: true }).count(), 1)
    })

    await check(`standalone app opens with the same saved library @${width}`, async () => {
      const opening = context.waitForEvent('page')
      await page.getByRole('link', { name: 'Open in new tab' }).click()
      const standalone = await opening
      await standalone.getByText(/^Reopened "Staff Card"/).first().waitFor()
      assert.ok(new URL(standalone.url()).pathname.endsWith('/template-printer/'))
      await standalone.close()
      assert.deepEqual(external, [], 'the bundled app and preset must not call external hosts')
      assert.deepEqual(errors, [])
    })

    await check(`OTE staff-card fields transfer directly from Templates into the full printer @${width}`, async () => {
      await page.goto(`${base}?brand=overtheedge&view=templates&template=staff-card-front`, { waitUntil: 'networkidle' })
      await page.locator('.studio__fields').getByLabel('Full name', { exact: true }).fill('Alex Bridge')
      await page.locator('.studio__fields').getByLabel('Position', { exact: true }).fill('Managing Editor')
      const [pdfDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /PDF, all variants/ }).click()])
      const nativePdf = await PDFDocument.load(readFileSync(await pdfDownload.path()))
      assert.equal(nativePdf.getPageCount(), 2, 'the native staff-card PDF contains front and back')
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '↓ Printer package', exact: true }).click()])
      const pack = readPrinterPackage(readFileSync(await download.path()))
      assert.equal(pack.manifest.sampleData['fullname-first-linebreak-last_1'], 'Alex Bridge')
      assert.ok(pack.manifest.sides.back)
      await page.getByRole('button', { name: 'Edit & print', exact: true }).click()
      await frame().getByText(/^Opened "Staff Card" from brandkit/).first().waitFor()
      await expandPanels()
      assert.equal(await frame().locator('#card-data-fullname-first-linebreak-last_1').inputValue(), 'Alex Bridge')
      assert.equal(await frame().locator('#card-data-position-allcaps_2').inputValue(), 'Managing Editor')
    })

    await check(`website handoff keeps filled fields in the ZIP and distinguishes the published original @${width}`, async () => {
      await page.goto(`${base}?brand=overtheedge&view=templates&template=staff-card-front`, { waitUntil: 'networkidle' })
      await page.locator('.studio__fields').getByRole('textbox', { name: 'Full name', exact: true }).fill('Alex Website')
      await page.locator('.studio__fields').getByRole('textbox', { name: 'Position', exact: true }).fill('Website Editor')
      await page.locator('.printer-website summary').click()
      const link = page.getByRole('link', { name: 'Open Template Printer website', exact: false })
      assert.equal(await link.getAttribute('href'), 'https://projects.ahmadjalil.com/template-printer/')
      assert.equal(await link.getAttribute('rel'), 'noopener noreferrer')
      const published = new URL(await page.getByRole('link', { name: /Open published original directly/ }).getAttribute('href'))
      assert.equal(published.searchParams.get('url'), 'https://projects.ahmadjalil.com/builds/configs/staff_card.zip')
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '↓ Template files (.zip)', exact: true }).click()])
      const buffer = readFileSync(await download.path())
      const pack = readPrinterPackage(buffer)
      assert.equal(pack.manifest.sampleData['fullname-first-linebreak-last_1'], 'Alex Website')
      assert.equal(pack.manifest.sampleData['position-allcaps_2'], 'Website Editor')
      assert.ok(pack.files['manifest.json'] && pack.files['front.svg'] && pack.files['back.svg'])
      assert.equal(pack.manifest.fonts.length, 2)
      // The external site uses the same upstream file importer. Exercise it with separate
      // browser storage, without depending on a live deployment or sending user data there.
      const separate = await browser.newContext({ viewport: { width, height: 950 } })
      try {
        const standalone = await separate.newPage()
        await standalone.goto(`${base}template-printer/`, { waitUntil: 'networkidle' })
        await standalone.locator('nav.icon-nav').getByRole('button', { name: 'Design', exact: true }).click()
        await standalone.getByRole('button', { name: 'Import SVG', exact: true }).click()
        // Collapsed panels do not mount their status or fields. Open them before importing.
        for (const name of ['Templates', 'Properties']) {
          const toggle = standalone.getByTitle(`Expand ${name}`, { exact: true })
          if (await toggle.count()) await toggle.click()
        }
        await standalone.locator('input[type="file"][accept="image/svg+xml,.zip"]').setInputFiles({ name: 'brandkit-template.zip', mimeType: 'application/zip', buffer })
        await standalone.getByText(/^Opened "Staff Card" with/).first().waitFor()
        await standalone.locator('#card-data-fullname-first-linebreak-last_1').waitFor()
        assert.equal(await standalone.locator('#card-data-fullname-first-linebreak-last_1').inputValue(), 'Alex Website')
        assert.equal(await standalone.locator('#card-data-position-allcaps_2').inputValue(), 'Website Editor')
        assert.equal(await standalone.getByRole('button', { name: 'card-back.svg', exact: true }).count(), 1)
      } finally { await separate.close() }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      await page.getByRole('button', { name: 'Open Template Printer', exact: true }).click()
      await page.getByRole('combobox', { name: 'Brand template', exact: true }).selectOption('staff-card-front')
      await page.locator('.printer-website summary').click()
      const [selectedDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '↓ Template files (.zip)', exact: true }).click()])
      assert.equal(readPrinterPackage(readFileSync(await selectedDownload.path())).manifest.sampleData['fullname-first-linebreak-last_1'], 'Alex Website')
      assert.deepEqual(errors, [])
    })

    await check(`native template and fonts transfer into the printer and return as an editable brand template @${width}`, async () => {
      await page.goto(`${base}?brand=overtheedge&view=templates&template=business-card-back`, { waitUntil: 'networkidle' })
      await page.locator('.studio__fields input[type="text"]').first().fill('Alex Native')
      await page.getByRole('button', { name: 'Edit & print', exact: true }).click()
      await frame().getByText(/^Opened .*Business card, back.*from brandkit/).first().waitFor()
      await expandPanels()
      assert.ok((await frame().locator('input[id^="card-data-"]').evaluateAll((inputs) => inputs.map((input) => input.value))).includes('Alex Native'))
      await frame().getByRole('button', { name: 'Share', exact: true }).click()
      await frame().getByText('Compressing template…', { exact: true }).waitFor({ state: 'hidden' })
      await page.locator('iframe.printer__frame').scrollIntoViewIfNeeded()
      const [download] = await Promise.all([page.waitForEvent('download'), frame().getByRole('button', { name: /Download package/i }).click()])
      const path = await download.path()
      const pack = readPrinterPackage(readFileSync(path))
      assert.ok(pack.manifest.fonts.length > 0)
      await page.locator('.printer input[type="file"]').setInputFiles({ name: 'edited-native.zip', mimeType: 'application/zip', buffer: readFileSync(path) })
      await page.locator('.studio__fields input[type="text"]').first().waitFor()
      assert.equal(new URL(page.url()).searchParams.get('view'), 'templates')
      assert.ok((await page.locator('.studio__fields input[type="text"]').evaluateAll((inputs) => inputs.map((input) => input.value || input.placeholder))).includes('Alex Native'))
      await page.reload({ waitUntil: 'networkidle' })
      assert.ok((await page.locator('.studio__fields input[type="text"]').evaluateAll((inputs) => inputs.map((input) => input.value || input.placeholder))).includes('Alex Native'))
      assert.deepEqual(errors, [])
    })

    await check(`shared brand centre keeps its existing sections @${width}`, async () => {
      await page.goto(`${base}?brand=overtheedge&share=1&view=printer`, { waitUntil: 'networkidle' })
      assert.equal(await page.locator('iframe.printer__frame').count(), 0)
      assert.equal(await page.locator('nav.tabs button', { hasText: 'Template Printer' }).count(), 0)
    })
    await context.close()
  }
} finally {
  await browser?.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}

assert.ok(checks.every((check) => check.pass), `${checks.filter((check) => !check.pass).length} integration checks failed`)
