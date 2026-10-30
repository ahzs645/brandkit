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

import { useEffect, useId, useMemo, useState } from 'react'
import { allFields, renderTemplate, templateFields } from '../engine/templates.js'
import { referencePlacement } from '../engine/template-guides.js'
import { download, pdf, rasterise, zip } from '../export/render.js'
import { documentsFor, FORMAT_LABELS, officeFile } from '../export/office.js'
import { physicalSize } from '../engine/templates.js'
import { PrinterWebsite } from './PrinterWebsite.jsx'
import { safeDocumentHref } from './asset-urls.js'
import { Select } from '../ui/Select.jsx'
import { MenuButton } from '../ui/MenuButton.jsx'
import { useEditPreviewDock } from '../ui/EditPreviewDock.jsx'
import './studio.css'

const useSvgUrl = (svg) => {
  // Made and revoked in one effect: a memoised URL would be revoked by StrictMode's rehearsal
  // unmount and then handed out again.
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!svg) { setUrl(null); return undefined }
    const next = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    setUrl(next)
    // Revoked a little later: an <img> still fetching the old URL when the art changes (switching
    // brand or revision) would otherwise fail to load it.
    return () => setTimeout(() => URL.revokeObjectURL(next), 5000)
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

const OFFICE_HINTS = { docx: 'a Word template', pptx: 'a PowerPoint template with a slide layout for each', html: 'an HTML signature to paste into a mail program' }

