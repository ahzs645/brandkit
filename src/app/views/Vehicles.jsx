// Vehicles: the brand's artwork on a car, placed directly on the body. The 3D editor is in
// src/mockups/vehicle-studio.js; this view is its controls. Artwork comes from the open brand:
// any of its logos, a fleet layout set in its type, or an uploaded image.

import { useEffect, useMemo, useRef, useState } from 'react'
import { colour } from '../../engine/brand.js'
import { download } from '../../export/render.js'
import { Select } from '../../ui/Select.jsx'
import { Field, Segmented } from '../ui.jsx'
import { AREAS, OPPOSITE, SCHEMA, createPlacement, validateProject } from '../../mockups/vehicle-layout.js'
import { FLEET, fleetDefaults, fleetSvg, vehicleLogos } from '../../mockups/vehicle-artwork.js'
import { VEHICLE_MODELS } from '../../mockups/vehicle-models.js'
import '../../mockups/vehicles.css'

const MODEL_OPTIONS = [
  { value: 'shc', label: 'Hatchback', title: VEHICLE_MODELS.shc.note },
  { value: 'suv', label: 'SUV', title: VEHICLE_MODELS.suv.note },
  { value: 'compact', label: 'Compact SUV', title: VEHICLE_MODELS.compact.note }
]
const AREA_OPTIONS = Object.entries(AREAS).map(([value, area]) => ({ value, label: area.label }))
const KIND_OPTIONS = [
  { value: 'logo', label: 'Logo', title: 'One of the brand’s logos, as drawn' },
  { value: 'fleet', label: 'Fleet layout', title: 'The logo with a supporting line, a rule and the website' },
  { value: 'upload', label: 'Upload', title: 'Your own SVG, PNG, JPEG or WebP' }
]
const VIEWS = [['angle', 'Perspective'], ['side', 'Left'], ['opposite', 'Right'], ['hood', 'Bonnet'], ['rear', 'Rear']]
const NEUTRALS = [['#f3f2ee', 'Warm white'], ['#4b4f56', 'Graphite'], ['#16181c', 'Black']]

const storageKey = (brand) => `brandkit-vehicle-mockup:${brand.id}`
const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

const rgb = (value) => [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16))
// Colours closer than this (in RGB) look the same on a car body, so only the first is offered.
const alike = (a, b) => Math.hypot(...rgb(a).map((channel, index) => channel - rgb(b)[index])) < 28

