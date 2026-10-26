// One editable publication model, shared by Word and a self-contained print view.
// The Word file remains the master for a matching PDF. Graphic-asset PDFs retain
// the existing outlined SVG renderer; publication text is always native text.
import { logoDocument } from '../engine/artwork.js'
import { officeFont } from '../engine/office.js'
import { documentProfile, validatePublication } from '../engine/documentation.js'
import { embeddedFonts, fontEmbeddingPermission, officeFontRequirements, officeStyleFonts, officeStyles } from './office.js'
import { sanitizeSvg } from '../printer/svg.js'

const MM_PT = 72 / 25.4
const mmTwips = (value) => Math.round(value * MM_PT * 20)
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const cssString = (value) => `'${String(value ?? '').replace(/[^a-zA-Z0-9 _-]/g, (c) => `\\${c.codePointAt(0).toString(16)} `)}'`
const hex = (value, fallback = '000000') => /^[#]?[\da-f]{6}$/i.test(String(value)) ? String(value).replace('#', '') : fallback
const encode64 = (bytes) => {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let text = ''
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(text)
}
const decode64 = (text) => typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(text, 'base64')) : Uint8Array.from(atob(text), (c) => c.charCodeAt(0))
const svgData = (svg) => `data:image/svg+xml;base64,${encode64(new TextEncoder().encode(svg))}`
const textOf = (value) => value == null ? '' : typeof value === 'object' ? String(value.text ?? '') : String(value)
const captionOf = (block) => block.provenance && !String(block.caption ?? '').includes(block.provenance) ? [block.caption, `Source: ${block.provenance}`].filter(Boolean).join(' ') : block.caption ?? ''
const STYLE_IDS = { title: 'Title', subtitle: 'Subtitle', heading1: 'Heading1', heading2: 'Heading2', heading3: 'Heading3', body: 'BodyText', caption: 'Caption', table: 'TableText', label: 'Header', footer: 'Footer' }

const profileOf = (ctx, publication) => publication.profile ?? documentProfile(ctx.brand, { paper: publication.paper })
const styleOf = (block) => STYLE_IDS[block.style] ?? (Object.values(STYLE_IDS).includes(block.style) ? block.style : block.type === 'heading' ? `Heading${Math.max(1, Math.min(3, Number(block.level) || 1))}` : 'BodyText')
const tokenOf = (style) => Object.entries(STYLE_IDS).find(([, id]) => id === style)?.[0] ?? 'body'
const typeOf = (profile, token) => profile.typography?.[token] ?? profile.typography?.body ?? { font: 'body', sizePt: 11, lineHeight: 1.3 }
const contentWidth = (profile) => profile.paper.widthMm - profile.margins.leftMm - profile.margins.rightMm
const pageBlocks = (page) => page.blocks?.length ? page.blocks : page.title ? [{ type: 'heading', text: page.title }] : []

const validate = (ctx, publication) => {
  if (!publication || !Array.isArray(publication.pages) || !publication.pages.length) throw new Error('A publication needs at least one page.')
  const problems = validatePublication({ ...publication, profile: profileOf(ctx, publication) })
  if (problems.length) throw new Error(`Invalid publication: ${problems.join(' ')}`)
  for (const page of publication.pages) for (const block of pageBlocks(page)) {
    if (!['heading', 'paragraph', 'list', 'table', 'figure'].includes(block.type)) throw new Error(`Unsupported publication block: ${block.type}`)
    if (block.type === 'table' && !Array.isArray(block.rows)) throw new Error('A publication table needs rows.')
    if (block.type === 'list' && !Array.isArray(block.items)) throw new Error('A publication list needs items.')
    if (block.type === 'figure' && !block.placeholder && !block.src) throw new Error('A figure needs an embedded image or an explicit placeholder.')
  }
}

