// Devices: the brand's screens in device frames. A scene of one to three devices (a monitor, a
// tablet and a phone; a laptop with a phone in front; three phones), each chosen from brandkit's
// catalogue, each showing a screenshot, a brand's own file or a brand screen. The frames are
// drawn in code (src/mockups/device-catalog.js) so a scene can mix kinds of device freely; a
// brand can add frames and whole mockups of its own in brand.json (`devices`). Everything is
// drawn as one SVG in the browser: nothing is uploaded anywhere.

import { useEffect, useMemo, useRef, useState } from 'react'
import { colour } from '../../engine/brand.js'
import { download, rasterise } from '../../export/render.js'
import { Select } from '../../ui/Select.jsx'
import { Field, Segmented, SvgImage } from '../ui.jsx'
import { CANVAS_LABELS, CATEGORIES, DEVICES, PRESETS, variantsOf } from '../../mockups/device-catalog.js'
import { finishOf, layoutOf, sceneSvg } from '../../mockups/device-frame.js'
import { DEVICE_FILE_TYPES, MAX_UPLOAD, brandMockups, catalogFor, createProject, creditsOf, deviceFiles, finishLabel, mockupProject, validateProject } from '../../mockups/device-project.js'
import { brandScreen } from '../../mockups/device-artwork.js'
import { brandColours, vehicleLogos } from '../../mockups/vehicle-artwork.js'
import '../../mockups/devices.css'

const storageKey = (brand) => `brandkit-device-mockup:${brand.id}`
const EXPORT_WIDTHS = [['1600', '1600 px'], ['2400', '2400 px'], ['3840', '3840 px']]
const NEUTRAL_GROUNDS = [['#ffffff', 'White'], ['#f3f2ee', 'Warm white'], ['#16181c', 'Black']]
const isHex = (value) => /^#[0-9a-f]{6}$/i.test(value ?? '')

/** A brand file as a data URL, read through the brand's own source (its pack or folder). */
const fileUrl = async (source, path) => {
  const bytes = new Uint8Array(await source.read(path))
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  return `data:${DEVICE_FILE_TYPES[path.split('.').pop().toLowerCase()]};base64,${btoa(binary)}`
}

const readUpload = (file) => new Promise((resolve, reject) => {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { reject(new Error('Choose a PNG, JPEG or WebP image.')); return }
  if (file.size > MAX_UPLOAD) { reject(new Error('That image is over 12 MB. Export it smaller and try again.')); return }
  const reader = new FileReader()
  reader.onerror = () => reject(new Error('The image could not be read.'))
  reader.onload = () => {
    const image = new Image()
    image.onerror = () => reject(new Error('The browser could not open that image.'))
    image.onload = () => resolve({ name: file.name.slice(0, 120), dataUrl: reader.result, width: image.naturalWidth, height: image.naturalHeight })
    image.src = reader.result
  }
  reader.readAsDataURL(file)
})

const Swatches = ({ label, colours, value, onPick, none }) => (
  <div className="devices__swatches" role="group" aria-label={label}>
    {none && <button type="button" className="devices__swatch devices__swatch--none" aria-label="Transparent" title="Transparent" aria-pressed={value == null} onClick={() => onPick(null)} />}
    {colours.map(([hex, name]) => <button key={`${hex}-${name}`} type="button" className="devices__swatch" style={{ '--swatch': hex }} aria-label={name} title={name} aria-pressed={value === hex} onClick={() => onPick(hex)} />)}
    {none && <label className="devices__swatch devices__swatch--custom" title="Another colour">
      <input type="color" aria-label={`${label}: another colour`} value={value ?? '#ffffff'} onChange={(event) => onPick(event.target.value)} />
    </label>}
  </div>
)

