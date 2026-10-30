// Optional construction annotations, drawn the way an identity manual draws its construction
// pages: outside the trim. The artwork is left alone; dimension lines run in a margin around it,
// with extension lines to the edges they measure, and notes sit in that margin with leaders to
// what they describe. Annotations name what they measure (the trim, a laid-out element, a flow
// item, an illustration's zone or lettering line) rather than carrying coordinates, so they follow
// the artwork as its text is edited, and disappear with the text they describe.
//
//   dimension  { axis: 'x' | 'y', from: Edge, to: Edge, label, side?, ends?, track?, labelAt? }
//              a measured distance. x dimensions run above ('top', the default) or below the trim,
//              y dimensions to its 'right' (default) or 'left'. ends: 'arrow' (default), 'tick',
//              or 'none' for a band of extension lines with its label between them, as the manual
//              sets out type sizes beside a cover. track pins it to a row; otherwise nested and
//              overlapping dimensions are stacked outward, shortest nearest the trim.
//   callout    { target: Target, label, side?, at?, outline? }
//              a note in the margin with a leader to its target; `at` is the target's edge the
//              leader leaves from (its baseline for text, its middle or centre otherwise), and
//              `outline` boxes the target lightly.
//   align      { axis: 'x' | 'y', refs: [Edge, …], side?, label? }
//              a shared edge (a telephone number ending under the symbol), drawn through every
//              element that keeps to it and, with `side`, out into the margin.
//   note       { label, side?: 'bottom' | 'top' }       a printed rule with nothing to point at.
//
// Edge: 'trim.left' | 'trim.right' | 'trim.top' | 'trim.bottom', or a target and one of its edges,
//   { element: id, edge }, { flow: id, edge }, { zone: id, edge }, { lettering: index, edge },
//   each with an optional `offset` in template units, or { at: n } for a position nothing marks
//   (an extension line then crosses the whole trim, dashed, as a reconstruction rather than a
//   measurement). x edges: left, right, center, logotype (where a signature's logotype starts);
//   y edges: top, cap (cap line), baseline, firstBaseline, lastBaseline, middle, bottom.
// Target: { element: id }, { flow: id }, { zone: id }, { lettering: index | [first, last] },
//   { box: [x, y, width, height] }.
//
// Elements are measured by id; a logo without one is 'brand-logo', as it is in the SVG. An
// annotation whose target or edge belongs to emptied text is left out, as is one listing an empty
// flow item in `requiresFlow` (a gap between two items means nothing once either has gone), or a
// filled one in `requiresEmptyFlow` (the gap that closes up when the item between is emptied).

export const GUIDE_COLOUR = '#9A2455'
const TRIM_COLOUR = '#8C8C8C'
const ABSENT = Symbol('emptied text')
const EDGES = {
  x: new Set(['left', 'right', 'center', 'logotype']),
  y: new Set(['top', 'cap', 'baseline', 'firstBaseline', 'lastBaseline', 'middle', 'bottom'])
}
const SIDES = { x: ['top', 'bottom'], y: ['right', 'left'] }
const n = (value) => Math.round(value * 10000) / 10000

/** A measured box with every edge a rule can name, where the measurement supplies it. */
const complete = (box) => {
  const baseline = box.baseline ?? box.firstBaseline
  return {
    ...box,
    center: (box.left + box.right) / 2,
    middle: (box.top + box.bottom) / 2,
    cap: box.cap ?? (baseline != null ? box.top : undefined),
    baseline,
    firstBaseline: box.firstBaseline ?? baseline,
    lastBaseline: box.lastBaseline ?? baseline
  }
}

const union = (boxes) => {
  const present = boxes.filter(Boolean)
  if (!present.length) return null
  return {
    left: Math.min(...present.map((box) => box.left)), right: Math.max(...present.map((box) => box.right)),
    top: Math.min(...present.map((box) => box.top)), bottom: Math.max(...present.map((box) => box.bottom)),
    firstBaseline: present[0].firstBaseline ?? present[0].baseline,
    lastBaseline: present.at(-1).lastBaseline ?? present.at(-1).baseline,
    rows: present.flatMap((box) => box.rows ?? (Number.isFinite(box.baseline) ? [{ baseline: box.baseline, left: box.left, right: box.right }] : []))
  }
}

