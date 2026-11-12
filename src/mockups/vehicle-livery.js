// A brand's own vehicle designs (`brand.vehicles.liveries`): which vehicle, its paint, its wrap,
// its lettering and where the lettering goes, as data in brand.json. The vehicles themselves are
// brandkit's (vehicle-models.js); a livery only says what to put on one. The Vehicles tab offers
// a brand's liveries and opens the first; this module checks them and turns one into a mockup.
//
//   "vehicles": { "liveries": [{
//     "id": "service-truck", "label": "Service truck", "description": "…",
//     "model": "truck-canopy", "paint": "white", "backdrop": "outdoor",
//     "wrap": { "coverage": "rear", "file": "artwork/vehicle/canopy-wrap.svg", "mirror": true },
//     "lettering": { "file": "artwork/vehicle/door-lettering.svg" },
//     "placements": { "left": { "u": 0, "v": 0, "width": 1.8, "rotation": 0 }, "right": { … } },
//     "area": "left"
//   }] }
//
// A wrap is one of `file` (the brand's artwork, drawn for the left side: front at its left
// edge), `graphic` with two `colours`, or `pattern` (one of brand.patterns). Lettering is one of
// `file`, `logo` (a logo id the Vehicles tab lists) or `fleet` ({ logo?, tagline, website }).
// Colours are the brand's colour keys or #rrggbb.

import { BACKDROPS, MODEL_IDS, SCHEMA, WRAP_COVERAGE, WRAP_GRAPHICS, areasFor, clampPlacement, defaultWrap, vehicleFile } from './vehicle-layout.js'

export { VEHICLE_FILE_TYPES, vehicleFile } from './vehicle-layout.js'

const resolve = (brand, value, seen = new Set()) => {
  if (typeof value !== 'string') return null
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase()
  if (seen.has(value)) return null
  seen.add(value)
  const next = brand.colours?.[value] ?? brand.roles?.[value]
  return next ? resolve(brand, next, seen) : null
}

/** What is wrong with a brand's liveries, as sentences (none: an empty list). */
export const liveryProblems = (brand) => {
  const liveries = brand.vehicles?.liveries
  if (brand.vehicles == null) return []
  if (!Array.isArray(liveries)) return ['`vehicles.liveries` must be a list.']
  const problems = []
  const ids = new Set()
  const patterns = new Set((brand.patterns ?? []).map((spec) => spec.id))
  for (const [index, livery] of liveries.entries()) {
    const name = `Livery \`${livery?.id ?? index}\``
    const need = (ok, message) => { if (!ok) problems.push(`${name} ${message}`) }
    if (!livery || typeof livery !== 'object') { problems.push(`Livery ${index} must be an object.`); continue }
    need(typeof livery.id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(livery.id), 'needs an `id` of lowercase letters, digits and hyphens.')
    need(!ids.has(livery.id), 'has the same `id` as another livery.')
    ids.add(livery.id)
    need(MODEL_IDS.includes(livery.model), `names a \`model\` brandkit does not have (${MODEL_IDS.join(', ')}).`)
    need(livery.paint == null || resolve(brand, livery.paint), 'has a `paint` that is not a colour of the brand or #rrggbb.')
    need(livery.backdrop == null || BACKDROPS.includes(livery.backdrop), `has a \`backdrop\` that is not one of ${BACKDROPS.join(', ')}.`)
    const wrap = livery.wrap
    if (wrap != null) {
      need(WRAP_COVERAGE.includes(wrap.coverage), `has a wrap \`coverage\` that is not one of ${WRAP_COVERAGE.join(', ')}.`)
      const sources = ['file', 'graphic', 'pattern'].filter((key) => wrap[key] != null)
      need(sources.length === 1, 'needs exactly one of `file`, `graphic` or `pattern` in its wrap.')
      if (wrap.file != null) need(vehicleFile(wrap.file), 'has a wrap `file` that is not an SVG, PNG, JPEG or WebP inside the brand.')
      if (wrap.graphic != null) {
        need(WRAP_GRAPHICS.includes(wrap.graphic), `has a wrap \`graphic\` that is not one of ${WRAP_GRAPHICS.join(', ')}.`)
        need(Array.isArray(wrap.colours) && wrap.colours.length === 2 && wrap.colours.every((value) => resolve(brand, value)), 'needs two brand colours for its wrap graphic.')
      }
      if (wrap.pattern != null) need(patterns.has(wrap.pattern), 'names a wrap `pattern` the brand does not have.')
      need(wrap.scale == null || (wrap.scale >= 1 && wrap.scale <= 4), 'has a wrap `scale` outside 1 to 4.')
      for (const key of ['offsetU', 'offsetV']) need(wrap[key] == null || Math.abs(wrap[key]) <= 1, `has a wrap \`${key}\` outside −1 to 1.`)
    }
    const lettering = livery.lettering
    if (lettering != null) {
      const kinds = ['file', 'logo', 'fleet'].filter((key) => lettering[key] != null)
      need(kinds.length === 1, 'needs exactly one of `file`, `logo` or `fleet` in its lettering.')
      if (lettering.file != null) need(vehicleFile(lettering.file), 'has a lettering `file` that is not an SVG, PNG, JPEG or WebP inside the brand.')
    }
    const areas = areasFor(livery.model)
    const placements = Object.entries(livery.placements ?? {})
    if (lettering != null) need(placements.length > 0, 'needs `placements` for its lettering.')
    for (const [area, placement] of placements) {
      need(Object.hasOwn(areas, area), `places lettering on \`${area}\`, which the ${livery.model} does not have (${Object.keys(areas).join(', ')}).`)
      need(placement && ['u', 'v', 'width', 'rotation'].every((key) => Number.isFinite(placement[key])) && placement.width > 0, `has a placement on \`${area}\` without numeric u, v, width and rotation.`)
    }
    need(livery.area == null || Object.hasOwn(livery.placements ?? {}, livery.area), 'selects an `area` it has no placement for.')
  }
  return problems
}

