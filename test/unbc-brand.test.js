import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { unzipSync, strFromU8 } from 'fflate'
import { validateBrand } from '../src/engine/brand.js'
import { logoDocument } from '../src/engine/artwork.js'
import { departmentLines, linesOf } from '../src/engine/signatures.js'
import { guidePages } from '../src/engine/guide.js'
import { renderTemplate, templateFields, physicalSize } from '../src/engine/templates.js'
import { buildKit, planKit } from '../src/engine/kit.js'
import { documentProfile, publicationModel } from '../src/engine/documentation.js'
import { loadBrandFontsFromDisk, readAssetFromDisk } from '../src/fonts/node.js'
import { officeFile } from '../src/export/office.js'
import { publicationDocx, publicationHtml } from '../src/export/publication.js'
import { webComponentDocument, webComponents, webPage } from '../src/engine/webpage.js'

const folder = new URL('../brands/unbc/', import.meta.url).pathname
const read = file => readFileSync(`${folder}${file}`, 'utf8')
const brand = JSON.parse(read('brand.json'))
const fonts = await loadBrandFontsFromDisk(brand, folder)
const ctx = { brand, fonts }

test('UNBC retains the entire supplied vector geometry and uses published identity colours', () => {
  assert.deepEqual(validateBrand(brand), [])
  assert.deepEqual(fonts.failures, [])
  const source = read('reference/logo-website.svg')
  const attributes = [...source.matchAll(/\b(d|points)="([^"]+)"/g)].map(match => `${match[1]}="${match[2]}"`)
  assert.ok(attributes.length > 30)
  for (const [colourway, hex] of [['green', '#035642'], ['black', '#000000'], ['white', '#FFFFFF']]) {
    const svg = logoDocument(ctx, { signature: 'official', colourway })
    for (const attribute of attributes) assert.ok(svg.includes(attribute), `${colourway}: supplied geometry retained`)
    assert.match(svg, new RegExp(`fill="${hex}"`))
    assert.doesNotMatch(svg, /<text\b|#00573D|#B79527/)
  }
  assert.deepEqual(brand.signatures.map(entry => entry.id), ['official', 'sub-logo'])
  assert.equal(brand.signatures[0].padding, 0, 'minimum width measures visible full artwork')
  assert.equal(brand.signatures[0].departmental, undefined, 'the full logo is never set for a department')
  assert.equal(brand.logoPolicy.minimumWidthMm, 38.1)
  assert.ok(brand.logoPolicy.clearSpaceRatio >= 16.02 / 434.89)
  assert.deepEqual(brand.colours.green, '#035642')
  assert.deepEqual(brand.colours.gold, '#B79527')
})

test('UNBC original resources retain source checksums and documented transformations', () => {
  const provenance = JSON.parse(read('reference/PROVENANCE.json'))
  assert.equal(provenance.resources.length, 13)
  for (const item of provenance.resources) {
    const bytes = readFileSync(`${folder}${item.file}`)
    assert.equal(bytes.length, item.bytes, item.file)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, item.file)
    assert.match(item.url, /^https:\/\/www\.unbc\.ca\//)
  }
  assert.equal(provenance.resources.filter(item => item.file.startsWith('official-templates/')).length, 5)
  assert.equal(provenance.discrepancies.length, 2)
  const rules = JSON.parse(read('reference/identity-rules.json'))
  assert.equal(rules.official.departmentLogos.publicSizingFormula, null)
  assert.equal(rules.implementation.generatedSublogos, false)
  assert.equal(rules.implementation.crestOrHeraldicAssetsIncluded, false)
  assert.deepEqual(rules.official.palette.gold.rgb, [183, 149, 39])
})

test('UNBC templates keep editable names, finite geometry and minimum physical logo widths', () => {
  for (const template of brand.templates) {
    const fields = templateFields(template, brand)
    assert.ok(fields.length, `${template.id} has editable fields`)
    const values = { department: 'Faculty of Environment', subdepartment: 'Department of Geography, Earth and Environmental Sciences' }
    const rendered = renderTemplate({ ...ctx, values }, template)
    assert.doesNotMatch(rendered.svg, /NaN|undefined|Infinity/, template.id)
    if (fields.some(field => field.id === 'department')) {
      assert.ok(fields.some(field => field.id === 'subdepartment'), `${template.id} has both levels`)
      assert.ok(rendered.svg.includes('Faculty of Environment'), `${template.id} retains affiliation as editable text`)
    }
    const size = physicalSize(rendered)
    const mmPerUnit = size.width / template.width
    for (const logo of template.elements.filter(element => element.type === 'logo')) {
      assert.ok(logo.width * mmPerUnit >= 38.1 - 1e-6, `${template.id} visible logo >= 38.1 mm`)
      const minimumSpace = logo.width * brand.logoPolicy.clearSpaceRatio
      assert.ok(logo.x >= minimumSpace && logo.y >= minimumSpace, `${template.id} respects page-edge clear space`)
    }
  }
  for (const page of guidePages(ctx)) {
    const svg = page.svg ?? page.render()
    assert.doesNotMatch(svg, /NaN|undefined|Infinity|<text\b/, page.path)
  }
})

test('UNBC publications use sourced logo sizing and local affiliation rules in both papers', () => {
  for (const paper of ['letter', 'a4']) {
    const profile = documentProfile(brand, { paper })
    assert.equal(profile.logo.widthMm, 55)
    assert.equal(profile.logo.minimumWidthMm, 38.1)
    assert.ok(profile.logo.clearSpaceMm >= profile.logo.widthMm * brand.logoPolicy.clearSpaceRatio)
    for (const purpose of ['report', 'portfolio', 'brief']) {
      const model = publicationModel(brand, { paper, purpose, values: { department: 'Faculty of Environment', subdepartment: 'Department of Geography, Earth and Environmental Sciences' } })
      assert.equal(model.purpose, purpose)
      assert.equal(model.profile.colours.accent, '#035642')
    }
  }
  assert.equal(brand.fields.department.placeholder, '')
  assert.equal(brand.fields.subdepartment.placeholder, '')
  assert.deepEqual(brand.documentation.publishedPurposes, ['report', 'portfolio', 'brief'])
  assert.equal(brand.fonts.body.family, 'Helvetica Neue LT Pro')
  assert.equal(brand.fonts.body.consumerFamily, 'Arial')
  assert.equal(brand.fonts.body.officialFamily, 'Helvetica Neue')
  assert.equal(brand.typography.labels.textTransform, 'none')
})

test('UNBC native names preserve 180 wide unbroken characters at both levels without collisions', () => {
  for (const template of brand.templates) {
    if (!templateFields(template, brand).some(field => field.id === 'department')) continue
    const value = 'W'.repeat(180)
    const svg = renderTemplate({ ...ctx, values: { department: value, subdepartment: value } }, template).svg
    const rows = [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)]
      .filter(match => /id="(?:department|subdepartment)(?:-\d+)?"/.test(match[1]))
      .map(match => ({ id: match[1].match(/id="([^"]+)"/)[1], content: match[2],
        x: +match[1].match(/\bx="([^"]+)"/)[1], y: +match[1].match(/\by="([^"]+)"/)[1],
        size: +match[1].match(/font-size="([^"]+)"/)[1], weight: +match[1].match(/font-weight="([^"]+)"/)[1] }))
    for (const field of ['department', 'subdepartment']) {
      assert.equal(rows.filter(row => row.id === field || row.id.startsWith(`${field}-`)).map(row => row.content).join(''), value, `${template.id}: ${field} does not truncate`)
    }
    const contentTop = template.id.startsWith('letterhead') || template.id.startsWith('memo') ? 82
      : /(?:report|portfolio)-cover/.test(template.id) ? 99
        : template.id === 'presentation-cover' ? 110
          : template.id === 'social-post' ? 447
            : template.id === 'email-signature' ? 445 : 71
    for (const row of rows) {
      const textWidth = fonts.width(row.content, row.weight === 700 ? 'bold' : 'body', row.size)
      assert.ok(row.x + textWidth <= template.width - (template.unit === 'mm' ? 20 : 24) + 1e-5, `${template.id}: ${row.id} fits horizontally`)
      assert.ok(row.y + row.size * .25 < contentTop, `${template.id}: ${row.id} stays clear of following content`)
    }
  }
})

