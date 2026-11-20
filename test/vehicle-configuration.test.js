import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { buildWorkTruck } from '../src/mockups/work-truck.js'
import { VEHICLES } from '../src/mockups/vehicle-layout.js'
import {
  COVER_OPTIONS, defaultConfiguration, normalizeConfiguration, configuredAreas,
  componentForArea, configurationSummary, canopyTop
} from '../src/mockups/vehicle-configuration.js'

const collect = (object, predicate) => {
  const result = []
  object.traverse((child) => { if (predicate(child)) result.push(child) })
  return result
}
const dispose = (object) => {
  const geometries = new Set()
  const materials = new Set()
  object.traverse((child) => {
    if (child.geometry) geometries.add(child.geometry)
    if (child.material) materials.add(child.material)
  })
  for (const geometry of geometries) geometry.dispose()
  for (const material of materials) material.dispose()
}
const rayAt = (truck, point, normal) => {
  truck.updateMatrixWorld(true)
  const n = new THREE.Vector3(...normal)
  const ray = new THREE.Raycaster(new THREE.Vector3(...point).addScaledVector(n, 8), n.negate())
  return ray.intersectObject(truck, true)
}

test('old truck choices map deterministically to the original canopy and service rack', () => {
  assert.deepEqual(defaultConfiguration('truck-canopy'), { cover: 'raised', sides: 'solid', rack: false, canopyPaint: null })
  assert.deepEqual(defaultConfiguration('truck-service'), { cover: 'service', sides: 'solid', rack: true, canopyPaint: null })
  assert.equal(defaultConfiguration('compact'), null)
  assert.deepEqual(normalizeConfiguration('truck-canopy'), defaultConfiguration('truck-canopy'))
  assert.match(configurationSummary('truck-canopy'), /Raised canopy/)
})

test('invalid covers, rack values and paint fail rather than creating a different body', () => {
  for (const input of [{ cover: 'service' }, { cover: 'unknown' }, { rack: 'yes' }, { sides: 'clear' }, { canopyPaint: 'red' }, []]) {
    assert.throws(() => normalizeConfiguration('truck-canopy', input))
  }
  assert.throws(() => normalizeConfiguration('truck-service', { cover: 'open' }))
  assert.throws(() => buildWorkTruck({ back: 'open' }), /Unknown work truck rear body/)
  assert.equal(normalizeConfiguration('truck-canopy', { cover: 'open', sides: 'windows' }).sides, 'solid')
  assert.equal(normalizeConfiguration('truck-canopy', { canopyPaint: '#ABCDEF' }).canopyPaint, '#abcdef')
})

test('removing the canopy removes its surface IDs and keeps cab and bed targets', () => {
  const original = VEHICLES['truck-canopy'].areas
  const open = configuredAreas('truck-canopy', original, { cover: 'open' })
  assert.equal(open['left-body'], undefined)
  assert.equal(open['right-body'], undefined)
  assert.equal(open['canopy-rear'], undefined)
  assert.equal(open['canopy-roof'], undefined)
  assert.ok(open.left && open.right && open.hood && open.rear && open['left-bed'] && open['right-bed'])
  assert.ok(original['left-body'], 'the shared legacy areas remain untouched')
  const restored = configuredAreas('truck-canopy', original, { cover: 'raised' })
  assert.deepEqual(restored['left-body'], original['left-body'])
  assert.equal(componentForArea('truck-canopy', 'left-body'), 'canopy')
  assert.equal(componentForArea('truck-canopy', 'canopy-rear'), 'canopy')
  assert.equal(componentForArea('truck-canopy', 'rear'), 'bed')
})

test('window and hatch choices reserve printable rectangles away from glazing and handles', () => {
  const base = VEHICLES['truck-canopy'].areas
  for (const cover of ['cab-high', 'raised', 'commercial']) {
    const windows = configuredAreas('truck-canopy', base, { cover, sides: 'windows' })['left-body']
    const hatches = configuredAreas('truck-canopy', base, { cover, sides: 'hatches' })['left-body']
    assert.ok(windows.origin[1] + windows.height / 2 < 1.54, 'print ends below the window')
    assert.ok(hatches.origin[1] - hatches.height / 2 >= 1.52, 'print begins above the hatch handle')
    assert.ok(hatches.origin[1] + hatches.height / 2 <= canopyTop({ cover }) - 0.20 + 1e-10, 'print avoids the upper hinge')
  }
  assert.equal(configuredAreas('truck-canopy', base, { rack: true })['canopy-roof'], undefined)
})

