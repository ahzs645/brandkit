// A brand's colours as one list (each palette colour with the roles it fills, then each role that
// holds a colour of its own), and what a colour page shows about them: contrast, print values and
// tints. In a plain module so Node's test runner can import it.

import { colour, colourName, luminance, rgb } from '../engine/brand.js'

const isHex = (value) => /^#[0-9a-f]{3,8}$/i.test(String(value))

/** `[{ key, name, hex, roles, own }]`: `own` marks a role's own colour, keyed by the role. */
export const colourEntries = (brand) => {
  const roles = Object.entries(brand.roles ?? {})
  const palette = Object.entries(brand.colours ?? {}).map(([key, hex]) => ({
    key, name: colourName(brand, key), hex, own: false,
    roles: roles.filter(([, value]) => value === key).map(([role]) => role)
  }))
  const own = roles.filter(([, value]) => !brand.colours?.[value] && isHex(value))
    .map(([role, hex]) => ({ key: role, name: colourName(brand, role), hex, own: true, roles: [role] }))
  return [...palette, ...own]
}

/** The roles the editor can reassign: those that name a palette colour or hold a hex value. */
export const editableRoles = (brand) => Object.keys(brand.roles ?? {}).filter((role) => brand.colours?.[brand.roles[role]] || isHex(brand.roles[role]))

// --- Contrast, print values and tints ------------------------------------------------------------

/** The WCAG contrast ratio of two colours, 1 to 21. */
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** The WCAG 2 grade a ratio earns for text: AAA, AA, AA large (18 pt, or 14 pt bold), or none. */
export const grade = (ratio) => (ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large' : 'Fail')

/** A ratio as the guides print it: 4.6 : 1. */
export const ratioLabel = (ratio) => `${(Math.floor(ratio * 10) / 10).toFixed(1)} : 1`

/**
 * The pairs of roles a brand sets text in, [text, ground, what it is for]: the checks a role change
 * in the editor has to keep passing. Only the pairs whose roles the brand defines.
 */
export const ROLE_PAIRS = [
  ['ink', 'paper', 'Body text'],
  ['muted', 'paper', 'Captions and secondary text'],
  ['primary', 'paper', 'Headings and links'],
  ['reverse', 'primary', 'Reversed text on the primary colour'],
  ['ink', 'light', 'Text on the light panel colour'],
  ['reverse', 'ink', 'Reversed text on ink']
]

export const rolePairs = (brand) => ROLE_PAIRS.filter(([text, ground]) => brand.roles?.[text] != null && brand.roles?.[ground] != null)
  .map(([text, ground, use]) => {
    const [fore, back] = [colour(brand, text), colour(brand, ground)]
    const ratio = contrast(fore, back)
    return { text, ground, use, fore, back, ratio, grade: grade(ratio) }
  })

/**
 * A screen colour converted to process CMYK the simple way, in whole percentages. It is a starting
 * point for a printer, not a press match: a brand's own recipe (`print.cmyk`) always wins.
 */
export const cmykOf = (hex) => {
  const [r, g, b] = (rgb(hex) ?? [0, 0, 0]).map((value) => value / 255)
  const k = 1 - Math.max(r, g, b)
  if (k >= 1) return [0, 0, 0, 100]
  return [r, g, b].map((value) => Math.round(((1 - value - k) / (1 - k)) * 100)).concat(Math.round(k * 100))
}

export const cmykLabel = ([c, m, y, k]) => [['C', c], ['M', m], ['Y', y], ['K', k]].filter(([, value]) => value).map(([letter, value]) => `${letter}${value}`).join(' ') || 'C0 M0 Y0 K0'

/** What the brand gives for printing a colour: its Pantone and CMYK, or a converted CMYK marked as such. */
export const printValues = (brand, key, hex) => {
  const pantone = brand.print?.pantone?.[key]
  const cmyk = brand.print?.cmyk?.[key]
  return { pantone: pantone ? `Pantone ${pantone}` : null, cmyk: cmyk ?? cmykLabel(cmykOf(hex)), converted: !cmyk }
}

/** A tint: the colour at `percent` strength over white, as screens and printers make one. */
export const tint = (hex, percent) => {
  const channels = rgb(hex) ?? [0, 0, 0]
  return `#${channels.map((value) => Math.round(255 - (255 - value) * (percent / 100)).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

/** Tints in steps of 20%, each with the brand's ink or reverse, whichever reads better, and its grade. */
export const TINT_STEPS = [100, 80, 60, 40, 20]
export const tintsOf = (brand, hex) => TINT_STEPS.map((percent) => {
  const ground = tint(hex, percent)
  const [ink, reverse] = [colour(brand, 'ink') ?? '#000000', colour(brand, 'reverse') ?? '#FFFFFF']
  const text = contrast(ink, ground) >= contrast(reverse, ground) ? ink : reverse
  const ratio = contrast(text, ground)
  return { percent, hex: ground, text, ratio, grade: grade(ratio) }
})
