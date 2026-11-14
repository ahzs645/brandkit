import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'
import { DOMParser } from '@xmldom/xmldom'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { documentProfile, publicationModel, validatePublication } from '../src/engine/documentation.js'
import { publicationDocx, publicationHtml } from '../src/export/publication.js'
import { createNodeRenderer } from '../src/export/node.js'
import { validateWelcomeCover, welcomeCoverDocx, welcomeCoverHtml } from '../src/export/welcome-cover.js'
import { COVER_PAPERS, frameText } from '../src/handover/cover-designs.js'
import { WELCOME_COVER_VARIANTS, createWelcomeCover } from '../src/handover/cover.js'
import { handoverPublications } from '../src/handover/publications.js'
import { assertHandover } from '../src/handover/record.js'

const brand = JSON.parse(readFileSync(new URL('../brands/northwind/brand.json', import.meta.url), 'utf8'))
const fonts = await loadBrandFontsFromDisk(brand, fileURLToPath(new URL('../brands/northwind/', import.meta.url)))
assert.deepEqual(fonts.failures, [], 'the repository font fixtures must resolve')
const ctx = { brand, fonts }
const client = { brand: { ...structuredClone(brand), id: 'ddcnorth', name: 'Example client' }, fonts }
const profile = documentProfile(brand, { paper: 'letter' })
const renderer = await createNodeRenderer()
const record = JSON.parse(readFileSync(new URL('../examples/managed-site/ddc-north.json', import.meta.url), 'utf8'))
const WRONG_RATIO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAICAYAAADN5B7xAAAAF0lEQVR4nGPU0tL6z0ACYCJF8agGYgEAUFYBjUgxufoAAAAASUVORK5CYII='
const WORD = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const PACKAGE_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
const WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
const parse = value => new DOMParser().parseFromString(Buffer.from(value).toString('utf8'), 'application/xml')
const elements = (document, ns, name) => Array.from(document.getElementsByTagNameNS(ns, name))
const wordText = xml => elements(parse(xml), WORD, 't').map(node => node.textContent).join('\n')

const covers = new Map()
/** A real cover, drawn by the generator from the repository's example brand. */
async function cover(variant = 'hero', paper = 'letter') {
  const key = `${variant}/${paper}`
  if (!covers.has(key)) covers.set(key, (await createWelcomeCover(ctx, client, { ...record, client: { ...record.client, name: 'Example client' }, provider: { ...record.provider, name: 'Example provider' } }, { ...renderer, paper, variant })).cover)
  return structuredClone(covers.get(key))
}

function publication(value) {
  const model = publicationModel(brand, { paper: value.paper, purpose: 'report', values: { title: 'Welcome guide regression' } })
  model.profile.header.text = 'ORDINARY HEADER'
  model.profile.footer.text = 'ORDINARY FOOTER'
  model.pages = [
    { id: 'front-cover', kind: 'cover', title: 'Designed cover', cover: value, blocks: [] },
    { id: 'practical-details', kind: 'content', title: 'Website details', blocks: [{ type: 'paragraph', text: 'Practical website details remain editable.' }] }
  ]
  return model
}

test('every design lays out on both papers with its frames on the page and its wording from the cover', async () => {
  for (const { id } of WELCOME_COVER_VARIANTS) for (const paper of ['letter', 'a4']) {
    const value = await cover(id, paper)
    const [width, height] = COVER_PAPERS[paper]
    assert.deepEqual(validateWelcomeCover(value, documentProfile(brand, { paper })), [], `${id} on ${paper}`)
    assert.equal(value.paper, paper)
    for (const item of value.frames) {
      assert.ok(item.x >= 0 && item.x + item.width <= width + 0.5 && item.y >= 0 && item.y < height, `${id}/${paper}: ${item.key} sits on the page`)
      assert.ok(frameText(value, item.key).trim(), `${id}/${paper}: ${item.key} names a filled field`)
    }
    const keys = value.frames.map(item => item.key)
    for (const key of ['kicker', 'title', 'clientName', 'status']) assert.ok(keys.includes(key), `${id} sets ${key}`)
    assert.equal(keys.filter(key => key === 'title').length, 1)
    if (id === 'index') assert.ok(keys.includes('section3Description'), 'the index sets its contents')
    else assert.equal(value.sections, undefined)
  }
})

