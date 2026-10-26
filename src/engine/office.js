// Office documents from templates: what a Word document, a PowerPoint layout or an HTML email
// signature made from a template should hold. Pure data; src/export/office.js writes the files.
//
// A template draws everything at once. An Office file needs to know what the user types and what
// stays put:
//
// - Text with a field (and, between a document's header and footer, the labels beside those
//   fields) becomes real, editable text, in the brand's faces, sizes and colours. Lines that share
//   a baseline become one paragraph with tab stops; horizontal rules among them become borders.
// - Everything else (the logo, rules at the head and foot, the motif, labels in the margins) is
//   drawn once as the page's background, behind the text.
//
// A document is laid out in three zones: a header (fields in the top sixth: a running head, a
// ministry's address block), a body (the letter, from the date down), and a footer (below the
// lowest rule in the last quarter, or the last tenth of the page). Header and footer text is set
// in frames at its exact place on the page; body text flows, so a letter can run on.
//
//   brand.documents: [
//     { id, label, format: 'docx', pages: [firstTemplate, laterPagesTemplate?], continue?: true },
//     { id, label, format: 'pptx', layouts: [templateId, …] },
//     { id, label, format: 'html', template }
//   ]
//
// `continue` puts the later pages' own body after the first's (a report's cover, then a page of
// text); without it the later pages only lend their header and footer (a letter's second sheet).

import { colour as resolveColour, face as faceOf } from './brand.js'
import { textValue, toUnits, wrapLines } from './templates.js'

const FIELD = /\{([\w-]+)\}/g

/** Points per template unit. */
const pointsPer = (template) => ((template.unit ?? 'px') === 'mm' ? 72 / 25.4 : 0.75)

const hex = (value) => String(value).replace(/^#/, '').toUpperCase().slice(0, 6)

const WEIGHT_NAMES = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 500: 'Medium', 600: 'SemiBold', 800: 'ExtraBold', 900: 'Black' }
const NAMED_WEIGHT = /(?:^|[\s-])(?:thin|extra[ -]?light|ultra[ -]?light|light|medium|semi[ -]?bold|demi[ -]?bold|extra[ -]?bold|ultra[ -]?bold|bold|black|heavy)(?:[\s-]|$)/i

/**
 * Word has only regular/bold slots for a family. A distinct name for intermediate
 * weights keeps, for example, Sora Light, Regular, SemiBold and Bold from sharing
 * and overwriting two embedded font files. Explicit Office substitutions remain
 * authoritative. Resolve an element's weight override to its actual brand face.
 */
export const officeFont = (brand, key = 'body', overrides = {}) => {
  const original = faceOf(brand, key) ?? {}
  const weight = Number(overrides.weight ?? original.weight ?? 400)
  const italic = overrides.italic ?? original.style === 'italic'
  const candidate = Object.entries(brand.fonts ?? {}).find(([, face]) =>
    face.family === original.family && (face.office ?? null) === (original.office ?? null) &&
    Number(face.weight ?? 400) === weight && (face.style === 'italic') === italic)
  const resolvedKey = candidate?.[0] ?? key
  const face = candidate?.[1] ?? original
  const family = face.office ?? face.family ?? 'Arial'
  const explicitName = NAMED_WEIGHT.test(family)
  const namedWeight = !face.office && !explicitName && ![400, 700].includes(weight)
  const name = namedWeight ? `${family} ${WEIGHT_NAMES[weight] ?? `Weight ${weight}`}` : family
  return { name, family, key: resolvedKey, weight, bold: !namedWeight && !explicitName && weight >= 600, italic }
}

/**
 * Every piece of text a template sets, and its horizontal rules, measured in points:
 * `{ element, kind: 'field' | 'static' | 'rule', id, x, y (baseline), size, leading, lines, runs,
 *    width, anchor, colour, font, bold, italic, tracking, caps }`.
 */
