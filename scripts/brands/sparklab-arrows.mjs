// Filled repeats built from the source polygon. Scaling and rotation never redraw the arrow.
import { readFileSync } from 'node:fs'
import { pattern } from '../../src/engine/artwork.js'
import { escape } from '../../src/engine/format.js'

export const arrowGeometry = (logo) => {
  const values = logo.arrow.match(/-?\d+(?:\.\d+)?/g).map(Number)
  const points = Array.from({ length: values.length / 2 }, (_, i) => [values[i * 2], values[i * 2 + 1]])
  const minX = Math.min(...points.map(p => p[0])), minY = Math.min(...points.map(p => p[1]))
  const width = Math.max(...points.map(p => p[0])) - minX, height = Math.max(...points.map(p => p[1])) - minY
  const vertices = points.map(([x, y]) => [Number((x - minX).toFixed(5)), Number((y - minY).toFixed(5))])
  const path = `M${vertices.map(p => p.join(' ')).join('L')}Z`
  // The top-right tip and the midpoint of the tail define the source's direction.
  const tail = [(vertices[5][0] + vertices[6][0]) / 2, (vertices[5][1] + vertices[6][1]) / 2]
  const heading = Math.atan2(vertices[1][1] - tail[1], vertices[1][0] - tail[0]) * 180 / Math.PI
  // A rounded box encloses the original spark's curves, including their small overshoots.
  // Keep the source path verbatim and translate its origin, rather than redrawing it.
  const spark = { width: 238, height: 236, origin: [67, 25], path: logo.spark }
  return { width, height, vertices, path, heading, spark }
}

export const ARROW_STUDIES = [
  { id: 'micro', name: 'Micro repeat', detail: 'Small arrows, one steady direction. A quiet texture for wraps, backs and borders.', palette: 'navy' },
  { id: 'rows', name: 'Staggered rows', detail: 'A medium-scale repeat with offset rows and a recurring orange beat.', palette: 'cream' },
  { id: 'crops', name: 'Oversized crops', detail: 'The same arrow at a much larger scale. Bold enough for a cover or a wall.', palette: 'orange' },
  { id: 'mixed', name: 'Mixed scales', detail: 'Three sizes share one modular grid. Small ideas build into larger ones.', palette: 'cream' },
  { id: 'inward', name: 'Inward rings', detail: 'Arrows grow as they approach an open centre. A focal composition for invitations and covers.', palette: 'navy' },
  { id: 'pinwheel', name: 'Meeting points', detail: 'Four arrows point into each meeting point. Two cluster sizes repeat across the field.', palette: 'cream' },
  { id: 'directions', name: 'All directions', detail: 'Eight directions and three arrow sizes share a modular field. A repeat for ideas moving every way.', palette: 'cream' },
  { id: 'scatter', name: 'Loose scatter', detail: 'Small, medium and large arrows sit at varied angles with generous space between them.', palette: 'navy' },
  { id: 'currents', name: 'Cross currents', detail: 'Alternating streams flow in opposite directions. The arrows swell and recede along each wave.', palette: 'cream' },
  { id: 'spark-mix', name: 'Arrows & sparks', detail: 'The original arrow and spark trade places in a repeat of different directions and sizes.', palette: 'orange' },
  { id: 'orbit', name: 'Orbit', detail: 'Arrows follow three elliptical paths around a spark. A focal composition for a cover or invitation.', palette: 'navy', focal: true },
  { id: 'constellation', name: 'Spark constellation', detail: 'Sparks in four sizes punctuate a field of tiny dots. A quieter alternative to an arrow pattern.', palette: 'cream' }
]

