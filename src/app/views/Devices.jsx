// Devices: the brand's screens in device frames. A scene of one to three devices (a monitor, a
// tablet and a phone; a laptop with a phone in front; three phones), each chosen by whoever is
// using the tab: from brandkit's own drawn frames (src/mockups/device-catalog.js), from the frame
// sets that ship with it (Open Device Frame, Devices.css, React MockFrame: device-sets.js), or
// from frames the open brand supplies. Each shows a screenshot, a brand's own file or a brand
// screen, under the status bar a phone or tablet draws over it. Everything is drawn as one SVG
// in the browser: nothing is uploaded anywhere.

import { useEffect, useMemo, useRef, useState } from 'react'
import { colour } from '../../engine/brand.js'
import { download, rasterise } from '../../export/render.js'
import { Select } from '../../ui/Select.jsx'
import { Field, Segmented, SvgImage } from '../ui.jsx'
import { CANVAS_LABELS, CATEGORIES, PRESETS, variantsOf } from '../../mockups/device-catalog.js'
import { DRAWN_SET, FRAME_SETS, SET_STYLESHEETS, setOf } from '../../mockups/device-sets.js'
import { finishOf, layoutOf, sceneSvg } from '../../mockups/device-frame.js'
import { contentSize, hasStatusBar, screenHref } from '../../mockups/device-screen.js'
import { DEVICE_FILE_TYPES, MAX_UPLOAD, brandMockups, catalogFor, createProject, creditsOf, deviceFiles, finishLabel, mockupProject, validateProject } from '../../mockups/device-project.js'
import { brandScreen } from '../../mockups/device-artwork.js'
import { brandColours, vehicleLogos } from '../../mockups/vehicle-artwork.js'
import '../../mockups/devices.css'

// The sets' files: an image is fetched when a mockup first uses it, a stylesheet when its set is.
const FRAME_IMAGES = import.meta.glob('../../mockups/frames/*/*.webp', { query: '?url', import: 'default', eager: true })
const FRAME_STYLES = import.meta.glob('../../mockups/frames/*/*.css', { query: '?raw', import: 'default' })
const framePath = (key) => `../../mockups/frames/${key}`

const storageKey = (brand) => `brandkit-device-mockup:${brand.id}`
const EXPORT_WIDTHS = [['1600', '1600 px'], ['2400', '2400 px'], ['3840', '3840 px']]
const NEUTRAL_GROUNDS = [['#ffffff', 'White'], ['#f3f2ee', 'Warm white'], ['#16181c', 'Black']]
const isHex = (value) => /^#[0-9a-f]{6}$/i.test(value ?? '')
const today = () => { try { return new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) } catch { return '' } }

const blobUrl = (blob) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(reader.error); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob) })

/** A brand file as a data URL, read through the brand's own source (its pack or folder). */
const fileUrl = async (source, path) => blobUrl(new Blob([await source.read(path)], { type: DEVICE_FILE_TYPES[path.split('.').pop().toLowerCase()] }))

const loadImage = (url) => new Promise((resolve, reject) => { const image = new Image(); image.onerror = () => reject(new Error('The browser could not open that image.')); image.onload = () => resolve(image); image.src = url })

/** The colour along the top edge of an image: what a status bar above it should continue. */
const edgeColour = (image) => {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 64; canvas.height = 2
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0, image.naturalWidth, Math.max(1, image.naturalHeight * 0.006), 0, 0, 64, 2)
    const { data } = context.getImageData(0, 0, 64, 2)
    const sum = [0, 0, 0]
    for (let at = 0; at < data.length; at += 4) for (let channel = 0; channel < 3; channel += 1) sum[channel] += data[at + channel]
    return `#${sum.map((value) => Math.round(value / (data.length / 4)).toString(16).padStart(2, '0')).join('')}`
  } catch { return null }
}

/**
 * A scene with CSS frames as a PNG. Such a scene has HTML inside it, and a browser will not hand
 * back the pixels of one drawn from an object URL; from a data URL, Chromium and Firefox will.
 */
