import { useState } from 'react'
import { logoDocument } from '../../engine/artwork.js'
import { documentProfile } from '../../engine/documentation.js'
import { logoDimensions } from '../../engine/identity.js'
import { colour } from '../../engine/brand.js'
import { hasSubLogos, readAffiliation, writeAffiliation } from '../affiliation.js'
import { SvgImage } from '../ui.jsx'
import { SubLogos } from './SubLogos.jsx'

export const OrganizationSources = ({ brand }) => <>
  {brand.officialResources?.length > 0 && <section className="panel">
    <h2>Official source materials</h2>
    <p className="muted">Original university files and guidance. The editable applications in this kit have their own layout conventions.</p>
    <div className="organization-resources">{brand.officialResources.map(resource => <a key={resource.url} href={resource.url} target="_blank" rel="noreferrer">
      <strong>{resource.title ?? resource.label}</strong><span>{resource.format}{resource.note ? ` · ${resource.note}` : ''} ↗</span>
    </a>)}</div>
  </section>}
</>

/**
 * A brand's departments. Where the brand composes sub-logos, choosing one is also how a unit is
 * named in documents and templates; a brand without them names its units here as text alone.
 */
export const Organization = ({ brand, fonts, onDocuments, onTemplates }) => {
  const [affiliation, setAffiliation] = useState(() => readAffiliation(brand.id))
  const [width, setWidth] = useState(String(brand.documentation?.logo?.widthMm ?? 60))
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const profile = documentProfile(brand)
  const subLogos = hasSubLogos(brand)
  const maxCharacters = profile.affiliation?.maxCharacters ?? 180
  let dimensions
  let problem = ''
  try { dimensions = logoDimensions(brand, Number(width)) } catch (error) { problem = error.message }
  if (affiliation.subdepartment.trim() && !affiliation.department.trim()) problem = 'Add the parent department before a subdepartment.'
  if (Object.values(affiliation).some(value => value.length > maxCharacters)) problem = `Keep each unit name to ${maxCharacters} characters or fewer.`
  const save = (next, names = affiliation) => {
    try {
      const value = writeAffiliation(brand.id, names)
      setAffiliation(value); setSaveError(''); setMessage(subLogos ? `${value.department} is saved for documents and templates.` : 'Unit names saved for documents and templates.')
      next?.()
    } catch (error) { setSaveError(error.message) }
  }
  // A subdepartment belongs to its department, so choosing another department drops it.
  const useName = (name, next) => save(next, { department: name, subdepartment: name === affiliation.department ? affiliation.subdepartment : '' })
  const size = profile.affiliation ?? {}
  const related = brand.brandArchitecture?.relatedBrands ?? []
  const digits = value => Number(value.toFixed(2))
  if (!brand.organization) return <div className="view organization-view"><SubLogos brand={brand} fonts={fonts} /></div>
  return <div className="view organization-view">
    {subLogos ? <SubLogos brand={brand} fonts={fonts} initialName={affiliation.department} actions={name => <>
      {(saveError || message) && <p className={saveError ? 'notice notice--error' : 'notice'} role={saveError ? 'alert' : 'status'}>{saveError || message}</p>}
      <div className="documents-actions">
        <button type="button" className="button" disabled={!name} onClick={() => useName(name, onDocuments)}>Use in documents</button>
        <button type="button" className="button button--quiet" disabled={!name} onClick={() => useName(name, onTemplates)}>Use in templates</button>
      </div>
      <p className="field__hint">Documents and templates set the name as text under the logo; add a subdepartment there.</p>
    </>} /> : <>
      <section className="panel">
        <h2>Department and subdepartment names</h2>
        <p>{brand.organization?.naming?.note}</p>
        <p className="muted">Use the unit’s established name. A long name wraps onto another line at the same type size; the logo keeps its original proportions.</p>
      </section>
      <div className="organization-workspace">
        <section className="panel organization-controls" aria-label="Unit settings">
          <p className="eyebrow">{brand.organization?.name ?? brand.name}</p>
          {['department', 'subdepartment'].map(key => <label className="field" key={key}>
            <span className="field__label">{key === 'department' ? 'Department or faculty' : 'Subdepartment or unit'}</span>
            <input type="text" maxLength={maxCharacters} value={affiliation[key]} placeholder={key === 'department' ? 'Enter the established parent name' : 'Optional unit within that department'} onChange={event => { setAffiliation(current => ({ ...current, [key]: event.target.value })); setMessage(''); setSaveError('') }} />
          </label>)}
          <label className="field"><span className="field__label">Logo artwork width for sizing preview (mm)</span>
            <input type="number" step="0.1" min={brand.logoPolicy?.minimumWidthMm ?? 1} max="160" value={width} onChange={event => setWidth(event.target.value)} />
            <span className="field__hint">This calculator explains the spacing. Documents use their configured print profile.</span>
          </label>
          {(problem || saveError) && <p className="notice notice--error" role="alert">{problem || saveError}</p>}
          {message && <p className="notice" role="status">{message}</p>}
          <div className="documents-actions">
            <button type="button" className="button" disabled={Boolean(problem)} onClick={() => save()}>Save unit names</button>
            <button type="button" className="button button--quiet" disabled={Boolean(problem)} onClick={() => save(onDocuments)}>Use in documents</button>
            <button type="button" className="button button--quiet" disabled={Boolean(problem)} onClick={() => save(onTemplates)}>Use in templates</button>
          </div>
        </section>
        <section className="panel organization-preview-panel" aria-label="Unit naming preview">
          <h3>Document attribution preview</h3>
          <div className="organization-preview-scroll">
            <div className="organization-preview" style={{ color: colour(brand, 'ink'), fontFamily: brand.fonts?.body?.stack }}>
              {dimensions && <div className="organization-logo-zone" style={{ width: dimensions.totalWidthMm * 96 / 25.4, padding: dimensions.clearSpaceMm * 96 / 25.4 }}>
                <SvgImage svg={logoDocument({ brand, fonts }, profile.logo.options)} alt={`${brand.name} complete official logo`} style={{ width: dimensions.widthMm * 96 / 25.4, maxWidth: 'none', height: 'auto', display: 'block' }} />
              </div>}
              <div className="organization-attribution" style={{ lineHeight: size.lineHeight ?? 1.3 }}>
                <p style={{ fontSize: `${size.departmentSizePt ?? 12}pt`, fontWeight: 700 }}>{affiliation.department || '[Department or faculty]'}</p>
                <p style={{ fontSize: `${size.subdepartmentSizePt ?? 10.5}pt` }}>{affiliation.subdepartment || '[Optional subdepartment or unit]'}</p>
              </div>
              <p className="organization-preview-title">Report title</p>
              <p className="organization-preview-caption">Unit names are editable document text, set at the document’s own sizes.</p>
            </div>
          </div>
        </section>
      </div>
    </>}
    {/* The sizing rules and the related identities are reference, not the task: closed until asked for. */}
    <details className="panel organization-reference">
      <summary>Sizing rules{related.length > 0 ? ' and related brands' : ''}</summary>
      <h2>How the sizing works</h2>
      <div className="organization-table-scroll"><table className="organization-table"><thead><tr><th scope="col">Element</th><th scope="col">Rule</th><th scope="col">Basis</th></tr></thead><tbody>
        <tr><th scope="row">Complete logo</th><td>At least {brand.logoPolicy?.minimumWidthMm ?? profile.logo.minimumWidthMm} mm wide; scale proportionally.</td><td>Official minimum width</td></tr>
        <tr><th scope="row">Surrounding space</th><td>{brand.lockup?.clearspaceRecommendation}</td><td>Official visual rule</td></tr>
        <tr><th scope="row">{subLogos ? 'In documents' : 'Sizing preview'}</th><td>{dimensions ? `${digits(dimensions.widthMm)} mm artwork + ${digits(dimensions.clearSpaceMm)} mm clear space per side = ${digits(dimensions.totalWidthMm)} mm total width.` : 'Enter a valid artwork width.'}</td><td>Measured artwork ratio plus the document profile’s minimum spacing</td></tr>
        {subLogos && <tr><th scope="row">Sub-logo</th><td>The department line keeps its place, size and leading relative to the logo; size the sub-logo as a whole, by the full logo’s width.</td><td>Measured from official sub-logo artwork</td></tr>}
        <tr><th scope="row">Department name</th><td>{size.departmentSizePt ?? 12} pt, bold, natural wrapping.</td><td>Kit document layout convention</td></tr>
        <tr><th scope="row">Subdepartment name</th><td>{size.subdepartmentSizePt ?? 10.5} pt, regular, below its parent.</td><td>Kit document layout convention</td></tr>
      </tbody></table></div>
    {related.length > 0 && <>
      <h2>Connections in the brand portfolio</h2>
      <div className="organization-relations">{related.map(item => <article key={item.id}>
        <h3><a href={`?brand=${encodeURIComponent(item.id)}`}>{item.label ?? item.id}</a></h3>
        <p><strong>{item.relationship}</strong></p><p className="muted">{item.note}</p>
      </article>)}</div>
    </>}
    </details>
    <OrganizationSources brand={brand} />
  </div>
}