/** Paint swatches: the brand's own colours, then neutral body colours, none that look alike. */
const paintSwatches = (brand) => {
  const out = []
  const offer = (value, label) => { if (!out.some(([other]) => alike(other, value))) out.push([value, label]) }
  for (const key of Object.keys(brand.colours ?? {})) {
    const value = colour(brand, key)
    if (/^#[0-9a-f]{6}$/i.test(value ?? '')) offer(value.toLowerCase(), key)
  }
  for (const [value, label] of NEUTRALS) offer(value, label)
  return out.slice(0, 10)
}

const startingProject = (brand, logos) => {
  const words = fleetDefaults(brand)
  return {
    schema: SCHEMA, model: 'shc', paint: '#f3f2ee', area: 'left',
    placements: { left: createPlacement('left', FLEET.width / FLEET.height) },
    artwork: { kind: 'fleet', logo: logos[0]?.id ?? '', tagline: words.tagline, website: words.website, upload: null }
  }
}

const savedDraft = (brand, logos) => {
  try {
    const raw = localStorage.getItem(storageKey(brand))
    return raw ? validateProject(JSON.parse(raw), { logos: logos.map((logo) => logo.id) }) : null
  } catch { return null }
}

export const Vehicles = ({ brand, fonts }) => {
  const logos = useMemo(() => { try { return vehicleLogos(brand, fonts) } catch { return [] } }, [brand, fonts])
  const stage = useRef(null)
  const studio = useRef(null)
  const artworkFor = useRef(null)
  const openInput = useRef(null)
  const uploadInput = useRef(null)
  const [snap, setSnap] = useState(null)
  const [message, setMessage] = useState({ text: 'Preparing the vehicle…', error: false })
  const [failed, setFailed] = useState(null)

  // The editor asks for artwork through this ref, so it always draws with the latest fonts.
  artworkFor.current = (artwork) => {
    const logo = logos.find((entry) => entry.id === artwork.logo) ?? logos[0]
    if (!logo) throw new Error(`${brand.name} has no logo to place. Upload artwork instead.`)
    const svg = logo.make()
    return svgUrl(artwork.kind === 'fleet' ? fleetSvg({ brand, fonts, logoSvg: svg, ink: logo.ink, tagline: artwork.tagline, website: artwork.website }) : svg)
  }

  useEffect(() => {
    let live = true
    let editor = null
    import('../../mockups/vehicle-studio.js').then(({ createVehicleStudio }) => {
      if (!live) return
      try {
        editor = createVehicleStudio({
          container: stage.current,
          project: savedDraft(brand, logos),
          fallback: startingProject(brand, logos),
          artworkUrl: (artwork) => artworkFor.current(artwork),
          logos: logos.map((logo) => logo.id),
          storageKey: storageKey(brand),
          onChange: setSnap,
          onStatus: (text, error) => setMessage({ text, error })
        })
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
  const placement = project?.placements[project.area]
  const editable = Boolean(snap?.ready && !snap.busy)
  const run = (action) => (...args) => studio.current?.[action](...args)
  const commit = () => studio.current?.commit()
  const swatches = useMemo(() => paintSwatches(brand), [brand])
  const logoOptions = logos.map((logo) => ({ value: logo.id, label: logo.label, group: logo.group }))
  const kindOptions = logos.length ? KIND_OPTIONS : KIND_OPTIONS.filter((option) => option.value === 'upload')

  const chooseKind = (kind) => {
    if (kind === 'upload' && !project?.artwork.upload) { uploadInput.current?.click(); return }
    studio.current?.setArtwork({ kind })
  }
  const exportImage = async () => {
    const blob = await studio.current?.exportPng()
    if (blob) download(blob, `${brand.id}-vehicle-${project.model}-${project.area}.png`)
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
        <div className="vehicles__toolbar">
          <Segmented label="What dragging does" value={snap?.mode ?? 'edit'} onChange={run('setMode')} options={[
            { value: 'edit', label: 'Edit artwork', title: 'Drag the artwork; corners resize it, the round handle turns it' },
            { value: 'view', label: 'Rotate car', title: 'Drag to turn the car; scroll or pinch to zoom' }
          ]} />
          <div className="vehicles__history">
            <button type="button" className="button button--quiet" onClick={run('undo')} disabled={!snap?.canUndo || snap?.busy} title="Undo (Ctrl+Z)">Undo</button>
            <button type="button" className="button button--quiet" onClick={run('redo')} disabled={!snap?.canRedo || snap?.busy} title="Redo (Ctrl+Shift+Z)">Redo</button>
          </div>
          <div className="vehicles__files">
            <button type="button" className="button button--quiet" onClick={() => openInput.current?.click()}>Open…</button>
            <input ref={openInput} type="file" accept=".json,application/json" hidden onChange={fileChosen(async (file) => {
              if (file.size > 9 * 1024 * 1024) { setMessage({ text: 'That file is too large to be a mockup.', error: true }); return }
              await studio.current?.openProject(await file.text())
            })} />
            <button type="button" className="button button--quiet" onClick={save} disabled={!editable}>Save mockup</button>
            <button type="button" className="button" onClick={exportImage} disabled={!editable}>Export PNG</button>
          </div>
        </div>
        <div ref={stage} className="vehicle-stage" data-mode={snap?.mode ?? 'edit'}>
          <div className="vehicle-stage__views" role="group" aria-label="Camera">
            {VIEWS.map(([id, label]) => <button key={id} type="button" aria-pressed={snap?.view === id} onClick={() => run('cameraView')(id)}>{label}</button>)}
          </div>
          <p className={`vehicle-stage__status${message.error ? ' vehicle-stage__status--error' : ''}`} role={message.error ? 'alert' : 'status'}>{message.text}</p>
        </div>
        <div className="vehicles__footer">
          <span className="muted">{snap?.mode === 'view' ? 'Drag to turn the car · scroll or pinch to zoom' : 'Drag the artwork · corners resize · the round handle turns it (Shift: 15° steps) · arrow keys nudge'}</span>
          {snap?.model && <span className="vehicles__credit">Model: <a href={snap.model.source} target="_blank" rel="noopener noreferrer">{snap.model.title}</a>, {snap.model.creator} · <a href={snap.model.licenceUrl} target="_blank" rel="noopener noreferrer">{snap.model.licence}</a></span>}
        </div>
      </section>

      <aside className="panel vehicles__controls" aria-label="Mockup settings">
        <section>
          <h2>Vehicle</h2>
          <Segmented label="Vehicle" value={project?.model ?? 'shc'} onChange={run('setModel')} options={MODEL_OPTIONS} />
          <div className="vehicles__paint" role="group" aria-label="Body paint">
            {swatches.map(([value, label]) => <button key={value} type="button" className="vehicles__swatch" style={{ '--swatch': value }} aria-label={`${label} paint`} title={label} aria-pressed={project?.paint === value} onClick={() => run('setPaint')(value)} />)}
            <label className="vehicles__swatch vehicles__swatch--custom" title="Another colour">
              <input type="color" aria-label="Choose another paint colour" value={project?.paint ?? '#f3f2ee'} onChange={(event) => run('setPaint')(event.target.value, { live: true })} onBlur={commit} />
            </label>
          </div>
        </section>

        <section>
          <h2>Area</h2>
          <div className="vehicles__areas"><Segmented label="Body area" value={project?.area ?? 'left'} onChange={run('selectArea')} options={AREA_OPTIONS} /></div>
          <p className="field__hint">Or click a painted panel on the car. Glass, lights and trim stay clear.</p>
        </section>

        <section>
          <h2>Artwork</h2>
          <Segmented label="Artwork" value={project?.artwork.kind ?? 'fleet'} onChange={chooseKind} options={kindOptions} />
          {snap?.preview && <div className="vehicles__preview"><img src={snap.preview} alt="The artwork being placed" /></div>}
          {project?.artwork.kind !== 'upload' && logos.length > 0 && (
            <Field label="Logo">
              <Select value={project?.artwork.logo} options={logoOptions} onChange={(logo) => studio.current?.setArtwork({ logo })} />
            </Field>
          )}
          {project?.artwork.kind === 'fleet' && <>
            <Field label="Supporting line">
              <input type="text" maxLength={100} value={project.artwork.tagline} onChange={(event) => studio.current?.setArtwork({ tagline: event.target.value }, { live: true })} onBlur={commit} />
            </Field>
            <Field label="Website">
              <input type="text" maxLength={80} spellCheck={false} placeholder="example.com" value={project.artwork.website} onChange={(event) => studio.current?.setArtwork({ website: event.target.value }, { live: true })} onBlur={commit} />
            </Field>
          </>}
          <button type="button" className="button button--quiet vehicles__wide" onClick={() => uploadInput.current?.click()}>{project?.artwork.upload ? 'Replace uploaded artwork…' : 'Upload artwork…'}</button>
          <input ref={uploadInput} type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" onChange={fileChosen((file) => studio.current?.upload(file))} />
          {project?.artwork.kind === 'upload' && project.artwork.upload && <p className="field__hint">{project.artwork.upload.name}</p>}
        </section>

        <section>
          <h2>Position</h2>
          {placement && <>
            <label className="field">
              <span className="field__label vehicles__value"><span>Width</span><output>{placement.width.toFixed(2)} m</output></span>
              <input type="range" min={Math.min(0.15, placement.width)} max={AREAS[project.area].width} step="0.01" value={placement.width} disabled={!editable}
                onChange={(event) => run('setPlacement')({ width: Number(event.target.value) }, { live: true })} onPointerUp={commit} onKeyUp={commit} onBlur={commit} />
            </label>
            <label className="field">
              <span className="field__label vehicles__value"><span>Rotation</span><output>{Math.round(placement.rotation)}°</output></span>
              <input type="range" min="-180" max="180" step="1" value={placement.rotation} disabled={!editable}
                onChange={(event) => run('setPlacement')({ rotation: Number(event.target.value) }, { live: true })} onPointerUp={commit} onKeyUp={commit} onBlur={commit} />
            </label>
            <div className="vehicles__offsets">
              {[['u', 'Across'], ['v', 'Up']].map(([key, label]) => (
                <Field key={key} label={`${label} (m)`}>
                  <input type="number" step="0.01" inputMode="decimal" value={Number(placement[key].toFixed(2))} disabled={!editable}
                    onChange={(event) => { const value = Number(event.target.value); if (event.target.value !== '' && Number.isFinite(value)) run('setPlacement')({ [key]: value }, { live: true }) }} onBlur={commit} />
                </Field>
              ))}
            </div>
            <p className="field__hint">{placement.width.toFixed(2)} × {(placement.width / (snap?.aspect || 1)).toFixed(2)} m on a car shown 4.7 m long: a visual mockup, not a measurement for cutting vinyl.</p>
            <div className="vehicles__actions">
              <button type="button" className="button button--quiet" onClick={run('centre')} disabled={!editable}>Centre</button>
              <button type="button" className="button button--quiet" onClick={run('fit')} disabled={!editable}>Fit to area</button>
              <button type="button" className="button button--quiet" onClick={run('resetArea')} disabled={!editable}>Reset</button>
            </div>
            <button type="button" className="button button--quiet vehicles__wide" onClick={run('copyToOtherSide')} disabled={!editable || !OPPOSITE[project.area]}>
              {OPPOSITE[project.area] ? `Copy to the ${OPPOSITE[project.area]} side` : 'Copy to the other side'}
            </button>
          </>}
        </section>
      </aside>
    </div>
  )
}
