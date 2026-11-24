// Device scenes as recipe figures: the Devices tab's drawn hardware with screenshots on its screens,
// rendered as SVG through Document Kit's diagram registry like the D3 and Mermaid figures.
//
//   {"renderer":"devices","source":{
//     "preset":"laptop-phone", "canvas":"fit", "background":null, "shadow":true,
//     "slots":[{"device":"laptop-14","screen":{"$image":"home-desktop"}},
//              {"device":"phone-island","screen":{"$image":"home-phone"},"fit":"cover"}]}}
//
// A phone or tablet screen has a status bar above the screenshot unless the slot says `"status":false`;
// `"status":{"colour":"#0b3d2e","time":"9:41"}` sets its colour and time.
// A screen is a PNG or JPEG: `{"type":"image/png","base64":"…"}`, a `data:` URL, or (in a job) a
// `{"$image":id}` naming another entry of the job's images, which recipeDocx resolves first. Only
// brandkit's drawn devices are accepted: the photographed frame sets need their image files or a
// browser, which a Word export in Node does not have.

import { CANVASES, DEVICES, PRESETS } from '../mockups/device-catalog.js'
import { layoutOf, sceneSvg } from '../mockups/device-frame.js'
import { hasStatusBar, screenHref } from '../mockups/device-screen.js'

const TYPES = new Set(['image/png', 'image/jpeg'])
const HEX = /^#[0-9a-f]{6}$/i
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

/** A screen image as a data URL, or null for a blank screen. */
export function screenUrl(screen) {
  if (screen === undefined || screen === null) return null
  if (typeof screen === 'string' && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(screen)) return screen
  if (isRecord(screen) && TYPES.has(screen.type) && typeof screen.base64 === 'string') return `data:${screen.type};base64,${screen.base64}`
  throw new Error('A device screen must be a PNG or JPEG: {"type","base64"}, a data URL or a job image.')
}

/** The scene's slots, checked: each a drawn device with its screen. */
export function deviceSlots(source) {
  if (!isRecord(source)) throw new Error('A device scene needs a source object.')
  const preset = source.preset ?? 'laptop-phone'
  if (!Object.hasOwn(PRESETS, preset)) throw new Error('Unknown device preset: ' + preset)
  const slots = source.slots ?? PRESETS[preset].slots.map((device) => ({ device }))
  if (!Array.isArray(slots) || !slots.length) throw new Error('A device scene needs at least one slot.')
  return slots.map((slot, index) => {
    if (!isRecord(slot)) throw new Error('Each device slot must be an object.')
    const id = slot.device ?? PRESETS[preset].slots[index]
    if (!Object.hasOwn(DEVICES, id)) throw new Error(`Device ${JSON.stringify(id)} is not one of brandkit's drawn devices.`)
    const device = DEVICES[id]
    if (slot.finish !== undefined && !device.finishes?.includes(slot.finish)) throw new Error(`${id} has no finish ${JSON.stringify(slot.finish)}.`)
    if (slot.turned && !device.rotates) throw new Error(`${id} does not turn.`)
    const turned = slot.turned === true, fit = slot.fit === 'contain' ? 'contain' : 'cover', href = screenUrl(slot.screen) ?? undefined
    // Phones and tablets show a status bar above the screenshot, as in the Devices tab, so nothing
    // sits under the camera cutout. `status: false` leaves the screenshot full screen.
    if (!href || slot.status === false || !hasStatusBar(device)) return { device, finish: slot.finish, turned, fit, href }
    const status = { colour: '#ffffff', time: '9:41', ...(isRecord(slot.status) ? slot.status : {}) }
    return { device, finish: slot.finish, turned, ...screenHref({ device, turned, href, fit, status }) }
  })
}

/** A Document Kit diagram adapter for device scenes. `brandColour` fills the `brand` finish. */
export function devicesAdapter({ brandColour } = {}) {
  return {
    id: 'devices',
    render(source) {
      const slots = deviceSlots(source)
      const preset = source.preset ?? 'laptop-phone'
      const canvas = Object.hasOwn(CANVASES, source.canvas ?? 'fit') ? (source.canvas ?? 'fit') : 'fit'
      const background = typeof source.background === 'string' && HEX.test(source.background) ? source.background : null
      const svg = sceneSvg({ slots, layout: source.layout === 'cluster' || source.layout === 'row' ? source.layout : layoutOf(preset),
        canvas, background, shadow: source.shadow !== false, brandColour, title: typeof source.title === 'string' ? source.title : 'Device mockup' })
      return { svg }
    }
  }
}

/** Replace `{"$image":id}` screens in a device source with the job's image of that name. */
export function bindDeviceScreens(source, images = {}) {
  if (!isRecord(source) || !Array.isArray(source.slots)) return source
  return {
    ...source,
    slots: source.slots.map((slot) => {
      const ref = isRecord(slot?.screen) && typeof slot.screen.$image === 'string' ? slot.screen.$image : null
      if (!ref) return slot
      const image = images[ref]
      if (!isRecord(image) || typeof image.base64 !== 'string') throw new Error('Unknown device screen image: ' + ref)
      return { ...slot, screen: { type: image.type, base64: image.base64 } }
    })
  }
}
