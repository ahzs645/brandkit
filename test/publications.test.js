// A brand's publication system (brand.json `publications`): styles, kinds and documents as data, written
// by document-kit as Word, PDF and HTML from one document. The fixture is the ddcnorth design system's
// collateral, converted by scripts/brands/collateral-publications.mjs.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { unzipSync, strFromU8 } from 'fflate'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { validateBrand } from '../src/engine/brand.js'
import { BLOCK_TYPES } from '../src/engine/publication-blocks.js'
import { DEFAULT_KINDS, publicationAssets, publicationDocumentProblems, publicationsProblems, resolvePublication, starterPublication } from '../src/engine/publications.js'
import { DOT_MOTIFS, PLATE_TYPES, plateSvg } from '../src/engine/plates.js'
import { designedPublicationDocument, designedPublicationDocx, designedPublicationHtml } from '../src/export/designed-publication.js'
import { publicationDocx, publicationPrintHtml } from '../src/export/publication.js'
import { publicationModel, validatePublication } from '../src/engine/documentation.js'
import { createNodeRenderer, layoutPdf } from '../src/export/node.js'

const folder = fileURLToPath(new URL('./fixtures/ddcnorth/', import.meta.url))
const brand = JSON.parse(readFileSync(`${folder}brand.json`, 'utf8'))
const fonts = await loadBrandFontsFromDisk(brand, folder)
const ctx = { brand, fonts }
const renderer = await createNodeRenderer()
const read = (path) => readFile(`${folder}${path}`)
const options = (style) => ({ style, png: renderer.png, read })
const doc = (id) => structuredClone(brand.publications.documents.find((entry) => entry.id === id))
const LETTER = [612, 792]
const SLIDE = [1440, 810]
const sizes = (pdf) => pdf.pageSizes.map(({ widthPt, heightPt }) => [Math.round(widthPt), Math.round(heightPt)])
const flat = (text) => text.replace(/\s+/g, ' ')
const xmlOf = (docx, part = 'word/document.xml') => strFromU8(unzipSync(docx)[part])

test('the ddcnorth fixture is a valid brand: four styles, its kinds and nine documents, each figure a file it carries', () => {
  assert.deepEqual(validateBrand(brand), [])
  const { styles, kinds, documents } = brand.publications
  assert.deepEqual(styles.map((style) => style.id), ['survey', 'plan', 'profile', 'field'])
  assert.deepEqual(new Set(kinds.map((kind) => kind.id)), new Set(['brochure', 'product-sheet', 'white-paper', 'catalog', 'presentation', 'briefing']))
  assert.equal(documents.length, 9)
  for (const entry of documents) for (const path of publicationAssets(entry)) assert.doesNotThrow(() => readFileSync(`${folder}${path}`), path)
})

test('the schema refuses what the writer cannot draw, naming the place', () => {
  const broken = structuredClone(brand)
  broken.publications.styles[0].cover.design = 'poster'
  broken.publications.styles[1].page.table = 'zebra'
  broken.publications.styles[2].close.plate = { type: 'dots', motif: 'spiral' }
  broken.publications.style = 'missing'
  broken.publications.kinds[0].skeleton = ['cover', 'appendix']
  const problems = publicationsProblems(broken).join('\n')
  assert.match(problems, /survey.*cover\.design/)
  assert.match(problems, /plan.*page\.table/)
  assert.match(problems, /motif `spiral`/)
  assert.match(problems, /names style `missing`/)
  assert.match(problems, /skeleton/)
  const page = { layout: 'content', section: 'Nowhere', blocks: [{ type: 'push', blocks: [{ type: 'table', headers: ['A'], rows: [['1']] }] }, { type: 'poster' }, { type: 'figure', src: 'https://example.com/a.png' }] }
  const bad = { id: 'bad', kind: 'white-paper', product: 'ghost', title: 'Bad', sections: ['Summary'], pages: [page] }
  const listed = publicationDocumentProblems(brand, bad).join('\n')
  assert.match(listed, /product `ghost`/)
  assert.match(listed, /section “Nowhere”/)
  assert.match(listed, /cannot hold a table at the foot of the page/)
  assert.match(listed, /unknown block type \(poster\)/)
  assert.match(listed, /figure src must be/)
  assert.throws(() => resolvePublication(brand, bad), /Invalid publication/)
})