/** No network images: a downloaded publication must not rely on a signed-in site. */
const imageSource = (source) => {
  const match = /^data:image\/(png|jpeg);base64,([\da-z+/=\s]+)$/i.exec(String(source ?? ''))
  if (!match) throw new Error('Publication images must be embedded PNG or JPEG data URLs.')
  const bytes = decode64(match[2])
  if (!bytes.length) throw new Error('The publication image is empty.')
  if (bytes.length > 25 * 1024 * 1024) throw new Error('A publication image must be smaller than 25 MB.')
  const type = /^jpe?g$/i.test(match[1]) ? 'jpg' : 'png'
  const signature = Array.from(bytes.subarray(0, 8)).join(',')
  if (type === 'png' && !signature.startsWith('137,80,78,71,13,10,26,10') ||
    type === 'jpg' && !(bytes[0] === 255 && bytes[1] === 216)) throw new Error('The image bytes do not match its declared type.')
  return { type, bytes, src: `data:image/${type === 'jpg' ? 'jpeg' : type};base64,${encode64(bytes)}` }
}

const svgAspect = (svg) => {
  const viewBox = /viewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/.exec(svg)
  return viewBox && +viewBox[2] > 0 ? +viewBox[1] / +viewBox[2] : 2.5
}
const imageAspect = (image) => {
  const b = image.bytes
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength)
  if (image.type === 'png' && b.length > 24) return view.getUint32(16) / view.getUint32(20)
  if (image.type === 'jpg') {
    for (let offset = 2; offset + 8 < b.length;) {
      if (b[offset] !== 0xff) break
      const marker = b[offset + 1]
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) return view.getUint16(offset + 7) / view.getUint16(offset + 5)
      const length = view.getUint16(offset + 2)
      if (length < 2) break
      offset += length + 2
    }
  }
  return 4 / 3
}
const figureSize = (profile, block, image) => {
  const width = Math.min(contentWidth(profile), Number(block.widthMm) || contentWidth(profile))
  const maxHeight = Number(block.heightMm) || 88
  if (!image) return { width, height: maxHeight }
  const ratio = imageAspect(image)
  const fit = Number.isFinite(ratio) && ratio > 0 ? ratio : 4 / 3
  return { width: Math.min(width, maxHeight * fit), height: Math.min(maxHeight, width / fit) }
}
const logoOf = (ctx, profile) => {
  if (profile.logo?.hidden) return null
  const svg = sanitizeSvg(logoDocument({ ...ctx, outline: true }, profile.logo?.options ?? {}))
  // The full mark belongs on the cover, where its minimum size is respected.
  // Continuation headers use native text instead of shrinking a logo below it.
  const width = Math.min(contentWidth(profile), Math.max(profile.logo?.minimumWidthMm ?? 0, profile.logo?.widthMm ?? 40))
  const spacing = Number(profile.logo?.clearSpaceMm ?? 6)
  const clearSpaceMm = Number.isFinite(spacing) ? Math.max(0, Math.min(100, spacing)) : 6
  return { svg, width, height: width / svgAspect(svg), clearSpaceMm, alt: profile.logo?.alt ?? `${ctx.brand.name} logo` }
}

