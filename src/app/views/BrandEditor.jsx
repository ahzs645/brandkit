import { useEffect, useState } from 'react'
import { colour, colourName, validateBrand } from '../../engine/brand.js'
import { download } from '../../export/render.js'
import { colourEntries, editableRoles, ratioLabel, rolePairs } from '../colours.js'

const OWN = '#own'

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
  const roles = editableRoles(brand)
  const pairs = rolePairs(brand)
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
          <p className="muted">Every logo, template and guide page uses these. Each colour lists the roles it fills; choose a role to give it to another colour, or a colour of its own.</p>
        </div>
        <div className="colour-edit">
          {colourEntries(brand).map((entry) => (
            <div key={`${entry.own ? 'role' : 'colour'}-${entry.key}`} className={`colour-edit__item${entry.own ? ' colour-edit__item--own' : ''}`}>
              <label className="colour-edit__swatch" style={{ background: entry.hex }} title={`Change ${entry.name}`}>
                <input type="color" value={entry.hex.length === 7 ? entry.hex : '#000000'} aria-label={`${entry.name} colour`}
                  onChange={(event) => update((next) => { const hex = event.target.value.toUpperCase(); if (entry.own) next.roles[entry.key] = hex; else next.colours[entry.key] = hex })} />
              </label>
              <span className="colour-edit__text">
                <strong>{entry.name}</strong>
                <code>{entry.hex}</code>
                {entry.own && <span className="colour-edit__note">its own colour</span>}
              </span>
              <span className="colour-edit__roles">
                {entry.roles.length === 0 && <span className="colour-edit__none">No role</span>}
                {entry.roles.filter((role) => roles.includes(role)).map((role) => (
                  <label key={role} className="role-chip" title={`Give ${role} to another colour`}>
                    <span>{role}</span>
                    <select value={entry.own ? OWN : entry.key} aria-label={`${role} role`}
                      onChange={(event) => update((next) => { next.roles[role] = event.target.value === OWN ? colour(brand, role).toUpperCase() : event.target.value })}>
                      {Object.keys(brand.colours).map((key) => <option key={key} value={key}>{colourName(brand, key)}</option>)}
                      <option value={OWN}>Its own colour</option>
                    </select>
                  </label>
                ))}
              </span>
            </div>
          ))}
        </div>
        <div className="role-checks" aria-live="polite">
          <span className="field__label">Text on the brand’s grounds</span>
          {pairs.map((pair) => (
            <span key={`${pair.text}-${pair.ground}`} className={`role-check${pair.ratio < 4.5 ? ' role-check--low' : ''}`} title={`${pair.use}: ${ratioLabel(pair.ratio)}, ${pair.grade}`}>
              <span className="role-check__sample" style={{ background: pair.back, color: pair.fore }}>Aa</span>
              {pair.text} on {pair.ground} <b>{pair.grade}</b>
            </span>
          ))}
          {pairs.some((pair) => pair.ratio < 4.5) && <span className="field__hint">Below AA is fine for large display type only. The Colour tab grades every pair.</span>}
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
