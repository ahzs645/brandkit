// Applications (business cards, letterhead, envelopes, social graphics, presentation covers),
// described as data and drawn here.
//
// A template is a canvas and a list of elements:
//
//   { id, title, width, height, unit?, physical?, elements: [...] }
//
// `unit` is what the coordinates mean: 'px' (the default) or 'mm'. Text sizes may be given in
// points ("10pt") and leading in either; both are converted to the template's unit, so a spec
// sheet's measurements can be typed in as printed.
//
// Element types:
//   background  { fill }
//   rect        { x, y, width, height, fill, stroke?, strokeWidth?, dash?, id? }
//   path        { d, stroke?, strokeWidth?, fill?, id? }
//   line        { x1, y1, x2, y2, stroke?, strokeWidth?, id? }
//   logo        { x, y, width, height?, colour?, family?, layout?, signature?, colourway?, id? }
//               placed by its visible artwork; a signature takes the template's field values.
//               A signature can instead be sized in `points` (its logotype's cap height matches
//               that size of type) and anchored with anchorX 'logotype' / anchorY 'baseline' | 'cap'
//   flow        { x, y, items: [{ id, text, size, font, leading, gap, wrap?, maxLines? }] }
//               fields stacked down the page: each item's first baseline is `gap` below the last
//               baseline of the one before (y is the first item's first baseline), so a longer
//               title pushes what follows it down
//   motif       { x, y, width, height, colour, align?, id? }          the symbol fitted in a box
//   symbol      { x, y, height, colour, id? }                         the symbol at a set height
//   text        { id, text, x, y, size, colour, font?, weight?, tracking?, style?, anchor? }
//               or { compose: 'Phone: {telephone}', … }: a line built from other fields; it is left
//               out when any field it names has been cleared
//   lines       { x, y, leading, size, colour, font?, align?, anchor?, lines: [{ id, text, font?, style?, size? }] }
//   paragraph   { id, text, x, y, width, size, leading?, maxLines?, colour, font?, caps? }
//               one field, wrapped to `width` (and at any line break typed into it)
//   printGuides { colour, trim: {...}, safe: {...} }                  hidden trim and safe areas
//
// Every text element with an `id` is a field: `values[id]` replaces its text. A brand may list its
// fields in `brand.fields` ({ id: { label, placeholder } }) to name them and give composed lines
// their defaults. Text is live by default, so the SVG stays editable; `outline: true` sets it as
// paths for raster and PDF output.

import { lockup, mark } from './artwork.js'
import { illustrationFields, placeIllustration } from './illustrations.js'
import { colour as resolveColour, face as faceOf, fill } from './brand.js'
import { escape, humanize, n6 } from './format.js'

const PT_TO_MM = 25.4 / 72
const PX_PER_PT = 96 / 72

/** A size or distance in the template's unit: numbers pass through, "10pt" / "4mm" convert. */
export const toUnits = (value, unit = 'px') => {
  if (typeof value === 'number') return value
  const match = /^\s*(-?[\d.]+)\s*(pt|mm|px)?\s*$/.exec(String(value))
  if (!match) return Number(value)
  const amount = Number(match[1])
  const from = match[2] ?? unit
  if (from === unit) return amount
  if (from === 'pt') return unit === 'mm' ? amount * PT_TO_MM : amount * PX_PER_PT
  if (from === 'mm') return unit === 'pt' ? amount / PT_TO_MM : amount * 96 / 25.4
  if (from === 'px') return unit === 'mm' ? amount * 25.4 / 96 : amount / PX_PER_PT
  return amount
}

/** Prefixes every id in a fragment, so repeated artwork stays valid in one document. */
export const scopeIds = (fragment, prefix) => {
  const ids = [...new Set([...fragment.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]))]
  let scoped = fragment
  for (const id of ids) {
    const next = `${prefix}-${id}`
    scoped = scoped.split(`id="${id}"`).join(`id="${next}"`)
      .split(`url(#${id})`).join(`url(#${next})`)
      .split(`href="#${id}"`).join(`href="#${next}"`)
  }
  return scoped
}

const FIELD_REFERENCE = /\{([\w-]+)\}/g

/** A field's default: the brand's placeholder for it, or what the template first wrote there. */
const fieldDefault = (ctx, id) => ctx.brand.fields?.[id]?.placeholder

