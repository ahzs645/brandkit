// One editable publication model, written as document-kit's block model (publicationDocument): the
// Word file (writeDocx), and from that Word file the PDF and its preview (layout.js), and the print
// view (writeHtml) all come from one document, in the brand's own faces. Graphic-asset PDFs retain
// the existing outlined SVG renderer; publication text is always native text. A publication that
// opens with a designed welcome cover has it as its first section (welcomeCoverSection).
//
// The block set is the publication block model's (src/engine/publication-blocks.js): headings,
// paragraphs, lists, tables and figures, and the designed system's blocks (opening, kicker, lead,
// note, statement, steps, callout, facts, columns, scale, references, contents, devices, phones,
// masthead, signoff, spacer, push), set here in the profile's plain styles. A brand's own designed
// publications are written by designed-publication.js.
import { document as kitDocument, heading, image as kitImage, inlineImage, list as kitList, pageNumber, paragraph, pinned, section, spacer, tab, table, text as kitText } from 'document-kit'
import { BLOCK_TYPES, blockSources } from '../engine/publication-blocks.js'
import { logoDocument } from '../engine/artwork.js'
import { documentProfile, validatePublication } from '../engine/documentation.js'
import { STYLE_SPECS, officeStyleFonts, styleSpec } from './office.js'
import { sanitizeSvg } from '../printer/svg.js'
import { validateWelcomeCover, welcomeCoverSection } from './welcome-cover.js'
import { tableFonts, tableLook } from './table-styles.js'
import { applyTableLook } from './table-look.js'
import { brandFaces, fontRequirements } from './brand-faces.js'

const MM_PT = 72 / 25.4
const hex = (value, fallback = '000000') => /^[#]?[\da-f]{6}$/i.test(String(value)) ? String(value).replace('#', '') : fallback
const encode64 = (bytes) => {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let text = ''
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(text)
}
const decode64 = (text) => typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(text, 'base64')) : Uint8Array.from(atob(text), (c) => c.charCodeAt(0))
/** The words of inline-marked text (**strong**, *second tone*, [label](url)) without the marks: the plain styles set no emphasis. */
const plainText = (value) => String(value ?? '').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
const textOf = (value) => value == null ? '' : typeof value === 'object' ? String(value.text ?? '') : String(value)
const captionOf = (block) => block.provenance && !String(block.caption ?? '').includes(block.provenance) ? [block.caption, `Source: ${block.provenance}`].filter(Boolean).join(' ') : block.caption ?? ''
const STYLE_IDS = { title: 'Title', subtitle: 'Subtitle', heading1: 'Heading1', heading2: 'Heading2', heading3: 'Heading3', body: 'BodyText', caption: 'Caption', table: 'TableText', label: 'Header', footer: 'Footer', affiliationDepartment: 'AffiliationDepartment', affiliationSubdepartment: 'AffiliationSubdepartment' }

const profileOf = (ctx, publication) => publication.profile ?? documentProfile(ctx.brand, { paper: publication.paper })
const styleOf = (block) => STYLE_IDS[block.style] ?? (Object.values(STYLE_IDS).includes(block.style) ? block.style : block.type === 'heading' ? `Heading${Math.max(1, Math.min(3, Number(block.level) || 1))}` : 'BodyText')
const tokenOf = (style) => Object.entries(STYLE_IDS).find(([, id]) => id === style)?.[0] ?? 'body'
const typeOf = (profile, token) => token.startsWith('affiliation')
  ? { ...typeOf(profile, 'body'), sizePt: profile.affiliation?.[token === 'affiliationDepartment' ? 'departmentSizePt' : 'subdepartmentSizePt'] ?? (token === 'affiliationDepartment' ? 12 : 10.5), lineHeight: profile.affiliation?.lineHeight ?? 1.3, spaceAfterPt: token === 'affiliationDepartment' ? 2 : 0 }
  : profile.typography?.[token] ?? profile.typography?.body ?? { font: 'body', sizePt: 11, lineHeight: 1.3 }
