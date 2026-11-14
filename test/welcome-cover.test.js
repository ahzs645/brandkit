import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'
import { DOMParser } from '@xmldom/xmldom'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { documentProfile, publicationModel, validatePublication } from '../src/engine/documentation.js'
import { publicationDocx, publicationHtml } from '../src/export/publication.js'
import { validateWelcomeCover, welcomeCoverDocx, welcomeCoverHtml } from '../src/export/welcome-cover.js'
import { handoverPublications } from '../src/handover/publications.js'

const brand = JSON.parse(readFileSync(new URL('../brands/northwind/brand.json', import.meta.url), 'utf8'))
const fonts = await loadBrandFontsFromDisk(brand, fileURLToPath(new URL('../brands/northwind/', import.meta.url)))
assert.deepEqual(fonts.failures, [], 'the repository font fixtures must resolve')
const ctx = { brand, fonts }
const profile = documentProfile(brand, { paper: 'letter' })
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
// Genuine RGBA PNGs: the graphic is 3 x 1 px; the wrong-ratio fixture is 12 x 8 px.
const GRAPHIC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAABCAYAAAAb4BS0AAAAD0lEQVR4nGPU0tL6zwAFAA57AX9JEvdvAAAAAElFTkSuQmCC'
const WRONG_RATIO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAICAYAAADN5B7xAAAAF0lEQVR4nGPU0tL6z0ACYCJF8agGYgEAUFYBjUgxufoAAAAASUVORK5CYII='
const WORD = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const PACKAGE_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
const parse = value => new DOMParser().parseFromString(Buffer.from(value).toString('utf8'), 'application/xml')
const elements = (document, ns, name) => Array.from(document.getElementsByTagNameNS(ns, name))
const wordText = xml => elements(parse(xml), WORD, 't').map(node => node.textContent).join('\n')

function cover() {
  return {
    schema: 'brandkit/welcome-cover/1',
    providerLogo: { src: PIXEL, alt: 'Provider artwork', widthMm: 42 },
    clientLogo: { src: PIXEL, alt: 'Client artwork', widthMm: 56 },
    graphic: { src: GRAPHIC, alt: 'Supporting artwork without cover wording' },
    kicker: 'WEBSITE\nWELCOME PACK',
    title: 'Your website.\nStart here.',
    subtitle: 'Access. Support. Brand essentials.',
    clientName: 'Example client',
    preparedBy: 'Example provider',
    dateText: 'November 13, 2026',
    status: 'EXAMPLE · DRAFT · EDITION 2'
  }
}

function publication(value = cover()) {
  const model = publicationModel(brand, { paper: 'letter', purpose: 'report', values: { title: 'Welcome guide regression' } })
  model.profile.header.text = 'ORDINARY HEADER'
  model.profile.footer.text = 'ORDINARY FOOTER'
  model.pages = [
    { id: 'front-cover', kind: 'cover', title: 'Designed cover', cover: value, blocks: [] },
    { id: 'practical-details', kind: 'content', title: 'Website details', blocks: [{ type: 'paragraph', text: 'Practical website details remain editable.' }] }
  ]
  return model
}

