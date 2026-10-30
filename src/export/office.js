// Writes Office files from a brand's documents (brand.documents; see src/engine/office.js):
// Word templates (.docx), PowerPoint templates (.pptx) and HTML email signatures.
//
// The libraries (docx, pptxgenjs) are loaded only when a file is made, so the app does not carry
// them until someone asks for one. Backgrounds are drawn as PNG by the caller's `png(svg, width)`,
// the same renderer the kit uses for its images.

import { documentPage, officeFont, rowsOf, signatureLayout, slideLayout } from '../engine/office.js'
import { fill } from '../engine/brand.js'
import { renderTemplate } from '../engine/templates.js'
import { documentationDocumentsFor, publicationModel } from '../engine/documentation.js'

const twips = (points) => Math.round(points * 20)

const base64 = (bytes) => {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let out = ''
  for (let index = 0; index < bytes.length; index += 0x8000) out += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  return btoa(out)
}

const templateOf = (brand, id) => {
  const template = brand.templates.find((entry) => entry.id === id)
  if (!template) throw new Error(`No template ${id}`)
  return template
}

/** The template's background (what is not text) as a PNG `dpi` dots to the inch. */
const backgroundPng = async (ctx, page, png, dpi = 200, extra = {}) => {
  // Fields have been removed from this artwork. Their construction guides are preview-only
  // and may refer to those missing flow items, so remove the guide model before rendering.
  const svg = renderTemplate({ ...ctx, outline: true, showLayoutGuides: false, showGuides: false }, { ...page.template, ...extra, guides: undefined, elements: page.background }).svg
  return png(svg, Math.min(3000, Math.round((page.width / 72) * dpi)))
}

/** The documents a template takes part in. */
export const documentsFor = (brand, templateId) => [...(brand.documents ?? []), ...documentationDocumentsFor(brand)]
  .filter((document, index, all) => all.findIndex((entry) => entry.id === document.id) === index)
  .filter((document) => [...(document.pages ?? []), ...(document.layouts ?? []), document.template].includes(templateId))

export const EXTENSIONS = { docx: 'docx', pptx: 'pptx', html: 'html' }
export const FORMAT_LABELS = { docx: 'Word', pptx: 'PowerPoint', html: 'HTML' }

// --- Word ---------------------------------------------------------------------------------------

const isTrueType = (bytes) => bytes && bytes.length > 4 && ((bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0) || String.fromCharCode(...bytes.subarray(0, 4)) === 'true')

const embeddingFlags = (face) => {
  const table = face?.font?.tables?.os2
  if (Number.isInteger(table?.fsType)) return { fsType: table.fsType, version: table.version ?? 3 }
  const bytes = face?.bytes
  if (!bytes || bytes.length < 12) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const count = view.getUint16(4)
  for (let i = 0; i < count && 12 + (i + 1) * 16 <= bytes.length; i++) {
    const offset = 12 + i * 16
    if (String.fromCharCode(...bytes.subarray(offset, offset + 4)) !== 'OS/2') continue
    const start = view.getUint32(offset + 8)
    if (start + 10 <= bytes.length) return { version: view.getUint16(start), fsType: view.getUint16(start + 8) }
  }
  return null
}

/**
 * Check OpenType OS/2 permissions for an editable document, without modifying
 * them or subsetting the font. Vendor licence terms still accompany the kit.
 * https://learn.microsoft.com/en-us/typography/opentype/spec/os2#fstype
 */
export const fontEmbeddingPermission = (face) => {
  const flags = embeddingFlags(face)
  if (!flags) return { allowed: false, reason: 'Embedding permissions are unavailable; install the licensed font locally.' }
  const { fsType, version } = flags
  const permission = fsType & 0x000f
  if (version >= 2 && fsType & 0x0200) return { allowed: false, ...flags, reason: 'The font permits bitmap embedding only.' }
  if (permission === 2) return { allowed: false, ...flags, reason: 'The font restricts embedding.' }
  if (permission === 4) return { allowed: false, ...flags, reason: 'Preview and print embedding cannot be used in an editable document.' }
  if (![0, 8].includes(permission) && !(version <= 2 && permission & 8)) return { allowed: false, ...flags, reason: 'Embedding flags do not grant editable use.' }
  return { allowed: true, ...flags, reason: 'Complete font embedded; no subsetting.' }
}

