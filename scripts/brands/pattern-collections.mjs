// Install additive, rebuildable pattern studies without changing established identity material.
// Run after a brand generator, or import extendBrandPatterns() just before it writes brand.json.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { validateBrand } from '../../src/engine/brand.js'
import { loadBrandFontsFromDisk } from '../../src/fonts/node.js'
import { collectionIndexPage, patternExplorerPage, patternGuidePage } from './pattern-pages.mjs'
import { updateManifest } from './common.mjs'

export const BRAND_IDS = ['ddcnorth', 'northwind', 'firstform', 'overtheedge', 'bc-hydro-1983', 'bc-province-1977']
export const EXTENSION = 'pattern-explorations'
const root = new URL('../../', import.meta.url).pathname
const keepOriginal = values => (values ?? []).filter(item => item.extension !== EXTENSION)

export const collectionFor = id => import(new URL(`./patterns/${id}.mjs`, import.meta.url))

const applicationTemplate = (brand, app) => {
  const square = app.layout === 'square'
  const width = square ? 1080 : 1920, height = 1080
  const pad = square ? 64 : 96, fieldX = square ? 0 : 1200, fieldY = square ? 176 : 0
  const logo = brand.families?.length
    ? { family: brand.families[0].id, layout: 'horizontal', colour: 'ink' }
    : { signature: brand.id === 'bc-province-1977' ? 'horizontal' : 'standard', colourway: 'positive', values: { ministry: '', 'ministry-split': '', address: '' } }
  const display = brand.fonts.display ? 'display' : 'bold', regular = brand.fonts.displayRegular ? 'displayRegular' : 'body'
  // Province's complete provincial signature is deliberately larger than the other headers.
  const logoWidth = brand.id === 'bc-province-1977' ? square ? 500 : 620 : square ? 340 : 440
  const sourceNote = brand.manuals ? 'New supporting study; sources describe the identifying artwork and palette, not approval of this layout.' : 'Additional supporting study. Existing identifying artwork is preserved.'
  const sources = brand.manuals ? structuredClone(brand.guide.pages[0].sources) : undefined
  return {
    id: app.id, label: app.name, group: 'Pattern studies', extension: EXTENSION,
    title: `{name} / ${app.name}`, description: `${app.description} ${sourceNote}`,
    width, height, raster: width, ...(sources ? { sources } : {}),
    elements: [
      { type: 'background', fill: 'paper' },
      { type: 'pattern', id: 'study-pattern', pattern: app.pattern, x: fieldX, y: fieldY, width: square ? width : 720, height: square ? 420 : height, fit: 'cover' },
      { type: 'logo', id: 'study-logo', x: pad, y: square ? 46 : 64, width: logoWidth, height: square ? 100 : 120, ...logo },
      { type: 'text', text: app.eyebrow, x: pad, y: square ? 660 : 376, size: square ? 18 : 22, tracking: 1.8, font: 'label', colour: 'ink', locked: true },
      { type: 'paragraph', id: 'study-title', text: '[Your headline]', x: pad, y: square ? 768 : 516, width: square ? 952 : 1008, size: square ? 86 : 94, leading: square ? 92 : 102, maxLines: square ? 2 : 3, font: display, colour: 'ink' },
      { type: 'line', x1: pad, x2: square ? width - pad : 1104, y1: square ? 920 : 882, y2: square ? 920 : 882, stroke: 'primary', strokeWidth: 2 },
      { type: 'text', id: 'study-detail', text: square ? '[Date] · [Time] · [Details]' : '[Presenter] · [Date]', x: pad, y: square ? 972 : 942, size: square ? 25 : 30, font: regular, colour: 'ink' },
      { type: 'text', text: brand.name.toUpperCase(), x: pad, y: square ? 1030 : 1020, size: 13, font: 'label', colour: 'ink', tracking: 1.1, locked: true }
    ]
  }
}

const guideSheet = (brand, collection) => {
  const small = collection.STUDIES.length > 6, cols = small ? 4 : 3
  const cell = small ? 326 : 440, artWidth = small ? 300 : 390, artHeight = artWidth * .625
  const sources = brand.manuals ? 'New geometric studies informed by the source identity. Historical symbols and manual guidance remain unchanged.' : 'Additional supporting studies. Existing identifying artwork and identity guidance remain unchanged.'
  return {
    id: 'pattern-studies', group: 'pattern-studies', path: 'guidelines/pattern-studies', pdf: true,
    extension: EXTENSION, title: '{name} / Supporting pattern studies', width: 1440, height: 1020,
    elements: [
      { type: 'rect', x: 0, y: 0, width: 1440, height: 1020, fill: 'paper' },
      { type: 'label', text: `${brand.name} / ADDITIONAL SUPPORTING STUDIES`, x: 64, y: 64, colour: 'ink', size: 14 },
      { type: 'text', text: 'A pattern of possibilities.', x: 64, y: 152, size: 56, font: 'display', colour: 'ink' },
      { type: 'para', text: sources, x: 64, y: 205, width: 1260, size: 20, colour: 'ink', line: 1.35 },
      ...collection.STUDIES.flatMap((study, i) => [
        { type: 'nested', src: `patterns/${study.id}`, x: 64 + i % cols * cell, y: 290 + Math.floor(i / cols) * 290, width: artWidth, height: artHeight },
        { type: 'text', text: study.name, x: 64 + i % cols * cell, y: 290 + Math.floor(i / cols) * 290 + artHeight + 32, size: 17, font: 'label', colour: 'ink' }
      ]),
      { type: 'para', text: 'Use one pattern family per surface. Small repeats give texture; larger fields suit covers and displays. Keep small text and the complete identifying logo on a clear ground.', x: 64, y: 914, width: 1260, size: 20, colour: 'ink', line: 1.3 },
      { type: 'label', text: 'EDITABLE SVG / PNG / PDF / POWERPOINT / OFFLINE EXPLORER', x: 64, y: 986, colour: 'ink', size: 11 }
    ]
  }
}

