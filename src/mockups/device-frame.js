// Drawing screen mockups: one device (`deviceArt`) and a scene of several (`sceneSvg`), as SVG.
// A device is drawn from its numbers in device-catalog.js, in the pixels of its own screen, or,
// for a frame a brand supplies, from that frame's image over the screen. Whatever goes on a
// screen (a screenshot, a brand screen) is an image clipped to the screen's shape, so the result
// is one self-contained SVG that draws the same in the app, in an export and in a test.

import { CANVASES, FINISHES, PRESETS, bezelOf } from './device-catalog.js'

const n = (value) => Number(value.toFixed(2))
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const isHex = (value) => /^#[0-9a-f]{6}$/i.test(value ?? '')
const channels = (value) => [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16))
const mix = (a, b, amount) => `#${channels(a).map((channel, index) => Math.round(channel + (channels(b)[index] - channel) * amount).toString(16).padStart(2, '0')).join('')}`

/** An SVG document as an image address, for a screen or a nested drawing. */
export const svgDataUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

/** A device's finish as colours. `brand` takes the brand's own colour for the body. */
export const finishOf = (device, id, brandColour) => {
  const key = device.finishes?.includes(id) ? id : device.finishes?.[0] ?? 'graphite'
  if (key !== 'brand') return { id: key, ...FINISHES[key] }
  const body = isHex(brandColour) ? brandColour.toLowerCase() : FINISHES.graphite.body
  return { id: 'brand', label: FINISHES.brand.label, rim: mix(body, '#ffffff', 0.24), body, bezel: '#0c0d0f', detail: mix(body, '#000000', 0.32) }
}

/** A rectangle with a radius for each corner, `[top-left, top-right, bottom-right, bottom-left]`. */
const roundedPath = (x, y, w, h, [tl, tr, br, bl]) => {
  const cap = (r) => Math.max(0, Math.min(r, w / 2, h / 2))
  const [a, b, c, d] = [tl, tr, br, bl].map(cap)
  return `M${n(x + a)} ${n(y)}H${n(x + w - b)}${b ? `A${n(b)} ${n(b)} 0 0 1 ${n(x + w)} ${n(y + b)}` : ''}V${n(y + h - c)}${c ? `A${n(c)} ${n(c)} 0 0 1 ${n(x + w - c)} ${n(y + h)}` : ''}H${n(x + d)}${d ? `A${n(d)} ${n(d)} 0 0 1 ${n(x)} ${n(y + h - d)}` : ''}V${n(y + a)}${a ? `A${n(a)} ${n(a)} 0 0 1 ${n(x + a)} ${n(y)}` : ''}Z`
}

const BAND = { phone: 5, tablet: 5, laptop: 3, desktop: 3, watch: 6, tv: 2, browser: 1 }

/** The camera cutouts and bezel details that sit over the screen, in the device's own pixels. */
const cutouts = (device, finish, { sx, sy, sw, sh, bt, bb }) => {
  const mid = sx + sw / 2
  const lens = (cx, cy, r) => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="#000000"/><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.42)}" fill="#1c2430"/>`
  let out = ''
  switch (device.cutout) {
    case 'island': out += `<rect x="${n(mid - sw * 0.16)}" y="${n(sy + 12)}" width="${n(sw * 0.32)}" height="36" rx="18" fill="#000000"/>`; break
    case 'punch': out += lens(mid, sy + 24, 9); break
    case 'punch-corner': out += lens(sx + sw - 40, sy + 30, 9); break
    case 'notch': out += `<path d="${roundedPath(mid - sw * 0.26, sy - 1, sw * 0.52, 32, [0, 0, 18, 18])}" fill="${finish.bezel}"/>`; break
    case 'camera': out += `<circle cx="${n(mid)}" cy="${n(sy - bt / 2)}" r="3.5" fill="${finish.id === 'white' ? '#3a3c40' : '#23262b'}"/>`; break
    case 'home': out += `<circle cx="${n(mid)}" cy="${n(sy + sh + bb / 2)}" r="26" fill="none" stroke="${finish.detail}" stroke-width="3"/><rect x="${n(mid - 32)}" y="${n(sy - bt / 2 - 3)}" width="64" height="6" rx="3" fill="${finish.detail}"/>`; break
    default:
  }
  if (device.hinge) out += `<rect x="${n(mid - 1)}" y="${n(sy)}" width="2" height="${n(sh)}" fill="#000000" opacity="0.16"/><rect x="${n(mid + 1)}" y="${n(sy)}" width="1.5" height="${n(sh)}" fill="#ffffff" opacity="0.1"/>`
  return out
}

