// Lists what is inside a GLB vehicle model: its materials (and how many meshes and triangles use
// each), its meshes, and its overall size. Use it when adding a vehicle to the Vehicles tab, to
// find the name of the material its painted body uses (`paint` in src/mockups/vehicle-models.js),
// its glass (`glass`), and which way it faces. See docs/vehicles.md.
//
//   node scripts/vehicle-model.mjs path/to/model.glb

import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const path = process.argv[2]
if (!path) {
  console.error('usage: node scripts/vehicle-model.mjs model.glb')
  process.exit(1)
}
const bytes = readFileSync(path)
if (bytes.readUInt32LE(0) !== 0x46546c67) throw new Error(`${path} is not a binary glTF (GLB) file.`)
// The first chunk of a GLB is its JSON description.
const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'))

const materials = (json.materials ?? []).map((material, index) => ({ index, name: material.name ?? `(material ${index})`, meshes: 0, triangles: 0, colour: material.pbrMetallicRoughness?.baseColorFactor, texture: material.pbrMetallicRoughness?.baseColorTexture != null }))
const triangles = (primitive) => {
  const accessor = json.accessors[primitive.indices ?? primitive.attributes.POSITION]
  return Math.round(accessor.count / 3)
}
for (const mesh of json.meshes ?? []) {
  for (const primitive of mesh.primitives) {
    const material = materials[primitive.material]
    if (!material) continue
    material.meshes++
    material.triangles += triangles(primitive)
  }
}

// Size: the meshes' own bounds, combined. Node transforms (scale, rotation) are not applied, so
// this is a guide to which axis is the vehicle's length, not an exact measurement.
const min = [Infinity, Infinity, Infinity]
const max = [-Infinity, -Infinity, -Infinity]
for (const mesh of json.meshes ?? []) {
  for (const primitive of mesh.primitives) {
    const accessor = json.accessors[primitive.attributes.POSITION]
    accessor.min?.forEach((value, axis) => { min[axis] = Math.min(min[axis], value) })
    accessor.max?.forEach((value, axis) => { max[axis] = Math.max(max[axis], value) })
  }
}
const size = max.map((value, axis) => value - min[axis])
const round = (value) => Math.round(value * 1000) / 1000

console.log(`${path}`)
console.log(`  sha256  ${createHash('sha256').update(bytes).digest('hex')}`)
console.log(`  size    x ${round(size[0])}  y ${round(size[1])}  z ${round(size[2])}  (the longest is the length; brandkit wants it along x, the front towards -x)`)
console.log(`  meshes  ${json.meshes?.length ?? 0}`)
if (json.asset?.extras) console.log(`  credit  ${JSON.stringify(json.asset.extras)}`)
if (json.asset?.copyright) console.log(`  licence ${json.asset.copyright}`)
console.log('  materials, most triangles first (the painted body is a large exterior one, often named for its colour: check in the browser):')
for (const material of materials.sort((a, b) => b.triangles - a.triangles)) {
  const colour = material.colour ? ` colour ${material.colour.slice(0, 3).map((value) => Math.round(value * 255)).join(',')}` : ''
  console.log(`    ${material.name.padEnd(32)} ${String(material.meshes).padStart(4)} meshes ${String(material.triangles).padStart(8)} triangles${colour}${material.texture ? ' (textured)' : ''}`)
}
