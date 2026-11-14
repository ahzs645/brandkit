// Optional native cover for managed-site welcome publications. Only the supplied
// logo and supporting artwork are images; every label and heading stays editable.
import { officeFont } from '../engine/office.js'
import { welcomeCoverVariant } from '../handover/cover-variants.js'

const SCHEMA = 'brandkit/welcome-cover/1'
const MAX_IMAGE_BYTES = 25 * 1024 * 1024
const MM_PT = 72 / 25.4
const mmTwips = (value) => Math.round(value * MM_PT * 20)
const mmPixels = (value) => value * 96 / 25.4
const plain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const cssString = (value) => `'${String(value).replace(/[^a-zA-Z0-9 _-]/g, (c) => `\\${c.codePointAt(0).toString(16)} `)}'`
const linesOf = (value) => value.replace(/\r\n?/g, '\n').split('\n')
const finite = (value) => typeof value === 'number' && Number.isFinite(value)
const encode64 = (bytes) => {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let text = ''
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(text)
}
const decode64 = (text) => typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(text, 'base64')) : Uint8Array.from(atob(text), (c) => c.charCodeAt(0))

/** Decode once, before Word and HTML diverge. No SVG or remote image fallback. */
const pngSource = (source) => {
  if (typeof source !== 'string') throw new Error('must be an embedded PNG data URL.')
  if (source.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 22) throw new Error('must be no larger than 25 MB.')
  const prefix = 'data:image/png;base64,'
  const payload = source.slice(prefix.length)
  if (!source.startsWith(prefix) || !payload || payload.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) throw new Error('must be an embedded PNG data URL with valid base64.')
  const bytes = decode64(payload)
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error('must be no larger than 25 MB.')
  if (encode64(bytes) !== payload) throw new Error('must use valid canonical base64.')
  if (bytes.length < 45 || [137, 80, 78, 71, 13, 10, 26, 10].some((value, i) => bytes[i] !== value)) throw new Error('does not contain a PNG signature.')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const chunkName = (offset) => String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
  if (view.getUint32(8) !== 13 || chunkName(8) !== 'IHDR') throw new Error('must have a valid PNG image header.')
  const width = view.getUint32(16), height = view.getUint32(20)
  if (!width || !height || width > 32768 || height > 32768 || width * height > 100000000) throw new Error('must have positive PNG dimensions within 32768 px and 100 megapixels.')
  const depths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] }
  if (!depths[bytes[25]]?.includes(bytes[24]) || bytes[26] !== 0 || bytes[27] !== 0 || bytes[28] > 1) throw new Error('must have a supported PNG image header.')
  let offset = 8, hasData = false, ended = false
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset), name = chunkName(offset)
    if (offset + length + 12 > bytes.length) throw new Error('contains an incomplete PNG chunk.')
    if (name === 'IDAT' && length) hasData = true
    offset += length + 12
    if (name === 'IEND') {
      if (length || offset !== bytes.length) throw new Error('must end with the PNG end marker.')
      ended = true
      break
    }
  }
  if (!hasData || !ended) throw new Error('must contain complete PNG image data and an end marker.')
  return { bytes, width, height, ratio: width / height, src: source }
}

