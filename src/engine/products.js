// A product family: named products under one parent identity.
//
// The parent logo is a locked asset. A product lockup never redraws, re-typesets or rescales it:
// the parent is drawn by lockup(), exactly as the Logos tab and the kit draw it, and its artwork is
// embedded as it is. What varies from product to product is the name, a descriptor, an accent
// colour and a pictogram, all sized from the parent's own height:
//
//   brand.products: {
//     label?, status?, note?,
//     parent?: { family } | { signature, colourway },
//     lockup?: { arrangements?, name?: { font, tracking, size, leadSize }, label?: { font, tracking, caps, size }, baseline? },
//     tile?: { styles? },
//     directions?: [{ id, label, summary?, arrangement, tile }], direction?,
//     items: [{ id, name, fullName?, descriptor?, role?, status?, accent, accentName?, accentText?, onAccent?, icon? }]
//   }
//
// Arrangements, with H the height of the parent's artwork (its canvas less the padding):
//   endorsed     the parent, a rule in the accent, the product name beside it
//   label        the parent, and under its lettering a short accent bar and the name in the label face
//   product-led  a pictogram tile in the accent and the name, large; the parent signs off beneath
//   compact      the symbol alone, the rule and the name: for widths below the full logo's minimum

import { PRODUCT_ARRANGEMENTS, PRODUCT_TILE_STYLES, colour as resolveColour, contrast, face as faceOf, family as findFamily, luminance, rgb } from './brand.js'
import { lockup, mark, svgDocument } from './artwork.js'
import { attrs, escape, n } from './format.js'
import { paintFor } from './signatures.js'

export { PRODUCT_ARRANGEMENTS, PRODUCT_TILE_STYLES }

const HEX = /^#[0-9a-f]{6}$/i
const DEFAULT_ICON_ATTRS = { fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }

export const hasProducts = (brand) => Boolean(brand?.products?.items?.length)

const standaloneSymbol = (brand) => brand.logoPolicy?.standaloneSymbol !== false

const toHex = (channels) => `#${channels.map((value) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0')).join('').toUpperCase()}`
const mix = (from, to, amount) => {
  const [a, b] = [rgb(from) ?? [0, 0, 0], rgb(to) ?? [0, 0, 0]]
  return toHex(a.map((value, index) => value + (b[index] - value) * amount))
}

/** The accent as text on paper: itself where it reads (4.5 : 1), otherwise darkened towards ink until it does. */
const textTone = (accent, paper, ink) => {
  if (contrast(accent, paper) >= 4.5) return accent
  const towards = contrast(ink, paper) >= 4.5 ? ink : (contrast('#000000', paper) >= contrast('#FFFFFF', paper) ? '#000000' : '#FFFFFF')
  for (let step = 1; step <= 25; step += 1) {
    const tone = mix(accent, towards, step / 25)
    if (contrast(tone, paper) >= 4.5) return tone
  }
  return towards
}

/** The accent beside a reversed logo: itself where it shows on the dark ground (3 : 1), otherwise lightened towards reverse until it does. */
const darkGroundTone = (accent, ground, reverse) => {
  if (contrast(accent, ground) >= 3) return accent
  for (let step = 1; step <= 25; step += 1) {
    const tone = mix(accent, reverse, step / 25)
    if (contrast(tone, ground) >= 3) return tone
  }
  return reverse
}

/**
 * What is drawn on the accent (a pictogram, the symbol): the reverse colour wherever it reaches
 * 3 : 1, so a family's tiles agree; failing that the primary colour, at the same ratio; failing
 * both, whichever of reverse and ink reads better.
 */
const onTone = (accent, { reverse, primary, ink }) => {
  if (contrast(reverse, accent) >= 3) return reverse
  if (contrast(primary, accent) >= 3) return primary
  return contrast(reverse, accent) >= contrast(ink, accent) ? reverse : ink
}

