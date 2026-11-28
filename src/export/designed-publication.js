// A brand's designed publications (brand.json `publications`, src/engine/publications.js), written by
// document-kit: one document in the block model, from which come the Word file (writeDocx), its PDF and
// preview (that Word file laid out, layout.js) and the print view (writeHtml).
//
// How a design becomes document-kit's blocks:
//   - every page is a section of its own: covers and closing pages margin-less, with their ground, plate
//     and accent band drawn as one picture behind the page (a floating image in the section's header)
//     and their words in the flow or in frames; running pages with their ground and running furniture
//     (neatline, title block, bar, dot index, band) as the picture behind, and the running words
//     (document, section, edition, page) in frames in the header;
//   - slides are 16:9 landscape sections, one a slide: the heading in a frame, the body in the flow;
//   - blocks become the kit's: a callout a shaded one-cell table, columns a borderless table, steps,
//     facts, references and contents tables of cells, a scale's dots a small picture, `push` blocks
//     pinned to the foot of the page (a callout or facts there as ruled paragraphs, which a frame holds).
// Artwork (plates, lockups, the symbol, dots) is drawn as SVG by the engine and placed as PNG (`png`).
// Words are always text, in named styles the Word file lists.
import { document as kitDocument, floatingImage, frame, heading, image as kitImage, inlineImage, list as kitList, pageCount, pageNumber, paragraph, pinned, section, spacer, table, tab, text as kitText } from 'document-kit'
import { officeFont } from '../engine/office.js'
import { lockup as logoLockup, mark } from '../engine/artwork.js'
import { logoOptions } from '../engine/brand.js'
import { productLockup, productFamilyKey } from '../engine/products.js'
import { mixHex, plateArt, plateStyle } from '../engine/plates.js'
import { publicationAssets, resolvePublication } from '../engine/publications.js'
import { tableLook } from './table-styles.js'
import { applyTableLook } from './table-look.js'
import { brandFaces, fontRequirements } from './brand-faces.js'

const f1 = (value) => Math.round(value * 10) / 10
const hex = (value) => String(value ?? '').replace('#', '').toUpperCase()
const pad2 = (value) => String(value).padStart(2, '0')
const escapeXml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const encode64 = (bytes) => {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let out = ''
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(out)
}
const decode64 = (text) => (typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(text, 'base64')) : Uint8Array.from(atob(text), (c) => c.charCodeAt(0)))

/** A picture's pixel size from its PNG or JPEG header. */
export const pictureSize = (bytes) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return { width: view.getUint32(16), height: view.getUint32(20), format: 'png' }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let offset = 2; offset + 8 < bytes.length;) {
      if (bytes[offset] !== 0xff) break
      const marker = bytes[offset + 1]
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5), format: 'jpeg' }
      offset += view.getUint16(offset + 2) + 2
    }
  }
  throw new Error('A publication picture must be a PNG or JPEG.')
}

// ── Type: each role's CSS size (px), line height, tracking (em), face and spacing (px), by format ──
const LETTER = {
  body: { key: 'body', size: 12.4, line: 1.52, after: 9 },
  kicker: { key: 'label', size: 8.5, line: 1.4, tracking: 0.12, caps: true, after: 12 },
  h1: { key: 'display', size: 36, line: 1.06, tracking: -0.04, after: 14 },
  lead: { key: 'body', size: 15, line: 1.45, after: 20 },
  h2: { key: 'display', size: 18, line: 1.2, tracking: -0.03, before: 20, after: 7 },
  h3: { key: 'display', size: 14, line: 1.2, tracking: -0.03, before: 12, after: 5 },
  note: { key: 'body', size: 9.2, line: 1.45, before: 10 },
  label: { key: 'label', size: 7.6, line: 1.4, tracking: 0.12, caps: true },
  caption: { key: 'body', size: 9.4, line: 1.42, before: 7, after: 16 },
  table: { key: 'body', size: 10.6, line: 1.42 },
  th: { key: 'label', size: 7.6, tracking: 0.12 },
  calloutTitle: { key: 'display', size: 22, line: 1.12, tracking: -0.035, after: 9 },
  statement: { key: 'display', size: 22, line: 1.12, tracking: -0.035, after: 9 },
  small: { key: 'body', size: 9.6, line: 1.42, after: 6 },
  item: { key: 'body', size: 12.4, line: 1.52 },
  itemText: { key: 'body', size: 12.4, line: 1.52 },
  coverKicker: { key: 'label', size: 9.5, line: 1.4, tracking: 0.12, caps: true, after: 14 },
  coverTitle: { key: 'display', size: 56, line: 1, tracking: -0.045, after: 18 },
  coverSub: { key: 'body', size: 16.5, line: 1.42 },
  closeTitle: { key: 'display', size: 50, line: 1.02, tracking: -0.045, after: 18 },
  closeText: { key: 'body', size: 15, line: 1.46, after: 26 },
  meta: { key: 'label', size: 8.5, line: 1.6, tracking: 0.12, caps: true },
  run: { key: 'label', size: 7.6, line: 1.3, tracking: 0.12, caps: true },
  runSmall: { key: 'label', size: 6.2, line: 1.2, tracking: 0.12, caps: true },
  runValue: { key: 'bold', size: 9, line: 1.2 },
  family: { key: 'display', size: 17, line: 1.2, tracking: -0.03, after: 8 }
}
const SLIDE = {
  ...LETTER,
  body: { key: 'body', size: 28, line: 1.36, after: 12 },
  kicker: { key: 'label', size: 17, line: 1.3, tracking: 0.12, caps: true, after: 18 },
  h1: { key: 'display', size: 84, line: 1.02, tracking: -0.045, after: 16 },
  lead: { key: 'display', size: 40, line: 1.2, tracking: -0.035, after: 20 },
  subtitle: { key: 'body', size: 36, line: 1.25 },
  h2: { key: 'display', size: 46, line: 1.12, tracking: -0.035, before: 12, after: 6 },
  h3: { key: 'display', size: 44, line: 1.12, tracking: -0.035, after: 14 },
  note: { key: 'body', size: 24, line: 1.3 },
  label: { key: 'label', size: 15, line: 1.3, tracking: 0.12, caps: true },
  caption: { key: 'body', size: 22, line: 1.3, before: 12, after: 12 },
  table: { key: 'body', size: 32, line: 1.26 },
  th: { key: 'label', size: 18, tracking: 0.12 },
  calloutTitle: { key: 'display', size: 46, line: 1.12, tracking: -0.035, after: 12 },
  statement: { key: 'display', size: 56, line: 1.1, tracking: -0.04, before: 40 },
  small: { key: 'body', size: 29, line: 1.34, after: 12 },
  item: { key: 'display', size: 46, line: 1.12, tracking: -0.035, after: 6 },
  itemText: { key: 'body', size: 32, line: 1.28 },
  coverKicker: { key: 'label', size: 18, line: 1.3, tracking: 0.12, caps: true, after: 28 },
  coverTitle: { key: 'display', size: 124, line: 0.98, tracking: -0.05, after: 34 },
  coverSub: { key: 'body', size: 40, line: 1.28 },
  closeTitle: { key: 'display', size: 124, line: 0.98, tracking: -0.05, after: 34 },
  closeText: { key: 'body', size: 40, line: 1.28 },
  meta: { key: 'label', size: 17, line: 1.6, tracking: 0.12, caps: true },
  run: { key: 'label', size: 15, line: 1.2, tracking: 0.12, caps: true }
}
/** Page geometry, px: side margin, body top and bottom, the accent band. */
const GRID = { page: { mx: 68, bt: 92, bb: 100, band: 14, w: 816, h: 1056 }, slide: { mx: 96, bt: 312, bb: 178, band: 22, w: 1920, h: 1080 } }

/** The faces a design sets, by role, as Office names them. */
const facesOf = (brand) => {
  const pick = (...keys) => keys.find((key) => brand.fonts?.[key]) ?? 'body'
  const body = officeFont(brand, pick('body'))
  const boldKey = pick('bold', 'body')
  const bold = boldKey === 'bold' ? officeFont(brand, 'bold') : { ...body, bold: true }
  return { body, bold, display: officeFont(brand, pick('display', 'heading', 'body')), label: officeFont(brand, pick('label', 'body')), keys: { body: pick('body'), bold: boldKey, display: pick('display', 'heading', 'body'), label: pick('label', 'body') } }
}

/** Inline text: **strong**, *second tone*, [label](https://…) links and [1,2] source references, as runs. */
const INLINE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*(.+?)\*\*|\*(.+?)\*|\[((?:[A-Z]?\d+)(?:\s?[,–-]\s?[A-Z]?\d+)*)\]/g
const runsOf = (value, { size, second, cite, link, strongBold = false, hideCites = false } = {}) => {
  const source = String(value ?? '')
  const out = []
  let at = 0
  for (const match of source.matchAll(INLINE)) {
    if (match.index > at) out.push(kitText(source.slice(at, match.index)))
    if (match[1]) out.push(kitText(match[1], { link: match[2], underline: true, ...(link ? { color: link } : {}) }))
    else if (match[3]) out.push(kitText(match[3], strongBold ? { bold: true } : { characterStyle: 'Strong' }))
    else if (match[4]) out.push(kitText(match[4], second ? { color: second } : { italic: true }))
    else if (!hideCites) out.push(kitText(`[${match[5]}]`, { characterStyle: 'Cite', ...(size ? { size: f1(size * 0.76) } : {}), ...(cite ? { color: cite } : {}) }))
    at = match.index + match[0].length
  }
  if (at < source.length) out.push(kitText(source.slice(at)))
  return out.length ? out : ''
}

/** A picture's crop for CSS object-fit: cover into a box of `ratio` (width / height), at `position`. */
const coverCrop = (size, ratio, position = 'left top') => {
  const own = size.width / size.height
  const parts = String(position).trim().split(/\s+/)
  const share = (token, axis) => {
    if (/%$/.test(token ?? '')) return Number.parseFloat(token) / 100
    return { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 }[token] ?? (axis === 'x' ? 0 : 0)
  }
  const x = share(parts[0], 'x')
  const y = share(parts[1] ?? (parts[0] === 'center' ? 'center' : 'top'), 'y')
  if (Math.abs(own - ratio) < 0.001) return undefined
  if (own > ratio) { const cut = 1 - ratio / own; return { left: f1(cut * x * 1000) / 1000, right: f1(cut * (1 - x) * 1000) / 1000 } }
  const cut = 1 - own / ratio
  return { top: f1(cut * y * 1000) / 1000, bottom: f1(cut * (1 - y) * 1000) / 1000 }
}

/**
 * The designed publication as document-kit's block model: `{ document, faces, resolved }`.
 * `png(svg, widthPx)` draws artwork; `read(path)` gives a file the brand carries (figures' `src`).
 */
