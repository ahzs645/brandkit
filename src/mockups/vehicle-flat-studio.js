// Accessible SVG fallback for browsers without WebGL. It edits the same canonical project as
// the 3D studio; the diagram is explicitly a generic flat layout, never an imported GLB render.
import { MAX_LAYERS, MAX_UPLOAD_BYTES, UPLOAD_TYPES, OPPOSITE, areasFor, clampPlacement, copyProject, createPlacement, createVehicleLayer, mirrorPlacement, reconcileLayers, selectedLayer, canEditLayer, validAspect, validateProject } from './vehicle-layout.js'
import { VEHICLE_MODELS, lengthOf } from './vehicle-models.js'
import { readMockupDraft } from './mockup-draft.js'
import { defaultConfiguration, normalizeConfiguration, hasCanopy, canopyTop, configurationSummary } from './vehicle-configuration.js'

const WIDTH = 1200
const HEIGHT = 680
const PREFIX = 'Flat layout · 3D is unavailable in this browser'
const VIEW_FOR_AREA = { left: 'side', right: 'opposite', 'left-body': 'side', 'right-body': 'opposite', 'left-bed': 'side', 'right-bed': 'opposite', hood: 'hood', rear: 'rear', 'canopy-rear': 'rear', 'canopy-roof': 'hood' }
const ASSETS = Object.fromEntries(Object.entries(VEHICLE_MODELS).map(([id, model]) => [id, { assetVersion: model.assetVersion, surfaceVersion: model.surfaceVersion, sha256: model.sha256 ?? null }]))
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c])
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const hex = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value ?? '') ? value : fallback
const imageUrl = (url) => typeof url === 'string' && /^data:image\/(?:svg\+xml|png|jpeg|webp)(?:;[^,]*)?,/i.test(url) ? url : null
const flatView = (view) => ['side', 'opposite', 'front', 'rear', 'hood'].includes(view) ? view : 'side'
const frameFor = (project, view) => {
  const side = ['side', 'opposite'].includes(view)
  const scale = side ? 910 / lengthOf(project.model) : view === 'hood' ? 450 / lengthOf(project.model) : 156
  return { scale, x: 600, y: view === 'hood' ? 340 : 526, side }
}

/** Physical surface coordinates mapped into the flat camera, independent of the DOM. */
export const flatAreaBox = (project, areaId, view = 'side') => {
  view = flatView(view)
  if (VIEW_FOR_AREA[areaId] !== view) return null
  const area = areasFor(project.model, project.configuration)[areaId]
  if (!area) return null
  const f = frameFor(project, view)
  const centre = view === 'hood' ? [f.x - area.origin[2] * f.scale, f.y + area.origin[0] * f.scale]
    : view === 'rear' ? [f.x - area.origin[2] * f.scale, f.y - area.origin[1] * f.scale]
      : [f.x + area.origin[0] * f.scale * (view === 'opposite' ? -1 : 1), f.y - area.origin[1] * f.scale]
  return { x: centre[0] - area.width * f.scale / 2, y: centre[1] - area.height * f.scale / 2,
    width: area.width * f.scale, height: area.height * f.scale, cx: centre[0], cy: centre[1], scale: f.scale }
}

const cab = 'M-3.04 .66 Q-3.04 .58 -2.96 .58 H-2.60 A.565 .565 0 0 0 -1.50 .58 H.56 V1.96 Q.56 2.04 .46 2.04 H-1 Q-1.1 2.04 -1.14 1.98 L-1.7 1.42 -2.95 1.34 Q-3.04 1.33 -3.04 1.22 Z'
const bed = (top = 1.3) => `M.64 .58 H1.20 A.565 .565 0 0 0 2.30 .58 H3.18 V${top} H.64Z`
const canopy = (config) => config.cover === 'raised'
  ? 'M.64 1.3H3.18V2.36Q3.18 2.44 3.10 2.44L1.08 2.46Q.64 2.46 .64 2.06Z'
  : `M.64 1.3H3.18V${canopyTop(config) - .08}Q3.18 ${canopyTop(config)} 3.08 ${canopyTop(config)}H.82Q.64 ${canopyTop(config)} .64 ${canopyTop(config) - .16}Z`
