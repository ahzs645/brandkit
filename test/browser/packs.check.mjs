// Brand packs in the app, end to end: a brand opened from a link (?url=) is kept in the browser and
// opens again after a reload without being downloaded; a catalog (?catalog=) offers brands to add;
// brands that share files store them once; a pack's pages are served at real addresses, so their
// relative links resolve; a changed pack is offered as an update; removing a brand frees what only
// it used. Run after `npm run build`:
//
//   npm run build && npm run test:packs:browser
//
// The packs are made here from northwind (renamed), and served from another origin, with CORS and
// ETags, the way a catalog host serves them.

import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { pack } from '../../src/pack/cli.js'

const root = fileURLToPath(new URL('../../', import.meta.url))
const screenshotDir = resolve(process.env.SCREENSHOT_DIR ?? '.documentation/packs-browser')
mkdirSync(screenshotDir, { recursive: true })
const args = process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : ['--no-sandbox', '--disable-dev-shm-usage']

// Two brands made from northwind: they share every font and most artwork, which the browser
// should keep once.
const work = mkdtempSync(join(tmpdir(), 'brandkit-packs-'))
const brands = join(work, 'brands')
const out = join(work, 'packs')
const SHARED_BYTES = Buffer.concat(Array.from({ length: 8000 }, (_, index) => createHash('sha512').update(`${index}`).digest()))
// A 2 × 2 PNG.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGP4z8DAwMDAwMAAAA4AAf8fGu8AAAAASUVORK5CYII=', 'base64')
const make = (id, name, primary) => {
  const folder = join(brands, id)
  cpSync(join(root, 'brands/northwind'), folder, { recursive: true })
  // The same reference image in both (not a library file, so each pack carries it), which the
  // browser should keep once; and a note of each brand's own.
  mkdirSync(join(folder, 'reference'), { recursive: true })
  writeFileSync(join(folder, 'reference/shared-photo.webp'), SHARED_BYTES)
  writeFileSync(join(folder, 'reference/README.md'), `Reference for ${name}.\n`)
  // A page that leans on what is around it, as brand-details pages and websites do: an image
  // beside it, a face from the folder above (one the pack leaves to brandkit's library), and
  // another page.
  mkdirSync(join(folder, 'docs/details-assets'), { recursive: true })
  writeFileSync(join(folder, 'docs/details-assets/mark.png'), PNG)
  writeFileSync(join(folder, 'docs/details.html'), `<!doctype html><meta charset="utf-8"><title>${name} details</title>
<style>@font-face{font-family:"Pack Check";src:url('../fonts/desktop/Inter-Regular.ttf')}body{font-family:"Pack Check",serif}</style>
<h1>${name}</h1><img id="mark" src="details-assets/mark.png" alt="mark"><a id="next" href="more.html">More</a>`)
  writeFileSync(join(folder, 'docs/more.html'), `<!doctype html><meta charset="utf-8"><title>More</title><p id="more">More about ${name}.</p>`)
  const brand = JSON.parse(readFileSync(join(folder, 'brand.json'), 'utf8'))
  Object.assign(brand, { id, name, tagline: `${name}, for the pack check.` })
  brand.colours.primary = primary
  writeFileSync(join(folder, 'brand.json'), JSON.stringify(brand, null, 1))
  return folder
}
make('southwind', 'Southwind', '#7A3B1F')
make('eastwind', 'Eastwind', '#1F3B7A')
const repack = () => pack([brands, '--out', out, '--name', 'Check catalog', '--quiet'])
// Two more, handed over as files rather than hosted: one chosen with the file picker, one dragged
// onto the page.
const loose = join(work, 'loose')
const looseOut = join(work, 'loose-packs')
const makeLoose = (id, name, primary) => {
  const folder = make(id, name, primary)
  cpSync(folder, join(loose, id), { recursive: true })
  rmSync(folder, { recursive: true, force: true })
}
makeLoose('upwind', 'Upwind', '#2E6B3F')
makeLoose('downwind', 'Downwind', '#6B2E5A')
pack([loose, '--out', looseOut, '--quiet'])
repack()