const rasteriseInline = async (svg, width) => {
  const [, , vw, vh] = /viewBox="([^"]+)"/.exec(svg)[1].split(/\s+/).map(Number)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width); canvas.height = Math.round(width * vh / vw)
  const sized = svg.replace(/^<svg\b([^>]*)>/, (match, attributes) => `<svg${attributes.replace(/\s(width|height)="[^"]*"/g, '')} width="${canvas.width}" height="${canvas.height}">`)
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`)
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve, reject) => { try { canvas.toBlob((made) => (made ? resolve(made) : reject(new Error('empty'))), 'image/png') } catch (error) { reject(error) } })
  return blob
}

const readUpload = async (file) => {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP image.')
  if (file.size > MAX_UPLOAD) throw new Error('That image is over 12 MB. Export it smaller and try again.')
  const dataUrl = await blobUrl(file).catch(() => { throw new Error('The image could not be read.') })
  const image = await loadImage(dataUrl)
  const edge = edgeColour(image)
  return { name: file.name.slice(0, 120), dataUrl, width: image.naturalWidth, height: image.naturalHeight, ...(edge ? { edge } : {}) }
}

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
  const sets = useMemo(() => [DRAWN_SET, ...FRAME_SETS, ...(Object.values(catalog).some((device) => device.brand) ? [{ id: 'brand', label: `${brand.name}’s frames`, note: 'Frames this brand supplies' }] : [])], [catalog, brand.name])
  const [message, setMessage] = useState({ text: '', error: false })
  const [exportWidth, setExportWidth] = useState('2400')
  const [loaded, setLoaded] = useState({})
  const [edges, setEdges] = useState({})
  const [styles, setStyles] = useState({})
  const openInput = useRef(null)
  const uploadInputs = useRef([])

  const [project, setProject] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey(brand))
      if (raw) return validateProject(JSON.parse(raw), { catalog, files })
    } catch { /* a draft that no longer opens is dropped */ }
    if (mockups[0]) { try { return mockupProject(brand, mockups[0], catalog) } catch { /* fall through */ } }
    return createProject('three-screens', { catalog, clock: { time: '9:41', date: today() } })
  })

  // The draft is kept in the browser; screenshots too large for it are left out of the draft only.
  useEffect(() => {
    try { localStorage.setItem(storageKey(brand), JSON.stringify(project)) } catch {
      try { localStorage.setItem(storageKey(brand), JSON.stringify({ ...project, slots: project.slots.map((slot) => (slot.screen.kind === 'upload' ? { ...slot, screen: { ...slot.screen, kind: 'brand', upload: null } } : slot)) })) } catch { /* no draft */ }
    }
  }, [brand, project])

  // Files a mockup uses are read once each: the brand's own (screenshots, frames) through its
  // source, a set's frame image from brandkit. Each becomes a data URL, to go inside the SVG.
  const wanted = useMemo(() => [...new Set(project.slots.flatMap((slot) => {
    const device = catalog[slot.device]
    return [slot.screen.kind === 'file' ? `brand:${slot.screen.file}` : null, device?.frame ? `${device.brand ? 'brand' : 'set'}:${device.frame.image}` : null]
  }).filter(Boolean))], [project, catalog])
  useEffect(() => {
    let live = true
    for (const key of wanted) {
      if (loaded[key] !== undefined) continue
      const path = key.slice(key.indexOf(':') + 1)
      const read = key.startsWith('brand:') ? fileUrl(source, path) : fetch(FRAME_IMAGES[framePath(path)]).then((response) => (response.ok ? response.blob() : Promise.reject(new Error('missing')))).then(blobUrl)
      read.then(async (url) => {
        if (!live) return
        setLoaded((state) => ({ ...state, [key]: url }))
        if (key.startsWith('brand:') && !/^devices\//.test(path)) { try { const edge = edgeColour(await loadImage(url)); if (live && edge) setEdges((state) => ({ ...state, [path]: edge })) } catch { /* the bar stays white */ } }
      }, () => live && setLoaded((state) => ({ ...state, [key]: null })))
    }
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, source])

  // The stylesheet of each CSS set in use.
  const cssSets = useMemo(() => [...new Set(project.slots.map((slot) => catalog[slot.device]?.css?.set).filter(Boolean))], [project, catalog])
  useEffect(() => {
    let live = true
    for (const set of cssSets) {
      if (styles[set] !== undefined) continue
      const load = FRAME_STYLES[framePath(SET_STYLESHEETS[set])]
      if (load) load().then((text) => live && setStyles((state) => ({ ...state, [set]: text })), () => live && setStyles((state) => ({ ...state, [set]: '' })))
    }
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cssSets])

  /** The status bar's lettering, outlined in the brand's face where it has every glyph. */
  const type = useMemo(() => {
    const key = ['bold', 'body'].find((name) => brand.fonts?.[name] && fonts?.has?.(name))
    if (!key) return undefined
    return ({ text, x, baseline, size, anchor, fill }) => {
      if (!fonts.covers(text, key)) return `<text x="${x}" y="${baseline}" font-family="system-ui, Arial, sans-serif" font-weight="600" font-size="${size}" text-anchor="${anchor}" fill="${fill}">${text.replace(/[&<>]/g, '')}</text>`
      const start = anchor === 'middle' ? x - fonts.width(text, key, size) / 2 : x
      return `<path fill="${fill}" d="${fonts.path(text, key, size, start, baseline)}"/>`
    }
  }, [brand, fonts])

  const background = project.background.kind === 'colour' ? project.background.value : null
  const credits = useMemo(() => creditsOf(project, catalog), [project, catalog])
  const svg = useMemo(() => {
    try {
      return sceneSvg({
        layout: layoutOf(project.preset), canvas: project.canvas, background, shadow: project.shadow, brandColour: primary, styles,
        title: `${brand.name}: ${PRESETS[project.preset].label.toLowerCase()}`,
        credit: credits.map((entry) => entry.credit).filter(Boolean).join(' · '),
        slots: project.slots.map((slot) => {
          const device = catalog[slot.device]
          const turned = slot.turned && Boolean(device.rotates)
          const barred = slot.status && hasStatusBar(device)
          const [w, h] = contentSize(device, { turned, status: barred })
          const raw = slot.screen.kind === 'upload' ? slot.screen.upload?.dataUrl
            : slot.screen.kind === 'file' ? loaded[`brand:${slot.screen.file}`]
              : slot.screen.kind === 'brand' ? brandScreen({ logos, ground: primary, width: w, height: h }) : null
          const edge = slot.screen.kind === 'upload' ? slot.screen.upload?.edge : slot.screen.kind === 'file' ? edges[slot.screen.file] : slot.screen.kind === 'brand' ? primary : '#101114'
          const screen = screenHref({ device, turned, href: raw, fit: slot.screen.fit, ground: slot.screen.fit === 'contain' ? '#000000' : '#101114', type,
            status: barred ? { colour: edge ?? '#ffffff', time: project.clock.time, date: project.clock.date } : null })
          return { device, finish: slot.finish, turned: slot.turned, href: screen.href, inline: screen.inline, fit: screen.fit, ground: '#101114', frameHref: device.frame ? loaded[`${device.brand ? 'brand' : 'set'}:${device.frame.image}`] : undefined }
        })
      })
    } catch (error) { return null }
  }, [project, catalog, loaded, edges, styles, logos, primary, background, brand.name, credits, type])

  const change = (changes) => setProject((state) => ({ ...state, ...changes, mockup: null }))
  const changeSlot = (index, changes) => setProject((state) => ({ ...state, mockup: null, slots: state.slots.map((slot, at) => (at === index ? { ...slot, ...changes } : slot)) }))
  const setDevice = (index, id) => {
    const device = catalog[id]
    const slot = project.slots[index]
    changeSlot(index, { device: id, finish: device.finishes?.includes(slot.finish) ? slot.finish : device.finishes?.[0] ?? null, turned: slot.turned && Boolean(device.rotates), status: hasStatusBar(device) && (slot.status || !hasStatusBar(catalog[slot.device])) })
  }
  /** Another set of frames for a slot: its first device of the same kind, or its first. */
  const setFrames = (index, set) => {
    const category = catalog[project.slots[index].device].category
    const inSet = Object.entries(catalog).filter(([, device]) => setOf(device) === set)
    const [id] = inSet.find(([, device]) => device.category === category) ?? inSet[0] ?? []
    if (id) setDevice(index, id)
  }
  const setScreen = (index, changes) => changeSlot(index, { screen: { ...project.slots[index].screen, ...changes } })

  const variants = useMemo(() => Object.values(catalog).reduce((sum, device) => sum + variantsOf(device), 0), [catalog])
  const anyStatus = project.slots.some((slot) => slot.status && hasStatusBar(catalog[slot.device]))
  const usesCss = cssSets.length > 0

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
      download(usesCss ? await rasteriseInline(svg, Number(exportWidth)) : new Blob([await rasterise(svg, Number(exportWidth))], { type: 'image/png' }), `${name}.png`)
      setMessage({ text: `Exported ${name}.png at ${exportWidth} px wide${background ? '' : ', with a transparent background'}.`, error: false })
    } catch {
      setMessage({ text: usesCss ? 'This browser cannot export a picture of a CSS frame. Choose a drawn or image frame, or export from Chrome, Edge or Firefox.' : 'The image could not be exported. Try a smaller size.', error: true })
    }
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
          {svg ? <SvgImage svg={svg} alt={`${brand.name} on ${project.slots.map((slot) => catalog[slot.device].label).join(', ')}`} /> : <p className="notice notice--error" role="alert">This mockup could not be drawn.</p>}
        </div>
        {message.text && <p className={`device-stage__status${message.error ? ' device-stage__status--error' : ''}`} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
        <div className="devices__footer">
          <span>{Object.keys(catalog).length} devices, {variants} with their finishes and orientations · drawn in your browser, nothing is uploaded</span>
          <span className="devices__credits">{credits.length
            ? credits.map((entry) => <span key={entry.name}>Frame: {entry.url ? <a href={entry.url} target="_blank" rel="noopener noreferrer">{entry.name}</a> : entry.name} · {entry.licenceUrl ? <a href={entry.licenceUrl} target="_blank" rel="noopener noreferrer">{entry.licence}</a> : entry.licence}</span>)
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
          {anyStatus && <div className="devices__clock">
            <Field label="Time in the status bar">
              <input type="text" maxLength={8} value={project.clock.time} onChange={(event) => change({ clock: { ...project.clock, time: event.target.value } })} />
            </Field>
            <Field label="Date (tablets)">
              <input type="text" maxLength={24} value={project.clock.date} onChange={(event) => change({ clock: { ...project.clock, date: event.target.value } })} />
            </Field>
          </div>}
        </section>

        <section>
          <h2>Devices</h2>
          {project.slots.map((slot, index) => {
            const device = catalog[slot.device]
            const turned = slot.turned && Boolean(device.rotates)
            const barred = slot.status && hasStatusBar(device)
            const [w, h] = contentSize(device, { turned, status: barred })
            const set = setOf(device)
            const options = Object.entries(catalog).filter(([, entry]) => setOf(entry) === set)
              .map(([value, entry]) => ({ value, label: entry.label, title: entry.note, group: entry.maker ?? CATEGORIES[entry.category], order: Object.keys(CATEGORIES).indexOf(entry.category) }))
              .sort((a, b) => a.order - b.order)
            const kinds = [
              { value: 'brand', label: 'Brand', title: 'The brand’s logo on its colour' },
              { value: 'upload', label: 'Screenshot', title: 'Your own PNG, JPEG or WebP' },
              ...(files.length && slot.screen.file ? [{ value: 'file', label: 'Brand file', title: 'The screenshot from the brand’s own mockup' }] : []),
              { value: 'empty', label: 'Empty', title: 'A dark screen' }
            ]
            return (
              <div key={index} className="devices__slot">
                <h3>Device {index + 1} <span>{device.screen[0]} × {device.screen[1]}</span></h3>
                <Field label="Frames from">
                  <Select value={set} options={sets.map((entry) => ({ value: entry.id, label: entry.frames ? `${entry.label} · ${entry.frames.length}` : entry.label, title: entry.note }))} onChange={(next) => setFrames(index, next)} />
                </Field>
                <Field label="Device">
                  <Select value={slot.device} options={options} onChange={(id) => setDevice(index, id)} />
                </Field>
                {!device.css && device.finishes?.length > 1 && <>
                  <span className="field__label">Finish: {finishLabel(slot.finish)}</span>
                  <Swatches label={`Finish of device ${index + 1}`} value={finishOf(device, slot.finish, primary).body}
                    colours={device.finishes.map((id) => [finishOf(device, id, primary).body, finishLabel(id), id])}
                    onPick={(hex) => changeSlot(index, { finish: device.finishes.find((id) => finishOf(device, id, primary).body === hex) ?? slot.finish })} />
                </>}
                {device.css && device.finishes.length > 1 && <Field label="Colour">
                  <Select value={slot.finish ?? device.finishes[0]} options={device.finishes.map((id) => ({ value: id, label: finishLabel(id, device) }))} onChange={(finish) => changeSlot(index, { finish })} />
                </Field>}
                {device.rotates && <Segmented label="Orientation" value={slot.turned ? 'turned' : 'upright'} onChange={(value) => changeSlot(index, { turned: value === 'turned' })}
                  options={[{ value: 'upright', label: 'Upright' }, { value: 'turned', label: 'On its side' }]} />}
                <Segmented label="On the screen" value={slot.screen.kind} options={kinds}
                  onChange={(kind) => { if (kind === 'upload' && !slot.screen.upload) { uploadInputs.current[index]?.click(); return } setScreen(index, { kind }) }} />
                <button type="button" className="button button--quiet devices__wide" onClick={() => uploadInputs.current[index]?.click()}>{slot.screen.upload ? 'Replace screenshot…' : 'Add a screenshot…'}</button>
                <input ref={(element) => { uploadInputs.current[index] = element }} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={fileChosen((file) => upload(index, file))} />
                {(slot.screen.kind === 'upload' || slot.screen.kind === 'file') && <Segmented label="How the image fits" value={slot.screen.fit} onChange={(fit) => setScreen(index, { fit })}
                  options={[{ value: 'cover', label: 'Fill', title: 'Fills the screen from the top; anything beyond it is cropped' }, { value: 'contain', label: 'Fit', title: 'Shows the whole image, with bars where it does not reach' }]} />}
                {hasStatusBar(device) && <label className="devices__check">
                  <input type="checkbox" checked={slot.status} onChange={(event) => changeSlot(index, { status: event.target.checked })} />
                  <span>Status bar: the time, signal and battery above the screenshot, clear of the camera</span>
                </label>}
                <p className="field__hint">{slot.screen.kind === 'upload' && slot.screen.upload
                  ? `${slot.screen.upload.name}${slot.screen.upload.width ? ` · ${slot.screen.upload.width} × ${slot.screen.upload.height}` : ''}. `
                  : ''}A screenshot taken at {w} × {h}, or the same shape, fills {barred ? 'the screen below the status bar' : 'this screen'} exactly.{device.css ? ' This frame is drawn in CSS: it exports as PNG from Chrome, Edge or Firefox.' : ''}</p>
              </div>
            )
          })}
        </section>
      </aside>
    </div>
  )
}
