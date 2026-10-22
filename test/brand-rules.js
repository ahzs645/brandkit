// Brand rules the v2.3 tests share: the allowed colours, and the clear box a complete mark keeps.
// Not a test file itself (the runner takes test/*.test.js).

import { textValue, toUnits, wrapLines } from '../src/engine/templates.js'

// --- Colours: the six palette colours, the two role literals, none, and currentColor where allowed.

export const PALETTE = ['#000000', '#F7F6F3', '#4B4F56', '#0B2B4A', '#C8D7E8', '#FFFFFF']
export const ROLES = ['#D9DCDF', '#CFD2D4']
const ALLOWED = new Set([...PALETTE, ...ROLES].map((hex) => hex.toLowerCase()))
const RGB = new Set(PALETTE.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',')))
// Every CSS named colour (CSS Color Module Level 4), so none can slip past.
const NAMED = new Set(`aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen`.split(' '))

/**
 * Every colour problem in SVG, HTML or CSS text: off-palette or 8-digit hex, rgb/rgba with
 * off-palette channels, colour keywords, and currentColor where it is not allowed. Embedded data
 * URIs are skipped.
 */
export const colourProblems = (source, { currentColor = true } = {}) => {
  const text = String(source).replace(/base64,[A-Za-z0-9+/=]{100,}/g, 'base64,')
  const problems = []
  for (const [match, hex] of text.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
    if (hex.length === 8 || hex.length === 4) { problems.push(`alpha hex ${match}`); continue }
    if (hex.length !== 3 && hex.length !== 6) continue
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
    if (!ALLOWED.has(`#${full}`.toLowerCase())) problems.push(`off-palette ${match}`)
  }
  for (const [match] of text.matchAll(/hsla?\([^)]*\)/g)) problems.push(`hsl colour ${match}`)
  for (const [match, channels] of text.matchAll(/rgba?\(\s*([\d.\s,]+?)\s*(?:,\s*[\d.]+\s*)?\)/g)) {
    const rgb = channels.split(/[\s,]+/).slice(0, 3).map(Number).join(',')
    if (!RGB.has(rgb)) problems.push(`off-palette ${match}`)
  }
  const colourValues = [
    ...[...text.matchAll(/\b(?:fill|stroke|stop-color|color)="([^"]*)"/g)].map((m) => m[1]),
    ...[...text.matchAll(/(?:^|[;{\s])(?:fill|stroke|stop-color|color|background|background-color|border-color|outline-color)\s*:\s*([^;}"]+)/g)].map((m) => m[1])
  ]
  for (const value of colourValues) {
    for (const word of value.split(/[\s,()]+/)) {
      if (NAMED.has(word.toLowerCase())) problems.push(`named colour ${word}`)
      if (!currentColor && /^currentcolor$/i.test(word)) problems.push('currentColor')
    }
  }
  return problems
}

// --- Clear zones. Boxes are { l, t, r, b } in the drawing's units.

const R = 40
const BOX = 256
const LOCKUP_WIDTH = 799.14231709
const LOCKUP_HEIGHT = 152
const PADDING = 16
const VISIBLE_WIDTH = LOCKUP_WIDTH - 2 * PADDING
const VISIBLE_HEIGHT = LOCKUP_HEIGHT - 2 * PADDING
const LOGO_DOT = 37.5

/** A mark's artwork box and dot diameter, by how it was placed. */
export const markBox = {
  // Templates: placeLogo scales `width` to the visible artwork.
  templateLogo: ({ x, y, width }) => ({ box: { l: x, t: y, r: x + width, b: y + width * VISIBLE_HEIGHT / VISIBLE_WIDTH }, dot: LOGO_DOT * width / VISIBLE_WIDTH }),
  // Guide pages: the padded lockup is scaled to `width`.
  guideLogo: ({ x, y, width }) => {
    const s = width / LOCKUP_WIDTH
    return { box: { l: x + PADDING * s, t: y + PADDING * s, r: x + (LOCKUP_WIDTH - PADDING) * s, b: y + (LOCKUP_HEIGHT - PADDING) * s }, dot: LOGO_DOT * s }
  },
  // A symbol at a height, or a pattern's placed symbol at a scale.
  symbol: ({ x, y, height, scale }) => {
    const s = scale ?? height / BOX
    return { box: { l: x, t: y, r: x + BOX * s, b: y + BOX * s }, dot: 2 * R * s }
  }
}

export const grow = ({ box, dot }) => ({ l: box.l - dot, t: box.t - dot, r: box.r + dot, b: box.b + dot })
const overlaps = (a, c) => a.l < c.r && a.r > c.l && a.t < c.b && a.b > c.t
const inside = ([x, y], c) => x > c.l && x < c.r && y > c.t && y < c.b

/** Points along a polyline, at most `step` apart. */
const sample = (points, step = 1) => points.flatMap(([x1, y1], i) => {
  if (i === points.length - 1) return [[x1, y1]]
  const [x2, y2] = points[i + 1]
  const count = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / step))
  return Array.from({ length: count }, (_, k) => [x1 + (x2 - x1) * k / count, y1 + (y2 - y1) * k / count])
})

/** The polyline of a path made of M, L, H and V commands (rules and dashed guides). */
const pathPoints = (d) => {
  const points = []
  let [x, y] = [0, 0]
  for (const [, command, args] of d.matchAll(/([MLHV])([^MLHVZaz]*)/g)) {
    const values = args.trim().split(/[\s,]+/).filter(Boolean).map(Number)
    if (command === 'H') x = values[0]
    else if (command === 'V') y = values[0]
    else [x, y] = values
    points.push([x, y])
  }
  return points
}

/** Circles in a path written as dots (`M x y a r r 0 1 0 2r 0 …`). */
export const pathCircles = (d) => [...d.matchAll(/M(-?[\d.]+) (-?[\d.]+)a([\d.]+) /g)].map(([, x, y, r]) => [Number(x) + Number(r), Number(y), Number(r)])

/** A line of text's box: measured with the brand's fonts, from ascender to descender. */
export const textBox = (fonts, { text, x, y, size, font = 'body', tracking = 0, anchor = 'start' }) => {
  const face = fonts.faces[font]?.font
  if (!face) throw new Error(`No face for ${font}`)
  const width = fonts.width(text, font, size, tracking / size)
  const bounds = fonts.bounds(text, font, size, tracking / size)
  const left = anchor === 'end' ? x - width : anchor === 'middle' ? x - width / 2 : x
  const ascent = face.ascender * size / face.unitsPerEm
  const descent = -face.descender * size / face.unitsPerEm
  return { l: left + Math.min(0, bounds?.x1 ?? 0), t: y - ascent, r: left + Math.max(width, bounds?.x2 ?? 0), b: y + descent }
}

/**
 * What intrudes on a mark's clear box among a template's elements: dots, polylines, paths, rects
 * and text (measured). Backgrounds, motifs and the mark itself are exempt.
 */
export const templateIntrusions = (ctx, template, mark, clear) => {
  const unit = template.unit ?? 'px'
  const u = (value) => toUnits(value, unit)
  const found = []
  for (const element of template.elements) {
    if (element === mark || element.type === 'background' || element.type === 'motif' || element.type === 'printGuides') continue
    const hit = (what) => found.push(`${element.type}${element.id ? ` ${element.id}` : ''}: ${what}`)
    switch (element.type) {
      case 'dots':
        for (const [cx, cy, r] of element.dots) if (overlaps({ l: cx - r, t: cy - r, r: cx + r, b: cy + r }, clear)) { hit(`dot at ${cx},${cy}`); break }
        break
      case 'polyline':
        if (sample(element.points).some((point) => inside(point, clear))) hit('line')
        break
      case 'path':
        if (sample(pathPoints(element.d)).some((point) => inside(point, clear))) hit('path')
        break
      case 'rect':
        if (overlaps({ l: u(element.x), t: u(element.y), r: u(element.x) + u(element.width), b: u(element.y) + u(element.height) }, clear)) hit('rect')
        break
      case 'logo': {
        const other = markBox.templateLogo(element)
        if (overlaps(other.box, clear)) hit('logo')
        break
      }
      case 'symbol': {
        const other = markBox.symbol({ x: element.x, y: element.y, height: element.height })
        if (overlaps(other.box, clear)) hit('symbol')
        break
      }
      case 'text': {
        const box = textBox(ctx.fonts, { text: textValue(ctx, element), x: u(element.x), y: u(element.y), size: u(element.size), font: element.font ?? 'body', tracking: u(element.tracking ?? 0), anchor: element.anchor })
        if (overlaps(box, clear)) hit(`text "${textValue(ctx, element)}"`)
        break
      }
      case 'paragraph': {
        const size = u(element.size)
        const leading = u(element.leading ?? size * 1.2)
        const tracking = u(element.tracking ?? 0)
        const lines = wrapLines(textValue(ctx, element), u(element.width), (line) => ctx.fonts.width(line, element.font ?? 'body', size, tracking / size))
        lines.forEach((line, index) => {
          const box = textBox(ctx.fonts, { text: line, x: u(element.x), y: u(element.y) + index * leading, size, font: element.font ?? 'body', tracking })
          if (overlaps(box, clear)) hit(`paragraph line "${line}"`)
        })
        break
      }
      default:
        break
    }
  }
  return found
}

/** Every complete mark in a template: its logos and symbols (motifs are crops, not marks). */
export const templateMarks = (template) => template.elements.filter((element) => element.type === 'logo' || element.type === 'symbol')
  .map((element) => ({ element, ...(element.type === 'logo' ? markBox.templateLogo(element) : markBox.symbol({ x: element.x, y: element.y, height: element.height })) }))