// The pack host: another origin, CORS for everyone, ETags so a revisit can be answered "unchanged".
const requests = []
const host = createServer((request, response) => {
  const name = decodeURIComponent(new URL(request.url, 'http://x').pathname.slice(1))
  requests.push(name)
  let body
  try { body = readFileSync(join(out, name)) } catch { response.writeHead(404, { 'Access-Control-Allow-Origin': '*' }).end(); return }
  const etag = `"${createHash('sha256').update(body).digest('hex').slice(0, 16)}"`
  const type = name.endsWith('.json') ? 'application/json' : name.endsWith('.svg') ? 'image/svg+xml' : 'application/zip'
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'ETag', ETag: etag, 'Content-Type': type, 'Cache-Control': 'no-cache' }
  if (request.headers['if-none-match'] === etag) { response.writeHead(304, headers).end(); return }
  response.writeHead(200, { ...headers, 'Content-Length': body.byteLength }).end(body)
})
await new Promise((ready) => host.listen(0, '127.0.0.1', ready))
const packs = `http://127.0.0.1:${host.address().port}/`

const server = await preview({ root, logLevel: 'silent', preview: { port: 0, host: '127.0.0.1' } })
const base = server.resolvedUrls.local[0]
let browser
let page

try {
  browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  page = await context.newPage()
  page.setDefaultTimeout(30000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('dialog', (dialog) => dialog.accept())
  const brandName = () => page.locator('.brand-menu__trigger .visually-hidden').textContent()
  const waitForBrand = async (id) => {
    await page.waitForFunction((want) => new URL(location.href).searchParams.get('brand') === want && document.querySelector('.brand-menu__trigger')?.textContent.includes(want), id)
  }
  const menu = async () => {
    await page.locator('.brand-menu__trigger').click()
    const groups = await page.locator('.menu__panel [role="group"]').evaluateAll((nodes) => nodes.map((node) => [node.getAttribute('aria-label'), [...node.querySelectorAll('.menu__item .visually-hidden, .menu__item .menu-logo__name')].map((label) => label.textContent.trim()).filter(Boolean)]))
    await page.keyboard.press('Escape')
    return Object.fromEntries(groups)
  }
  const usage = () => page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('brandkit-packs')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const tx = open.result.transaction(['blobs', 'packs'])
      const blobs = tx.objectStore('blobs').getAll()
      const records = tx.objectStore('packs').getAll()
      tx.oncomplete = () => resolve({ blobs: blobs.result.length, stored: blobs.result.reduce((sum, entry) => sum + entry.size, 0), packs: records.result.map((record) => ({ id: record.id, hash: record.packHash, updatedAt: record.updatedAt, logical: record.bytes, url: record.url })) })
    }
  }))

  // 1. A link to a pack: downloaded, kept, opened; the address keeps the brand and drops the link.
  await page.goto(`${base}?url=${encodeURIComponent(`${packs}southwind.zip`)}`)
  await waitForBrand('southwind')
  assert.equal(new URL(page.url()).searchParams.get('url'), null, 'the pack link is taken out of the address')
  let stored = await usage()
  assert.deepEqual(stored.packs.map((record) => record.id), ['southwind'])
  await page.screenshot({ path: join(screenshotDir, 'opened-from-link.png') })

  // 2. A reload opens it from the browser, without downloading it again.
  const before = requests.length
  await page.reload()
  await waitForBrand('southwind')
  assert.ok(!requests.slice(before).includes('southwind.zip'), 'a reload does not download the pack')

  // 2b. The pack's pages have real addresses, so what they link to relatively resolves: the image
  // beside a page, a library face from the folder above, and another page.
  const details = await page.context().newPage()
  const detailsErrors = []
  details.on('pageerror', (error) => detailsErrors.push(error.message))
  details.on('response', (response) => { if (response.status() >= 400) detailsErrors.push(`${response.status()} ${response.url()}`) })
  await details.goto(`${base}packs/southwind/docs/details.html`, { waitUntil: 'networkidle' })
  assert.equal(await details.locator('h1').textContent(), 'Southwind')
  assert.equal(await details.locator('#mark').evaluate((image) => image.complete && image.naturalWidth), 2, 'the image beside the page loads')
  assert.ok(await details.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px "Pack Check"') && [...document.fonts].some((face) => face.family.includes('Pack Check') && face.status === 'loaded') }), 'a face from ../fonts/ loads, from brandkit’s library')
  await details.locator('#next').click()
  await details.locator('#more').waitFor()
  assert.deepEqual(detailsErrors, [])
  assert.equal((await details.goto(`${base}packs/southwind/docs/missing.html`)).status(), 404, 'a path the pack does not have is not found')
  assert.equal((await details.goto(`${base}packs/nobody/docs/details.html`)).status(), 404, 'nor is a brand that is not installed')
  await details.close()
  // In the app, a page from the pack links to that address rather than a blob:.
  await page.goto(`${base}?brand=southwind&view=patterns`)
  const explorer = page.locator('.patterns-resources a[data-path$="pattern-explorer.html"]')
  await explorer.waitFor()
  assert.match(await explorer.getAttribute('href'), /\/packs\/southwind\/docs\/pattern-explorer\.html$/)

  // 3. Following the same link again asks the host, and an unchanged pack is not stored again.
  const firstUpdate = stored.packs[0].updatedAt
  await page.goto(`${base}?url=${encodeURIComponent(`${packs}southwind.zip`)}`)
  await waitForBrand('southwind')
  assert.equal((await usage()).packs[0].updatedAt, firstUpdate, 'an unchanged pack is kept as it was')

  // 4. A catalog offers the rest; adding one from the menu installs it.
  await page.goto(`${base}?catalog=${encodeURIComponent(`${packs}catalog.json`)}&brand=southwind`)
  await waitForBrand('southwind')
  let groups = await menu()
  assert.deepEqual(groups['Built in'], ['northwind'])
  assert.deepEqual(groups['In this browser'], ['Southwind'])
  assert.deepEqual(groups['Available to add'], ['Eastwind'])
  await page.locator('.brand-menu__trigger').click()
  await page.locator('.menu__panel').getByRole('menuitemradio', { name: /Eastwind/ }).click()
  await waitForBrand('eastwind')
  groups = await menu()
  assert.deepEqual(groups['In this browser'].sort(), ['Eastwind', 'Southwind'])
  assert.equal(groups['Available to add'], undefined)

  // 5. Files the two brands share are stored once.
  stored = await usage()
  const logical = stored.packs.reduce((sum, record) => sum + record.logical, 0)
  assert.ok(stored.stored < logical * 0.75, `shared files kept once: ${stored.stored} stored for ${logical} of files`)

  // 6. The Brands view says so, and lists where each came from.
  await page.goto(`${base}?brand=eastwind&view=brands`)
  await page.getByRole('heading', { name: 'In this browser' }).waitFor()
  const summary = await page.locator('.brand-library__usage').textContent()
  assert.match(summary, /2 brands take/)
  assert.match(summary, /kept once, which saves/)
  await page.screenshot({ path: join(screenshotDir, 'brands-view.png'), fullPage: true })

  // 7. A share link for a catalog brand names its pack, so it opens for someone without the catalog.
  await page.goto(`${base}?brand=eastwind`)
  await waitForBrand('eastwind')
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  const link = new URL(await page.getByRole('textbox', { name: 'Share link' }).inputValue())
  assert.equal(link.searchParams.get('url'), `${packs}eastwind.zip`)
  assert.equal(link.searchParams.get('share'), '1')
  await page.keyboard.press('Escape')
  const fresh = await browser.newContext()
  const colleague = await fresh.newPage()
  await colleague.goto(link.href)
  await colleague.waitForFunction(() => document.querySelector('.shared-mark')?.getAttribute('aria-label')?.startsWith('Eastwind'))
  assert.equal(new URL(colleague.url()).searchParams.get('url'), `${packs}eastwind.zip`, 'a shared link keeps naming its pack')
  await fresh.close()

  // 8. A changed pack in the catalog is offered as an update, and taken when the brand is opened.
  const southwind = JSON.parse(readFileSync(join(brands, 'southwind/brand.json'), 'utf8'))
  southwind.colours.primary = '#5A2B0F'
  writeFileSync(join(brands, 'southwind/brand.json'), JSON.stringify(southwind, null, 1))
  repack()
  await page.goto(`${base}?brand=eastwind&view=brands`)
  await page.getByRole('button', { name: /^Update/ }).waitFor()
  const oldHash = (await usage()).packs.find((record) => record.id === 'southwind').hash
  await page.getByRole('button', { name: /^Update/ }).click()
  await page.waitForFunction(() => !document.querySelector('.brand-library button')?.textContent.startsWith('Updat'))
  await page.waitForFunction(async (previous) => {
    const all = await new Promise((resolve) => { const open = indexedDB.open('brandkit-packs'); open.onsuccess = () => { const request = open.result.transaction('packs').objectStore('packs').get('southwind'); request.onsuccess = () => resolve(request.result) } })
    return all && all.packHash !== previous
  }, oldHash)

  // 9. Removing a brand frees the files only it used, and keeps the ones the other still needs.
  const beforeRemove = await usage()
  const here = page.locator('section', { has: page.getByRole('heading', { name: 'In this browser' }) })
  await here.locator('.brand-library__row', { hasText: 'Southwind' }).getByRole('button', { name: 'Remove' }).click()
  await here.locator('.brand-library__row', { hasText: 'Southwind' }).waitFor({ state: 'detached' })
  // Still in the catalog, so it is offered again.
  await page.locator('section', { has: page.getByRole('heading', { name: 'Available to add' }) }).getByText('Southwind', { exact: true }).waitFor()
  const afterRemove = await usage()
  assert.deepEqual(afterRemove.packs.map((record) => record.id), ['eastwind'])
  assert.ok(afterRemove.blobs < beforeRemove.blobs && afterRemove.blobs > 0)
  await page.goto(`${base}?brand=eastwind`)
  await waitForBrand('eastwind')

  // 9b. A pack chosen with the file picker (Open…, or "choose a file" in Brands) is kept like one
  // from a link, with no address to update from.
  await page.goto(`${base}?brand=eastwind&view=brands`)
  await page.getByRole('heading', { name: 'Add a brand' }).waitFor()
  await page.locator('input[type="file"][accept*=".zip"]').first().setInputFiles(join(looseOut, 'upwind.zip'))
  await waitForBrand('upwind')
  const uploaded = (await usage()).packs.find((record) => record.id === 'upwind')
  assert.ok(uploaded && uploaded.url === null, 'an uploaded pack is kept in this browser, with no address')
  await page.reload()
  await waitForBrand('upwind')

  // 9c. A pack dragged onto the page: the overlay shows while it is over the page, and dropping it
  // opens and keeps it. Dragged images are left alone.
  await page.goto(`${base}?brand=upwind&view=brands`)
  await page.getByRole('heading', { name: 'Add a brand' }).waitFor()
  const dragged = async (name, type, base64) => page.evaluateHandle(({ name, type, base64 }) => {
    const transfer = new DataTransfer()
    transfer.items.add(new File([Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))], name, { type }))
    return transfer
  }, { name, type, base64 })
  const image = await dragged('photo.png', 'image/png', PNG.toString('base64'))
  await page.dispatchEvent('body', 'dragenter', { dataTransfer: image })
  assert.equal(await page.locator('.drop-overlay').count(), 0, 'an image is not offered as a brand')
  await page.dispatchEvent('body', 'drop', { dataTransfer: image })
  const transfer = await dragged('downwind.zip', 'application/zip', readFileSync(join(looseOut, 'downwind.zip')).toString('base64'))
  await page.dispatchEvent('body', 'dragenter', { dataTransfer: transfer })
  await page.locator('.drop-overlay').waitFor()
  await page.screenshot({ path: join(screenshotDir, 'drop-overlay.png') })
  await page.dispatchEvent('body', 'dragover', { dataTransfer: transfer })
  await page.dispatchEvent('body', 'drop', { dataTransfer: transfer })
  await waitForBrand('downwind')
  assert.equal(await page.locator('.drop-overlay').count(), 0, 'the overlay goes once the brand is dropped')
  assert.ok((await usage()).packs.some((record) => record.id === 'downwind' && record.url === null), 'a dropped pack is kept, with no address')
  // A brand.json on its own, dropped, opens for this visit.
  const definition = JSON.parse(readFileSync(join(loose, 'upwind/brand.json'), 'utf8'))
  const json = await dragged('brand.json', 'application/json', Buffer.from(JSON.stringify({ ...definition, id: 'jsonwind', name: 'Jsonwind' })).toString('base64'))
  await page.dispatchEvent('body', 'dragenter', { dataTransfer: json })
  await page.dispatchEvent('body', 'drop', { dataTransfer: json })
  await waitForBrand('jsonwind')
  assert.ok(!(await usage()).packs.some((record) => record.id === 'jsonwind'), 'a brand.json is opened, not stored as a pack')

  // 10. At phone width the Brands view fits without scrolling sideways.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${base}?brand=eastwind&view=brands`)
  await page.getByRole('heading', { name: 'Available to add' }).waitFor()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no sideways scroll on a phone')
  await page.screenshot({ path: join(screenshotDir, 'brands-view-phone.png'), fullPage: true })

  assert.deepEqual(errors, [], errors.join('\n'))
  console.log(`Pack checks passed: link, reload, pack pages, revisit, file picker, drag and drop, catalog, shared storage (${stored.stored} bytes for ${logical}), share link, update, remove, phone. Screenshots in ${screenshotDir}`)
} catch (error) {
  if (page) await page.screenshot({ path: join(screenshotDir, 'failure.png'), fullPage: true }).catch(() => {})
  throw error
} finally {
  await browser?.close()
  await new Promise((done) => server.httpServer.close(done))
  host.close()
  rmSync(work, { recursive: true, force: true })
}
