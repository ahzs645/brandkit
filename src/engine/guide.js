// The brand guide: pages composed from the same primitives as everything else, with their text
// set as outlines so a page looks the same wherever it is opened.
//
// A guide is `brand.guide`: page size, a frame (header logo, running head, footer, folio) and a
// list of pages, each a title, a subtitle and elements. `brand.guide.sheets` are further
// stand-alone pages without the frame: logo reference sheets, a one-page overview.
//
// Element types, in addition to rect / path:
//   label       { text, x, y, colour?, size? }           small caps line in the label face
//   text        { text, x, y, size, font?, colour?, tracking?, anchor? }
//   para        { text, x, y, width, size, colour?, line?, font? }   wrapped to `width`
//   rule        { y, x1?, x2? }
//   logo        { x, y, width, height?, align?, family?, layout?, colour? }   scaled to `width`, or fitted in a box
//   symbol      { x, y, height, colour?, micro? }
//   nested      { src, x, y, width, height }   another kit file, e.g. "templates/social-post"
//   symbolConstruction, specTable, swatches, swatchStrip, list   composite blocks (see below)

import { icon, lockup, mark, pattern, svgDocument } from './artwork.js'
import { colour as resolveColour, colourName, face as faceOf, fill, isDark, luminance, rgb } from './brand.js'
import { escape, n } from './format.js'
import { renderTemplate, scopeIds } from './templates.js'

const ROLE = { ink: 'ink', paper: 'paper', muted: 'muted', primary: 'primary', light: 'light', reverse: 'reverse', line: 'line' }

/** Glyph-free fallback width, for wrapping when a face is not loaded. */
const approximateWidth = (text, size, tracking = 0) => Array.from(text).length * size * (0.55 + tracking)

