// Configuration for imported pickups and retained legacy work-truck projects. These dimensions
// describe the visual preview, not manufacturer fitment. This module deliberately
// has no Three.js, model-loader or layout dependency so projects can be checked before loading.

export const CONFIGURATION_VERSION = 'generic-work-truck/1'
export const COVER_OPTIONS = Object.freeze([
  { value: 'open', label: 'Open bed' },
  { value: 'tonneau', label: 'Tonneau cover' },
  { value: 'cab-high', label: 'Cab-high canopy' },
  { value: 'raised', label: 'Raised canopy' },
  { value: 'commercial', label: 'Commercial canopy' }
].map(Object.freeze))
export const SIDE_OPTIONS = Object.freeze([
  { value: 'solid', label: 'Solid sides' },
  { value: 'windows', label: 'Side windows' },
  { value: 'hatches', label: 'Access hatches' }
].map(Object.freeze))
export const coverOptionsFor = (model) => model === 'pickup'
  ? COVER_OPTIONS.filter(({ value }) => value === 'open' || value === 'tonneau') : COVER_OPTIONS

export const isConfigurable = (model) => ['pickup', 'truck-canopy', 'truck-service'].includes(model)
export const hasCanopy = (configuration) => ['cab-high', 'raised', 'commercial'].includes(configuration?.cover)

export const defaultConfiguration = (model) => model === 'pickup'
  ? { cover: 'open', sides: 'solid', rack: false, canopyPaint: null }
  : model === 'truck-canopy'
  ? { cover: 'raised', sides: 'solid', rack: false, canopyPaint: null }
  : model === 'truck-service' ? { cover: 'service', sides: 'solid', rack: true, canopyPaint: null } : null

/** Reject malformed choices, but normalize options that do not exist on the selected body. */
export const normalizeConfiguration = (model, input) => {
  const defaults = defaultConfiguration(model)
  if (!defaults) return null
  if (input == null) return defaults
  if (typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid vehicle configuration.')
  const result = { ...defaults, ...input }
  const covers = model === 'truck-service' ? ['service'] : coverOptionsFor(model).map((entry) => entry.value)
  if (!covers.includes(result.cover)) throw new Error('This rear body does not support that cover.')
  if (!SIDE_OPTIONS.some((entry) => entry.value === result.sides)) throw new Error('Unknown canopy side option.')
  if (typeof result.rack !== 'boolean') throw new Error('Invalid rack option.')
  if (result.canopyPaint !== null && (typeof result.canopyPaint !== 'string' || !/^#[0-9a-f]{6}$/i.test(result.canopyPaint))) {
    throw new Error('Choose a valid component paint colour.')
  }
  if (model === 'pickup' && (result.rack || result.canopyPaint !== null || result.sides !== 'solid')) {
    throw new Error('This imported pickup supports its original open bed and tonneau cover only.')
  }
  return {
    cover: result.cover,
    sides: hasCanopy(result) ? result.sides : 'solid',
    rack: result.rack,
    canopyPaint: result.canopyPaint?.toLowerCase() ?? null
  }
}

const region = (label, normal, uAxis, vAxis, origin, width, height, component) => ({
  label, normal, uAxis, vAxis, origin, width, height, component,
  surfaceVersion: CONFIGURATION_VERSION
})
const side = (hand, label, x, y, width, height, component) => region(label,
  [0, 0, hand], [hand, 0, 0], [0, 1, 0], [x, y, 0], width, height, component)
const rear = (label, y, width, height, component) => region(label,
  [1, 0, 0], [0, 0, -1], [0, 1, 0], [0, y, 0], width, height, component)

export const canopyTop = (configuration) => configuration?.cover === 'cab-high' ? 2.04
  : configuration?.cover === 'commercial' ? 2.26 : 2.46

/**
 * Stable component surface IDs let the editor retain removed artwork. Window and hatch regions
 * are deliberately conservative rectangles that avoid glass, frames and handles. Legacy raised
 * solid sides keep their original placement frame and dimensions.
 */
export const configuredAreas = (model, baseAreas, input) => {
  if (!isConfigurable(model)) return baseAreas
  const configuration = normalizeConfiguration(model, input)
  if (model === 'truck-service' || model === 'pickup') return baseAreas
  const areas = { ...baseAreas }
  areas['left-bed'] = side(1, 'Left bed rail', 1.91, 1.17, 2.30, 0.16, 'bed')
  areas['right-bed'] = side(-1, 'Right bed rail', 1.91, 1.17, 2.30, 0.16, 'bed')
  if (!hasCanopy(configuration)) {
    delete areas['left-body']
    delete areas['right-body']
    areas.rear = rear('Tailgate', 1.00, 1.60, 0.43, 'bed')
    return areas
  }
  const top = canopyTop(configuration)
  const sides = configuration.sides
  const legacy = configuration.cover === 'raised' && sides === 'solid'
  if (!legacy) {
    const windowed = sides === 'windows'
    const y = windowed ? 1.425 : sides === 'hatches' ? (1.52 + top - 0.20) / 2 : (1.34 + top - 0.10) / 2
    const height = windowed ? 0.13 : sides === 'hatches' ? top - 1.72 : top - 1.34 - 0.18
    const width = sides === 'hatches' ? 1.92 : 2.24
    const description = windowed ? 'canopy below window' : sides === 'hatches' ? 'canopy access panel' : 'canopy'
    areas['left-body'] = side(1, `Left ${description}`, 1.94, y, width, height, 'canopy')
    areas['right-body'] = side(-1, `Right ${description}`, 1.94, y, width, height, 'canopy')
    areas.rear = rear('Tailgate', 1.00, 1.60, 0.43, 'bed')
  }
  // A rear mark and a roof mark can be independent of the door and side artwork.
  areas['canopy-rear'] = rear('Canopy rear panel', (1.56 + top - 0.12) / 2, 1.44, top - 1.56 - 0.12, 'canopy')
  if (!configuration.rack) {
    areas['canopy-roof'] = region('Canopy roof', [0, 1, 0], [0, 0, -1], [-1, 0, 0],
      [2.01, 0, 0], 1.64, 1.86, 'canopy')
  }
  return areas
}

export const componentForArea = (model, area) => {
  if (model === 'pickup' && (area.endsWith('-bed') || area === 'rear')) return 'bed'
  if (model === 'truck-service' && ['left-body', 'right-body', 'rear'].includes(area)) return 'service'
  if (model === 'truck-canopy' && (['left-body', 'right-body'].includes(area) || area.startsWith('canopy-'))) return 'canopy'
  if (model === 'truck-canopy' && (area.endsWith('-bed') || area === 'rear')) return 'bed'
  return 'cab'
}

export const configurationSummary = (model, input) => {
  const configuration = normalizeConfiguration(model, input)
  if (!configuration) return ''
  const name = configuration.cover === 'service' ? 'Service body' : COVER_OPTIONS.find((entry) => entry.value === configuration.cover).label
  const detail = hasCanopy(configuration) ? SIDE_OPTIONS.find((entry) => entry.value === configuration.sides).label : ''
  return [name, detail, configuration.rack ? 'Ladder rack' : ''].filter(Boolean).join(' · ')
}