/** One page holding every block type, with every look a block takes. */
const everyBlock = () => ({
  id: 'every-block', kind: 'white-paper', product: 'access', title: 'Every block', short: 'Every block', edition: 'Test edition', seed: 3, sections: ['One', 'Two'],
  pages: [
    { layout: 'content', section: 'One', blocks: [
      { type: 'opening', kicker: 'Kicker of the opening', title: 'Opening title *second tone*', lead: 'Opening lead with a reference [1,2].' },
      { type: 'heading', level: 2, text: 'A second-level heading' },
      { type: 'paragraph', text: 'A paragraph with **strong words** and [a link](https://example.org).' },
      { type: 'kicker', text: 'Standalone kicker' },
      { type: 'lead', text: 'A lead paragraph.' },
      { type: 'list', items: ['First listed', 'Second listed'] },
      { type: 'table', headers: ['Name', 'Value'], widths: [30, 70], rows: [[{ n: '01', text: 'Numbered row' }, 'Plain cell'], ['Second row', 'Cell **strong**']] },
      { type: 'figure', src: 'screens/09-terrain-3d.jpg', alt: 'Terrain', heightMm: 24, position: 'center 42%', label: 'Figure 1', caption: 'A cropped capture.' },
      { type: 'figure', placeholder: '[Placeholder box]', heightMm: 20, caption: 'A placeholder.' },
      { type: 'statement', text: 'A statement in display type.' },
      { type: 'steps', columns: 2, items: [{ title: 'Step one', text: 'Does the first thing.' }, { title: 'Step two', text: 'Does the second.' }, { title: 'Step three' }] },
      { type: 'push', blocks: [{ type: 'note', label: 'Pinned', text: 'Small print at the foot of page one.' }] }
    ] },
    { layout: 'content', section: 'Two', blocks: [
      { type: 'callout', strong: true, label: 'Callout label', title: 'Callout title.', text: 'Callout text.', field: 'Contact field' },
      { type: 'facts', columns: 3, items: [['Fact label', 'Fact value'], ['Second fact', 'Second value'], ['Third fact', 'Third value']] },
      { type: 'columns', columns: [[{ type: 'kicker', text: 'Column one' }, { type: 'paragraph', text: 'Left column text.' }], [{ type: 'kicker', text: 'Column two' }, { type: 'paragraph', text: 'Right column text.' }]] },
      { type: 'scale', label: 'Effort scale', steps: 4, items: [{ code: 'A1', name: 'Low option', level: 1, note: 'Lowest' }, { code: 'A2', name: 'High option', level: 4, note: 'Highest', text: 'Takes the most.' }] },
      { type: 'references', columns: 2, items: [['R1', 'Reference title.', 'What it supports.'], ['R2', 'Second reference.']] },
      { type: 'contents', columns: 2, items: [['Contents entry', '03'], ['Another entry', '05']] },
      { type: 'devices', src: 'screens/30-devices-three-screens.png', heightMm: 30, label: 'Devices', caption: 'Three screens.' },
      { type: 'phones', srcs: ['screens/13-streams.jpg', 'screens/09-terrain-3d.jpg'], caption: 'Two phones.' },
      { type: 'masthead', text: 'Masthead label' },
      { type: 'note', text: 'A plain note.' },
      { type: 'spacer', heightMm: 4 },
      { type: 'signoff', text: 'Signed off.' },
      { type: 'push', blocks: [{ type: 'callout', label: 'Foot', title: 'A callout at the foot.' }, { type: 'facts', columns: 2, items: [['Foot fact', 'Its value'], ['Other', 'Value']] }] }
    ] }
  ]
})
const EVERY_WORD = ['Kicker of the opening', 'Opening title', 'second tone', 'reference [1,2]', 'A second-level heading', 'strong words', 'a link', 'Standalone kicker', 'A lead paragraph.', 'First listed', 'Numbered row', '01', 'Plain cell',
  'A cropped capture.', '[Placeholder box]', 'A statement in display type.', 'Step one', 'Does the second.', 'Step three', 'Small print at the foot of page one.', 'Callout title.', 'Contact field', 'Fact value', 'Third value', 'Left column text.', 'Right column text.',
  'Effort scale', 'High option', 'Takes the most.', 'Reference title.', 'What it supports.', 'Contents entry', 'Three screens.', 'Two phones.', 'Masthead label', 'A plain note.', 'Signed off.', 'A callout at the foot.', 'Foot fact']