export const textItems = (ctx, template) => {
  const { brand } = ctx
  const unit = template.unit ?? 'px'
  const k = pointsPer(template)
  const u = (value) => toUnits(value, unit)
  const measure = (text, key, size, tracking = 0) => ctx.fonts?.width?.(text, key, size, tracking) || Array.from(text).length * size * 0.55
  const items = []

  const runsOf = (element, value) => {
    if (!element.compose) return [{ text: value }]
    // A composed line keeps its page number as a page-number field.
    const runs = []
    let last = 0
    for (const match of element.compose.matchAll(FIELD)) {
      const before = element.compose.slice(last, match.index)
      if (before) runs.push({ text: before })
      runs.push(match[1] === 'page-number' ? { page: true } : { text: ctx.values?.[match[1]] ?? brand.fields?.[match[1]]?.placeholder ?? `[${match[1]}]` })
      last = match.index + match[0].length
    }
    if (last < element.compose.length) runs.push({ text: element.compose.slice(last) })
    return runs
  }

  const add = (index, element, { x, y, size, value, lines, leading, width, field }) => {
    const font = officeFont(brand, element.font ?? 'body', { weight: element.weight })
    const key = font.key
    const text = lines ?? String(value ?? '').split('\n')
    items.push({
      element: index,
      kind: field ? 'field' : 'static',
      id: element.id,
      x: x * k, y: y * k, size: size * k, leading: (leading ?? size * 1.2) * k,
      lines: text,
      value: String(value ?? ''),
      runs: runsOf(element, String(value ?? '')),
      width: width == null ? null : width * k,
      measured: Math.max(...text.map((line) => measure(line, key, size, u(element.tracking ?? 0) / size))) * k,
      anchor: element.anchor ?? 'start',
      colour: hex(resolveColour(brand, element.colour ?? 'ink')),
      font: font.name, key,
      bold: font.bold, italic: font.italic, weight: font.weight,
      tracking: u(element.tracking ?? 0) * k,
      caps: Boolean(element.caps)
    })
  }

  template.elements.forEach((element, index) => {
    switch (element.type) {
      case 'text': {
        const value = element.literal ?? textValue(ctx, element)
        if (!value.trim()) break
        add(index, element, { x: u(element.x), y: u(element.y), size: u(element.size), value, field: Boolean((element.id || element.compose) && !element.locked) })
        break
      }
      case 'lines': {
        const leading = u(element.leading ?? element.size)
        const visible = element.lines.filter((line) => element.collapse === false || textValue(ctx, { ...element, ...line }).trim())
        const top = element.align === 'bottom' ? u(element.y) - (visible.length - 1) * leading : u(element.y)
        visible.forEach((line, row) => {
          const merged = { ...element, ...line, type: 'text' }
          add(index, merged, { x: u(line.x ?? element.x), y: top + row * leading, size: u(line.size ?? element.size), value: textValue(ctx, merged), leading, field: Boolean(line.id && !line.locked) })
        })
        break
      }
      case 'paragraph': {
        const size = u(element.size)
        const value = textValue(ctx, element)
        const lines = wrapLines(element.caps ? value.toUpperCase() : value, u(element.width), (line) => measure(line, element.font ?? 'body', size)).slice(0, element.maxLines ?? Infinity)
        add(index, element, { x: u(element.x), y: u(element.y), size, value, lines, leading: u(element.leading ?? size * 1.2), width: u(element.width), field: Boolean(element.id && !element.locked) })
        break
      }
      case 'flow': {
        let baseline = null
        for (const item of element.items) {
          const merged = { ...element, ...item, type: 'text' }
          const size = u(item.size)
          const value = textValue(ctx, merged)
          const lines = wrapLines(item.caps ? value.toUpperCase() : value, item.wrap ? u(item.wrap) : Infinity, (line) => measure(line, merged.font ?? 'body', size)).slice(0, item.maxLines ?? Infinity).filter((line) => line.trim())
          if (!lines.length) continue
          baseline = baseline == null ? u(element.y) : baseline + u(item.gap ?? item.leading ?? item.size)
          const leading = u(item.leading ?? item.size)
          add(index, merged, { x: u(item.x ?? element.x), y: baseline, size, value, lines, leading, width: item.wrap ? u(item.wrap) : null, field: Boolean(item.id && !item.locked) })
          baseline += (lines.length - 1) * leading
        }
        break
      }
      case 'path': {
        const match = /^M\s*([\d.-]+)[\s,]+([\d.-]+)\s*H\s*([\d.-]+)\s*$/.exec(element.d ?? '')
        if (match) items.push({ element: index, kind: 'rule', x: Math.min(+match[1], +match[3]) * k, x2: Math.max(+match[1], +match[3]) * k, y: +match[2] * k, weight: u(element.strokeWidth ?? 1) * k, colour: hex(resolveColour(brand, element.stroke ?? 'ink')) })
        break
      }
      case 'line':
        if (Math.abs(u(element.y1) - u(element.y2)) < 0.01) items.push({ element: index, kind: 'rule', x: Math.min(u(element.x1), u(element.x2)) * k, x2: Math.max(u(element.x1), u(element.x2)) * k, y: u(element.y1) * k, weight: u(element.strokeWidth ?? 1) * k, colour: hex(resolveColour(brand, element.stroke ?? 'ink')) })
        break
      default:
        break
    }
  })
  return items
}

