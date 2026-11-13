// Device mockups: the catalogue, the frames drawn from it, the scenes, the checks a saved mockup
// passes before it is opened, and what a brand may say about devices. The tab itself is checked
// in a browser (test/browser/devices.check.mjs).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import { CANVASES, CATEGORIES, DEVICES, FINISHES, PRESETS, SCHEMA, bezelOf, variantsOf } from '../src/mockups/device-catalog.js'
import { deviceArt, deviceSvg, finishOf, sceneLayout, sceneSvg, svgDataUrl } from '../src/mockups/device-frame.js'
import { MAX_UPLOAD, brandMockups, catalogFor, createProject, creditsOf, deviceFile, deviceFiles, deviceProblems, mockupProject, validateProject } from '../src/mockups/device-project.js'
import { brandScreen, logoFor } from '../src/mockups/device-artwork.js'
import { validateBrand as validate } from '../src/engine/brand.js'

const northwind = JSON.parse(readFileSync(new URL('../brands/northwind/brand.json', import.meta.url), 'utf8'))
const render = (svg, width = 400) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render()
const PNG = `data:image/png;base64,${Buffer.from(render('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><rect width="4" height="4" fill="#ff0000"/></svg>', 4).asPng()).toString('base64')}`
const pixel = (image, x, y) => { const at = (Math.round(y) * image.width + Math.round(x)) * 4; return [...image.pixels.subarray(at, at + 4)] }

test('every device is complete: a category, a screen, finishes it can be drawn in, a source', () => {
  assert.ok(Object.keys(DEVICES).length >= 20)
  for (const category of Object.keys(CATEGORIES)) assert.ok(Object.values(DEVICES).some((device) => device.category === category), `no ${category}`)
  for (const [id, device] of Object.entries(DEVICES)) {
    assert.match(id, /^[a-z0-9][a-z0-9-]*$/)
    assert.ok(device.label && device.note, id)
    assert.ok(Object.hasOwn(CATEGORIES, device.category), id)
    assert.ok(device.screen.length === 2 && device.screen.every((value) => Number.isInteger(value) && value > 100), id)
    assert.ok(bezelOf(device).length === 4 && bezelOf(device).every((value) => value > 0), id)
    assert.ok(device.stature > 0 && device.stature <= 1.2, id)
    assert.ok(device.finishes.length >= 2 && device.finishes.every((finish) => Object.hasOwn(FINISHES, finish)), id)
    assert.equal(device.source.name, 'Drawn for brandkit', `${id}: built-in frames are brandkit's own drawings`)
    assert.equal(variantsOf(device), device.finishes.length * (device.rotates ? 2 : 1))
  }
  // Labels are what someone chooses between, so no two read the same.
  assert.equal(new Set(Object.values(DEVICES).map((device) => device.label)).size, Object.keys(DEVICES).length)
  assert.ok(Object.values(DEVICES).reduce((sum, device) => sum + variantsOf(device), 0) >= 140)
})

test('a frame is drawn round its screen, and a turned phone is the same phone on its side', () => {
  for (const [id, device] of Object.entries(DEVICES)) {
    const art = deviceArt(device)
    const [w, h] = device.screen
    assert.deepEqual([art.screen.width, art.screen.height], [w, h], id)
    assert.ok(art.screen.x >= 0 && art.screen.y >= 0 && art.screen.x + w <= art.width && art.screen.y + h <= art.height, `${id}: the screen is inside the frame`)
    const turned = deviceArt(device, { turned: true })
    if (device.rotates) {
      assert.deepEqual([turned.width, turned.height], [art.height, art.width], id)
      assert.deepEqual([turned.screen.width, turned.screen.height], [h, w], id)
      assert.equal(turned.turned, true)
    } else assert.deepEqual([turned.width, turned.height, turned.turned], [art.width, art.height, false], `${id} does not turn`)
    // Every frame is well-formed SVG that draws.
    assert.ok(render(deviceSvg(device, { href: PNG }), 200).width === 200, id)
  }
})

