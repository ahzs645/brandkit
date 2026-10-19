// Illustrations: drawings of the things an identity is applied to (a van, a door, a blazer, a
// locomotive), each with branding zones, the places the identity goes, recorded from the source.
//
//   brand.illustrations: { [id]: { title, viewBox: [x, y, w, h], object, markings?,
//                                  zones: [{ id, label, kind, box: [x, y, w, h], quad, colour, default }] } }
//
// `object` is the drawing's markup with no identity on it (`markings`, where there is one, adds
// what the source shows that is not identity: reflective striping, say). A zone's `quad` is its
// four corners, top left first and clockwise, so a zone on a surface seen at an angle is a
// parallelogram, not a box.
//
// A template sets the identity into the zones:
//
//   { type: 'illustration', illustration: 'V13-truck-side', x, y, width, height?, markings?,
//     zones: { 'box-signature': { signature: 'vehicle', values: { ministry: '' } },
//              'box-unit': { id: 'unit-number', text: '1604-2103', font: 'medium' } } }
//
// A zone is filled with
//   a signature  { signature, colourway? | colour?, values?, defaults?, bottom? }   fitted inside the
//                zone (or its top `bottom` share); `values` are fixed for it, `defaults` give way
//                to the template's fields
//   a logo       { logo: true | { family?, layout? } }   a fixed lockup; horizontal in a wide zone,
//                stacked in a squarer one, unless it says
//   a symbol     { symbol: true | id, colour? }
//   text         { id?, text, font, lines?, curve?, colour?, caps? }        fitted inside the zone;
//                `id` makes it a field; `curve` sets it on an arc rising by that share of the zone
// and drawn in the zone's own colour unless it says otherwise. A zone the template does not name
// stays empty.
//
// An illustration may also carry `lettering`, the words drawn on it (a sign's wording), each line
// `{ text, x, y, size, bold, family: 'sans' | 'serif', anchor, fill, width? }`. A template makes them
// fields and sets them in its brand's faces:
//
//   lettering: { prefix: 's13-ranger-station', fonts: { sans: { regular: 'regular', bold: 'medium' } } }
//
// gives fields s13-ranger-station-1, -2…; a line longer than the source's set `width` is narrowed
// to fit it.

import { colour as resolveColour } from './brand.js'
import { escape, n6 } from './format.js'
import { lockup, mark } from './artwork.js'
import { signatureLockup } from './signatures.js'

/** The affine transform taking a w × h box at the origin onto the zone's quad. */
const frameOf = (zone) => {
  let [p0, p1, p2, p3] = zone.quad ?? [[zone.box[0], zone.box[1]], [zone.box[0] + zone.box[2], zone.box[1]], [zone.box[0] + zone.box[2], zone.box[1] + zone.box[3]], [zone.box[0], zone.box[1] + zone.box[3]]]
  // Corners listed anticlockwise (a view drawn facing the other way) would mirror the lettering;
  // read them from the other top corner instead.
  if ((p1[0] - p0[0]) * (p3[1] - p0[1]) - (p1[1] - p0[1]) * (p3[0] - p0[0]) < 0) [p0, p1, p2, p3] = [p1, p0, p3, p2]
  const w = Math.hypot(p1[0] - p0[0], p1[1] - p0[1])
  const h = Math.hypot(p3[0] - p0[0], p3[1] - p0[1])
  const matrix = [(p1[0] - p0[0]) / w, (p1[1] - p0[1]) / w, (p3[0] - p0[0]) / h, (p3[1] - p0[1]) / h, p0[0], p0[1]]
  return { w, h, transform: `matrix(${matrix.map(n6).join(' ')})` }
}

/** Places art of `width` × `height` centred inside w × h, as large as fits. */
const fitInside = (art, width, height, w, h, inset = 0) => {
  const scale = Math.min((w * (1 - inset)) / width, (h * (1 - inset)) / height)
  return `<g transform="translate(${n6((w - width * scale) / 2)} ${n6((h - height * scale) / 2)}) scale(${n6(scale)})">${art}</g>`
}

const textOf = (ctx, spec, zone) => {
  const given = spec.id != null ? ctx.values?.[spec.id] : undefined
  const value = given != null && given !== '' ? String(given) : spec.text ?? zone.default ?? ''
  return spec.caps ? value.toUpperCase() : value
}