const inspect = (cover, profile) => {
  const problems = [], images = {}
  if (!plain(cover)) return { problems: ['Welcome cover must be an object.'] }
  const keys = new Set(['schema', 'variant', 'providerLogo', 'graphic', 'sections', 'clientLogo', 'kicker', 'title', 'subtitle', 'clientName', 'preparedBy', 'dateText', 'status'])
  for (const key of Object.keys(cover)) if (!keys.has(key)) problems.push(`Welcome cover has an unsupported field: ${key}.`)
  if (cover.schema !== SCHEMA) problems.push(`Welcome cover schema must be ${SCHEMA}.`)
  try { welcomeCoverVariant(cover.variant) } catch (error) { problems.push(error.message) }
  const isType = cover.variant === 'type-only'
  const text = (key, max, maxLines = 1, required = false) => {
    const value = cover[key]
    if (typeof value !== 'string') return problems.push(`Welcome cover ${key} must be text.`)
    if (value.length > max || required && !value.trim()) problems.push(`Welcome cover ${key} must be ${required ? 'non-empty and ' : ''}no longer than ${max} characters.`)
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) || value.includes('\t')) problems.push(`Welcome cover ${key} must not contain control characters.`)
    if (linesOf(value).length > maxLines) problems.push(`Welcome cover ${key} must have no more than ${maxLines} line${maxLines === 1 ? '' : 's'}.`)
  }
  text('kicker', 60, 2, true)
  text('title', 80, 2, true)
  text('subtitle', 220, 3)
  text('clientName', 120, 2, true)
  text('preparedBy', 120)
  text('dateText', 80)
  text('status', 120)
  if (isType) {
    if (cover.graphic !== undefined) problems.push('A type-only welcome cover must not include decorative graphic artwork.')
    if (!Array.isArray(cover.sections) || cover.sections.length !== 3) problems.push('A type-only welcome cover needs exactly three contents sections.')
    else for (const [i, section] of cover.sections.entries()) {
      if (!plain(section)) { problems.push(`Welcome cover section ${i + 1} must be an object.`); continue }
      for (const key of Object.keys(section)) if (!['number', 'title', 'description'].includes(key)) problems.push(`Welcome cover section ${i + 1} has an unsupported field: ${key}.`)
      for (const [key, max] of [['number', 2], ['title', 24], ['description', 100]]) {
        const value = section[key]
        if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) problems.push(`Welcome cover section ${i + 1}.${key} must be non-empty single-line text of at most ${max} characters.`)
      }
      if (typeof section.number === 'string' && !/^\d{2}$/.test(section.number)) problems.push(`Welcome cover section ${i + 1}.number must contain two digits.`)
    }
  } else if (cover.sections !== undefined) problems.push('Welcome cover sections are supported only by the type-only variant.')

  const width = profile?.paper?.widthMm, height = profile?.paper?.heightMm
  const margins = profile?.margins
  if (!finite(width) || width <= 0 || !finite(height) || height <= 0 || !plain(margins) ||
    ['leftMm', 'rightMm', 'topMm', 'bottomMm'].some((key) => !finite(margins?.[key]) || margins[key] < 0)) {
    problems.push('Welcome cover needs a profile with finite paper dimensions and non-negative margins.')
  }
  const contentWidth = width - (margins?.leftMm ?? NaN) - (margins?.rightMm ?? NaN)
  const contentHeight = height - (margins?.topMm ?? NaN) - (margins?.bottomMm ?? NaN)
  if (finite(contentWidth) && (contentWidth < 120 || contentWidth > 300)) problems.push('Welcome cover needs a usable page width between 120 and 300 mm.')
  if (finite(contentHeight) && contentHeight < 200) problems.push('Welcome cover needs at least 200 mm of usable page height.')
  for (const role of ['title', 'body', 'label']) {
    const spec = profile?.typography?.[role]
    if (!plain(spec) || typeof spec.family !== 'string' || !spec.family.trim() || spec.family.length > 120 || /[\u0000-\u001f\u007f]/.test(spec.family)) problems.push(`Welcome cover needs a ${role} font family in its profile.`)
  }

  const image = (key, required, maxWidth) => {
    const value = cover[key]
    if (value === undefined && !required) return
    if (!plain(value)) return problems.push(`Welcome cover ${key} must be an image object.`)
    const allowed = key === 'graphic' ? ['src', 'alt'] : ['src', 'alt', 'widthMm']
    for (const field of Object.keys(value)) if (!allowed.includes(field)) problems.push(`Welcome cover ${key} has an unsupported field: ${field}.`)
    if (typeof value.alt !== 'string' || !value.alt.trim() || value.alt.length > 240 || /[\u0000-\u001f\u007f]/.test(value.alt)) problems.push(`Welcome cover ${key}.alt must be non-empty text of at most 240 characters.`)
    if (key !== 'graphic' && value.widthMm !== undefined && (!finite(value.widthMm) || value.widthMm <= 0 || value.widthMm > maxWidth)) problems.push(`Welcome cover ${key}.widthMm must be positive and fit within ${Number(maxWidth.toFixed(2))} mm.`)
    try { images[key] = pngSource(value.src) } catch (error) { problems.push(`Welcome cover ${key} ${error.message}`) }
  }
  image('providerLogo', true, finite(contentWidth) ? contentWidth * 0.55 - 16 : 50)
  image('graphic', !isType)
  image('clientLogo', false, 60)
  if (images.graphic && Math.abs(images.graphic.width - images.graphic.height * 3) > Math.max(2, images.graphic.height * 0.01)) problems.push('Welcome cover graphic must have a 3:1 aspect ratio; supply artwork without cover text.')
  return { problems, images, contentWidth }
}