const path = (d, fill, attrs = '') => `<path d="${d}" fill="${fill}" stroke="#647180" stroke-width=".018" stroke-linejoin="round" ${attrs}/>`
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`
const wheel = (x) => `<g transform="translate(${x} .44)"><circle r=".44" fill="#17212c"/><circle r=".31" fill="#35424f"/><circle r=".245" fill="#b5c0ca" stroke="#e5eaf0" stroke-width=".025"/><circle r=".08" fill="#596978"/>${[0, 60, 120].map((r) => `<path d="M-.20 0H.20" stroke="#61717e" stroke-width=".045" transform="rotate(${r})"/>`).join('')}</g>`

const sideParts = (project) => {
  const truck = project.model.startsWith('truck')
  const service = project.model === 'truck-service'
  const c = project.configuration ?? {}
  const paint = hex(project.paint, '#ffffff')
  const componentPaint = hex(c.canopyPaint, paint)
  let paintShapes = ''
  let clip = ''
  let details = ''
  if (truck) {
    const body = `${path(cab, paint)}${path(bed(service ? 1.92 : 1.3), service ? componentPaint : paint)}`
    paintShapes = body
    clip = `<path d="${cab}"/><path d="${bed(service ? 1.92 : 1.3)}"/>`
    if (hasCanopy(c)) { paintShapes += path(canopy(c), componentPaint, 'data-component="canopy"'); clip += `<path d="${canopy(c)}"/>` }
    details += '<path d="M-1.50 1.46L-1.06 1.92H-.40V1.46ZM-.26 1.46V1.92H.36L.44 1.80V1.46Z" fill="#243c4c" stroke="#b5c6ce" stroke-width=".018"/>'
    details += '<path d="M-.33 .60V1.94M.50 .61V1.94M-1.50 .61V1.38" stroke="#89959d" stroke-width=".012"/>'
    for (const x of [-.6, .3]) details += rect(x - .08, 1.32, .16, .035, '#566775', 'rx=".012"')
    details += rect(-1.5, 1.48, .18, .24, '#253542', 'rx=".035"') + rect(-1.47, .43, 2.03, .045, '#8b99a6', 'rx=".02"')
    if (service) {
      details += '<path d="M1.1 .65V1.86M2.4 .65V1.86M1.1 1.09H2.4" stroke="#73818a" stroke-width=".015"/>'
      for (const x of [.88, 1.75, 2.82]) details += rect(x - .06, 1.5, .12, .035, '#778997')
    }
    if (c.cover === 'open' || c.cover === 'tonneau') details += rect(.64, 1.29, 2.54, c.cover === 'tonneau' ? .08 : .04, '#35424e', 'rx=".02"')
    if (hasCanopy(c) && c.sides === 'windows') {
      const h = canopyTop(c) - 1.71
      details += rect(.94, 1.52, 2.02, h + .04, '#687c89', 'rx=".06"') + rect(.99, 1.55, 1.92, h - .02, '#263f50', 'rx=".035"')
      details += rect(2.18, 1.55, .025, h - .02, '#8194a1')
    }
    if (hasCanopy(c) && c.sides === 'hatches') {
      details += rect(.84, 1.37, 2.20, canopyTop(c) - 1.48, 'none', 'rx=".05" stroke="#6b7b86" stroke-width=".015"')
      details += rect(1.85, 1.41, .18, .05, '#697c89', 'rx=".012"')
      for (const x of [1.18, 2.70]) details += rect(x - .08, canopyTop(c) - .17, .16, .025, '#697c89')
    }
    if (c.rack) {
      const base = service ? 1.92 : hasCanopy(c) ? canopyTop(c) : 1.32
      const roof = service ? 2.10 : hasCanopy(c) ? base + .18 : 2.28
      details += `<g data-component="rack" fill="none" stroke="#4e6371" stroke-width=".045"><path d="M.62 ${roof}H3.25M.76 ${base}V${roof}M3.10 ${base}V${roof}"/></g>`
    }
    details += rect(-3.28, .38, .30, .25, '#899caa', 'rx=".06"') + rect(3.18, .42, .28, .20, '#899caa', 'rx=".045"')
    details += rect(-3.06, 1.08, .09, .18, '#d9edf5', 'rx=".02"') + rect(3.16, .88, .045, .36, '#b23b42', 'rx=".012"')
    details += wheel(-2.05) + wheel(1.75)
  } else {
    const car = project.model === 'shc'
    const d = car ? 'M-2.28 .50L-2.24 .92 -1.45 1.12 -.97 1.66H.90L1.48 1.15 2.25 .99V.50H1.85A.40 .40 0 0 0 1.05 .50H-1.02A.40 .40 0 0 0 -1.82 .50Z'
      : 'M-2.28 .50V1.05L-1.46 1.21 -.96 1.92H1.24L1.65 1.30 2.25 1.14V.50H1.85A.40 .40 0 0 0 1.05 .50H-1.02A.40 .40 0 0 0 -1.82 .50Z'
    paintShapes = path(d, paint)
    clip = `<path d="${d}"/>`
    details = car ? '<path d="M-1.27 1.20L-.89 1.57H-.11V1.20ZM.02 1.20V1.57H.84L1.30 1.20Z" fill="#263f50"/>' : '<path d="M-1.24 1.27L-.87 1.81H-.11V1.27ZM.02 1.27V1.81H1.16L1.48 1.27Z" fill="#263f50"/>'
    details += '<path d="M-.06 .55V1.80M1.28 .55V1.17M-1.30 .55V1.17" stroke="#8d9ba4" stroke-width=".015"/>'
    details += rect(-.33, 1.14, .15, .035, '#687d8c') + rect(1.0, 1.14, .15, .035, '#687d8c')
    details += wheel(-1.42) + wheel(1.45)
  }
  return { paintShapes, clip, details }
}

const otherParts = (project, view) => {
  const truck = project.model.startsWith('truck')
  const service = project.model === 'truck-service'
  const c = project.configuration ?? {}
  const paint = hex(project.paint, '#ffffff')
  const finish = hex(c.canopyPaint, paint)
  const top = service ? 1.92 : hasCanopy(c) ? canopyTop(c) : truck ? 2.04 : 1.80
  let paintShapes = '', clip = '', details = ''
  if (view === 'hood') {
    const length = lengthOf(project.model)
    const shape = rect(-.99, -length / 2 + .16, 1.98, length - .32, paint, 'rx=".12" stroke="#6d7f8b" stroke-width=".02"')
    paintShapes = shape
    clip = rect(-.99, -length / 2 + .16, 1.98, length - .32, '#000', 'rx=".12"')
    if (truck && (hasCanopy(c) || service)) paintShapes += rect(-.98, .64, 1.96, 2.54, finish, 'rx=".08" stroke="#6d7f8b" stroke-width=".02"')
    if (truck && c.cover === 'open') details += rect(-.86, .72, 1.72, 2.39, '#394c59', 'rx=".07"')
    if (truck && c.cover === 'tonneau') details += rect(-.98, .64, 1.96, 2.54, '#394c59', 'rx=".07"')
    details += rect(-.86, -1.70, 1.72, .55, '#294655', 'rx=".06"') + rect(-.86, .38, 1.72, .15, '#294655')
    if (c.rack) details += '<path d="M-.95 .72H.95M-.95 1.92H.95M-.95 3.12H.95M-.95 .62V3.22M.95 .62V3.22" stroke="#526978" stroke-width=".06" fill="none"/>'
  } else {
    const shape = rect(-1, .58, 2, 1.45, paint, 'rx=".10" stroke="#6d7f8b" stroke-width=".018"')
    paintShapes = shape
    clip = rect(-1, .58, 2, 1.45, '#000', 'rx=".10"')
    if (view === 'rear' && truck) {
      paintShapes = rect(-1, .58, 2, .74, service ? finish : paint, 'rx=".06" stroke="#6d7f8b" stroke-width=".02"')
      clip = rect(-1, .58, 2, .74, '#000')
      if (hasCanopy(c) || service) { paintShapes += rect(-.98, 1.3, 1.96, top - 1.3, finish, 'rx=".07" stroke="#6d7f8b" stroke-width=".02"'); clip += rect(-.98, 1.3, 1.96, top - 1.3, '#000') }
      else details += rect(-.82, 1.47, 1.64, .44, '#294655', 'rx=".04"')
      details += rect(-.14, hasCanopy(c) ? 1.44 : 1.17, .28, .045, '#687e8e', 'rx=".012"')
      for (const x of [-.97, .84]) details += rect(x, .83, .13, .38, '#b54146', 'rx=".035"')
    } else {
      details += '<path d="M-.82 1.45L-.65 1.92H.65L.82 1.45Z" fill="#294655"/>'
      if (view === 'front') { details += rect(-.55, .80, 1.10, .37, '#2e424f', 'rx=".045"'); for (const x of [-.90, .60]) details += rect(x, 1.02, .30, .20, '#e5f2f6', 'rx=".04"') }
    }
    details += rect(-1.04, .36, 2.08, .22, '#92a3ae', 'rx=".06"')
    details += rect(-1.02, 0, .28, .40, '#21323e', 'rx=".08"') + rect(.74, 0, .28, .40, '#21323e', 'rx=".08"')
    if (c.rack && view === 'rear') details += `<path d="M-.95 ${top}V${top + .18}H.95V${top}" stroke="#526978" stroke-width=".05" fill="none"/>`
  }
  return { paintShapes, clip, details }
}

/** Standalone SVG of the actual project. Artwork URLs must be local image data URLs. */
export const vehicleFlatSvg = (project, { view = 'side', artworks = {}, wrapImage = null, guides = true, backdrop = null } = {}) => {
  view = flatView(view)
  const f = frameFor(project, view)
  const id = `vehicle-flat-${view}`
  const side = ['side', 'opposite'].includes(view)
  const transform = view === 'hood' ? `translate(${f.x} ${f.y}) scale(${f.scale})` : `translate(${f.x} ${f.y}) scale(${view === 'opposite' ? -f.scale : f.scale} ${-f.scale})`
  const parts = side ? sideParts(project) : otherParts(project, view)
  const top = hex(backdrop?.top, '#eef3f5'), bottom = hex(backdrop?.bottom, '#ffffff')
  const dark = project.backdrop === 'dark'
  const ink = dark ? '#d9e6ef' : '#203b50'
  const model = VEHICLE_MODELS[project.model]
  let defs = `<linearGradient id="${id}-bg" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient><clipPath id="${id}-body"><g transform="${transform}">${parts.clip}</g></clipPath>`
  let wrapping = ''
  const wrap = project.wrap
  if (wrap.coverage !== 'none' && imageUrl(wrapImage?.url) && (side || wrap.coverage === 'full')) {
    const rearOnly = side && wrap.coverage === 'rear'
    let x = 600 - lengthOf(project.model) * f.scale / 2, y = 526 - 2.52 * f.scale
    let width = lengthOf(project.model) * f.scale, height = 1.98 * f.scale
    if (rearOnly) {
      const half = project.model.startsWith('truck') ? .62 : -.1
      width = (lengthOf(project.model) / 2 - half) * f.scale
      x = view === 'opposite' ? 600 - lengthOf(project.model) / 2 * f.scale : 600 + half * f.scale
    }
    if (!side) { x = view === 'hood' ? 600 - 1.05 * f.scale : 600 - 1.05 * f.scale; y = view === 'hood' ? 110 : 526 - 2.52 * f.scale; width = 2.10 * f.scale; height = view === 'hood' ? 460 : 1.98 * f.scale }
    const aspect = wrapImage.aspect || 3
    const fit = Math.max(width / aspect, height) * wrap.scale
    const iw = fit * aspect, ih = fit
    const ix = x - (iw - width) * (wrap.offsetU + 1) / 2, iy = y - (ih - height) * (1 - wrap.offsetV) / 2
    defs += `<clipPath id="${id}-wrap-region">${rect(x, y, width, height, '#000')}</clipPath>`
    const mirror = view === 'opposite' && wrap.mirror ? `translate(${2 * x + width} 0) scale(-1 1)` : ''
    wrapping = `<g clip-path="url(#${id}-body)"><g clip-path="url(#${id}-wrap-region)"><image data-wrap="true" href="${escape(wrapImage.url)}" x="${ix}" y="${iy}" width="${iw}" height="${ih}" preserveAspectRatio="none" transform="${mirror}"/></g></g>`
  }
  let artwork = '', overlay = ''; const artworkParts = []
  const areas = areasFor(project.model, project.configuration)
  for (const [areaId, area] of Object.entries(areas)) {
    const box = flatAreaBox(project, areaId, view)
    if (!box) continue
    const clipId = `${id}-area-${areaId}`
    defs += `<clipPath id="${clipId}">${rect(box.x, box.y, box.width, box.height, '#000')}</clipPath>`
    if (guides) overlay += rect(box.x, box.y, box.width, box.height, 'transparent', `data-area="${areaId}" style="cursor:crosshair"`)
    for (const layer of project.layers ?? []) {
      const source = artworks[layer.id]
      const url = imageUrl(typeof source === 'string' ? source : source?.url)
      if (layer.area !== areaId || layer.unplaced || !layer.visible || !url || layer.artwork.kind === 'none') continue
      const p = layer.placement
      const cx = box.cx + p.u * box.scale, cy = box.cy - p.v * box.scale
      const w = p.width * box.scale, h = w / (source?.aspect || layer.aspect || 3)
      artworkParts.push({ index: project.layers.indexOf(layer), markup: `<g clip-path="url(#${clipId})"><image data-layer-id="${escape(layer.id)}" href="${escape(url)}" x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" transform="rotate(${-p.rotation} ${cx} ${cy})" style="cursor:${layer.locked ? 'default' : 'move'}"/></g>` })
      if (guides && layer.id === project.selectedLayerId) {
        const c = layer.locked ? '#8094a2' : '#127ef3'
        overlay += `<g pointer-events="none"><rect x="${cx - w / 2 - 4}" y="${cy - h / 2 - 4}" width="${w + 8}" height="${h + 8}" fill="none" stroke="${c}" stroke-width="1.5" stroke-dasharray="5 4" transform="rotate(${-p.rotation} ${cx} ${cy})"/><rect x="${Math.max(20, cx - 100)}" y="${cy + h / 2 + 12}" width="200" height="27" rx="13" fill="${dark ? '#223e50' : '#ffffff'}" opacity=".95"/><text x="${Math.max(120, cx)}" y="${cy + h / 2 + 30}" text-anchor="middle" font-size="12" fill="${ink}">${Math.round(p.width * 1000)} × ${Math.round(p.width / (layer.aspect || 3) * 1000)} mm${layer.locked ? ' · Locked' : ''}</text></g>`
      }
    }
  }
  artwork = artworkParts.sort((a, b) => a.index - b.index).map((part) => part.markup).join('')
  const heading = { side: 'LEFT ELEVATION', opposite: 'RIGHT ELEVATION', front: 'FRONT ELEVATION', rear: 'REAR ELEVATION', hood: 'ABOVE · FLAT LAYOUT' }[view]
  let dimension = ''
  if (side) {
    const half = lengthOf(project.model) * f.scale / 2
    dimension = `<g stroke="#8ca0ae" stroke-width="1"><path d="M${600 - half} 565V590M${600 + half} 565V590M${600 - half} 582H${600 + half}"/></g><rect x="495" y="569" width="210" height="25" fill="${bottom}"/><text x="600" y="586" text-anchor="middle" font-size="13" fill="${ink}">${lengthOf(project.model).toFixed(2)} m display length</text>`
  }
  const credit = model.creditRequired ? `${model.title} · ${model.creator} · ${model.licence} · flat schematic, not source mesh` : 'Generic schematic · Original brand artwork · Verify dimensions before production'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escape(model.label)} ${heading.toLowerCase()}, generic flat layout"><defs>${defs}</defs><rect width="1200" height="680" fill="url(#${id}-bg)"/><g font-family="Arial, sans-serif"><text x="56" y="70" font-size="14" font-weight="700" letter-spacing="2.5" fill="${ink}">${heading}</text><text x="56" y="96" font-size="13" fill="${ink}" opacity=".65">${escape(configurationSummary(project.model, project.configuration) || model.label)}</text><rect x="946" y="48" width="198" height="31" rx="15" fill="${dark ? '#294555' : '#dde7ed'}"/><text x="1045" y="68" text-anchor="middle" font-size="12" fill="${ink}">FLAT PREVIEW · NO WEBGL</text><ellipse cx="600" cy="533" rx="${side ? 470 : 185}" ry="10" fill="#162a49" opacity=".08"/><g transform="${transform}">${parts.paintShapes}</g>${wrapping}<g transform="${transform}">${parts.details}</g>${overlay}${artwork}${dimension}<text x="600" y="635" text-anchor="middle" font-size="11" fill="${ink}" opacity=".72">${escape(credit)}</text></g></svg>`
}