/** What a base adds round the slab: `[top, right, bottom, left]`, in the device's pixels. */
const reach = (device, W, H) => {
  switch (device.base) {
    case 'laptop': return [0, W * 0.08, Math.max(18, W * 0.024), W * 0.08]
    case 'stand': return [0, 0, H * 0.19 + Math.max(10, H * 0.022), 0]
    case 'chin': return [0, 0, H * 0.28, 0]
    case 'feet': return [0, 0, H * 0.05, 0]
    case 'strap': return [H * 0.44, 8, H * 0.44, 0]
    default: return device.buttons ? [0, 4, 0, 4] : [0, 0, 0, 0]
  }
}

const base = (device, finish, { x, y, W, H }) => {
  const mid = x + W / 2
  switch (device.base) {
    case 'laptop': {
      const w = W * 1.16, h = Math.max(18, W * 0.024)
      return `<path d="${roundedPath(mid - w / 2, y + H, w, h, [2, 2, h * 0.7, h * 0.7])}" fill="${finish.body}"/>`
        + `<rect x="${n(mid - w / 2)}" y="${n(y + H)}" width="${n(w)}" height="${n(Math.max(2, h * 0.16))}" fill="${finish.rim}"/>`
        + `<path d="${roundedPath(mid - W * 0.07, y + H, W * 0.14, h * 0.42, [0, 0, h * 0.3, h * 0.3])}" fill="${finish.detail}"/>`
    }
    case 'stand': {
      const neck = H * 0.19, foot = Math.max(10, H * 0.022)
      return `<rect x="${n(mid - W * 0.05)}" y="${n(y + H - 4)}" width="${n(W * 0.1)}" height="${n(neck + 4)}" fill="${finish.body}"/>`
        + `<rect x="${n(mid - W * 0.05)}" y="${n(y + H)}" width="${n(W * 0.1)}" height="${n(neck * 0.18)}" fill="${finish.detail}" opacity="0.5"/>`
        + `<rect x="${n(mid - W * 0.16)}" y="${n(y + H + neck)}" width="${n(W * 0.32)}" height="${n(foot)}" rx="${n(foot / 2)}" fill="${finish.rim}"/>`
    }
    case 'chin': {
      const chin = H * 0.12, neck = H * 0.14, foot = Math.max(10, H * 0.02)
      return `<path d="M${n(mid - W * 0.06)} ${n(y + H + chin - 2)}h${n(W * 0.12)}l${n(W * 0.02)} ${n(neck + 2)}h${n(-W * 0.16)}Z" fill="${finish.body}"/>`
        + `<rect x="${n(mid - W * 0.13)}" y="${n(y + H + chin + neck)}" width="${n(W * 0.26)}" height="${n(foot)}" rx="${n(foot / 2)}" fill="${finish.rim}"/>`
        + `<path d="${roundedPath(x, y + H - device.corner, W, chin + device.corner, [0, 0, device.corner, device.corner])}" fill="${finish.rim}"/>`
    }
    case 'feet': {
      const h = H * 0.05
      const foot = (at, lean) => `<path d="M${n(x + W * at - 8)} ${n(y + H - 2)}h16l${n(-lean * h * 0.8)} ${n(h + 2)}h-16Z" fill="${finish.detail}"/>`
      return foot(0.16, 1) + foot(0.84, -1)
    }
    case 'strap': {
      const len = H * 0.44, w = W * 0.66
      return `<path d="${roundedPath(mid - w / 2, y - len, w, len + device.corner, [w * 0.2, w * 0.2, 0, 0])}" fill="${finish.detail}"/>`
        + `<path d="${roundedPath(mid - w / 2, y + H - device.corner, w, len + device.corner, [0, 0, w * 0.2, w * 0.2])}" fill="${finish.detail}"/>`
        + `<rect x="${n(x + W - 2)}" y="${n(y + H * 0.3)}" width="10" height="${n(H * 0.16)}" rx="4" fill="${finish.rim}"/>`
    }
    default: return ''
  }
}

