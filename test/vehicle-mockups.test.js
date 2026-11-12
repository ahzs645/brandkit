// Vehicle mockups: the placement math, the checks a saved mockup passes before it is opened, and
// the artwork a brand offers for a car. The 3D editor itself is checked in a browser.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import * as THREE from 'three'
import { AREAS, SCHEMA, VEHICLES, areasFor, clampPlacement, createPlacement, defaultWrap, mirrorPlacement, validateProject, wrapWindow } from '../src/mockups/vehicle-layout.js'
import { FLEET, WRAP_GRAPHIC_LABELS, backdrop, brandColours, fleetDefaults, fleetSvg, svgAspect, vehicleLogos, wrapColours, wrapGraphicSvg, wrapPatterns } from '../src/mockups/vehicle-artwork.js'
import { buildWorkTruck } from '../src/mockups/work-truck.js'
import { VEHICLE_MODELS } from '../src/mockups/vehicle-models.js'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { colour as brandColour } from '../src/engine/brand.js'
const colourOf = (brand, key) => brandColour(brand, key).toLowerCase()

const BRAND_DIR = fileURLToPath(new URL('../brands/northwind/', import.meta.url))
const northwind = JSON.parse(readFileSync(new URL('brand.json', `file://${BRAND_DIR}`), 'utf8'))
const aspect = 799.14231709 / 152

const base = () => ({
  schema: SCHEMA, model: 'suv', paint: '#F3F2EE', area: 'left',
  placements: { left: createPlacement('left', aspect) },
  artwork: { kind: 'logo', logo: 'primary/horizontal/primary', tagline: 'Know the land. Plan the work.', website: 'example.com', upload: null }
})
const fits = (placement, id, ratio, areas = AREAS) => {
  const a = areas[id]
  const r = placement.rotation * Math.PI / 180
  const halfU = placement.width * (Math.abs(Math.cos(r)) + Math.abs(Math.sin(r)) / ratio) / 2
  const halfV = placement.width * (Math.abs(Math.sin(r)) + Math.abs(Math.cos(r)) / ratio) / 2
  assert.ok(Math.abs(placement.u) + halfU <= a.width / 2 + 1e-12)
  assert.ok(Math.abs(placement.v) + halfV <= a.height / 2 + 1e-12)
}

