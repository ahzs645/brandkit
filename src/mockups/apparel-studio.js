import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { loadApparelGarment, configureApparelGarment, projectApparelDecal, disposeApparelGarment } from './apparel-garment.js'
import { APPAREL_ASSET, APPAREL_SIZES, apparelLayerStatus } from './apparel-layout.js'
import { apparelReviewSvg } from './apparel-review-sheet.js'
import { createModelPreviewRenderer } from './model-preview.js'

const logoImage = async (svg) => {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml'), element = doc.documentElement
  const box = element.getAttribute('viewBox')?.split(/[ ,]+/).map(Number)
  if (box?.length === 4 && box[2] > 0 && box[3] > 0) {
    const scale = 1600 / Math.max(box[2], box[3])
    element.setAttribute('width', String(box[2] * scale)); element.setAttribute('height', String(box[3] * scale))
  }
  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(element))}`
  await image.decode()
  return image
}

/** Demand-rendered 3D and orthographic cameras share one imported garment and the
 * same projected logo meshes. The software renderer uses that exact scene too. */
export const createApparelStudio = ({ container, onStatus, onReady }) => {
  let disposed = false, renderFrame = 0, token = 0, current = null, garment = null, lastView = '', ready = false, exporting = false
  let renderer, environment
  const images = new Map(), decals = new THREE.Group()
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }) } catch { renderer = createModelPreviewRenderer() }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.shadowMap.enabled = false
  renderer.domElement.setAttribute('aria-label', 'Imported Elvaerwyn hoodie model. Drag to rotate in 3D; choose 2D for orthographic views.')
  renderer.domElement.setAttribute('role', 'img')
  container.append(renderer.domElement)
  container.dataset.renderer = renderer.isModelPreviewRenderer ? 'software' : 'webgl'
  container.dataset.assetId = APPAREL_ASSET.id
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#f4f3ef')
  const perspective = new THREE.PerspectiveCamera(34, 1, 0.01, 20)
  const orthographic = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 20)
  let camera = perspective
  const controls = new OrbitControls(perspective, renderer.domElement)
  controls.target.set(0, 0.33, 0.04)
  controls.minDistance = 0.8; controls.maxDistance = 3.6
  controls.maxPolarAngle = Math.PI * 0.8; controls.minPolarAngle = Math.PI * 0.15
  controls.enablePan = false
  if (!renderer.isModelPreviewRenderer) {
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment()
    environment = pmrem.fromScene(room, 0.04)
    scene.environment = environment.texture
    room.dispose(); pmrem.dispose()
  }
  const light = new THREE.DirectionalLight('#fff8ee', 3.2)
  light.position.set(-1.4, 2.6, 2.5)
  const fill = new THREE.DirectionalLight('#eef4ff', 1.9)
  fill.position.set(1.7, 1.2, -2.5)
  scene.add(light, fill, new THREE.HemisphereLight('#eff5ff', '#afa99e', 1.7), decals)

  const render = () => {
    renderFrame = 0
    if (disposed || exporting) return
    renderer.render(scene, camera)
    container.dataset.rendered = 'true'
  }
  const invalidate = () => { if (!disposed && !renderFrame) renderFrame = requestAnimationFrame(render) }
  controls.addEventListener('change', invalidate)
  const frameCamera = (view, mode, width, height) => {
    const size = APPAREL_SIZES[current?.size ?? 'M'], modelHeight = size.height / 1000
    const aspect = width / height
    perspective.aspect = aspect; perspective.updateProjectionMatrix()
    const bounds = garment ? new THREE.Box3().setFromObject(garment) : new THREE.Box3(new THREE.Vector3(-0.46, 0, -0.14), new THREE.Vector3(0.46, modelHeight, 0.22))
    const target = bounds.getCenter(new THREE.Vector3())
    const dimension = bounds.getSize(new THREE.Vector3())
    const directions = { angle: new THREE.Vector3(0.48, 0.18, 1), front: new THREE.Vector3(0, 0, 1), back: new THREE.Vector3(0, 0, -1), left: new THREE.Vector3(1, 0, 0), right: new THREE.Vector3(-1, 0, 0) }
    const direction = (directions[view] ?? directions.front).clone().normalize()
    if (mode === 'flat') {
      camera = orthographic
      const visibleWidth = view === 'left' || view === 'right' ? dimension.z : dimension.x
      const half = Math.max(dimension.y * 0.58, visibleWidth / (2 * aspect) * 1.14)
      orthographic.left = -half * aspect; orthographic.right = half * aspect
      orthographic.top = half; orthographic.bottom = -half
      orthographic.position.copy(target).addScaledVector(direction, 2)
      orthographic.lookAt(target); orthographic.updateProjectionMatrix()
      controls.enabled = false
    } else {
      camera = perspective
      const radius = Math.max(dimension.y * 0.5, dimension.x / (2 * aspect))
      const distance = radius / Math.tan(THREE.MathUtils.degToRad(perspective.fov / 2)) * 1.22
      perspective.position.copy(target).addScaledVector(direction, distance)
      controls.target.copy(target); controls.enabled = true; controls.update()
    }
    camera.updateMatrixWorld(true)
  }
  const setView = (view = current?.view ?? 'angle', mode = current?.mode ?? '3d') => {
    const actualView = mode === 'flat' && view === 'angle' ? 'front' : view
    frameCamera(actualView, mode, Math.max(1, container.clientWidth), Math.max(1, container.clientHeight))
    lastView = `${view}/${mode}/${current?.size}`
    container.dataset.view = actualView; container.dataset.mode = mode
    invalidate()
  }
  const resize = () => {
    if (disposed || exporting) return
    renderer.setSize(Math.max(1, container.clientWidth), Math.max(1, container.clientHeight))
    setView()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  const loaded = loadApparelGarment().then((object) => {
    if (disposed) { disposeApparelGarment(object); return null }
    garment = object; scene.add(garment); return garment
  })
  // update() reports the failure, including during first load.
  loaded.catch(() => {})
  const imageFor = (entry) => {
    const svg = entry.make()
    if (!images.has(svg)) images.set(svg, logoImage(svg))
    while (images.size > 30) images.delete(images.keys().next().value)
    return images.get(svg)
  }
  const materialFor = async (layer, entry) => {
    const image = await imageFor(entry), padding = layer.method === 'patch' ? 10 : 0
    const width = layer.widthMm + padding, height = layer.widthMm / layer.aspect + padding
    const scale = 1400 / Math.max(width, height)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale))
    const context = canvas.getContext('2d')
    context.scale(canvas.width / width, canvas.height / height)
    if (padding) {
      context.fillStyle = '#eeeade'; context.beginPath(); context.roundRect(0, 0, width, height, 4); context.fill()
      context.strokeStyle = '#a8a38e'; context.lineWidth = 0.8; context.setLineDash([2, 1.5]); context.stroke()
    }
    if (layer.method === 'embroidery') { context.shadowColor = '#0008'; context.shadowBlur = 1.5; context.shadowOffsetY = 0.4 }
    context.drawImage(image, padding / 2, padding / 2, layer.widthMm, layer.widthMm / layer.aspect)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    return new THREE.MeshStandardMaterial({ map: texture, color: '#ffffff', transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, roughness: layer.method === 'dtf' ? 0.65 : 0.95, metalness: 0, side: THREE.FrontSide })
  }
  const clearDecals = () => { for (const decal of [...decals.children]) { decals.remove(decal); disposeApparelGarment(decal) } }
  const update = async (project, logos) => {
    if (exporting || disposed) return
    const request = ++token
    current = project; ready = false; container.dataset.ready = 'false'; onReady?.(false)
    try {
      const object = await loaded
      if (!object || disposed || request !== token) return
      const layers = project.layers.filter((layer) => layer.visible && layer.logo && apparelLayerStatus(project, layer).placed)
      const results = await Promise.allSettled(layers.map(async (layer) => {
        const entry = logos.find((logo) => logo.id === layer.logo)
        if (!entry) return null
        return { layer, material: await materialFor(layer, entry) }
      }))
      const prepared = results.filter((result) => result.status === 'fulfilled' && result.value).map((result) => result.value)
      const failed = results.find((result) => result.status === 'rejected')
      if (disposed || request !== token || failed) {
        for (const { material } of prepared) { material.map?.dispose(); material.dispose() }
        if (failed) throw failed.reason
        return
      }
      configureApparelGarment(object, project)
      clearDecals()
      let missed = 0
      prepared.forEach(({ layer, material }, index) => {
        const decal = projectApparelDecal(object, project, layer, material)
        if (decal) { decal.renderOrder = 10 + index; decals.add(decal) }
        else { material.map?.dispose(); material.dispose(); missed++ }
      })
      if (lastView !== `${project.view}/${project.mode}/${project.size}`) setView(project.view, project.mode)
      ready = true; container.dataset.ready = 'true'; container.dataset.layers = String(decals.children.length)
      container.dataset.size = project.size; container.dataset.product = project.product
      onReady?.(true)
      onStatus?.(missed ? `${missed} artwork layer could not reach the model surface. Adjust its placement.` : `Imported model ready · ${renderer.isModelPreviewRenderer ? 'software 3D' : 'WebGL'} · ${project.mode === 'flat' ? 'orthographic view' : 'drag to rotate'}.`, missed > 0)
      invalidate()
    } catch (error) {
      if (request === token && !disposed) { onReady?.(false); onStatus?.(`The imported garment could not load: ${error.message}`, true) }
    }
  }
  const capture = async ({ width = 1600, height = Math.round(1600 * container.clientHeight / Math.max(1, container.clientWidth)), view, mode, dataUrl = false } = {}) => {
    if (!ready || disposed) throw new Error('Wait for the imported garment and artwork to finish loading.')
    const oldSize = renderer.getSize(new THREE.Vector2()), ratio = renderer.getPixelRatio()
    const oldCamera = camera, position = camera.position.clone(), quaternion = camera.quaternion.clone(), target = controls.target.clone()
    const oldAspect = perspective.aspect, oldOrtho = [orthographic.left, orthographic.right, orthographic.top, orthographic.bottom]
    exporting = true
    try {
      renderer.setPixelRatio(1); renderer.setSize(width, height, false)
      if (view || mode) frameCamera(view ?? current.view, mode ?? current.mode, width, height)
      else if (camera.isPerspectiveCamera) { perspective.aspect = width / height; perspective.updateProjectionMatrix() }
      else frameCamera(current.view === 'angle' ? 'front' : current.view, 'flat', width, height)
      renderer.render(scene, camera, { quality: 'export' })
      if (dataUrl) return renderer.domElement.toDataURL('image/png')
      return await new Promise((resolve, reject) => renderer.domElement.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG export failed.')), 'image/png'))
    } finally {
      renderer.setPixelRatio(ratio); renderer.setSize(oldSize.x, oldSize.y, false)
      perspective.aspect = oldAspect; perspective.updateProjectionMatrix()
      ;[orthographic.left, orthographic.right, orthographic.top, orthographic.bottom] = oldOrtho
      orthographic.updateProjectionMatrix()
      camera = oldCamera; camera.position.copy(position); camera.quaternion.copy(quaternion); controls.target.copy(target)
      controls.enabled = current.mode === '3d'; camera.updateMatrixWorld(true)
      exporting = false; invalidate()
    }
  }
  const exportReview = async (brandName) => {
    const front = await capture({ width: 1120, height: 920, view: 'front', mode: 'flat', dataUrl: true })
    const back = await capture({ width: 1120, height: 920, view: 'back', mode: 'flat', dataUrl: true })
    return apparelReviewSvg(current, { brandName, views: { front, back } })
  }
  setView('angle', '3d'); resize()
  return {
    update, setView, exportPng: () => capture(), exportReview,
    dispose () {
      disposed = true; token++; cancelAnimationFrame(renderFrame); observer.disconnect(); controls.dispose()
      clearDecals(); disposeApparelGarment(garment); environment?.dispose(); images.clear(); renderer.dispose(); renderer.domElement.remove()
    }
  }
}