/** Text fitted to the zone: as many lines as it has, centred, as large as fits. */
const zoneText = (ctx, spec, zone, w, h, fill) => {
  const { fonts, brand } = ctx
  const key = spec.font ?? 'body'
  const lines = textOf(ctx, spec, zone).split('\n').filter((line) => line.trim())
  if (!lines.length) return ''
  const cap = brand.fonts?.[key]?.capHeight ?? 0.72
  const leading = spec.leading ?? 1.18
  const measure = (line, size) => (fonts?.has(key) ? fonts.width(line, key, size) : Array.from(line).length * size * 0.56)
  const widest = Math.max(...lines.map((line) => measure(line, 1)))
  // Capitals fill the zone's height on one line; more lines share it.
  const blockAt1 = cap + (lines.length - 1) * leading
  const size = Math.min((h * (spec.fill ?? 0.82)) / blockAt1, (w * 0.96) / (widest * (spec.curve ? 0.94 : 1)))
  const top = (h - blockAt1 * size) / 2 + cap * size
  if (spec.curve && fonts?.has(key) && ctx.outline && lines.length === 1) return curvedLine(ctx, lines[0], key, size, w, h, spec.curve, fill)
  return lines.map((line, index) => {
    const y = top + index * leading * size
    if (ctx.outline && fonts?.has(key)) return `<path fill="${fill}" aria-label="${escape(line)}" d="${fonts.path(line, key, size, w / 2, y, 0, 'middle')}"/>`
    const face = brand.fonts?.[key] ?? {}
    return `<text x="${n6(w / 2)}" y="${n6(y)}" text-anchor="middle" font-family="${escape(face.stack ?? face.family ?? 'sans-serif')}" font-weight="${face.weight ?? 400}" font-size="${n6(size)}" fill="${fill}">${escape(line)}</text>`
  }).join('')
}

/** One line set on an arc, each glyph turned to the curve, as on a shoulder patch's title. */
const curvedLine = (ctx, line, key, size, w, h, rise, fill) => {
  const { fonts, brand } = ctx
  const cap = brand.fonts?.[key]?.capHeight ?? 0.72
  const sagitta = h * rise
  const chord = w * 0.96
  const radius = (chord / 2) ** 2 / (2 * sagitta) + sagitta / 2
  const total = fonts.width(line, key, size)
  const baseline = h / 2 + (cap * size) / 2 + sagitta / 2
  let cursor = -total / 2
  let d = ''
  const parts = []
  for (const char of Array.from(line)) {
    const advance = fonts.width(char, key, size)
    const middle = cursor + advance / 2
    const angle = middle / radius
    const x = w / 2 + radius * Math.sin(angle)
    const y = baseline - (radius * Math.cos(angle) - (radius - sagitta))
    if (char.trim()) parts.push(`<path transform="translate(${n6(x)} ${n6(y)}) rotate(${n6((angle * 180) / Math.PI)})" d="${fonts.path(char, key, size, 0, 0, 0, 'middle')}"/>`)
    cursor += advance
  }
  d = parts.join('')
  return `<g fill="${fill}" aria-label="${escape(line)}">${d}</g>`
}

/** What one zone holds, in the zone's own w × h frame. */
const zoneArt = (ctx, spec, zone, w, h) => {
  const { brand } = ctx
  const fill = resolveColour(brand, spec.colour ?? zone.colour ?? 'ink')
  if (spec.signature) {
    const defined = Object.fromEntries(Object.entries(ctx.values ?? {}).filter(([, value]) => value != null && value !== ''))
    const values = { ...(spec.defaults ?? {}), ...defined, ...(spec.values ?? {}) }
    const master = signatureLockup({ ...ctx, values }, { signature: spec.signature, colourway: spec.colourway, colour: spec.colourway ? undefined : fill })
    return fitInside(master.art, master.width, master.height, w, h, spec.inset ?? 0.04)
  }
  if (spec.logo) {
    const layout = spec.logo.layout ?? (w / h > 2.4 ? 'horizontal' : 'stacked')
    const master = lockup(ctx, { family: spec.logo.family, layout, colour: fill })
    const pad = master.origin ? 0 : brand.lockup?.canvasPadding ?? 0
    return fitInside(`<g transform="translate(${-pad} ${-pad})">${master.art}</g>`, master.width - 2 * pad, master.height - 2 * pad, w, h, spec.inset ?? 0.04)
  }
  if (spec.symbol) {
    const [, , sw, sh] = brand.symbol.viewBox
    return fitInside(mark(ctx, fill, false, spec.symbol === true ? undefined : spec.symbol), sw, sh, w, h, spec.inset ?? 0.04)
  }
  if (spec.text != null || spec.id) return zoneText(ctx, spec, zone, w, h, fill)
  return ''
}

/**
 * Repaints a drawing by material: `{ paint: 'primary', fabric: 'midnight' }` gives every part made
 * of that material (a van's body, a jacket's cloth) the brand's colour.
 */
const recolour = (ctx, markup, materials) => {
  if (!materials) return markup
  return markup.replace(/<[^>]*data-material="([^"]+)"[^>]*>/g, (tag, material) => {
    const colour = materials[material]
    return colour ? tag.replace(/ fill="(?!none")[^"]*"/, ` fill="${resolveColour(ctx.brand, colour)}"`) : tag
  })
}