/** A window's title bar: three dots, and for a browser an address field. */
const chrome = (device, finish, { x, y, W, bt }) => {
  if (!device.chrome) return ''
  const cy = y + bt / 2
  const dots = [0, 1, 2].map((index) => `<circle cx="${n(x + 24 + index * 22)}" cy="${n(cy)}" r="6.5" fill="${finish.detail}"/>`).join('')
  const field = device.chrome === 'browser' ? `<rect x="${n(x + W * 0.2)}" y="${n(cy - 15)}" width="${n(W * 0.6)}" height="30" rx="15" fill="${finish.bezel}" stroke="${finish.rim}"/>` : ''
  return dots + field
}

/**
 * One device, in the pixels of its own screen: its size, where its screen is, and the SVG that
 * goes under the screen (`under`) and over it (`over`). `turned` gives a phone or tablet a
 * quarter turn. `frameHref` is the image of a frame a brand supplies.
 */
export const deviceArt = (device, { finish: finishId, brandColour, turned = false, frameHref } = {}) => {
  const [sw, sh] = device.screen
  if (device.css) {
    // A frame a stylesheet draws: its markup, measured when the set was made. It has its own
    // pose on its side where its project drew one; otherwise it stays upright.
    const side = Boolean(turned && device.css.turned)
    const pose = side ? device.css.turned : device.css.upright
    const colour = device.finishes.includes(finishId) ? finishId : device.finishes[0] ?? ''
    return { width: pose.width, height: pose.height, turned: side, finish: { id: colour }, under: '', over: '',
      screen: { x: pose.screen.x, y: pose.screen.y, width: pose.screen.width, height: pose.screen.height, radii: [0, 0, 0, 0] },
      css: { markup: pose.markup, offset: pose.offset, colour } }
  }
  const finish = finishOf(device, finishId, brandColour)
  let art
  if (device.frame) {
    const { width, height, x, y, radius = 0 } = device.frame
    art = { width, height, screen: { x, y, width: sw, height: sh, radii: [radius, radius, radius, radius] }, under: '', over: frameHref ? `<image href="${esc(frameHref)}" width="${n(width)}" height="${n(height)}" preserveAspectRatio="none"/>` : `<rect width="${n(width)}" height="${n(height)}" fill="none" stroke="#888888" stroke-width="4"/>` }
  } else {
    const [bt, br, bb, bl] = bezelOf(device)
    const W = sw + bl + br, H = sh + bt + bb
    const [top, right, bottom, left] = reach(device, W, H)
    const band = device.band ?? BAND[device.category] ?? 4
    const box = { x: left, y: top, W, H, bt, bb, sx: left + bl, sy: top + bt, sw, sh }
    const buttons = device.buttons ? `<rect x="${n(left - 3)}" y="${n(top + H * 0.2)}" width="6" height="${n(H * 0.07)}" rx="2" fill="${finish.body}"/><rect x="${n(left - 3)}" y="${n(top + H * 0.3)}" width="6" height="${n(H * 0.07)}" rx="2" fill="${finish.body}"/><rect x="${n(left + W - 3)}" y="${n(top + H * 0.26)}" width="6" height="${n(H * 0.11)}" rx="2" fill="${finish.body}"/>` : ''
    const slab = device.base === 'window'
      ? `<rect x="${n(left)}" y="${n(top)}" width="${n(W)}" height="${n(H)}" rx="${device.corner}" fill="${finish.body}" stroke="${finish.rim}" stroke-width="2"/>`
      : `<rect x="${n(left)}" y="${n(top)}" width="${n(W)}" height="${n(H)}" rx="${device.corner}" fill="${finish.rim}"/><rect x="${n(left + band)}" y="${n(top + band)}" width="${n(W - 2 * band)}" height="${n(H - 2 * band)}" rx="${n(Math.max(0, device.corner - band))}" fill="${finish.bezel}"/>`
    const r = device.radius ?? 0
    const radii = device.base === 'window' ? [0, 0, device.corner - 1, device.corner - 1] : [r, r, r, r]
    // A pale bezel needs a line round the screen, or a white page runs into it.
    const edge = finish.id === 'white' ? `<path d="${roundedPath(box.sx, box.sy, sw, sh, radii)}" fill="none" stroke="#000000" stroke-opacity="0.2" stroke-width="1.5"/>` : ''
    art = {
      width: left + W + right, height: top + H + bottom,
      screen: { x: box.sx, y: box.sy, width: sw, height: sh, radii },
      under: `${base(device, finish, box)}${buttons}${slab}${chrome(device, finish, box)}`,
      over: `${cutouts(device, finish, box)}${edge}`
    }
  }
  if (!turned || !device.rotates) return { ...art, finish, turned: false }
  // A quarter turn anticlockwise: the top of the device goes to the left.
  const turn = (inner) => (inner ? `<g transform="translate(0 ${n(art.width)}) rotate(-90)">${inner}</g>` : '')
  const { x, y, width, height, radii: [tl, tr, brr, bll] } = art.screen
  return {
    width: art.height, height: art.width, finish, turned: true,
    screen: { x: y, y: art.width - (x + width), width: height, height: width, radii: [tr, brr, bll, tl] },
    under: turn(art.under), over: turn(art.over)
  }
}

