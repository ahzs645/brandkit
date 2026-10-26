import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  documentProfile, publicationModel, publicationLayouts, documentationGuide,
  documentationDocumentsFor, templateCatalogMetadata, documentationMarkdown,
  validatePublication, publicationAffiliation
} from '../src/engine/documentation.js'

const ids = JSON.parse(readFileSync(new URL('../brands/index.json', import.meta.url), 'utf8')).map((entry) => entry.id)
const brands = Object.fromEntries(ids.map((id) => [id, JSON.parse(readFileSync(new URL(`../brands/${id}/brand.json`, import.meta.url), 'utf8'))]))
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY9kAAAAASUVORK5CYII='

test('all registered brands produce six valid layouts in every paper and purpose without changing their definitions', () => {
  for (const brand of Object.values(brands)) {
    const before = JSON.stringify(brand)
    for (const paper of ['letter', 'a4']) for (const purpose of ['product', 'report', 'brief', 'portfolio']) {
      const model = publicationModel(brand, { paper, purpose })
      assert.deepEqual(validatePublication(model), [], `${brand.id}/${purpose}/${paper}`)
      assert.deepEqual(model.pages.map((page) => page.kind), ['cover', 'content', 'product', 'screenshot', 'comparison', 'closing'])
      assert.equal(model.profile.typography.title.family, brand.fonts.display.family)
      assert.equal(model.profile.typography.title.weight, brand.fonts.display.weight)
      assert.equal(model.profile.typography.body.family, brand.fonts.body.family)
      assert.equal(model.profile.brandId, brand.id)
      assert.ok(model.profile.logo.assets.svg.startsWith('logos/outlined/'))
      assert.equal(model.pages[3].blocks.find((block) => block.type === 'figure').placeholder, true)
    }
    assert.equal(JSON.stringify(brand), before, `${brand.id} identity must not be mutated`)
  }
})

test('document appearance retains distinct identity choices instead of applying one brand to all', () => {
  assert.equal(documentProfile(brands.firstform).typography.title.family, 'Sora')
  assert.equal(documentProfile(brands.firstform).typography.title.weight, 600)
  assert.equal(documentProfile(brands.overtheedge).typography.title.family, 'Source Serif 4')
  assert.equal(documentProfile(brands.overtheedge).typography.caption.family, 'IBM Plex Mono')
  assert.equal(documentProfile(brands.sparklab).typography.title.family, 'Outfit')
  assert.equal(documentProfile(brands.sparklab).typography.body.family, 'Source Serif 4')
  assert.equal(documentProfile(brands.ddcnorth).colours.accent, '#0B2B4A')
  assert.equal(documentProfile(brands.northwind).colours.accent, '#1F4E46')
  assert.equal(documentProfile(brands['bc-hydro-1983']).logo.options.signature, 'standard')
  assert.equal(documentProfile(brands['bc-province-1977']).logo.options.signature, 'provincial')
})

test('historical identities keep explicit source status and label their modern layouts', () => {
  for (const id of ['bc-province-1977', 'bc-hydro-1983']) {
    const brand = structuredClone(brands[id])
    brand.documentation = { status: { historical: false } }
    const model = publicationModel(brand)
    assert.equal(model.profile.status.historical, true)
    assert.match(model.profile.status.note, /historical reconstruction/i)
    assert.match(model.profile.status.extension, /modern document layout extension/i)
    assert.match(model.pages[0].blocks.map((block) => block.text).join(' '), /historical reconstruction/i)
    assert.match(model.pages.at(-1).blocks.map((block) => block.text).join(' '), /modern document layout extension/i)
    model.profile.status.historical = false
    assert.ok(validatePublication(model).some((problem) => /retain their historical status/.test(problem)))
  }
})

test('defaults do not invent a client, contact or delivered product and supplied evidence is retained', () => {
  const defaults = publicationModel(brands.firstform)
  const allText = JSON.stringify(defaults.pages)
  assert.doesNotMatch(allText, /\[Client\]|Prepared for|example\.com|@firstform/i)
  assert.equal(defaults.pages.at(-1).blocks.some((block) => block.text === 'Contact'), false)
  const model = publicationModel(brands.firstform, { values: {
    title: 'Actual product', productName: 'User supplied name',
    figure: { src: png, alt: 'A real supplied image', caption: 'The supplied result.', provenance: 'Capture on 26 October 2026' },
    contact: { name: '[Name]', email: 'provided@example.org' }
  } })
  const figure = model.pages[3].blocks.find((block) => block.type === 'figure')
  assert.equal(figure.src, png)
  assert.equal(figure.placeholder, false)
  assert.match(figure.caption, /Source: Capture on 26 October 2026/)
  assert.equal(figure.provenance, 'Capture on 26 October 2026')
  const end = JSON.stringify(model.pages.at(-1))
  assert.match(end, /provided@example.org/)
  assert.doesNotMatch(end, /\[Name\]/)
})

