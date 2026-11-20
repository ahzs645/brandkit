// Loads an actual third-party garment. No procedural garment geometry is used.
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'
import { APPAREL_ASSET, APPAREL_SIZES, apparelPlacement } from './apparel-layout.js'

/** Keep the author's textile detail while allowing a colour preview. The original
 * diffuse and normal files remain embedded in the distributed source GLB. */
const tintableMap = (texture) => {
  if (!texture?.image) return texture
  const source = texture.image
  const canvas = document.createElement('canvas')
  canvas.width = source.width; canvas.height = source.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  context.drawImage(source, 0, 0)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  for (let i = 0; i < pixels.data.length; i += 4) {
    // This source's cloth is very dark blue; desaturate and expose existing detail.
    // No cloth pattern, seam, pocket, cord or garment contour is drawn here.
    const value = Math.min(255, Math.max(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]) * 13)
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value
  }
  context.putImageData(pixels, 0, 0)
  const map = new THREE.CanvasTexture(canvas)
  map.flipY = texture.flipY
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = texture.wrapS; map.wrapT = texture.wrapT
  texture.dispose()
  return map
}

export const loadApparelGarment = async () => {
  const { scene } = await new GLTFLoader().loadAsync(APPAREL_ASSET.url)
  scene.name = APPAREL_ASSET.id
  scene.traverse((object) => {
    if (!object.isMesh) return
    object.castShadow = true; object.receiveShadow = true
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      material.map = tintableMap(material.map)
      material.side = THREE.DoubleSide
      material.roughness = 0.94
      material.metalness = 0
    }
  })
  return scene
}

export const configureApparelGarment = (garment, project) => {
  garment.scale.setScalar(APPAREL_SIZES[project.size].scale)
  garment.traverse((object) => {
    if (object.isMesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.color.set(project.colour)
  })
  garment.updateMatrixWorld(true)
}

/** A projection basis viewed from outside. Back and sleeve local X stay readable. */
export const apparelProjection = (project, layer) => {
  const placement = apparelPlacement(project, layer)
  const height = APPAREL_SIZES[project.size].height / 1000
  const normal = new THREE.Vector3(...({ front: [0, 0, 1], back: [0, 0, -1], 'left-sleeve': [1, 0, 0], 'right-sleeve': [-1, 0, 0] }[placement.surface]))
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
  const horizontal = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion)
  const centre = new THREE.Vector3(0, height - placement.y / 1000, placement.surface.endsWith('sleeve') ? 0.02 * APPAREL_SIZES[project.size].scale : 0)
  centre.addScaledVector(horizontal, placement.x / 1000)
  const rotation = quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -layer.rotation * Math.PI / 180))
  return { centre, normal, horizontal, orientation: new THREE.Euler().setFromQuaternion(rotation), width: placement.width / 1000, height: placement.height / 1000 }
}

/** Clip the logo projection against the imported triangles. No floating sticker
 * plane or replacement garment surface is created. */
export const projectApparelDecal = (garment, project, layer, material) => {
  const projection = apparelProjection(project, layer)
  const ray = new THREE.Raycaster(projection.centre.clone().addScaledVector(projection.normal, 1.5), projection.normal.clone().negate(), 0, 3)
  garment.updateMatrixWorld(true)
  const intersection = ray.intersectObject(garment, true)[0]
  if (!intersection) return null
  const padded = layer.method === 'patch' ? 0.01 : 0
  const size = new THREE.Vector3(projection.width + padded, projection.height + padded, projection.normal.x ? 0.12 : 0.16)
  const geometry = new DecalGeometry(intersection.object, intersection.point, projection.orientation, size)
  if (!geometry.attributes.position.count) { geometry.dispose(); return null }
  // Source garment is an open fabric shell. Discard back-facing triangles so a
  // projection cannot stamp the inside of the hood or reverse side of a sleeve.
  const position = geometry.attributes.position, normals = geometry.attributes.normal, uv = geometry.attributes.uv
  const keptPosition = [], keptNormal = [], keptUv = []
  for (let i = 0; i < position.count; i += 3) {
    const normal = new THREE.Vector3().fromBufferAttribute(normals, i).add(new THREE.Vector3().fromBufferAttribute(normals, i + 1)).add(new THREE.Vector3().fromBufferAttribute(normals, i + 2))
    if (normal.normalize().dot(projection.normal) < 0.1) continue
    for (let j = i; j < i + 3; j++) {
      keptPosition.push(position.getX(j), position.getY(j), position.getZ(j))
      keptNormal.push(normals.getX(j), normals.getY(j), normals.getZ(j))
      keptUv.push(uv.getX(j), uv.getY(j))
    }
  }
  geometry.dispose()
  if (!keptPosition.length) return null
  const clipped = new THREE.BufferGeometry()
  clipped.setAttribute('position', new THREE.Float32BufferAttribute(keptPosition, 3))
  clipped.setAttribute('normal', new THREE.Float32BufferAttribute(keptNormal, 3))
  clipped.setAttribute('uv', new THREE.Float32BufferAttribute(keptUv, 2))
  const mesh = new THREE.Mesh(clipped, material)
  mesh.name = `artwork-${layer.id}`
  mesh.userData.layerId = layer.id
  return mesh
}

export const disposeApparelGarment = (garment) => {
  const textures = new Set(), materials = new Set(), geometries = new Set()
  garment?.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry)
    for (const material of object.material ? Array.isArray(object.material) ? object.material : [object.material] : []) materials.add(material)
  })
  for (const material of materials) {
    for (const value of Object.values(material)) if (value?.isTexture) textures.add(value)
    material.dispose()
  }
  for (const texture of textures) texture.dispose()
  for (const geometry of geometries) geometry.dispose()
}
