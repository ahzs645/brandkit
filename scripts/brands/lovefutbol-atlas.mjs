// Digital-atlas applications for love.fútbol: map and place icons, logo-free patterns,
// cartography guidance and its guide pages. Everything here is a local application choice
// made for an unofficial companion map atlas, informed by observed website colours and type.
// None of it is an organization-issued cartography standard, and none of it draws, repeats
// or abstracts the logo. The logo remains the complete preserved source artwork.

// ---------------------------------------------------------------------------------------------
// The record: what the atlas does, with its status and sources kept beside each choice.

export const lovefutbolAtlas = {
  schema: 'brandkit/atlas-guidance/1',
  brandId: 'lovefutbol',
  reviewed: '2026-11-01',
  status: 'Local application choices made for an unofficial companion map atlas of love.fútbol projects, informed by observed website colours and type. Not organization-issued cartography or data standards; love.fútbol has not reviewed or approved them.',
  scope: 'Interactive maps of project locations, the administrative areas around them and nearby community facilities. Basemap values, marker meanings, line weights and data rules below are atlas decisions; the palette keys they reuse are observed website colours.',
  basemap: {
    note: 'A quiet, warm basemap keeps project markers and the observed brand colours legible. These seven values are atlas choices; they are not part of the observed love.fútbol palette.',
    layers: [
      { id: 'ground', label: 'Ground', hex: '#F3F1EA', use: 'Land background' },
      { id: 'water', label: 'Water', hex: '#BFE0EE', use: 'Seas, lakes and rivers' },
      { id: 'parks', label: 'Parks', hex: '#DCEADB', use: 'Parks and public green space' },
      { id: 'woods', label: 'Woods', hex: '#D9E8D8', use: 'Woodland and forest cover' },
      { id: 'residential', label: 'Residential', hex: '#EEEBE2', use: 'Residential land use' },
      { id: 'buildings', label: 'Buildings', hex: '#E7E3D8', use: 'Building footprints' },
      { id: 'admin', label: 'Admin boundaries', hex: '#9BB8A3', use: 'Country and state boundary lines on the basemap' }
    ],
    labels: { colour: 'charcoal', hex: '#1D1D1B', secondaryHex: '#3A3A36', halo: 'off-white', haloHex: '#F5F4EF', note: 'Country labels in charcoal, other place labels in a slightly softer charcoal, each with an off-white halo.' },
    starting: 'The atlas restyles the OpenFreeMap Positron vector style (OpenMapTiles schema).'
  },
  themes: {
    note: 'Three basemap themes recolour the same vector style in place. Chalk is the default; Pitch and Night match are playful alternatives for presentations and the map story. All three are atlas choices, not observed brand treatments.',
    items: [
      { id: 'chalk', label: 'Chalk', ground: '#F3F1EA', water: '#BFE0EE', roads: '#FFFFFF', labels: '#1D1D1B', choropleth: ['#CFE7D6', '#88C59B', '#489D60'], use: 'Default reading view: off-white ground like the website’s light pages.' },
      { id: 'pitch', label: 'Pitch', ground: '#5DA86F', water: '#86CBEA', roads: '#FFFFFF', labels: '#FFFFFF', choropleth: ['#8CC79C', '#CFE8D5', '#FFFFFF'], use: 'The map as a mown pitch: green ground with white chalk-line roads; countries reached lighten toward white. OSM pitches switch to off-white with green lines.' },
      { id: 'night', label: 'Night match', ground: '#0E1D17', water: '#0B2A38', roads: '#F5A300', labels: '#F5F4EF', choropleth: ['#1F4A31', '#489D60', '#88C59B'], use: 'A floodlit evening match: forest ground, amber roads like floodlights, light-green country labels.' }
    ],
    satellite: 'An aerial-imagery view (Esri World Imagery) is offered on a selected space as “See the field”, with the nearest OpenStreetMap pitch outlined in source flag red over a green fill.'
  },
  travelTime: {
    note: 'Walking and cycling isochrones (10, 20 and 30 minutes) from Valhalla on the OpenStreetMap street network, drawn as rings in one hue: darkest closest.',
    bands: [
      { minutes: 10, hex: '#9A5418', label: 'Dark terracotta' },
      { minutes: 20, hex: '#D17F2D', label: 'Projects terracotta' },
      { minutes: 30, hex: '#EDB98A', label: 'Light terracotta' }
    ],
    people: 'Residents inside each band: US census tracts weighted by area share (ACS 5-year); elsewhere the area times the density of the smallest administrative area (under 3,000 km²) with people and size on record, shown with ≈ as a rough estimate. Never a state-wide density.'
  },
  lens: {
    note: 'A neighbourhood lens shades three kinds of OpenStreetMap land use from about zoom 11, under the roads, so the facilities around a space read at a glance.',
    layers: [
      { id: 'pitches', label: 'Sports pitches', colour: 'light-green', hex: '#88C59B', opacity: 0.75, outline: 'white', note: 'OSM pitch, stadium and track land use; white pitch outlines from about zoom 13.' },
      { id: 'playgrounds', label: 'Playgrounds', colour: 'cyan', hex: '#3CB1EA', opacity: 0.35 },
      { id: 'schools', label: 'Schools', colour: 'amber', hex: '#F5A300', opacity: 0.22, note: 'School, kindergarten, college and university land use.' }
    ]
  },
  markers: [
    { id: 'profile', label: 'Project with a profile page', fill: 'green', hex: '#489D60', stroke: 'white', note: 'A circle with a white stroke. The project number appears in white on the pin at closer zooms.' },
    { id: 'homepage-only', label: 'Project known only from the homepage map', fill: 'amber', hex: '#F5A300', stroke: 'white', note: 'Same form as a profile pin; the colour says the place has no profile page to open.' },
    { id: 'cluster', label: 'Cluster of nearby projects', fill: 'terracotta', hex: '#D17F2D', stroke: 'white', note: 'A larger terracotta circle with a white count; it expands on selection.' },
    { id: 'selected', label: 'Selected space', fill: 'green', hex: '#489D60', flag: 'red', flagHex: '#ED1C24', note: 'A small top-down pitch with a red corner flag. It is a map symbol, not the logo: never use it as a logo, beside the logo as a lockup, or in place of the complete artwork.' }
  ],
  areas: {
    choropleth: { label: 'Countries reached', from: 'light-green', to: 'green', measure: 'Number of projects with a published location in each country', opacity: 0.6, hoverOpacity: 0.85, note: 'A paler tint of light green marks a single project; the ramp reaches green at the maximum. It counts mapped spaces, not people reached.' },
    selected: { label: 'Selected administrative area', outline: 'terracotta', outlineWidthPx: 3, fill: 'terracotta', fillOpacity: 0.12 },
    hierarchy: { label: 'Other levels of the hierarchy', colour: 'forest', dash: [3, 2], widthPx: [0.8, 1.6], opacity: [0.25, 0.55], note: 'Country → state or province → county or region → city → district → neighbourhood. Lines get heavier and darker toward the neighbourhood.' },
    walkRing: { label: 'Walk ring', colour: 'cyan', radiusKm: 1, widthPx: 2, dash: [2, 2], fillOpacity: 0.06, caption: '1 km · about a 12-minute walk', note: 'A straight-line radius, not a measured walking route or a catchment.' }
  },
  type: [
    { font: 'Bahianita', use: 'Country names, project names, counters and large numbers', basis: 'Observed website display role (Bahianita spans and counters on the homepage); applied to the atlas by local choice.' },
    { font: 'Red Hat Text', use: 'Interface text, labels, legends, sources and captions', basis: 'Observed website body and supporting type.' },
    { font: 'Basemap labels', use: 'The vector style’s own label font', basis: 'Basemap place labels and marker numbers use the tile style’s fonts; they are not set in the brand faces.' }
  ],
  photography: { rule: 'Project photographs display in grayscale and return to colour on hover or focus.', basis: 'The Projects-page photo grid applies a grayscale class to colour images (website-projects-brand-evidence.json). Returning to colour on hover is the atlas’s interaction choice; keep the colour original unchanged and credit every image.' },
  dataHonesty: [
    { id: 'approximate-locations', rule: 'Treat every coordinate as approximate. Most come from the homepage map, which places some courts at city level; the rest are geocoded from the place named on a profile. Show the source of each coordinate with the space.' },
    { id: 'label-sources', rule: 'Name the source beside every figure: Wikidata, World Bank World Development Indicators, U.S. Census Bureau American Community Survey via Census Reporter, OpenStreetMap. Credit OpenStreetMap contributors and the basemap provider on the map.' },
    { id: 'population-years', rule: 'Show the year of every population figure. Say when an area has no recorded population rather than estimating one.' },
    { id: 'third-party-statistics', rule: 'Never imply that love.fútbol produced, endorsed or verified third-party statistics. Area statistics describe an administrative area, not the people a space serves or its outcomes.' },
    { id: 'dated-counters', rule: 'Quote love.fútbol’s own headline counters as dated, attributed figures. Different pages give different totals; do not reconcile them or recompute them from the map.' },
    { id: 'numbering', rule: 'Use a project number only where a source gives it, and note conflicts. The homepage map and gallery captions number some projects differently and repeat #52.' }
  ],
  dataSources: ['wikidata', 'world-bank-wdi', 'census-reporter-acs', 'openstreetmap', 'openfreemap'],
  sources: ['lf-home-project-map', 'mappa-mundi-embed', 'lf-projects-profile-count', 'lf-100-headline-figures', 'lf-home', 'lf-projects']
}

