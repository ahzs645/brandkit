import { useMemo, useState } from 'react'
import { logoDocument } from '../../engine/artwork.js'
import { createStarterBrand, STARTER_DEFAULTS } from '../../engine/starter.js'
import { renderTemplate } from '../../engine/templates.js'
import { Field, Segmented, SvgImage } from '../ui.jsx'
import { useEditPreviewDock } from '../../ui/EditPreviewDock.jsx'

const FACES = [
  { value: 'display', label: 'Medium' },
  { value: 'displayRegular', label: 'Regular' },
  { value: 'bold', label: 'Semibold' },
  { value: 'extra', label: 'Extrabold' }
]

const COLOUR_LABELS = { ink: 'Ink', paper: 'Paper', muted: 'Muted', primary: 'Primary', light: 'Light' }

const PRESETS = [
  { name: 'Forest', colours: { ink: '#14171A', paper: '#F5F3EE', muted: '#565B61', primary: '#1F4E46', light: '#CFE4DC' } },
  { name: 'Harbour', colours: { ink: '#101418', paper: '#F4F6F8', muted: '#4F5862', primary: '#123B66', light: '#CFE0F2' } },
  { name: 'Ember', colours: { ink: '#1A1412', paper: '#FAF5F0', muted: '#5E5550', primary: '#A2361C', light: '#F4D3C4' } },
  { name: 'Plum', colours: { ink: '#17121A', paper: '#F7F4F8', muted: '#5C5462', primary: '#4B2A63', light: '#E2D3EC' } }
]

/** Toggle cells on a square grid to draw the symbol. */
const GridEditor = ({ grid, cells, shape, onChange }) => {
  const on = (col, row) => cells.some(([c, r]) => c === col && r === row)
  const toggle = (col, row) => onChange(on(col, row) ? cells.filter(([c, r]) => c !== col || r !== row) : [...cells, [col, row]])
  return (
    <div className="grid-editor" style={{ gridTemplateColumns: `repeat(${grid}, 1fr)` }} role="group" aria-label="Symbol grid">
      {Array.from({ length: grid * grid }, (_, index) => {
        const col = index % grid
        const row = Math.floor(index / grid)
        return <button key={index} type="button" aria-pressed={on(col, row)} aria-label={`Row ${row + 1}, column ${col + 1}`} className={`grid-editor__cell grid-editor__cell--${shape}`} onClick={() => toggle(col, row)} />
      })}
    </div>
  )
}