/** Every image file the brand's liveries use. */
export const liveryFiles = (brand) => [...new Set((brand.vehicles?.liveries ?? []).flatMap((livery) => [livery.wrap?.file, livery.lettering?.file]).filter(vehicleFile))]

/**
 * A livery as a mockup the editor opens: brand colours resolved to hex, the rest of the settings
 * filled in. Placements are taken as the livery gives them; the editor fits each to its area
 * once it knows the lettering's proportions. `logos` and `fleet` supply the starting logo and
 * fleet words where the livery names none.
 */
export const liveryProject = (brand, livery, { logos = [], fleet = { tagline: '', website: '' }, wrapColours } = {}) => {
  const areas = areasFor(livery.model)
  const lettering = livery.lettering
  const fleetSpec = lettering?.fleet ?? {}
  const artwork = {
    kind: lettering?.file ? 'file' : lettering?.logo ? 'logo' : lettering?.fleet ? 'fleet' : 'none',
    logo: lettering?.logo ?? fleetSpec.logo ?? logos[0] ?? '',
    tagline: String(fleetSpec.tagline ?? fleet.tagline ?? '').slice(0, 100),
    website: String(fleetSpec.website ?? fleet.website ?? '').slice(0, 80),
    upload: null,
    file: lettering?.file ?? ''
  }
  const base = defaultWrap(wrapColours)
  const spec = livery.wrap
  const wrap = spec ? {
    ...base,
    coverage: spec.coverage,
    source: spec.file ? 'file' : spec.pattern ? 'pattern' : 'graphic',
    graphic: spec.graphic ?? base.graphic,
    pattern: spec.pattern ?? '',
    colours: spec.colours ? spec.colours.map((value) => resolve(brand, value)) : base.colours,
    scale: spec.scale ?? 1,
    offsetU: spec.offsetU ?? 0,
    offsetV: spec.offsetV ?? 0,
    mirror: spec.mirror ?? true,
    file: spec.file ?? ''
  } : base
  const placements = {}
  for (const [area, { u, v, width, rotation }] of Object.entries(livery.placements ?? {})) if (Object.hasOwn(areas, area)) placements[area] = { u, v, width, rotation }
  const area = livery.area ?? Object.keys(placements)[0] ?? 'left'
  placements[area] ??= clampPlacement({ u: 0, v: 0, width: 1.1, rotation: 0 }, area, 3, areas)
  return {
    schema: SCHEMA, model: livery.model, paint: resolve(brand, livery.paint ?? '#ffffff') ?? '#ffffff', area,
    placements, artwork, wrap, backdrop: livery.backdrop ?? 'studio', livery: livery.id
  }
}
