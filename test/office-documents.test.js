import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { unzipSync, strFromU8 } from 'fflate'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { officeFont, textItems } from '../src/engine/office.js'
import { documentProfile, documentationDocumentsFor, publicationModel } from '../src/engine/documentation.js'
import { docxFile, documentsFor, embeddedFonts, fontEmbeddingPermission, officeFontRequirements, officeFile, officeStyles } from '../src/export/office.js'
import { publicationDocx, publicationHtml } from '../src/export/publication.js'
import { pdfFromDocx } from '../src/export/node.js'

const folder = new URL('../brands/firstform/', import.meta.url).pathname
const brand = JSON.parse(readFileSync(`${folder}brand.json`, 'utf8'))
const fonts = await loadBrandFontsFromDisk(brand, folder)
const ctx = { brand, fonts }
const pixel = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'))
const png = async () => pixel
const xmlOf = (bytes, path) => strFromU8(unzipSync(bytes)[path])

test('Office fonts retain four distinct Sora weights, with exact source bytes', () => {
  const keys = ['body', 'bold', 'extra', 'light']
  const items = keys.map((key) => { const f = officeFont(brand, key); return { ...f, font: f.name, kind: 'field' } })
  assert.deepEqual(items.map(({ name, bold, weight }) => [name, bold, weight]), [
    ['Sora', false, 400], ['Sora SemiBold', false, 600], ['Sora', true, 700], ['Sora Light', false, 300]
  ])
  const embedded = embeddedFonts(ctx, items)
  assert.equal(embedded.length, 3)
  assert.deepEqual(embedded.find((f) => f.name === 'Sora').data, fonts.faces.body.bytes)
  assert.deepEqual(embedded.find((f) => f.name === 'Sora').bold, fonts.faces.extra.bytes)
  assert.deepEqual(embedded.find((f) => f.name === 'Sora SemiBold').data, fonts.faces.bold.bytes)
  assert.deepEqual(embedded.find((f) => f.name === 'Sora Light').data, fonts.faces.light.bytes)
})

test('Office font mapping covers medium, extra bold, named imported faces and substitutions', () => {
  for (const [id, key, expected] of [
    ['ddcnorth', 'display', ['Inter Display Medium', false, 500]],
    ['ddcnorth', 'extra', ['Inter Display ExtraBold', false, 800]],
    ['overtheedge', 'staff-card-font-1', ['HelveticaNeue-Medium', false, 500]],
    ['bc-province-1977', 'bold', ['Helvetica', true, 700]]
  ]) {
    const owner = JSON.parse(readFileSync(new URL(`../brands/${id}/brand.json`, import.meta.url), 'utf8'))
    const f = officeFont(owner, key)
    assert.deepEqual([f.name, f.bold, f.weight], expected, `${id}/${key}`)
  }
  const overridden = textItems(ctx, { width: 100, height: 100, elements: [{ type: 'text', id: 'example', x: 5, y: 20, size: 12, text: 'Bold', font: 'body', weight: 700 }] })[0]
  assert.equal(overridden.key, 'extra', 'an override uses the real available font face')
  assert.equal(overridden.weight, 700)
})

test('Editable documents respect OS/2 embedding rights and record local installation requirements', () => {
  for (const fsType of [2, 4, 0x0200]) assert.equal(fontEmbeddingPermission({ font: { tables: { os2: { version: 4, fsType } } } }).allowed, false)
  for (const fsType of [0, 8, 0x0100]) assert.equal(fontEmbeddingPermission({ font: { tables: { os2: { version: 4, fsType } } } }).allowed, true)
  assert.equal(fontEmbeddingPermission({ font: { tables: { os2: { version: 1, fsType: 12 } } } }).allowed, true, 'legacy combined flags permit the least restrictive editable right')
  const f = officeFont(brand, 'body')
  const item = { ...f, font: f.name, kind: 'field' }
  const restricted = { ...ctx, fonts: { faces: { body: { ...fonts.faces.body, font: { tables: { os2: { version: 4, fsType: 2 } } } } } } }
  assert.deepEqual(embeddedFonts(restricted, [item]), [])
  assert.equal(officeFontRequirements(restricted, [item])[0].embedded, false)
  assert.match(officeFontRequirements(restricted, [item])[0].reason, /restricts embedding/)
})

