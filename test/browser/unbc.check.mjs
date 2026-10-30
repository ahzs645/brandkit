// UNBC unit naming, rule enforcement, native-template handoff and portable downloads.
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { unzipSync, strFromU8 } from 'fflate'

const root = fileURLToPath(new URL('../../', import.meta.url))
const screenshotDir = resolve(process.env.SCREENSHOT_DIR ?? '.documentation/unbc-browser')
mkdirSync(screenshotDir, { recursive: true })
const args = process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : ['--no-sandbox', '--disable-dev-shm-usage']
assert.ok(Array.isArray(args) && args.every(arg => typeof arg === 'string'))
const server = await preview({ root, logLevel: 'silent', preview: { port: 0, host: '127.0.0.1' } })
const base = server.resolvedUrls.local[0]
const result = { downloads: 0, mobileViews: [], checks: [] }
let browser
let currentPage

try {
  browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, reducedMotion: 'reduce' })
  const page = await context.newPage()
  currentPage = page
  page.setDefaultTimeout(45000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  const download = async name => {
    const [file] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), page.getByRole('button', { name, exact: true }).click()])
    assert.equal(await file.failure(), null)
    result.downloads++
    return readFileSync(await file.path())
  }
  // The app's dropdowns are styled comboboxes: open one, then pick the option by its label.
  const choose = async (name, option) => {
    await page.getByRole('combobox', { name: name instanceof RegExp ? name : new RegExp(`^${name}$`) }).click()
    await page.getByRole('option', { name: option, exact: true }).click()
  }
  // Documents is the second part of the Templates tab, switched from the bar above it.
  const navigate = async (name) => {
    if (name !== 'Documents') return page.locator('nav.tabs').getByRole('button', { name, exact: true }).click()
    await page.locator('nav.tabs').getByRole('button', { name: 'Templates', exact: true }).click()
    await page.getByRole('group', { name: 'Templates or documents' }).getByRole('button', { name: 'Documents', exact: true }).click()
  }
  const department = 'Faculty of Environment'
  const subdepartment = 'Department of Geography, Earth and Environmental Sciences'
  await page.goto(`${base}?brand=unbc&view=organization`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Department sub-logo', exact: true }).waitFor()
  await choose('Department', department)
  assert.equal(await page.getByRole('textbox', { name: /^Department as set/ }).inputValue(), department)
  const [svgFile] = await Promise.all([page.waitForEvent('download'), page.locator('.asset-card').first().getByRole('button', { name: /SVG/ }).click()])
  result.downloads++
  const subLogo = readFileSync(await svgFile.path(), 'utf8')
  assert.match(subLogo, /aria-label="Faculty of Environment"/)
  await page.getByRole('textbox', { name: /^Department as set/ }).fill('Pneumonoultramicroscopicsilicovolcanoconiosis Institute')
  assert.match(await page.getByRole('alert').innerText(), /Too long to break/)
  // Choosing the department again sets its name back; like a native select, choosing the option
  // already chosen changes nothing, so another is chosen first.
  await choose('Department', 'None: the full logo')
  await choose('Department', department)
  await page.screenshot({ path: resolve(screenshotDir, 'unbc-departments-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Use in documents', exact: true }).click()
  await page.locator('.documents-preview iframe').waitFor()
  assert.equal(await page.getByLabel('Department or school', { exact: true }).inputValue(), department)
  await page.getByLabel('Subdepartment or unit', { exact: true }).fill(subdepartment)
  const source = JSON.parse((await download('Download source')).toString())
  assert.deepEqual(source.affiliation, { department, subdepartment })
  assert.equal(source.purpose, 'report')
  await choose('Document purpose', 'Brand portfolio')
  const word = unzipSync(await download('Download Word'))
  assert.match(strFromU8(word['word/document.xml']), /Faculty of Environment/)
  assert.match(strFromU8(word['word/document.xml']), /Department of Geography/)
  await page.screenshot({ path: resolve(screenshotDir, 'unbc-portfolio-desktop.png'), fullPage: true })
  result.checks.push('sub-logo download', 'unbreakable name warning', 'sub-logo name in documents', 'portfolio Word download')

  await navigate('Templates')
  await page.locator('.studio__preview').waitFor()
  const templateDepartment = page.locator('.studio').getByRole('textbox', { name: /^Department or academic unit/ })
  const templateUnit = page.locator('.studio').getByRole('textbox', { name: /^Subdepartment or team/ })
  assert.equal(await templateDepartment.inputValue(), department)
  assert.equal(await templateUnit.inputValue(), subdepartment)
  await templateUnit.fill('School of Planning and Sustainability')
  await navigate('Documents')
  assert.equal(await page.getByLabel('Subdepartment or unit', { exact: true }).inputValue(), 'School of Planning and Sustainability')
  await navigate('Departments')
  assert.equal(await page.getByRole('textbox', { name: /^Department as set/ }).inputValue(), department, 'the sub-logo opens on the saved department')
  result.checks.push('bidirectional template and document naming')

  await navigate('Templates')
  await page.getByRole('button', { name: 'Clear every field', exact: true }).click()
  await navigate('Documents')
  assert.equal(await page.getByLabel('Department or school', { exact: true }).inputValue(), '')
  assert.equal(await page.getByLabel('Subdepartment or unit', { exact: true }).inputValue(), '')
  // With no saved names, the naming section starts closed.
  const naming = page.locator('details.documents-details', { hasText: 'Department naming' })
  if (!(await naming.evaluate((details) => details.open))) await naming.locator('summary').click()
  await page.getByLabel('Department or school', { exact: true }).fill(department)
  await page.getByLabel('Subdepartment or unit', { exact: true }).fill('School of Planning and Sustainability')
  result.checks.push('cleared template names stay cleared')

  await navigate('Logos')
  assert.equal(await page.getByText('Inherited colour', { exact: true }).count(), 0)
  assert.equal(await page.getByRole('heading', { name: 'Symbol', exact: true }).count(), 0)
  await navigate('Download kit')
  // The department saved in Documents arrives as the kit's chosen unit, and names the starters.
  await page.getByRole('radio', { name: /^Documents & slides/ }).check()
  const archive = unzipSync(await download(/^Download Documents & slides for Faculty of Environment — \d+ files$/))
  const names = Object.keys(archive)
  assert.ok(!names.some(name => /(?:\/symbol\/|favicon|app-icon)/.test(name)))
  for (const suffix of ['reference/identity-rules.json', 'official-templates/lhopt1official.docx', 'source/consumer-profile.json']) assert.ok(names.some(name => name.endsWith(suffix)), suffix)
  const publication = JSON.parse(strFromU8(archive[names.find(name => name.endsWith('unbc-publication-report-letter.json'))]))
  assert.equal(publication.affiliation.subdepartment, 'School of Planning and Sustainability')
  const profile = JSON.parse(strFromU8(archive[names.find(name => name.endsWith('source/consumer-profile.json'))]))
  assert.equal(profile.typography.body.family, 'Arial')
  await page.locator('.kit-action p[role="status"]').waitFor()
  assert.ok(!(await page.locator('.kit-action p[role="status"]').innerText()).includes('could not be made'))
  result.checks.push('document pack original sources', 'personalized kit', 'permitted logo exports')

  await page.setViewportSize({ width: 390, height: 844 })
  for (const [view, selector] of [['organization', '.organization-view'], ['documents', '.documents-view'], ['logos', '.asset-grid'], ['overview', '.overview']]) {
    await page.goto(`${base}?brand=unbc&view=${view}&share=1`, { waitUntil: 'networkidle' })
    await page.locator(selector).first().waitFor()
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }))
    assert.ok(dimensions.scroll <= dimensions.viewport + 1, `${view}: no page overflow at390px (${dimensions.scroll})`)
    await page.screenshot({ path: resolve(screenshotDir, `unbc-${view}-mobile.png`), fullPage: true })
    result.mobileViews.push(view)
  }
  assert.deepEqual(errors, [], 'no page or resource errors')
  await context.close()
  writeFileSync(resolve(screenshotDir, 'summary.json'), `${JSON.stringify(result, null, 2)}\n`)
  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  await currentPage?.screenshot({ path: resolve(screenshotDir, 'failure.png'), fullPage: true }).catch(() => {})
  console.error(error)
  throw error
} finally {
  await browser?.close()
  await new Promise(resolve => server.httpServer.close(resolve))
}