const KINDS = [['element', 'elements', 'element'], ['flow', 'flows', 'flow item'], ['zone', 'zones', 'zone']]

/** The measured box a target names, null when its text has been emptied. */
const boxOf = (target, sources) => {
  if (!target || typeof target !== 'object') throw new Error('A layout rule target must name an element, flow item, zone, lettering line or box.')
  if (Array.isArray(target.box)) {
    const [x, y, width, height] = target.box
    if (![x, y, width, height].every(Number.isFinite)) throw new Error('A layout rule box is [x, y, width, height] in template units.')
    return complete({ left: x, top: y, right: x + width, bottom: y + height })
  }
  for (const [key, map, name] of KINDS) {
    if (target[key] == null) continue
    if (!sources[map].has(target[key])) throw new Error(`Layout guide refers to unknown ${name}: ${target[key]}`)
    const box = sources[map].get(target[key])
    return box ? complete(box) : null
  }
  if (target.lettering != null) {
    const [first, last] = Array.isArray(target.lettering) ? target.lettering : [target.lettering, target.lettering]
    if (!(first >= 0 && last >= first && last < sources.lettering.length)) throw new Error(`Layout guide refers to unknown lettering line: ${target.lettering}`)
    const box = union(sources.lettering.slice(first, last + 1))
    return box ? complete(box) : null
  }
  throw new Error('A layout rule target must name an element, flow item, zone, lettering line or box.')
}

const TRIM = { left: ['x', 'left'], right: ['x', 'right'], top: ['y', 'top'], bottom: ['y', 'bottom'] }

/** An edge as a coordinate on `axis`, with the box an extension line should reach. */
const edgeOf = (ref, axis, sources) => {
  const { trim } = sources
  if (typeof ref === 'string') {
    const [, side] = /^trim\.(left|right|top|bottom)$/.exec(ref) ?? []
    if (!side) throw new Error(`Unknown layout guide edge: ${ref}`)
    if (TRIM[side][0] !== axis) throw new Error(`The trim's ${side} edge does not measure the ${axis} axis.`)
    return { at: trim[side], trim: side }
  }
  if (ref && Number.isFinite(ref.at)) return { at: ref.at, literal: true }
  const box = boxOf(ref, sources)
  if (!box) return ABSENT
  const edge = ref.edge
  if (!EDGES[axis].has(edge)) throw new Error(`Unknown layout guide edge for the ${axis} axis: ${edge}`)
  if (!Number.isFinite(box[edge])) throw new Error(`Unknown layout guide edge: ${edge} is not measured for this target.`)
  const offset = ref.offset ?? 0
  if (!Number.isFinite(offset)) throw new Error('A layout guide offset must be a finite number in template units.')
  return { at: box[edge] + offset, box: rowOf(box, edge) }
}

const FIRST = new Set(['top', 'cap', 'baseline', 'firstBaseline'])
const LAST = new Set(['lastBaseline', 'bottom'])

/**
 * A text block narrowed to the line an edge belongs to (its first line for the cap line, its last
 * for the last baseline), so a line drawn from that edge starts where that line of text ends.
 */
const rowOf = (box, edge) => {
  const row = box.rows?.length ? (FIRST.has(edge) ? box.rows[0] : LAST.has(edge) ? box.rows.at(-1) : null) : null
  return row ? { ...box, left: row.left, right: row.right } : box
}

// --- Labels: set in the guide face, with fractions built from small figures as the manual sets
// "1⅛″", since the substitute face has only the commonest precomposed fractions.

const FRACTION = /(\d+) (\d+)\/(\d+)|(\d+)\/(\d+)/g

