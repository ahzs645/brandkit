// A generic crew-cab work truck drawn in code. Its pickup bed, cover and rack are independent
// components; the historical raised canopy and service-body configurations remain available.
// This is a visual mockup, not a model-matched vehicle or a manufacturer's fitment drawing.
//
// Metres, front towards -x, left side towards +z, wheels on y = 0, 6.77 m long over its bumpers. The painted body
// is every mesh with the material named `paint`; glass is `glass` (see vehicle-models.js).

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { canopyTop, hasCanopy, normalizeConfiguration, CONFIGURATION_VERSION } from './vehicle-configuration.js'

const WIDTH = 2.0
const BEVEL = 0.04
const WHEEL = { radius: 0.44, width: 0.32, arch: 0.565, centre: 0.46, front: -2.05, rear: 1.75 }
// Where the sill line meets an arch: the arch starts this far round from horizontal.
const SILL = 0.58
const ARCH_START = Math.asin((SILL - WHEEL.centre) / WHEEL.arch)

const materials = () => ({
  paint: new THREE.MeshStandardMaterial({ name: 'paint', color: '#ffffff', roughness: 0.35, metalness: 0.05 }),
  glass: new THREE.MeshStandardMaterial({ name: 'glass', color: '#17222b', roughness: 0.12, metalness: 0.3, side: THREE.DoubleSide }),
  trim: new THREE.MeshStandardMaterial({ name: 'trim', color: '#1d2024', roughness: 0.7 }),
  chrome: new THREE.MeshStandardMaterial({ name: 'chrome', color: '#d7dbe0', roughness: 0.22, metalness: 1 }),
  tyre: new THREE.MeshStandardMaterial({ name: 'tyre', color: '#18191b', roughness: 0.92 }),
  rim: new THREE.MeshStandardMaterial({ name: 'rim', color: '#b9bec5', roughness: 0.3, metalness: 0.85 }),
  lamp: new THREE.MeshStandardMaterial({ name: 'lamp', color: '#f4f6f8', emissive: '#9aa3ad', emissiveIntensity: 0.35, roughness: 0.15 }),
  tail: new THREE.MeshStandardMaterial({ name: 'tail-lamp', color: '#b3131b', emissive: '#5a0509', emissiveIntensity: 0.4, roughness: 0.25 }),
  amber: new THREE.MeshStandardMaterial({ name: 'marker', color: '#f2a223', emissive: '#7a4a05', emissiveIntensity: 0.4, roughness: 0.3 })
})

/** A side profile extruded across `width`, centred on z = 0, with rounded edges. */
const extrude = (shape, width = WIDTH) => {
  const depth = width - 2 * BEVEL
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 4, curveSegments: 28 })
  geometry.translate(0, 0, -depth / 2)
  geometry.computeVertexNormals()
  return geometry
}

// Thin component panels, unlike the legacy full-width body extrusion. Open beds and new canopy
// variants have a cavity, so looking down into the pickup does not reveal a solid block.
const panel = (shape, thickness = 0.10) => {
  const bevel = 0.015
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness - 2 * bevel, bevelEnabled: true,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 20 })
  geometry.translate(0, 0, -(thickness - 2 * bevel) / 2)
  geometry.computeVertexNormals()
  return geometry
}

/** The sill from `from` to `to`, rising over a wheel arch at `axle`. */
const sillWithArch = (shape, axle, to) => {
  shape.lineTo(axle - WHEEL.arch * Math.cos(ARCH_START), SILL)
  shape.absarc(axle, WHEEL.centre, WHEEL.arch, Math.PI - ARCH_START, ARCH_START, true)
  shape.lineTo(to, SILL)
}

