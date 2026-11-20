import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { APPAREL_ASSET, APPAREL_ASSET_ID, APPAREL_PRODUCTS, APPAREL_SIZES, apparelAreas, apparelExtent, apparelLayerStatus, apparelPlacement, copyApparelLayer, createApparelLayer, createApparelProject, fitApparelLayer, validateApparelProject } from '../src/mockups/apparel-layout.js'
import { apparelReviewSvg } from '../src/mockups/apparel-review-sheet.js'
import { configureApparelGarment, apparelProjection, projectApparelDecal, disposeApparelGarment } from '../src/mockups/apparel-garment.js'
import { rasterizeModelScene } from '../src/mockups/model-preview.js'
const fresh = () => createApparelProject({ logo: 'original/white', aspect: 4 })
const sourceBytes = await readFile(new URL('../assets/apparel/elvaerwyn-zip-hoodie/ladieshoodiedown1.obj', import.meta.url))
const assetBytes = await readFile(new URL('../public/models/apparel/elvaerwyn-zip-hoodie.glb', import.meta.url))
const loader = new GLTFLoader()
loader.register(() => ({ name: 'TEST_GEOMETRY_ONLY', loadTexture: () => Promise.resolve(null) }))
const loadMesh = async () => (await loader.parseAsync(assetBytes.buffer.slice(assetBytes.byteOffset, assetBytes.byteOffset + assetBytes.byteLength), '')).scene

test('apparel schema binds the real asset and preserves physical artwork and independent layer state', () => {
  const project = fresh(), second = createApparelLayer({ logo: 'other/blue', aspect: 1.2, area: 'back' })
  second.visible = false; second.locked = true; second.method = 'embroidery'; project.layers.push(second)
  const opened = validateApparelProject(JSON.parse(JSON.stringify(project)), { logos: ['original/white', 'other/blue'] })
  assert.deepEqual(opened, project)
  assert.equal(opened.assetId, APPAREL_ASSET_ID)
  assert.deepEqual(Object.keys(APPAREL_PRODUCTS), ['zip-hoodie'])
  opened.layers[0].widthMm = 40
  assert.equal(project.layers[0].widthMm, 80)
  assert.equal(opened.layers[1].locked, true)
})

test('preview size changes preserve exact artwork dimensions, offsets and projection size', () => {
  const project = fresh(); project.layers[0] = fitApparelLayer({ ...project.layers[0], widthMm: 80, xMm: 5, yMm: 10, rotation: 12 }, project.product)
  const original = structuredClone(project.layers)
  for (const size of Object.keys(APPAREL_SIZES)) {
    const opened = validateApparelProject({ ...project, size })
    assert.deepEqual(opened.layers, original)
    assert.equal(apparelLayerStatus(opened, opened.layers[0]).placed, true)
    assert.equal(apparelProjection(opened, opened.layers[0]).width, 0.08)
  }
})

test('legacy illustrative garments and unknown assets are rejected without mutating their saved data', () => {
  const legacy = { ...fresh(), schema: 'brandkit-apparel-mockup/1', product: 'crewneck' }, copy = JSON.stringify(legacy)
  assert.throws(() => validateApparelProject(legacy), /retired illustrative garment/)
  assert.equal(JSON.stringify(legacy), copy)
  assert.throws(() => validateApparelProject({ ...fresh(), assetId: 'different-garment' }), /not supported/)
})

test('explicit edits fit rotated artwork and patch borders inside the source-model regions', () => {
  for (const area of Object.keys(apparelAreas())) for (const rotation of [-180, -89, -45, 0, 17, 90, 179]) for (const method of ['print', 'patch']) {
    const layer = fitApparelLayer({ ...createApparelLayer({ area, aspect: 0.3 }), method, widthMm: 400, xMm: 200, yMm: -300, rotation }, 'zip-hoodie')
    assert.equal(apparelLayerStatus(fresh(), layer).placed, true)
    const extent = apparelExtent(layer), bounds = apparelAreas()[area]
    assert.ok(extent.width <= bounds.width + 0.0001); assert.ok(extent.height <= bounds.height + 0.0001)
  }
  const regions = apparelAreas()
  assert.ok(regions['left-chest'].x - regions['left-chest'].width / 2 > 30, 'centre zip remains excluded')
  assert.ok(regions['right-chest'].x + regions['right-chest'].width / 2 < -30)
  assert.ok(regions.back.y - regions.back.height / 2 >= 300, 'hood remains excluded')
})