const slug = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export const TemplateStudio = ({
  brand, fonts, templates = brand.templates ?? [], storageKey = brand.id, values: controlled, onValuesChange,
  children, fileName = (template, fieldValues) => [brand.id, template.id, slug(fieldValues['contact-name'] ?? fieldValues.name)].filter(Boolean).join('-'),
  note, departments = true, initialTemplate, onSelect, aside, onPrint, onPrinterPackage, printerWebsite,
  resolveAsset
}) => {
  const [selected, setSelectedState] = useState(() => (templates.some((entry) => entry.id === initialTemplate) ? initialTemplate : templates[0]?.id))
  const setSelected = (id) => { setSelectedState(id); onSelect?.(id) }
  const [own, setOwn] = useState(() => readStored(storageKey))
  const [guides, setGuides] = useState(false)
  const [largePreview, setLargePreview] = useState(false)
  const [layoutRules, setLayoutRules] = useState(false)
  const [overlay, setOverlay] = useState(false)
  const [overlayOpacity, setOverlayOpacity] = useState(50)
  const [referenceError, setReferenceError] = useState(false)
  const inspectionId = useId()
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  // On a phone the fields and the preview take turns; the preview first, with the picker above it.
  const dock = useEditPreviewDock({ initial: 'preview', labels: { edit: 'Fill in', preview: 'Preview' }, label: 'Fields or preview' })
  const values = controlled ?? own
  const setValues = (next) => {
    if (onValuesChange) onValuesChange(next)
    else setOwn(next)
  }
  useEffect(() => { if (!controlled && storageKey) try { localStorage.setItem(`brandkit:fields:${storageKey}`, JSON.stringify(own)) } catch { /* not persisted */ } }, [own, controlled, storageKey])
  useEffect(() => { if (!templates.some((template) => template.id === selected)) setSelectedState(templates[0]?.id) }, [templates, selected])

  const template = templates.find((entry) => entry.id === selected) ?? templates[0]
  const hasLayoutRules = Boolean(template?.guides?.elements?.length)
  const referenceUrl = template?.reference?.src ? (resolveAsset ? resolveAsset(template.reference.src) : template.reference.src) : null
  const auditUrl = safeDocumentHref(brand.manualAudit?.report ? (resolveAsset ? resolveAsset(brand.manualAudit.report) : brand.manualAudit.report) : null)
  useEffect(() => { setOverlay(false); setOverlayOpacity(50); setReferenceError(false) }, [template?.id, referenceUrl])
  const ready = Boolean(fonts)
  const entries = useMemo(() => entriesOf(templates, brand.sets ?? []), [templates, brand.sets])
  const currentSet = entries.flatMap(([, list]) => list).find((entry) => entry.set?.variants.some((variant) => variant.template === template?.id))?.set ?? null
  const documents = template ? documentsFor(brand, template.id) : []
  const ctx = (outline, extra = {}) => ({ brand, fonts, values, outline: outline && ready, ...extra })
  const preview = template ? renderTemplate(ctx(true, { showGuides: guides, showLayoutGuides: layoutRules }), template).svg : null
  // A set's fields are all its variants' (a card's name is on its back while its front is shown),
  // except fields local to another variant (a different sign's wording).
  const fields = !template ? [] : currentSet
    ? allFields(currentSet.variants.map((variant) => templates.find((entry) => entry.id === variant.template)).filter(Boolean), brand)
      .filter((field) => !field.local || field.templates.includes(template.id))
    : templateFields(template, brand)
  const everyField = useMemo(() => allFields(templates, brand), [templates, brand])
  const filled = everyField.filter((field) => typeof values[field.id] === 'string' ? values[field.id].trim() : values[field.id]?.src).length

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

  const disabled = Boolean(busy) || !ready
  const downloadPdf = () => run('pdf', async () => download((await files(template)).pdf, `${name(template)}.pdf`))
  const pdfHint = 'Print-ready, with crop marks where the design has them'
  // One download stands out: the editable Office master where the template has one (a letterhead's
  // Word template), the signature to paste for an email signature, otherwise the PDF. Everything
  // else is in the menu beside it.
  const master = documents.find((document) => document.format === 'docx') ?? documents.find((document) => document.format === 'pptx')
  const signature = !master && documents.find((document) => document.format === 'html')
  const primary = master ? { key: master.id, label: `↓ ${officeLabel(master)}`, title: OFFICE_HINTS[master.format], act: () => office(master) }
    : signature ? { key: `${signature.id}-copy`, label: copied === signature.id ? 'Copied' : 'Copy signature', title: 'Copy it to paste into a mail program', act: () => copySignature(signature) }
      : { key: 'pdf', label: '↓ PDF', title: pdfHint, act: downloadPdf }
  const more = [
    { heading: 'This design' },
    primary.key !== 'pdf' && { label: 'PDF', hint: pdfHint, disabled, onSelect: downloadPdf },
    { label: 'PNG', hint: 'An image for screens, slides and posts', disabled, onSelect: () => run('png', async () => download((await files(template)).png, `${name(template)}.png`)) },
    { label: 'SVG', hint: 'Text stays live and editable', disabled: Boolean(busy), onSelect: () => run('svg', async () => download(renderTemplate(ctx(false), template).svg, `${name(template)}.svg`)) },
    hasLayoutRules && { label: 'SVG with rules', hint: 'Editable artwork with a separate, visible layout-guides layer', disabled: Boolean(busy), onSelect: () => run('svg-rules', async () => download(renderTemplate(ctx(false, { showLayoutGuides: true }), template).svg, `${name(template)}-with-rules.svg`)) },
    currentSet && { label: 'PDF, all variants', hint: `Every variant of the ${currentSet.label.toLowerCase()}, one to a page`, disabled, onSelect: () => run('set', async () => {
      const pages = currentSet.variants.map((variant) => { const outlined = renderTemplate(ctx(true), templates.find((entry) => entry.id === variant.template)); return { svg: outlined.svg, ...physicalSize(outlined) } })
      download(await pdf(pages, { title: `${brand.name} ${currentSet.label}`, author: brand.name }), `${brand.id}-${currentSet.id}.pdf`)
    }) },
    documents.some((document) => document !== master) && { heading: 'Office' },
    ...documents.filter((document) => document !== master).flatMap((document) => [
      document === signature && { label: 'Copy signature', hint: 'To paste into a mail program', disabled, onSelect: () => copySignature(document) },
      { label: officeLabel(document), hint: `${document.label}: ${OFFICE_HINTS[document.format]}`, disabled, onSelect: () => office(document) }
    ]),
    { heading: 'Print and more' },
    onPrinterPackage && { label: 'Printer package', hint: 'For Template Printer: artwork, fonts, fields and variants, zipped', disabled, onSelect: () => run('printer-package', () => onPrinterPackage(template, values)) },
    { label: 'All templates, zipped', hint: `Every template as SVG, PNG and PDF`, disabled, onSelect: () => run('all', async () => {
      const out = new Map()
      for (const entry of templates) {
        const made = await files(entry)
        for (const [format, bytes] of Object.entries(made)) out.set(`${format}/${name(entry)}.${format}`, bytes)
      }
      download(await zip(out, `${brand.id}-templates`), `${brand.id}-templates.zip`)
    }) }
  ]
  const entryOf = (id) => entries.flatMap(([, list]) => list).find((entry) => (entry.set ? entry.set.variants.some((variant) => variant.template === id) : entry.template.id === id))

  if (!template) return <p className="studio__empty">This brand defines no templates.</p>

  return (
    <div ref={dock.ref} className={`studio ${dock.className}`}>
      {/* On a phone the list, thumbnails and all, would be a sideways scroller with its names cut
          short; a grouped dropdown in its place names every template whole. */}
      <label className="field studio__picker">
        <span className="field__label">Template</span>
        <Select aria-label="Template" value={entryOf(template.id)?.key} onChange={(key) => setSelected(entries.flatMap(([, list]) => list).find((entry) => entry.key === key).template.id)}
          options={entries.flatMap(([group, list]) => list.map((entry) => ({ value: entry.key, label: entry.label, group: entries.length > 1 ? group : undefined })))} />
      </label>
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

      <div className="studio__stage" {...dock.panel('preview')}>
        {brand.manualAudit && <details className="studio__audit">
          <summary>Manual coverage and fidelity</summary>
          {brand.manualAudit.title && <p><strong>{brand.manualAudit.title}</strong></p>}
          {brand.manualAudit.summary && <p>{brand.manualAudit.summary}</p>}
          {(brand.manualAudit.pages || brand.manualAudit.checkedDate) && <p className="studio__audit-meta">{[brand.manualAudit.pages ? `${brand.manualAudit.pages}-page source` : null, brand.manualAudit.checkedDate ? `Checked ${brand.manualAudit.checkedDate}` : null].filter(Boolean).join(' · ')}</p>}
          {brand.manualAudit.limitations?.length > 0 && <ul>{brand.manualAudit.limitations.map((entry, index) => <li key={index}>{entry}</li>)}</ul>}
          {auditUrl && <a href={auditUrl} target="_blank" rel="noreferrer">Read the full manual audit ↗</a>}
        </details>}
        {currentSet && (
          <div className="studio__variants" role="group" aria-label={`${currentSet.label} variants`}>
            {currentSet.variants.map((variant) => <button key={variant.template} type="button" aria-pressed={variant.template === template.id} onClick={() => setSelected(variant.template)}>{variant.label}</button>)}
          </div>
        )}
        {(hasLayoutRules || template.reference) && (
          <fieldset className="studio__inspection">
            <legend>Layout inspection</legend>
            <div className="studio__inspection-controls">
              {hasLayoutRules && <label className="studio__toggle"><input type="checkbox" checked={layoutRules} onChange={(event) => setLayoutRules(event.target.checked)} aria-describedby={`${inspectionId}-rules`} /> Show layout rules</label>}
              {referenceUrl && <label className="studio__toggle"><input type="checkbox" checked={overlay} disabled={referenceError} onChange={(event) => setOverlay(event.target.checked)} aria-describedby={`${inspectionId}-source`} /> Overlay original scan</label>}
              <label className="studio__toggle"><input type="checkbox" checked={largePreview} onChange={(event) => setLargePreview(event.target.checked)} /> Larger preview</label>
            </div>
            {overlay && referenceUrl && !referenceError && <div className="studio__overlay-controls">
              <label htmlFor={`${inspectionId}-opacity`}>Scan opacity</label>
              <input id={`${inspectionId}-opacity`} type="range" min="0" max="100" step="1" value={overlayOpacity} onChange={(event) => setOverlayOpacity(Number(event.target.value))} />
              <output htmlFor={`${inspectionId}-opacity`}>{overlayOpacity}%</output>
              <button type="button" className="button button--quiet" onClick={() => setOverlayOpacity(50)}>Reset overlay</button>
            </div>}
            {hasLayoutRules && <div id={`${inspectionId}-rules`} className="studio__inspection-note">
              <p>Rules appear on the preview and in “SVG with rules”. Standard downloads keep the artwork clean.</p>
              {layoutRules && template.guides.notes?.length > 0 && <ul>{template.guides.notes.map((entry, index) => <li key={index}>{entry}</li>)}</ul>}
            </div>}
            {template.reference && <div id={`${inspectionId}-source`} className="studio__inspection-note">
              <p><strong>{template.reference.label ?? 'Original manual scan'}</strong>{template.reference.note ? ` — ${template.reference.note}` : ''}</p>
              {overlay && <p>The scan retains its original wording when you edit the template. The scan is never added to downloads.</p>}
              {(!referenceUrl || referenceError) && <p role="status">The source image is unavailable. The template and its layout rules can still be used.</p>}
            </div>}
          </fieldset>
        )}
        <div className="studio__canvas">
          <div className={`studio__comparison${largePreview ? ' studio__comparison--large' : ''}`} style={{ '--preview-ratio': template.width / template.height }}>
            <Preview className="studio__preview" svg={preview} alt={`${template.label ?? template.id} preview${layoutRules && hasLayoutRules ? ', layout rules shown' : ''}`} />
            {overlay && referenceUrl && !referenceError && <img className="studio__reference" src={referenceUrl} alt={template.reference.label ?? 'Original manual scan'} draggable={false} style={{ ...referencePlacement(template), opacity: overlayOpacity / 100 }} onError={() => { setReferenceError(true); setOverlay(false) }} />}
          </div>
        </div>
        {template.fidelity && <div className="studio__fidelity" data-status={template.fidelity.status}>
          {template.fidelity.label && <strong>{template.fidelity.label}</strong>}
          {template.fidelity.note && <p>{template.fidelity.note}</p>}
        </div>}
        <div className="studio__bar">
          {template.elements.some((element) => element.type === 'printGuides') && (
            <label className="studio__toggle"><input type="checkbox" checked={guides} onChange={(event) => setGuides(event.target.checked)} /> Trim and safe area</label>
          )}
          <span className="studio__size">{template.print ? `${template.print.trim.join(' × ')} ${template.print.unit} trim, ${template.print.bleed} ${template.print.unit} bleed` : template.physical ? template.physical.join(' × ') : `${template.width} × ${template.height}${template.unit === 'mm' ? ' mm' : ' px'}`}</span>
          <div className="studio__downloads">
            {onPrint && <button type="button" className="button button--quiet" disabled={disabled} onClick={() => run('printer', () => onPrint(template, values))}>{busy === 'printer' ? 'Opening…' : 'Edit & print'}</button>}
            <MenuButton className="button button--quiet" label={busy && ![primary.key, 'printer'].includes(busy) ? 'Making…' : 'More formats'} items={more} />
            <button type="button" className="button studio__primary" disabled={disabled} title={primary.title} onClick={primary.act}>{busy === primary.key ? 'Making…' : primary.label}</button>
          </div>
        </div>
        {onPrinterPackage && printerWebsite && <PrinterWebsite key={template.id} website={printerWebsite.website}
          sourceUrl={brand.printer?.packages?.find((entry) => entry.id === template.printer?.packageId)?.sourceUrl}
          disabled={disabled} onDownload={() => run('printer-package', () => onPrinterPackage(template, values))} />}
        {error && <p className="studio__error" role="alert">{error}</p>}
        {!ready && <p className="studio__note">Loading the brand’s fonts. Previews use stand-in type until they arrive.</p>}
        {note && <p className="studio__note">{note}</p>}
        {aside?.(template)}
      </div>

      <form className="studio__fields" {...dock.panel('edit')} onSubmit={(event) => event.preventDefault()}>
        {children}
        {departments && brand.departments?.items?.length > 0 && (
          <label className="field">
            <span className="field__label">{brand.departments.label ?? 'Department'}</span>
            <Select value={brand.departments.items.find((item) => Object.entries(item.values ?? {}).every(([key, value]) => (values[key] ?? '') === value))?.id ?? ''} onChange={(id) => {
              const item = brand.departments.items.find((entry) => entry.id === id)
              setValues({ ...values, ...(item?.values ?? {}) })
            }} options={[{ value: '', label: 'Choose to fill the fields…' }, ...brand.departments.items.map((item) => ({ value: item.id, label: `${item.name}${item.years ? ` (${item.years})` : ''}` }))]} />
          </label>
        )}
        <h3>{currentSet?.label ?? template.label ?? template.id}</h3>
        {fields.length === 0 && <p className="studio__note">Nothing to fill in on this one.</p>}
        {fields.map((field) => (
          <label key={field.id} className="field">
            <span className="field__label">{field.label}</span>
            {field.type === 'image' ? <input type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => setValues({ ...values, [field.id]: { src: reader.result, fit: 'cover' } })
              reader.readAsDataURL(file)
            }} /> : field.multiline
              ? <textarea rows={3} value={values[field.id] ?? ''} placeholder={field.placeholder} onChange={(event) => setValues({ ...values, [field.id]: event.target.value })} />
              : <input type="text" value={values[field.id] ?? ''} placeholder={field.placeholder} onChange={(event) => setValues({ ...values, [field.id]: event.target.value })} />}
          </label>
        ))}
        <p className="studio__note">{filled} of {everyField.length} fields filled across {templates.length} templates. Fields with the same name are shared.</p>
        {filled > 0 && <button type="button" className="button button--quiet" onClick={() => setValues({})}>Clear every field</button>}
      </form>
      {dock.bar}
    </div>
  )
}