test('a screenshot fills the screen and stops at its edge', () => {
  const device = DEVICES['tablet-11']
  const art = deviceArt(device)
  const image = render(deviceSvg(device, { href: PNG, finish: 'silver' }), art.width)
  assert.deepEqual(pixel(image, art.screen.x + art.screen.width / 2, art.screen.y + art.screen.height / 2), [255, 0, 0, 255], 'the middle of the screen is the screenshot')
  const [r, g, b] = pixel(image, art.screen.x / 2, art.height / 2)
  assert.ok(!(r === 255 && g === 0 && b === 0), 'the bezel is not')
  assert.deepEqual(pixel(image, 1, 1)[3], 0, 'outside the rounded corner is transparent')
  // A rounded screen clips the image at its corners.
  const phone = deviceArt(DEVICES['phone-island'])
  const corner = pixel(render(deviceSvg(DEVICES['phone-island'], { href: PNG }), phone.width), phone.screen.x + 2, phone.screen.y + 2)
  assert.notDeepEqual(corner, [255, 0, 0, 255])
})

test('finishes: the catalogue\'s, and the brand\'s own colour', () => {
  const device = DEVICES['laptop-14']
  assert.equal(finishOf(device, 'silver').body, FINISHES.silver.body)
  assert.equal(finishOf(device, 'no-such-finish').id, device.finishes[0], 'an unknown finish falls back to the first')
  const brand = finishOf(device, 'brand', '#1F4E46')
  assert.deepEqual([brand.id, brand.body], ['brand', '#1f4e46'])
  assert.notEqual(brand.rim, brand.body)
  assert.equal(finishOf(device, 'brand', 'not a colour').body, FINISHES.graphite.body)
  assert.equal(finishOf(DEVICES.browser, 'graphite').id, 'light', 'a window comes light or dark')
})

test('scenes: side by side on one baseline, or clustered in front of the first', () => {
  const arts = ['monitor-27', 'tablet-11', 'phone-island'].map((id) => deviceArt(DEVICES[id]))
  const statures = [1, 0.6, 0.42]
  const row = sceneLayout(arts, statures, 'row')
  assert.ok(row.items.every((item) => Math.abs(item.y + item.h) < 1e-6), 'a row stands on one baseline')
  assert.ok(row.items[0].x + row.items[0].w < row.items[1].x && row.items[1].x + row.items[1].w < row.items[2].x, 'and does not overlap')
  assert.ok(Math.abs(row.items[0].h - 1000) < 1e-6 && Math.abs(row.items[2].h - 420) < 1e-6, 'each as tall as its stature')
  const cluster = sceneLayout(arts, statures, 'cluster')
  assert.ok(cluster.items[1].x < cluster.items[0].x + cluster.items[0].w && cluster.items[1].x + cluster.items[1].w > cluster.items[0].x + cluster.items[0].w, 'the second overlaps the first\'s right edge')
  assert.ok(cluster.items[2].x < 0, 'the third stands out to the left')
  assert.ok(cluster.items[1].order > cluster.items[0].order, 'and both are drawn in front')
  // A turned phone keeps its size: it is as wide as it was tall.
  const upright = sceneLayout([deviceArt(DEVICES['phone-island'])], [0.42]).items[0]
  const turned = sceneLayout([deviceArt(DEVICES['phone-island'], { turned: true })], [0.42]).items[0]
  assert.ok(Math.abs(upright.h - turned.w) < 1e-6)
})

test('every preset draws, at every canvas shape, with and without a background', () => {
  for (const [id, preset] of Object.entries(PRESETS)) {
    assert.ok(preset.slots.length >= 1 && preset.slots.length <= 3 && preset.slots.every((device) => Object.hasOwn(DEVICES, device)), id)
    for (const canvas of Object.keys(CANVASES)) {
      const svg = sceneSvg({ slots: preset.slots.map((device) => ({ device: DEVICES[device], href: PNG })), layout: preset.layout, canvas, background: canvas === 'fit' ? null : '#0b2b4a' })
      const [, , w, h] = /viewBox="([^"]+)"/.exec(svg)[1].split(' ').map(Number)
      if (CANVASES[canvas]) assert.ok(Math.abs(w / h - CANVASES[canvas]) < 0.005, `${id} at ${canvas}`)
      assert.equal((svg.match(/<clipPath /g) ?? []).length, preset.slots.length, `${id}: one screen per device`)
      const image = render(svg, 320)
      assert.deepEqual(pixel(image, 2, 2)[3], canvas === 'fit' ? 0 : 255, `${id}: ${canvas === 'fit' ? 'transparent' : 'filled'} outside the devices`)
    }
  }
  assert.throws(() => sceneSvg({ slots: [] }), /at least one device/)
})