const cabProfile = () => {
  const shape = new THREE.Shape()
  shape.moveTo(-3.04, 0.66)
  shape.quadraticCurveTo(-3.04, SILL, -2.96, SILL)
  sillWithArch(shape, WHEEL.front, 0.56)
  shape.lineTo(0.56, 1.96)
  shape.quadraticCurveTo(0.56, 2.04, 0.46, 2.04)
  shape.lineTo(-1.0, 2.04)
  shape.quadraticCurveTo(-1.1, 2.04, -1.14, 1.98)
  shape.lineTo(-1.7, 1.42)
  shape.lineTo(-2.95, 1.34)
  shape.quadraticCurveTo(-3.04, 1.33, -3.04, 1.22)
  shape.closePath()
  return shape
}

const bedProfile = (top = 1.3, end = 3.18) => {
  const shape = new THREE.Shape()
  shape.moveTo(0.64, SILL)
  sillWithArch(shape, WHEEL.rear, end)
  shape.lineTo(end, top)
  shape.lineTo(0.64, top)
  shape.closePath()
  return shape
}

const canopyProfile = () => {
  const shape = new THREE.Shape()
  shape.moveTo(0.64, 1.3)
  shape.lineTo(3.18, 1.3)
  shape.lineTo(3.18, 2.36)
  shape.quadraticCurveTo(3.18, 2.44, 3.1, 2.44)
  shape.lineTo(1.08, 2.46)
  shape.quadraticCurveTo(0.64, 2.46, 0.64, 2.06)
  shape.closePath()
  return shape
}

const flatShape = (points) => {
  const shape = new THREE.Shape()
  shape.moveTo(...points[0])
  for (const point of points.slice(1)) shape.lineTo(...point)
  shape.closePath()
  return shape
}