export const createGuideKit = (ctx) => {
  const { brand, fonts } = ctx
  const c = (value) => resolveColour(brand, value)
  const width = (text, kind, size, tracking = 0) => (fonts?.has(kind) ? fonts.width(text, kind, size, tracking) : approximateWidth(text, size, tracking))

  const text = (s, x, y, size = 22, kind = 'body', colourValue = ROLE.ink, tracking = 0, anchor = 'start') => {
    const content = fill(brand, s)
    if (fonts?.has(kind)) {
      const d = fonts.path(content, kind, size, x, y, tracking, anchor)
      return `<path fill="${c(colourValue)}" aria-label="${escape(content)}" d="${d}"/>`
    }
    const face = faceOf(brand, kind)
    return `<text x="${n(x)}" y="${n(y)}" font-family="${escape(face.stack ?? 'sans-serif')}" font-size="${n(size)}" font-weight="${face.weight ?? 400}" letter-spacing="${n(tracking * size)}"${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''} fill="${c(colourValue)}">${escape(content)}</text>`
  }

  const label = (s, x, y, colourValue = ROLE.muted, size = 12) => text(fill(brand, s).toUpperCase(), x, y, size, 'label', colourValue, 0.12)

  const para = (s, x, y, maxWidth, size = 22, colourValue = ROLE.muted, line = 1.4, kind = 'body') => {
    const lines = []
    for (const block of fill(brand, s).split('\n')) {
      let current = ''
      for (const word of block.split(/\s+/).filter(Boolean)) {
        const trial = (current ? `${current} ${word}` : word).trim()
        if (current && width(trial, kind, size) > maxWidth) {
          lines.push(current)
          current = word
        } else current = trial
      }
      lines.push(current)
    }
    return lines.map((entry, index) => text(entry, x, y + index * size * line, size, kind, colourValue)).join('')
  }

  const rect = (x, y, w, h, fillValue, strokeValue, dash) => {
    const st = strokeValue ? ` stroke="${c(strokeValue)}"${dash ? ` stroke-dasharray="${dash}"` : ' stroke-width="1"'}` : ''
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c(fillValue)}"${st}/>`
  }

  const rule = (y, x1 = 64, x2) => `<path d="M${x1} ${y}H${x2}" stroke="${c(ROLE.line)}" stroke-width="1"/>`

  // Scaled to `w` wide; or, given a `height` too, fitted inside that box (centred vertically, and
  // horizontally unless `align` is 'start'), so a lockup of any proportions stays in its panel.
  const logo = (x, y, w, { family, layout = 'horizontal', colour: colourValue = ROLE.ink, height, align = 'center' } = {}) => {
    const art = lockup(ctx, { family, layout, colour: c(colourValue) })
    if (height == null) return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(w / art.width)})">${art.art}</g>`
    const scale = Math.min(w / art.width, height / art.height)
    const left = align === 'start' ? x : x + (w - art.width * scale) / 2
    return `<g transform="translate(${n(left)} ${n(y + (height - art.height * scale) / 2)}) scale(${n(scale)})">${art.art}</g>`
  }

  const symbol = (x, y, height, colourValue = ROLE.ink, micro = false) => `<g transform="translate(${n(x)} ${n(y)}) scale(${n(height / brand.symbol.viewBox[3])})">${mark(ctx, c(colourValue), micro)}</g>`

  /** Renders another file of the kit, for nesting. Templates have their text outlined. */
  const source = (src) => {
    const [kind, id] = src.split('/')
    if (kind === 'patterns') return pattern(ctx, brand.patterns.find((entry) => entry.id === id))
    if (kind === 'icons') return icon(ctx, brand.icons.items.find((entry) => entry.id === id))
    if (kind === 'templates') return renderTemplate({ ...ctx, outline: true }, brand.templates.find((entry) => entry.id === id)).svg
    throw new Error(`Cannot nest ${src}`)
  }

  let nestCount = 0
  const nested = (src, x, y, w, h) => {
    const prefix = `n${nestCount += 1}-${src.replace(/[^a-z0-9]+/gi, '-')}`
    let svg = source(src).replace(/^<\?xml[^>]*>\s*/, '')
    svg = scopeIds(svg, prefix)
    svg = svg.replace(/^<svg\b([^>]*)>/, (match, attributes) => {
      const kept = attributes.replace(/\s(width|height|x|y|role|aria-label|aria-labelledby)="[^"]*"/g, '')
      return `<svg x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${kept}>`
    })
    // Edge-cropped artwork needs an explicit clip once nested: renderers differ on whether an
    // inner <svg> clips its overflow.
    const clip = `clip-${prefix}`
    return `<defs><clipPath id="${clip}" clipPathUnits="userSpaceOnUse"><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"/></clipPath></defs><g clip-path="url(#${clip})">${svg}</g>`
  }

  const blocks = {
    symbolConstruction: (e) => {
      const [, , vw, vh] = brand.symbol.viewBox
      const scale = e.size / vh
      const sx = e.x + (e.width - vw * scale) / 2
      const sy = e.top
      let art = rect(e.x, e.y, e.width, e.height, ROLE.reverse, ROLE.line)
      const centres = brand.symbol.centres ?? [[vw / 4, vh / 4], [vw / 2, vh / 2], [vw * 3 / 4, vh * 3 / 4]]
      for (const cx of [...new Set(centres.map(([x]) => x))].sort((a, b) => a - b)) {
        art += `<path d="M${n(sx + cx * scale)} ${e.lines.top}V${e.lines.bottom}" stroke="${c(ROLE.line)}" stroke-dasharray="4 5"/>`
      }
      for (const cy of [...new Set(centres.map(([, y]) => y))].sort((a, b) => a - b)) {
        art += `<path d="M${e.lines.left} ${n(sy + cy * scale)}H${e.lines.right}" stroke="${c(ROLE.line)}" stroke-dasharray="4 5"/>`
      }
      return art + symbol(sx, sy, e.size)
    },
    specTable: (e) => e.rows.map(([key, value], index) => {
      const y = e.y + index * e.step
      return text(key, e.x, y, 20, 'body', ROLE.muted) + text(value, e.right, y, 20, 'bold', ROLE.ink, 0, 'end')
        + `<path d="M${e.x} ${y + 17}H${e.right}" stroke="${c(ROLE.line)}"/>`
    }).join(''),
    swatches: (e) => e.colours.map((key, index) => {
      const x = e.x + index * e.step
      const hex = c(key)
      const s = e.width / 246
      return rect(x, e.y, e.width, e.height, hex, luminance(hex) > 0.85 ? ROLE.line : null)
        + symbol(x + 31 * s, e.y + 41 * s, 132 * s, isDark(hex) ? ROLE.reverse : ROLE.ink)
        + text(colourName(brand, key), x, e.y + 321, 27, 'display', ROLE.ink, -0.03)
        + text(hex, x, e.y + 358, 21, 'label')
        + text(`RGB ${(rgb(hex) ?? []).join(', ')}`, x, e.y + 391, 15, 'label', ROLE.muted)
    }).join(''),
    swatchStrip: (e) => e.colours.map((key, index) => rect(e.x + index * e.step, e.y, e.width, e.height, c(key), luminance(c(key)) > 0.85 ? ROLE.line : null)).join(''),
    list: (e) => e.rows.map(([name, detail], index) => {
      const y = e.y + index * e.step
      return text(name, e.x, y, 18, 'label') + text(detail, e.detailX, y, 21) + `<path d="M${e.x} ${y + 22}H${e.right}" stroke="${c(ROLE.line)}"/>`
    }).join('')
  }

  const element = (e, pageWidth) => {
    switch (e.type) {
      case 'label': return label(e.text, e.x, e.y, e.colour, e.size)
      case 'text': return text(e.text, e.x, e.y, e.size, e.font ?? 'body', e.colour ?? ROLE.ink, e.tracking ?? 0, e.anchor ?? 'start')
      case 'para': return para(e.text, e.x, e.y, e.width, e.size, e.colour ?? ROLE.muted, e.line ?? 1.4, e.font ?? 'body')
      case 'rect': return rect(e.x, e.y, e.width, e.height, e.fill, e.stroke, e.dash)
      case 'path': return `<path d="${e.d}"${e.fill ? ` fill="${c(e.fill)}"` : ' fill="none"'}${e.stroke ? ` stroke="${c(e.stroke)}"` : ''}${e.dash ? ` stroke-dasharray="${e.dash}"` : ''}/>`
      case 'rule': return rule(e.y, e.x1 ?? 64, e.x2 ?? pageWidth - 64)
      case 'logo': return logo(e.x, e.y, e.width, e)
      case 'symbol': return symbol(e.x, e.y, e.height, e.colour ?? ROLE.ink, e.micro)
      case 'nested': return nested(e.src, e.x, e.y, e.width, e.height)
      default:
        if (blocks[e.type]) return blocks[e.type](e)
        throw new Error(`Unknown guide element type: ${e.type}`)
    }
  }

  const frame = (number, total, page, pageWidth, pageHeight) => {
    const f = brand.guide.frame ?? {}
    const right = pageWidth - 64
    let art = rect(0, 0, pageWidth, pageHeight, f.background ?? ROLE.paper)
    if (f.logo) art += logo(f.logo.x, f.logo.y, f.logo.width)
    if (f.header) art += text(f.header, right, 49, 11, 'label', ROLE.muted, 0.08, 'end')
    art += rule(88, 64, right) + text(page.title, 64, 162, 52, 'display', ROLE.ink, -0.04)
    if (page.subtitle) art += para(page.subtitle, 66, 203, pageWidth - 140, 20)
    art += rule(pageHeight - 74, 64, right)
    if (f.footer) art += label(f.footer, 64, pageHeight - 39)
    art += text(`${String(number).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, right, pageHeight - 39, 12, 'label', ROLE.muted, 0.06, 'end')
    return art
  }

  return { text, label, para, rect, rule, logo, symbol, nested, element, frame }
}

/** The guide's pages, each with a lazy `render()` returning a standalone SVG. */
export const guidePages = (ctx) => {
  const guide = ctx.brand.guide
  if (!guide?.pages) return []
  const { width, height } = guide
  return guide.pages.map((page, index) => ({
    id: `guide-${String(index + 1).padStart(2, '0')}`,
    number: index + 1,
    title: page.title,
    name: page.name ?? page.title,
    width,
    height,
    render: () => {
      const kit = createGuideKit(ctx)
      const art = kit.frame(index + 1, guide.pages.length, page, width, height) + page.elements.map((e) => kit.element(e, width)).join('')
      return svgDocument(ctx, width, height, art, fill(ctx.brand, guide.pageTitle ?? '{name} brand guide / {page}', { page: index + 1 }))
    }
  }))
}

/** Unframed pages: logo sheets, an overview. */
export const guideSheets = (ctx) => (ctx.brand.guide?.sheets ?? []).map((sheet) => ({
  id: sheet.id,
  group: sheet.group,
  title: fill(ctx.brand, sheet.title ?? sheet.id),
  width: sheet.width,
  height: sheet.height,
  render: () => {
    const kit = createGuideKit(ctx)
    return svgDocument(ctx, sheet.width, sheet.height, sheet.elements.map((e) => kit.element(e, sheet.width)).join(''), fill(ctx.brand, sheet.title ?? sheet.id))
  }
}))
