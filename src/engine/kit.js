// The complete brand kit, as a list of files and how to make each one.
//
// planKit() describes the kit without drawing anything, so an interface can show what a download
// will contain before doing the work. buildKit() makes the files. Vector and text files are made
// by the engine alone; images and PDFs need a `renderer` (src/export/render.js in a browser), and
// supplied files (fonts, licences, documentation) need `readAsset`. Without either, those entries
// are skipped and the rest of the kit is still built: that is how the Node CLI runs. Office
// documents (Word, PowerPoint, an HTML signature) draw their artwork as images, so they need the
// renderer too.

import { hasWebPage, webComponentDocument, webComponents, webPage, webStylesheet } from './webpage.js'
import { logoDocument, pattern, icon, symbolDocument } from './artwork.js'
import { fill, logoOptions, paintOptions } from './brand.js'
import { guidePages, guideSheets } from './guide.js'
import { physicalSize, renderTemplate } from './templates.js'
import { additionsOf, changesArtwork, findRevision, revisionReadme, revisionsOf, withRevision } from './revisions.js'
import { officeFile } from '../export/office.js'
import { publicationHtml } from '../export/publication.js'
import { documentProfile, publicationModel, documentationDocumentsFor, documentationMarkdown } from './documentation.js'
import { consumerProfile } from './consumer.js'
import { assetRecord } from './catalog.js'
import { inPack } from './packs.js'
import { readBrandAsset } from '../assets.js'
import { appIconSvg, brandCss, coloursJson, faviconSvg, gimpPalette, indexHtml, landingHtml, reactComponent, tokens } from './web.js'

export const GROUPS = ['Logos', 'Symbols', 'Templates', 'Office documents', 'Patterns', 'Supporting icons', 'Web assets', 'Guidelines', 'Motion', 'Revisions', 'Fonts', 'Build sources', 'References', 'Package files']

const GROUP_BY_FOLDER = { logos: 'Logos', symbol: 'Symbols', templates: 'Templates', documents: 'Office documents', patterns: 'Patterns', icons: 'Supporting icons', web: 'Web assets', guidelines: 'Guidelines', motion: 'Motion', fonts: 'Fonts', source: 'Build sources', reference: 'References', revisions: 'Revisions' }
export const groupOf = (path) => (path.includes('/') ? GROUP_BY_FOLDER[path.split('/')[0]] ?? 'Package files' : 'Package files')

const LAYOUTS = ['horizontal', 'stacked', 'wordmark']
const FAVICON_SIZES = [16, 24, 32, 48, 64, 128, 256]

const json = (value) => `${JSON.stringify(value, null, 2)}\n`

const SOURCE_README = (brand) => `# Rebuilding this kit

\`brand.json\` is the whole identity: colours, the symbol's geometry, the wordmark outlines, lockup
proportions, typography, every template and every guide page. Every other file in this kit is
generated from it by [brandkit](https://github.com/ahzs645/brandkit).

To change the identity, edit \`brand.json\` and regenerate:

- **In a browser:** open brandkit, choose *Open brand…*, and select this \`brand.json\` (with this
  kit's \`fonts/\` folder, or the whole kit as a zip). *Download kit* rebuilds every file, images
  and PDFs included.
- **From a terminal:** \`npx brandkit build path/to/brand.json --out ${brand.id}-kit\` writes the
  vector and text files (images and PDFs are made in the browser).

Keep a copy of an approved identity before changing it.
`

/**
 * Every file in the kit. Each entry is `{ path, group, kind, ... }`:
 *   kind 'text'   make(ctx) returns a string
 *   kind 'png'    svg(ctx) returns the SVG to rasterise at `width` pixels
 *   kind 'pdf'    pages(ctx) returns [{ svg, width, height, unit }], `title` for the metadata
 *   kind 'ico'    sizes: the favicon PNGs to pack
 *   kind 'asset'  src: a path in the brand's folder, copied as is
 *   kind 'index'  index.html and the asset catalog, made last from the finished list
 */
