import { useEffect, useMemo, useRef, useState } from 'react'
import { download, rasterise } from '../../export/render.js'
import { vehicleLogos, svgAspect, brandColours } from '../../mockups/vehicle-artwork.js'
import { APPAREL_PRODUCTS, APPAREL_SIZES, APPAREL_METHODS, APPAREL_VIEWS, apparelAreas, apparelLayerStatus, copyApparelLayer, createApparelLayer, createApparelProject, fitApparelLayer, validateApparelProject } from '../../mockups/apparel-layout.js'
import { apparelFlatSvg } from '../../mockups/apparel-flat.js'
import { MockupProjects } from '../../mockups/MockupProjects.jsx'
import { readMockupDraft } from '../../mockups/mockup-draft.js'
import { SvgImage } from '../ui.jsx'
import '../../mockups/apparel.css'

const SECTIONS = ['Product', 'Configure', 'Artwork', 'Review']
const SWATCHES = [['#162a49', 'Navy'], ['#d4d2cd', 'Heather grey'], ['#f4f0e7', 'Natural'], ['#292c30', 'Charcoal'], ['#263f32', 'Forest'], ['#763a38', 'Rust']]
const clone = (value) => JSON.parse(JSON.stringify(value))
const draftKey = (brand) => `brandkit-apparel-draft:${brand.id}`
const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
const rounded = (value) => Math.round(value * 10) / 10
const preferredLogo = (logos) => logos.find((entry) => /white|paper|light|reverse/i.test(entry.label) && !/black/i.test(entry.label)) ?? logos[0]
const layerAspect = (entry) => { try { return svgAspect(entry.make()) ?? 3.5 } catch { return 3.5 } }

const GarmentIcon = ({ hoodie = false }) => <svg viewBox="0 0 120 100" aria-hidden="true"><path d="M46 18Q60 30 74 18L93 26L110 69L96 76L82 51L84 94H36L38 51L24 76L10 69L27 26Z" fill="currentColor"/>{hoodie ? <><path d="M45 19Q39-2 60 2Q81-2 75 19L69 27H51Z" fill="currentColor"/><path d="M45 80L49 65H71L75 80Z" stroke="#fff" strokeOpacity=".4" fill="none"/><path d="M53 27V42M67 27V42" stroke="#fff" strokeOpacity=".5"/></> : <path d="M46 18Q60 37 74 18" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="3"/>}</svg>

const Numeric = ({ label, value, min, max, step = 1, disabled, onChange, suffix = 'mm' }) => <label className="field"><span className="field__label">{label}</span><span className="apparel__number"><input aria-label={label} type="number" min={min} max={max} step={step} value={rounded(value)} disabled={disabled} onChange={(event) => { const next = Number(event.target.value); if (event.target.value !== '' && Number.isFinite(next)) onChange(next) }} /><span>{suffix}</span></span></label>