/** The identity set into an illustration's zones, in the illustration's coordinates. */
export const illustrationIdentity = (ctx, illustration, zones = {}) => illustration.zones
  .filter((zone) => zones[zone.id])
  .map((zone) => {
    const spec = zones[zone.id]
    const { w, h, transform } = frameOf(zone)
    // `bottom`: the share of the zone's height to use, where another zone (a unit number) takes
    // the foot of it.
    const art = zoneArt(ctx, spec, zone, w, h * (spec.bottom ?? 1))
    return art ? `<g data-zone="${escape(zone.id)}" transform="${transform}"${spec.opacity != null ? ` opacity="${spec.opacity}"` : ''}>${art}</g>` : ''
  }).join('')

const letteringId = (spec, index) => `${spec.prefix}-${index + 1}`
const letteringFont = (spec, line) => {
  const faces = spec.fonts?.[line.family] ?? spec.fonts?.sans ?? spec.fonts?.serif ?? {}
  return (line.bold ? faces.bold : faces.regular) ?? faces.regular ?? 'body'
}

/** The words on an illustration, each line a field, in the brand's faces. */
export const illustrationLettering = (ctx, illustration, spec) => (illustration.lettering ?? []).map((line, index) => {
  const { fonts, brand } = ctx
  const given = spec ? ctx.values?.[letteringId(spec, index)] : undefined
  const text = given != null && given !== '' ? String(given) : line.text
  if (!text.trim()) return ''
  const key = spec ? letteringFont(spec, line) : 'body'
  const natural = fonts?.has(key) ? fonts.width(text, key, line.size) : Array.from(text).length * line.size * 0.55
  const size = line.width && natural > line.width ? line.size * (line.width / natural) : line.size
  if (ctx.outline && fonts?.has(key)) return `<path fill="${escape(line.fill)}" aria-label="${escape(text)}" d="${fonts.path(text, key, size, line.x, line.y, 0, line.anchor)}"/>`
  const face = brand.fonts?.[key] ?? {}
  return `<text x="${n6(line.x)}" y="${n6(line.y)}" text-anchor="${line.anchor}" font-family="${escape(face.stack ?? face.family ?? 'sans-serif')}" font-weight="${face.weight ?? 400}" font-size="${n6(size)}" fill="${escape(line.fill)}">${escape(text)}</text>`
}).join('')

/** The whole drawing, identity and lettering included, in the illustration's coordinates. */
export const illustrationArt = (ctx, illustration, { zones, markings = true, materials, lettering } = {}) =>
  `<g data-layer="object">${recolour(ctx, illustration.object, materials)}</g>${markings && illustration.markings ? `<g data-layer="markings">${illustration.markings}</g>` : ''}`
  + `${illustration.lettering?.length ? `<g data-layer="lettering">${illustrationLettering(ctx, illustration, lettering)}</g>` : ''}<g data-layer="identity">${illustrationIdentity(ctx, illustration, zones)}</g>`

/** The template element: the illustration fitted to `width` (and `height`, if given) at x, y. */
export const placeIllustration = (ctx, element, u) => {
  const illustration = ctx.brand.illustrations?.[element.illustration]
  if (!illustration) throw new Error(`No illustration ${element.illustration}`)
  const [vx, vy, vw, vh] = illustration.viewBox
  const width = u(element.width)
  const scale = element.height == null ? width / vw : Math.min(width / vw, u(element.height) / vh)
  const dx = element.height == null ? 0 : (width - vw * scale) / 2
  const dy = element.height == null ? 0 : (u(element.height) - vh * scale) / 2
  return `<g${element.id ? ` id="${escape(element.id)}"` : ''} transform="translate(${n6(u(element.x) + dx)} ${n6(u(element.y) + dy)}) scale(${n6(scale)}) translate(${n6(-vx)} ${n6(-vy)})">${illustrationArt(ctx, illustration, element)}</g>`
}

/**
 * The fields an illustration element exposes: its text zones with ids, then its lettering, line by
 * line. Lettering is `local`: it belongs to this drawing alone (a sign's wording), so a set of
 * signs does not list every sign's lines at once.
 */
export const illustrationFields = (element, brand) => [
  ...Object.values(element.zones ?? {}).filter((spec) => spec.id && !spec.locked).map((spec) => ({ id: spec.id, text: spec.text, label: spec.label })),
  ...(element.lettering ? (brand?.illustrations?.[element.illustration]?.lettering ?? []).map((line, index) => ({ id: letteringId(element.lettering, index), text: line.text, label: `Line ${index + 1}`, local: true })) : [])
]