/** A device with its screen filled, as a group in its own pixels. `id` keeps its clip path its own. */
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
const deviceGroup = (art, { id, href, inline, fit = 'cover', ground = '#000000' }) => {
  if (art.css) {
    // HTML inside the SVG: the stylesheet (see sceneSvg) draws the device round the image.
    const markup = art.css.markup.replace('{{screen}}', esc(href ?? BLANK)).replace('{{colour}}', art.css.colour ? ` ${esc(art.css.colour)}` : '')
    return `<foreignObject width="${n(art.width)}" height="${n(art.height)}"><div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:${n(art.width)}px;height:${n(art.height)}px"><div style="position:absolute;left:${n(art.css.offset[0])}px;top:${n(art.css.offset[1])}px">${markup}</div></div></foreignObject>`
  }
  const { x, y, width, height, radii } = art.screen
  const shape = roundedPath(x, y, width, height, radii)
  // A composed screen (a status bar over the screenshot) is set in as markup, at the screen's own
  // size; a plain screenshot as an image.
  const image = inline ? `<g clip-path="url(#${id})"><svg x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" viewBox="0 0 ${inline.width} ${inline.height}" preserveAspectRatio="none">${inline.inner}</svg></g>`
    : href ? `<image href="${esc(href)}" x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" preserveAspectRatio="${fit === 'contain' ? 'xMidYMid meet' : 'xMidYMin slice'}" clip-path="url(#${id})"/>` : ''
  return `<clipPath id="${id}"><path d="${shape}"/></clipPath>${art.under}<path d="${shape}" fill="${ground}"/>${image}${art.over}`
}

/** One device on its own, as an SVG document. */
export const deviceSvg = (device, { finish, brandColour, turned, frameHref, href, inline, fit, title, styles } = {}) => {
  const art = deviceArt(device, { finish, brandColour, turned, frameHref })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(art.width)} ${n(art.height)}" width="${n(art.width)}" height="${n(art.height)}" role="img"><title>${esc(title ?? device.label)}</title>${styleSheets([device], styles)}${deviceGroup(art, { id: 'screen', href, inline, fit })}</svg>`
}

/**
 * The stylesheets the CSS frames among `devices` need, once each. `styles` gives each set's
 * stylesheet text by set id; a set whose stylesheet has not arrived yet is left out, and its
 * frames show as their bare elements until it has.
 */
const styleSheets = (devices, styles = {}) => [...new Set(devices.map((device) => device.css?.set).filter(Boolean))]
  .map((set) => (styles[set] ? `<style>/* ${esc(set)} */<![CDATA[${styles[set].replaceAll(']]>', ']] >')}]]></style>` : '')).join('')

const UNIT = 1000

/**
 * Where each device of a scene stands, in scene units (a stature of 1 is 1000 tall): its scale,
 * its top-left corner, and the order it is drawn in. `row` sets devices side by side on one
 * baseline; `cluster` puts the first in the middle with the others in front of its lower corners.
 */
