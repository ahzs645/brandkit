// Optional construction annotations. The artwork and its fields remain independent of these
// rules: a guide can follow a flow item's actual baselines without changing the printed design.

const COORDINATES = new Set(['x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height'])
const ABSENT = Symbol('empty flow item')

/**
 * Resolve guide coordinates against laid-out flow items.
 *
 * A coordinate can be a normal template distance, or
 *   { flow: 'cover-title', edge: 'lastBaseline', offset: 4 }
 * Edges: top (cap line), firstBaseline, lastBaseline, bottom (last baseline), left, right.
 * Offsets use the template's coordinate units. An annotation attached to an empty item is
 * omitted, rather than left behind where its former text used to be.
 * `requiresFlow: ['title', 'subtitle']` also omits a relationship annotation when either
 * participating item is empty, even if its own coordinates follow only one of those items.
 */
export const layoutGuideElements = (guides, flowBounds = new Map()) => (guides?.elements ?? []).flatMap((element) => {
  const required = element.requiresFlow ?? []
  if (!Array.isArray(required)) throw new Error('Layout guide requiresFlow must be an array of flow item IDs.')
  for (const id of required) if (!flowBounds.has(id)) throw new Error(`Layout guide requires unknown flow item: ${id}`)
  if (required.some((id) => !flowBounds.get(id))) return []
  let absent = false
  const resolve = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !value.flow) return value
    if (!flowBounds.has(value.flow)) throw new Error(`Layout guide refers to unknown flow item: ${value.flow}`)
    const box = flowBounds.get(value.flow)
    if (!box) { absent = true; return ABSENT }
    const edge = value.edge ?? 'lastBaseline'
    if (!Number.isFinite(box[edge])) throw new Error(`Unknown layout guide edge: ${edge}`)
    const offset = value.offset ?? 0
    if (!Number.isFinite(offset)) throw new Error('A layout guide offset must be a finite number in template units.')
    return box[edge] + offset
  }
  const result = Object.fromEntries(Object.entries(element).map(([key, value]) => [key, COORDINATES.has(key) ? resolve(value) : value]))
  if (element.points) result.points = element.points.map((point) => point.map(resolve))
  return absent ? [] : [{ ...result, locked: true }]
})

/** Position a registered source crop without stretching the source image. */
export const referencePlacement = (template) => {
  const box = template.reference?.alignment ?? { x: 0, y: 0, width: template.width, height: template.height }
  if (![template.width, template.height, box.x, box.y, box.width, box.height].every(Number.isFinite) || template.width <= 0 || template.height <= 0 || box.width <= 0 || box.height <= 0) throw new Error('A reference overlay needs a finite canvas and a positive registration rectangle.')
  return {
    left: `${100 * box.x / template.width}%`,
    top: `${100 * box.y / template.height}%`,
    width: `${100 * box.width / template.width}%`,
    height: `${100 * box.height / template.height}%`
  }
}