test('the designed cover keeps its wording native in Word and replaces only the first-page furniture', async () => {
  const value = cover()
  const model = publication(value)
  for (const paper of ['letter', 'a4']) assert.deepEqual(validateWelcomeCover(value, documentProfile(brand, { paper })), [])
  assert.deepEqual(validatePublication(model), [])

  // No PNG renderer is passed: the native cover already carries its artwork and must
  // not ask the ordinary cover pipeline to add a second provider logo.
  const files = unzipSync(await publicationDocx(ctx, model))
  const native = wordText(files['word/document.xml'])
  for (const field of ['kicker', 'title', 'subtitle', 'clientName', 'preparedBy', 'dateText', 'status']) {
    for (const line of value[field].split('\n')) assert.ok(native.includes(line), `${field} must be editable Word text`)
  }
  assert.ok(native.includes('Practical website details remain editable.'))
  const document = parse(files['word/document.xml'])
  assert.equal(elements(document, WORD, 'drawing').length, 3, 'only provider logo, supporting graphic and client logo are images')
  assert.equal(native.split('Your website.').length - 1, 1)
  assert.equal(native.split('Start here.').length - 1, 1)

  const sections = elements(document, WORD, 'sectPr')
  assert.equal(sections.length, 2)
  const relationships = new Map(elements(parse(files['word/_rels/document.xml.rels']), PACKAGE_REL, 'Relationship').map(node => [node.getAttribute('Id'), node.getAttribute('Target')]))
  for (const kind of ['header', 'footer']) {
    const first = elements(sections[0], WORD, `${kind}Reference`)
    const next = elements(sections[1], WORD, `${kind}Reference`)
    assert.equal(first.length, 1, `the cover explicitly clears its ${kind}`)
    assert.equal(next.length, 1, `the content section restores its ${kind}`)
    const part = node => files[`word/${relationships.get(node.getAttributeNS(REL, 'id'))}`]
    assert.equal(wordText(part(first[0])).trim(), '', `no ordinary ${kind} on the cover`)
    assert.ok(wordText(part(next[0])).trim(), `normal ${kind} remains on later pages`)
  }

  const html = publicationHtml(ctx, model)
  const pages = [...html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)].map(match => match[0])
  assert.equal(pages.length, 2)
  assert.doesNotMatch(pages[0], /<header\b|<footer\b|class="brand-logo"|ORDINARY HEADER|ORDINARY FOOTER/)
  assert.equal((pages[0].match(/class="bk-welcome-cover__provider-logo"/g) || []).length, 1)
  assert.match(pages[0], /Your website\.<br>Start here\./)
  assert.match(pages[1], /<header\b/)
  assert.match(pages[1], /<footer\b/)
  assert.match(pages[1], /ORDINARY FOOTER/)
})

test('cover artwork must be passive, complete embedded PNG data with the graphic aspect ratio', async () => {
  const graphicBytes = Buffer.from(GRAPHIC.split(',')[1], 'base64')
  const hugeDimensions = Buffer.from(graphicBytes)
  hugeDimensions.writeUInt32BE(32769, 16)
  const cases = [
    ['remote image', 'https://images.example/cover.png'],
    ['SVG data URL', 'data:image/svg+xml;base64,' + Buffer.from('<svg onload="alert(1)"/>').toString('base64')],
    ['disguised SVG bytes', 'data:image/png;base64,' + Buffer.from('<svg onload="alert(1)"/>').toString('base64')],
    ['non-canonical base64', GRAPHIC + '\n'],
    ['truncated image', 'data:image/png;base64,' + graphicBytes.subarray(0, -1).toString('base64')],
    ['oversized dimensions', 'data:image/png;base64,' + hugeDimensions.toString('base64')],
    ['wrong graphic ratio', WRONG_RATIO]
  ]
  for (const [name, src] of cases) {
    const value = cover()
    value.graphic.src = src
    assert.ok(validateWelcomeCover(value, profile).length, name)
    assert.throws(() => welcomeCoverHtml(profile, value), /Invalid welcome cover/, name)
    await assert.rejects(welcomeCoverDocx(ctx, profile, value), /Invalid welcome cover/, name)
  }
  const value = cover()
  value.providerLogo.src = 'https://images.example/logo.png'
  value.clientLogo.src = 'data:image/svg+xml,<svg/>'
  const problems = validateWelcomeCover(value, profile).join('\n')
  assert.match(problems, /providerLogo.*embedded PNG/)
  assert.match(problems, /clientLogo.*embedded PNG/)
})

