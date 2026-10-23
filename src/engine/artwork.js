// The identity itself: the symbol, the wordmark, and the lockups that combine them.
//
// Every function takes a render context, `{ brand, fonts }`. `fonts` is a font provider (see
// src/fonts/provider.js) and is only needed by wordmarks set from a typeface rather than drawn;
// a brand whose wordmark is all outlines renders without one.

import { colour as resolveColour, family as findFamily, fill } from './brand.js'
import { attrs, escape, n } from './format.js'
import { paintFor, paintMarkup, signatureLockup } from './signatures.js'

const symbolViewBox = (brand) => {
  const [, , width, height] = brand.symbol.viewBox
  return { width, height }
}

/**
 * The symbol, as a group drawn in its own viewBox units.
 *
 * A symbol is one of: a grid of equal circles (`centres` + `radius`), a list of paths, or a piece
 * of supplied markup (for a mark that is artwork rather than geometry). `micro` asks for the
 * optical small-size variant where the brand defines one.
 */
export const mark = ({ brand }, colour = 'currentColor', micro = false, symbolId) => {
  const symbol = (symbolId && brand.symbols?.[symbolId]) || brand.symbol
  const size = micro ? 'micro' : 'standard'
  // A colourway's paint function colours a layered symbol part by part ({upper}, {lower}…);
  // a plain colour paints all of it.
  const paint = typeof colour === 'function' ? colour : () => colour
  const groupFill = typeof colour === 'function' ? colour('symbol') : colour
  let inner
  if (symbol.centres) {
    const radius = micro ? (symbol.microRadius ?? symbol.radius) : symbol.radius
    inner = symbol.centres.map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(radius)}"/>`).join('')
  } else if (symbol.paths) {
    const paths = (micro && symbol.microPaths) || symbol.paths
    inner = paths.map((path) => (typeof path === 'string'
      ? `<path d="${path}"/>`
      : `<path d="${path.d}"${path.fillRule ? ` fill-rule="${path.fillRule}"` : ''}${path.fill ? ` fill="${resolveColour(brand, path.fill)}"` : ''}/>`)).join('')
  } else {
    inner = paintMarkup((micro && symbol.microMarkup) || symbol.markup, paint)
  }
  return `<g data-brand-symbol="${escape(symbol.name ?? 'symbol')}" data-size="${size}" fill="${groupFill}">${inner}</g>`
}

const wordmarkPart = ({ brand, fonts }, part, colour, subtextColour) => {
  const glyphs = brand.wordmark.glyphs ?? {}
  const paint = subtextColour != null && part.attrs?.['data-line'] === 'subtext' ? { fill: subtextColour } : {}
  if (part.glyph) {
    const offset = part.y ? `${part.x ?? 0} ${part.y}` : `${part.x ?? 0} 0`
    return `<path${attrs({ ...part.attrs, ...paint })} d="${glyphs[part.glyph]}" transform="translate(${offset})"${part.fillRule ? ` fill-rule="${part.fillRule}"` : ''}/>`
  }
  if (part.element) {
    const filled = Object.fromEntries(Object.entries({ ...part.attrs, ...paint }).map(([key, value]) => [key, String(value).replace('{colour}', colour)]))
    return `<${part.element}${attrs(filled)}>${escape(part.content ?? '')}</${part.element}>`
  }
  if (part.text != null) {
    // A wordmark set from a typeface: outlined when the face is loaded, live text otherwise.
    const key = part.font ?? 'display'
    const tracking = part.tracking ?? 0
    const d = fonts?.has(key) ? fonts.path(part.text, key, part.size, part.x ?? 0, part.y ?? 0, tracking) : ''
    if (d) return `<path${attrs(paint)} data-word="${escape(part.text)}" d="${d}"/>`
    const face = brand.fonts?.[key] ?? {}
    return `<text${attrs(paint)} x="${n(part.x ?? 0)}" y="${n(part.y ?? 0)}" font-family="${escape(face.stack ?? 'sans-serif')}" font-size="${n(part.size)}" font-weight="${face.weight ?? 400}" letter-spacing="${n(tracking * part.size)}">${escape(part.text)}</text>`
  }
  return ''
}

/**
 * The wordmark for a family, in wordmark units (`wordmark.height` tall).
 *
 * `mode` is 'outlined' (production) or one of the brand's `wordmark.editable` alternatives, which
 * keep some or all of the lettering as live, font-dependent text.
 */