// ---------------------------------------------------------------------------------------------
// Icons: 24 px, stroke 1.75, round caps and joins, drawn in currentColor. Original drawings for
// map and place interfaces; none is derived from the logo’s outlines.

const at = (cx, cy, r, deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)]
const f = value => Number(value.toFixed(2))
const pt = ([x, y]) => `${f(x)} ${f(y)}`

const ball = () => {
  const inner = [-90, -18, 54, 126, 198].map(deg => at(12, 12, 3.6, deg))
  const outer = [-90, -18, 54, 126, 198].map(deg => at(12, 12, 9, deg))
  return `<circle cx="12" cy="12" r="9"/><path d="M${inner.map(pt).join('L')}Z"/><path d="${inner.map((p, i) => `M${pt(p)}L${pt(outer[i])}`).join('')}"/>`
}

const community = () => {
  const heads = [-90, 0, 90, 180].map(deg => at(12, 12, 8.5, deg))
  const arcs = [-90, 0, 90, 180].map(deg => `M${pt(at(12, 12, 8.5, deg + 27))}A8.5 8.5 0 0 1 ${pt(at(12, 12, 8.5, deg + 63))}`).join('')
  return `${heads.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="1.9"/>`).join('')}<path d="${arcs}"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>`
}

export const lovefutbolAtlasIcons = {
  size: 24,
  title: '{name} / {icon} atlas icon',
  attrs: { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.75, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
  items: [
    { id: 'pitch', content: '<rect x="2.5" y="5" width="19" height="14" rx="1"/><path d="M12 5v14M2.5 9H6v6H2.5M21.5 9H18v6h3.5"/><circle cx="12" cy="12" r="2.6"/>' },
    { id: 'court-pin', content: '<path d="M12 22s-7.5-6.4-7.5-12.5a7.5 7.5 0 0 1 15 0C19.5 15.6 12 22 12 22Z"/><rect x="7.75" y="6.75" width="8.5" height="5.5" rx=".5"/><path d="M12 6.75v5.5"/>' },
    { id: 'corner-flag', content: '<path d="M7 21V3l10 3.75-10 3.75"/><path d="M3 21h18M7 16.5a4.5 4.5 0 0 1 4.5 4.5"/>' },
    { id: 'ball', content: ball() },
    { id: 'school', content: '<path d="M3 21h18M5 21V10l7-4.5 7 4.5v11M10 21v-4.5h4V21"/><path d="M12 5.5V2.5h3.5"/><circle cx="12" cy="11.5" r="1.6"/>' },
    { id: 'playground', content: '<path d="M3 21 6.5 4h11L21 21"/><path d="M10 4v10M14 4v10M8.75 14h6.5"/>' },
    { id: 'park', content: '<path d="M12 3a5 5 0 0 1 4.9 4A4.25 4.25 0 0 1 16 15.5H8A4.25 4.25 0 0 1 7.1 7 5 5 0 0 1 12 3Z"/><path d="M12 21v-9.5M12 15l2.5-2.25M8 21h8"/>' },
    { id: 'community', content: community() },
    { id: 'clinic', content: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M12 8v8M8 12h8"/>' },
    { id: 'transit', content: '<rect x="5" y="3" width="14" height="15" rx="2.5"/><path d="M5 11.5h14M9 6.5h6M8 18v3M16 18v3M8.5 14.75h.01M15.5 14.75h.01"/>' },
    { id: 'walk-radius', content: '<circle cx="12" cy="12" r="9" stroke-dasharray="2.6 3.05"/><circle cx="12" cy="12" r="2.25" fill="currentColor"/>' },
    { id: 'neighbourhood', content: '<path d="M2 21h20M3.5 21v-7.5l4-3.5 4 3.5V21M12.5 21V9.5l4.25-3.75L21 9.5V21"/><path d="M6.25 21v-3h2.5v3M15.5 21v-4h2.5v4"/>' },
    { id: 'city', content: '<path d="M2 21h20M4 21V11h5M9 21V4h6v17M15 21v-9h5v9"/><path d="M12 8h.01M12 12h.01M12 16h.01M6.5 14.5h.01M17.5 15.5h.01"/>' },
    { id: 'state', content: '<path d="M5 4.5 10.5 6 15 3.5l4.5 4-1.5 4.5 2 4.5-5.5 4-4.5-2.5-5 1.5-1.5-5.5 2-4Z"/><circle cx="11.5" cy="12" r="1.6"/>' },
    { id: 'globe', content: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M4.6 7.5h14.8M4.6 16.5h14.8"/><path d="M12 3c2.4 2.4 3.6 5.4 3.6 9s-1.2 6.6-3.6 9c-2.4-2.4-3.6-5.4-3.6-9S9.6 5.4 12 3Z"/>' },
    { id: 'people', content: '<circle cx="9" cy="7.5" r="3.25"/><path d="M3 20.5v-1A6 6 0 0 1 9 13.5a6 6 0 0 1 6 6v1"/><circle cx="16.75" cy="8.5" r="2.5"/><path d="M16.5 13.5a4.75 4.75 0 0 1 4.5 4.75v2.25"/>' },
    { id: 'hierarchy', content: '<path d="M3 6 9 3l5 1.5 6-1 1 6.5-2 3.5 1.5 5.5-6.5 2-4.5-1.5L4 20.5 2.5 14l2-3.5Z"/><path d="M7.5 9 12 7.5 16.5 9 16 15l-4.5 1.5L7 14.5Z" stroke-dasharray="2 2.2"/><circle cx="11.75" cy="11.75" r="1.6" fill="currentColor"/>' }
  ]
}

// ---------------------------------------------------------------------------------------------
// Patterns: dots and polylines only, in palette keys. No placement of the logo or any symbol.

const description = 'Logo-free supporting pattern for map and place applications; a local application, not recovered love.fútbol artwork. Keep the complete logo separate.'
const ring = (cx, cy, r, steps = 72, from = 0, to = 360) => Array.from({ length: steps + 1 }, (_, i) => at(cx, cy, r, from + (to - from) * i / steps).map(f))
const rectangle = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]
// A filled spot drawn as linework, so it sits above the mowing stripes (dots draw first).
const spot = (cx, cy, colour = 'white') => ({ points: ring(cx, cy, 2.5, 16), colour, width: 5 })

const pitchLines = () => {
  const [x0, y0, w, h] = [80, 60, 800, 480]
  const mid = x0 + w / 2, cy = y0 + h / 2
  const line = points => ({ points, colour: 'white', width: 3 })
  const stripes = Array.from({ length: 6 }, (_, i) => ({ points: [[40 + i * 160, 0], [40 + i * 160, 600]], colour: 'light-green', width: 80, opacity: 0.16 }))
  const ends = [-1, 1].flatMap(side => {
    const goalLine = side < 0 ? x0 : x0 + w
    const box = (depth, half) => line([[goalLine, cy - half], [goalLine - side * depth, cy - half], [goalLine - side * depth, cy + half], [goalLine, cy + half]])
    const spotX = goalLine - side * 96
    // The arc outside the penalty area: points of a 72 px circle around the spot beyond 128 px.
    const limit = Math.acos(32 / 72) * 180 / Math.PI
    const arc = side < 0 ? ring(spotX, cy, 72, 36, -limit, limit) : ring(spotX, cy, 72, 36, 180 - limit, 180 + limit)
    return [box(128, 150), box(44, 64), line(arc), spot(spotX, cy),
      { points: [[goalLine, cy - 30], [goalLine + side * 14, cy - 30], [goalLine + side * 14, cy + 30], [goalLine, cy + 30]], colour: 'white', width: 3, opacity: 0.85 }]
  })
  const corners = [[x0, y0, 0, 90], [x0 + w, y0, 90, 180], [x0 + w, y0 + h, 180, 270], [x0, y0 + h, 270, 360]].map(([x, y, a, b]) => line(ring(x, y, 16, 12, a, b)))
  return {
    id: 'pitch-lines', title: '{name} / pitch lines', name: 'Pitch lines',
    description: `A top-down pitch in white line markings on website green. ${description}`,
    width: 960, height: 600, background: 'green',
    lines: [...stripes, line(rectangle(x0, y0, w, h)), line([[mid, y0], [mid, y0 + h]]), line(ring(mid, cy, 72, 96)), spot(mid, cy), ...ends, ...corners]
  }
}

const trainingCones = () => {
  const dots = []
  const lines = []
  for (let row = 0; row < 7; row++) {
    const y = 60 + row * 80
    const offset = row % 2 ? 60 : 0
    lines.push({ points: [[0, y + 40], [960, y + 40]], colour: 'light-green', width: 2, opacity: 0.55 })
    for (let col = 0; col < 9; col++) {
      const x = 60 + offset + col * 120
      if (x > 960) continue
      // Disc cones seen from above: a coloured ring with an open centre.
      dots.push({ cx: x, cy: y, r: 13, colour: row % 2 ? 'amber' : 'terracotta' })
      dots.push({ cx: x, cy: y, r: 4.5, colour: 'off-white' })
    }
  }
  return {
    id: 'training-cones', title: '{name} / training cones', name: 'Training cones',
    description: `Disc cones in a staggered drill grid, terracotta and amber on off-white. ${description}`,
    width: 960, height: 600, background: 'off-white', dots, lines
  }
}

// Deterministic, irregular closed outlines: a seeded generator keeps the artwork reproducible.
const random = seed => () => {
  seed |= 0; seed = seed + 0x6D2B79F5 | 0
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
  return ((t ^ t >>> 14) >>> 0) / 4294967296
}
const boundary = (cx, cy, radius, seed, steps = 44, rough = 0.16) => {
  const next = random(seed)
  const waves = [2, 3, 5].map(k => ({ k, a: (next() - 0.5) * rough, phase: next() * Math.PI * 2 }))
  const points = Array.from({ length: steps }, (_, i) => {
    const theta = i / steps * Math.PI * 2
    const wobble = waves.reduce((sum, { k, a, phase }) => sum + a * Math.sin(k * theta + phase), 0) + (next() - 0.5) * 0.05
    return at(cx, cy, radius * (1 + wobble), theta * 180 / Math.PI).map(f)
  })
  return [...points, points[0]]
}

const nestedBoundaries = () => {
  const [cx, cy] = [540, 318]
  const levels = [
    { r: 470, seed: 11, colour: 'light-green', width: 1.5, opacity: 0.7 },
    { r: 330, seed: 23, colour: 'light-green', width: 2.5, opacity: 0.9 },
    { r: 205, seed: 37, colour: 'green', width: 2.5, opacity: 0.6 },
    { r: 112, seed: 41, colour: 'green', width: 4, opacity: 1 }
  ]
  // Neighbouring areas at the outer levels make the nesting read as boundaries, not targets.
  const neighbours = [
    { points: boundary(90, 90, 210, 5), colour: 'light-green', width: 1.5, opacity: 0.45 },
    { points: boundary(930, 560, 230, 7), colour: 'light-green', width: 1.5, opacity: 0.45 },
    { points: boundary(860, 120, 120, 9), colour: 'light-green', width: 2.5, opacity: 0.55 }
  ]
  return {
    id: 'nested-boundaries', title: '{name} / nested boundaries', name: 'Nested boundaries',
    description: `Irregular outlines nested from country to state, city and neighbourhood, heavier and greener toward the place. ${description}`,
    width: 960, height: 600, background: 'off-white',
    lines: [...neighbours, ...levels.map(({ r, seed, ...style }) => ({ points: boundary(cx, cy, r, seed), ...style }))],
    dots: [{ cx, cy, r: 10, colour: 'white' }, { cx, cy, r: 7, colour: 'green' }]
  }
}

const courtPins = () => {
  const next = random(2006)
  const dots = []
  const lines = []
  const kinds = ['green', 'green', 'green', 'amber', 'green', 'terracotta', 'green', 'amber']
  let i = 0
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7; col++) {
      const x = 70 + col * 138 + (row % 2 ? 69 : 0) + (next() - 0.5) * 50
      const y = 70 + row * 115 + (next() - 0.5) * 40
      if (x > 940) continue
      const colour = kinds[i++ % kinds.length]
      if (colour === 'terracotta') {
        dots.push({ cx: x, cy: y, r: 21, colour: 'white' }, { cx: x, cy: y, r: 17.5, colour })
        // A cluster’s count reads as white figures in the atlas; three white dots stand in here.
        for (const dx of [-6, 0, 6]) dots.push({ cx: x + dx, cy: y, r: 2, colour: 'white' })
        continue
      }
      dots.push({ cx: x, cy: y, r: 13, colour: 'white' }, { cx: x, cy: y, r: 10.5, colour })
      if (colour === 'green') lines.push({ points: rectangle(x - 5.5, y - 4, 11, 8).map(p => p.map(f)), colour: 'white', width: 1.4 }, { points: [[f(x), f(y - 4)], [f(x), f(y + 4)]], colour: 'white', width: 1.4 })
    }
  }
  return {
    id: 'court-pins', title: '{name} / court pins', name: 'Court pins',
    description: `Atlas markers scattered over off-white: green profile pins with a small white pitch, amber homepage-only pins and terracotta clusters. ${description}`,
    width: 960, height: 600, background: 'off-white', dots, lines
  }
}

export const lovefutbolAtlasPatterns = () => [pitchLines(), trainingCones(), nestedBoundaries(), courtPins()]

// ---------------------------------------------------------------------------------------------
// Guide pages, from the guide’s own primitives (rect, path, text, para, nested).

const text = (value, x, y, size = 24, font = 'bold', colour = 'ink') => ({ type: 'text', text: value, x, y, size, font, colour })
const para = (value, x, y, width, size = 22) => ({ type: 'para', text: value, x, y, width, size, colour: 'ink' })
const rect = (x, y, width, height, fill, extra = {}) => ({ type: 'rect', x, y, width, height, fill, ...extra })
const path = (d, extra) => ({ type: 'path', d, ...extra })
const nested = (src, x, y, width, height) => ({ type: 'nested', src, x, y, width, height })
const circle = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`
const polygon = points => `M${points.map(pt).join('L')}Z`
// A filled band between two outlines traced in opposite directions: a heavier stroke drawn
// with the page’s fills, since guide paths take a colour but not a stroke width.
const band = (outer, inner) => `${polygon(outer)}${polygon([...inner].reverse())}`
const haloText = (value, x, y, size, font, colour, halo) => [[-1.5, 0], [1.5, 0], [0, -1.5], [0, 1.5], [-1, -1], [1, 1], [-1, 1], [1, -1]]
  .map(([dx, dy]) => text(value, x + dx, y + dy, size, font, halo)).concat(text(value, x, y, size, font, colour))