test('every vehicle’s area frames point outward and are orthonormal', () => {
  for (const a of Object.values(VEHICLES).flatMap((vehicle) => Object.values(vehicle.areas))) {
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
    if (model.build) continue
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

test('a mockup saved before wraps (schema 1) opens with no wrap and the studio backdrop', () => {
  const old = { ...base(), schema: 'brandkit-vehicle-mockup/1' }
  const opened = validateProject(old)
  assert.equal(opened.schema, SCHEMA)
  assert.equal(opened.wrap.coverage, 'none')
  assert.equal(opened.backdrop, 'studio')
})

test('a wrap is checked: coverage, colours, scale, position and its artwork', () => {
  const withWrap = (changes) => ({ ...base(), wrap: { ...defaultWrap(), coverage: 'full', ...changes } })
  const ok = validateProject(withWrap({ colours: ['#D9021C', '#231f20'], scale: 2, offsetU: -1, offsetV: 0.5 }))
  assert.deepEqual(ok.wrap.colours, ['#d9021c', '#231f20'])
  for (const bad of [{ coverage: 'roof' }, { colours: ['red', '#000000'] }, { colours: ['#000000'] }, { scale: 0.5 }, { scale: 5 }, { offsetU: 1.5 }, { mirror: 'yes' }, { source: 'upload', upload: null }, { graphic: 'flames' }]) {
    assert.throws(() => validateProject(withWrap(bad)), JSON.stringify(bad))
  }
  // A pattern another brand had falls back to this brand's first.
  assert.equal(validateProject(withWrap({ source: 'pattern', pattern: 'elsewhere' }), { patterns: ['repeat', 'crop'] }).wrap.pattern, 'repeat')
})

test('a placement on the truck uses the truck’s areas, and a car’s mockup cannot name them', () => {
  const truck = { ...base(), model: 'truck-canopy', area: 'left-body', placements: { 'left-body': createPlacement('left-body', aspect, areasFor('truck-canopy')) } }
  assert.equal(validateProject(truck).area, 'left-body')
  const car = { ...truck, model: 'suv' }
  assert.throws(() => validateProject(car))
  const { area, placement } = mirrorPlacement(truck.placements['left-body'], 'left-body', aspect, areasFor('truck-canopy'))
  assert.equal(area, 'right-body')
  fits(placement, 'right-body', aspect, areasFor('truck-canopy'))
})

test('a wrap always covers its face, and mirroring flips it', () => {
  const inside = ({ repeat: [w, h], offset: [x, y] }) => {
    const [a, b] = [x, x + w].sort((p, q) => p - q)
    assert.ok(a >= -1e-9 && b <= 1 + 1e-9 && y >= -1e-9 && y + h <= 1 + 1e-9, JSON.stringify({ w, h, x, y }))
  }
  for (const faceAspect of [0.5, 1.2, 3, 6]) {
    for (const artAspect of [1, 1.6, 3]) {
      for (const scale of [1, 2.5, 4]) {
        for (const offsetU of [-1, 0, 1]) {
          const plain = wrapWindow({ faceAspect, artAspect, scale, offsetU, offsetV: offsetU })
          inside(plain)
          // The window keeps the face's proportions: no stretching.
          assert.ok(Math.abs(plain.repeat[0] * artAspect / plain.repeat[1] - faceAspect) < 1e-9)
          const mirrored = wrapWindow({ faceAspect, artAspect, scale, offsetU, offsetV: offsetU, mirror: true })
          inside(mirrored)
          assert.equal(mirrored.repeat[0], -plain.repeat[0])
        }
      }
    }
  }
  // At scale 1 a face as wide as the artwork shows all of it.
  assert.deepEqual(wrapWindow({ faceAspect: 3, artAspect: 3 }), { repeat: [1, 1], offset: [0, 0] })
})

test('the wrap graphics draw in the colours given, each a 3:1 side', () => {
  for (const graphic of Object.keys(WRAP_GRAPHIC_LABELS)) {
    const svg = wrapGraphicSvg({ graphic, colours: ['#d9021c', '#231f20'] })
    assert.equal(svgAspect(svg), 3, graphic)
    assert.ok(svg.includes('#d9021c') && svg.includes('#231f20'), graphic)
    assert.equal(new Resvg(svg).render().width, 3000, graphic)
    // A rear-half wrap draws the rear of the same design, uncropped.
    const rear = wrapGraphicSvg({ graphic, colours: ['#d9021c', '#231f20'], coverage: 'rear' })
    assert.equal(svgAspect(rear), 1.7, graphic)
    assert.equal(new Resvg(rear).render().width, 1700, graphic)
  }
})

test('wrap colours start from the brand’s primary and the colour most unlike it', () => {
  const colours = brandColours(northwind)
  assert.equal(colours[0], northwind.colours[northwind.roles.primary]?.toLowerCase?.() ?? colours[0])
  assert.equal(new Set(colours).size, colours.length)
  const [main, second] = wrapColours(northwind)
  assert.notEqual(main, second)
  assert.deepEqual(wrapColours({ colours: { red: '#D9021C', charcoal: '#231F20', white: '#FFFFFF' }, roles: { primary: 'red' } }), ['#d9021c', '#231f20'])
})

test('the brand’s patterns are offered as wrap artwork', () => {
  const patterns = wrapPatterns(northwind)
  assert.equal(patterns.length, northwind.patterns.length)
  assert.ok(svgAspect(patterns[0].make()) > 0)
})

test('each backdrop has a gradient and a shadow strength; Brand is tinted from the primary', () => {
  for (const id of ['studio', 'dark', 'brand', 'outdoor']) {
    const look = backdrop(id, northwind)
    assert.match(look.top, /^#[0-9a-f]{6}$/i)
    assert.match(look.bottom, /^#[0-9a-f]{6}$/i)
    assert.ok(look.shadow > 0 && look.shadow < 1)
  }
  assert.notEqual(backdrop('brand', { colours: { red: '#D9021C' }, roles: { primary: 'red' } }).top, backdrop('brand', { colours: { blue: '#0068AC' }, roles: { primary: 'blue' } }).top)
})

for (const back of ['canopy', 'service']) {
  test(`the ${back} work truck is drawn at its stated length, centred, and every area is on its paint`, () => {
    const truck = buildWorkTruck({ back })
    truck.updateMatrixWorld(true)
    const bounds = new THREE.Box3().setFromObject(truck)
    const size = bounds.getSize(new THREE.Vector3())
    assert.ok(Math.abs(size.x - VEHICLES[`truck-${back}`].length) < 0.01, `length ${size.x}`)
    assert.ok(Math.abs(bounds.min.x + bounds.max.x) < 0.2, 'centred along')
    assert.ok(Math.abs(bounds.min.z + bounds.max.z) < 0.01, 'centred across')
    assert.ok(bounds.min.y > -0.01 && bounds.min.y < 0.02, `on the ground: ${bounds.min.y}`)
    const paint = []
    truck.traverse((object) => { if (object.isMesh && object.material.name === 'paint') paint.push(object) })
    assert.ok(paint.length >= 2)
    // Each area's centre and corners, cast in from outside, land on painted body.
    const ray = new THREE.Raycaster()
    for (const [id, a] of Object.entries(areasFor(`truck-${back}`))) {
      for (const [du, dv] of [[0, 0], [-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) {
        const point = new THREE.Vector3(...a.origin).addScaledVector(new THREE.Vector3(...a.uAxis), du * a.width).addScaledVector(new THREE.Vector3(...a.vAxis), dv * a.height)
        const normal = new THREE.Vector3(...a.normal)
        ray.set(point.clone().addScaledVector(normal, 8), normal.clone().negate())
        const hits = ray.intersectObject(truck, true)
        const paintHit = hits.find((hit) => hit.object.material.name === 'paint')
        const where = `${back} ${id} ${du},${dv}`
        assert.ok(paintHit, `${where}: no paint there`)
        // A handle or seam may stand in front of the paint; glass may not.
        assert.notEqual(hits[0].object.material.name, 'glass', `${where}: on glass`)
        assert.ok(paintHit.distance - hits[0].distance < 0.06, `${where}: behind ${hits[0].object.material.name}`)
      }
    }
  })
}

// --- Brand liveries (brand.vehicles.liveries) ----------------------------------------------

const liveryBrand = () => ({
  ...structuredClone(northwind),
  colours: { ...northwind.colours, red: '#D9021C', charcoal: '#231F20' },
  vehicles: {
    liveries: [{
      id: 'service-truck', label: 'Service truck', model: 'truck-canopy', paint: 'paper', backdrop: 'outdoor',
      wrap: { coverage: 'rear', file: 'artwork/vehicle/canopy.svg', mirror: true },
      lettering: { file: 'artwork/vehicle/doors.svg' },
      placements: { left: { u: 0.05, v: 0.02, width: 1.9, rotation: 0 }, right: { u: -0.05, v: 0.02, width: 1.9, rotation: 0 } },
      area: 'left'
    }, {
      id: 'car', label: 'Car', model: 'shc', paint: '#ffffff',
      wrap: { coverage: 'sides', graphic: 'stripes', colours: ['red', 'charcoal'] },
      lettering: { fleet: { tagline: 'Built for the North', website: 'example.com' } },
      placements: { left: { u: 0, v: 0, width: 1.2, rotation: 0 } }
    }]
  }
})

test('a brand’s liveries are checked with the rest of the brand', async () => {
  const { validateBrand } = await import('../src/engine/brand.js')
  const { liveryProblems } = await import('../src/mockups/vehicle-livery.js')
  assert.deepEqual(liveryProblems(liveryBrand()), [])
  assert.deepEqual(validateBrand(liveryBrand()).filter((problem) => /Livery/.test(problem)), [])
  const broken = liveryBrand()
  Object.assign(broken.vehicles.liveries[0], { model: 'tank', paint: 'no-such-colour' })
  broken.vehicles.liveries[0].wrap = { coverage: 'roof', file: '../outside.svg', graphic: 'sweep' }
  broken.vehicles.liveries[1].id = 'service-truck'
  broken.vehicles.liveries[1].placements = { 'left-body': { u: 0, v: 0, width: 1, rotation: 0 } }
  const problems = liveryProblems(broken)
  for (const pattern of [/model/, /paint/, /coverage/, /exactly one of `file`, `graphic` or `pattern`/, /same `id`/, /left-body/]) {
    assert.ok(problems.some((problem) => pattern.test(problem)), `${pattern} in ${problems.join(' | ')}`)
  }
  assert.ok(validateBrand(broken).some((problem) => /Livery/.test(problem)))
})

test('a livery becomes a mockup the editor accepts, its colours resolved', async () => {
  const { liveryFiles, liveryProject } = await import('../src/mockups/vehicle-livery.js')
  const brand = liveryBrand()
  const files = liveryFiles(brand)
  assert.deepEqual(files, ['artwork/vehicle/canopy.svg', 'artwork/vehicle/doors.svg'])
  const truck = validateProject(liveryProject(brand, brand.vehicles.liveries[0]), { files })
  assert.equal(truck.model, 'truck-canopy')
  assert.equal(truck.paint, colourOf(brand, 'paper'))
  assert.deepEqual([truck.artwork.kind, truck.artwork.file], ['file', 'artwork/vehicle/doors.svg'])
  assert.deepEqual([truck.wrap.coverage, truck.wrap.source, truck.wrap.file], ['rear', 'file', 'artwork/vehicle/canopy.svg'])
  assert.deepEqual(Object.keys(truck.placements), ['left', 'right'])
  assert.equal(truck.livery, 'service-truck')
  assert.equal(truck.backdrop, 'outdoor')
  const car = validateProject(liveryProject(brand, brand.vehicles.liveries[1]), { files })
  assert.deepEqual(car.wrap.colours, ['#d9021c', '#231f20'])
  assert.deepEqual([car.artwork.kind, car.artwork.tagline], ['fleet', 'Built for the North'])
})

test('a saved mockup may only name artwork files the open brand’s liveries use', async () => {
  const { liveryProject } = await import('../src/mockups/vehicle-livery.js')
  const brand = liveryBrand()
  const project = liveryProject(brand, brand.vehicles.liveries[0])
  assert.throws(() => validateProject(project, { files: ['artwork/vehicle/other.svg'] }), /does not have/)
  for (const path of ['../brand.json', '/etc/passwd', 'https://example.com/a.svg', 'artwork/vehicle/doors.html']) {
    assert.throws(() => validateProject({ ...project, artwork: { ...project.artwork, file: path } }), path)
  }
})