test('copies retain original artwork, method and physical dimensions with a new unlocked identity', () => {
  const layer = { ...fresh().layers[0], locked: true, method: 'patch' }, copied = copyApparelLayer(layer)
  assert.notEqual(copied.id, layer.id); assert.equal(copied.logo, layer.logo)
  assert.equal(copied.widthMm, layer.widthMm); assert.equal(copied.method, layer.method); assert.equal(copied.locked, false)
})

test('malformed projects reject unsupported products, references and nonfinite placement', () => {
  const project = fresh()
  for (const bad of [{ ...project, schema: 'other' }, { ...project, product: '__proto__' }, { ...project, size: 'XXXXL' }, { ...project, assetVersion: 99 }, { ...project, surfaceVersion: 99 }, { ...project, colour: 'red' }, { ...project, layers: [project.layers[0], project.layers[0]] }, { ...project, layers: [{ ...project.layers[0], widthMm: Infinity }] }, { ...project, layers: [{ ...project.layers[0], xMm: NaN }] }, { ...project, layers: [{ ...project.layers[0], visible: 'yes' }] }, { ...project, layers: [{ ...project.layers[0], method: 'machine-stitches' }] }, { ...project, layers: [{ ...project.layers[0], logo: 'another-brand' }] }]) assert.throws(() => validateApparelProject(bad, { logos: ['original/white'] }))
  assert.equal(Object.hasOwn(validateApparelProject({ ...project, unknown: 'discard' }), 'unknown'), false)
})

test('the shipped GLB preserves the original authored OBJ coordinates and source credits', async () => {
  assert.equal(createHash('sha256').update(sourceBytes).digest('hex'), 'e53204f19be28c005c920748322fc2aa42e7ebdb84a4ab72f48e7a244b71aa64')
  const mesh = await loadMesh(), original = sourceBytes.toString().split('\n').filter((line) => line.startsWith('v ')).map((line) => line.split(/\s+/).slice(1, 4).map(Number))
  const key = (x, y, z) => [x, y, z].map((value) => Math.round(value * 1e6)).join('/')
  const allowed = new Set(original.map(([x, y, z]) => key((x + 0.03505) * 0.1, (y + 0.3978) * 0.1, z * 0.1)))
  let triangles = 0, credited = false
  mesh.traverse((object) => {
    if (!object.isMesh) return
    credited ||= object.userData.author === 'Elvaerwyn' && object.userData.assetId === APPAREL_ASSET_ID
    const position = object.geometry.attributes.position, uv = object.geometry.attributes.uv
    assert.equal(position.count, uv.count)
    for (let i = 0; i < position.count; i++) assert.ok(allowed.has(key(position.getX(i), position.getY(i), position.getZ(i))), 'no source-authored replacement vertices')
    triangles += object.geometry.index.count / 3
  })
  assert.equal(triangles, 19574); assert.equal(credited, true)
  const box = new THREE.Box3().setFromObject(mesh), dimensions = box.getSize(new THREE.Vector3())
  assert.ok(Math.abs(dimensions.x * 1000 - APPAREL_ASSET.width) < 0.01)
  assert.ok(Math.abs(dimensions.y * 1000 - APPAREL_ASSET.height) < 0.01)
  disposeApparelGarment(mesh)
})