/** Structural and image checks only; this does not verify a brand or service claim. */
export const validateWelcomeCover = (cover, profile) => inspect(cover, profile).problems

const prepare = (cover, profile) => {
  const result = inspect(cover, profile)
  if (result.problems.length) throw new Error(`Invalid welcome cover: ${result.problems.join(' ')}`)
  const fit = (image, width, maxHeight) => {
    const fittedWidth = Math.min(width, maxHeight * image.ratio)
    return { ...image, widthMm: fittedWidth, heightMm: fittedWidth / image.ratio }
  }
  return {
    width: result.contentWidth,
    provider: fit(result.images.providerLogo, cover.providerLogo.widthMm ?? 42, 22),
    graphic: result.images.graphic ? fit(result.images.graphic, result.contentWidth - 16, Infinity) : null,
    client: result.images.clientLogo ? fit(result.images.clientLogo, cover.clientLogo.widthMm ?? 60, 36) : null
  }
}

// The HTML API has no rendering context. A document profile contains enough face
// information to resolve the same Office family alias used by embedded fonts.
const fontOf = (profile, role, brand) => {
  const spec = profile.typography[role]
  const key = spec.font ?? role
  return officeFont(brand ?? { fonts: { [key]: { family: spec.family, office: spec.office, weight: spec.weight, style: spec.italic ? 'italic' : 'normal' } } }, key, { weight: spec.weight, italic: spec.italic })
}