/**
 * The page's zones, in points: header above `top`, footer below `bottom`. The header ends at the
 * lowest rule in the top quarter, or the foot of a masthead band across the top; failing both, a
 * sixth of the way down. The footer starts at the lowest rule in the last quarter, or nine tenths.
 */
const zonesOf = (items, height, bands = []) => {
  const headRule = items.filter((item) => item.kind === 'rule' && item.y < height / 4).sort((a, b) => b.y - a.y)[0]
  const footerRule = items.filter((item) => item.kind === 'rule' && item.y > height * 0.75).sort((a, b) => b.y - a.y)[0]
  const top = Math.max(headRule ? headRule.y + 1 : 0, ...bands)
  return { top: top || height / 6, bottom: footerRule ? footerRule.y + 1 : height * 0.9 }
}

const zoneOf = (item, zones) => (item.y < zones.top ? 'header' : item.y > zones.bottom ? 'footer' : 'body')

/**
 * The document model of one page template: its size, background elements, and its text split into
 * header, body and footer, all in points.
 */
export const documentPage = (ctx, template) => {
  const k = pointsPer(template)
  const width = template.width * k
  const height = template.height * k
  const items = textItems(ctx, template)
  const unit = template.unit ?? 'px'
  // A band of colour across the top of the page (a newsletter's masthead) ends the header too.
  const bands = template.elements.filter((element) => element.type === 'rect' && toUnits(element.y, unit) <= 0.5 && toUnits(element.width, unit) >= template.width * 0.9 && toUnits(element.height, unit) < template.height * 0.3)
    .map((element) => toUnits(element.height, unit) * k)
  const zones = zonesOf(items, height, bands)
  // An element whose text includes a field is all text; text and rules with no field are text only
  // in the body, among the fields (a memo's To and From); elsewhere they are drawn.
  const fieldElements = new Set(items.filter((item) => item.kind === 'field').map((item) => item.element))
  const asText = (item) => fieldElements.has(item.element) || (zoneOf(item, zones) === 'body' && items.some((other) => other.kind === 'field' && zoneOf(other, zones) === 'body'))
  const text = items.filter(asText)
  const taken = new Set(text.map((item) => item.element))
  return {
    template,
    width, height, k,
    background: template.elements.filter((element, index) => !taken.has(index)),
    header: text.filter((item) => zoneOf(item, zones) === 'header'),
    body: text.filter((item) => zoneOf(item, zones) === 'body').sort((a, b) => a.y - b.y || a.x - b.x),
    footer: text.filter((item) => zoneOf(item, zones) === 'footer'),
    // Where body text can go when the page has none of its own (a letterhead): below the lowest
    // thing drawn in the top quarter.
    bodyTop: Math.max(zones.top * 0.6, ...items.filter((item) => item.y < height / 4).map((item) => item.y + (item.kind === 'rule' ? 0 : item.size * 0.3))) + 24,
    zones
  }
}

