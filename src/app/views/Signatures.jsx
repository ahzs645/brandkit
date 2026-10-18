// For brands whose logos are composed signatures (brand.signatures): pick a signature, a
// colourway and, where the brand has them, a department (a ministry, a division) to set it for.

import { useState } from 'react'
import { logoDocument } from '../../engine/artwork.js'
import { colour } from '../../engine/brand.js'
import { download, zip } from '../../export/render.js'
import { Downloads, Field, Segmented, SvgImage } from '../ui.jsx'

/** "One colour: brown" → "Brown"; "Reverse, white" → "Reverse, white". Short enough for a button. */
const shortLabel = (label) => {
  const [head, tail] = label.split(':').map((part) => part.trim())
  const text = tail && head.toLowerCase().startsWith('one colour') ? tail : head
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const groundOf = (brand, colourwayId) => colour(brand, brand.colourways?.[colourwayId]?.ground ?? 'reverse')

/** The department select every signature view shares. `value` is a department id, '' for none. */
export const DepartmentSelect = ({ brand, value, onChange }) => {
  const departments = brand.departments
  if (!departments?.items?.length) return null
  return (
    <Field label={departments.label ?? 'Department'}>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">As the manual shows it (placeholders)</option>
        {departments.items.map((item) => <option key={item.id} value={item.id}>{item.name}{item.years ? ` (${item.years})` : ''}</option>)}
      </select>
    </Field>
  )
}

export const departmentValues = (brand, id) => brand.departments?.items?.find((item) => item.id === id)?.values

/** The overview's stage: one signature, large, with its controls. */
export const SignatureStage = ({ brand, fonts }) => {
  const colourways = Object.entries(brand.colourways ?? {})
  const [signatureId, setSignature] = useState(brand.signatures[0].id)
  const [colourway, setColourway] = useState(brand.defaultColourway ?? colourways[0]?.[0])
  const [department, setDepartment] = useState('')
  const signature = brand.signatures.find((entry) => entry.id === signatureId) ?? brand.signatures[0]
  const values = departmentValues(brand, department)
  const make = () => logoDocument({ brand, fonts, values }, { signature: signature.id, colourway })
  return (
    <section className="panel stage-panel" aria-label="Signature preview">
      <div className="stage" style={{ background: groundOf(brand, colourway) }}>
        <SvgImage svg={make()} alt={`${brand.name}, ${signature.label}`} className="stage__art stage__art--signature" />
      </div>
      <div className="toolbar">
        <Field label="Signature">
          <select value={signature.id} onChange={(event) => setSignature(event.target.value)}>
            {brand.signatures.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </select>
        </Field>
        <Field label="Colourway">
          <Segmented label="Colourway" value={colourway} options={colourways.map(([id, spec]) => ({ value: id, label: shortLabel(spec.label ?? id), title: spec.label }))} onChange={setColourway} />
        </Field>
        {signature.departmental && <DepartmentSelect brand={brand} value={department} onChange={setDepartment} />}
        <Downloads make={make} name={[brand.id, signature.id, department, colourway].filter(Boolean).join('-')} width={2400} />
      </div>
      {signature.use && <p className="caption">{signature.use}</p>}
    </section>
  )
}

/** The logos view: every signature in every colourway, and every department's set as one zip. */
export const SignatureLogos = ({ brand, fonts }) => {
  const [department, setDepartment] = useState('')
  const [busy, setBusy] = useState(false)
  const values = departmentValues(brand, department)
  const colourways = Object.entries(brand.colourways ?? {})
  const departmental = brand.signatures.filter((entry) => entry.departmental)
  const zipAll = async () => {
    setBusy(true)
    try {
      const encoder = new TextEncoder()
      const ways = brand.departments.colourways ?? [colourways[0][0]]
      const files = new Map()
      for (const item of brand.departments.items) {
        for (const signature of departmental) {
          for (const way of ways) files.set(`${item.id}/${signature.id}-${way}.svg`, encoder.encode(logoDocument({ brand, fonts, values: item.values }, { signature: signature.id, colourway: way })))
        }
      }
      download(await zip(files, `${brand.id}-${brand.departments.folder ?? 'departments'}`), `${brand.id}-${brand.departments.folder ?? 'departments'}.zip`)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="view">
      {brand.departments?.items?.length > 0 && departmental.length > 0 && (
        <section className="panel toolbar toolbar--panel">
          <DepartmentSelect brand={brand} value={department} onChange={setDepartment} />
          <p className="muted" style={{ margin: 0, flex: 1 }}>Every departmental signature below is set for the {brand.departments.label?.toLowerCase() ?? 'department'} chosen here.</p>
          <button type="button" className="button" disabled={busy} onClick={zipAll}>{busy ? 'Setting every one…' : `↓ All ${brand.departments.items.length}, zipped`}</button>
        </section>
      )}
      {brand.signatures.map((signature) => (
        <section key={signature.id} className="panel">
          <h2>{signature.label}</h2>
          {signature.use && <p className="muted" style={{ marginTop: -6 }}>{signature.use}</p>}
          <div className="asset-grid">
            {colourways.map(([id, spec]) => {
              const make = () => logoDocument({ brand, fonts, values: signature.departmental ? values : undefined }, { signature: signature.id, colourway: id })
              return (
                <figure key={id} className="asset-card">
                  <div className="asset-card__art" style={{ background: groundOf(brand, id) }}><SvgImage svg={make()} alt={`${signature.label}, ${spec.label}`} /></div>
                  <figcaption><span>{spec.label ?? id}</span><Downloads make={make} name={[brand.id, signature.id, signature.departmental ? department : '', id].filter(Boolean).join('-')} width={2400} /></figcaption>
                </figure>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