const contentWidth = (profile) => profile.paper.widthMm - profile.margins.leftMm - profile.margins.rightMm
const pageBlocks = (page) => page.blocks?.length ? page.blocks : page.title ? [{ type: 'heading', text: page.title }] : []

const validate = (ctx, publication) => {
  if (!publication || !Array.isArray(publication.pages) || !publication.pages.length) throw new Error('A publication needs at least one page.')
  const problems = validatePublication({ ...publication, profile: profileOf(ctx, publication) })
  if (problems.length) throw new Error(`Invalid publication: ${problems.join(' ')}`)
  for (const page of publication.pages) for (const block of pageBlocks(page)) {
    if (!BLOCK_TYPES.includes(block.type)) throw new Error(`Unsupported publication block: ${block.type}`)
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
const logoOf = (ctx, profile, affiliation) => {
  if (profile.logo?.hidden) return null
  // Named for a department, a brand with sub-logos puts the department's on the cover; its name
  // is then in the logo, not repeated as text.
  const field = ctx.brand.departments?.field
  const unit = Boolean(profile.logo?.departmental && field && affiliation?.department)
  const options = unit ? { signature: profile.logo.departmental, colourway: profile.logo.options?.colourway } : profile.logo?.options ?? {}
  const svg = sanitizeSvg(logoDocument({ ...ctx, outline: true, ...(unit ? { values: { ...ctx.values, [field]: affiliation.department } } : {}) }, options))
  // The full mark belongs on the cover, where its minimum size is respected.
  // Continuation headers use native text instead of shrinking a logo below it.
  const width = Math.min(contentWidth(profile), Math.max(ctx.brand.lockup?.minimumHorizontalWidthMm ?? 0, profile.logo?.minimumWidthMm ?? 0, profile.logo?.widthMm ?? 40))
  const spacing = Number(profile.logo?.clearSpaceMm ?? 6)
  const clearSpaceMm = Math.max(Math.max(0, Number(ctx.brand.logoPolicy?.clearSpaceRatio) || 0) * width, Number.isFinite(spacing) ? Math.max(0, Math.min(100, spacing)) : 6)
  const alt = profile.logo?.alt ?? `${ctx.brand.name} logo`
  return { svg, width, height: width / svgAspect(svg), clearSpaceMm, unit, alt: unit ? `${alt}, ${affiliation.department}` : alt }
}

/**
 * Checks a publication as the writers read it, without writing anything: its structure, its embedded
 * images and its designed cover. Throws with the problems; a caller adopts a publication only after it.
 */
export const checkPublication = (ctx, publication) => {
  validate(ctx, publication)
  const profile = profileOf(ctx, publication)
  for (const page of publication.pages) {
    if (page.cover) validateCover(page.cover, profile)
    for (const src of blockSources(pageBlocks(page))) imageSource(src)
    for (const block of pageBlocks(page)) if (block.type === 'figure' && !block.placeholder && !block.src) imageSource(block.src)
  }
}
const validateCover = (cover, profile) => {
  const problems = validateWelcomeCover(cover, profile)
  if (problems.length) throw new Error(`Invalid welcome cover: ${problems.join(' ')}`)
}

const PT = (mm) => Math.round(mm * MM_PT * 100) / 100

/**
 * Each Word style a publication has always had (office.js STYLE_SPECS), as document-kit text: the
 * theme's own roles (Normal, Title, Subtitle, Heading 1–3, Caption, Header, Footer) and the styles the
 * document defines beside them (Body Text, Table Text, the affiliation styles, Label, Footer Text).
 */
const publicationLooks = (ctx, profile) => {
  const ink = hex(profile.colours.ink)
  return Object.fromEntries(STYLE_SPECS.map((entry) => {
    const [id] = entry
    const { spec, font, size } = styleSpec(ctx.brand, profile, entry)
    const heading = /^Heading[123]$/.test(id)
    return [id, {
      face: font,
      text: {
        font: font.name, size, color: hex(spec.colour ?? ink, ink), bold: font.bold, italic: font.italic, allCaps: Boolean(spec.caps), smallCaps: false,
        characterSpacing: spec.trackingEm ? Math.round(spec.trackingEm * size * 20) / 20 : 0,
        align: 'left', before: 0, after: spec.spaceAfterPt ?? (heading ? 8 : 6), line: spec.lineHeight ?? 1.2,
        ...(heading ? { keepWithNext: true } : {})
      },
      rule: spec.ruleBelow ? { style: 'single', width: spec.ruleBelow.widthPt, color: hex(spec.ruleBelow.colour), space: spec.ruleBelow.gapPt } : undefined
    }]
  }))
}

/** Where each of a publication's style ids is in the block model: a theme role, or a style it defines. */
const DEFINED_STYLES = [['BodyText', 'Body Text', 'BodyText'], ['TableText', 'Table Text', 'TableText'], ['Label', 'Label', 'Header'], ['FooterText', 'Footer Text', 'Footer'],
  ['AffiliationDepartment', 'Affiliation Department', 'AffiliationDepartment'], ['AffiliationSubdepartment', 'Affiliation Subdepartment', 'AffiliationSubdepartment']]
const STYLE_REFS = { Title: 'title', Subtitle: 'subtitle', Caption: 'caption', Header: 'Label', Footer: 'FooterText', ListParagraph: 'BodyText' }

/**
 * The publication as document-kit's block model, and the brand's faces it is set in:
 * `{ document, faces }`. One section a page, each with its running header and its footer, the
 * brand logo (drawn as a PNG by `png(svg, width)`) and the affiliation on the first. Everything is
 * native text in named styles; tables carry the brand's table design.
 */
export const publicationDocument = async (ctx, publication, { png } = {}) => {
  validate(ctx, publication)
  const profile = profileOf(ctx, publication)
  const sourceRevision = String(ctx.sourceRevision ?? '').trim()
  // A designed cover carries its own artwork, logos included: the brand logo is not set again under it.
  const covered = Boolean(publication.pages[0]?.cover)
  const logo = covered ? null : logoOf(ctx, profile, publication.affiliation)
  if (logo && typeof png !== 'function') throw new Error('A PNG renderer is required to put the brand logo in Word.')
  const logoBytes = logo ? await png(logo.svg, Math.round(logo.width * 200 / 25.4)) : null
  const looks = publicationLooks(ctx, profile)
  const muted = hex(profile.colours.muted, '555555')
  const tableType = typeOf(profile, 'table')
  const look = tableLook(profile, ctx.brand)

  // A role ruled below (a house title over a rule) carries its rule: a defined style in its definition,
  // a theme paragraph on the paragraph, a heading through a ruled style based on it.
  const ruledHeadings = [1, 2, 3].filter((level) => looks[`Heading${level}`].rule)
  const styles = { paragraph: [
    ...DEFINED_STYLES.map(([id, name, from]) => ({ id, name, basedOn: 'normal', next: 'BodyText', text: looks[from].text, ...(looks[from].rule ? { borders: { bottom: looks[from].rule } } : {}) })),
    ...ruledHeadings.map((level) => ({ id: `RuledHeading${level}`, name: `Heading ${level} Ruled`, basedOn: `heading${level}`, next: 'BodyText', borders: { bottom: looks[`Heading${level}`].rule } }))
  ] }
  const styled = (styleId, content, options = {}) => {
    const level = /^Heading([123])$/.exec(styleId)?.[1]
    if (level) return ruledHeadings.includes(Number(level)) ? paragraph(content, { style: `RuledHeading${level}`, keepWithNext: true, ...options }) : heading(Number(level), content)
    const rule = STYLE_REFS[styleId] && !['Header', 'Footer', 'ListParagraph'].includes(styleId) ? looks[styleId]?.rule : undefined
    return paragraph(content, { style: STYLE_REFS[styleId] ?? styleId, ...(rule ? { borders: { bottom: rule } } : {}), ...options })
  }
  const caption = (content) => paragraph(content, { style: 'caption', spacing: { before: PT(3), after: typeOf(profile, 'caption').spaceAfterPt ?? 9 } })
  const gap = () => paragraph('', { style: 'BodyText', spacing: { after: 4 } })

  const tableBlocks = (block) => {
    const headers = block.headers ?? []
    const count = Math.max(headers.length, ...block.rows.map((row) => row.length))
    if (!count) return []
    const widths = block.widths?.length === count ? block.widths.map((n) => Number(n) > 0 ? Number(n) : 1) : Array(count).fill(1)
    const printed = block.showHeaders === false ? [] : headers
    // A value still to confirm reads as a gap, not as an answer.
    const cells = (row, header) => Array.from({ length: count }, (_, column) => {
      const value = row[column]
      const content = value && typeof value === 'object' ? [value.n, plainText(value.text), value.ext].filter(Boolean).join(' ') : plainText(textOf(value))
      return { content, ...(!header && column > 0 && block.pending && content.trim() === block.pending ? { text: { color: muted } } : {}) }
    })
    const none = { style: 'none' }
    const written = table([...(printed.length ? [{ role: 'header', cells: cells(printed, true), cantSplit: true }] : []), ...block.rows.map((row) => ({ cells: cells(row, false), cantSplit: true }))], {
      columnWidths: widths, width: 100, spaceAfter: 0, borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none }
    })
    applyTableLook([written], look, tableType, { font: looks.TableText.face.name, bold: looks.TableText.face.bold, italic: looks.TableText.face.italic, color: looks.TableText.text.color, size: looks.TableText.text.size })
    return [written, block.caption ? caption(block.caption) : gap()]
  }

  const figureBlocks = (block) => {
    const image = block.placeholder ? null : imageSource(block.src)
    const size = figureSize(profile, block, image)
    const text = captionOf(block)
    const after = text ? [caption(text)] : block.placeholder ? [gap()] : []
    if (block.placeholder) {
      // A native cell keeps the placeholder's label as text to replace, not an unexplained blank.
      const line = { style: 'single', width: 0.5, color: hex(profile.colours.line, 'D9D9D9') }
      const label = block.label || 'Screenshot placeholder'
      return [table([{ cells: [{ blocks: [
        paragraph(label, { style: 'BodyText', align: 'center', spacing: { after: 4 }, text: { color: muted } }),
        paragraph('Replace with an actual image', { style: 'caption', align: 'center', spacing: { after: 0 }, text: { color: muted } })
      ], verticalAlign: 'center', shading: hex(profile.colours.light, 'F3F3F3'), padding: { top: 6, bottom: 6, left: 12, right: 12 } }], height: PT(size.height), cantSplit: true, keepWithNext: Boolean(text) }],
      { columnWidths: [1], width: Math.min(100, 100 * size.width / contentWidth(profile)), align: 'center', spaceAfter: 0, borders: { top: line, bottom: line, left: line, right: line } }), ...after]
    }
    const alt = block.alt || text || 'Publication figure'
    return [paragraph([inlineImage(kitImage(image.bytes), PT(size.width), PT(size.height), alt)], { align: 'center', keepWithNext: Boolean(text), spacing: { before: 4, after: 0, line: 1 } }), ...after]
  }

  const line = { style: 'single', width: 0.5, color: hex(profile.colours.line, 'D9D9D9') }
  const none = { style: 'none' }
  const plainBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none }
  /** Cells side by side with no rules: columns, and the cells of a scale. */
  const cellsTable = (cells, widths) => table([{ cantSplit: true, cells: cells.map((blocks, index) => ({ blocks: blocks.length ? blocks : [paragraph('', { style: 'BodyText' })], padding: { top: 0, bottom: 0, left: index ? PT(3) : 0, right: index < cells.length - 1 ? PT(3) : 0 } })) }],
    { columnWidths: widths ?? cells.map(() => 1), width: 100, borders: plainBorders, spaceAfter: 6 })
  /** A callout as paragraphs on the light ground, ruled: what a page-foot frame can hold too. */
  const calloutParagraphs = (block) => {
    const box = { shading: hex(profile.colours.light, 'F3F3F3'), borders: { top: { ...line, space: 4 }, bottom: { ...line, space: 4 }, left: { ...(block.strong ? { style: 'single', width: 2.25, color: hex(profile.colours.accent) } : line), space: 6 }, right: { ...line, space: 6 } }, indent: { left: PT(2), right: PT(2) } }
    return [
      ...(block.label ? [styled('Header', plainText(block.label), box)] : []),
      ...(block.title ? [paragraph(plainText(block.title), { style: 'BodyText', text: { bold: true }, ...box })] : []),
      ...(block.text ? [styled('BodyText', plainText(block.text), box)] : []),
      ...(block.field ? [styled('Header', plainText(block.field), box)] : [])
    ]
  }
  const blocksOf = (block, { inPush = false } = {}) => {
    if (block.type === 'heading') return [styled(styleOf(block), plainText(textOf(block.text)), { keepWithNext: true })]
    if (block.type === 'paragraph') return [styled(styleOf(block), plainText(textOf(block.text)))]
    if (block.type === 'list') return [{ type: 'list', ordered: Boolean(block.ordered), items: block.items.map((item) => plainText(textOf(item))) }]
    if (block.type === 'table') return tableBlocks(block)
    if (block.type === 'figure') return figureBlocks(block)
    if (block.type === 'opening') return [...(block.kicker ? [styled('Header', plainText(block.kicker), { keepWithNext: true })] : []), styled('Heading1', plainText(block.title), { keepWithNext: true }), ...(block.lead ? [styled('Subtitle', plainText(block.lead))] : [])]
    if (block.type === 'kicker' || block.type === 'masthead') return [styled('Header', plainText(block.text), { keepWithNext: block.type === 'kicker' })]
    if (block.type === 'lead') return [styled('Subtitle', plainText(block.text))]
    if (block.type === 'statement') return [styled('Heading2', plainText(block.text))]
    if (block.type === 'note') return [caption([...(block.label ? [kitText(`${plainText(block.label)}  `, { bold: true })] : []), kitText(plainText(block.text))])]
    if (block.type === 'signoff') return [paragraph(plainText(block.text), { style: 'caption', borders: { top: { ...line, space: 6 } }, spacing: { before: 6 } })]
    if (block.type === 'spacer') return [spacer(PT(block.heightMm))]
    if (block.type === 'steps') return [kitList(block.items.map((item) => [kitText(plainText(item.title), { bold: true }), ...(item.text ? [kitText(` ${plainText(item.text)}`)] : [])]), { ordered: block.numbered !== false })]
    if (block.type === 'callout') {
      const content = calloutParagraphs(block)
      if (inPush) return content
      return [table([{ cantSplit: true, cells: [{ blocks: content.map(({ shading, borders, indent, ...rest }) => rest), shading: hex(profile.colours.light, 'F3F3F3'), padding: { top: 6, bottom: 6, left: 8, right: 8 },
        ...(block.strong ? { borders: { left: { style: 'single', width: 2.25, color: hex(profile.colours.accent) } } } : {}) }] }], { columnWidths: [1], width: 100, borders: plainBorders, spaceAfter: 8 })]
    }
    if (block.type === 'facts') return inPush
      ? block.items.map(([label, value]) => paragraph([kitText(`${plainText(label)}: `, { bold: true }), kitText(plainText(value))], { style: 'BodyText', spacing: { after: 2 } }))
      : [{ type: 'fields', layout: 'table', rows: block.items.map(([label, value]) => ({ label: plainText(label), value: plainText(value) })) }, gap()]
    if (block.type === 'columns') return [cellsTable(block.columns.map((column) => column.flatMap((child) => blocksOf(child))), block.widths), gap()]
    if (block.type === 'scale') return [...(block.label ? [styled('Header', plainText(block.label), { keepWithNext: true })] : []), cellsTable(block.items.map((item) => [
      ...(item.code ? [styled('Header', item.code)] : []), paragraph(plainText(item.name), { style: 'BodyText', text: { bold: true } }),
      paragraph(`${item.level} of ${block.steps ?? block.items.length}${item.note ? ` · ${plainText(item.note)}` : ''}`, { style: 'caption' }),
      ...(item.text ? [styled('BodyText', plainText(item.text))] : [])
    ])), gap()]
    if (block.type === 'references') return block.items.map(([n, title, body]) => caption([kitText(`${n}  `), kitText(plainText(title), { bold: true }), ...(body ? [kitText(` ${plainText(body)}`)] : [])]))
    if (block.type === 'contents') return block.items.map(([label, pages]) => paragraph([kitText(plainText(label)), tab(), kitText(pages)], { style: 'BodyText', tabs: [{ at: 'end', align: 'right' }] }))
    if (block.type === 'devices' || block.type === 'phones') {
      const srcs = block.type === 'phones' ? block.srcs : block.src ? [block.src] : block.items.map((item) => item[1])
      return [...srcs.flatMap((src, index) => figureBlocks({ src, alt: block.caption ?? 'Device mockup', heightMm: block.heightMm, ...(index === srcs.length - 1 ? { caption: block.caption } : {}) }))]
    }
    if (block.type === 'push') return [pinned(block.blocks.flatMap((child) => blocksOf(child, { inPush: true })))]
    throw new Error(`Unsupported publication block: ${block.type}`)
  }

  const margins = { top: PT(profile.margins.topMm), right: PT(profile.margins.rightMm), bottom: PT(profile.margins.bottomMm), left: PT(profile.margins.leftMm), header: PT(8), footer: PT(8) }
  const footer = [paragraph([kitText([profile.footer?.text ?? ctx.brand.name, publication.edition].filter(Boolean).join('  ·  ')), tab(), pageNumber()], { tabs: [{ at: 'end', align: 'right' }] })]
  const cover = covered ? await welcomeCoverSection(ctx, profile, publication.pages[0].cover) : null
  const sections = publication.pages.map((page, index) => {
    if (page.cover) return cover.section
    const body = []
    if (index === 0 && logo) body.push(paragraph([inlineImage(kitImage(logoBytes), PT(logo.width), PT(logo.height), logo.alt)], { keepWithNext: true, spacing: { after: PT(logo.clearSpaceMm), line: 1 } }))
    if (index === 0 && !covered && publication.affiliation?.department) {
      const { department, subdepartment } = publication.affiliation
      const after = { spacing: { after: PT(profile.affiliation?.gapAfterMm ?? 5) } }
      if (!logo?.unit) body.push(paragraph(department, { style: 'AffiliationDepartment', keepWithNext: true, ...(!subdepartment ? after : {}) }))
      if (subdepartment) body.push(paragraph(subdepartment, { style: 'AffiliationSubdepartment', keepWithNext: true, ...after }))
    }
    for (const block of pageBlocks(page)) body.push(...blocksOf(block))
    const running = index ? publication.title ?? profile.header?.text ?? ctx.brand.name : profile.header?.text ?? ctx.brand.name
    return section(body.length ? body : [paragraph('', { style: 'BodyText' })], {
      page: { paper: { width: PT(profile.paper.widthMm), height: PT(profile.paper.heightMm) }, margins },
      header: [paragraph(running)], footer
    })
  })

  // The faces the styles name, embedded where their licences allow (fontEmbeddingReport), and a record
  // of each face, embedded or not, in the file's custom properties.
  const named = [...officeStyleFonts(ctx.brand, profile), ...tableFonts(profile, ctx.brand)]
  const used = new Set(named.map((item) => item.font.toLowerCase()))
  const faces = brandFaces(ctx).filter((face) => used.has(face.family.toLowerCase()))
  const document = kitDocument(sections, {
    metadata: {
      title: publication.title ?? ctx.brand.name, author: ctx.brand.name, subject: publication.subtitle ?? publication.purpose,
      description: `${ctx.brand.name} editable ${publication.purpose ?? 'publication'} · ${publication.edition ?? ctx.brand.version ?? ''}`,
      custom: {
        'brandkit.publicationId': String(publication.id ?? ''),
        'brandkit.fontRequirements': JSON.stringify(publicationFontRequirements(ctx, named, faces)),
        ...(publication.affiliation?.department ? { 'brandkit.affiliation': JSON.stringify(publication.affiliation) } : {}),
        ...(sourceRevision ? { 'brandkit.sourceRevision': sourceRevision } : {})
      }
    },
    theme: {
      // Kerned throughout, as browsers and Word set text (document-kit writes it to Word's defaults).
      body: { ...looks.Normal.text, kern: true }, title: looks.Title.text, subtitle: looks.Subtitle.text,
      headings: [looks.Heading1.text, looks.Heading2.text, looks.Heading3.text], caption: looks.Caption.text,
      header: looks.Header.text, footer: looks.Footer.text, link: { color: hex(profile.colours.accent), underline: true },
      table: { size: tableType.sizePt ?? looks.TableText.text.size, headerFill: '', headerText: { bold: false }, headerAlign: 'left', outerBorder: { style: 'none' }, innerBorder: { style: 'none' }, spaceAfter: 0 }
    },
    styles: { ...styles, paragraph: [...styles.paragraph, ...(cover?.styles ?? [])] }
  })
  return { document, faces }
}