test('UNBC Word, PowerPoint and email applications retain real editable content', async () => {
  const png = async () => Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'))
  const values = { department: 'Faculty of Environment', subdepartment: 'School of Planning and Sustainability', author: 'Avery Example', 'letter-subject': 'Research update', 'memo-subject': 'Research update', 'report-title': 'Research update', 'brief-title': 'Research update', 'portfolio-title': 'Research update', 'deck-title': 'Research update' }
  for (const doc of brand.documents) {
    const file = await officeFile({ ...ctx, values }, doc, { png, readAsset: src => readAssetFromDisk(folder, src) })
    if (doc.format === 'html') {
      assert.match(strFromU8(file.bytes), /Avery Example/)
      assert.match(strFromU8(file.bytes), /Faculty of Environment/)
      continue
    }
    const parts = unzipSync(file.bytes)
    if (doc.format === 'docx') {
      const allWord = Object.entries(parts).filter(([path]) => /^word\/(?:document|header\d+)\.xml$/.test(path)).map(([, value]) => strFromU8(value)).join('\n')
      assert.match(allWord, /Research update/, doc.id)
      assert.match(allWord, /Faculty of Environment/, doc.id)
      assert.match(allWord, /Arial/, doc.id)
    } else {
      const slides = Object.keys(parts).filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path))
      assert.equal(slides.length, 4)
      assert.ok(slides.some(path => strFromU8(parts[path]).includes('Research update')))
      assert.ok(slides.some(path => strFromU8(parts[path]).includes('Faculty of Environment')))
    }
  }
})

