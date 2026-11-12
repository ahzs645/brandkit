// What a vehicle mockup puts on the car, drawn from the open brand: its logos, in every colour
// it is drawn in, and a fleet layout (the logo with a supporting line, a rule and a website) set
// in the brand's own type. Plain functions over the engine, so Node's tests can check them.

import { logoDocument, pattern, symbolDocument } from '../engine/artwork.js'
import { colour, colourName } from '../engine/brand.js'
import { colourwaysOf } from '../engine/signatures.js'

const viewBoxOf = (svg) => {
  const values = /<svg\b[^>]*\bviewBox\s*=\s*(["'])(.*?)\1/.exec(svg)?.[2].trim().split(/[\s,]+/).map(Number)
  return values?.length === 4 && values.every(Number.isFinite) && values[2] > 0 && values[3] > 0 ? values : null
}

/** The width-to-height ratio of an SVG document, from its viewBox. */
export const svgAspect = (svg) => {
  const box = viewBoxOf(svg)
  return box ? box[2] / box[3] : null
}

const hex = (value) => (/^#[0-9a-f]{6}$/i.test(value ?? '') ? value : null)

/**
 * Every logo the brand offers for a vehicle: `{ id, label, group, ink, make() }`, where `make`
 * returns the SVG and `ink` is the colour the fleet layout's lettering takes beside it. A brand
 * of families gives each family's horizontal and stacked logo in each logo colour; a brand of
 * signatures gives each signature not set for a department, in each colourway; both add the
 * symbol where the brand allows it to stand alone.
 */
export const vehicleLogos = (brand, fonts) => {
  const ctx = { brand, fonts }
  const out = []
  const fallbackInk = hex(colour(brand, 'ink')) ?? '#111111'
  if (brand.families?.length) {
    const keys = (brand.logoColours ?? []).filter((key) => key !== 'currentColor')
    for (const family of brand.families) {
      for (const layout of ['horizontal', 'stacked']) {
        for (const key of keys) {
          out.push({
            id: `${family.id}/${layout}/${key}`,
            label: `${brand.families.length > 1 ? `${family.label ?? family.id}, ` : ''}${layout}, ${colourName(brand, key)}`,
            group: `${family.label ?? family.id} · ${layout}`,
            ink: hex(colour(brand, key)) ?? fallbackInk,
            make: () => logoDocument(ctx, { family: family.id, layout, colourKey: key })
          })
        }
      }
    }
  } else if (brand.signatures?.length) {
    for (const signature of brand.signatures) {
      if (signature.departmental) continue
      for (const way of colourwaysOf(brand)) {
        out.push({
          id: `${signature.id}/${way.id}`,
          label: `${signature.label ?? signature.id}, ${way.label ?? way.id}`,
          group: signature.label ?? signature.id,
          ink: hex(colour(brand, way.all ?? way.type ?? way.symbol)) ?? fallbackInk,
          make: () => logoDocument(ctx, { signature: signature.id, colourway: way.id })
        })
      }
    }
  }
  if (brand.symbol && brand.logoPolicy?.standaloneSymbol !== false) {
    const keys = brand.families?.length ? (brand.logoColours ?? []).filter((key) => key !== 'currentColor') : []
    for (const key of keys) {
      out.push({
        id: `symbol/${key}`,
        label: `Symbol, ${colourName(brand, key)}`,
        group: 'Symbol',
        ink: hex(colour(brand, key)) ?? fallbackInk,
        make: () => symbolDocument(ctx, { colourKey: key })
      })
    }
  }
  return out
}

const escapeXml = (value) => String(value).replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]))
const num = (value) => String(Math.round(value * 100) / 100)

/** The brand's face for a typography role, as a font key the font provider knows. */
const faceKey = (brand, fonts, preferred) => preferred.find((key) => brand.fonts?.[key] && fonts?.has?.(key)) ?? null

/**
 * One line of the fleet layout: outlined in the brand's face where it has every glyph, so the
 * texture does not depend on fonts the image renderer cannot see; otherwise live text in the
 * face's CSS stack.
 */