export const words = (ctx, wordmarkId, mode = 'outlined', colour = 'currentColor', { subtextColour } = {}) => {
  const wordmark = ctx.brand.wordmark
  if (mode !== 'outlined') {
    const editable = wordmark.editable?.[mode]
    if (!editable) throw new Error(`Unknown wordmark mode: ${mode}`)
    const pieces = editable.parts.map((part) => wordmarkPart(ctx, part, colour, subtextColour)).join('')
    return editable.wrap ? `<g data-wordmark="${escape(wordmarkId)}" fill="${colour}">${pieces}</g>` : pieces
  }
  const variant = wordmark.variants[wordmarkId]
  if (!variant) throw new Error(`Unknown wordmark: ${wordmarkId}`)
  return `<g data-wordmark="${escape(wordmarkId)}" fill="${colour}">${variant.parts.map((part) => wordmarkPart(ctx, part, colour, subtextColour)).join('')}</g>`
}

export const LAYOUTS = ['horizontal', 'stacked', 'wordmark', 'wordmark-stacked', 'symbol']

/**
 * A complete lockup: `{ width, height, art }`, where `art` is drawn in a canvas of that size with
 * the brand's `lockup.canvasPadding` on every side.
 */
export const lockup = (ctx, { family: familyId, layout = 'horizontal', mode = 'outlined', colour: given, wordmarkColour, subtextColour, showWordmark = true, signature, colourway } = {}) => {
  const { brand } = ctx
  // A brand whose logo is composed (brand.signatures) rather than a fixed wordmark: the layout
  // names the signature, and a colourway, or else a single colour, paints it. With neither, the
  // brand's default colourway does.
  if (signature || (!brand.families?.length && brand.signatures?.length)) {
    // A signature is named explicitly; a fixed-wordmark layout name ('horizontal') is not one.
    const id = signature ?? brand.signatures[0].id
    return signatureLockup(ctx, { signature: id, colourway, colour: colourway ? undefined : given })
  }
  const colour = given ?? 'currentColor'
  const lettering = wordmarkColour ?? colour
  const drawWords = (id) => words(ctx, id, mode, lettering, { subtextColour })
  const wordmark = brand.wordmark
  const settings = brand.lockup
  const entry = findFamily(brand, familyId)
  const variant = wordmark.variants[entry.wordmark]
  const pad = settings.canvasPadding ?? 0
  const left = wordmark.left ?? 0
  const baseWidth = variant.width - left
  // A variant may be its own height (a wordmark without its subtext line, a stacked one).
  const variantHeight = variant.height ?? wordmark.height
  const { width: sw, height: sh } = symbolViewBox(brand)

  if (layout === 'symbol' || !showWordmark) {
    return { width: sw + 2 * pad, height: sh + 2 * pad, art: `<g transform="translate(${pad} ${pad})">${mark(ctx, colour)}</g>` }
  }
  /** A wordmark variant alone, `height` tall. */
  const wordmarkOnly = (wordmarkId, height) => {
    const chosen = wordmark.variants[wordmarkId]
    const scale = height / (chosen.height ?? wordmark.height)
    const art = `<g transform="translate(${n(pad - left * scale)} ${pad}) scale(${n(scale)})">${drawWords(wordmarkId)}</g>`
    return { width: (chosen.width - left) * scale + 2 * pad, height: height + 2 * pad, art }
  }
  if (layout === 'wordmark' || layout === 'wordmark-stacked') {
    return wordmarkOnly(layout === 'wordmark-stacked' ? entry.stackedWordmark ?? entry.wordmark : entry.wordmark, settings.wordmarkHeight)
  }
  // A family whose logo is its lettering alone (`lockupSymbol: false`) draws no symbol beside or
  // above it: horizontal is its wordmark at `typeHeight`, stacked is `stackedWordmark` (or its own).
  if (entry.lockupSymbol === false && layout === 'stacked') {
    return wordmarkOnly(entry.stackedWordmark ?? entry.wordmark, entry.stackedTypeHeight ?? settings.stackedTypeHeight)
  }
  if (entry.lockupSymbol === false && layout === 'horizontal') {
    return wordmarkOnly(entry.wordmark, entry.typeHeight ?? settings.typeHeight ?? settings.iconHeight)
  }
  if (layout === 'stacked') {
    const iconHeight = settings.stackedIconHeight
    const iconScale = iconHeight / sh
    const iconWidth = sw * iconScale
    const typeHeight = entry.stackedTypeHeight ?? settings.stackedTypeHeight
    const scale = typeHeight / variantHeight
    const typeWidth = baseWidth * scale
    const width = Math.max(iconWidth, typeWidth)
    let art = `<g transform="translate(${n(pad + (width - iconWidth) / 2)} ${pad}) scale(${n(iconScale)})">${mark(ctx, colour)}</g>`
    art += `<g transform="translate(${n(pad + (width - typeWidth) / 2 - left * scale)} ${n(pad + iconHeight + settings.stackedGap)}) scale(${n(scale)})">${drawWords(entry.wordmark)}</g>`
    return { width: width + 2 * pad, height: iconHeight + settings.stackedGap + typeHeight + 2 * pad, art }
  }
  if (layout !== 'horizontal') throw new Error(`Unknown layout: ${layout}`)
  const typeHeight = entry.typeHeight ?? settings.typeHeight ?? settings.iconHeight
  const scale = typeHeight / variantHeight
  const iconHeight = settings.iconHeight
  const iconScale = iconHeight / sh
  const iconWidth = sw * iconScale
  const bodyHeight = Math.max(typeHeight, iconHeight)
  let art = `<g transform="translate(${pad} ${n(pad + (bodyHeight - iconHeight) / 2)}) scale(${n(iconScale)})">${mark(ctx, colour)}</g>`
  art += `<g transform="translate(${n(pad + iconWidth + settings.iconGap - left * scale)} ${n(pad + (bodyHeight - typeHeight) / 2)}) scale(${n(scale)})">${drawWords(entry.wordmark)}</g>`
  return { width: 2 * pad + iconWidth + settings.iconGap + baseWidth * scale, height: 2 * pad + bodyHeight, art }
}