test('every available area projects onto the imported surface at every preview size', async () => {
  const mesh = await loadMesh()
  for (const size of Object.keys(APPAREL_SIZES)) for (const area of Object.keys(apparelAreas())) {
    const project = { ...fresh(), size }, layer = createApparelLayer({ area, aspect: 4 })
    configureApparelGarment(mesh, project)
    const material = new THREE.MeshBasicMaterial(), decal = projectApparelDecal(mesh, project, layer, material)
    assert.ok(decal?.geometry.attributes.position.count > 6, `${size} ${area} intersects source triangles`)
    const p = decal.geometry.attributes.position, projection = apparelProjection(project, layer)
    const horizontal = []
    for (let i = 0; i < p.count; i++) horizontal.push(new THREE.Vector3().fromBufferAttribute(p, i).dot(projection.horizontal))
    const width = Math.max(...horizontal) - Math.min(...horizontal)
    assert.ok(width <= layer.widthMm / 1000 + 1e-6, `${size} ${area} stays within physical width`)
    assert.ok(width >= layer.widthMm / 1000 * 0.9, `${size} ${area} covers its width on the garment`)
    disposeApparelGarment(decal)
  }
  disposeApparelGarment(mesh)
})

test('front/back and 2D/perspective render the same source mesh, with readable decal orientation', async () => {
  const garment = await loadMesh(), project = fresh(), scene = new THREE.Scene()
  configureApparelGarment(garment, { ...project, colour: '#243b54' }); scene.add(garment)
  scene.background = new THREE.Color('#ffffff')
  for (const area of ['left-chest', 'back']) {
    const layer = createApparelLayer({ area, aspect: 4 }), projection = apparelProjection(project, layer)
    const data = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255])
    const map = new THREE.DataTexture(data, 2, 1); map.needsUpdate = true
    const material = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })
    const decal = projectApparelDecal(garment, project, layer, material)
    decal.renderOrder = 10; scene.add(decal)
    const camera = new THREE.OrthographicCamera(-0.55, 0.55, 0.45, -0.45, 0.01, 10)
    const target = new THREE.Vector3(0, 0.32, 0)
    camera.position.copy(target).addScaledVector(projection.normal, 2); camera.lookAt(target)
    const frame = rasterizeModelScene(scene, camera, { width: 500, height: 410 })
    const red = [], green = []
    for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) {
      const i = (y * frame.width + x) * 4
      if (frame.data[i] > 230 && frame.data[i + 1] < 20) red.push(x)
      if (frame.data[i + 1] > 230 && frame.data[i] < 20) green.push(x)
    }
    assert.ok(red.length > 10 && green.length > 10, `${area} visible logo pixels`)
    assert.ok(red.reduce((a, b) => a + b, 0) / red.length < green.reduce((a, b) => a + b, 0) / green.length, `${area} local left stays on viewer's left`)
    scene.remove(decal); disposeApparelGarment(decal)
  }
  const front = new THREE.OrthographicCamera(-0.55, 0.55, 0.45, -0.45, 0.01, 10)
  front.position.set(0, 0.32, 2); front.lookAt(0, 0.32, 0)
  const back = front.clone(); back.position.z = -2; back.lookAt(0, 0.32, 0)
  const perspective = new THREE.PerspectiveCamera(34, 1.2, 0.01, 10); perspective.position.set(0.9, 0.5, 1.5); perspective.lookAt(0, 0.32, 0)
  const render = (camera) => rasterizeModelScene(scene, camera, { width: 240, height: 200 })
  const a = render(front), b = render(back), c = render(perspective)
  assert.equal(a.stats.triangles, 19574); assert.equal(b.stats.triangles, a.stats.triangles); assert.equal(c.stats.triangles, a.stats.triangles)
  assert.notDeepEqual(a.data, b.data); assert.notDeepEqual(a.data, c.data)
  disposeApparelGarment(garment)
})

test('the review sheet requires rendered model images and never substitutes garment drawing paths', () => {
  const project = fresh(), png = 'data:image/png;base64,iVBORw0KGgo='
  assert.throws(() => apparelReviewSvg(project), /needs front and back renders/)
  const svg = apparelReviewSvg(project, { brandName: 'North & South <test>', views: { front: png, back: png } })
  assert.ok(svg.includes('North &amp; South &lt;test&gt;')); assert.ok(svg.includes('80 × 20 mm'))
  assert.equal((svg.match(/<image /g) ?? []).length, 2)
  assert.ok(svg.includes('Elvaerwyn')); assert.ok(svg.includes(APPAREL_ASSET_ID))
  assert.ok(!svg.includes('data-part="pocket"')); assert.ok(!svg.includes('Generic garment'))
})