/** A brand from a handful of decisions, previewed as it is made. */
export const NewBrand = ({ fonts, onCreate, existing }) => {
  const [options, setOptions] = useState(() => ({ ...structuredClone(STARTER_DEFAULTS), name: '', tagline: '', parent: '', wordmark: { text: '', font: 'display' } }))
  const set = (patch) => setOptions((current) => ({ ...current, ...patch }))
  const name = options.name.trim() || 'yourbrand'
  const result = useMemo(() => {
    if (!fonts) return { error: 'Loading the faces…' }
    if (!options.symbol.cells.length) return { error: 'Turn on at least one cell of the grid.' }
    try {
      return { brand: createStarterBrand({ ...options, id: name, name, tagline: options.tagline.trim() || 'Steady progress, clearly made.', wordmark: { ...options.wordmark, text: options.wordmark.text.trim() || name }, parent: options.parent?.trim() || null }, fonts) }
    } catch (error) {
      return { error: error.message }
    }
  }, [options, fonts, name])
  const brand = result.brand
  const clash = brand && existing.includes(brand.id)
  // On a phone the form and the preview take turns, rather than the preview waiting past Create.
  const dock = useEditPreviewDock({ label: 'Form or preview' })

  return (
    <div ref={dock.ref} className={`view new-brand ${dock.className}`}>
      <section className="panel new-brand__form" {...dock.panel('edit')}>
        <h2>A new brand</h2>
        <p className="muted">A starting point with everything in place: logos, templates, a guide and web files. Refine it afterwards in the Brand tab, or by editing its brand.json.</p>
        <Field label="Name"><input type="text" value={options.name} placeholder="yourbrand" onChange={(event) => set({ name: event.target.value })} /></Field>
        <Field label="Wordmark text" hint="Set in Inter Display, then outlined."><input type="text" value={options.wordmark.text} placeholder={name} onChange={(event) => set({ wordmark: { ...options.wordmark, text: event.target.value } })} /></Field>
        <Field label="Weight"><Segmented label="Wordmark weight" value={options.wordmark.font} options={FACES} onChange={(font) => set({ wordmark: { ...options.wordmark, font } })} /></Field>
        <Field label="Parent name" hint="Optional: a second, shorter lockup."><input type="text" value={options.parent ?? ''} placeholder="none" onChange={(event) => set({ parent: event.target.value })} /></Field>
        <Field label="Tagline"><input type="text" value={options.tagline} placeholder="Steady progress, clearly made." onChange={(event) => set({ tagline: event.target.value })} /></Field>
        <Field label="Palette">
          <div className="presets">
            {PRESETS.map((preset) => (
              <button key={preset.name} type="button" className="preset" onClick={() => set({ colours: { ...options.colours, ...preset.colours } })}>
                {Object.values(preset.colours).map((hex) => <span key={hex} style={{ background: hex }} />)}
                <em>{preset.name}</em>
              </button>
            ))}
          </div>
          <div className="colour-row">
            {Object.entries(COLOUR_LABELS).map(([key, label]) => (
              <label key={key} className="colour-row__item"><input type="color" value={options.colours[key]} onChange={(event) => set({ colours: { ...options.colours, [key]: event.target.value.toUpperCase() } })} /><span>{label}</span></label>
            ))}
          </div>
        </Field>
        <Field label="Symbol">
          <div className="symbol-edit">
            <GridEditor grid={options.symbol.grid} cells={options.symbol.cells} shape={options.symbol.shape} onChange={(cells) => set({ symbol: { ...options.symbol, cells } })} />
            <div className="symbol-edit__options">
              <Segmented label="Grid" value={options.symbol.grid} options={[2, 3, 4].map((size) => ({ value: size, label: `${size}×${size}` }))} onChange={(grid) => set({ symbol: { ...options.symbol, grid, cells: options.symbol.cells.filter(([c, r]) => c < grid && r < grid) } })} />
              <Segmented label="Shape" value={options.symbol.shape} options={[{ value: 'circle', label: 'Circles' }, { value: 'square', label: 'Squares' }]} onChange={(shape) => set({ symbol: { ...options.symbol, shape } })} />
            </div>
          </div>
        </Field>
        <button type="button" className="button button--large" disabled={!brand || clash} onClick={() => onCreate(brand)}>Create {name}</button>
        {clash && <p className="error">There is already a brand called {brand.id}. Choose another name.</p>}
      </section>
      <section className="panel new-brand__preview" aria-label="Preview" {...dock.panel('preview')}>
        {result.error && <p className="muted">{result.error}</p>}
        {brand && (
          <>
            <div className="stage stage--compact"><SvgImage svg={logoDocument({ brand }, { family: brand.id, layout: 'horizontal', colourKey: 'ink' })} alt="Horizontal logo" className="stage__art" /></div>
            <div className="new-brand__apps">
              {['business-card-front', 'social-post', 'business-card-back', 'social-banner'].map((id) => (
                <SvgImage key={id} svg={renderTemplate({ brand, fonts, outline: true }, brand.templates.find((template) => template.id === id)).svg} alt={id} />
              ))}
            </div>
          </>
        )}
        {/* Create is on both sides, so a phone need not go back to the form to finish. */}
        {dock.compact && <button type="button" className="button button--large" disabled={!brand || clash} onClick={() => onCreate(brand)}>Create {name}</button>}
      </section>
      {dock.bar}
    </div>
  )
}
