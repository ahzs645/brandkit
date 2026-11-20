// A CPU preview of the actual Three scene. This is a renderer, not a second vehicle model:
// GLTFLoader meshes, their world transforms, cameras and DecalGeometry are shared with WebGL.
// It intentionally provides simpler lighting, without environment reflections or shadow maps.
import * as THREE from 'three'

const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value))
const WIDTH_LIMIT = 4096
const PIXEL_LIMIT = 16_777_216
const STRIDE = 11 // clip x/y/z/w, UV, diffuse, specular, vertex RGB

/** Fit source bounds to both axes of a perspective frustum without changing the orbit angle. */
export const fitModelPerspectiveCamera = (camera, bounds, target, coverage = 0.82) => {
  if (!camera.isPerspectiveCamera || !bounds || bounds.isEmpty()) return
  const direction = camera.position.clone().sub(target).normalize()
  const right = camera.up.clone().cross(direction).normalize()
  const up = direction.clone().cross(right).normalize()
  const tangentY = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / camera.zoom
  const tangentX = tangentY * camera.aspect
  let distance = camera.near * 2
  const point = new THREE.Vector3()
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    point.set(x, y, z).sub(target)
    distance = Math.max(distance, point.dot(direction) + Math.max(Math.abs(point.dot(right)) / (coverage * tangentX), Math.abs(point.dot(up)) / (coverage * tangentY)))
  }
  camera.position.copy(target).addScaledVector(direction, distance)
  camera.lookAt(target)
  camera.updateMatrixWorld(true)
}