// Kept self-contained so the offline explorer uses exactly the same generator as the kit.
export function arrowField(geometry, mode, width = 960, height = 600, options = {}) {
  const r = n => Number(n.toFixed(5))
  const size = (options.size ?? 100) / 100, density = (options.density ?? 100) / 100
  const palette = options.palette ?? ({ micro: 'navy', rows: 'cream', crops: 'orange', mixed: 'cream', inward: 'navy', pinwheel: 'cream', directions: 'cream', scatter: 'navy', currents: 'cream', 'spark-mix': 'orange', orbit: 'navy', constellation: 'cream' }[mode])
  const inks = palette === 'navy' ? ['slate', 'cream', 'orange'] : palette === 'orange' ? ['navy', 'cream', 'cream'] : ['navy', 'slate', 'orange']
  const place = [], dots = []
  const add = (cx, cy, h, colour, rotation = 0, symbol = 'arrow') => {
    const shape = symbol === 'spark' ? geometry.spark : geometry
    const scale = h / shape.height
    place.push({ x: r(cx - shape.width * scale / 2), y: r(cy - h / 2), scale: r(scale), colour, symbol, ...(rotation ? { rotation: r(rotation) } : {}) })
  }
  const toward = (cx, cy, tx, ty) => Math.atan2(ty - cy, tx - cx) * 180 / Math.PI - geometry.heading
  if (['micro', 'rows', 'crops'].includes(mode)) {
    const pitch = mode === 'micro' ? [48, 50] : mode === 'rows' ? [120, 100] : [320, 300]
    const cols = Math.max(1, Math.round(width / pitch[0] * density)), rows = Math.max(1, Math.round(height / pitch[1] * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = -1; col <= cols; col++) {
      const offset = mode === 'micro' ? .5 : row % 2 * .5
      const accent = mode === 'micro' ? (col + row * 5) % 20 === 0 : mode === 'rows' ? (col + row * 2) % 4 === 0 : (col + row) % 3 === 0
      add((col + offset) * dx, (row + .5) * dy, (mode === 'micro' ? 27 : mode === 'rows' ? 64 : 286) * size, accent ? inks[2] : inks[0])
    }
  } else if (mode === 'mixed' || mode === 'directions') {
    const cols = Math.max(1, Math.round(width / 240 * density)), rows = Math.max(1, Math.round(height / 300 * density))
    const dx = width / cols, dy = height / rows
    const depths = [0, 2, 1, 2, 1, 0, 2, 1]
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const depth = depths[(row * cols + col) % depths.length], divisions = 2 ** depth
      for (let y = 0; y < divisions; y++) for (let x = 0; x < divisions; x++) {
        const accent = (col + row + x + y) % 4 === 0
        const rotation = mode === 'directions' ? ((col * 3 + row * 5 + x * 3 + y) % 8) * 45 : 0
        add((col + (x + .5) / divisions) * dx, (row + (y + .5) / divisions) * dy, Math.min(dx, dy) / divisions * (mode === 'directions' ? .52 : .65) * size, accent ? inks[2] : depth === 2 ? inks[1] : inks[0], rotation)
      }
    }
  } else if (mode === 'inward') {
    const unit = Math.min(width / 960, height / 600), cx = width / 2, cy = height / 2
    for (let ring = 0; ring < 6; ring++) {
      const radius = (126 + ring * 82) * unit, h = [56, 46, 36, 28, 23, 19][ring] * unit * size
      const count = Math.max(6, Math.round(2 * Math.PI * radius / ([56, 46, 36, 28, 23, 19][ring] * unit * 1.9) * density))
      for (let i = 0; i < count; i++) {
        const angle = (i + ring % 2 * .5) / count * Math.PI * 2
        const x = cx + Math.cos(angle) * radius, y = cy + Math.sin(angle) * radius
        add(x, y, h, ring === 0 ? inks[2] : ring === 1 ? inks[1] : inks[0], toward(x, y, cx, cy))
      }
    }
  } else if (mode === 'pinwheel') {
    const cols = Math.max(1, Math.round(width / 240 * density)), rows = Math.max(1, Math.round(height / 300 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const cx = (col + .5) * dx, cy = (row + .5) * dy, large = (row + col) % 2 === 0
      const h = Math.min(dx, dy) * (large ? .28 : .19) * size, radius = Math.min(dx, dy) * (large ? .3 : .235)
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4 + .125) * Math.PI * 2
        const x = cx + Math.cos(angle) * radius, y = cy + Math.sin(angle) * radius
        add(x, y, h, i === 2 ? inks[2] : inks[0], toward(x, y, cx, cy))
      }
    }
  } else if (mode === 'scatter' || mode === 'spark-mix') {
    const cols = Math.max(1, Math.round(width / 120 * density)), rows = Math.max(1, Math.round(height / 120 * density))
    const dx = width / cols, dy = height / rows
    // Coordinate hashes keep every preview and export identical, including after reload.
    const hash = (col, row, salt) => { const n = Math.sin(col * 127.1 + row * 311.7 + salt * 74.7) * 43758.5453; return n - Math.floor(n) }
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const choice = Math.floor(hash(col, row, 1) * 3), spark = mode === 'spark-mix' && (col + row * 2) % 4 === 0
      const jitterX = (hash(col, row, 2) - .5) * .13, jitterY = (hash(col, row, 3) - .5) * .13
      const rotation = Math.floor(hash(col, row, 4) * 8) * 45 + (mode === 'scatter' ? (hash(col, row, 5) - .5) * 20 : 0)
      const h = Math.min(dx, dy) * [ .23, .38, .56 ][choice] * size
      const colour = spark ? inks[1] : (col + row * 3) % 7 === 0 ? inks[2] : inks[0]
      add((col + .5 + jitterX) * dx, (row + .5 + jitterY) * dy, h, colour, spark ? 0 : rotation, spark ? 'spark' : 'arrow')
    }
  } else if (mode === 'currents') {
    const cols = Math.max(3, Math.round(width / 75 * density)), rows = Math.max(2, Math.round(height / 150 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const phase = (col + .5) / cols * Math.PI * 4 + row * Math.PI / 2
      const cy = (row + .5) * dy + Math.sin(phase) * dy * .19
      const slope = Math.cos(phase) * dy * .19 * Math.PI * 4 / width
      const direction = Math.atan2(slope, 1) * 180 / Math.PI + (row % 2 ? 180 : 0)
      const h = Math.min(dx, dy) * (.3 + .32 * (1 + Math.sin(phase + 1)) / 2) * size
      add((col + .5) * dx, cy, h, (col + row * 2) % 6 === 0 ? inks[2] : inks[0], direction - geometry.heading)
    }
  } else if (mode === 'orbit') {
    const unit = Math.min(width / 960, height / 600), cx = width / 2, cy = height / 2
    for (let ring = 0; ring < 3; ring++) {
      const rx = [150, 280, 420][ring] * unit, ry = [85, 160, 245][ring] * unit
      const count = Math.max(6, Math.round([10, 24, 42][ring] * density))
      for (let i = 0; i < count; i++) {
        const angle = (i + ring / 3) / count * Math.PI * 2
        const direction = Math.atan2(ry * Math.cos(angle), -rx * Math.sin(angle)) * 180 / Math.PI
        add(cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry, [48, 34, 23][ring] * unit * size, i % 7 === 0 ? inks[2] : ring === 0 ? inks[1] : inks[0], direction - geometry.heading)
      }
    }
    add(cx, cy, 68 * unit * size, inks[2], 0, 'spark')
  } else if (mode === 'constellation') {
    const cols = Math.max(2, Math.round(width / 80 * density)), rows = Math.max(2, Math.round(height / 75 * density))
    const dx = width / cols, dy = height / rows
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const cx = (col + .5) * dx, cy = (row + .5) * dy
      if ((col + row * 2) % 3 === 0) {
        const level = (col * 3 + row) % 4
        add(cx, cy, Math.min(dx, dy) * [.18, .28, .43, .66][level] * size, level === 3 ? inks[2] : inks[0], 0, 'spark')
      } else dots.push({ cx: r(cx), cy: r(cy), r: r(1.4 * size), colour: palette === 'cream' ? 'muted' : inks[0] })
    }
  } else throw new Error(`Unknown arrow study: ${mode}`)
  return { width, height, background: palette, place, ...(dots.length ? { dots } : {}) }
}