export const planKit = (brand, { rasters = true, pdfs = true, assets = true, office = true, documentation = true, pack = 'complete' } = {}) => {
  const entries = []
  const add = (entry) => entries.push({ group: groupOf(entry.path), ...entry })
  const svgEntry = (path, make, metadata = {}) => add({ path, kind: 'text', make, ...metadata })
  const id = brand.id
  const colourKey = (key) => (key === 'currentColor' ? 'currentcolor' : key)
  const logoColours = brand.logoColours ?? ['black']
  const rasterColours = brand.rasterColours ?? logoColours.filter((key) => key !== 'currentColor')

  // Logos: every family in every layout and colour, or every signature in every colourway.
  for (const logo of logoOptions(brand)) {
    for (const paint of paintOptions(brand)) {
      const stem = `${logo.key}-${paint.id}`
      const make = (ctx) => logoDocument(ctx, { ...logo, colourKey: paint.colour, colour: paint.colour === 'currentColor' || logo.signature ? paint.colour : undefined, colourway: paint.colourway })
      svgEntry(`logos/outlined/${stem}.svg`, make)
      if (!paint.raster) continue
      if (rasters) for (const width of logo.layout === 'stacked' || logo.layout?.startsWith('wordmark') ? [1024] : [1024, 2048]) add({ path: `logos/png/${stem}-${width}.png`, kind: 'png', width, svg: make })
      if (pdfs) add({ path: `logos/pdf/${stem}.pdf`, kind: 'pdf', pages: (ctx) => [pageOf(make(ctx))] })
    }
  }
  // Departmental signatures: each ministry or division set in each departmental signature.
  if (brand.departments?.items?.length) {
    const departmental = (brand.signatures ?? []).filter((entry) => entry.departmental)
    const ways = brand.departments.colourways ?? [Object.keys(brand.colourways ?? {})[0]]
    for (const item of brand.departments.items) {
      for (const signature of departmental) {
        for (const colourway of ways) {
          svgEntry(`logos/${brand.departments.folder ?? 'departments'}/${item.id}/${signature.id}-${colourway}.svg`, (ctx) => logoDocument(ctx, { signature: signature.id, colourway, values: { ...item.values } }))
        }
      }
    }
  }
  for (const [mode, spec] of Object.entries(brand.wordmark?.editable ?? {})) {
    svgEntry(`logos/editable-text/${spec.family ?? brand.families[0].id}-${mode}.svg`, (ctx) => logoDocument(ctx, { family: spec.family ?? brand.families[0].id, layout: 'horizontal', mode, colourKey: brand.rasterColours?.[0] ?? 'black' }))
  }

  // Symbol, and any further symbols (BC Hydro's Gas Operations flame).
  if (brand.logoPolicy?.standaloneSymbol !== false) {
  for (const key of logoColours) svgEntry(`symbol/${id}-symbol-${colourKey(key)}.svg`, (ctx) => symbolDocument(ctx, { colourKey: key }))
  for (const symbolId of Object.keys(brand.symbols ?? {})) {
    for (const paint of paintOptions(brand).filter((entry) => entry.colourway)) {
      svgEntry(`symbol/${id}-symbol-${symbolId}-${paint.id}.svg`, (ctx) => symbolDocument(ctx, { symbolId, colourway: paint.colourway }))
    }
    if (!brand.colourways) for (const key of logoColours) svgEntry(`symbol/${id}-symbol-${symbolId}-${colourKey(key)}.svg`, (ctx) => symbolDocument(ctx, { symbolId, colourKey: key }))
  }
  svgEntry(`symbol/${id}-symbol-master.svg`, (ctx) => symbolDocument(ctx, { master: true }))
  if (brand.symbol.microRadius != null || brand.symbol.microPaths || brand.symbol.microMarkup) svgEntry(`symbol/${id}-symbol-micro.svg`, (ctx) => symbolDocument(ctx, { micro: true }))
  for (const key of rasterColours) {
    const make = (ctx) => symbolDocument(ctx, { colourKey: key })
    if (rasters) for (const width of [256, 512, 1024]) add({ path: `symbol/${id}-symbol-${key}-${width}.png`, kind: 'png', width, svg: make })
    if (pdfs) add({ path: `symbol/pdf/${id}-symbol-${key}.pdf`, kind: 'pdf', pages: (ctx) => [pageOf(make(ctx))] })
  }
  }

  // Patterns and icons.
  for (const spec of brand.patterns ?? []) {
    const make = (ctx) => pattern(ctx, spec)
    svgEntry(`patterns/${spec.id}.svg`, make)
    if (rasters) add({ path: `patterns/png/${spec.id}.png`, kind: 'png', width: spec.width, svg: make })
  }
  for (const item of brand.icons?.items ?? []) {
    const make = (ctx) => icon(ctx, item)
    svgEntry(`icons/${item.id}.svg`, make)
    if (rasters) add({ path: `icons/png/${item.id}.png`, kind: 'png', width: 128, svg: make })
  }

  // Templates: the SVGs keep live text; their images and PDFs are outlined.
  const presentationLayouts = new Set((brand.documents ?? []).filter((document) => document.format === 'pptx').flatMap((document) => document.layouts ?? []))
  for (const template of brand.templates ?? []) {
    const metadata = { templateId: template.id, presentation: presentationLayouts.has(template.id) }
    svgEntry(`templates/${template.id}.svg`, (ctx) => renderTemplate(ctx, template).svg, metadata)
    const outlined = (ctx) => renderTemplate({ ...ctx, outline: true }, template)
    if (rasters) add({ path: `templates/png/${template.id}.png`, kind: 'png', width: template.raster ?? Math.min(2400, template.width), svg: (ctx) => outlined(ctx).svg, ...metadata })
    if (pdfs) add({ path: `templates/pdf/${template.id}.pdf`, kind: 'pdf', pages: (ctx) => { const rendered = outlined(ctx); return [{ svg: rendered.svg, ...physicalSize(rendered) }] }, ...metadata })
  }

  // Sets: every variant of one thing in one PDF, a page each (a card's fronts and back).
  if (pdfs) {
    for (const set of brand.sets ?? []) {
      const members = set.variants.map((variant) => (brand.templates ?? []).find((template) => template.id === variant.template)).filter(Boolean)
      if (members.length > 1) add({ path: `templates/pdf/sets/${set.id}.pdf`, kind: 'pdf', title: `{name} ${set.label}`, pages: (ctx) => members.map((template) => { const rendered = renderTemplate({ ...ctx, outline: true }, template); return { svg: rendered.svg, ...physicalSize(rendered) } }) })
    }
  }

  // Office documents: Word and PowerPoint templates, an HTML email signature with its image.
  if (office) {
    for (const document of [...(brand.documents ?? []), ...(documentation ? documentationDocumentsFor(brand) : [])]) {
      const path = `documents/${id}-${document.id}.${document.format}`
      add({ path, kind: 'office', document })
    }
  }

  if (documentation) {
    // Word users need one convenient logo image even when the bulk PNG collection is off.
    // The filename and geometry come from the same preferred logo as the document profile.
    if (pack === 'documents' && office && !rasters) {
      const preferred = documentProfile(brand).logo
      add({ path: preferred.assets.png, kind: 'png', width: 2048,
        svg: (ctx) => logoDocument({ ...ctx, outline: true }, preferred.options) })
    }
    for (const paper of ['letter', 'a4']) {
      add({ path: `source/document-profile-${paper}.json`, kind: 'text', make: ({ brand }) => json(documentProfile(brand, { paper })) })
    }
    add({ path: 'source/consumer-profile.json', kind: 'text', make: (ctx) => json(consumerProfile(ctx)) })
    add({ path: 'guidelines/documentation.md', kind: 'text', make: ({ brand }) => documentationMarkdown(brand) })
    for (const document of documentationDocumentsFor(brand).filter((item) => item.publication)) {
      const model = (ctx) => publicationModel(ctx.brand, { paper: document.paper, purpose: document.purpose, values: ctx.values })
      add({ path: `documents/${id}-${document.id}.json`, kind: 'text', document, make: (ctx) => json(model(ctx)) })
      add({ path: `documents/${id}-${document.id}.html`, kind: 'text', document, make: (ctx) => publicationHtml(ctx, model(ctx)) })
    }
  }

  // Guide pages, sheets and their PDFs.
  const pages = (ctx) => guidePages(ctx)
  const sheets = (ctx) => guideSheets(ctx)
  for (const page of guidePages({ brand })) {
    svgEntry(`guidelines/${page.id}.svg`, (ctx) => pages(ctx).find((entry) => entry.id === page.id).render())
    if (rasters) add({ path: `guidelines/png/${page.id}.png`, kind: 'png', width: page.width, svg: (ctx) => pages(ctx).find((entry) => entry.id === page.id).render() })
  }
  for (const sheet of guideSheets({ brand })) {
    const make = (ctx) => sheets(ctx).find((entry) => entry.id === sheet.id).render()
    // A sheet may say where it goes (a revision's comparison lives with the revision).
    svgEntry(`${sheet.path ?? `guidelines/${sheet.id}`}.svg`, make)
    if (rasters) add({ path: sheet.path ? `${sheet.path}.png` : sheet.group === 'overview' ? `guidelines/${sheet.id}.png` : `guidelines/png/${sheet.id}.png`, kind: 'png', width: sheet.width, svg: make })
    if (pdfs && brand.guide.sheets.find(item => item.id === sheet.id)?.pdf) add({ path: `${sheet.path ?? `guidelines/${sheet.id}`}.pdf`, kind: 'pdf', title: sheet.title, pages: ctx => [pageOf(make(ctx))] })
  }
  if (pdfs && brand.guide?.pages?.length) {
    add({ path: `guidelines/${id}-brand-guide.pdf`, kind: 'pdf', title: brand.guide.pdfTitle ?? '{name} brand guide', pages: (ctx) => pages(ctx).map((page) => pageOf(page.render())) })
  }
  const logoSheets = (brand.guide?.sheets ?? []).filter((sheet) => sheet.group === 'logo-sheets')
  if (pdfs && logoSheets.length) {
    add({ path: `logos/${id}-logo-sheets.pdf`, kind: 'pdf', title: brand.guide.sheetsPdfTitle ?? '{name} logo sheets', pages: (ctx) => sheets(ctx).filter((sheet) => sheet.group === 'logo-sheets').map((sheet) => pageOf(sheet.render())) })
  }
  add({ path: 'guidelines/COLOURS.json', kind: 'text', make: (ctx) => json(coloursJson(ctx)) })
  add({ path: `guidelines/${id}-palette.gpl`, kind: 'text', make: gimpPalette })

  // Web.
  if (brand.web?.icons !== false) {
    svgEntry('web/app-icon.svg', appIconSvg)
    svgEntry('web/favicon.svg', faviconSvg)
  }
  add({ path: 'web/brand.css', kind: 'text', make: brandCss })
  add({ path: 'web/tokens.json', kind: 'text', make: (ctx) => json(tokens(ctx)) })
  add({ path: `web/${brand.web?.componentName ?? 'BrandLogo'}.tsx`, kind: 'text', make: reactComponent })
  add({ path: 'web/landing-template.html', kind: 'text', make: landingHtml })
  // The brand's own page anatomy, set for the department chosen in the kit (fonts from ../fonts).
  if (hasWebPage(brand)) {
    const department = (ctx) => ctx.values?.[brand.departments?.field ?? 'department'] ?? ''
    add({ path: 'web/page-template.html', kind: 'text', make: (ctx) => webPage(ctx, { department: department(ctx) }) })
    // Each component on its own, and one stylesheet for them all, for a site that takes a part.
    add({ path: 'web/components/components.css', kind: 'text', make: (ctx) => webStylesheet(ctx, { fontUrl: (file) => `../../${file}` }) })
    for (const { id } of webComponents({ brand })) add({ path: `web/components/${id}.html`, kind: 'text', make: (ctx) => webComponentDocument(ctx, id, { department: department(ctx), fontUrl: (file) => `../../${file}` }) })
  }
  if (rasters && brand.web?.icons !== false) {
    for (const size of [512, 1024]) add({ path: `web/app-icon-${size}.png`, kind: 'png', width: size, svg: appIconSvg })
    add({ path: 'web/apple-touch-icon.png', kind: 'png', width: 180, svg: appIconSvg })
    for (const size of FAVICON_SIZES) add({ path: `web/favicon-${size}.png`, kind: 'png', width: size, svg: faviconSvg })
    add({ path: 'web/favicon.ico', kind: 'ico', sizes: FAVICON_SIZES.map((size) => `web/favicon-${size}.png`) })
  }

  // Revisions: each proposal's artwork beside the approved files, and its definition, so it can
  // be opened and built as a kit of its own. A revised brand does not nest its siblings again.
  if (!brand.revision) {
    for (const revision of revisionsOf(brand)) {
      const folder = `revisions/${revision.id}`
      const revised = (ctx) => ({ ...ctx, brand: withRevision(ctx.brand, revision.id) })
      add({ path: `${folder}/brand.json`, kind: 'text', make: (ctx) => json(withRevision(ctx.brand, revision.id)) })
      add({ path: `${folder}/README.md`, kind: 'text', make: (ctx) => revisionReadme(ctx.brand, findRevision(ctx.brand, revision.id)) })
      // A revision that only adds (templates, patterns, a motion library) carries what it adds, as
      // vector and text files; the logos and symbol it would leave unchanged are not copied again.
      if (!changesArtwork(revision)) {
        const added = additionsOf(revision)
        for (const spec of added.patterns) svgEntry(`${folder}/patterns/${spec.id}.svg`, (ctx) => pattern(revised(ctx), spec))
        for (const template of added.templates) svgEntry(`${folder}/templates/${template.id}.svg`, (ctx) => renderTemplate(revised(ctx), template).svg)
        for (const item of added.icons) svgEntry(`${folder}/icons/${item.id}.svg`, (ctx) => icon(revised(ctx), item))
        if (assets) for (const file of added.files) add({ path: `${folder}/${file.to ?? file}`, kind: 'asset', src: file.from ?? file })
        continue
      }
      for (const logo of logoOptions(brand)) {
        for (const paint of paintOptions(brand)) {
          const make = (ctx) => logoDocument(revised(ctx), { ...logo, colourKey: paint.colour, colour: paint.colour === 'currentColor' || logo.signature ? paint.colour : undefined, colourway: paint.colourway })
          svgEntry(`${folder}/logos/${logo.key}-${paint.id}.svg`, make)
          if (rasters && logo.layout !== 'stacked' && logo.layout !== 'wordmark' && paint.raster) add({ path: `${folder}/logos/png/${logo.key}-${paint.id}-2048.png`, kind: 'png', width: 2048, svg: make })
        }
      }
      if (brand.logoPolicy?.standaloneSymbol !== false) {
        for (const key of logoColours) svgEntry(`${folder}/symbol/${id}-symbol-${colourKey(key)}.svg`, (ctx) => symbolDocument(revised(ctx), { colourKey: key }))
        if (brand.symbol.microRadius != null || brand.symbol.microPaths) svgEntry(`${folder}/symbol/${id}-symbol-micro.svg`, (ctx) => symbolDocument(revised(ctx), { micro: true }))
      }
    }
  }

  // Supplied files, the definition itself, and the front page.
  if (assets) for (const file of brand.files ?? []) add({ path: file.to ?? file, kind: 'asset', src: file.from ?? file,
    identityReference: Boolean(brand.logoPolicy && /^(reference\/|official-templates\/)/.test(file.to ?? file)) })
  add({ path: 'source/brand.json', kind: 'text', make: (ctx) => json(ctx.brand) })
  add({ path: 'source/README.md', kind: 'text', make: (ctx) => SOURCE_README(ctx.brand) })
  add({ path: 'web/asset-catalog.json', kind: 'index' })
  add({ path: 'index.html', kind: 'index' })
  return entries.filter((entry) => inPack(entry, pack))
}

