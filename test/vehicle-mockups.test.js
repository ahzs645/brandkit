// Vehicle mockups: the placement math, the checks a saved mockup passes before it is opened, and
// the artwork a brand offers for a car. The 3D editor itself is checked in a browser.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import { AREAS, SCHEMA, clampPlacement, createPlacement, mirrorPlacement, validateProject } from '../src/mockups/vehicle-layout.js'
import { FLEET, fleetDefaults, fleetSvg, svgAspect, vehicleLogos } from '../src/mockups/vehicle-artwork.js'
import { VEHICLE_MODELS } from '../src/mockups/vehicle-models.js'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'

const BRAND_DIR = fileURLToPath(new URL('../brands/northwind/', import.meta.url))
const northwind = JSON.parse(readFileSync(new URL('brand.json', `file://${BRAND_DIR}`), 'utf8'))
const aspect = 799.14231709 / 152

const base = () => ({
  schema: SCHEMA, model: 'suv', paint: '#F3F2EE', area: 'left',
  placements: { left: createPlacement('left', aspect) },
  artwork: { kind: 'logo', logo: 'primary/horizontal/primary', tagline: 'Know the land. Plan the work.', website: 'example.com', upload: null }
})
const fits = (placement, id, ratio) => {
  const a = AREAS[id]
  const r = placement.rotation * Math.PI / 180
  const halfU = placement.width * (Math.abs(Math.cos(r)) + Math.abs(Math.sin(r)) / ratio) / 2
  const halfV = placement.width * (Math.abs(Math.sin(r)) + Math.abs(Math.cos(r)) / ratio) / 2
  assert.ok(Math.abs(placement.u) + halfU <= a.width / 2 + 1e-12)
  assert.ok(Math.abs(placement.v) + halfV <= a.height / 2 + 1e-12)
}

test('area frames point outward and are orthonormal', () => {
  for (const a of Object.values(AREAS)) {
    const [u, v, n] = [a.uAxis, a.vAxis, a.normal]
    assert.deepEqual([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]].map((x) => x || 0), n.map((x) => x || 0))
    for (const axis of [u, v, n]) assert.equal(Math.hypot(...axis), 1)
  }
})

test('the starting placement fits every area', () => {
  for (const id of Object.keys(AREAS)) fits(createPlacement(id, aspect), id, aspect)
})

test('moving past an area keeps the whole artwork inside it', () => {
  const p = clampPlacement({ u: 100, v: -100, width: 1.1, rotation: 0 }, 'left', aspect)
  assert.ok(p.u > 0 && p.v < 0)
  fits(p, 'left', aspect)
})

test('rotated, oversized artwork is made to fit at the sides and rear', () => {
  for (const id of ['left', 'rear']) {
    for (const rotation of [15, 45, 90, 135, -45]) {
      const p = clampPlacement({ u: 10, v: 10, width: 20, rotation }, id, aspect)
      assert.ok(p.width < 20)
      fits(p, id, aspect)
    }
  }
})

test('narrow artwork may be narrower than the usual minimum', () => {
  const p = clampPlacement({ u: 10, v: 10, width: 2, rotation: 0 }, 'rear', 0.1)
  assert.ok(p.width > 0 && p.width < 0.15)
  fits(p, 'rear', 0.1)
})

test('clamping normalises rotation, limits width and drops unknown keys', () => {
  const p = clampPlacement({ u: 0, v: 0, width: -1, rotation: 725, injected: true }, 'left', aspect)
  assert.equal(p.rotation, 5)
  assert.equal(p.width, 0.15)
  assert.deepEqual(Object.keys(p), ['u', 'v', 'width', 'rotation'])
})

test('invalid numbers, areas and proportions are refused', () => {
  for (const bad of [NaN, Infinity, '1']) assert.throws(() => clampPlacement({ u: bad, v: 0, width: 1, rotation: 0 }, 'left', aspect))
  assert.throws(() => createPlacement('__proto__', aspect))
  for (const bad of [0, -1, Infinity, NaN]) assert.throws(() => createPlacement('left', bad))
})