export const arrowPatterns = (logo) => {
  const geometry = arrowGeometry(logo)
  return ARROW_STUDIES.map(s => ({ ...arrowField(geometry, s.id), id: `arrows-${s.id}`, name: `Arrows / ${s.name}`, title: `{name} / arrows and sparks / ${s.name}`, description: s.detail }))
}

// Bake the same placements into template paths; crop polygons at the panel boundary.
// This keeps the pattern vector-based in SVG, PDF and Office, and clear of neighbouring text.
export const arrowPanel = (geometry, mode, width, height, x, y, prefix, options = {}) => {
  const spec = arrowField(geometry, mode, width, height, options)
  const crop = (vertices) => {
    for (const [axis, edge, keep] of [[0, 0, 1], [0, width, -1], [1, 0, 1], [1, height, -1]]) {
      const out = []
      for (let i = 0; i < vertices.length; i++) {
        const a = vertices[i], b = vertices[(i + 1) % vertices.length]
        const insideA = (a[axis] - edge) * keep >= 0, insideB = (b[axis] - edge) * keep >= 0
        if (insideA) out.push(a)
        if (insideA !== insideB) { const t = (edge - a[axis]) / (b[axis] - a[axis]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]) }
      }
      vertices = out
    }
    return vertices
  }
  return [
    { type: 'rect', id: `${prefix}-ground`, x, y, width, height, fill: spec.background },
    ...spec.place.flatMap((p, i) => {
      const angle = (p.rotation ?? 0) / 180 * Math.PI, ca = Math.cos(angle), sa = Math.sin(angle)
      const vertices = crop(geometry.vertices.map(([vx, vy]) => {
        const px = vx - geometry.width / 2, py = vy - geometry.height / 2
        return [p.x + (px * ca - py * sa + geometry.width / 2) * p.scale, p.y + (px * sa + py * ca + geometry.height / 2) * p.scale]
      }))
      return vertices.length < 3 ? [] : [{ type: 'path', id: `${prefix}-arrow-${i}`, d: `M${vertices.map(([px, py]) => `${Number((x + px).toFixed(4))} ${Number((y + py).toFixed(4))}`).join('L')}Z`, fill: p.colour }]
    })
  ]
}

