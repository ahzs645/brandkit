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
//   a symbol     { symbol: true | id, colour? }
//   text         { id?, text, font, lines?, curve?, colour?, caps? }        fitted inside the zone;
//                `id` makes it a field; `curve` sets it on an arc rising by that share of the zone
// and drawn in the zone's own colour unless it says otherwise. A zone the template does not name
// stays empty.

import { colour as resolveColour } from './brand.js'
import { escape, n6 } from './format.js'
import { mark } from './artwork.js'
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
  if (spec.symbol) {
    const [, , sw, sh] = brand.symbol.viewBox
    return fitInside(mark(ctx, fill, false, spec.symbol === true ? undefined : spec.symbol), sw, sh, w, h, spec.inset ?? 0.04)
  }
  if (spec.text != null || spec.id) return zoneText(ctx, spec, zone, w, h, fill)
  return ''
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

/** The whole drawing, identity included, in the illustration's coordinates. */
export const illustrationArt = (ctx, illustration, { zones, markings = true } = {}) =>
  `<g data-layer="object">${illustration.object}</g>${markings && illustration.markings ? `<g data-layer="markings">${illustration.markings}</g>` : ''}<g data-layer="identity">${illustrationIdentity(ctx, illustration, zones)}</g>`

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

/** The fields an illustration element exposes: its text zones with ids. */
export const illustrationFields = (element) => Object.values(element.zones ?? {}).filter((spec) => spec.id && !spec.locked).map((spec) => ({ id: spec.id, text: spec.text, label: spec.label }))