export const sceneLayout = (arts, statures, layout = 'row') => {
  const placed = arts.map((art, index) => {
    // The scale comes from the device upright, so a turned phone is the same phone on its side.
    const upright = art.turned ? art.width : art.height
    const k = (statures[index] * UNIT) / upright
    return { k, w: art.width * k, h: art.height * k, order: index }
  })
  if (layout === 'cluster' && placed.length > 1) {
    const [main, ...rest] = placed
    main.x = 0; main.y = -main.h
    rest.forEach((item, index) => {
      const right = index % 2 === 0
      const step = Math.floor(index / 2) * 0.5
      item.x = right ? main.w - item.w * (0.32 - step) : -item.w * (0.72 + step)
      item.y = -item.h + UNIT * 0.035
      item.order = index + 1
    })
  } else {
    let x = 0
    for (const item of placed) { item.x = x; item.y = -item.h; x += item.w + UNIT * 0.075 }
  }
  const left = Math.min(...placed.map((item) => item.x)), right = Math.max(...placed.map((item) => item.x + item.w))
  const top = Math.min(...placed.map((item) => item.y)), bottom = Math.max(...placed.map((item) => item.y + item.h))
  return { items: placed, box: { x: left, y: top, width: right - left, height: bottom - top } }
}

/**
 * A scene as an SVG document. `slots` are `{ device, finish, turned, href | inline, fit, frameHref }`
 * with `device` a catalogue entry; `background` is a colour or null for none.
 */
export const sceneSvg = ({ slots, layout = 'row', canvas = 'fit', background = null, shadow = true, brandColour, title = 'Device mockup', credit = '', styles }) => {
  if (!slots?.length) throw new Error('A mockup needs at least one device.')
  const arts = slots.map((slot) => deviceArt(slot.device, { finish: slot.finish, brandColour, turned: slot.turned, frameHref: slot.frameHref }))
  const { items, box } = sceneLayout(arts, slots.map((slot) => slot.device.stature ?? 0.5), layout)
  const pad = UNIT * 0.09 + box.width * 0.035
  let width = box.width + pad * 2, height = box.height + pad * 2
  const ratio = CANVASES[canvas]
  if (ratio) { width = Math.max(width, height * ratio); height = width / ratio }
  const dx = (width - box.width) / 2 - box.x, dy = (height - box.height) / 2 - box.y
  const dark = isHex(background) && channels(background).reduce((sum, channel) => sum + channel, 0) < 300
  const shadows = shadow ? items.map((item, index) => {
    const device = slots[index].device
    if (device.base === 'window' || device.frame?.floating) return `<rect x="${n(item.x + dx + item.w * 0.02)}" y="${n(item.y + dy + item.h * 0.05)}" width="${n(item.w * 0.96)}" height="${n(item.h)}" rx="${n(20 * item.k)}" fill="#000000" opacity="${dark ? 0.5 : 0.2}" filter="url(#soft)"/>`
    return `<ellipse cx="${n(item.x + dx + item.w / 2)}" cy="${n(item.y + dy + item.h)}" rx="${n(item.w * 0.5)}" ry="${n(UNIT * 0.016)}" fill="#000000" opacity="${dark ? 0.55 : 0.22}" filter="url(#soft)"/>`
  }).join('') : ''
  const groups = items.map((item, index) => ({ item, index })).sort((a, b) => a.item.order - b.item.order).map(({ item, index }) => {
    const slot = slots[index]
    return `<g transform="translate(${n(item.x + dx)} ${n(item.y + dy)}) scale(${Number(item.k.toFixed(5))})">${deviceGroup(arts[index], { id: `screen-${index}`, href: slot.href, inline: slot.inline, fit: slot.fit, ground: slot.ground })}</g>`
  }).join('')
  const note = credit ? `<text x="${n(pad * 0.4)}" y="${n(height - pad * 0.3)}" font-family="system-ui, Arial, sans-serif" font-size="${n(UNIT * 0.018)}" fill="${dark ? '#ffffff' : '#000000'}" fill-opacity="0.6">${esc(credit)}</text>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(width)} ${n(height)}" width="${n(width)}" height="${n(height)}" role="img"><title>${esc(title)}</title>`
    + `<defs><filter id="soft" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="${n(UNIT * 0.014)}"/></filter></defs>${styleSheets(slots.map((slot) => slot.device), styles)}`
    + `${isHex(background) ? `<rect width="${n(width)}" height="${n(height)}" fill="${background}"/>` : ''}${shadows}${groups}${note}</svg>`
}

/** The layout a preset uses. */
export const layoutOf = (preset) => PRESETS[preset]?.layout ?? 'row'