const marker = (cx, cy, r, colour, label) => [
  path(circle(cx, cy, r + 2.5), { fill: 'white' }), path(circle(cx, cy, r), { fill: colour }),
  ...(label ? [text(label, cx, cy + r * 0.42, r * 1.05, 'bold', 'white')].map(e => ({ ...e, anchor: 'middle' })) : [])
]
const selectedMarker = (x, y, s = 1) => {
  const p = (px, py) => [x + px * s, y + py * s]
  return [
    path(polygon([p(2.75, 10.75), p(39.25, 10.75), p(39.25, 37.25), p(2.75, 37.25)]), { fill: 'white' }),
    path(polygon([p(5, 13), p(37, 13), p(37, 35), p(5, 35)]), { fill: 'green' }),
    path(polygon([p(20.25, 13), p(21.75, 13), p(21.75, 35), p(20.25, 35)]), { fill: 'white' }),
    path(`${circle(...p(21, 24), 5.75 * s)}M${pt(p(21 + 4.25, 24))}a${4.25 * s} ${4.25 * s} 0 1 1 ${-8.5 * s} 0a${4.25 * s} ${4.25 * s} 0 1 1 ${8.5 * s} 0Z`, { fill: 'white' }),
    path(polygon([p(37.25, 13), p(38.75, 13), p(38.75, 2), p(37.25, 2)]), { fill: 'charcoal' }),
    path(polygon([p(38.75, 2), p(46.5, 5), p(38.75, 8)]), { fill: 'red' })
  ]
}

