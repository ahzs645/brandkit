// Fill in a brand's templates and download them: business cards, letterhead, envelopes, social
// graphics, presentation covers, whatever the brand defines.
//
// Fields are shared across templates by id, so a name typed once is on the card, the letterhead
// and the envelope alike. Previews have their text outlined (an SVG shown as an image cannot use
// the page's fonts); the SVG download keeps it live, so it can still be edited.
//
//   <TemplateStudio brand={brand} fonts={fonts} storageKey="my-brand" />
//
// `values` / `onValuesChange` make the fields controlled, for a host that sets some of them from
// its own controls (PofBC sets the ministry lines from its ministry picker). `children` render
// above the fields, for those controls.

import { useEffect, useMemo, useState } from 'react'
import { allFields, renderTemplate, templateFields } from '../engine/templates.js'
import { download, pdf, rasterise, zip } from '../export/render.js'
import { physicalSize } from '../engine/templates.js'
import './studio.css'

const useSvgUrl = (svg) => {
  // Made and revoked in one effect: a memoised URL would be revoked by StrictMode's rehearsal
  // unmount and then handed out again.
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!svg) { setUrl(null); return undefined }
    const next = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [svg])
  return url
}

const Preview = ({ svg, alt, className }) => {
  const url = useSvgUrl(svg)
  return url ? <img className={className} src={url} alt={alt} draggable={false} /> : null
}

const readStored = (key) => {
  if (!key) return {}
  try { return JSON.parse(localStorage.getItem(`brandkit:fields:${key}`) ?? '{}') } catch { return {} }
}

const groupsOf = (templates) => {
  const groups = new Map()
  for (const template of templates) {
    const group = template.group ?? 'Templates'
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group).push(template)
  }
  return [...groups]
}