/**
 * The family's products with their colours resolved: `accent` (a hex), `accentText` (the accent
 * for text on paper, at 4.5 : 1 or better) and `onAccent` (what is drawn on the accent: the item's
 * own, or reverse, primary or ink, see onTone) and `accentOnDark` (the accent for the rule or bar
 * beside a reversed logo, at 3 : 1 or better on the darker of primary and ink). Keys the engine
 * does not use (`symbol`, `accentName`…) are kept as written.
 */
export const productsOf = (brand) => {
  const paper = resolveColour(brand, 'paper')
  const ink = resolveColour(brand, 'ink')
  const reverse = resolveColour(brand, 'reverse')
  const primary = resolveColour(brand, 'primary')
  // The ground a reversed logo is expected on: the brand colour, or ink where that is not dark.
  const ground = luminance(primary) <= luminance(ink) || luminance(primary) < 0.2 ? primary : ink
  return (brand?.products?.items ?? []).map((item) => {
    const resolved = resolveColour(brand, item.accent)
    const accent = HEX.test(resolved ?? '') ? resolved : resolveColour(brand, 'primary')
    const own = item.accentText != null ? resolveColour(brand, item.accentText) : null
    const on = item.onAccent != null ? resolveColour(brand, item.onAccent) : null
    const dark = item.accentOnDark != null ? resolveColour(brand, item.accentOnDark) : null
    return {
      ...item,
      accent,
      accentText: HEX.test(own ?? '') ? own : textTone(accent, paper, ink),
      onAccent: HEX.test(on ?? '') ? on : onTone(accent, { reverse, primary, ink }),
      accentOnDark: HEX.test(dark ?? '') ? dark : darkGroundTone(accent, ground, reverse)
    }
  })
}

export const productOf = (brand, id) => {
  const items = productsOf(brand)
  const item = typeof id === 'object' && id ? items.find((entry) => entry.id === id.id) : items.find((entry) => entry.id === id)
  if (!item) throw new Error(`${brand.name} has no product called ${typeof id === 'object' ? id?.id : id}`)
  return item
}

/** The arrangements a brand offers, in order. `compact` needs a symbol that may stand alone. */
export const productArrangements = (brand) => (brand.products?.lockup?.arrangements ?? PRODUCT_ARRANGEMENTS)
  .filter((id) => PRODUCT_ARRANGEMENTS.includes(id) && (id !== 'compact' || standaloneSymbol(brand)))

/** The tile styles a brand offers. `symbol` needs a symbol that may stand alone. */
export const productTileStyles = (brand) => (brand.products?.tile?.styles ?? PRODUCT_TILE_STYLES)
  .filter((id) => PRODUCT_TILE_STYLES.includes(id) && (id !== 'symbol' || standaloneSymbol(brand)))

/** The named combinations being compared, each `{ id, label, summary?, arrangement, tile }`. */
export const productDirections = (brand) => (brand.products?.directions ?? [])
  .filter((entry) => productArrangements(brand).includes(entry.arrangement))

/** The chosen direction, or null while proposals are still being compared. */
export const productDirection = (brand) => productDirections(brand).find((entry) => entry.id === brand.products?.direction) ?? null

/** The arrangement used where only one is wanted: the chosen direction's, else the first offered. */
export const defaultProductArrangement = (brand) => productDirection(brand)?.arrangement ?? productArrangements(brand)[0]
export const defaultProductTile = (brand) => {
  const styles = productTileStyles(brand)
  const chosen = productDirection(brand)?.tile
  return styles.includes(chosen) ? chosen : styles[0]
}

/** Which logo is the parent: a fixed family in its horizontal layout, or a signature. */
export const productParent = (brand) => {
  const spec = brand.products?.parent ?? {}
  if (brand.families?.length && !spec.signature) {
    const entry = findFamily(brand, spec.family)
    return { family: entry.id, entry, label: entry.label ?? entry.id }
  }
  const signature = brand.signatures?.find((entry) => entry.id === spec.signature) ?? brand.signatures?.[0]
  if (!signature) throw new Error(`${brand.name} has no logo to be a product family's parent.`)
  return { signature: signature.id, colourway: spec.colourway, label: signature.label ?? signature.id }
}

