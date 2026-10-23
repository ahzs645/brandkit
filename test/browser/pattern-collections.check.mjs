// End-to-end supporting-pattern checks and focused production packs for the six other brands.
// npm run build && CHROMIUM_PATH=/usr/bin/chromium node test/browser/pattern-collections.check.mjs
// Optional: PATTERN_BRANDS=ddcnorth,firstform or PATTERN_SKIP_PRODUCTION=1 for targeted reruns.
// All captures and downloaded packs go to /workspace/artifacts; tracked screenshots are untouched.
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer, preview } from 'vite'
import { chromium } from 'playwright'
import { unzipSync, strFromU8 } from 'fflate'
import { pattern } from '../../src/engine/artwork.js'

const root = new URL('../../', import.meta.url).pathname
const artifacts = '/workspace/artifacts/brand-patterns/'
const allIds = ['ddcnorth', 'firstform', 'northwind', 'overtheedge', 'bc-hydro-1983', 'bc-province-1977']
const ids = process.env.PATTERN_BRANDS ? process.env.PATTERN_BRANDS.split(',').map(s => s.trim()).filter(Boolean) : allIds
assert.ok(ids.length && ids.every(id => allIds.includes(id)), 'PATTERN_BRANDS must name one or more supported brands')
const report = { brands: [], production: [] }
mkdirSync(artifacts, { recursive: true })
const server = await createServer({ root, logLevel: 'silent', server: { port: 0 } })
await server.listen()
const base = server.resolvedUrls.local[0]
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' })

const open = async (url, width = 1440) => {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' })
  page.setDefaultTimeout(45000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`${request.failure()?.errorText}: ${request.url()}`) })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  return { page, errors }
}

const fits = async (page, label) => {
  assert.ok(await page.locator('h1').isVisible(), `${label}: visible page title`)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${label}: no horizontal overflow`)
}

const changeRange = async (page, id, value) => {
  await page.locator(id).evaluate((input, n) => {
    input.value = String(n)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}

const finiteSvg = async (page, label) => {
  const svg = await page.locator('#preview svg').evaluate(svg => svg.outerHTML)
  assert.match(svg, /<svg\b/, label)
  assert.match(svg, /<(?:path|circle|polyline|polygon|ellipse)\b/, `${label}: nonempty vector geometry`)
  assert.doesNotMatch(svg, /NaN|Infinity|undefined/, `${label}: finite geometry`)
  return svg
}

const validatePack = (path, id, collection) => {
  const archive = unzipSync(readFileSync(path))
  const prefix = `${id}-patterns/`
  const get = relative => archive[prefix + relative]
  for (const patternId of collection.patterns) {
    assert.ok(get(`patterns/${patternId}.svg`), `${id}: ${patternId} SVG is packaged`)
    assert.ok(get(`patterns/png/${patternId}.png`), `${id}: ${patternId} PNG is packaged`)
  }
  for (const templateId of collection.templates) for (const relative of [`templates/${templateId}.svg`, `templates/png/${templateId}.png`, `templates/pdf/${templateId}.pdf`]) assert.ok(get(relative), `${id}: ${relative}`)
  for (const relative of ['docs/pattern-explorer.html', 'docs/patterns-guide.html', `documents/${id}-pattern-studies.pptx`, 'source/brand.json', 'source/README.md']) assert.ok(get(relative), `${id}: ${relative}`)
  const paths = Object.keys(archive).map(p => p.slice(prefix.length))
  for (const extension of ['svg', 'png', 'pdf']) assert.ok(paths.some(p => p.startsWith('guidelines/pattern-studies') && p.endsWith(`.${extension}`)), `${id}: pattern guide ${extension}`)
  assert.ok(paths.some(p => p.startsWith('fonts/')), `${id}: fonts travel with the pack`)
  for (const [path, bytes] of Object.entries(archive)) {
    if (path.endsWith('.svg')) assert.doesNotMatch(strFromU8(bytes), /NaN|Infinity|undefined/, path)
    if (path.endsWith('.png')) assert.deepEqual([...bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${path}: real PNG`)
    if (path.endsWith('.pdf')) assert.equal(strFromU8(bytes.slice(0, 5)), '%PDF-', `${path}: real PDF`)
  }
  const slides = unzipSync(get(`documents/${id}-pattern-studies.pptx`))
  const definition = JSON.parse(strFromU8(get('source/brand.json')))
  const layouts = definition.documents.find(document => document.id === 'pattern-studies').layouts
  assert.equal(Object.keys(slides).filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p)).length, layouts.length, `${id}: every editable PowerPoint layout`)
  assert.ok(Object.keys(slides).some(p => /^ppt\/media\/.+\.png$/.test(p)), `${id}: PowerPoint contains rendered pattern artwork`)
  return { files: paths.length, bytes: readFileSync(path).length }
}