const mapSpecimen = (x0, y0, w, h) => {
  const X = x => x0 + x, Y = y => y0 + y
  const pts = list => list.map(([x, y]) => [X(x), Y(y)])
  const basemap = Object.fromEntries(lovefutbolAtlas.basemap.layers.map(layer => [layer.id, layer.hex]))
  const els = [rect(x0, y0, w, h, basemap.ground)]
  els.push(path(polygon(pts([[w, 250], [560, 290], [500, 360], [520, h], [w, h]])), { fill: basemap.water }))
  els.push(path(polygon(pts([[0, 0], [210, 0], [240, 60], [170, 120], [60, 110], [0, 150]])), { fill: basemap.woods }))
  // Residential blocks between white streets, buildings within some of them.
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    const bx = 30 + c * 92, by = 170 + r * 72
    if ((bx > 470 && by > 280) || (bx < 200 && by < 200)) continue
    els.push(rect(X(bx), Y(by), 80, 60, basemap.residential))
    if ((r + c) % 2) els.push(rect(X(bx + 10), Y(by + 10), 24, 18, basemap.buildings), rect(X(bx + 44), Y(by + 30), 26, 20, basemap.buildings))
  }
  els.push(path(polygon(pts([[300, 40], [460, 30], [480, 140], [320, 150]])), { fill: basemap.parks }))
  // OSM lens: a pitch, a playground and a school ground.
  els.push({ ...rect(X(352), Y(62), 92, 58, 'light-green', { stroke: 'white' }), opacity: 0.75 })
  els.push(path(`M${X(398)} ${Y(62)}V${Y(120)}`, { stroke: 'white' }))
  els.push({ ...path(polygon(pts([[230, 330], [290, 322], [296, 372], [236, 380]])), { fill: 'cyan' }), opacity: 0.35 })
  els.push({ ...rect(X(120), Y(250), 150, 82, 'amber'), opacity: 0.22 })
  els.push(path(`M${X(0)} ${Y(160)}H${X(560)}M${X(0)} ${Y(236)}H${X(500)}M${X(110)} ${Y(140)}V${Y(h)}M${X(296)} ${Y(150)}V${Y(h)}`, { stroke: 'white' }))
  els.push(path(`M${X(0)} ${Y(30)}C${X(160)} ${Y(70)} ${X(220)} ${Y(10)} ${X(300)} ${Y(0)}`, { stroke: basemap.admin, dash: '8 5' }))
  // Hierarchy: city and district dashed in forest, darker toward the neighbourhood.
  els.push({ ...path(polygon(pts([[40, 120], [280, 95], [520, 140], [540, 410], [300, 450], [60, 420]])), { stroke: 'forest', dash: '9 6' }), opacity: 0.3 })
  els.push({ ...path(polygon(pts([[110, 165], [300, 150], [470, 190], [470, 370], [280, 400], [120, 360]])), { stroke: 'forest', dash: '9 6' }), opacity: 0.5 })
  // Selected neighbourhood: 12% terracotta fill and a heavy terracotta outline.
  const outer = [[180, 200], [300, 188], [400, 225], [405, 320], [300, 345], [190, 320]]
  const inner = [[183, 203], [300, 191], [397, 227.5], [402, 317.5], [300, 342], [193, 317]]
  els.push({ ...path(polygon(pts(outer)), { fill: 'terracotta' }), opacity: 0.12 })
  els.push(path(band(pts(outer), pts(inner)), { fill: 'terracotta' }))
  // Walk ring around the selected space.
  els.push({ ...path(circle(X(300), Y(268), 135), { fill: 'cyan' }), opacity: 0.06 })
  els.push(path(circle(X(300), Y(268), 135), { stroke: 'cyan', dash: '6 6' }))
  els.push(...haloText('1 km · about a 12-minute walk', X(212), Y(124), 14, 'bold', 'charcoal', 'white'))
  els.push(...haloText('Neighbourhood', X(196), Y(228), 16, 'bold', 'charcoal', 'off-white'))
  // Markers.
  els.push(...marker(X(470), Y(110), 12, 'green', '27'), ...marker(X(150), Y(390), 12, 'green', '31'), ...marker(X(420), Y(400), 12, 'amber', '44'), ...marker(X(610), Y(120), 18, 'terracotta', '12'))
  els.push(...selectedMarker(X(272), Y(238), 1.4))
  return els
}

