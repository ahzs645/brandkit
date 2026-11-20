// The imported Innerscene pickup already contains its retractable tonneau and slats.
// Configuration only changes those original nodes' visibility. No geometry, transforms,
// materials or vehicle dimensions are generated or changed here.

export const IMPORTED_PICKUP_ASSET_SHA256 = 'faa7a63c8cde051e41b3c90d3d9afc1afb25e60735f5b4508c401554eaa84fb2'

export const IMPORTED_PICKUP_COVER_NAMES = Object.freeze([
  'Seated retractable tonneau',
  'Tonneau slat',
  ...Array.from({ length: 17 }, (_, i) => `Tonneau slat.${String(i + 1).padStart(3, '0')}`)
])

// GLTFLoader preserves the source name in userData.name, while sanitising Object3D.name
// for animation bindings. Both exact forms are accepted; a broad prefix would also hide
// unrelated source components if a future file introduced similarly named objects.
const sourceNames = new Set(IMPORTED_PICKUP_COVER_NAMES)
const loaderNames = new Set(IMPORTED_PICKUP_COVER_NAMES.map((name) => name.replace(/\s/g, '_').replace(/[\[\].:/]/g, '')))

export const isImportedPickupCoverNode = (object) => Boolean(object?.isMesh && (
  sourceNames.has(object.userData?.name) || sourceNames.has(object.name) || loaderNames.has(object.name)
))

/**
 * Apply an already-normalised { cover: 'open' | 'tonneau' } configuration to the source scene.
 * The checksum and node inventory pin this adapter to the checked-in Innerscene GLB.
 * Validation completes before any nodes change, so an incompatible asset cannot partly apply.
 * This module deliberately has no renderer or Three.js dependency.
 */
export const configureImportedPickup = (root, configuration) => {
  const cover = configuration?.cover
  if (!['open', 'tonneau'].includes(cover)) throw new Error('This imported pickup supports an open bed or its original tonneau cover.')
  if (typeof root?.traverse !== 'function') throw new Error('The imported pickup scene could not be read.')
  const nodes = []
  root.traverse((object) => { if (isImportedPickupCoverNode(object)) nodes.push(object) })
  const identity = (object) => sourceNames.has(object.userData?.name) ? object.userData.name
    : sourceNames.has(object.name) ? object.name : IMPORTED_PICKUP_COVER_NAMES.find((name) => name.replace(/\s/g, '_').replace(/[\[\].:/]/g, '') === object.name)
  if (nodes.length !== IMPORTED_PICKUP_COVER_NAMES.length || new Set(nodes.map(identity)).size !== IMPORTED_PICKUP_COVER_NAMES.length) {
    throw new Error('The imported pickup cover components do not match this asset version.')
  }
  for (const node of nodes) {
    node.userData ??= {}
    node.userData.component = 'tonneau'
    node.visible = cover === 'tonneau'
  }
  return root
}
