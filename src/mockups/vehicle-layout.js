// Vehicle mockups: the project data and the placement math, with no rendering, so Node's tests
// can check them. Distances are metres on each vehicle at the length it is shown (a car 4.7 m,
// the work truck 6.77 m); they place artwork in a visual mockup and are not measurements for
// cutting vinyl.

const area = (label, normal, uAxis, vAxis, origin, width, height) => Object.freeze({
  label,
  normal: Object.freeze(normal),
  uAxis: Object.freeze(uAxis),
  vAxis: Object.freeze(vAxis),
  origin: Object.freeze(origin),
  width,
  height
})

// Every vehicle faces -x (its front) with its left side towards +z, standing on y = 0. An area's
// `uAxis` runs along it as the artwork reads and `vAxis` up it, so artwork on either side reads
// forwards; `origin` with u = v = 0 is the area's centre (its depth is found on the body).
const LEFT = [[0, 0, 1], [1, 0, 0], [0, 1, 0]]
const RIGHT = [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]
const HOOD = [[0, 1, 0], [0, 0, -1], [-1, 0, 0]]
const REAR = [[1, 0, 0], [0, 0, -1], [0, 1, 0]]
const side = (frame, label, x, y, width, height) => area(label, ...frame, [x, y, 0], width, height)

/** A car's prepared areas, as the vehicle studio prototype tuned them. */
export const AREAS = Object.freeze({
  left: side(LEFT, 'Left side', 0, 0.82, 2.8, 0.70),
  right: side(RIGHT, 'Right side', 0, 0.82, 2.8, 0.70),
  hood: area('Bonnet', ...HOOD, [-1.55, 0, 0], 1.38, 0.72),
  rear: area('Rear', ...REAR, [0, 0.85, 0], 1.4, 0.60)
})

/** The work truck's areas: the cab doors, the side of what is on the back, the hood, the rear. */
const truckAreas = (back) => {
  const body = back === 'canopy' ? { label: 'canopy', y: 1.86, height: 1.0 } : { label: 'body', y: 1.29, height: 1.15 }
  return Object.freeze({
    left: side(LEFT, 'Left doors', -0.55, 1.0, 2.0, 0.72),
    right: side(RIGHT, 'Right doors', -0.55, 1.0, 2.0, 0.72),
    'left-body': side(LEFT, `Left ${body.label}`, 1.92, body.y, 2.4, body.height),
    'right-body': side(RIGHT, `Right ${body.label}`, 1.92, body.y, 2.4, body.height),
    hood: area('Hood', ...HOOD, [-2.4, 0, 0], 1.6, 1.0),
    rear: area('Rear', ...REAR, [0, back === 'canopy' ? 1.5 : 1.3, 0], 1.7, back === 'canopy' ? 1.45 : 1.15)
  })
}

/**
 * Each vehicle: its areas, the length it is shown at, and where a rear-half wrap starts (an x on
 * the vehicle; the truck's starts where its canopy or service body does).
 */
export const VEHICLES = Object.freeze({
  shc: Object.freeze({ areas: AREAS, length: 4.7, rearHalf: -0.1 }),
  suv: Object.freeze({ areas: AREAS, length: 4.7, rearHalf: -0.1 }),
  compact: Object.freeze({ areas: AREAS, length: 4.7, rearHalf: -0.1 }),
  'truck-canopy': Object.freeze({ areas: truckAreas('canopy'), length: 6.77, rearHalf: 0.62 }),
  'truck-service': Object.freeze({ areas: truckAreas('service'), length: 6.83, rearHalf: 0.6 })
})
export const MODEL_IDS = Object.freeze(Object.keys(VEHICLES))
export const areasFor = (model) => VEHICLES[model]?.areas ?? AREAS