const line = ({ brand, fonts, keys, text, x, baseline, size, maxWidth, ink, weight }) => {
  if (!text) return ''
  const key = faceKey(brand, fonts, keys)
  if (key && fonts.covers(text, key)) {
    const measured = fonts.width(text, key, size)
    const fitted = measured > maxWidth ? size * maxWidth / measured : size
    return `<path fill="${ink}" d="${fonts.path(text, key, fitted, x, baseline)}"/>`
  }
  const face = brand.fonts?.[keys[0]] ?? brand.fonts?.body
  const family = escapeXml(face?.stack ?? (face?.family ? `'${face.family}', sans-serif` : 'Arial, sans-serif'))
  // Without the face's metrics, a size that keeps a typical line inside the width.
  const fitted = Math.min(size, maxWidth / Math.max(1, text.length) * 1.75)
  return `<text x="${x}" y="${baseline}" fill="${ink}" font-family="${family}" font-weight="${weight}" font-size="${num(fitted)}">${escapeXml(text)}</text>`
}

/** An SVG document placed inside another at a box, its proportions kept. */
const nested = (svg, x, y, width, height) => svg
  .replace(/<\?xml[^>]*\?>\s*/, '')
  .replace(/<svg\b[^>]*>/, (tag) => tag.replace(/\s(x|y|width|height)\s*=\s*(["']).*?\2/g, '').replace('<svg', `<svg x="${num(x)}" y="${num(y)}" width="${num(width)}" height="${num(height)}" preserveAspectRatio="xMinYMid meet"`))

export const FLEET = Object.freeze({ width: 1200, height: 360, margin: 64, logoTop: 30, logoHeight: 168 })

/**
 * The fleet layout: the logo, the supporting line, a rule and the website, 1200 × 360. The logo
 * keeps its own artwork; only the lines beside it are new, in the ink of the logo chosen.
 */
export const fleetSvg = ({ brand, fonts, logoSvg, ink, tagline, website }) => {
  const box = viewBoxOf(logoSvg)
  if (!box) throw new Error('The logo has no viewBox to place it by.')
  const { width, height, margin, logoTop, logoHeight } = FLEET
  const room = width - 2 * margin
  const aspect = box[2] / box[3]
  const logoWidth = Math.min(room, logoHeight * aspect)
  const drawnHeight = logoWidth / aspect
  const art = [
    nested(logoSvg, margin, logoTop + (logoHeight - drawnHeight) / 2, logoWidth, drawnHeight),
    line({ brand, fonts, keys: ['body', 'regular'], text: tagline, x: margin, baseline: 240, size: 32, maxWidth: room, ink, weight: 400 }),
    `<rect x="${margin}" y="262" width="${room}" height="8" fill="${ink}"/>`,
    line({ brand, fonts, keys: ['bold', 'semibold', 'display', 'body'], text: website, x: margin, baseline: 322, size: 34, maxWidth: room, ink, weight: 600 })
  ]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>${escapeXml(brand.name)} fleet layout</title>${art.join('')}</svg>`
}

/** The fleet layout's starting words: the brand's tagline, and its website where it names one. */
export const fleetDefaults = (brand) => {
  const site = brand.contact?.website ?? brand.web?.website ?? brand.web?.url ?? brand.web?.landing?.url ?? ''
  return {
    tagline: String(brand.copy?.tagline ?? '').slice(0, 100),
    website: String(site).replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 80)
  }
}

// --- Wraps ---------------------------------------------------------------------------------

export const WRAP_ART = Object.freeze({ width: 3000, height: 1000 })
const rgbOf = (value) => [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16))
const hexOf = (channels) => `#${channels.map((channel) => Math.round(Math.max(0, Math.min(255, channel))).toString(16).padStart(2, '0')).join('')}`
/** `a` mixed towards `b` by `amount` (0 is all `a`). */
export const mix = (a, b, amount) => hexOf(rgbOf(a).map((channel, index) => channel + (rgbOf(b)[index] - channel) * amount))
const distance = (a, b) => Math.hypot(...rgbOf(a).map((channel, index) => channel - rgbOf(b)[index]))

/** The brand's colours for a wrap, each once: its primary first. */
export const brandColours = (brand) => {
  const out = []
  const offer = (value) => { if (hex(value) && !out.some((other) => distance(other, value.toLowerCase()) < 28)) out.push(value.toLowerCase()) }
  offer(colour(brand, 'primary'))
  for (const key of Object.keys(brand.colours ?? {})) offer(colour(brand, key))
  return out
}

/** A wrap's two colours to start from: the primary, and the brand colour most unlike it. */
export const wrapColours = (brand) => {
  const colours = brandColours(brand)
  const first = colours[0] ?? '#d9021c'
  const rest = colours.slice(1).filter((value) => distance(value, '#ffffff') > 40)
  const second = rest.sort((a, b) => distance(b, first) - distance(a, first))[0] ?? '#231f20'
  return [first, second]
}

/**
 * The wrap graphics, drawn for the vehicle's left side: its front at the left edge, its rear at
 * the right, 3000 × 1000. Transparent where the paint shows through, except Two-tone. For a
 * rear-half wrap only the rear of the drawing is used (1700 × 1000), so the whole design lands on
 * the rear panel instead of being cropped to fit it.
 */
export const WRAP_GRAPHIC_LABELS = Object.freeze({ sweep: 'Sweep', chevrons: 'Chevrons', stripes: 'Stripes', 'two-tone': 'Two-tone' })
export const REAR_HALF_VIEW = Object.freeze([1300, 0, 1700, 1000])
export const wrapGraphicSvg = ({ graphic, colours: [a, b], coverage = 'sides' }) => {
  const poly = (fill, points) => `<polygon fill="${fill}" points="${points.map((point) => point.join(',')).join(' ')}"/>`
  const rect = (fill, x, y, width, height) => `<rect fill="${fill}" x="${x}" y="${y}" width="${width}" height="${height}"/>`
  const art = {
    // A band rising to the rear, with a thinner one ahead of it.
    sweep: () => poly(b, [[1260, 1000], [2060, 0], [2200, 0], [1400, 1000]]) + poly(a, [[1480, 1000], [2280, 0], [3000, 0], [3000, 1000]]),
    // Bold strokes rising to a point at the rear, crossed by a bar: a letterform-like mark.
    chevrons: () => poly(a, [[1640, 1000], [1880, 1000], [2420, 0], [2180, 0]])
      + poly(b, [[1940, 1000], [2120, 1000], [2660, 0], [2480, 0]])
      + poly(a, [[2420, 0], [2640, 0], [3000, 640], [3000, 1000], [2960, 1000]])
      + poly(b, [[2060, 560], [3000, 560], [3000, 680], [1990, 680]]),
    stripes: () => rect(a, 0, 500, 3000, 120) + rect(b, 0, 650, 3000, 44),
    'two-tone': () => rect(b, 0, 640, 3000, 360) + rect(a, 0, 590, 3000, 50)
  }[graphic] ?? (() => '')
  const [x, y, width, height] = coverage === 'rear' ? REAR_HALF_VIEW : [0, 0, WRAP_ART.width, WRAP_ART.height]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}">${art()}</svg>`
}

/** The brand's patterns, as wrap artwork: `{ id, label, make() }`. */
export const wrapPatterns = (brand, fonts) => (brand.patterns ?? [])
  .filter((spec) => spec.id && spec.width > 0 && spec.height > 0)
  .map((spec) => ({ id: spec.id, label: spec.name ?? spec.id.replaceAll('-', ' '), make: () => pattern({ brand, fonts }, spec) }))

// --- Backdrops -----------------------------------------------------------------------------

export const BACKDROP_LABELS = Object.freeze({ studio: 'Studio', dark: 'Dark', brand: 'Brand', outdoor: 'Outdoor' })

/**
 * The stage behind the vehicle: a gradient from `top` to `bottom`, how dark the vehicle's shadow
 * falls, and for Outdoor a ground colour. Brand is tinted from the brand's primary colour.
 */
export const backdrop = (id, brand) => {
  const primary = hex(colour(brand, 'primary')) ?? '#2f6fde'
  switch (id) {
    case 'dark': return { top: '#343a42', bottom: '#0f1114', shadow: 0.55, ground: null, light: 0.85 }
    case 'brand': return { top: mix(primary, '#ffffff', 0.86), bottom: mix(primary, '#ffffff', 0.58), shadow: 0.24, ground: null, light: 1 }
    case 'outdoor': return { top: '#9fc3e6', bottom: '#eef3f6', shadow: 0.42, ground: '#8d9196', light: 1.1 }
    default: return { top: '#f7f8fa', bottom: '#d6dbe1', shadow: 0.22, ground: null, light: 1 }
  }
}
