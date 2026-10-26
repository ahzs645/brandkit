// Optional identity restrictions travel with the brand instead of being hard-coded by name.
import { colour } from './brand.js'

/** Check a selected logo paint, including all roles in a composed colourway. */
export const assertLogoPaint = (brand, { colour: given, colourway } = {}) => {
  const policy = brand.logoPolicy
  if (!policy) return
  const selected = colourway ?? given ?? brand.defaultColourway
  const spec = brand.colourways?.[selected]
  const values = spec ? (spec.all ? [spec.all] : Object.values(spec.roles ?? {})) : [selected ?? 'currentColor']
  const allowed = (policy.allowedColours ?? []).map(key => colour(brand, key)?.toLowerCase())
  for (const value of values) {
    const resolved = colour(brand, value)
    if (resolved === 'currentColor' && policy.allowInheritedColour === false) throw new Error(`${brand.name} logos require a fixed permitted colour.`)
    if (allowed.length && !allowed.includes(resolved?.toLowerCase())) throw new Error(`${brand.name} logos may only use ${policy.allowedColours.join(', ')}.`)
  }
}

/** Physical logo geometry. Measured artwork ratios remain distinct from the source rule. */
export const logoDimensions = (brand, widthMm = brand.documentation?.logo?.widthMm ?? 60) => {
  const minimumWidthMm = brand.logoPolicy?.minimumWidthMm ?? brand.lockup?.minimumHorizontalWidthMm ?? 0
  if (!Number.isFinite(widthMm) || widthMm <= 0) throw new Error('Logo width must be a positive number in millimetres.')
  if (widthMm < minimumWidthMm) throw new Error(`The complete ${brand.name} logo must be at least ${minimumWidthMm} mm wide.`)
  const measuredClearSpace = widthMm * (brand.logoPolicy?.clearSpaceRatio ?? 0)
  const clearSpaceMm = Math.max(measuredClearSpace, brand.documentation?.logo?.clearSpaceMm ?? 0)
  return { widthMm, minimumWidthMm, clearSpaceMm, totalWidthMm: widthMm + 2 * clearSpaceMm }
}

/** Source restrictions and document conventions for consumers that do not run the engine. */
export const identityRules = (brand) => ({
  ...(brand.logoPolicy ? { logo: structuredClone(brand.logoPolicy) } : {}),
  minimumLogoWidthMm: brand.logoPolicy?.minimumWidthMm ?? brand.lockup?.minimumHorizontalWidthMm ?? null,
  clearSpace: brand.lockup?.clearspaceRecommendation ?? null,
  organization: brand.organization ? structuredClone(brand.organization) : null,
  relationships: structuredClone(brand.brandArchitecture?.relatedBrands ?? []),
  officialResources: structuredClone(brand.officialResources ?? [])
})