/** Machine-readable installation requirements for faces that cannot travel. */
export const officeFontRequirements = (ctx, items, { format = 'docx' } = {}) => {
  const seen = new Set()
  return items.filter((item) => item.key && item.kind !== 'rule').flatMap((item) => {
    const key = `${item.font}|${item.bold}|${item.italic}`
    if (seen.has(key)) return []
    seen.add(key)
    const face = ctx.fonts?.faces?.[item.key]
    const spec = ctx.brand.fonts?.[item.key]
    const permission = fontEmbeddingPermission(face)
    let reason = permission.reason
    let embedded = permission.allowed
    if (!face?.bytes) { embedded = false; reason = 'Font bytes are unavailable; install the font locally.' }
    else if (spec?.office && spec.office !== spec.family) { embedded = false; reason = 'The document uses the explicit installed Office substitute.' }
    else if (format === 'docx' && !isTrueType(face.bytes)) { embedded = false; reason = 'Word export embeds TrueType outlines; install this OpenType face locally.' }
    else if (item.weight != null && Number(spec?.weight ?? 400) !== Number(item.weight)) { embedded = false; reason = 'This requested weight has no matching supplied font face.' }
    return [{ role: item.key, family: item.font, weight: item.weight ?? spec?.weight ?? 400, style: item.italic ? 'italic' : 'normal', embedded, reason, fsType: permission.fsType ?? null, licence: spec?.license ?? null, usage: spec?.usage ?? null }]
  })
}

/**
 * The brand's own faces, embedded so the document looks right where they are not installed:
 * TrueType files only (what Word embeds), and only faces whose Office name is their own (a face
 * standing in for Helvetica is named Helvetica, and left to the system).
 */
export const embeddedFonts = (ctx, items) => {
  const families = new Map()
  for (const item of items) {
    if (item.kind === 'rule' || !item.key) continue
    const face = ctx.fonts?.faces?.[item.key]
    const spec = ctx.brand.fonts?.[item.key]
    if (!isTrueType(face?.bytes) || (spec?.office && spec.office !== spec.family)) continue
    if (!fontEmbeddingPermission(face).allowed) continue
    // A synthesized weight must not register a different font's bytes as that face.
    if (item.weight != null && Number(spec?.weight ?? 400) !== Number(item.weight)) continue
    const family = families.get(item.font) ?? {}
    const slot = item.bold && item.italic ? 'boldItalic' : item.bold ? 'bold' : item.italic ? 'italic' : 'data'
    family[slot] ??= face.bytes
    families.set(item.font, family)
  }
  return [...families].filter(([, faces]) => faces.data ?? faces.bold).map(([name, faces]) => ({ name, ...faces, data: faces.data ?? faces.bold }))
}

const STYLE_SPECS = [
  ['Normal', 'Normal', 'body', 'body', 11],
  ['Title', 'Title', 'title', 'display', 30],
  ['Subtitle', 'Subtitle', 'subtitle', 'body', 14],
  ['Heading1', 'Heading 1', 'heading1', 'display', 21],
  ['Heading2', 'Heading 2', 'heading2', 'bold', 15],
  ['Heading3', 'Heading 3', 'heading3', 'bold', 12],
  ['BodyText', 'Body Text', 'body', 'body', 11],
  ['Caption', 'Caption', 'caption', 'body', 9],
  ['ListParagraph', 'List Paragraph', 'body', 'body', 11],
  ['TableText', 'Table Text', 'table', 'body', 10],
  ['Header', 'Header', 'label', 'label', 9],
  ['Footer', 'Footer', 'footer', 'label', 9],
  ['AffiliationDepartment', 'Affiliation Department', 'affiliationDepartment', 'body', 12],
  ['AffiliationSubdepartment', 'Affiliation Subdepartment', 'affiliationSubdepartment', 'body', 10.5]
]

const styleSpec = (brand, profile, [, , token, key, size]) => {
  const spec = token.startsWith('affiliation')
    ? { ...profile.typography?.body, sizePt: profile.affiliation?.[token === 'affiliationDepartment' ? 'departmentSizePt' : 'subdepartmentSizePt'] ?? size, lineHeight: profile.affiliation?.lineHeight ?? 1.3, spaceAfterPt: token === 'affiliationDepartment' ? 2 : 0 }
    : profile.typography?.[token] ?? {}
  const selected = brand.fonts?.[spec.font ?? key] ? spec.font ?? key : 'body'
  const font = officeFont(brand, selected, { weight: spec.weight, italic: spec.italic })
  return { spec, font, size: spec.sizePt ?? size }
}

/** Font records needed by named styles as well as by the existing text. */
export const officeStyleFonts = (brand, profile = {}) => STYLE_SPECS.map((entry) => {
  const { font } = styleSpec(brand, profile, entry)
  return { ...font, font: font.name, kind: 'field' }
})

