// Garment mockups use millimetres throughout. These are generic visualization regions,
// intentionally independent of supplier production limits and of the selected blank size.
export const APPAREL_SCHEMA = 'brandkit-apparel-mockup/1'
export const APPAREL_PRODUCTS = Object.freeze({
  crewneck: Object.freeze({ label: 'Crewneck sweatshirt', detail: 'Ribbed collar · relaxed silhouette', version: 1 }),
  hoodie: Object.freeze({ label: 'Pullover hoodie', detail: 'Hood · kangaroo pocket · drawcords', version: 1 })
})
export const APPAREL_SIZES = Object.freeze({
  S: Object.freeze({ width: 520, height: 660 }),
  M: Object.freeze({ width: 560, height: 700 }),
  L: Object.freeze({ width: 600, height: 730 }),
  XL: Object.freeze({ width: 640, height: 760 }),
  XXL: Object.freeze({ width: 680, height: 790 })
})
export const APPAREL_METHODS = Object.freeze({
  print: 'Screen print', dtf: 'DTF / DTG', embroidery: 'Embroidery preview', patch: 'Patch preview'
})
export const APPAREL_VIEWS = Object.freeze({ angle: 'Perspective', front: 'Front', back: 'Back', left: 'Left sleeve', right: 'Right sleeve' })
const region = (label, surface, x, y, width, height) => Object.freeze({ label, surface, x, y, width, height })
const common = {
  'left-chest': region('Left chest', 'front', 105, 180, 130, 100),
  'left-sleeve': region('Left sleeve', 'left-sleeve', 0, 270, 90, 220),
  'right-sleeve': region('Right sleeve', 'right-sleeve', 0, 270, 90, 220)
}
export const apparelAreas = (product) => product === 'hoodie' ? {
  ...common,
  front: region('Front · above pocket', 'front', 0, 230, 300, 170),
  back: region('Back · below hood', 'back', 0, 410, 320, 220)
} : {
  ...common,
  front: region('Full front', 'front', 0, 290, 320, 300),
  back: region('Back', 'back', 0, 330, 320, 330)
}

