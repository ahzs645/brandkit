// A brand definition, and the questions every generator asks of it.
//
// A brand is one JSON document (see brands/ddcnorth/brand.json and docs/brand-schema.md). Nothing
// in the engine knows a brand by name: colours are asked for by key or by role, faces by role,
// and every piece of copy comes from the document.

import { interpolate } from './format.js'

/** Roles the built-in templates and guide pages ask for. A brand maps each to one of its colours. */
export const COLOUR_ROLES = ['ink', 'paper', 'muted', 'primary', 'light', 'reverse', 'line', 'rule']

const ROLE_FALLBACKS = {
  ink: '#000000', paper: '#F7F6F3', muted: '#4B4F56', primary: '#0B2B4A',
  light: '#C8D7E8', reverse: '#FFFFFF', line: '#D9DCDF', rule: '#CFD2D4'
}

/**
 * Resolves a colour reference: a palette key ("midnight"), a role ("primary"), a literal
 * ("#0B2B4A", "currentColor", "none"). Roles may point at palette keys or at other literals.
 */
export const colour = (brand, value, seen = new Set()) => {
  if (value == null) return undefined
  const key = String(value)
  if (brand.colours?.[key]) return brand.colours[key]
  if (brand.roles?.[key] != null && !seen.has(key)) {
    seen.add(key)
    return colour(brand, brand.roles[key], seen)
  }
  if (ROLE_FALLBACKS[key]) return ROLE_FALLBACKS[key]
  return key
}

/** The name a palette key is shown under: "off-white" → "Off-white". */
export const colourName = (brand, key) => brand.colourNames?.[key]
  ?? key.split('-').map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)).join('-')