/** What a text element says: the field's value, or its placeholder; a composed line with its fields filled. */
export const textValue = (ctx, element) => {
  if (element.compose) {
    const ids = [...element.compose.matchAll(FIELD_REFERENCE)].map((match) => match[1])
    // A composed line goes when a field it names has been deliberately cleared: "Phone: " alone
    // is worse than no line.
    if (ids.some((id) => ctx.values?.[id] === '')) return ''
    return element.compose.replace(FIELD_REFERENCE, (match, id) => ctx.values?.[id] ?? fieldDefault(ctx, id) ?? match)
  }
  const value = element.id != null ? ctx.values?.[element.id] : undefined
  return value != null ? String(value) : fill(ctx.brand, element.text ?? fieldDefault(ctx, element.id) ?? '')
}

/** Width of a line: measured by the font provider where it can, estimated where it cannot. */
const measure = (ctx, text, key, size, tracking = 0) => ctx.fonts?.width?.(text, key, size, tracking) || Array.from(text).length * size * (0.55 + tracking)

/** Breaks text at typed line breaks, then between words to fit `width`. */
export const wrapLines = (text, width, measureLine) => {
  const lines = []
  for (const block of String(text).split('\n')) {
    let current = ''
    for (const word of block.split(/\s+/).filter(Boolean)) {
      const trial = current ? `${current} ${word}` : word
      if (current && measureLine(trial) > width) {
        lines.push(current)
        current = word
      } else current = trial
    }
    lines.push(current)
  }
  return lines
}

/** One line of text: live <text>, or outlined when asked and the face is loaded. */
const textElement = (ctx, element, unit) => {
  const { brand, fonts } = ctx
  const key = element.font ?? 'body'
  const face = faceOf(brand, key)
  const size = toUnits(element.size, unit)
  const content = element.literal != null ? element.literal : textValue(ctx, element)
  const colourValue = resolveColour(brand, element.colour ?? 'ink')
  const tracking = toUnits(element.tracking ?? 0, unit)
  const transformed = element.caps ? content.toUpperCase() : content
  if (ctx.outline && fonts?.has(key)) {
    if (!transformed.trim()) return ''
    const d = fonts.path(transformed, key, size, toUnits(element.x, unit), toUnits(element.y, unit), tracking / size, element.anchor ?? 'start')
    return `<path${element.id ? ` id="${escape(element.id)}"` : ''} aria-label="${escape(transformed)}" fill="${colourValue}" d="${d}"/>`
  }
  const weight = element.weight ?? face.weight ?? 400
  const style = element.style ?? face.style
  return `<text${element.id ? ` id="${escape(element.id)}"` : ''} x="${n6(toUnits(element.x, unit))}" y="${n6(toUnits(element.y, unit))}" `
    + `font-family="${escape(face.stack ?? face.family ?? 'sans-serif')}" `
    + `font-size="${n6(size)}" font-weight="${weight}"${style && style !== 'normal' ? ` font-style="${style}"` : ''} `
    + `letter-spacing="${n6(tracking)}"${element.anchor && element.anchor !== 'start' ? ` text-anchor="${element.anchor}"` : ''} fill="${colourValue}">`
    + `${escape(transformed)}</text>`
}