test('a brand screen carries the logo that reads on its ground', () => {
  const logos = [{ id: 'a/horizontal/black', ink: '#000000', make: () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 2"><rect width="10" height="2"/></svg>' },
    { id: 'a/stacked/white', ink: '#ffffff', make: () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><rect width="4" height="4" fill="#fff"/></svg>' },
    { id: 'a/horizontal/white', ink: '#ffffff', make: () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 2"><rect width="10" height="2" fill="#fff"/></svg>' }]
  assert.equal(logoFor(logos, '#0b2b4a', true).id, 'a/horizontal/white')
  assert.equal(logoFor(logos, '#0b2b4a', false).id, 'a/stacked/white')
  assert.equal(logoFor(logos, '#ffffff', true).id, 'a/horizontal/black')
  assert.equal(logoFor([], '#ffffff', true), null)
  const url = brandScreen({ logos, ground: '#0b2b4a', width: 400, height: 800 })
  assert.match(url, /^data:image\/svg\+xml;charset=utf-8,/)
  const image = render(decodeURIComponent(url.slice(url.indexOf(',') + 1)), 100)
  assert.deepEqual(pixel(image, 2, 2), [11, 43, 74, 255], 'the ground')
  assert.deepEqual(pixel(image, 50, 100), [255, 255, 255, 255], 'the logo in the middle')
  assert.match(brandScreen({ logos: [], ground: 'nope', width: 10, height: 10 }), /16181c/)
  // A scene with brand screens nests an SVG image inside an image, and still draws.
  assert.ok(render(sceneSvg({ slots: [{ device: DEVICES['phone-punch'], href: url }] }), 200).height > 0)
  assert.match(svgDataUrl('<svg/>'), /%3Csvg/)
})

test('a new mockup, and what a saved one must pass before it is opened', () => {
  const project = createProject('three-screens')
  assert.deepEqual([project.schema, project.slots.map((slot) => slot.device)], [SCHEMA, ['monitor-27', 'tablet-11', 'phone-island']])
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project))), project, 'a new mockup round-trips')
  assert.equal(createProject('no-such-scene').preset, 'three-screens')
  // Changing the scene keeps the screens, by position.
  const withUpload = { ...project, slots: project.slots.map((slot, index) => (index === 0 ? { ...slot, screen: { kind: 'upload', fit: 'contain', file: null, upload: { name: 'home.png', dataUrl: PNG, width: 4, height: 4 } } } : slot)) }
  assert.equal(createProject('single', { previous: withUpload }).slots[0].screen.upload.name, 'home.png')
  const opened = validateProject(JSON.parse(JSON.stringify({ ...withUpload, extra: 'dropped', slots: withUpload.slots.map((slot) => ({ ...slot, onload: 'x' })) })))
  assert.ok(!('extra' in opened) && !('onload' in opened.slots[0]), 'unknown keys are dropped')
  assert.deepEqual(opened.slots[0].screen, withUpload.slots[0].screen)

  const broken = (changes, pattern) => assert.throws(() => validateProject({ ...JSON.parse(JSON.stringify(project)), ...changes }), pattern)
  broken({ schema: 'brandkit-vehicle-mockup/2' }, /not a device mockup/)
  broken({ preset: 'everything' }, /scene brandkit does not have/)
  broken({ slots: project.slots.slice(0, 2) }, /devices its scene needs/)
  broken({ slots: project.slots.map((slot, index) => (index ? slot : { ...slot, device: 'phone-from-elsewhere' })) }, /device that is not available here \(phone-from-elsewhere\)/)
  const withScreen = (screen) => ({ slots: project.slots.map((slot, index) => (index ? slot : { ...slot, screen })) })
  broken(withScreen({ kind: 'upload', upload: { name: 'x.svg', dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+' } }), /not a PNG, JPEG or WebP/)
  broken(withScreen({ kind: 'upload', upload: { name: 'x.png', dataUrl: 'https://example.com/x.png' } }), /not a PNG, JPEG or WebP/)
  broken(withScreen({ kind: 'upload', upload: { name: 'x.png', dataUrl: `data:image/png;base64,${'A'.repeat(MAX_UPLOAD * 1.5)}` } }), /not a PNG, JPEG or WebP/)
  broken(withScreen({ kind: 'file', file: 'screens/home.png' }), /screenshot the open brand does not have/)
  broken(withScreen({ kind: 'file', file: '../other-brand/secret.png' }), /screenshot the open brand does not have/)
  // Things that are merely out of range are put right instead of refused.
  const tidy = validateProject({ ...JSON.parse(JSON.stringify(project)), canvas: '21:9', background: { kind: 'colour', value: 'red' }, shadow: 'yes',
    slots: project.slots.map((slot, index) => ({ ...slot, finish: 'chrome', turned: true, ...(index ? {} : { screen: { kind: 'who-knows', fit: 'stretch' } }) })) })
  assert.deepEqual([tidy.canvas, tidy.background, tidy.shadow], ['fit', { kind: 'transparent' }, true])
  assert.deepEqual(tidy.slots.map((slot) => [slot.finish, slot.turned]), [['graphite', false], ['graphite', true], ['graphite', true]], 'a monitor does not turn')
  assert.deepEqual(tidy.slots[0].screen, { kind: 'brand', fit: 'cover', upload: null, file: null })
})

const withDevices = (devices) => ({ ...northwind, devices })
const frame = (changes = {}) => ({ id: 'rugged-handheld', label: 'Rugged handheld', category: 'phone', image: 'devices/rugged-handheld.png', size: [520, 1040], screen: { x: 60, y: 150, width: 400, height: 760, radius: 12 }, rotates: true,
  source: { name: 'Photographed in house', licence: 'Owned by the brand' }, ...changes })
const mockup = (changes = {}) => ({ id: 'field-app', label: 'Field app', description: 'The field app on its three screens.', preset: 'three-screens', background: 'primary',
  slots: [{ device: 'monitor-27', finish: 'silver', screen: { file: 'screens/desktop.png' } }, { device: 'tablet-11', screen: { file: 'screens/tablet.webp', fit: 'contain' } }, { device: 'rugged-handheld', turned: true }], ...changes })

test('a brand\'s own mockups and frames', () => {
  assert.equal(deviceFile('screens/home.PNG'), 'screens/home.PNG')
  for (const path of ['/etc/passwd.png', 'https://example.com/a.png', '../a.png', 'screens/a.svg', 'screens/a.gif', 42]) assert.equal(deviceFile(path), null, String(path))

  const brand = withDevices({ frames: [frame()], mockups: [mockup()] })
  assert.deepEqual(deviceProblems(brand), [])
  assert.deepEqual(validate(brand), validate(northwind), 'a brand with devices passes the brand\'s own checks')
  assert.deepEqual(deviceProblems(northwind), [], 'and a brand without says nothing')
  const catalog = catalogFor(brand)
  assert.equal(Object.keys(catalog).length, Object.keys(DEVICES).length + 1)
  const added = catalog['rugged-handheld']
  assert.deepEqual([added.screen, added.frame.x, added.rotates, added.brand, added.source.licence], [[400, 760], 60, true, true, 'Owned by the brand'])
  assert.deepEqual(deviceFiles(brand).sort(), ['devices/rugged-handheld.png', 'screens/desktop.png', 'screens/tablet.webp'])

  const project = mockupProject(brand, brandMockups(brand)[0], catalog)
  assert.equal(project.mockup, 'field-app')
  assert.match(project.background.value, /^#[0-9a-f]{6}$/, 'a colour key becomes the brand\'s colour')
  assert.deepEqual(project.slots.map((slot) => [slot.device, slot.finish, slot.turned, slot.screen.kind, slot.screen.fit]),
    [['monitor-27', 'silver', false, 'file', 'cover'], ['tablet-11', 'graphite', false, 'file', 'contain'], ['rugged-handheld', null, true, 'brand', 'cover']])
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify(project)), { catalog, files: deviceFiles(brand) }), project, 'and opens as a saved mockup would')
  assert.throws(() => validateProject(JSON.parse(JSON.stringify(project)), { catalog: DEVICES, files: deviceFiles(brand) }), /not available here/, 'but not in a brand without that frame')
  assert.deepEqual(creditsOf(project, catalog).map((source) => source.name), ['Photographed in house'], 'an outside frame is credited')
  assert.deepEqual(creditsOf(createProject('single')), [], 'brandkit\'s own are not')

  // A frame the brand supplies is drawn from its image, over the screen.
  const art = deviceArt(added, { frameHref: PNG })
  assert.deepEqual([art.width, art.height, art.screen.x, art.screen.radii], [520, 1040, 60, [12, 12, 12, 12]])
  assert.match(art.over, /<image href="data:image\/png/)
  assert.ok(render(sceneSvg({ slots: [{ device: added, frameHref: PNG, href: PNG, turned: true }] }), 200).width === 200)
})

test('what is wrong with a brand\'s devices is said in sentences', () => {
  const problems = (devices) => deviceProblems(withDevices(devices))
  assert.match(problems('yes')[0], /must be an object/)
  assert.match(problems({ mockups: {} })[0], /`devices.mockups` must be a list/)
  const one = (changes) => problems({ frames: [frame(changes)] })[0]
  assert.match(one({ id: 'Rugged Handheld' }), /needs an `id`/)
  assert.match(one({ id: 'phone-island' }), /device brandkit already has/)
  assert.match(one({ category: 'console' }), /needs a `category`/)
  assert.match(one({ image: 'devices/frame.jpg' }), /PNG or WebP with a transparent screen opening/)
  assert.match(one({ image: '../frame.png' }), /needs an `image` inside the brand/)
  assert.match(one({ size: [520] }), /needs a `size`/)
  assert.match(one({ screen: { x: 60, y: 150, width: 600, height: 760 } }), /reaches outside the image/)
  // A frame's artwork is licensed apart from the code, so it must say where it is from.
  assert.match(one({ source: undefined }), /needs a `source` with a `name` and a `licence`/)
  assert.match(one({ source: { name: 'Somewhere online' } }), /needs a `source` with a `name` and a `licence`/)
  assert.match(one({ source: { name: 'A', licence: 'MIT', url: 'javascript:alert(1)' } }), /not an https address/)
  assert.match(problems({ frames: [frame(), frame()] })[0], /same `id` as another frame/)

  const m = (changes) => problems({ frames: [frame()], mockups: [mockup(changes)] })[0]
  assert.match(m({ preset: 'wall-of-screens' }), /names a `preset` brandkit does not have/)
  assert.match(m({ slots: mockup().slots.slice(0, 2) }), /needs 3 `slots`/)
  assert.match(m({ background: 'heliotrope' }), /has a `background`/)
  assert.match(m({ canvas: '21:9' }), /has a `canvas`/)
  assert.match(m({ slots: [{ device: 'monitor-27', finish: 'gold' }, ...mockup().slots.slice(1)] }), /finish the monitor-27 does not come in/)
  assert.match(m({ slots: [{ device: 'hologram' }, ...mockup().slots.slice(1)] }), /names a device brandkit and the brand do not have in slot 1/)
  assert.match(m({ slots: [{ device: 'monitor-27', screen: { file: 'screens/a.svg' } }, ...mockup().slots.slice(1)] }), /not a PNG, JPEG or WebP inside the brand/)
  // One broken mockup does not hide a sound one, and a refused frame is not offered.
  const mixed = withDevices({ frames: [frame({ source: undefined })], mockups: [mockup(), mockup({ id: 'desk', slots: mockup().slots.slice(0, 2).concat({ device: 'phone-punch' }) })] })
  assert.deepEqual(brandMockups(mixed).map((entry) => entry.id), ['desk'])
  assert.ok(!Object.hasOwn(catalogFor(mixed), 'rugged-handheld'))
  assert.ok(validate(mixed).some((sentence) => /Device frame `rugged-handheld`/.test(sentence)), 'and the brand\'s own checks say so')
})