/** Native Word publication. All text, lists, headings and tables remain editable. */
export const publicationDocx = async (ctx, publication, { png } = {}) => {
  validate(ctx, publication)
  const profile = profileOf(ctx, publication)
  const sourceRevision = String(ctx.sourceRevision ?? '').trim()
  const d = await import('docx')
  const { Document, Packer, Paragraph, TextRun, Header, Footer, ImageRun, Table, TableRow, TableCell, TableLayoutType, WidthType, BorderStyle, AlignmentType, PageNumber, Tab, TabStopType, SectionType, LevelFormat, HeightRule, VerticalAlignTable } = d
  const logo = logoOf(ctx, profile)
  if (logo && typeof png !== 'function') throw new Error('A PNG renderer is required to put the brand logo in Word.')
  const logoBytes = logo ? await png(logo.svg, Math.round(logo.width * 200 / 25.4)) : null
  const printableWidth = contentWidth(profile)
  const textRuns = (text, options = {}) => String(text ?? '').split('\n').map((line, index) => new TextRun({ text: line, ...(index ? { break: 1 } : {}), ...options }))
  const paragraph = (text, style = 'BodyText', extra = {}) => new Paragraph({ style, widowControl: true, children: textRuns(text), ...extra })
  const captionParagraph = (text) => paragraph(text, 'Caption', { spacing: { before: mmTwips(3), after: Math.round((typeOf(profile, 'caption').spaceAfterPt ?? 9) * 20) } })
  const footer = () => new Footer({ children: [new Paragraph({ style: 'Footer', tabStops: [{ type: TabStopType.RIGHT, position: mmTwips(printableWidth) }], children: [
    ...textRuns([profile.footer?.text ?? ctx.brand.name, publication.edition].filter(Boolean).join('  ·  ')),
    new TextRun({ children: [new Tab(), PageNumber.CURRENT] })
  ] })] })
  const header = (first) => new Header({ children: [paragraph(first ? profile.header?.text ?? ctx.brand.name : publication.title ?? profile.header?.text ?? ctx.brand.name, 'Header')] })
  const table = (block) => {
    const headers = block.headers ?? []
    const count = Math.max(headers.length, ...block.rows.map((row) => row.length))
    if (!count) return []
    const ratios = block.widths?.length === count ? block.widths.map(Number) : Array(count).fill(1)
    const total = ratios.reduce((sum, n) => sum + (n > 0 ? n : 1), 0)
    const widths = ratios.map((n) => Math.round(mmTwips(printableWidth) * (n > 0 ? n : 1) / total))
    const border = { style: BorderStyle.SINGLE, size: 4, color: hex(profile.colours.line, 'D9D9D9') }
    const rowOf = (row, isHeader, index) => new TableRow({ tableHeader: isHeader, cantSplit: true, children: widths.map((width, column) => new TableCell({
      width: { size: width, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 110, right: 110 },
      shading: { fill: isHeader ? hex(profile.colours.ink) : index % 2 ? hex(profile.colours.light, 'F5F5F5') : hex(profile.colours.paper, 'FFFFFF') },
      children: [new Paragraph({ style: 'TableText', children: textRuns(textOf(row[column]), isHeader ? { bold: true, color: hex(profile.colours.reverse, 'FFFFFF') } : {}) })]
    })) })
    return [new Table({ layout: TableLayoutType.FIXED, width: { size: mmTwips(printableWidth), type: WidthType.DXA }, columnWidths: widths,
      borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
      rows: [...(headers.length ? [rowOf(headers, true, 0)] : []), ...block.rows.map((row, index) => rowOf(row, false, index))]
    }), ...(block.caption ? [captionParagraph(block.caption)] : [paragraph('', 'BodyText', { spacing: { after: 80 } })])]
  }
  const blockChildren = async (block, listId) => {
    if (block.type === 'heading') return [paragraph(block.text, styleOf(block), { keepNext: true })]
    if (block.type === 'paragraph') return [paragraph(block.text, styleOf(block))]
    if (block.type === 'list') return block.items.map((item) => paragraph(textOf(item), 'ListParagraph', block.ordered ? { numbering: { reference: 'publication-numbering', level: 0, instance: listId } } : { bullet: { level: 0 } }))
    if (block.type === 'table') return table(block)
    const image = block.placeholder ? null : imageSource(block.src)
    const size = figureSize(profile, block, image)
    const caption = captionOf(block)
    if (block.placeholder) {
      // A native cell keeps the placeholder label visible with a font-isolated PNG renderer,
      // and gives the editor real text to replace instead of an unexplained blank raster.
      const width = mmTwips(size.width)
      const border = { style: BorderStyle.SINGLE, size: 4, color: hex(profile.colours.line, 'D9D9D9') }
      return [new Table({ alignment: AlignmentType.CENTER, layout: TableLayoutType.FIXED, width: { size: width, type: WidthType.DXA }, columnWidths: [width],
        borders: { top: border, bottom: border, left: border, right: border },
        rows: [new TableRow({ height: { value: mmTwips(size.height), rule: HeightRule.ATLEAST }, cantSplit: true, keepNext: Boolean(caption), children: [new TableCell({
          width: { size: width, type: WidthType.DXA }, verticalAlign: VerticalAlignTable.CENTER, margins: { top: 120, bottom: 120, left: 240, right: 240 },
          shading: { fill: hex(profile.colours.light, 'F3F3F3') }, children: [
            paragraph(block.label || 'Screenshot placeholder', 'BodyText', { alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: textRuns(block.label || 'Screenshot placeholder', { color: hex(profile.colours.muted, '555555') }) }),
            paragraph('Replace with an actual image', 'Caption', { alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: textRuns('Replace with an actual image', { color: hex(profile.colours.muted, '555555') }) })
          ]
        })] })]
      }), ...(caption ? [captionParagraph(caption)] : [paragraph('', 'BodyText', { spacing: { after: 80 } })])]
    }
    const bytes = image.bytes
    const alt = block.alt || caption || (block.placeholder ? 'Screenshot placeholder' : 'Publication figure')
    return [new Paragraph({ alignment: AlignmentType.CENTER, keepNext: Boolean(caption), spacing: { before: 80, after: 0 }, children: [new ImageRun({ type: image.type, data: bytes,
      transformation: { width: Math.round(size.width * 96 / 25.4), height: Math.round(size.height * 96 / 25.4) }, altText: { name: alt, title: caption || alt, description: alt } })] }),
    ...(caption ? [captionParagraph(caption)] : [])]
  }
  let listId = 0
  const sections = []
  for (const [index, page] of publication.pages.entries()) {
    const children = []
    if (index === 0 && logo) children.push(new Paragraph({ keepNext: true, spacing: { after: mmTwips(logo.clearSpaceMm) }, children: [new ImageRun({ type: 'png', data: logoBytes,
      transformation: { width: Math.round(logo.width * 96 / 25.4), height: Math.round(logo.height * 96 / 25.4) }, altText: { name: logo.alt, title: logo.alt, description: logo.alt } })] }))
    for (const block of pageBlocks(page)) children.push(...await blockChildren(block, ++listId))
    sections.push({ properties: { type: SectionType.NEXT_PAGE,
      page: { size: { width: mmTwips(profile.paper.widthMm), height: mmTwips(profile.paper.heightMm) },
        margin: { top: mmTwips(profile.margins.topMm), right: mmTwips(profile.margins.rightMm), bottom: mmTwips(profile.margins.bottomMm), left: mmTwips(profile.margins.leftMm), header: mmTwips(8), footer: mmTwips(8) } } },
      headers: { default: header(index === 0) }, footers: { default: footer() }, children: children.length ? children : [paragraph('')]
    })
  }
  const document = new Document({ creator: ctx.brand.name, title: publication.title ?? ctx.brand.name, subject: publication.subtitle ?? publication.purpose,
    description: `${ctx.brand.name} editable ${publication.purpose ?? 'publication'} · ${publication.edition ?? ctx.brand.version ?? ''}`,
    customProperties: [{ name: 'brandkit.publicationId', value: publication.id ?? '' }, { name: 'brandkit.fontRequirements', value: JSON.stringify(officeFontRequirements(ctx, officeStyleFonts(ctx.brand, profile))) },
      ...(sourceRevision ? [{ name: 'brandkit.sourceRevision', value: sourceRevision }] : [])],
    styles: officeStyles(ctx.brand, profile), fonts: embeddedFonts(ctx, officeStyleFonts(ctx.brand, profile)),
    numbering: { config: [{ reference: 'publication-numbering', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START, style: { paragraph: { indent: { left: 360, hanging: 260 } } } }] }] },
    sections
  })
  return new Uint8Array(await Packer.toArrayBuffer(document))
}