/** Read texture pixels once per source/version. No WebGL context or external resource fetch. */
export const createModelTextureReader = ({ maxSize = 2048 } = {}) => {
  let cache = new WeakMap()
  const read = (texture) => {
    const source = texture?.source?.data ?? texture?.image
    if (!source || typeof source !== 'object') return null
    const version = texture.source?.version ?? texture.version
    const cached = cache.get(source)
    if (cached?.version === version) return cached.pixels
    let pixels
    if (source.data && source.width && source.height) {
      pixels = { data: source.data, width: source.width, height: source.height, channels: source.data.length / source.width / source.height }
    } else {
      const width = source.naturalWidth ?? source.videoWidth ?? source.width
      const height = source.naturalHeight ?? source.videoHeight ?? source.height
      if (!width || !height) return null
      const scale = Math.min(1, maxSize / Math.max(width, height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('This browser cannot create a model preview.')
      context.drawImage(source, 0, 0, canvas.width, canvas.height)
      pixels = { data: context.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height, channels: 4 }
    }
    cache.set(source, { version, pixels })
    return pixels
  }
  read.dispose = () => { cache = new WeakMap() }
  return read
}

const colour = (input, fallback = '#ffffff') => {
  const out = new THREE.Color()
  if (input?.isColor) out.copy(input)
  else out.set(input ?? fallback)
  return out.getRGB({}, THREE.SRGBColorSpace)
}

const wrapCoordinate = (value, wrapping) => {
  if (wrapping === THREE.RepeatWrapping) return value - Math.floor(value)
  if (wrapping === THREE.MirroredRepeatWrapping) {
    const whole = Math.floor(value)
    const part = value - whole
    return Math.abs(whole % 2) === 1 ? 1 - part : part
  }
  return clamp(value)
}

const textureInfo = (texture, read) => {
  if (!texture) return null
  const pixels = read(texture)
  if (!pixels?.data || !pixels.width || !pixels.height) return null
  if (texture.matrixAutoUpdate) texture.updateMatrix()
  return { ...pixels, transform: texture.matrix.elements, wrapS: texture.wrapS, wrapT: texture.wrapT, flipY: texture.flipY }
}

// Interpolate homogeneous vertices while clipping. Perspective-correct UVs are calculated
// later, after projection, so a near-plane crossing cannot stretch artwork across the screen.
const clipTriangle = (vertices) => {
  let polygon = vertices
  const planes = [
    (v) => v[3] + v[0], (v) => v[3] - v[0],
    (v) => v[3] + v[1], (v) => v[3] - v[1],
    (v) => v[3] + v[2], (v) => v[3] - v[2]
  ]
  for (const distance of planes) {
    if (!polygon.length) break
    const next = []
    let previous = polygon.at(-1), from = distance(previous)
    for (const current of polygon) {
      const to = distance(current)
      if ((from >= 0) !== (to >= 0)) {
        const t = from / (from - to)
        next.push(previous.map((value, i) => value + (current[i] - value) * t))
      }
      if (to >= 0) next.push(current)
      previous = current
      from = to
    }
    polygon = next
  }
  return polygon
}

const clipCode = (vertices, offset) => {
  const x = vertices[offset], y = vertices[offset + 1], z = vertices[offset + 2], w = vertices[offset + 3]
  return (x < -w ? 1 : 0) | (x > w ? 2 : 0) | (y < -w ? 4 : 0) | (y > w ? 8 : 0) | (z < -w ? 16 : 0) | (z > w ? 32 : 0)
}

/** Render the real scene to RGBA pixels. Exported separately for deterministic geometry tests. */
export const rasterizeModelScene = (scene, camera, { width = 800, height = 500, textureReader = createModelTextureReader(), clearColor = '#f5f6f7' } = {}) => {
  width = Math.round(width)
  height = Math.round(height)
  if (!(width > 0 && height > 0 && width <= WIDTH_LIMIT && height <= WIDTH_LIMIT && width * height <= PIXEL_LIMIT)) throw new Error('The model preview dimensions are out of range.')
  if (!camera?.isCamera || !scene?.isObject3D) throw new Error('A Three scene and camera are required.')
  scene.updateMatrixWorld(true)
  camera.updateMatrixWorld(true)
  const viewProjection = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  const frustum = new THREE.Frustum().setFromProjectionMatrix(viewProjection)
  const data = new Uint8ClampedArray(width * height * 4)
  const depth = new Float32Array(width * height).fill(Infinity)
  const stats = { meshes: 0, triangles: 0, visibleTriangles: 0, fragments: 0, texturedTriangles: 0 }
  const background = scene.background?.isTexture ? textureReader(scene.background) : null
  const solid = colour(scene.background?.isColor ? scene.background : clearColor)
  for (let y = 0; y < height; y++) {
    const sample = background ? Math.min(background.height - 1, Math.floor(y / height * background.height)) * background.width * (background.channels ?? 4) : 0
    const r = background ? background.data[sample] : solid.r * 255
    const g = background ? background.data[sample + 1] : solid.g * 255
    const b = background ? background.data[sample + 2] : solid.b * 255
    for (let x = 0, p = y * width * 4; x < width; x++, p += 4) { data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = 255 }
  }

  const lights = []
  const cameraPosition = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld)
  const cameraDirection = new THREE.Vector3(0, 0, 1).transformDirection(camera.matrixWorld)
  scene.traverseVisible((object) => {
    if (!object.isDirectionalLight) return
    const direction = new THREE.Vector3().setFromMatrixPosition(object.matrixWorld)
    object.target.updateMatrixWorld(true)
    direction.sub(new THREE.Vector3().setFromMatrixPosition(object.target.matrixWorld)).normalize()
    lights.push({ x: direction.x, y: direction.y, z: direction.z, strength: Math.min(0.55, object.intensity * 0.14) })
  })
  if (!lights.length) lights.push({ x: -0.4, y: 0.8, z: 0.45, strength: 0.55 })
  const keyLight = lights[0]
  const draws = []
  const projection = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3()
  scene.traverseVisible((object) => {
    if (!object.isMesh || !camera.layers.test(object.layers) || (object.frustumCulled && !frustum.intersectsObject(object))) return
    const geometry = object.geometry, position = geometry?.attributes?.position
    if (!position?.count) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    if (!materials.some((material) => material && material.visible && !material.isShadowMaterial)) return
    const normal = geometry.attributes.normal, uv = geometry.attributes.uv, vertexColor = geometry.attributes.color
    projection.multiplyMatrices(viewProjection, object.matrixWorld)
    normalMatrix.getNormalMatrix(object.matrixWorld)
    const m = projection.elements, n = normalMatrix.elements, world = object.matrixWorld.elements
    const vertices = new Float32Array(position.count * STRIDE), codes = new Uint8Array(position.count)
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), y = position.getY(i), z = position.getZ(i), p = i * STRIDE
      vertices[p] = m[0] * x + m[4] * y + m[8] * z + m[12]
      vertices[p + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]
      vertices[p + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]
      vertices[p + 3] = m[3] * x + m[7] * y + m[11] * z + m[15]
      vertices[p + 4] = uv?.getX(i) ?? 0
      vertices[p + 5] = uv?.getY(i) ?? 0
      const nx0 = normal?.getX(i) ?? 0, ny0 = normal?.getY(i) ?? 1, nz0 = normal?.getZ(i) ?? 0
      let nx = n[0] * nx0 + n[3] * ny0 + n[6] * nz0
      let ny = n[1] * nx0 + n[4] * ny0 + n[7] * nz0
      let nz = n[2] * nx0 + n[5] * ny0 + n[8] * nz0
      const inverseNormalLength = 1 / (Math.hypot(nx, ny, nz) || 1)
      nx *= inverseNormalLength; ny *= inverseNormalLength; nz *= inverseNormalLength
      let diffuse = 0.28 + 0.17 * Math.max(0, ny)
      for (const light of lights) diffuse += Math.max(0, nx * light.x + ny * light.y + nz * light.z) * light.strength
      vertices[p + 6] = Math.min(1.08, diffuse)
      let vx = cameraDirection.x, vy = cameraDirection.y, vz = cameraDirection.z
      if (camera.isPerspectiveCamera) {
        vx = cameraPosition.x - (world[0] * x + world[4] * y + world[8] * z + world[12])
        vy = cameraPosition.y - (world[1] * x + world[5] * y + world[9] * z + world[13])
        vz = cameraPosition.z - (world[2] * x + world[6] * y + world[10] * z + world[14])
        const inverseViewLength = 1 / (Math.hypot(vx, vy, vz) || 1)
        vx *= inverseViewLength; vy *= inverseViewLength; vz *= inverseViewLength
      }
      const hx = vx + keyLight.x, hy = vy + keyLight.y, hz = vz + keyLight.z
      vertices[p + 7] = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / (Math.hypot(hx, hy, hz) || 1)), 36) * keyLight.strength
      // Vertex colours are uncommon in these GLBs; keep their conversion outside the pixel loop.
      if (vertexColor) {
        const c = new THREE.Color(vertexColor.getX(i), vertexColor.getY(i), vertexColor.getZ(i)).getRGB({}, THREE.SRGBColorSpace)
        vertices[p + 8] = c.r; vertices[p + 9] = c.g; vertices[p + 10] = c.b
      } else { vertices[p + 8] = 1; vertices[p + 9] = 1; vertices[p + 10] = 1 }
      codes[i] = clipCode(vertices, p)
    }
    stats.meshes++
    const count = geometry.index?.count ?? position.count
    const groups = Array.isArray(object.material) ? geometry.groups : [{ start: 0, count, materialIndex: 0 }]
    const drawEnd = Math.min(count, geometry.drawRange.start + geometry.drawRange.count)
    for (const group of groups) {
      const material = materials[group.materialIndex ?? 0]
      if (!material?.visible || material.isShadowMaterial || material.opacity <= 0) continue
      const start = Math.max(group.start, geometry.drawRange.start), end = Math.min(group.start + group.count, drawEnd)
      if (end <= start) continue
      const map = textureInfo(material.map, textureReader)
      const base = colour(material.color)
      const emissive = colour(material.emissive, '#000000')
      const worldPosition = new THREE.Vector3().setFromMatrixPosition(object.matrixWorld).applyMatrix4(viewProjection)
      draws.push({ vertices, codes, index: geometry.index, start, end, map, base, emissive, material, vertexColor: Boolean(material.vertexColors && vertexColor), faceSign: object.matrixWorld.determinant() < 0 ? -1 : 1, order: object.renderOrder, z: worldPosition.z, transparent: Boolean(material.transparent || material.depthWrite === false) })
    }
  })
  draws.sort((a, b) => Number(a.transparent) - Number(b.transparent) || a.order - b.order || (a.transparent ? b.z - a.z : a.z - b.z))

  const drawTriangle = (aa, bb, cc, draw) => {
    if (aa[3] <= 0 || bb[3] <= 0 || cc[3] <= 0) return
    let a = aa, b = bb, c = cc
    let ax = (a[0] / a[3] * 0.5 + 0.5) * width, ay = (0.5 - a[1] / a[3] * 0.5) * height
    let bx = (b[0] / b[3] * 0.5 + 0.5) * width, by = (0.5 - b[1] / b[3] * 0.5) * height
    let cx = (c[0] / c[3] * 0.5 + 0.5) * width, cy = (0.5 - c[1] / c[3] * 0.5) * height
    let area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
    const { material, map, base, emissive } = draw
    if (Math.abs(area) < 1e-7 || (material.side === THREE.FrontSide && area * draw.faceSign >= 0) || (material.side === THREE.BackSide && area * draw.faceSign <= 0)) return
    if (area < 0) { [b, c] = [c, b]; [bx, cx] = [cx, bx]; [by, cy] = [cy, by]; area = -area }
    const x0 = Math.max(0, Math.ceil(Math.min(ax, bx, cx) - 0.5)), x1 = Math.min(width - 1, Math.floor(Math.max(ax, bx, cx) - 0.5))
    const y0 = Math.max(0, Math.ceil(Math.min(ay, by, cy) - 0.5)), y1 = Math.min(height - 1, Math.floor(Math.max(ay, by, cy) - 0.5))
    if (x0 > x1 || y0 > y1) return
    stats.visibleTriangles++
    if (map) stats.texturedTriangles++
    const inverseArea = 1 / area, ia = 1 / a[3], ib = 1 / b[3], ic = 1 / c[3]
    const az = a[2] * ia, bz = b[2] * ib, cz = c[2] * ic
    const d0x = (by - cy) * inverseArea, d0y = (cx - bx) * inverseArea
    const d1x = (cy - ay) * inverseArea, d1y = (ax - cx) * inverseArea
    // Shared edges belong to exactly one triangle. Inclusive tests on both triangles would
    // blend semi-transparent artwork twice along every mesh/decal diagonal.
    const edge0 = cy < by || (cy === by && cx > bx)
    const edge1 = ay < cy || (ay === cy && ax > cx)
    const edge2 = by < ay || (by === ay && bx > ax)
    let row0 = ((bx - x0 - 0.5) * (cy - y0 - 0.5) - (by - y0 - 0.5) * (cx - x0 - 0.5)) * inverseArea
    let row1 = ((cx - x0 - 0.5) * (ay - y0 - 0.5) - (cy - y0 - 0.5) * (ax - x0 - 0.5)) * inverseArea
    const bias = material.polygonOffset ? (material.polygonOffsetUnits + material.polygonOffsetFactor) * 0.000002 : 0
    const basic = material.isMeshBasicMaterial
    const specularStrength = basic ? 0 : (1 - (material.roughness ?? 0.6)) * 0.72 + (material.metalness ?? 0) * 0.3
    const emission = material.emissiveIntensity ?? 1
    const opacity = material.transparent ? material.opacity : 1
    for (let y = y0; y <= y1; y++, row0 += d0y, row1 += d1y) {
      let l0 = row0, l1 = row1
      for (let x = x0, pixel = y * width + x0; x <= x1; x++, pixel++, l0 += d0x, l1 += d1x) {
        const l2 = 1 - l0 - l1
        if (l0 < -1e-7 || l1 < -1e-7 || l2 < -1e-7) continue
        if ((Math.abs(l0) <= 1e-7 && !edge0) || (Math.abs(l1) <= 1e-7 && !edge1) || (Math.abs(l2) <= 1e-7 && !edge2)) continue
        const z = l0 * az + l1 * bz + l2 * cz + bias
        if (material.depthTest && z > depth[pixel] + 1e-7) continue
        const divisor = l0 * ia + l1 * ib + l2 * ic
        if (divisor <= 0) continue
        const p0 = l0 * ia / divisor, p1 = l1 * ib / divisor, p2 = l2 * ic / divisor
        let tr = 255, tg = 255, tb = 255, ta = 1
        if (map) {
          const u0 = p0 * a[4] + p1 * b[4] + p2 * c[4], v0 = p0 * a[5] + p1 * b[5] + p2 * c[5], transform = map.transform
          const u = wrapCoordinate(transform[0] * u0 + transform[3] * v0 + transform[6], map.wrapS)
          let v = wrapCoordinate(transform[1] * u0 + transform[4] * v0 + transform[7], map.wrapT)
          if (map.flipY) v = 1 - v
          const tx = u * (map.width - 1), ty = v * (map.height - 1), xx = Math.floor(tx), yy = Math.floor(ty)
          const channels = map.channels ?? 4, dx = tx - xx, dy = ty - yy
          const i00 = (yy * map.width + xx) * channels, i10 = (yy * map.width + Math.min(xx + 1, map.width - 1)) * channels
          const i01 = (Math.min(yy + 1, map.height - 1) * map.width + xx) * channels, i11 = (Math.min(yy + 1, map.height - 1) * map.width + Math.min(xx + 1, map.width - 1)) * channels
          const w00 = (1 - dx) * (1 - dy), w10 = dx * (1 - dy), w01 = (1 - dx) * dy, w11 = dx * dy, pixels = map.data
          tr = pixels[i00] * w00 + pixels[i10] * w10 + pixels[i01] * w01 + pixels[i11] * w11
          tg = channels > 1 ? pixels[i00 + 1] * w00 + pixels[i10 + 1] * w10 + pixels[i01 + 1] * w01 + pixels[i11 + 1] * w11 : tr
          tb = channels > 2 ? pixels[i00 + 2] * w00 + pixels[i10 + 2] * w10 + pixels[i01 + 2] * w01 + pixels[i11 + 2] * w11 : tr
          ta = channels === 4 ? (pixels[i00 + 3] * w00 + pixels[i10 + 3] * w10 + pixels[i01 + 3] * w01 + pixels[i11 + 3] * w11) / 255 : 1
        }
        if (ta < material.alphaTest) continue
        const alpha = opacity * (material.transparent ? ta : 1)
        if (alpha <= 1 / 255) continue
        const diffuse = basic ? 1 : p0 * a[6] + p1 * b[6] + p2 * c[6]
        const specular = (p0 * a[7] + p1 * b[7] + p2 * c[7]) * specularStrength * 255
        const vr = draw.vertexColor ? p0 * a[8] + p1 * b[8] + p2 * c[8] : 1
        const vg = draw.vertexColor ? p0 * a[9] + p1 * b[9] + p2 * c[9] : 1
        const vb = draw.vertexColor ? p0 * a[10] + p1 * b[10] + p2 * c[10] : 1
        const r = clamp(tr * base.r * diffuse * vr + specular + emissive.r * emission * 255, 0, 255)
        const g = clamp(tg * base.g * diffuse * vg + specular + emissive.g * emission * 255, 0, 255)
        const blue = clamp(tb * base.b * diffuse * vb + specular + emissive.b * emission * 255, 0, 255)
        const at = pixel * 4, remaining = 1 - alpha
        data[at] = r * alpha + data[at] * remaining
        data[at + 1] = g * alpha + data[at + 1] * remaining
        data[at + 2] = blue * alpha + data[at + 2] * remaining
        if (material.depthWrite) depth[pixel] = z
        stats.fragments++
      }
    }
  }

  for (const draw of draws) {
    const { vertices, codes, index } = draw
    for (let i = draw.start; i + 2 < draw.end; i += 3) {
      stats.triangles++
      const ai = index?.getX(i) ?? i, bi = index?.getX(i + 1) ?? i + 1, ci = index?.getX(i + 2) ?? i + 2
      if (codes[ai] & codes[bi] & codes[ci]) continue
      const a = vertices.subarray(ai * STRIDE, (ai + 1) * STRIDE), b = vertices.subarray(bi * STRIDE, (bi + 1) * STRIDE), c = vertices.subarray(ci * STRIDE, (ci + 1) * STRIDE)
      if (codes[ai] | codes[bi] | codes[ci]) {
        const polygon = clipTriangle([Array.from(a), Array.from(b), Array.from(c)])
        for (let k = 1; k + 1 < polygon.length; k++) drawTriangle(polygon[0], polygon[k], polygon[k + 1], draw)
      } else drawTriangle(a, b, c, draw)
    }
  }
  return { width, height, data, stats }
}