test('Legacy First Form letterhead receives a Word action and native named styles', async () => {
  assert.ok(documentsFor(brand, 'letterhead-a4').some((d) => d.format === 'docx'))
  const bytes = await docxFile({ ...ctx, values: { 'letter-content': 'A letter that stays editable.' } }, { id: 'letterhead', pages: ['letterhead-a4'] }, { png })
  const styles = xmlOf(bytes, 'word/styles.xml')
  for (const name of ['Title', 'Heading1', 'Heading2', 'Heading3', 'BodyText', 'Caption', 'TableText', 'ListParagraph']) assert.ok(styles.includes(`w:styleId="${name}"`), name)
  const xml = xmlOf(bytes, 'word/document.xml')
  assert.match(xml, /A letter that stays editable\./)
  assert.match(xml, /w:pStyle w:val="BodyText"/)
})

const publication = () => ({
  id: 'reviewed-publication', title: 'Product & document guide', subtitle: 'Shared content', edition: 'Edition 1', purpose: 'product', paper: 'letter', profile: documentProfile(brand, { paper: 'letter' }),
  pages: [
    { id: 'cover', kind: 'cover', blocks: [{ type: 'heading', style: 'title', text: 'Product & document guide' }, { type: 'paragraph', text: 'Editable body <without HTML>.' }] },
    { id: 'comparison', kind: 'comparison', blocks: [{ type: 'heading', level: 1, text: 'Compare the options' }, { type: 'table', headers: ['Option', 'Result'], rows: [['One', 'Full text'], ['Two', 'Another result']], caption: 'Table 1. Compared options.' }, { type: 'list', ordered: true, items: ['Choose a source', 'Review the output'] }] },
    { id: 'figure', kind: 'screenshot', blocks: [{ type: 'heading', level: 2, text: 'A real embedded image' }, { type: 'figure', src: `data:image/png;base64,${Buffer.from(pixel).toString('base64')}`, widthMm: 80, heightMm: 45, alt: 'A one-pixel test image', caption: 'Figure 1. Actual test asset.' }] }
  ]
})

test('Publication DOCX uses native pages, heading outline levels, tables and image alt text', async () => {
  const bytes = await publicationDocx(ctx, publication(), { png })
  const parts = unzipSync(bytes)
  const xml = strFromU8(parts['word/document.xml'])
  const styles = strFromU8(parts['word/styles.xml'])
  assert.equal((xml.match(/<w:sectPr[ >]/g) ?? []).length, 3)
  assert.match(xml, /w:pStyle w:val="Title"/)
  assert.match(xml, /w:pStyle w:val="Heading1"/)
  assert.match(styles, /w:outlineLvl w:val="0"/)
  assert.match(xml, /<w:tbl>/)
  assert.match(xml, /<w:tblHeader/)
  assert.match(xml, /Table 1\. Compared options\./)
  assert.match(xml, /A one-pixel test image/)
  assert.match(xml, /Figure 1\. Actual test asset\./)
  assert.match(xml, /Editable body &lt;without HTML&gt;\./)
  assert.match(xml, /w:numPr/)
  assert.ok(Object.keys(parts).some((name) => name.startsWith('word/fonts/')))
  assert.ok(Object.keys(parts).some((name) => name.startsWith('word/footer')))
  assert.match(strFromU8(parts['docProps/custom.xml']), /brandkit.fontRequirements/)
  assert.doesNotMatch(strFromU8(parts['docProps/custom.xml']), /brandkit.sourceRevision/)
})