/** Standalone print preview using the identical blocks and embedded brand faces. */
export const publicationHtml = (ctx, publication) => {
  validate(ctx, publication)
  const profile = profileOf(ctx, publication)
  const sourceRevision = String(ctx.sourceRevision ?? '').trim()
  const logo = logoOf(ctx, profile)
  const fontRules = []
  const seen = new Set()
  for (const item of officeStyleFonts(ctx.brand, profile)) {
    const spec = ctx.brand.fonts?.[item.key]
    const bytes = ctx.fonts?.faces?.[item.key]?.bytes
    const signature = `${item.font}|${item.bold}|${item.italic}`
    if (!bytes || seen.has(signature) || spec?.office && spec.office !== spec.family || Number(spec?.weight ?? 400) !== item.weight || !fontEmbeddingPermission(ctx.fonts.faces[item.key]).allowed) continue
    seen.add(signature)
    const otf = bytes[0] === 79 && bytes[1] === 84 && bytes[2] === 84 && bytes[3] === 79
    fontRules.push(`@font-face{font-family:${cssString(item.font)};font-weight:${item.bold ? 700 : 400};font-style:${item.italic ? 'italic' : 'normal'};src:url(data:font/${otf ? 'otf' : 'ttf'};base64,${encode64(bytes)}) format('${otf ? 'opentype' : 'truetype'}');font-display:block}`)
  }
  const typographyCss = Object.entries(STYLE_IDS).map(([token, id]) => {
    const spec = typeOf(profile, token)
    const face = officeFont(ctx.brand, spec.font, { weight: spec.weight, italic: spec.italic })
    return `.s-${id}{font-family:${cssString(face.name)},sans-serif;font-size:${Number(spec.sizePt) || 11}pt;font-weight:${face.bold ? 700 : 400};font-style:${face.italic ? 'italic' : 'normal'};line-height:${Number(spec.lineHeight) || 1.3};margin:0 0 ${Number(spec.spaceAfterPt) || 6}pt;${/^Heading|Title|Subtitle/.test(id) ? 'break-after:avoid;' : ''}}`
  }).join('\n')
  const blockHtml = (block) => {
    const style = styleOf(block)
    const content = escapeHtml(block.text).replace(/\n/g, '<br>')
    if (block.type === 'heading') {
      const level = style === 'Title' ? 1 : Math.max(1, Math.min(3, Number(block.level) || Number(style.slice(-1)) || 2))
      return `<h${level} class="s-${style}">${content}</h${level}>`
    }
    if (block.type === 'paragraph') return `<p class="s-${style}">${content}</p>`
    if (block.type === 'list') return `<${block.ordered ? 'ol' : 'ul'} class="s-BodyText">${block.items.map((item) => `<li>${escapeHtml(textOf(item)).replace(/\n/g, '<br>')}</li>`).join('')}</${block.ordered ? 'ol' : 'ul'}>`
    if (block.type === 'table') {
      const total = block.widths?.reduce((sum, width) => sum + width, 0)
      const columns = total ? `<colgroup>${block.widths.map((width) => `<col style="width:${100 * width / total}%">`).join('')}</colgroup>` : ''
      return `<table class="s-TableText">${block.caption ? `<caption class="s-Caption">${escapeHtml(block.caption)}</caption>` : ''}${columns}${block.headers?.length ? `<thead><tr>${block.headers.map((cell) => `<th scope="col">${escapeHtml(textOf(cell))}</th>`).join('')}</tr></thead>` : ''}<tbody>${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(textOf(cell)).replace(/\n/g, '<br>')}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    }
    const image = block.placeholder ? null : imageSource(block.src)
    const size = figureSize(profile, block, image)
    const caption = captionOf(block)
    return `<figure>${block.placeholder ? `<div class="figure-placeholder" role="img" aria-label="${escapeHtml(block.alt ?? 'Screenshot placeholder')}" style="min-height:${size.height}mm">${escapeHtml(block.label ?? 'Screenshot placeholder')}<small>Replace with an actual image</small></div>` : `<img src="${image.src}" alt="${escapeHtml(block.alt || caption || 'Publication figure')}" style="width:${size.width}mm;height:${size.height}mm;object-fit:contain">`}${caption ? `<figcaption class="s-Caption">${escapeHtml(caption)}</figcaption>` : ''}</figure>`
  }
  const pages = publication.pages.map((page, index) => `<article class="page ${index ? 'continuation' : 'first-page'}" data-page-id="${escapeHtml(page.id ?? index)}">
<header><p class="s-Header">${escapeHtml(index ? publication.title : profile.header?.text ?? ctx.brand.name)}</p></header>
<main>${!index && logo ? `<img class="brand-logo" src="${svgData(logo.svg)}" alt="${escapeHtml(logo.alt)}" style="width:${logo.width}mm;margin-bottom:${logo.clearSpaceMm}mm">` : ''}${pageBlocks(page).map(blockHtml).join('\n')}</main>
<footer class="s-Footer"><span>${escapeHtml([profile.footer?.text ?? ctx.brand.name, publication.edition].filter(Boolean).join('  ·  '))}</span><span>${index + 1}</span></footer>
</article>`).join('\n')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="author" content="${escapeHtml(ctx.brand.name)}">${sourceRevision ? `<meta name="brandkit-source-revision" content="${escapeHtml(sourceRevision)}">` : ''}<meta name="brandkit-font-requirements" content="${escapeHtml(JSON.stringify(officeFontRequirements(ctx, officeStyleFonts(ctx.brand, profile), { format: 'html' })))}"><title>${escapeHtml(publication.title ?? ctx.brand.name)}</title><style>
${fontRules.join('\n')}
${typographyCss}
*{box-sizing:border-box}body{margin:0;background:#ededed;color:#${hex(profile.colours.ink)};font-family:sans-serif}.page{width:${profile.paper.widthMm}mm;min-height:${profile.paper.heightMm}mm;padding:${profile.margins.topMm}mm ${profile.margins.rightMm}mm ${profile.margins.bottomMm}mm ${profile.margins.leftMm}mm;margin:8mm auto;background:#${hex(profile.colours.paper, 'FFFFFF')};display:flex;flex-direction:column;break-after:page;overflow-wrap:anywhere}header{margin-top:-${Math.max(0, profile.margins.topMm - 8)}mm;margin-bottom:7mm}.brand-logo{height:auto;display:block;margin:0 0 3mm}main{flex:1}footer{display:flex;justify-content:space-between;gap:8mm;padding-top:6mm;margin-bottom:0!important}p,li{orphans:3;widows:3}li{padding-left:1mm;margin-bottom:3pt}ul,ol{padding-left:6mm}figure{margin:4mm 0;break-inside:avoid}figure>img{max-width:100%;display:block;margin:auto}.figure-placeholder{border:1px solid #${hex(profile.colours.line, 'D9D9D9')};background:#${hex(profile.colours.light, 'F3F3F3')};color:#${hex(profile.colours.muted, '555555')};display:flex;align-items:center;justify-content:center;flex-direction:column;gap:2mm;font-size:11pt}.figure-placeholder small{font-size:9pt}figcaption{margin-top:3mm!important}table{border-collapse:collapse;width:100%;margin:4mm 0}caption{caption-side:bottom;text-align:left;margin-top:3mm!important}td,th{border:1px solid #${hex(profile.colours.line, 'D9D9D9')};padding:2mm;text-align:left;vertical-align:top}th{background:#${hex(profile.colours.ink)};color:#${hex(profile.colours.reverse, 'FFFFFF')};font-weight:700}tbody tr:nth-child(even){background:#${hex(profile.colours.light, 'F5F5F5')}}thead{display:table-header-group}tr{break-inside:avoid}@page{size:${profile.paper.widthMm}mm ${profile.paper.heightMm}mm;margin:0}@media print{body{background:white}.page{margin:0;box-shadow:none}.page:last-child{break-after:auto}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}@media screen and (max-width:850px){body{padding:8px}.page{width:100%;min-height:auto;padding:8%;margin:0 0 12px}header{margin-top:0}.brand-logo{max-width:60%}}
</style></head><body>${pages}</body></html>`
}
