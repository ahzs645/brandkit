// Department sub-logos: a brand's departmental signatures (brand.signatures[].departmental) set
// for one of its listed departments (brand.departments) or for a name typed in. Any brand that
// composes its signatures this way gets the same editor: UNBC's sub-logos, the Province's
// ministerial signatures.

import { useMemo, useState } from 'react'
import { logoDocument } from '../../engine/artwork.js'
import { departmentLines } from '../../engine/signatures.js'
import { Downloads, Field, SvgImage } from '../ui.jsx'
import { DepartmentSelect, groundOf } from './Signatures.jsx'

const slug = (text) => text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'department'

/** `actions(name)` adds controls for the chosen name, on one line (the Departments view's document buttons). */
export const SubLogos = ({ brand, fonts, actions, initialName }) => {
  const departments = brand.departments
  const field = departments.field
  const signatures = brand.signatures.filter((entry) => entry.departmental)
  // Open on the department already chosen for documents, or failing that the first listed.
  const start = initialName ? departments.items?.find((item) => item.name === initialName) : departments.items?.[0]
  const [signatureId, setSignatureId] = useState(signatures[0].id)
  const [preset, setPreset] = useState(start?.id ?? '')
  const [text, setText] = useState(start?.values?.[field] ?? initialName ?? '')
  const signature = signatures.find((entry) => entry.id === signatureId) ?? signatures[0]
  const chosen = departments.items?.find((item) => item.id === preset)
  // A listed department keeps its own values (its matched line breaks, any second field); once
  // the name is edited it is set by the signature's wrapping rules instead.
  const values = chosen && chosen.values?.[field] === text ? chosen.values : { [field]: text }
  const name = chosen && chosen.values?.[field] === text ? chosen.name : text.replace(/\s*\n\s*/g, ' ').trim()
  const fit = useMemo(() => departmentLines({ brand, fonts }, signature, values).find((entry) => entry.field === field), [brand, fonts, signature, values, field])
  const choose = (id) => {
    setPreset(id)
    const item = departments.items.find((entry) => entry.id === id)
    setText(item?.values?.[field] ?? '')
  }
  const colourways = (departments.colourways ?? Object.keys(brand.colourways ?? {})).map((id) => [id, brand.colourways[id]])
  const fileName = (colourway) => [brand.id, signature.id, chosen?.values?.[field] === text ? chosen.id : slug(name), colourway].join('-')
  return <>
    <section className="panel">
      <h2>{signature.label}</h2>
      {signature.use && <p className="muted">{signature.use}</p>}
      {departments.note && <p className="muted">{departments.note}</p>}
    </section>
    <div className="organization-workspace">
      <section className="panel organization-controls" aria-label="Sub-logo settings">
        {signatures.length > 1 && <Field label="Signature">
          <select value={signature.id} onChange={(event) => setSignatureId(event.target.value)}>
            {signatures.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </select>
        </Field>}
        <DepartmentSelect brand={brand} value={preset} onChange={choose} />
        <Field label={`${departments.label ?? 'Department'} as set`} hint="Edit the name, or type another. A line break you type is kept; otherwise the name wraps by the signature’s rules.">
          <textarea rows={3} value={text} onChange={(event) => { setText(event.target.value) }} placeholder="Type the unit’s established name" />
        </Field>
        {chosen?.matched && chosen.values?.[field] === text && <p className="notice" role="status">Line breaks matched to official artwork: {chosen.matched}</p>}
        {chosen?.alternateOf && chosen.values?.[field] === text && <p className="muted">Short form of {chosen.alternateOf}.</p>}
        {fit?.overflowing.length > 0 && <p className="notice notice--error" role="alert">Too long to break: “{fit.overflowing.join('”, “')}” runs past the line. Shorten the name or break it by hand.</p>}
        {actions?.(name)}
      </section>
      <section className="panel organization-preview-panel" aria-label="Sub-logo preview">
        <div className="asset-grid">
          {colourways.map(([id, spec]) => {
            const make = () => logoDocument({ brand, fonts, values }, { signature: signature.id, colourway: id })
            return <figure key={id} className="asset-card">
              <div className="asset-card__art" style={{ background: groundOf(brand, id) }}><SvgImage svg={make()} alt={`${signature.label} for ${name || 'no department'}, ${spec?.label ?? id}`} /></div>
              <figcaption><span>{spec?.label ?? id}</span><Downloads make={make} name={fileName(id)} width={2400} /></figcaption>
            </figure>
          })}
        </div>
      </section>
    </div>
  </>
}