/**
 * One line as runs of text (`{ text, dx, dy, size }`), its fractions ("1 7/8", or any that
 * `pattern` finds) built from small figures. `measure(text, size)` gives a run's width.
 */
export const typesetLine = (text, size, measure, pattern = FRACTION) => {
  const runs = []
  let x = 0
  const push = (value, scale = 1, rise = 0) => {
    if (!value) return
    runs.push({ text: value, dx: x, dy: -rise * size, size: size * scale })
    x += measure(value, size * scale)
  }
  let last = 0
  for (const match of text.matchAll(pattern)) {
    push(text.slice(last, match.index))
    const [whole, numerator, denominator] = match[1] ? match.slice(1, 4) : [null, match[4], match[5]]
    push(whole)
    push(numerator, 0.62, 0.38)
    x -= 0.04 * size
    push('⁄', 0.9)
    x -= 0.04 * size
    push(denominator, 0.62)
    last = match.index + match[0].length
  }
  push(text.slice(last))
  return { runs, width: x }
}

const typeset = (label, size, measure) => {
  const lines = String(label).split('\n').map((line) => typesetLine(line, size, measure))
  return { lines, width: Math.max(0, ...lines.map((line) => line.width)), height: size * (0.72 + 1.15 * (lines.length - 1)) }
}

/**
 * Lay out a template's annotations around its trim.
 *
 * @param {object} guides   `{ elements: [annotation, …], labelSize? }`
 * @param {object} sources  `{ width, height, elements, flows, zones, lettering, measure, font }`:
 *   the trim size, Maps of measured boxes by id (null for emptied text), the illustration's
 *   lettering boxes, and `measure(text, size)` for label widths.
 * @returns {{ annotations: Array<{ type, id?, parts }>, frame: { left, top, right, bottom } }}
 *   parts are template elements (line, path, rect, text) in template units; frame is the margin
 *   each side needs to show them.
 */
