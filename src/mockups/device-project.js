// A screen mockup as data: which scene, which devices, what is on each screen. This module makes
// a new one, checks one that was saved before it is opened, and reads what a brand says about
// devices in brand.json:
//
//   "devices": {
//     "mockups": [{
//       "id": "field-app", "label": "Field app", "description": "…",
//       "preset": "three-screens", "canvas": "16:9", "background": "primary", "shadow": true,
//       "slots": [{ "device": "monitor-27", "finish": "graphite", "screen": { "file": "screens/desktop.png" } },
//                 { "device": "tablet-11", "screen": { "file": "screens/tablet.png" } },
//                 { "device": "phone-island", "turned": false, "screen": { "file": "screens/phone.png", "fit": "cover" } }]
//     }],
//     "frames": [{
//       "id": "rugged-handheld", "label": "Rugged handheld", "category": "phone",
//       "image": "devices/rugged-handheld.png", "size": [520, 1040],
//       "screen": { "x": 60, "y": 150, "width": 400, "height": 760, "radius": 12 },
//       "stature": 0.38, "rotates": true,
//       "source": { "name": "Photographed in house", "licence": "Owned by the brand" }
//     }]
//   }
//
// The devices themselves are brandkit's (device-catalog.js). A brand's mockups say which to use
// and name the screenshots in the brand's folder; a brand's frames add devices of its own as an
// image with a transparent screen opening, and must say where the image came from and under
// what licence, because a frame's artwork is licensed apart from the code that draws it.

import { CANVASES, CATEGORIES, DEVICES, FINISHES, PRESETS, SCHEMA } from './device-catalog.js'
import { SET_DEVICES } from './device-sets.js'
import { hasStatusBar } from './device-screen.js'

export { SCHEMA } from './device-catalog.js'

