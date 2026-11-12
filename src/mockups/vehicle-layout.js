// Vehicle mockups: the project data and the placement math, with no rendering, so Node's tests
// can check them. Distances are metres on a car normalised to 4.7 m long; they place artwork in
// a visual mockup and are not measurements for cutting vinyl.

const area = (label, normal, uAxis, vAxis, origin, width, height) => Object.freeze({
  label,
  normal: Object.freeze(normal),
  uAxis: Object.freeze(uAxis),
  vAxis: Object.freeze(vAxis),
  origin: Object.freeze(origin),
  width,
  height
})

/**
 * The prepared body areas. Each is a rectangle on a plane facing outward from the body: `uAxis`
 * runs along it as the artwork reads, `vAxis` up it, so artwork on either side reads forwards.
 */
export const AREAS = Object.freeze({
  left: area('Left side', [0, 0, 1], [1, 0, 0], [0, 1, 0], [0, 0.82, 0], 2.8, 0.70),
  right: area('Right side', [0, 0, -1], [-1, 0, 0], [0, 1, 0], [0, 0.82, 0], 2.8, 0.70),
  hood: area('Bonnet', [0, 1, 0], [0, 0, -1], [-1, 0, 0], [-1.55, 0, 0], 1.38, 0.72),
  rear: area('Rear', [1, 0, 0], [0, 0, -1], [0, 1, 0], [0, 0.85, 0], 1.4, 0.60)
})

export const OPPOSITE = Object.freeze({ left: 'right', right: 'left' })
export const SCHEMA = 'brandkit-vehicle-mockup/1'
export const MODEL_IDS = Object.freeze(['shc', 'suv', 'compact'])
export const ARTWORK_KINDS = Object.freeze(['logo', 'fleet', 'upload'])
export const UPLOAD_TYPES = Object.freeze(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const MAX_DATA_URL_LENGTH = 8 * 1024 * 1024
const MIN_ASPECT = 0.1
const MAX_ASPECT = 20

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

const knownArea = (id) => {
  if (typeof id !== 'string' || !own(AREAS, id)) throw new Error('Unknown vehicle area.')
  return AREAS[id]
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
export const clampPlacement = (input, areaId, aspect) => {
  const bounds = knownArea(areaId)
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

export const createPlacement = (areaId, aspect) => clampPlacement({ u: 0, v: 0, width: 1.1, rotation: 0 }, areaId, aspect)

/** The placement mirrored onto the other side, so lettering still reads front to back. */
export const mirrorPlacement = (placement, areaId, aspect) => {
  const other = OPPOSITE[areaId]
  if (!other) throw new Error('Only a side can be copied to the other side.')
  return { area: other, placement: clampPlacement({ ...placement, u: -placement.u, rotation: -placement.rotation }, other, aspect) }
}

const text = (input, key, limit) => {
  if (!own(input, key) || typeof input[key] !== 'string' || input[key].length > limit) throw new Error(`Invalid ${key}; use at most ${limit} characters.`)
  return input[key]
}

const choice = (input, key, choices) => {
  if (!own(input, key) || typeof input[key] !== 'string' || !choices.includes(input[key])) throw new Error(`Invalid ${key}.`)
  return input[key]
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

/**
 * A saved mockup, checked before any of it is used: unknown keys are dropped, and every value is
 * copied, so the caller's object is never shared with the editor. `logos` lists the logo ids the
 * open brand offers; a project made with another brand's logo falls back to the first.
 */
export const validateProject = (input, { logos } = {}) => {
  record(input, 'mockup')
  if (!own(input, 'schema') || input.schema !== SCHEMA) throw new Error('Choose a mockup saved by brandkit’s vehicle mockups.')
  const model = choice(input, 'model', MODEL_IDS)
  if (!own(input, 'paint') || typeof input.paint !== 'string' || !/^#[0-9a-f]{6}$/i.test(input.paint)) throw new Error('Invalid body paint.')
  const artworkIn = record(input.artwork, 'artwork')
  const kind = choice(artworkIn, 'kind', ARTWORK_KINDS)
  let logo = text(artworkIn, 'logo', 200)
  if (logos?.length && !logos.includes(logo)) logo = logos[0]
  const upload = own(artworkIn, 'upload') ? uploadData(artworkIn.upload) : null
  if (kind === 'upload' && !upload) throw new Error('This mockup is missing its uploaded artwork.')
  const artwork = { kind, logo, tagline: text(artworkIn, 'tagline', 100), website: text(artworkIn, 'website', 80), upload }
  const areaId = choice(input, 'area', Object.keys(AREAS))
  const source = record(input.placements, 'artwork placements')
  if (!own(source, areaId)) throw new Error('The selected area has no artwork placement.')
  const placements = {}
  for (const [key, value] of Object.entries(source)) {
    knownArea(key)
    const placement = placementNumbers(value)
    if (placement.width <= 0) throw new Error('Artwork width must be positive.')
    placements[key] = placement
  }
  return { schema: SCHEMA, model, paint: input.paint.toLowerCase(), area: areaId, placements, artwork }
}

/** A deep copy of a project (placements and artwork are the only nested parts). */
export const copyProject = (project) => ({
  ...project,
  placements: Object.fromEntries(Object.entries(project.placements).map(([id, placement]) => [id, { ...placement }])),
  artwork: { ...project.artwork, upload: project.artwork.upload ? { ...project.artwork.upload } : null }
})
