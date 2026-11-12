// The vehicle mockup editor's 3D side: the scene and its backdrop, the vehicle, the wrap on its
// painted body, the logo placed over the wrap, the selection box and its handles, gestures, and
// undo. The React view (src/app/views/Vehicles.jsx) draws the controls and calls the methods
// returned here; the editor reports every change through `onChange`. Loaded only when the
// Vehicles tab opens.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { MAX_UPLOAD_BYTES, OPPOSITE, SCHEMA, UPLOAD_TYPES, VEHICLES, areasFor, clampPlacement, copyProject, createPlacement, mirrorPlacement, validAspect, validateProject, wrapWindow } from './vehicle-layout.js'
import { VEHICLE_MODELS, lengthOf } from './vehicle-models.js'
import { buildWorkTruck } from './work-truck.js'

const SVG_NS = 'http://www.w3.org/2000/svg'
const HISTORY_LIMIT = 30
const EXPORT_SIZE = { width: 2400, height: 1500 }
// Camera positions for a car 4.7 m long; a longer vehicle's are scaled to match.
const CAMERA_VIEWS = { angle: [-5.8, 2.8, 6.8], side: [0, 1.25, 8.5], opposite: [0, 1.25, -8.5], front: [-8.5, 2, 0], rear: [8.5, 1.8, 0], hood: [-4.5, 6, 3.5] }
const VIEW_FOR_AREA = { left: 'side', 'left-body': 'side', right: 'opposite', 'right-body': 'opposite', hood: 'hood', rear: 'rear' }
// The faces a wrap covers: each looks out along `n`, with the artwork across `u` and up `v`
// (each frame right-handed, so it is a rotation the projector can take). The left side's u runs
// front to back, so the artwork's left edge is the front; the right side's runs back to front,
// and is mirrored to keep the design's front edge at the front.
const FACES = {
  left: { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  right: { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
  top: { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  front: { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  rear: { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] }
}
const COVERAGE_FACES = { sides: ['left', 'right'], rear: ['left', 'right'], full: ['left', 'right', 'top', 'front', 'rear'] }
// The models' bytes, kept while the page is open, so switching back and forth (or brands) does
// not download them again.
const modelBytes = new Map()

const vec = (values) => new THREE.Vector3(...values)
const toRadians = (degrees) => degrees * Math.PI / 180
const sameProject = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** Refuses an uploaded SVG that could run code or fetch anything once drawn. */
export const inspectSvg = (source) => {
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('Use an SVG without document entities.')
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml')
  if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') throw new Error('The SVG could not be read.')
  if (doc.querySelector('script,foreignObject,iframe,object,embed')) throw new Error('Use an SVG containing artwork only.')
  for (const element of doc.querySelectorAll('*')) {
    for (const attribute of element.attributes) {
      if (/^on/i.test(attribute.name)) throw new Error('Use an SVG without event handlers.')
      if (/href$/i.test(attribute.name) && attribute.value && !attribute.value.startsWith('#') && !/^data:image\/(png|jpeg|webp);base64,/i.test(attribute.value)) {
        throw new Error('Embed linked images in the SVG before uploading it.')
      }
    }
  }
  const resources = [...source.matchAll(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi)]
  if (/@import/i.test(source) || resources.some((match) => !match[2].startsWith('#'))) throw new Error('Remove external resources from the SVG.')
  return doc
}

const decodeDataUrl = (dataUrl) => {
  const comma = dataUrl.indexOf(',')
  const head = dataUrl.slice(0, comma)
  const body = dataUrl.slice(comma + 1)
  return head.includes(';base64') ? new TextDecoder().decode(Uint8Array.from(atob(body), (char) => char.charCodeAt(0))) : decodeURIComponent(body)
}

/**
 * An image ready to draw, with its exact proportions. An SVG is drawn at its viewBox size (an
 * SVG without one has no reliable size); an upload is inspected first, brand artwork is trusted.
 */
const loadImage = async (dataUrl, { trusted = false, size = 2048 } = {}) => {
  let exactAspect = null
  if (dataUrl.startsWith('data:image/svg+xml')) {
    const source = decodeDataUrl(dataUrl)
    const doc = trusted ? new DOMParser().parseFromString(source, 'image/svg+xml') : inspectSvg(source)
    const svg = doc.documentElement
    const box = svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number)
    if (box?.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0) {
      exactAspect = box[2] / box[3]
      const scale = size / Math.max(box[2], box[3])
      svg.setAttribute('width', String(box[2] * scale))
      svg.setAttribute('height', String(box[3] * scale))
    }
    dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`
  }
  const image = new Image()
  image.src = dataUrl
  await image.decode()
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth > 16384 || image.naturalHeight > 16384) throw new Error('Use artwork smaller than 16,384 pixels on each side.')
  const aspect = exactAspect ?? image.naturalWidth / image.naturalHeight
  if (!validAspect(aspect)) throw new Error('Use artwork with proportions between 1:10 and 20:1.')
  return { image, aspect, url: dataUrl }
}

/** A texture of an image, its longer side `size` pixels. */
const textureOf = (renderer, { image, aspect }, size) => {
  const drawing = document.createElement('canvas')
  drawing.width = Math.max(1, Math.round(aspect >= 1 ? size : size * aspect))
  drawing.height = Math.max(1, Math.round(aspect >= 1 ? size / aspect : size))
  drawing.getContext('2d').drawImage(image, 0, 0, drawing.width, drawing.height)
  const texture = new THREE.CanvasTexture(drawing)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  return texture
}

const readFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error('The artwork could not be read.'))
  reader.readAsDataURL(file)
})

const checkUpload = async (file) => {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Choose artwork smaller than 5 MB.')
  if (!UPLOAD_TYPES.includes(file.type)) throw new Error('Choose PNG, JPEG, WebP or SVG artwork.')
  const dataUrl = await readFile(file)
  const loaded = await loadImage(dataUrl)
  return { name: file.name.slice(0, 120), dataUrl, aspect: loaded.aspect }
}

/** A vertical gradient for the stage's background. */
const gradientTexture = (top, bottom) => {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 512
  const context = canvas.getContext('2d')
  const gradient = context.createLinearGradient(0, 0, 0, 512)
  gradient.addColorStop(0, top)
  gradient.addColorStop(1, bottom)
  context.fillStyle = gradient
  context.fillRect(0, 0, 2, 512)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** A ground that fades out towards its edge, for the outdoor backdrop. */
const groundTexture = (colour) => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const context = canvas.getContext('2d')
  const gradient = context.createRadialGradient(256, 256, 40, 256, 256, 256)
  // Fades to the same colour, transparent: fading to transparent black would darken the edge.
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(colour.slice(index, index + 2), 16))
  gradient.addColorStop(0, colour)
  gradient.addColorStop(0.55, colour)
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`)
  context.fillStyle = gradient
  context.fillRect(0, 0, 512, 512)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/**
 * Starts an editor in `container` (a positioned element the canvas fills).
 *
 * - `project`: the mockup to open (validated by the caller), or null for `fallback`.
 * - `artworkUrl(artwork)`, `wrapUrl(wrap)`: data URLs of the logo artwork and the wrap artwork.
 * - `backdropFor(id)`: `{ top, bottom, shadow, ground, light }` for a backdrop.
 * - `logos`, `patterns`: the ids the brand offers, for checking saved mockups.
 * - `storageKey`: where this browser keeps the draft, or null.
 * - `onChange(snapshot)`, `onStatus(message, isError)`.
 */
export const createVehicleStudio = ({ container, project: initial, fallback, artworkUrl, wrapUrl, backdropFor, logos, patterns, files, storageKey, onChange, onStatus }) => {
  let state = copyProject(initial ?? fallback)
  let mode = 'edit'
  let view = 'angle'
  let ready = false
  let busy = false
  let disposed = false
  let root = null
  let body = []
  let faceBounds = null
  let texture = null
  let aspect = 1
  let preview = null
  let wrapTexture = null
  let wrapAspect = 1
  let wrapPreview = null
  let gesture = null
  let pending = 0
  let dirty = true
  let wrapDirty = true
  let fieldStart = null
  let modelToken = 0
  let artworkToken = 0
  let wrapToken = 0
  let fetchController = null
  const history = { undo: [], redo: [] }
  const frames = new Map()
  const areas = () => areasFor(state.model)
  const scale = () => lengthOf(state.model) / 4.7

  const status = (message, error = false) => { if (!disposed) onStatus?.(message, error) }
  const emit = () => {
    if (disposed) return
    onChange?.({
      project: copyProject(state), mode, view, ready, busy, aspect, preview, wrapPreview,
      canUndo: history.undo.length > 0, canRedo: history.redo.length > 0, model: VEHICLE_MODELS[state.model]
    })
  }

  // --- Scene -------------------------------------------------------------------------------
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false })
  } catch (error) {
    throw new Error('Vehicle mockups need WebGL. Try a browser with hardware graphics turned on.', { cause: error })
  }
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  // Neutral tone mapping keeps the brand's colours close to their values: ACES, the common
  // choice for scenes, shifts saturated reds and blues.
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  const canvas = renderer.domElement
  canvas.className = 'vehicle-stage__canvas'
  canvas.tabIndex = 0
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', 'The vehicle in 3D. Select a painted body area, drag the artwork, or switch to Rotate car. Arrow keys nudge the artwork; Escape cancels a drag.')
  container.prepend(canvas)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(33, 1, 0.05, 200)
  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 0.8, 0)
  controls.enabled = false
  controls.enableDamping = false
  controls.maxPolarAngle = Math.PI / 2 - 0.02
  controls.addEventListener('change', () => requestRender())

  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmrem.fromScene(room, 0.04)
  scene.environment = environment.texture
  // The room's bright panels face the vehicle's front and rear, so its sides are lit alike.
  scene.environmentRotation.set(0, Math.PI / 2, 0)
  room.dispose()
  pmrem.dispose()
  const hemisphere = new THREE.HemisphereLight(0xffffff, 0x8a929c, 0.55)
  scene.add(hemisphere)
  const sun = new THREE.DirectionalLight(0xfffaf2, 3.4)
  sun.position.set(-4, 9, 6)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.radius = 4
  sun.shadow.normalBias = 0.025
  scene.add(sun)
  // The sun's mirror image on the other side, without a shadow, so both sides of the vehicle
  // are lit alike and its colours read the same from either side.
  const fill = new THREE.DirectionalLight(0xfffaf2, 3.4)
  fill.position.set(-4, 9, -6)
  scene.add(fill)
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: '#1f2a30', opacity: 0.2 }))
  shadowFloor.rotation.x = -Math.PI / 2
  shadowFloor.position.y = -0.012
  shadowFloor.receiveShadow = true
  scene.add(shadowFloor)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.95, depthWrite: false }))
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.02
  ground.visible = false
  scene.add(ground)
  const wraps = new THREE.Group()
  const decals = new THREE.Group()
  const guide = new THREE.Group()
  scene.add(wraps, decals, guide)
  const ray = new THREE.Raycaster()

  const applyBackdrop = () => {
    const look = backdropFor(state.backdrop)
    scene.background?.dispose?.()
    scene.background = gradientTexture(look.top, look.bottom)
    shadowFloor.material.opacity = look.shadow
    hemisphere.intensity = 0.55 * look.light
    scene.environmentIntensity = 0.4 * look.light
    ground.material.map?.dispose()
    ground.material.map = look.ground ? groundTexture(look.ground) : null
    ground.material.needsUpdate = true
    ground.visible = Boolean(look.ground)
    requestRender()
  }

  // --- Selection overlay -------------------------------------------------------------------
  const overlay = document.createElementNS(SVG_NS, 'svg')
  overlay.setAttribute('class', 'vehicle-stage__selection')
  overlay.style.display = 'none'
  const svgElement = (name, attributes) => {
    const element = document.createElementNS(SVG_NS, name)
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value)
    overlay.append(element)
    return element
  }
  const stem = svgElement('line', { class: 'vehicle-stage__stem' })
  const box = svgElement('polygon', { class: 'vehicle-stage__box', 'aria-label': 'Drag to move the artwork' })
  const corners = [0, 1, 2, 3].map((index) => svgElement('circle', { class: 'vehicle-stage__handle', r: 6, 'data-handle': 'scale', 'aria-label': `Resize the artwork from corner ${index + 1}` }))
  const spin = svgElement('circle', { class: 'vehicle-stage__handle vehicle-stage__handle--rotate', r: 7, 'data-handle': 'rotate', 'aria-label': 'Rotate the artwork' })
  container.append(overlay)

  // --- History and storage -------------------------------------------------------------------
  const snapshot = () => copyProject(state)
  const persist = () => {
    if (!storageKey) return
    try { localStorage.setItem(storageKey, JSON.stringify(state)) } catch { status('This mockup is too large to keep in the browser. Use Save mockup to keep a copy.') }
  }
  const remember = (before) => {
    if (sameProject(before, state)) return
    // Changed by hand, the mockup is no longer the brand's livery as defined.
    if (state.livery && before.livery === state.livery) state.livery = null
    history.undo.push(before)
    if (history.undo.length > HISTORY_LIMIT) history.undo.shift()
    history.redo = []
    persist()
    emit()
  }

  // --- Geometry ------------------------------------------------------------------------------
  const clearGroup = (group) => {
    for (const item of [...group.children]) {
      item.geometry?.dispose()
      if (item.material?.map && item.material.map !== texture && item.material.map !== wrapTexture) item.material.map.dispose()
      item.material?.dispose()
      group.remove(item)
    }
  }
  const disposeModel = (group) => {
    if (!group) return
    const geometries = new Set()
    const materials = new Set(group.userData.originalMaterials ?? [])
    const textures = new Set()
    group.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry)
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material)
    })
    for (const material of materials) {
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value)
      material.dispose()
    }
    for (const item of textures) { item.source?.data?.close?.(); item.dispose() }
    for (const geometry of geometries) geometry.dispose()
    scene.remove(group)
  }
  const worldNormal = (hit) => hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize()
  const facesOut = (hit, normal) => hit.face && worldNormal(hit).dot(normal) > 0.04

  /** Where an area's surface is at (u, v): the body's depth there, keeping the exact u and v. */
  const surfaceHit = (areaId, u = 0, v = 0) => {
    const a = areas()[areaId]
    if (!a) return null
    const normal = vec(a.normal)
    const point = vec(a.origin).addScaledVector(vec(a.uAxis), u).addScaledVector(vec(a.vAxis), v)
    // A seam can leave the exact centre ray empty: nearby paint gives the depth instead.
    for (const [du, dv] of [[0, 0], [0, -0.02], [0, 0.02], [-0.02, 0], [0.02, 0], [0, -0.03], [0, 0.03], [-0.03, 0], [0.03, 0]]) {
      ray.set(point.clone().addScaledVector(vec(a.uAxis), du).addScaledVector(vec(a.vAxis), dv).addScaledVector(normal, 8), normal.clone().negate())
      const hit = ray.intersectObjects(body, false).find((candidate) => facesOut(candidate, normal))
      if (hit) return { ...hit, point: point.clone().addScaledVector(normal, hit.point.clone().sub(point).dot(normal)) }
    }
    return null
  }
  const basisOf = (u, v, n) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(vec(u), vec(v), vec(n)))
  const basis = (areaId, rotation = 0) => {
    const a = areas()[areaId]
    return basisOf(a.uAxis, a.vAxis, a.normal).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), toRadians(rotation)))
  }

  /** The axis a triangle mostly faces: one of FACES' names, or 'bottom'. */
  const facing = (nx, ny, nz) => {
    const [ax, ay, az] = [Math.abs(nx), Math.abs(ny), Math.abs(nz)]
    if (az >= ax && az >= ay) return nz > 0 ? 'left' : 'right'
    if (ay >= ax) return ny > 0 ? 'top' : 'bottom'
    return nx > 0 ? 'rear' : 'front'
  }

  /**
   * Keeps the triangles of a projected decal that belong to it. A logo keeps those facing out of
   * its area; a wrap face keeps those that face mostly its way, so each triangle of the body is
   * wrapped once and the faces meet without overlapping.
   */
  const keepTriangles = (geometry, test) => {
    const position = geometry.attributes.position
    const normals = geometry.attributes.normal
    const uv = geometry.attributes.uv
    if (!position?.count) return geometry
    const out = { position: [], normal: [], uv: [] }
    for (let i = 0; i < position.count; i += 3) {
      let nx = 0
      let ny = 0
      let nz = 0
      for (let j = 0; j < 3; j++) { nx += normals.getX(i + j); ny += normals.getY(i + j); nz += normals.getZ(i + j) }
      if (!test({ nx, ny, nz })) continue
      for (let j = 0; j < 3; j++) {
        const k = i + j
        out.position.push(position.getX(k), position.getY(k), position.getZ(k))
        out.normal.push(normals.getX(k), normals.getY(k), normals.getZ(k))
        out.uv.push(uv.getX(k), uv.getY(k))
      }
    }
    geometry.dispose()
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(out.position, 3))
    result.setAttribute('normal', new THREE.Float32BufferAttribute(out.normal, 3))
    result.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2))
    return result
  }

  const projectDecal = (group, areaId, point, width, height, rotation, highlight = false) => {
    const normal = vec(areas()[areaId].normal)
    const orientation = new THREE.Euler().setFromQuaternion(basis(areaId, rotation))
    const reach = width + height + 0.4
    const bounds = new THREE.Box3().setFromCenterAndSize(point, new THREE.Vector3(reach, reach, reach))
    for (const mesh of body) {
      if (!bounds.intersectsBox(mesh.userData.worldBounds)) continue
      const geometry = keepTriangles(new DecalGeometry(mesh, point, orientation, new THREE.Vector3(width, height, 0.32)), ({ nx, ny, nz }) => nx * normal.x + ny * normal.y + nz * normal.z > 0.06)
      if (!geometry.attributes.position.count) { geometry.dispose(); continue }
      const material = highlight
        ? new THREE.MeshBasicMaterial({ color: '#3eaf96', transparent: true, opacity: 0.12, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.FrontSide, toneMapped: false })
        : new THREE.MeshStandardMaterial({ map: texture, transparent: true, depthWrite: false, roughness: 0.6, metalness: 0, envMapIntensity: 0.25, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6, side: THREE.FrontSide })
      const item = new THREE.Mesh(geometry, material)
      item.renderOrder = highlight ? 1 : 4
      group.add(item)
    }
  }
  const rebuildDecals = () => {
    clearGroup(decals)
    clearGroup(guide)
    frames.clear()
    if (!ready || !texture) return
    for (const [id, placement] of Object.entries(state.placements)) {
      if (!areas()[id]) continue
      const hit = surfaceHit(id, placement.u, placement.v)
      if (!hit) continue
      projectDecal(decals, id, hit.point, placement.width, placement.width / aspect, placement.rotation)
      frames.set(id, { point: hit.point.clone(), q: basis(id, placement.rotation) })
    }
    const a = areas()[state.area]
    const hit = surfaceHit(state.area)
    if (hit) projectDecal(guide, state.area, hit.point, a.width, a.height, 0, true)
    guide.visible = mode === 'edit'
    container.dataset.decals = String(decals.children.length)
    // For checks: the selected area when its lettering found the body (see test/browser/vehicles.check.mjs).
    container.dataset.activeArea = frames.has(state.area) ? state.area : ''
  }

  // --- Wrap ----------------------------------------------------------------------------------
  /** The extent of the painted body facing each way, in that face's own axes. */
  const measureFaces = () => {
    const bounds = Object.fromEntries(Object.keys(FACES).map((name) => [name, { u: [Infinity, -Infinity], v: [Infinity, -Infinity], n: [Infinity, -Infinity] }]))
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const c = new THREE.Vector3()
    const vertexNormal = new THREE.Vector3()
    for (const mesh of body) {
      const geometry = mesh.geometry
      const position = geometry.attributes.position
      const normals = geometry.attributes.normal
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)
      const index = geometry.index
      const count = index ? index.count : position.count
      for (let i = 0; i < count; i += 3) {
        const [ia, ib, ic] = index ? [index.getX(i), index.getX(i + 1), index.getX(i + 2)] : [i, i + 1, i + 2]
        a.fromBufferAttribute(position, ia).applyMatrix4(mesh.matrixWorld)
        b.fromBufferAttribute(position, ib).applyMatrix4(mesh.matrixWorld)
        c.fromBufferAttribute(position, ic).applyMatrix4(mesh.matrixWorld)
        // The vertex normals' sum, as the projected wrap classifies its triangles (see keepTriangles).
        const normal = new THREE.Vector3()
        if (normals) for (const k of [ia, ib, ic]) normal.add(vertexNormal.fromBufferAttribute(normals, k).applyMatrix3(normalMatrix).normalize())
        else normal.copy(b).sub(a).cross(c.clone().sub(a))
        if (normal.lengthSq() < 1e-14) continue
        const name = facing(normal.x, normal.y, normal.z)
        if (name === 'bottom') continue
        const face = FACES[name]
        const extent = bounds[name]
        for (const point of [a, b, c]) {
          for (const axis of ['u', 'v', 'n']) {
            const value = point.x * face[axis][0] + point.y * face[axis][1] + point.z * face[axis][2]
            if (value < extent[axis][0]) extent[axis][0] = value
            if (value > extent[axis][1]) extent[axis][1] = value
          }
        }
      }
    }
    return bounds
  }

  /** Sets each wrap face's texture window from the wrap's scale, position and mirroring. */
  const updateWrapWindows = () => {
    for (const item of wraps.children) {
      const map = item.material.map
      if (!map) continue
      const { repeat, offset } = wrapWindow({
        faceAspect: item.userData.faceAspect, artAspect: wrapAspect,
        scale: state.wrap.scale, offsetU: state.wrap.offsetU, offsetV: state.wrap.offsetV,
        mirror: item.userData.face === 'right' && state.wrap.mirror
      })
      map.repeat.set(...repeat)
      map.offset.set(...offset)
    }
    requestRender()
  }

  /** Projects the wrap onto every face its coverage includes. */
  const rebuildWrap = () => {
    clearGroup(wraps)
    wrapDirty = false
    if (!ready || !wrapTexture || state.wrap.coverage === 'none' || !faceBounds) return
    const split = VEHICLES[state.model]?.rearHalf ?? 0
    for (const name of COVERAGE_FACES[state.wrap.coverage]) {
      const face = FACES[name]
      const extent = faceBounds[name]
      let [u0, u1] = extent.u
      const [v0, v1] = extent.v
      const [n0, n1] = extent.n
      if (!(u1 > u0) || !(v1 > v0)) continue
      // A rear-half wrap starts where the vehicle's rear half does (u runs backwards on the right).
      if (state.wrap.coverage === 'rear') {
        if (name === 'left') u0 = Math.max(u0, split)
        else u1 = Math.min(u1, -split)
      }
      const [u, v, n] = [vec(face.u), vec(face.v), vec(face.n)]
      const centre = u.clone().multiplyScalar((u0 + u1) / 2).addScaledVector(v, (v0 + v1) / 2).addScaledVector(n, (n0 + n1) / 2)
      const size = new THREE.Vector3(u1 - u0, v1 - v0, n1 - n0 + 0.3)
      const orientation = new THREE.Euler().setFromQuaternion(basisOf(face.u, face.v, face.n))
      const map = wrapTexture.clone()
      map.needsUpdate = true
      // Vinyl: a satin finish with no clear coat, so its colours are not washed out by reflections.
      const material = new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: 0.6, metalness: 0, envMapIntensity: 0.25, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })
      for (const mesh of body) {
        const geometry = keepTriangles(new DecalGeometry(mesh, centre, orientation, size), ({ nx, ny, nz }) => facing(nx, ny, nz) === name)
        if (!geometry.attributes.position.count) { geometry.dispose(); continue }
        const item = new THREE.Mesh(geometry, material)
        item.renderOrder = 2
        item.userData = { face: name, faceAspect: (u1 - u0) / (v1 - v0) }
        wraps.add(item)
      }
    }
    updateWrapWindows()
    container.dataset.wraps = String(wraps.children.length)
  }

  // --- Rendering -----------------------------------------------------------------------------
  const toScreen = (point) => {
    const p = point.clone().project(camera)
    return { x: (p.x + 1) * container.clientWidth / 2, y: (1 - p.y) * container.clientHeight / 2 }
  }
  const updateOverlay = () => {
    const frame = frames.get(state.area)
    const placement = state.placements[state.area]
    const a = areas()[state.area]
    const facingCamera = frame && a && vec(a.normal).dot(camera.position.clone().sub(frame.point).normalize()) > 0.16
    const visible = ready && !busy && mode === 'edit' && placement && facingCamera
    overlay.style.display = visible ? 'block' : 'none'
    if (!visible) return
    overlay.setAttribute('viewBox', `0 0 ${container.clientWidth} ${container.clientHeight}`)
    const u = new THREE.Vector3(1, 0, 0).applyQuaternion(frame.q)
    const v = new THREE.Vector3(0, 1, 0).applyQuaternion(frame.q)
    const points = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, y]) => toScreen(frame.point.clone().addScaledVector(u, x * placement.width / 2).addScaledVector(v, y * placement.width / aspect / 2)))
    box.setAttribute('points', points.map((p) => `${p.x},${p.y}`).join(' '))
    corners.forEach((corner, index) => { corner.setAttribute('cx', points[index].x); corner.setAttribute('cy', points[index].y) })
    const top = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
    const centre = toScreen(frame.point)
    const dx = top.x - centre.x
    const dy = top.y - centre.y
    const length = Math.max(1, Math.hypot(dx, dy))
    const handle = { x: top.x + dx / length * 34, y: top.y + dy / length * 34 }
    for (const [key, value] of Object.entries({ x1: top.x, y1: top.y, x2: handle.x, y2: handle.y })) stem.setAttribute(key, value)
    spin.setAttribute('cx', handle.x)
    spin.setAttribute('cy', handle.y)
  }
  function requestRender () {
    if (pending || disposed) return
    pending = requestAnimationFrame(() => {
      pending = 0
      if (disposed) return
      if (wrapDirty) rebuildWrap()
      if (dirty) { dirty = false; rebuildDecals() }
      renderer.render(scene, camera)
      updateOverlay()
    })
  }
  const changed = () => { dirty = true; emit(); requestRender() }
  const setBusy = (value) => { busy = value; emit(); requestRender() }

  const cameraView = (next) => {
    cancelGesture()
    view = CAMERA_VIEWS[next] ? next : 'angle'
    const k = scale()
    camera.position.fromArray(CAMERA_VIEWS[view].map((value) => value * k))
    controls.target.set(0, 0.8 * k, 0)
    controls.minDistance = 4.5 * k
    controls.maxDistance = 14 * k
    controls.update()
    emit()
    requestRender()
  }

  // --- Model and artwork ---------------------------------------------------------------------
  const paintBody = (value) => { for (const mesh of body) mesh.material.color.set(value) }

  /** The scene of a model: a drawn one built here, a file downloaded once and parsed. */
  const modelScene = async (info, token) => {
    if (info.build) return buildWorkTruck(info.build)
    let bytes = modelBytes.get(info.url)
    if (!bytes) {
      const response = await fetch(info.url, { signal: fetchController.signal })
      if (!response.ok) throw new Error('The vehicle could not be downloaded. Try again.')
      bytes = await response.arrayBuffer()
      modelBytes.set(info.url, bytes)
    }
    if (token !== modelToken) return null
    return (await new GLTFLoader().parseAsync(bytes, '')).scene
  }

  /** Keeps each placement and the selected area valid for the vehicle's own areas. */
  const fitToVehicle = () => {
    const known = areas()
    for (const id of Object.keys(state.placements)) {
      if (known[id]) state.placements[id] = clampPlacement(state.placements[id], id, aspect, known)
      else delete state.placements[id]
    }
    if (!known[state.area]) state.area = 'left'
    state.placements[state.area] ??= createPlacement(state.area, aspect, known)
  }

  const loadModel = async () => {
    cancelGesture()
    const token = ++modelToken
    fetchController?.abort()
    fetchController = new AbortController()
    ready = false
    const info = VEHICLE_MODELS[state.model]
    setBusy(true)
    status(`Loading the ${info.label.toLowerCase()}…`)
    let next = null
    try {
      const loaded = await modelScene(info, token)
      if (!loaded || token !== modelToken || disposed) return
      next = new THREE.Group()
      next.userData.originalMaterials = []
      next.add(loaded)
      loaded.rotation.y += info.rotation
      loaded.updateMatrixWorld(true)
      // A downloaded model is shown at its length, standing on the floor, centred. One drawn
      // here is already in place, at the size its areas were measured on.
      if (!info.build) {
        const bounds = new THREE.Box3().setFromObject(loaded)
        loaded.scale.multiplyScalar(lengthOf(state.model) / bounds.getSize(new THREE.Vector3()).x)
        loaded.updateMatrixWorld(true)
        bounds.setFromObject(loaded)
        const centre = bounds.getCenter(new THREE.Vector3())
        loaded.position.x -= centre.x
        loaded.position.z -= centre.z
        loaded.position.y -= bounds.min.y
      }
      next.updateMatrixWorld(true)
      const paintable = []
      next.traverse((object) => {
        if (!object.isMesh) return
        object.castShadow = true
        object.receiveShadow = true
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        if (materials.some((material) => material.name === info.paint)) {
          if (Array.isArray(object.material)) throw new Error('This model’s paint is not a separate surface.')
          next.userData.originalMaterials.push(object.material)
          // Paint with a clear coat: a gloss over the colour, as on a real vehicle.
          object.material = new THREE.MeshPhysicalMaterial({ name: info.paint, color: state.paint, roughness: 0.38, metalness: 0.06, clearcoat: 1, clearcoatRoughness: 0.08 })
          object.userData.worldBounds = new THREE.Box3().setFromObject(object)
          paintable.push(object)
        } else if (info.glass && materials.some((material) => material.name === info.glass) && !info.build) {
          next.userData.originalMaterials.push(object.material)
          object.material = object.material.clone()
          object.material.transparent = false
          object.material.opacity = 1
          object.material.color.set('#14232d')
          object.material.roughness = 0.22
        }
      })
      if (!paintable.length) throw new Error('This model has no paintable body.')
      disposeModel(root)
      root = next
      next = null
      body = paintable
      scene.add(root)
      root.updateMatrixWorld(true)
      faceBounds = measureFaces()
      const k = scale()
      Object.assign(sun.shadow.camera, { left: -5 * k, right: 5 * k, top: 5 * k, bottom: -5 * k, near: 0.5, far: 30 * k })
      sun.shadow.camera.updateProjectionMatrix()
      fitToVehicle()
      ready = true
      wrapDirty = true
      setBusy(false)
      cameraView(['left', 'left-body'].includes(state.area) ? 'angle' : VIEW_FOR_AREA[state.area])
      changed()
      status('Select a body area, then drag the artwork.')
    } catch (error) {
      disposeModel(next)
      if (token !== modelToken || disposed || error.name === 'AbortError') return
      ready = false
      setBusy(false)
      status(error.message, true)
    }
  }

  /** Draws the logo artwork into its texture. Resolves true when it changed, false on failure. */
  const updateArtwork = async () => {
    const token = ++artworkToken
    try {
      if (state.artwork.kind === 'none') {
        clearGroup(decals)
        texture?.dispose()
        texture = null
        preview = null
        changed()
        return true
      }
      const upload = state.artwork.kind === 'upload'
      const url = upload ? state.artwork.upload?.dataUrl : await artworkUrl(state.artwork)
      if (!url) throw new Error('Upload artwork first.')
      // Drawn here from the brand's definition: trusted. Uploaded, or a file a brand pack carries: inspected.
      const loaded = await loadImage(url, { trusted: !upload && state.artwork.kind !== 'file' })
      if (token !== artworkToken || disposed) return null
      const next = textureOf(renderer, loaded, 2048)
      clearGroup(decals)
      texture?.dispose()
      texture = next
      aspect = loaded.aspect
      preview = loaded.url
      for (const [id, placement] of Object.entries(state.placements)) {
        if (areas()[id]) state.placements[id] = clampPlacement(placement, id, aspect, areas())
      }
      changed()
      return true
    } catch (error) {
      if (token === artworkToken) status(error.message, true)
      return false
    }
  }

  /** Draws the wrap artwork into its texture. Resolves true when it changed, false on failure. */
  const updateWrap = async () => {
    const token = ++wrapToken
    try {
      if (state.wrap.coverage === 'none') {
        clearGroup(wraps)
        wrapTexture?.dispose()
        wrapTexture = null
        wrapPreview = null
        emit()
        requestRender()
        return true
      }
      const upload = state.wrap.source === 'upload'
      const url = upload ? state.wrap.upload?.dataUrl : await wrapUrl(state.wrap)
      if (!url) throw new Error('Upload wrap artwork first.')
      const size = Math.min(4096, renderer.capabilities.maxTextureSize)
      const loaded = await loadImage(url, { trusted: !upload && state.wrap.source !== 'file', size })
      if (token !== wrapToken || disposed) return null
      const next = textureOf(renderer, loaded, size)
      clearGroup(wraps)
      wrapTexture?.dispose()
      wrapTexture = next
      wrapAspect = loaded.aspect
      wrapPreview = loaded.url
      wrapDirty = true
      emit()
      requestRender()
      return true
    } catch (error) {
      if (token === wrapToken) status(error.message, true)
      return false
    }
  }

  // --- Gestures ------------------------------------------------------------------------------
  const pointerRay = (event) => {
    const rect = canvas.getBoundingClientRect()
    ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera)
  }
  /** The pointer in an area's own coordinates, on the plane through the artwork. */
  const pointerLocal = (event, areaId, point) => {
    pointerRay(event)
    const a = areas()[areaId]
    const normal = vec(a.normal)
    if (Math.abs(ray.ray.direction.dot(normal)) < 0.12) return null
    const hit = ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point), new THREE.Vector3())
    if (!hit) return null
    hit.sub(vec(a.origin))
    return { u: hit.dot(vec(a.uAxis)), v: hit.dot(vec(a.vAxis)) }
  }
  const startGesture = (event) => {
    if (mode !== 'edit' || busy || !ready || gesture || event.button !== 0) return
    const frame = frames.get(state.area)
    if (!frame) return
    const local = pointerLocal(event, state.area, frame.point)
    if (!local) return
    event.preventDefault()
    event.stopPropagation()
    gesture = { pointerId: event.pointerId, target: event.currentTarget, kind: event.currentTarget.dataset?.handle ?? 'move', area: state.area, point: frame.point.clone(), start: { ...state.placements[state.area] }, before: snapshot(), local }
    event.currentTarget.setPointerCapture(event.pointerId)
    canvas.focus({ preventScroll: true })
  }
  const moveGesture = (event) => {
    if (!gesture || event.pointerId !== gesture.pointerId) return
    event.preventDefault()
    const g = gesture
    const local = pointerLocal(event, g.area, g.point)
    if (!local) return
    const next = { ...g.start }
    if (g.kind === 'move') {
      next.u += local.u - g.local.u
      next.v += local.v - g.local.v
    } else if (g.kind === 'scale') {
      const from = Math.hypot(g.local.u - next.u, g.local.v - next.v)
      if (from < 0.0001) return
      next.width *= Math.hypot(local.u - next.u, local.v - next.v) / from
    } else {
      const a = Math.atan2(g.local.v - next.v, g.local.u - next.u)
      const b = Math.atan2(local.v - next.v, local.u - next.u)
      next.rotation += (b - a) * 180 / Math.PI
      if (event.shiftKey) next.rotation = Math.round(next.rotation / 15) * 15
    }
    const clamped = clampPlacement(next, g.area, aspect, areas())
    if (!surfaceHit(g.area, clamped.u, clamped.v)) return
    state.placements[g.area] = clamped
    changed()
  }
  const endGesture = (event, cancel = false) => {
    if (!gesture || (event && event.pointerId !== gesture.pointerId)) return
    const g = gesture
    gesture = null
    if (g.target.hasPointerCapture?.(g.pointerId)) g.target.releasePointerCapture(g.pointerId)
    if (cancel) state = g.before
    else remember(g.before)
    changed()
  }
  function cancelGesture () { if (gesture) endGesture(null, true) }
  for (const element of [box, ...corners, spin]) {
    element.addEventListener('pointerdown', startGesture)
    element.addEventListener('pointermove', moveGesture)
    element.addEventListener('pointerup', (event) => endGesture(event))
    element.addEventListener('pointercancel', (event) => endGesture(event, true))
    element.addEventListener('lostpointercapture', (event) => { if (gesture) endGesture(event, true) })
  }

  // A click (not a drag) on painted bodywork selects the area it is in.
  let down = null
  const onCanvasDown = (event) => { down = [event.clientX, event.clientY] }
  const onCanvasUp = (event) => {
    if (mode !== 'edit' || !ready || busy || !down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5) return
    pointerRay(event)
    const hit = ray.intersectObject(root, true)[0]
    if (!hit || !body.includes(hit.object)) { status('Choose painted bodywork. Glass, lights and trim stay clear.'); return }
    const n = worldNormal(hit)
    const inside = Object.entries(areas()).find(([, a]) => {
      if (vec(a.normal).dot(n) < 0.55) return false
      const offset = hit.point.clone().sub(vec(a.origin))
      return Math.abs(offset.dot(vec(a.uAxis))) <= a.width / 2 && Math.abs(offset.dot(vec(a.vAxis))) <= a.height / 2
    })
    if (!inside) { status('That point is outside the areas prepared for lettering. Choose an area from the list.'); return }
    selectArea(inside[0], false)
  }
  const onCanvasKey = (event) => {
    if (event.key === 'Escape') { cancelGesture(); return }
    if (!ready || busy || mode !== 'edit' || !texture || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const before = snapshot()
    const step = event.shiftKey ? 0.05 : 0.01
    const next = { ...state.placements[state.area] }
    if (event.key === 'ArrowLeft') next.u -= step
    if (event.key === 'ArrowRight') next.u += step
    if (event.key === 'ArrowUp') next.v += step
    if (event.key === 'ArrowDown') next.v -= step
    state.placements[state.area] = clampPlacement(next, state.area, aspect, areas())
    remember(before)
    changed()
  }
  const onWindowKey = (event) => {
    if (event.key === 'Escape') cancelGesture()
    // Undo belongs to the editor only while focus is not in a text field.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA|SELECT/.test(event.target?.tagName ?? '') && !event.target?.isContentEditable) {
      event.preventDefault()
      restore(event.shiftKey ? 'redo' : 'undo')
    }
  }
  canvas.addEventListener('pointerdown', onCanvasDown)
  canvas.addEventListener('pointerup', onCanvasUp)
  canvas.addEventListener('keydown', onCanvasKey)
  globalThis.addEventListener('keydown', onWindowKey)

  const resize = new ResizeObserver(() => {
    const width = container.clientWidth
    const height = container.clientHeight
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    requestRender()
  })
  resize.observe(container)

  // --- Actions -------------------------------------------------------------------------------
  const apply = async (next) => {
    cancelGesture()
    const old = state
    state = copyProject(next)
    setBusy(true)
    applyBackdrop()
    await updateArtwork()
    if (!sameProject(old.wrap, state.wrap)) await updateWrap()
    if (old.model !== state.model || !ready) await loadModel()
    else {
      paintBody(state.paint)
      wrapDirty = true
      setBusy(false)
      changed()
    }
    persist()
  }
  async function restore (direction) {
    if (busy) return
    const list = history[direction]
    if (!list.length) return
    const next = list.pop()
    history[direction === 'undo' ? 'redo' : 'undo'].push(snapshot())
    await apply(next)
    emit()
  }
  function selectArea (id, moveCamera = true) {
    if (!ready || busy || !areas()[id]) return
    cancelGesture()
    const before = snapshot()
    state.area = id
    state.placements[id] ??= createPlacement(id, aspect, areas())
    setMode('edit')
    if (moveCamera) cameraView(VIEW_FOR_AREA[id])
    remember(before)
    changed()
    status(`${areas()[id].label} selected. Drag the artwork or use its handles.`)
  }
  function setMode (next) {
    cancelGesture()
    mode = next === 'view' ? 'view' : 'edit'
    controls.enabled = mode === 'view'
    guide.visible = mode === 'edit'
    emit()
    requestRender()
  }
  const placementEdit = (modify, { live = false } = {}) => {
    if (!ready || busy) return
    if (!live) cancelGesture()
    const before = live ? (fieldStart ??= snapshot()) : snapshot()
    state.placements[state.area] = clampPlacement(modify(state.placements[state.area]), state.area, aspect, areas())
    if (!live) remember(before)
    changed()
  }

  const exportPng = async () => {
    if (!ready || busy) return null
    cancelGesture()
    const oldSize = renderer.getSize(new THREE.Vector2())
    const oldRatio = renderer.getPixelRatio()
    const oldAspect = camera.aspect
    const oldGuide = guide.visible
    try {
      setBusy(true)
      if (wrapDirty) rebuildWrap()
      if (dirty) { dirty = false; rebuildDecals() }
      guide.visible = false
      renderer.setPixelRatio(1)
      renderer.setSize(EXPORT_SIZE.width, EXPORT_SIZE.height, false)
      camera.aspect = EXPORT_SIZE.width / EXPORT_SIZE.height
      camera.updateProjectionMatrix()
      renderer.render(scene, camera)
      const out = document.createElement('canvas')
      out.width = EXPORT_SIZE.width
      out.height = EXPORT_SIZE.height
      const context = out.getContext('2d')
      context.drawImage(canvas, 0, 0)
      const info = VEHICLE_MODELS[state.model]
      if (info.creditRequired) {
        context.fillStyle = state.backdrop === 'dark' ? '#d5dbe1' : '#263e4c'
        context.font = '17px Arial, sans-serif'
        const lines = [`${info.title} — ${info.creator} · ${info.licence}. Paint, scale and branding adapted for this mockup.`, info.source, info.licenceUrl]
        lines.forEach((text, index) => context.fillText(text, 30, 1417 + index * 25, 2340))
      }
      const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('The image could not be made.')
      status('Image exported without the editing guides.')
      return blob
    } catch (error) {
      status(error.message, true)
      return null
    } finally {
      guide.visible = oldGuide
      renderer.setPixelRatio(oldRatio)
      renderer.setSize(oldSize.x, oldSize.y, false)
      camera.aspect = oldAspect
      camera.updateProjectionMatrix()
      setBusy(false)
    }
  }

  const WRAP_ART_KEYS = ['coverage', 'source', 'graphic', 'pattern', 'colours', 'upload']
  const api = {
    get project () { return copyProject(state) },
    setMode,
    cameraView,
    selectArea,
    undo: () => restore('undo'),
    redo: () => restore('redo'),
    async setModel (id) {
      if (!VEHICLE_MODELS[id] || id === state.model || busy) return
      const before = snapshot()
      state.model = id
      remember(before)
      await loadModel()
      persist()
    },
    /** Paint: `live` while a colour picker moves, then `commit()` once it settles. */
    setPaint (value, { live = false } = {}) {
      if (!/^#[0-9a-f]{6}$/i.test(value)) return
      const before = live ? (fieldStart ??= snapshot()) : snapshot()
      state.paint = value.toLowerCase()
      paintBody(state.paint)
      if (!live) remember(before)
      emit()
      requestRender()
    },
    setBackdrop (id) {
      const before = snapshot()
      state.backdrop = id
      applyBackdrop()
      remember(before)
      emit()
    },
    /** Logo settings (kind, logo, tagline, website). Text fields pass `live` while typing. */
    async setArtwork (changes, { live = false } = {}) {
      cancelGesture()
      const before = live ? (fieldStart ??= snapshot()) : snapshot()
      state.artwork = { ...state.artwork, ...changes }
      emit()
      const result = await updateArtwork()
      if (result === false && !live) { state = before; emit(); return false }
      if (!live && result) remember(before)
      return result
    },
    /** Wrap settings. Scale, position and mirroring move the artwork; the rest redraw it. */
    async setWrap (changes, { live = false } = {}) {
      const before = live ? (fieldStart ??= snapshot()) : snapshot()
      const old = state.wrap
      state.wrap = { ...state.wrap, ...changes, colours: [...(changes.colours ?? state.wrap.colours)] }
      emit()
      if (WRAP_ART_KEYS.some((key) => JSON.stringify(old[key]) !== JSON.stringify(state.wrap[key]))) {
        if (old.coverage !== state.wrap.coverage) wrapDirty = true
        status(state.wrap.coverage === 'none' ? 'Wrap removed.' : 'Applying the wrap…')
        const result = await updateWrap()
        if (result === false && !live) { state = before; emit(); return false }
        if (result && state.wrap.coverage !== 'none') status('Wrap applied. Logos and lettering sit on top of it.')
      } else updateWrapWindows()
      if (!live) remember(before)
      return true
    },
    async upload (file, { target = 'artwork' } = {}) {
      try {
        if (!file) return false
        const upload = await checkUpload(file)
        const before = snapshot()
        if (target === 'wrap') {
          state.wrap = { ...state.wrap, source: 'upload', upload, coverage: state.wrap.coverage === 'none' ? 'sides' : state.wrap.coverage }
          const result = await updateWrap()
          if (result === true) { remember(before); status('Wrap artwork added.') } else if (result === false) { state = before; emit() }
          return result
        }
        state.artwork = { ...state.artwork, kind: 'upload', upload }
        const result = await updateArtwork()
        if (result === true) { remember(before); status('Artwork added. Drag it into place.') } else if (result === false) { state = before; emit() }
        return result
      } catch (error) {
        status(error.message, true)
        return false
      }
    },
    setPlacement: (changes, options) => placementEdit((placement) => ({ ...placement, ...changes }), options),
    centre: () => placementEdit((placement) => ({ ...placement, u: 0, v: 0 })),
    fit: () => placementEdit((placement) => ({ ...placement, u: 0, v: 0, width: 100 })),
    resetArea: () => placementEdit(() => createPlacement(state.area, aspect, areas())),
    /** Ends a live edit (a slider or text field) as one step of undo. */
    commit () {
      if (!fieldStart) return
      const before = fieldStart
      fieldStart = null
      remember(before)
    },
    copyToOtherSide () {
      if (!OPPOSITE[state.area] || !areas()[OPPOSITE[state.area]] || busy || !ready) return
      cancelGesture()
      const before = snapshot()
      const { area: other, placement } = mirrorPlacement(state.placements[state.area], state.area, aspect, areas())
      state.placements[other] = placement
      remember(before)
      changed()
      status('Copied to the other side. The lettering still reads front to back.')
    },
    exportPng,
    saveProject: () => JSON.stringify({ ...state, ...(VEHICLE_MODELS[state.model].sha256 ? { modelSha256: VEHICLE_MODELS[state.model].sha256 } : {}) }, null, 2),
    async openProject (textContent) {
      try {
        const raw = JSON.parse(textContent)
        const next = validateProject(raw, { logos, patterns, files })
        if (raw.modelSha256 && raw.modelSha256 !== VEHICLE_MODELS[next.model].sha256) throw new Error('This mockup was made with a different version of the vehicle.')
        if (next.artwork.upload) await loadImage(next.artwork.upload.dataUrl)
        if (next.wrap.upload) await loadImage(next.wrap.upload.dataUrl)
        const before = snapshot()
        await apply(next)
        remember(before)
        status('Mockup opened.')
        return true
      } catch (error) {
        status(error instanceof SyntaxError ? 'That file is not a saved mockup.' : error.message, true)
        return false
      }
    },
    /** Opens a mockup made here (a brand's livery) as one step of undo. */
    async applyProject (next, message) {
      try {
        const checked = validateProject(next, { logos, patterns, files })
        const before = snapshot()
        await apply(checked)
        fitToVehicle()
        remember(before)
        changed()
        status(message ?? 'Mockup opened.')
        return true
      } catch (error) {
        status(error.message, true)
        return false
      }
    },
    /** Redraws the brand artwork when the brand's fonts arrive. */
    refreshArtwork: async () => { await updateArtwork(); if (state.wrap.source !== 'upload') await updateWrap() },
    dispose () {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(pending)
      fetchController?.abort()
      resize.disconnect()
      globalThis.removeEventListener('keydown', onWindowKey)
      clearGroup(wraps)
      clearGroup(decals)
      clearGroup(guide)
      texture?.dispose()
      wrapTexture?.dispose()
      disposeModel(root)
      for (const mesh of [shadowFloor, ground]) { mesh.geometry.dispose(); mesh.material.map?.dispose(); mesh.material.dispose() }
      scene.background?.dispose?.()
      environment.texture.dispose()
      controls.dispose()
      renderer.dispose()
      renderer.forceContextLoss?.()
      canvas.remove()
      overlay.remove()
    }
  }

  ;(async () => {
    applyBackdrop()
    emit()
    for (const [part, key] of [['artwork', 'upload'], ['wrap', 'upload']]) {
      const upload = state[part][key]
      if (upload) { try { await loadImage(upload.dataUrl) } catch { state = copyProject(fallback) } }
    }
    await updateArtwork()
    await updateWrap()
    await loadModel()
  })()
  return api
}

export { SCHEMA }
