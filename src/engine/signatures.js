// Signatures: lockups that are composed rather than drawn once.
//
// ddcnorth's logo is a fixed wordmark beside a symbol (brand.families, brand.wordmark). Other
// identities set their signatures from rules: the Province of British Columbia's 1977 ministerial
// signature puts any ministry's name, in Helvetica, on a cap-height and x-height grid beside the
// symbol; BC Hydro's four signatures are fixed artwork in up to three colours. Both are described
// here as data:
//
//   brand.signatures: [{ id, label, use, symbol?, padding?, departmental?, elements: [...] }]
//
// Elements, in signature units (any; the canvas is fitted to what is drawn):
//   symbol     { x, y, height, symbol?, role? }        a brand symbol, by id (brand.symbols)
//   art        { markup, x?, y?, scale?, bounds }      fixed artwork; {role} placeholders take colours
//   text       { text | field, x, y, size, font, role?, caps?, anchor? }
//   stack      { x, y, anchor?, items: [...] }          lines set one under another, each item a
//              { text | field, size, font, leading, caps?, wrap?, maxLines?, gapBefore?, role? };
//              a field with line breaks (a ministry on three lines) takes as many lines as it has
//   run        { x, y, anchor?, parts: [{ text | field, size, font, caps?, role? }] }   one line in
//              several faces ("Province of British Columbia" bold, then "Ministry of …" regular)
//   rule       { x1, y1, x2, y2, width, role?, when? }  y may be 'after:<stack id>+gap' to follow a
//              stack; `when` names a field the rule depends on (a rule over an empty address goes)
//
// Stack items may also `join` a field's lines into one (the centred formats set a ministry on one
// line that the flush-left formats break), and items and rules may be conditional on a field (`when`).
//
// Colourways say what colour each role is drawn in:
//
//   brand.colourways: { positive: { label, roles: { symbol: 'brown', type: 'black' } },
//                       black: { label, all: 'black' }, … }
//
// Fields come from `values` (a ministry, a branch, an address); a field left empty drops its line.

import { colour as resolveColour, face as faceOf, fill } from './brand.js'
import { escape, n } from './format.js'
import { assertLogoPaint } from './identity.js'

const PT = 1

