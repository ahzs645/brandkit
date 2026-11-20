import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'
import { rasterizeModelScene, createModelPreviewRenderer, fitModelPerspectiveCamera } from '../src/mockups/model-preview.js'
import { configureImportedPickup } from '../src/mockups/imported-pickup.js'

const camera = () => {
  const result = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
  result.position.set(0, 0, 3)
  result.lookAt(0, 0, 0)
  return result
}
const scene = () => { const result = new THREE.Scene(); result.background = new THREE.Color('#ffffff'); return result }
const plane = (colour, z = 0) => {
  const result = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: colour }))
  result.position.z = z
  return result
}
const render = (model, view = camera(), options = {}) => rasterizeModelScene(model, view, { width: 100, height: 100, ...options })
const pixel = (frame, x, y) => Array.from(frame.data.subarray((y * frame.width + x) * 4, (y * frame.width + x) * 4 + 4))
const texture = (at) => {
  const data = new Uint8Array(16 * 16 * 4)
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) data.set(at(x, y), (y * 16 + x) * 4)
  const result = new THREE.DataTexture(data, 16, 16)
  result.colorSpace = THREE.SRGBColorSpace
  result.flipY = true
  result.needsUpdate = true
  return result
}
const bounds = (frame) => {
  const xs = [], ys = []
  for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) {
    if (frame.data[(y * frame.width + x) * 4 + 1] < 128) { xs.push(x); ys.push(y) }
  }
  return { width: Math.max(...xs) - Math.min(...xs) + 1, height: Math.max(...ys) - Math.min(...ys) + 1 }
}

test('the depth buffer occludes real geometry independently of scene traversal order', () => {
  const model = scene(), front = plane('#ff0000', 0.4), back = plane('#0000ff', 0)
  front.scale.setScalar(0.4)
  model.add(front, back)
  const first = render(model)
  assert.deepEqual(pixel(first, 50, 50), [255, 0, 0, 255])
  assert.deepEqual(pixel(first, 10, 10), [0, 0, 255, 255])
  model.remove(front, back); model.add(back, front)
  assert.deepEqual(render(model).data, first.data)
  front.visible = false
  assert.deepEqual(pixel(render(model), 50, 50), [0, 0, 255, 255])
})

test('shared triangle edges blend transparent artwork once without a diagonal seam', () => {
  const model = scene(), mesh = plane('#ff0000')
  mesh.material.transparent = true
  mesh.material.opacity = 0.5
  mesh.material.depthWrite = false
  model.add(mesh)
  const frame = render(model)
  for (let y = 1; y < 99; y++) for (let x = 1; x < 99; x++) assert.deepEqual(pixel(frame, x, y), [255, 128, 128, 255])
})

test('camera framing fits full source bounds on desktop and narrow screens, preserving the orbit', () => {
  const box = new THREE.Box3(new THREE.Vector3(-2.845, 0, -1.1), new THREE.Vector3(2.845, 2.19, 1.1))
  const target = box.getCenter(new THREE.Vector3())
  for (const aspect of [912 / 612, 375 / 350]) {
    const view = new THREE.PerspectiveCamera(33, aspect, 0.05, 200)
    view.position.copy(target).add(new THREE.Vector3(-5.8, 2, 6.8).multiplyScalar(1.21))
    const direction = view.position.clone().sub(target).normalize()
    fitModelPerspectiveCamera(view, box, target)
    assert.ok(direction.distanceTo(view.position.clone().sub(target).normalize()) < 1e-12, 'the orbit angle is preserved')
    let largest = 0
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const projected = new THREE.Vector3(x, y, z).project(view)
      largest = Math.max(largest, Math.abs(projected.x), Math.abs(projected.y))
      assert.ok(Math.abs(projected.x) <= 0.8200001 && Math.abs(projected.y) <= 0.8200001)
    }
    assert.ok(largest >= 0.819999, 'the model fills the intended frustum instead of leaving excessive empty space')
  }
})

test('CanvasTexture orientation, UV transform and wrapping preserve source artwork', () => {
  const model = scene(), mesh = plane('#ffffff')
  mesh.material.map = texture((x, y) => y < 8 ? (x < 8 ? [255, 0, 0, 255] : [0, 0, 255, 255]) : (x < 8 ? [0, 255, 0, 255] : [255, 255, 0, 255]))
  model.add(mesh)
  const initial = render(model)
  assert.deepEqual(pixel(initial, 10, 10), [255, 0, 0, 255])
  assert.deepEqual(pixel(initial, 90, 10), [0, 0, 255, 255])
  assert.deepEqual(pixel(initial, 10, 90), [0, 255, 0, 255])
  mesh.material.map.repeat.x = -1
  mesh.material.map.offset.x = 1
  assert.deepEqual(pixel(render(model), 10, 10), [0, 0, 255, 255])
  mesh.material.map.repeat.x = 2
  mesh.material.map.offset.x = 0
  mesh.material.map.wrapS = THREE.RepeatWrapping
  const repeated = render(model)
  assert.deepEqual(pixel(repeated, 5, 10), pixel(repeated, 55, 10))
})