const swatchRow = (x, y, hex, label, detail, opacity) => [
  rect(x, y, 44, 30, '#F3F1EA', { stroke: 'line' }),
  { ...rect(x, y, 44, 30, hex), ...(opacity != null ? { opacity } : {}) },
  text(label, x + 60, y + 13, 19, 'bold'), text(detail, x + 60, y + 34, 16, 'body')
]

export const lovefutbolAtlasPages = () => {
  const { basemap, lens } = lovefutbolAtlas
  const ramp = ['#CFE7D6', '#B4DAC0', '#88C59B', '#68B17E', '#489D60']
  return [
    { name: 'Maps and places', title: 'Put each place on a quiet map', subtitle: 'Local choices from an unofficial companion atlas, informed by the website palette. Not official love.fútbol cartography.', elements: [
      ...mapSpecimen(64, 270, 700, 470),
      text('Basemap', 820, 290, 26),
      ...basemap.layers.flatMap((layer, i) => swatchRow(820 + (i % 2) * 280, 312 + Math.floor(i / 2) * 58, layer.hex, layer.label, layer.hex)),
      text('Neighbourhood lens', 820, 560, 26),
      ...lens.layers.flatMap((layer, i) => swatchRow(820, 582 + i * 54, layer.colour, layer.label, `${layer.hex} at ${Math.round(layer.opacity * 100)}%${layer.outline ? ', white outline' : ''}`, layer.opacity)),
      para('Labels: charcoal with an off-white halo. The seven basemap values are atlas choices, not observed brand colours; the lens and markers reuse observed palette keys. Pitch marker and walk ring are explained on the next page.', 64, 790, 1290, 22),
      para('Treat locations as approximate. Most come from the homepage map; others are geocoded from the place named on a profile.', 64, 880, 1290, 22)
    ] },
    { name: 'Markers, areas and data', title: 'Let each mark say one thing', subtitle: 'Marker colours, area outlines and source rules used by the atlas. Local application choices; keep their sources visible.', elements: [
      text('Markers', 64, 290, 26),
      ...marker(88, 336, 12, 'green', '27'), text('Profile page', 124, 332, 20), text('Green, white stroke, white number', 124, 356, 16, 'body'),
      ...marker(88, 406, 12, 'amber', '44'), text('Homepage map only', 124, 402, 20), text('Amber: no profile page to open', 124, 426, 16, 'body'),
      ...marker(88, 478, 18, 'terracotta', '12'), text('Cluster', 124, 472, 20), text('Terracotta with a white count', 124, 496, 16, 'body'),
      ...selectedMarker(64, 528, 1.05), text('Selected space', 124, 546, 20), text('A map symbol, never the logo', 124, 570, 16, 'body'),
      text('Areas', 520, 290, 26),
      ...ramp.map((hex, i) => ({ ...rect(520 + i * 56, 310, 56, 30, hex), opacity: 0.85 })),
      text('Countries by number of mapped projects', 520, 364, 17, 'body'),
      { ...rect(520, 386, 280, 40, 'terracotta'), opacity: 0.12 },
      path(band([[520, 386], [800, 386], [800, 426], [520, 426]], [[523, 389], [797, 389], [797, 423], [523, 423]]), { fill: 'terracotta' }),
      text('Selected area: 3 px outline, 12% fill', 520, 450, 17, 'body'),
      { ...path('M520 472H800', { stroke: 'forest', dash: '9 6' }), opacity: 0.3 },
      { ...path('M520 486H800', { stroke: 'forest', dash: '9 6' }), opacity: 0.42 },
      { ...path('M520 499.5H800M520 500.5H800', { stroke: 'forest', dash: '9 6' }), opacity: 0.55 },
      text('Other levels dashed, heavier inward', 520, 526, 17, 'body'),
      { ...path(circle(538, 556, 16), { fill: 'cyan' }), opacity: 0.06 },
      path(circle(538, 556, 16), { stroke: 'cyan', dash: '4 3' }), path(circle(538, 556, 2.5), { fill: 'charcoal' }),
      text('1 km walk ring, dashed cyan', 566, 562, 17, 'body'),
      text('Type', 900, 290, 26),
      text('Guatemala', 900, 360, 56, 'display'), text('128', 1200, 360, 56, 'display', 'green'),
      para('Bahianita for country and project names, counters and large numbers. Red Hat Text for the interface, legends and sources.', 900, 400, 470, 19),
      para('Photographs show in grayscale and return to colour on hover or focus, following the grayscale class on the website’s project grid.', 900, 500, 470, 19),
      rect(64, 630, 1312, 4, 'light-green'),
      text('Keep the data honest', 64, 690, 28),
      para('Name every source beside its figure: Wikidata, World Bank, U.S. Census ACS via Census Reporter, OpenStreetMap. Show the year of each population. Area statistics describe an administrative area, not the people a space serves.', 64, 738, 640, 21),
      para('Never imply love.fútbol produced third-party statistics. Quote its own counters as dated, attributed figures: pages disagree. Use project numbers only where a source gives them and note conflicts.', 736, 738, 640, 21),
      para('Coordinates are approximate: say where each came from.', 64, 880, 1290, 21)
    ] },
    { name: 'Atlas icons and patterns', title: 'Supporting graphics for places', subtitle: 'Original 24 px map icons and logo-free patterns. They never replace, repeat or abstract the complete logo.', elements: [
      ...lovefutbolAtlasIcons.items.flatMap((item, i) => {
        const x = 64 + (i % 9) * 146, y = 270 + Math.floor(i / 9) * 128
        return [nested(`icons/${item.id}`, x + 4, y, 56, 56), text(item.id, x, y + 84, 15, 'body')]
      }),
      ...lovefutbolAtlasPatterns().flatMap((spec, i) => [nested(`patterns/${spec.id}`, 64 + i * 330, 540, 302, 189), text(spec.name, 64 + i * 330, 760, 18, 'bold')]),
      para('Icons: 1.75 stroke, round caps and joins, drawn in the current text colour. Pair each with a visible label. Patterns use palette colours and linework only; place the complete logo separately with its full reserve.', 64, 830, 1290, 22)
    ] }
  ]
}