/** The complete horizontal lockup, scaled so its visible artwork is `width` wide at (x, y). */
export const placeLogo = (ctx, { x, y, width, height, points, anchorX, anchorY, rotate, colour, family, layout = 'horizontal', signature, colourway, values, id = 'brand-logo', align = 'start' }) => {
  const { brand } = ctx
  // `values` override the template's fields for this signature alone (a cover's signature
  // without its ministry, say).
  const master = lockup(values ? { ...ctx, values: { ...ctx.values, ...values } } : ctx, { family, layout, signature, colourway, colour: colour == null ? undefined : resolveColour(brand, colour) })
  const padding = master.origin ? 0 : brand.lockup?.canvasPadding ?? 0
  const metrics = master.metrics
  // A signature named by point size, as manuals do ("a 36 point signature"): its logotype's
  // capitals are as tall as 36 point capitals in the brand's face. Otherwise scaled to `width`,
  // or fitted inside `width` × `height`.
  const scale = points != null && metrics?.capHeight
    ? points * (brand.fonts?.[metrics.font ?? 'body']?.capHeight ?? 0.7) / metrics.capHeight
    : height == null ? width / (master.width - 2 * padding) : Math.min(width / (master.width - 2 * padding), height / (master.height - 2 * padding))
  const offset = height == null || align === 'start' ? 0 : align === 'end' ? width - (master.width - 2 * padding) * scale : (width - (master.width - 2 * padding) * scale) / 2
  // Anchors: x at the left of the logotype rather than the symbol; y at the baseline or the cap
  // line rather than the top of the artwork.
  const dx = anchorX === 'logotype' && metrics ? -(master.origin.x + metrics.logotypeX) * scale : anchorX === 'end' ? -(master.width - padding) * scale : -padding * scale
  const dy = anchorY === 'baseline' && metrics ? -(master.origin.y + metrics.baseline) * scale
    : anchorY === 'cap' && metrics ? -(master.origin.y + metrics.baseline - metrics.capHeight) * scale : -padding * scale
  const label = fill(brand, brand.copy?.logoLabel ?? '{name} logo')
  const transform = rotate
    ? `translate(${n6(x)} ${n6(y)}) rotate(${rotate}) translate(${n6(offset + dx)} ${n6(dy)}) scale(${n6(scale)})`
    : `translate(${n6(x + offset + dx)} ${n6(y + dy)}) scale(${n6(scale)})`
  return `<g id="${escape(id)}" aria-label="${escape(label)}" transform="${transform}">${scopeIds(master.art, id)}</g>`
}

const placeMotif = (ctx, x, y, width, colour, id) => {
  const { brand } = ctx
  const scale = width / brand.symbol.viewBox[2]
  const label = fill(brand, brand.copy?.motifLabel ?? '{name} symbol')
  return `<g id="${escape(id)}" aria-label="${escape(label)}" transform="translate(${n6(x)} ${n6(y)}) scale(${n6(scale)})">${scopeIds(mark(ctx, colour), id)}</g>`
}

/** Fits the symbol inside a box, centred, or against its right edge. */
export const motifInBox = (ctx, { x, y, width, height, colour, id = 'brand-motif', align = 'center' }) => {
  const [, , symbolWidth, symbolHeight] = ctx.brand.symbol.viewBox
  const scale = Math.min(width / symbolWidth, height / symbolHeight)
  const visibleWidth = symbolWidth * scale
  const visibleHeight = symbolHeight * scale
  const offsetX = align === 'right' ? width - visibleWidth : align === 'left' ? 0 : (width - visibleWidth) / 2
  return placeMotif(ctx, x + offsetX, y + (height - visibleHeight) / 2, visibleWidth, resolveColour(ctx.brand, colour), id)
}

const stroke = (ctx, element, unit) => {
  if (!element.stroke) return ''
  const width = element.strokeWidth != null ? toUnits(element.strokeWidth, unit) : null
  return ` stroke="${resolveColour(ctx.brand, element.stroke)}"${width != null ? ` stroke-width="${n6(width)}"` : ''}${element.dash ? ` stroke-dasharray="${element.dash}"` : ''}`
}

const idAttr = (element) => (element.id ? ` id="${escape(element.id)}"` : '')