/** A standalone artwork document: what every logo, symbol, pattern, icon and guide page is. */
export const svgDocument = ({ brand }, width, height, art, title, { background, desc, units = '' } = {}) => {
  const backdrop = background ? `<rect width="100%" height="100%" fill="${background}"/>` : ''
  const description = desc ?? fill(brand, brand.copy?.svgDescription ?? '{name} identity artwork.')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width)}${units}" height="${n(height)}${units}" viewBox="0 0 ${n(width)} ${n(height)}" role="img" aria-label="${escape(title)}">`
    + `<title>${escape(title)}</title><desc>${escape(description)}</desc>${backdrop}${art}</svg>`
}

/** Python wrote pattern scales as literals (".6"); a number prints the same way here. */
const scaleText = (value) => String(value).replace(/^0\./, '.')

const opacityAttr = (value) => (value == null || value === 1 ? '' : ` opacity="${n(value)}"`)

/**
 * A supporting pattern: the symbol repeated on a grid, or placed at given positions, over any
 * `dots` ({ cx, cy, r, colour, opacity? }) and `lines` ({ points: [[x, y], …], colour, width, opacity? }).
 */
export const pattern = (ctx, spec) => {
  const { brand } = ctx
  let art = ''
  for (const dot of spec.dots ?? []) art += `<circle cx="${n(dot.cx)}" cy="${n(dot.cy)}" r="${n(dot.r)}" fill="${resolveColour(brand, dot.colour)}"${opacityAttr(dot.opacity)}/>`
  for (const line of spec.lines ?? []) art += `<polyline points="${line.points.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')}" fill="none" stroke="${resolveColour(brand, line.colour)}" stroke-width="${n(line.width ?? 1)}"${opacityAttr(line.opacity)}/>`
  if (spec.repeat) {
    const { x: [x0, x1, dx], y: [y0, y1, dy], scale, colour } = spec.repeat
    for (let y = y0; y < y1; y += dy) {
      for (let x = x0; x < x1; x += dx) {
        art += `<g transform="translate(${x} ${y}) scale(${scaleText(scale)})">${mark(ctx, resolveColour(brand, colour))}</g>`
      }
    }
  }
  for (const place of spec.place ?? []) {
    const symbol = (place.symbol && brand.symbols?.[place.symbol]) || brand.symbol
    const [vx, vy, sw, sh] = symbol.viewBox
    const rotation = place.rotation ? ` rotate(${n(place.rotation)} ${n(vx + sw / 2)} ${n(vy + sh / 2)})` : ''
    art += `<g transform="translate(${place.x} ${place.y}) scale(${scaleText(place.scale)})${rotation}">${mark(ctx, resolveColour(brand, place.colour), false, place.symbol)}</g>`
  }
  return svgDocument(ctx, spec.width, spec.height, art, fill(brand, spec.title ?? '{name} / {pattern}', { pattern: spec.id }), { background: resolveColour(brand, spec.background) })
}