export const buildWorkTruck = ({ back = 'canopy', configuration: input } = {}) => {
  if (!['canopy', 'service'].includes(back)) throw new Error('Unknown work truck rear body.')
  const configuration = normalizeConfiguration(back === 'service' ? 'truck-service' : 'truck-canopy', input)
  const pickup = back === 'canopy'
  const legacyCanopy = pickup && configuration.cover === 'raised' && configuration.sides === 'solid'
  const m = materials()
  m.component = m.paint.clone()
  m.component.color.set(configuration.canopyPaint ?? '#ffffff')
  const truck = new THREE.Group()
  truck.name = pickup ? 'work-truck-canopy' : 'work-truck-service-body'
  truck.userData = { configuration: { ...configuration }, assetVersion: CONFIGURATION_VERSION, fidelity: 'generic' }
  const groups = Object.fromEntries(['cab', 'bed', 'canopy', 'service', 'rack', 'chassis'].map((name) => {
    const group = new THREE.Group()
    group.name = name
    group.userData.component = name
    truck.add(group)
    return [name, group]
  }))
  let component = 'cab'
  const add = (geometry, material, [x, y, z] = [0, 0, 0], rotation) => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    if (rotation) mesh.rotation.set(...rotation)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData.component = component
    if (material.name === 'paint') mesh.userData.paintRole = ['canopy', 'service'].includes(component) ? 'canopy' : 'body'
    mesh.name = `${component}-${material.name}-${groups[component].children.length}`
    groups[component].add(mesh)
    return mesh
  }
  const box = (size, material, position, radius = 0.015) => add(new RoundedBoxGeometry(...size, 3, radius), material, position)
  const bothSides = (make) => { make(1); make(-1) }

  // Painted body: the cab with its hood, then the bed or the service body.
  add(extrude(cabProfile()), m.paint)
  if (pickup) {
    component = 'bed'
    if (legacyCanopy) add(extrude(bedProfile()), m.paint)
    else {
      // Outer sidewalls have the actual wheel-arch cutout, with a floor, bulkhead and tailgate
      // around the empty bed. Wheel tubs, liner ribs and rail caps make the opening legible.
      bothSides((s) => {
        add(panel(bedProfile()), m.paint, [0, 0, s * 0.95])
        box([2.54, 0.055, 0.13], m.trim, [1.91, 1.32, s * 0.95], 0.016)
        box([1.04, 0.37, 0.32], m.trim, [WHEEL.rear, 0.89, s * 0.71], 0.08)
      })
      box([2.48, 0.10, 1.80], m.trim, [1.91, 0.77, 0], 0.02)
      box([0.10, 0.52, 1.82], m.paint, [0.68, 1.04, 0], 0.02)
      box([0.10, 0.52, 1.82], m.paint, [3.18, 1.04, 0], 0.02)
      box([0.025, 0.055, 0.26], m.chrome, [3.24, 1.20, 0], 0.012)
      for (const z of [-0.60, -0.40, -0.20, 0, 0.20, 0.40, 0.60]) {
        box([2.26, 0.025, 0.035], m.trim, [1.91, 0.83, z], 0.008)
      }
    }
    if (configuration.cover === 'tonneau') {
      component = 'bed'
      const cover = box([2.52, 0.075, 1.88], m.trim, [1.91, 1.345, 0], 0.025)
      cover.name = 'tonneau-cover'
      for (const x of [1.08, 1.91, 2.74]) box([0.018, 0.012, 1.77], m.chrome, [x, 1.389, 0], 0.003)
    }
    if (hasCanopy(configuration)) {
      component = 'canopy'
      const top = canopyTop(configuration)
      if (legacyCanopy) {
        // Keep the old raised solid canopy's silhouette, seam, handle and windows unchanged.
        add(extrude(canopyProfile(), WIDTH - 0.02), m.component)
        for (const z of [-0.45, 0.45]) add(new THREE.PlaneGeometry(0.62, 0.22), m.glass, [0.595, 2.22, z], [0, -Math.PI / 2, 0])
        box([0.012, 1.0, 1.7], m.trim, [3.224, 1.86, 0], 0.004)
        box([0.016, 0.96, 1.66], m.component, [3.228, 1.86, 0], 0.004)
        box([0.03, 0.05, 0.22], m.chrome, [3.245, 1.5, 0])
      } else {
        const sidewall = new THREE.Shape()
        sidewall.moveTo(0.66, 1.34)
        sidewall.lineTo(3.18, 1.34)
        sidewall.lineTo(3.18, top - 0.09)
        sidewall.quadraticCurveTo(3.18, top - 0.015, 3.08, top - 0.015)
        sidewall.lineTo(0.82, top - 0.015)
        sidewall.quadraticCurveTo(0.66, top - 0.015, 0.66, top - 0.18)
        sidewall.closePath()
        const windowBottom = 1.54
        const windowTop = top - 0.17
        if (configuration.sides === 'windows') {
          const hole = new THREE.Path()
          hole.moveTo(0.99, windowBottom)
          hole.lineTo(0.99, windowTop)
          hole.lineTo(2.91, windowTop)
          hole.lineTo(2.91, windowBottom)
          hole.closePath()
          sidewall.holes.push(hole)
        }
        bothSides((s) => {
          add(panel(sidewall, 0.08), m.component, [0, 0, s * 0.95])
          if (configuration.sides === 'windows') {
            box([1.98, windowTop - windowBottom + 0.055, 0.035], m.trim,
              [1.95, (windowBottom + windowTop) / 2, s * 0.99], 0.025)
            box([1.86, windowTop - windowBottom - 0.035, 0.018], m.glass,
              [1.95, (windowBottom + windowTop) / 2, s * 1.012], 0.02)
            box([0.023, windowTop - windowBottom - 0.02, 0.025], m.trim,
              [2.18, (windowBottom + windowTop) / 2, s * 1.024], 0.006)
          }
          if (configuration.sides === 'hatches') {
            const height = top - 1.48
            box([2.20, height, 0.025], m.trim, [1.94, 1.37 + height / 2, s * 0.998], 0.035)
            box([2.14, height - 0.06, 0.027], m.component, [1.94, 1.37 + height / 2, s * 1.013], 0.03)
            for (const x of [1.18, 2.70]) {
              box([0.16, 0.025, 0.037], m.chrome, [x, top - 0.15, s * 1.033], 0.006)
            }
            box([0.18, 0.05, 0.037], m.chrome, [1.94, 1.43, s * 1.037], 0.008)
          }
        })
        box([2.52, 0.09, 1.98], m.component, [1.92, top - 0.025, 0], 0.035)
        box([0.085, top - 1.36, 1.83], m.component, [0.685, (top + 1.32) / 2, 0], 0.025)
        box([0.065, top - 1.36, 1.84], m.trim, [3.18, (top + 1.32) / 2, 0], 0.025)
        box([0.065, top - 1.42, 1.77], m.component, [3.202, (top + 1.32) / 2, 0], 0.02)
        box([0.035, 0.055, 0.24], m.chrome, [3.24, 1.46, 0], 0.008)
      }
    }
  } else {
    component = 'service'
    const bodyWidth = 2.2
    add(extrude(bedProfile(1.92, 3.24), bodyWidth), m.component)
    // Compartment doors: seams and handles on each side, and the rear doors.
    bothSides((s) => {
      const z = s * (bodyWidth / 2 + 0.002)
      for (const x of [1.1, 2.4]) box([0.012, 1.26, 0.006], m.trim, [x, 1.26, z], 0.003)
      box([1.26, 0.012, 0.006], m.trim, [1.75, 1.08, z], 0.003)
      for (const x of [0.88, 1.75, 2.82]) box([0.12, 0.035, 0.03], m.chrome, [x, 1.5, s * (bodyWidth / 2 + 0.012)])
      // Reflective tape at the bottom of the body, as service bodies carry.
      for (const x of [0.86, 2.82]) box([0.36, 0.05, 0.006], m.tail, [x, 0.7, z], 0.003)
    })
    box([0.012, 1.26, 0.012], m.trim, [3.282, 1.26, 0], 0.003)
  }
  // A roof rack attaches to a canopy or service body; an open bed uses taller bed-mounted legs.
  // The service-body defaults preserve the old rack exactly, but it can now be removed.
  if (configuration.rack) {
    component = 'rack'
    const base = !pickup ? 1.92 : hasCanopy(configuration) ? canopyTop(configuration) : 1.32
    const rail = !pickup ? 2.10 : hasCanopy(configuration) ? base + 0.18 : 2.28
    const tube = (length) => new THREE.CylinderGeometry(0.025, 0.025, length, 12)
    bothSides((s) => {
      add(tube(2.6), m.chrome, [1.92, rail, s * 0.95], [0, 0, Math.PI / 2])
      for (const x of [0.72, 3.12]) add(tube(rail - base), m.chrome, [x, (base + rail) / 2, s * 0.95])
    })
    for (const x of [0.72, 1.92, 3.12]) add(tube(1.9), m.chrome, [x, rail, 0], [Math.PI / 2, 0, 0])
  }

  // Glass: the windscreen, and the door windows on each side.
  component = 'cab'
  const screen = new THREE.BufferGeometry()
  const lift = 0.05 / Math.SQRT2
  const [ax, ay, bx, by, half] = [-1.7 - lift, 1.42 + lift, -1.14 - lift, 1.98 + lift, 0.86]
  screen.setAttribute('position', new THREE.Float32BufferAttribute([ax, ay, -half, ax, ay, half, bx, by, half, ax, ay, -half, bx, by, half, bx, by, -half], 3))
  screen.computeVertexNormals()
  add(screen, m.glass)
  const windows = [
    [[-1.5, 1.46], [-1.06, 1.92], [-0.4, 1.92], [-0.4, 1.46]],
    [[-0.26, 1.46], [-0.26, 1.92], [0.36, 1.92], [0.44, 1.8], [0.44, 1.46]]
  ]
  bothSides((s) => {
    for (const points of windows) add(new THREE.ShapeGeometry(flatShape(points)), m.glass, [0, 0, s * (WIDTH / 2 + 0.006)])
    const z = s * (WIDTH / 2 + 0.003)
    // Door seams and handles, the mirror, the step bar.
    box([0.012, 0.86, 0.006], m.trim, [-1.5, 1.02, z], 0.003)
    box([0.012, 1.32, 0.006], m.trim, [-0.33, 1.25, z], 0.003)
    box([0.012, 1.3, 0.006], m.trim, [0.5, 1.24, z], 0.003)
    for (const x of [-0.6, 0.3]) box([0.16, 0.035, 0.03], m.chrome, [x, 1.33, s * (WIDTH / 2 + 0.014)])
    box([0.14, 0.3, 0.06], m.trim, [-1.44, 1.62, s * 1.2], 0.03)
    box([0.05, 0.05, 0.2], m.trim, [-1.44, 1.52, s * 1.08])
    add(new THREE.CylinderGeometry(0.035, 0.035, 2.0, 14), m.chrome, [-0.5, 0.45, s * 1.06], [0, 0, Math.PI / 2])
    for (const x of [-1.2, 0.2]) box([0.05, 0.12, 0.1], m.trim, [x, 0.5, s * 1.0])
    // Amber side markers at the front.
    box([0.1, 0.04, 0.01], m.amber, [-2.88, 1.2, s * (WIDTH / 2 + 0.004)])
  })

  // Front: grille, lamps and bumper. Rear: lamps and bumper.
  box([0.05, 0.5, 1.12], m.chrome, [-3.07, 0.98, 0], 0.02)
  box([0.05, 0.4, 0.98], m.trim, [-3.085, 0.98, 0], 0.01)
  for (const y of [0.88, 0.98, 1.08]) box([0.02, 0.025, 0.96], m.chrome, [-3.11, y, 0], 0.008)
  bothSides((s) => box([0.05, 0.2, 0.3], m.lamp, [-3.07, 1.12, s * 0.74], 0.03))
  box([0.3, 0.3, 2.06], m.chrome, [-3.14, 0.5, 0], 0.06)
  box([0.06, 0.12, 0.6], m.trim, [-3.3, 0.5, 0], 0.02)
  const rearFace = pickup ? 3.22 : 3.28
  component = pickup ? 'bed' : 'service'
  bothSides((s) => box([0.05, 0.42, 0.13], m.tail, [rearFace + 0.01, 1.06, s * (pickup ? 0.92 : 1.0)], 0.02))
  box([0.24, 0.2, 2.02], m.chrome, [rearFace + 0.1, 0.52, 0], 0.05)

  // Underneath: a chassis so the truck does not look hollow from low angles.
  component = 'chassis'
  box([5.9, 0.22, 1.6], m.trim, [0.05, 0.47, 0], 0.02)

  // Wheels and the black flares around their arches.
  const tyre = new THREE.CylinderGeometry(WHEEL.radius, WHEEL.radius, WHEEL.width, 40)
  const rim = new THREE.CylinderGeometry(0.25, 0.25, WHEEL.width + 0.012, 32)
  const hub = new THREE.CylinderGeometry(0.075, 0.075, WHEEL.width + 0.03, 16)
  const flare = new THREE.Shape()
  flare.absarc(0, 0, 0.63, ARCH_START * 0.6, Math.PI - ARCH_START * 0.6, false)
  flare.absarc(0, 0, WHEEL.arch + 0.005, Math.PI - ARCH_START * 0.6, ARCH_START * 0.6, true)
  const flareGeometry = new THREE.ExtrudeGeometry(flare, { depth: 0.1, bevelEnabled: false, curveSegments: 24 })
  for (const x of [WHEEL.front, WHEEL.rear]) {
    bothSides((s) => {
      const z = s * (WIDTH / 2 - 0.19)
      add(tyre, m.tyre, [x, WHEEL.radius, z], [Math.PI / 2, 0, 0])
      add(rim, m.rim, [x, WHEEL.radius, z], [Math.PI / 2, 0, 0])
      add(hub, m.chrome, [x, WHEEL.radius, z], [Math.PI / 2, 0, 0])
      // The service body is wider than the cab: its rear arch is flush with it.
      const bodyHalf = x === WHEEL.rear && !pickup ? 1.1 : WIDTH / 2
      add(flareGeometry, m.trim, [x, WHEEL.centre, s > 0 ? bodyHalf - 0.06 : -bodyHalf - 0.04])
    })
  }
  return truck
}