test('Publication HTML carries the same content, semantics and local font data', () => {
  const html = publicationHtml(ctx, publication())
  assert.match(html, /<h1 class="s-Title">Product &amp; document guide<\/h1>/)
  assert.match(html, /Editable body &lt;without HTML&gt;\./)
  assert.match(html, /<th scope="col">Option<\/th>/)
  assert.match(html, /<figcaption class="s-Caption">Figure 1\. Actual test asset\.<\/figcaption>/)
  assert.match(html, /alt="A one-pixel test image"/)
  assert.match(html, /src:url\(data:font\/ttf;base64,/)
  assert.match(html, /font-family:'Sora SemiBold'/)
  assert.doesNotMatch(html, /<(?:script|link)\b|(?:src|href)="https?:\/\//)
  assert.doesNotMatch(html, /brandkit-source-revision/)
})

test('Publication exports retain optional generating revision metadata', async () => {
  const sourceRevision = '0123456789abcdef0123456789abcdef01234567'
  const source = publication()
  const bytes = await publicationDocx({ ...ctx, sourceRevision }, source, { png })
  const custom = xmlOf(bytes, 'docProps/custom.xml')
  assert.match(custom, /name="brandkit.sourceRevision"/)
  assert.ok(custom.includes(`<vt:lpwstr>${sourceRevision}</vt:lpwstr>`))
  const html = publicationHtml({ ...ctx, sourceRevision: `${sourceRevision}\"><script>` }, source)
  assert.ok(html.includes(`<meta name="brandkit-source-revision" content="${sourceRevision}&quot;&gt;&lt;script&gt;">`))
  assert.doesNotMatch(html, /<script>/)
})

test('Word-to-PDF refresh rejects failed supplied fonts before reading the master or starting a converter', async () => {
  const missingFonts = { faces: {}, failures: [{ key: 'body', error: new Error('Font file is missing') }] }
  await assert.rejects(pdfFromDocx('/brandkit-missing-test-master.docx', {
    ctx: { brand, fonts: missingFonts }, soffice: '/brandkit-missing-test-converter'
  }), { message: 'Required brand fonts could not be loaded: body: Font file is missing' })
})

test('Screenshot placeholders keep an editable label without relying on SVG font rendering', async () => {
  const model = publicationModel(brand, { paper: 'letter', purpose: 'report' })
  let renderedImages = 0
  const bytes = await publicationDocx(ctx, model, { png: async () => { renderedImages++; return pixel } })
  const xml = xmlOf(bytes, 'word/document.xml')
  assert.equal(renderedImages, 1, 'only the supplied brand logo needs a raster renderer')
  assert.match(xml, /<w:t xml:space="preserve">Screenshot placeholder<\/w:t>/)
  assert.match(xml, /Replace with an actual image/)
  assert.match(xml, /w:vAlign w:val="center"/)
  assert.match(xml, /w:hRule="atLeast"/)
})

test('Publication exports reject network images and malformed blocks rather than losing content', async () => {
  const source = publication()
  source.pages[2].blocks[1].src = 'https://example.com/private-image.png'
  assert.throws(() => publicationHtml(ctx, source), /must be an embedded/)
  await assert.rejects(publicationDocx(ctx, source, { png }), /must be an embedded/)
  source.pages[2].blocks[1] = { type: 'unknown', text: 'Do not silently omit me' }
  assert.throws(() => publicationHtml(ctx, source), /unknown block type/)
})

test('Generated publication descriptors dispatch through the existing Office API', async () => {
  const descriptor = documentationDocumentsFor(brand).find((d) => d.publication && d.paper === 'letter')
  assert.ok(descriptor)
  const file = await officeFile(ctx, descriptor, { png })
  assert.match(file.name, /\.docx$/)
  assert.match(file.type, /wordprocessingml/)
  const xml = xmlOf(file.bytes, 'word/document.xml')
  assert.ok(xml.includes('w:pStyle'))
  const model = publicationModel(brand, { paper: 'letter', purpose: descriptor.purpose })
  assert.equal((xml.match(/<w:sectPr[ >]/g) ?? []).length, model.pages.length)
})

test('Publication styles remain reusable rather than pinning only direct run formatting', () => {
  const styles = officeStyles(brand, documentProfile(brand, { paper: 'a4' }))
  assert.equal(styles.paragraphStyles.find((s) => s.id === 'Heading1').paragraph.outlineLevel, 0)
  assert.equal(styles.paragraphStyles.find((s) => s.id === 'BodyText').next, 'BodyText')
  assert.equal(styles.paragraphStyles.find((s) => s.id === 'Caption').basedOn, 'Normal')
})