const pageOf = (svg) => {
  const match = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)
  return { svg, width: Number(match[1]) * 0.75, height: Number(match[2]) * 0.75, unit: 'pt' }
}

const encoder = new TextEncoder()

/**
 * Makes the kit. Returns a Map of path → Uint8Array.
 *
 * @param {object} ctx  `{ brand, fonts }`
 * @param {object} options
 * @param {object} [options.renderer]   `{ png(svg, width), pdf(pages, meta), ico(pngs) }`
 * @param {(src: string) => Promise<ArrayBuffer|Uint8Array>} [options.readAsset]
 * @param {(done: number, total: number, path: string) => void} [options.onProgress]
 * @param {(entry) => boolean} [options.filter]
 */
export const buildKit = async (ctx, { renderer, readAsset, onProgress, filter, sourceRevision, ...planOptions } = {}) => {
  const plan = planKit(ctx.brand, { rasters: Boolean(renderer?.png), pdfs: Boolean(renderer?.pdf), office: Boolean(renderer?.png), assets: Boolean(readAsset || ctx.brand.assets), ...planOptions })
    .filter((entry) => !filter || entry.kind === 'index' || filter(entry))
  const files = new Map()
  const skipped = []
  let done = 0
  for (const entry of plan) {
    onProgress?.(done, plan.length, entry.path)
    try {
      switch (entry.kind) {
        case 'text': files.set(entry.path, encoder.encode(entry.make(ctx))); break
        case 'png': files.set(entry.path, await renderer.png(entry.svg(ctx), entry.width)); break
        case 'pdf': files.set(entry.path, await renderer.pdf(entry.pages(ctx), { title: fill(ctx.brand, entry.title ?? entry.path.split('/').pop()), author: ctx.brand.name })); break
        case 'ico': files.set(entry.path, await renderer.ico(entry.sizes.map((path) => files.get(path)).filter(Boolean), entry.sizes.map((path) => Number(/-(\d+)\.png$/.exec(path)[1])))); break
        case 'asset': files.set(entry.path, new Uint8Array(await readBrandAsset(ctx.brand, entry.src, readAsset))); break
        case 'office': {
          const file = await officeFile(ctx, entry.document, { png: renderer.png })
          files.set(entry.path, file.bytes)
          if (file.png) files.set(entry.path.replace(/\.html$/, '.png'), file.png)
          break
        }
        default: break
      }
    } catch (error) {
      skipped.push({ path: entry.path, error })
    }
    done += 1
  }
  const planned = new Map(plan.map((entry) => [entry.path, entry]))
  const records = (await Promise.all([...files].map(([path, bytes]) => assetRecord(ctx.brand, path, bytes, groupOf(path), planned.get(path)))))
    .sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.path.localeCompare(b.path))
  files.set('web/asset-catalog.json', encoder.encode(json({ schema: 'brandkit/asset-catalog/2', brand: ctx.brand.name, brandId: ctx.brand.id, version: ctx.brand.version, sourceRevision: sourceRevision ?? null, pathBase: 'Package root, one folder above this catalog', assetCount: records.length, assets: records })))
  files.set('index.html', encoder.encode(indexHtml(ctx, records)))
  onProgress?.(plan.length, plan.length, '')
  return { files, skipped }
}
