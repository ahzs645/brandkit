// npm run build && CHROMIUM_PATH=/usr/bin/chromium node test/browser/overtheedge-identity.check.mjs
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('../../', import.meta.url))
const server = await preview({ root, logLevel: 'silent', preview: { port: 0, host: '127.0.0.1' } })
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
try {
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 950 }, acceptDownloads: true })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`) })
    await page.goto(`${server.resolvedUrls.local[0]}?brand=overtheedge`, { waitUntil: 'networkidle' })
    const layout = page.getByRole('combobox', { name: 'Layout', exact: true })
    // Layout is a styled combobox: open it and choose the option by its label.
    const pick = async (combobox, label) => { await combobox.click(); await page.getByRole('option', { name: label, exact: true }).click() }
    await layout.waitFor()
    await layout.click()
    assert.deepEqual(await page.getByRole('option').allTextContents(), ['Horizontal', 'Stacked', 'Symbol'])
    await page.keyboard.press('Escape')
    assert.equal(await page.getByRole('group', { name: 'Wordmark arrangement', exact: true }).count(), 0)
    const toggle = page.getByRole('checkbox', { name: 'Wordmark', exact: true })
    assert.equal(await toggle.isChecked(), true)
    const artwork = async () => page.locator('.stage__art').evaluate(async (img) => (await fetch(img.src)).text())
    const waitForWordmark = (name) => page.waitForFunction(async (expected) => {
      const img = document.querySelector('.stage__art')
      return img && (await fetch(img.src).then((response) => response.text())).includes(`data-wordmark="${expected}"`)
    }, name)
    await pick(layout, 'Stacked')
    await waitForWordmark('cover-stacked')
    assert.match(await artwork(), /data-line="subtext" fill="#262626"/)
    await toggle.uncheck()
    await waitForWordmark('stacked')
    assert.doesNotMatch(await artwork(), /data-line="subtext"/)
    assert.match(await artwork(), /data-word="OVER"/)
    assert.equal(await page.getByRole('group', { name: 'Wordmark colour', exact: true }).count(), 0)
    await pick(layout, 'Horizontal')
    await waitForWordmark('words')
    await toggle.check()
    await waitForWordmark('full')
    const wordmarkColour = page.getByRole('group', { name: 'Wordmark colour', exact: true })
    await wordmarkColour.getByRole('button', { name: 'Lichen', exact: true }).click()
    await page.waitForFunction(async () => {
      const svg = await fetch(document.querySelector('.stage__art').src).then((response) => response.text())
      return svg.includes('data-line="subtext" fill="#E3EFCF"')
    })
    assert.equal(await page.getByRole('group', { name: 'Logo colour', exact: true }).getByRole('button', { name: 'Forest', exact: true }).getAttribute('aria-pressed'), 'true')
    await toggle.uncheck()
    await waitForWordmark('words')
    await toggle.check()
    await waitForWordmark('full')
    assert.equal(await wordmarkColour.getByRole('button', { name: 'Lichen', exact: true }).getAttribute('aria-pressed'), 'true')
    await wordmarkColour.getByRole('button', { name: 'Ink', exact: true }).click()
    await pick(layout, 'Stacked')
    await waitForWordmark('cover-stacked')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.stage-panel .downloads').getByRole('button', { name: /SVG/ }).click()
    ])
    assert.match(download.suggestedFilename(), /stacked-forest-wordmark-ink\.svg$/)
    const exported = readFileSync(await download.path(), 'utf8')
    assert.match(exported, /data-wordmark="cover-stacked" fill="#155329"/)
    assert.match(exported, /data-line="subtext" fill="#262626"/)
    if (width === 390) {
      const [png] = await Promise.all([page.waitForEvent('download'), page.locator('.stage-panel .downloads').getByRole('button', { name: /PNG/ }).click()])
      const counts = await page.evaluate(async (bytes) => {
        const image = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }))
        const canvas = document.createElement('canvas')
        canvas.width = image.width; canvas.height = image.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(image, 0, 0)
        image.close()
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
        let green = 0, ink = 0
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] < 250) continue
          if (pixels[i] === 21 && pixels[i + 1] === 83 && pixels[i + 2] === 41) green++
          if (pixels[i] === 38 && pixels[i + 1] === 38 && pixels[i + 2] === 38) ink++
        }
        return { green, ink }
      }, [...readFileSync(await png.path())])
      assert.ok(counts.green > 100 && counts.ink > 100, 'the PNG preserves forest lettering and ink subtext')
    }
    await pick(layout, 'Symbol')
    assert.equal(await toggle.isEnabled(), false)
    await page.waitForFunction(async () => !(await fetch(document.querySelector('.stage__art').src).then((response) => response.text())).includes('data-wordmark='))
    await pick(layout, 'Stacked')
    await waitForWordmark('cover-stacked')

    const fonts = page.locator('.specimens')
    await fonts.getByRole('textbox', { name: 'Try the brand’s fonts', exact: true }).fill('Over the Edge 2025')
    const hand = fonts.locator('[data-font-role="hand"]')
    assert.equal(await hand.locator('p').textContent().then((s) => s.trim()), 'Over the Edge 2025')
    await page.evaluate(() => document.fonts.ready)
    assert.equal(await hand.locator('p').evaluate((element) => getComputedStyle(element).fontFamily), 'Salted, cursive')
    const loaded = await page.evaluate(() => [...document.fonts].filter((font) => font.status === 'loaded').map((font) => `${font.family.replaceAll('"', '')} ${font.weight}`))
    assert.ok(loaded.includes('Salted 400'))
    assert.ok(loaded.includes('Helvetica Neue 500'))
    assert.ok(loaded.includes('Helvetica Neue 700'))
    assert.equal(await hand.getByRole('link', { name: 'Licence', exact: true }).count(), 1)
    const [fontDownload] = await Promise.all([page.waitForEvent('download'), hand.getByRole('link', { name: 'Download font', exact: true }).click()])
    assert.equal(hash(readFileSync(await fontDownload.path())), hash(readFileSync(`${root}brands/overtheedge/fonts/Salted-Regular.otf`)))
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    assert.deepEqual(errors, [])
    if (process.env.SCREENSHOT_DIR) {
      mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true })
      await page.locator('.stage-panel').screenshot({ path: `${process.env.SCREENSHOT_DIR}/ote-layout-${width}.png` })
      await fonts.screenshot({ path: `${process.env.SCREENSHOT_DIR}/ote-fonts-${width}.png` })
    }
    if (width === 390) {
      await page.goto(`${server.resolvedUrls.local[0]}?brand=ddcnorth`, { waitUntil: 'networkidle' })
      const ordinaryToggle = page.getByRole('checkbox', { name: 'Wordmark', exact: true })
      await ordinaryToggle.uncheck()
      await page.waitForFunction(async () => {
        const svg = await fetch(document.querySelector('.stage__art').src).then((response) => response.text())
        return svg.includes('data-brand-symbol') && !svg.includes('data-wordmark=')
      })
      await ordinaryToggle.check()
      await page.waitForFunction(async () => (await fetch(document.querySelector('.stage__art').src).then((response) => response.text())).includes('data-wordmark='))
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    }
    console.log(`PASS layout dropdown, wordmark toggle/colour, source fonts and downloads @${width}`)
    await page.close()
  }
} finally {
  await browser.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
