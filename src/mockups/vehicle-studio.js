// The vehicle mockup editor's 3D side: the scene, the model, the artwork projected onto its
// painted body, the selection box and its handles, gestures, and undo. The React view
// (src/app/views/Vehicles.jsx) draws the controls and calls the methods returned here; the
// editor reports every change through `onChange`. Loaded only when the Vehicles tab opens.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { AREAS, MAX_UPLOAD_BYTES, OPPOSITE, SCHEMA, UPLOAD_TYPES, clampPlacement, copyProject, createPlacement, mirrorPlacement, validAspect, validateProject } from './vehicle-layout.js'
import { VEHICLE_MODELS } from './vehicle-models.js'

const SVG_NS = 'http://www.w3.org/2000/svg'
const HISTORY_LIMIT = 30
const EXPORT_SIZE = { width: 2400, height: 1500 }
const CAMERA_VIEWS = { angle: [-5.8, 2.8, 6.8], side: [0, 1.25, 8.5], opposite: [0, 1.25, -8.5], front: [-8.5, 2, 0], rear: [8.5, 1.8, 0], hood: [-4.5, 6, 3.5] }
const VIEW_FOR_AREA = { left: 'side', right: 'opposite', hood: 'hood', rear: 'rear' }
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
const loadImage = async (dataUrl, { trusted = false } = {}) => {
  let exactAspect = null
  if (dataUrl.startsWith('data:image/svg+xml')) {
    const source = decodeDataUrl(dataUrl)
    const doc = trusted ? new DOMParser().parseFromString(source, 'image/svg+xml') : inspectSvg(source)
    const svg = doc.documentElement
    const box = svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number)
    if (box?.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0) {
      exactAspect = box[2] / box[3]
      const scale = 2048 / Math.max(box[2], box[3])
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

const readFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error('The artwork could not be read.'))
  reader.readAsDataURL(file)
})

/**
 * Starts an editor in `container` (a positioned element the canvas fills).
 *
 * - `project`: the mockup to open (validated by the caller), or null for `fallback`.
 * - `artworkUrl(artwork)`: the data URL of a logo or fleet layout for the artwork settings.
 * - `logos`: the logo ids the brand offers, for checking saved mockups.
 * - `storageKey`: where this browser keeps the draft, or null.
 * - `onChange(snapshot)`, `onStatus(message, isError)`.
 */
