// A reusable document cover. Identity comes from the selected brands, not a bundled logo: the
// provider's own artwork and rules draw the page, and the client's logo sits on its plate.
import { consumerProfile } from '../engine/consumer.js'
import { documentProfile } from '../engine/documentation.js'
import { sanitizeSvg } from '../printer/svg.js'
import { coverLayout, coverMeasure } from './cover-designs.js'
import { DEFAULT_COVER_VARIANT, welcomeCoverVariant } from './cover-variants.js'
export { DEFAULT_COVER_VARIANT, WELCOME_COVER_VARIANTS, welcomeCoverVariant } from './cover-variants.js'

export const WELCOME_COVER_SCHEMA = 'brandkit/welcome-cover/2'

/** The welcome pack's own wording; a record's `cover` replaces any of it. */
export const WELCOME_COVER_TEXT = Object.freeze({
  kicker: 'Website welcome pack',
  title: 'Your website.\nStart here.',
  subtitle: 'Access, support and brand essentials, in one place.',
  sections: Object.freeze([
    Object.freeze({ title: 'Access', description: 'Find your website, sign in and know who can change what.' }),
    Object.freeze({ title: 'Support', description: 'Who to contact, how quickly to expect an answer, and what happens next.' }),
    Object.freeze({ title: 'Your brand', description: 'Your logo, colours and type, and where to find the files.' })
  ])
})

const data = bytes => {
  if (typeof Buffer !== 'undefined') return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:image/png;base64,${btoa(binary)}`
}

export const coverStatus = (record, issue) => `${issue ? 'Issued' : record.kind === 'example' ? 'Example · draft' : record.kind === 'template' ? 'Template · draft' : 'Draft'} · Edition ${record.version || '1'}`
export const coverDate = (record) => record.preparedAt
  ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(record.preparedAt.slice(0, 10) + 'T12:00:00Z'))
  : 'Date to confirm'

/** Font keys of the provider's document roles, so text is measured in the faces it is set in. */
const roleKeys = (profile) => ({ title: profile.typography.title.font, body: profile.typography.body.font, label: (profile.typography.label ?? profile.typography.caption).font })

/**
 * The cover's artwork (one page-sized PNG: grounds, supporting graphic, both logos) and its text
 * frames. Every word on the cover is a field of the returned object, set as native text.
 */
export async function createWelcomeCover(provider, client, record, { png, paper = 'letter', issue = false, variant = record.cover?.variant || DEFAULT_COVER_VARIANT, dpi = 300 } = {}) {
  if (typeof png !== 'function') throw new TypeError('A PNG renderer is required for the designed cover.')
  const choice = welcomeCoverVariant(variant)
  const providerProfile = documentProfile(provider.brand, { paper })
  const clientProfile = documentProfile(client.brand, { paper })
  const providerLogo = sanitizeSvg(consumerProfile(provider).logos.black.svg)
  const clientLogo = sanitizeSvg(consumerProfile(client).logos.primary.svg)
  const wording = { ...WELCOME_COVER_TEXT, ...Object.fromEntries(Object.entries(record.cover ?? {}).filter(([key, value]) => key !== 'variant' && (Array.isArray(value) ? value.length : value))) }
  const text = {
    kicker: wording.kicker,
    title: wording.title,
    subtitle: wording.subtitle,
    clientName: record.client.name || client.brand.name,
    preparedBy: record.provider.name || provider.brand.name,
    dateText: coverDate(record),
    status: coverStatus(record, issue),
    // An entry left blank keeps the default in its place.
    ...(variant === 'index' ? { sections: wording.sections.map(({ title, description }, i) => ({ title: title?.trim() || WELCOME_COVER_TEXT.sections[i]?.title || 'Section', description: description?.trim() || WELCOME_COVER_TEXT.sections[i]?.description || 'More inside.' })) } : {})
  }
  const layout = coverLayout({
    variant, paper, provider,
    logos: { black: providerLogo },
    client: { svg: clientLogo, minimumWidthMm: clientProfile.logo.minimumWidthMm ?? 0 },
    cover: text,
    measure: coverMeasure(provider.fonts, roleKeys(providerProfile))
  })
  const artwork = sanitizeSvg(layout.svg)
  // 300 dpi across the page by default: sharp in print, small for flat colour. A live preview
  // can ask for less.
  const pixels = Math.round(layout.widthMm / 25.4 * Math.max(72, Math.min(600, dpi)))
  const cover = {
    schema: WELCOME_COVER_SCHEMA,
    variant,
    paper,
    artwork: { src: data(await png(artwork, pixels)), alt: `${provider.brand.name} logo, ${choice.label.toLowerCase()} cover artwork and the ${text.clientName} logo` },
    ...text,
    frames: layout.frames.map(({ text: _text, ...placed }) => placed)
  }
  return { cover, svg: { artwork, providerLogo, clientLogo }, profile: providerProfile }
}
