// A brand definition, and the questions every generator asks of it.
//
// A brand is one JSON document (see brands/ddcnorth/brand.json and docs/brand-schema.md). Nothing
// in the engine knows a brand by name: colours are asked for by key or by role, faces by role,
// and every piece of copy comes from the document.

import { interpolate } from './format.js'
import { withRevision } from './revisions.js'

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
    if (entry.stackedWordmark != null) need(brand.wordmark?.variants?.[entry.stackedWordmark], `Family \`${entry.id}\` names stacked wordmark \`${entry.stackedWordmark}\`, which is not defined.`)
    if (entry.lockupSymbol != null) need(typeof entry.lockupSymbol === 'boolean', `Family \`${entry.id}\`: \`lockupSymbol\` must be true or false.`)
  }
  if (brand.wordmark?.optionalSubtext) {
    for (const key of ['withFamily', 'withoutFamily']) need(brand.families?.some((entry) => entry.id === brand.wordmark.optionalSubtext[key]), `Optional subtext \`${key}\` must name an existing family.`)
  }
  for (const [id, variant] of Object.entries(brand.wordmark?.variants ?? {})) {
    if (variant.height != null) need(typeof variant.height === 'number' && variant.height > 0, `Wordmark \`${id}\`: \`height\` must be a positive number.`)
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
  // Dots and lines, in patterns and in templates.
  const number = (value) => typeof value === 'number' && Number.isFinite(value)
  for (const spec of brand.patterns ?? []) {
    for (const dot of spec.dots ?? []) need(number(dot.cx) && number(dot.cy) && number(dot.r) && dot.r >= 0, `Pattern \`${spec.id}\` has a dot without a numeric cx, cy and non-negative r.`)
    for (const line of spec.lines ?? []) need(Array.isArray(line.points) && line.points.length >= 2, `Pattern \`${spec.id}\` has a line with fewer than two points.`)
    for (const place of spec.place ?? []) {
      need(number(place.x) && number(place.y) && number(place.scale) && place.scale > 0, `Pattern \`${spec.id}\` needs numeric x, y and a positive scale for each placement.`)
      if (place.symbol != null) need(brand.symbols?.[place.symbol], `Pattern \`${spec.id}\` uses symbol \`${place.symbol}\`, which is not in \`symbols\`.`)
      if (place.rotation != null) need(number(place.rotation), `Pattern \`${spec.id}\` needs a numeric rotation in degrees.`)
    }
  }
  for (const template of brand.templates ?? []) {
    for (const element of template.elements ?? []) {
      if (element.type === 'pattern') {
        need(brand.patterns?.some(spec => spec.id === element.pattern), `Template \`${template.id}\` names pattern \`${element.pattern}\`, which is not defined.`)
        need(number(element.x) && number(element.y) && number(element.width) && number(element.height) && element.width > 0 && element.height > 0, `Template \`${template.id}\` needs numeric pattern coordinates and positive dimensions.`)
      }
      if (element.type === 'dots') need(Array.isArray(element.dots) && element.dots.every((dot) => Array.isArray(dot) && number(dot[0]) && number(dot[1]) && number(dot[2]) && dot[2] >= 0), `Template \`${template.id}\` has a dots element whose dots are not [cx, cy, r] numbers with r of zero or more.`)
      if (element.type === 'polyline') need(Array.isArray(element.points) && element.points.length >= 2, `Template \`${template.id}\` has a polyline with fewer than two points.`)
    }
  }
  // Motion: a library page and its studies.
  if (brand.motion) {
    const studies = brand.motion.studies ?? []
    need(Array.isArray(studies) && studies.length > 0, '`motion.studies` needs at least one study.')
    const seen = new Set()
    for (const study of studies) {
      need(['id', 'name', 'kind', 'timing', 'use', 'description'].every((key) => typeof study[key] === 'string' && study[key]), `Motion study \`${study.id ?? '?'}\` needs an id, name, kind, timing, use and description.`)
      need(!seen.has(study.id), `Motion study \`${study.id}\` is listed twice.`)
      seen.add(study.id)
    }
    for (const [key, value] of Object.entries(brand.motion.tokens?.durations ?? {})) need(number(value) && value > 0, `Motion duration \`${key}\` must be a positive number of milliseconds.`)
  }
  // `$append` belongs only in a revision's changes.
  const appendOutside = (value, path) => {
    if (!value || typeof value !== 'object') return
    if (!Array.isArray(value) && Object.hasOwn(value, '$append')) problems.push(`\`${path}\` uses $append, which belongs only in a revision's changes.`)
    for (const [key, child] of Object.entries(value)) if (!(path === '' && key === 'revisions')) appendOutside(child, path ? `${path}.${key}` : key)
  }
  appendOutside(brand, '')
  // Revisions: each named, with a status and changes, once; and each valid once applied.
  if (!brand.revision) {
    const ids = new Set()
    for (const revision of brand.revisions ?? []) {
      need(typeof revision.id === 'string' && revision.id && typeof revision.status === 'string' && revision.changes && typeof revision.changes === 'object', `Revision \`${revision.id ?? '?'}\` needs an id, a status and changes.`)
      need(!ids.has(revision.id), `Revision \`${revision.id}\` is listed twice.`)
      ids.add(revision.id)
      if (!revision.id || !revision.changes) continue
      try {
        for (const problem of validateBrand(withRevision(brand, revision.id))) problems.push(`Revision \`${revision.id}\`: ${problem}`)
      } catch (error) {
        problems.push(`Revision \`${revision.id}\`: ${error.message}`)
      }
    }
  }
  return problems
}

/**
 * The brand's logos, however it defines them: each fixed family in each layout, or each composed
 * signature. `{ key, label, family?, layout?, signature? }`, in order, primary first.
 */
export const logoOptions = (brand) => (brand.families?.length
  ? brand.families.flatMap((entry) => ['horizontal', 'stacked', 'wordmark', ...(entry.stackedWordmark ? ['wordmark-stacked'] : [])].map((layout) => ({ key: `${entry.id}-${layout}`, label: `${entry.label ?? entry.id}, ${layout.replaceAll('-', ' ')}`, family: entry.id, layout })))
  : (brand.signatures ?? []).map((entry) => ({ key: entry.id, label: entry.label ?? entry.id, signature: entry.id })))

/**
 * What a logo can be painted in: palette colours for a fixed family (`logoColours`), or the
 * signature brand's colourways. `{ id, label, colour?, colourway?, raster }`.
 */
export const paintOptions = (brand) => (brand.families?.length
  ? (brand.logoColours ?? ['black']).map((key) => ({ id: key === 'currentColor' ? 'currentcolor' : key, label: key === 'currentColor' ? 'Inherited colour' : colourName(brand, key), colour: key, raster: key !== 'currentColor' }))
  : [...Object.entries(brand.colourways ?? {}).map(([id, spec]) => ({ id, label: spec.label ?? id, colourway: id, raster: true, ground: spec.ground })), { id: 'currentcolor', label: 'Inherited colour', colour: 'currentColor', raster: false }])
