// Browser check for ddcnorth v2.3, approved (docs/PLANS.md BK-008 and BK-009): the app's Motion
// tab and its fallbacks, the motion library page, and the brand-details page, in Chromium at
// desktop and phone widths. Not part of `npm test`: it needs a browser.
//
//   npx playwright install chromium && npm run test:browser
//
// Writes test/browser/report.json and exits with 1 if any check fails. CHROMIUM_PATH may point at
// an existing Chromium. DDC_BROKEN=1 fades the masthead logo first, to show the checks can fail.

import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { colourProblems } from '../brand-rules.js'
import { STUDIES } from '../../scripts/brands/ddcnorth-motion.mjs'

const root = new URL('../../', import.meta.url).pathname
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

// Runs in the page: complete marks (logos, and any complete six-dot symbol) must be fully opaque,
// still, and clear of other shapes and text by one dot diameter. Logos are inline lockups with a
// viewBox of 799.14 x 152 whose artwork is inset 16 units; a symbol's dot is 80/256 of its height.
function markViolations(selectors) {
  const out = []
  const marks = []
  for (const svg of document.querySelectorAll(selectors.logos)) {
    const r = svg.getBoundingClientRect()
    if (!r.width) continue
    const ix = r.width * 16 / 799.14231709, iy = r.height * 16 / 152
    marks.push({ name: 'logo', root: svg, box: { l: r.left + ix, r: r.right - ix, t: r.top + iy, b: r.bottom - iy }, dot: r.width * 37.5 / 799.14231709 })
  }
  for (const g of document.querySelectorAll('[data-brand-symbol="six-dot"]')) {
    if ([...document.querySelectorAll(selectors.logos)].some((logo) => logo.contains(g))) continue
    const rects = [...g.querySelectorAll('circle')].map((c) => c.getBoundingClientRect()).filter((r) => r.width)
    if (rects.length !== 6) continue
    marks.push({ name: 'symbol', root: g, box: { l: Math.min(...rects.map((r) => r.left)), r: Math.max(...rects.map((r) => r.right)), t: Math.min(...rects.map((r) => r.top)), b: Math.max(...rects.map((r) => r.bottom)) }, dot: rects[0].width })
  }
  const clipOf = (el) => {
    let box = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity }
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const st = getComputedStyle(n)
      if (st.overflowX !== 'visible' || st.overflowY !== 'visible' || (n.tagName.toLowerCase() === 'svg' && st.overflow !== 'visible')) {
        const r = n.getBoundingClientRect()
        box = { left: Math.max(box.left, r.left), top: Math.max(box.top, r.top), right: Math.min(box.right, r.right), bottom: Math.min(box.bottom, r.bottom) }
      }
    }
    return box
  }
  const drawn = (el) => { const r = el.getBoundingClientRect(), k = clipOf(el); return { left: Math.max(r.left, k.left), top: Math.max(r.top, k.top), right: Math.min(r.right, k.right), bottom: Math.min(r.bottom, k.bottom) } }
  const shown = (el) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' }
  const hits = (a, c) => a.right > a.left && a.bottom > a.top && a.left < c.r && a.right > c.l && a.top < c.b && a.bottom > c.t
  const texts = [...document.body.querySelectorAll('*')].filter((el) => ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'IMG'].includes(el.tagName) || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
  const shapes = [...document.querySelectorAll('circle,ellipse,line,polyline,polygon,path')]
  const anims = document.getAnimations()
  for (const m of marks) {
    const c = { l: m.box.l - m.dot, r: m.box.r + m.dot, t: m.box.t - m.dot, b: m.box.b + m.dot }
    for (let n = m.root; n && n !== document.documentElement; n = n.parentElement || n.parentNode) {
      if (n.nodeType === 1 && getComputedStyle(n).opacity !== '1') { out.push({ mark: m.name, rule: 'opacity' }); break }
    }
    if (anims.some((a) => { const t = a.effect && a.effect.target; return t && (m.root.contains(t) || t.contains(m.root)) })) out.push({ mark: m.name, rule: 'animation' })
    const skip = (el) => m.root.contains(el) || el.contains(m.root)
    for (const el of texts) if (!skip(el) && shown(el) && hits(drawn(el), c)) out.push({ mark: m.name, rule: 'clearspace', el: el.tagName, text: el.textContent.trim().slice(0, 24) })
    for (const el of shapes) {
      if (skip(el) || !shown(el)) continue
      if (el.tagName === 'path' && el.getTotalLength && el.getScreenCTM()) {
        const len = el.getTotalLength(), ctm = el.getScreenCTM(), svg = el.ownerSVGElement, clip = clipOf(el)
        for (let k = 0; k <= 200; k++) {
          const p = el.getPointAtLength(len * k / 200), q = svg.createSVGPoint(); q.x = p.x; q.y = p.y
          const s = q.matrixTransform(ctm)
          if (s.x >= clip.left && s.x <= clip.right && s.y >= clip.top && s.y <= clip.bottom && s.x > c.l && s.x < c.r && s.y > c.t && s.y < c.b) { out.push({ mark: m.name, rule: 'clearspace', el: 'path' }); break }
        }
      } else if (hits(drawn(el), c)) out.push({ mark: m.name, rule: 'clearspace', el: el.tagName })
    }
  }
  return { marks: marks.map((m) => m.name), violations: out }
}