export const designedPublicationDocument = async (ctx, doc, { style, png, read } = {}) => {
  if (typeof png !== 'function') throw new Error('A PNG renderer is required to draw a publication’s artwork.')
  const { brand } = ctx
  const r = resolvePublication(brand, doc, { style })
  const c = r.colours
  const slide = r.slide
  const T = slide ? SLIDE : LETTER
  const G = GRID[slide ? 'slide' : 'page']
  const W = r.paper.width
  const H = r.paper.height
  const k = W / G.w // points per design pixel (0.75 on Letter and slides)
  const faces = facesOf(brand)
  const parts = r.style
  const look = parts.page.look ?? 'ruled'
  const owner = r.owner
  const total = doc.pages.length
  const kindName = doc.label ?? r.kind.name

  // ── Pictures: the brand's files, read once; artwork drawn once per distinct SVG ──
  const pictures = new Map()
  const picture = async (src) => {
    if (!pictures.has(src)) pictures.set(src, (async () => {
      let bytes
      const data = /^data:image\/(?:png|jpeg);base64,(.+)$/.exec(src)
      if (data) bytes = decode64(data[1])
      else {
        if (typeof read !== 'function') throw new Error(`The publication shows ${src}; give a reader for the brand’s files.`)
        const raw = await read(src)
        bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw)
      }
      return { bytes, ...pictureSize(bytes) }
    })())
    return pictures.get(src)
  }
  const drawn = new Map()
  const art = async (svg, widthPx) => {
    const key = `${widthPx}|${svg}`
    if (!drawn.has(key)) drawn.set(key, png(svg, Math.round(widthPx)).then((bytes) => kitImage(bytes)))
    return drawn.get(key)
  }
  const svgDoc = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
  const pageScale = slide ? 1 : 2

  // ── Identity pieces as SVG fragments in design pixels ──
  const pad = brand.lockup?.canvasPadding ?? 0
  const companyLogo = logoOptions(brand)[0] ?? {}
  /** The heading lockup: the product lockup, or the company's logo; `{ art, width, height }` trimmed of padding, its logo `h` px high. */
  const headLockup = (h, colour, { compact = false } = {}) => {
    const drawnLockup = r.product
      ? productLockup(ctx, { product: r.product.id, arrangement: compact ? 'compact' : 'endorsed', colour })
      : compact ? null : logoLockup(ctx, { family: companyLogo.family, layout: companyLogo.layout ?? 'horizontal', signature: companyLogo.signature, colour })
    if (!drawnLockup) return symbolArt(h, colour)
    const inner = drawnLockup.height - 2 * pad
    const s = h / inner
    return { art: `<g transform="scale(${s}) translate(${-pad} ${-pad})">${drawnLockup.art}</g>`, width: (drawnLockup.width - 2 * pad) * s, height: h }
  }
  const symbolArt = (h, colour) => {
    const [, , sw, sh] = brand.symbol?.viewBox ?? [0, 0, 1, 1]
    const s = h / sh
    return { art: `<g transform="scale(${s})">${mark(ctx, colour)}</g>`, width: sw * s, height: h }
  }
  const place = (piece, x, y) => `<g transform="translate(${f1(x)} ${f1(y)})">${piece.art}</g>`
  /** A plate in a box of the page, cropped as CSS `slice` would: drawn at `size`, scaled to cover the box. */
  const plateIn = (spec, box, size, paint, extra = {}) => {
    const s = Math.max(box.width / size.width, box.height / size.height)
    const dx = (box.width - size.width * s) / 2
    const dy = (box.height - size.height * s) / 2
    const body = plateArt({ seed: r.seed, ...spec }, { ...size, symbol: brand.symbol, home: r.home })
    const fade = extra.fade ? `<defs><linearGradient id="pf" x1="0" x2="1"><stop offset="${extra.fade[0]}" stop-color="#fff" stop-opacity="0"/><stop offset="${extra.fade[1]}" stop-color="#fff"/></linearGradient><mask id="pm" maskUnits="userSpaceOnUse" x="0" y="0" width="${box.width}" height="${box.height}"><rect width="${box.width}" height="${box.height}" fill="url(#pf)"/></mask></defs>` : ''
    return `<svg x="${f1(box.x)}" y="${f1(box.y)}" width="${f1(box.width)}" height="${f1(box.height)}" viewBox="0 0 ${f1(box.width)} ${f1(box.height)}" overflow="hidden">${plateStyle(paint)}${fade}<g${extra.fade ? ' mask="url(#pm)"' : ''}><g transform="translate(${f1(dx)} ${f1(dy)}) scale(${f1(s * 1000) / 1000})">${body}</g></g></svg>`
  }
  /** A plate spec for a page: the part's plate, a page's `motif` making a field plate the brand's dots. */
  const plateFor = (base, page) => {
    const spec = { ...(base ?? { type: 'field' }) }
    if (page?.motif && ['field', 'dots'].includes(spec.type)) return { ...spec, type: 'dots', motif: ['side', 'top', 'type', 'tiles'].includes(page.motif) && page.layout === 'closing' ? 'panel' : page.motif, points: page.points ?? spec.points }
    return spec
  }

  // ── Styles ──
  // Line heights are exact, in points, as the design states them (CSS line-height × size).
  const lineOf = (role) => ({ exact: f1(T[role].size * (T[role].line ?? 1.2) * k * 100) / 100 })
  /** A paragraph's `text` and `spacing.line` for a size other than its style's, at `line` × size. */
  const sized = (px, line, options = {}) => ({ ...options, text: { ...options.text, size: f1(px * k * 100) / 100 }, spacing: { ...options.spacing, line: { exact: f1(px * line * k * 100) / 100 } } })
  const textOf = (role, extra = {}) => {
    const spec = T[role]
    const face = faces[spec.key] ?? faces.body
    const size = f1(spec.size * k * 100) / 100
    return {
      font: face.name, bold: face.bold, italic: face.italic, size, line: lineOf(role),
      ...(spec.tracking ? { characterSpacing: f1(spec.tracking * size * 100) / 100 } : {}),
      ...(spec.caps ? { allCaps: true } : {}),
      before: f1((spec.before ?? 0) * k), after: f1((spec.after ?? 0) * k), ...extra
    }
  }
  const second = (on = c.ground, ink = c.ink) => mixHex(ink, on, 0.55)
  const muted = c.muted
  const strongFace = faces.bold
  const paragraphStyles = [
    { id: 'Kicker', name: 'Kicker', text: textOf('kicker', { color: hex(look === 'solid' ? c.accentText : look === 'card' ? c.primary : c.ink), keepWithNext: true }) },
    { id: 'Lead', name: 'Lead', text: textOf(slide ? 'subtitle' : 'lead', { color: hex(muted) }) },
    { id: 'FinePrint', name: 'Fine Print', text: textOf('note', { color: hex(muted) }) },
    { id: 'SmallText', name: 'Small Text', text: textOf('small') },
    { id: 'LabelLine', name: 'Label Line', text: textOf('label', { color: hex(muted), after: 0 }) },
    { id: 'CalloutTitle', name: 'Callout Title', text: textOf('calloutTitle') },
    { id: 'Statement', name: 'Statement', text: textOf('statement', { color: hex(look === 'ruled' ? c.ink : c.primary) }) },
    { id: 'ItemTitle', name: 'Item Title', text: slide ? textOf('item', { color: hex(look === 'ruled' ? c.ink : c.primary) }) : { font: strongFace.name, bold: strongFace.bold, size: textOf('body').size, line: lineOf('body'), after: f1(2 * k) } },
    { id: 'ItemText', name: 'Item Text', text: textOf('itemText', { color: hex(slide ? muted : c.ink), after: 0 }) },
    { id: 'CoverKicker', name: 'Cover Kicker', text: textOf('coverKicker') },
    { id: 'CoverTitle', name: 'Cover Title', text: textOf('coverTitle') },
    { id: 'CoverText', name: 'Cover Text', text: textOf('coverSub') },
    { id: 'CloseTitle', name: 'Closing Title', text: textOf('closeTitle') },
    { id: 'CloseText', name: 'Closing Text', text: textOf('closeText') },
    { id: 'Meta', name: 'Meta', text: textOf('meta', { after: 0 }) },
    { id: 'Running', name: 'Running', text: textOf('run', { color: hex(muted), after: 0 }) },
    { id: 'RunningLabel', name: 'Running Label', text: textOf('runSmall', { color: hex(muted), after: f1(3 * k) }) },
    { id: 'RunningValue', name: 'Running Value', text: { font: strongFace.name, bold: strongFace.bold, size: f1(T.runValue.size * k * 100) / 100, line: lineOf('runValue'), color: hex(c.ink), after: 0 } },
    { id: 'FamilyLine', name: 'Family Line', text: textOf('family', { align: 'right' }) }
  ].map((entry) => ({ ...entry, basedOn: 'normal', next: 'normal' }))
  const characterStyles = [
    { id: 'Strong', name: 'Strong Face', text: strongFace.bold && strongFace.name === faces.body.name ? { bold: true } : { font: strongFace.name, bold: strongFace.bold } },
    { id: 'Cite', name: 'Source Reference', text: { font: faces.label.name, color: hex(c.accentText) } },
    { id: 'LabelFace', name: 'Label Face', text: { font: faces.label.name, allCaps: true } },
    { id: 'DisplayFace', name: 'Display Face', text: { font: faces.display.name, bold: faces.display.bold } }
  ]

  // ── Blocks ──
  const P = (content, style, options = {}) => paragraph(content, { style, ...options })
  const rich = (value, role = 'body', options = {}) => runsOf(value, { size: T[role].size * k, second: options.second ?? second(), cite: options.cite, hideCites: slide, ...options })
  const border = (colour, width = 0.75) => ({ style: 'single', width, color: hex(colour) })
  const none = { style: 'none' }
  const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none }
  const gap = f1(28 * k)
  const ruleColour = look === 'solid' ? c.primary : c.line
  const ruleWidth = look === 'solid' ? 1.5 : 0.75
  const contentWidth = (G.w - 2 * G.mx) * k
  /**
   * A borderless table of cells side by side: `rows` of cells (each a list of blocks), columns in
   * `widths` shares of `width` points, with an empty gutter column of `gutter` points between them so a
   * cell's rule stops at its own column, as the design's grid gaps do. `cell(column, row, blocks)` gives
   * a cell's own look.
   */
  const grid = (rows, { widths, gutter = gap, width = contentWidth, cell = () => ({}), spaceAfter = 12 * k } = {}) => {
    const count = Math.max(...rows.map((row) => row.length))
    const shares = widths ?? Array(count).fill(1)
    const sum = shares.reduce((a, b) => a + b, 0)
    const room = width - gutter * (count - 1)
    const columnWidths = shares.flatMap((share, index) => [f1(room * share / sum * 100) / 100, ...(index < count - 1 ? [f1(gutter * 100) / 100] : [])])
    const zero = { top: 0, bottom: 0, left: 0, right: 0 }
    const blank = () => ({ blocks: [P('', 'SmallText', sized(1, 1, { spacing: { after: 0 } }))], padding: zero, borders: { top: none, bottom: none, left: none, right: none } })
    return table(rows.map((cells, rowIndex) => ({ cantSplit: true, cells: Array.from({ length: count }, (_, index) => cells[index] ?? []).flatMap((blocks, index) => [
      { blocks: blocks.length ? blocks : [P('', 'SmallText', sized(1, 1, { spacing: { after: 0 } }))], padding: zero, ...(blocks.length ? cell(index, rowIndex, blocks) : {}) },
      ...(index < count - 1 ? [blank()] : [])
    ]) })), { columnWidths, width: 100, borders: noBorders, spaceAfter: f1(spaceAfter), cellPadding: zero })
  }
  /**
   * A block's CSS margins (px), as the design sets them round a table or grid. Margins collapse: the
   * larger of a block's and its neighbour's stands between them. A paragraph's space before and after
   * do the same (the layout stacks them as Word does), so the margins ride on empty hairline paragraphs
   * either side, and the table's own space after (which would add to the next block's) is none.
   */
  const hairline = { exact: 0.05 }
  const margined = (blocks, top = 0, bottom = 0) => {
    const last = blocks[blocks.length - 1]
    if (last?.type === 'table') last.spaceAfter = 0
    return [
      ...(top > 0 ? [P('', 'SmallText', { spacing: { before: f1(top * k), after: 0, line: hairline } })] : []),
      ...blocks,
      ...(bottom > 0 ? [P('', 'SmallText', { spacing: { before: 0, after: f1(bottom * k), line: hairline } })] : [])
    ]
  }
  const chunk = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size))
  const columnsOf = (list, count) => { const per = Math.ceil(list.length / count); return Array.from({ length: count }, (_, i) => list.slice(i * per, i * per + per)) }

  const tableProfile = {
    tables: { style: parts.page.table ?? { ruled: 'sheet', solid: 'banded', card: 'card' }[look] },
    colours: { ink: c.ink, muted, accent: c.accent, paper: c.ground, light: c.light, line: c.line, reverse: c.reverse, primary: c.primary, tint: c.tint, tableHeader: c.primary, tableHeaderText: c.reverse },
    typography: { label: { font: faces.keys.label, weight: brand.fonts?.[faces.keys.label]?.weight, sizePt: f1(T.th.size * k * 100) / 100, trackingEm: 0.12 }, heading2: { font: faces.keys.bold } }
  }
  // The design's header labels at the format's own size (tableLook caps them for a page), and its
  // padding in proportion to the table's type (a slide's table is set about three times larger).
  const tableScale = T.table.size / LETTER.table.size
  const baseDesign = tableLook(tableProfile, brand)
  const tableDesign = { ...baseDesign, header: { ...baseDesign.header, sizePt: f1(T.th.size * k * 100) / 100 }, padding: { ...baseDesign.padding, y: baseDesign.padding.y * tableScale, x: baseDesign.padding.x * tableScale } }
  // The design's table, cell by cell, px (collateral.css `.pub-table`, `.sl__table`): each row's padding as
  // [top, right, bottom, left], the last column's right, and the header's line. The look's own padding
  // (table-styles.js) is in proportion to the type; the design sets a page's cells flush left with the
  // gutter on the right, and a slide's header tight over an inked rule.
  const tableGeometry = (look, wide) => {
    if (slide) {
      const y = wide ? 20 : 24
      return {
        ruled: { th: [0, 36, 16, 0], td: [y, 36, y, 0], last: 36 },
        solid: { th: [20, 36, 18, 24], td: [y, 36, y, 24], last: 36 },
        card: { th: [28, 36, 18, 36], td: [y, 36, y, 36], last: 36 }
      }[look]
    }
    return {
      ruled: { th: [7, 14, 7, 0], td: [8, 14, 8, 0], last: 0 },
      solid: { th: [8, 14, 8, 10], td: [8, 14, 8, 10], last: 10 },
      card: { th: [11, 14, 8, 14], td: [8, 14, 8, 14], last: 14 }
    }[look]
  }
  const tableBlock = (block, width) => {
    const count = block.headers.length
    // A slide's table of four columns or more is set smaller, its rows closer (`.sl__table--4`); a page's
    // tight table too (`.pub-table--tight`).
    const wide = slide && count > 3
    const body = wide ? { ...T.table, size: 28 } : block.tight && !slide ? { ...T.table, size: 10.2 } : T.table
    const cellOf = (value, header, column) => {
      if (value && typeof value === 'object') {
        const lines = [
          ...(value.n ? [P(kitText(value.n, { characterStyle: 'LabelFace', size: f1(8 * k * 100) / 100, color: hex(c.accentText) }), 'SmallText', { spacing: { after: f1(2 * k), before: 0 } })] : []),
          P([...[].concat(rich(value.text, 'table')), ...(value.ext ? [kitText(` ${value.ext}`, { characterStyle: 'LabelFace', size: f1(9 * k * 100) / 100, color: hex(muted), allCaps: false })] : [])], 'SmallText', sized(body.size, body.line, { spacing: { after: 0, before: 0 } }))
        ]
        return { blocks: lines }
      }
      return { content: header ? String(value) : rich(value, 'table') }
    }
    const written = table([
      { role: 'header', cells: block.headers.map((value, column) => cellOf(value, true, column)), cantSplit: true },
      ...block.rows.map((row) => ({ cells: row.map((value, column) => cellOf(value, false, column)), cantSplit: true }))
    ], { columnWidths: block.widths ?? Array(count).fill(1), width: 100, borders: noBorders, spaceAfter: f1(14 * k), size: f1(body.size * k * 100) / 100 })
    const bodyLine = { exact: f1(body.size * body.line * k * 100) / 100 }
    applyTableLook([written], tableDesign, { sizePt: f1(body.size * k * 100) / 100, lineHeight: bodyLine }, { color: hex(c.ink), size: f1(body.size * k * 100) / 100 })
    const geometry = tableGeometry(look, wide)
    const px = (value) => f1(value * k * 100) / 100
    const headLine = { exact: f1(T.th.size * 1.3 * k * 100) / 100 }
    const inkRule = border(c.ink)
    const lineRule = border(c.line)
    for (const [r, row] of written.rows.entries()) {
      const header = row.role === 'header'
      const [top, right, bottom, left] = header ? geometry.th : block.tight && !slide ? [5, 14, 5, geometry.td[3]] : geometry.td
      for (const [index, cell] of row.cells.entries()) {
        cell.padding = { top: px(top), bottom: px(bottom), left: px(left), right: px(index === row.cells.length - 1 ? geometry.last : right) }
        // A slide's rules: the header over an ink rule, each row over a line (the last one too), none above.
        if (slide && look === 'ruled') cell.borders = { ...cell.borders, top: none, bottom: header ? inkRule : lineRule }
        if (slide && look === 'card' && r === written.rows.length - 1) cell.borders = { ...cell.borders, bottom: none }
        // The header's labels on their own line (1.3 × their size), not the body's.
        if (header && cell.content !== undefined) {
          cell.blocks = [paragraph([kitText(String(cell.content), cell.text ?? {})], { spacing: { before: 0, after: 0, line: headLine } })]
          delete cell.content
        }
      }
    }
    void width
    return [written]
  }

  const figureFrame = (inner, { tinted = false } = {}) => {
    if (look === 'solid') return table([{ cells: [{ blocks: inner, shading: hex(c.primary), padding: { top: f1(12 * k), left: f1(12 * k), right: f1(12 * k), bottom: 0 } }], cantSplit: true }], { columnWidths: [1], borders: noBorders, spaceAfter: 0 })
    if (look === 'card') return table([{ cells: [{ blocks: inner, shading: hex(c.reverse), padding: { top: f1(8 * k), left: f1(8 * k), right: f1(8 * k), bottom: f1(8 * k) } }], cantSplit: true }], { columnWidths: [1], borders: { top: border(c.line), bottom: border(c.line), left: border(c.line), right: border(c.line) }, spaceAfter: 0 })
    if (tinted) return table([{ cells: [{ blocks: inner, shading: hex(c.tint), padding: { top: 0, bottom: 0, left: 0, right: 0 } }], cantSplit: true }], { columnWidths: [1], borders: { top: border(c.ink), bottom: border(c.ink), left: border(c.ink), right: border(c.ink) }, spaceAfter: 0 })
    return null
  }
  const captionOf = (block) => block.caption || block.label ? P([
    ...(block.label ? [kitText(block.label, { characterStyle: 'LabelFace', size: f1(T.label.size * k * 100) / 100, color: hex(c.ink), characterSpacing: f1(T.label.size * k * 0.12 * 100) / 100 }), kitText('   ')] : []),
    ...[].concat(rich(block.caption ?? '', 'caption'))
  ], 'caption', { spacing: { before: f1(7 * k), after: f1(16 * k) } }) : null
  let mediaHeight = 590 * k
  const figureBlocks = async (block, width) => {
    const inset = look === 'solid' ? 24 * k : look === 'card' ? 16 * k : 0
    const boxW = width - inset
    const boxH = block.heightMm ? block.heightMm * 72 / 25.4 : null
    const after = captionOf(block)
    if (!block.src) {
      const height = boxH ?? 300 * k
      const box = table([{ cells: [{ blocks: [P(kitText(block.placeholder ?? '[Screenshot placeholder]', { characterStyle: 'LabelFace', size: f1(T.label.size * 1.1 * k * 100) / 100 }), 'LabelLine', { align: 'center', text: { color: hex(c.ink) } })], verticalAlign: 'center', shading: hex(c.tint) }], height: f1(height), cantSplit: true }],
        { columnWidths: [1], borders: { top: border(look === 'ruled' ? c.ink : c.line), bottom: border(look === 'ruled' ? c.ink : c.line), left: border(look === 'ruled' ? c.ink : c.line), right: border(look === 'ruled' ? c.ink : c.line) }, spaceAfter: 0 })
      return [box, ...(after ? [after] : [P('', 'SmallText')])]
    }
    const pic = await picture(block.src)
    const imageData = kitImage(pic.bytes, { width: pic.width, height: pic.height })
    const ratio = boxH ? boxW / boxH : pic.width / pic.height
    const crop = boxH ? coverCrop(pic, ratio, block.position ?? 'left top') : undefined
    // A page's figure spans the text; a slide's is fitted into the room under its heading (less where a
    // statement follows it), as large as it fits.
    let shownW = boxW
    let shownH = boxH ?? boxW * pic.height / pic.width
    if (!boxH && slide) {
      const fit = Math.min(boxW / pic.width, mediaHeight / pic.height)
      shownW = pic.width * fit
      shownH = pic.height * fit
    }
    const fig = { type: 'figure', image: imageData, fit: { width: f1(shownW), height: f1(shownH), upscale: true }, align: slide && width >= contentWidth - 1 && mediaHeight > 500 * k ? 'center' : 'left', alt: block.alt ?? block.caption ?? 'Figure', ...(crop ? { crop } : {}),
      ...(look === 'ruled' ? { border: { width: 0.75, color: hex(c.ink) } } : look === 'card' ? {} : {}) }
    const framed = figureFrame([fig])
    return [framed ?? fig, ...(after ? [after] : [])]
  }

  const dotsPicture = async (level, steps, sizePx = 9) => {
    const gapPx = 5
    const w = steps * sizePx + (steps - 1) * gapPx
    const stroke = 1.4
    const body = Array.from({ length: steps }, (_, i) => `<circle cx="${f1(i * (sizePx + gapPx) + sizePx / 2)}" cy="${sizePx / 2}" r="${f1(sizePx / 2 - stroke / 2)}" fill="${i < level ? c.primary : 'none'}" stroke="${c.primary}" stroke-width="${stroke}"/>`).join('')
    const image = await art(svgDoc(w, sizePx, body), w * 4)
    return inlineImage(image, f1(w * k), f1(sizePx * k), `${level} of ${steps}`)
  }

  const labelRun = (value, colour = muted, size = T.label.size) => kitText(value, { characterStyle: 'LabelFace', size: f1(size * k * 100) / 100, color: hex(colour), characterSpacing: f1(size * k * 0.12 * 100) / 100 })
  const stepNumber = (value) => slide ? labelRun(value, c.accentText, 20) : kitText(value, { characterStyle: 'LabelFace', size: f1(9 * k * 100) / 100, color: hex(c.accentText), characterSpacing: f1(9 * k * 0.08 * 100) / 100 })

  const stepsBlocks = (block, width) => {
    const count = block.columns ?? (slide ? 1 : 2)
    const stack = Boolean(block.stack)
    const numbered = block.numbered !== false
    // The number's column and the gap after it (`.pub-step`: 26px and 8px; 40px on a solid page, 30px and
    // 10px on a card page; a slide's 130px holds its own gap).
    const numberW = stack || !numbered ? 0 : (slide ? 130 : look === 'solid' ? 48 : look === 'card' ? 40 : 34) * k
    // Dense lists set smaller; a slide's unnumbered points beside a picture (a device trio) smaller still.
    const dense = slide && (block.items.length > 4 || (stack && block.items.length > 2))
    const trio = slide && !numbered
    const titleSize = trio ? sized(36, 1.12) : dense ? sized(40, 1.12) : {}
    const textSize = trio ? sized(26, 1.3) : dense ? sized(29, 1.28) : {}
    const cellBlocks = (step, index) => {
      const number = step.n ?? pad2(index + 1)
      const hanging = numbered && !stack
      const title = hanging ? [stepNumber(number), tab(), ...[].concat(rich(step.title, 'item'))] : rich(step.title, 'item')
      return [
        ...(numbered && stack ? [P(stepNumber(number), 'LabelLine', { keepWithNext: true, spacing: { after: f1(6 * k) } })] : []),
        P(title, 'ItemTitle', { indent: hanging ? { left: f1(numberW), hanging: f1(numberW) } : {}, tabs: hanging ? [{ at: f1(numberW), align: 'left' }] : undefined, keepWithNext: Boolean(step.text), ...titleSize }),
        ...(step.text ? [P(rich(step.text, 'itemText'), 'ItemText', { indent: hanging ? { left: f1(numberW) } : {}, ...textSize })] : [])
      ]
    }
    const rows = chunk(block.items.map(cellBlocks), count)
    const padTop = (slide ? (trio ? 16 : dense ? 13 : 22) : 9) * k
    // A page's steps stand 14px apart (the grid's row gap), none under the last row; a slide's items keep
    // their own padding under each.
    const padBottom = (slide ? (trio ? 22 : dense ? 15 : 24) : 14) * k
    const firstRule = slide && look === 'ruled' ? c.ink : ruleColour
    const rule = trio ? c.ink : ruleColour
    const table = grid(rows, { width, cell: (index, r0) => ({
      padding: { top: f1(padTop), bottom: f1(slide || r0 < rows.length - 1 ? padBottom : 0), left: 0, right: 0 },
      borders: { top: look !== 'card' ? border(r0 === 0 ? firstRule : rule, ruleWidth) : none, bottom: none, left: none, right: none }
    }) })
    return slide ? [table] : margined([table], 8, 16)
  }

  const calloutColours = () => (look === 'solid' ? { fill: c.primary, ink: c.reverse, text: c.light, label: c.accentDark } : look === 'card' ? { fill: c.light, ink: c.primary, text: c.primary, label: c.primary } : { fill: null, ink: c.ink, text: c.ink, label: look === 'ruled' ? c.ink : muted })
  const calloutContent = (block, tone) => [
    ...(block.label ? [P(labelRun(block.label, tone.label), 'LabelLine', { spacing: { after: f1(7 * k) } })] : []),
    ...(block.title ? [P(rich(block.title, 'calloutTitle', { second: mixHex(tone.ink, tone.fill ?? c.ground, 0.62) }), 'CalloutTitle', { text: { color: hex(tone.ink) }, ...(block.text || block.field ? {} : { spacing: { after: 0 } }) })] : []),
    ...(block.text ? [P(rich(block.text, 'body', { cite: tone.fill ? tone.label : undefined }), 'normal', { text: { color: hex(tone.text) }, spacing: { after: 0 } })] : []),
    ...(block.field ? [P(labelRun(block.field, tone.ink, 8.5), 'LabelLine', { spacing: { before: f1(12 * k), after: 0 } })] : [])
  ]
  const calloutBlock = (block) => {
    const tone = calloutColours()
    const sides = look === 'ruled' ? { top: border(c.ink), bottom: border(c.ink), left: block.strong ? border(c.accent, 2.25) : border(c.ink), right: border(c.ink) }
      : look === 'solid' ? { top: none, left: none, right: none, bottom: border(c.accent, 4.5) } : { top: none, bottom: none, left: none, right: none }
    // On a ruled page the design sets the label on the box's top rule, where it takes no room; a Word cell
    // cannot set text over its border, so the label stands at the top of the box instead, in the room of
    // the padding above it, and the box keeps the design's height.
    const labelRoom = look === 'ruled' && block.label ? T.label.size * T.label.line + 7 : 0
    const top = Math.max(0, 16 - labelRoom)
    const box = table([{ cantSplit: true, cells: [{ blocks: calloutContent(block, tone), ...(tone.fill ? { shading: hex(tone.fill) } : {}), padding: { top: f1(top * k), bottom: f1(17 * k), left: f1(18 * k), right: f1(18 * k) }, borders: sides }] }],
      { columnWidths: [1], width: 100, borders: noBorders })
    return slide ? [{ ...box, spaceAfter: f1(14 * k) }] : margined([box], 14, 14)
  }
  /** A callout set as ruled, shaded paragraphs: what a frame (the foot of a page) can hold. */
  // The box's padding (`.pub-callout`: 16px 18px 17px). Its sides are the space between the side rules and
  // the words; a filled box draws them in its own fill, as a side with no rule keeps no space. Above and
  // below, the padding is an empty line of that height in the box: a rule's space there is not filled under
  // in every layout, and the fill would close on the words.
  const calloutParagraphs = (block) => {
    const tone = calloutColours()
    const line = tone.fill ? border(tone.fill, 0.25) : border(c.ink)
    const side = f1(18 * k)
    const left = block.strong && look === 'ruled' ? border(c.accent, 2.25) : line
    const box = {
      borders: { top: line, bottom: look === 'solid' ? border(c.accent, 4.5) : line, left: { ...left, space: side }, right: { ...line, space: side } },
      ...(tone.fill ? { shading: hex(tone.fill) } : {}),
      indent: { left: f1(side + left.width), right: f1(side + line.width) }
    }
    const pad = (points) => P('', 'SmallText', { ...box, spacing: { before: 0, after: 0, line: { exact: Math.max(0.05, f1(points)) } } })
    // The space between its paragraphs is filled too: an empty line of the larger of the two spaces.
    const content = calloutContent(block, tone)
    const out = [pad(16 * k)]
    content.forEach((entry, index) => {
      const before = entry.spacing?.before ?? 0
      if (index) {
        const previous = content[index - 1]
        const after = previous.spacing?.after ?? (previous.style === 'CalloutTitle' ? T.calloutTitle.after * k : 0)
        if (Math.max(after, before) > 0) out.push(pad(Math.max(after, before)))
      }
      out.push({ ...entry, ...box, spacing: { ...entry.spacing, before: 0, after: 0 } })
    })
    return [...out, pad(17 * k)]
  }
  const factsCell = ([label, value]) => [P(labelRun(label, muted), 'LabelLine', { spacing: { after: f1(3 * k) } }), P(rich(value), 'ItemTitle', { spacing: { after: 0 } })]
  const factsBlocks = (block, width) => {
    const count = block.columns ?? 3
    return margined([grid(chunk(block.items.map(factsCell), count), { width, cell: () => ({ padding: { top: f1(8 * k), bottom: f1(10 * k), left: 0, right: 0 }, borders: { top: border(look === 'card' ? c.light : c.line), bottom: none, left: none, right: none } }) })], 6, 12)
  }
  /**
   * Hairline rules across the text as one picture, a paragraph of their own: what the foot of a page can
   * hold (its frame holds paragraphs, and a framed paragraph's own rules are not drawn by every layout).
   * `spans` are [from, to] in points; the rule is 1px (0.75pt).
   */
  const ruleParagraph = async (width, spans, colour = c.line) => {
    const w = Math.round(width / k)
    const body = spans.map(([from, to]) => `<rect x="${f1(from / k)}" y="0" width="${f1((to - from) / k)}" height="1" fill="${colour}"/>`).join('')
    const image = await art(svgDoc(w, 1, body), w * 4)
    return P([inlineImage(image, f1(width), 0.75, '')], 'SmallText', { spacing: { before: 0, after: 0, line: { exact: 0.75 } } })
  }
  /**
   * Facts at the foot of the page, as the grid sets them (`.pub-facts`): each column under its own rule,
   * its label, then its value wrapping in the column. A frame cannot hold the grid's table, so each value
   * is broken into the column's lines here (measured in the brand's own face) and the columns' lines are
   * set side by side on tab stops, one paragraph a line.
   */
  const factsParagraphs = async (block, width) => {
    const count = block.columns ?? 3
    const colW = (width - gap * (count - 1)) / count
    const at = (i) => i * (colW + gap)
    const tabs = Array.from({ length: count - 1 }, (_, i) => ({ at: f1(at(i + 1)), align: 'left' }))
    const size = T.body.size * k
    const measure = typeof ctx.fonts?.width === 'function' ? (text) => ctx.fonts.width(text, faces.keys.bold, size) : null
    const wrap = (value) => {
      const words = String(value).split(/\s+/).filter(Boolean)
      if (!measure) return [words.join(' ')]
      const lines = []
      for (const word of words) {
        const last = lines[lines.length - 1]
        if (last !== undefined && measure(`${last} ${word}`) <= colW - 1) lines[lines.length - 1] = `${last} ${word}`
        else lines.push(word)
      }
      return lines.length ? lines : ['']
    }
    const out = []
    for (const row of chunk(block.items, count)) {
      const values = row.map(([, value]) => wrap(value))
      const depth = Math.max(...values.map((lines) => lines.length))
      out.push(await ruleParagraph(width, row.map((_, i) => [at(i), at(i) + colW]), look === 'card' ? c.light : c.line))
      out.push(P(row.flatMap(([label], index) => [...(index ? [tab()] : []), labelRun(label, muted)]), 'LabelLine', { tabs, spacing: { before: f1(8 * k), after: f1(3 * k) } }))
      for (let line = 0; line < depth; line++) {
        out.push(P(values.flatMap((lines, index) => [...(index ? [tab()] : []), ...[].concat(rich(lines[line] ?? ''))]), 'ItemTitle', { tabs, keepWithNext: line < depth - 1, spacing: { before: 0, after: line === depth - 1 ? f1(10 * k) : 0 } }))
      }
    }
    return out
  }
  const referencesBlocks = (block, width) => {
    const count = block.columns ?? 2
    const indent = f1(30 * k)
    const entry = ([n, title, body]) => P([labelRun(n, c.accentText, 8), tab(), kitText(title, { characterStyle: 'Strong' }), ...(body ? [kitText(' '), ...[].concat(rich(body, 'small'))] : [])], 'SmallText', { indent: { left: indent, hanging: indent }, tabs: [{ at: indent, align: 'left' }] })
    return margined([grid([columnsOf(block.items, count).map((items) => items.map(entry))], { width })], 6, 0)
  }
  const contentsBlocks = (block, width) => {
    const count = block.columns ?? 2
    const colW = (width - gap * (count - 1)) / count
    // An entry is set at 11px on its own 1.52 line, between 7px of padding over a rule (`.pub-toc div`).
    const entry = ([label, pages], index) => P([kitText(label, { characterStyle: 'Strong', size: f1(11 * k * 100) / 100 }), tab(), labelRun(pages, c.accentText, 9)], 'normal', { tabs: [{ at: f1(colW - 1), align: 'right' }], borders: { top: { ...border(look === 'card' ? c.light : c.line), space: f1(7 * k) } }, spacing: { before: index ? f1(7 * k) : 0, after: f1(7 * k), line: { exact: f1(11 * 1.52 * k * 100) / 100 } } })
    return margined([grid([columnsOf(block.items, count).map((items) => items.map(entry))], { width })], 8, 12)
  }
  const scaleBlocks = async (block, width) => {
    const steps = block.steps ?? block.items.length
    const cells = []
    for (const item of block.items) {
      cells.push([
        ...(item.code ? [P(labelRun(item.code, look === 'card' ? c.primary : c.accentText, 8), 'LabelLine', { spacing: { after: f1(4 * k) } })] : []),
        P(rich(item.name), 'ItemTitle', { spacing: { after: f1(9 * k) } }),
        P([await dotsPicture(item.level, steps)], 'SmallText', { spacing: { after: 0, line: 1 } }),
        ...(item.note ? [P(labelRun(item.note, muted), 'LabelLine', { spacing: { before: f1(7 * k), after: 0 } })] : []),
        ...(item.text ? [P(rich(item.text, 'table'), 'SmallText', sized(T.table.size, T.table.line, { text: { color: hex(muted) }, spacing: { before: f1(7 * k), after: 0 } }))] : [])
      ])
    }
    const head = block.label ? [P(labelRun(block.label, muted), 'LabelLine', { spacing: { after: f1(8 * k) }, keepWithNext: true })] : []
    const cardCell = look === 'card'
    return [...head, grid([cells], { width, gutter: f1(20 * k), spaceAfter: 16 * k, cell: () => ({
      borders: { top: cardCell ? border(c.line) : border(c.ink), bottom: cardCell ? border(c.line) : none, left: cardCell ? border(c.line) : none, right: cardCell ? border(c.line) : none },
      ...(cardCell ? { shading: hex(c.reverse) } : {}),
      padding: cardCell ? { top: f1(12 * k), bottom: f1(12 * k), left: f1(14 * k), right: f1(14 * k) } : { top: f1(9 * k), bottom: f1(4 * k), left: 0, right: 0 }
    }) })]
  }
  const lockupPicture = async (h, colour, { compact = false } = {}) => {
    const piece = headLockup(h, colour, { compact })
    const image = await art(svgDoc(f1(piece.width), f1(piece.height), piece.art), piece.width * 4)
    return inlineImage(image, f1(piece.width * k), f1(piece.height * k), r.product ? `${owner.name} lockup` : `${brand.name} logo`)
  }

  const blocksOf = async (block, width, { inPush = false, inColumn = false } = {}) => {
    switch (block.type) {
      case 'heading': {
        const level = Math.max(1, Math.min(3, Number(block.level) || 2))
        return [heading(level, rich(block.text, level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'))]
      }
      case 'paragraph': return [P(rich(block.text), block.style === 'lead' ? 'Lead' : 'normal')]
      case 'opening': return [
        ...(block.kicker ? [P(rich(block.kicker, 'kicker'), 'Kicker')] : []),
        heading(1, rich(block.title, 'h1')),
        ...(block.lead ? [P(rich(block.lead, 'lead'), 'Lead', { indent: { right: f1(Math.max(0, width - 610 * k)) } })] : [])
      ]
      // A column's kicker stands under a rule, 9px below it, in the accent's text tone (`.pub-cols > div >
      // .pub-kicker`); elsewhere a kicker is the muted label it is in an opening.
      case 'kicker': return [P(rich(block.text, 'kicker'), 'Kicker', inColumn && !slide
        ? { text: { color: hex(look === 'card' ? c.primary : c.accentText) }, borders: { top: { ...border(ruleColour, ruleWidth), space: f1(9 * k) } }, spacing: { before: 0, after: f1(7 * k) } }
        : inPush ? {} : { text: { color: hex(muted) } })]
      case 'lead': return [P(rich(block.text, 'lead'), slide ? 'Statement' : 'Lead', slide ? sized(40, 1.2, { text: { color: hex(c.ink) }, spacing: { after: f1(20 * k) } }) : { indent: { right: f1(Math.max(0, width - 610 * k)) } })]
      case 'statement': return [P(rich(block.text, 'statement'), 'Statement')]
      case 'note': return [P([...(block.label ? [labelRun(block.label, c.ink), kitText('   ')] : []), ...[].concat(rich(block.text, 'note'))], 'FinePrint', { spacing: { before: f1(10 * k), after: 0 } })]
      case 'list': return [kitList(block.items.map((entry) => rich(entry)), { ordered: Boolean(block.ordered) })]
      case 'table': return slide ? tableBlock(block, width) : margined(tableBlock(block, width), 6, 14)
      case 'figure': {
        const figure = await figureBlocks(block, width)
        return slide ? figure : margined(figure, 6, block.caption || block.label ? 0 : 16)
      }
      case 'phones': case 'devices': {
        const srcs = block.type === 'phones' ? block.srcs : block.src ? [block.src] : block.items.map((item) => item[1])
        const height = (block.heightMm ? block.heightMm * 72 / 25.4 : 200 * k)
        const each = (width - gap * (srcs.length - 1)) / srcs.length
        const shots = []
        for (const src of srcs) {
          const pic = await picture(src)
          const w = Math.min(each, height * pic.width / pic.height)
          shots.push({ type: 'figure', image: kitImage(pic.bytes, { width: pic.width, height: pic.height }), fit: { width: f1(w), height: f1(w * pic.height / pic.width), upscale: true }, align: 'center', alt: block.caption ?? 'Device mockup' })
        }
        const labels = block.type === 'devices' && block.items ? block.items.map((item) => P(labelRun(item[2], muted), 'LabelLine', { align: 'center' })) : []
        const body = shots.length === 1 ? [shots[0]] : [grid([shots.map((shot, index) => [shot, ...(labels[index] ? [labels[index]] : [])])], { width })]
        const after = captionOf(block)
        return [...body, ...(after ? [after] : [])]
      }
      case 'steps': return stepsBlocks(block, width)
      case 'callout': return inPush ? calloutParagraphs(block) : calloutBlock(block)
      case 'facts': return inPush ? factsParagraphs(block, width) : factsBlocks(block, width)
      case 'columns': {
        const count = block.columns.length
        const shares = block.widths ?? Array(count).fill(1)
        const sum = shares.reduce((a, b) => a + b, 0)
        const colGap = slide ? 72 * k : gap
        const cols = []
        for (const [index, column] of block.columns.entries()) {
          const colWidth = (width - colGap * (count - 1)) * shares[index] / sum
          const inner = []
          for (const child of column) inner.push(...await blocksOf(child, colWidth, { inColumn: true }))
          // The last paragraph of a column keeps no space under it (`.pub-p:last-child`).
          const last = inner[inner.length - 1]
          if (!slide && last?.type === 'paragraph') inner[inner.length - 1] = { ...last, spacing: { ...last.spacing, after: 0 } }
          cols.push(inner)
        }
        const columns = grid([cols], { widths: shares, gutter: colGap, width, ...(block.ruled ? { cell: () => ({ borders: { top: border(look === 'solid' ? c.primary : c.ink), bottom: none, left: none, right: none }, padding: { top: f1(20 * k), bottom: 0, left: 0, right: 0 } }) } : {}) })
        return slide ? [columns] : margined([columns], 0, 10)
      }
      case 'scale': return scaleBlocks(block, width)
      case 'references': return referencesBlocks(block, width)
      case 'contents': return contentsBlocks(block, width)
      case 'masthead': {
        const onDark = parts.page.running === 'bar'
        return [P([await lockupPicture(40, onDark ? c.reverse : c.ink), tab(), labelRun(block.text, onDark ? c.light : muted, 8.5)], 'normal', { tabs: [{ at: 'end', align: 'right' }], spacing: { after: f1((onDark ? 52 : 28) * k), line: 1 } })]
      }
      // The sign-off's rule stands where the block above leaves off, its words 14px under it (`.pub-sign`).
      case 'signoff': return inPush
        ? [await ruleParagraph(width, [[0, width]]), P(rich(block.text, 'note'), 'FinePrint', { spacing: { before: f1(14 * k), after: 0 } })]
        : [P(rich(block.text, 'note'), 'FinePrint', { borders: { top: { ...border(c.line), space: f1(14 * k) } }, spacing: { before: 0, after: 0 } })]
      case 'spacer': return [spacer(f1(block.heightMm * 72 / 25.4))]
      case 'push': {
        const inner = []
        for (const child of block.blocks) inner.push(...await blocksOf(child, width, { inPush: true }))
        // The foot of the page holds its last block's bottom margin (a callout's 14px, facts' 12px) inside it.
        const lastType = block.blocks[block.blocks.length - 1]?.type
        return [pinned(inner, { spaceBelow: f1((lastType === 'callout' ? 14 : lastType === 'facts' ? 12 : 0) * k) })]
      }
      default: throw new Error(`Unsupported publication block: ${block.type}`)
    }
  }

  // ── Running furniture: the picture behind a running page, and its words in frames ──
  const groundRect = (w, h, colour = c.ground) => `<rect width="${w}" height="${h}" fill="${colour}"/>`
  const frameAt = (blocks, x, y, width, extra = {}) => frame(blocks, { x: f1(x * k), y: f1(y * k), width: f1(width * k) }, { wrap: 'none', ...extra })
  const sectionIndex = (current) => r.sections.indexOf(current)
  const dotIndex = (current, x, y, size, ringGround) => {
    const at = sectionIndex(current)
    let out = ''
    let cursor = x
    r.sections.forEach((_, i) => {
      const now = i === at
      if (now) cursor += 3 * size / 7
      const cx = cursor + size / 2
      out += now ? `<circle cx="${f1(cx)}" cy="${f1(y)}" r="${f1(size / 2 + 3.5 * size / 7)}" fill="${c.accent}"/><circle cx="${f1(cx)}" cy="${f1(y)}" r="${f1(size / 2 + 2.5 * size / 7)}" fill="${ringGround}"/><circle cx="${f1(cx)}" cy="${f1(y)}" r="${f1(size / 2)}" fill="${c.accent}"/>`
        : `<circle cx="${f1(cx)}" cy="${f1(y)}" r="${f1(size / 2)}" fill="${i < at ? c.primary : c.light}"/>`
      cursor += size + 5 * size / 7 + (now ? 3 * size / 7 : 0)
    })
    return { art: out, width: cursor - x }
  }
  const dotIndexWidth = (size) => r.sections.length * (size + 5 * size / 7) + 6 * size / 7

  /** A running page's header: its picture and its words. */
  const runningHeader = async (page, n, { bare = false } = {}) => {
    const w = G.w
    const h = G.h
    const run = parts.page.running
    const section = page.section ?? r.sections[0] ?? ''
    let body = groundRect(w, h)
    const frames = []
    const runP = (value, options = {}) => P(value, 'Running', options)
    if (!slide) {
      if (run === 'title-block') {
        body += `<rect x="30.5" y="30.5" width="${w - 61}" height="${h - 61}" fill="none" stroke="${c.rule}"/>`
        const top = h - 70
        const shares = [1.2, 2.3, 1.7, 1.1, 0.9]
        const sum = shares.reduce((a, b) => a + b, 0)
        const span = w - 60
        body += `<path d="M30 ${top + 0.5}H${w - 30}" stroke="${c.rule}"/>`
        const cells = [[r.product ? 'Product' : 'From', owner.name], ['Document', doc.short ?? doc.title], ['Section', section], ['Edition', doc.edition ?? ''], ['Sheet', null]]
        let x = 30
        cells.forEach(([label, value], i) => {
          const cw = span * shares[i] / sum
          if (i) body += `<path d="M${f1(x) + 0.5} ${top}V${h - 30}" stroke="${c.rule}"/>`
          const left = i ? 12 : 38
          frames.push(frameAt([P(label, 'RunningLabel'), P(value ?? [pad2(n), ' of ', pad2(total)], 'RunningValue')], x + left, top + 8, cw - left - 12))
          x += cw
        })
        if (parts.page.mark === 'symbol' && !bare) body += place(symbolArt(31, c.ink), G.mx, 46)
      } else if (run === 'bar') {
        const barH = bare ? 104 : 56
        body += `<rect width="${w}" height="${barH}" fill="${c.primary}"/><rect y="${h - 8}" width="${w}" height="8" fill="${c.accent}"/>`
        if (!bare) {
          const piece = headLockup(31, c.reverse, { compact: true })
          body += place(piece, G.mx, (barH - 31) / 2)
          frames.push(frameAt([runP(section, { align: 'right', text: { color: hex(c.light) } })], G.mx + 300, 22, w - 2 * G.mx - 300))
        }
        frames.push(frameAt([runP([kitText(`${doc.short ?? doc.title} · ${doc.edition ?? ''}`), tab(), kitText(`${pad2(n)} / ${pad2(total)}`, { color: hex(c.ink) })], { tabs: [{ at: f1((w - 2 * G.mx) * k), align: 'right' }] })], G.mx, h - 50, w - 2 * G.mx))
      } else if (run === 'dot-index') {
        if (!bare) {
          body += place(symbolArt(31, c.primary), G.mx, 36)
          const size = 7
          const dw = dotIndexWidth(size)
          body += dotIndex(section, w - G.mx - dw, 52, size, c.ground).art
          frames.push(frameAt([runP(`${owner.name} · ${kindName}`)], G.mx + 45, 47, 400))
        }
        body += `<circle cx="${w - G.mx - 15}" cy="${h - 51}" r="15" fill="${c.primary}"/>`
        frames.push(frameAt([runP(`${section} · ${doc.edition ?? ''}`)], G.mx, h - 56, 500))
        frames.push(frameAt([runP(pad2(n), { align: 'center', text: { color: hex(c.reverse), characterSpacing: 0 } })], w - G.mx - 30, h - 56, 30))
      } else {
        frames.push(frameAt([runP([kitText(doc.short ?? doc.title), tab(), kitText(section)], { tabs: [{ at: 'end', align: 'right' }] })], G.mx, 40, w - 2 * G.mx))
        frames.push(frameAt([runP([kitText(`${owner.name} · ${doc.edition ?? ''}`), tab(), pageNumber()], { tabs: [{ at: f1((w - 2 * G.mx) * k), align: 'right' }] })], G.mx, h - 56, w - 2 * G.mx))
      }
    } else {
      // A slide's foot: the mark, the document, the section and the slide number.
      const footTexts = (colour, x0, x1, y) => {
        frames.push(frameAt([runP([kitText(`${doc.short ?? doc.title}${doc.status ? ` · ${doc.status}` : ''}`), tab(), kitText(run === 'dot-index' ? '' : section), tab(), kitText(`${pad2(n)} / ${pad2(total)}`)], {
          tabs: [{ at: f1((x1 - x0 - 300) * k), align: 'right' }, { at: f1((x1 - x0) * k), align: 'right' }], text: { color: hex(colour) } })], x0, y, x1 - x0))
      }
      if (run === 'bar') {
        body += `<rect y="${h - 96}" width="${w}" height="96" fill="${c.primary}"/><rect y="${h - 14}" width="${w}" height="14" fill="${c.accent}"/>`
        const piece = headLockup(34, c.reverse, { compact: true })
        body += place(piece, G.mx, h - 96 + (82 - 34) / 2)
        footTexts(c.light, G.mx + piece.width + 40, w - G.mx, h - 96 + 33)
      } else if (run === 'dot-index') {
        body += place(symbolArt(36, c.primary), G.mx, h - 84)
        const size = 12
        const dw = dotIndexWidth(size)
        body += dotIndex(section, w - G.mx - 200 - dw, h - 66, size, c.ground).art
        footTexts(muted, G.mx + 76, w - G.mx, h - 74)
      } else {
        if (run === 'title-block') body += `<rect x="36.5" y="36.5" width="${w - 73}" height="${h - 73}" fill="none" stroke="${c.rule}"/><path d="M36 ${h - 96.5}H${w - 36}" stroke="${c.rule}"/>`
        const piece = run === 'title-block' || r.product ? headLockup(34, c.ink, { compact: true }) : symbolArt(34, c.ink)
        body += place(piece, 96, h - 96 + (60 - 34) / 2)
        footTexts(muted, 96 + piece.width + 40, w - 96, h - 96 + 22)
      }
    }
    const background = await art(svgDoc(w, h, body), w * pageScale)
    return [floatingImage(background, 'page', { alt: '' }), ...frames]
  }

  const margins = (top, right, bottom, left) => ({ top: f1(top * k), right: f1(right * k), bottom: f1(bottom * k), left: f1(left * k), header: 0, footer: 0 })
  const pageSetup = (m) => ({ paper: { width: r.paper.orientation === 'landscape' ? H : W, height: r.paper.orientation === 'landscape' ? W : H }, orientation: r.paper.orientation, margins: m })

  // ── Covers and closing pages ──
  const darkDesign = (design, page) => design === 'band' || design === 'night' || (design === 'field' && page?.motif === 'night')
  const groundFor = (design, page) => (darkDesign(design, page) ? c.primary : design === 'field' ? c.light : c.ground)
  const inkFor = (design, page) => (darkDesign(design, page) ? c.reverse : design === 'field' ? c.primary : c.ink)
  const plateLine = (design, page) => (darkDesign(design, page) ? c.light : design === 'field' ? c.primary : muted)
  const paintFor = (design, page) => ({ line: plateLine(design, page), accent: c.accent, accentDark: c.accentDark, ground: groundFor(design, page), primary: c.primary, light: c.light, reverse: c.reverse, muted, night: design === 'night' })

  const lockupAlt = r.product ? `${owner.name} lockup` : `${brand.name} logo`
  const metaLines = (lines, colour, align) => lines.map((line) => P(rich(line, 'meta'), 'Meta', { align, text: { color: hex(colour) } }))
  const coverSection = async (page) => {
    const part = parts.cover
    const design = part.design
    const dark = darkDesign(design, page)
    const ground = groundFor(design, page)
    const ink = inkFor(design, page)
    const soft = dark ? c.light : design === 'field' ? c.primary : muted
    const w = G.w
    const h = G.h
    let body = groundRect(w, h, ground)
    const frames = []
    const lines = slide ? [doc.edition ?? ''] : page.lines ?? [doc.edition ?? '']
    const lockH = slide ? 64 : 44
    const lk = headLockup(lockH, dark ? c.reverse : c.ink)
    const lockAt = slide ? [96, 96] : [68, 66]
    let textTop = slide ? (dark ? 250 : design === 'sheet' ? 286 : design === 'field' ? 270 : 300) : design === 'sheet' ? 596 : design === 'field' ? 176 : 190
    const plate = plateFor(part.plate, page)
    if (!slide) {
      if (design === 'sheet') {
        body += `<rect x="30.5" y="30.5" width="${w - 61}" height="${h - 61}" fill="none" stroke="${c.rule}"/>`
        if (page.hero) body += await heroArt(page.hero, { x: 68, y: 150, width: 680, height: 400 }, 0)
        else {
          body += plateIn(plate, { x: 68, y: 150, width: 680, height: 400 }, { width: 680, height: 400 }, paintFor(design, page))
          body += `<g transform="translate(${w - 68 - 30} 162)"><path d="M9 1v28M9 1L4 9M9 1l5 8" fill="none" stroke="${c.ink}" stroke-width="1.2"/></g>`
          frames.push(frameAt([P('ILLUSTRATIVE TERRAIN · NOT TO SCALE', 'Running', sized(7, 1.4, { text: { color: hex(c.ink) }, shading: hex(c.ground) }))], 80, 530, 240))
        }
        body += `<rect x="68.5" y="150.5" width="679" height="399" fill="none" stroke="${c.ink}"/>`
        const top = h - 92
        body += `<path d="M30 ${top + 0.5}H${w - 30}" stroke="${c.rule}"/>`
        const shares = [1.3, 1, 1, 1]
        let x = 30
        const cells = [[r.product ? 'Product' : 'From', owner.name], ['Document', kindName], ['Edition', doc.edition ?? ''], ['Sheet', `01 of ${pad2(total)}`]]
        cells.forEach(([label, value], i) => {
          const cw = (w - 60) * shares[i] / 4.3
          if (i) body += `<path d="M${f1(x) + 0.5} ${top}V${h - 30}" stroke="${c.rule}"/>`
          const left = i ? 14 : 38
          frames.push(frameAt([P(label, 'RunningLabel', sized(6.6, 1.2, { spacing: { after: f1(6 * k) } })), P(value, 'RunningValue', sized(10.5, 1.3))], x + left, top + 18, cw - left - 14))
          x += cw
        })
      } else if (design === 'band') {
        if (page.hero) {
          body += await heroArt(page.hero, { x: 68, y: 488, width: 680, height: 317 }, 8)
          if (page.hero.caption) frames.push(frameAt([P(rich(page.hero.caption), 'SmallText', sized(9, 1.4, { text: { color: hex(c.light) } }))], 68, 812, 680))
        } else body += plateIn(plate, { x: 0, y: 400, width: w, height: h - 400 - G.band }, { width: 816, height: 642 }, paintFor(design, page))
        body += `<rect y="${h - G.band}" width="${w}" height="${G.band}" fill="${c.accent}"/>`
        frames.push(frameAt(metaLines(lines, c.light, 'right'), 68, h - G.band - 40 - lines.length * 13.6, 680))
      } else {
        const night = page.motif === 'night'
        if (page.hero) {
          body += await heroArt(page.hero, { x: 68, y: 520, width: 680, height: 317 }, 14, c.reverse)
          if (page.hero.caption) frames.push(frameAt([P(rich(page.hero.caption), 'SmallText', sized(9, 1.4, { text: { color: hex(muted) }, shading: hex(c.ground) }))], 68, 850, 680))
        } else body += plateIn(plate, { x: 0, y: 500, width: w, height: h - 500 - 118 }, { width: 816, height: 438 }, paintFor(design, page))
        body += `<rect y="${h - 118}" width="${w}" height="118" fill="${night ? c.primary : c.ground}"/>`
        if (night) body += `<path d="M0 ${h - 117.5}H${w}" stroke="${mixHex(c.light, c.primary, 0.3)}"/>`
        frames.push(frameAt(metaLines(lines, night ? c.light : c.primary, 'right'), 68, h - 59 - lines.length * 6.8, 680))
      }
    } else {
      const small = Boolean(page.small)
      if (design === 'band') {
        body += plateIn({ ...plate, reach: 0.74 }, { x: 0, y: h - G.band - 740, width: w, height: 740 }, { width: 1920, height: 740 }, paintFor(design, page), { fade: small ? [0.52, 0.78] : [0.22, 0.74] })
        body += `<rect y="${h - G.band}" width="${w}" height="${G.band}" fill="${c.accent}"/>`
      } else if (design === 'sheet') {
        body += `<rect x="36.5" y="36.5" width="${w - 73}" height="${h - 73}" fill="none" stroke="${c.rule}"/>`
        body += plateIn(plate, { x: w - 96 - 660, y: 96, width: 660, height: h - 96 - 236 }, { width: 660, height: 750 }, paintFor(design, page))
        body += `<rect x="${w - 96 - 660 + 0.5}" y="96.5" width="659" height="${h - 96 - 236 - 1}" fill="none" stroke="${c.ink}"/>`
      } else {
        body += plateIn(plate.type === 'field' ? { ...plate, step: 22, fade: 'left' } : plate, { x: w - 900, y: 0, width: 900, height: h }, { width: 900, height: 1080 }, paintFor(design, page))
      }
      if (design === 'field') frames.push(frameAt(metaLines(lines, ink, 'left'), 96, h - 100 - lines.length * 27, 900))
      else frames.push(frameAt(metaLines(lines, soft, 'right'), 96, h - (dark ? G.band + 56 : 96) - lines.length * 27.2, w - 192))
      textTop = small ? 226 : textTop
    }
    body += place(lk, ...lockAt)
    const background = await art(svgDoc(w, h, body), w * pageScale)
    const kicker = slide ? T.coverKicker : null
    void kicker
    const titleSize = slide ? (page.small ? 92 : 124) : design === 'band' ? 66 : design === 'field' ? 60 : 56
    const subWidth = slide ? (design === 'band' && !page.small ? 780 : 940) : 560
    const flow = [
      ...(page.kicker ? [P(rich(page.kicker, 'coverKicker'), 'CoverKicker', { text: { color: hex(dark ? c.accentDark : ink) } })] : []),
      P(rich(page.title, 'coverTitle', { second: mixHex(ink, ground, 0.55) }), 'CoverTitle', { ...sized(titleSize, slide ? 0.98 : 1), text: { color: hex(ink), size: f1(titleSize * k * 100) / 100 }, indent: { right: f1((slide ? (W / k - 96 - 1000) : 0) * k) } }),
      ...(page.subtitle ? [P(rich(page.subtitle, 'coverSub'), 'CoverText', { ...(page.small ? sized(34, 1.28) : {}), text: { color: hex(design === 'field' && !dark ? mixHex(c.primary, c.light, 0.82) : soft), ...(page.small ? { size: f1(34 * k) } : {}) }, indent: { right: f1((W / k - (slide ? 96 : 68) * 2 - subWidth) * k) } })] : [])
    ]
    return section(flow, { page: pageSetup(margins(textTop, slide ? 96 : 68, 0, slide ? 96 : 68)), header: [floatingImage(background, 'page', { alt: lockupAlt }), ...frames], footer: [] })
  }
  /** A hero capture on a cover, cropped to its box with rounded corners, drawn into the cover's picture. */
  const heroArt = async (hero, box, radius, edge) => {
    const pic = await picture(hero.src)
    const href = `data:image/${pic.format === 'png' ? 'png' : 'jpeg'};base64,${encode64(pic.bytes)}`
    const id = `hero${Math.round(box.y)}`
    return `<defs><clipPath id="${id}"><rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="${radius}"/></clipPath></defs>${edge ? `<rect x="${box.x - 8}" y="${box.y - 8}" width="${box.width + 16}" height="${box.height + 16}" rx="${radius + 8}" fill="${edge}"/>` : ''}<g clip-path="url(#${id})"><rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${c.reverse}"/><image href="${href}" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" preserveAspectRatio="xMinYMin slice"/></g>`
  }

  /**
   * A closing page's contact person (a client document's contact page): the name large in the display
   * face, the role and organisation under it in the page's soft tone, then the email and phone as plain
   * lines. No box: the page's ground and plate carry it.
   */
  const contactBlocks = (person, { ink, soft, width }) => {
    const s = slide ? { name: 72, info: 34, reach: 30, gap: 64, mid: 28 } : { name: 34, info: 15, reach: 13.5, gap: 34, mid: 16 }
    const display = { font: faces.display.name, bold: faces.display.bold, characterSpacing: f1(-0.03 * s.name * k * 100) / 100 }
    const right = { right: f1(Math.max(0, width - (slide ? 1100 : 600) * k)) }
    const lines = [person.role, person.org].filter(Boolean)
    const reach = [person.email, person.phone].filter(Boolean)
    return [
      P(kitText(person.name, display), 'normal', sized(s.name, 1.1, { text: { color: hex(ink) }, indent: right, keepWithNext: true, spacing: { before: f1(s.gap * k), after: f1((lines.length ? 6 : s.mid) * k) } })),
      ...lines.map((line, index) => P(kitText(line), 'normal', sized(s.info, 1.4, { text: { color: hex(soft) }, indent: right, keepWithNext: true, spacing: { before: 0, after: f1((index === lines.length - 1 ? s.mid : 0) * k) } }))),
      ...reach.map((line) => P(kitText(line), 'normal', sized(s.reach, 1.5, { text: { color: hex(ink) }, indent: right, spacing: { before: 0, after: 0 } })))
    ]
  }

  const closingSection = async (page) => {
    const part = parts.close
    const design = page.motif === 'night' ? 'night' : part.design
    const dark = darkDesign(design, page)
    const ground = groundFor(design, page)
    const ink = inkFor(design, page)
    const soft = dark ? c.light : design === 'field' ? c.primary : muted
    const strongTone = dark ? c.accentDark : c.accentText
    const w = G.w
    const h = G.h
    let body = groundRect(w, h, ground)
    const frames = []
    const plate = plateFor(part.plate, page)
    const paint = paintFor(design, page)
    const lockH = slide ? 64 : 44
    const lk = headLockup(lockH, dark ? c.reverse : c.ink)
    const lockAt = slide ? [96, 96] : [68, 66]
    if (!slide) {
      if (design === 'sheet') {
        body += `<rect x="30.5" y="30.5" width="${w - 61}" height="${h - 61}" fill="none" stroke="${c.rule}"/>`
        body += plateIn({ ...plate, routes: plate.routes ?? false }, { x: 68, y: 620, width: 680, height: 250 }, { width: 680, height: 260 }, paint)
        body += `<rect x="68.5" y="620.5" width="679" height="249" fill="none" stroke="${c.ink}"/>`
      } else if (design === 'band') body += plateIn({ ...plate, reach: plate.reach ?? 0.47 }, { x: 0, y: 520, width: w, height: h - 520 - G.band }, { width: 816, height: 522 }, paint)
      else if (design === 'night') body += plateIn(plate, { x: 0, y: 520, width: w, height: h - 520 - G.band - 118 }, { width: 816, height: 300 }, paint)
      else body += plateIn(plate, { x: 0, y: 610, width: w, height: h - 610 - 118 }, { width: 816, height: 330 }, paint)
      if (design === 'field') body += `<rect y="${h - 118}" width="${w}" height="118" fill="${c.ground}"/>`
      if (dark) body += `<rect y="${h - G.band}" width="${w}" height="${G.band}" fill="${c.accent}"/>`
      // The foot: the positioning line, the family key and what the product is part of; or the company's own line.
      const foot = []
      const line = r.product ? brand.products?.positioning?.line ?? brand.copy?.tagline : brand.copy?.tagline
      if (line) foot.push(P(line, 'FamilyLine', { text: { color: hex(ink) } }))
      const footBottomPx = design === 'field' ? 59 + 30 : dark ? G.band + 40 : 66
      if (r.product && (brand.products?.items?.length ?? 0) > 1) {
        const items = brand.products.items
        const kw = items.length * 24 + (items.length - 1) * 4
        // The family key, every product's accent as a bar, drawn in the page's picture under the line.
        body += productFamilyKey(ctx, { bar: 24, height: 5, gap: 4 }).replace(/^<svg[^>]*>/, `<svg x="${w - 68 - kw}" y="${h - footBottomPx - 23}" width="${kw}" height="5">`).replace(/<title>.*?<\/title><desc>.*?<\/desc>/, '')
        foot.push(P('', 'SmallText', sized(1, 13, { spacing: { after: 0 } })))
      }
      const partOf = !r.product ? page.signoff ?? owner.name : r.platform && r.platform.id !== r.product.id ? `${owner.name} is part of ${r.platform.fullName ?? r.platform.name}` : owner.name
      foot.push(P(partOf, 'Running', { align: 'right', text: { color: hex(ink) } }))
      frames.push(frameAt(foot, 68, h - footBottomPx - (line ? 29 : 0) - 26, 680))
    } else {
      if (design === 'band') {
        body += plateIn({ ...plate, reach: 0.74 }, { x: 0, y: h - G.band - 740, width: w, height: 740 }, { width: 1920, height: 740 }, paint, { fade: page.small ? [0.52, 0.78] : [0.22, 0.74] })
      } else if (design === 'sheet') {
        body += `<rect x="36.5" y="36.5" width="${w - 73}" height="${h - 73}" fill="none" stroke="${c.rule}"/>`
        body += plateIn(plate, { x: w - 96 - 660, y: 96, width: 660, height: h - 96 - 236 }, { width: 660, height: 750 }, paint)
        body += `<rect x="${w - 96 - 660 + 0.5}" y="96.5" width="659" height="${h - 96 - 236 - 1}" fill="none" stroke="${c.ink}"/>`
      } else {
        body += plateIn(plate.type === 'field' ? { ...plate, step: 22, fade: 'left', seed: r.seed + 11 } : plate, { x: w - 900, y: 0, width: 900, height: dark ? h - G.band : h }, { width: 900, height: dark ? 950 : 1080 }, paint)
      }
      if (dark) body += `<rect y="${h - G.band}" width="${w}" height="${G.band}" fill="${c.accent}"/>`
      const lines = page.lines ?? [doc.edition ?? '']
      if (design === 'field' || design === 'night') frames.push(frameAt(metaLines(lines, soft, 'left'), 96, h - (dark ? G.band + 56 : 100) - lines.length * 27.2, 900))
      else frames.push(frameAt(metaLines(lines, soft, 'right'), 96, h - (dark ? G.band + 56 : 96) - lines.length * 27.2, w - 192))
    }
    body += place(lk, ...lockAt)
    const background = await art(svgDoc(w, h, body), w * pageScale)
    const width = (G.w - 2 * (slide ? 96 : 68)) * k
    const flow = [
      ...(page.kicker ? [P(rich(page.kicker, 'coverKicker'), 'CoverKicker', { text: { color: hex(dark ? c.light : design === 'sheet' ? c.ink : ink) } })] : []),
      P(rich(page.title, 'closeTitle', { second: mixHex(ink, ground, 0.55) }), 'CloseTitle', { ...(slide && page.small ? sized(92, 0.98) : {}), text: { color: hex(ink), ...(slide && page.small ? { size: f1(92 * k) } : {}) }, indent: { right: f1(Math.max(0, width - (slide ? 1000 : 620) * k)) } }),
      ...(page.text ?? page.subtitle ? [P(rich(page.text ?? page.subtitle, 'closeText', { cite: strongTone }), 'CloseText', { ...(slide && page.small ? sized(32, 1.28) : {}), text: { color: hex(soft), ...(slide && page.small ? { size: f1(32 * k) } : {}) }, indent: { right: f1(Math.max(0, width - (slide ? 940 : 590) * k)) } })] : [])
    ]
    if (page.asks?.length) {
      const askCells = page.asks.map(([label, value]) => [P(labelRun(label, design === 'field' ? c.primary : strongTone, 8), 'LabelLine', { spacing: { after: f1(6 * k) } }), P(rich(value), 'normal', { text: { color: hex(dark ? c.light : design === 'field' ? c.primary : muted) }, spacing: { after: 0 } })])
      flow.push(grid([askCells], { width, gutter: f1(24 * k), spaceAfter: 26 * k, cell: () => ({
        borders: { top: design === 'field' ? none : border(dark ? c.accentDark : ink), bottom: none, left: none, right: none },
        ...(design === 'field' ? { shading: hex(c.ground) } : {}),
        padding: design === 'field' ? { top: f1(14 * k), bottom: f1(14 * k), left: f1(14 * k), right: f1(14 * k) } : { top: f1(10 * k), bottom: 0, left: 0, right: 0 }
      }) }))
    }
    if (typeof page.contact === 'string') flow.push(P(rich(page.contact, 'meta'), 'Meta', sized(9.5, 1.5, { text: { color: hex(design === 'field' ? c.primary : strongTone) } })))
    else if (page.contact) flow.push(...contactBlocks(page.contact, { ink, soft: dark ? c.light : mixHex(ink, ground, 0.7), width }))
    if (page.fine) flow.push(P(rich(page.fine, 'note'), 'FinePrint', { text: { color: hex(soft) }, indent: { right: f1(Math.max(0, width - 600 * k)) }, spacing: { before: f1(22 * k), after: 0 } }))
    const top = slide ? 300 : 150
    return section(flow, { page: pageSetup(margins(top, slide ? 96 : 68, 0, slide ? 96 : 68)), header: [floatingImage(background, 'page', { alt: lockupAlt }), ...frames], footer: [] })
  }

  // ── Running pages and slides ──
  const contentSection = async (page, n) => {
    const bare = Boolean(page.bare)
    const header = await runningHeader(page, n, { bare })
    const width = (G.w - 2 * G.mx) * k
    const body = []
    if (slide) {
      // The slide's heading in a frame at its top; its body in the flow below.
      const headBlocks = [
        ...(page.kicker ? [P(rich(page.kicker, 'kicker'), 'Kicker', { text: { color: hex(look === 'solid' ? c.accentText : look === 'card' ? c.primary : muted) } })] : []),
        heading(1, rich(page.title, 'h1')),
        ...(page.subtitle ? [P(rich(page.subtitle, 'subtitle'), 'Lead', { spacing: { after: 0 } })] : [])
      ]
      header.push(frameAt(headBlocks, G.mx, 84, G.w - 2 * G.mx))
      if (page.note) header.push(frameAt([P(rich(page.note, 'note'), 'FinePrint', { spacing: { before: 0, after: 0 } })], G.mx, G.h - (look === 'solid' ? 124 : 116) - 32, G.w - 2 * G.mx))
    }
    mediaHeight = ((page.blocks ?? []).some((block) => block.type === 'statement') ? 420 : 590) * k
    for (const block of page.blocks ?? []) body.push(...await blocksOf(block, width))
    const top = slide ? G.bt : bare ? (parts.page.running === 'bar' ? 32 : 66) : G.bt
    return section(body.length ? body : [P('', 'normal')], { page: pageSetup(margins(top, G.mx, G.bb, G.mx)), header, footer: [] })
  }

  const sections = []
  for (const [index, page] of doc.pages.entries()) {
    if (page.layout === 'cover') sections.push(await coverSection(page))
    else if (page.layout === 'closing') sections.push(await closingSection(page))
    else sections.push(await contentSection(page, index + 1))
  }

  // Kerned, as browsers and Word set text: the document-wide default (document-kit writes it to Word's defaults).
  const bodyText = textOf('body', { color: hex(c.ink), kern: true })
  const headingColour = look === 'ruled' ? c.ink : c.primary
  const theme = {
    body: bodyText,
    headings: [textOf('h1', { color: hex(headingColour), keepWithNext: true, ...(look === 'solid' && !slide ? { size: f1(38 * k), line: { exact: f1(38 * 1.06 * k * 100) / 100 } } : {}) }), textOf('h2', { color: hex(headingColour), keepWithNext: true }), textOf('h3', { color: hex(headingColour), keepWithNext: true })],
    title: textOf('coverTitle'), subtitle: textOf('coverSub'),
    caption: textOf('caption', { color: hex(muted) }), note: textOf('note', { color: hex(muted) }), small: textOf('small'),
    header: textOf('run', { color: hex(muted) }), footer: textOf('run', { color: hex(muted) }),
    link: { color: hex(c.ink), underline: true },
    table: { size: f1(T.table.size * k * 100) / 100, headerFill: '', headerText: { bold: false }, headerAlign: 'left', outerBorder: none, innerBorder: none, spaceAfter: f1(14 * k), cellPadding: { top: 0, bottom: 0, left: 0, right: 0 } }
  }
  const used = new Set([faces.body.name, faces.bold.name, faces.display.name, faces.label.name, ...[tableDesign.header?.face?.name, tableDesign.first?.face?.name].filter(Boolean)].map((name) => name.toLowerCase()))
  const embedded = brandFaces(ctx).filter((face) => used.has(face.family.toLowerCase()))
  const document = kitDocument(sections, {
    metadata: {
      title: `${owner.name} · ${doc.title}`, author: brand.name, subject: kindName,
      description: `${brand.name} ${kindName.toLowerCase()} · ${r.style.name} style · ${doc.edition ?? ''}`,
      custom: {
        'brandkit.publicationId': doc.id, 'brandkit.publicationKind': r.kind.id, 'brandkit.publicationStyle': r.style.id,
        ...(r.product ? { 'brandkit.product': r.product.id } : {}),
        'brandkit.fontRequirements': JSON.stringify(fontRequirements(ctx, embedded))
      }
    },
    theme,
    styles: { paragraph: paragraphStyles, character: characterStyles }
  })
  return { document, faces: embedded, resolved: r }
}

/** The files a designed publication's figures read: `read` for each, given back as a Map. */
export const designedPublicationAssets = (doc) => publicationAssets(doc)

/** The designed publication as a Word file (document-kit's writeDocx), the brand's faces embedded where their licences allow. */
export const designedPublicationDocx = async (ctx, doc, options = {}) => {
  const [{ document, faces }, { writeDocx }] = await Promise.all([designedPublicationDocument(ctx, doc, options), import('document-kit/docx')])
  return writeDocx(document, { embedFonts: faces })
}

/** The designed publication's print view: one self-contained HTML page (document-kit's writeHtml) from the same document. */
export const designedPublicationHtml = async (ctx, doc, options = {}) => {
  const [{ document, faces }, { writeHtml }] = await Promise.all([designedPublicationDocument(ctx, doc, options), import('document-kit/html')])
  return writeHtml(document, { fonts: faces, lang: 'en' })
}

export { escapeXml as escapePublicationXml }