/** The WebGLRenderer-sized adapter used by the existing studio and OrbitControls. */
export const createModelPreviewRenderer = ({ canvas = document.createElement('canvas'), maxInteractivePixels = 480_000 } = {}) => {
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('This browser cannot create a model preview.')
  const scratch = document.createElement('canvas'), scratchContext = scratch.getContext('2d', { alpha: false })
  const textureReader = createModelTextureReader()
  let width = 1, height = 1, ratio = 1, disposed = false, hasFrame = false
  const renderer = {
    isModelPreviewRenderer: true,
    domElement: canvas,
    capabilities: { maxTextureSize: 4096, getMaxAnisotropy: () => 1 },
    shadowMap: { enabled: false },
    info: { render: { triangles: 0, calls: 0 }, preview: null },
    setPixelRatio(value) { ratio = Math.max(0.25, Math.min(2, Number(value) || 1)); renderer.setSize(width, height, false) },
    getPixelRatio: () => ratio,
    getSize: (target) => target.set(width, height),
    setSize(nextWidth, nextHeight, updateStyle = true) {
      if (disposed) return
      width = Math.max(1, Math.round(nextWidth)); height = Math.max(1, Math.round(nextHeight))
      const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio)
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        // Assigning either canvas dimension clears its buffer, even if the value is unchanged.
        // Keep the last complete frame visible across screenshot/viewport resizes until the
        // studio's next animation frame renders the updated camera and viewport.
        canvas.width = pixelWidth; canvas.height = pixelHeight
        if (hasFrame) context.drawImage(scratch, 0, 0, pixelWidth, pixelHeight)
      }
      if (updateStyle) { canvas.style.width = `${width}px`; canvas.style.height = `${height}px` }
    },
    render(scene, camera, { quality = 'interactive' } = {}) {
      if (disposed) return
      const scale = quality === 'export' ? 1 : Math.min(1, Math.sqrt(maxInteractivePixels / (canvas.width * canvas.height)))
      const renderWidth = Math.max(1, Math.round(canvas.width * scale)), renderHeight = Math.max(1, Math.round(canvas.height * scale))
      const frame = rasterizeModelScene(scene, camera, { width: renderWidth, height: renderHeight, textureReader })
      scratch.width = renderWidth; scratch.height = renderHeight
      const image = scratchContext.createImageData(renderWidth, renderHeight)
      image.data.set(frame.data)
      scratchContext.putImageData(image, 0, 0)
      context.drawImage(scratch, 0, 0, canvas.width, canvas.height)
      hasFrame = true
      renderer.info.render = { triangles: frame.stats.visibleTriangles, calls: frame.stats.meshes }
      renderer.info.preview = { ...frame.stats, width: renderWidth, height: renderHeight, quality }
    },
    dispose() { disposed = true; textureReader.dispose(); scratch.width = scratch.height = 1 }
  }
  return renderer
}