/** Whether a paint name is a colour (a palette key, a role, a CSS value) rather than a colourway's name. */
const isColour = (brand, value) => resolveColour(brand, value) !== value || /^(#|rgba?\(|hsla?\(|currentColor$|none$|transparent$|black$|white$)/i.test(value)

/** A paint function for a colourway: role → colour. A plain colour paints every role. */
export const paintFor = (brand, colourway) => {
  if (typeof colourway === 'function') return colourway
  if (colourway == null) return () => 'currentColor'
  const spec = typeof colourway === 'string' ? brand.colourways?.[colourway] : colourway
  // A name that is neither this brand's colourway nor a colour (another brand's "positive", say)
  // would paint every part in an invalid colour; the brand's default colourway paints it instead.
  const fallback = brand.defaultColourway ?? Object.keys(brand.colourways ?? {})[0]
  if (!spec && typeof colourway === 'string' && fallback && fallback !== colourway && brand.colourways?.[fallback] && !isColour(brand, colourway)) return paintFor(brand, fallback)
  if (!spec) {
    const single = resolveColour(brand, colourway)
    return () => single
  }
  if (spec.all) {
    const single = resolveColour(brand, spec.all)
    return () => single
  }
  return (role) => resolveColour(brand, spec.roles?.[role] ?? spec.roles?.default ?? spec.default ?? 'ink')
}

/** Replaces {role} placeholders in supplied markup with the colourway's colours. */
export const paintMarkup = (markup, paint) => String(markup).replace(/\{([a-z][\w-]*)\}/g, (match, role) => paint(role))

export const signatureOf = (brand, id) => brand.signatures?.find((entry) => entry.id === id) ?? brand.signatures?.[0] ?? null

const valueOf = (ctx, item) => {
  if (item.field) {
    const value = ctx.values?.[item.field]
    if (value != null) return String(value)
    const declared = ctx.brand.fields?.[item.field]?.placeholder ?? ctx.brand.departments?.placeholders?.[item.field]
    return declared != null ? String(declared) : (item.text ?? '')
  }
  return fill(ctx.brand, item.text ?? '')
}

const measure = (ctx, text, font, size) => ctx.fonts?.width?.(text, font, size) || Array.from(text).length * size * 0.55
const capHeight = (ctx, font) => ctx.brand.fonts?.[font]?.capHeight ?? 0.72

/**
 * Breaks a field at typed line breaks, and between words at `wrap`, if given. Words in `openers`
 * ("and", "&") open a line rather than close one, as UNBC's sub-logos set "Faculty of Human /
 * and Health Sciences", unless carrying one down would overrun the next line.
 */
export const linesOf = (ctx, text, item) => {
  const out = []
  const openers = new Set((item.openers ?? []).map((word) => word.toLowerCase()))
  const fits = (line) => measure(ctx, line, item.font, item.size) <= item.wrap
  for (const block of text.split('\n')) {
    if (!item.wrap) { out.push(block); continue }
    let current = ''
    for (const word of block.split(/\s+/).filter(Boolean)) {
      const trial = current ? `${current} ${word}` : word
      if (!current || fits(trial)) { current = trial; continue }
      const space = current.lastIndexOf(' ')
      const last = current.slice(space + 1)
      if (space > 0 && openers.has(last.toLowerCase()) && fits(`${last} ${word}`)) {
        out.push(current.slice(0, space)); current = `${last} ${word}`
      } else { out.push(current); current = word }
    }
    out.push(current)
  }
  return out.slice(0, item.maxLines ?? Infinity)
}

/**
 * Lays out a signature: its parts, their colours, and the box they fill.
 * Text is outlined when the face is loaded, and live (in the face's CSS stack) when it is not.
 */
export const layoutSignature = (ctx, signature, paint) => {
  const { brand, fonts } = ctx
  const parts = []
  const box = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity }
  const grow = (x1, y1, x2, y2) => { box.x1 = Math.min(box.x1, x1); box.y1 = Math.min(box.y1, y1); box.x2 = Math.max(box.x2, x2); box.y2 = Math.max(box.y2, y2) }
  const ends = {}
  // A position 'after:<stack id>+gap' is the last baseline of that stack, plus the gap;
  // 'after:a,b+gap' takes the first of those stacks that drew anything.
  const at = (value) => {
    if (typeof value !== 'string' || !value.startsWith('after:')) return value
    const [ids, gap = 0] = value.slice(6).split('+')
    const end = ids.split(',').map((id) => ends[id]).find((entry) => entry != null)
    return (end ?? 0) + Number(gap)
  }

  const setText = (text, x, y, size, font, role, anchor = 'start', caps = false) => {
    const content = caps ? text.toUpperCase() : text
    if (!content.trim()) return
    const width = measure(ctx, content, font, size)
    const left = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x
    grow(left, y - capHeight(ctx, font) * size, left + width, y + 0.22 * size)
    const colourValue = paint(role ?? 'type')
    if (fonts?.has(font)) {
      parts.push(`<path fill="${colourValue}" aria-label="${escape(content)}" d="${fonts.path(content, font, size, x, y, 0, anchor)}"/>`)
    } else {
      const face = faceOf(brand, font)
      parts.push(`<text x="${n(x)}" y="${n(y)}" font-family="${escape(face.stack ?? 'sans-serif')}" font-size="${n(size)}" font-weight="${face.weight ?? 400}"${face.style ? ` font-style="${face.style}"` : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''} fill="${colourValue}">${escape(content)}</text>`)
    }
  }

  for (const element of signature.elements) {
    switch (element.type) {
      case 'symbol': {
        const symbolId = element.symbol ?? signature.symbol
        const symbol = (symbolId && brand.symbols?.[symbolId]) || brand.symbol
        const [, , w, h] = symbol.viewBox
        const scale = element.height / h
        grow(element.x, element.y, element.x + w * scale, element.y + element.height)
        const inner = symbol.markup ? paintMarkup(symbol.markup, paint) : ''
        parts.push(`<g data-brand-symbol="${escape(symbol.name ?? symbolId ?? 'symbol')}" transform="translate(${n(element.x)} ${n(element.y)}) scale(${n(scale)})" fill="${paint(element.role ?? 'symbol')}">${inner}</g>`)
        break
      }
      case 'art': {
        const [x1, y1, x2, y2] = element.bounds
        const scale = element.scale ?? 1
        const x = element.x ?? 0
        const y = element.y ?? 0
        grow(x + x1 * scale, y + y1 * scale, x + x2 * scale, y + y2 * scale)
        parts.push(`<g transform="translate(${n(x)} ${n(y)}) scale(${n(scale)})">${paintMarkup(element.markup, paint)}</g>`)
        break
      }
      case 'text':
        setText(valueOf(ctx, element), element.x, element.y, element.size * PT, element.font ?? 'regular', element.role, element.anchor, element.caps)
        break
      case 'stack': {
        let y = at(element.y)
        let first = true
        for (const item of element.items) {
          if (item.when && !String(ctx.values?.[item.when] ?? ctx.brand.fields?.[item.when]?.placeholder ?? '').trim()) continue
          const value = valueOf(ctx, item)
          const lines = linesOf(ctx, item.join ? value.replace(/\s*\n\s*/g, ' ') : value, item).filter((line) => line.trim())
          if (!lines.length) continue
          if (!first) y += (item.gapBefore ?? 0) + item.leading
          lines.forEach((line, index) => {
            if (index > 0) y += item.leading
            setText(line, element.x, y, item.size, item.font ?? 'regular', item.role, element.anchor, item.caps)
          })
          first = false
        }
        if (element.id && !first) ends[element.id] = y
        break
      }
      case 'run': {
        // Measure every part first, so a centred run can be centred as a whole.
        const pieces = element.parts.map((part) => {
          const raw = valueOf(ctx, part).replace(/\s*\n\s*/g, ' ')
          const content = part.caps ? raw.toUpperCase() : raw
          return { ...part, content, width: content.trim() ? measure(ctx, content, part.font ?? 'regular', part.size) : 0 }
        }).filter((piece) => piece.content.trim())
        const space = (piece) => measure(ctx, ' ', piece.font ?? 'regular', piece.size) || piece.size * 0.28
        const total = pieces.reduce((sum, piece, index) => sum + piece.width + (index ? space(piece) : 0), 0)
        let x = element.anchor === 'middle' ? element.x - total / 2 : element.anchor === 'end' ? element.x - total : element.x
        pieces.forEach((piece, index) => {
          if (index) x += space(piece)
          setText(piece.content, x, element.y, piece.size, piece.font ?? 'regular', piece.role)
          x += piece.width
        })
        break
      }
      case 'rule': {
        if (element.when && !String(ctx.values?.[element.when] ?? brand.fields?.[element.when]?.placeholder ?? '').trim()) break
        const y1 = at(element.y1)
        const y2 = at(element.y2 ?? element.y1)
        // x2 'auto' runs the rule to the right edge of what has been drawn so far.
        const x2 = element.x2 === 'auto' ? box.x2 : element.x2
        grow(element.x1, y1 - element.width / 2, x2, y2 + element.width / 2)
        parts.push(`<path d="M${n(element.x1)} ${n(y1)}H${n(x2)}" stroke="${paint(element.role ?? 'type')}" stroke-width="${n(element.width)}"/>`)
        break
      }
      default:
        throw new Error(`Unknown signature element: ${element.type}`)
    }
  }
  if (!Number.isFinite(box.x1)) Object.assign(box, { x1: 0, y1: 0, x2: 1, y2: 1 })
  return { parts, box }
}