function explorerSvg(geometry, spec, colours) {
  const dots = (spec.dots ?? []).map(d => `<circle cx="${d.cx}" cy="${d.cy}" r="${d.r}" fill="${colours[d.colour]}"/>`).join('')
  const art = spec.place.map(p => {
    const shape = p.symbol === 'spark' ? geometry.spark : geometry
    const origin = shape.origin ?? [0, 0]
    return `<g transform="translate(${p.x} ${p.y}) scale(${p.scale}) rotate(${p.rotation ?? 0} ${shape.width / 2} ${shape.height / 2})"><path d="${shape.path}" transform="translate(${-origin[0]} ${-origin[1]})" fill="${colours[p.colour]}"/></g>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${spec.width} ${spec.height}" width="${spec.width}" height="${spec.height}" role="img" aria-label="SPARK Lab arrow and spark pattern"><title>SPARK Lab / arrow and spark study</title><rect width="100%" height="100%" fill="${colours[spec.background]}"/>${dots}${art}</svg>`
}

export const arrowPage = (brand, geometry) => {
  const font = readFileSync(new URL('../../brands/sparklab/fonts/Outfit-Regular.ttf', import.meta.url)).toString('base64')
  const presets = [...ARROW_STUDIES.slice(6), ...ARROW_STUDIES.slice(0, 6)].map(s => ({ ...s, spec: brand.patterns.find(p => p.id === `arrows-${s.id}`) }))
  const css = `*{box-sizing:border-box}body{margin:0;background:#FAF8F5;color:#122738;font:16px/1.5 Outfit,Arial,sans-serif}header,main,footer{width:min(1320px,calc(100% - 64px));margin:auto}header{padding:56px 0 32px}h1,h2,h3{line-height:1.05;letter-spacing:-.04em;font-weight:400}h1{font-size:clamp(48px,7vw,88px);margin:24px 0}h2{font-size:40px;margin:0 0 16px}h3{font-size:24px;margin:0 0 12px}p{color:#3A4F63;max-width:700px}.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase}a{color:inherit;text-underline-offset:4px}.editor{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:28px;border-top:1px solid #E8EEF4;padding:32px 0 56px}.preview,.sample{border-radius:12px;overflow:hidden;border:1px solid #E8EEF4;align-self:start}.preview svg,.sample svg{display:block;width:100%;height:auto}label{display:block;margin:0 0 22px}label span{display:flex;justify-content:space-between;margin-bottom:9px}select,button{font:inherit;color:inherit;border:1px solid #122738;border-radius:6px;background:transparent;padding:10px 14px}select{width:100%}input{width:100%;accent-color:#F85C14}button{cursor:pointer}button.primary{background:#122738;color:#FAF8F5;width:100%}button:hover{background:#E8EEF4}button.primary:hover{background:#3A4F63}button:focus-visible,a:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid #F85C14;outline-offset:4px}.note{font-size:13px}.collection{padding:40px 0;border-top:1px solid #E8EEF4}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px 24px;margin-top:32px}article{min-width:0}article p{font-size:14px}article p:not(.eyebrow){min-height:64px}article h3{margin-top:20px}article button{font-size:13px;padding:8px 12px}footer{border-top:1px solid #E8EEF4;padding:28px 0 48px;font-size:13px}@media(max-width:900px){.grid{grid-template-columns:1fr 1fr}.editor{grid-template-columns:1fr 240px}}@media(max-width:640px){header,main,footer{width:calc(100% - 40px)}header{padding-top:32px}.editor{grid-template-columns:1fr}.grid{grid-template-columns:1fr}article p{min-height:0}}`
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>SPARK Lab / Arrows and sparks</title><style>@font-face{font-family:Outfit;src:url(data:font/ttf;base64,${font}) format('truetype');font-display:swap}${css}</style></head><body><header><p class="eyebrow">SPARK LAB / ARROW &amp; SPARK PATTERNS / V${escape(brand.displayVersion)}</p><h1>One arrow.<br>Many possibilities.</h1><p>Repeat the original arrow and spark. Mix directions and scales, follow a current or leave room for a quiet constellation.</p></header><main><section class="editor" aria-label="Pattern explorer"><div class="preview" id="preview"></div><div class="controls"><label><span>Pattern</span><select id="mode">${presets.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></label><label><span>Motif scale <output id="size-value" for="size">100%</output></span><input id="size" aria-label="Motif scale" type="range" min="35" max="180" value="100" step="5"></label><label><span>Density <output id="density-value" for="density">100%</output></span><input id="density" aria-label="Density" type="range" min="50" max="160" value="100" step="5"></label><label><span>Colourway</span><select id="palette"><option value="navy">Navy</option><option value="cream">Cream</option><option value="orange">Orange</option></select></label><button type="button" class="primary" id="download">Download this SVG</button><p class="note" id="description"></p><p class="note">The full logo stays intact. These motifs are supporting graphics. Keep small text on a clear ground.</p></div></section><section class="collection"><p class="eyebrow">${presets.length} STARTING POINTS</p><h2>From a texture to a statement.</h2><p>All ${presets.length} presets are included in the brand kit as vector SVGs and PNGs. Inward rings and Orbit are focal compositions; the others are repeating tiles at their preset settings.</p><div class="grid">${presets.map((s, i) => `<article data-study="${s.id}"><div class="sample">${pattern({ brand }, s.spec)}</div><p class="eyebrow">${String(i + 1).padStart(2, '0')} / ${s.id === 'inward' || s.focal ? 'FOCAL FIELD' : 'REPEATING TILE'}</p><h3>${escape(s.name)}</h3><p>${escape(s.detail)}</p><button type="button" data-preset="${s.id}">Explore this pattern</button></article>`).join('')}</div></section></main><footer><a href="patterns-and-templates.html">Patterns &amp; applications</a> · <a href="brand-details.html">Brand details</a><p>Original arrow and spark from SPARK Lab’s website artwork. Supporting patterns developed for this kit.</p></footer><script>const geometry=${JSON.stringify(geometry)},colours=${JSON.stringify(brand.colours)},presets=${JSON.stringify(ARROW_STUDIES)};const arrowField=${arrowField.toString()};const svg=${explorerSvg.toString()};const mode=document.getElementById('mode'),size=document.getElementById('size'),density=document.getElementById('density'),palette=document.getElementById('palette'),preview=document.getElementById('preview');let current='';function update(){current=svg(geometry,arrowField(geometry,mode.value,960,600,{size:Number(size.value),density:Number(density.value),palette:palette.value}),colours);preview.innerHTML=current;document.getElementById('size-value').value=size.value+'%';document.getElementById('density-value').value=density.value+'%';document.getElementById('description').textContent=presets.find(s=>s.id===mode.value).detail}function choose(id){mode.value=id;size.value=100;density.value=100;palette.value=presets.find(s=>s.id===id).palette;update()}mode.addEventListener('change',()=>choose(mode.value));[size,density,palette].forEach(el=>el.addEventListener('input',update));document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{choose(b.dataset.preset);document.querySelector('.editor').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})}));document.getElementById('download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([current],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download='sparklab-arrows-'+mode.value+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});choose('directions');</script></body></html>`
}
