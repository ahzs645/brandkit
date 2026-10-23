// Shared offline explorer. The collection generator and engine-drawn marks are embedded,
// so the preview/download uses the same geometry without fetching code, fonts or services.
import { readFileSync } from 'node:fs'
import { mark, pattern } from '../../src/engine/artwork.js'
import { colour } from '../../src/engine/brand.js'
import { escape } from '../../src/engine/format.js'
import { renderTemplate, scopeIds } from '../../src/engine/templates.js'
import { findAsset } from '../../src/fonts/node.js'

const data = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')

// This function is also serialized verbatim for the explorer. Markup comes from mark(),
// with one paint token, preserving supplied paths, layered shapes and source coordinates.
export function previewSvg(brand, spec, marks) {
  const n = value => Number(value).toFixed(8).replace(/\.?0+$/, '') || '0'
  const ink = (value, seen = []) => brand.colours[value] ?? (brand.roles?.[value] && !seen.includes(value) ? ink(brand.roles[value], [...seen, value]) : value)
  const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  let art = ''
  for (const dot of spec.dots ?? []) art += `<circle cx="${n(dot.cx)}" cy="${n(dot.cy)}" r="${n(dot.r)}" fill="${ink(dot.colour)}"${dot.opacity == null ? '' : ` opacity="${n(dot.opacity)}"`}/>`
  for (const line of spec.lines ?? []) art += `<polyline points="${line.points.map(p => p.map(n).join(',')).join(' ')}" fill="none" stroke="${ink(line.colour)}" stroke-width="${n(line.width ?? 1)}"${line.opacity == null ? '' : ` opacity="${n(line.opacity)}"`}/>`
  for (const p of spec.place ?? []) {
    const symbol = p.symbol ? brand.symbols[p.symbol] : brand.symbol
    const [vx, vy, width, height] = symbol.viewBox
    const rotate = p.rotation ? ` rotate(${n(p.rotation)} ${n(vx + width / 2)} ${n(vy + height / 2)})` : ''
    art += `<g transform="translate(${p.x} ${p.y}) scale(${String(p.scale).replace(/^0\./, '.')})${rotate}">${marks[p.symbol ?? 'default'].replaceAll('__PATTERN_COLOUR__', ink(p.colour))}</g>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}" overflow="hidden" role="img" aria-label="${esc(brand.name)} supporting pattern"><title>${esc(brand.name)} / supporting pattern study</title><rect width="100%" height="100%" fill="${ink(spec.background)}"/>${art}</svg>`
}

const css = `
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.5 PatternUI,Arial,sans-serif}
header,main,footer{width:min(1320px,calc(100% - 64px));margin:auto}header{padding:48px 0 32px}
h1,h2,h3{font-weight:500;line-height:1.08;letter-spacing:-.035em}h1{font-size:clamp(46px,6.5vw,86px);margin:22px 0}h2{font-size:36px;margin:0 0 16px}h3{font-size:22px;margin:16px 0 10px}
p{max-width:820px}.eyebrow{font:12px/1.5 PatternUI,Arial,sans-serif;letter-spacing:.13em;text-transform:uppercase}.note{font-size:13px;opacity:.8}a{color:inherit;text-underline-offset:4px}
.editor{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:28px;padding:32px 0 52px;border-top:1px solid var(--rule)}
.art{border:1px solid var(--rule);border-radius:10px;overflow:hidden;align-self:start}.art svg{display:block;width:100%;height:auto}
label{display:block;margin-bottom:22px}label>span{display:flex;justify-content:space-between;gap:16px;margin-bottom:8px}select,input{width:100%}
select,button{font:inherit;color:inherit;background:transparent;border:1px solid var(--ink);border-radius:6px;padding:10px 13px}input{accent-color:var(--accent)}button{cursor:pointer}button.primary{background:var(--ink);color:var(--paper)}button:hover{opacity:.8}button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
.downloads{display:flex;gap:10px;flex-wrap:wrap}.downloads button{font-size:14px;flex:1}.collection{border-top:1px solid var(--rule);padding:40px 0}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px 24px;margin:28px 0}article,figure{min-width:0;margin:0}article>p{font-size:14px}article>.eyebrow{margin:14px 0 8px}article>button{font-size:13px;padding:8px 12px}
.applications{display:grid;grid-template-columns:1fr 1.65fr;align-items:start;gap:32px;margin-top:28px}.applications p{font-size:14px}figcaption{padding:16px 0}footer{padding:24px 0 48px;border-top:1px solid var(--rule);font-size:13px}
@media(max-width:900px){.editor{grid-template-columns:1fr 230px}.grid{grid-template-columns:1fr 1fr}}
@media(max-width:640px){header,main,footer{width:calc(100% - 40px)}header{padding-top:30px}.editor,.grid,.applications{grid-template-columns:1fr}h2{font-size:30px}}
`

const pageStyle = (brand, folder) => {
  const face = brand.fonts.displayRegular ?? brand.fonts.body ?? brand.fonts.display
  const font = readFileSync(findAsset(folder, face.file)).toString('base64')
  const paper = colour(brand, 'paper'), ink = colour(brand, 'ink'), accent = colour(brand, 'primary')
  return `@font-face{font-family:PatternUI;src:url(data:font/ttf;base64,${font}) format('truetype');font-display:swap}:root{--paper:${paper};--ink:${ink};--accent:${accent};--rule:${colour(brand, 'line')}}${css}`
}

const applicationFigures = (brand, fonts, collection) => collection.APPLICATIONS.map(app => {
  const template = brand.templates.find(t => t.id === app.id)
  const svg = renderTemplate({ brand, fonts, outline: true, values: { 'study-title': app.exampleTitle } }, template).svg.replace(/^<\?xml[^>]*>\s*/, '')
  return `<figure data-application="${escape(app.id)}"><div class="art">${scopeIds(svg, `application-${app.id}`)}</div><figcaption><h3>${escape(app.name)}</h3><p>${escape(app.description)}</p><p class="note">Example headline. Editable originals retain bracketed fields for your own information.</p></figcaption></figure>`
}).join('')

export const patternExplorerPage = (brand, fonts, folder, collection) => {
  const { STUDIES, PALETTES, INTRO, buildPattern } = collection
  const marks = {}
  for (const spec of brand.patterns.filter(p => p.extension === 'pattern-explorations')) {
    for (const p of spec.place ?? []) marks[p.symbol ?? 'default'] ??= mark({ brand }, '__PATTERN_COLOUR__', false, p.symbol)
  }
  for (const id of Object.keys(brand.symbols ?? {})) marks[id] ??= mark({ brand }, '__PATTERN_COLOUR__', false, id)
  const runtimeBrand = { id: brand.id, name: brand.name, colours: brand.colours, roles: brand.roles, symbol: brand.symbol, symbols: brand.symbols ?? {} }
  const figures = STUDIES.map((study, i) => {
    const spec = brand.patterns.find(p => p.id === study.id)
    return `<article data-study="${escape(study.id)}"><div class="art">${scopeIds(pattern({ brand }, spec), `sample-${study.id}`)}</div><p class="eyebrow">${String(i + 1).padStart(2, '0')} / ${study.kind === 'focal' ? 'Focal composition' : 'Repeating field'}</p><h3>${escape(study.name)}</h3><p>${escape(study.description)}</p><button type="button" data-preset="${escape(study.id)}">Explore this pattern</button></article>`
  }).join('')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>${escape(brand.name)} / Pattern studies</title><style>${pageStyle(brand, folder)}</style></head>
<body><header><p class="eyebrow">${escape(brand.name)} / Supporting graphics</p><h1>A pattern of possibilities.</h1><p>${escape(INTRO)}</p><p class="note">Additional kit studies. The identifying artwork and existing identity guidance are preserved.</p></header>
<main><section class="editor" aria-label="Pattern explorer"><div id="preview" class="art"></div><div class="controls">
<label><span>Pattern</span><select id="study">${STUDIES.map(s => `<option value="${escape(s.id)}">${escape(s.name)}</option>`).join('')}</select></label>
<label><span>Scale <output id="scale-value" for="scale">100%</output></span><input id="scale" aria-label="Scale" type="range" min="50" max="150" step="5" value="100"></label>
<label><span>Density <output id="density-value" for="density">100%</output></span><input id="density" aria-label="Density" type="range" min="50" max="150" step="5" value="100"></label>
<label><span>Colourway</span><select id="palette">${PALETTES.map(p => `<option value="${escape(p.id)}">${escape(p.name)}</option>`).join('')}</select></label>
<div class="downloads"><button type="button" class="primary" id="download-svg">Download SVG</button><button type="button" id="download-png">Download PNG</button></div><p id="description" class="note"></p><p class="note">Keep small text and the complete logo on a clear ground. Focal compositions are designed around one centre.</p><p id="status" class="note" role="status"></p></div></section>
<section class="collection"><p class="eyebrow">${STUDIES.length} starting points</p><h2>Choose a rhythm.</h2><p>Explore a preset above, then change its scale, density or colour. Preset SVGs and PNGs are included in the kit.</p><div class="grid">${figures}</div></section>
<section class="collection"><p class="eyebrow">Editable applications</p><h2>Put the pattern to work.</h2><div class="applications">${applicationFigures(brand, fonts, collection)}</div></section>
<section class="collection" id="pattern-guide"><h2>Give the artwork room.</h2><p>Use small repeats as texture on backs, borders and large fields. Medium patterns work well in announcement panels; oversized motifs suit covers and displays. Keep long text on a clear ground and the complete identifying logo separate from the pattern.</p><p>Use one pattern family on a surface. Focal compositions work as a single field. Check a printed proof when producing small details.</p><p class="note">Editable SVGs, outlined PNGs and PDFs, a reference sheet and a PowerPoint layout are included in the brand kit.</p></section></main>
<footer><a href="#pattern-guide">Pattern guide and applications</a><p>${escape(brand.name)} / Additional supporting studies</p></footer>
<script>
const brand=${data(runtimeBrand)},studies=${data(STUDIES)},palettes=${data(PALETTES)},marks=${data(marks)};
const buildPattern=${buildPattern.toString()};const renderSvg=${previewSvg.toString()};
const study=document.getElementById('study'),scale=document.getElementById('scale'),density=document.getElementById('density'),palette=document.getElementById('palette'),preview=document.getElementById('preview'),status=document.getElementById('status');let current='';
function update(){const chosen=studies.find(s=>s.id===study.value),paint=palettes.find(p=>p.id===palette.value);const spec=buildPattern(brand,study.value,{scale:Number(scale.value),density:Number(density.value),palette:paint});current=renderSvg(brand,spec,marks);preview.innerHTML=current;document.getElementById('scale-value').value=scale.value+'%';document.getElementById('density-value').value=density.value+'%';document.getElementById('description').textContent=chosen.description;status.textContent=''}
function choose(id){study.value=id;scale.value=100;density.value=100;palette.value=studies.find(s=>s.id===id).palette??palettes[0].id;update()}
function save(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
study.addEventListener('change',()=>choose(study.value));[scale,density,palette].forEach(el=>el.addEventListener('input',update));document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{choose(b.dataset.preset);document.querySelector('.editor').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})}));
document.getElementById('download-svg').addEventListener('click',()=>save(new Blob([current],{type:'image/svg+xml'}),brand.id+'-'+study.value+'.svg'));
document.getElementById('download-png').addEventListener('click',async()=>{const button=document.getElementById('download-png');button.disabled=true;const url=URL.createObjectURL(new Blob([current],{type:'image/svg+xml'}));try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1200;canvas.getContext('2d').drawImage(image,0,0,1920,1200);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('PNG export failed');save(blob,brand.id+'-'+study.value+'.png')}catch(error){status.textContent='Could not export the image. Try downloading the SVG.'}finally{URL.revokeObjectURL(url);button.disabled=false}});
choose(studies[0].id);
</script></body></html>`
}

export const patternGuidePage = (brand, fonts, folder, collection) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>${escape(brand.name)} / Pattern guide</title><style>${pageStyle(brand, folder)}</style></head><body>
<header><p class="eyebrow">${escape(brand.name)} / Pattern guide</p><h1>Give the artwork room.</h1><p>${escape(collection.INTRO)}</p><p class="note">These are additional kit studies. Existing identifying artwork, historical sources and approvals are preserved.</p><p><a href="pattern-explorer.html">Explore scale, density and colour →</a></p></header>
<main><section class="collection"><h2>Choose the scale for the surface.</h2><p>Use small repeats as a texture on backs, borders and large fields. Medium patterns work well in announcement panels. Oversized motifs suit covers and displays. Keep long text on a clear ground, and use the complete identifying logo separately.</p><p>Use one pattern family on a surface. Focal compositions work as a single field; repeat presets marked as repeating fields at their supplied tile size. Check a printed proof when producing small details.</p></section><section class="collection"><h2>Editable starting points.</h2><div class="applications">${applicationFigures(brand, fonts, collection)}</div><p class="note">SVG text fields stay editable. PNGs and PDFs preserve outlined lettering. The presentation layout is also included in the Pattern studies PowerPoint file.</p></section></main><footer><a href="pattern-explorer.html">Return to the explorer</a><p>${escape(brand.name)} / Additional supporting studies</p></footer></body></html>`