test('open pickup has a bed cavity, not a service body or an invisible canopy', () => {
  const truck = buildWorkTruck({ configuration: { cover: 'open' } })
  const hits = rayAt(truck, [2.50, 0, 0], [0, 1, 0])
  assert.ok(hits.length)
  assert.ok(hits[0].point.y < 0.90, `open bed floor at ${hits[0].point.y}`)
  assert.equal(truck.getObjectByName('canopy').children.length, 0)
  assert.equal(truck.getObjectByName('service').children.length, 0)
  assert.equal(truck.getObjectByName('rack').children.length, 0)
  assert.ok(truck.getObjectByName('bed').children.length > 10)
  dispose(truck)
})

test('tonneau covers the bed and a bed rack remains independently selectable', () => {
  const truck = buildWorkTruck({ configuration: { cover: 'tonneau', rack: true } })
  const hits = rayAt(truck, [2.50, 0, 0], [0, 1, 0])
  assert.ok(hits[0].point.y > 1.35 && hits[0].point.y < 1.40)
  assert.ok(truck.getObjectByName('tonneau-cover'))
  assert.equal(truck.getObjectByName('canopy').children.length, 0)
  assert.ok(truck.getObjectByName('rack').children.length > 0)
  dispose(truck)
})

test('component paint is independent of cab paint, and service rack can be removed', () => {
  const truck = buildWorkTruck({ configuration: { canopyPaint: '#123456' } })
  const canopy = collect(truck, (mesh) => mesh.isMesh && mesh.userData.paintRole === 'canopy')
  const body = collect(truck, (mesh) => mesh.isMesh && mesh.userData.paintRole === 'body')
  assert.ok(canopy.length && body.length)
  assert.ok(canopy.every((mesh) => mesh.material.name === 'paint' && mesh.material.color.getHexString() === '123456'))
  assert.ok(body.every((mesh) => mesh.material.color.getHexString() === 'ffffff'))
  dispose(truck)
  const service = buildWorkTruck({ back: 'service', configuration: { rack: false } })
  assert.equal(service.getObjectByName('rack').children.length, 0)
  assert.ok(service.getObjectByName('service').children.length)
  dispose(service)
})

// Real ray intersections check the geometry at each permitted region's centre and corners.
// This catches a print rectangle landing on glass or outside the actual component; a positive
// mesh count alone would not establish either property.
for (const { value: cover } of COVER_OPTIONS) {
  const sides = ['open', 'tonneau'].includes(cover) ? ['solid'] : ['solid', 'windows', 'hatches']
  for (const sideOption of sides) {
    test(`${cover}, ${sideOption}: each advertised surface lands on paint outside the glass`, () => {
      const configuration = { cover, sides: sideOption }
      const truck = buildWorkTruck({ configuration })
      const areas = configuredAreas('truck-canopy', VEHICLES['truck-canopy'].areas, configuration)
      for (const [id, area] of Object.entries(areas)) {
        for (const [u, v] of [[0, 0], [-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) {
          const point = new THREE.Vector3(...area.origin)
            .addScaledVector(new THREE.Vector3(...area.uAxis), u * area.width)
            .addScaledVector(new THREE.Vector3(...area.vAxis), v * area.height)
          const hits = rayAt(truck, point.toArray(), area.normal)
          const painted = hits.find((hit) => hit.object.material.name === 'paint')
          const where = `${id} at ${u},${v}`
          assert.ok(painted, `${where}: paint is missing`)
          assert.notEqual(hits[0].object.material.name, 'glass', `${where}: glass obstruction`)
          assert.ok(painted.distance - hits[0].distance < 0.06, `${where}: occluded by ${hits[0].object.material.name}`)
          assert.ok(Number.isFinite(painted.point.x + painted.point.y + painted.point.z))
        }
      }
      const bounds = new THREE.Box3().setFromObject(truck)
      assert.ok(Math.abs(bounds.getSize(new THREE.Vector3()).x - 6.77) < 0.01, 'cover choice does not stretch the vehicle')
      dispose(truck)
    })
  }
}