export const Clothing = ({ brand, fonts }) => {
  const logos = useMemo(() => { try { return vehicleLogos(brand, fonts) } catch { return [] } }, [brand, fonts])
  const [restored] = useState(() => readMockupDraft({ key: draftKey(brand), validate: validateApparelProject }))
  const [project, setProject] = useState(() => {
    if (restored.project) return restored.project
    const logo = preferredLogo(logos)
    return createApparelProject({ logo: logo?.id ?? '', aspect: logo ? layerAspect(logo) : 3.5 })
  })
  const [section, setSection] = useState('Product')
  const [message, setMessage] = useState({ text: 'Preparing the garment preview…', error: false })
  const [previewReady, setPreviewReady] = useState(false)
  const [renderError, setRenderError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [historyVersion, setHistoryVersion] = useState(0)
  const [projectBinding, setProjectBinding] = useState(0)
  const [productSearch, setProductSearch] = useState('')
  const stage = useRef(null), editor = useRef(null), fileInput = useRef(null), projectRef = useRef(project), history = useRef({ undo: [], redo: [] })
  projectRef.current = project
  const status = (text, error = false) => setMessage({ text, error })
  const change = (update, remember = true) => {
    if (exporting) return
    const before = projectRef.current
    const next = typeof update === 'function' ? update(clone(before)) : clone(update)
    if (JSON.stringify(before) === JSON.stringify(next)) return
    if (remember) { history.current.undo.push(clone(before)); history.current.undo = history.current.undo.slice(-30); history.current.redo = []; setHistoryVersion((value) => value + 1) }
    projectRef.current = next; setProject(next)
  }
  const travel = (direction) => {
    if (exporting) return
    const next = history.current[direction].pop()
    if (!next) return
    history.current[direction === 'undo' ? 'redo' : 'undo'].push(clone(projectRef.current))
    projectRef.current = next; setProject(next); setHistoryVersion((value) => value + 1)
    status(direction === 'undo' ? 'Change undone.' : 'Change restored.')
  }

  useEffect(() => {
    let live = true, instance
    import('../../mockups/apparel-studio.js').then(({ createApparelStudio }) => {
      if (!live) return
      try {
        instance = createApparelStudio({ container: stage.current, onStatus: (text, error) => { if (live) status(text, error) } })
        editor.current = instance; setPreviewReady(true)
      } catch (error) {
        setRenderError(error.message)
        change((next) => ({ ...next, mode: 'flat' }), false)
        status('This browser cannot display 3D. The flat layout is ready to edit and export.')
      }
    }).catch((error) => {
      if (!live) return
      setRenderError(error.message)
      change((next) => ({ ...next, mode: 'flat' }), false)
      status('The 3D preview could not load. The flat layout is ready to edit and export.')
    })
    return () => { live = false; instance?.dispose(); editor.current = null }
  }, [])
  useEffect(() => { if (previewReady) editor.current?.update(project, logos) }, [project, logos, previewReady])
  useEffect(() => {
    if (!restored.storageKey) return
    try { localStorage.setItem(restored.storageKey, JSON.stringify(project)) } catch { status('The browser could not save this draft. Download JSON to keep a copy.', true) }
  }, [project, restored.storageKey])
  useEffect(() => {
    const logo = preferredLogo(logos)
    if (!logo || !projectRef.current.layers.some((layer) => !layer.logo)) return
    change((next) => ({ ...next, layers: next.layers.map((layer) => layer.logo ? layer : fitApparelLayer({ ...layer, logo: logo.id, aspect: layerAspect(logo) }, next.product)) }), false)
  }, [logos])

  const selected = project.layers.find((layer) => layer.id === project.selectedLayerId)
  const areas = apparelAreas(project.product)
  const placementState = selected ? apparelLayerStatus(project, selected) : null
  const unplaced = project.layers.filter((layer) => !apparelLayerStatus(project, layer).placed)
  const selectedEntry = logos.find((entry) => entry.id === selected?.logo)
  const flatSvg = useMemo(() => { try { return apparelFlatSvg(project, logos, { brandName: brand.name }) } catch { return '' } }, [project, logos, brand.name])
  const swatches = useMemo(() => {
    const known = new Set(SWATCHES.map(([hex]) => hex))
    return [...SWATCHES, ...brandColours(brand).filter((hex) => !known.has(hex)).slice(0, 4).map((hex) => [hex, `Brand ${hex}`])]
  }, [brand])
  const updateLayer = (changes, fit = false) => {
    if (!selected || selected.locked) return
    change((next) => ({ ...next, layers: next.layers.map((layer) => layer.id !== selected.id ? layer : fit ? fitApparelLayer({ ...layer, ...changes }, next.product) : { ...layer, ...changes }) }))
  }
  const toggleLayer = (id, key) => change((next) => ({ ...next, layers: next.layers.map((layer) => layer.id === id ? { ...layer, [key]: !layer[key] } : layer) }))
  const addLayer = () => {
    if (project.layers.length >= 24 || !logos.length) return
    const logo = selectedEntry ?? preferredLogo(logos)
    const area = project.layers.length ? 'back' : 'left-chest'
    const layer = createApparelLayer({ logo: logo.id, aspect: layerAspect(logo), area, product: project.product, name: area === 'back' ? 'Back lockup' : 'Brand lockup' })
    change((next) => ({ ...next, layers: [...next.layers, layer], selectedLayerId: layer.id, view: area === 'back' ? 'back' : 'front' }))
    setSection('Artwork')
  }
  const removeSelected = () => {
    if (!selected || selected.locked) return
    change((next) => { const layers = next.layers.filter((layer) => layer.id !== selected.id); return { ...next, layers, selectedLayerId: layers[0]?.id ?? null } })
  }
  const duplicate = () => {
    if (!selected || project.layers.length >= 24) return
    const layer = copyApparelLayer(selected)
    change((next) => ({ ...next, layers: [...next.layers, layer], selectedLayerId: layer.id }))
  }
  const moveLayer = (direction) => {
    if (!selected || selected.locked) return
    change((next) => { const index = next.layers.findIndex((layer) => layer.id === selected.id), target = index + direction; if (target < 0 || target >= next.layers.length) return next; [next.layers[index], next.layers[target]] = [next.layers[target], next.layers[index]]; return next })
  }
  const openProject = (input) => {
    const next = validateApparelProject(input, { logos: logos.map((logo) => logo.id) })
    change(renderError ? { ...next, mode: 'flat' } : next); status('Clothing mockup opened.'); return true
  }
  const importFile = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Choose a clothing JSON file smaller than 2 MB.')
      openProject(JSON.parse(await file.text()))
      setProjectBinding((value) => value + 1)
    } catch (error) { status(error.message, true) }
  }
  const exportPng = async () => {
    setExporting(true)
    try {
      const blob = project.mode === 'flat' ? await rasterise(apparelFlatSvg(project, logos, { brandName: brand.name, guides: false }), 2320) : await editor.current?.exportPng()
      if (!blob) throw new Error('Choose Flat layout if the 3D preview is unavailable.')
      download(blob, `${brand.id}-${project.product}-${project.mode === 'flat' ? 'layout' : project.view}.png`)
      status('PNG exported.')
    } catch (error) { status(error.message, true) } finally { setExporting(false) }
  }
  const setArea = (area) => {
    const view = area === 'back' ? 'back' : area.endsWith('sleeve') ? area.split('-')[0] : 'front'
    updateLayer({ area, xMm: 0, yMm: 0 }, true)
    change((next) => ({ ...next, view }), false)
  }

  return <div className="view apparel" data-history-version={historyVersion}>
    <section className="panel apparel__stage-panel" aria-label="Clothing mockup">
      <header className="apparel__header"><div><span className="apparel__eyebrow">CLOTHING STUDIO</span><h1>{APPAREL_PRODUCTS[project.product].label}</h1><p>Size {project.size} <span>·</span> {project.layers.length} artwork {project.layers.length === 1 ? 'layer' : 'layers'} <span>·</span> <span className="apparel__badge">Generic garment</span></p></div><div className="apparel__history"><button type="button" className="button button--quiet" onClick={() => travel('undo')} disabled={exporting || !history.current.undo.length}>Undo</button><button type="button" className="button button--quiet" onClick={() => travel('redo')} disabled={exporting || !history.current.redo.length}>Redo</button></div></header>
      <div className="apparel__recovery" hidden={!restored.recovery} role="status">{restored.recovery && <><p>{restored.recovery.message}</p>{restored.recovery.raw !== null && <button type="button" className="button button--quiet" disabled={exporting} onClick={() => download(restored.recovery.raw, `${brand.id}-clothing-recovered-draft.json`, 'application/json')}>Download recovered draft</button>}</>}</div>
      <div className="apparel__stage-tabs" role="group" aria-label="Clothing preview mode"><button type="button" disabled={exporting || Boolean(renderError)} title={renderError ? '3D is unavailable in this browser; use the flat layout.' : undefined} aria-pressed={project.mode === '3d'} onClick={() => change((next) => ({ ...next, mode: '3d' }), false)}>3D preview</button><button type="button" disabled={exporting} aria-pressed={project.mode === 'flat'} onClick={() => change((next) => ({ ...next, mode: 'flat' }), false)}>Flat layout</button><span>Physical artwork size stays fixed</span></div>
      <div className="apparel__preview">
        <div ref={stage} className="apparel-stage" style={{ display: project.mode === '3d' ? 'block' : 'none' }} />
        {project.mode === '3d' && renderError && <div className="apparel__fallback"><p>{renderError}</p><button type="button" className="button" onClick={() => change((next) => ({ ...next, mode: 'flat' }), false)}>Open flat layout</button></div>}
        {project.mode === 'flat' && <div className="apparel__flat"><SvgImage svg={flatSvg} alt={`${APPAREL_PRODUCTS[project.product].label}, front and back with artwork dimensions`} /></div>}
        {project.mode === '3d' && <div className="apparel__preview-caption"><strong>{brand.name}</strong><span>{APPAREL_PRODUCTS[project.product].detail}</span></div>}
      </div>
      {!renderError && <div className="apparel__views" role="group" aria-label="Garment view">{Object.entries(APPAREL_VIEWS).map(([id, label]) => <button key={id} type="button" disabled={exporting} aria-pressed={project.view === id} onClick={() => change((next) => ({ ...next, view: id, mode: '3d' }), false)}>{label}</button>)}</div>}
      <div className="apparel__stage-footer"><p role={message.error ? 'alert' : 'status'} className={message.error ? 'apparel__error' : ''}>{message.text}</p><button type="button" className="button" disabled={exporting} onClick={exportPng}>{exporting ? 'Exporting…' : 'Export PNG'}</button></div>
    </section>

    <aside className="panel apparel__controls" aria-label="Clothing controls" aria-busy={exporting}><fieldset className="apparel__inspector-fieldset" disabled={exporting}>
      <nav className="apparel__sections" aria-label="Clothing inspector">{SECTIONS.map((name) => <button key={name} type="button" aria-current={section === name ? 'page' : undefined} onClick={() => setSection(name)}>{name}</button>)}</nav>
      <div className="apparel__inspector">
        {section === 'Product' && <section><span className="apparel__eyebrow">START WITH A BLANK</span><h2>Garment library</h2><p className="apparel__intro">Choose a silhouette, then apply your original brand artwork.</p><label className="field"><span className="field__label">Search garments</span><input type="search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Crewneck, hoodie…" /></label><div className="apparel__products">{Object.entries(APPAREL_PRODUCTS).filter(([, spec]) => `${spec.label} ${spec.detail}`.toLowerCase().includes(productSearch.toLowerCase())).map(([id, spec]) => <button key={id} type="button" className="apparel__product" aria-pressed={project.product === id} onClick={() => change((next) => ({ ...next, product: id }))}><span className="apparel__product-image" style={{ color: project.colour }}><GarmentIcon hoodie={id === 'hoodie'} /></span><span><strong>{spec.label}</strong><small>{spec.detail}</small><em>Generic 3D · five sizes</em></span><span className="apparel__product-check" aria-hidden="true">{project.product === id ? '✓' : '+'}</span></button>)}</div><div className="apparel__note"><strong>About these previews</strong><p>These garments are drawn for Brandkit. Their proportions and decoration areas are illustrative. A supplier style can be added once its model and print regions are prepared.</p></div><button type="button" className="button apparel__next" onClick={() => setSection('Configure')}>Choose colour and size →</button></section>}

        {section === 'Configure' && <section><span className="apparel__eyebrow">THE BLANK</span><h2>Colour &amp; fit</h2><label className="field"><span className="field__label">Garment size</span><select aria-label="Garment size" value={project.size} onChange={(event) => change((next) => ({ ...next, size: event.target.value }))}>{Object.keys(APPAREL_SIZES).map((size) => <option key={size}>{size}</option>)}</select><span className="field__hint">Changing size preserves each artwork’s width and position in millimetres.</span></label><div className="apparel__colour-label"><strong>Garment colour</strong><code>{project.colour.toUpperCase()}</code></div><div className="apparel__swatches" role="group" aria-label="Garment colour">{swatches.map(([hex, label]) => <button key={hex} type="button" style={{ '--swatch': hex }} aria-label={label} title={label} aria-pressed={project.colour === hex} onClick={() => change((next) => ({ ...next, colour: hex }))} />)}<label className="apparel__custom-swatch" title="Custom garment colour"><input type="color" aria-label="Custom garment colour" value={project.colour} onChange={(event) => change((next) => ({ ...next, colour: event.target.value }))} /></label></div><div className="apparel__note"><strong>Decoration regions follow the garment</strong><p>{project.product === 'hoodie' ? 'Front artwork stays above the pocket. Back artwork starts below the hood. Switching from a crewneck retains any larger design for review.' : 'Front, left chest, back and both upper sleeves have their own preview regions.'}</p></div><button type="button" className="button apparel__next" onClick={() => setSection('Artwork')}>Arrange artwork →</button></section>}

        {section === 'Artwork' && <section><div className="apparel__title-row"><div><span className="apparel__eyebrow">ORIGINAL BRAND ASSETS</span><h2>Artwork layers</h2></div><button type="button" className="button button--quiet" disabled={!logos.length || project.layers.length >= 24} onClick={addLayer}>+ Add</button></div>{!logos.length && <p className="apparel__note">The open brand has no supported logo artwork. Open a brand with an approved logo to add decoration.</p>}<div className="apparel__layers" role="list" aria-label="Garment artwork layers">{project.layers.map((layer) => <div role="listitem" key={layer.id} className={`apparel__layer ${selected?.id === layer.id ? 'is-selected' : ''}`}><button type="button" className="apparel__layer-select" aria-pressed={selected?.id === layer.id} onClick={() => change((next) => ({ ...next, selectedLayerId: layer.id }), false)}><strong>{layer.name}</strong><small>{areas[layer.area].label} · {rounded(layer.widthMm)} mm{!apparelLayerStatus(project, layer).placed ? ' · unplaced' : ''}</small></button><button type="button" className="apparel__layer-toggle" aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.name}`} aria-pressed={layer.visible} onClick={() => toggleLayer(layer.id, 'visible')}>{layer.visible ? '◉' : '○'}</button><button type="button" className="apparel__layer-toggle" aria-label={`${layer.locked ? 'Unlock' : 'Lock'} ${layer.name}`} aria-pressed={layer.locked} onClick={() => toggleLayer(layer.id, 'locked')}>{layer.locked ? 'Locked' : 'Lock'}</button></div>)}</div>
          {selected && <div className="apparel__layer-editor"><div className="apparel__art-preview" style={{ background: project.colour }}>{selectedEntry && <img src={svgUrl(selectedEntry.make())} alt="Original selected brand artwork" />}</div>{selected.locked && <p className="apparel__notice">This layer is locked. Unlock it to edit placement or artwork.</p>}{!placementState.placed && <p role="status" className="apparel__notice">{placementState.reason}</p>}<label className="field"><span className="field__label">Layer name</span><input aria-label="Layer name" maxLength={80} value={selected.name} disabled={selected.locked} onChange={(event) => updateLayer({ name: event.target.value })} /></label><label className="field"><span className="field__label">Brand artwork</span><select aria-label="Garment brand artwork" value={selected.logo} disabled={selected.locked} onChange={(event) => { const logo = logos.find((entry) => entry.id === event.target.value); updateLayer({ logo: logo.id, aspect: layerAspect(logo) }, true) }}>{logos.map((logo) => <option key={logo.id} value={logo.id}>{logo.label}</option>)}</select></label><div className="apparel__field-grid"><label className="field"><span className="field__label">Decoration area</span><select aria-label="Decoration area" value={selected.area} disabled={selected.locked} onChange={(event) => setArea(event.target.value)}>{Object.entries(areas).map(([id, area]) => <option key={id} value={id}>{area.label}</option>)}</select></label><label className="field"><span className="field__label">Method</span><select aria-label="Decoration method" value={selected.method} disabled={selected.locked} onChange={(event) => updateLayer({ method: event.target.value })}>{Object.entries(APPAREL_METHODS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div><div className="apparel__field-grid"><Numeric label="Artwork width" value={selected.widthMm} min={20} max={400} disabled={selected.locked} onChange={(widthMm) => updateLayer({ widthMm }, true)} /><div className="field"><span className="field__label">Artwork height</span><output className="apparel__dimension">{rounded(selected.widthMm / selected.aspect)} <span>mm · proportions kept</span></output></div><Numeric label="Horizontal offset" value={selected.xMm} min={-160} max={160} disabled={selected.locked} onChange={(xMm) => updateLayer({ xMm }, true)} /><Numeric label="Vertical offset" value={selected.yMm} min={-170} max={170} disabled={selected.locked} onChange={(yMm) => updateLayer({ yMm }, true)} /><Numeric label="Artwork rotation" value={selected.rotation} min={-180} max={180} suffix="°" disabled={selected.locked} onChange={(rotation) => updateLayer({ rotation }, true)} /><button type="button" className="button button--quiet apparel__center" disabled={selected.locked} onClick={() => updateLayer({ xMm: 0, yMm: 0, rotation: 0 }, true)}>Centre in area</button></div><div className="apparel__layer-actions"><button type="button" className="button button--quiet" onClick={duplicate} disabled={project.layers.length >= 24}>Duplicate</button><button type="button" className="button button--quiet" onClick={() => moveLayer(1)} disabled={selected.locked || project.layers.at(-1)?.id === selected.id}>Forward</button><button type="button" className="button button--quiet" onClick={() => moveLayer(-1)} disabled={selected.locked || project.layers[0]?.id === selected.id}>Back</button><button type="button" className="button button--quiet" disabled={selected.locked} onClick={removeSelected}>Remove</button></div>{['embroidery', 'patch'].includes(selected.method) && <p className="field__hint">{selected.method === 'embroidery' ? 'Thread relief is an appearance preview. Machine stitches and supplier digitization are not generated.' : 'Patch edge and backing are appearance previews. Confirm construction and attachment with the supplier.'}</p>}</div>}
        </section>}

        <section className="apparel__review" hidden={section !== 'Review'}><span className="apparel__eyebrow">KEEP & SHARE</span><h2>Review the design</h2><dl className="apparel__spec"><div><dt>Garment</dt><dd>{APPAREL_PRODUCTS[project.product].label}</dd></div><div><dt>Size / colour</dt><dd>{project.size} / {project.colour.toUpperCase()}</dd></div><div><dt>Artwork</dt><dd>{project.layers.length} layers · {project.layers.filter((layer) => layer.visible).length} visible</dd></div><div><dt>Preview asset</dt><dd>Generic · version {project.assetVersion}</dd></div></dl>{unplaced.length > 0 && <p className="apparel__notice">{unplaced.length} retained {unplaced.length === 1 ? 'layer needs' : 'layers need'} placement before exporting the design.</p>}<div className="apparel__export-actions"><button type="button" className="button" onClick={() => download(apparelFlatSvg(project, logos, { brandName: brand.name, guides: false }), `${brand.id}-${project.product}-review.svg`, 'image/svg+xml')}>Download review sheet</button><button type="button" className="button button--quiet" onClick={() => download(JSON.stringify(project, null, 2), `${brand.id}-${project.product}-mockup.json`, 'application/json')}>Download JSON</button><button type="button" className="button button--quiet" onClick={() => fileInput.current?.click()}>Open JSON</button></div><MockupProjects brandId={brand.id} kind="apparel" project={project} resetKey={projectBinding} disabled={exporting} onOpen={openProject} onStatus={status} defaultName={`${brand.name} clothing`} /><div className="apparel__note"><strong>Before production</strong><p>The review sheet records artwork size and decoration method. Confirm garment style, placement, print limits and embroidery digitization with the supplier.</p></div></section>
      </div>
    </fieldset></aside><input disabled={exporting} ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importFile} />
  </div>
}
