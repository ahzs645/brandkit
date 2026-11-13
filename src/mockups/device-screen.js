// What is on a device's screen, as one image the size of the screen: the screenshot, and, on a
// phone or tablet, the status bar a real device would draw over it (the time, signal, battery).
// The screenshot is set below the status bar, so nothing in it sits under a camera cutout; on a
// phone turned on its side the bar goes and the cutout's side is kept clear instead.
//
// A screenshot of a web page or an app is the page alone: the bar above it is the device's, and
// a mockup without it reads as a picture pasted onto glass.

import { svgDataUrl } from './device-frame.js'

const n = (value) => Number(value.toFixed(2))
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const isHex = (value) => /^#[0-9a-f]{6}$/i.test(value ?? '')
const luminance = (value) => {
  const [r, g, b] = [1, 3, 5].map((at) => { const v = parseInt(value.slice(at, at + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Whether a device has a status bar to show: phones and tablets do. */
export const hasStatusBar = (device) => device.category === 'phone' || device.category === 'tablet'

/**
 * The part of a screen its device keeps for itself, in the screen's own pixels: `top` for the
 * status bar, or, for a phone on its side, `left` for the camera cutout.
 */
export const insetOf = (device, turned = false) => {
  if (!hasStatusBar(device)) return { top: 0, left: 0 }
  const [width] = device.screen
  const top = device.inset ?? Math.round(width * (device.category === 'phone' ? 0.125 : 0.03))
  if (turned && device.rotates && device.category === 'phone') return { top: 0, left: ['home', undefined, null].includes(device.cutout) && !device.frame && !device.css ? 0 : top }
  return { top, left: 0 }
}

/** The size a screenshot should be to fill what is left of the screen. */
export const contentSize = (device, { turned = false, status = true } = {}) => {
  const [w, h] = turned && device.rotates ? [device.screen[1], device.screen[0]] : device.screen
  const inset = status ? insetOf(device, turned) : { top: 0, left: 0 }
  return [w - inset.left, h - inset.top]
}

const liveText = ({ text, x, baseline, size, anchor, fill, weight }) => `<text x="${n(x)}" y="${n(baseline)}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="${weight}" font-size="${n(size)}" text-anchor="${anchor}" fill="${fill}">${esc(text)}</text>`

/** Signal bars, a wireless fan and a battery, drawn from the right edge `x`, centred on `cy`. */
const indicators = (x, cy, s, ink) => {
  const battery = `<rect x="${n(x - 25 * s)}" y="${n(cy - 6 * s)}" width="${n(22 * s)}" height="${n(12 * s)}" rx="${n(3.6 * s)}" fill="none" stroke="${ink}" stroke-opacity="0.45" stroke-width="${n(1.1 * s)}"/><rect x="${n(x - 23.2 * s)}" y="${n(cy - 4.2 * s)}" width="${n(15 * s)}" height="${n(8.4 * s)}" rx="${n(2 * s)}" fill="${ink}"/><rect x="${n(x - 2 * s)}" y="${n(cy - 2 * s)}" width="${n(1.6 * s)}" height="${n(4 * s)}" rx="${n(0.8 * s)}" fill="${ink}" fill-opacity="0.5"/>`
  const wx = x - 38 * s
  const fan = `<path d="M${n(wx)} ${n(cy + 5 * s)}L${n(wx - 8 * s)} ${n(cy - 3.4 * s)}A${n(11.6 * s)} ${n(11.6 * s)} 0 0 1 ${n(wx + 8 * s)} ${n(cy - 3.4 * s)}Z" fill="${ink}"/>`
  const bx = x - 70 * s
  const bars = [0, 1, 2, 3].map((index) => `<rect x="${n(bx + index * 5 * s)}" y="${n(cy + 5 * s - (4 + index * 2.4) * s)}" width="${n(3.2 * s)}" height="${n((4 + index * 2.4) * s)}" rx="${n(0.8 * s)}" fill="${ink}"/>`).join('')
  return bars + fan + battery
}

/**
 * A screen as an SVG document: `href` (the screenshot) under a status bar. `status` is null for
 * a plain screen, or `{ colour, time, date }`; `type` draws a line of text (the app passes one
 * that outlines it in the brand's face) and defaults to live text in the system face.
 */
export const screenSvg = (options) => {
  const { width, height, inner } = screenParts(options)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${inner}</svg>`
}

/** The same screen as its size and the markup inside it, to set straight into a scene. */
export const screenParts = ({ device, turned = false, href, fit = 'cover', ground = '#101114', status = null, type = liveText }) => {
  const [width, height] = turned && device.rotates ? [device.screen[1], device.screen[0]] : device.screen
  const inset = status ? insetOf(device, turned) : { top: 0, left: 0 }
  const bar = isHex(status?.colour) ? status.colour : '#ffffff'
  const ink = luminance(bar) > 0.4 ? '#000000' : '#ffffff'
  const image = href ? `<image href="${esc(href)}" x="${n(inset.left)}" y="${n(inset.top)}" width="${n(width - inset.left)}" height="${n(height - inset.top)}" preserveAspectRatio="${fit === 'contain' ? 'xMidYMid meet' : 'xMidYMin slice'}"/>` : ''
  let over = ''
  if (status && inset.top) {
    const phone = device.category === 'phone'
    const eared = phone && ['island', 'notch'].includes(device.cutout ?? (device.frame || device.css ? 'island' : null))
    const size = Math.max(10, Math.min(17, inset.top * (phone ? 0.3 : 0.5)))
    const cy = eared ? inset.top * 0.56 : inset.top / 2
    const baseline = cy + size * 0.36
    const pad = Math.max(12, width * 0.04)
    const words = phone ? status.time ?? '' : [status.time, status.date].filter(Boolean).join('   ')
    if (words) over += type(eared ? { text: words, x: width * 0.17, baseline, size, anchor: 'middle', fill: ink, weight: 600 } : { text: words, x: pad, baseline, size, anchor: 'start', fill: ink, weight: 600 })
    over += indicators(eared ? width * 0.83 + 35 * (size / 17) : width - pad, cy, size / 17, ink)
    // The bar a gesture phone draws at the foot of the screen, over the page.
    if (phone && device.cutout !== 'home') over += `<rect x="${n(width / 2 - Math.min(70, width * 0.18))}" y="${n(height - 9)}" width="${n(Math.min(140, width * 0.36))}" height="5" rx="2.5" fill="${ink === '#000000' ? '#000000' : '#ffffff'}" fill-opacity="0.55"/>`
  }
  const kept = status ? `${inset.top ? `<rect width="${n(width)}" height="${n(inset.top)}" fill="${bar}"/>` : ''}${inset.left ? `<rect width="${n(inset.left)}" height="${n(height)}" fill="${bar}"/>` : ''}` : ''
  return { width, height, inner: `<rect width="${width}" height="${height}" fill="${ground}"/>${kept}${image}${over}` }
}

/**
 * What to put on a device, for sceneSvg: the screenshot as it is (`href`) where nothing has to be
 * added; the screen composed with its status bar, as markup to set into the scene (`inline`); or,
 * for a CSS frame, the composed screen as one image, since its stylesheet places an <img>.
 */
export const screenHref = (options) => {
  const { device, turned = false, href, status } = options
  const inset = status ? insetOf(device, turned) : { top: 0, left: 0 }
  if (device.css) return { href: svgDataUrl(screenSvg(options)), fit: 'cover' }
  if (!inset.top && !inset.left) return { href, fit: options.fit ?? 'cover' }
  return { inline: screenParts(options), fit: 'cover' }
}