test('UNBC exported kit carries original sources and excludes isolated symbols and tiny icons', async () => {
  const plan = planKit(brand, { rasters: false, pdfs: false, office: false })
  const paths = plan.map(entry => entry.path)
  assert.equal(new Set(paths).size, paths.length)
  assert.ok(!paths.some(path => /(?:^symbol\/|favicon|app-icon)/.test(path)))
  for (const entry of plan.filter(entry => entry.kind === 'asset')) assert.ok(existsSync(`${folder}${entry.src}`), entry.src)
  const { files, skipped } = await buildKit(ctx, { rasters: false, pdfs: false, office: false, readAsset: src => readAssetFromDisk(folder, src) })
  assert.deepEqual(skipped, [])
  for (const path of ['official-templates/lhopt1official.docx', 'official-templates/unbcpowerpointtemplate.pptx', 'reference/unbc-graphics-standards-2020.pdf', 'reference/PROVENANCE.json', 'reference/identity-rules.json', 'fonts/HelveticaNeueLTPro-black.otf', 'logos/sub-logos/school-of-business/sub-logo-white.svg']) assert.ok(files.has(path), path)
  for (const path of ['docs/brand-details.html', 'guidelines/brand-details.html']) {
    assert.ok(files.has(path))
    const html = strFromU8(files.get(path))
    for (const [, href] of html.matchAll(/href="([^"#][^"]*)"/g)) {
      if (/^(https?:|mailto:|data:)/.test(href)) continue
      const target = resolve('/', path, '..', href).slice(1)
      assert.ok(files.has(target), `${path} → ${target}`)
    }
  }
})

// The sub-logo is drawn from the UNBC logo package's construction (vendor/unbc-logo), which the
// door-sign generator also uses; these hold the kit to it.
const logoPackage = new URL('../vendor/unbc-logo/src/logo/', import.meta.url).pathname
const subLogo = brand.signatures.find(entry => entry.id === 'sub-logo')
const departmentItem = subLogo.elements.find(element => element.type === 'stack').items[0]

test('UNBC sub-logos set the department under the full logo in Helvetica Neue 95 Black', () => {
  assert.equal(subLogo.departmental, true)
  assert.equal(brand.fonts.black.weight, 900)
  assert.ok(fonts.has('black'))
  const svg = logoDocument({ brand, fonts, values: { department: 'School of Business' } }, { signature: 'sub-logo', colourway: 'white' })
  for (const attribute of [...read('reference/logo-website.svg').matchAll(/\b(?:d|points)="[^"]+"/g)].map(match => match[0])) assert.ok(svg.includes(attribute), 'full logo geometry retained')
  assert.match(svg, /aria-label="School of Business"/)
  assert.doesNotMatch(svg, /<text\b/, 'department line is outlined')
  assert.equal(brand.departments.field, 'department')
  assert.ok(brand.departments.items.length >= 80)
  const business = brand.departments.items.find(item => item.name === 'School of Business')
  assert.ok(business.matched, 'names matched to official artwork carry their source')
  const empty = logoDocument({ brand, fonts, values: { department: '' } }, { signature: 'sub-logo', colourway: 'green' })
  assert.equal(empty.match(/viewBox="([^"]+)"/)[1], logoDocument(ctx, { signature: 'official', colourway: 'green' }).match(/viewBox="([^"]+)"/)[1], 'no department leaves the full logo alone')
})

test('UNBC sub-logo wrapping carries conjunctions down and flags unbreakable words', () => {
  assert.deepEqual(linesOf(ctx, 'Faculty of Human and Health Sciences', departmentItem), ['Faculty of Human', 'and Health Sciences'])
  assert.deepEqual(linesOf(ctx, 'Northern BC Archives & Special Collections', departmentItem), ['Northern BC Archives', '& Special Collections'])
  assert.deepEqual(linesOf(ctx, 'Office of\nResearch', departmentItem), ['Office of', 'Research'], 'typed breaks are kept')
  const [fit] = departmentLines(ctx, subLogo, { department: 'Pneumonoultramicroscopicsilicovolcanoconiosis Centre' })
  assert.deepEqual(fit.overflowing, ['Pneumonoultramicroscopicsilicovolcanoconiosis'])
})

test('UNBC sub-logos break every department line as the UNBC logo package does', { skip: !existsSync(logoPackage) && 'vendor/unbc-logo is not checked out' }, async () => {
  const { wrapDepartmentText, splitDepartmentText } = await import(`${logoPackage}logoText.js`)
  const snapshot = JSON.parse(readFileSync(`${logoPackage}departmentWraps.snapshot.json`, 'utf8'))
  for (const name of Object.keys(snapshot)) {
    assert.deepEqual(linesOf(ctx, name, departmentItem), wrapDepartmentText(name), name)
  }
  for (const item of brand.departments.items) {
    assert.deepEqual(item.values.department.split('\n'), splitDepartmentText(item.name), item.name)
  }
})

test('UNBC documents are set as unbc.ca pages are, with the department’s sub-logo on the cover', async () => {
  const profile = documentProfile(brand)
  assert.equal(profile.typography.title.colour, '#977000', 'gold page title')
  assert.deepEqual(profile.typography.title.ruleBelow, { widthPt: 4.5, colour: '#EAE7E5', gapPt: 8 }, 'over a 6 px warm rule')
  assert.equal(profile.typography.title.weight, 900)
  assert.equal(profile.typography.label.caps, true)
  assert.equal(profile.colours.ink, '#29292A')
  assert.equal(profile.colours.tableHeader, '#EAE7E5')
  const named = publicationModel(brand, { purpose: 'report', values: { department: 'Faculty of Environment', subdepartment: 'School of Planning and Sustainability' } })
  const html = publicationHtml(ctx, named)
  assert.match(html, /\.s-Title\{[^}]*color:#977000;[^}]*border-bottom:4\.5pt solid #EAE7E5/)
  assert.match(html, /alt="[^"]*, Faculty of Environment"/, 'cover logo is the department sub-logo')
  assert.doesNotMatch(html, /s-AffiliationDepartment">Faculty of Environment/, 'the department is not repeated as text')
  assert.match(html, /s-AffiliationSubdepartment">School of Planning and Sustainability/)
  const plain = publicationHtml(ctx, publicationModel(brand, { purpose: 'report' }))
  assert.doesNotMatch(plain, /class="affiliation"/)
  let drawn
  const docx = unzipSync(await publicationDocx(ctx, named, { png: async svg => { drawn ??= svg; return new Uint8Array([137, 80, 78, 71]) } }))
  assert.match(drawn, /aria-label="Faculty of Environment"/)
  const styles = strFromU8(docx['word/styles.xml'])
  assert.match(styles, /w:styleId="Title"[\s\S]*?w:color w:val="977000"/)
  assert.doesNotMatch(strFromU8(docx['word/document.xml']), />Faculty of Environment</)
})

test('UNBC web page follows www.unbc.ca and carries the department sub-logo', async () => {
  const html = webPage(ctx, { department: 'School of Business', fontUrl: file => `fonts:${file}` })
  assert.match(html, /<h1>School of Business<\/h1>/, 'the department titles the page')
  assert.match(html, /--unbc-title:#977000;--unbc-rule:#EAE7E5/, 'tokens from www.unbc.ca')
  assert.match(html, /\.unbc-title h1\{[^}]*color:var\(--unbc-title\);[^}]*border-bottom:6px solid var\(--unbc-rule\)/)
  assert.match(html, /--unbc-masthead-from:#035642;--unbc-masthead-to:#00231A/)
  assert.match(html, /aria-label="School of Business"/, 'masthead sub-logo is set for the department')
  assert.match(html, /url\("fonts:fonts\/BCSans-Regular\.woff"\)/)
  assert.match(html, /traditional territories/)
  assert.doesNotMatch(webPage(ctx), /aria-label="School of Business"/)
  const components = webComponents(ctx, { department: 'School of Business' })
  assert.deepEqual(components.map(item => item.id), ['header', 'tabs', 'title', 'breadcrumbs', 'intro', 'button', 'aside', 'cards', 'table', 'note', 'footer', 'legal'])
  for (const component of components) {
    assert.ok(html.includes(component.html), `${component.id} is part of the page`)
    assert.ok(html.includes(component.css), `${component.id}'s styles are in the page`)
    const alone = webComponentDocument(ctx, component.id, { department: 'School of Business' })
    assert.ok(alone.includes(component.html) && alone.includes('--unbc-accent:#035642'), `${component.id} stands alone on the shared tokens`)
  }
  const { files } = await buildKit({ ...ctx, values: { department: 'School of Business' } }, { rasters: false, pdfs: false, office: false, readAsset: src => readAssetFromDisk(folder, src) })
  const page = strFromU8(files.get('web/page-template.html'))
  assert.match(page, /url\("\.\.\/fonts\/BCSans-Bold\.woff"\)/)
  assert.ok(files.has('fonts/BCSans-Bold.woff'), 'the page’s fonts travel with it')
  assert.match(strFromU8(files.get('web/components/components.css')), /url\("\.\.\/\.\.\/fonts\/BCSans-Regular\.woff"\)/)
  assert.match(strFromU8(files.get('web/components/header.html')), /aria-label="School of Business"/)
})

test('UNBC profile pictures come from the UNBC logo package, outlined, in both layouts', { skip: !existsSync(logoPackage) && 'vendor/unbc-logo is not checked out' }, async () => {
  const { loadExtension } = await import('../src/extensions/index.js')
  const { profilePictures } = await loadExtension(brand)
  assert.deepEqual(profilePictures.shapes.map(shape => shape.id), ['square', 'circle'])
  assert.equal(profilePictures.caption('Faculty of Environment'), 'Environment', 'faculties drop “Faculty of”')
  for (const shape of ['square', 'circle']) {
    const svg = profilePictures.render(ctx, { name: 'School of Engineering', shape })
    assert.doesNotMatch(svg, /<text\b/, `${shape}: caption is outlined`)
    assert.match(svg, /aria-label="School of/)
  }
  assert.deepEqual(profilePictures.clipped('School of Engineering', 'circle'), [])
  assert.equal(await loadExtension(JSON.parse(readFileSync(new URL('../brands/sparklab/brand.json', import.meta.url), 'utf8'))), null)
})
