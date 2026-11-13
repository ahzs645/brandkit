// What a screen shows before anyone gives it a screenshot: the brand's own logo on one of its
// colours, sized for the screen it is on. It keeps a new mockup from opening on blank glass and
// shows at a glance which brand it is for.

import { svgDataUrl } from './device-frame.js'

const channels = (value) => [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16))
const luminance = (value) => {
  const [r, g, b] = channels(value).map((channel) => { const v = channel / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
const isHex = (value) => /^#[0-9a-f]{6}$/i.test(value ?? '')

/**
 * The logo that reads best on `ground`, of those the brand offers (`{ id, ink, make }`, as
 * vehicleLogos gives them): the one whose ink stands out most, wide on a wide screen and stacked
 * on a tall one where the brand has both.
 */
export const logoFor = (logos, ground, wide) => {
  const usable = logos.filter((logo) => isHex(logo.ink))
  if (!usable.length) return logos[0] ?? null
  const best = Math.max(...usable.map((logo) => contrast(logo.ink, ground)))
  const close = usable.filter((logo) => contrast(logo.ink, ground) >= best * 0.92)
  return close.find((logo) => (wide ? /horizontal/.test(logo.id) : /stacked/.test(logo.id))) ?? close[0]
}

/** A brand screen for a `width` × `height` screen, as an image address; null without a logo. */
export const brandScreen = ({ logos, ground = '#16181c', width, height }) => {
  const fill = isHex(ground) ? ground : '#16181c'
  const logo = logoFor(logos ?? [], fill, width > height * 1.1)
  let art = ''
  if (logo) {
    try {
      const w = width * (width > height ? 0.34 : 0.62), h = height * (width > height ? 0.3 : 0.2)
      art = `<image href="${svgDataUrl(logo.make()).replace(/&/g, '&amp;')}" x="${(width - w) / 2}" y="${(height - h) / 2}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`
    } catch { art = '' }
  }
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${fill}"/>${art}</svg>`)
}
