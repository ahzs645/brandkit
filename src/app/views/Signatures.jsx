// For brands whose logos are composed signatures (brand.signatures): pick a signature, a
// colourway and, where the brand has them, a department (a ministry, a division) to set it for.

import { useEffect, useState } from 'react'
import { logoDocument } from '../../engine/artwork.js'
import { colour } from '../../engine/brand.js'
import { renderTemplate } from '../../engine/templates.js'
import { download, zip } from '../../export/render.js'
import { Downloads, Field, Segmented, Select, SvgImage } from '../ui.jsx'
import { ManualSources } from './Sources.jsx'

/** "One colour: brown" → "Brown"; "Reverse, white" → "Reverse, white". Short enough for a button. */
const shortLabel = (label) => {
  const [head, tail] = label.split(':').map((part) => part.trim())
  const text = tail && head.toLowerCase().startsWith('one colour') ? tail : head
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const groundOf = (brand, colourwayId) => colour(brand, brand.colourways?.[colourwayId]?.ground ?? 'reverse')

// Departments listed with a `group` (UNBC's academic and administrative units) are offered under
// those headings, in the order the groups first appear.
const groupsOf = (items) => {
  const groups = new Map()
  for (const item of items) groups.set(item.group ?? '', [...(groups.get(item.group ?? '') ?? []), item])
  return [...groups]
}

/** The department select every signature view shares. `value` is a department id, '' for none. */
export const DepartmentSelect = ({ brand, value, onChange }) => {
  const departments = brand.departments
  if (!departments?.items?.length) return null
  return (
    <Field label={departments.label ?? 'Department'}>
      <Select value={value} onChange={onChange} options={[
        { value: '', label: departments.emptyLabel ?? 'As the manual shows it (placeholders)' },
        ...groupsOf(departments.items).flatMap(([group, items]) => items.map((item) => ({ value: item.id, label: `${item.name}${item.years ? ` (${item.years})` : ''}`, group })))
      ]} />
    </Field>
  )
}

export const departmentValues = (brand, id) => brand.departments?.items?.find((item) => item.id === id)?.values

/** The overview's stage: one signature, large, with its controls. */
export const SignatureStage = ({ brand, fonts, openManual }) => {
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
          <Select value={signature.id} onChange={setSignature} options={brand.signatures.map((entry) => ({ value: entry.id, label: entry.label }))} />
        </Field>
        <Field label="Colourway">
          <Segmented label="Colourway" value={colourway} options={colourways.map(([id, spec]) => ({ value: id, label: shortLabel(spec.label ?? id), title: spec.label }))} onChange={setColourway} />
        </Field>
        {signature.departmental && <DepartmentSelect brand={brand} value={department} onChange={setDepartment} />}
        <Downloads make={make} name={[brand.id, signature.id, department, colourway].filter(Boolean).join('-')} width={2400} />
      </div>
      {signature.use && <p className="caption">{signature.use}</p>}
      {signature.sources && <div className="stage-sources"><ManualSources brand={brand} sources={signature.sources} openManual={openManual} /></div>}
    </section>
  )
}

/** Related artwork uses its own illustration geometry; it never becomes a signature option. */
const RelatedMarkCard = ({ brand, fonts, mark, variant }) => {
  const illustration = brand.illustrations?.[variant.illustration]
  const label = variant.label ?? illustration?.title ?? variant.id
  if (!illustration) return (
    <figure className="asset-card">
      <div className="asset-card__art"><p className="muted">Artwork unavailable in this kit.</p></div>
      <figcaption>{label}</figcaption>
    </figure>
  )
  const [, , width, height] = illustration.viewBox
  const template = {
    id: variant.id,
    width,
    height,
    unit: 'px',
    title: `${brand.name} / ${mark.label} / ${label}`,
    description: [mark.use, variant.use ?? illustration.source?.use, illustration.provenance].filter(Boolean).join(' '),
    elements: [{ type: 'illustration', illustration: variant.illustration, x: 0, y: 0, width, height }]
  }
  const make = (outline = false) => renderTemplate({ brand, fonts, outline }, template).svg
  return (
    <figure className="asset-card">
      <div className="asset-card__art" style={{ background: colour(brand, variant.ground ?? 'paper') }}>
        <SvgImage svg={make()} alt={`${mark.label}, ${label}`} />
      </div>
      <figcaption>
        <span>{label}</span>
        <Downloads make={make} name={[brand.id, mark.id, variant.id].join('-')} width={2400} />
      </figcaption>
    </figure>
  )
}

/** A brand can expose source-specific secondary marks without adding official signatures. */
export const RelatedMarks = ({ brand, fonts, openManual }) => (
  <>
    {(brand.relatedMarks ?? []).map((mark) => (
      <section key={mark.id} id={`related-mark-${mark.id}`} className="panel panel--anchor" aria-labelledby={`related-mark-${mark.id}-heading`}>
        <div className="panel__head">
          <h2 id={`related-mark-${mark.id}-heading`}>{mark.label}</h2>
          {mark.use && <p className="muted">{mark.use}</p>}
        </div>
        <div className="asset-grid">
          {(mark.variants ?? []).map((variant) => <RelatedMarkCard key={variant.id} brand={brand} fonts={fonts} mark={mark} variant={variant} />)}
        </div>
        <ManualSources brand={brand} sources={mark.sources} openManual={openManual} />
      </section>
    ))}
  </>
)

/** The logos view: every signature in every colourway, and every department's set as one zip. */
/** `before` sits at the top of the view: the Logos tab puts the brand's logo motion there. */
export const SignatureLogos = ({ brand, fonts, openManual, before, after }) => {
  const [department, setDepartment] = useState('')
  // Arriving from a manual page (?signature=…), bring that signature into view.
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location?.search ?? '')
    const id = params.get('signature')
    if (id) document.getElementById(`signature-${id}`)?.scrollIntoView({ block: 'start' })
    else if (params.get('mark')) document.getElementById(`related-mark-${params.get('mark')}`)?.scrollIntoView({ block: 'start' })
  }, [])
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
      {before}
      {brand.relatedMarks?.length > 0 && (
        <p className="muted">
          Related artwork: {brand.relatedMarks.map((mark, index) => <span key={mark.id}>{index > 0 ? ' · ' : ''}<a href={`#related-mark-${mark.id}`}>{mark.label}</a></span>)}
        </p>
      )}
      {brand.departments?.items?.length > 0 && departmental.length > 0 && (
        <section className="panel toolbar toolbar--panel">
          <DepartmentSelect brand={brand} value={department} onChange={setDepartment} />
          <p className="muted" style={{ margin: 0, flex: 1 }}>Every departmental signature below is set for the {brand.departments.label?.toLowerCase() ?? 'department'} chosen here.</p>
          <button type="button" className="button" disabled={busy} onClick={zipAll}>{busy ? 'Setting every one…' : `↓ All ${brand.departments.items.length}, zipped`}</button>
        </section>
      )}
      {brand.signatures.map((signature) => (
        <section key={signature.id} id={`signature-${signature.id}`} className="panel panel--anchor">
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
          <ManualSources brand={brand} sources={signature.sources} openManual={openManual} />
        </section>
      ))}
      <RelatedMarks brand={brand} fonts={fonts} openManual={openManual} />
      {after}
    </div>
  )
}
