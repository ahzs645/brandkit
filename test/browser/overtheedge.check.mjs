// Browser check for Over the Edge (docs/PLANS.md M3, OTE-012, OTE-014 and OTE-015): the motion
// library, the brand details page and the site, in Chromium at desktop and phone widths. Not part
// of `npm test`: it needs a browser.
//
//   npx playwright install chromium && node test/browser/overtheedge.check.mjs
//
// Writes test/browser/overtheedge-report.json and the site's screenshots, and exits with 1 if any
// check fails. CHROMIUM_PATH may point at an existing Chromium. OTE_BROKEN=1 injects an off-palette
// colour and an animation that ignores reduced motion first, to show the checks can fail.

import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const root = new URL('../../', import.meta.url).pathname
const brand = (await import('../../brands/overtheedge/brand.json', { with: { type: 'json' } })).default
const PAGES = { motion: 'brands/overtheedge/motion/index.html', details: 'brands/overtheedge/docs/brand-details.html', site: 'brands/overtheedge/site/index.html' }
const WIDTHS = [1440, 390]
const BROKEN = process.env.OTE_BROKEN === '1'

const report = { started: new Date().toISOString(), checks: [] }
const check = async (name, fn) => {
  try {
    const detail = await fn()
    report.checks.push({ name, pass: true, ...(detail === undefined ? {} : { detail }) })
    console.log('PASS', name)
  } catch (error) {
    report.checks.push({ name, pass: false, error: String(error?.message ?? error) })
    console.log('FAIL', name, '\n  ', String(error?.message ?? error).split('\n').slice(0, 4).join('\n   '))
  }
}

const server = await createServer({ root, logLevel: 'silent', server: { port: 0, strictPort: false } })
await server.listen()
const base = server.resolvedUrls.local[0]
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})

/** Opens a page, recording console errors, failed requests and anything fetched from elsewhere. */
const open = async (path, { width, reducedMotion = 'no-preference', height = 900 } = {}) => {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion })
  // The site's intro plays once a session; mark it seen so screenshots show the page itself.
  if (path === PAGES.site) await page.addInitScript(() => { try { sessionStorage.setItem('ote-intro', '1') } catch {} })
  const errors = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('requestfailed', (request) => errors.push(`requestfailed: ${request.url()}`))
  page.on('request', (request) => { const url = request.url(); if (!url.startsWith(base) && !url.startsWith('data:') && !url.startsWith('ws://')) errors.push(`external: ${url}`) })
  await page.goto(base + path, { waitUntil: 'networkidle' })
  if (BROKEN) await page.addStyleTag({ content: 'body { outline: 3px solid #ff00aa; } .play * { animation: ote-broken 1s infinite !important; } @keyframes ote-broken { to { transform: translateX(1px); } }' })
  await page.waitForTimeout(400)
  return { page, errors }
}

// Runs in the page: every colour the page actually paints, as computed. A border or outline counts
// only when it is drawn; fill and stroke only on SVG shapes that are drawn (not inside a clip path,
// mask or defs); text colour only where there is text. Read at rest (under reduced motion), so an
// animation's in-between blend is not mistaken for a colour of the page.
function paintedColours() {
  const out = new Set()
  const add = (value) => { if (value && value !== 'none' && !value.startsWith('url(')) out.add(value) }
  for (const el of document.querySelectorAll('body, body *')) {
    const style = getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') continue
    if (el instanceof SVGElement) {
      if (!(el instanceof SVGGeometryElement) || el.closest('clipPath, mask, defs')) continue
      if (style.fill !== 'none') add(style.fill)
      if (style.stroke !== 'none' && parseFloat(style.strokeWidth) > 0) add(style.stroke)
      continue
    }
    if ([...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim())) add(style.color)
    add(style.backgroundColor)
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (style[`border${side}Style`] !== 'none' && parseFloat(style[`border${side}Width`]) > 0) add(style[`border${side}Color`])
    if (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) add(style.outlineColor)
  }
  return [...out]
}
const PALETTE = Object.values(brand.colours).map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(','))
// rgb()/rgba() as computed, or color(srgb …) from a color-mix: its channels must be a palette colour
// (color-mix with transparent keeps the colour and lowers alpha).
const offPalette = (values) => values.filter((value) => {
  const rgb = /^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/.exec(value)
  const srgb = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/.exec(value)
  if (!rgb && !srgb) return !/^(transparent|currentcolor)$/i.test(value)
  const alpha = (rgb ?? srgb)[4]
  if (alpha === '0') return false
  const channels = rgb ? rgb.slice(1, 4).map(Number) : srgb.slice(1, 4).map((v) => Math.round(Number(v) * 255))
  return !PALETTE.some((entry) => entry.split(',').map(Number).every((c, i) => Math.abs(c - channels[i]) <= 1))
})

