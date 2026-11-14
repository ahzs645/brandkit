// A reusable cover composition. Identity comes from the selected brand, not a bundled logo.
import { pattern } from '../engine/artwork.js'
import { consumerProfile } from '../engine/consumer.js'
import { documentProfile } from '../engine/documentation.js'
import { sanitizeSvg } from '../printer/svg.js'

const data = bytes => {
  if (typeof Buffer !== 'undefined') return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:image/png;base64,${btoa(binary)}`
}
const inner = svg => svg.replace(/^.*?<svg\b[^>]*>/s, '').replace(/<\/svg>\s*$/, '')

/** Logos and decorative artwork are images; all cover wording remains native document text. */
export async function createWelcomeCover(provider, client, record, { png, paper = 'letter', issue = false, originalLogo } = {}) {
  if (typeof png !== 'function') throw new TypeError('A PNG renderer is required for the designed cover.')
  const providerProfile = documentProfile(provider.brand, { paper })
  const clientProfile = documentProfile(client.brand, { paper })
  const providerLogo = sanitizeSvg(consumerProfile(provider).logos.black.svg)
  const clientLogo = sanitizeSvg(consumerProfile(client).logos.primary.svg)
  // Crop an explicitly supplied supporting pattern, without changing its underlying geometry.
  // Brands with no crop pattern get a flat field; no new symbol variant is invented.
  const crop = provider.brand.patterns?.find(item => item.id === 'crop')
  const cropSvg = crop ? sanitizeSvg(pattern(provider, crop)) : null
  const artwork = cropSvg ? `<svg x="0" y="-140" width="960" height="600" viewBox="0 0 ${crop.width} ${crop.height}">${inner(cropSvg)}</svg>` : ''
  const graphic = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 320" width="960" height="320"><rect width="960" height="320" fill="${providerProfile.colours.ink}"/>${artwork}</svg>`
  const logoWidth = Math.max(42, providerProfile.logo.minimumWidthMm)
  if (logoWidth > 64) throw new Error('This cover needs a provider logo at most 64 mm wide. Use the standard cover for a brand with a larger minimum.')
  const dateText = record.preparedAt ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(record.preparedAt.slice(0, 10) + 'T12:00:00Z')) : 'Date to confirm'
  const cover = {
    schema: 'brandkit/welcome-cover/1',
    providerLogo: { src: originalLogo?.src || data(await png(providerLogo, 1400)), alt: `${provider.brand.name} primary horizontal logo`, widthMm: logoWidth },
    graphic: { src: data(await png(graphic, 2400)), alt: crop ? `${provider.brand.name} supplied large-crop supporting graphic` : 'Flat brand-colour field' },
    // Allow for the logo file's surrounding transparent space as well as its visible artwork.
    ...(clientProfile.logo.minimumWidthMm <= 60 ? { clientLogo: { src: data(await png(clientLogo, 1600)), alt: `${client.brand.name} supplied logo`, widthMm: 60 } } : {}),
    kicker: 'WEBSITE\nWELCOME PACK', title: 'Your website.\nStart here.', subtitle: 'Access. Support. Brand essentials.',
    clientName: record.client.name || client.brand.name, preparedBy: record.provider.name || provider.brand.name,
    dateText, status: `${issue ? 'ISSUED' : record.kind === 'example' ? 'EXAMPLE · DRAFT' : record.kind === 'template' ? 'TEMPLATE · DRAFT' : 'DRAFT'} · EDITION ${record.version || '1'}`
  }
  return { cover, svg: { providerLogo, clientLogo, graphic } }
}