/** The parent logo exactly as lockup() draws it: `{ width, height, art }`. */
export const productParentLockup = (ctx, { colour, colourway } = {}) => {
  const parent = productParent(ctx.brand)
  return parent.family
    ? lockup(ctx, { family: parent.family, layout: 'horizontal', colour })
    : lockup(ctx, { signature: parent.signature, colourway: colour ? undefined : colourway ?? parent.colourway, colour })
}

// --- Lettering and pictograms --------------------------------------------------------------------

const fontKey = (brand, wanted, fallback) => (brand.fonts?.[wanted] ? wanted : brand.fonts?.[fallback] ? fallback : 'body')

/**
 * One line of product lettering with its left edge at x and its baseline at y: outlined when the
 * face is loaded, live text in the face's stack when it is not. `{ art, width, top, bottom }`.
 */
const setLine = (ctx, text, key, size, x, y, tracking, fill) => {
  const { brand, fonts } = ctx
  const count = Array.from(text).length
  if (fonts?.has(key)) {
    const width = fonts.width(text, key, size, tracking)
    const box = fonts.bounds?.(text, key, size, tracking)
    return {
      art: `<path fill="${fill}" aria-label="${escape(text)}" d="${fonts.path(text, key, size, x, y, tracking)}"/>`,
      width, top: y + (box?.y1 ?? -0.72 * size), bottom: y + Math.max(0, box?.y2 ?? 0)
    }
  }
  const face = faceOf(brand, key)
  const width = count * size * 0.55 + Math.max(0, count - 1) * size * tracking
  return {
    art: `<text x="${n(x)}" y="${n(y)}" font-family="${escape(face.stack ?? 'sans-serif')}" font-size="${n(size)}" font-weight="${face.weight ?? 400}"${face.style ? ` font-style="${face.style}"` : ''}${tracking ? ` letter-spacing="${n(tracking * size)}"` : ''} fill="${fill}">${escape(text)}</text>`,
    width, top: y - 0.72 * size, bottom: y + (/[gjpqy,;()]/.test(text) ? 0.22 * size : 0)
  }
}

/** A product's pictogram: `{ markup, size }` in its own square, drawn in currentColor; null if it has none. */
export const productPictogram = (brand, item) => {
  const spec = typeof item.icon === 'string' ? brand.icons?.items?.find((entry) => entry.id === item.icon) : item.icon
  if (!spec?.content) return null
  const size = spec.size ?? brand.icons?.size ?? 64
  return { markup: `<g${attrs(spec.attrs ?? brand.icons?.attrs ?? DEFAULT_ICON_ATTRS)}>${spec.content}</g>`, size }
}

/** A pictogram in a box, painted: currentColor becomes the colour itself, so it survives every renderer. */
const placePictogram = (pictogram, x, y, box, colour) => {
  const markup = colour === 'currentColor' ? pictogram.markup : pictogram.markup.replaceAll('currentColor', colour)
  return `<g data-product-icon="" transform="translate(${n(x)} ${n(y)}) scale(${n(box / pictogram.size)})">${markup}</g>`
}

/** The brand symbol fitted in a box (centred on its longer side). */
const placeSymbol = (ctx, x, y, box, colour, micro = false) => {
  const [, , sw, sh] = ctx.brand.symbol.viewBox
  const scale = box / Math.max(sw, sh)
  return `<g transform="translate(${n(x + (box - sw * scale) / 2)} ${n(y + (box - sh * scale) / 2)}) scale(${n(scale)})">${mark(ctx, colour, micro)}</g>`
}

// --- Lockups -------------------------------------------------------------------------------------

const lettering = (brand) => {
  const spec = brand.products?.lockup ?? {}
  return {
    name: { font: fontKey(brand, spec.name?.font ?? 'display', 'display'), tracking: spec.name?.tracking ?? brand.typography?.headlines?.trackingEm ?? 0, size: spec.name?.size, leadSize: spec.name?.leadSize },
    label: { font: fontKey(brand, spec.label?.font ?? 'label', 'label'), tracking: spec.label?.tracking ?? brand.typography?.labels?.trackingEm ?? 0.12, caps: spec.label?.caps !== false, size: spec.label?.size }
  }
}