test('DecalGeometry uses the same UV artwork, alpha holes and layer order on a 3D body', () => {
  const model = scene()
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.2), new THREE.MeshBasicMaterial({ color: '#0000ff' }))
  model.add(body); body.updateMatrixWorld(true)
  const geometry = new DecalGeometry(body, new THREE.Vector3(0, 0, 0.1), new THREE.Euler(), new THREE.Vector3(1, 1, 0.2))
  const map = texture((x) => x < 8 ? [255, 0, 0, 255] : [255, 0, 0, 0])
  const material = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  const decal = new THREE.Mesh(geometry, material); decal.renderOrder = 4
  model.add(decal)
  const first = render(model)
  assert.deepEqual(pixel(first, 35, 50), [255, 0, 0, 255])
  assert.deepEqual(pixel(first, 65, 50), [0, 0, 255, 255])
  assert.deepEqual(pixel(first, 10, 50), [0, 0, 255, 255])
  const upper = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#00ff00', transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }))
  upper.renderOrder = 5
  model.add(upper)
  assert.deepEqual(pixel(render(model), 35, 50), [0, 255, 0, 255])
  upper.visible = false
  assert.deepEqual(pixel(render(model), 35, 50), [255, 0, 0, 255])
})

test('perspective and orthographic views project one mesh with real depth and rotation', () => {
  const model = scene(), mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshBasicMaterial({ color: '#ff0000' }))
  model.add(mesh)
  const perspective = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
  perspective.position.set(0, 0, 3); perspective.lookAt(0, 0, 0)
  const far = bounds(render(model, perspective)), flat = bounds(render(model))
  mesh.position.z = 0.7
  assert.ok(bounds(render(model, perspective)).width > far.width * 1.2)
  assert.deepEqual(bounds(render(model)), flat, 'parallel projection does not change scale with depth')
  mesh.position.z = 0; mesh.rotation.y = Math.PI / 4
  assert.ok(bounds(render(model)).width > flat.width, 'orbit/view direction reveals different projected geometry')
})

test('near-plane clipping is bounded and hidden parent meshes do not render', () => {
  const model = scene(), parent = new THREE.Group()
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 0, 1, 3.5], 3))
  geometry.computeVertexNormals()
  parent.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#ff0000', side: THREE.DoubleSide })))
  model.add(parent)
  const perspective = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
  perspective.position.z = 3; perspective.lookAt(0, 0, 0)
  const frame = render(model, perspective)
  assert.ok(frame.stats.fragments > 0 && frame.stats.fragments <= 20_000)
  assert.equal(frame.data.length, 40_000)
  parent.visible = false
  assert.equal(render(model, perspective).stats.triangles, 0)
  assert.throws(() => render(model, perspective, { width: 5000 }), /out of range/)
})

test('the shipped imported GLBs use their complete geometry without authored silhouettes', async () => {
  // Texture decoding belongs to the browser. This test verifies the actual binary mesh and
  // node transforms; the texture/UV/decal pixels are exercised independently above.
  const loader = new GLTFLoader()
  loader.register(() => ({ name: 'TEST_GEOMETRY_ONLY', loadTexture: () => Promise.resolve(null) }))
  for (const [file, rotation, minimumTriangles] of [
    ['generic-compact-suv.glb', 0, 126_000], ['shc-hatchback.glb', 0, 42_000], ['suv-original.glb', -Math.PI / 2, 16_000], ['crew-cab-pickup.glb', 0, 146_000]
  ]) {
    const bytes = await readFile(new URL(`../src/mockups/models/${file}`, import.meta.url))
    const { scene: vehicle } = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
    vehicle.rotation.y = rotation; vehicle.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(vehicle)
    vehicle.scale.multiplyScalar(4.7 / box.getSize(new THREE.Vector3()).x); vehicle.updateMatrixWorld(true)
    box.setFromObject(vehicle)
    const centre = box.getCenter(new THREE.Vector3())
    vehicle.position.set(-centre.x, -box.min.y, -centre.z)
    const model = scene(); model.add(vehicle)
    const view = new THREE.PerspectiveCamera(33, 1.6, 0.05, 200)
    view.position.set(-5.8, 2.8, 6.8); view.lookAt(0, 0.8, 0)
    const frame = render(model, view, { width: 320, height: 200 })
    assert.ok(frame.stats.triangles >= minimumTriangles, `${file}: complete source geometry`)
    assert.ok(frame.stats.visibleTriangles > 1000, `${file}: actual projected surfaces`)
    assert.ok(frame.stats.fragments > 5000, `${file}: nonempty body pixels`)
    if (file === 'crew-cab-pickup.glb') {
      configureImportedPickup(vehicle, { cover: 'open' })
      const open = render(model, view, { width: 320, height: 200 })
      assert.ok(open.stats.triangles < frame.stats.triangles, 'hidden original cover nodes are excluded by the renderer')
      assert.notDeepEqual(open.data, frame.data, 'the open bed is derived from the changed source mesh visibility')
      configureImportedPickup(vehicle, { cover: 'tonneau' })
      assert.deepEqual(render(model, view, { width: 320, height: 200 }).data, frame.data, 'restoring original cover nodes restores exact source rendering')
    }
    vehicle.traverse((object) => { object.geometry?.dispose(); for (const material of Array.isArray(object.material) ? object.material : [object.material]) material?.dispose() })
  }
})

