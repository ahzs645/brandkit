// Static, softly draped generic garments. A texture coordinate is tied to millimetres on a
// panel, so decoration size is stable as a different garment size is selected.
import * as THREE from 'three'
import { APPAREL_SIZES } from './apparel-layout.js'

const mesh = (geometry, material, name) => {
  const object = new THREE.Mesh(geometry, material)
  object.name = name
  object.castShadow = true
  object.receiveShadow = true
  return object
}
const grid = (columns, rows, point, reverse = false) => {
  const positions = [], uv = [], indices = []
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) {
    const next = point(i / columns, j / rows)
    positions.push(...next.position)
    uv.push(...next.uv)
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const a = j * (columns + 1) + i, b = a + 1, c = a + columns + 1, d = c + 1
    indices.push(...(reverse ? [a, c, b, b, c, d] : [a, b, c, b, d, c]))
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/** Build with independent front/back/sleeve texture materials and a plain ribbing material. */
export const buildApparelGarment = (project, materials) => {
  const root = new THREE.Group()
  root.name = `generic-${project.product}-${project.size}`
  const dimensions = APPAREL_SIZES[project.size]
  const width = dimensions.width / 1000, height = dimensions.height / 1000
  const half = width / 2
  const bodyPoint = (u, v, sign) => {
    const taper = 0.91 + 0.09 * Math.sin(v * Math.PI / 2)
    const x = (u - 0.5) * width * taper
    const neck = Math.max(0, 1 - (x / 0.093) ** 2)
    const cut = neck * (sign > 0 ? 0.072 : 0.034)
    const shoulder = 0.02 * Math.max(0, (Math.abs(x) - 0.12) / Math.max(0.01, half - 0.12))
    const y = v * (height - cut - shoulder)
    const fullness = Math.sin(Math.PI * u) ** 0.58
    const folds = Math.sin(u * Math.PI * 9 + v * 3.2) * 0.0055 * (0.2 + (1 - v) * 0.8)
      + Math.sin(v * 21 + u * 4) * 0.003 * Math.sin(Math.PI * u)
    const z = sign * (0.029 + fullness * (0.077 + 0.012 * Math.sin(v * Math.PI)) + folds)
    return { position: [x, y, z], uv: [0.5 + sign * x / width, y / height] }
  }
  root.add(mesh(grid(56, 64, (u, v) => bodyPoint(u, v, 1)), materials.front, 'front-panel'))
  root.add(mesh(grid(56, 64, (u, v) => bodyPoint(u, v, -1), true), materials.back, 'back-panel'))
  // Soft side seams join the two broad panels without creating decoration surfaces.
  for (const side of [0, 1]) root.add(mesh(grid(4, 48, (u, v) => {
    const front = bodyPoint(side, v, 1).position, back = bodyPoint(side, v, -1).position
    return { position: [front[0], front[1], back[2] + u * (front[2] - back[2])], uv: [u, v] }
  }, side === 1), materials.plain, 'side-seam'))
  // Close each shoulder while leaving the actual neck opening unobstructed.
  for (const sign of [-1, 1]) root.add(mesh(grid(24, 6, (u, v) => {
    const x = sign * (0.095 + u * (half - 0.095))
    const front = bodyPoint(x / width + 0.5, 1, 1).position
    const back = bodyPoint(x / width + 0.5, 1, -1).position
    return { position: [x, front[1] + v * (back[1] - front[1]), front[2] + v * (back[2] - front[2])], uv: [u, v] }
  }, sign < 0), materials.plain, sign > 0 ? 'left-shoulder' : 'right-shoulder'))

  // Rounded hem ribbing, with no arbitrary uniform scaling of the artwork textures.
  const hem = mesh(new THREE.CylinderGeometry(1, 0.99, 0.054, 64, 1, true), materials.rib, 'ribbed-hem')
  hem.position.y = 0.024
  hem.scale.set(half * 0.91, 1, 0.104)
  root.add(hem)

  const sleeveLength = 0.56
  for (const sign of [-1, 1]) {
    const name = sign > 0 ? 'left-sleeve' : 'right-sleeve'
    const from = new THREE.Vector3(sign * (half - 0.018), height - 0.074, 0)
    const to = new THREE.Vector3(sign * (half + 0.245), height - 0.56, 0.018)
    const axis = to.clone().sub(from).normalize()
    const across = new THREE.Vector3(-axis.y, axis.x, 0).normalize()
    const geometry = grid(40, 44, (u, v) => {
      const angle = u * Math.PI * 2
      const radius = 0.098 - v * 0.049
      const ripple = Math.sin(v * 35 + u * 7) * 0.0045 * Math.sin(v * Math.PI)
      const point = from.clone().lerp(to, v).addScaledVector(across, Math.sin(angle) * (radius + ripple))
      point.z -= Math.cos(angle) * (radius * 0.77 + ripple)
      // At the front of the sleeve, increasing texture U must read left to right as seen
      // from outside. The cylinder's increasing angle runs the opposite way here.
      return { position: point.toArray(), uv: [1 - u, 1 - v] }
    })
    root.add(mesh(geometry, materials[name], name))
    const cuff = mesh(new THREE.CylinderGeometry(0.049, 0.046, 0.065, 36, 1, true), materials.rib, `${name}-cuff`)
    cuff.position.copy(to).addScaledVector(axis, -0.014)
    cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis)
    root.add(cuff)
  }

  const neckPoints = Array.from({ length: 65 }, (_, i) => {
    const angle = i / 64 * Math.PI * 2
    return new THREE.Vector3(Math.cos(angle) * 0.094, height - 0.031 - Math.max(0, Math.sin(angle)) * 0.037, Math.sin(angle) * 0.076)
  })
  root.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(neckPoints, true), 96, 0.013, 10, true), materials.rib, 'neck-ribbing'))

  if (project.product === 'hoodie') {
    // A collapsed hood sits behind the neck. Its open edge is part of the model, not a print area.
    const hood = mesh(new THREE.SphereGeometry(1, 48, 28, 0, Math.PI * 2, 0, Math.PI * 0.84), materials.plain, 'hood')
    hood.scale.set(0.147, 0.176, 0.098)
    hood.position.set(0, height - 0.021, -0.062)
    hood.rotation.x = -0.7
    root.add(hood)
    const hoodInside = mesh(new THREE.SphereGeometry(1, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.6), materials.rib, 'hood-lining')
    hoodInside.scale.set(0.125, 0.145, 0.075)
    hoodInside.position.set(0, height + 0.007, -0.043)
    hoodInside.rotation.x = -0.95
    root.add(hoodInside)

    const pocketShape = new THREE.Shape()
    pocketShape.moveTo(-0.17, 0.08)
    pocketShape.lineTo(0.17, 0.08)
    pocketShape.quadraticCurveTo(0.178, 0.08, 0.178, 0.095)
    pocketShape.lineTo(0.14, 0.245)
    pocketShape.quadraticCurveTo(0.135, 0.26, 0.12, 0.26)
    pocketShape.lineTo(-0.12, 0.26)
    pocketShape.quadraticCurveTo(-0.135, 0.26, -0.14, 0.245)
    pocketShape.lineTo(-0.178, 0.095)
    pocketShape.closePath()
    const pocketGeometry = new THREE.ShapeGeometry(pocketShape, 16)
    const points = pocketGeometry.attributes.position
    for (let i = 0; i < points.count; i++) {
      const x = points.getX(i), y = points.getY(i)
      points.setZ(i, 0.105 + 0.012 * Math.sin((y - 0.08) / 0.18 * Math.PI) - 0.018 * (Math.abs(x) / 0.18) ** 2)
    }
    pocketGeometry.computeVertexNormals()
    root.add(mesh(pocketGeometry, materials.plain, 'kangaroo-pocket'))
    const seamMaterial = materials.seam
    const stitchPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.167, 0.096, 0.093), new THREE.Vector3(0, 0.096, 0.115), new THREE.Vector3(0.167, 0.096, 0.093)
    ])
    root.add(mesh(new THREE.TubeGeometry(stitchPath, 40, 0.0018, 6, false), seamMaterial, 'pocket-seam'))
    for (const sign of [-1, 1]) {
      const cordPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sign * 0.05, height - 0.05, 0.08),
        new THREE.Vector3(sign * 0.055, height - 0.14, 0.12),
        new THREE.Vector3(sign * 0.047, height - 0.2, 0.118)
      ])
      root.add(mesh(new THREE.TubeGeometry(cordPath, 28, 0.003, 8, false), materials.rib, 'drawcord'))
    }
  }
  root.userData = { generic: true, dimensions, sleeveLengthMm: sleeveLength * 1000 }
  return root
}
