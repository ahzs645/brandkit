// A reusable cover composition. Identity comes from the selected brand, not a bundled logo.
import { mark, pattern } from '../engine/artwork.js'
import { consumerProfile } from '../engine/consumer.js'
import { documentProfile } from '../engine/documentation.js'
import { sanitizeSvg } from '../printer/svg.js'
import { welcomeCoverVariant } from './cover-variants.js'
export { WELCOME_COVER_VARIANTS, welcomeCoverVariant } from './cover-variants.js'

const data = bytes => {
  if (typeof Buffer !== 'undefined') return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:image/png;base64,${btoa(binary)}`
}
const inner = svg => svg.replace(/^.*?<svg\b[^>]*>/s, '').replace(/<\/svg>\s*$/, '')

/** Finite compositions use the standard source symbol, never a cropped or micro version. */
export const welcomeCoverGraphic = (provider, variant = 'legacy-crop') => {
  welcomeCoverVariant(variant)
  if (variant === 'type-only') return null
  const frame = (artwork, background = '#000000') => sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 320" width="960" height="320"><rect width="960" height="320" fill="${background}"/>${artwork}</svg>`)
  if (variant === 'legacy-crop') {
    const crop = provider.brand.patterns?.find(item => item.id === 'crop')
    const cropSvg = crop ? sanitizeSvg(pattern(provider, crop)) : null
    const artwork = cropSvg ? `<svg x="0" y="-140" width="960" height="600" viewBox="0 0 ${crop.width} ${crop.height}">${inner(cropSvg)}</svg>` : ''
    return frame(artwork, documentProfile(provider.brand).colours.ink)
  }
  const box = provider.brand.symbol?.viewBox
  if (!Array.isArray(box) || box.length !== 4 || box.some(value => !Number.isFinite(value)) || box[2] <= 0 || box[3] <= 0) throw new Error('A finite standard symbol viewBox is required for this cover variant.')
  const [vx, vy, sw, sh] = box
  // Each placement is fitted into a bounded slot. Non-zero viewBox origins and
  // unusually wide symbols are accommodated without skewing or clipping them.
  const placed = ({ cx, cy, width, height, colour }) => {
    const scale = Math.min(width / sw, height / sh)
    const x = cx - sw * scale / 2 - vx * scale
    const y = cy - sh * scale / 2 - vy * scale
    return `<g transform="translate(${x} ${y}) scale(${scale})">${mark(provider, colour)}</g>`
  }
  if (variant === 'complete-mark') return frame(placed({ cx: 800, cy: 160, width: 192, height: 190, colour: '#FFFFFF' }))
  if (variant === 'inset-frame') return frame(`<rect x="500" y="20" width="420" height="280" fill="#DFDFDF"/>${placed({ cx: 710, cy: 160, width: 200, height: 160, colour: '#000000' })}`)
  return frame([160, 480, 800].map(cx => placed({ cx, cy: 160, width: 150, height: 156, colour: '#FFFFFF' })).join(''))
}

/** Logos and decorative artwork are images; all cover wording remains native document text. */
export async function createWelcomeCover(provider, client, record, { png, paper = 'letter', issue = false, originalLogo, variant = 'legacy-crop' } = {}) {
  if (typeof png !== 'function') throw new TypeError('A PNG renderer is required for the designed cover.')
  const choice = welcomeCoverVariant(variant)
  const providerProfile = documentProfile(provider.brand, { paper })
  const clientProfile = documentProfile(client.brand, { paper })
  const providerLogo = sanitizeSvg(consumerProfile(provider).logos.black.svg)
  const clientLogo = sanitizeSvg(consumerProfile(client).logos.primary.svg)
  const graphic = welcomeCoverGraphic(provider, variant)
  const logoWidth = Math.max(42, providerProfile.logo.minimumWidthMm)
  if (logoWidth > 64) throw new Error('This cover needs a provider logo at most 64 mm wide. Use the standard cover for a brand with a larger minimum.')
  const dateText = record.preparedAt ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(record.preparedAt.slice(0, 10) + 'T12:00:00Z')) : 'Date to confirm'
  const cover = {
    schema: 'brandkit/welcome-cover/1',
    variant,
    providerLogo: { src: originalLogo?.src || data(await png(providerLogo, 1400)), alt: `${provider.brand.name} primary horizontal logo`, widthMm: logoWidth },
    ...(graphic ? { graphic: { src: data(await png(graphic, 2400)), alt: `${provider.brand.name} supporting artwork: ${choice.label.toLowerCase()}` } } : {
      sections: [
        { number: '01', title: 'Access', description: 'Find your website and access details.' },
        { number: '02', title: 'Support', description: 'Know who to contact and what happens next.' },
        { number: '03', title: 'Your brand', description: 'Use your logo, colours and type.' }
      ]
    }),
    // Allow for the logo file's surrounding transparent space as well as its visible artwork.
    ...(clientProfile.logo.minimumWidthMm <= 60 ? { clientLogo: { src: data(await png(clientLogo, 1600)), alt: `${client.brand.name} supplied logo`, widthMm: 60 } } : {}),
    kicker: 'WEBSITE\nWELCOME PACK', title: 'Your website.\nStart here.', subtitle: variant === 'type-only' ? 'Everything you need to get started.' : 'Access. Support. Brand essentials.',
    clientName: record.client.name || client.brand.name, preparedBy: record.provider.name || provider.brand.name,
    dateText, status: `${issue ? 'ISSUED' : record.kind === 'example' ? 'EXAMPLE · DRAFT' : record.kind === 'template' ? 'TEMPLATE · DRAFT' : 'DRAFT'} · EDITION ${record.version || '1'}`
  }
  return { cover, svg: { providerLogo, clientLogo, graphic } }
}