// ---------------------------------------------------------------------------------------------
// docs/ATLAS.md, from the same record.

export const lovefutbolAtlasMarkdown = (brand, register) => {
  const sources = new Map(register.sources.map(source => [source.id, source]))
  const link = id => {
    const source = sources.get(id)
    if (!source) throw new Error(`Atlas guidance references an unregistered source: ${id}`)
    return `[${source.title}](${source.url})`
  }
  const a = lovefutbolAtlas
  const percent = value => `${Math.round(value * 100)}%`
  return `# love.fútbol — maps, places and the digital atlas

Version ${brand.version} · reviewed 1 November 2026

These are **local application choices** made while building an unofficial, interactive map atlas of love.fútbol’s community sports spaces. They reuse the colours and type observed on the website and add map-specific decisions where the public material says nothing. They are not an organization-issued cartography standard, and love.fútbol has not reviewed or approved them. The machine-readable record is [atlas-cartography.json](../reference/atlas-cartography.json); the evidence behind the project map is in [site research §9](SITE-RESEARCH.md#9-the-homepage-project-map-and-dated-counters).

## Basemap

${a.basemap.note} ${a.basemap.starting}

| Layer | Hex | Use |
| --- | --- | --- |
${a.basemap.layers.map(layer => `| ${layer.label} | \`${layer.hex}\` | ${layer.use} |`).join('\n')}