/**
 * Where the parent's lettering sits, as a fraction of its artwork height: `products.lockup.baseline`,
 * or the foot of a fixed family's wordmark (1 where the lettering is as tall as the symbol), or 1.
 */
const baselineOf = (brand, parent) => {
  const given = brand.products?.lockup?.baseline
  if (typeof given === 'number' && Number.isFinite(given)) return given
  if (!parent.entry) return 1
  const settings = brand.lockup ?? {}
  const typeHeight = parent.entry.typeHeight ?? settings.typeHeight ?? settings.iconHeight
  if (parent.entry.lockupSymbol === false || !typeHeight || !settings.iconHeight) return 1
  const body = Math.max(typeHeight, settings.iconHeight)
  return ((body - typeHeight) / 2 + typeHeight) / body
}

/** The left edge of the parent's lettering in its canvas: past the symbol, for a family that has one. */
const letteringLeft = (brand, parent, pad) => {
  if (!parent.entry || parent.entry.lockupSymbol === false) return pad
  const [, , sw, sh] = brand.symbol.viewBox
  return pad + sw * (brand.lockup.iconHeight / sh) + (brand.lockup.iconGap ?? 0)
}

/**
 * A product's lockup: `{ width, height, art, parent }`, on a canvas with the brand's
 * `lockup.canvasPadding` round it, as lockup() returns a logo. `parent` is where the parent logo's
 * own canvas sits in it (`{ x, y, width, height }`, never scaled), or null for `compact`.
 *
 * `colour` paints the logo and the lettering (a signature brand may name a `colourway` instead);
 * `accent: false`, or an inherited colour, draws the rule, bar and tile in that colour too.
 */