test('the adapter requests only Canvas2D, caps interactive work and exports full dimensions', () => {
  const oldDocument = globalThis.document, requests = []
  const createCanvas = () => ({ width: 1, height: 1, style: {}, getContext(kind) {
    requests.push(kind)
    return { createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {}, drawImage() {} }
  } })
  globalThis.document = { createElement: createCanvas }
  try {
    const renderer = createModelPreviewRenderer({ maxInteractivePixels: 10_000 })
    renderer.setSize(400, 250, false)
    renderer.render(scene(), camera())
    assert.ok(renderer.info.preview.width * renderer.info.preview.height <= 10_100)
    renderer.render(scene(), camera(), { quality: 'export' })
    assert.equal(renderer.info.preview.width, 400)
    assert.equal(renderer.info.preview.height, 250)
    assert.equal(renderer.isModelPreviewRenderer, true)
    assert.deepEqual(renderer.getSize(new THREE.Vector2()).toArray(), [400, 250])
    assert.ok(requests.every((kind) => kind === '2d'), 'never initializes or bypasses WebGL')
    renderer.dispose()
  } finally { globalThis.document = oldDocument }
})

test('viewport resizes retain visible pixels immediately and unchanged dimensions never clear them', () => {
  // Reproduce the browser canvas contract: every width/height assignment clears its buffer.
  // Resampling here is enough to observe retained presentation pixels without a browser/GPU.
  const oldDocument = globalThis.document
  const createCanvas = () => {
    let width = 1, height = 1
    const canvas = { style: {}, pixels: new Uint8ClampedArray(4), clears: 0 }
    const clear = () => { canvas.pixels = new Uint8ClampedArray(width * height * 4); canvas.clears++ }
    Object.defineProperties(canvas, {
      width: { get: () => width, set: (value) => { width = value; clear() } },
      height: { get: () => height, set: (value) => { height = value; clear() } }
    })
    canvas.getContext = () => ({
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: (image) => { canvas.pixels = image.data.slice() },
      drawImage: (source) => {
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          const from = (Math.floor(y * source.height / height) * source.width + Math.floor(x * source.width / width)) * 4
          canvas.pixels.set(source.pixels.subarray(from, from + 4), (y * width + x) * 4)
        }
      }
    })
    return canvas
  }
  globalThis.document = { createElement: createCanvas }
  try {
    const renderer = createModelPreviewRenderer(), model = scene()
    model.background = new THREE.Color('#ff0000')
    renderer.setSize(32, 20, false)
    renderer.render(model, camera())
    const canvas = renderer.domElement, clears = canvas.clears, before = canvas.pixels.slice()
    renderer.setSize(32, 20, false)
    assert.equal(canvas.clears, clears, 'a redundant ResizeObserver notification never clears the frame')
    assert.deepEqual(canvas.pixels, before)
    renderer.setSize(64, 40, false)
    assert.equal(renderer.info.preview.width, 32, 'no new scene frame has rendered yet')
    for (let i = 0; i < canvas.pixels.length; i += 4) assert.deepEqual(Array.from(canvas.pixels.subarray(i, i + 4)), [255, 0, 0, 255])
    renderer.setPixelRatio(1.5)
    assert.deepEqual(Array.from(canvas.pixels.subarray(0, 4)), [255, 0, 0, 255], 'a DPR change also preserves the last frame')
    renderer.dispose()
  } finally { globalThis.document = oldDocument }
})