export const createVehicleStudio = ({ container, project, fallback, artworkUrl, logos, storageKey, onChange, onStatus }) => {
  let state = copyProject(project ?? fallback)
  let mode = 'edit'
  let view = 'angle'
  let ready = false
  let busy = false
  let disposed = false
  let root = null
  let body = []
  let texture = null
  let aspect = 1
  let preview = null
  let gesture = null
  let pending = 0
  let dirty = true
  let fieldStart = null
  let modelToken = 0
  let artworkToken = 0
  let fetchController = null
  const history = { undo: [], redo: [] }
  const frames = new Map()

  const status = (message, error = false) => { if (!disposed) onStatus?.(message, error) }
  const emit = () => {
    if (disposed) return
    onChange?.({
      project: copyProject(state), mode, view, ready, busy, aspect, preview,
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.98
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  const canvas = renderer.domElement
  canvas.className = 'vehicle-stage__canvas'
  canvas.tabIndex = 0
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', 'The vehicle in 3D. Select a painted body area, drag the artwork, or switch to Rotate car. Arrow keys nudge the artwork; Escape cancels a drag.')
  container.prepend(canvas)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#eceee9')
  const camera = new THREE.PerspectiveCamera(33, 1, 0.05, 100)
  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 0.8, 0)
  controls.enabled = false
  controls.enableDamping = false
  controls.minDistance = 4.5
  controls.maxDistance = 14
  controls.maxPolarAngle = Math.PI / 2 - 0.02
  controls.addEventListener('change', () => requestRender())

  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmrem.fromScene(room, 0.06)
  scene.environment = environment.texture
  room.dispose()
  pmrem.dispose()
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7c8590, 1.3))
  const sun = new THREE.DirectionalLight(0xfff7e9, 3)
  sun.position.set(-3, 7, 5)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 25 })
  sun.shadow.normalBias = 0.025
  scene.add(sun)
  const fill = new THREE.DirectionalLight(0xdceaff, 1.4)
  fill.position.set(4, 3, -5)
  scene.add(fill)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: '#32454e', opacity: 0.16 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.012
  floor.receiveShadow = true
  scene.add(floor)
  const decals = new THREE.Group()
  const guide = new THREE.Group()
  scene.add(decals, guide)
  const ray = new THREE.Raycaster()

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
    const a = AREAS[areaId]
    const normal = vec(a.normal)
    const point = vec(a.origin).addScaledVector(vec(a.uAxis), u).addScaledVector(vec(a.vAxis), v)
    // A seam can leave the exact centre ray empty: nearby paint gives the depth instead.
    for (const [du, dv] of [[0, 0], [0, -0.02], [0, 0.02], [-0.02, 0], [0.02, 0], [0, -0.03], [0, 0.03], [-0.03, 0], [0.03, 0]]) {
      ray.set(point.clone().addScaledVector(vec(a.uAxis), du).addScaledVector(vec(a.vAxis), dv).addScaledVector(normal, 6), normal.clone().negate())
      const hit = ray.intersectObjects(body, false).find((candidate) => facesOut(candidate, normal))
      if (hit) return { ...hit, point: point.clone().addScaledVector(normal, hit.point.clone().sub(point).dot(normal)) }
    }
    return null
  }
  const basis = (areaId, rotation = 0) => {
    const a = AREAS[areaId]
    const matrix = new THREE.Matrix4().makeBasis(vec(a.uAxis), vec(a.vAxis), vec(a.normal))
    return new THREE.Quaternion().setFromRotationMatrix(matrix).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), toRadians(rotation)))
  }
  /** Keeps only the triangles facing out of the area, so artwork never wraps onto the far side. */
  const keepOutward = (geometry, normal) => {
    const position = geometry.attributes.position
    const normals = geometry.attributes.normal
    const uv = geometry.attributes.uv
    if (!position?.count) return geometry
    const out = { position: [], normal: [], uv: [] }
    for (let i = 0; i < position.count; i += 3) {
      let dot = 0
      for (let j = 0; j < 3; j++) dot += normals.getX(i + j) * normal.x + normals.getY(i + j) * normal.y + normals.getZ(i + j) * normal.z
      if (dot <= 0.06) continue
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
    const normal = vec(AREAS[areaId].normal)
    const orientation = new THREE.Euler().setFromQuaternion(basis(areaId, rotation))
    const reach = width + height + 0.4
    const bounds = new THREE.Box3().setFromCenterAndSize(point, new THREE.Vector3(reach, reach, reach))
    for (const mesh of body) {
      if (!bounds.intersectsBox(mesh.userData.worldBounds)) continue
      const geometry = keepOutward(new DecalGeometry(mesh, point, orientation, new THREE.Vector3(width, height, 0.32)), normal)
      if (!geometry.attributes.position.count) { geometry.dispose(); continue }
      const material = highlight
        ? new THREE.MeshBasicMaterial({ color: '#3eaf96', transparent: true, opacity: 0.11, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.FrontSide })
        : new THREE.MeshStandardMaterial({ map: texture, transparent: true, depthWrite: false, roughness: 0.45, metalness: 0, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5, side: THREE.FrontSide })
      const item = new THREE.Mesh(geometry, material)
      item.renderOrder = highlight ? 1 : 3
      group.add(item)
    }
  }
  const rebuildDecals = () => {
    clearGroup(decals)
    clearGroup(guide)
    frames.clear()
    if (!ready || !texture) return
    for (const [id, placement] of Object.entries(state.placements)) {
      const hit = surfaceHit(id, placement.u, placement.v)
      if (!hit) continue
      projectDecal(decals, id, hit.point, placement.width, placement.width / aspect, placement.rotation)
      frames.set(id, { point: hit.point.clone(), q: basis(id, placement.rotation) })
    }
    const a = AREAS[state.area]
    const hit = surfaceHit(state.area)
    if (hit) projectDecal(guide, state.area, hit.point, a.width, a.height, 0, true)
    guide.visible = mode === 'edit'
    container.dataset.decals = String(decals.children.length)
    container.dataset.paint = String(body.length)
  }

  // --- Rendering -----------------------------------------------------------------------------
  const toScreen = (point) => {
    const p = point.clone().project(camera)
    return { x: (p.x + 1) * container.clientWidth / 2, y: (1 - p.y) * container.clientHeight / 2 }
  }
  const updateOverlay = () => {
    const frame = frames.get(state.area)
    const placement = state.placements[state.area]
    const facing = frame && vec(AREAS[state.area].normal).dot(camera.position.clone().sub(frame.point).normalize()) > 0.16
    const visible = ready && !busy && mode === 'edit' && placement && facing
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
    camera.position.fromArray(CAMERA_VIEWS[view])
    controls.target.set(0, 0.8, 0)
    controls.update()
    emit()
    requestRender()
  }

  // --- Model and artwork ---------------------------------------------------------------------
  const paintBody = (value) => { for (const mesh of body) mesh.material.color.set(value) }

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
      let bytes = modelBytes.get(info.url)
      if (!bytes) {
        const response = await fetch(info.url, { signal: fetchController.signal })
        if (!response.ok) throw new Error('The vehicle could not be downloaded. Try again.')
        bytes = await response.arrayBuffer()
        modelBytes.set(info.url, bytes)
      }
      const gltf = await new GLTFLoader().parseAsync(bytes, '')
      if (token !== modelToken || disposed) return
      next = new THREE.Group()
      next.userData.originalMaterials = []
      const loaded = gltf.scene
      next.add(loaded)
      loaded.rotation.y += info.rotation
      loaded.updateMatrixWorld(true)
      // Every model is shown 4.7 m long, standing on the floor, centred.
      const bounds = new THREE.Box3().setFromObject(loaded)
      loaded.scale.multiplyScalar(4.7 / bounds.getSize(new THREE.Vector3()).x)
      loaded.updateMatrixWorld(true)
      bounds.setFromObject(loaded)
      const centre = bounds.getCenter(new THREE.Vector3())
      loaded.position.x -= centre.x
      loaded.position.z -= centre.z
      loaded.position.y -= bounds.min.y
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
          object.material = object.material.clone()
          object.material.map = null
          object.material.color.set(state.paint)
          object.material.metalness = 0.08
          object.material.roughness = 0.34
          object.userData.worldBounds = new THREE.Box3().setFromObject(object)
          paintable.push(object)
        } else if (info.glass && materials.some((material) => material.name === info.glass)) {
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
      ready = true
      setBusy(false)
      cameraView(state.area === 'left' ? 'angle' : VIEW_FOR_AREA[state.area])
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

  /** Draws the current artwork into the texture. Resolves true when it changed, false on failure. */
  const updateArtwork = async () => {
    const token = ++artworkToken
    try {
      const upload = state.artwork.kind === 'upload'
      const url = upload ? state.artwork.upload?.dataUrl : await artworkUrl(state.artwork)
      if (!url) throw new Error('Upload artwork first.')
      const loaded = await loadImage(url, { trusted: !upload })
      if (token !== artworkToken || disposed) return null
      const scale = 2048 / Math.max(1, Math.max(loaded.aspect, 1 / loaded.aspect))
      const drawing = document.createElement('canvas')
      drawing.width = Math.max(1, Math.round(loaded.aspect >= 1 ? 2048 : scale * loaded.aspect))
      drawing.height = Math.max(1, Math.round(loaded.aspect >= 1 ? 2048 / loaded.aspect : 2048))
      drawing.getContext('2d').drawImage(loaded.image, 0, 0, drawing.width, drawing.height)
      const next = new THREE.CanvasTexture(drawing)
      next.colorSpace = THREE.SRGBColorSpace
      next.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
      clearGroup(decals)
      texture?.dispose()
      texture = next
      aspect = loaded.aspect
      preview = loaded.url
      for (const [id, placement] of Object.entries(state.placements)) state.placements[id] = clampPlacement(placement, id, aspect)
      changed()
      return true
    } catch (error) {
      if (token === artworkToken) status(error.message, true)
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
    const a = AREAS[areaId]
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
    const clamped = clampPlacement(next, g.area, aspect)
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
    const id = Math.abs(n.z) > 0.55 ? (n.z > 0 ? 'left' : 'right') : n.y > 0.55 && hit.point.x < -0.8 ? 'hood' : n.x > 0.55 ? 'rear' : null
    if (!id) { status('Choose a side, the bonnet or the rear.'); return }
    const a = AREAS[id]
    const offset = hit.point.clone().sub(vec(a.origin))
    if (Math.abs(offset.dot(vec(a.uAxis))) > a.width / 2 || Math.abs(offset.dot(vec(a.vAxis))) > a.height / 2) {
      status('That point is outside the area prepared for branding. Choose an area from the list.')
      return
    }
    selectArea(id, false)
  }
  const onCanvasKey = (event) => {
    if (event.key === 'Escape') { cancelGesture(); return }
    if (!ready || busy || mode !== 'edit' || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const before = snapshot()
    const step = event.shiftKey ? 0.05 : 0.01
    const next = { ...state.placements[state.area] }
    if (event.key === 'ArrowLeft') next.u -= step
    if (event.key === 'ArrowRight') next.u += step
    if (event.key === 'ArrowUp') next.v += step
    if (event.key === 'ArrowDown') next.v -= step
    state.placements[state.area] = clampPlacement(next, state.area, aspect)
    remember(before)
    changed()
  }
  const onWindowKey = (event) => {
    if (event.key === 'Escape') cancelGesture()
    // Undo belongs to the editor only while focus is on the stage or not in a text field.
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
    const oldModel = state.model
    state = copyProject(next)
    setBusy(true)
    await updateArtwork()
    if (oldModel !== state.model || !ready) await loadModel()
    else { paintBody(state.paint); setBusy(false); changed() }
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
    if (!ready || busy || !AREAS[id]) return
    cancelGesture()
    const before = snapshot()
    state.area = id
    state.placements[id] ??= createPlacement(id, aspect)
    setMode('edit')
    if (moveCamera) cameraView(VIEW_FOR_AREA[id])
    remember(before)
    changed()
    status(`${AREAS[id].label} selected. Drag the artwork or use its handles.`)
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
    state.placements[state.area] = clampPlacement(modify(state.placements[state.area]), state.area, aspect)
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
        context.fillStyle = '#263e4c'
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

  const api = {
    get project () { return copyProject(state) },
    setMode,
    cameraView,
    selectArea,
    undo: () => restore('undo'),
    redo: () => restore('redo'),
    async setModel (id) {
      if (!VEHICLE_MODELS[id] || id === state.model) return
      const before = snapshot()
      state.model = id
      remember(before)
      await loadModel()
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
    /** Artwork settings (kind, logo, tagline, website). Text fields pass `live` while typing. */
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
    async upload (file) {
      try {
        if (!file) return false
        if (file.size > MAX_UPLOAD_BYTES) throw new Error('Choose artwork smaller than 5 MB.')
        if (!UPLOAD_TYPES.includes(file.type)) throw new Error('Choose PNG, JPEG, WebP or SVG artwork.')
        const dataUrl = await readFile(file)
        const loaded = await loadImage(dataUrl)
        const before = snapshot()
        state.artwork = { ...state.artwork, kind: 'upload', upload: { name: file.name.slice(0, 120), dataUrl, aspect: loaded.aspect } }
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
    resetArea: () => placementEdit(() => createPlacement(state.area, aspect)),
    /** Ends a live edit (a slider or text field) as one step of undo. */
    commit () {
      if (!fieldStart) return
      const before = fieldStart
      fieldStart = null
      remember(before)
    },
    copyToOtherSide () {
      if (!OPPOSITE[state.area] || busy || !ready) return
      cancelGesture()
      const before = snapshot()
      const { area: other, placement } = mirrorPlacement(state.placements[state.area], state.area, aspect)
      state.placements[other] = placement
      remember(before)
      changed()
      status('Copied to the other side. The lettering still reads front to back.')
    },
    exportPng,
    saveProject: () => JSON.stringify({ ...state, modelSha256: VEHICLE_MODELS[state.model].sha256 }, null, 2),
    async openProject (textContent) {
      try {
        const raw = JSON.parse(textContent)
        const next = validateProject(raw, { logos })
        if (raw.modelSha256 && raw.modelSha256 !== VEHICLE_MODELS[next.model].sha256) throw new Error('This mockup was made with a different version of the vehicle.')
        if (next.artwork.upload) await loadImage(next.artwork.upload.dataUrl)
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
    /** Redraws the artwork when the brand's fonts arrive or its logos change. */
    refreshArtwork: () => updateArtwork(),
    dispose () {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(pending)
      fetchController?.abort()
      resize.disconnect()
      globalThis.removeEventListener('keydown', onWindowKey)
      texture?.dispose()
      disposeModel(root)
      clearGroup(decals)
      clearGroup(guide)
      floor.geometry.dispose()
      floor.material.dispose()
      environment.texture.dispose()
      controls.dispose()
      renderer.dispose()
      renderer.forceContextLoss?.()
      canvas.remove()
      overlay.remove()
    }
  }

  ;(async () => {
    emit()
    if (state.artwork.kind === 'upload' && state.artwork.upload) {
      try { await loadImage(state.artwork.upload.dataUrl) } catch { state = copyProject(fallback) }
    }
    await updateArtwork()
    await loadModel()
  })()
  return api
}

export { SCHEMA }
