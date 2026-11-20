// Vehicles: the brand on a vehicle in 3D. A wrap covers the body (its sides, its rear half or all
// of it) and a logo or fleet lettering sits on top, placed directly on the body. The 3D editor is
// in src/mockups/vehicle-studio.js; this view is its controls. Artwork comes from the open brand:
// its own vehicle designs (brand.vehicles.liveries, with their artwork files), its logos, a fleet
// layout set in its type, graphics in its colours and its patterns, or uploads. The vehicles are
// brandkit's; a brand only says what goes on them.

import { useEffect, useMemo, useRef, useState } from 'react'
import { colour } from '../../engine/brand.js'
import { download } from '../../export/render.js'
import { Select } from '../../ui/Select.jsx'
import { Field, Segmented } from '../ui.jsx'
import { OPPOSITE, SCHEMA, areasFor, createPlacement, defaultWrap, validateProject } from '../../mockups/vehicle-layout.js'
import { BACKDROP_LABELS, FLEET, WRAP_GRAPHIC_LABELS, backdrop, brandColours, fleetDefaults, fleetSvg, vehicleLogos, wrapColours, wrapGraphicSvg, wrapPatterns } from '../../mockups/vehicle-artwork.js'
import { VEHICLE_MODELS, lengthOf } from '../../mockups/vehicle-models.js'
import { COVER_OPTIONS, SIDE_OPTIONS, configurationSummary } from '../../mockups/vehicle-configuration.js'
import { VehicleCatalog } from '../../mockups/VehicleCatalog.jsx'
import { MockupProjects } from '../../mockups/MockupProjects.jsx'
import { readMockupDraft } from '../../mockups/mockup-draft.js'
import { vehicleReviewSheet } from '../../mockups/vehicle-review-sheet.js'
import { VEHICLE_FILE_TYPES, liveryFiles, liveryProject } from '../../mockups/vehicle-livery.js'
import '../../mockups/vehicles.css'

const KIND_OPTIONS = [
  { value: 'none', label: 'None', title: 'No logo: the wrap alone' },
  { value: 'logo', label: 'Logo', title: 'One of the brand’s logos, as drawn' },
  { value: 'fleet', label: 'Fleet', title: 'The logo with a supporting line, a rule and the website' },
  { value: 'upload', label: 'Upload', title: 'Your own SVG, PNG, JPEG or WebP' }
]
const COVERAGE_OPTIONS = [
  { value: 'none', label: 'None', title: 'Paint only' },
  { value: 'sides', label: 'Sides', title: 'Both sides, front to back' },
  { value: 'rear', label: 'Rear half', title: 'The rear half of each side: on a work truck, its canopy or service body' },
  { value: 'full', label: 'Full body', title: 'Every painted panel: sides, hood and roof, front and rear' }
]
const VIEWS = [['angle', 'Perspective'], ['side', 'Left'], ['opposite', 'Right'], ['front', 'Front'], ['rear', 'Rear'], ['hood', 'Above']]
const NEUTRALS = [['#ffffff', 'White'], ['#f3f2ee', 'Warm white'], ['#4b4f56', 'Graphite'], ['#16181c', 'Black']]

const storageKey = (brand) => `brandkit-vehicle-mockup:${brand.id}`
const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

const rgb = (value) => [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16))
// Colours closer than this (in RGB) look the same on a body, so only the first is offered.
const alike = (a, b) => Math.hypot(...rgb(a).map((channel, index) => channel - rgb(b)[index])) < 28

