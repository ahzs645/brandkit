import { useEffect, useState } from 'react'
import { colourName, validateBrand } from '../../engine/brand.js'
import { download } from '../../export/render.js'

const COPY_FIELDS = [['tagline', 'Tagline'], ['svgDescription', 'Artwork description'], ['templateDescription', 'Template description']]

/** Edit the definition: the common things by form, everything else as JSON. */
export const BrandEditor = ({ brand, onChange, onSave, saved, onReset, canReset }) => {
  const [text, setText] = useState(() => JSON.stringify(brand, null, 2))
  const [problems, setProblems] = useState([])
  const [parseError, setParseError] = useState(null)
  useEffect(() => { setText(JSON.stringify(brand, null, 2)); setProblems(validateBrand(brand)); setParseError(null) }, [brand])

  const apply = () => {
    let next
    try { next = JSON.parse(text) } catch (error) { setParseError(error.message); return }
    const found = validateBrand(next)
    setProblems(found)
    setParseError(null)
    if (!found.length) onChange(next)
  }
  const update = (mutate) => {
    const next = structuredClone(brand)
    mutate(next)
    onChange(next)
  }

  return (
    <div className="view editor">
      <section className="panel">
        <div className="panel__head">
          <h2>Colours</h2>
          <p className="muted">Every logo, template and guide page uses these. Roles say which colour does which job.</p>
        </div>
        <div className="colour-edit">
          {Object.entries(brand.colours).map(([key, hex]) => (
            <label key={key} className="colour-edit__item">
              <input type="color" value={hex} onChange={(event) => update((next) => { next.colours[key] = event.target.value.toUpperCase() })} />
              <span><strong>{colourName(brand, key)}</strong><code>{hex}</code></span>
            </label>
          ))}
        </div>
        <div className="role-edit">
          {Object.entries(brand.roles ?? {}).filter(([, value]) => brand.colours[value] || /^#/.test(value)).map(([role, value]) => (
            <label key={role} className="field field--inline">
              <span className="field__label">{role}</span>
              <select value={brand.colours[value] ? value : ''} onChange={(event) => update((next) => { next.roles[role] = event.target.value })}>
                {!brand.colours[value] && <option value="">{value}</option>}
                {Object.keys(brand.colours).map((key) => <option key={key} value={key}>{colourName(brand, key)}</option>)}
              </select>
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head"><h2>Name and copy</h2></div>
        <div className="form-grid">
          <label className="field"><span className="field__label">Name</span><input type="text" value={brand.name} onChange={(event) => update((next) => { next.name = event.target.value })} /></label>
          <label className="field"><span className="field__label">Version</span><input type="text" value={brand.version ?? ''} onChange={(event) => update((next) => { next.version = event.target.value; next.displayVersion = event.target.value.split('-')[0] })} /></label>
          {COPY_FIELDS.map(([key, label]) => (
            <label key={key} className="field field--wide"><span className="field__label">{label}</span><input type="text" value={brand.copy?.[key] ?? ''} onChange={(event) => update((next) => { next.copy = { ...next.copy, [key]: event.target.value } })} /></label>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>brand.json</h2>
          <p className="muted">The whole identity. Templates and guide pages are lists of elements; see the schema notes in the repository’s docs/brand-schema.md.</p>
        </div>
        <textarea className="json" spellCheck={false} value={text} onChange={(event) => setText(event.target.value)} aria-label="brand.json" />
        {parseError && <p className="error" role="alert">Not valid JSON: {parseError}</p>}
        {problems.length > 0 && <ul className="error" role="alert">{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>}
        <div className="row">
          <button type="button" className="button" onClick={apply}>Apply</button>
          <button type="button" className="button button--quiet" onClick={() => download(`${JSON.stringify(brand, null, 2)}\n`, `${brand.id}-brand.json`)}>↓ brand.json</button>
          <button type="button" className="button button--quiet" onClick={onSave}>{saved ? 'Saved in this browser' : 'Save in this browser'}</button>
          {canReset && <button type="button" className="button button--quiet" onClick={onReset}>Discard changes</button>}
        </div>
      </section>
    </div>
  )
}
