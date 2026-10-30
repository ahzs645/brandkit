// Rebuild the full source/reconstruction audit after changing the BC Hydro brand.
//
//   python3 scripts/import-bc-hydro-scan.py /path/to/original-manual.pdf
//   node scripts/audit-bc-hydro.mjs [--baseline /path/to/baseline-brand.json]
//
// The report is self-contained: original scan images, rebuilt manual SVGs (including their
// embedded fonts), current template SVGs and optional pre-revision previews travel with it.
// Presence counts are inventory checks, never pixel-fidelity or official-master claims.

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { renderTemplate } from '../src/engine/templates.js'
import { GUIDE_BOOKS } from '../manuals/bc/books.js'
import { cleanSvgPreview } from './lib/svg-clean-preview.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const folder = join(root, 'brands/bc-hydro-1983')
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))
const sha = (data) => createHash('sha256').update(data).digest('hex')
const baselineInventory = readJson(join(folder, 'reference/manual-audit-baseline.json'))
const source = readJson(join(folder, 'reference/manual-source.json'))
const brand = readJson(join(folder, 'brand.json'))
const manual = GUIDE_BOOKS.find((book) => book.id === 'hydro')
const baselineCommit = 'e470434'
const baselineArgument = process.argv.indexOf('--baseline')
let baselineBrand = null
if (baselineArgument !== -1) baselineBrand = readJson(resolve(process.argv[baselineArgument + 1]))
else {
  try { baselineBrand = JSON.parse(execFileSync('git', ['show', `${baselineCommit}:brands/bc-hydro-1983/brand.json`], { cwd: root, maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()) }
  catch { /* The checked-in baseline inventory still works in a shallow/source-only checkout. */ }
}
if (source.pages.length !== 48 || baselineInventory.coverage.pages.length !== 48) throw new Error('The source and baseline inventories must each contain all 48 pages.')
const sourceIds = new Set(source.pages.map((page) => page.id))
if (sourceIds.size !== 48) throw new Error('Source page IDs must be unique.')

const fonts = await loadBrandFontsFromDisk(brand, folder)
if (fonts.failures.length) throw new Error(`Current fonts failed to load: ${JSON.stringify(fonts.failures)}`)
const baselineFonts = baselineBrand ? await loadBrandFontsFromDisk(baselineBrand, folder) : null
const sourcesFor = (item) => [...new Set((item.sources ?? []).filter((entry) => entry.book === 'hydro').map((entry) => entry.page))]
const assetData = (relative) => {
  const path = join(folder, relative)
  const mime = /\.webp$/i.test(relative) ? 'image/webp' : /\.png$/i.test(relative) ? 'image/png' : 'image/svg+xml'
  return `data:${mime};base64,${readFileSync(path).toString('base64')}`
}
const templateAssets = {}
const templateResults = brand.templates.map((template) => {
  for (const page of sourcesFor(template)) if (!sourceIds.has(page)) throw new Error(`${template.id} cites missing manual page ${page}.`)
  const current = renderTemplate({ brand, fonts, outline: true }, template).svg
  const beforeTemplate = baselineBrand?.templates.find((entry) => entry.id === template.id)
  const before = beforeTemplate ? renderTemplate({ brand: baselineBrand, fonts: baselineFonts, outline: true }, beforeTemplate).svg : null
  const currentPreview = cleanSvgPreview(current)
  const baselinePreview = before ? cleanSvgPreview(before) : null
  const changed = before ? baselinePreview !== currentPreview : true
  const reference = source.templateReferences.find((entry) => entry.template === template.id)
  const registeredReference = template.reference?.src ?? reference?.file
  templateAssets[template.id] = {
    current,
    before: before && changed ? before : null,
    rules: template.guides?.elements?.length ? renderTemplate({ brand, fonts, outline: true, showLayoutGuides: true }, template).svg : null,
    reference: registeredReference && existsSync(join(folder, registeredReference)) ? assetData(registeredReference) : null
  }
  return {
    id: template.id, label: template.label ?? template.id, title: template.title ?? template.label ?? template.id,
    group: template.group ?? 'Templates', description: template.description ?? '',
    sourcePages: sourcesFor(template), width: template.width, height: template.height,
    physical: template.physical ?? null, hasRules: Boolean(template.guides?.elements?.length),
    hasRegisteredScan: Boolean(templateAssets[template.id].reference),
    referenceNote: template.reference?.note ?? reference?.note ?? '',
    referenceLabel: template.reference?.label ?? (reference ? `Original scan · printed p. ${reference.printedPage} / PDF p. ${reference.pdfPage}` : ''),
    referenceAlignment: template.reference?.alignment ?? null,
    fidelity: template.fidelity ?? { status: 'reconstruction', label: 'Historical reconstruction', note: 'Presence of an editable example does not establish exact fidelity to the original page or to an official production master.' },
    change: !beforeTemplate ? 'new-example' : changed ? 'updated-preview' : 'unchanged-preview',
    currentSvgSha256: sha(current), baselineSvgSha256: before ? sha(before) : null,
    currentCleanPreviewSha256: sha(currentPreview), baselineCleanPreviewSha256: baselinePreview ? sha(baselinePreview) : null
  }
})

const STATUS = {
  'editable-example': 'Editable example represented',
  'partial-example': 'Editable example with limitations',
  'guidance-represented': 'Guidance represented',
  'reference-only': 'Source reference',
  'application-gap': 'Editable application still missing'
}
const pageAssets = {}
const pages = baselineInventory.coverage.pages.map((baseline) => {
  const original = source.pages.find((page) => page.id === baseline.id)
  const sourceBytes = readFileSync(join(folder, original.file))
  if (sha(sourceBytes) !== original.sha256) throw new Error(`Source image hash changed: ${original.file}`)
  const reconstructedPath = join(root, 'manuals/bc/pages/hydro', `${baseline.id}.svg`)
  if (!existsSync(reconstructedPath)) throw new Error(`Reconstructed manual page is missing: ${baseline.id}`)
  const reconstructed = readFileSync(reconstructedPath, 'utf8')
  pageAssets[baseline.id] = { original: `data:image/webp;base64,${sourceBytes.toString('base64')}`, reconstructed }
  const templates = templateResults.filter((template) => template.sourcePages.includes(baseline.id))
  const guides = (brand.guide?.pages ?? []).filter((item) => sourcesFor(item).includes(baseline.id)).map((item) => item.name ?? item.title)
  const signatures = (brand.signatures ?? []).filter((item) => sourcesFor(item).includes(baseline.id)).map((item) => item.id)
  const sections = baselineInventory.sections.filter((section) => section.pdfPages.includes(baseline.pdfPage))
  const limited = templates.some((template) => /partial|placeholder|interpret/i.test(template.fidelity.status ?? ''))
  const status = templates.length ? (limited ? 'partial-example' : 'editable-example')
    : guides.length || signatures.length ? 'guidance-represented'
      : baseline.baselineStatus === 'application-missing' ? 'application-gap' : 'reference-only'
  return {
    ...baseline, currentStatus: status, currentStatusLabel: STATUS[status],
    currentTemplates: templates.map((template) => template.id), currentGuides: guides, currentSignatures: signatures,
    hasOriginalScan: true, hasRebuiltPage: true,
    sourceImage: original.file, sourceSha256: original.sha256, reconstructedSha256: sha(reconstructed),
    reconstructedNotes: manual.pages.find((page) => page.id === baseline.id)?.notes ?? [],
    currentFindings: brand.manualAudit?.pageFindings?.[baseline.id] ?? [],
    sourceRules: sections.flatMap((section) => section.rules)
  }
})

const limitations = [...new Set([
  ...(brand.manualAudit?.limitations ?? []),
  ...baselineInventory.coverage.caveats,
  'Original scan and rebuilt manual pages are aligned to their nominal 612 × 792 point canvases. Individual pages retain scan drift and redraw differences; this is a visual comparison, not a feature-registered pixel acceptance test.',
  'The manual-page reconstruction is separate from the editable templates. A corrected template does not automatically correct the older reconstructed manual page.',
  'No whole-page similarity percentage is reported: font substitution, scan noise, source annotations and illustrative artwork prevent a defensible single score. The separate BCE crop metrics measure only those traced source masks.',
  'The separate original reproduction proofs, construction grids, large color swatches and three-dimensional production drawings referenced by the manual are not supplied.'
])]
const bceMetricsPath = join(folder, 'reference/bce-route-overlay-metrics.json')
const bceMetrics = existsSync(bceMetricsPath) ? readJson(bceMetricsPath) : null
const bceAssets = bceMetrics ? [
  { id: 'outline', title: 'Letterhead outline', svg: 'assets/bce-route-outline-black.svg', source: 'reference/bce-route-source-outline.png', overlay: 'reference/bce-route-overlay-outline.png' },
  { id: 'card', title: 'Blue card silhouette', svg: 'assets/bce-route-card-blue.svg', source: 'reference/bce-route-source-card.png', overlay: 'reference/bce-route-overlay-card.png' }
] : []
const report = {
  schema: 'brandkit/bc-hydro-manual-audit/1', date: brand.manualAudit?.checkedDate ?? '2026-10-30',
  title: brand.manualAudit?.title ?? 'BC Hydro 1983 · manual coverage and visual comparison',
  summary: brand.manualAudit?.summary ?? 'Every source page is inventoried and available for comparison. The tables distinguish source guidance, editable examples and remaining limitations; they do not certify a complete production-master reconstruction.',
  brand: brand.id, source: source.source, baselineCommit,
  brandDefinitionSha256: sha(readFileSync(join(folder, 'brand.json'))),
  baselinePreviewsAvailable: Boolean(baselineBrand),
  previewComparison: {
    method: 'svg-dom-clean-preview-v1',
    description: 'Before/current comparisons retain painted SVG content and remove the complete optional layout-guides group, title, description, metadata, root brand-version attribute, comments and nonpainted formatting whitespace. Changed-preview counts describe clean artwork changes, not added annotations or descriptive text; they are not pixel-similarity scores.'
  },
  counts: { sourcePages: pages.length, rebuiltPages: pages.length, editableTemplates: templateResults.length,
    templatesWithLayoutRules: templateResults.filter((template) => template.hasRules).length,
    templatesWithRegisteredScans: templateResults.filter((template) => template.hasRegisteredScan).length,
    newTemplates: templateResults.filter((template) => template.change === 'new-example').length,
    updatedPreviews: templateResults.filter((template) => template.change === 'updated-preview').length,
    applicationGaps: pages.filter((page) => page.currentStatus === 'application-gap').length },
  limitations, automaticChecks: ['All 48 original image hashes match the import manifest.', 'All 48 rebuilt manual SVG files exist.', 'Every current template renders with its local brand fonts.', 'All template-to-manual page references resolve.'],
  pages, templates: templateResults, sections: baselineInventory.sections,
  minimumWidths: baselineInventory.minimumWidths, templateReferenceRegistration: source.templateReferences,
  bceRoute: bceMetrics ? { ...bceMetrics, metricsFile: 'reference/bce-route-overlay-metrics.json', provenanceFile: 'reference/bce-route-provenance.md', assets: bceAssets } : null,
  reproduction: ['python3 scripts/import-bc-hydro-scan.py /path/to/original-manual.pdf', 'node scripts/audit-bc-hydro.mjs'],
  files: { html: 'docs/manual-audit.html', json: 'docs/manual-audit.json', markdown: 'docs/manual-audit.md', sourceManifest: 'reference/manual-source.json', baselineInventory: 'reference/manual-audit-baseline.json' }
}

const escape = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const md = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')
const pageName = (page) => `${page.id} · PDF ${page.pdfPage} · ${page.printedPage == null ? 'cover' : `printed ${page.printedPage}`}`
const packed = gzipSync(JSON.stringify({ report, pageAssets, templateAssets }), { level: 9 }).toString('base64')
const inventoryRows = pages.map((page) => `<tr><td><button type="button" data-page="${page.id}">${page.id}</button><small>PDF ${page.pdfPage} / ${page.printedPage == null ? 'cover' : `p. ${page.printedPage}`}</small></td><td>${escape(page.title)}</td><td>${escape(page.currentStatusLabel)}</td><td>${page.currentTemplates.length || '—'}</td></tr>`).join('')
const bceHtml = bceMetrics ? `<section class="panel"><h2>“the BCE route” · separate locomotive artwork</h2><p>The manual retains this legacy mark where recognition of the BCE route is needed, while keeping it separate from the Rail signature. PDF page 18 shows two different forms: a black outline on the letterhead and a filled blue silhouette with white lettering on the card.</p>${bceAssets.map((asset) => `<h3>${escape(asset.title)}</h3><div class="bce-comparison"><figure><figcaption>Original native-pixel crop</figcaption><img src="${assetData(asset.source)}" alt="Original ${escape(asset.title)} source crop"></figure><figure><figcaption>Reconstructed vector paths</figcaption><img src="${assetData(asset.svg)}" alt="${escape(asset.title)} vector reconstruction"></figure><figure><figcaption>Source/vector differences · magnified</figcaption><img src="${assetData(asset.overlay)}" alt="${escape(asset.title)} ink-mask overlay"></figure></div><p><a href="${assetData(asset.svg)}" download="${asset.svg.split('/').at(-1)}">Download ${escape(asset.svg.split('/').at(-1))}</a></p>`).join('')}<div class="table-wrap"><table><thead><tr><th>Form</th><th>Ink overlap (IoU)</th><th>Vector precision</th><th>Source recall</th><th>Maximum difference distance</th></tr></thead><tbody>${bceAssets.map((asset) => { const result = bceMetrics.variants[asset.id]; return `<tr><td>${escape(asset.title)}</td><td>${(result.intersectionOverUnion * 100).toFixed(2)}%</td><td>${(result.precision * 100).toFixed(2)}%</td><td>${(result.recall * 100).toFixed(2)}%</td><td>${result.symmetricInkDistancePixels.maximum} native px</td></tr>` }).join('')}</tbody></table></div><p class="fine">Black = shared ink; cyan = source-only ink; magenta = vector-only ink. IoU is shared segmented ink divided by ink in either image. The two variants were independently traced and compared at identical native crop coordinates, with no fitted transform.</p><div class="note"><p>These scores describe agreement with the supplied scan crops. They do not certify original printing-master fidelity. The card uses the kit’s existing digital blue, not a colorimetric measurement of the aged scan.</p></div></section>` : ''
const bceMarkdown = bceMetrics ? `## “the BCE route” vectors and overlay checks\n\nThe legacy locomotive is separate from the Rail signature (PDF p. 3 / printed p. 2). The rail stationery shows a black outline on the letterhead and a blue silhouette with white lettering on the card (PDF p. 18 / printed p. 17). The two source forms were traced independently.\n\n| Form | Ink intersection over union | Vector precision | Source recall | Maximum mask distance |\n| --- | ---: | ---: | ---: | ---: |\n${bceAssets.map((asset) => { const value = bceMetrics.variants[asset.id]; return `| ${asset.title} | ${(value.intersectionOverUnion * 100).toFixed(2)}% | ${(value.precision * 100).toFixed(2)}% | ${(value.recall * 100).toFixed(2)}% | ${value.symmetricInkDistancePixels.maximum} native px |` }).join('\n')}\n\nThese are same-canvas, native-pixel comparisons with segmented scan crops. They do not certify original printing masters or whole-page fidelity. Black in the difference images indicates shared ink; cyan is source-only ink and magenta is vector-only ink.\n\n${bceAssets.map((asset) => `- ${asset.title}: \`${asset.svg}\`; difference image: \`${asset.overlay}\`.`).join('\n')}\n\nDetailed method and limits: \`reference/bce-route-provenance.md\` and \`reference/bce-route-overlay-metrics.json\`.\n\n` : ''

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(report.title)}</title>
<style>
.bce-comparison{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding:18px;background:#f4f3ee;margin:12px 0}.bce-comparison img{display:block;max-width:100%;height:120px;object-fit:contain}.bce-comparison+h3{margin-top:24px}@media(max-width:760px){.bce-comparison{grid-template-columns:1fr}.bce-comparison img{max-width:420px;width:100%;height:auto}}
:root{color-scheme:light;--ink:#172d32;--muted:#53676b;--paper:#f4f3ee;--line:#c8d3d1;--teal:#17646b;--green:#d9e5dc;--amber:#fcf2d8}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main,header,.footer{width:min(1420px,100%);margin:auto;padding:28px clamp(16px,3vw,48px)}header{padding-top:48px;padding-bottom:22px}.eyebrow{font-size:.75rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--teal)}h1{font-size:clamp(2rem,4vw,3.5rem);font-weight:650;line-height:1.1;letter-spacing:-.035em;margin:.4em 0}h2{font-size:1.5rem;line-height:1.2;margin:0 0 18px}h3{font-size:1.1rem;margin:0 0 10px}p{margin:.6em 0}a{color:var(--teal);text-underline-offset:3px}button,select,input{font:inherit}button,select{min-height:40px;border:1px solid var(--line);border-radius:7px;padding:7px 12px;background:#fff;color:var(--ink)}button{cursor:pointer}button:hover{background:var(--green)}button:disabled{opacity:.5;cursor:default}:focus-visible{outline:3px solid #e2aa2d;outline-offset:3px}button.primary{background:var(--teal);color:#fff;border-color:var(--teal)}small,.muted{color:var(--muted)}.lead{max-width:80ch;font-size:1.05rem}.stats{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:12px;margin-top:24px}.stat{border-top:3px solid var(--teal);background:#fff;padding:15px}.stat b{display:block;font-size:1.8rem;line-height:1.1}.stat span{font-size:.8rem;color:var(--muted)}.panel{border:1px solid var(--line);border-radius:12px;padding:22px;background:#fff;margin-bottom:24px}.note{background:var(--amber);padding:14px 18px;border-left:4px solid #c59b31;font-size:.9rem}.note p:first-child{margin-top:0}.note p:last-child{margin-bottom:0}.toolbar{display:flex;gap:10px 14px;align-items:center;flex-wrap:wrap;margin-bottom:14px}.toolbar label{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.toolbar select{max-width:100%;min-width:180px}#page-select{width:min(640px,100%)}input[type=range]{accent-color:var(--teal);min-width:120px;max-width:220px;flex:1}output{min-width:3.5ch;font-variant-numeric:tabular-nums}.page-title{padding:8px 0 16px;border-bottom:1px solid var(--line);margin-bottom:20px}.page-title h2{margin-bottom:8px}.badge{display:inline-block;background:var(--green);color:#244635;padding:4px 9px;border-radius:5px;font-size:.78rem}.comparison{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;background:#e9ece8;border:1px solid var(--line);padding:18px;border-radius:9px;overflow:auto;align-items:start}.comparison.paired{grid-template-columns:repeat(2,minmax(0,1fr))}figure{margin:0;min-width:0;display:grid;grid-template-columns:minmax(0,1fr);justify-items:center;gap:10px}figcaption{font-size:.85rem;font-weight:600;text-align:center}.paper{position:relative;max-width:100%;width:620px;line-height:0;box-shadow:0 3px 14px #172d3220;background:#fff}.paper img{width:100%;height:auto;display:block}.paper img.layer{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain}.paper.small{width:520px}.metadata{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin:20px 0 0}.metadata ul{padding-left:20px;margin:8px 0}.metadata p,.metadata li{font-size:.87rem;color:var(--muted)}details{border-top:1px solid var(--line);padding:13px 0}summary{cursor:pointer;font-weight:650}.template-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:15px}.template-card{border:1px solid var(--line);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px;min-width:0}.template-thumb{height:180px;background:#e9ece8;padding:10px;display:grid;place-items:center}.template-thumb img{max-width:100%;max-height:160px;width:auto;height:auto;object-fit:contain}.template-card strong{font-size:.9rem}.template-card p{font-size:.8rem;color:var(--muted);margin:0}.template-card button{margin-top:auto;font-size:.85rem}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:.86rem;text-align:left}th{background:#e9ece8}th,td{padding:10px;border-bottom:1px solid var(--line);vertical-align:top}td small{display:block;white-space:nowrap}td button{padding:3px 8px;min-height:30px;font-size:.8rem}pre{max-width:100%;overflow-x:auto;white-space:pre-wrap;overflow-wrap:anywhere}code{overflow-wrap:anywhere;font-size:.78rem}.fine{font-size:.82rem;color:var(--muted)}dialog{width:min(1200px,calc(100% - 24px));max-height:calc(100vh - 32px);border:1px solid var(--line);border-radius:12px;padding:24px;color:var(--ink)}dialog::backdrop{background:#10282db3}.dialog-head{display:flex;justify-content:space-between;align-items:start;gap:20px;margin-bottom:14px}.dialog-head button{flex:none}dialog .paper{width:640px}.registration{font-size:.85rem;padding:10px;background:#f4f3ee;border-radius:6px}.footer{border-top:1px solid var(--line);font-size:.8rem;color:var(--muted)}[hidden]{display:none!important}#load-status{padding:14px;background:var(--amber);border-radius:6px}.legend{font-size:.85rem;color:var(--muted)}@media(max-width:760px){.stats{grid-template-columns:repeat(2,1fr)}.comparison.paired,.metadata{grid-template-columns:minmax(0,1fr)}.panel{padding:14px}.toolbar{align-items:stretch}.toolbar label{width:100%}.toolbar select{width:100%;min-width:0}.comparison{padding:10px}.template-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.template-thumb{height:140px}.template-thumb img{max-height:120px}.template-card{padding:8px}dialog{padding:14px}.dialog-head{flex-wrap:wrap}}@media(max-width:420px){.template-grid{grid-template-columns:1fr}}@media print{.toolbar,dialog,#load-status{display:none!important}.panel{break-inside:avoid}.comparison.paired{grid-template-columns:1fr 1fr}.paper{box-shadow:none}header,main,.footer{padding:14px}.stats{grid-template-columns:repeat(4,1fr)}}
</style></head><body>
<header><div class="eyebrow">BC Hydro · June 1983 · historical reference</div><h1>Manual coverage<br>and visual comparison</h1><p class="lead">${escape(report.summary)}</p>
<div class="stats"><div class="stat"><b>${report.counts.sourcePages}</b><span>original pages inventoried</span></div><div class="stat"><b>${report.counts.editableTemplates}</b><span>editable examples in the kit</span></div><div class="stat"><b>${report.counts.templatesWithLayoutRules}</b><span>templates with toggleable rules</span></div><div class="stat"><b>${report.counts.templatesWithRegisteredScans}</b><span>template source comparisons</span></div></div></header>
<main><section class="panel"><h2>What this audit establishes</h2><div class="note"><p><strong>Representation and fidelity are separate questions.</strong> A template count confirms that examples exist. It does not certify their lettering, photographs, color reproduction or production dimensions against original masters.</p><p>The left/original view uses the supplied scan. The rebuilt view uses the repository’s existing manual-page SVG. Corrected editable templates are listed separately beneath each page.</p></div><details><summary>Method, limits and source provenance</summary><ul>${limitations.map((item) => `<li>${escape(item)}</li>`).join('')}</ul><p><strong>Source:</strong> ${escape(report.source.filename)} · ${escape(report.source.edition)} · ${report.source.pdfPages} PDF pages.</p><p class="fine">Source SHA-256: <code>${escape(report.source.sha256)}</code></p><p class="fine">Checked ${escape(report.date)}. Baseline inventory: commit <code>${baselineCommit}</code>. Reference pages: ${source.rendering.fullPageWidth} pixels wide, ${source.rendering.dpi} dpi. Written dimensions take precedence over scan pixels.</p><p class="fine">${escape(report.previewComparison.description)}</p><h3>Automated integrity checks</h3><ul>${report.automaticChecks.map((item) => `<li>${escape(item)}</li>`).join('')}</ul></details></section>
${bceHtml}<section class="panel" id="page-comparison"><div id="load-status" role="status">Loading the embedded source pages and vector drawings…</div><div class="toolbar"><label for="page-select">Manual page <select id="page-select" disabled>${pages.map((page) => `<option value="${page.id}">${escape(pageName(page))} · ${escape(page.title)}</option>`).join('')}</select></label><button id="previous" type="button" disabled>Previous</button><button id="next" type="button" disabled>Next</button></div><div class="toolbar"><label for="view-mode">Compare <select id="view-mode"><option value="overlay">Original + rebuilt overlay</option><option value="paired">Side by side</option><option value="original">Original scan only</option><option value="rebuilt">Rebuilt manual only</option></select></label><label id="opacity-control" for="page-opacity">Rebuilt page opacity <input id="page-opacity" type="range" min="0" max="100" value="50"><output id="page-opacity-value" for="page-opacity">50%</output></label><button id="reset-page" type="button">Reset overlay</button></div><div class="page-title"><h2 id="selected-page-title">Select a page</h2><span class="badge" id="selected-page-status"></span><p class="legend">Nominal page alignment: 612 × 792 pt. Visible offsets can come from scan drift, compatible fonts or differences in the reconstruction.</p></div><div class="comparison" id="manual-stage"></div><div class="metadata"><div><h3>Current kit coverage</h3><div id="current-findings"></div></div><details><summary>Source rules and reconstruction notes</summary><div id="page-rules"></div></details></div><details><summary>Findings before this revision</summary><div id="baseline-findings"></div></details></section>
<section class="panel"><h2>Editable examples associated with this page</h2><p class="legend">Thumbnails are rendered from the current brand definition. Open an example for its fidelity notes, dimensions, rules and available source or baseline comparison.</p><div class="template-grid" id="template-grid"></div></section>
<section class="panel"><h2>Complete page inventory</h2><p class="legend">Every original page appears once. Guidance-only pages need not have a separate template. “Editable example represented” means the page has at least one linked example; it does not mean every item on that page is reproduced.</p><div class="table-wrap"><table><thead><tr><th>Source page</th><th>Subject</th><th>Current coverage</th><th>Linked templates</th></tr></thead><tbody>${inventoryRows}</tbody></table></div></section>
<section class="panel"><h2>Repeat the audit</h2><p>The source importer verifies the original PDF’s hash, records every crop, and keeps the supplied PDF unchanged. The audit generator then reads the current <code>brand.json</code> and rebuilds this report and the machine-readable inventory.</p><pre><code>${report.reproduction.map(escape).join('\n')}</code></pre><p class="fine">Files: <code>docs/manual-audit.html</code>, <code>docs/manual-audit.json</code>, <code>docs/manual-audit.md</code>. Source registration: <code>reference/manual-source.json</code>. An optional <code>--baseline /path/to/baseline-brand.json</code> supplies before-revision previews when the baseline Git commit is unavailable.</p></section></main>
<dialog id="template-dialog" aria-labelledby="dialog-title"><div class="dialog-head"><div><h2 id="dialog-title"></h2><p id="dialog-fidelity"></p></div><button type="button" id="close-dialog">Close comparison</button></div><p id="dialog-description"></p><div class="toolbar"><label for="template-mode">Compare <select id="template-mode"></select></label><label id="template-rules-label"><input type="checkbox" id="template-rules"> Show layout rules</label><label id="template-opacity-control" for="template-opacity">Scan opacity <input type="range" id="template-opacity" min="0" max="100" value="50"><output for="template-opacity" id="template-opacity-value">50%</output></label></div><div class="comparison" id="template-stage"></div><p class="registration" id="template-registration"></p><p><a id="open-template" target="_blank" rel="noreferrer">Open editable template in Brandkit ↗</a></p></dialog>
<div class="footer">BC Hydro Graphic Standards Manual, June 1983. Original scan supplied for this audit; existing manual-page reconstructions and current editable kit are labeled separately. This historical reconstruction is not current BC Hydro guidance.</div>
<script type="application/octet-stream" id="audit-data">${packed}</script>
<script>
(async function () {
  const byId = (id) => document.getElementById(id);
  const status = byId('load-status');
  try {
    if (typeof DecompressionStream === 'undefined') throw new Error('This self-contained report needs a browser with gzip DecompressionStream support. Open it in a current Chrome, Edge, Firefox or Safari browser; the Markdown and JSON reports remain readable without JavaScript.');
    const bytes = Uint8Array.from(atob(byId('audit-data').textContent.trim()), (char) => char.charCodeAt(0));
    const data = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
    const { report, pageAssets, templateAssets } = data;
    const urls = new Map();
    const svgUrl = (key, svg) => { if (!urls.has(key)) urls.set(key, URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))); return urls.get(key); };
    const el = (tag, text, className) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
    const list = (items, fallback) => { if (!items.length) return el('p', fallback, 'muted'); const ul = el('ul'); items.forEach((item) => ul.append(el('li', item))); return ul; };
    const image = (src, alt, className) => { const img = el('img', null, className); img.src = src; img.alt = alt; img.draggable = false; return img; };
    const figure = (src, caption, alt) => { const fig = el('figure'); const paper = el('div', null, 'paper'); paper.append(image(src, alt ?? caption)); fig.append(el('figcaption', caption), paper); return { fig, paper }; };
    let selected = report.pages.find((page) => page.id === location.hash.slice(1))?.id ?? 'H26';
    let selectedTemplate = null;
    const renderPage = () => {
      const page = report.pages.find((item) => item.id === selected);
      const pageIndex = report.pages.indexOf(page);
      byId('page-select').value = selected;
      byId('previous').disabled = pageIndex === 0;
      byId('next').disabled = pageIndex === report.pages.length - 1;
      byId('selected-page-title').textContent = page.id + ' · ' + page.title;
      byId('selected-page-status').textContent = page.currentStatusLabel;
      const stage = byId('manual-stage'); stage.replaceChildren();
      const mode = byId('view-mode').value;
      stage.classList.toggle('paired', mode === 'paired');
      byId('opacity-control').hidden = mode !== 'overlay';
      const original = pageAssets[selected].original;
      const rebuilt = svgUrl('manual-' + selected, pageAssets[selected].reconstructed);
      if (mode === 'paired') stage.append(figure(original, 'Original scan · PDF ' + page.pdfPage).fig, figure(rebuilt, 'Existing rebuilt manual page').fig);
      else if (mode === 'original') stage.append(figure(original, 'Original scan · ' + (page.printedPage == null ? 'cover' : 'printed p. ' + page.printedPage)).fig);
      else if (mode === 'rebuilt') stage.append(figure(rebuilt, 'Existing rebuilt manual page').fig);
      else { const view = figure(original, 'Original scan + rebuilt page overlay'); const layer = image(rebuilt, 'Rebuilt manual overlay', 'layer'); layer.style.opacity = Number(byId('page-opacity').value) / 100; view.paper.append(layer); stage.append(view.fig); }
      byId('page-opacity-value').textContent = byId('page-opacity').value + '%';
      const coverage = [page.currentTemplates.length + ' editable example(s) linked to this page.', ...page.currentFindings];
      if (page.currentGuides.length) coverage.push('Guide sections: ' + page.currentGuides.join('; ') + '.');
      if (page.currentSignatures.length) coverage.push('Signatures: ' + page.currentSignatures.join(', ') + '.');
      byId('current-findings').replaceChildren(list(coverage, 'Source reference.'));
      byId('page-rules').replaceChildren(list([...page.sourceRules, ...page.reconstructedNotes], 'Refer to the source page.'));
      byId('baseline-findings').replaceChildren(el('p', 'Baseline status: ' + page.baselineStatus + '. These findings describe the kit before this revision.'), list(page.findings, 'No additional baseline finding recorded.'));
      const grid = byId('template-grid'); grid.replaceChildren();
      const templates = report.templates.filter((template) => page.currentTemplates.includes(template.id));
      if (!templates.length) grid.append(el('p', 'This page supplies guidance or reference material. No standalone editable example is currently linked to it.', 'muted'));
      for (const template of templates) {
        const card = el('article', null, 'template-card'); const thumb = el('div', null, 'template-thumb');
        thumb.append(image(svgUrl('template-' + template.id, templateAssets[template.id].current), template.title));
        card.append(thumb, el('strong', template.title), el('p', template.fidelity.label), el('p', [template.hasRules ? 'Layout rules' : null, template.hasRegisteredScan ? 'Original scan comparison' : null, template.change === 'new-example' ? 'Added example' : template.change === 'updated-preview' ? 'Updated from baseline' : null].filter(Boolean).join(' · ')));
        const button = el('button', 'Inspect this example'); button.type = 'button'; button.addEventListener('click', () => openTemplate(template.id)); card.append(button); grid.append(card);
      }
      history.replaceState(null, '', '#' + selected);
    };
    const renderTemplateView = () => {
      const template = report.templates.find((item) => item.id === selectedTemplate);
      const assets = templateAssets[selectedTemplate]; const mode = byId('template-mode').value;
      const useRules = byId('template-rules').checked && assets.rules;
      const current = svgUrl('template-' + selectedTemplate + (useRules ? '-rules' : ''), useRules ? assets.rules : assets.current);
      const stage = byId('template-stage'); stage.replaceChildren(); stage.classList.toggle('paired', mode === 'before');
      byId('template-opacity-control').hidden = mode !== 'scan';
      byId('template-opacity-value').textContent = byId('template-opacity').value + '%';
      if (mode === 'before' && assets.before) stage.append(figure(svgUrl('template-before-' + selectedTemplate, assets.before), 'Before revision · ' + report.baselineCommit).fig, figure(current, 'Current editable example').fig);
      else { const view = figure(current, mode === 'scan' ? 'Current template + original scan overlay' : 'Current editable example');
        if (mode === 'scan' && assets.reference) {
          const layer = image(assets.reference, template.referenceLabel || 'Original source reference', 'layer'); layer.style.opacity = Number(byId('template-opacity').value) / 100;
          const box = template.referenceAlignment;
          if (box) { layer.style.left = (100 * box.x / template.width) + '%'; layer.style.top = (100 * box.y / template.height) + '%'; layer.style.width = (100 * box.width / template.width) + '%'; layer.style.height = (100 * box.height / template.height) + '%'; }
          view.paper.append(layer);
        } stage.append(view.fig);
      }
      byId('template-registration').textContent = mode === 'scan' ? template.referenceNote : template.fidelity.note;
    };
    const openTemplate = (id) => {
      selectedTemplate = id; const template = report.templates.find((item) => item.id === id); const assets = templateAssets[id];
      byId('dialog-title').textContent = template.title;
      byId('dialog-fidelity').textContent = template.fidelity.label + (template.physical ? ' · ' + template.physical.join(' × ') : '');
      byId('dialog-description').textContent = template.description;
      const mode = byId('template-mode'); mode.replaceChildren();
      for (const [value, label] of [['current', 'Current template'], ...(assets.before ? [['before', 'Before and current']] : []), ...(assets.reference ? [['scan', 'Original scan overlay']] : [])]) { const option = el('option', label); option.value = value; mode.append(option); }
      byId('template-rules').checked = false; byId('template-rules-label').hidden = !assets.rules; byId('template-opacity').value = 50;
      byId('open-template').href = 'https://projects.ahmadjalil.com/brandkit/?brand=bc-hydro-1983&view=templates&template=' + encodeURIComponent(id);
      renderTemplateView(); byId('template-dialog').showModal();
    };
    byId('page-select').addEventListener('change', (event) => { selected = event.target.value; renderPage(); });
    byId('previous').addEventListener('click', () => { selected = report.pages[Math.max(0, report.pages.findIndex((page) => page.id === selected) - 1)].id; renderPage(); });
    byId('next').addEventListener('click', () => { selected = report.pages[Math.min(report.pages.length - 1, report.pages.findIndex((page) => page.id === selected) + 1)].id; renderPage(); });
    byId('view-mode').addEventListener('change', renderPage); byId('page-opacity').addEventListener('input', () => { byId('page-opacity-value').textContent = byId('page-opacity').value + '%'; const layer = byId('manual-stage').querySelector('.layer'); if (layer) layer.style.opacity = Number(byId('page-opacity').value) / 100; });
    byId('reset-page').addEventListener('click', () => { byId('page-opacity').value = 50; byId('view-mode').value = 'overlay'; renderPage(); });
    document.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => { selected = button.dataset.page; renderPage(); byId('page-comparison').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    byId('template-mode').addEventListener('change', renderTemplateView); byId('template-rules').addEventListener('change', renderTemplateView); byId('template-opacity').addEventListener('input', () => { byId('template-opacity-value').textContent = byId('template-opacity').value + '%'; const layer = byId('template-stage').querySelector('.layer'); if (layer) layer.style.opacity = Number(byId('template-opacity').value) / 100; }); byId('close-dialog').addEventListener('click', () => byId('template-dialog').close());
    window.addEventListener('beforeunload', () => urls.forEach((url) => URL.revokeObjectURL(url)));
    byId('page-select').disabled = false; status.hidden = true; renderPage();
  } catch (error) { status.textContent = error.message; status.setAttribute('role', 'alert'); }
})();
</script></body></html>`

const markdown = `# ${report.title}\n\nChecked ${report.date}.\n\n${report.summary}\n\n## Inventory\n\n- ${report.counts.sourcePages} original PDF pages inventoried.\n- ${report.counts.rebuiltPages} existing rebuilt manual SVG pages available for comparison.\n- ${report.counts.editableTemplates} editable examples in the current kit.\n- ${report.counts.templatesWithLayoutRules} examples with embedded, toggleable layout rules.\n- ${report.counts.templatesWithRegisteredScans} template source comparisons.\n- ${report.counts.newTemplates} added examples and ${report.counts.updatedPreviews} changed clean previews relative to ${baselineCommit}.\n\nCounts establish presence, not exactness or production readiness.\n\n## Source and method\n\n${report.previewComparison.description}\n\n${report.source.filename}, ${report.source.edition}, ${report.source.pdfPages} PDF pages (cover and printed pp. 1–47).\n\nSHA-256: \`${report.source.sha256}\`\n\nThe HTML report embeds the original scans, the existing rebuilt manual SVGs with their fonts, and current template renderings. Full manual pages use nominal 612 × 792 pt alignment; no similarity score is claimed. Template crop coordinates, dimensions and padding are in \`reference/manual-source.json\`.\n\n### Automated checks\n\n${report.automaticChecks.map((item) => `- ${item}`).join('\n')}\n\n## Limitations\n\n${limitations.map((item) => `- ${item}`).join('\n')}\n\n## All 48 pages\n\n| Source | Subject | Before revision | Current coverage | Linked editable examples |\n| --- | --- | --- | --- | --- |\n${pages.map((page) => `| ${page.id} / PDF ${page.pdfPage} / ${page.printedPage == null ? 'cover' : `p. ${page.printedPage}`} | ${md(page.title)} | ${page.baselineStatus} | ${page.currentStatusLabel} | ${page.currentTemplates.map((id) => `\`${id}\``).join(', ') || '—'} |`).join('\n')}\n\n## Page findings and rules\n\n${pages.map((page) => `### ${pageName(page)} — ${page.title}\n\n**Current coverage:** ${page.currentStatusLabel}.\n\n${page.currentFindings.length ? `${page.currentFindings.map((item) => `- ${item}`).join('\n')}\n\n` : ''}${page.sourceRules.length ? `Source rules:\n\n${page.sourceRules.map((item) => `- ${item}`).join('\n')}\n\n` : ''}${page.findings.length ? `Before this revision (${page.baselineStatus}):\n\n${page.findings.map((item) => `- ${item}`).join('\n')}\n\n` : ''}${page.reconstructedNotes.length ? `Existing manual-page reconstruction notes:\n\n${page.reconstructedNotes.map((item) => `- ${item}`).join('\n')}\n` : ''}`).join('\n')}\n## Template fidelity\n\n${templateResults.map((template) => `### ${template.id}\n\n${template.title}. ${template.fidelity.label}.\n\n${template.fidelity.note}\n\n${template.hasRules ? 'Layout rules are available. ' : ''}${template.hasRegisteredScan ? `Original-scan comparison: ${template.referenceNote}` : 'No registered template scan is supplied.'}\n`).join('\n')}\n## Reproduce\n\n\`\`\`sh\n${report.reproduction.join('\n')}\n\`\`\`\n\nUse \`--baseline /path/to/baseline-brand.json\` if commit ${baselineCommit} is unavailable. The checked-in baseline inventory remains available even without the baseline Git history.\n`

mkdirSync(join(folder, 'docs'), { recursive: true })
writeFileSync(join(folder, 'docs/manual-audit.html'), html)
writeFileSync(join(folder, 'docs/manual-audit.json'), JSON.stringify(report, null, 2) + '\n')
writeFileSync(join(folder, 'docs/manual-audit.md'), markdown.replace('## All 48 pages\n', bceMarkdown + '## All 48 pages\n'))
console.log(JSON.stringify({ ...report.counts, htmlBytes: Buffer.byteLength(html), jsonBytes: Buffer.byteLength(JSON.stringify(report)), baselinePreviewsAvailable: report.baselinePreviewsAvailable, output: 'brands/bc-hydro-1983/docs/manual-audit.html' }, null, 2))