const loops = () => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity).length

const server = await createServer({ root, logLevel: 'silent', server: { port: 0, strictPort: false } })
await server.listen()
const base = server.resolvedUrls.local[0]
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})

/** A page with its console errors, page errors, failed requests and requests to other origins. */
const open = async (path, { width = 1280, ...options } = {}) => {
  const page = await browser.newPage({ viewport: { width, height: 900 }, ...options })
  const errors = []
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`) })
  page.on('requestfailed', (request) => errors.push(`requestfailed: ${request.url()}`))
  page.on('request', (request) => { const url = request.url(); if (!url.startsWith(base) && !url.startsWith(`blob:${base}`) && !url.startsWith('data:') && !url.startsWith('ws://')) errors.push(`external: ${url}`) })
  await page.goto(base + path, { waitUntil: 'networkidle' })
  return { page, errors }
}
const tabs = (page) => page.$$eval('nav.tabs button', (buttons) => buttons.map((button) => button.textContent.trim()))
const current = (page) => page.$eval('nav.tabs [aria-current="page"]', (button) => button.textContent.trim())
const viewParam = (page) => new URL(page.url()).searchParams.get('view')
/** Chooses a brand from the masthead's brand menu (the logo), by its name. */
const fromBrandMenu = async (page, name) => {
  await page.locator('.brand-menu__trigger').click()
  await page.locator('.brand-menu [role="menuitemradio"]', { hasText: name }).first().click()
}
/** Opens the Motion tab and waits until the stage's frame of the library page has drawn its studies. */
const openMotionTab = async (page) => {
  await page.locator('nav.tabs button', { hasText: 'Motion' }).click()
  await page.frameLocator('iframe.motion-stage').locator('.tile').first().waitFor({ state: 'attached' })
}

try {
  // --- The app: ddcnorth v2.3 (approved) has its Motion tab; a brand without a library falls back.
  for (const width of [1280, 390]) {
    const tag = `@${width}`
    await check(`app motion tab only with a library ${tag}`, async () => {
      const approved = await open('?brand=ddcnorth', { width })
      assert.ok((await tabs(approved.page)).includes('Motion'), 'v2.3 has Motion')
      assert.equal(await approved.page.locator('.brand-menu [role="menuitemradio"]').count(), 0, 'the brand menu starts closed')
      await approved.page.locator('.brand-menu__trigger').click()
      assert.equal(await approved.page.locator('.brand-menu .menu__heading', { hasText: 'Revision' }).count(), 0, 'no open revisions to choose')
      await approved.page.keyboard.press('Escape')
      await openMotionTab(approved.page)
      assert.equal(await approved.page.locator('.motion-studio .studio__item').count(), 18, '18 studies in the list')
      // To a brand without a library while on Motion.
      await fromBrandMenu(approved.page, 'northwind')
      await approved.page.waitForFunction(() => document.querySelector('nav.tabs [aria-current="page"]')?.textContent.trim() === 'Overview')
      assert.equal(viewParam(approved.page), null)
      assert.equal(await approved.page.locator('iframe.motion-stage').count(), 0, 'leaving the tab removes the frame')
      assert.ok(!(await tabs(approved.page)).includes('Motion'), 'northwind has no Motion')
      assert.deepEqual(approved.errors, [])
      await approved.page.close()
      const firstform = await open('?brand=firstform', { width })
      assert.ok((await tabs(firstform.page)).includes('Motion'), 'First Form keeps its Motion tab')
      await firstform.page.close()
    })
    await check(`app motion view falls back to the overview ${tag}`, async () => {
      for (const path of ['?brand=northwind&view=motion', '?brand=northwind&share=1&view=motion']) {
        const { page, errors } = await open(path, { width })
        await page.waitForFunction(() => document.querySelector('nav.tabs [aria-current="page"]')?.textContent.trim() === 'Overview')
        assert.equal(viewParam(page), null, path)
        assert.deepEqual(errors, [], path)
        await page.close()
      }
      for (const path of ['?brand=ddcnorth&view=motion', '?brand=ddcnorth&share=1&view=motion']) {
        const { page } = await open(path, { width })
        await page.waitForFunction(() => document.querySelector('nav.tabs [aria-current="page"]')?.textContent.trim() === 'Motion')
        await page.close()
      }
    })
  }

  // --- The motion library page.
  const MOTION = 'brands/ddcnorth/motion/index.html'
  for (const width of [1280, 390]) {
    const tag = `@${width}`
    const { page, errors } = await open(MOTION, { width })
    if (process.env.DDC_BROKEN) await page.evaluate(() => { document.querySelector('.mast svg').style.opacity = '0.5' })
    await check(`motion page content ${tag}`, async () => {
      assert.equal(await page.locator('#rules > div').count(), 3)
      assert.equal(await page.locator('#token-rows tr').count(), 6)
      assert.equal(await page.locator('#guardrail-lists li').count(), 8)
      assert.equal(await page.locator('#filters [data-filter]').count(), 6)
      const tiles = await page.$$eval('.tile', (items) => items.map((item) => ({ study: item.dataset.study, name: item.querySelector('h3')?.textContent, kind: item.querySelector('.kind')?.textContent, timing: item.querySelector('.spec dd.mono')?.textContent, use: item.querySelectorAll('.spec dd')[1]?.textContent, button: item.querySelector('button[data-replay]')?.textContent })))
      assert.deepEqual(tiles.map((tile) => tile.study), STUDIES.map((study) => study.id))
      for (const [index, tile] of tiles.entries()) {
        assert.ok(tile.name && tile.timing && tile.use && tile.button === `Replay ${tile.name}`, JSON.stringify(tile))
        assert.ok(tile.kind.startsWith(STUDIES[index].kind), `${tile.study} kind`)
      }
    })
    await check(`motion page marks while animating and at rest ${tag}`, async () => {
      assert.ok(await page.evaluate(() => document.getAnimations().length) > 0, 'animations run on load')
      const first = await page.evaluate(markViolations, { logos: '.mast svg, .t-logo' })
      assert.ok(first.marks.length >= 2, JSON.stringify(first.marks))
      assert.deepEqual(first.violations, [])
      await page.waitForTimeout(3200)
      assert.deepEqual((await page.evaluate(markViolations, { logos: '.mast svg, .t-logo' })).violations, [])
    })
    await check(`motion page colours ${tag}`, async () => { assert.deepEqual(colourProblems(await page.content()), []) })
    if (width === 1280) {
      await check('motion page replay within 500 ms, and replay all', async () => {
        for (const study of STUDIES) {
          if (['progress', 'signal'].includes(study.id)) {
            const before = await page.locator(`#m-${study.id} .stage`).innerHTML()
            await page.click(`[data-replay="${study.id}"]`)
            await page.waitForFunction(([id, html]) => document.querySelector(`#m-${id} .stage`).innerHTML !== html, [study.id, before], { timeout: 500 })
          } else {
            await page.evaluate(() => { window.__seen = new Set(document.getAnimations()) })
            await page.click(`[data-replay="${study.id}"]`)
            await page.waitForFunction((id) => { const stage = document.querySelector(`#m-${id} .stage`); return document.getAnimations().some((a) => !window.__seen.has(a) && a.effect?.target && stage.contains(a.effect.target)) }, study.id, { timeout: 500 })
          }
        }
        await page.evaluate(() => { window.__seen = new Set(document.getAnimations()) })
        const drawings = { progress: await page.locator('#m-progress .stage').innerHTML(), signal: await page.locator('#m-signal .stage').innerHTML() }
        await page.click('#replay-all')
        // Every study restarts: a new animation in each animated stage, and a new drawing for Fill and Signal.
        // Count starts its first animation at its first step (350 ms), so allow the same 500 ms.
        const waiting = (frameDriven) => [...document.querySelectorAll('.tile')].filter((tile) => !frameDriven.includes(tile.dataset.study)).filter((tile) => !document.getAnimations().some((a) => !window.__seen.has(a) && a.effect?.target && tile.contains(a.effect.target))).map((tile) => tile.dataset.study)
        await page.waitForFunction((fn) => (0, eval)(`(${fn})`)(['progress', 'signal']).length === 0, waiting.toString(), { timeout: 500 }).catch(() => {})
        assert.deepEqual(await page.evaluate(waiting, ['progress', 'signal']), [], 'studies without a new animation after replay all')
        for (const id of ['progress', 'signal']) await page.waitForFunction(([key, html]) => document.querySelector(`#m-${key} .stage`).innerHTML !== html, [id, drawings[id]], { timeout: 500 })
      })
      await check('motion page pause, replay while paused, resume', async () => {
        await page.click('#pause')
        assert.equal(await page.getAttribute('#pause', 'aria-pressed'), 'true')
        assert.equal((await page.textContent('#pause')).trim(), 'Resume loops')
        assert.equal(await page.evaluate(loops), 0)
        await page.click('[data-replay="think"]')
        await page.click('#replay-all')
        await page.waitForTimeout(100)
        const counted = await page.evaluate(() => window.__ddcMotionLoops ?? 0)
        const frozen = await page.locator('#m-signal .stage').innerHTML()
        await page.waitForTimeout(500)
        assert.equal(await page.evaluate(loops), 0, 'loops stay paused')
        assert.equal(await page.evaluate(() => window.__ddcMotionLoops ?? 0), counted, 'frame loops stay paused')
        assert.equal(await page.locator('#m-signal .stage').innerHTML(), frozen)
        await page.click('#pause')
        await page.waitForFunction((n) => (window.__ddcMotionLoops ?? 0) > n, counted, { timeout: 1000 })
        assert.ok(await page.evaluate(loops) > 0)
      })
      await check('motion page filters', async () => {
        await page.click('[data-filter="paths"]')
        assert.equal(await page.getAttribute('[data-filter="paths"]', 'aria-pressed'), 'true')
        assert.deepEqual(await page.$$eval('.tile', (items) => items.filter((item) => !item.hidden).map((item) => item.dataset.study)), ['connect', 'branch', 'timeline'])
        await page.click('[data-filter="all"]')
        assert.equal(await page.$$eval('.tile', (items) => items.filter((item) => !item.hidden).length), 18)
      })
      await check('motion page keyboard', async () => {
        await page.evaluate(() => document.activeElement?.blur())
        let reached = null
        for (let i = 0; i < 80 && !reached; i++) {
          await page.keyboard.press('Tab')
          reached = await page.evaluate(() => (document.activeElement?.matches('[data-filter="fields"]') ? 'fields' : null))
        }
        assert.equal(reached, 'fields', 'Tab reaches a filter')
        await page.keyboard.press('Space')
        assert.equal(await page.getAttribute('[data-filter="fields"]', 'aria-pressed'), 'true')
        await page.keyboard.press('Shift+Tab')
        await page.keyboard.press('Space')
        assert.equal(await page.getAttribute('[data-filter="all"]', 'aria-pressed'), 'true', 'back to All by keyboard')
        let replay = null
        for (let i = 0; i < 40 && !replay; i++) {
          await page.keyboard.press('Tab')
          replay = await page.evaluate(() => document.activeElement?.dataset?.replay ?? null)
        }
        assert.ok(replay, 'Tab reaches a replay button')
        await page.evaluate(() => { window.__seen = new Set(document.getAnimations()) })
        await page.keyboard.press('Enter')
        await page.waitForFunction(() => document.getAnimations().some((a) => !window.__seen.has(a)), null, { timeout: 500 })
      })
      await check('motion page negative control: an animated logo is reported', async () => {
        const result = await page.evaluate((fn) => {
          const logo = document.querySelector('#m-settle .t-logo')
          const animation = logo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 10000 })
          const out = (0, eval)(`(${fn})`)({ logos: '.mast svg, .t-logo' })
          animation.cancel()
          return out.violations.map((v) => v.rule)
        }, markViolations.toString())
        assert.ok(result.includes('animation') && result.includes('opacity'), JSON.stringify(result))
      })
    }
    await check(`motion page health ${tag}`, async () => {
      const d = await page.evaluate(() => ({ viewport: innerWidth, doc: document.documentElement.scrollWidth }))
      assert.ok(d.doc <= d.viewport, JSON.stringify(d))
      assert.deepEqual(errors, [])
    })
    await page.close()
  }
  await check('motion page with reduced motion: final frames, nothing plays', async () => {
    const { page, errors } = await open(MOTION, { reducedMotion: 'reduce' })
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0)
    assert.ok(await page.isVisible('#reduced-note'))
    for (const selector of ['#replay-all', '#pause', ...STUDIES.map((study) => `[data-replay="${study.id}"]`)]) assert.ok(await page.isDisabled(selector), selector)
    const drawn = await page.$$eval('.tile .stage > svg', (svgs) => svgs.map((svg) => svg.querySelectorAll('circle, path, text').length))
    assert.ok(drawn.length === 18 && drawn.every((count) => count > 0), JSON.stringify(drawn))
    await page.waitForTimeout(600)
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0)
    assert.deepEqual(errors, [])
    await page.close()
  })

  // --- The brand-details page: its rendered colours in every generator state.
  for (const width of [1280, 390]) {
    await check(`brand-details page colours in every state, and health @${width}`, async () => {
      const { page, errors } = await open('brands/ddcnorth/docs/brand-details.html', { width })
      const scan = async (state) => { const problems = colourProblems(await page.content()); assert.deepEqual(problems, [], state) }
      await scan('load')
      const families = await page.$$eval('#gen-type option', (options) => options.map((option) => option.value))
      assert.equal(families.length, 6)
      for (const family of families) { await page.selectOption('#gen-type', family); await scan(family) }
      const chips = page.locator('#gen-colours .chip')
      assert.equal(await chips.count(), 4)
      for (let i = 0; i < 4; i++) { await chips.nth(i).click(); await scan(`colourway ${i}`) }
      const d = await page.evaluate(() => ({ viewport: innerWidth, doc: document.documentElement.scrollWidth }))
      assert.ok(d.doc <= d.viewport, JSON.stringify(d))
      assert.deepEqual(errors, [])
      // Negative control: an off-palette fill must be reported.
      await page.evaluate(() => document.querySelector('#gen-out svg').insertAdjacentHTML('beforeend', '<circle cx="1" cy="1" r="1" fill="#123456"/>'))
      assert.ok(colourProblems(await page.content()).some((problem) => problem.includes('#123456')))
      await page.close()
    })
  }
} finally {
  await browser.close()
  await server.close()
  report.finished = new Date().toISOString()
  report.passed = report.checks.every((entry) => entry.pass)
  writeFileSync(new URL('./report.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`)
  const failed = report.checks.filter((entry) => !entry.pass).length
  console.log(`\n${report.checks.length - failed}/${report.checks.length} checks passed`)
  process.exitCode = failed ? 1 : 0
}
