// Fill in a brand's templates and download them: business cards, letterhead, envelopes, social
// graphics, presentation covers, whatever the brand defines.
//
// Fields are shared across templates by id, so a name typed once is on the card, the letterhead
// and the envelope alike. Previews have their text outlined (an SVG shown as an image cannot use
// the page's fonts); the SVG download keeps it live, so it can still be edited.
//
//   <TemplateStudio brand={brand} fonts={fonts} storageKey="my-brand" />
//
// A brand's `sets` make variants of one thing one item (a card's fronts and back; a letterhead in
// A4 and US Letter): the list shows the set once, and the stage switches between its variants. Its
// `documents` add Office downloads to the templates they are made from: a Word template, a
// PowerPoint template, an HTML email signature (with a button to copy it for a mail program).
//
// `values` / `onValuesChange` make the fields controlled, for a host that sets some of them from
// its own controls (PofBC sets the ministry lines from its ministry picker). `children` render
// above the fields, for those controls.

import { useEffect, useMemo, useState } from 'react'
import { allFields, renderTemplate, templateFields } from '../engine/templates.js'
import { download, pdf, rasterise, zip } from '../export/render.js'
import { documentsFor, FORMAT_LABELS, officeFile } from '../export/office.js'
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

/** The list's entries: one per template, or one per set of variants, in their groups. */
const entriesOf = (templates, sets) => {
  const groups = new Map()
  const seen = new Set()
  for (const template of templates) {
    const set = sets.find((entry) => entry.variants.some((variant) => variant.template === template.id))
    if (set && seen.has(set.id)) continue
    if (set) seen.add(set.id)
    const variants = set ? set.variants.filter((variant) => templates.some((entry) => entry.id === variant.template)) : null
    const first = variants ? templates.find((entry) => entry.id === variants[0].template) : template
    const group = (set && variants.length > 1 ? set.group : null) ?? first.group ?? 'Templates'
    if (!groups.has(group)) groups.set(group, [])
    const several = set && variants.length > 1
    groups.get(group).push({ key: set?.id ?? template.id, label: several ? set.label : first.label ?? first.id, template: first, set: several ? { ...set, variants } : null })
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
  const entries = useMemo(() => entriesOf(templates, brand.sets ?? []), [templates, brand.sets])
  const currentSet = entries.flatMap(([, list]) => list).find((entry) => entry.set?.variants.some((variant) => variant.template === template?.id))?.set ?? null
  const documents = template ? documentsFor(brand, template.id) : []
  const ctx = (outline, extra = {}) => ({ brand, fonts, values, outline: outline && ready, ...extra })
  const preview = template ? renderTemplate(ctx(true, { showGuides: guides }), template).svg : null
  // A set's fields are all its variants' (a card's name is on its back while its front is shown),
  // except fields local to another variant (a different sign's wording).
  const fields = !template ? [] : currentSet
    ? allFields(currentSet.variants.map((variant) => templates.find((entry) => entry.id === variant.template)).filter(Boolean), brand)
      .filter((field) => !field.local || field.templates.includes(template.id))
    : templateFields(template, brand)
  const everyField = useMemo(() => allFields(templates, brand), [templates, brand])
  const filled = everyField.filter((field) => values[field.id]?.trim()).length

  const run = async (label, task) => {
    setBusy(label)
    setError(null)
    try { await task() } catch (problem) { setError(problem.message) } finally { setBusy(null) }
  }
  const name = (entry) => fileName(entry, values)
  const office = (document) => run(document.id, async () => {
    const file = await officeFile({ brand, fonts, values }, document, { png: rasterise })
    download(file.bytes, file.name, file.type)
  })
  const copySignature = (document) => run(`${document.id}-copy`, async () => {
    const file = await officeFile({ brand, fonts, values }, document, { png: rasterise })
    const plain = file.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([file.html], { type: 'text/html' }), 'text/plain': new Blob([plain], { type: 'text/plain' }) })])
    setCopied(document.id)
  })
  const [copied, setCopied] = useState(null)
  useEffect(() => { if (!copied) return undefined; const timer = setTimeout(() => setCopied(null), 2400); return () => clearTimeout(timer) }, [copied])
  // Two documents in one format from one template (a continuation sheet serves several) are told apart by name.
  const officeLabel = (document) => (documents.filter((other) => other.format === document.format).length > 1 ? `${FORMAT_LABELS[document.format]}: ${document.label}` : FORMAT_LABELS[document.format])
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
        {entries.map(([group, list]) => (
          <div key={group} className="studio__group">
            <h3>{group}</h3>
            {list.map((entry) => {
              const pressed = entry.set ? entry.set.variants.some((variant) => variant.template === template.id) : entry.template.id === template.id
              return (
                <button key={entry.key} type="button" className="studio__item" aria-pressed={pressed} onClick={() => { if (!pressed) setSelected(entry.template.id) }}>
                  <span className="studio__thumb" style={{ aspectRatio: `${entry.template.width} / ${entry.template.height}` }}>
                    <Preview svg={renderTemplate(ctx(true), entry.template).svg} alt="" />
                  </span>
                  <span>{entry.label}{entry.set && <span className="studio__count">{entry.set.variants.length} variants</span>}</span>
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="studio__stage">
        {currentSet && (
          <div className="studio__variants" role="group" aria-label={`${currentSet.label} variants`}>
            {currentSet.variants.map((variant) => <button key={variant.template} type="button" aria-pressed={variant.template === template.id} onClick={() => setSelected(variant.template)}>{variant.label}</button>)}
          </div>
        )}
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
            {currentSet && (
              <button type="button" className="button button--quiet" disabled={Boolean(busy) || !ready} title={`Every variant of the ${currentSet.label.toLowerCase()}, one to a page`} onClick={() => run('set', async () => {
                const pages = currentSet.variants.map((variant) => { const outlined = renderTemplate(ctx(true), templates.find((entry) => entry.id === variant.template)); return { svg: outlined.svg, ...physicalSize(outlined) } })
                download(await pdf(pages, { title: `${brand.name} ${currentSet.label}`, author: brand.name }), `${brand.id}-${currentSet.id}.pdf`)
              })}>{busy === 'set' ? '…' : '↓'} PDF, all variants</button>
            )}
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
        {documents.length > 0 && (
          <div className="studio__office">
            <span className="studio__office-label">Office</span>
            {documents.map((document) => (
              <span key={document.id} className="studio__office-item">
                <button type="button" className="button" disabled={Boolean(busy) || !ready} title={`${document.label}: ${{ docx: 'a Word template', pptx: 'a PowerPoint template with a slide layout for each', html: 'an HTML signature to paste into a mail program' }[document.format]}`} onClick={() => office(document)}>{busy === document.id ? 'Making…' : `↓ ${officeLabel(document)}`}</button>
                {document.format === 'html' && <button type="button" className="button button--quiet" disabled={Boolean(busy) || !ready} onClick={() => copySignature(document)}>{copied === document.id ? 'Copied' : 'Copy signature'}</button>}
              </span>
            ))}
          </div>
        )}
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
        <h3>{currentSet?.label ?? template.label ?? template.id}</h3>
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
