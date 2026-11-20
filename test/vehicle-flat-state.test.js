// Controller regression tests with a minimal DOM/image adapter. These verify async state and
// recovery semantics only; rendered pixel and touch evidence belongs to browser acceptance.
import test from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate as nextTurn } from 'node:timers/promises'
import { createVehicleFlatStudio } from '../src/mockups/vehicle-flat-studio.js'
import { defaultWrap } from '../src/mockups/vehicle-layout.js'

const imageUrl = (text) => `data:image/png;base64,${Buffer.from(text).toString('base64')}`
const base = () => ({ schema: 'brandkit-vehicle-mockup/2', model: 'truck-canopy', paint: '#ffffff', area: 'left', backdrop: 'studio', placements: { left: { u: 0, v: 0, width: 1.1, rotation: 0 } }, artwork: { kind: 'fleet', logo: 'original', tagline: 'START', website: '', upload: null }, wrap: defaultWrap() })
const waitFor = async (fn) => { for (let i = 0; i < 100; i++) { if (fn()) return; await nextTurn() }; assert.fail('Controller did not reach expected state') }

function environment(t, { initial, stored, failBackup = false, artworkUrl: resolveArtwork = (art) => imageUrl(art.tagline) } = {}) {
  const storage = new Map(stored ? [['draft', stored]] : [])
  const events = [], snapshots = [], recoveries = [], drawings = []
  let host
  const fakeImage = class {
    naturalWidth = 900; naturalHeight = 300
    async decode() { if (this.src === imageUrl('corrupt')) throw new Error('Corrupt image bytes') }
  }
  const fakeDocument = {
    createElement(name) {
      if (name === 'canvas') return { width: 0, height: 0, getContext: () => ({ fillRect() {}, drawImage(image) { drawings.push(image.src) } }), toBlob(done) { done(new Blob(['controller-test'], { type: 'image/png' })) } }
      const element = {
        style: {}, listeners: new Map(), firstElementChild: { style: {} },
        setAttribute() {}, remove() {}, addEventListener(name, fn) { this.listeners.set(name, fn) }, removeEventListener(name) { this.listeners.delete(name) },
        querySelectorAll(selector) { return Array.from({ length: (this.innerHTML.match(selector === '[data-layer-id]' ? /data-layer-id=/g : /data-wrap=/g) ?? []).length }) },
        hasPointerCapture() { return false }, releasePointerCapture() {}
      }
      return element
    }
  }
  const overrides = { document: fakeDocument, Image: fakeImage, localStorage: { getItem: (key) => storage.get(key) ?? null, setItem(key, value) { if (failBackup && key.includes(':recovery:')) throw new Error('Quota exceeded'); storage.set(key, String(value)) } } }
  const descriptors = Object.fromEntries(Object.keys(overrides).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  for (const [key, value] of Object.entries(overrides)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
  const container = { dataset: {}, prepend(element) { host = element } }
  const api = createVehicleFlatStudio({ container, project: initial, fallback: base(), storageKey: 'draft', logos: ['original'], patterns: [], files: [], artworkUrl: resolveArtwork, wrapUrl: () => imageUrl('wrap'), backdropFor: () => ({ top: '#ffffff', bottom: '#eeeeee' }), onChange: (snap) => snapshots.push(snap), onStatus: (message, error) => events.push({ message, error }), onRecovery: (record) => recoveries.push(record) })
  t.after(() => {
    api.dispose()
    for (const [key, descriptor] of Object.entries(descriptors)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key] }
  })
  return { api, container, get host() { return host }, storage, events, snapshots, recoveries, drawings, latest: () => snapshots.at(-1) }
}

test('rapid live text accepts later keystrokes while the previous image is decoding', async (t) => {
  let releaseFirst
  const firstImage = new Promise((resolve) => { releaseFirst = resolve })
  const env = environment(t, { artworkUrl: (art) => art.tagline === 'FIRST' ? firstImage : imageUrl(art.tagline) })
  await waitFor(() => env.latest()?.ready)
  const first = env.api.setArtwork({ tagline: 'FIRST' }, { live: true })
  assert.equal(env.latest().busy, false, 'Typing must not disable its own input')
  const second = env.api.setArtwork({ tagline: 'SECOND' }, { live: true })
  assert.equal(await second, true)
  releaseFirst(imageUrl('FIRST'))
  assert.equal(await first, false, 'Superseded image completion is ignored')
  env.api.commit()
  assert.equal(env.api.project.artwork.tagline, 'SECOND')
  assert.equal(env.latest().preview, imageUrl('SECOND'))
  assert.equal(JSON.parse(env.storage.get('draft')).artwork.tagline, 'SECOND')
})

test('failed image replacement preserves both prior project and prior preview', async (t) => {
  const env = environment(t, { artworkUrl: (art) => imageUrl(art.tagline === 'BAD' ? 'corrupt' : art.tagline) })
  await waitFor(() => env.latest()?.ready)
  const before = env.api.project, preview = env.latest().preview
  assert.equal(await env.api.setArtwork({ tagline: 'BAD' }), false)
  assert.deepEqual(env.api.project, before)
  assert.equal(env.latest().preview, preview)
  assert.equal(env.latest().busy, false)
  assert.match(env.events.at(-1).message, /Corrupt image/)
})

test('font refresh requested during initial load runs after that operation completes', async (t) => {
  let release, calls = 0
  const first = new Promise((resolve) => { release = resolve })
  const env = environment(t, { artworkUrl: () => ++calls === 1 ? first : imageUrl('new-fonts') })
  assert.equal(await env.api.refreshArtwork(), false)
  release(imageUrl('old-fonts'))
  await waitFor(() => env.latest()?.preview === imageUrl('new-fonts'))
  assert.equal(calls, 2)
  assert.equal(env.latest().ready, true)
})

test('PNG capture waits for the latest live artwork generation', async (t) => {
  let release
  const pending = new Promise((resolve) => { release = resolve })
  const env = environment(t, { artworkUrl: (art) => art.tagline === 'LATEST' ? pending : imageUrl(art.tagline) })
  await waitFor(() => env.latest()?.ready)
  const changed = env.api.setArtwork({ tagline: 'LATEST' }, { live: true })
  env.api.commit()
  const exporting = env.api.exportPng()
  assert.equal(env.drawings.length, 0)
  release(imageUrl('LATEST'))
  await changed
  assert.equal((await exporting).type, 'image/png')
  const svg = decodeURIComponent(env.drawings[0].split(',').slice(1).join(','))
  assert.ok(svg.includes(imageUrl('LATEST')))
  assert.ok(!svg.includes(imageUrl('START')))
})

test('corrupt image bytes preserve the exact raw draft before restoring the starting design', async (t) => {
  const invalid = base()
  invalid.artwork = { ...invalid.artwork, kind: 'upload', upload: { name: 'damaged.png', dataUrl: imageUrl('corrupt'), aspect: 3 } }
  const raw = JSON.stringify(invalid)
  const env = environment(t, { initial: invalid, stored: raw })
  await waitFor(() => env.latest()?.ready)
  assert.equal(env.recoveries.length, 1)
  assert.equal(env.recoveries[0].raw, raw)
  const backup = env.recoveries[0].key
  assert.ok(backup.startsWith('draft:recovery:'))
  assert.equal(env.storage.get(backup), raw)
  assert.equal(env.api.project.artwork.kind, 'fleet')
  await env.api.updateLayer({ name: 'Recovered design' })
  assert.equal(JSON.parse(env.storage.get('draft')).layers[0].name, 'Recovered design')
  assert.equal(env.storage.get(backup), raw, 'Editing cannot alter the recovery copy')
})

test('failed recovery backup pauses writes so later edits cannot overwrite corrupt original bytes', async (t) => {
  const invalid = base()
  invalid.artwork = { ...invalid.artwork, kind: 'upload', upload: { name: 'damaged.png', dataUrl: imageUrl('corrupt'), aspect: 3 } }
  const raw = JSON.stringify(invalid)
  const env = environment(t, { initial: invalid, stored: raw, failBackup: true })
  await waitFor(() => env.latest()?.ready)
  assert.equal(env.recoveries[0].key, null)
  assert.match(env.recoveries[0].message, /saving is paused/)
  await env.api.updateLayer({ name: 'Unsaved recovered design' })
  assert.equal(env.api.project.layers[0].name, 'Unsaved recovered design')
  assert.equal(env.storage.get('draft'), raw)
})
