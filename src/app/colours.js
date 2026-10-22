// A brand's colours as one list: each palette colour with the roles it fills, then each role that
// holds a colour of its own (a hex value, not a palette colour), so every colour the brand uses is
// in one place. In a plain module so Node's test runner can import it.

import { colourName } from '../engine/brand.js'

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
