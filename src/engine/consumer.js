// A portable, data-only handoff for applications which use a brand without embedding the
// whole logo engine. Geometry is rendered here so consumers do not have to reconstruct
// fixed wordmarks, path symbols or composed historical signatures themselves.
import { logoDocument } from './artwork.js'
import { colour, COLOUR_ROLES, logoOptions } from './brand.js'

export const CONSUMER_PROFILE_SCHEMA = 'brandkit/consumer-profile/1'

const viewBoxOf = (svg) => {
  const match = /\bviewBox="([^"]+)"/.exec(svg)
  const values = match?.[1].trim().split(/[\s,]+/).map(Number)
  if (!values || values.length !== 4 || !values.every(Number.isFinite) || values[2] <= 0 || values[3] <= 0) throw new Error('The brand logo has no usable viewBox.')
  return values
}

const typeRole = (brand, role, key) => {
  const face = brand.fonts?.[key] ?? brand.fonts?.body ?? {}
  const type = brand.typography?.[role] ?? {}
  return {
    family: face.family ?? type.family ?? 'Arial',
    weight: type.weight ?? face.weight ?? 400,
    style: face.style ?? 'normal',
    fallback: face.stack ?? 'Arial, sans-serif'
  }
}

/** All SVG lettering must be outlined; consumers may safely reject live text and resources. */
export const consumerProfile = (ctx) => {
  const { brand } = ctx
  const logo = logoOptions(brand)[0]
  if (!logo) throw new Error('This brand does not define a logo.')
  const make = (variant) => {
    const paint = variant === 'primary'
      ? (logo.signature ? { colourway: brand.defaultColourway ?? Object.keys(brand.colourways ?? {})[0] } : { colourKey: 'primary' })
      : { colour: variant === 'black' ? '#000000' : '#FFFFFF' }
    const svg = logoDocument({ ...ctx, outline: true }, { ...logo, ...paint })
    if (/<(?:text|image|script|foreignObject)\b/i.test(svg) || /(?:href|xlink:href)\s*=/i.test(svg)) {
      throw new Error('The consumer logo must contain self-contained vector geometry. Load the brand fonts before exporting.')
    }
    return { svg, viewBox: viewBoxOf(svg) }
  }
  return {
    schema: CONSUMER_PROFILE_SCHEMA,
    id: brand.id,
    name: brand.name,
    version: brand.version,
    sourceUrl: `https://projects.ahmadjalil.com/brandkit/?brand=${encodeURIComponent(brand.id)}&share=1`,
    colours: Object.fromEntries(COLOUR_ROLES.map((role) => [role, colour(brand, brand.roles?.[role] ?? role)])),
    typography: { body: typeRole(brand, 'body', 'body'), heading: typeRole(brand, 'headlines', 'display'), label: typeRole(brand, 'labels', 'label') },
    logos: { primary: make('primary'), black: make('black'), reverse: make('reverse') },
    provenance: {
      source: typeof brand.source === 'string' ? brand.source : JSON.stringify(brand.source ?? {}),
      status: typeof brand.status === 'string' ? brand.status : 'Use the source brand guidance for artwork provenance and approval status.'
    }
  }
}