Labels: ${a.basemap.labels.note} (\`${a.basemap.labels.hex}\` and \`${a.basemap.labels.secondaryHex}\`, halo \`${a.basemap.labels.haloHex}\`).

## Themes

${a.themes.note}

| Theme | Ground | Water | Roads | Labels | Countries reached | Use |
| --- | --- | --- | --- | --- | --- | --- |
${a.themes.items.map(t => `| ${t.label} | \`${t.ground}\` | \`${t.water}\` | \`${t.roads}\` | \`${t.labels}\` | ${t.choropleth.map(c => `\`${c}\``).join(' → ')} | ${t.use} |`).join('\n')}

${a.themes.satellite}

## Travel time

${a.travelTime.note}

${a.travelTime.bands.map(b => `- **${b.minutes} min:** ${b.label} \`${b.hex}\``).join('\n')}

${a.travelTime.people}

## Neighbourhood lens

${a.lens.note}

| Feature | Colour | Opacity | Note |
| --- | --- | ---: | --- |
${a.lens.layers.map(layer => `| ${layer.label} | ${brand.colourNames[layer.colour]} \`${layer.hex}\` | ${percent(layer.opacity)} | ${layer.note ?? ''} |`).join('\n')}

## Markers

| Marker | Treatment | Meaning |
| --- | --- | --- |
${a.markers.map(m => `| ${m.label} | ${brand.colourNames[m.fill]} \`${m.hex}\`${m.stroke ? ' with a white stroke' : ''}${m.flag ? `; red corner flag \`${m.flagHex}\`` : ''} | ${m.note} |`).join('\n')}

Colour is never the only signal: the tooltip and panel name the project and say whether it has a profile page. The selected-space marker is a small generic pitch. The logo is the complete preserved artwork and is never drawn as a map pin, cluster or favicon. The red flag on this marker uses the source flag red as a pointer to the selected place; it does not license other uses of the flag outside the logo.

## Areas

- **${a.areas.choropleth.label}:** ${brand.colourNames[a.areas.choropleth.from]} to ${brand.colourNames[a.areas.choropleth.to].toLowerCase()} by ${a.areas.choropleth.measure.toLowerCase()}, at ${percent(a.areas.choropleth.opacity)} (${percent(a.areas.choropleth.hoverOpacity)} on hover). ${a.areas.choropleth.note}
- **${a.areas.selected.label}:** a ${a.areas.selected.outlineWidthPx} px terracotta outline with a ${percent(a.areas.selected.fillOpacity)} terracotta fill.
- **${a.areas.hierarchy.label}:** dashed forest lines (${a.areas.hierarchy.dash.join('/')} dash), ${a.areas.hierarchy.widthPx.join('→')} px wide and ${a.areas.hierarchy.opacity.map(percent).join('→')} opaque. ${a.areas.hierarchy.note}
- **${a.areas.walkRing.label}:** a dashed cyan ${a.areas.walkRing.radiusKm} km circle (${a.areas.walkRing.widthPx} px, ${percent(a.areas.walkRing.fillOpacity)} fill) captioned “${a.areas.walkRing.caption}”. ${a.areas.walkRing.note}

## Type and photography

${a.type.map(entry => `- **${entry.font}:** ${entry.use}. ${entry.basis}`).join('\n')}
- **Photography:** ${a.photography.rule} ${a.photography.basis}

## Data honesty

${a.dataHonesty.map(entry => `- ${entry.rule}`).join('\n')}

Data sources used by the atlas: ${a.dataSources.map(link).join(' · ')}. They are third-party datasets, listed in the [source register](../reference/sources.json) so the attribution travels with the kit. They are not evidence about the love.fútbol identity.

## Icons and patterns

The kit adds ${lovefutbolAtlasIcons.items.length} original 24 px icons for map and place interfaces: ${lovefutbolAtlasIcons.items.map(item => `\`${item.id}\``).join(', ')}. They use a 1.75 stroke with round caps and joins in \`currentColor\`. Pair each with a visible text label. \`pitch\`, \`court-pin\` and \`corner-flag\` are generic football symbols drawn for the interface; none is traced from or substitutes for the logo.

The patterns ${lovefutbolAtlasPatterns().map(spec => `\`${spec.id}\``).join(', ')} are built from dots and lines in palette colours. None places, repeats or crops the logo, which stays a complete standalone placement (\`logoPolicy.standaloneSymbol: false\`). Use them as backgrounds for map panels, section breaks and atlas cards; keep text on a plain surface.

## Sources

${a.sources.map(id => `- ${link(id)}: ${sources.get(id).evidence}`).join('\n')}

Rebuild with \`npm run make:lovefutbol\`. Change [scripts/brands/lovefutbol-atlas.mjs](../../../scripts/brands/lovefutbol-atlas.mjs), not the generated files.
`
}