/** Groups body items into rows: one per baseline, a paragraph each. */
export const rowsOf = (items) => {
  const rows = []
  for (const item of items) {
    const row = rows.at(-1)
    // Baselines a few points apart (a total set larger than its label) still make one line.
    const near = row && Math.abs(row[0].y - item.y) < Math.max(1.5, 0.35 * Math.max(row[0].size ?? 0, item.size ?? 0))
    if (row && near && item.kind !== 'rule' && row[0].kind !== 'rule' && row.every((other) => other.lines.length === 1) && item.lines.length === 1) row.push(item)
    else rows.push([item])
  }
  return rows.map((row) => row.sort((a, b) => a.x - b.x))
}

/** A slide layout: background elements and one placeholder per field. */
export const slideLayout = (ctx, template) => {
  const k = pointsPer(template)
  const items = textItems(ctx, template).filter((item) => item.kind === 'field')
  const taken = new Set(items.map((item) => item.element))
  // Fields from one `lines` element share a placeholder, as do lines set one under another in one
  // style (a headline's two lines, each its own field).
  const placeholders = []
  for (const item of items) {
    const element = template.elements[item.element]
    const previous = placeholders.at(-1)
    const stacked = previous && Math.abs(previous.x - item.x) < 1 && previous.key === item.key && Math.abs(previous.size - item.size) < 0.5 && previous.colour === item.colour
      && item.y > previous.y && item.y - (previous.y + (previous.lines.length - 1) * previous.leading) <= item.size * 1.4
    if ((element.type === 'lines' && previous?.element === item.element) || stacked) {
      if (stacked && previous.lines.length === 1) previous.leading = item.y - previous.y
      previous.lines.push(...item.lines)
      previous.parts.push(item)
      continue
    }
    placeholders.push({ ...item, lines: [...item.lines], parts: [item] })
  }
  // The title is the largest text that is words, not a number (a section slide's big "01" is not its title).
  const worded = placeholders.filter((item) => !/^\[?\d+\]?$/.test(item.lines.join('').trim()))
  const title = (worded.length ? worded : placeholders).reduce((best, item) => (!best || item.size > best.size ? item : best), null)
  return {
    template,
    width: template.width * k, height: template.height * k, k,
    background: template.elements.filter((element, index) => !taken.has(index)),
    placeholders: placeholders.map((item) => ({ ...item, role: item === title ? 'title' : 'body' }))
  }
}

/** An email signature: the drawing left of the text as an image, then the text, line by line. */
export const signatureLayout = (ctx, template) => {
  const k = pointsPer(template)
  const items = textItems(ctx, template).filter((item) => item.kind !== 'rule').sort((a, b) => a.y - b.y || a.x - b.x)
  const left = Math.min(...items.map((item) => item.x)) / k
  const rule = template.elements.find((element) => element.type === 'line' && Math.abs(element.x1 - element.x2) < 0.01)
  const taken = new Set(items.map((item) => item.element))
  return {
    template, k,
    // The image: everything that is not text, cropped to the left of the text (and its divider).
    image: { width: rule ? rule.x1 - 8 : left - 16, height: template.height, elements: template.elements.filter((element, index) => !taken.has(index) && element !== rule && element.type !== 'background') },
    divider: rule ? { colour: hex(resolveColour(ctx.brand, rule.stroke ?? 'line')), gap: left - rule.x1 } : null,
    rows: rowsOf(items)
  }
}