test('copying to the other side mirrors the position and keeps lettering reading forwards', () => {
  const { area, placement } = mirrorPlacement({ u: 0.4, v: 0.1, width: 1, rotation: 10 }, 'left', aspect)
  assert.equal(area, 'right')
  assert.equal(placement.u, -0.4)
  assert.equal(placement.rotation, -10)
  // Mirrored twice is where it started.
  assert.deepEqual(mirrorPlacement(placement, 'right', aspect).placement, { u: 0.4, v: 0.1, width: 1, rotation: 10 })
  assert.throws(() => mirrorPlacement(placement, 'hood', aspect))
})

test('a mockup keeps a subset of areas, copies its values and drops anything else', () => {
  const source = base()
  source.secret = 'discard'
  source.placements.left.extra = true
  const clean = validateProject(source)
  assert.deepEqual(Object.keys(clean.placements), ['left'])
  assert.equal(clean.secret, undefined)
  assert.equal(clean.placements.left.extra, undefined)
  assert.equal(clean.paint, '#f3f2ee')
  clean.placements.left.u = 0.2
  assert.equal(source.placements.left.u, 0)
})

test('a mockup with an unknown area, or none placed in the selected one, is refused', () => {
  const missing = base(); missing.area = 'rear'
  assert.throws(() => validateProject(missing))
  const unknown = base(); unknown.placements.door = unknown.placements.left
  assert.throws(() => validateProject(unknown))
  const malicious = JSON.parse(JSON.stringify(base()).replace('"placements":{', '"placements":{"__proto__":{"polluted":true},'))
  assert.throws(() => validateProject(malicious))
  assert.equal({}.polluted, undefined)
})

test('a mockup with bad values, or text too long, is refused', () => {
  for (const [key, value] of [['schema', 'bad'], ['model', 'truck'], ['paint', 'red']]) {
    const p = base(); p[key] = value
    assert.throws(() => validateProject(p), key)
  }
  for (const [key, value] of [['kind', 'script'], ['logo', 'x'.repeat(201)], ['website', 'x'.repeat(81)], ['tagline', 'x'.repeat(101)]]) {
    const p = base(); p.artwork[key] = value
    assert.throws(() => validateProject(p), key)
  }
  const p = base(); p.placements.left.width = NaN
  assert.throws(() => validateProject(p))
  p.placements.left.width = 0
  assert.throws(() => validateProject(p))
})

test('a logo the brand does not have falls back to its first', () => {
  const p = base(); p.artwork.logo = 'another-brand/logo'
  assert.equal(validateProject(p, { logos: ['a', 'b'] }).artwork.logo, 'a')
  assert.equal(validateProject(base(), { logos: ['x', 'primary/horizontal/primary'] }).artwork.logo, 'primary/horizontal/primary')
})

test('uploaded artwork keeps what is approved and refuses unsafe or oversized data', () => {
  const p = base()
  p.artwork.kind = 'upload'
  p.artwork.upload = { dataUrl: 'data:image/png;base64,iVBORw0KGgo=', name: 'logo.png', aspect: 2, ignored: true }
  const valid = validateProject(p)
  assert.notEqual(valid.artwork.upload, p.artwork.upload)
  assert.equal(valid.artwork.upload.ignored, undefined)
  for (const value of ['data:text/html;base64,PHNjcmlwdD4=', 'https://example.com/a.png', 'data:image/png;base64,AA=A', 'data:image/png;base64,AB==', `data:image/png;base64,${'A'.repeat(8 * 1024 * 1024)}`]) {
    const q = structuredClone(p); q.artwork.upload.dataUrl = value
    assert.throws(() => validateProject(q))
  }
  for (const value of [0.09, 20.1, NaN]) {
    const q = structuredClone(p); q.artwork.upload.aspect = value
    assert.throws(() => validateProject(q))
  }
  p.artwork.upload = null
  assert.throws(() => validateProject(p))
})

test('prototype keys at the top level are dropped without touching Object.prototype', () => {
  const input = JSON.parse(JSON.stringify(base()).replace('{', '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},'))
  const result = validateProject(input)
  assert.equal(Object.hasOwn(result, '__proto__'), false)
  assert.equal(Object.hasOwn(result, 'constructor'), false)
  assert.equal({}.polluted, undefined)
})