export const apparelLayerId = () => globalThis.crypto?.randomUUID?.() ?? `art-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
const record = (value) => value && typeof value === 'object' && !Array.isArray(value)
const finite = (value) => typeof value === 'number' && Number.isFinite(value)
const text = (value, limit) => typeof value === 'string' && value.length <= limit

/** Rotated bounding rectangle, used by both previews and validation. */
export const apparelExtent = (layer) => {
  const radians = layer.rotation * Math.PI / 180
  const cos = Math.abs(Math.cos(radians)), sin = Math.abs(Math.sin(radians))
  const border = layer.method === 'patch' ? 10 * (cos + sin) : 0
  return { width: layer.widthMm * (cos + sin / layer.aspect) + border, height: layer.widthMm * (sin + cos / layer.aspect) + border }
}

/** Changing the garment never silently scales a design; unsuitable placements are retained. */
export const apparelLayerStatus = (project, layer) => {
  const area = apparelAreas(project.product)[layer.area]
  if (!area) return { placed: false, reason: 'Choose a decoration area for this artwork.' }
  const bounds = apparelExtent(layer)
  const placed = Math.abs(layer.xMm) + bounds.width / 2 <= area.width / 2 + 0.001
    && Math.abs(layer.yMm) + bounds.height / 2 <= area.height / 2 + 0.001
  return { placed, reason: placed ? '' : 'Retained artwork exceeds this garment’s preview region. Resize or choose another area.' }
}

/** Explicit editing fits the entire rotated rectangle. Product/size changes do not call this. */
export const fitApparelLayer = (layer, product) => {
  const area = apparelAreas(product)[layer.area]
  if (!area) return { ...layer }
  const angle = ((layer.rotation % 360) + 540) % 360 - 180
  const radians = angle * Math.PI / 180
  const cos = Math.abs(Math.cos(radians)), sin = Math.abs(Math.sin(radians))
  const border = layer.method === 'patch' ? 10 * (cos + sin) : 0
  const maximum = Math.min((area.width - border) / (cos + sin / layer.aspect), (area.height - border) / (sin + cos / layer.aspect))
  const widthMm = Math.max(Math.min(20, maximum), Math.min(layer.widthMm, maximum))
  const extent = apparelExtent({ ...layer, widthMm, rotation: angle })
  const limitX = Math.max(0, (area.width - extent.width) / 2), limitY = Math.max(0, (area.height - extent.height) / 2)
  return { ...layer, widthMm, rotation: angle, xMm: Math.min(limitX, Math.max(-limitX, layer.xMm)), yMm: Math.min(limitY, Math.max(-limitY, layer.yMm)) }
}

export const createApparelLayer = ({ logo = '', aspect = 3.5, area = 'left-chest', product = 'crewneck', name = 'Brand lockup' } = {}) => fitApparelLayer({
  id: apparelLayerId(), name, logo, area, aspect, widthMm: area === 'left-chest' ? 95 : 220,
  xMm: 0, yMm: 0, rotation: 0, method: 'print', visible: true, locked: false
}, product)

export const createApparelProject = ({ logo = '', aspect = 3.5 } = {}) => {
  const layer = createApparelLayer({ logo, aspect })
  return { schema: APPAREL_SCHEMA, assetVersion: 1, surfaceVersion: 1, product: 'crewneck', size: 'M', colour: '#162a49', layers: [layer], selectedLayerId: layer.id, view: 'angle', mode: '3d' }
}

export const validateApparelProject = (input, { logos } = {}) => {
  if (!record(input) || input.schema !== APPAREL_SCHEMA) throw new Error('Choose a clothing mockup saved by Brandkit.')
  if (input.assetVersion !== 1 || input.surfaceVersion !== 1) throw new Error('This clothing asset version is not supported.')
  if (!Object.hasOwn(APPAREL_PRODUCTS, input.product) || !Object.hasOwn(APPAREL_SIZES, input.size)) throw new Error('Unknown garment or size.')
  if (typeof input.colour !== 'string' || !/^#[\da-f]{6}$/i.test(input.colour)) throw new Error('Invalid garment colour.')
  if (!Array.isArray(input.layers) || input.layers.length > 24) throw new Error('Use at most 24 artwork layers.')
  const ids = new Set()
  const layers = input.layers.map((layer) => {
    if (!record(layer) || !text(layer.id, 100) || !layer.id || ids.has(layer.id)) throw new Error('Every artwork layer needs a unique ID.')
    ids.add(layer.id)
    if (!text(layer.name, 80) || !text(layer.logo, 200) || !Object.hasOwn(apparelAreas(input.product), layer.area)) throw new Error('Invalid artwork name, reference or area.')
    if (logos && layer.logo && !logos.includes(layer.logo)) throw new Error('This mockup uses artwork that is not in the open brand.')
    if (!finite(layer.aspect) || layer.aspect < 0.1 || layer.aspect > 20 || !finite(layer.widthMm) || layer.widthMm <= 0 || layer.widthMm > 2000) throw new Error('Invalid artwork dimensions.')
    if (!finite(layer.xMm) || !finite(layer.yMm) || Math.abs(layer.xMm) > 2000 || Math.abs(layer.yMm) > 2000 || !finite(layer.rotation) || Math.abs(layer.rotation) > 180) throw new Error('Invalid artwork position.')
    if (!Object.hasOwn(APPAREL_METHODS, layer.method) || typeof layer.visible !== 'boolean' || typeof layer.locked !== 'boolean') throw new Error('Invalid decoration method or layer state.')
    return { id: layer.id, name: layer.name, logo: layer.logo, area: layer.area, aspect: layer.aspect, widthMm: layer.widthMm, xMm: layer.xMm, yMm: layer.yMm, rotation: layer.rotation, method: layer.method, visible: layer.visible, locked: layer.locked }
  })
  const selectedLayerId = input.selectedLayerId === null && !layers.length ? null : input.selectedLayerId
  if (selectedLayerId !== null && !ids.has(selectedLayerId)) throw new Error('The selected artwork layer is missing.')
  if (!Object.hasOwn(APPAREL_VIEWS, input.view) || !['3d', 'flat'].includes(input.mode)) throw new Error('Invalid clothing preview view.')
  return { schema: APPAREL_SCHEMA, assetVersion: 1, surfaceVersion: 1, product: input.product, size: input.size, colour: input.colour.toLowerCase(), layers, selectedLayerId, view: input.view, mode: input.mode }
}

/** Coordinates on the garment's texture: x across it; y measured down from the shoulder line. */
export const apparelPlacement = (project, layer) => {
  const area = apparelAreas(project.product)[layer.area]
  return { surface: area.surface, x: area.x + layer.xMm, y: area.y + layer.yMm, width: layer.widthMm, height: layer.widthMm / layer.aspect, rotation: layer.rotation }
}

export const copyApparelLayer = (layer) => ({ ...layer, id: apparelLayerId(), name: `${layer.name.slice(0, 70)} copy`, locked: false })
