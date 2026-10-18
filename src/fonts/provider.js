// Fonts, as the engine sees them: something that can measure a line and turn it into outlines.
//
// The engine never loads a font itself. It is handed a provider with three methods:
//
//   has(key)                                       is the face for this role available?
//   width(text, key, size, tracking = 0)           advance width of the line, in user units
//   path(text, key, size, x, y, tracking = 0, anchor = 'start')   outline path data ('' if none)
//
// `key` is a role from the brand's `fonts` ("body", "display", "label"…); `tracking` is in ems.
// This module builds a provider from opentype.js faces. A host app can supply its own instead:
// PofBC does, from the Helvetica metrics and outlines it already has.
//
// Lines are set from advance widths alone, without kerning, the way the original kit's Python
// builder set them, so wrapped paragraphs break at the same words.

import * as opentype from 'opentype.js'

// The package's Node entry is CommonJS (one default export); bundlers take its ES module.
const parse = opentype.parse ?? opentype.default.parse

const DECIMALS = 2

/** Shears outline commands by `degrees` about the baseline, for a face that has no italic. */
const slant = (commands, baseline, degrees) => {
  if (!degrees) return commands
  const k = Math.tan(degrees * Math.PI / 180)
  const shear = (x, y) => x + (baseline - y) * k
  return commands.map((command) => {
    const next = { ...command }
    if ('x' in next) next.x = shear(next.x, next.y)
    if ('x1' in next) next.x1 = shear(next.x1, next.y1)
    if ('x2' in next) next.x2 = shear(next.x2, next.y2)
    return next
  })
}

const toPathData = (commands) => {
  const f = (value) => {
    const fixed = value.toFixed(DECIMALS).replace(/\.?0+$/, '')
    return fixed === '-0' ? '0' : fixed
  }
  return commands.map((c) => {
    switch (c.type) {
      case 'M': return `M${f(c.x)} ${f(c.y)}`
      case 'L': return `L${f(c.x)} ${f(c.y)}`
      case 'Q': return `Q${f(c.x1)} ${f(c.y1)} ${f(c.x)} ${f(c.y)}`
      case 'C': return `C${f(c.x1)} ${f(c.y1)} ${f(c.x2)} ${f(c.y2)} ${f(c.x)} ${f(c.y)}`
      case 'Z': return 'Z'
      default: return ''
    }
  }).join('')
}

/**
 * A provider over parsed opentype.js fonts.
 * @param {Record<string, {font: import('opentype.js').Font, slant?: number}>} faces
 */
export const createFontProvider = (faces) => {
  const glyphsOf = (font, text) => Array.from(String(text)).map((char) => font.charToGlyph(char))

  const width = (text, key, size, tracking = 0) => {
    const face = faces[key]
    if (!face) return 0
    const { font } = face
    const glyphs = glyphsOf(font, text)
    const advance = glyphs.reduce((sum, glyph) => sum + (glyph.advanceWidth ?? 0) * size / font.unitsPerEm, 0)
    return advance + Math.max(0, glyphs.length - 1) * size * tracking
  }

  const path = (text, key, size, x, y, tracking = 0, anchor = 'start') => {
    const face = faces[key]
    if (!face) return ''
    const { font } = face
    let cursor = x
    if (anchor === 'end') cursor -= width(text, key, size, tracking)
    else if (anchor === 'middle') cursor -= width(text, key, size, tracking) / 2
    let d = ''
    for (const glyph of glyphsOf(font, text)) {
      const commands = glyph.getPath(cursor, y, size).commands
      if (commands.length) d += toPathData(slant(commands, y, face.slant))
      cursor += (glyph.advanceWidth ?? 0) * size / font.unitsPerEm + size * tracking
    }
    return d
  }

  /** The outline's extent with its baseline at y = 0 (y grows downward): { x1, y1, x2, y2 }. */
  const bounds = (text, key, size, tracking = 0) => {
    const face = faces[key]
    if (!face) return null
    const { font } = face
    let cursor = 0
    const box = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity }
    for (const glyph of glyphsOf(font, text)) {
      const glyphBox = glyph.getPath(cursor, 0, size).getBoundingBox()
      if (Number.isFinite(glyphBox.x1) && !glyphBox.isEmpty?.()) {
        box.x1 = Math.min(box.x1, glyphBox.x1)
        box.y1 = Math.min(box.y1, glyphBox.y1)
        box.x2 = Math.max(box.x2, glyphBox.x2)
        box.y2 = Math.max(box.y2, glyphBox.y2)
      }
      cursor += (glyph.advanceWidth ?? 0) * size / font.unitsPerEm + size * tracking
    }
    return Number.isFinite(box.x1) ? box : null
  }

  return { has: (key) => Boolean(faces[key]), width, path, bounds, faces }
}

/**
 * Loads every face a brand names that has a font `file`, through `read(path) → ArrayBuffer`.
 * Faces that fail to load are reported and left out; text in them stays live.
 */
export const loadBrandFonts = async (brand, read) => {
  const faces = {}
  const failures = []
  const cache = new Map()
  await Promise.all(Object.entries(brand.fonts ?? {}).map(async ([key, spec]) => {
    if (!spec.file) return
    try {
      if (!cache.has(spec.file)) cache.set(spec.file, Promise.resolve(read(spec.file)).then((buffer) => parse(buffer)))
      faces[key] = { font: await cache.get(spec.file), slant: spec.slant ?? 0 }
    } catch (error) {
      failures.push({ key, file: spec.file, error })
    }
  }))
  return Object.assign(createFontProvider(faces), { failures })
}