export const productLockup = (ctx, { product, arrangement, colour: given, colourway, accent = true, descriptor = false } = {}) => {
  const { brand } = ctx
  const item = productOf(brand, product)
  const offered = productArrangements(brand)
  const kind = arrangement ?? defaultProductArrangement(brand)
  if (!PRODUCT_ARRANGEMENTS.includes(kind)) throw new Error(`Unknown product arrangement: ${kind}`)
  if (kind === 'compact' && !standaloneSymbol(brand)) throw new Error(`${brand.name} artwork must use the complete-logo placement, not a symbol or motif.`)
  if (!offered.includes(kind) && kind !== 'compact') throw new Error(`${brand.name} does not offer the ${kind} product arrangement.`)

  const parent = productParent(brand)
  const drawn = productParentLockup(ctx, { colour: given, colourway })
  const pad = brand.lockup?.canvasPadding ?? 0
  const { width: PW, height: PH } = drawn
  const H = PH - 2 * pad
  const B = pad + H * baselineOf(brand, parent)
  // The colour the lettering is set in: the logo's own, or the colourway's type colour.
  const ink = given ?? (parent.signature ? paintFor(brand, colourway ?? parent.colourway ?? brand.defaultColourway ?? Object.keys(brand.colourways ?? {})[0])('type') : 'currentColor')
  const coloured = accent && ink !== 'currentColor'
  // A light logo colour means a dark ground, where some accents would sink: the rule and bar take
  // the accent's dark-ground tone there. A filled tile keeps the accent itself.
  const reversed = coloured && HEX.test(ink) && luminance(ink) > 0.5
  const tone = coloured ? (reversed ? item.accentOnDark : item.accent) : ink
  const type = lettering(brand)
  const caps = (text) => (type.label.caps ? String(text).toUpperCase() : String(text))
  const describe = descriptor && item.descriptor ? String(item.descriptor) : ''
  const parts = []
  let right = 0
  let bottom = 0
  const grow = (x, y) => { right = Math.max(right, x); bottom = Math.max(bottom, y) }
  const line = (text, face, size, x, y, fill = ink) => {
    const set = setLine(ctx, text, face.font, size, x, y, face.tracking, fill)
    parts.push(set.art)
    grow(x + set.width, set.bottom)
    return set
  }
  const placeParent = (x, y) => {
    parts.push(`<g data-parent-logo="${escape(parent.family ?? parent.signature)}" transform="translate(${n(x)} ${n(y)})">${drawn.art}</g>`)
    grow(x + PW - pad, y + PH - pad)
    return { x, y, width: PW, height: PH }
  }
  const ruleAndName = (x) => {
    const stroke = Math.max(1, H / 48)
    const ruleX = x + 0.3 * H
    parts.push(`<path data-product-rule="" d="M${n(ruleX)} ${n(pad)}V${n(pad + H)}" fill="none" stroke="${tone}" stroke-width="${n(stroke)}"/>`)
    grow(ruleX + stroke / 2, pad + H)
    const nameX = ruleX + 0.3 * H
    line(item.name, type.name, (type.name.size ?? 0.6) * H, nameX, B)
    if (describe) line(caps(describe), type.label, (type.label.size ?? 0.115) * H, nameX, B + 0.3 * H)
  }

  let placed = null
  if (kind === 'endorsed') {
    placed = placeParent(0, 0)
    ruleAndName(PW - pad)
  } else if (kind === 'label') {
    placed = placeParent(0, 0)
    const x = letteringLeft(brand, parent, pad)
    const barHeight = Math.max(2, H / 24)
    parts.push(`<rect data-product-rule="" x="${n(x)}" y="${n(B + 0.2 * H)}" width="${n(0.5 * H)}" height="${n(barHeight)}" fill="${tone}"/>`)
    grow(x + 0.5 * H, B + 0.2 * H + barHeight)
    line(caps(item.name), type.label, (type.label.size ?? 0.2) * H, x, B + 0.56 * H)
    if (describe) line(caps(describe), type.label, 0.115 * H, x, B + 0.78 * H)
  } else if (kind === 'product-led') {
    const K = 1.5 * H
    const pictogram = productPictogram(brand, item)
    const tile = Boolean(pictogram) || standaloneSymbol(brand)
    if (tile) {
      const inset = 0.2 * K
      const stroke = Math.max(1, K / 36)
      // In one colour the tile is an outline and the pictogram takes the logo's colour.
      parts.push(coloured
        ? `<rect data-product-tile="" x="${n(pad)}" y="${n(pad)}" width="${n(K)}" height="${n(K)}" rx="${n(0.16 * K)}" fill="${item.accent}"/>`
        : `<rect data-product-tile="" x="${n(pad + stroke / 2)}" y="${n(pad + stroke / 2)}" width="${n(K - stroke)}" height="${n(K - stroke)}" rx="${n(0.16 * K - stroke / 2)}" fill="none" stroke="${ink}" stroke-width="${n(stroke)}"/>`)
      const paint = coloured ? item.onAccent : ink
      parts.push(pictogram ? placePictogram(pictogram, pad + inset, pad + inset, K - 2 * inset, paint) : placeSymbol(ctx, pad + inset, pad + inset, K - 2 * inset, paint))
      grow(pad + K, pad + K)
    }
    const nameX = tile ? pad + K + 0.35 * H : pad
    line(item.name, type.name, (type.name.leadSize ?? 1.05) * H, nameX, pad + 0.74 * K)
    if (describe) line(caps(describe), type.label, 0.14 * H, nameX, pad + 0.74 * K + 0.3 * H)
    // The parent signs off beneath, its artwork 0.3 H under the tile.
    placed = placeParent(0, K + 0.3 * H)
  } else {
    const [, , sw, sh] = brand.symbol.viewBox
    const scale = H / sh
    parts.push(`<g transform="translate(${n(pad)} ${n(pad)}) scale(${n(scale)})">${mark(ctx, ink)}</g>`)
    grow(pad + sw * scale, pad + H)
    ruleAndName(pad + sw * scale)
  }
  return {
    width: Math.max(placed ? placed.x + PW : 0, right + pad),
    height: Math.max(placed ? placed.y + PH : 0, bottom + pad),
    art: parts.join(''),
    parent: placed
  }
}