// Visible text: no em dashes, and digits only in the categories docs/PLANS.md exempts.
const EXEMPT = [/\d+ × \d+/g, /\d+ ms\b/g, /Source Serif 4/gi, /\bA4\b/g, /#[0-9A-F]{6}\b/gi, /\d+(?:\.\d+)? ?(?:px|mm|ms|%|°)/g, /\d+(?:\.\d+)? : 1\b/g, /\bv\d+\.\d+\b/gi, /\b\d+(?:\.\d+)? logo units\b/g, /22 October 2026|April 2025|October 2025/g,
  /Bests of Home Echo at the Prince George Garba Night 2025/g, /Volume 32 · Issue 2 · October 16, 2025/gi, /October 16th/gi, /\b(?:03|05|10)\b/g, /\[[^\]]*\]/g, /cubic-bezier\([^)]*\)/g, /--ote-[a-z]+/g]
const textProblems = (text) => {
  const problems = []
  if (text.includes('—')) problems.push('em dash')
  const left = EXEMPT.reduce((value, pattern) => value.replace(pattern, ''), text)
  for (const line of left.split('\n')) if (/\d/.test(line)) problems.push(`digits: ${line.trim().slice(0, 80)}`)
  return problems
}

const shotDir = `${root}brands/overtheedge/site/screenshots/`
mkdirSync(shotDir, { recursive: true })

for (const [key, path] of Object.entries(PAGES)) {
  for (const width of WIDTHS) {
    await check(`${key} at ${width}: loads clean, fits, palette colours, text rules`, async () => {
      const { page, errors } = await open(path, { width })
      assert.deepEqual(errors, [], 'console errors or requests')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      assert.ok(overflow <= 0, `horizontal overflow ${overflow}px`)
      const still = await open(path, { width, reducedMotion: 'reduce' })
      assert.deepEqual(offPalette(await still.page.evaluate(paintedColours)), [], 'off-palette colours, at rest')
      await still.page.close()
      assert.deepEqual(textProblems(await page.evaluate(() => document.body.innerText)), [], 'visible text')
      if (key === 'site') {
        await page.screenshot({ path: `${shotDir}${width === 1440 ? 'desktop' : 'mobile'}.jpg`, type: 'jpeg', quality: 82 })
        await page.screenshot({ path: `${shotDir}${width === 1440 ? 'desktop' : 'mobile'}-full.jpg`, type: 'jpeg', quality: 82, fullPage: true })
      }
      await page.close()
    })
  }
}

await check('motion page: a tile for every study', async () => {
  const { page } = await open(PAGES.motion, { width: 1440 })
  const ids = await page.$$eval('.stage[data-study]', (stages) => stages.map((stage) => stage.getAttribute('data-study')))
  assert.deepEqual(ids, brand.motion.studies.map((study) => study.id))
  await page.close()
})

await check('reduced motion: nothing runs, and the logo rests on its still frame', async () => {
  for (const path of [PAGES.motion, PAGES.site]) {
    const { page } = await open(path, { width: 1440, reducedMotion: 'reduce' })
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.target?.closest?.('.play')).length)
    assert.equal(running, 0, `${path}: running animations`)
    const words = await page.$$eval('.ote-lockup .ote-word', (els) => els.map((el) => getComputedStyle(el).transform))
    assert.ok(words.length > 0 && words.every((t) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)'), `${path}: logo words at rest`)
    await page.close()
  }
})

await check('app: the Motion tab lists every study and plays them in the app', async () => {
  const { page, errors } = await open('?brand=overtheedge&view=motion', { width: 1440 })
  await page.locator('.motion-canvas .motion-stage').waitFor({ timeout: 15000 })
  assert.equal(await page.locator('.motion-studio .studio__item').count(), brand.motion.studies.length)
  // Every study's artwork is drawn in the app (a thumbnail each, and the stage), none in a frame.
  const drawn = await page.$$eval('.motion-stage', (hosts) => hosts.filter((host) => host.shadowRoot?.querySelector('[data-study]')).length)
  assert.equal(drawn, brand.motion.studies.length + 1)
  assert.equal(await page.locator('iframe').count(), 0)
  assert.deepEqual(errors.filter((e) => !e.includes('[vite]')), [], 'console errors or requests')
  await page.close()
})

await check('site: the marked logo, loader and issue logo are drawn', async () => {
  const { page } = await open(PAGES.site, { width: 1440 })
  assert.equal(await page.locator('.masthead .ote-lockup').count(), 1)
  assert.equal(await page.locator('.issue__flag .ote-lockup').count(), 1)
  assert.equal(await page.locator('#intro .ote-o').count(), 1)
  // Logo minimums (docs/PLANS.md M2): the full logo (with its subtext) at 288 px or more, without it 96 px.
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    const sizes = await page.$$eval('.ote-lockup', (svgs) => svgs.map((svg) => ({ full: !!svg.querySelector('.ote-word--4'), width: svg.getBoundingClientRect().width })))
    for (const size of sizes) assert.ok(size.width >= (size.full ? 288 : 96), `logo ${size.full ? 'full' : 'without subtext'} at ${size.width.toFixed(0)} px, viewport ${width}`)
  }
  await page.close()
})

await browser.close()
await server.close()
report.finished = new Date().toISOString()
writeFileSync(`${root}test/browser/overtheedge-report.json`, `${JSON.stringify(report, null, 2)}\n`)
const failed = report.checks.filter((entry) => !entry.pass).length
console.log(`${report.checks.length - failed}/${report.checks.length} checks passed`)
process.exit(failed ? 1 : 0)