/** Paint swatches: neutral body colours first (most fleets are white), then the brand's. */
const paintSwatches = (brand) => {
  const out = []
  const offer = (value, label) => { if (!out.some(([other]) => alike(other, value))) out.push([value, label]) }
  for (const [value, label] of NEUTRALS) offer(value, label)
  for (const key of Object.keys(brand.colours ?? {})) {
    const value = colour(brand, key)
    if (/^#[0-9a-f]{6}$/i.test(value ?? '')) offer(value.toLowerCase(), key)
  }
  return out.slice(0, 12)
}

const liveriesOf = (brand) => (Array.isArray(brand.vehicles?.liveries) ? brand.vehicles.liveries : [])
const fromLivery = (brand, livery, logos) => liveryProject(brand, livery, { logos: logos.map((logo) => logo.id), fleet: fleetDefaults(brand), wrapColours: wrapColours(brand) })

/** A brand file as a data URL, read through the brand's own source (its pack or folder). */
const fileUrl = async (source, path) => {
  const bytes = new Uint8Array(await source.read(path))
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  return `data:${VEHICLE_FILE_TYPES[path.split('.').pop().toLowerCase()]};base64,${btoa(binary)}`
}

/** A new mockup: the brand's first livery, or the work truck with fleet lettering. */
const startingProject = (brand, logos) => {
  const [first] = liveriesOf(brand)
  if (first) { try { return fromLivery(brand, first, logos) } catch { /* fall through to the default */ } }
  const words = fleetDefaults(brand)
  const model = 'truck-canopy'
  return {
    schema: SCHEMA, model, paint: '#ffffff', area: 'left', backdrop: 'studio',
    placements: { left: createPlacement('left', FLEET.width / FLEET.height, areasFor(model)) },
    artwork: { kind: logos.length ? 'fleet' : 'none', logo: logos[0]?.id ?? '', tagline: words.tagline, website: words.website, upload: null },
    wrap: defaultWrap(wrapColours(brand))
  }
}

const savedDraft = (brand, logos, patterns) => readMockupDraft({
  key: storageKey(brand),
  validate: (raw) => validateProject(raw, { logos: logos.map((logo) => logo.id), patterns: patterns.map((entry) => entry.id), files: liveryFiles(brand) })
})

/** A row of colour swatches with a picker for any other colour. */
const Swatches = ({ label, colours, value, onPick, onLive, onCommit }) => (
  <div className="vehicles__paint" role="group" aria-label={label}>
    {colours.map(([hex, name]) => <button key={hex} type="button" className="vehicles__swatch" style={{ '--swatch': hex }} aria-label={`${name}`} title={name} aria-pressed={value === hex} onClick={() => onPick(hex)} />)}
    <label className="vehicles__swatch vehicles__swatch--custom" title="Another colour">
      <input type="color" aria-label={`${label}: another colour`} value={value ?? '#ffffff'} onChange={(event) => onLive(event.target.value)} onBlur={onCommit} />
    </label>
  </div>
)

const Range = ({ label, value, shown, min, max, step, disabled, onLive, onCommit }) => (
  <label className="field">
    <span className="field__label vehicles__value"><span>{label}</span><output>{shown}</output></span>
    <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
      onChange={(event) => onLive(Number(event.target.value))} onPointerUp={onCommit} onKeyUp={onCommit} onBlur={onCommit} />
  </label>
)

export const Vehicles = ({ brand, fonts, source }) => {
  const logos = useMemo(() => { try { return vehicleLogos(brand, fonts) } catch { return [] } }, [brand, fonts])
  const patterns = useMemo(() => { try { return wrapPatterns(brand, fonts) } catch { return [] } }, [brand, fonts])
  const stage = useRef(null)
  const studio = useRef(null)
  const draw = useRef(null)
  const openInput = useRef(null)
  const uploadInput = useRef(null)
  const wrapInput = useRef(null)
  const [snap, setSnap] = useState(null)
  const [message, setMessage] = useState({ text: 'Preparing the vehicle…', error: false })
  const [failed, setFailed] = useState(null)
  const [panel, setPanel] = useState('product')
  const [reviewBusy, setReviewBusy] = useState(false)
  const [remapArea, setRemapArea] = useState('left')
  const [recovery, setRecovery] = useState(null)
  const [projectsResetKey, setProjectsResetKey] = useState(0)

  // The editor asks for artwork through this ref, so it always draws with the latest fonts.
  draw.current = {
    artwork: (artwork) => {
      if (artwork.kind === 'file') return fileUrl(source, artwork.file)
      const logo = logos.find((entry) => entry.id === artwork.logo) ?? logos[0]
      if (!logo) throw new Error(`${brand.name} has no logo to place. Upload artwork instead.`)
      const svg = logo.make()
      return svgUrl(artwork.kind === 'fleet' ? fleetSvg({ brand, fonts, logoSvg: svg, ink: logo.ink, tagline: artwork.tagline, website: artwork.website }) : svg)
    },
    wrap: (wrap) => {
      if (wrap.source === 'file') return fileUrl(source, wrap.file)
      if (wrap.source === 'pattern') {
        const entry = patterns.find((item) => item.id === wrap.pattern) ?? patterns[0]
        if (!entry) throw new Error(`${brand.name} has no patterns. Choose a graphic or upload artwork.`)
        return svgUrl(entry.make())
      }
      return svgUrl(wrapGraphicSvg({ graphic: wrap.graphic, colours: wrap.colours, coverage: wrap.coverage }))
    }
  }

  useEffect(() => {
    let live = true
    let editor = null
    import('../../mockups/vehicle-studio.js').then(async ({ createVehicleStudio }) => {
      if (!live) return
      try {
        const draft = savedDraft(brand, logos, patterns)
        setRecovery(draft.recovery)
        const options = {
          container: stage.current,
          project: draft.project,
          fallback: startingProject(brand, logos),
          artworkUrl: (artwork) => draw.current.artwork(artwork),
          wrapUrl: (wrap) => draw.current.wrap(wrap),
          backdropFor: (id) => backdrop(id, brand),
          logos: logos.map((logo) => logo.id),
          patterns: patterns.map((entry) => entry.id),
          files: liveryFiles(brand),
          storageKey: draft.storageKey,
          onRecovery: setRecovery,
          onChange: setSnap,
          onStatus: (text, error) => setMessage({ text, error })
        }
        try { editor = createVehicleStudio(options) } catch (error) {
          if (!/WebGL/.test(error.message)) throw error
          const { createVehicleFlatStudio } = await import('../../mockups/vehicle-flat-studio.js')
          if (!live) return
          editor = createVehicleFlatStudio(options)
        }
        studio.current = editor
      } catch (error) {
        setFailed(error.message)
      }
    }).catch(() => live && setFailed('The vehicle editor could not be loaded. Reload the page to try again.'))
    return () => { live = false; editor?.dispose(); studio.current = null }
    // One editor for the brand (the view is keyed by it); new fonts redraw the artwork below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { if (fonts) studio.current?.refreshArtwork() }, [fonts])

  const project = snap?.project
  const areas = project ? areasFor(project.model, project.configuration) : {}
  const placement = project?.placements[project.area]
  const editable = Boolean(snap?.ready && !snap.busy && !reviewBusy)
  const selectedLayer = snap?.selectedLayer ?? project?.layers?.find((layer) => layer.id === project.selectedLayerId)
  const layerEditable = editable && Boolean(selectedLayer && selectedLayer.visible && !selectedLayer.locked && !selectedLayer.unplaced)
  const run = (action) => (...args) => studio.current?.[action](...args)
  const commit = () => studio.current?.commit()
  const swatches = useMemo(() => paintSwatches(brand), [brand])
  const wrapSwatches = useMemo(() => [...brandColours(brand).map((hex) => [hex, hex]), ...NEUTRALS.filter(([hex]) => !brandColours(brand).some((other) => alike(other, hex)))], [brand])
  const logoOptions = logos.map((logo) => ({ value: logo.id, label: logo.label, group: logo.group }))
  const liveries = liveriesOf(brand)
  const letteringFiles = [...new Set(liveries.map((livery) => livery.lettering?.file).filter(Boolean))]
  const wrapFiles = [...new Set(liveries.map((livery) => livery.wrap?.file).filter(Boolean))]
  const design = { value: 'file', label: 'Design', title: 'The lettering from the brand’s own vehicle design' }
  const kindOptions = [...(logos.length ? KIND_OPTIONS : KIND_OPTIONS.filter((option) => ['none', 'upload'].includes(option.value))), ...(letteringFiles.length ? [design] : [])]
  const sourceOptions = [
    { value: 'graphic', label: 'Graphic', title: 'A graphic in the brand’s colours' },
    ...(patterns.length ? [{ value: 'pattern', label: 'Pattern', title: 'One of the brand’s patterns' }] : []),
    { value: 'upload', label: 'Upload', title: 'Your own wrap artwork, drawn for the left side: front at its left edge' },
    ...(wrapFiles.length ? [{ value: 'file', label: 'Design', title: 'The wrap from the brand’s own vehicle design' }] : [])
  ]
  const wrap = project?.wrap
  const setWrap = (changes, options) => studio.current?.setWrap(changes, options)
  const kind = project?.artwork.kind

  const chooseKind = (next) => {
    if (next === 'upload' && !project?.artwork.upload) { uploadInput.current?.click(); return }
    if (next === 'file') { studio.current?.setArtwork({ kind: 'file', file: project?.artwork.file || letteringFiles[0] }); return }
    studio.current?.setArtwork({ kind: next })
  }
  const chooseSource = (next) => {
    if (next === 'upload' && !wrap?.upload) { wrapInput.current?.click(); return }
    if (next === 'file') { setWrap({ source: 'file', file: wrap.file || wrapFiles[0] }); return }
    setWrap({ source: next, ...(next === 'pattern' && !wrap.pattern ? { pattern: patterns[0]?.id ?? '' } : {}) })
  }
  const exportImage = async () => {
    const blob = await studio.current?.exportPng()
    if (blob) download(blob, `${brand.id}-${project.model}-${snap.view}.png`)
  }
  const exportReview = async () => {
    if (!studio.current || !project) return
    const originalView = snap.view
    const originalProject = JSON.stringify(studio.current.project)
    setReviewBusy(true)
    try {
      const images = []
      const reviewViews = snap.flat ? [['side', 'Left side'], ['opposite', 'Right side'], ['front', 'Front'], ['rear', 'Rear']] : [['angle', 'Perspective'], ['side', 'Left side'], ['opposite', 'Right side'], ['rear', 'Rear']]
      for (const [view, label] of reviewViews) {
        studio.current.cameraView(view)
        const blob = await studio.current.exportPng()
        if (!blob) throw new Error('A review view could not be rendered. Try again when the vehicle finishes loading.')
        const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('A review image could not be read.')); reader.readAsDataURL(blob) })
        if (JSON.stringify(studio.current.project) !== originalProject) throw new Error('The design changed during export. Export the review sheet again to capture a consistent set of views.')
        images.push({ label, dataUrl })
      }
      const svg = vehicleReviewSheet({ brand: brand.name, model: VEHICLE_MODELS[project.model].label, configuration: configurationSummary(project.model, project.configuration), project, images })
      download(svg, `${brand.id}-vehicle-review.svg`, 'image/svg+xml')
      setMessage({ text: 'Four-view review sheet exported with artwork dimensions.', error: false })
    } catch (error) { setMessage({ text: error.message, error: true }) } finally { studio.current?.cameraView(originalView); setReviewBusy(false) }
  }
  const save = () => {
    if (!studio.current) return
    download(studio.current.saveProject(), `${brand.id}-vehicle-mockup.json`, 'application/json')
    setMessage({ text: 'Mockup saved. Open it again here to keep editing.', error: false })
  }
  const fileChosen = (handler) => async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) await handler(file)
  }

  if (failed) return <div className="view"><section className="panel"><h2>Vehicles</h2><p className="notice notice--error" role="alert">{failed}</p></section></div>

  return (
    <div className="view vehicles">
      <section className="panel vehicles__stage-panel" aria-label="Vehicle mockup">
        <header className="vehicles__summary"><div><span className="vehicles__eyebrow">VEHICLE STUDIO</span><h1>{project ? VEHICLE_MODELS[project.model]?.label : 'Your brand, on the road'}</h1><p>{project ? configurationSummary(project.model, project.configuration) : 'Preparing your design…'}</p></div><span className="vehicles__fidelity">Generic preview</span></header>
        {recovery && <div className="notice" role="status"><p>{recovery.message}</p>{recovery.raw !== null && <button type="button" className="button button--quiet" onClick={() => download(recovery.raw, `${brand.id}-vehicle-recovered-draft.json`, 'application/json')}>Download recovered draft</button>}</div>}
        <div className="vehicles__toolbar">
          {snap?.flat ? <span className="vehicles__flat-label">Flat layout · edit placement in Artwork</span> : <Segmented label="What dragging does" value={snap?.mode ?? 'edit'} onChange={run('setMode')} options={[
            { value: 'edit', label: 'Edit artwork', title: 'Drag the logo; corners resize it, the round handle turns it' },
            { value: 'view', label: 'Rotate', title: 'Drag to turn the vehicle; scroll or pinch to zoom' }
          ]} />}
          <div className="vehicles__history">
            <button type="button" className="button button--quiet" onClick={run('undo')} disabled={!snap?.canUndo || snap?.busy || reviewBusy} title="Undo (Ctrl+Z)">Undo</button>
            <button type="button" className="button button--quiet" onClick={run('redo')} disabled={!snap?.canRedo || snap?.busy || reviewBusy} title="Redo (Ctrl+Shift+Z)">Redo</button>
          </div>
          <div className="vehicles__files">
            <button type="button" className="button button--quiet" onClick={() => openInput.current?.click()} disabled={!editable}>Open…</button>
            <input ref={openInput} type="file" accept=".json,application/json" hidden onChange={fileChosen(async (file) => {
              if (file.size > 20 * 1024 * 1024) { setMessage({ text: 'That file is too large to be a mockup.', error: true }); return }
              if (await studio.current?.openProject(await file.text())) setProjectsResetKey((key) => key + 1)
            })} />
            <button type="button" className="button button--quiet" onClick={save} disabled={!editable}>Save JSON</button>
            <button type="button" className="button" onClick={exportImage} disabled={!editable}>Export PNG</button>
          </div>
        </div>
        <div ref={stage} className="vehicle-stage" data-mode={snap?.mode ?? 'edit'} data-backdrop={project?.backdrop ?? 'studio'}>
          <div className="vehicle-stage__views" role="group" aria-label="Camera">
            {VIEWS.filter(([id]) => !snap?.flat || id !== 'angle').map(([id, label]) => <button key={id} type="button" disabled={!editable} aria-pressed={snap?.view === id} onClick={() => run('cameraView')(id)}>{label}</button>)}
          </div>
          <p className={`vehicle-stage__status${message.error ? ' vehicle-stage__status--error' : ''}`} role={message.error ? 'alert' : 'status'}>{message.text}</p>
        </div>
        <div className="vehicles__footer">
          <span className="muted">{snap?.flat ? 'Generic flat elevation · original artwork and physical placement · 3D needs WebGL' : snap?.mode === 'view' ? 'Drag to turn the vehicle · scroll or pinch to zoom' : 'Drag the logo · corners resize · the round handle turns it (Shift: 15° steps) · arrow keys nudge'}</span>
          {snap?.model && (snap.model.source
            ? <span className="vehicles__credit">Model: <a href={snap.model.source} target="_blank" rel="noopener noreferrer">{snap.model.title}</a>, {snap.model.creator} · <a href={snap.model.licenceUrl} target="_blank" rel="noopener noreferrer">{snap.model.licence}</a></span>
            : <span className="vehicles__credit">{snap.model.label}: drawn for brandkit</span>)}
        </div>
      </section>

      <aside className="panel vehicles__controls" aria-label="Mockup settings">
        <div className="vehicles__tabs" role="tablist" aria-label="Vehicle tasks">{[['product', 'Product'], ['configure', 'Configure'], ['artwork', 'Artwork'], ['review', 'Review']].map(([id, label]) => <button key={id} type="button" role="tab" id={`vehicle-tab-${id}`} aria-controls={`vehicle-panel-${id}`} aria-selected={panel === id} tabIndex={panel === id ? 0 : -1} onKeyDown={(event) => { const ids = ['product', 'configure', 'artwork', 'review']; const index = ids.indexOf(id); const next = event.key === 'ArrowRight' ? ids[(index + 1) % 4] : event.key === 'ArrowLeft' ? ids[(index + 3) % 4] : event.key === 'Home' ? ids[0] : event.key === 'End' ? ids[3] : null; if (next) { event.preventDefault(); setPanel(next); document.getElementById(`vehicle-tab-${next}`)?.focus() } }} onClick={() => setPanel(id)}>{label}{id === 'artwork' && Boolean(snap?.unplacedCount) && <span className="vehicles__count">{snap.unplacedCount}</span>}</button>)}</div>
        <div role="tabpanel" id="vehicle-panel-product" aria-labelledby="vehicle-tab-product" hidden={panel !== 'product'}>
          <section><h2>Vehicle library</h2><p className="field__hint">Choose a body, then configure its components. Your artwork stays with its original surfaces when you switch.</p><VehicleCatalog value={project?.model} disabled={!editable} onChange={run('setModel')} /></section>
        {liveries.length > 0 && (
          <section className="vehicles__brand-designs">
            <h2>Brand designs</h2>
            <div className="vehicles__liveries">
              {liveries.map((livery) => (
                <button key={livery.id} type="button" className="vehicles__livery" aria-pressed={project?.livery === livery.id} disabled={!editable}
                  onClick={async () => { if (await studio.current?.applyProject(fromLivery(brand, livery, logos), `${livery.label ?? livery.id} applied: ${brand.name}’s own design.`)) setProjectsResetKey((key) => key + 1) }}>
                  <strong>{livery.label ?? livery.id}</strong>
                  {livery.description && <span>{livery.description}</span>}
                </button>
              ))}
            </div>
            <p className="field__hint">Designs {brand.name} defines for its vehicles. Change anything below to adapt one; Undo goes back.</p>
          </section>
        )}
        </div>

        <div role="tabpanel" id="vehicle-panel-configure" aria-labelledby="vehicle-tab-configure" hidden={panel !== 'configure'}>
        <fieldset className="vehicles__fieldset" disabled={!editable}>
        <section>
          <h2>Components and finish</h2>
          {project?.configuration && <>
            {project.model === 'truck-canopy' && <Field label="Bed cover"><Select value={project.configuration.cover} options={COVER_OPTIONS} onChange={(cover) => run('setConfiguration')({ cover })} disabled={!editable} /></Field>}
            {!['open', 'tonneau', 'service'].includes(project.configuration.cover) && <Field label="Canopy sides"><Select value={project.configuration.sides} options={SIDE_OPTIONS} onChange={(sides) => run('setConfiguration')({ sides })} disabled={!editable} /></Field>}
            <label className="vehicles__check"><input type="checkbox" checked={project.configuration.rack} onChange={(event) => run('setConfiguration')({ rack: event.target.checked })} /><span>{project.configuration.cover === 'open' ? 'Bed-mounted ladder rack' : 'Roof / ladder rack'}</span></label>
            {!['open', 'tonneau'].includes(project.configuration.cover) && <><label className="vehicles__check"><input type="checkbox" checked={!project.configuration.canopyPaint} onChange={(event) => run('setConfiguration')({ canopyPaint: event.target.checked ? null : '#30383e' })} /><span>Match {project.configuration.cover === 'service' ? 'service body' : 'canopy'} to body paint</span></label>{project.configuration.canopyPaint && <><span className="field__label">{project.configuration.cover === 'service' ? 'Service body' : 'Canopy'} paint</span><Swatches label="Component paint" colours={swatches} value={project.configuration.canopyPaint} onPick={(canopyPaint) => run('setConfiguration')({ canopyPaint })} onLive={(canopyPaint) => run('setConfiguration')({ canopyPaint })} onCommit={() => {}} /></>}</>}
          </>}
          <span className="field__label">Paint</span>
          <Swatches label="Body paint" colours={swatches} value={project?.paint} onPick={(value) => run('setPaint')(value)} onLive={(value) => run('setPaint')(value, { live: true })} onCommit={commit} />
          {Boolean(snap?.unplacedCount) && <div className="vehicles__retained"><strong>{snap.unplacedCount} artwork {snap.unplacedCount === 1 ? 'layer retained' : 'layers retained'}</strong><p>Restore its original component or choose a new surface in Artwork.</p><button type="button" className="button button--quiet" onClick={() => setPanel('artwork')}>Review unplaced artwork</button></div>}
        </section>

        <section>
          <h2>Wrap</h2>
          <div className="vehicles__grid2"><Segmented label="Wrap coverage" value={wrap?.coverage ?? 'none'} onChange={(coverage) => setWrap({ coverage })} options={COVERAGE_OPTIONS} /></div>
          {wrap && wrap.coverage !== 'none' && <>
            <Segmented label="Wrap artwork" value={wrap.source} onChange={chooseSource} options={sourceOptions} />
            {snap?.wrapPreview && <div className="vehicles__preview vehicles__preview--wide"><img src={snap.wrapPreview} alt="The wrap artwork, as drawn for the left side" /></div>}
            {wrap.source === 'graphic' && <>
              <Field label="Graphic">
                <Select value={wrap.graphic} options={Object.entries(WRAP_GRAPHIC_LABELS).map(([value, label]) => ({ value, label }))} onChange={(graphic) => setWrap({ graphic })} />
              </Field>
              {[0, 1].map((index) => (
                <div key={index} className="vehicles__colour-row">
                  <span className="field__label">{index ? 'Second colour' : 'Main colour'}</span>
                  <Swatches label={index ? 'Second wrap colour' : 'Main wrap colour'} colours={wrapSwatches} value={wrap.colours[index]}
                    onPick={(value) => setWrap({ colours: wrap.colours.map((old, i) => (i === index ? value : old)) })}
                    onLive={(value) => setWrap({ colours: wrap.colours.map((old, i) => (i === index ? value : old)) }, { live: true })} onCommit={commit} />
                </div>
              ))}
            </>}
            {wrap.source === 'pattern' && (
              <Field label="Pattern">
                <Select value={wrap.pattern} options={patterns.map((entry) => ({ value: entry.id, label: entry.label }))} onChange={(next) => setWrap({ pattern: next })} />
              </Field>
            )}
            {wrap.source === 'upload' && <p className="field__hint">{wrap.upload?.name} · drawn for the left side, its front at the artwork’s left edge.</p>}
            {wrap.source === 'file' && wrapFiles.length > 1 && (
              <Field label="Design">
                <Select value={wrap.file} options={wrapFiles.map((path) => ({ value: path, label: path.split('/').pop() }))} onChange={(file) => setWrap({ file })} />
              </Field>
            )}
            <button type="button" className="button button--quiet vehicles__wide" onClick={() => wrapInput.current?.click()}>{wrap.upload ? 'Replace wrap artwork…' : 'Upload wrap artwork…'}</button>
            <Range label="Scale" value={wrap.scale} shown={`${Math.round(wrap.scale * 100)}%`} min="1" max="4" step="0.05" disabled={!editable}
              onLive={(scale) => setWrap({ scale }, { live: true })} onCommit={commit} />
            <div className="vehicles__offsets">
              <Range label="Across" value={wrap.offsetU} shown={wrap.offsetU.toFixed(2)} min="-1" max="1" step="0.01" disabled={!editable}
                onLive={(offsetU) => setWrap({ offsetU }, { live: true })} onCommit={commit} />
              <Range label="Up" value={wrap.offsetV} shown={wrap.offsetV.toFixed(2)} min="-1" max="1" step="0.01" disabled={!editable}
                onLive={(offsetV) => setWrap({ offsetV }, { live: true })} onCommit={commit} />
            </div>
            <label className="vehicles__check">
              <input type="checkbox" checked={wrap.mirror} onChange={(event) => setWrap({ mirror: event.target.checked })} />
              <span>Mirror on the right side, so the design leads from the front on both sides</span>
            </label>
            <p className="field__hint">The wrap covers painted panels only; glass, lights and trim stay clear. Logos and lettering sit on top of it.</p>
          </>}
          <input ref={wrapInput} type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" onChange={fileChosen((file) => studio.current?.upload(file, { target: 'wrap' }))} />
        </section>
        </fieldset>
        </div>

        <div role="tabpanel" id="vehicle-panel-artwork" aria-labelledby="vehicle-tab-artwork" hidden={panel !== 'artwork'}>
        <section className="vehicles__layers" aria-label="Artwork layers">
          <div className="vehicles__section-heading"><h2>Artwork layers</h2><button type="button" className="button button--quiet" disabled={!editable} onClick={() => run('addLayer')()}>+ Add layer</button></div>
          {[false, true].map((unplaced) => <div key={String(unplaced)} className="vehicles__layer-group">{unplaced && project?.layers?.some((layer) => layer.unplaced) && <h3>Unplaced artwork</h3>}{project?.layers?.filter((layer) => Boolean(layer.unplaced) === unplaced).map((layer) => <button type="button" className="vehicles__layer" key={layer.id} data-layer-id={layer.id} aria-pressed={project.selectedLayerId === layer.id} disabled={!editable} onClick={() => run('selectLayer')(layer.id)}><span className="vehicles__layer-symbol">{layer.unplaced ? '↪' : layer.visible ? '◈' : '○'}</span><span><strong>{layer.name}</strong><small>{layer.unplaced ? layer.unplacedReason : areas[layer.area]?.label ?? layer.area}{layer.locked ? ' · Locked' : ''}</small></span></button>)}</div>)}
          {selectedLayer && <>
            <Field label="Layer name"><input type="text" maxLength={100} value={selectedLayer.name} disabled={!editable} onChange={(event) => run('updateLayer')({ name: event.target.value })} /></Field>
            <div className="vehicles__layer-flags"><label className="vehicles__check"><input type="checkbox" checked={selectedLayer.visible} disabled={!editable} onChange={(event) => run('updateLayer')({ visible: event.target.checked })} /><span>Visible</span></label><label className="vehicles__check"><input type="checkbox" checked={selectedLayer.locked} disabled={!editable} onChange={(event) => run('updateLayer')({ locked: event.target.checked })} /><span>Lock artwork</span></label></div>
            <div className="vehicles__actions"><button type="button" className="button button--quiet" disabled={!editable} onClick={() => run('duplicateLayer')()}>Duplicate</button><button type="button" className="button button--quiet" disabled={!editable} onClick={() => run('moveLayer')(-1)}>Move down</button><button type="button" className="button button--quiet" disabled={!editable} onClick={() => run('moveLayer')(1)}>Move up</button><button type="button" className="button button--quiet" disabled={!editable} onClick={() => run('removeLayer')()}>Remove layer</button></div>
            {selectedLayer.unplaced && <div className="vehicles__retained"><strong>Original placement preserved</strong><p>Stored artwork: {selectedLayer.placement.width.toFixed(2)} × {(selectedLayer.placement.width / (selectedLayer.aspect || 1)).toFixed(2)} m.</p><p>{selectedLayer.unplacedReason} Restore that configuration to recover it automatically, or place it on a chosen surface.</p><label className="field"><span className="field__label">New surface</span><select aria-label="New surface" value={Object.hasOwn(areas, remapArea) ? remapArea : 'left'} onChange={(event) => setRemapArea(event.target.value)}>{Object.entries(areas).map(([id, area]) => <option value={id} key={id}>{area.label}</option>)}</select></label><button type="button" className="button" disabled={!editable || selectedLayer.locked} onClick={() => run('remapLayer')(selectedLayer.id, Object.hasOwn(areas, remapArea) ? remapArea : 'left')}>Place on selected surface</button></div>}
          </>}
        </section>
        <fieldset className="vehicles__fieldset" disabled={!layerEditable}>
        <section>
          <h2>Selected artwork</h2>
          <Segmented label="Logo" value={kind ?? 'fleet'} onChange={chooseKind} options={kindOptions} />
          {snap?.preview && kind !== 'none' && <div className="vehicles__preview"><img src={snap.preview} alt="The logo artwork being placed" /></div>}
          {(kind === 'logo' || kind === 'fleet') && logos.length > 0 && (
            <Field label="Logo">
              <Select value={project?.artwork.logo} options={logoOptions} onChange={(logo) => studio.current?.setArtwork({ logo })} />
            </Field>
          )}
          {kind === 'fleet' && <>
            <Field label="Supporting line">
              <input type="text" maxLength={100} value={project.artwork.tagline} onChange={(event) => studio.current?.setArtwork({ tagline: event.target.value }, { live: true })} onBlur={commit} />
            </Field>
            <Field label="Website">
              <input type="text" maxLength={80} spellCheck={false} placeholder="example.com" value={project.artwork.website} onChange={(event) => studio.current?.setArtwork({ website: event.target.value }, { live: true })} onBlur={commit} />
            </Field>
          </>}
          <button type="button" className="button button--quiet vehicles__wide" onClick={() => uploadInput.current?.click()}>{project?.artwork.upload ? 'Replace uploaded logo…' : 'Upload a logo…'}</button>
          <input ref={uploadInput} type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" onChange={fileChosen((file) => studio.current?.upload(file))} />
          {kind === 'upload' && project.artwork.upload && <p className="field__hint">{project.artwork.upload.name}</p>}
          {kind === 'file' && letteringFiles.length > 1 && (
            <Field label="Design">
              <Select value={project.artwork.file} options={letteringFiles.map((path) => ({ value: path, label: path.split('/').pop() }))} onChange={(file) => studio.current?.setArtwork({ file })} />
            </Field>
          )}

          {kind !== 'none' && project && !selectedLayer?.unplaced && <>
            <span className="field__label">Where</span>
            <div className="vehicles__grid2"><Segmented label="Body area" value={project.area} onChange={run('selectArea')} options={Object.entries(areas).map(([value, area]) => ({ value, label: area.label }))} /></div>
            <p className="field__hint">Or click a painted panel on the vehicle.</p>
            {placement && areas[project.area] && <>
              <Range label="Width" value={placement.width} shown={`${placement.width.toFixed(2)} m`} min={Math.min(0.15, placement.width)} max={areas[project.area].width} step="0.01" disabled={!editable}
                onLive={(width) => run('setPlacement')({ width }, { live: true })} onCommit={commit} />
              <Range label="Rotation" value={placement.rotation} shown={`${Math.round(placement.rotation)}°`} min="-180" max="180" step="1" disabled={!editable}
                onLive={(rotation) => run('setPlacement')({ rotation }, { live: true })} onCommit={commit} />
              <div className="vehicles__offsets">
                {[['u', 'Across'], ['v', 'Up']].map(([key, label]) => (
                  <Field key={key} label={`${label} (m)`}>
                    <input type="number" step="0.01" inputMode="decimal" value={Number(placement[key].toFixed(2))} disabled={!editable}
                      onChange={(event) => { const value = Number(event.target.value); if (event.target.value !== '' && Number.isFinite(value)) run('setPlacement')({ [key]: value }, { live: true }) }} onBlur={commit} />
                  </Field>
                ))}
              </div>
              <p className="field__hint">{placement.width.toFixed(2)} × {(placement.width / (snap?.aspect || 1)).toFixed(2)} m on a vehicle shown {lengthOf(project.model)} m long: a visual mockup, not a measurement for cutting vinyl.</p>
              <div className="vehicles__actions">
                <button type="button" className="button button--quiet" onClick={run('centre')} disabled={!editable}>Centre</button>
                <button type="button" className="button button--quiet" onClick={run('fit')} disabled={!editable}>Fit to area</button>
                <button type="button" className="button button--quiet" onClick={run('resetArea')} disabled={!editable}>Reset</button>
              </div>
              <button type="button" className="button button--quiet vehicles__wide" onClick={run('copyToOtherSide')} disabled={!editable || !areas[OPPOSITE[project.area]]}>
                {areas[OPPOSITE[project.area]] ? `Copy to ${areas[OPPOSITE[project.area]].label.toLowerCase()}` : 'Copy to the other side'}
              </button>
            </>}
          </>}
        </section>
        </fieldset>
        </div>

        <div role="tabpanel" id="vehicle-panel-review" aria-labelledby="vehicle-tab-review" hidden={panel !== 'review'}>
        <MockupProjects brandId={brand.id} kind="vehicle" project={project} disabled={!editable} resetKey={projectsResetKey} defaultName={`${brand.name} vehicle`} onOpen={(next) => studio.current?.applyProject(next, 'Saved project opened.')} onStatus={(text, error) => setMessage({ text, error })} />
        <fieldset className="vehicles__fieldset" disabled={!editable}><section>
          <h2>Scene</h2>
          <Segmented label="Backdrop" value={project?.backdrop ?? 'studio'} onChange={run('setBackdrop')} options={Object.entries(BACKDROP_LABELS).map(([value, label]) => ({ value, label }))} />
        </section>
        <section><h2>Design handoff</h2><p className="field__hint">Export a four-view sheet with the selected configuration and each artwork layer’s dimensions.</p><button type="button" className="button" disabled={!editable} onClick={exportReview}>{reviewBusy ? 'Rendering review sheet…' : 'Export review sheet'}</button><p className="field__hint">This is a visual approval aid. Production templates and actual vehicle dimensions still need to be checked.</p></section>
        </fieldset>
        </div>
      </aside>
    </div>
  )
}