export const rgb = (hex) => {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim())
  if (!match) return null
  const value = parseInt(match[1], 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export const luminance = (hex) => {
  const channels = rgb(hex)
  if (!channels) return 0
  const [r, g, b] = channels.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const isDark = (hex) => luminance(hex) < 0.3

/** Values computed from the definition, available to copy as {derived.*}. */
export const derive = (brand) => {
  const symbol = brand.symbol ?? {}
  const [, , width = 0, height = 0] = symbol.viewBox ?? []
  const centres = symbol.centres ?? []
  const pitch = symbol.horizontalPitch
  return {
    symbolWidth: width,
    symbolHeight: height,
    diameter: symbol.radius != null ? 2 * symbol.radius : undefined,
    gap: pitch != null && symbol.radius != null ? pitch - 2 * symbol.radius : undefined,
    dotCount: centres.length || undefined,
    rows: symbol.rows ? symbol.rows.join(' / ') : undefined
  }
}

/** Everything copy can refer to: the definition itself plus a few conveniences. */
export const copyContext = (brand, extra = {}) => ({
  ...brand,
  upperName: String(brand.name ?? '').toUpperCase(),
  displayVersion: brand.displayVersion ?? String(brand.version ?? '').split('-')[0],
  derived: derive(brand),
  ...extra
})

export const fill = (brand, text, extra) => interpolate(text, copyContext(brand, extra))

export const family = (brand, id) => brand.families?.find((entry) => entry.id === id) ?? brand.families?.[0]

/** The face a role refers to, or the body face when a brand does not define that role. */
export const face = (brand, key = 'body') => brand.fonts?.[key] ?? brand.fonts?.body ?? { stack: 'sans-serif', weight: 400 }

/**
 * Structural checks. Returns a list of problems rather than throwing, so the app can show all of
 * them at once while someone is editing a definition.
 */
export const validateBrand = (brand) => {
  const problems = []
  const need = (condition, message) => { if (!condition) problems.push(message) }
  need(brand && typeof brand === 'object', 'The definition is not an object.')
  if (!brand || typeof brand !== 'object') return problems
  need(typeof brand.id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(brand.id), '`id` must be lower-case letters, digits and hyphens.')
  need(typeof brand.name === 'string' && brand.name, '`name` is required.')
  need(brand.colours && Object.keys(brand.colours).length > 0, '`colours` needs at least one colour.')
  for (const [key, value] of Object.entries(brand.colours ?? {})) {
    need(/^#[0-9a-f]{6}$/i.test(value), `Colour \`${key}\` must be a six-digit hex value, not "${value}".`)
  }
  const symbol = brand.symbol
  need(symbol && Array.isArray(symbol.viewBox) && symbol.viewBox.length === 4, '`symbol.viewBox` must be four numbers.')
  need(symbol && (symbol.centres || symbol.paths || symbol.markup), '`symbol` needs `centres`, `paths` or `markup`.')
  need((Array.isArray(brand.families) && brand.families.length > 0) || (Array.isArray(brand.signatures) && brand.signatures.length > 0), 'The brand needs `families` (fixed wordmarks) or `signatures` (composed lockups).')
  for (const signature of brand.signatures ?? []) {
    need(signature.id && Array.isArray(signature.elements), `Signature \`${signature.id ?? '?'}\` needs an id and elements.`)
    for (const element of signature.elements ?? []) {
      if (element.type === 'symbol' && element.symbol) need(brand.symbols?.[element.symbol], `Signature \`${signature.id}\` uses symbol \`${element.symbol}\`, which is not in \`symbols\`.`)
    }
  }
  if (brand.signatures?.length) need(brand.colourways && Object.keys(brand.colourways).length, 'A brand with signatures needs `colourways`.')
  for (const entry of brand.families ?? []) {
    need(brand.wordmark?.variants?.[entry.wordmark], `Family \`${entry.id}\` names wordmark \`${entry.wordmark}\`, which is not defined.`)
  }
  for (const [id, variant] of Object.entries(brand.wordmark?.variants ?? {})) {
    for (const part of variant.parts ?? []) {
      if (part.glyph) need(brand.wordmark.glyphs?.[part.glyph], `Wordmark \`${id}\` uses glyph \`${part.glyph}\`, which is not defined.`)
      if (part.text) need(brand.fonts?.[part.font ?? 'display'], `Wordmark \`${id}\` sets text in font \`${part.font ?? 'display'}\`, which is not defined.`)
    }
  }
  for (const template of brand.templates ?? []) {
    need(template.id && template.width > 0 && template.height > 0, `Template \`${template.id ?? '?'}\` needs an id, width and height.`)
  }
  const templateIds = new Set((brand.templates ?? []).map((template) => template.id))
  for (const set of brand.sets ?? []) {
    for (const variant of set.variants ?? []) need(templateIds.has(variant.template), `Set \`${set.id}\` names template \`${variant.template}\`, which is not defined.`)
  }
  for (const document of brand.documents ?? []) {
    need(['docx', 'pptx', 'html'].includes(document.format), `Document \`${document.id}\` has format \`${document.format}\`; use docx, pptx or html.`)
    for (const id of [...(document.pages ?? []), ...(document.layouts ?? []), ...(document.template ? [document.template] : [])]) need(templateIds.has(id), `Document \`${document.id}\` names template \`${id}\`, which is not defined.`)
  }
  return problems
}

/**
 * The brand's logos, however it defines them: each fixed family in each layout, or each composed
 * signature. `{ key, label, family?, layout?, signature? }`, in order, primary first.
 */
export const logoOptions = (brand) => (brand.families?.length
  ? brand.families.flatMap((entry) => ['horizontal', 'stacked', 'wordmark'].map((layout) => ({ key: `${entry.id}-${layout}`, label: `${entry.label ?? entry.id}, ${layout}`, family: entry.id, layout })))
  : (brand.signatures ?? []).map((entry) => ({ key: entry.id, label: entry.label ?? entry.id, signature: entry.id })))

/**
 * What a logo can be painted in: palette colours for a fixed family (`logoColours`), or the
 * signature brand's colourways. `{ id, label, colour?, colourway?, raster }`.
 */
export const paintOptions = (brand) => (brand.families?.length
  ? (brand.logoColours ?? ['black']).map((key) => ({ id: key === 'currentColor' ? 'currentcolor' : key, label: key === 'currentColor' ? 'Inherited colour' : colourName(brand, key), colour: key, raster: key !== 'currentColor' }))
  : [...Object.entries(brand.colourways ?? {}).map(([id, spec]) => ({ id, label: spec.label ?? id, colourway: id, raster: true, ground: spec.ground })), { id: 'currentcolor', label: 'Inherited colour', colour: 'currentColor', raster: false }])