test('profile overrides are measured, role-aware and cannot select unknown identity art', () => {
  const brand = structuredClone(brands.firstform)
  brand.documentation = { margins: { leftMm: 22 }, typography: { title: { sizePt: 34 } }, colours: { paper: 'ash' }, logo: { widthMm: 60 } }
  const profile = documentProfile(brand, { paper: 'a4' })
  assert.equal(profile.paper.widthMm, 210)
  assert.equal(profile.paper.heightMm, 297)
  assert.equal(profile.margins.leftMm, 22)
  assert.equal(profile.typography.title.sizePt, 34)
  assert.equal(profile.typography.title.weight, 600)
  assert.equal(profile.colours.paper, '#DFDFDF')
  assert.equal(profile.logo.widthMm, 60)
  brand.documentation.typography.title.font = 'missing'
  assert.throws(() => documentProfile(brand), /Unknown document font/)
  brand.documentation = { logo: { widthMm: 1 } }
  assert.throws(() => documentProfile(brand), /at least 20 mm/)
  brand.documentation = { logo: { options: { family: 'other-brand' } } }
  assert.throws(() => documentProfile(brand), /supplied logos/)
  brand.documentation = { margins: { leftMm: 120, rightMm: 120 } }
  assert.throws(() => documentProfile(brand), /usable page space/)
  assert.throws(() => documentProfile(brand, { paper: 'legal' }), /Unknown paper size/)
})

test('virtual publication and existing letterhead mappings do not duplicate supplied documents', () => {
  const first = documentationDocumentsFor(brands.firstform)
  assert.equal(first.filter((entry) => entry.publication).length, 8)
  assert.deepEqual(first.find((entry) => entry.id === 'letterhead-a4').pages, ['letterhead-a4'])
  assert.ok(first.filter((entry) => entry.publication).every((entry) => !entry.pages))
  const brand = structuredClone(brands.firstform)
  brand.documents.push(...first)
  assert.deepEqual(documentationDocumentsFor(brand), [])
  for (const item of Object.values(brands)) {
    const documents = documentationGuide(item).documents
    assert.equal(new Set(documents.map((entry) => entry.id)).size, documents.length)
  }
})

test('catalog and use guides derive asset paths, card dimensions and source editing instructions', () => {
  const guide = documentationGuide(brands.firstform)
  assert.match(guide.shareUrl, /brand=firstform&share=1/)
  assert.equal(guide.preferredLogo.assets.svg, 'logos/outlined/firstform-horizontal-black.svg')
  assert.equal(guide.preferredLogo.provenance.kind, 'reconstruction')
  assert.equal(templateCatalogMetadata(brands.firstform).find((entry) => entry.id === 'business-card-front').sizeLabel, '90 × 50 mm trim + 3 mm bleed')
  assert.ok(guide.source.generators.includes('scripts/brands/firstform.mjs'))
  const markdown = documentationMarkdown(brands.firstform)
  assert.match(markdown, /90 × 50 mm trim \+ 3 mm bleed/)
  assert.match(markdown, /direct changes to the generated brand\.json may be overwritten/)
  assert.match(markdown, /In an exported standalone kit, source\/brand\.json is the editable definition/)
  const layouts = publicationLayouts()
  layouts[0].label = 'Changed by caller'
  assert.equal(publicationLayouts()[0].label, 'Cover')
})

test('invalid JSON model shapes return actionable problems rather than crashing the editor', () => {
  for (const value of [null, [], 'text', 42, {}, { pages: [null] }]) assert.ok(validatePublication(value).length)
  const model = publicationModel(brands.firstform)
  model.pages.push({ id: 'cover', kind: 'unknown', blocks: [null, { type: 'script', text: 'bad' }] })
  const errors = validatePublication(model)
  assert.ok(errors.some((error) => /unique id/.test(error)))
  assert.ok(errors.some((error) => /unknown layout/.test(error)))
  assert.ok(errors.some((error) => /unknown block/.test(error)))
  assert.ok(errors.some((error) => /must be an object/.test(error)))
})