export const OPPOSITE = Object.freeze({ left: 'right', right: 'left', 'left-body': 'right-body', 'right-body': 'left-body' })
export const SCHEMA = 'brandkit-vehicle-mockup/2'
const OLD_SCHEMA = 'brandkit-vehicle-mockup/1'
export const ARTWORK_KINDS = Object.freeze(['logo', 'fleet', 'upload', 'file', 'none'])
export const WRAP_COVERAGE = Object.freeze(['none', 'sides', 'rear', 'full'])
export const WRAP_SOURCES = Object.freeze(['graphic', 'pattern', 'upload', 'file'])
export const WRAP_GRAPHICS = Object.freeze(['sweep', 'chevrons', 'stripes', 'two-tone'])
export const BACKDROPS = Object.freeze(['studio', 'dark', 'brand', 'outdoor'])
export const UPLOAD_TYPES = Object.freeze(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const MAX_DATA_URL_LENGTH = 8 * 1024 * 1024
const MIN_ASPECT = 0.1
const MAX_ASPECT = 20

export const VEHICLE_FILE_TYPES = Object.freeze({ svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' })

/** A path inside the brand's folder to an image a vehicle can carry, or null. */
export const vehicleFile = (path) => typeof path === 'string' && path.length <= 300 && !path.startsWith('/') && !/^[a-z]+:/i.test(path)
  && !path.split('/').includes('..') && Object.hasOwn(VEHICLE_FILE_TYPES, path.split('.').pop().toLowerCase()) ? path : null

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key)
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)

const record = (value, name) => {
  if (!isRecord(value)) throw new Error(`Invalid ${name}.`)
  return value
}

const finite = (object, key, name = key) => {
  if (!own(object, key) || typeof object[key] !== 'number' || !Number.isFinite(object[key])) throw new Error(`Invalid ${name}.`)
  return object[key]
}

const knownArea = (id, areas) => {
  if (typeof id !== 'string' || !own(areas, id)) throw new Error('Unknown vehicle area.')
  return areas[id]
}

const placementNumbers = (input) => {
  record(input, 'placement')
  return {
    u: finite(input, 'u', 'horizontal position'),
    v: finite(input, 'v', 'vertical position'),
    width: finite(input, 'width', 'artwork width'),
    rotation: finite(input, 'rotation', 'artwork rotation')
  }
}

export const validAspect = (aspect) => typeof aspect === 'number' && Number.isFinite(aspect) && aspect >= MIN_ASPECT && aspect <= MAX_ASPECT

/** Fits the whole rotated artwork rectangle inside its area: moved in, and made smaller if need be. */
export const clampPlacement = (input, areaId, aspect, areas = AREAS) => {
  const bounds = knownArea(areaId, areas)
  if (typeof aspect !== 'number' || !Number.isFinite(aspect) || aspect <= 0) throw new Error('Invalid artwork proportions.')
  const values = placementNumbers(input)
  const rotation = ((values.rotation % 360) + 540) % 360 - 180
  const radians = rotation * Math.PI / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))
  const uFactor = cos + sin / aspect
  const vFactor = sin + cos / aspect
  const maximum = Math.min(bounds.width / uFactor, bounds.height / vFactor)
  if (!Number.isFinite(maximum) || maximum <= 0) throw new Error('Artwork cannot fit this area.')
  // Very tall, narrow artwork may have to be narrower than the usual 0.15 m.
  const minimum = Math.min(0.15, maximum)
  const width = Math.max(minimum, Math.min(values.width, maximum))
  const uLimit = Math.max(0, (bounds.width - width * uFactor) / 2)
  const vLimit = Math.max(0, (bounds.height - width * vFactor) / 2)
  return {
    u: Math.max(-uLimit, Math.min(values.u, uLimit)),
    v: Math.max(-vLimit, Math.min(values.v, vLimit)),
    width,
    rotation
  }
}

export const createPlacement = (areaId, aspect, areas = AREAS) => clampPlacement({ u: 0, v: 0, width: 1.1, rotation: 0 }, areaId, aspect, areas)

/** The placement mirrored onto the other side, so lettering still reads front to back. */
export const mirrorPlacement = (placement, areaId, aspect, areas = AREAS) => {
  const other = OPPOSITE[areaId]
  if (!other || !areas[other]) throw new Error('Only a side can be copied to the other side.')
  return { area: other, placement: clampPlacement({ ...placement, u: -placement.u, rotation: -placement.rotation }, other, aspect, areas) }
}

/**
 * Where a cover-fitted wrap shows its artwork on a face: the texture's repeat and offset (in the
 * artwork's 0–1 coordinates). The artwork always covers the face; `scale` (1 or more) enlarges
 * it, and `offsetU` / `offsetV` (−1 to 1) move the visible window from one edge to the other.
 * `mirror` flips it left to right, for the other side of the vehicle.
 */