/** A product lockup as a file: on a transparent canvas, as logoDocument() makes a logo. */
export const productDocument = (ctx, { product, arrangement, colour, colourKey, colourway, accent, descriptor } = {}) => {
  const { brand } = ctx
  const item = productOf(brand, product)
  const kind = arrangement ?? defaultProductArrangement(brand)
  const resolved = colour ?? (colourKey == null ? undefined : colourKey === 'currentColor' ? 'currentColor' : resolveColour(brand, colourKey))
  const { width, height, art } = productLockup(ctx, { product: item.id, arrangement: kind, colour: resolved, colourway, accent: accent ?? resolved !== 'currentColor', descriptor })
  const paint = colourway ?? (colourKey === 'currentColor' || resolved === 'currentColor' ? 'currentcolor' : colourKey ?? resolved ?? 'currentcolor')
  return svgDocument(ctx, width, height, art, `${brand.name} / ${item.name} / ${kind} / ${paint}`)
}

// --- App tiles -----------------------------------------------------------------------------------

/**
 * A product's square tile, 1024 on a side:
 *   symbol  the brand symbol reversed on the primary colour, over a band of the accent
 *   icon    the pictogram on the accent, the brand symbol small in the corner
 *   paper   the pictogram in the accent's text tone on paper, the brand symbol small in the corner
 */
export const productTile = (ctx, { product, style } = {}) => {
  const { brand } = ctx
  const item = productOf(brand, product)
  const kind = style ?? defaultProductTile(brand)
  if (!PRODUCT_TILE_STYLES.includes(kind)) throw new Error(`Unknown product tile style: ${kind}`)
  const size = 1024
  const symbolAllowed = standaloneSymbol(brand)
  const micro = brand.symbol.microRadius != null || Boolean(brand.symbol.microPaths) || Boolean(brand.symbol.microMarkup)
  const pictogram = productPictogram(brand, item)
  let art
  if (kind === 'symbol') {
    const band = Math.round(size * 0.12)
    const area = size - band
    const [, , sw, sh] = brand.symbol.viewBox
    const scale = Math.min((brand.web?.appIcon?.size ?? 760) / sw, (area * 0.8) / sh, (size * 0.8) / sw)
    art = `<rect width="${size}" height="${size}" fill="${resolveColour(brand, 'primary')}"/>`
      + `<rect data-product-rule="" y="${area}" width="${size}" height="${band}" fill="${item.accent}"/>`
      + `<g transform="translate(${n((size - sw * scale) / 2)} ${n((area - sh * scale) / 2)}) scale(${n(scale)})">${mark(ctx, resolveColour(brand, 'reverse'))}</g>`
  } else {
    const [ground, paint, corner] = kind === 'icon'
      ? [item.accent, item.onAccent, item.onAccent]
      : [resolveColour(brand, 'paper'), item.accentText, resolveColour(brand, 'primary')]
    const main = size * 0.56
    const small = size * 0.16
    const margin = size * 0.08
    art = `<rect width="${size}" height="${size}" fill="${ground}"/>`
    if (pictogram) {
      art += placePictogram(pictogram, (size - main) / 2, (size - main) / 2, main, paint)
      if (symbolAllowed) art += placeSymbol(ctx, size - margin - small, size - margin - small, small, corner, micro)
    } else if (symbolAllowed) {
      art += placeSymbol(ctx, (size - main) / 2, (size - main) / 2, main, paint)
    }
  }
  return svgDocument(ctx, size, size, art, `${brand.name} / ${item.name} / ${kind} tile`)
}

/** The family as data, for tokens and for applications that do not run the engine. */
export const productTokens = (brand) => Object.fromEntries(productsOf(brand).map((item) => [item.id, {
  name: item.name,
  fullName: item.fullName ?? null,
  descriptor: item.descriptor ?? null,
  accent: item.accent,
  accentText: item.accentText,
  onAccent: item.onAccent,
  accentOnDark: item.accentOnDark
}]))