const slug = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export const TemplateStudio = ({
  brand, fonts, templates = brand.templates ?? [], storageKey = brand.id, values: controlled, onValuesChange,
  children, fileName = (template, fieldValues) => [brand.id, template.id, slug(fieldValues['contact-name'] ?? fieldValues.name)].filter(Boolean).join('-'),
  note, departments = true, initialTemplate, onSelect, aside
}) => {
  const [selected, setSelectedState] = useState(() => (templates.some((entry) => entry.id === initialTemplate) ? initialTemplate : templates[0]?.id))
  const setSelected = (id) => { setSelectedState(id); onSelect?.(id) }
  const [own, setOwn] = useState(() => readStored(storageKey))
  const [guides, setGuides] = useState(false)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const values = controlled ?? own
  const setValues = (next) => {
    if (onValuesChange) onValuesChange(next)
    else setOwn(next)
  }
  useEffect(() => { if (!controlled && storageKey) try { localStorage.setItem(`brandkit:fields:${storageKey}`, JSON.stringify(own)) } catch { /* not persisted */ } }, [own, controlled, storageKey])
  useEffect(() => { if (!templates.some((template) => template.id === selected)) setSelectedState(templates[0]?.id) }, [templates, selected])

  const template = templates.find((entry) => entry.id === selected) ?? templates[0]
  const ready = Boolean(fonts)
  const ctx = (outline, extra = {}) => ({ brand, fonts, values, outline: outline && ready, ...extra })
  const preview = template ? renderTemplate(ctx(true, { showGuides: guides }), template).svg : null
  const fields = template ? templateFields(template, brand) : []
  const everyField = useMemo(() => allFields(templates, brand), [templates, brand])
  const filled = everyField.filter((field) => values[field.id]?.trim()).length

  const run = async (label, task) => {
    setBusy(label)
    setError(null)
    try { await task() } catch (problem) { setError(problem.message) } finally { setBusy(null) }
  }
  const name = (entry) => fileName(entry, values)
  const files = async (entry) => {
    const outlined = renderTemplate(ctx(true), entry)
    return {
      svg: new TextEncoder().encode(renderTemplate(ctx(false), entry).svg),
      png: await rasterise(outlined.svg, entry.raster ?? Math.min(2400, Math.max(1200, entry.width))),
      pdf: await pdf([{ svg: outlined.svg, ...physicalSize(outlined) }], { title: name(entry), author: brand.name })
    }
  }

  if (!template) return <p className="studio__empty">This brand defines no templates.</p>

  return (
    <div className="studio">
      <nav className="studio__list" aria-label="Templates">
        {groupsOf(templates).map(([group, entries]) => (
          <div key={group} className="studio__group">
            <h3>{group}</h3>
            {entries.map((entry) => (
              <button key={entry.id} type="button" className="studio__item" aria-pressed={entry.id === template.id} onClick={() => setSelected(entry.id)}>
                <span className="studio__thumb" style={{ aspectRatio: `${entry.width} / ${entry.height}` }}>
                  <Preview svg={renderTemplate(ctx(true), entry).svg} alt="" />
                </span>
                <span>{entry.label ?? entry.id}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="studio__stage">
        <div className="studio__canvas">
          <Preview className="studio__preview" svg={preview} alt={`${template.label ?? template.id} preview`} />
        </div>
        <div className="studio__bar">
          {template.elements.some((element) => element.type === 'printGuides') && (
            <label className="studio__toggle"><input type="checkbox" checked={guides} onChange={(event) => setGuides(event.target.checked)} /> Trim and safe area</label>
          )}
          <span className="studio__size">{template.print ? `${template.print.trim.join(' × ')} ${template.print.unit} trim, ${template.print.bleed} ${template.print.unit} bleed` : template.physical ? template.physical.join(' × ') : `${template.width} × ${template.height}${template.unit === 'mm' ? ' mm' : ' px'}`}</span>
          <div className="studio__downloads">
            <button type="button" className="button button--quiet" disabled={Boolean(busy)} title="Text stays live and editable" onClick={() => run('svg', async () => download(renderTemplate(ctx(false), template).svg, `${name(template)}.svg`))}>↓ SVG</button>
            <button type="button" className="button button--quiet" disabled={Boolean(busy) || !ready} onClick={() => run('png', async () => download((await files(template)).png, `${name(template)}.png`))}>{busy === 'png' ? '…' : '↓'} PNG</button>
            <button type="button" className="button" disabled={Boolean(busy) || !ready} onClick={() => run('pdf', async () => download((await files(template)).pdf, `${name(template)}.pdf`))}>{busy === 'pdf' ? '…' : '↓'} PDF</button>
            <button type="button" className="button button--quiet" disabled={Boolean(busy) || !ready} title="Every template, as SVG, PNG and PDF" onClick={() => run('all', async () => {
              const out = new Map()
              for (const entry of templates) {
                const made = await files(entry)
                for (const [format, bytes] of Object.entries(made)) out.set(`${format}/${name(entry)}.${format}`, bytes)
              }
              download(await zip(out, `${brand.id}-templates`), `${brand.id}-templates.zip`)
            })}>{busy === 'all' ? 'Making…' : '↓ All, zipped'}</button>
          </div>
        </div>
        {error && <p className="studio__error" role="alert">{error}</p>}
        {!ready && <p className="studio__note">Loading the brand’s fonts. Previews use stand-in type until they arrive.</p>}
        {note && <p className="studio__note">{note}</p>}
        {aside?.(template)}
      </div>

      <form className="studio__fields" onSubmit={(event) => event.preventDefault()}>
        {children}
        {departments && brand.departments?.items?.length > 0 && (
          <label className="field">
            <span className="field__label">{brand.departments.label ?? 'Department'}</span>
            <select value={brand.departments.items.find((item) => Object.entries(item.values ?? {}).every(([key, value]) => (values[key] ?? '') === value))?.id ?? ''} onChange={(event) => {
              const item = brand.departments.items.find((entry) => entry.id === event.target.value)
              setValues({ ...values, ...(item?.values ?? {}) })
            }}>
              <option value="">Choose to fill the fields…</option>
              {brand.departments.items.map((item) => <option key={item.id} value={item.id}>{item.name}{item.years ? ` (${item.years})` : ''}</option>)}
            </select>
          </label>
        )}
        <h3>{template.label ?? template.id}</h3>
        {fields.length === 0 && <p className="studio__note">Nothing to fill in on this one.</p>}
        {fields.map((field) => (
          <label key={field.id} className="field">
            <span className="field__label">{field.label}</span>
            {field.multiline
              ? <textarea rows={3} value={values[field.id] ?? ''} placeholder={field.placeholder} onChange={(event) => setValues({ ...values, [field.id]: event.target.value })} />
              : <input type="text" value={values[field.id] ?? ''} placeholder={field.placeholder} onChange={(event) => setValues({ ...values, [field.id]: event.target.value })} />}
          </label>
        ))}
        <p className="studio__note">{filled} of {everyField.length} fields filled across {templates.length} templates. Fields with the same name are shared.</p>
        {filled > 0 && <button type="button" className="button button--quiet" onClick={() => setValues({})}>Clear every field</button>}
      </form>
    </div>
  )
}