test('every block type is written in every style, its words on its pages in Word, the PDF and the print view', async () => {
  const value = everyBlock()
  const used = new Set(value.pages.flatMap((page) => page.blocks.flatMap((block) => [block.type, ...(block.blocks ?? []).map((child) => child.type), ...(block.columns?.flat?.() ?? []).map((child) => child.type)])))
  assert.deepEqual(BLOCK_TYPES.filter((type) => !used.has(type)), [], 'the page uses every block type')
  assert.deepEqual(publicationDocumentProblems(brand, value), [])
  for (const style of brand.publications.styles.map((entry) => entry.id)) {
    const docx = await designedPublicationDocx(ctx, value, options(style))
    const pdf = await layoutPdf(docx, { ctx })
    const text = flat(pdf.pageText.join('\n')).toLowerCase()
    for (const words of EVERY_WORD) assert.ok(text.includes(words.toLowerCase()), `${style}: “${words}” in the PDF`)
    assert.ok(pdf.pageCount >= 2, `${style}: ${pdf.pageCount} pages`)
    for (const size of sizes(pdf)) assert.deepEqual(size, LETTER, style)
    assert.ok(flat(pdf.pageText[0]).includes('Small print at the foot of page one.'), `${style}: the push stays on its page`)
    const word = xmlOf(docx)
    for (const words of ['Opening title', 'Callout title.', 'Masthead label']) assert.ok(word.includes(words), `${style}: ${words} is Word text`)
    const html = await designedPublicationHtml(ctx, value, options(style))
    for (const words of ['Opening title', 'Fact value', 'Reference title.', 'Signed off.']) assert.ok(html.includes(words), `${style}: ${words} in the print view`)
    assert.doesNotMatch(html, /\*\*|\]\(https/, `${style}: inline marks become formatting`)
  }
})

test('each style’s parts: its ground, running furniture, table look and plates', async () => {
  const value = doc('template-paper')
  const seen = new Map()
  for (const style of brand.publications.styles) {
    const { document, resolved } = await designedPublicationDocument(ctx, value, options(style.id))
    assert.equal(resolved.style.id, style.id)
    assert.equal(document.sections.length, value.pages.length, `${style.id}: a section a page`)
    const [cover, body, , closing] = document.sections
    for (const section of [cover, closing]) {
      // The words flow from the design's text box; the page itself has no header, footer or foot margin.
      assert.deepEqual(['bottom', 'header', 'footer'].map((side) => section.page.margins[side]), [0, 0, 0], `${style.id}: covers run to the edges`)
      assert.equal(section.header[0].type, 'floatingImage', `${style.id}: the cover's artwork is behind the page`)
      assert.equal(section.header[0].box, 'page')
    }
    assert.equal(body.header[0].type, 'floatingImage', `${style.id}: a running page's ground and furniture`)
    assert.ok(body.header.slice(1).every((block) => block.type === 'frame'), `${style.id}: its running words are in frames`)
    const running = JSON.stringify(body.header)
    for (const words of style.page.running === 'title-block' ? ['Product', 'Document', 'Sheet', '[Document short title]'] : style.page.running === 'bar' ? ['[Section one]', '[Month Year]'] : ['DDC Forest', '[Section one]'])
      assert.ok(running.includes(words), `${style.id}: ${words} runs on its pages`)
    seen.set(style.id, { cover: cover.header[0].image.bytes.length, body: body.header[0].image.bytes.length })
    const pdf = await layoutPdf(await designedPublicationDocx(ctx, value, options(style.id)), { ctx })
    assert.equal(pdf.pageCount, value.pages.length, `${style.id}: the template keeps its four pages`)
    assert.deepEqual(sizes(pdf), Array(4).fill(LETTER))
  }
  // Each style draws its own pages; Survey takes its cover from Profile, so those two covers are one picture.
  assert.equal(new Set([...seen.values()].map((entry) => `${entry.cover}|${entry.body}`)).size, seen.size)
  assert.equal(seen.get('survey').cover, seen.get('profile').cover)
})

