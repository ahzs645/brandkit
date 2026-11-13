// Frame sets: devices from other projects, offered beside brandkit's own drawn frames. Each set is
// a folder in ./frames/ made by scripts/device-frames.mjs: a set.json with every frame measured,
// the files the frames need, and the project's licence (./frames/NOTICES.md lists them).
//
//   image sets   a transparent image of the device with an opening where the screen is
//                (Open Device Frame). They draw everywhere brandkit draws.
//   css sets     the device drawn by a stylesheet over a few elements (Devices.css, React
//                MockFrame). They are placed in the scene as HTML, so they show in a browser and
//                in its PNG exports, but not where there is no browser (a Node render).
//
// The frames in these sets depict real products. Their artwork is the set's own, under the set's
// licence; the product names and designs belong to their makers.

import openDeviceFrame from './frames/open-device-frame/set.json' with { type: 'json' }
import devicesCss from './frames/devices-css/set.json' with { type: 'json' }
import reactMockframe from './frames/react-mockframe/set.json' with { type: 'json' }

export const FRAME_SETS = Object.freeze([openDeviceFrame, devicesCss, reactMockframe])

/** The set brandkit draws itself, named like the others so a list can show them together. */
export const DRAWN_SET = Object.freeze({ id: 'drawn', label: 'brandkit', kind: 'drawn', note: 'Generic hardware drawn for brandkit: mixes freely, any finish, any orientation.' })

const STATURE = { phone: 0.42, tablet: 0.6, laptop: 0.6, desktop: 1, watch: 0.34, tv: 1.14, browser: 0.84 }
const sourceOf = (set) => ({ name: set.source.name, licence: set.source.licence, url: set.source.url, licenceUrl: set.source.licenceUrl, creator: set.source.creator ?? null, credit: null })
const title = (text) => text.replace(/(^|[-\s])([a-z])/g, (match, gap, letter) => `${gap === '-' ? ' ' : gap}${letter.toUpperCase()}`)

const imageDevice = (set, frame) => ({
  label: frame.label, note: `${set.label} · ${set.source.licence}`, category: frame.category, set: set.id, maker: frame.maker ?? null,
  screen: [frame.screen.width, frame.screen.height],
  frame: { image: `${set.id}/${frame.image}`, width: frame.size[0], height: frame.size[1], x: frame.screen.x, y: frame.screen.y, radius: frame.screen.radius ?? 0 },
  stature: STATURE[frame.category], rotates: true, finishes: [], source: sourceOf(set)
})

const cssPose = (pose) => ({ markup: pose.markup, width: pose.size[0], height: pose.size[1], offset: pose.offset, screen: { x: pose.screen.x, y: pose.screen.y, width: pose.screen.width, height: pose.screen.height } })

const cssDevice = (set, frame) => ({
  label: frame.label, note: `${set.label} · ${set.source.licence}`, category: frame.category, set: set.id,
  screen: [Math.round(frame.screen.width), Math.round(frame.screen.height)],
  css: { set: set.id, upright: cssPose(frame), turned: frame.turned ? cssPose(frame.turned) : null },
  stature: STATURE[frame.category], rotates: Boolean(frame.turned),
  // A CSS frame's finishes are the colour classes its stylesheet has; '' is the one it has without any.
  finishes: frame.colours.length ? frame.colours : [''], colourNames: Object.fromEntries(frame.colours.map((colour) => [colour, title(colour)])),
  source: sourceOf(set)
})

/** Every frame of every set, as catalogue entries keyed by id. */
export const SET_DEVICES = Object.freeze(Object.fromEntries(FRAME_SETS.flatMap((set) => set.frames.map((frame) => [frame.id, Object.freeze(set.kind === 'css' ? cssDevice(set, frame) : imageDevice(set, frame))]))))

/** The stylesheet file a css set's frames need, by set id. */
export const SET_STYLESHEETS = Object.freeze(Object.fromEntries(FRAME_SETS.filter((set) => set.kind === 'css').map((set) => [set.id, `${set.id}/${set.stylesheet}`])))

export const setOf = (device) => device?.set ?? (device?.brand ? 'brand' : 'drawn')