const runBrand = async id => {
  const folder = `${artifacts}${id}/`
  mkdirSync(folder, { recursive: true })
  const brand = JSON.parse(readFileSync(`${root}brands/${id}/brand.json`, 'utf8'))
  const collection = brand.patternCollection
  assert.ok(collection?.page && collection.patterns?.length >= 6 && collection.templates?.length === 2, `${id}: complete pattern collection metadata`)
  const module = await import(new URL(`../../scripts/brands/patterns/${id}.mjs`, import.meta.url))
  const palettes = collection.palettes ?? module.PALETTES
  for (const path of [collection.page, 'docs/patterns-guide.html']) for (const width of [1440, 390]) {
    const { page, errors } = await open(`${base}brands/${id}/${path}`, width)
    await fits(page, `${id}/${path} at ${width}`)
    assert.deepEqual(errors, [], `${id}/${path} at ${width}: resources and scripts`)
    const name = path === collection.page ? 'explorer' : 'guide'
    await page.screenshot({ path: `${folder}${name}-${width === 1440 ? 'desktop' : 'mobile'}.png`, fullPage: true })
    await page.close()
  }

  const { page: explorer, errors: explorerErrors } = await open(`${base}brands/${id}/${collection.page}`)
  assert.equal(await explorer.locator('[data-study]').count(), collection.patterns.length, `${id}: every gallery preset is present`)
  assert.equal(await explorer.locator('#study option').count(), collection.patterns.length, `${id}: every preset is selectable`)
  let variants = 0
  for (const studyId of collection.patterns) {
    await explorer.locator('#study').selectOption(studyId)
    for (const palette of palettes) {
      await explorer.locator('#palette').selectOption(palette.id)
      const svg = await finiteSvg(explorer, `${id}/${studyId}/${palette.id}`)
      const expected = module.buildPattern(brand, studyId, { scale: 100, density: 100, palette })
      const expectedSvg = pattern({ brand }, expected)
      const counts = await explorer.locator('#preview svg').evaluate(svg => ({ marks: svg.querySelectorAll('[data-brand-symbol]').length, circles: svg.querySelectorAll('circle').length, lines: svg.querySelectorAll('polyline').length }))
      // Different mark serializers may omit identifying attributes; the finite vector check
      // above remains required, while compatible markup also receives exact shape counts.
      if (counts.marks) assert.equal(counts.marks, expected.place?.length ?? 0, `${id}/${studyId}: every motif is drawn`)
      if (counts.circles) assert.equal(counts.circles, [...expectedSvg.matchAll(/<circle\b/g)].length, `${id}/${studyId}: every dot is drawn`)
      if (counts.lines) assert.equal(counts.lines, [...expectedSvg.matchAll(/<polyline\b/g)].length, `${id}/${studyId}: every route is drawn`)
      assert.ok(svg.length > 200)
      variants++
    }
  }

  const adjustable = collection.patterns.find(studyId => JSON.stringify(module.buildPattern(brand, studyId, { scale: 100, density: 50, palette: palettes[0] })) !== JSON.stringify(module.buildPattern(brand, studyId, { scale: 100, density: 150, palette: palettes[0] })))
  assert.ok(adjustable, `${id}: at least one repeat responds to density`)
  await explorer.locator('#study').selectOption(adjustable)
  const before = await finiteSvg(explorer, `${id}: initial preview`)
  await changeRange(explorer, '#scale', 150)
  const scaled = await finiteSvg(explorer, `${id}: scaled preview`)
  assert.notEqual(scaled, before, `${id}: scale control changes geometry`)
  await changeRange(explorer, '#density', 150)
  assert.notEqual(await finiteSvg(explorer, `${id}: dense preview`), scaled, `${id}: density control changes geometry`)
  const preset = collection.patterns[0]
  await explorer.locator(`[data-study="${preset}"] [data-preset]`).click()
  assert.equal(await explorer.locator('#study').inputValue(), preset, `${id}: gallery buttons select the requested preset`)
  assert.equal(await explorer.locator('#scale').inputValue(), '100', `${id}: preset resets scale`)
  assert.equal(await explorer.locator('#density').inputValue(), '100', `${id}: preset resets density`)

  const svgDownload = explorer.waitForEvent('download').catch(() => null)
  await explorer.locator('#download-svg').click()
  const svgFile = await svgDownload
  assert.ok(svgFile, `${id}: SVG download completes`)
  assert.ok(svgFile.suggestedFilename().endsWith('.svg'))
  const downloadedSvg = readFileSync(await svgFile.path(), 'utf8')
  assert.match(downloadedSvg, /<svg\b/)
  assert.doesNotMatch(downloadedSvg, /NaN|Infinity|undefined/)
  await svgFile.saveAs(`${folder}${id}-explorer.svg`)
  const pngDownload = explorer.waitForEvent('download').catch(() => null)
  await explorer.locator('#download-png').click()
  const pngFile = await pngDownload
  assert.ok(pngFile, `${id}: PNG download completes`)
  assert.ok(pngFile.suggestedFilename().endsWith('.png'))
  assert.deepEqual([...readFileSync(await pngFile.path()).slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  await pngFile.saveAs(`${folder}${id}-explorer.png`)
  assert.deepEqual(explorerErrors, [], `${id}: controls and downloads produced no browser errors`)
  await explorer.close()

  const { page: app, errors: appErrors } = await open(`${base}?brand=${id}&view=logos`)
  await app.locator('nav.tabs').getByRole('button', { name: 'Logos', exact: true }).click()
  const patterns = app.locator('section.panel').filter({ has: app.getByRole('heading', { name: 'Patterns', exact: true }) })
  await patterns.waitFor()
  const link = app.getByRole('link', { name: /Explore patterns/i })
  assert.ok(await link.isVisible(), `${id}: discoverable explorer link`)
  const href = await link.getAttribute('href')
  assert.ok(href?.includes('pattern-explorer'), `${id}: correct explorer target`)
  for (const patternId of collection.patterns) {
    const spec = brand.patterns.find(p => p.id === patternId)
    assert.ok(await patterns.getByText(spec.name ?? patternId, { exact: true }).isVisible(), `${id}: ${patternId} in Logos`)
  }
  await app.locator('nav.tabs').getByRole('button', { name: 'Templates', exact: true }).click()
  await app.locator('.studio__stage svg, .studio__stage img').first().waitFor()
  for (const templateId of collection.templates) {
    const template = brand.templates.find(t => t.id === templateId)
    await app.getByRole('button', { name: template.label ?? templateId, exact: true }).click()
    await app.locator('.studio__stage svg, .studio__stage img').first().waitFor()
    assert.equal(new URL(app.url()).searchParams.get('template'), templateId, `${id}: selected editable template`)
  }

  const packDownload = app.waitForEvent('download', { timeout: 180000 }).catch(() => null)
  const exported = await app.evaluate(async brandId => {
    const [{ loadBuiltIn }, { loadBrandFonts }, { buildKit }, { createBrowserRenderer, download, zip }] = await Promise.all([
      import('/src/app/brands.js'), import('/src/fonts/provider.js'), import('/src/engine/kit.js'), import('/src/export/render.js')
    ])
    const { brand, source } = await loadBuiltIn(brandId)
    const fonts = await loadBrandFonts(brand, source.read)
    const selected = new Set(['docs/pattern-explorer.html', 'docs/patterns-guide.html', `documents/${brandId}-pattern-studies.pptx`, 'source/brand.json', 'source/README.md'])
    const { files, skipped } = await buildKit({ brand, fonts }, {
      renderer: createBrowserRenderer(), readAsset: source.read,
      filter: entry => entry.path.includes('explore-') || entry.path.startsWith('guidelines/pattern-studies') || entry.path.startsWith('fonts/') || selected.has(entry.path)
    })
    const errors = skipped.map(({ path, error }) => `${path}: ${error.message}`)
    if (!errors.length) download(new Blob([await zip(files, `${brandId}-patterns`)], { type: 'application/zip' }), `${brandId}-patterns.zip`)
    return { errors, files: files.size, fontFailures: fonts.failures }
  }, id)
  assert.deepEqual(exported.errors, [], `${id}: focused kit render/export`)
  assert.deepEqual(exported.fontFailures, [], `${id}: usable local fonts`)
  const packPath = `${folder}${id}-patterns.zip`
  const packFile = await packDownload
  assert.ok(packFile, `${id}: focused pack download completes`)
  await packFile.saveAs(packPath)
  const pack = validatePack(packPath, id, collection)
  assert.deepEqual(appErrors, [], `${id}: shared app and kit export resources`)
  await app.close()
  return { id, pass: true, patterns: collection.patterns.length, variants, templates: collection.templates.length, ...pack, pack: packPath }
}

try {
  for (const id of ids) {
    try {
      const result = await runBrand(id)
      report.brands.push(result)
      console.log(`${id}: ${result.patterns} presets, ${result.variants} palette variants, controls, SVG/PNG downloads, phone, app and ${result.files}-file PNG/PDF/PowerPoint pack passed.`)
    } catch (error) {
      report.brands.push({ id, pass: false, error: error.stack ?? String(error) })
      console.error(`${id}: FAILED\n${error.stack ?? error}`)
    } finally {
      for (const page of browser.contexts().flatMap(context => context.pages())) await page.close().catch(() => {})
    }
  }
  if (process.env.PATTERN_SKIP_PRODUCTION !== '1') {
    const built = await preview({ root, base: process.env.BASE_PATH || '/brandkit/', logLevel: 'silent', preview: { port: 0 } })
    try {
      for (const id of report.brands.filter(r => r.pass).map(r => r.id)) {
        try {
          const { page: app, errors } = await open(`${built.resolvedUrls.local[0]}?brand=${id}&view=logos`)
          await app.locator('nav.tabs').getByRole('button', { name: 'Logos', exact: true }).click()
          const link = app.getByRole('link', { name: /Explore patterns/i })
          await link.waitFor()
          const href = await link.getAttribute('href')
          assert.deepEqual(errors, [], `${id}: production app assets`)
          const { page: explorer, errors: explorerErrors } = await open(new URL(href, app.url()).href)
          await fits(explorer, `${id}: production explorer`)
          await finiteSvg(explorer, `${id}: production vector preview`)
          await explorer.locator('a[href="#pattern-guide"]').first().click()
          assert.equal(new URL(explorer.url()).hash, '#pattern-guide', `${id}: guide link stays inside the deployed explorer`)
          assert.ok(await explorer.locator('#pattern-guide').isVisible(), `${id}: embedded production guide is present`)
          assert.deepEqual(explorerErrors, [], `${id}: production explorer assets`)
          await explorer.close()
          await app.close()
          report.production.push({ id, pass: true })
        } catch (error) { report.production.push({ id, pass: false, error: error.stack ?? String(error) }) }
      }
    } finally { await new Promise(done => built.httpServer.close(done)) }
  }
} finally {
  writeFileSync(`${artifacts}browser-report.json`, `${JSON.stringify(report, null, 2)}\n`)
  await browser.close()
  await server.close()
}
const failures = [...report.brands, ...report.production].filter(result => !result.pass)
assert.deepEqual(failures, [], 'all pattern collections and production explorers pass')
console.log(`Pattern collections: ${report.brands.length} brands passed; ${report.production.length} production explorers passed. Report: ${artifacts}browser-report.json`)