export const collectionIndexPage = (entries, embedded = false) => {
  const font = readFileSync(new URL('../../brands/sparklab/fonts/Outfit-Regular.ttf', import.meta.url)).toString('base64')
  const total = entries.reduce((sum, entry) => sum + entry.brand.patternCollection.patterns.length, 0)
  const cards = entries.map(({ brand, selected }) => `<article data-brand="${escape(brand.id)}"><div class="brand-head"><h2>${escape(brand.name)}</h2><p>${brand.patternCollection.patterns.length} patterns · 2 editable applications</p></div><div class="samples">${selected.map(id => { const p = brand.patterns.find(p => p.id === id); return `<figure>${scopeIds(pattern({ brand }, p), `${brand.id}-${id}`)}<figcaption>${escape(p.name)}</figcaption></figure>` }).join('')}</div><p>${escape(brand.patternCollection.description)}</p>${embedded ? `<button type="button" data-explore="${escape(brand.id)}">Explore ${escape(brand.name)} →</button>` : `<a href="${escape(brand.id)}/docs/pattern-explorer.html">Explore ${escape(brand.name)} →</a>`}</article>`).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>Brandkit / Pattern collections</title><style>
@font-face{font-family:Outfit;src:url(data:font/ttf;base64,${font}) format('truetype');font-display:swap}*{box-sizing:border-box}body{margin:0;background:#F7F6F3;color:#14171A;font:16px/1.5 Outfit,Arial,sans-serif}header,main,footer{width:min(1320px,calc(100% - 64px));margin:auto}header{padding:48px 0 32px}h1,h2{font-weight:400;letter-spacing:-.04em;line-height:1.08}h1{font-size:clamp(46px,7vw,88px);margin:24px 0}h2{font-size:34px;margin:0}.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase}header p{max-width:760px}.brand-head{display:flex;justify-content:space-between;gap:20px;align-items:baseline}.brand-head p{font-size:14px;color:#4B4F56}article{padding:40px 0;border-top:1px solid #D9DCDF}article>p{max-width:900px;color:#4B4F56}a,button{font:inherit;color:inherit;text-underline-offset:4px}button{border:1px solid #14171A;background:#14171A;color:#F7F6F3;padding:11px 18px;border-radius:6px;cursor:pointer}.samples{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0}figure{margin:0;min-width:0}.samples svg{display:block;width:100%;height:auto;border:1px solid #D9DCDF;border-radius:10px;overflow:hidden}figcaption{font-size:18px;padding-top:12px}footer{border-top:1px solid #D9DCDF;padding:28px 0 48px;font-size:13px}dialog{padding:0;width:calc(100vw - 40px);height:calc(100vh - 40px);max-width:1500px;max-height:none;border:1px solid #D9DCDF;border-radius:12px;background:#F7F6F3;color:#14171A}dialog::backdrop{background:#14171Acc}.dialog-head{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid #D9DCDF}.dialog-head p{margin:0}.dialog-head button{padding:6px 12px}iframe{display:block;width:100%;height:calc(100% - 63px);border:0}button:focus-visible,a:focus-visible{outline:3px solid #1F4E46;outline-offset:4px}@media(max-width:640px){header,main,footer{width:calc(100% - 40px)}.brand-head{display:block}.samples{grid-template-columns:1fr}h2{font-size:30px}dialog{width:100vw;height:100dvh;border-radius:0;margin:0}}
</style></head><body><header><p class="eyebrow">BRANDKIT / ${entries.length} BRANDS / ${total} NEW STUDIES</p><h1>Different brands.<br>Different rhythms.</h1><p>Repeats, mixed scales, directional fields and quieter textures, developed from each brand’s own geometry and visual language. Open a collection to adjust scale, density and colour, then download SVGs or PNGs.</p><p class="eyebrow">Original identities preserved / Additional supporting studies</p></header><main>${cards}</main><footer>Each collection includes two editable applications, a reference sheet and a PowerPoint layout. Historical BC studies use supporting geometry and keep official symbols intact.</footer>${embedded ? `<dialog id="explorer"><div class="dialog-head"><p id="explorer-title"></p><button type="button" id="close-explorer">Close</button></div><iframe title="Brand pattern explorer" sandbox="allow-scripts allow-downloads allow-same-origin"></iframe></dialog><script>const pages=${data(Object.fromEntries(entries.map(e => [e.brand.id, { name: e.brand.name, html: e.html }])))};const dialog=document.getElementById('explorer'),frame=dialog.querySelector('iframe');document.querySelectorAll('[data-explore]').forEach(button=>button.addEventListener('click',()=>{const page=pages[button.dataset.explore];document.getElementById('explorer-title').textContent=page.name+' / Pattern explorer';frame.srcdoc=page.html;dialog.showModal()}));document.getElementById('close-explorer').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{frame.srcdoc=''})</script>` : ''}</body></html>`
}