// Image inspection is DOM-only and never imports or initializes Three.js.
const decodeSvg = (url) => { const [header, ...rest] = url.split(','); const body = rest.join(','); return header.includes(';base64') ? new TextDecoder().decode(Uint8Array.from(atob(body), (c) => c.charCodeAt(0))) : decodeURIComponent(body) }
const inspectSvg = (source) => {
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('Use an SVG without document entities.')
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml')
  if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') throw new Error('The SVG could not be read.')
  if (doc.querySelector('script,foreignObject,iframe,object,embed')) throw new Error('Use an SVG containing artwork only.')
  for (const element of doc.querySelectorAll('*')) for (const a of element.attributes) {
    if (/^on/i.test(a.name)) throw new Error('Use an SVG without event handlers.')
    if (/href$/i.test(a.name) && a.value && !a.value.startsWith('#') && !/^data:image\/(png|jpeg|webp);base64,/i.test(a.value)) throw new Error('Embed linked images in the SVG before uploading it.')
  }
  if (/@import/i.test(source) || [...source.matchAll(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi)].some((match) => !match[2].startsWith('#'))) throw new Error('Remove external resources from the SVG.')
  return doc
}
const readImage = async (url) => {
  if (!imageUrl(url)) throw new Error('Artwork must be an embedded image.')
  let exactAspect = null
  if (url.startsWith('data:image/svg+xml')) {
    const doc = inspectSvg(decodeSvg(url)), svg = doc.documentElement
    const box = svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number)
    if (box?.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0) {
      exactAspect = box[2] / box[3]
      const scale = 2048 / Math.max(box[2], box[3])
      svg.setAttribute('width', String(box[2] * scale)); svg.setAttribute('height', String(box[3] * scale))
    }
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`
  }
  const image = new Image(); image.src = url; await image.decode()
  if (!image.naturalWidth || !image.naturalHeight || Math.max(image.naturalWidth, image.naturalHeight) > 16384) throw new Error('Use artwork smaller than 16,384 pixels on each side.')
  const aspect = exactAspect ?? image.naturalWidth / image.naturalHeight
  if (!validAspect(aspect)) throw new Error('Use artwork with proportions between 1:10 and 20:1.')
  return { url, aspect }
}
const fileData = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('The artwork could not be read.')); reader.readAsDataURL(file) })

/** API-compatible fallback. Same project, editing operations, validation and save format. */
export const createVehicleFlatStudio = ({ container, project: initial, fallback, artworkUrl, wrapUrl, backdropFor, logos, patterns, files, storageKey, onChange, onStatus, onRecovery }) => {
  const context = { logos, patterns, files, assets: ASSETS }
  const baseline = validateProject(fallback, context)
  let state = validateProject(initial ?? fallback, context)
  let view = 'side', mode = 'edit', busy = true, ready = false, disposed = false, liveBefore = null, gesture = null
  let imageToken = 0, fontRefreshPending = false, pendingImages = null
  let art = {}, wrapImage = null
  const cache = new Map(), history = { undo: [], redo: [] }
  const host = document.createElement('div')
  host.className = 'vehicle-flat-studio'; host.tabIndex = 0
  host.setAttribute('aria-label', 'Flat vehicle artwork editor. Select artwork and drag it or use the position controls.')
  Object.assign(host.style, { position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'pan-y', outlineOffset: '-3px' })
  container.prepend(host)
  container.dataset.renderer = 'flat'; container.dataset.preview = 'flat'
  const status = (message = '', error = false) => { if (!disposed) onStatus?.(message ? `${PREFIX} · ${message}` : PREFIX, error) }
  const areas = () => areasFor(state.model, state.configuration)
  const selection = () => selectedLayer(state)
  const sync = () => { reconcileLayers(state); state.assetReferences ??= {}; for (const id of new Set([state.model, ...state.layers.map((layer) => layer.model)])) state.assetReferences[id] ??= { ...ASSETS[id] } }
  const snapshot = () => { sync(); return copyProject(state) }
  const emit = () => { if (!disposed) { sync(); const selected = selection(); onChange?.({ project: snapshot(), ready, busy, mode, view, aspect: selected?.aspect ?? 3, preview: art[selected?.id]?.url ?? null, wrapPreview: wrapImage?.url ?? null, selectedLayer: selected ? { ...selected } : null, unplacedCount: state.layers.filter((layer) => layer.unplaced).length, canUndo: history.undo.length > 0, canRedo: history.redo.length > 0, model: VEHICLE_MODELS[state.model], renderer: 'flat', previewType: 'flat', flat: true }) } }
  const render = () => {
    if (disposed) return
    sync()
    host.innerHTML = vehicleFlatSvg(state, { view, artworks: art, wrapImage, backdrop: backdropFor?.(state.backdrop) })
    const svg = host.firstElementChild
    svg.style.width = '100%'; svg.style.height = '100%'; svg.style.display = 'block'
    container.dataset.layers = String(state.layers.length)
    container.dataset.unplaced = String(state.layers.filter((layer) => layer.unplaced).length)
    container.dataset.decals = String(host.querySelectorAll('[data-layer-id]').length)
    container.dataset.wraps = String(host.querySelectorAll('[data-wrap]').length)
    container.dataset.activeArea = selection() && !selection().unplaced && selection().visible && flatAreaBox(state, selection().area, view) ? selection().area : ''
    emit()
  }
  const persist = () => { if (!storageKey) return; try { localStorage.setItem(storageKey, JSON.stringify(snapshot())) } catch { status('Draft storage is full. Save JSON to keep a copy.', true) } }
  const remember = (before) => { if (eq(before, state)) return; history.undo.push(before); if (history.undo.length > 30) history.undo.shift(); history.redo = []; if (state.livery && before.livery === state.livery) state.livery = null; persist() }
  // Resolve a stable project snapshot and publish only the latest image generation. Live text
  // edits must not disable their own input while an SVG decodes; a later keystroke wins.
  const prepareImages = async () => {
    const token = ++imageToken
    const source = snapshot()
    const nextArt = {}
    for (const layer of source.layers) {
      if (layer.artwork.kind === 'none') continue
      const key = `art:${JSON.stringify(layer.artwork)}`
      let loaded = cache.get(key)
      if (!loaded) {
        loaded = await readImage(layer.artwork.kind === 'upload' ? layer.artwork.upload?.dataUrl : await artworkUrl(layer.artwork))
        if (token !== imageToken || disposed) return null
        cache.set(key, loaded)
      }
      nextArt[layer.id] = loaded
    }
    let nextWrap = null
    if (source.wrap.coverage !== 'none') {
      const key = `wrap:${JSON.stringify({ ...source.wrap, scale: 1, offsetU: 0, offsetV: 0, mirror: true })}`
      nextWrap = cache.get(key)
      if (!nextWrap) {
        nextWrap = await readImage(source.wrap.source === 'upload' ? source.wrap.upload?.dataUrl : await wrapUrl(source.wrap))
        if (token !== imageToken || disposed) return null
        cache.set(key, nextWrap)
      }
    }
    while (cache.size > 40) cache.delete(cache.keys().next().value)
    if (token !== imageToken || disposed) return null
    sync()
    for (const layer of state.layers) {
      const loaded = nextArt[layer.id]
      if (!loaded) continue
      layer.aspect = loaded.aspect
      if (!layer.unplaced && areas()[layer.area]) layer.placement = clampPlacement(layer.placement, layer.area, layer.aspect, areas())
    }
    art = nextArt; wrapImage = nextWrap; sync()
    return true
  }
  const refresh = () => {
    const task = prepareImages()
    pendingImages = task
    const settled = () => { if (pendingImages === task) pendingImages = null }
    task.then(settled, settled)
    return task
  }
  const flushFontRefresh = () => {
    if (!fontRefreshPending || busy || disposed) return
    fontRefreshPending = false
    queueMicrotask(() => { if (!disposed) api.refreshArtwork() })
  }
  const edit = async (change, { live = false, images = false } = {}) => {
    if (busy || disposed) return false
    cancel()
    if (!live && liveBefore) commit()
    const before = snapshot()
    if (live) liveBefore ??= before
    let token = imageToken
    try {
      change(); sync()
      state = validateProject(state, context)
      if (images) {
        if (!live) busy = true
        render()
        const pending = refresh(); token = imageToken
        if (await pending === null) return false
      }
      if (!live) remember(before)
      // Blur can commit while the latest image is decoding. Persist its final aspect and fit.
      else if (!liveBefore) persist()
      busy = false; render(); flushFontRefresh(); return true
    } catch (error) {
      if (disposed || token !== imageToken) return false
      state = before; busy = false; render(); flushFontRefresh(); status(error.message, true); return false
    }
  }
  const placementEdit = (fn, options) => {
    if (!canEditLayer(state)) return false
    return edit(() => { const layer = selection(); layer.placement = clampPlacement(fn(layer.placement), layer.area, layer.aspect, areas()) }, options)
  }
  const cameraView = (next) => { cancel(); view = flatView(next); render(); return true }
  const commit = () => { if (!liveBefore) return; const before = liveBefore; liveBefore = null; remember(before); render() }
  const restore = async (direction) => {
    if (busy || !history[direction].length) return false
    cancel()
    const before = snapshot(), next = history[direction].pop(); busy = true
    try { state = copyProject(next); sync(); await refresh(); history[direction === 'undo' ? 'redo' : 'undo'].push(before); persist(); busy = false; render(); flushFontRefresh(); status(`${direction === 'undo' ? 'Undo' : 'Redo'} applied.`); return true }
    catch (error) { state = before; history[direction].push(next); busy = false; render(); flushFontRefresh(); status(error.message, true); return false }
  }
  const api = {
    get project () { return snapshot() },
    setMode(next) { cancel(); mode = next === 'view' ? 'view' : 'edit'; container.dataset.mode = mode; render() },
    cameraView,
    selectLayer(id) { if (busy || !state.layers.some((layer) => layer.id === id)) return false; cancel(); state.selectedLayerId = id; sync(); if (!selection().unplaced) view = VIEW_FOR_AREA[selection().area] ?? 'side'; render(); persist(); return true },
    async selectArea(id) {
      if (!areas()[id] || busy) return false
      const existing = state.layers.find((layer) => !layer.unplaced && layer.area === id)
      if (existing) return api.selectLayer(existing.id)
      return api.addLayer(id)
    },
    async addLayer(area = state.area) {
      if (!areas()[area]) return false
      let id
      const success = await edit(() => { const layer = createVehicleLayer(state, area, selection()?.artwork ?? baseline.layers[0]?.artwork, { aspect: selection()?.aspect ?? 3 }); state.layers.push(layer); state.selectedLayerId = id = layer.id }, { images: true })
      if (success) { cameraView(VIEW_FOR_AREA[area]); status('Independent artwork layer added.') }
      return success ? id : false
    },
    async duplicateLayer(id = state.selectedLayerId) {
      const original = state.layers.find((layer) => layer.id === id)
      if (!original || state.layers.length >= MAX_LAYERS) return false
      let nextId
      const result = await edit(() => { const copy = copyProject(state).layers.find((layer) => layer.id === id); let n = 1; while (state.layers.some((layer) => layer.id === `layer-${n}`)) n++; copy.id = nextId = `layer-${n}`; copy.name = `${copy.name.slice(0, 93)} · copy`; copy.locked = false; state.layers.push(copy); state.selectedLayerId = copy.id }, { images: true })
      return result ? nextId : false
    },
    removeLayer(id = state.selectedLayerId) { return edit(() => { state.layers = state.layers.filter((layer) => layer.id !== id) }, { images: true }) },
    updateLayer(changes) { if (!selection()) return false; return edit(() => { const layer = selection(); if (typeof changes.name === 'string') layer.name = changes.name.slice(0, 100); if (typeof changes.visible === 'boolean') layer.visible = changes.visible; if (typeof changes.locked === 'boolean') layer.locked = changes.locked }) },
    moveLayer(direction) { const i = state.layers.findIndex((layer) => layer.id === state.selectedLayerId), j = i + direction; if (![-1, 1].includes(direction) || i < 0 || j < 0 || j >= state.layers.length) return false; return edit(() => { [state.layers[i], state.layers[j]] = [state.layers[j], state.layers[i]] }) },
    remapLayer(id, area) { const candidate = state.layers.find((entry) => entry.id === id); if (!candidate || candidate.locked || !areas()[area]) return false; const result = edit(() => { const layer = state.layers.find((entry) => entry.id === id); layer.model = state.model; layer.area = area; layer.targetConfiguration = state.configuration ? { ...state.configuration } : null; layer.placement = clampPlacement(layer.placement, area, layer.aspect, areas()); state.selectedLayerId = id }); cameraView(VIEW_FOR_AREA[area]); return result },
    async setConfiguration(changes) { if (!state.configuration) return false; const result = await edit(() => { state.configuration = normalizeConfiguration(state.model, { ...state.configuration, ...changes }) }); if (result) status(state.layers.some((layer) => layer.unplaced) ? 'Artwork retained under Unplaced artwork.' : 'Configuration updated.'); return result },
    async setModel(id) { if (!VEHICLE_MODELS[id] || id === state.model) return false; const result = await edit(() => { state.model = id; state.configuration = defaultConfiguration(id) }); if (result) { cameraView('side'); status('Vehicle changed. Existing artwork remains attached to its original vehicle.') } return result },
    setPaint(value, options) { if (!/^#[0-9a-f]{6}$/i.test(value)) return false; return edit(() => { state.paint = value.toLowerCase() }, options) },
    setBackdrop(id) { return edit(() => { state.backdrop = id }) },
    setArtwork(changes, options = {}) { if (!canEditLayer(state)) return false; return edit(() => { selection().artwork = { ...selection().artwork, ...changes } }, { ...options, images: true }) },
    async setWrap(changes, options = {}) { const result = await edit(() => { state.wrap = { ...state.wrap, ...changes, colours: [...(changes.colours ?? state.wrap.colours)] } }, { ...options, images: true }); if (result) status(state.wrap.coverage === 'none' ? 'Wrap removed.' : 'Wrap applied to the flat painted silhouette.'); return result },
    async upload(file, { target = 'artwork' } = {}) {
      if (busy || !file || (target !== 'wrap' && !canEditLayer(state))) return false
      try {
        if (file.size > MAX_UPLOAD_BYTES) throw new Error('Choose artwork smaller than 5 MB.')
        if (!UPLOAD_TYPES.includes(file.type)) throw new Error('Choose PNG, JPEG, WebP or SVG artwork.')
        const selectedId = state.selectedLayerId, dataUrl = await fileData(file), loaded = await readImage(dataUrl)
        if (disposed || busy || (target !== 'wrap' && selectedId !== state.selectedLayerId)) return false
        const upload = { name: file.name.slice(0, 120), dataUrl, aspect: loaded.aspect }
        return target === 'wrap' ? api.setWrap({ source: 'upload', upload, coverage: state.wrap.coverage === 'none' ? 'sides' : state.wrap.coverage }) : api.setArtwork({ kind: 'upload', upload })
      } catch (error) { status(error.message, true); return false }
    },
    setPlacement: (changes, options) => placementEdit((p) => ({ ...p, ...changes }), options),
    centre: () => placementEdit((p) => ({ ...p, u: 0, v: 0 })),
    fit: () => placementEdit((p) => ({ ...p, u: 0, v: 0, width: 100 })),
    resetArea: () => placementEdit(() => createPlacement(state.area, selection()?.aspect ?? 3, areas())),
    commit,
    undo: () => restore('undo'), redo: () => restore('redo'),
    copyToOtherSide: () => api.copyOpposite(),
    copyOpposite() { if (!canEditLayer(state) || !OPPOSITE[state.area] || !areas()[OPPOSITE[state.area]]) return false; return edit(() => { const layer = selection(); const { area, placement } = mirrorPlacement(layer.placement, layer.area, layer.aspect, areas()); state.layers.push(createVehicleLayer(state, area, layer.artwork, { placement, aspect: layer.aspect, name: `${layer.name} · opposite` })) }, { images: true }) },
    saveProject: () => JSON.stringify(snapshot(), null, 2),
    async openProject(content) { try { return await api.applyProject(JSON.parse(content), 'Mockup opened.') } catch { status('That file is not a saved mockup.', true); return false } },
    async applyProject(next, message = 'Mockup opened.') {
      let checked
      try { checked = validateProject(next, context) } catch (error) { status(error.message, true); return false }
      const result = await edit(() => { state = checked }, { images: true })
      if (result) { if (!selection()?.unplaced) cameraView(VIEW_FOR_AREA[state.area]); status(message) }
      return result
    },
    async refreshArtwork() {
      if (disposed) return false
      if (busy) { fontRefreshPending = true; return false }
      cache.clear()
      const pending = refresh(), token = imageToken
      try { if (await pending === null) return false; if (!liveBefore) persist(); render(); return true }
      catch (error) { if (token !== imageToken || disposed) return false; render(); status(error.message, true); return false }
    },
    async exportPng() {
      if (busy || !ready || disposed) return null
      try { while (pendingImages) await pendingImages } catch (error) { status(error.message, true); return null }
      if (busy || disposed) return null
      cancel()
      busy = true; emit()
      try {
        const svg = vehicleFlatSvg(snapshot(), { view, artworks: art, wrapImage, guides: false, backdrop: backdropFor?.(state.backdrop) })
        const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; await image.decode()
        const canvas = document.createElement('canvas'); canvas.width = 2400; canvas.height = 1500
        const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('PNG export is unavailable. Save JSON to keep the design.')
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 2400, 1500); ctx.drawImage(image, 0, 70, 2400, 1360)
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png')); if (!blob) throw new Error('The flat image could not be exported.')
        status('Flat PNG exported without editing guides.'); return blob
      } catch (error) { status(error.message, true); return null } finally { busy = false; emit(); flushFontRefresh() }
    },
    dispose() { cancel(); disposed = true; imageToken++; host.removeEventListener('pointerdown', down); host.removeEventListener('pointermove', move); host.removeEventListener('pointerup', up); host.removeEventListener('pointercancel', cancel); host.removeEventListener('lostpointercapture', cancel); host.removeEventListener('keydown', key); host.remove(); cache.clear() }
  }
  const point = (event) => { const svg = host.firstElementChild, p = svg.createSVGPoint(); p.x = event.clientX; p.y = event.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()) }
  const down = (event) => {
    if (busy || mode !== 'edit' || event.button !== 0) return
    const image = event.target.closest?.('[data-layer-id]')
    if (!image) { const area = event.target.closest?.('[data-area]')?.dataset.area; if (area) api.selectArea(area); return }
    api.selectLayer(image.dataset.layerId)
    if (!canEditLayer(state)) return
    const p = point(event), layer = selection()
    gesture = { id: event.pointerId, before: snapshot(), start: { ...layer.placement }, point: p, layerId: layer.id, scale: frameFor(state, view).scale }
    host.style.touchAction = 'none'; host.setPointerCapture(event.pointerId); host.focus(); event.preventDefault()
  }
  const move = (event) => { if (!gesture || gesture.id !== event.pointerId) return; const layer = state.layers.find((item) => item.id === gesture.layerId); if (busy || !layer || !canEditLayer(state)) { cancel(); return }; const p = point(event); layer.placement = clampPlacement({ ...gesture.start, u: gesture.start.u + (p.x - gesture.point.x) / gesture.scale, v: gesture.start.v - (p.y - gesture.point.y) / gesture.scale }, layer.area, layer.aspect, areas()); render(); event.preventDefault() }
  const up = (event) => { if (!gesture || gesture.id !== event.pointerId) return; const before = gesture.before; gesture = null; host.style.touchAction = 'pan-y'; if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId); remember(before); render() }
  const cancel = () => { if (!gesture) return; const active = gesture; gesture = null; state = active.before; host.style.touchAction = 'pan-y'; if (host.hasPointerCapture(active.id)) host.releasePointerCapture(active.id); render() }
  const key = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? api.redo() : api.undo(); return }
    if (event.key === 'Escape') { cancel(); return }
    if (!canEditLayer(state) || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault(); const step = event.shiftKey ? .05 : .01
    api.setPlacement({ u: selection().placement.u + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), v: selection().placement.v + (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0) })
  }
  host.addEventListener('pointerdown', down); host.addEventListener('pointermove', move); host.addEventListener('pointerup', up); host.addEventListener('pointercancel', cancel); host.addEventListener('lostpointercapture', cancel); host.addEventListener('keydown', key)
  render(); status()
  ;(async () => {
    try { await refresh(); ready = true; busy = false; render(); flushFontRefresh(); status() }
    catch (error) {
      let recovery = null
      if (storageKey) {
        const recovered = readMockupDraft({ key: storageKey, validate: () => { throw error } })
        storageKey = recovered.storageKey; recovery = recovered.recovery
        if (recovery) onRecovery?.(recovery)
      }
      state = copyProject(baseline); cache.clear()
      try { await refresh() } catch { /* The layout stays usable even if the brand asset is unavailable. */ }
      ready = true; busy = false; render(); flushFontRefresh()
      status(recovery?.message ?? `Artwork could not be loaded: ${error.message}. The starting design has been restored.`, true)
    }
  })()
  return api
}
