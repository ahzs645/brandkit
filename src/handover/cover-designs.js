// Full-page cover designs. Each design is one artwork layer (grounds, panels, supporting
// graphic, the provider's logo and the client's logo on its plate) and a set of native text
// frames placed over it. Word and HTML both draw the artwork behind and set the frames as real
// text, so the wording stays editable and the two formats share one layout.
//
// The designs follow the provider's website rules where First Form's design system states them:
// the Ash bar with the black logo, one rounded Black panel with a small label at the top and the
// headline at the bottom, the large-crop mark in Hairline running off the panel, client logos on
// a 3:2 White plate, sections divided by space rather than boxes, a page that opens and closes on
// Ash, small capitals tracked 8% for labels and headlines tracked -2%.

import { mark } from '../engine/artwork.js'
import { wrapLines } from '../engine/templates.js'

export const COVER_PAPERS = Object.freeze({ letter: Object.freeze([215.9, 279.4]), a4: Object.freeze([210, 297]) })
export const PT = 25.4 / 72

const n = (value) => Math.round(value * 1000) / 1000

/** The provider's tones by name, with First Form's values where a brand does not name one. */
export const coverTones = (brand) => {
  const named = (key, fallback) => (/^#[0-9a-f]{6}$/i.test(brand?.colours?.[key] ?? '') ? brand.colours[key] : fallback).toUpperCase()
  return {
    black: named('black', '#000000'),
    ink: named('night', '#060606'),
    coal: named('coal', '#141414'),
    hairline: named('hairline', '#2A2A2A'),
    graphite: named('graphite', '#484848'),
    steel: named('steel', '#A6A6A6'),
    mist: named('mist', '#C8C8C8'),
    ash: named('ash', '#DFDFDF'),
    white: named('white', '#FFFFFF')
  }
}

/** Rounded rectangle path, radius clamped to the shorter side. */
const rounded = (x, y, w, h, r) => {
  const k = Math.max(0, Math.min(r, w / 2, h / 2))
  return `M${n(x + k)} ${n(y)}H${n(x + w - k)}A${n(k)} ${n(k)} 0 0 1 ${n(x + w)} ${n(y + k)}V${n(y + h - k)}A${n(k)} ${n(k)} 0 0 1 ${n(x + w - k)} ${n(y + h)}H${n(x + k)}A${n(k)} ${n(k)} 0 0 1 ${n(x)} ${n(y + h - k)}V${n(y + k)}A${n(k)} ${n(k)} 0 0 1 ${n(x + k)} ${n(y)}Z`
}

const viewBoxOf = (svg) => {
  const match = /viewBox=["']\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(svg)
  if (!match) throw new Error('Cover logos need a viewBox.')
  return match.slice(1).map(Number)
}
const inner = (svg) => svg.replace(/^.*?<svg\b[^>]*>/s, '').replace(/<\/svg>\s*$/, '')
let uses = 0
/** Prefix every id in a nested drawing so several logos can share one page. */
const scoped = (svg) => {
  const prefix = `c${++uses}`
  let out = inner(svg)
  for (const id of new Set([...out.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]))) {
    out = out.split(`id="${id}"`).join(`id="${prefix}-${id}"`).split(`url(#${id})`).join(`url(#${prefix}-${id})`).split(`href="#${id}"`).join(`href="#${prefix}-${id}"`)
  }
  return out
}

/** A drawing fitted (contained, centred) in a box, in page millimetres. */
const placeSvg = (svg, x, y, w, h, align = 'center') => {
  const [vx, vy, vw, vh] = viewBoxOf(svg)
  const scale = Math.min(w / vw, h / vh)
  const width = vw * scale
  const height = vh * scale
  const left = align === 'start' ? x : x + (w - width) / 2
  return { markup: `<svg x="${n(left)}" y="${n(y + (h - height) / 2)}" width="${n(width)}" height="${n(height)}" viewBox="${[vx, vy, vw, vh].join(' ')}" overflow="visible">${scoped(svg)}</svg>`, width, height, x: left, y: y + (h - height) / 2 }
}

/** The provider's standard symbol, scaled by `scale` page-mm per symbol unit, its origin at x, y. */
const symbolAt = (provider, x, y, scale, colour) => `<g transform="translate(${n(x)} ${n(y)}) scale(${n(scale)})">${mark(provider, colour)}</g>`

// --- Text ---------------------------------------------------------------------------------------

/**
 * A text frame: native text over the artwork. `y` is the top of the first line's box; a line's
 * baseline is 0.8 of its leading below that, as brandkit's Office pages place text.
 */
const frame = (key, text, { x, y, width, size, leading = 1.3, role = 'body', colour, caps = false, tracking = 0, align = 'left', heading }) =>
  ({ key, text, x: n(x), y: n(y), width: n(width), sizePt: size, leadingPt: n(size * leading), role, colour, caps, trackingEm: caps ? 0.08 : tracking, align, ...(heading ? { heading } : {}) })

/** Wrapped line count of a frame's text at its width. */
const countLines = (measure, text, { width, size, role = 'body', caps = false, tracking = 0 }) => {
  const shown = caps ? text.toUpperCase() : text
  return Math.max(1, wrapLines(shown, width, (line) => measure(line, role, size, caps ? 0.08 : tracking)).length)
}

/** A measure in page millimetres: the brand's fonts where loaded, an estimate otherwise. */
export const coverMeasure = (fonts, keys = {}) => (text, role, sizePt, trackingEm = 0) => {
  const key = keys[role] ?? role
  const measured = fonts?.has?.(key) ? fonts.width(text, key, sizePt * PT, trackingEm) : 0
  return measured || Array.from(text).length * sizePt * PT * (0.56 + trackingEm)
}

// --- Shared parts -------------------------------------------------------------------------------

/** The client's logo on its 3:2 White plate, and the prepared-for block beside it. */
const clientBlock = (art, frames, measure, cover, { x, y, plateHeight, textWidth, tones, dark = false, client, date = true }) => {
  // A 3:2 plate, widened (to 2:1 at most) where the client's logo would otherwise fall below its
  // minimum width; a logo that still cannot fit is left to the brand reference, and its plate with it.
  let plateWidth = plateHeight * 1.5
  let logo = null
  if (client) {
    const pad = Math.min(plateHeight * 0.2, 8)
    const [, , vw, vh] = viewBoxOf(client.svg)
    const fitted = (width, inset) => Math.min(width - inset * 2, (plateHeight - pad * 2) * vw / vh)
    const minimum = client.minimumWidthMm ?? 0
    let inset = pad
    if (fitted(plateWidth, inset) + 0.01 < minimum) {
      inset = Math.min(pad, 6)
      plateWidth = Math.min(plateHeight * 2, Math.max(plateWidth, minimum + inset * 2))
    }
    if (fitted(plateWidth, inset) + 0.01 >= minimum) logo = placeSvg(client.svg, x + inset, y + pad, plateWidth - inset * 2, plateHeight - pad * 2)
  }
  if (logo) {
    textWidth -= plateWidth - plateHeight * 1.5
    art.push(`<path d="${rounded(x, y, plateWidth, plateHeight, 4)}" fill="${tones.white}"/>`, logo.markup)
  } else {
    textWidth += plateHeight * 1.5 + 9
    plateWidth = -9
  }
  const tx = x + plateWidth + 9
  const label = { size: 7.5, role: 'label', caps: true }
  const name = { size: 19, role: 'title', tracking: -0.02, leading: 1.1, width: textWidth }
  const nameLines = countLines(measure, cover.clientName, name)
  let cursor = y + 1.5
  frames.push(frame('preparedFor', 'Prepared for', { x: tx, y: cursor, width: textWidth, ...label, colour: dark ? tones.steel : tones.graphite }))
  cursor += 7.5 * 1.3 * PT + 2.2
  frames.push(frame('clientName', cover.clientName, { x: tx, y: cursor, ...name, colour: dark ? tones.white : tones.black, heading: 2 }))
  cursor += nameLines * 19 * 1.1 * PT + 2.5
  if (cover.preparedBy) {
    frames.push(frame('preparedBy', `Prepared by ${cover.preparedBy}`, { x: tx, y: cursor, width: textWidth, size: 9, colour: dark ? tones.mist : tones.graphite }))
    cursor += 9 * 1.3 * PT + 0.6
  }
  if (date && cover.dateText) {
    frames.push(frame('dateText', cover.dateText, { x: tx, y: cursor, width: textWidth, size: 9, colour: dark ? tones.mist : tones.graphite }))
    cursor += 9 * 1.3 * PT + 0.6
  }
  // The status sits on the plate's bottom edge, or below the details when they run longer.
  if (cover.status) frames.push(frame('status', cover.status, { x: tx, y: Math.max(cursor + 1.2, y + plateHeight - 7.5 * 1.3 * PT - 1), width: textWidth, ...label, colour: dark ? tones.white : tones.black }))
}

/** The Ash bar: the provider's black logo at the left, a label at the right. */
const bar = (art, frames, measure, { x, y, width, height, tones, logo, right }) => {
  art.push(`<path d="${rounded(x, y, width, height, height / 2)}" fill="${tones.ash}"/>`)
  const logoHeight = height * 0.6
  art.push(placeSvg(logo, x + height * 0.42, y + (height - logoHeight) / 2, width * 0.5, logoHeight, 'start').markup)
  if (right) {
    const style = { size: 8, role: 'label', caps: true, width: width * 0.45 }
    const lines = countLines(measure, right.text, style)
    const leading = 8 * 1.35 * PT
    frames.push(frame(right.key, right.text, { x: x + width - height * 0.5 - style.width, y: y + height / 2 - (lines * leading) / 2, ...style, leading: 1.35, colour: tones.black, align: 'right' }))
  }
}

/** The headline and its sentence, set from the bottom up so the last line keeps its place. */
const headline = (frames, measure, cover, { x, bottom, width, size = 46, tones, dark = true, subtitleWidth = width }) => {
  const title = { size, role: 'title', tracking: -0.02, leading: 1.04, width }
  const sub = { size: 12.5, role: 'body', leading: 1.45, width: subtitleWidth }
  let top = bottom
  if (cover.subtitle) {
    const lines = countLines(measure, cover.subtitle, sub)
    top -= lines * sub.size * sub.leading * PT
    frames.push(frame('subtitle', cover.subtitle, { x, y: top, ...sub, colour: dark ? tones.mist : tones.graphite }))
    top -= 6
  }
  const lines = countLines(measure, cover.title, title)
  top -= lines * size * title.leading * PT
  frames.push(frame('title', cover.title, { x, y: top, ...title, colour: dark ? tones.white : tones.black, heading: 1 }))
  return top
}

// --- The designs ---------------------------------------------------------------------------------

/**
 * hero: the website's home page on paper. The Ash bar, one rounded Black panel with the label at
 * its top and the headline at its foot over the large-crop mark in Hairline, and a closing Ash
 * panel with the client's plate.
 */
const hero = ({ W, H, tones, provider, logos, client, cover, measure }) => {
  const art = [`<rect width="${W}" height="${H}" fill="${tones.white}"/>`]
  const frames = []
  const g = 11
  const barHeight = 22
  bar(art, frames, measure, { x: g, y: g, width: W - 2 * g, height: barHeight, tones, logo: logos.black, right: cover.dateText ? { key: 'barDate', text: cover.dateText } : null })
  const closing = 58
  const panel = { x: g, y: g + barHeight + 4, w: W - 2 * g }
  panel.h = H - g - closing - 4 - panel.y
  const clip = `cover-hero-clip`
  // The large crop, in the website hero's proportions: the body a little over a third of the
  // panel's width, starting just left of centre; the inner block cut by the panel's right edge
  // and the mark running off its top and foot.
  const s = (panel.w * 0.37) / 53.82
  art.push(`<defs><clipPath id="${clip}"><path d="${rounded(panel.x, panel.y, panel.w, panel.h, 6)}"/></clipPath></defs>`)
  art.push(`<path d="${rounded(panel.x, panel.y, panel.w, panel.h, 6)}" fill="${tones.black}"/>`)
  art.push(`<g clip-path="url(#${clip})">${symbolAt(provider, panel.x + panel.w * 0.44, panel.y + panel.h * 0.2 - 36.38 * s, s, tones.hairline)}</g>`)
  const pad = 13
  frames.push(frame('kicker', cover.kicker, { x: panel.x + pad, y: panel.y + pad - 1, width: panel.w * 0.6, size: 8.5, role: 'label', caps: true, leading: 1.35, colour: tones.mist }))
  headline(frames, measure, cover, { x: panel.x + pad, bottom: panel.y + panel.h - pad, width: panel.w * 0.8, subtitleWidth: panel.w * 0.62, tones })
  const cy = H - g - closing
  art.push(`<path d="${rounded(g, cy, W - 2 * g, closing, 6)}" fill="${tones.ash}"/>`)
  clientBlock(art, frames, measure, cover, { x: g + 9, y: cy + 9, plateHeight: closing - 18, textWidth: W - 2 * g - 9 - (closing - 18) * 1.5 - 9 - 9, tones, client, date: !cover.dateText })
  return { art, frames }
}

/**
 * blocks: full-bleed Ink with the stacked blocks on the mark's 30° axis rising out of the
 * lower right, the logo on its Ash plate in the corner.
 */
const blocks = ({ W, H, tones, logos, client, cover, measure }) => {
  const art = [`<rect width="${W}" height="${H}" fill="${tones.ink}"/>`]
  const frames = []
  const g = 18
  // The logo on an Ash plate, as the dark templates carry it.
  const plate = { x: g - 4, y: g - 4, h: 22 }
  const logo = placeSvg(logos.black, 0, 0, 200, plate.h - 9)
  plate.w = logo.width + 14
  art.push(`<path d="${rounded(plate.x, plate.y, plate.w, plate.h, 5)}" fill="${tones.ash}"/>`)
  art.push(placeSvg(logos.black, plate.x + 7, plate.y + 4.5, logo.width, plate.h - 9).markup)
  frames.push(frame('kicker', cover.kicker, { x: W - g - 80, y: plate.y + plate.h / 2 - (countLines(measure, cover.kicker, { width: 80, size: 8, role: 'label', caps: true }) * 8 * 1.35 * PT) / 2, width: 80, size: 8, role: 'label', caps: true, leading: 1.35, colour: tones.steel, align: 'right' }))

  // A flight of stacked blocks on the 30° axis: four solid steps whose profile faces the reader,
  // their length running off the right edge. Tops Graphite, risers Coal, the profile Hairline.
  const a = W * 0.088
  const c = Math.cos(Math.PI / 6)
  const ox = W * 0.745
  const oy = H * 0.86
  const P = (i, j, k) => `${n(ox + (i - j) * a * c)} ${n(oy + (i + j) * a / 2 - k * a)}`
  const poly = (points, fill) => `<path d="M${points.join('L')}Z" fill="${fill}"/>`
  const steps = [4, 3, 2, 1]
  const L = 12
  const parts = []
  steps.forEach((h, i) => {
    parts.push(poly([P(i, -L, h), P(i + 1, -L, h), P(i + 1, 0, h), P(i, 0, h)], tones.graphite))
    const next = steps[i + 1] ?? 0
    parts.push(poly([P(i + 1, -L, h), P(i + 1, 0, h), P(i + 1, 0, next), P(i + 1, -L, next)], tones.coal))
  })
  const profile = [P(0, 0, 0), ...steps.flatMap((h, i) => [P(i, 0, h), P(i + 1, 0, h)]), P(steps.length, 0, 0)]
  parts.push(poly(profile, tones.hairline))
  art.push(`<g>${parts.join('')}</g>`)
  const textTop = H * 0.2
  const title = { size: 44, role: 'title', tracking: -0.02, leading: 1.04, width: W * 0.7 }
  const titleLines = countLines(measure, cover.title, title)
  frames.push(frame('title', cover.title, { x: g, y: textTop, ...title, colour: tones.white, heading: 1 }))
  let cursor = textTop + titleLines * 44 * 1.04 * PT + 6
  if (cover.subtitle) {
    const sub = { size: 12.5, role: 'body', leading: 1.45, width: W * 0.55 }
    frames.push(frame('subtitle', cover.subtitle, { x: g, y: cursor, ...sub, colour: tones.mist }))
    cursor += countLines(measure, cover.subtitle, sub) * 12.5 * 1.45 * PT
  }
  clientBlock(art, frames, measure, cover, { x: g, y: H - g - 36, plateHeight: 36, textWidth: W * 0.745 - g - 36 * 1.5 - 9 - 5, tones, dark: true, client })
  return { art, frames, minimumTextBottom: cursor }
}

/**
 * grid: a construction drawing. Ash, the isometric grid in White, and the complete mark set on it
 * in Black at the right; the headline at the foot, the client's plate beneath.
 */
const grid = ({ W, H, tones, provider, logos, client, cover, measure }) => {
  const art = [`<rect width="${W}" height="${H}" fill="${tones.ash}"/>`]
  const frames = []
  const g = 18
  const [, , sw, sh] = provider.brand.symbol?.viewBox ?? [0, 0, 122.79, 142.49]
  // The mark, complete, its body's left edge on a grid line.
  const s = (H * 0.36) / sh
  const mx = W - g - sw * s
  const my = H * 0.17
  const d = (sw * s) / 4.5 // grid spacing across
  const t = Math.tan(Math.PI / 6)
  const lines = []
  const x0 = mx - Math.ceil(mx / d) * d
  for (let x = x0; x <= W + 0.01; x += d) lines.push(`M${n(x)} 0V${n(H)}`)
  // Diagonals through the mark's left shoulder (0, 36.38), both ways, every 2d·tan30 down the page.
  const step = 2 * d * t
  const anchorY = my + 36.38 * s
  for (const dir of [1, -1]) {
    const y0 = anchorY - dir * mx * t
    for (let k = -Math.ceil((W * t + H) / step) - 2; k <= Math.ceil((W * t + H) / step) + 2; k++) {
      const yLeft = y0 + k * step
      lines.push(`M0 ${n(yLeft)}L${n(W)} ${n(yLeft + dir * W * t)}`)
    }
  }
  art.push(`<path d="${lines.join('')}" fill="none" stroke="${tones.white}" stroke-width="0.35"/>`)
  art.push(symbolAt(provider, mx, my, s, tones.black))
  art.push(placeSvg(logos.black, g, g, 60, 13, 'start').markup)
  frames.push(frame('kicker', cover.kicker, { x: W - g - 80, y: g + 6.5 - (countLines(measure, cover.kicker, { width: 80, size: 8, role: 'label', caps: true }) * 8 * 1.35 * PT) / 2, width: 80, size: 8, role: 'label', caps: true, leading: 1.35, colour: tones.black, align: 'right' }))
  const plateHeight = 36
  const footTop = H - g - plateHeight
  headline(frames, measure, cover, { x: g, bottom: footTop - 16, width: W - 2 * g, subtitleWidth: W * 0.6, tones, dark: false })
  clientBlock(art, frames, measure, cover, { x: g, y: footTop, plateHeight, textWidth: W - 2 * g - plateHeight * 1.5 - 9, tones, client })
  return { art, frames }
}

/**
 * index: type alone. The Ash bar, the headline, the pack's contents as the website sets its
 * services (a name, one sentence, a rule above each), and the closing Ash panel.
 */
const index = ({ W, H, tones, logos, client, cover, measure }) => {
  const art = [`<rect width="${W}" height="${H}" fill="${tones.white}"/>`]
  const frames = []
  const g = 11
  const barHeight = 22
  bar(art, frames, measure, { x: g, y: g, width: W - 2 * g, height: barHeight, tones, logo: logos.black, right: cover.dateText ? { key: 'barDate', text: cover.dateText } : null })
  const x = g + 9
  const width = W - 2 * x
  frames.push(frame('kicker', cover.kicker, { x, y: g + barHeight + 22, width, size: 8.5, role: 'label', caps: true, leading: 1.35, colour: tones.graphite }))
  const title = { size: 46, role: 'title', tracking: -0.02, leading: 1.04, width }
  const titleTop = g + barHeight + 32
  frames.push(frame('title', cover.title, { x, y: titleTop, ...title, colour: tones.black, heading: 1 }))
  let cursor = titleTop + countLines(measure, cover.title, title) * 46 * 1.04 * PT + 6
  if (cover.subtitle) {
    const sub = { size: 12.5, role: 'body', leading: 1.45, width: width * 0.75 }
    frames.push(frame('subtitle', cover.subtitle, { x, y: cursor, ...sub, colour: tones.graphite }))
    cursor += countLines(measure, cover.subtitle, sub) * 12.5 * 1.45 * PT
  }
  const closing = 58
  const cy = H - g - closing
  const rowHeight = 21
  const sections = cover.sections ?? []
  const listTop = cy - 12 - rowHeight * sections.length
  if (listTop < cursor + 10) throw new Error('The index cover headline is too long to leave room for its contents.')
  const nameWidth = width * 0.38
  sections.forEach((section, i) => {
    const top = listTop + i * rowHeight
    art.push(`<path d="M${n(x)} ${n(top)}H${n(x + width)}" stroke="${tones.mist}" stroke-width="0.3"/>`)
    frames.push(frame(`section${i + 1}Title`, section.title, { x, y: top + 4.5, width: nameWidth - 6, size: 15, role: 'title', tracking: -0.015, leading: 1.2, colour: tones.black, heading: 2 }))
    frames.push(frame(`section${i + 1}Description`, section.description, { x: x + nameWidth, y: top + 5.2, width: width - nameWidth, size: 10, leading: 1.45, colour: tones.graphite }))
  })
  art.push(`<path d="${rounded(g, cy, W - 2 * g, closing, 6)}" fill="${tones.ash}"/>`)
  clientBlock(art, frames, measure, cover, { x: g + 9, y: cy + 9, plateHeight: closing - 18, textWidth: W - 2 * g - 9 - (closing - 18) * 1.5 - 9 - 9, tones, client, date: !cover.dateText })
  return { art, frames }
}

const DESIGNS = { hero, blocks, grid, index }

/**
 * Lays out one cover: the artwork as a page-sized SVG (millimetres) and its text frames.
 * `logos.black` is the provider's horizontal logo in black; `client` is
 * `{ svg, minimumWidthMm }` for the client's logo, or null to leave its plate empty.
 */
export const coverLayout = ({ variant, paper = 'letter', provider, logos, client = null, cover, measure = coverMeasure() }) => {
  const design = DESIGNS[variant]
  if (!design) throw new Error(`Unknown cover design: ${variant}.`)
  const size = COVER_PAPERS[paper]
  if (!size) throw new Error('paper must be letter or a4.')
  const [W, H] = size
  const tones = coverTones(provider.brand)
  const { art, frames } = design({ W, H, tones, provider, logos, client, cover, measure })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm">${art.join('')}</svg>`
  return { paper, widthMm: W, heightMm: H, svg, frames }
}

/** Positions the frames for an edited cover without redrawing its artwork. */
export const coverFrames = (args) => coverLayout(args).frames

// --- Frames in a stored cover ------------------------------------------------------------------

const SECTION_KEY = /^section([1-4])(Title|Description)$/
export const COVER_FRAME_KEYS = Object.freeze(['kicker', 'title', 'subtitle', 'clientName', 'preparedFor', 'preparedBy', 'dateText', 'barDate', 'status',
  ...[1, 2, 3, 4].flatMap((i) => [`section${i}Title`, `section${i}Description`])])

/** What a stored frame says: frames name a cover field, so edited wording stays the source. */
export const frameText = (cover, key) => {
  const section = SECTION_KEY.exec(key)
  if (section) return String(cover.sections?.[Number(section[1]) - 1]?.[section[2].toLowerCase()] ?? '')
  if (key === 'preparedFor') return 'Prepared for'
  if (key === 'preparedBy') return cover.preparedBy ? `Prepared by ${cover.preparedBy}` : ''
  if (key === 'barDate') return String(cover.dateText ?? '')
  return String(cover[key] ?? '')
}