/**
 * A signature on its own canvas: `{ width, height, art }`, drawn from the canvas's top left with
 * `padding` clear space round the artwork, so lockup() and logo placement treat it as they treat
 * a fixed lockup.
 */
export const signatureLockup = (ctx, { signature: id, colourway, colour, padding } = {}) => {
  const { brand } = ctx
  assertLogoPaint(brand, { colour, colourway: colour ? undefined : colourway })
  const signature = signatureOf(brand, id)
  if (!signature) throw new Error(`${brand.name} has no signatures`)
  const paint = paintFor(brand, colour ?? colourway ?? brand.defaultColourway ?? Object.keys(brand.colourways ?? {})[0])
  const { parts, box } = layoutSignature(ctx, signature, paint)
  const pad = padding ?? signature.padding ?? brand.lockup?.canvasPadding ?? 0
  const art = `<g transform="translate(${n(pad - box.x1)} ${n(pad - box.y1)})">${parts.join('')}</g>`
  // `origin` is where the signature's own (0, 0) landed, so a template can place it by the
  // metrics the manual uses: its baseline, its cap height, the left edge of its logotype.
  return { width: box.x2 - box.x1 + 2 * pad, height: box.y2 - box.y1 + 2 * pad, art, origin: { x: pad - box.x1, y: pad - box.y1 }, metrics: signature.metrics }
}

/** Which colourways a brand draws its signatures in, in order. */
export const colourwaysOf = (brand) => Object.entries(brand.colourways ?? {}).map(([id, spec]) => ({ id, ...spec }))

/**
 * How a departmental signature sets `values`: each wrapped field's lines, and those wider than
 * the wrap (a single word too long to break), so an editor can warn rather than let them overhang.
 */
export const departmentLines = (ctx, signature, values) => signature.elements
  .filter((element) => element.type === 'stack')
  .flatMap((element) => element.items.filter((item) => item.field && item.wrap).map((item) => {
    const lines = linesOf(ctx, String(values?.[item.field] ?? ''), item).filter((line) => line.trim())
    return { field: item.field, lines, overflowing: lines.filter((line) => measure(ctx, line, item.font, item.size) > item.wrap) }
  }))