/** Native Word children for one cover page; the caller owns sections and fonts. */
export const welcomeCoverDocx = async (ctx, profile, cover) => {
  const layout = prepare(cover, profile)
  const d = await import('docx')
  const { Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, TableLayoutType, WidthType, BorderStyle, AlignmentType, HeightRule, VerticalAlignTable, LineRuleType } = d
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const borders = Object.fromEntries(['top', 'bottom', 'left', 'right', 'insideHorizontal', 'insideVertical'].map((key) => [key, noBorder]))
  const paragraph = (text, role, size, colour, { after = 0, lineHeight = 1.3, caps = false, align = AlignmentType.LEFT, outlineLevel } = {}) => {
    const face = fontOf(profile, role, ctx.brand)
    // docx 9 drops a numeric zero before rounding spacing to integer twips.
    // A positive fraction serializes an explicit zero and cancels style tracking.
    const run = { font: face.name, bold: face.bold, italics: face.italic, size: size * 2, color: colour, allCaps: caps, characterSpacing: caps ? Math.round(size * 0.08 * 20) : role === 'title' ? Math.round(size * -0.02 * 20) : Number.EPSILON }
    return new Paragraph({ style: role === 'title' ? 'Title' : 'BodyText', keepNext: false, keepLines: true, widowControl: true, alignment: align,
      ...(outlineLevel === undefined ? {} : { outlineLevel }), run,
      border: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, between: noBorder },
      spacing: { before: 0, after: mmTwips(after), line: Math.round(240 * lineHeight), lineRule: LineRuleType.AUTO },
      children: linesOf(text).map((line, i) => new TextRun({ text: line, ...(i ? { break: 1 } : {}), ...run })) })
  }
  const picture = (image, alt, align = AlignmentType.LEFT) => new Paragraph({ keepNext: false, alignment: align, run: { size: 2 }, spacing: { before: 0, after: 0 }, children: [new ImageRun({ type: 'png', data: image.bytes,
    transformation: { width: mmPixels(image.widthMm), height: mmPixels(image.heightMm) }, altText: { name: alt, title: alt, description: alt } })] })
  const spacer = (height = 5) => new Paragraph({ keepNext: false, run: { size: 2 }, spacing: { before: 0, after: 0, line: mmTwips(height), lineRule: LineRuleType.EXACT }, children: [] })
  const cell = (width, fill, children, padding = {}, center = false) => new TableCell({ width: { size: mmTwips(width), type: WidthType.DXA }, shading: { fill },
    margins: Object.fromEntries(['top', 'bottom', 'left', 'right'].map((side) => [side, mmTwips(padding[side] ?? 0)])),
    borders, verticalAlign: center ? VerticalAlignTable.CENTER : VerticalAlignTable.TOP, children })
  const table = (widths, cells, height) => new Table({ layout: TableLayoutType.FIXED, width: { size: mmTwips(widths.reduce((a, b) => a + b, 0)), type: WidthType.DXA },
    columnWidths: widths.map(mmTwips), borders, rows: [new TableRow({ cantSplit: true, keepNext: false, ...(height ? { height: { value: mmTwips(height), rule: HeightRule.ATLEAST } } : {}), children: cells })] })
  const columns = [layout.width * 0.55, layout.width * 0.45]
  // LibreOffice adds vertical cell padding to an ATLEAST row minimum. Supply
  // the inner height so these bands match the intended outer sizes in HTML.
  const masthead = table(columns, [
    cell(columns[0], 'DFDFDF', [picture(layout.provider, cover.providerLogo.alt)], { top: 8, bottom: 8, left: 8, right: 8 }, true),
    cell(columns[1], 'DFDFDF', [paragraph(cover.kicker, 'label', 9, '000000', { caps: true, align: AlignmentType.RIGHT })], { top: 8, bottom: 8, left: 8, right: 8 }, true)
  ], 35 - 8 - 8)
  const sectionWidth = (layout.width - 16) / 3
  const contents = cover.variant === 'type-only' ? table([sectionWidth, sectionWidth, sectionWidth], cover.sections.map((section, i) =>
    cell(sectionWidth, '000000', [
      paragraph(section.number, 'title', 26, 'C8C8C8', { after: 4, lineHeight: 1.1 }),
      paragraph(section.title, 'title', 14, 'FFFFFF', { after: 3, lineHeight: 1.15 }),
      paragraph(section.description, 'body', 10, 'C8C8C8', { lineHeight: 1.4 })
    ], { top: 4, bottom: 4, right: i < 2 ? 6 : 0 })
  ), (layout.width - 16) / 3 - 8) : null
  const hero = table([layout.width], [cell(layout.width, '000000', [
    paragraph(cover.title, 'title', 38, 'FFFFFF', { after: 4, lineHeight: 1.1, outlineLevel: 0 }),
    ...(cover.subtitle ? [paragraph(cover.subtitle, 'body', 11, 'C8C8C8', { after: 8, lineHeight: 1.35 })] : [spacer(4)]),
    ...(contents ? [contents, spacer(0.1)] : [picture(layout.graphic, cover.graphic.alt)])
  ], { top: 8, bottom: 6, left: 8, right: 8 })])
  const metadata = [
    paragraph('Prepared for', 'label', 8.5, '484848', { after: 2, caps: true }),
    paragraph(cover.clientName, 'title', 20, '000000', { after: 3, lineHeight: 1.15, outlineLevel: 1 }),
    ...(cover.preparedBy ? [paragraph(`Prepared by ${cover.preparedBy}`, 'body', 9, '484848', { after: 1 })] : []),
    ...(cover.dateText ? [paragraph(cover.dateText, 'label', 9, '484848', { after: 1 })] : []),
    ...(cover.status ? [paragraph(cover.status, 'label', 9, '000000')] : [])
  ]
  const client = layout.client ? table([72, layout.width - 72], [
    cell(72, 'FFFFFF', [picture(layout.client, cover.clientLogo.alt, AlignmentType.CENTER)], { top: 6, bottom: 6, left: 6, right: 6 }, true),
    cell(layout.width - 72, 'FFFFFF', metadata, { left: 8 }, true)
  ], 48 - 6 - 6) : table([layout.width], [cell(layout.width, 'FFFFFF', metadata, {}, true)], 48)
  // A tiny final paragraph is deliberate: Word requires one after a table.
  return [masthead, spacer(), hero, spacer(), client, spacer(0.1)]
}

