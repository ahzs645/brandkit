// What a vehicle mockup puts on the car, drawn from the open brand: its logos, in every colour
// it is drawn in, and a fleet layout (the logo with a supporting line, a rule and a website) set
// in the brand's own type. Plain functions over the engine, so Node's tests can check them.

import { logoDocument, symbolDocument } from '../engine/artwork.js'
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
