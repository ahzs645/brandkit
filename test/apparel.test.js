import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { APPAREL_SIZES, apparelAreas, apparelExtent, apparelLayerStatus, apparelPlacement, copyApparelLayer, createApparelLayer, createApparelProject, fitApparelLayer, validateApparelProject } from '../src/mockups/apparel-layout.js'
import { apparelFlatSvg, apparelSheetFrame } from '../src/mockups/apparel-flat.js'
import { buildApparelGarment } from '../src/mockups/apparel-garment.js'

const artwork = { id: 'original/white', label: 'Original white lockup', make: () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100"><path fill="white" d="M0 0H400V100H0Z"/></svg>' }
const fresh = () => createApparelProject({ logo: artwork.id, aspect: 4 })

test('apparel saves physical millimetres, original artwork reference and independent layer state', () => {
  const project = fresh()
  const other = createApparelLayer({ logo: 'other/blue', aspect: 1.2, area: 'back', name: 'Separate back graphic' })
  other.visible = false; other.locked = true; other.method = 'embroidery'
  project.layers.push(other)
  const opened = validateApparelProject(JSON.parse(JSON.stringify(project)), { logos: [artwork.id, 'other/blue'] })
  assert.deepEqual(opened, project)
  opened.layers[0].widthMm = 40
  assert.equal(project.layers[0].widthMm, 95)
  assert.equal(opened.layers[1].logo, 'other/blue')
  assert.equal(opened.layers[1].locked, true)
})

test('changing through every supported garment size retains exact artwork dimensions and offsets', () => {
  const project = fresh()
  project.layers[0] = fitApparelLayer({ ...project.layers[0], widthMm: 80, xMm: 15, yMm: 10, rotation: 12 }, project.product)
  const original = structuredClone(project.layers)
  for (const size of Object.keys(APPAREL_SIZES)) {
    const opened = validateApparelProject({ ...project, size })
    assert.deepEqual(opened.layers, original)
    assert.equal(apparelLayerStatus(opened, opened.layers[0]).placed, true)
  }
})

test('switching to hoodie retains a crewneck design that crosses the pocket region', () => {
  const project = fresh()
  project.layers = [createApparelLayer({ logo: artwork.id, aspect: 1, area: 'front', name: 'Large front print' })]
  project.selectedLayerId = project.layers[0].id
  assert.equal(apparelLayerStatus(project, project.layers[0]).placed, true)
  const hoodie = validateApparelProject({ ...project, product: 'hoodie' })
  assert.equal(apparelLayerStatus(hoodie, hoodie.layers[0]).placed, false)
  assert.deepEqual(hoodie.layers, project.layers)
  const returned = validateApparelProject({ ...hoodie, product: 'crewneck' })
  assert.equal(apparelLayerStatus(returned, returned.layers[0]).placed, true)
  assert.deepEqual(returned.layers, project.layers)
})

test('explicit placement edits fit rotated artwork and patch backing without crossing its region', () => {
  for (const product of ['crewneck', 'hoodie']) for (const area of Object.keys(apparelAreas(product))) for (const rotation of [-180, -89, -45, 0, 17, 90, 179]) for (const method of ['print', 'patch']) {
    const layer = fitApparelLayer({ ...createApparelLayer({ area, aspect: 0.3, product }), method, widthMm: 400, xMm: 200, yMm: -300, rotation }, product)
    assert.equal(apparelLayerStatus({ product }, layer).placed, true)
    const extent = apparelExtent(layer), bounds = apparelAreas(product)[area]
    assert.ok(extent.width <= bounds.width + 0.0001)
    assert.ok(extent.height <= bounds.height + 0.0001)
  }
})

test('hoodie regions exclude pocket and hood and allow chest marks below 150 mm', () => {
  const regions = apparelAreas('hoodie')
  assert.ok(regions.front.y + regions.front.height / 2 < 400)
  assert.ok(regions.back.y - regions.back.height / 2 >= 300)
  const small = fitApparelLayer({ ...fresh().layers[0], widthMm: 24 }, 'hoodie')
  assert.equal(small.widthMm, 24)
  const physical = apparelPlacement({ product: 'hoodie' }, small)
  assert.equal(physical.x, 105)
  assert.equal(physical.y, 180)
})

test('duplicate artwork retains source and physical dimensions but has a new unlocked identity', () => {
  const layer = { ...fresh().layers[0], locked: true, method: 'patch' }
  const copied = copyApparelLayer(layer)
  assert.notEqual(copied.id, layer.id)
  assert.equal(copied.logo, layer.logo)
  assert.equal(copied.widthMm, layer.widthMm)
  assert.equal(copied.method, layer.method)
  assert.equal(copied.locked, false)
})

test('malformed projects cannot inject unsupported products, references or nonfinite placement', () => {
  const project = fresh()
  for (const bad of [
    { ...project, schema: 'anything' }, { ...project, product: '__proto__' }, { ...project, size: 'XXXXL' },
    { ...project, assetVersion: 99 }, { ...project, surfaceVersion: 99 }, { ...project, colour: 'red' },
    { ...project, layers: [project.layers[0], project.layers[0]] },
    { ...project, layers: [{ ...project.layers[0], widthMm: Infinity }] },
    { ...project, layers: [{ ...project.layers[0], xMm: NaN }] },
    { ...project, layers: [{ ...project.layers[0], visible: 'yes' }] },
    { ...project, layers: [{ ...project.layers[0], method: 'machine-stitches' }] },
    { ...project, layers: [{ ...project.layers[0], logo: 'another-brand' }] }
  ]) assert.throws(() => validateApparelProject(bad, { logos: [artwork.id] }))
  const clean = validateApparelProject({ ...project, unknown: 'drop me' })
  assert.equal(Object.hasOwn(clean, 'unknown'), false)
})

test('flat review export keeps original SVG artwork and dimensions and omits hidden layers', () => {
  const project = fresh()
  const hidden = { ...copyApparelLayer(project.layers[0]), visible: false, name: 'DO NOT EXPORT' }
  project.layers.push(hidden)
  const svg = apparelFlatSvg(project, [artwork], { brandName: 'North & South <test>' })
  assert.ok(svg.includes('North &amp; South &lt;test&gt;'))
  assert.ok(svg.includes('95 × 23.75 mm'))
  assert.ok(svg.includes(encodeURIComponent(artwork.make())))
  assert.ok(!svg.includes('DO NOT EXPORT'))
  assert.ok(svg.includes('Generic garment preview'))
})

test('all flat garment sizes fit between sheet margins with clear front/back sleeve gutters', () => {
  for (const size of Object.keys(APPAREL_SIZES)) {
    const frame = apparelSheetFrame(size)
    const bounds = frame.centres.map((centre) => [centre - frame.halfWidth, centre + frame.halfWidth])
    assert.ok(bounds[0][0] > frame.margin, `${size} left sleeve has a margin`)
    assert.ok(bounds[1][1] < frame.width - frame.margin, `${size} right sleeve has a margin`)
    assert.ok(bounds[1][0] - bounds[0][1] > frame.gap, `${size} sleeves do not overlap`)
    const project = { ...fresh(), size, product: 'hoodie' }
    const svg = apparelFlatSvg(project, [artwork], { guides: false })
    assert.ok(svg.includes(`data-top-mm="${APPAREL_SIZES[size].height - 260}"`), 'pocket follows the geometry height')
    assert.ok(!svg.includes('stroke="#64cbec"'), 'review export omits selection handles')
    assert.ok(!svg.includes('stroke-dasharray="7 7"'), 'review export omits region guides')
  }
})

test('prepared garments expose separate UV panels and distinct real hood and pocket geometry', () => {
  const materials = Object.fromEntries(['front', 'back', 'left-sleeve', 'right-sleeve', 'plain', 'rib', 'seam'].map((key) => [key, new THREE.MeshStandardMaterial()]))
  for (const product of ['crewneck', 'hoodie']) {
    const garment = buildApparelGarment({ product, size: 'M' }, materials)
    assert.ok(garment.getObjectByName('front-panel'))
    assert.ok(garment.getObjectByName('back-panel'))
    assert.ok(garment.getObjectByName('left-sleeve'))
    assert.ok(garment.getObjectByName('left-shoulder'))
    assert.ok(garment.getObjectByName('right-shoulder'))
    assert.equal(Boolean(garment.getObjectByName('hood')), product === 'hoodie')
    assert.equal(Boolean(garment.getObjectByName('kangaroo-pocket')), product === 'hoodie')
    const bounds = new THREE.Box3().setFromObject(garment)
    assert.ok(bounds.max.y > 0.65 && bounds.max.y < 0.95)
    assert.ok(bounds.max.x - bounds.min.x > 0.9)
    for (const name of ['front-panel', 'back-panel', 'left-sleeve', 'right-sleeve']) {
      const mesh = garment.getObjectByName(name)
      assert.ok(mesh.geometry.attributes.uv.count > 100)
      assert.ok([...mesh.geometry.attributes.position.array].every(Number.isFinite))
    }
    // A visible sleeve's left-to-right physical direction must follow its texture U;
    // otherwise words become mirrored even though the front/back torso panels are correct.
    for (const name of ['left-sleeve', 'right-sleeve']) {
      const { position, uv, normal } = garment.getObjectByName(name).geometry.attributes
      const a = 22 * 41 + 19, b = 22 * 41 + 21
      assert.ok(position.getZ(a) > 0 && position.getZ(b) > 0)
      assert.ok((position.getX(b) - position.getX(a)) * (uv.getX(b) - uv.getX(a)) > 0, `${name} lettering is readable from outside`)
      assert.ok(normal.getZ(22 * 41 + 20) > 0, `${name} front normal points outwards`)
    }
    for (const name of ['front-panel', 'back-panel']) {
      const { position, uv } = garment.getObjectByName(name).geometry.attributes
      const sign = name === 'front-panel' ? 1 : -1
      for (let i = 0; i < position.count; i += 73) {
        assert.ok(Math.abs((uv.getX(i) - 0.5) * 0.56 * sign - position.getX(i)) < 0.000001)
        assert.ok(Math.abs(uv.getY(i) * 0.7 - position.getY(i)) < 0.000001)
      }
    }
    garment.traverse((object) => object.geometry?.dispose())
  }
  for (const material of Object.values(materials)) material.dispose()
})