/** Named native Word styles let later editing retain the brand's hierarchy. */
export const officeStyles = (brand, profile = {}, defaults = {}) => {
  const ink = String(profile.colours?.ink ?? '000000').replace('#', '')
  const paragraphStyles = STYLE_SPECS.map((entry) => {
    const [id, name] = entry
    const { spec, font, size } = styleSpec(brand, profile, entry)
    const heading = /^Heading[123]$/.test(id)
    return {
      id, name, ...(id === 'Normal' ? { next: 'Normal' } : { basedOn: 'Normal', next: 'BodyText' }), quickFormat: true,
      run: { font: font.name, size: Math.round(size * 2), bold: font.bold, italics: font.italic, color: String(spec.colour ?? ink).replace('#', ''),
        ...(spec.caps ? { allCaps: true } : {}), ...(spec.trackingEm ? { characterSpacing: Math.round(spec.trackingEm * size * 20) } : {}) },
      paragraph: {
        spacing: { after: twips(spec.spaceAfterPt ?? (heading ? 8 : 6)), line: Math.round(240 * (spec.lineHeight ?? 1.2)) },
        // Word measures a paragraph border in eighths of a point, its gap in points.
        ...(spec.ruleBelow ? { border: { bottom: { style: 'single', size: Math.min(96, Math.round(spec.ruleBelow.widthPt * 8)), color: spec.ruleBelow.colour.replace('#', ''), space: Math.round(spec.ruleBelow.gapPt) } } } : {}),
        ...(heading ? { outlineLevel: Number(id.slice(-1)) - 1, keepNext: true } : {}),
        ...(id === 'Title' || id === 'Subtitle' ? { keepNext: true } : {})
      }
    }
  })
  const body = paragraphStyles.find((style) => style.id === 'BodyText')
  return { default: { document: { run: { ...body.run, ...defaults }, paragraph: { widowControl: true } } }, paragraphStyles }
}

/**
 * An explicit, finite sequence of page designs. Each page has its own artwork and native
 * positioned text, so columns and a final back cover are retained. This is opt-in: ordinary
 * letters keep their established first-page/continuation-page flowing-text behavior below.
 */
const sequenceDocx = async (ctx, document, pages, docx, png) => {
  const { AlignmentType, Document, Footer, FrameAnchorType, FrameWrap, Header, HorizontalPositionRelativeFrom, ImageRun, LineRuleType, Packer, PageNumber, PageOrientation, Paragraph, SectionType, TextRun, TextWrappingType, VerticalPositionRelativeFrom } = docx
  const textOf = (page) => [...page.header, ...page.body, ...page.footer].filter((item) => item.kind !== 'rule')
  const allText = [...pages.flatMap(textOf), ...officeStyleFonts(ctx.brand)]
  const empty = () => new Paragraph({ spacing: { before: 0, after: 0, line: 1, lineRule: LineRuleType.EXACT }, children: [] })
  const sections = []
  for (const page of pages) {
    const items = textOf(page)
    const taken = new Set(items.map((item) => item.element))
    // Rules stay with the fixed artwork in this mode, including those in the text zone.
    const data = await backgroundPng(ctx, { ...page, background: page.template.elements.filter((element, index) => !taken.has(index)) }, png)
    const artwork = new Paragraph({
      spacing: { before: 0, after: 0, line: 1, lineRule: LineRuleType.EXACT },
      children: [new ImageRun({
        type: 'png', data,
        transformation: { width: Math.round(page.width / 0.75), height: Math.round(page.height / 0.75) },
        floating: { horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 }, verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 }, behindDocument: true, allowOverlap: true, wrap: { type: TextWrappingType.NONE } },
        altText: { name: 'Page artwork', description: `${ctx.brand.name} ${page.template.label ?? page.template.id}`, title: page.template.label ?? page.template.id }
      })]
    })
    const children = items.map((item) => {
      const leading = item.lines.length > 1 || item.width ? item.leading : Math.max(item.leading, item.size * 1.15)
      const width = item.width ?? Math.max(item.measured + 2, item.size)
      const x = item.anchor === 'end' ? item.x - width : item.anchor === 'middle' ? item.x - width / 2 : item.x
      const style = { font: item.font, size: Math.round(item.size * 2), color: item.colour, bold: item.bold, italics: item.italic, characterSpacing: twips(item.tracking), allCaps: item.caps }
      // Keep the engine's measured line breaks, while preserving actual page-number fields.
      const runs = item.runs.some((run) => run.page) ? item.runs : [{ text: item.lines.join('\n') }]
      return new Paragraph({
        style: page.template.elements[item.element]?.documentStyle ?? (/title|subject|project-name/.test(item.id ?? '') ? 'Title' : 'BodyText'),
        alignment: item.anchor === 'end' ? AlignmentType.RIGHT : item.anchor === 'middle' ? AlignmentType.CENTER : AlignmentType.LEFT,
        keepNext: false, keepLines: true, widowControl: false,
        indent: { left: 0, right: 0 },
        spacing: { before: 0, after: 0, line: twips(leading), lineRule: LineRuleType.EXACT },
        frame: { type: 'absolute', position: { x: twips(x), y: twips(item.y - 0.8 * leading) }, anchor: { horizontal: FrameAnchorType.PAGE, vertical: FrameAnchorType.PAGE }, width: twips(width), wrap: FrameWrap.THROUGH, space: { horizontal: 0, vertical: 0 } },
        children: runs.flatMap((run) => run.page ? [new TextRun({ ...style, children: [PageNumber.CURRENT] })] : run.text.split('\n').map((line, index) => new TextRun({ ...style, text: line, ...(index ? { break: 1 } : {}) })))
      })
    })
    const landscape = page.width > page.height
    sections.push({
      properties: {
        type: SectionType.NEXT_PAGE,
        // docx swaps the supplied dimensions for landscape, so give it the portrait pair.
        page: { size: { width: twips(landscape ? page.height : page.width), height: twips(landscape ? page.width : page.height), orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: { top: 0, bottom: 0, left: 0, right: 0, header: 0, footer: 0 } }
      },
      headers: { default: new Header({ children: [artwork] }) },
      footers: { default: new Footer({ children: [empty()] }) },
      children: [...children, empty()]
    })
  }
  const file = new Document({
    fonts: embeddedFonts(ctx, allText), creator: ctx.brand.name,
    title: fill(ctx.brand, document.label ?? document.id),
    description: `${ctx.brand.name} ${document.label ?? document.id}, made by brandkit. A fixed page sequence with editable positioned text and page artwork in each header.`,
    customProperties: [{ name: 'brandkit.fontRequirements', value: JSON.stringify(officeFontRequirements(ctx, allText)) }],
    styles: officeStyles(ctx.brand), sections
  })
  return new Uint8Array(await Packer.toArrayBuffer(file))
}