export const DEVICE_FILE_TYPES = Object.freeze({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' })
export const MAX_UPLOAD = 12 * 1024 * 1024

/** A path inside the brand's folder to an image a mockup can use, or null. */
export const deviceFile = (path) => (typeof path === 'string' && path.length <= 300 && !path.startsWith('/') && !/^[a-z]+:/i.test(path)
  && !path.split('/').includes('..') && Object.hasOwn(DEVICE_FILE_TYPES, path.split('.').pop().toLowerCase()) ? path : null)

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const positive = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0
const isId = (value) => typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(value)

const resolveColour = (brand, value, seen = new Set()) => {
  if (typeof value !== 'string') return null
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase()
  if (seen.has(value)) return null
  seen.add(value)
  const next = brand?.colours?.[value] ?? brand?.roles?.[value]
  return next ? resolveColour(brand, next, seen) : null
}

const framesOf = (brand) => (Array.isArray(brand?.devices?.frames) ? brand.devices.frames : [])
const mockupsOf = (brand) => (Array.isArray(brand?.devices?.mockups) ? brand.devices.mockups : [])

const frameProblem = (frame, taken) => {
  if (!isRecord(frame)) return 'must be an object.'
  if (!isId(frame.id)) return 'needs an `id` of lowercase letters, digits and hyphens.'
  if (Object.hasOwn(DEVICES, frame.id) || Object.hasOwn(SET_DEVICES, frame.id)) return 'has the `id` of a device brandkit already has.'
  if (taken.has(frame.id)) return 'has the same `id` as another frame.'
  if (typeof frame.label !== 'string' || !frame.label.trim()) return 'needs a `label`.'
  if (!Object.hasOwn(CATEGORIES, frame.category)) return `needs a \`category\`: one of ${Object.keys(CATEGORIES).join(', ')}.`
  if (!deviceFile(frame.image) || /\.jpe?g$/i.test(frame.image)) return 'needs an `image` inside the brand: a PNG or WebP with a transparent screen opening.'
  if (!Array.isArray(frame.size) || frame.size.length !== 2 || !frame.size.every(positive)) return 'needs a `size`: the image\'s width and height in pixels.'
  const screen = frame.screen
  if (!isRecord(screen) || ![screen.width, screen.height].every(positive) || ![screen.x, screen.y].every((value) => typeof value === 'number' && value >= 0)) return 'needs a `screen`: `x`, `y`, `width` and `height` of the opening, in the image\'s pixels.'
  if (screen.x + screen.width > frame.size[0] || screen.y + screen.height > frame.size[1]) return 'has a `screen` that reaches outside the image.'
  if (screen.radius != null && !(typeof screen.radius === 'number' && screen.radius >= 0)) return 'has a screen `radius` that is not a number.'
  if (frame.stature != null && !(positive(frame.stature) && frame.stature <= 2)) return 'has a `stature` outside 0 to 2.'
  // The frame's artwork is licensed apart from brandkit, so it has to say where it is from.
  if (!isRecord(frame.source) || typeof frame.source.name !== 'string' || !frame.source.name.trim() || typeof frame.source.licence !== 'string' || !frame.source.licence.trim()) return 'needs a `source` with a `name` and a `licence`: who made the frame\'s artwork and the terms it is used under.'
  for (const key of ['url', 'licenceUrl']) if (frame.source[key] != null && !/^https:\/\/[^\s]+$/.test(frame.source[key])) return `has a source \`${key}\` that is not an https address.`
  return null
}

/** A brand's frame as a catalogue entry. */
const frameDevice = (frame) => ({
  label: frame.label, note: frame.note ?? `${frame.source.name} · ${frame.source.licence}`, category: frame.category,
  screen: [frame.screen.width, frame.screen.height],
  frame: { image: frame.image, width: frame.size[0], height: frame.size[1], x: frame.screen.x, y: frame.screen.y, radius: frame.screen.radius ?? 0, floating: frame.category === 'browser' },
  stature: frame.stature ?? { phone: 0.42, tablet: 0.6, laptop: 0.6, desktop: 1, browser: 0.84, watch: 0.34, tv: 1.14 }[frame.category],
  rotates: Boolean(frame.rotates), finishes: [], brand: true,
  source: { name: frame.source.name, licence: frame.source.licence, url: frame.source.url ?? null, licenceUrl: frame.source.licenceUrl ?? null, credit: frame.source.credit ?? null }
})

/** brandkit's own drawn devices and every frame of the sets that ship with it. */
export const CATALOG = Object.freeze({ ...DEVICES, ...SET_DEVICES })

/** Every device a brand can use: brandkit's, the sets', then the brand's own frames that pass the checks. */
export const catalogFor = (brand) => {
  const catalog = { ...CATALOG }
  const taken = new Set()
  for (const frame of framesOf(brand)) {
    if (frameProblem(frame, taken)) continue
    taken.add(frame.id)
    catalog[frame.id] = frameDevice(frame)
  }
  return catalog
}

const slotFrom = (input, catalog, fallback) => {
  const id = Object.hasOwn(catalog, input?.device) ? input.device : fallback
  const device = catalog[id]
  const finish = device.finishes?.includes(input?.finish) ? input.finish : device.finishes?.[0] ?? null
  // A phone or tablet shows its status bar unless the mockup says not to.
  return { device: id, finish, turned: Boolean(input?.turned) && Boolean(device.rotates), status: hasStatusBar(device) && input?.status !== false, screen: { kind: 'brand', fit: 'cover', upload: null, file: null } }
}

const text = (value, limit, fallback) => (typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, '').slice(0, limit) : fallback)
/** The time and date the status bars show: one clock for the scene. */
const clockFrom = (input, fallback = { time: '9:41', date: '' }) => ({ time: text(input?.time, 8, fallback.time), date: text(input?.date, 24, fallback.date) })

/** A new mockup of a preset. Screens carry over from `previous` by position. */
export const createProject = (preset = 'three-screens', { catalog = CATALOG, previous = null, clock = null } = {}) => {
  const id = Object.hasOwn(PRESETS, preset) ? preset : 'three-screens'
  return {
    schema: SCHEMA, preset: id, canvas: previous?.canvas ?? '16:9', background: previous?.background ?? { kind: 'colour', value: '#ffffff' }, shadow: previous?.shadow ?? true, mockup: null,
    clock: clockFrom(previous?.clock ?? clock),
    slots: PRESETS[id].slots.map((device, index) => ({ ...slotFrom({ device }, catalog, device), screen: previous?.slots[index]?.screen ?? { kind: 'brand', fit: 'cover', upload: null, file: null } }))
  }
}

const UPLOAD = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/

/**
 * A saved mockup, checked before it is opened: every key read here is one this module knows, and
 * anything else in the file is dropped. Throws, with a sentence for the person, when the file is
 * not a mockup, names a device or a brand file that is not there, or carries an upload that is
 * not a PNG, JPEG or WebP. `files` are the brand's files a mockup may name.
 */
export const validateProject = (input, { catalog = CATALOG, files = [] } = {}) => {
  if (!isRecord(input) || input.schema !== SCHEMA) throw new Error('This file is not a device mockup made here.')
  if (!Object.hasOwn(PRESETS, input.preset)) throw new Error('This mockup uses a scene brandkit does not have.')
  const wanted = PRESETS[input.preset].slots.length
  if (!Array.isArray(input.slots) || input.slots.length !== wanted) throw new Error('This mockup does not have the devices its scene needs.')
  const background = isRecord(input.background) && input.background.kind === 'colour' && /^#[0-9a-f]{6}$/i.test(input.background.value ?? '')
    ? { kind: 'colour', value: input.background.value.toLowerCase() } : { kind: 'transparent' }
  const slots = input.slots.map((slot, index) => {
    if (!isRecord(slot) || !Object.hasOwn(catalog, slot.device)) throw new Error(`This mockup uses a device that is not available here${typeof slot?.device === 'string' ? ` (${slot.device.slice(0, 40)})` : ''}.`)
    const out = slotFrom(slot, catalog, slot.device)
    const screen = isRecord(slot.screen) ? slot.screen : {}
    out.screen.fit = screen.fit === 'contain' ? 'contain' : 'cover'
    if (screen.kind === 'upload') {
      const upload = screen.upload
      if (!isRecord(upload) || typeof upload.dataUrl !== 'string' || upload.dataUrl.length > MAX_UPLOAD * 1.4 || !UPLOAD.test(upload.dataUrl)) throw new Error(`The screenshot on device ${index + 1} is not a PNG, JPEG or WebP image.`)
      out.screen.kind = 'upload'
      out.screen.upload = { name: typeof upload.name === 'string' ? upload.name.slice(0, 120) : 'screenshot', dataUrl: upload.dataUrl, ...(positive(upload.width) && positive(upload.height) ? { width: Math.round(upload.width), height: Math.round(upload.height) } : {}), ...(/^#[0-9a-f]{6}$/i.test(upload.edge ?? '') ? { edge: upload.edge.toLowerCase() } : {}) }
    } else if (screen.kind === 'file') {
      if (!deviceFile(screen.file) || !files.includes(screen.file)) throw new Error('This mockup names a screenshot the open brand does not have.')
      out.screen.kind = 'file'
      out.screen.file = screen.file
    } else if (screen.kind === 'empty') out.screen.kind = 'empty'
    return out
  })
  return {
    schema: SCHEMA, preset: input.preset, canvas: Object.hasOwn(CANVASES, input.canvas) ? input.canvas : 'fit', background, shadow: input.shadow !== false,
    mockup: isId(input.mockup) ? input.mockup : null, clock: clockFrom(input.clock), slots
  }
}

/** What is wrong with what a brand says about devices, as sentences (none: an empty list). */
export const deviceProblems = (brand) => {
  if (brand?.devices == null) return []
  if (!isRecord(brand.devices)) return ['`devices` must be an object with `mockups` and, if the brand has frames of its own, `frames`.']
  const problems = []
  const { frames, mockups } = brand.devices
  if (frames != null && !Array.isArray(frames)) problems.push('`devices.frames` must be a list.')
  if (mockups != null && !Array.isArray(mockups)) problems.push('`devices.mockups` must be a list.')
  const taken = new Set()
  for (const [index, frame] of framesOf(brand).entries()) {
    const problem = frameProblem(frame, taken)
    if (problem) problems.push(`Device frame \`${frame?.id ?? index}\` ${problem}`)
    else taken.add(frame.id)
  }
  const catalog = catalogFor(brand)
  const ids = new Set()
  for (const [index, mockup] of mockupsOf(brand).entries()) {
    const name = `Device mockup \`${mockup?.id ?? index}\``
    const need = (ok, message) => { if (!ok) problems.push(`${name} ${message}`) }
    if (!isRecord(mockup)) { problems.push(`Device mockup ${index} must be an object.`); continue }
    need(isId(mockup.id), 'needs an `id` of lowercase letters, digits and hyphens.')
    need(!ids.has(mockup.id), 'has the same `id` as another mockup.')
    ids.add(mockup.id)
    if (!Object.hasOwn(PRESETS, mockup.preset)) { need(false, `names a \`preset\` brandkit does not have (${Object.keys(PRESETS).join(', ')}).`); continue }
    need(mockup.canvas == null || Object.hasOwn(CANVASES, mockup.canvas), `has a \`canvas\` that is not one of ${Object.keys(CANVASES).join(', ')}.`)
    need(mockup.background == null || mockup.background === 'transparent' || resolveColour(brand, mockup.background), 'has a `background` that is not `transparent`, a colour of the brand or #rrggbb.')
    need(mockup.clock == null || (isRecord(mockup.clock) && ['time', 'date'].every((key) => mockup.clock[key] == null || typeof mockup.clock[key] === 'string')), 'has a `clock` that is not `{ "time", "date" }` as text.')
    const wanted = PRESETS[mockup.preset].slots.length
    if (!Array.isArray(mockup.slots) || mockup.slots.length !== wanted) { need(false, `needs ${wanted} \`slots\` for the ${mockup.preset} scene.`); continue }
    for (const [at, slot] of mockup.slots.entries()) {
      const device = catalog[slot?.device]
      need(Boolean(device), `names a device brandkit and the brand do not have in slot ${at + 1}.`)
      if (!device) continue
      need(slot.finish == null || device.finishes?.includes(slot.finish), `asks for a finish the ${slot.device} does not come in (${(device.finishes ?? []).join(', ') || 'it has one'}).`)
      need(slot.screen?.file == null || deviceFile(slot.screen.file), `has a screen \`file\` in slot ${at + 1} that is not a PNG, JPEG or WebP inside the brand.`)
      need(slot.screen?.fit == null || ['cover', 'contain'].includes(slot.screen.fit), 'has a screen `fit` that is not `cover` or `contain`.')
      need(slot.status == null || typeof slot.status === 'boolean', 'has a `status` that is not true or false.')
    }
  }
  return problems
}

/** The brand's files its mockups and frames use: the only ones a saved mockup may name. */
export const deviceFiles = (brand) => [...new Set([
  ...mockupsOf(brand).flatMap((mockup) => (Array.isArray(mockup?.slots) ? mockup.slots : []).map((slot) => deviceFile(slot?.screen?.file))),
  ...framesOf(brand).map((frame) => deviceFile(frame?.image))
].filter(Boolean))]

/** The mockups a brand defines that pass the checks. One broken mockup, or a refused frame, does not hide the others. */
export const brandMockups = (brand) => {
  if (!deviceProblems(brand).length) return mockupsOf(brand)
  const taken = new Set()
  const frames = framesOf(brand).filter((frame) => { if (frameProblem(frame, taken)) return false; taken.add(frame.id); return true })
  return mockupsOf(brand).filter((mockup) => isRecord(mockup) && deviceProblems({ ...brand, devices: { frames, mockups: [mockup] } }).length === 0)
}

/** One of a brand's mockups as a project to open. */
export const mockupProject = (brand, mockup, catalog = catalogFor(brand)) => {
  const background = mockup.background === 'transparent' ? { kind: 'transparent' } : { kind: 'colour', value: resolveColour(brand, mockup.background ?? '#ffffff') ?? '#ffffff' }
  return {
    schema: SCHEMA, preset: mockup.preset, canvas: mockup.canvas ?? '16:9', background, shadow: mockup.shadow !== false, mockup: mockup.id, clock: clockFrom(mockup.clock),
    slots: mockup.slots.map((slot) => {
      const out = slotFrom(slot, catalog, slot.device)
      out.screen = slot.screen?.file ? { kind: 'file', fit: slot.screen.fit === 'contain' ? 'contain' : 'cover', upload: null, file: slot.screen.file } : { kind: 'brand', fit: 'cover', upload: null, file: null }
      return out
    })
  }
}

/** Where the frames in a mockup come from, for the credit under it: one line per outside source. */
export const creditsOf = (project, catalog = CATALOG) => {
  const seen = new Map()
  for (const slot of project.slots) {
    const device = catalog[slot.device]
    const source = device?.source
    if (!source || !(device.brand || device.set)) continue
    seen.set(`${source.name}|${source.licence}`, source)
  }
  return [...seen.values()]
}

export const finishLabel = (id, device) => device?.colourNames?.[id] ?? FINISHES[id]?.label ?? (id === '' ? 'Standard' : id)