test('cover typography overrides inherited document rules without losing native text', async () => {
  const model = publication()
  // Ordinary report styles may have a rule or wide tracking. They must not leak
  // into the designed cover's headline, client name or body copy.
  Object.assign(model.profile.typography.title, { trackingEm: 0.25, ruleBelow: { widthPt: 2, gapPt: 6, colour: '#000000' } })
  model.profile.typography.body.trackingEm = 0.15
  const files = unzipSync(await publicationDocx(ctx, model))
  const document = parse(files['word/document.xml'])
  const paragraphs = elements(document, WORD, 'p')
  for (const [wording, expectedSpacing] of [['Your website.', '-15'], ['Example client', '-8'], ['Access. Support. Brand essentials.', '0']]) {
    const paragraph = paragraphs.find(node => elements(node, WORD, 't').some(text => text.textContent === wording))
    assert.ok(paragraph, wording)
    const runs = elements(paragraph, WORD, 'r').filter(node => elements(node, WORD, 't').length)
    for (const run of runs) {
      const spacing = elements(run, WORD, 'spacing')
      assert.equal(spacing.length, 1, `${wording} explicitly sets character spacing`)
      assert.equal(spacing[0].getAttributeNS(WORD, 'val'), expectedSpacing)
    }
    const border = elements(paragraph, WORD, 'pBdr')[0]
    assert.ok(border, `${wording} explicitly overrides ordinary paragraph borders`)
    for (const side of ['top', 'bottom', 'left', 'right', 'between']) {
      assert.equal(elements(border, WORD, side)[0]?.getAttributeNS(WORD, 'val'), 'none')
    }
  }
})

test('cover wording and image alternatives cannot inject HTML or escape their attributes', () => {
  const value = cover()
  value.title = '<script>attack()</script>\nA & B'
  value.subtitle = '</p><iframe src="https://untrusted.example"></iframe>'
  value.clientName = 'Client <img src=x onerror=attack()> & Company'
  value.preparedBy = '<svg onload=attack()>'
  value.providerLogo.alt = 'Logo" onerror="attack()'
  const html = welcomeCoverHtml(profile, value)
  assert.doesNotMatch(html, /<script\b|<iframe\b|<svg\b|<img src=x|alt="Logo" onerror=/i)
  assert.match(html, /&lt;script&gt;attack\(\)&lt;\/script&gt;<br>A &amp; B/)
  assert.match(html, /&lt;iframe src=&quot;https:\/\/untrusted\.example&quot;&gt;/)
  assert.match(html, /alt="Logo&quot; onerror=&quot;attack\(\)"/)
})

test('a native cover occupies the first page exclusively and does not silently hide body blocks', () => {
  const model = publication()
  model.pages[0].blocks.push({ type: 'paragraph', text: 'This content must not disappear.' })
  assert.match(validatePublication(model).join('\n'), /must not also contain body blocks/)
  model.pages[0].blocks = []
  model.pages.reverse()
  assert.match(validatePublication(model).join('\n'), /must be the first page/)
})

test('supplied cover status and names cannot override the handover record or mark a draft as issued', () => {
  const record = JSON.parse(readFileSync(new URL('../examples/managed-site/ddc-north.json', import.meta.url), 'utf8'))
  const providerBrand = { ...structuredClone(brand), id: record.provider.brandId }
  const clientBrand = { ...structuredClone(brand), id: record.client.brandId }
  const welcomeCover = cover()
  Object.assign(welcomeCover, { status: 'ISSUED · APPROVED', clientName: 'Wrong client', preparedBy: 'Wrong provider' })
  const before = structuredClone(welcomeCover)
  const plain = handoverPublications(record, { providerBrand, clientBrand })
  const result = handoverPublications(record, { providerBrand, clientBrand, welcomeCover })
  const first = result.welcome.pages[0].cover
  assert.match(first.status, /EXAMPLE · DRAFT/)
  assert.doesNotMatch(first.status, /ISSUED|APPROVED/)
  assert.equal(first.clientName, record.client.name)
  assert.equal(first.preparedBy, record.provider.name)
  assert.equal(result.welcome.pages.length, plain.welcome.pages.length + 1)
  assert.equal(result.welcome.pages[1].title, 'Your website details')
  assert.ok(JSON.stringify(result.welcome.pages[1].blocks).includes(record.site.url))
  assert.deepEqual(result.quickStart, plain.quickStart)
  assert.deepEqual(result.brandGuide, plain.brandGuide)
  assert.deepEqual(welcomeCover, before, 'the caller retains its supplied cover data')

  record.kind = 'client'
  record.status = 'ready'
  const readyDraft = handoverPublications(record, { providerBrand, clientBrand, welcomeCover })
  assert.match(readyDraft.welcome.pages[0].cover.status, /^DRAFT · EDITION/)
  assert.doesNotMatch(readyDraft.welcome.pages[0].cover.status, /ISSUED|APPROVED/)
})