/** A Word template: first/rest letter behavior, or an explicitly requested page sequence. */
export const docxFile = async (ctx, document, { png }) => {
  const docx = await import('docx')
  const { AlignmentType, BorderStyle, Document, Footer, Header, HorizontalPositionRelativeFrom, ImageRun, LineRuleType, Packer, PageNumber, Paragraph, Tab, TabStopType, Table, TableCell, TableLayoutType, TableRow, TextRun, TextWrappingType, VerticalPositionRelativeFrom, WidthType } = docx
  const pages = document.pages.map((id) => documentPage(ctx, templateOf(ctx.brand, id)))
  if (document.pageMode === 'sequence') return sequenceDocx(ctx, document, pages, docx, png)
  const [first, rest = null] = pages
  const width = first.width
  const height = first.height

  const runs = (item) => {
    const style = { font: item.font, size: Math.round(item.size * 2), color: item.colour, bold: item.bold, italics: item.italic, characterSpacing: twips(item.tracking), allCaps: item.caps }
    const out = []
    item.runs.forEach((run) => {
      if (run.page) out.push(new TextRun({ ...style, children: [PageNumber.CURRENT] }))
      else run.text.split('\n').forEach((line, index) => out.push(new TextRun({ ...style, text: line, ...(index ? { break: 1 } : {}) })))
    })
    return out
  }
  const lineHeight = (item) => (item.lines.length > 1 || item.width ? item.leading : Math.max(item.leading, item.size * 1.15))

  // Header and footer text is laid out in a borderless table, a column for each place text starts
  // (or, set flush right, ends), each paragraph spaced to its baseline. Every Word reader keeps a
  // table where it is put; not all keep frames.
  const zoneTable = (items, { footer = false } = {}) => {
    if (!items.length) return []
    const tops = items.map((item) => item.y - 0.8 * lineHeight(item))
    const zoneTop = footer ? Math.min(...tops) : 0
    const columns = []
    for (const item of [...items].sort((a, b) => a.x - b.x)) {
      const w = (item.width ?? item.measured) + 4
      const x0 = item.anchor === 'end' ? item.x - w : item.anchor === 'middle' ? item.x - w / 2 : item.x
      const column = columns.find((entry) => entry.anchor === item.anchor && Math.abs(entry.edge - item.x) < 3)
      if (column) { column.items.push(item); column.x0 = Math.min(column.x0, x0); column.x1 = Math.max(column.x1, x0 + w) } else columns.push({ anchor: item.anchor, edge: item.x, x0, x1: x0 + w, items: [item] })
    }
    columns.sort((a, b) => a.x0 - b.x0)
    // A column runs on to the next one's start; the last, to the page's edge less its margin.
    columns.forEach((column, index) => {
      const next = columns[index + 1]
      if (column.anchor === 'start') column.x1 = Math.max(column.x1, next ? next.x0 : Math.min(width - 18, column.x1 + 72))
      if (next && column.x1 > next.x0) column.x1 = next.x0
    })
    const cells = []
    let cursor = columns[0].x0
    for (const column of columns) {
      if (column.x0 > cursor + 0.5) cells.push({ x0: cursor, x1: column.x0, items: [] })
      cells.push(column)
      cursor = column.x1
    }
    const bottomOf = (item) => item.y + (item.lines.length - 1) * lineHeight(item) + 0.2 * lineHeight(item)
    const cellParagraphs = (cell) => {
      if (!cell.items.length) return [new Paragraph({ spacing: { before: 0, after: 0, line: 20, lineRule: LineRuleType.EXACT }, children: [] })]
      const sorted = [...cell.items].sort((a, b) => a.y - b.y)
      let previous = zoneTop
      return sorted.map((item, index) => {
        const L = lineHeight(item)
        const top = item.y - 0.8 * L
        const paragraph = new Paragraph({
          style: footer ? 'Footer' : 'Header',
          alignment: item.anchor === 'end' ? AlignmentType.RIGHT : item.anchor === 'middle' ? AlignmentType.CENTER : AlignmentType.LEFT,
          // In a footer, the last paragraph's space after carries it up from the page's foot.
          spacing: { before: twips(Math.max(0, top - previous)), after: footer && index === sorted.length - 1 ? twips(Math.max(0, height - bottomOf(item))) : 0, line: twips(L), lineRule: LineRuleType.EXACT },
          children: runs(item)
        })
        previous = bottomOf(item)
        return paragraph
      })
    }
    const widths = cells.map((cell) => Math.max(20, twips(cell.x1 - cell.x0)))
    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
    return [new Table({
      layout: TableLayoutType.FIXED,
      width: { size: widths.reduce((sum, value) => sum + value, 0), type: WidthType.DXA },
      columnWidths: widths,
      indent: { size: twips(cells[0].x0 - left), type: WidthType.DXA },
      borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
      rows: [new TableRow({ children: cells.map((cell, index) => new TableCell({ width: { size: widths[index], type: WidthType.DXA }, margins: { top: 0, bottom: 0, left: 0, right: 0 }, children: cellParagraphs(cell) })) })]
    })]
  }

  const background = async (page) => {
    const data = await backgroundPng(ctx, page, png)
    // The anchor paragraph is a twentieth of a point tall, so the header's text starts at the page's top.
    return new Paragraph({
      spacing: { before: 0, after: 0, line: 1, lineRule: LineRuleType.EXACT },
      children: [new ImageRun({
        type: 'png', data,
        transformation: { width: Math.round(page.width / 0.75), height: Math.round(page.height / 0.75) },
        // Placed from the margin, back by the margin's width: the page's corner, as every reader of
        // the file agrees on (some place a page-relative position from the margin regardless).
        floating: { horizontalPosition: { relative: HorizontalPositionRelativeFrom.MARGIN, offset: -Math.round(left * 12700) }, verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 }, behindDocument: true, allowOverlap: true, wrap: { type: TextWrappingType.NONE } },
        altText: { name: 'Letterhead', description: `${ctx.brand.name} ${page.template.label ?? page.template.id}`, title: page.template.label ?? page.template.id }
      })]
    })
  }

  // The text area: from the leftmost body text to the rightmost, between header and footer.
  const bodies = pages.flatMap((page) => page.body)
  const anyText = bodies.length ? bodies : pages.flatMap((page) => [...page.header, ...page.footer])
  const left = Math.min(...anyText.map((item) => item.x).filter((x) => x > 0), width * 0.12)
  const right = Math.max(...bodies.map((item) => (item.kind === 'rule' ? item.x2 : item.anchor === 'end' ? item.x : item.x + (item.width ?? item.measured))), width - left)
  const footerTop = (page) => Math.min(page.zones.bottom, ...page.footer.map((item) => item.y - item.size))
  const bottom = Math.max(36, ...pages.map((page) => height - footerTop(page) + 12))
  const topOf = (page) => {
    const lead = page.body.find((item) => item.kind !== 'rule')
    return lead ? Math.min(lead.y - 0.8 * lineHeight(lead), ...page.body.filter((item) => item.kind === 'rule').map((item) => item.y - 2)) : page.bodyTop
  }
  const top = rest ? topOf(rest) : topOf(first)

  // `breakBefore` starts the page's text on a new page (a report's first page of text after its cover).
  const paragraphs = (page, startAt, { breakBefore = false } = {}) => {
    const out = []
    let previous = startAt
    for (const row of rowsOf(page.body)) {
      const lead = row[0]
      if (lead.kind === 'rule') {
        out.push(new Paragraph({
          pageBreakBefore: breakBefore && !out.length,
          border: { bottom: { style: BorderStyle.SINGLE, size: Math.max(2, Math.round(lead.weight * 8)), color: lead.colour, space: 0 } },
          indent: { left: twips(lead.x - left), right: twips(Math.max(0, right - lead.x2)) },
          spacing: { before: twips(Math.max(0, lead.y - 2 - previous)), after: 0, line: twips(2), lineRule: LineRuleType.EXACT },
          children: []
        }))
        previous = lead.y
        continue
      }
      const L = Math.max(...row.map(lineHeight))
      const lastBaseline = lead.y + (lead.lines.length - 1) * L
      const single = row.length === 1
      const alignment = single && lead.anchor === 'end' ? AlignmentType.RIGHT : single && lead.anchor === 'middle' ? AlignmentType.CENTER : AlignmentType.LEFT
      out.push(new Paragraph({
        style: page.template.elements[lead.element]?.documentStyle ?? (/title|subject|project-name/.test(lead.id ?? '') ? 'Title' : 'BodyText'),
        pageBreakBefore: breakBefore && !out.length,
        alignment,
        indent: {
          left: alignment === AlignmentType.LEFT ? twips(Math.max(0, lead.x - left)) : 0,
          right: twips(Math.max(0, alignment === AlignmentType.RIGHT ? right - lead.x : lead.width ? right - (lead.x + lead.width) : 0))
        },
        tabStops: row.slice(1).map((item) => ({ type: item.anchor === 'end' ? TabStopType.RIGHT : item.anchor === 'middle' ? TabStopType.CENTER : TabStopType.LEFT, position: twips(item.x - left) })),
        spacing: { before: twips(Math.max(0, lead.y - 0.8 * L - previous)), after: 0, line: twips(L), lineRule: LineRuleType.EXACT },
        children: row.flatMap((item, index) => [...(index ? [new TextRun({ children: [new Tab()] })] : []), ...runs(item)])
      }))
      previous = lastBaseline + 0.2 * L
    }
    return out
  }

  const body = first.body.length
    ? paragraphs(first, top)
    : [new Paragraph({ spacing: { before: twips(Math.max(0, first.bodyTop - top)) }, children: [] })]
  if (document.continue && rest?.body.length) body.push(...paragraphs(rest, top, { breakBefore: true }))

  const bodyFace = first.body.find((item) => item.kind === 'field') ?? first.body[0]
  const defaults = bodyFace ? { font: bodyFace.font, size: Math.round(bodyFace.size * 2), color: bodyFace.colour } : {}
  const headerOf = async (page) => new Header({ children: [await background(page), ...zoneTable(page.header), new Paragraph({ spacing: { before: 0, after: 0, line: 20, lineRule: LineRuleType.EXACT }, children: [] })] })
  const footerOf = (page) => new Footer({ children: page.footer.length ? zoneTable(page.footer, { footer: true }) : [new Paragraph({ spacing: { line: 20, lineRule: LineRuleType.EXACT }, children: [] })] })

  const file = new Document({
    fonts: embeddedFonts(ctx, [...pages.flatMap((page) => [...page.header, ...page.body, ...page.footer]), ...officeStyleFonts(ctx.brand)]),
    creator: ctx.brand.name,
    title: fill(ctx.brand, document.label ?? document.id),
    description: `${ctx.brand.name} ${document.label ?? document.id}, made by brandkit. Replace the bracketed text; the letterhead artwork is in the header.`,
    customProperties: [{ name: 'brandkit.fontRequirements', value: JSON.stringify(officeFontRequirements(ctx, [...pages.flatMap((page) => [...page.header, ...page.body, ...page.footer]), ...officeStyleFonts(ctx.brand)])) }],
    styles: officeStyles(ctx.brand, {}, defaults),
    sections: [{
      properties: {
        titlePage: Boolean(rest),
        page: { size: { width: twips(width), height: twips(height) }, margin: { top: twips(top), bottom: twips(bottom), left: twips(left), right: twips(Math.max(18, width - right)), header: 0, footer: 0 } }
      },
      headers: rest ? { first: await headerOf(first), default: await headerOf(rest) } : { default: await headerOf(first) },
      footers: rest ? { first: footerOf(first), default: footerOf(rest) } : { default: footerOf(first) },
      children: body
    }]
  })
  return new Uint8Array(await Packer.toArrayBuffer(file))
}