test('the designed cover keeps every word native in Word, behind which one page of artwork floats', async () => {
  const value = await cover('hero')
  const model = publication(value)
  assert.deepEqual(validatePublication(model), [])
  const files = unzipSync(await publicationDocx(ctx, model))
  const native = wordText(files['word/document.xml'])
  for (const item of value.frames) for (const line of frameText(value, item.key).split('\n')) assert.ok(native.includes(line), `${item.key} must be editable Word text`)
  assert.ok(native.includes('Practical website details remain editable.'))
  assert.equal(native.split('Your website.').length - 1, 1)
  const document = parse(files['word/document.xml'])
  assert.equal(elements(document, WORD, 'drawing').length, 0, 'no picture sits in the cover text')
  const frames = elements(document, WORD, 'framePr')
  assert.equal(frames.length, value.frames.length, 'each cover text is a positioned frame')
  for (const frame of frames) assert.equal(frame.getAttributeNS(WORD, 'hAnchor'), 'page')

  const sections = elements(document, WORD, 'sectPr')
  assert.equal(sections.length, 2)
  const margins = elements(sections[0], WORD, 'pgMar')[0]
  for (const side of ['top', 'right', 'bottom', 'left']) assert.equal(margins.getAttributeNS(WORD, side), '0', `the cover runs to the page’s ${side} edge`)
  const relationships = new Map(elements(parse(files['word/_rels/document.xml.rels']), PACKAGE_REL, 'Relationship').map(node => [node.getAttribute('Id'), node.getAttribute('Target')]))
  const part = node => files[`word/${relationships.get(node.getAttributeNS(REL, 'id'))}`]
  const coverHeader = parse(part(elements(sections[0], WORD, 'headerReference')[0]))
  const anchors = elements(coverHeader, WP, 'anchor')
  assert.equal(anchors.length, 1, 'the cover header holds the page artwork')
  assert.equal(anchors[0].getAttribute('behindDoc'), '1')
  assert.equal(wordText(part(elements(sections[0], WORD, 'footerReference')[0])).trim(), '', 'no ordinary footer on the cover')
  for (const kind of ['header', 'footer']) assert.ok(wordText(part(elements(sections[1], WORD, `${kind}Reference`)[0])).trim(), `normal ${kind} remains on later pages`)

  const html = publicationHtml(ctx, model)
  const pages = [...html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)].map(match => match[0])
  assert.equal(pages.length, 2)
  assert.doesNotMatch(pages[0], /<header\b|<footer\b|class="brand-logo"|ORDINARY HEADER|ORDINARY FOOTER/)
  assert.equal((pages[0].match(/<img\b/g) || []).length, 1, 'the HTML cover has one artwork image')
  assert.match(pages[0], /<h1 class="bk-cover__text"[^>]*>Your website\.<br>Start here\.<\/h1>/)
  assert.match(pages[1], /ORDINARY FOOTER/)
})

test('cover artwork must be passive, complete embedded PNG data in the page’s proportions', async () => {
  const value = await cover('grid')
  const bytes = Buffer.from(value.artwork.src.split(',')[1], 'base64')
  const huge = Buffer.from(bytes)
  huge.writeUInt32BE(32769, 16)
  const cases = [
    ['remote image', 'https://images.example/cover.png'],
    ['SVG data URL', 'data:image/svg+xml;base64,' + Buffer.from('<svg onload="alert(1)"/>').toString('base64')],
    ['disguised SVG bytes', 'data:image/png;base64,' + Buffer.from('<svg onload="alert(1)"/>').toString('base64')],
    ['non-canonical base64', value.artwork.src + '\n'],
    ['truncated image', 'data:image/png;base64,' + bytes.subarray(0, -1).toString('base64')],
    ['oversized dimensions', 'data:image/png;base64,' + huge.toString('base64')],
    ['wrong proportions', WRONG_RATIO]
  ]
  for (const [name, src] of cases) {
    const bad = structuredClone(value)
    bad.artwork.src = src
    assert.ok(validateWelcomeCover(bad, profile).length, name)
    assert.throws(() => welcomeCoverHtml(profile, bad), /Invalid welcome cover/, name)
    await assert.rejects(welcomeCoverDocx(ctx, profile, bad), /Invalid welcome cover/, name)
  }
  assert.match(validateWelcomeCover(value, documentProfile(brand, { paper: 'a4' })).join('\n'), /laid out for letter/)
})