export const extendBrandPatterns = async (brand, folder) => {
  if (!BRAND_IDS.includes(brand.id)) return brand
  folder = folder instanceof URL ? folder.pathname : folder
  const collection = await collectionFor(brand.id)
  const additional = collection.supportingSymbols(brand)
  brand.symbols = Object.fromEntries(Object.entries(brand.symbols ?? {}).filter(([id]) => !id.startsWith('explore-')))
  Object.assign(brand.symbols, additional)
  brand.patterns = keepOriginal(brand.patterns)
  brand.templates = keepOriginal(brand.templates)
  brand.documents = keepOriginal(brand.documents)
  brand.files = keepOriginal(brand.files)
  brand.guide.sheets = keepOriginal(brand.guide.sheets)
  for (const study of collection.STUDIES) {
    const palette = collection.PALETTES.find(p => p.id === study.palette) ?? collection.PALETTES[0]
    const spec = collection.buildPattern(brand, study.id, { scale: 100, density: 100, palette })
    brand.patterns.push({ ...spec, id: study.id, name: study.name, description: study.description, title: `{name} / ${study.name} / supporting study`, kind: study.kind, extension: EXTENSION })
  }
  brand.templates.push(...collection.APPLICATIONS.map(app => applicationTemplate(brand, app)))
  brand.guide.sheets.push(guideSheet(brand, collection))
  const slides = collection.APPLICATIONS.filter(app => app.layout === 'presentation').map(app => app.id)
  if (slides.length) brand.documents.push({ id: 'pattern-studies', label: 'Pattern studies', format: 'pptx', layouts: slides, extension: EXTENSION })
  brand.files.push(...['pattern-explorer.html', 'patterns-guide.html', 'patterns-README.md'].map(file => ({ from: `docs/${file}`, to: `docs/${file}`, extension: EXTENSION })))
  brand.patternCollection = {
    page: 'docs/pattern-explorer.html', guide: 'docs/patterns-guide.html', status: 'Additional kit studies',
    patterns: collection.STUDIES.map(s => s.id), templates: collection.APPLICATIONS.map(app => app.id),
    palettes: collection.PALETTES, description: collection.INTRO
  }
  const errors = validateBrand(brand)
  if (errors.length) throw new Error(`${brand.id}: ${errors.join('\n')}`)
  const fonts = await loadBrandFontsFromDisk(brand, folder)
  if (fonts.failures.length) throw new Error(`${brand.id}: failed to load fonts ${JSON.stringify(fonts.failures)}`)
  mkdirSync(resolve(folder, 'docs'), { recursive: true })
  writeFileSync(resolve(folder, 'docs/pattern-explorer.html'), patternExplorerPage(brand, fonts, folder, collection))
  writeFileSync(resolve(folder, 'docs/patterns-guide.html'), patternGuidePage(brand, fonts, folder, collection))
  writeFileSync(resolve(folder, 'docs/patterns-README.md'), `# ${brand.name} / Supporting pattern studies\n\n${collection.INTRO}\n\n${collection.STUDIES.length} patterns, ${collection.APPLICATIONS.length} editable applications, a PowerPoint layout and a separate pattern reference sheet. Open pattern-explorer.html offline to adjust scale, density and colour, and download SVG or PNG. patterns-guide.html explains applications.\n\nThese additions carry extension \`pattern-explorations\` in brand.json. The identifying artwork, original application layouts, historical guidance and approval records remain unchanged. Rebuild with the brand's existing generator, or npm run make:patterns.\n\n${collection.STUDIES.map(s => `- **${s.name}**: ${s.description}`).join('\n')}\n`)
  return brand
}

export const installCollections = async (ids = BRAND_IDS) => {
  for (const id of ids) {
    const folder = resolve(root, 'brands', id)
    const brand = JSON.parse(readFileSync(resolve(folder, 'brand.json'), 'utf8'))
    await extendBrandPatterns(brand, folder)
    writeFileSync(resolve(folder, 'brand.json'), `${JSON.stringify(brand, null, brand.manuals ? 1 : 2)}\n`)
    updateManifest(brand)
    console.log(`${id}: ${brand.patternCollection.patterns.length} pattern studies, ${brand.patternCollection.templates.length} applications`)
  }
  writeCollectionIndex()
}

export const writeCollectionIndex = ({ embedded = false, output = resolve(root, 'brands/patterns.html') } = {}) => {
  const selected = {
    ddcnorth: ['explore-turning-groups', 'explore-resolution'],
    northwind: ['explore-ring-lattice', 'explore-north-current'],
    firstform: ['explore-form-contours', 'explore-mixed-assemblies'],
    overtheedge: ['explore-column-rhythm', 'explore-double-impression'],
    'bc-hydro-1983': ['explore-current-bands', 'explore-ring-cadence'],
    'bc-province-1977': ['explore-dogwood-repeat', 'explore-petal-mosaic']
  }
  const entries = BRAND_IDS.map(id => {
    const folder = resolve(root, 'brands', id), brand = JSON.parse(readFileSync(resolve(folder, 'brand.json'), 'utf8'))
    return { brand, selected: selected[id], ...(embedded ? { html: readFileSync(resolve(folder, 'docs/pattern-explorer.html'), 'utf8') } : {}) }
  }).filter(entry => entry.brand.patternCollection)
  mkdirSync(resolve(output, '..'), { recursive: true })
  writeFileSync(output, collectionIndexPage(entries, embedded))
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await installCollections(process.argv.slice(2).length ? process.argv.slice(2) : BRAND_IDS)