/** Self-contained semantic fragment. Publication HTML supplies the embedded faces. */
export const welcomeCoverHtml = (profile, cover) => {
  const layout = prepare(cover, profile)
  const faces = Object.fromEntries(['title', 'body', 'label'].map((role) => [role, fontOf(profile, role)]))
  const vars = [`--bk-cover-width:${layout.width}mm`, ...Object.entries(faces).flatMap(([role, face]) => [
    `--bk-cover-${role}-font:${cssString(face.name)}`, `--bk-cover-${role}-weight:${face.bold ? 700 : 400}`, `--bk-cover-${role}-style:${face.italic ? 'italic' : 'normal'}`
  ])].join(';')
  const text = (value) => escapeHtml(value).replace(/\r\n?|\n/g, '<br>')
  const image = (item, alt, className) => `<img class="${className}" src="${item.src}" alt="${escapeHtml(alt)}" width="${item.width}" height="${item.height}" style="width:${item.widthMm}mm;height:auto">`
  return `<style>
.bk-welcome-cover,.bk-welcome-cover *{box-sizing:border-box}
.bk-welcome-cover{width:var(--bk-cover-width);max-width:100%;color:#000;font-family:var(--bk-cover-body-font),sans-serif;font-weight:var(--bk-cover-body-weight);font-style:var(--bk-cover-body-style);break-inside:avoid}
.bk-welcome-cover p,.bk-welcome-cover h1,.bk-welcome-cover h2{padding:0;border:0;margin:0;overflow-wrap:anywhere}
.bk-welcome-cover img{display:block;max-width:100%;object-fit:contain}
.bk-welcome-cover .bk-welcome-cover__masthead{display:grid;grid-template-columns:55% 45%;min-height:35mm;background:#DFDFDF;align-items:center}
.bk-welcome-cover .bk-welcome-cover__masthead>div{padding:8mm;min-width:0}
.bk-welcome-cover .bk-welcome-cover__kicker{font-family:var(--bk-cover-label-font),sans-serif;font-weight:var(--bk-cover-label-weight);font-style:var(--bk-cover-label-style);font-size:9pt;line-height:1.3;letter-spacing:.08em;text-transform:uppercase;text-align:right}
.bk-welcome-cover .bk-welcome-cover__hero{margin-top:5mm;padding:8mm 8mm 6mm;background:#000;color:#FFF}
.bk-welcome-cover .bk-welcome-cover__title{font-family:var(--bk-cover-title-font),sans-serif;font-weight:var(--bk-cover-title-weight);font-style:var(--bk-cover-title-style);font-size:38pt;line-height:1.1;letter-spacing:-.02em;margin:0 0 4mm;color:#FFF}
.bk-welcome-cover .bk-welcome-cover__subtitle{font-size:11pt;line-height:1.35;margin:0 0 8mm;color:#C8C8C8}
.bk-welcome-cover .bk-welcome-cover__art{margin:0}
.bk-welcome-cover .bk-welcome-cover__contents{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));min-height:calc((var(--bk-cover-width) - 16mm)/3)}
.bk-welcome-cover .bk-welcome-cover__section{padding:4mm 6mm 4mm 0;min-width:0}
.bk-welcome-cover .bk-welcome-cover__section:last-child{padding-right:0}
.bk-welcome-cover .bk-welcome-cover__number{font-family:var(--bk-cover-title-font),sans-serif;font-size:26pt;line-height:1.1;letter-spacing:-.02em;color:#C8C8C8;margin:0 0 4mm}
.bk-welcome-cover .bk-welcome-cover__section-title{font-family:var(--bk-cover-title-font),sans-serif;font-weight:var(--bk-cover-title-weight);font-size:14pt;line-height:1.15;letter-spacing:-.02em;color:#FFF;margin:0 0 3mm}
.bk-welcome-cover .bk-welcome-cover__section-description{font-size:10pt;line-height:1.4;color:#C8C8C8}
.bk-welcome-cover .bk-welcome-cover__hero--no-subtitle .bk-welcome-cover__art{margin-top:4mm}
.bk-welcome-cover .bk-welcome-cover__client{display:grid;grid-template-columns:72mm minmax(0,1fr);min-height:48mm;margin-top:5mm;background:#FFF;align-items:center}
.bk-welcome-cover .bk-welcome-cover__plate{width:72mm;height:48mm;padding:6mm;display:flex;justify-content:center;align-items:center;background:#FFF}
.bk-welcome-cover .bk-welcome-cover__metadata{padding-left:8mm;min-width:0}
.bk-welcome-cover .bk-welcome-cover__prepared-for{font-family:var(--bk-cover-label-font),sans-serif;font-weight:var(--bk-cover-label-weight);font-style:var(--bk-cover-label-style);font-size:8.5pt;line-height:1.3;letter-spacing:.08em;text-transform:uppercase;color:#484848;margin:0 0 2mm}
.bk-welcome-cover .bk-welcome-cover__client-name{font-family:var(--bk-cover-title-font),sans-serif;font-weight:var(--bk-cover-title-weight);font-style:var(--bk-cover-title-style);font-size:20pt;line-height:1.15;letter-spacing:-.02em;margin:0 0 3mm;color:#000}
.bk-welcome-cover .bk-welcome-cover__detail{font-size:9pt;line-height:1.3;color:#484848;margin:0 0 1mm}
.bk-welcome-cover .bk-welcome-cover__date,.bk-welcome-cover .bk-welcome-cover__status{font-family:var(--bk-cover-label-font),sans-serif;font-weight:var(--bk-cover-label-weight);font-style:var(--bk-cover-label-style);font-size:9pt;line-height:1.3}
.bk-welcome-cover .bk-welcome-cover__status{margin:0;color:#000}
.bk-welcome-cover .bk-welcome-cover__client--no-logo{grid-template-columns:1fr}
.bk-welcome-cover .bk-welcome-cover__client--no-logo .bk-welcome-cover__metadata{padding-left:0}
@media print{.bk-welcome-cover,.bk-welcome-cover *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
@media screen and (max-width:600px){.bk-welcome-cover .bk-welcome-cover__masthead{grid-template-columns:1fr}.bk-welcome-cover .bk-welcome-cover__masthead>div:last-child{padding-top:0}.bk-welcome-cover .bk-welcome-cover__kicker{text-align:left}.bk-welcome-cover .bk-welcome-cover__title{font-size:clamp(24pt,7vw,38pt)}.bk-welcome-cover .bk-welcome-cover__client{grid-template-columns:1fr}.bk-welcome-cover .bk-welcome-cover__metadata{padding:5mm 0 0}}
</style>
<section class="bk-welcome-cover" aria-label="Website welcome cover" style="${escapeHtml(vars)}">
  <div class="bk-welcome-cover__masthead"><div>${image(layout.provider, cover.providerLogo.alt, 'bk-welcome-cover__provider-logo')}</div><div><p class="bk-welcome-cover__kicker">${text(cover.kicker)}</p></div></div>
  <div class="bk-welcome-cover__hero${cover.subtitle ? '' : ' bk-welcome-cover__hero--no-subtitle'}"><h1 class="bk-welcome-cover__title">${text(cover.title)}</h1>${cover.subtitle ? `<p class="bk-welcome-cover__subtitle">${text(cover.subtitle)}</p>` : ''}${cover.variant === 'type-only' ? `<div class="bk-welcome-cover__contents">${cover.sections.map(section => `<div class="bk-welcome-cover__section"><p class="bk-welcome-cover__number">${text(section.number)}</p><h2 class="bk-welcome-cover__section-title">${text(section.title)}</h2><p class="bk-welcome-cover__section-description">${text(section.description)}</p></div>`).join('')}</div>` : image(layout.graphic, cover.graphic.alt, 'bk-welcome-cover__art')}</div>
  <div class="bk-welcome-cover__client${layout.client ? '' : ' bk-welcome-cover__client--no-logo'}">${layout.client ? `<div class="bk-welcome-cover__plate">${image(layout.client, cover.clientLogo.alt, 'bk-welcome-cover__client-logo')}</div>` : ''}<div class="bk-welcome-cover__metadata"><p class="bk-welcome-cover__prepared-for">Prepared for</p><h2 class="bk-welcome-cover__client-name">${text(cover.clientName)}</h2>${cover.preparedBy ? `<p class="bk-welcome-cover__detail">Prepared by ${text(cover.preparedBy)}</p>` : ''}${cover.dateText ? `<p class="bk-welcome-cover__detail bk-welcome-cover__date">${text(cover.dateText)}</p>` : ''}${cover.status ? `<p class="bk-welcome-cover__status">${text(cover.status)}</p>` : ''}</div></div>
</section>`
}
