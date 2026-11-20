import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { areasFor, VEHICLES } from '../src/mockups/vehicle-layout.js'
import {
  IMPORTED_PICKUP_ASSET_SHA256, IMPORTED_PICKUP_COVER_NAMES,
  configureImportedPickup, isImportedPickupCoverNode
} from '../src/mockups/imported-pickup.js'

const bytes = await readFile(new URL('../src/mockups/models/crew-cab-pickup.glb', import.meta.url))
// Read the original binary through the production loader. Image decoding is unnecessary
// for geometry/raycast tests and needs a browser; all meshes, indices and transforms are real.
const loader = new GLTFLoader().register(() => ({
  name: 'geometry-tests-without-image-decode',
  loadTexture: () => Promise.resolve(null)
}))
const { scene: original } = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')

const objects = (root) => {
  const found = []
  root.traverse((object) => found.push(object))
  return found
}
const visibleMeshes = (root) => {
  const found = []
  root.traverseVisible((object) => { if (object.isMesh) found.push(object) })
  return found
}
const triangles = (meshes) => meshes.reduce((count, mesh) => count + (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3, 0)
const close = (actual, expected, tolerance = 1e-5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`)
const normalized = () => {
  const root = original.clone(true)
  root.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(root)
  root.scale.multiplyScalar(VEHICLES.pickup.length / bounds.getSize(new THREE.Vector3()).x)
  root.updateMatrixWorld(true)
  bounds.setFromObject(root)
  const centre = bounds.getCenter(new THREE.Vector3())
  root.position.x -= centre.x
  root.position.z -= centre.z
  root.position.y -= bounds.min.y
  root.updateMatrixWorld(true)
  return root
}

test('canonical pickup is the unchanged third-party tonneau GLB with measured source geometry', () => {
  assert.equal(createHash('sha256').update(bytes).digest('hex'), IMPORTED_PICKUP_ASSET_SHA256)
  assert.equal(bytes.byteLength, 5661984)
  const source = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString())
  assert.equal(source.meshes.length, 364)
  assert.match(source.asset.copyright, /Innerscene Corp/)
  assert.match(source.asset.copyright, /CC0 1\.0 Universal/)
  assert.equal(triangles(visibleMeshes(original)), 146508)
  original.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(original)
  const size = bounds.getSize(new THREE.Vector3())
  close(size.x, 5.690920549444854)
  close(size.y, 1.9601240353658795)
  close(size.z, 2.320120006799698)
  close(bounds.min.y, 0)
  const windshield = objects(original).find((object) => object.userData.name === 'Pickup windshield')
  const bed = objects(original).find((object) => object.userData.name === 'Cargo bed liner')
  assert.ok(new THREE.Box3().setFromObject(windshield).max.x < 0, 'front faces negative X')
  assert.ok(new THREE.Box3().setFromObject(bed).min.x > 1.2, 'bed is behind the cab')
})

test('open/tonneau toggles only the 19 original cover nodes and preserves geometry and materials', () => {
  const root = normalized()
  const before = objects(root).map((object) => ({
    object, geometry: object.geometry, material: object.material, visible: object.visible,
    matrix: object.matrix.toArray(), name: object.name, data: { ...object.userData }
  }))
  assert.equal(IMPORTED_PICKUP_COVER_NAMES.length, 19)
  assert.equal(configureImportedPickup(root, { cover: 'open' }), root)
  assert.equal(before.filter(({ object }) => !object.visible).length, 19)
  assert.equal(triangles(visibleMeshes(root)), 145816)
  for (const saved of before) {
    const object = saved.object
    assert.equal(object.geometry, saved.geometry)
    assert.equal(object.material, saved.material)
    assert.deepEqual(object.matrix.toArray(), saved.matrix)
    assert.equal(object.name, saved.name)
    if (isImportedPickupCoverNode(object)) {
      assert.equal(object.userData.component, 'tonneau')
      assert.equal(object.visible, false)
    } else {
      assert.equal(object.visible, saved.visible)
      assert.deepEqual(object.userData, saved.data)
    }
  }
  configureImportedPickup(root, { cover: 'tonneau' })
  assert.equal(triangles(visibleMeshes(root)), 146508)
  assert.ok(before.every(({ object, visible }) => object.visible === visible))
  for (const saved of before) {
    assert.equal(saved.object.geometry, saved.geometry)
    assert.equal(saved.object.material, saved.material)
    assert.deepEqual(saved.object.matrix.toArray(), saved.matrix)
  }
})

test('open bed exposes the existing floor and tonneau restores the original cover above it', () => {
  const root = normalized()
  const ray = new THREE.Raycaster(new THREE.Vector3(1.9, 8, 0), new THREE.Vector3(0, -1, 0))
  configureImportedPickup(root, { cover: 'open' })
  const openHit = ray.intersectObjects(visibleMeshes(root), false)[0]
  assert.ok(openHit.point.y > .75 && openHit.point.y < .9)
  assert.match(openHit.object.userData.name, /Cargo bed liner|Pressed longitudinal bed rib/)
  configureImportedPickup(root, { cover: 'tonneau' })
  const coveredHit = ray.intersectObjects(visibleMeshes(root), false)[0]
  assert.ok(coveredHit.point.y > 1.24 && coveredHit.point.y < 1.29)
  assert.ok(isImportedPickupCoverNode(coveredHit.object))
  assert.ok(coveredHit.point.y - openHit.point.y > .4)
  const sourceFloor = objects(root).find((object) => object.userData.name === 'Cargo bed liner')
  assert.equal(sourceFloor.visible, true, 'the source floor remains part of both configurations')
})

test('unsupported choices and missing source components fail before changing any nodes', () => {
  const root = normalized()
  const before = objects(root).map((object) => ({ object, visible: object.visible, data: { ...object.userData } }))
  for (const configuration of [undefined, {}, { cover: 'canopy' }, { cover: 'raised' }]) {
    assert.throws(() => configureImportedPickup(root, configuration), /original tonneau cover/)
  }
  const component = before.find(({ object }) => isImportedPickupCoverNode(object)).object
  component.removeFromParent()
  assert.throws(() => configureImportedPickup(root, { cover: 'open' }), /asset version/)
  for (const saved of before) {
    assert.equal(saved.object.visible, saved.visible)
    assert.deepEqual(saved.object.userData, saved.data)
  }
})

test('cover matching handles exact GLTFLoader names without hiding similarly named objects', () => {
  assert.equal(isImportedPickupCoverNode({ isMesh: true, name: 'Seated_retractable_tonneau' }), true)
  assert.equal(isImportedPickupCoverNode({ isMesh: true, name: 'Tonneau_slat017' }), true)
  assert.equal(isImportedPickupCoverNode({ isMesh: true, name: 'Tonneau_slat018' }), false)
  assert.equal(isImportedPickupCoverNode({ isMesh: true, name: 'Tonneau slat extra' }), false)
  assert.equal(isImportedPickupCoverNode({ isMesh: false, name: 'Tonneau slat' }), false)
})

for (const cover of ['open', 'tonneau']) {
  test(`imported pickup ${cover}: all six advertised areas land on exposed original paint`, () => {
    const root = normalized()
    configureImportedPickup(root, { cover })
    const meshes = visibleMeshes(root)
    const areas = areasFor('pickup', { cover })
    assert.equal(Object.keys(areas).length, 6)
    const ray = new THREE.Raycaster()
    for (const [id, area] of Object.entries(areas)) {
      // A 25 by 13 grid includes every edge and corner, plus interior door/plate/handle
      // regions that a centre-only or five-point check can miss: 325 rays per surface.
      for (let row = 0; row <= 12; row++) for (let column = 0; column <= 24; column++) {
        const normal = new THREE.Vector3(...area.normal)
        const point = new THREE.Vector3(...area.origin)
          .addScaledVector(new THREE.Vector3(...area.uAxis), (column / 24 - .5) * area.width)
          .addScaledVector(new THREE.Vector3(...area.vAxis), (row / 12 - .5) * area.height)
        ray.set(point.clone().addScaledVector(normal, 8), normal.clone().negate())
        const hits = ray.intersectObjects(meshes, false)
        const facing = (hit) => hit.face.normal.clone()
          .applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize().dot(normal)
        const paint = hits.find((hit) => hit.object.material.name === 'paint' && facing(hit) > .04)
        const label = `${cover}, ${id}, grid ${column},${row}`
        assert.ok(paint, `${label}: missing paint`)
        assert.ok(paint.distance - hits[0].distance <= .005, `${label}: obstructed by ${hits[0].object.userData.name ?? hits[0].object.name}`)
        assert.notEqual(hits[0].object.material.name, 'glass.001', `${label}: glazing blocks the surface`)
        assert.ok(facing(paint) > .97, `${label}: the surface faces away from the decal projector`)
      }
    }
  })
}