test('validation rejects external or disguised images, malformed tables and out-of-page geometry', () => {
  for (const src of ['https://example.org/image.png', 'file:///tmp/image.png', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', 'data:image/jpeg;base64,aGVsbG8=']) {
    const model = publicationModel(brands.firstform)
    model.pages[3].blocks.find((block) => block.type === 'figure').src = src
    assert.ok(validatePublication(model).some((error) => /figure/.test(error)), src)
  }
  const model = publicationModel(brands.firstform)
  const table = model.pages[4].blocks.find((block) => block.type === 'table')
  table.rows.push(['wrong shape'])
  table.widths = [1, -1]
  const figure = model.pages[3].blocks.find((block) => block.type === 'figure')
  figure.widthMm = 1000
  const errors = validatePublication(model)
  assert.ok(errors.some((error) => /table rows/.test(error)))
  assert.ok(errors.some((error) => /table widths/.test(error)))
  assert.ok(errors.some((error) => /figure width/.test(error)))
})

test('imported logo clear space cannot inject HTML attributes or use invalid geometry', () => {
  for (const value of ['0mm\" data-injected=\"yes', '8', -1, Infinity, NaN, 101]) {
    const model = publicationModel(brands.firstform)
    model.profile.logo.clearSpaceMm = value
    assert.ok(validatePublication(model).some((error) => /logo clear space/.test(error)), String(value))
  }
  const model = publicationModel(brands.firstform)
  model.profile.logo.clearSpaceMm = 0
  assert.deepEqual(validatePublication(model), [])
})

test('department naming is independent editable metadata with a validated hierarchy', () => {
  const brand = brands.firstform
  const before = JSON.stringify(brand)
  const values = { affiliation: { department: '  College of Science and Management  ', subdepartment: 'Natural Resources\n and Environmental Studies' } }
  const model = publicationModel(brand, { purpose: 'report', values })
  assert.deepEqual(model.affiliation, { department: 'College of Science and Management', subdepartment: 'Natural Resources and Environmental Studies' })
  assert.deepEqual(model.logo, publicationModel(brand).logo, 'names never change the supplied logo')
  assert.deepEqual(validatePublication(JSON.parse(JSON.stringify(model))), [])
  assert.equal(JSON.stringify(brand), before)
  assert.deepEqual(publicationAffiliation({ department: 'Research', subdepartment: 'Laboratory' }), { department: 'Research', subdepartment: 'Laboratory' })
  assert.throws(() => publicationModel(brand, { values: { affiliation: { subdepartment: 'Laboratory' } } }), /Supply a department/)
  assert.throws(() => publicationAffiliation({ affiliation: 'not an object' }), /must be an object/)
  assert.throws(() => publicationAffiliation({ affiliation: { department: 42 } }), /must be text/)
  assert.throws(() => publicationAffiliation({ department: 'a'.repeat(181) }), /180 characters/)
})

test('affiliation sizes are explicit layout defaults with safe imported bounds', () => {
  const brand = structuredClone(brands.firstform)
  brand.documentation = { affiliation: { departmentSizePt: 14, subdepartmentSizePt: 11, gapAfterMm: 6 } }
  const model = publicationModel(brand)
  assert.equal(model.profile.affiliation.departmentSizePt, 14)
  assert.match(model.profile.affiliation.note, /document layout defaults/)
  assert.match(model.profile.affiliation.wrapping, /do not condense, truncate or stretch/)
  for (const bad of [null, 42, [], { department: {}, subdepartment: 5 }]) {
    const source = structuredClone(model)
    source.affiliation = bad
    if (bad !== null) assert.ok(validatePublication(source).some((item) => /Affiliation|affiliation/.test(item)))
    else assert.deepEqual(validatePublication(source), [])
  }
  model.profile.affiliation.gapAfterMm = '0\" onclick=\"alert(1)'
  assert.ok(validatePublication(model).some((item) => /Affiliation spacing/.test(item)))
  brand.documentation.affiliation.subdepartmentSizePt = 20
  assert.throws(() => documentProfile(brand), /subdepartment no larger than department/)
})

test('brand portfolio and configured report defaults retain caller control and source scope', () => {
  const brand = structuredClone(brands.firstform)
  brand.documentation = { examples: { report: { title: 'Research report', detailTitle: 'Methods and scope', summary: 'Describe the evidence examined.' } } }
  const report = publicationModel(brand, { purpose: 'report', values: { title: 'Air quality study' } })
  assert.equal(report.title, 'Air quality study')
  assert.equal(report.pages[2].title, 'Methods and scope')
  const portfolio = publicationModel(brand, { purpose: 'portfolio' })
  assert.equal(portfolio.title, `${brand.name} brand portfolio`)
  assert.match(JSON.stringify(portfolio.pages), /does not create an approved departmental logo/)
  assert.deepEqual(validatePublication(portfolio), [])
  assert.ok(documentationDocumentsFor(brand).some((entry) => entry.purpose === 'portfolio' && entry.paper === 'a4'))
})