// --- PowerPoint ---------------------------------------------------------------------------------

/** A PowerPoint template: one slide master per layout, its fields as placeholders, a sample slide each. */
export const pptxFile = async (ctx, document, { png }) => {
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()
  const layouts = document.layouts.map((id) => slideLayout(ctx, templateOf(ctx.brand, id)))
  const aspect = layouts[0].width / layouts[0].height
  const slideWidth = aspect > 1.5 ? 13.333 : 10
  pptx.defineLayout({ name: 'BRAND', width: slideWidth, height: slideWidth / aspect })
  pptx.layout = 'BRAND'
  pptx.author = ctx.brand.name
  pptx.company = ctx.brand.name
  pptx.title = fill(ctx.brand, document.label ?? document.id)
  // The theme's fonts, so text added on a new slide is in the brand's faces too.
  const faces = layouts.flatMap((layout) => layout.placeholders)
  const titleFace = faces.find((item) => item.role === 'title')?.font
  const bodyFace = faces.find((item) => item.role === 'body')?.font ?? titleFace
  if (titleFace) pptx.theme = { headFontFace: titleFace, bodyFontFace: bodyFace }

  for (const layout of layouts) {
    const inch = (points) => (points / layout.width) * slideWidth
    const scale = (slideWidth * 72) / layout.width
    const data = await backgroundPng(ctx, layout, png, 1920 / (layout.width / 72))
    // A layout is named as its variant is in the brand's sets (Cover, Section), or as its template.
    const name = (ctx.brand.sets ?? []).flatMap((set) => set.variants).find((variant) => variant.template === layout.template.id)?.label ?? layout.template.label ?? layout.template.id
    const placeholders = layout.placeholders.map((item, index) => {
      const L = item.lines.length > 1 ? item.leading : Math.max(item.leading, item.size * 1.1)
      const margin = Math.min(layout.width * 0.07, ...layout.placeholders.map((other) => other.x))
      const w = item.width ?? (item.anchor === 'end' ? item.x - margin : item.anchor === 'middle' ? 2 * Math.min(item.x, layout.width - item.x) - 2 * margin : layout.width - item.x - margin)
      const x = item.anchor === 'end' ? item.x - w : item.anchor === 'middle' ? item.x - w / 2 : item.x
      return {
        name: `${layout.template.id}-${item.id ?? index}`,
        text: item.lines.join('\n'),
        options: {
          name: `${layout.template.id}-${item.id ?? index}`,
          type: item.role === 'title' ? 'title' : 'body',
          x: inch(x), y: inch(item.y - 0.8 * L), w: inch(Math.max(w, item.measured)), h: inch(item.lines.length * L + 0.3 * L),
          fontFace: item.font, fontSize: Math.round(item.size * scale * 10) / 10, color: item.colour, bold: item.bold, italic: item.italic,
          charSpacing: Math.round(item.tracking * scale * 10) / 10, lineSpacing: Math.round(L * scale * 10) / 10,
          align: item.anchor === 'end' ? 'right' : item.anchor === 'middle' ? 'center' : 'left', valign: 'top', margin: 0, bullet: false
        }
      }
    })
    pptx.defineSlideMaster({ title: name, background: { data: `image/png;base64,${base64(data)}` }, objects: placeholders.map((item) => ({ placeholder: { options: item.options, text: item.text } })) })
    const slide = pptx.addSlide({ masterName: name })
    for (const item of placeholders) slide.addText(item.text, { placeholder: item.name })
  }
  return new Uint8Array(await pptx.write({ outputType: 'uint8array' }))
}