test('frames must name a cover field and stay on the page in a usable style', async () => {
  const value = await cover('hero')
  const checks = [
    [item => { item.key = 'onload' }, /unknown field/],
    [item => { item.x = 400 }, /within the page/],
    [item => { item.colour = 'red' }, /hex colour/],
    [item => { item.sizePt = 400 }, /type size/],
    [item => { item.role = 'script' }, /role must be/],
    [item => { item.style = 'x' }, /unsupported field/]
  ]
  for (const [change, problem] of checks) {
    const bad = structuredClone(value)
    change(bad.frames[0])
    assert.match(validateWelcomeCover(bad, profile).join('\n'), problem)
  }
  const bad = structuredClone(value)
  bad.graphic = { src: value.artwork.src, alt: 'old field' }
  assert.match(validateWelcomeCover(bad, profile).join('\n'), /unsupported field: graphic/)
})

test('cover typography overrides inherited document rules without losing native text', async () => {
  const model = publication(await cover('hero'))
  // Ordinary report styles may have a rule or wide tracking. They must not leak
  // into the designed cover's headline, client name or body copy.
  Object.assign(model.profile.typography.title, { trackingEm: 0.25, ruleBelow: { widthPt: 2, gapPt: 6, colour: '#000000' } })
  model.profile.typography.body.trackingEm = 0.15
  const files = unzipSync(await publicationDocx(ctx, model))
  const paragraphs = elements(parse(files['word/document.xml']), WORD, 'p')
  for (const [wording, expectedSpacing] of [['Your website.', '-18'], ['Example client', '-8'], ['Prepared by Example provider', '0']]) {
    const paragraph = paragraphs.find(node => elements(node, WORD, 't').some(text => text.textContent === wording))
    assert.ok(paragraph, wording)
    for (const run of elements(paragraph, WORD, 'r').filter(node => elements(node, WORD, 't').length)) {
      const spacing = elements(run, WORD, 'spacing')
      assert.equal(spacing.length, 1, `${wording} explicitly sets character spacing`)
      assert.equal(spacing[0].getAttributeNS(WORD, 'val'), expectedSpacing)
    }
    const border = elements(paragraph, WORD, 'pBdr')[0]
    assert.ok(border, `${wording} explicitly overrides ordinary paragraph borders`)
    for (const side of ['top', 'bottom', 'left', 'right', 'between']) assert.equal(elements(border, WORD, side)[0]?.getAttributeNS(WORD, 'val'), 'none')
  }
})

test('cover wording and the artwork’s alternative cannot inject HTML or escape their attributes', async () => {
  const value = await cover('hero')
  value.title = '<script>attack()</script>\nA & B'
  value.subtitle = '</p><iframe src="https://untrusted.example"></iframe>'
  value.clientName = 'Client <img src=x onerror=attack()> & Company'
  value.preparedBy = '<svg onload=attack()>'
  value.artwork.alt = 'Logo" onerror="attack()'
  const html = welcomeCoverHtml(profile, value)
  assert.doesNotMatch(html, /<script\b|<iframe\b|<svg\b|<img src=x|alt="Logo" onerror=/i)
  assert.match(html, /&lt;script&gt;attack\(\)&lt;\/script&gt;<br>A &amp; B/)
  assert.match(html, /&lt;iframe src=&quot;https:\/\/untrusted\.example&quot;&gt;/)
  assert.match(html, /alt="Logo&quot; onerror=&quot;attack\(\)"/)
})

test('a native cover occupies the first page exclusively and does not silently hide body blocks', async () => {
  const model = publication(await cover('hero'))
  model.pages[0].blocks.push({ type: 'paragraph', text: 'This content must not disappear.' })
  assert.match(validatePublication(model).join('\n'), /must not also contain body blocks/)
  model.pages[0].blocks = []
  model.pages.reverse()
  assert.match(validatePublication(model).join('\n'), /must be the first page/)
})

