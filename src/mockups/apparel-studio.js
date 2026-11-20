import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { buildApparelGarment } from './apparel-garment.js'
import { APPAREL_SIZES, apparelLayerStatus, apparelPlacement } from './apparel-layout.js'

const SURFACES = ['front', 'back', 'left-sleeve', 'right-sleeve']
const mix = (hex, amount) => `#${[1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amount)).toString(16).padStart(2, '0')).join('')}`
const disposeTree = (object) => object?.traverse((child) => child.geometry?.dispose())

const fabricTexture = () => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const context = canvas.getContext('2d')
  context.fillStyle = '#888888'; context.fillRect(0, 0, 64, 64)
  for (let y = 0; y < 64; y += 4) for (let x = 0; x < 64; x += 4) {
    context.fillStyle = (x + y) % 8 ? '#9c9c9c' : '#6c6c6c'
    context.fillRect(x, y, 2, 3)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(18, 22)
  return texture
}

const logoImage = async (svg) => {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const element = doc.documentElement
  const viewBox = element.getAttribute('viewBox')?.split(/[ ,]+/).map(Number)
  if (viewBox?.length === 4 && viewBox[2] > 0 && viewBox[3] > 0) {
    const scale = 1400 / Math.max(viewBox[2], viewBox[3])
    element.setAttribute('width', String(viewBox[2] * scale))
    element.setAttribute('height', String(viewBox[3] * scale))
  }
  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(element))}`
  await image.decode()
  return image
}

/** A demand-rendered garment preview; its owner keeps project state and undo history. */
export const createApparelStudio = ({ container, onStatus }) => {
  let disposed = false, renderFrame = 0, token = 0, current = null, root = null, geometryKey = '', lastView = ''
  const images = new Map()
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.setAttribute('aria-label', 'Interactive generic garment. Drag to rotate; scroll or pinch to zoom.')
  renderer.domElement.setAttribute('role', 'img')
  container.append(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 20)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0.37, 0)
  controls.minDistance = 0.7
  controls.maxDistance = 3.5
  controls.maxPolarAngle = Math.PI * 0.74
  controls.minPolarAngle = Math.PI * 0.2
  controls.enablePan = false
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmrem.fromScene(room, 0.04)
  room.dispose()
  pmrem.dispose()
  scene.environment = environment.texture
  const keyLight = new THREE.DirectionalLight('#fff8ed', 3.4)
  keyLight.position.set(-1.8, 2.7, 2.1)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(1024, 1024)
  keyLight.shadow.camera.left = keyLight.shadow.camera.bottom = -1.3
  keyLight.shadow.camera.right = keyLight.shadow.camera.top = 1.3
  keyLight.shadow.bias = -0.0004
  keyLight.shadow.normalBias = 0.003
  scene.add(keyLight, new THREE.HemisphereLight('#ebf3ff', '#9a8c7a', 1.9))
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ color: '#283340', opacity: 0.14 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.025
  floor.receiveShadow = true
  scene.add(floor)
  const bump = fabricTexture()
  const materials = Object.fromEntries([...SURFACES, 'plain', 'rib', 'seam'].map((surface) => [surface, new THREE.MeshStandardMaterial({ name: `fabric-${surface}`, color: '#ffffff', roughness: 0.95, metalness: 0, bumpMap: bump, bumpScale: surface === 'rib' ? 0.0015 : 0.00065, side: THREE.DoubleSide })]))
  const render = () => {
    renderFrame = 0
    if (!disposed) { renderer.render(scene, camera); container.dataset.rendered = 'true' }
  }
  const invalidate = () => { if (!disposed && !renderFrame) renderFrame = requestAnimationFrame(render) }
  controls.addEventListener('change', invalidate)
  const resize = () => {
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight)
    renderer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    invalidate()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(container)

  const setView = (view) => {
    const height = current ? APPAREL_SIZES[current.size].height / 1000 : 0.7
    controls.target.set(0, height * 0.51, 0)
    const positions = { angle: [0.78, height * 0.86, 1.65], front: [0, height * 0.53, 1.8], back: [0, height * 0.53, -1.8], left: [1.6, height * 0.65, 0.55], right: [-1.6, height * 0.65, 0.55] }
    camera.position.set(...(positions[view] ?? positions.angle))
    controls.update()
    lastView = view
    invalidate()
  }
  const imageFor = (entry) => {
    const svg = entry.make()
    if (!images.has(svg)) images.set(svg, logoImage(svg))
    while (images.size > 30) images.delete(images.keys().next().value)
    return images.get(svg)
  }
  const textureFor = async (project, surface, logos) => {
    const canvas = document.createElement('canvas')
    const sleeve = surface.endsWith('sleeve')
    const mmWidth = sleeve ? 480 : APPAREL_SIZES[project.size].width
    const mmHeight = sleeve ? 560 : APPAREL_SIZES[project.size].height
    canvas.width = sleeve ? 768 : 1024
    canvas.height = 1280
    const context = canvas.getContext('2d')
    context.fillStyle = project.colour
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.scale(canvas.width / mmWidth, canvas.height / mmHeight)
    for (const layer of project.layers) {
      if (!layer.visible || !apparelLayerStatus(project, layer).placed || !layer.logo) continue
      const placement = apparelPlacement(project, layer)
      if (placement.surface !== surface) continue
      const entry = logos.find((logo) => logo.id === layer.logo)
      if (!entry) continue
      const image = await imageFor(entry)
      context.save()
      context.translate(mmWidth / 2 + placement.x, placement.y)
      context.rotate(layer.rotation * Math.PI / 180)
      if (layer.method === 'patch') {
        context.fillStyle = '#f1efdf'
        context.beginPath()
        context.roundRect(-placement.width / 2 - 5, -placement.height / 2 - 5, placement.width + 10, placement.height + 10, 4)
        context.fill()
        context.strokeStyle = '#a8a58f'; context.lineWidth = 1; context.setLineDash([2, 1.5]); context.stroke()
      }
      if (layer.method === 'embroidery') {
        context.shadowColor = 'rgba(0,0,0,.45)'; context.shadowBlur = 1.4; context.shadowOffsetY = 0.55
      }
      context.drawImage(image, -placement.width / 2, -placement.height / 2, placement.width, placement.height)
      context.restore()
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    return texture
  }
  const update = async (project, logos) => {
    const request = ++token
    current = project
    container.dataset.ready = 'false'
    try {
      const results = await Promise.allSettled(SURFACES.map((surface) => textureFor(project, surface, logos)))
      const textures = results.filter((result) => result.status === 'fulfilled').map((result) => result.value)
      const failed = results.find((result) => result.status === 'rejected')
      if (failed) { for (const texture of textures) texture.dispose(); throw failed.reason }
      if (disposed || request !== token) { for (const texture of textures) texture.dispose(); return }
      SURFACES.forEach((surface, index) => { materials[surface].map?.dispose(); materials[surface].map = textures[index]; materials[surface].needsUpdate = true })
      materials.plain.color.set(project.colour)
      materials.rib.color.set(mix(project.colour, 0.12))
      materials.seam.color.set(mix(project.colour, 0.27))
      const nextKey = `${project.product}/${project.size}`
      const geometryChanged = geometryKey !== nextKey
      if (geometryChanged) {
        if (root) { scene.remove(root); disposeTree(root) }
        root = buildApparelGarment(project, materials)
        scene.add(root)
        geometryKey = nextKey
      }
      if (geometryChanged || lastView !== project.view) setView(project.view)
      container.dataset.ready = 'true'
      container.dataset.product = project.product
      container.dataset.size = project.size
      container.dataset.layers = String(project.layers.filter((layer) => layer.visible && apparelLayerStatus(project, layer).placed).length)
      onStatus?.('Preview ready. Drag to rotate, or choose a view.', false)
      invalidate()
    } catch (error) { if (request === token && !disposed) onStatus?.(`The garment preview could not update: ${error.message}`, true) }
  }
  const exportPng = async () => {
    if (disposed || container.dataset.ready !== 'true') throw new Error('Wait for the garment preview to finish.')
    const size = renderer.getSize(new THREE.Vector2()), ratio = renderer.getPixelRatio(), aspect = camera.aspect
    try {
      renderer.setPixelRatio(1)
      renderer.setSize(2000, 1600, false)
      camera.aspect = 1.25
      camera.updateProjectionMatrix()
      scene.background = new THREE.Color('#f3f2ee')
      renderer.render(scene, camera)
      return await new Promise((resolve, reject) => renderer.domElement.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG export failed.')), 'image/png'))
    } finally {
      scene.background = null
      renderer.setPixelRatio(ratio)
      renderer.setSize(size.x, size.y, false)
      camera.aspect = aspect
      camera.updateProjectionMatrix()
      invalidate()
    }
  }
  setView('angle')
  resize()
  return {
    update, setView, exportPng,
    dispose () {
      disposed = true; token++; cancelAnimationFrame(renderFrame); observer.disconnect(); controls.dispose()
      disposeTree(root); floor.geometry.dispose(); floor.material.dispose(); keyLight.shadow.map?.dispose()
      for (const material of Object.values(materials)) { material.map?.dispose(); material.dispose() }
      bump.dispose(); environment.dispose(); images.clear(); renderer.dispose(); renderer.domElement.remove()
    }
  }
}