// --- Email signature ----------------------------------------------------------------------------

const escapeHtml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const linkFor = (item, text) => {
  const value = text.trim()
  if (/^\[.*\]$/.test(value)) return null
  if (/email/.test(item.id ?? '') || /^[^@\s]+@[^@\s]+$/.test(value)) return `mailto:${value}`
  if (/phone/.test(item.id ?? '')) return `tel:${value.replace(/[^\d+]/g, '')}`
  if (/website|url/.test(item.id ?? '') || /^(https?:\/\/|www\.)/.test(value)) return /^https?:/.test(value) ? value : `https://${value}`
  return null
}

/**
 * An HTML email signature: a table, inline styles only (as mail clients need), the drawing as a
 * PNG at twice its size. Returns `{ html, png }`; `src` is where the image will be (a data URL by
 * default, so the file stands alone).
 */
export const signatureHtml = async (ctx, document, { png, src } = {}) => {
  const template = templateOf(ctx.brand, document.template)
  const layout = signatureLayout(ctx, template, document.emailLayout)
  let artwork = renderTemplate({ ...ctx, outline: true, showLayoutGuides: false, showGuides: false }, { ...template, guides: undefined, width: layout.image.sourceWidth ?? layout.image.width, height: layout.image.sourceHeight ?? layout.image.height, elements: layout.image.elements }).svg
  if (layout.image.viewport) {
    const { x, y, width, height } = layout.image.viewport
    artwork = artwork.replace(/<svg\b[^>]*>/, opening => opening
      .replace(/\bwidth="[^"]*"/, `width="${width}"`)
      .replace(/\bheight="[^"]*"/, `height="${height}"`)
      .replace(/\bviewBox="[^"]*"/, `viewBox="${x} ${y} ${width} ${height}"`))
  }
  const image = await png(artwork, Math.round(layout.image.width * 2))
  const px = (points) => Math.round((points / 0.75) * 10) / 10
  // Each line keeps its distance from the one before, as the template spaces them.
  let previous = null
  const rows = layout.rows.map((row) => {
    const lead = row[0]
    const height = Math.max(lead.leading, lead.size * 1.25)
    const gap = previous == null ? 0 : Math.max(0, lead.y - previous - height)
    previous = layout.compact ? Math.max(...row.map(item => item.y + (item.lines.length - 1) * item.leading)) : lead.y
    const wrapping = layout.compact ? ';white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word' : ''
    const style = `margin:${gap ? `${px(gap)}px` : 0} 0 0;font-family:'${ctx.brand.fonts?.[lead.key]?.consumerFamily ?? ctx.brand.fonts?.[lead.key]?.family ?? lead.font}',Arial,Helvetica,sans-serif;font-size:${px(lead.size)}px;line-height:${px(Math.max(lead.leading, lead.size * 1.25))}px;color:#${lead.colour};font-weight:${lead.weight ?? (lead.bold ? 700 : 400)}${lead.tracking ? `;letter-spacing:${px(lead.tracking)}px` : ''}${lead.caps ? ';text-transform:uppercase' : ''}${wrapping}`
    const content = row.map((item) => {
      const text = layout.compact ? item.value : item.lines.join(' ')
      const href = linkFor(item, text)
      return href ? `<a href="${escapeHtml(href)}" style="color:#${item.colour};text-decoration:none">${escapeHtml(text)}</a>` : escapeHtml(text)
    }).join(' ')
    return `<p style="${style}">${content}</p>`
  }).join('\n          ')
  const imageWidth = Math.round(layout.image.width)
  const imageHeight = Math.round(layout.image.height)
  const backdrop = ctx.brand.logoPolicy?.allowInheritedColour === false ? ';background-color:#FFFFFF' : ''
  const verticalAlign = layout.verticalAlign ?? 'middle'
  const imageGap = Math.round(layout.divider?.imageGap ?? layout.divider?.gap ?? 16)
  const textGap = Math.round(layout.divider?.textGap ?? layout.divider?.gap ?? 0)
  const textWidth = layout.compact ? ` width="${layout.textWidth}"` : ''
  const textStyle = layout.compact ? `width:${layout.textWidth}px;max-width:${layout.textWidth}px;` : ''
  const html = `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse${backdrop}">
  <tr>
    <td valign="${verticalAlign}" style="padding:0 ${imageGap}px 0 0${backdrop}">
      <img src="${src ?? `data:image/png;base64,${base64(image)}`}" width="${imageWidth}" height="${imageHeight}" alt="${escapeHtml(ctx.brand.name)}" style="display:block;border:0;width:${imageWidth}px;height:${imageHeight}px">
    </td>
    <td valign="${verticalAlign}"${textWidth} style="${textStyle}padding:0 0 0 ${textGap}px;${layout.divider ? `border-left:1px solid #${layout.divider.colour}` : ''}">
          ${rows}
    </td>
  </tr>
</table>`
  return { html, png: image }
}

/** A standalone page around a signature, for opening, copying from, or attaching. */
export const signaturePage = (brand, html) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(brand.name)} email signature</title></head>
<body style="margin:40px;font-family:Arial,sans-serif;color:#222">
<!-- Select everything between the rules and paste it into your mail program's signature setting.
     Gmail and some others will not keep an embedded image: host the PNG beside this file on your site and
     change the image's src to its address. -->
<hr style="border:0;border-top:1px solid #ddd;margin:0 0 24px">
${html}
<hr style="border:0;border-top:1px solid #ddd;margin:24px 0 0">
</body></html>
`

/** Makes one document: `{ bytes, name, type }`. */
export const officeFile = async (ctx, document, { png } = {}) => {
  const name = `${ctx.brand.id}-${document.id}.${EXTENSIONS[document.format]}`
  if (document.publication) {
    const { publicationDocx, publicationHtml } = await import('./publication.js')
    const publication = document.model ?? publicationModel(ctx.brand, { purpose: document.purpose, paper: document.paper, values: ctx.values })
    if (document.format === 'docx') return { name, bytes: await publicationDocx(ctx, publication, { png }), type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
    if (document.format === 'html') {
      const html = publicationHtml(ctx, publication)
      return { name, bytes: new TextEncoder().encode(html), html, type: 'text/html' }
    }
    throw new Error(`Unsupported publication format ${document.format}`)
  }
  if (document.format === 'docx') return { name, bytes: await docxFile(ctx, document, { png }), type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
  if (document.format === 'pptx') return { name, bytes: await pptxFile(ctx, document, { png }), type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }
  if (document.format === 'html') {
    const { html, png: image } = await signatureHtml(ctx, document, { png })
    return { name, bytes: new TextEncoder().encode(signaturePage(ctx.brand, html)), type: 'text/html', html, png: image }
  }
  throw new Error(`Unknown document format ${document.format}`)
}