/** A supporting icon, drawn in currentColor so it takes the colour of the text around it. */
export const icon = (ctx, item) => {
  const { brand } = ctx
  const icons = brand.icons
  const size = item.size ?? icons.size ?? 64
  const title = fill(brand, icons.title ?? '{name} / {icon} icon', { icon: item.id })
  return svgDocument(ctx, size, size, `<g${attrs(icons.attrs ?? {})}>${item.content}</g>`, title)
}

/** A signature file: one signature, in one colourway, filled with `values` (a ministry…). */
export const signatureDocument = (ctx, { signature, colourway, values, title }) => {
  const { brand } = ctx
  const { width, height, art } = signatureLockup({ ...ctx, values: values ?? ctx.values }, { signature, colourway })
  const entry = brand.signatures.find((item) => item.id === signature) ?? brand.signatures[0]
  return svgDocument(ctx, width, height, art, title ?? `${brand.name} / ${entry.label ?? entry.id} / ${colourway}`)
}

/** A whole logo file: lockup on a transparent canvas. */
export const logoDocument = (ctx, { family, layout, mode = 'outlined', colour, colourKey, wordmarkColour, subtextColour, showWordmark, signature, colourway, values }) => {
  const { brand } = ctx
  if (signature) {
    const entry = brand.signatures.find((item) => item.id === signature)
    const { width, height, art } = lockup({ ...ctx, values: values ?? ctx.values }, { signature, colourway, colour })
    return svgDocument(ctx, width, height, art, `${brand.name} / ${entry?.label ?? signature} / ${colourway ?? (colour === 'currentColor' ? 'currentcolor' : colour)}`)
  }
  const resolved = colour ?? resolveColour(brand, colourKey)
  const { width, height, art } = lockup(ctx, { family, layout, mode, colour: resolved,
    wordmarkColour: wordmarkColour == null ? undefined : resolveColour(brand, wordmarkColour),
    subtextColour: subtextColour == null ? undefined : resolveColour(brand, subtextColour), showWordmark })
  const key = colourKey === 'currentColor' ? 'currentcolor' : colourKey
  const title = mode === 'outlined'
    ? `${family} / ${layout} / ${key}`
    : fill(brand, brand.wordmark.editable[mode].title ?? `{name} / ${mode}`)
  return svgDocument(ctx, width, height, art, title)
}

const COUNT_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve']

export const symbolDocument = (ctx, { colourKey, micro = false, master = false, symbolId, colourway }) => {
  const { brand } = ctx
  if (symbolId) {
    const other = brand.symbols[symbolId]
    const [x, y, w, h] = other.viewBox
    const ink = colourKey ? resolveColour(brand, colourKey) : paintFor(brand, colourway)
    const art = `<g transform="translate(${n(-x)} ${n(-y)})">${mark(ctx, ink, false, symbolId)}</g>`
    return svgDocument(ctx, w, h, art, `${brand.name} / ${other.title ?? `${symbolId} symbol`} / ${colourway ?? colourKey}`)
  }
  const symbol = brand.symbol
  const { width, height } = symbolViewBox(brand)
  const art = mark(ctx, colourKey ? (colourKey === 'currentColor' ? 'currentColor' : resolveColour(brand, colourKey)) : 'currentColor', micro)
  if (micro) return svgDocument(ctx, width, height, art, `${brand.name} / micro symbol`, { desc: symbol.microDescription })
  if (master) {
    const count = COUNT_WORDS[symbol.centres?.length] ?? String(symbol.centres?.length)
    const even = symbol.horizontalPitch != null && symbol.horizontalPitch === symbol.verticalPitch
    const desc = symbol.masterDescription ?? (symbol.centres
      ? `${count} equal circles, radius ${n(symbol.radius)}; centres ${symbol.centres.map(([x, y]) => `(${n(x)},${n(y)})`).join(', ')}.${even ? ' Horizontal and vertical spacing are equal.' : ''}`
      : undefined)
    return svgDocument(ctx, width, height, art, `${brand.name} / ${symbol.masterTitle ?? 'symbol master'}`, { desc })
  }
  const key = colourKey === 'currentColor' ? 'currentcolor' : colourKey
  return svgDocument(ctx, width, height, art, `${brand.name} / ${symbol.title ?? 'symbol'} / ${key}`)
}