test('each vehicle model is the file its checksum names', () => {
  for (const [id, model] of Object.entries(VEHICLE_MODELS)) {
    const path = fileURLToPath(model.url)
    assert.ok(statSync(path).size > 100_000, id)
    assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), model.sha256, id)
  }
})

test('a brand of families offers each family, layout and logo colour, and its symbol', () => {
  const logos = vehicleLogos(northwind)
  const colours = northwind.logoColours.filter((key) => key !== 'currentColor')
  assert.equal(logos.filter((logo) => !logo.id.startsWith('symbol/')).length, northwind.families.length * 2 * colours.length)
  assert.equal(new Set(logos.map((logo) => logo.id)).size, logos.length)
  for (const logo of logos) {
    assert.match(logo.ink, /^#[0-9a-f]{6}$/i, logo.id)
    assert.ok(svgAspect(logo.make()) > 0, logo.id)
  }
})

test('a brand of signatures offers each signature not set for a department, in each colourway', () => {
  const brand = {
    id: 'fixed', name: 'Fixed identity',
    colours: { green: '#006633', white: '#FFFFFF' },
    colourways: { primary: { all: 'green', ground: 'white' }, reverse: { all: 'white', ground: 'green' } },
    defaultColourway: 'primary',
    logoPolicy: { allowInheritedColour: false, standaloneSymbol: false },
    signatures: [
      { id: 'complete', padding: 10, elements: [{ type: 'art', bounds: [0, 0, 180, 40], markup: '<path d="M0 0H180V40H0Z" fill="{symbol}"/>' }] },
      { id: 'unit', departmental: true, padding: 10, elements: [{ type: 'art', bounds: [0, 0, 40, 40], markup: '<path d="M0 0H40V40H0Z" fill="{symbol}"/>' }] }
    ]
  }
  const logos = vehicleLogos(brand)
  assert.deepEqual(logos.map((logo) => logo.id), ['complete/primary', 'complete/reverse'])
  assert.deepEqual(logos.map((logo) => logo.ink.toLowerCase()), ['#006633', '#ffffff'])
})

test('the fleet layout keeps the logo whole and sets its lines in the brand’s type', async () => {
  const fonts = await loadBrandFontsFromDisk(northwind, BRAND_DIR)
  const [logo] = vehicleLogos(northwind, fonts)
  const logoSvg = logo.make()
  const svg = fleetSvg({ brand: northwind, fonts, logoSvg, ink: logo.ink, tagline: 'Steady progress, clearly made.', website: 'northwind.example' })
  assert.equal(svgAspect(svg), FLEET.width / FLEET.height)
  assert.ok(!/<text\b/.test(svg), 'lines are outlined')
  // The logo's own drawing is inside, unchanged.
  const inner = /<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/.exec(logoSvg)[1]
  assert.ok(svg.includes(inner))
  const image = new Resvg(svg).render()
  assert.equal(image.width, FLEET.width)
  // A long line is made smaller to stay inside the layout, not cut off.
  const long = fleetSvg({ brand: northwind, fonts, logoSvg, ink: logo.ink, tagline: 'W'.repeat(100), website: '' })
  const xs = [...long.matchAll(/[ML](-?[\d.]+)[ ,]/g)].map((match) => Number(match[1]))
  assert.ok(Math.max(...xs) <= FLEET.width - FLEET.margin + 1)
})

test('without the brand’s fonts the fleet layout falls back to live text, escaped', () => {
  const [logo] = vehicleLogos(northwind)
  const svg = fleetSvg({ brand: northwind, fonts: null, logoSvg: logo.make(), ink: '#000000', tagline: '<script>&', website: 'a"b' })
  assert.match(svg, /<text\b/)
  assert.ok(svg.includes('&lt;script&gt;&amp;') && svg.includes('a&quot;b'))
})

test('the fleet layout starts from the brand’s tagline', () => {
  assert.equal(fleetDefaults(northwind).tagline, northwind.copy.tagline)
  assert.equal(fleetDefaults({ web: { url: 'https://www.example.org/' } }).website, 'www.example.org')
})