const renderElement = (ctx, element, template) => {
  const unit = template.unit ?? 'px'
  const u = (value) => toUnits(value, unit)
  const brand = ctx.brand
  switch (element.type) {
    case 'background':
      return `<rect id="background" width="${n6(template.width)}" height="${n6(template.height)}" fill="${resolveColour(brand, element.fill)}"/>`
    case 'rect':
      return `<rect${idAttr(element)} x="${n6(u(element.x))}" y="${n6(u(element.y))}" width="${n6(u(element.width))}" height="${n6(u(element.height))}" fill="${resolveColour(brand, element.fill ?? 'none')}"${stroke(ctx, element, unit)}/>`
    case 'path':
      return `<path${idAttr(element)} d="${element.d}"${element.fill ? ` fill="${resolveColour(brand, element.fill)}"` : ''}${stroke(ctx, element, unit)}/>`
    case 'line':
      return `<path${idAttr(element)} d="M${n6(u(element.x1))} ${n6(u(element.y1))}L${n6(u(element.x2))} ${n6(u(element.y2))}"${stroke(ctx, { stroke: 'ink', ...element }, unit)}/>`
    case 'logo':
      return placeLogo(ctx, { ...element, x: u(element.x), y: u(element.y), width: element.width == null ? undefined : u(element.width), height: element.height == null ? undefined : u(element.height), points: element.points == null ? undefined : u(`${element.points}pt`) })
    case 'motif':
      return motifInBox(ctx, { ...element, x: u(element.x), y: u(element.y), width: u(element.width), height: u(element.height) })
    case 'symbol': {
      const [, , symbolWidth, symbolHeight] = brand.symbol.viewBox
      const height = u(element.height ?? (element.width * symbolHeight / symbolWidth))
      return placeMotif(ctx, u(element.x), u(element.y), height * symbolWidth / symbolHeight, resolveColour(brand, element.colour ?? 'ink'), element.id ?? 'brand-symbol')
    }
    case 'text':
      return textElement(ctx, element, unit)
    case 'lines': {
      const leading = u(element.leading ?? element.size)
      // With align 'bottom', y is the last line's baseline and the block grows upward, as an
      // address block set from the foot of a card does.
      const visible = element.lines.filter((line) => element.collapse === false || textValue(ctx, { ...element, ...line }).trim())
      const top = element.align === 'bottom' ? u(element.y) - (visible.length - 1) * leading : u(element.y)
      let row = 0
      const out = []
      for (const line of element.lines) {
        const merged = { font: element.font, colour: element.colour, size: element.size, anchor: element.anchor, ...line, x: line.x ?? element.x, y: top + row * leading }
        const text = textValue(ctx, merged)
        if (!text.trim() && element.collapse !== false) continue
        out.push(textElement(ctx, merged, unit))
        row += 1
      }
      return out.filter(Boolean).join('\n')
    }
    case 'paragraph': {
      const size = u(element.size)
      const leading = u(element.leading ?? size * 1.2)
      const key = element.font ?? 'body'
      const tracking = u(element.tracking ?? 0) / size
      const value = textValue(ctx, element)
      const lines = wrapLines(element.caps ? value.toUpperCase() : value, u(element.width), (line) => measure(ctx, line, key, size, tracking))
        .slice(0, element.maxLines ?? Infinity)
      return lines.map((line, index) => (line.trim() ? textElement(ctx, { ...element, id: `${element.id}-${index + 1}`, literal: line, x: u(element.x), y: u(element.y) + index * leading, size, tracking: u(element.tracking ?? 0) }, unit) : ''))
        .filter(Boolean).join('\n')
    }
    case 'flow': {
      let baseline = null
      const out = []
      for (const item of element.items) {
        const size = u(item.size)
        const key = item.font ?? element.font ?? 'body'
        const value = textValue(ctx, item)
        const lines = wrapLines(item.caps ? value.toUpperCase() : value, item.wrap ? u(item.wrap) : Infinity, (line) => measure(ctx, line, key, size)).slice(0, item.maxLines ?? Infinity).filter((line) => line.trim())
        if (!lines.length) continue
        baseline = baseline == null ? u(element.y) : baseline + u(item.gap ?? item.leading ?? item.size)
        lines.forEach((line, index) => {
          if (index > 0) baseline += u(item.leading ?? item.size)
          out.push(textElement(ctx, { ...element, ...item, font: key, id: lines.length > 1 ? `${item.id}-${index + 1}` : item.id, literal: line, x: u(item.x ?? element.x), y: baseline, size, tracking: u(item.tracking ?? 0) }, unit))
        })
      }
      return out.filter(Boolean).join('\n')
    }
    case 'illustration':
      return placeIllustration(ctx, element, u)
    case 'printGuides': {
      const rectFor = (box, extra = '') => `<rect id="${escape(box.id)}" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}"${extra}/>`
      return `<g id="print-guides" display="${ctx.showGuides ? 'inline' : 'none'}" fill="none" stroke="${resolveColour(brand, element.colour ?? 'muted')}" stroke-width="1">`
        + `${rectFor(element.trim)}${element.safe ? rectFor(element.safe, ' stroke-dasharray="8 5"') : ''}</g>`
    }
    default:
      throw new Error(`Unknown template element type: ${element.type}`)
  }
}