test('supplied cover status and names cannot override the handover record or mark a draft as issued', async () => {
  const providerBrand = { ...structuredClone(brand), id: record.provider.brandId }
  const clientBrand = { ...structuredClone(brand), id: record.client.brandId }
  const welcomeCover = await cover('hero')
  Object.assign(welcomeCover, { status: 'ISSUED · APPROVED', clientName: 'Wrong client', preparedBy: 'Wrong provider' })
  const before = structuredClone(welcomeCover)
  const plain = handoverPublications(record, { providerBrand, clientBrand })
  const result = handoverPublications(record, { providerBrand, clientBrand, welcomeCover })
  const first = result.welcome.pages[0].cover
  assert.match(first.status, /Example · draft/)
  assert.doesNotMatch(first.status, /ISSUED|APPROVED/i)
  assert.equal(first.clientName, record.client.name)
  assert.equal(first.preparedBy, record.provider.name)
  assert.equal(result.welcome.pages.length, plain.welcome.pages.length + 1)
  assert.equal(result.welcome.pages[1].title, 'Your website details')
  assert.ok(JSON.stringify(result.welcome.pages[1].blocks).includes(record.site.url))
  assert.deepEqual(result.quickStart, plain.quickStart)
  assert.deepEqual(result.brandGuide, plain.brandGuide)
  assert.deepEqual(welcomeCover, before, 'the caller retains its supplied cover data')

  const ready = { ...structuredClone(record), kind: 'client', status: 'ready' }
  const readyDraft = handoverPublications(ready, { providerBrand, clientBrand, welcomeCover })
  assert.match(readyDraft.welcome.pages[0].cover.status, /^Draft · Edition/)
})

test('the index cover keeps its contents editable, and only it takes contents', async () => {
  const value = await cover('index')
  assert.equal(value.sections.length, 3)
  const native = wordText(unzipSync(await publicationDocx(ctx, publication(value)))['word/document.xml'])
  for (const section of value.sections) for (const text of Object.values(section)) assert.ok(native.includes(text), `${text} remains editable`)
  value.sections[1].description = '<script>bad()</script> & text'
  assert.match(welcomeCoverHtml(profile, value), /&lt;script&gt;bad\(\)&lt;\/script&gt; &amp; text/)
  value.sections = []
  assert.match(validateWelcomeCover(value, profile).join('\n'), /one to four contents sections/)
  value.sections = [{ title: 'Access', description: 'First line\nHidden line' }]
  assert.match(validateWelcomeCover(value, profile).join('\n'), /single-line text/)
  const hero = await cover('hero')
  hero.sections = [{ title: 'Access', description: 'One line.' }]
  assert.match(validateWelcomeCover(hero, profile).join('\n'), /only by the index cover/)
  hero.variant = 'complete-mark'
  assert.match(validateWelcomeCover(hero, profile).join('\n'), /Unknown cover variant/)
})

test('a record’s cover wording and design replace the welcome pack’s, and are validated', async () => {
  const custom = { ...structuredClone(record), cover: { variant: 'index', kicker: 'Project proposal', title: 'A new site\nfor the North.', sections: [{ title: 'Scope', description: 'What the work covers.' }, { title: 'Timeline', description: 'When each part is ready.' }] } }
  assertHandover(custom)
  const { cover: made } = await createWelcomeCover(ctx, client, custom, { ...renderer })
  assert.equal(made.variant, 'index')
  assert.equal(made.kicker, 'Project proposal')
  assert.equal(made.title, 'A new site\nfor the North.')
  assert.equal(made.subtitle, 'Access, support and brand essentials, in one place.', 'an omitted field keeps the default')
  assert.deepEqual(made.sections.map(section => section.title), ['Scope', 'Timeline'])
  assert.throws(() => assertHandover({ ...structuredClone(record), cover: { variant: 'legacy-crop' } }), /cover\.variant must be one of/)
  assert.throws(() => assertHandover({ ...structuredClone(record), cover: { colour: 'red' } }), /unsupported field colour/)
})

test('a client logo is never set below its minimum width: the plate widens, or the logo is left out', async () => {
  const wide = { brand: { ...structuredClone(client.brand), lockup: { ...client.brand.lockup, minimumHorizontalWidthMm: 55 } }, fonts }
  const { svg } = await createWelcomeCover(ctx, wide, record, { ...renderer })
  const plate = [...svg.artwork.matchAll(/<path d="M([\d.]+) ([\d.]+)H([\d.]+)A4 4/g)].map(m => +m[3] - +m[1] + 8)
  assert.ok(plate.some(width => width > 60.5), 'the plate widens beyond 3:2 for a 55 mm minimum')
  const huge = { brand: { ...structuredClone(client.brand), lockup: { ...client.brand.lockup, minimumHorizontalWidthMm: 120 } }, fonts }
  const { cover: without } = await createWelcomeCover(ctx, huge, record, { ...renderer })
  const name = without.frames.find(item => item.key === 'clientName')
  assert.ok(name.x < 40, 'with no plate, the client details move to the plate’s place')
})