export const wrapWindow = ({ faceAspect, artAspect, scale = 1, offsetU = 0, offsetV = 0, mirror = false }) => {
  if (!(faceAspect > 0) || !(artAspect > 0)) throw new Error('Invalid wrap proportions.')
  const zoom = Math.max(1, Math.min(4, scale))
  // The part of the artwork the face shows at scale 1: all of one dimension, part of the other.
  let width = faceAspect < artAspect ? faceAspect / artAspect : 1
  let height = faceAspect < artAspect ? 1 : artAspect / faceAspect
  width /= zoom
  height /= zoom
  const clamp = (value) => Math.max(-1, Math.min(1, value))
  const x = (1 - width) * (clamp(offsetU) + 1) / 2
  const y = (1 - height) * (clamp(offsetV) + 1) / 2
  return mirror ? { repeat: [-width, height], offset: [x + width, y] } : { repeat: [width, height], offset: [x, y] }
}

const text = (input, key, limit) => {
  if (!own(input, key) || typeof input[key] !== 'string' || input[key].length > limit) throw new Error(`Invalid ${key}; use at most ${limit} characters.`)
  return input[key]
}

const choice = (input, key, choices) => {
  if (!own(input, key) || typeof input[key] !== 'string' || !choices.includes(input[key])) throw new Error(`Invalid ${key}.`)
  return input[key]
}

const hexColour = (value, name) => {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`Invalid ${name}.`)
  return value.toLowerCase()
}

/** A data URL of an image of an accepted type, checked without decoding it. */
export const checkImageDataUrl = (dataUrl) => {
  if (typeof dataUrl !== 'string' || dataUrl.length > MAX_DATA_URL_LENGTH) throw new Error('Uploaded artwork is too large or invalid.')
  const match = /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl)
  if (!match || match[1].length % 4 !== 0) throw new Error('Choose a PNG, JPEG, WebP or SVG image encoded as base64.')
  const payload = match[1]
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  // Canonical padding: the bits a padded final character leaves unused must be zero.
  if ((payload.endsWith('==') && alphabet.indexOf(payload[payload.length - 3]) % 16 !== 0)
    || (payload.endsWith('=') && !payload.endsWith('==') && alphabet.indexOf(payload[payload.length - 2]) % 4 !== 0)) {
    throw new Error('Invalid image base64 encoding.')
  }
  return dataUrl
}

const uploadData = (input) => {
  if (input == null) return null
  record(input, 'uploaded artwork')
  const name = text(input, 'name', 120)
  const aspect = finite(input, 'aspect', 'uploaded artwork proportions')
  if (!validAspect(aspect)) throw new Error('Uploaded artwork proportions must be between 1:10 and 20:1.')
  if (!own(input, 'dataUrl')) throw new Error('Uploaded artwork is too large or invalid.')
  return { dataUrl: checkImageDataUrl(input.dataUrl), name, aspect }
}

/** A wrap that covers nothing, in the brand's colours once it is turned on. */
export const defaultWrap = (colours = ['#d9021c', '#231f20']) => ({
  coverage: 'none', source: 'graphic', graphic: 'sweep', pattern: '', colours: [...colours],
  scale: 1, offsetU: 0, offsetV: 0, mirror: true, upload: null, file: ''
})

/**
 * One of the brand's own vehicle files, by path. A saved mockup may only name files the open
 * brand's liveries use (`files`), so it cannot point the editor anywhere else.
 */
const brandFile = (input, files) => {
  const path = own(input, 'file') ? input.file : ''
  if (path === '') return ''
  if (!vehicleFile(path) || (files && !files.includes(path))) throw new Error('This mockup names artwork the open brand does not have.')
  return path
}