export const Devices = ({ brand, fonts, source }) => {
  const catalog = useMemo(() => catalogFor(brand), [brand])
  const files = useMemo(() => deviceFiles(brand), [brand])
  const mockups = useMemo(() => brandMockups(brand), [brand])
  const logos = useMemo(() => { try { return vehicleLogos(brand, fonts) } catch { return [] } }, [brand, fonts])
  const primary = useMemo(() => { const value = colour(brand, 'primary'); return isHex(value) ? value.toLowerCase() : '#16181c' }, [brand])
  const grounds = useMemo(() => {
    const out = [...NEUTRAL_GROUNDS]
    const far = (a, b) => Math.hypot(...[1, 3, 5].map((at) => parseInt(a.slice(at, at + 2), 16) - parseInt(b.slice(at, at + 2), 16))) >= 28
    for (const hex of brandColours(brand)) if (out.every(([other]) => far(other, hex))) out.push([hex, hex])
    return out.slice(0, 11)
  }, [brand])
  const [message, setMessage] = useState({ text: '', error: false })
  const [exportWidth, setExportWidth] = useState('2400')
  const [loaded, setLoaded] = useState({})
  const openInput = useRef(null)
  const uploadInputs = useRef([])

  const [project, setProject] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey(brand))
      if (raw) return validateProject(JSON.parse(raw), { catalog, files })
    } catch { /* a draft that no longer opens is dropped */ }
    if (mockups[0]) { try { return mockupProject(brand, mockups[0], catalog) } catch { /* fall through */ } }
    return createProject('three-screens', { catalog })
  })

  // The draft is kept in the browser; screenshots too large for it are left out of the draft only.
  useEffect(() => {
    try { localStorage.setItem(storageKey(brand), JSON.stringify(project)) } catch {
      try { localStorage.setItem(storageKey(brand), JSON.stringify({ ...project, slots: project.slots.map((slot) => (slot.screen.kind === 'upload' ? { ...slot, screen: { ...slot.screen, kind: 'brand', upload: null } } : slot)) })) } catch { /* no draft */ }
    }
  }, [brand, project])

  // The brand's own files a mockup uses (screenshots, frames) are read once each.
  const wanted = useMemo(() => [...new Set([
    ...project.slots.map((slot) => (slot.screen.kind === 'file' ? slot.screen.file : null)),
    ...project.slots.map((slot) => catalog[slot.device]?.frame?.image ?? null)
  ].filter(Boolean))], [project, catalog])
  useEffect(() => {
    let live = true
    for (const path of wanted) {
      if (loaded[path] !== undefined) continue
      fileUrl(source, path).then((url) => live && setLoaded((state) => ({ ...state, [path]: url })), () => live && setLoaded((state) => ({ ...state, [path]: null })))
    }
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, source])

  const background = project.background.kind === 'colour' ? project.background.value : null
  const credits = creditsOf(project, catalog)
  const svg = useMemo(() => {
    try {
      return sceneSvg({
        layout: layoutOf(project.preset), canvas: project.canvas, background, shadow: project.shadow, brandColour: primary,
        title: `${brand.name}: ${PRESETS[project.preset].label.toLowerCase()}`,
        credit: credits.map((entry) => entry.credit).filter(Boolean).join(' · '),
        slots: project.slots.map((slot) => {
          const device = catalog[slot.device]
          const [w, h] = slot.turned && device.rotates ? [device.screen[1], device.screen[0]] : device.screen
          const href = slot.screen.kind === 'upload' ? slot.screen.upload?.dataUrl
            : slot.screen.kind === 'file' ? loaded[slot.screen.file]
              : slot.screen.kind === 'brand' ? brandScreen({ logos, ground: primary, width: w, height: h }) : null
          return { device, finish: slot.finish, turned: slot.turned, href, fit: slot.screen.fit, ground: slot.screen.fit === 'contain' ? '#000000' : '#101114', frameHref: device.frame ? loaded[device.frame.image] : undefined }
        })
      })
    } catch (error) { return null }
  }, [project, catalog, loaded, logos, primary, background, brand.name, credits])

  const change = (changes) => setProject((state) => ({ ...state, ...changes, mockup: null }))
  const changeSlot = (index, changes) => setProject((state) => ({ ...state, mockup: null, slots: state.slots.map((slot, at) => (at === index ? { ...slot, ...changes } : slot)) }))
  const setDevice = (index, id) => {
    const device = catalog[id]
    changeSlot(index, { device: id, finish: device.finishes?.includes(project.slots[index].finish) ? project.slots[index].finish : device.finishes?.[0] ?? null, turned: project.slots[index].turned && Boolean(device.rotates) })
  }
  const setScreen = (index, changes) => changeSlot(index, { screen: { ...project.slots[index].screen, ...changes } })

  const deviceOptions = useMemo(() => Object.entries(CATEGORIES).flatMap(([category, group]) => Object.entries(catalog)
    .filter(([, device]) => device.category === category)
    .map(([value, device]) => ({ value, label: device.label, title: device.note, group }))), [catalog])
  const variants = useMemo(() => Object.values(catalog).reduce((sum, device) => sum + variantsOf(device), 0), [catalog])

  const upload = async (index, file) => {
    try {
      const image = await readUpload(file)
      setScreen(index, { kind: 'upload', upload: image })
      setMessage({ text: `${image.name} placed on device ${index + 1} (${image.width} × ${image.height}).`, error: false })
    } catch (error) { setMessage({ text: error.message, error: true }) }
  }
  const fileChosen = (handler) => async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) await handler(file)
  }
  const name = `${brand.id}-${project.preset}`
  const exportPng = async () => {
    if (!svg) return
    try {
      download(new Blob([await rasterise(svg, Number(exportWidth))], { type: 'image/png' }), `${name}.png`)
      setMessage({ text: `Exported ${name}.png at ${exportWidth} px wide${background ? '' : ', with a transparent background'}.`, error: false })
    } catch { setMessage({ text: 'The image could not be exported. Try a smaller size.', error: true }) }
  }
  const open = async (file) => {
    if (file.size > 60 * 1024 * 1024) { setMessage({ text: 'That file is too large to be a mockup.', error: true }); return }
    try {
      setProject(validateProject(JSON.parse(await file.text()), { catalog, files }))
      setMessage({ text: `${file.name} opened.`, error: false })
    } catch (error) { setMessage({ text: error instanceof SyntaxError ? 'That file is not a mockup saved here.' : error.message, error: true }) }
  }

  return (
    <div className="view devices">
      <section className="panel devices__stage-panel" aria-label="Device mockup">
        <div className="devices__toolbar">
          <strong>{PRESETS[project.preset].label}</strong>
          <div className="devices__files">
            <button type="button" className="button button--quiet" onClick={() => openInput.current?.click()}>Open…</button>
            <input ref={openInput} type="file" accept=".json,application/json" hidden onChange={fileChosen(open)} />
            <button type="button" className="button button--quiet" onClick={() => { download(JSON.stringify(project, null, 2), `${name}-mockup.json`, 'application/json'); setMessage({ text: 'Mockup saved. Open it again here to keep editing.', error: false }) }}>Save mockup</button>
            <button type="button" className="button button--quiet" onClick={() => svg && download(svg, `${name}.svg`)} disabled={!svg}>Export SVG</button>
            <Select value={exportWidth} options={EXPORT_WIDTHS.map(([value, label]) => ({ value, label }))} onChange={setExportWidth} aria-label="PNG width" />
            <button type="button" className="button" onClick={exportPng} disabled={!svg}>Export PNG</button>
          </div>
        </div>
        <div className="device-stage" data-ground={background ? 'colour' : 'none'}>
          {svg ? <SvgImage svg={svg} alt={`${brand.name} on ${project.slots.map((slot) => catalog[slot.device].label.toLowerCase()).join(', ')}`} /> : <p className="notice notice--error" role="alert">This mockup could not be drawn.</p>}
        </div>
        {message.text && <p className={`device-stage__status${message.error ? ' device-stage__status--error' : ''}`} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
        <div className="devices__footer">
          <span>{Object.keys(catalog).length} devices, {variants} with their finishes and orientations · drawn in your browser, nothing is uploaded</span>
          <span>{credits.length
            ? credits.map((entry) => <span key={entry.name}>Frame: {entry.url ? <a href={entry.url} target="_blank" rel="noopener noreferrer">{entry.name}</a> : entry.name} · {entry.licenceUrl ? <a href={entry.licenceUrl} target="_blank" rel="noopener noreferrer">{entry.licence}</a> : entry.licence} </span>)
            : 'Frames drawn for brandkit: no manufacturer’s artwork'}</span>
        </div>
      </section>

      <aside className="panel devices__controls" aria-label="Mockup settings">
        {mockups.length > 0 && (
          <section>
            <h2>Brand mockups</h2>
            <div className="devices__mockups">
              {mockups.map((mockup) => (
                <button key={mockup.id} type="button" className="devices__mockup" aria-pressed={project.mockup === mockup.id}
                  onClick={() => { setProject(mockupProject(brand, mockup, catalog)); setMessage({ text: `${mockup.label ?? mockup.id} opened: ${brand.name}’s own mockup.`, error: false }) }}>
                  <strong>{mockup.label ?? mockup.id}</strong>
                  {mockup.description && <span>{mockup.description}</span>}
                </button>
              ))}
            </div>
            <p className="field__hint">Mockups {brand.name} defines, with its own screenshots. Change anything below to adapt one.</p>
          </section>
        )}

        <section>
          <h2>Scene</h2>
          <Field label="Devices">
            <Select value={project.preset} options={Object.entries(PRESETS).map(([value, preset]) => ({ value, label: preset.label }))}
              onChange={(preset) => setProject((state) => createProject(preset, { catalog, previous: state }))} />
          </Field>
          <Segmented label="Canvas shape" value={project.canvas} onChange={(canvas) => change({ canvas })} options={Object.entries(CANVAS_LABELS).map(([value, label]) => ({ value, label, title: value === 'fit' ? 'As large as the devices need' : `A ${label} image` }))} />
          <span className="field__label">Background</span>
          <Swatches label="Background" colours={grounds} value={background} none onPick={(value) => change({ background: value ? { kind: 'colour', value } : { kind: 'transparent' } })} />
          <label className="devices__check">
            <input type="checkbox" checked={project.shadow} onChange={(event) => change({ shadow: event.target.checked })} />
            <span>Soft shadow under each device</span>
          </label>
        </section>

        <section>
          <h2>Devices</h2>
          {project.slots.map((slot, index) => {
            const device = catalog[slot.device]
            const [w, h] = slot.turned && device.rotates ? [device.screen[1], device.screen[0]] : device.screen
            const kinds = [
              { value: 'brand', label: 'Brand', title: 'The brand’s logo on its colour' },
              { value: 'upload', label: 'Screenshot', title: 'Your own PNG, JPEG or WebP' },
              ...(files.length && slot.screen.file ? [{ value: 'file', label: 'Brand file', title: 'The screenshot from the brand’s own mockup' }] : []),
              { value: 'empty', label: 'Empty', title: 'A dark screen' }
            ]
            return (
              <div key={index} className="devices__slot">
                <h3>Device {index + 1} <span>{w} × {h}</span></h3>
                <Field label="Device">
                  <Select value={slot.device} options={deviceOptions} onChange={(id) => setDevice(index, id)} />
                </Field>
                {device.finishes?.length > 1 && <>
                  <span className="field__label">Finish: {finishLabel(slot.finish)}</span>
                  <Swatches label={`Finish of device ${index + 1}`} value={finishOf(device, slot.finish, primary).body}
                    colours={device.finishes.map((id) => [finishOf(device, id, primary).body, finishLabel(id), id])}
                    onPick={(hex) => changeSlot(index, { finish: device.finishes.find((id) => finishOf(device, id, primary).body === hex) ?? slot.finish })} />
                </>}
                {device.rotates && <Segmented label="Orientation" value={slot.turned ? 'turned' : 'upright'} onChange={(value) => changeSlot(index, { turned: value === 'turned' })}
                  options={[{ value: 'upright', label: 'Upright' }, { value: 'turned', label: 'On its side' }]} />}
                <Segmented label="On the screen" value={slot.screen.kind} options={kinds}
                  onChange={(kind) => { if (kind === 'upload' && !slot.screen.upload) { uploadInputs.current[index]?.click(); return } setScreen(index, { kind }) }} />
                <button type="button" className="button button--quiet devices__wide" onClick={() => uploadInputs.current[index]?.click()}>{slot.screen.upload ? 'Replace screenshot…' : 'Add a screenshot…'}</button>
                <input ref={(element) => { uploadInputs.current[index] = element }} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={fileChosen((file) => upload(index, file))} />
                {(slot.screen.kind === 'upload' || slot.screen.kind === 'file') && <Segmented label="How the image fits" value={slot.screen.fit} onChange={(fit) => setScreen(index, { fit })}
                  options={[{ value: 'cover', label: 'Fill', title: 'Fills the screen from the top; anything beyond it is cropped' }, { value: 'contain', label: 'Fit', title: 'Shows the whole image, with bars where it does not reach' }]} />}
                <p className="field__hint">{slot.screen.kind === 'upload' && slot.screen.upload
                  ? `${slot.screen.upload.name}${slot.screen.upload.width ? ` · ${slot.screen.upload.width} × ${slot.screen.upload.height}` : ''}. `
                  : ''}A screenshot taken at {w} × {h}, or the same shape, fills this screen exactly.</p>
              </div>
            )
          })}
        </section>
      </aside>
    </div>
  )
}