export const layoutGuides = (guides, sources) => {
  const { width: W, height: H } = sources
  const all = {
    elements: sources.elements ?? new Map(), flows: sources.flows ?? new Map(), zones: sources.zones ?? new Map(),
    lettering: sources.lettering ?? [], trim: { left: 0, right: W, top: 0, bottom: H }
  }
  const measure = sources.measure ?? ((text, size) => Array.from(text).length * size * 0.5)
  const font = sources.font ?? 'italic'
  // Everything scales with the drawing, so the rules read alike on a business card and a sign.
  const fs = guides.labelSize ?? 0.021 * Math.max(W, H)
  const gap = 1.2 * fs
  const pitch = 1.65 * fs
  const pad = 0.35 * fs
  const arrow = 0.55 * fs
  const clear = 0.3 * fs
  const over = 0.4 * fs
  const lineWidth = 0.055 * fs
  const thin = 0.035 * fs
  const stroke = { stroke: GUIDE_COLOUR, strokeWidth: lineWidth }
  const extension = { stroke: GUIDE_COLOUR, strokeWidth: thin }
  const line = (x1, y1, x2, y2, style = stroke) => ({ type: 'line', x1, y1, x2, y2, ...style })
  const text = (label, x, baseline, anchor = 'start') => {
    const set = typeset(label, fs, measure)
    return set.lines.flatMap((row, index) => {
      const left = anchor === 'middle' ? x - row.width / 2 : anchor === 'end' ? x - row.width : x
      return row.runs.map((run) => ({ type: 'text', literal: run.text, x: left + run.dx, y: baseline + index * 1.15 * fs + run.dy, size: run.size, font, colour: GUIDE_COLOUR }))
    })
  }
  const head = (x, y, dx, dy, ends) => {
    if (ends === 'tick') return { type: 'line', x1: x - 0.3 * fs, y1: y + 0.3 * fs, x2: x + 0.3 * fs, y2: y - 0.3 * fs, ...stroke }
    // An open arrowhead, its tip on the extension line, as the manual draws them.
    const [px, py] = [-dy, dx]
    const back = (along, side) => `${n(x + dx * along + px * side)} ${n(y + dy * along + py * side)}`
    return { type: 'path', d: `M${back(arrow, 0.22 * fs)}L${n(x)} ${n(y)}L${back(arrow, -0.22 * fs)}`, fill: 'none', ...stroke }
  }

  const prepared = []
  for (const [index, annotation] of (guides?.elements ?? []).entries()) {
    const required = annotation.requiresFlow ?? []
    if (!Array.isArray(required)) throw new Error('Layout guide requiresFlow must be an array of flow item IDs.')
    for (const id of required) if (!all.flows.has(id)) throw new Error(`Layout guide requires unknown flow item: ${id}`)
    if (required.some((id) => !all.flows.get(id))) continue
    const vacant = annotation.requiresEmptyFlow ?? []
    if (!Array.isArray(vacant)) throw new Error('Layout guide requiresEmptyFlow must be an array of flow item IDs.')
    for (const id of vacant) if (!all.flows.has(id)) throw new Error(`Layout guide requires unknown flow item: ${id}`)
    if (vacant.some((id) => all.flows.get(id))) continue
    const item = { ...annotation, order: index }
    if (annotation.type === 'dimension') {
      if (!SIDES[annotation.axis]) throw new Error('A dimension measures the x or y axis.')
      const from = edgeOf(annotation.from, annotation.axis, all)
      const to = edgeOf(annotation.to, annotation.axis, all)
      if (from === ABSENT || to === ABSENT) continue
      item.side = annotation.side ?? SIDES[annotation.axis][0]
      if (!SIDES[annotation.axis].includes(item.side)) throw new Error(`A ${annotation.axis} dimension sits ${SIDES[annotation.axis].join(' or ')} of the trim.`)
      ;[item.a, item.b] = from.at <= to.at ? [from, to] : [to, from]
      item.set = typeset(annotation.label, fs, measure)
    } else if (annotation.type === 'callout') {
      item.box = boxOf(annotation.target, all)
      if (!item.box) continue
      item.side = annotation.side ?? (() => {
        const distance = { left: item.box.center, right: W - item.box.center, top: item.box.middle, bottom: H - item.box.middle }
        return Object.entries(distance).sort((one, two) => one[1] - two[1])[0][0]
      })()
      item.set = typeset(annotation.label, fs, measure)
    } else if (annotation.type === 'align') {
      if (!SIDES[annotation.axis]) throw new Error('An alignment follows the x or y axis.')
      item.refs = (annotation.refs ?? []).map((ref) => edgeOf(ref, annotation.axis, all))
      if (item.refs.length < 2) throw new Error('An alignment needs at least two edges.')
      if (item.refs.includes(ABSENT)) continue
      if (annotation.label) item.set = typeset(annotation.label, fs, measure)
    } else if (annotation.type === 'note') {
      item.side = annotation.side ?? 'bottom'
      if (!['top', 'bottom'].includes(item.side)) throw new Error('A note sits above or below the trim.')
      item.set = typeset(annotation.label, fs, measure)
    } else throw new Error(`Unknown layout guide type: ${annotation.type}`)
    prepared.push(item)
  }

  const out = new Map(prepared.map((item) => [item, []]))
  const outward = { top: -1, bottom: 1, left: -1, right: 1 }
  const base = { top: 0, bottom: H, left: 0, right: W }
  // How far each side's dimension tracks reach, so callouts and notes go beyond them.
  const reach = { top: gap, bottom: gap, left: gap, right: gap }

  // --- Dimensions: each in a track, nested and overlapping ones stacked outward.
  for (const side of ['top', 'bottom', 'left', 'right']) {
    const axis = side === 'top' || side === 'bottom' ? 'x' : 'y'
    const dimensions = prepared.filter((item) => item.type === 'dimension' && item.side === side)
    // Where each one's label goes, and so how much of the track it occupies. An x dimension's
    // label sits in a gap in its line, or past an end when the distance is too short for it (into
    // the margin's corner when the distance starts at the trim, as the manual's ¼″ does); a y
    // dimension's label stands beside its line, level with the middle of the distance.
    for (const item of dimensions) {
      const span = item.b.at - item.a.at
      const middle = (item.a.at + item.b.at) / 2
      if (axis === 'y') {
        const half = item.set.height / 2 + 0.15 * fs
        item.occupied = [Math.min(item.a.at, middle - half), Math.max(item.b.at, middle + half)]
        continue
      }
      const length = item.set.width
      item.inside = span >= length + 2 * pad + 2 * arrow
      item.after = item.labelAt ? item.labelAt === 'after' : !item.a.trim
      item.occupied = item.inside ? [item.a.at, item.b.at]
        : item.after ? [item.a.at, item.b.at + arrow + pad + length] : [item.a.at - arrow - pad - length, item.b.at]
    }
    const tracks = []
    for (const item of [...dimensions].sort((one, two) => (one.track ?? -1) - (two.track ?? -1) || (one.occupied[1] - one.occupied[0]) - (two.occupied[1] - two.occupied[0]) || one.order - two.order)) {
      const fits = (track) => tracks[track].every((other) => item.occupied[1] <= other.occupied[0] + 1e-6 || item.occupied[0] >= other.occupied[1] - 1e-6 || (item.ends === 'none' && other.ends === 'none' && (item.b.at <= other.a.at + 1e-6 || item.a.at >= other.b.at - 1e-6)))
      let track = item.track ?? 0
      while (item.track == null && tracks[track] && !fits(track)) track += 1
      ;(tracks[track] ??= []).push(item)
      item.trackIndex = track
    }
    // x tracks are rows of one label height; y tracks are columns, the line at the inner side and
    // the labels beside it, as wide as the widest label.
    const rail = 2 * pad
    let distance = gap
    tracks.forEach((members = []) => {
      const size = axis === 'x' ? pitch : Math.max(...members.map((item) => (item.ends === 'none' ? pad : rail + pad) + item.set.width + pad))
      for (const item of members) {
        item.trackStart = base[side] + outward[side] * (axis === 'x' ? distance - pitch / 2 : distance)
        item.centre = axis === 'x' ? base[side] + outward[side] * distance : item.trackStart + outward[side] * rail
      }
      distance += axis === 'x' ? pitch : size
    })
    if (tracks.length) reach[side] = axis === 'x' ? distance - pitch + 0.6 * fs : distance
    for (const item of dimensions) {
      const parts = out.get(item)
      const along = (position, across) => (axis === 'x' ? [position, across] : [across, position])
      const ends = item.ends ?? 'arrow'
      const lineEnd = ends === 'none' ? item.trackStart : item.centre + outward[side] * over
      // Extension lines from what is measured out to the dimension line.
      for (const end of [item.a, item.b]) {
        const box = end.box
        const start = end.trim ? base[side]
          : end.literal ? base[{ top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[side]]
            : (axis === 'x' ? (side === 'top' ? box.top : box.bottom) : (side === 'left' ? box.left : box.right)) + outward[side] * clear
        parts.push(line(...along(end.at, start), ...along(end.at, lineEnd), end.literal ? { ...extension, dash: `${n(fs * 0.4)} ${n(fs * 0.3)}` } : extension))
      }
      const [a, b] = [item.a.at, item.b.at]
      const length = axis === 'x' ? item.set.width : item.set.height
      const middle = (a + b) / 2
      if (ends !== 'none') {
        if (axis === 'x' && item.inside) {
          parts.push(line(...along(a, item.centre), ...along(middle - length / 2 - pad, item.centre)), line(...along(middle + length / 2 + pad, item.centre), ...along(b, item.centre)))
        } else parts.push(line(...along(a, item.centre), ...along(b, item.centre)))
        const [ax, ay] = along(a, item.centre)
        const [bx, by] = along(b, item.centre)
        parts.push(head(ax, ay, ...(axis === 'x' ? [1, 0] : [0, 1]), ends), head(bx, by, ...(axis === 'x' ? [-1, 0] : [0, -1]), ends))
      }
      if (axis === 'x') parts.push(...text(item.label, item.inside ? middle : item.after ? b + arrow + pad + length / 2 : a - arrow - pad - length / 2, item.centre + 0.36 * fs, 'middle'))
      else parts.push(...text(item.label, (ends === 'none' ? item.trackStart : item.centre) + outward[side] * pad, middle - item.set.height / 2 + 0.72 * fs, side === 'right' ? 'start' : 'end'))
    }
  }

  // --- Alignments: a dashed line through every element sharing the edge.
  for (const item of prepared.filter((entry) => entry.type === 'align')) {
    const parts = out.get(item)
    const at = item.refs[0].at
    const boxes = item.refs.map((ref) => ref.box).filter(Boolean)
    const dash = { ...extension, dash: `${n(fs * 0.5)} ${n(fs * 0.3)}` }
    if (item.axis === 'x') {
      let top = Math.min(...boxes.map((box) => box.top)) - clear
      let bottom = Math.max(...boxes.map((box) => box.bottom)) + clear
      if (item.side === 'bottom') bottom = H + reach.bottom
      if (item.side === 'top') top = -reach.top
      parts.push(line(at, top, at, bottom, dash))
      if (item.set) parts.push(...text(item.label, at, item.side === 'top' ? top - pad : bottom + pad + 0.72 * fs, 'middle'))
      if (item.side) reach[item.side] += item.set ? item.set.height + 2 * pad : 0
    } else {
      let left = Math.min(...boxes.map((box) => box.left)) - clear
      let right = Math.max(...boxes.map((box) => box.right)) + clear
      if (item.side === 'right') right = W + reach.right
      if (item.side === 'left') left = -reach.left
      parts.push(line(left, at, right, at, dash))
      if (item.set) parts.push(...text(item.label, item.side === 'left' ? left - pad : right + pad, at + 0.36 * fs, item.side === 'left' ? 'end' : 'start'))
    }
  }

  // --- Callouts: labels in the margin beyond the tracks, kept apart, each with a leader.
  for (const side of ['top', 'bottom', 'left', 'right']) {
    const callouts = prepared.filter((item) => item.type === 'callout' && item.side === side)
    if (!callouts.length) continue
    const vertical = side === 'left' || side === 'right'
    for (const item of callouts) {
      const box = item.box
      const at = item.at ?? (vertical ? (Number.isFinite(box.baseline) ? 'baseline' : 'middle') : 'center')
      if (!EDGES[vertical ? 'y' : 'x'].has(at) || !Number.isFinite(box[at])) throw new Error(`Unknown layout guide edge: ${at} is not measured for this target.`)
      item.anchor = box[at]
      item.reach = rowOf(box, at)
      item.extent = vertical ? item.set.height : item.set.width
      item.place = vertical ? item.anchor - item.set.height / 2 + 0.36 * fs : item.anchor - item.set.width / 2
    }
    // Keep labels from overlapping: sweep in order, pushing each clear of the one before.
    callouts.sort((one, two) => one.anchor - two.anchor)
    let previous = -Infinity
    for (const item of callouts) {
      item.place = Math.max(item.place, previous)
      previous = item.place + item.extent + (vertical ? 0.45 : 1.2) * fs
    }
    const column = base[side] + outward[side] * (reach[side] + pad)
    let depth = 0
    for (const item of callouts) {
      const parts = out.get(item)
      const box = item.box
      if (item.outline) parts.push({ type: 'rect', x: box.left - clear, y: box.top - clear, width: box.right - box.left + 2 * clear, height: box.bottom - box.top + 2 * clear, fill: 'none', ...extension, dash: `${n(fs * 0.4)} ${n(fs * 0.25)}` })
      const start = { left: item.reach.left - clear, right: item.reach.right + clear, top: box.top - clear, bottom: box.bottom + clear }[side]
      const labelCentre = item.place + item.extent / 2 - (vertical ? 0.36 * fs : 0)
      const knee = column - outward[side] * fs
      const point = (position, across) => (vertical ? [position, across] : [across, position])
      if (Math.abs(labelCentre - item.anchor) < 1e-6) parts.push(line(...point(start, item.anchor), ...point(column - outward[side] * 0.5 * pad, item.anchor), extension))
      else parts.push(line(...point(start, item.anchor), ...point(knee, item.anchor), extension), line(...point(knee, item.anchor), ...point(column - outward[side] * 0.5 * pad, labelCentre), extension))
      if (vertical) parts.push(...text(item.label, column, item.place + 0.36 * fs, side === 'left' ? 'end' : 'start'))
      else {
        const baseline = side === 'top' ? column - item.set.height + 0.72 * fs : column + 0.72 * fs
        parts.push(...text(item.label, item.place + item.set.width / 2, baseline, 'middle'))
        depth = Math.max(depth, item.set.height)
      }
    }
    reach[side] += pad + (vertical ? Math.max(...callouts.map((item) => item.set.width)) : depth + pad)
  }

  // --- Notes: printed rules with nothing to point at, set beneath (or above) everything else.
  for (const side of ['bottom', 'top']) {
    for (const item of prepared.filter((entry) => entry.type === 'note' && entry.side === side)) {
      const top = side === 'bottom' ? H + reach.bottom + pad : -(reach.top + pad + item.set.height)
      out.get(item).push(...text(item.label, 0, top + 0.72 * fs, 'start'))
      reach[side] += pad + item.set.height
    }
  }

  // The margin: whatever was drawn outside the trim, and at least a little all round.
  const extents = { left: 0, right: W, top: 0, bottom: H }
  const grow = (x, y) => {
    extents.left = Math.min(extents.left, x); extents.right = Math.max(extents.right, x)
    extents.top = Math.min(extents.top, y); extents.bottom = Math.max(extents.bottom, y)
  }
  for (const parts of out.values()) for (const part of parts) {
    if (part.type === 'line') { grow(part.x1, part.y1); grow(part.x2, part.y2) }
    if (part.type === 'rect') { grow(part.x, part.y); grow(part.x + part.width, part.y + part.height) }
    if (part.type === 'path') for (const [, x, y] of part.d.matchAll(/(-?[\d.e-]+) (-?[\d.e-]+)/g)) grow(Number(x), Number(y))
    if (part.type === 'text') { grow(part.x, part.y - part.size); grow(part.x + measure(part.literal, part.size), part.y + 0.25 * part.size) }
  }
  const margin = (value) => Math.max(fs, value + 0.6 * fs)
  const frame = { left: margin(-extents.left), top: margin(-extents.top), right: margin(extents.right - W), bottom: margin(extents.bottom - H) }
  const trim = { type: 'rect', x: 0, y: 0, width: W, height: H, fill: 'none', stroke: TRIM_COLOUR, strokeWidth: thin }
  return {
    annotations: [{ type: 'trim', parts: [trim] }, ...prepared.sort((one, two) => one.order - two.order).map((item) => ({ type: item.type, id: item.id, label: item.label, parts: out.get(item) }))],
    frame
  }
}


/** Position a registered source crop without stretching the source image, inside any rules margin. */
export const referencePlacement = (template, frame = null) => {
  const box = template.reference?.alignment ?? { x: 0, y: 0, width: template.width, height: template.height }
  if (![template.width, template.height, box.x, box.y, box.width, box.height].every(Number.isFinite) || template.width <= 0 || template.height <= 0 || box.width <= 0 || box.height <= 0) throw new Error('A reference overlay needs a finite canvas and a positive registration rectangle.')
  const { left = 0, top = 0, right = 0, bottom = 0 } = frame ?? {}
  const width = template.width + left + right
  const height = template.height + top + bottom
  return {
    left: `${100 * (box.x + left) / width}%`,
    top: `${100 * (box.y + top) / height}%`,
    width: `${100 * box.width / width}%`,
    height: `${100 * box.height / height}%`
  }
}