const wrapData = (input, { patterns, files } = {}) => {
  record(input, 'wrap')
  const coverage = choice(input, 'coverage', WRAP_COVERAGE)
  const source = choice(input, 'source', WRAP_SOURCES)
  const graphic = choice(input, 'graphic', WRAP_GRAPHICS)
  let pattern = text(input, 'pattern', 200)
  if (patterns && !patterns.includes(pattern)) pattern = patterns[0] ?? ''
  if (!Array.isArray(input.colours) || input.colours.length !== 2) throw new Error('Invalid wrap colours.')
  const colours = input.colours.map((value) => hexColour(value, 'wrap colour'))
  const scale = finite(input, 'scale', 'wrap scale')
  const offsetU = finite(input, 'offsetU', 'wrap position')
  const offsetV = finite(input, 'offsetV', 'wrap position')
  if (scale < 1 || scale > 4 || Math.abs(offsetU) > 1 || Math.abs(offsetV) > 1) throw new Error('Invalid wrap scale or position.')
  if (typeof input.mirror !== 'boolean') throw new Error('Invalid wrap mirroring.')
  const upload = own(input, 'upload') ? uploadData(input.upload) : null
  if (coverage !== 'none' && source === 'upload' && !upload) throw new Error('This mockup is missing its uploaded wrap artwork.')
  if (coverage !== 'none' && source === 'pattern' && !pattern) throw new Error('This brand has no pattern for the wrap.')
  const file = brandFile(input, files)
  if (coverage !== 'none' && source === 'file' && !file) throw new Error('This mockup is missing its wrap artwork.')
  return { coverage, source, graphic, pattern, colours, scale, offsetU, offsetV, mirror: input.mirror, upload, file }
}

/**
 * A saved mockup, checked before any of it is used: unknown keys are dropped, and every value is
 * copied, so the caller's object is never shared with the editor. `logos` and `patterns` list the
 * ids the open brand offers; a mockup made with another brand's falls back to the first. A
 * mockup saved before wraps and backdrops existed (schema 1) opens with neither.
 */
export const validateProject = (input, { logos, patterns, files } = {}) => {
  record(input, 'mockup')
  if (!own(input, 'schema') || ![SCHEMA, OLD_SCHEMA].includes(input.schema)) throw new Error('Choose a mockup saved by brandkit’s vehicle mockups.')
  const model = choice(input, 'model', MODEL_IDS)
  const areas = areasFor(model)
  const paint = hexColour(input.paint, 'body paint')
  const artworkIn = record(input.artwork, 'artwork')
  const kind = choice(artworkIn, 'kind', ARTWORK_KINDS)
  let logo = text(artworkIn, 'logo', 200)
  if (logos?.length && !logos.includes(logo)) logo = logos[0]
  const upload = own(artworkIn, 'upload') ? uploadData(artworkIn.upload) : null
  if (kind === 'upload' && !upload) throw new Error('This mockup is missing its uploaded artwork.')
  const file = brandFile(artworkIn, files)
  if (kind === 'file' && !file) throw new Error('This mockup is missing its lettering artwork.')
  const artwork = { kind, logo, tagline: text(artworkIn, 'tagline', 100), website: text(artworkIn, 'website', 80), upload, file }
  const areaId = choice(input, 'area', Object.keys(areas))
  const source = record(input.placements, 'artwork placements')
  if (!own(source, areaId)) throw new Error('The selected area has no artwork placement.')
  const placements = {}
  for (const [key, value] of Object.entries(source)) {
    knownArea(key, areas)
    const placement = placementNumbers(value)
    if (placement.width <= 0) throw new Error('Artwork width must be positive.')
    placements[key] = placement
  }
  const wrap = input.schema === OLD_SCHEMA || !own(input, 'wrap') ? defaultWrap() : wrapData(input.wrap, { patterns, files })
  const backdrop = own(input, 'backdrop') ? choice(input, 'backdrop', BACKDROPS) : 'studio'
  // The brand livery the mockup started from, if any: only a name, for the picker to show.
  const livery = own(input, 'livery') && typeof input.livery === 'string' && input.livery.length <= 100 ? input.livery : null
  return { schema: SCHEMA, model, paint, area: areaId, placements, artwork, wrap, backdrop, livery }
}

/** A deep copy of a project. */
export const copyProject = (project) => ({
  ...project,
  placements: Object.fromEntries(Object.entries(project.placements).map(([id, placement]) => [id, { ...placement }])),
  artwork: { ...project.artwork, upload: project.artwork.upload ? { ...project.artwork.upload } : null },
  wrap: { ...project.wrap, colours: [...project.wrap.colours], upload: project.wrap.upload ? { ...project.wrap.upload } : null }
})