test('a presentation is 16:9 landscape slides, one a page, in Word, the PDF and the print view', async () => {
  const value = doc('template-slides')
  for (const style of ['survey', 'profile', 'field']) {
    const docx = await designedPublicationDocx(ctx, value, options(style))
    const pdf = await layoutPdf(docx, { ctx })
    assert.equal(pdf.pageCount, value.pages.length, style)
    assert.deepEqual(sizes(pdf), Array(value.pages.length).fill(SLIDE), `${style}: 20 × 11.25 in`)
    const word = xmlOf(docx)
    assert.equal(word.match(/w:orient="landscape"/g)?.length, value.pages.length, `${style}: every Word section is landscape`)
    for (const [index, page] of value.pages.entries()) assert.ok(flat(pdf.pageText[index]).includes(page.title.replace(/\*/g, '').replace(/\[|\]/g, '').slice(0, 12)) || flat(pdf.pageText[index]).includes(page.title.slice(0, 12)), `${style}: slide ${index + 1} is “${page.title}”`)
    const html = await designedPublicationHtml(ctx, value, options(style))
    assert.match(html, /@page dk-s1 *\{ *size: *1440pt 810pt/, `${style}: the print view's sheets are slides`)
  }
  const deck = doc('access-executive-presentation')
  const pdf = await layoutPdf(await designedPublicationDocx(ctx, deck, options()), { ctx })
  assert.equal(pdf.pageCount, deck.pages.length, 'the executive deck keeps a slide a page')
})

test('a product document carries its lockup and accent; a company document the company logo and its own line', async () => {
  const product = await designedPublicationDocument(ctx, doc('template-paper'), options())
  const company = await designedPublicationDocument(ctx, doc('template-briefing'), options())
  assert.equal(product.resolved.product.id, 'forest')
  assert.equal(product.resolved.colours.accent, '#3F7055')
  assert.equal(product.document.metadata.custom['brandkit.product'], 'forest')
  assert.equal(company.resolved.product, null)
  assert.equal(company.resolved.colours.accent, brand.colours.midnight)
  assert.equal(company.document.metadata.custom['brandkit.product'], undefined)
  assert.equal(product.document.sections[0].header[0].alt, 'DDC Forest lockup')
  assert.equal(company.document.sections[0].header[0].alt, 'ddcnorth logo')
  const words = async (value) => flat((await layoutPdf(await designedPublicationDocx(ctx, value, options()), { ctx })).pageText.join('\n'))
  const productText = await words(doc('template-paper'))
  assert.match(productText, /Know the land\. Plan the work\./, 'a product closes on the family’s positioning line')
  assert.match(productText, /DDC FOREST IS PART OF DDC ATLAS/i)
  assert.match(productText, /PRODUCT\s+DDC Forest/i)
  const companyText = await words(doc('template-briefing'))
  assert.match(companyText, /ddcnorth · Internal/i, 'a company document signs off with its own line')
  assert.match(companyText, /FROM\s+ddcnorth/i)
  assert.doesNotMatch(companyText, /DDC Forest|DDC Access|PART OF DDC ATLAS/)
})

test('Word, PDF and HTML come from one document: the same words, the PDF the Word file laid out', async () => {
  const value = doc('access-product-sheet')
  const { document } = await designedPublicationDocument(ctx, value, options())
  const { writeDocx } = await import('document-kit/docx')
  const { writeHtml } = await import('document-kit/html')
  const docx = await writeDocx(document)
  const pdf = await layoutPdf(docx, { ctx })
  const html = writeHtml(document)
  const pdfText = flat(pdf.pageText.join(' '))
  for (const words of ['Forestry road planning', 'Evaluate access options before committing resources.', 'A 30-minute planning discussion.', 'Fit your planning practice']) {
    assert.ok(xmlOf(docx).includes(words), `Word: ${words}`)
    assert.ok(pdfText.toLowerCase().includes(words.toLowerCase()), `PDF: ${words}`)
    assert.ok(html.includes(words), `HTML: ${words}`)
  }
  assert.equal(pdf.pageCount, 1)
  assert.deepEqual(pdf.notices, [])
})

test('documents paginated by hand keep their page count and paper', async () => {
  for (const [id, paper] of [['template-paper', LETTER], ['template-briefing', LETTER], ['template-slides', SLIDE], ['access-product-sheet', LETTER], ['access-executive-presentation', SLIDE]]) {
    const value = doc(id)
    const pdf = await layoutPdf(await designedPublicationDocx(ctx, value, options()), { ctx })
    assert.equal(pdf.pageCount, value.pages.length, id)
    assert.deepEqual(sizes(pdf), Array(value.pages.length).fill(paper), id)
  }
})

test('every ddcnorth document keeps the page count it was paginated for, as the reference renders do', async () => {
  for (const value of brand.publications.documents) {
    const pdf = await layoutPdf(await designedPublicationDocx(ctx, value, options()), { ctx })
    assert.equal(pdf.pageCount, value.pages.length, value.id)
  }
})

test('a closing page can be a contact page: a person, no cards, in Word, the PDF and the print view', async () => {
  const value = doc('template-briefing')
  const closing = value.pages.findIndex((page) => page.layout === 'closing')
  const person = { name: 'Avery Example', role: 'Head of Made-up Things', org: 'Example Org', email: 'avery@example.com', phone: '+1 555 0100' }
  value.pages[closing] = { layout: 'closing', kicker: 'Contact', title: 'Questions about *this brief*', contact: person, signoff: 'Example Org · Brief' }
  assert.deepEqual(publicationDocumentProblems(brand, value), [])
  const { document } = await designedPublicationDocument(ctx, value, options())
  const { writeDocx } = await import('document-kit/docx')
  const { writeHtml } = await import('document-kit/html')
  const docx = await writeDocx(document)
  const pdfText = flat((await layoutPdf(docx, { ctx })).pageText.join(' '))
  const html = writeHtml(document)
  for (const words of Object.values(person)) {
    assert.ok(xmlOf(docx).includes(words), `Word: ${words}`)
    assert.ok(pdfText.includes(words), `PDF: ${words}`)
    assert.ok(html.includes(words), `HTML: ${words}`)
  }
  // The name is set large in the display face; nothing on the page is a table (no cards).
  const page = document.sections[closing].body
  assert.ok(page.every((block) => block.type !== 'table'))
  const name = page.find((block) => JSON.stringify(block.content).includes(person.name))
  assert.equal([].concat(name.content)[0].font, document.theme.headings[0].font)
  assert.ok(name.text.size > 20)
  // A person needs a name and nothing the page cannot show; a line of text stays a contact line.
  const bad = structuredClone(value)
  bad.pages[closing].contact = { role: 'Role', fax: '1' }
  const problems = publicationDocumentProblems(brand, bad).join('\n')
  assert.match(problems, /contact needs a name/)
  assert.match(problems, /unknown field “fax”/)
  bad.pages[closing].contact = 'Write to [CONTACT]'
  assert.deepEqual(publicationDocumentProblems(brand, bad), [])
})

test('a callout at the foot of the page keeps its padding inside its fill', async () => {
  const value = doc('template-briefing')
  const at = value.pages.findIndex((page) => page.layout === 'content')
  value.pages[at] = { layout: 'content', section: value.pages[at].section, blocks: [{ type: 'paragraph', text: 'Above.' }, { type: 'push', blocks: [{ type: 'callout', label: 'Label', title: 'A title.', text: 'Some words.' }] }] }
  const { document } = await designedPublicationDocument(ctx, value, options('field'))
  const foot = document.sections[at].body.find((block) => block.type === 'pinned').blocks
  // An empty line of the padding's height above and below the words, filled like them (16px and 17px).
  assert.equal(foot[0].content, '')
  assert.ok(foot[0].shading && foot.at(-1).shading)
  assert.equal(foot[0].spacing.line.exact, 12)
  assert.equal(foot.at(-1).spacing.line.exact, 12.8)
  // The sides: the words 18px in, the fill's own rule keeping that space.
  for (const entry of foot) assert.equal(entry.borders.left.space, 13.5)
})

test('a kind with no document starts from its skeleton, and every default kind renders', async () => {
  for (const kind of DEFAULT_KINDS) {
    const bare = structuredClone(brand)
    bare.publications.kinds = DEFAULT_KINDS.map((entry) => ({ ...entry }))
    const starter = starterPublication(bare, kind.id)
    assert.deepEqual(publicationDocumentProblems(bare, starter), [], kind.id)
    const pdf = await layoutPdf(await designedPublicationDocx({ brand: bare, fonts }, starter, options()), { ctx })
    assert.equal(pdf.pageCount, kind.skeleton.length, kind.id)
    assert.deepEqual(sizes(pdf)[0], kind.format === 'slide' ? SLIDE : LETTER, kind.id)
  }
})

test('plates are drawn from a seed, the same seed the same plate, in every type and motif', () => {
  const paint = { line: '#C8D7E8', accent: '#337F9E', accentDark: '#609BB3', ground: '#0B2B4A', primary: '#0B2B4A', light: '#C8D7E8' }
  for (const type of PLATE_TYPES) {
    const motifs = type === 'dots' ? DOT_MOTIFS : [undefined]
    for (const motif of motifs) {
      const spec = { type, seed: 11, motif, points: [[-123.1, 49.3]] }
      const svg = plateSvg(spec, { width: 400, height: 300, paint, symbol: brand.symbol, home: [-122.75, 53.92] })
      assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
      assert.equal(svg, plateSvg(spec, { width: 400, height: 300, paint, symbol: brand.symbol, home: [-122.75, 53.92] }), `${type}/${motif}: deterministic`)
      assert.ok(svg.length > 300, `${type}/${motif} draws something`)
    }
  }
  assert.notEqual(plateSvg({ type: 'field', seed: 1 }, { width: 200, height: 100, paint }), plateSvg({ type: 'field', seed: 2 }, { width: 200, height: 100, paint }))
})

test('the plain publication model takes the designed block types too', async () => {
  const northwind = JSON.parse(readFileSync(new URL('../brands/northwind/brand.json', import.meta.url), 'utf8'))
  const plainCtx = { brand: northwind, fonts: await loadBrandFontsFromDisk(northwind, fileURLToPath(new URL('../brands/northwind/', import.meta.url))) }
  const model = publicationModel(northwind, { paper: 'letter', purpose: 'brief', values: { title: 'Designed blocks' } })
  const blocks = everyBlock().pages.flatMap((page) => page.blocks).filter((block) => !['figure', 'devices', 'phones'].includes(block.type))
  model.pages.push({ id: 'designed', kind: 'content', title: 'Designed blocks', blocks })
  assert.deepEqual(validatePublication(model), [])
  const pdf = await layoutPdf(await publicationDocx(plainCtx, model, renderer), { ctx: plainCtx })
  const text = flat(pdf.pageText.join(' '))
  for (const words of ['Opening title second tone', 'Callout title.', 'Fact value', 'Left column text.', 'High option', 'Reference title.', 'Contents entry', 'Signed off.', 'A callout at the foot.']) assert.ok(text.includes(words), words)
  assert.doesNotMatch(text, /\*\*/)
  const html = await publicationPrintHtml(plainCtx, model, renderer)
  assert.ok(html.includes('Right column text.'))
})