/**
 * Draws a template. Returns the SVG and its size.
 *
 * @param {object} ctx  `{ brand, fonts?, values?, outline?, showGuides? }`
 * @param {object} template
 */
export const renderTemplate = (ctx, template) => {
  const { brand } = ctx
  const unit = template.unit ?? 'px'
  const physical = template.physical ?? (unit === 'mm' ? [`${n6(template.width)}mm`, `${n6(template.height)}mm`] : [n6(template.width), n6(template.height)])
  const title = fill(brand, template.title ?? `{name} / ${template.id}`)
  const desc = fill(brand, template.description ?? brand.copy?.templateDescription ?? '{name} application. Text is live and editable.')
  const body = template.elements.map((element) => renderElement(ctx, element, template)).filter((part) => part !== '')
  const svg = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<svg xmlns="http://www.w3.org/2000/svg" '
    + `width="${physical[0]}" height="${physical[1]}" `
    + `viewBox="0 0 ${n6(template.width)} ${n6(template.height)}" `
    + 'role="img" aria-labelledby="template-title template-description" '
    + `data-brand-version="${escape(brand.version ?? '')}" overflow="hidden">\n`
    + `<title id="template-title">${escape(title)}</title>\n`
    + `<desc id="template-description">${escape(desc)}</desc>\n`
    + body.join('\n')
    + '\n</svg>\n'
  return { svg, width: template.width, height: template.height, unit, physical }
}

/** The editable fields a template exposes, in the order they appear. Pass the brand for its labels. */
export const templateFields = (template, brand) => {
  const fields = []
  const seen = new Set()
  const add = (id, element, multiline) => {
    if (seen.has(id)) return
    seen.add(id)
    const declared = brand?.fields?.[id] ?? {}
    fields.push({ id, label: element?.label ?? declared.label ?? humanize(id), placeholder: element?.text ?? declared.placeholder ?? '', multiline: multiline || Boolean(declared.multiline), ...(element?.local ? { local: true } : {}) })
  }
  const visit = (element) => {
    if (element.locked) return
    if (element.type === 'text' && element.compose) for (const [, id] of element.compose.matchAll(FIELD_REFERENCE)) add(id, null, false)
    else if (element.type === 'text' && element.id) add(element.id, element, false)
    if (element.type === 'paragraph' && element.id) add(element.id, element, true)
    if (element.type === 'lines') element.lines.forEach((line) => visit({ type: 'text', ...line }))
    if (element.type === 'flow') element.items.forEach((item) => { if (item.id && !item.locked) add(item.id, item, true) })
    if (element.type === 'illustration') {
      // Fields the signatures in its zones take (a ministry), then its text zones (a unit number).
      for (const id of element.fields ?? []) add(id, null, false)
      for (const field of illustrationFields(element, brand)) add(field.id, field, false)
    }
  }
  template.elements.forEach(visit)
  return fields
}

/** Every template's fields merged, for a form that fills a whole stationery set at once. */
export const allFields = (templates, brand) => {
  const seen = new Map()
  for (const template of templates) {
    for (const field of templateFields(template, brand)) {
      if (!seen.has(field.id)) seen.set(field.id, { ...field, templates: [] })
      seen.get(field.id).templates.push(template.id)
    }
  }
  return [...seen.values()]
}

/** A template's size in millimetres, for PDF pages. Pixel templates use their `physical` size. */
export const physicalSize = (rendered) => {
  const parse = (value) => {
    const match = /^([\d.]+)(mm|in|pt|px)?$/.exec(String(value))
    if (!match) return null
    const amount = Number(match[1])
    switch (match[2]) {
      case 'mm': return { value: amount, unit: 'mm' }
      case 'in': return { value: amount * 25.4, unit: 'mm' }
      case 'pt': return { value: amount, unit: 'pt' }
      default: return { value: amount * 0.75, unit: 'pt' }
    }
  }
  const [w, h] = rendered.physical.map(parse)
  if (w?.unit === 'mm' && h?.unit === 'mm') return { width: w.value, height: h.value, unit: 'mm' }
  return { width: rendered.width * 0.75, height: rendered.height * 0.75, unit: 'pt' }
}