/** Each face a publication's styles name, with whether the Word file carries it and why (`brandkit.fontRequirements`). */
const publicationFontRequirements = (ctx, named, faces, target = 'docx') => {
  const report = fontRequirements(ctx, faces, target)
  const seen = new Set()
  return named.flatMap((item) => {
    const weight = item.bold ? 700 : 400
    const style = item.italic ? 'italic' : 'normal'
    const id = `${item.font.toLowerCase()}|${weight}|${style}`
    if (seen.has(id)) return []
    seen.add(id)
    const face = report.find((entry) => entry.family.toLowerCase() === item.font.toLowerCase() && entry.weight === weight && entry.style === style)
    if (face) return [face]
    const spec = ctx.brand.fonts?.[item.key] ?? {}
    const reason = spec.office && spec.office !== spec.family ? 'The document names the installed Office face; install it where the document is opened.'
      : !ctx.fonts?.faces?.[item.key]?.bytes ? 'Font bytes are unavailable; install the font locally.'
        : 'No face of this weight or style was supplied; Word and the layout set it from the family’s regular face.'
    return [{ role: item.key, family: item.font, weight, style, embedded: false, reason, fsType: null, licence: spec.license ?? null, usage: spec.usage ?? null }]
  })
}

/**
 * Native Word publication. All text, lists, headings and tables remain editable. Written by
 * document-kit (`writeDocx`) from publicationDocument, with the brand's faces embedded where their
 * licences allow; a designed welcome cover is its first section.
 */
export const publicationDocx = async (ctx, publication, { png } = {}) => {
  validate(ctx, publication)
  const [{ document, faces }, { writeDocx }] = await Promise.all([publicationDocument(ctx, publication, { png }), import('document-kit/docx')])
  return writeDocx(document, { embedFonts: faces })
}

/**
 * The publication's print view: one self-contained HTML page written by document-kit (`writeHtml`)
 * from the same document as the Word file, in the same faces.
 */
export const publicationPrintHtml = async (ctx, publication, { png } = {}) => {
  validate(ctx, publication)
  const [{ document, faces }, { writeHtml }] = await Promise.all([publicationDocument(ctx, publication, { png }), import('document-kit/html')])
  return writeHtml(document, { fonts: faces, lang: 'en' })
}
