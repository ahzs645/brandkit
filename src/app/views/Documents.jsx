import { useEffect, useMemo, useRef, useState } from 'react'
import { DOCUMENT_PURPOSES, documentationGuide, publicationModel, validatePublication } from '../../engine/documentation.js'
import { consumerProfile } from '../../engine/consumer.js'
import { publicationDocx, publicationHtml } from '../../export/publication.js'
import { download, rasterise } from '../../export/render.js'
import { readAffiliation, writeAffiliation } from '../affiliation.js'
import { Segmented, Select } from '../ui.jsx'
import { useEditPreviewDock } from '../../ui/EditPreviewDock.jsx'

const asJson = (value) => `${JSON.stringify(value, null, 2)}\n`

// The preview frame takes its document's height, so the page scrolls rather than a box within it
// (a phone showed 591px of a 4,048px document). The document's own narrow-screen styles reflow it
// to a phone's width; anything still wider (a wide table) is scaled down to fit rather than cut.
// Its height is the root element's box, not its scrollHeight, which never drops below the frame's
// own height and so would only ever grow.
const DocumentFrame = ({ frame, title, html }) => {
  const box = useRef(null)
  const [fit, setFit] = useState({ height: 640, width: 0, scale: 1 })
  const measure = () => {
    const root = frame.current?.contentDocument?.documentElement
    if (!root || !box.current) return
    const room = box.current.clientWidth
    const wide = root.scrollWidth > room + 1 ? root.scrollWidth : 0
    const height = Math.ceil(root.getBoundingClientRect().height)
    if (height) setFit((current) => (current.width === wide && current.height === height ? current : { width: wide, height, scale: wide ? room / wide : 1 }))
  }
  const watch = useRef(null)
  useEffect(() => {
    const observer = new ResizeObserver(() => measure())
    observer.observe(box.current)
    return () => { observer.disconnect(); watch.current?.disconnect() }
  }, [])
  // A new document (each edit) loads afresh; the frame keeps its height meanwhile, so the page
  // does not jump, and is measured again once it has loaded and once its fonts have.
  const loaded = () => {
    const page = frame.current?.contentDocument
    if (!page?.documentElement) return
    watch.current?.disconnect()
    watch.current = new ResizeObserver(() => measure())
    watch.current.observe(page.documentElement)
    measure()
    page.fonts?.ready.then(measure)
  }
  return (
    <div ref={box} className="documents-frame" style={{ height: fit.height * fit.scale }}>
      <iframe ref={frame} title={title} srcDoc={html} sandbox="allow-same-origin allow-modals" onLoad={loaded} scrolling="no"
        style={{ height: fit.height, width: fit.width || '100%', transform: fit.scale < 1 ? `scale(${fit.scale})` : undefined }} />
    </div>
  )
}

/** Every brand gets the same document workflow, with its own identity and print profile. */
export const Documents = ({ brand, fonts }) => {
  const [paper, setPaper] = useState('letter')
  const [purpose, setPurpose] = useState(() => DOCUMENT_PURPOSES.some((item) => item.id === brand.documentation?.defaultPurpose) ? brand.documentation.defaultPurpose : 'product')
  const [values, setValues] = useState(() => ({ affiliation: readAffiliation(brand.id) }))
  // Arriving with a saved department (from Departments' Use in documents), its names start open.
  const [namedOnArrival] = useState(() => Boolean(readAffiliation(brand.id).department?.trim()))
  const [imported, setImported] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('')
  const sourceInput = useRef(null)
  const frame = useRef(null)
  const ctx = useMemo(() => ({ brand, fonts }), [brand, fonts])
  const dock = useEditPreviewDock({ label: 'Settings or preview' })
  const composed = useMemo(() => {
    try { return { model: imported ?? publicationModel(brand, { paper, purpose, values }), error: null } }
    catch (problem) {
      try { return { model: publicationModel(brand, { paper, purpose }), error: problem.message } }
      catch { return { model: null, error: problem.message } }
    }
  }, [brand, paper, purpose, values, imported])
  const model = composed.model
  const guide = useMemo(() => {
    try { return documentationGuide(brand, { paper: model?.paper ?? paper }) }
    catch { return null }
  }, [brand, model?.paper, paper])
  const preview = useMemo(() => {
    if (!fonts || !model) return { html: '', error: null }
    try { return { html: publicationHtml(ctx, model), error: null } }
    catch (problem) { return { html: '', error: problem.message } }
  }, [ctx, model, fonts])
  const activeAffiliation = (imported ? imported.affiliation : values.affiliation) ?? { department: '', subdepartment: '' }
  const update = (key, value) => { setValues((current) => ({ ...current, [key]: value.trim() ? value : undefined })); setStatus('') }
  const updateAffiliation = (key, value) => {
    const next = { department: '', subdepartment: '', ...activeAffiliation, [key]: value }
    if (imported) setImported((current) => ({ ...current, affiliation: next }))
    else setValues((current) => ({ ...current, affiliation: next }))
    setStatus(''); setError(null)
    try { writeAffiliation(brand.id, next) } catch (problem) { setError(problem.message) }
  }
  const updateFigure = (key, value) => setValues((current) => ({ ...current, figure: { ...current.figure, [key]: value } }))
  const run = async (action) => {
    setBusy(true); setError(null); setStatus('')
    try { await action() } catch (problem) { setError(problem.message) } finally { setBusy(false) }
  }
  const word = () => run(async () => {
    const bytes = await publicationDocx(ctx, model, { png: rasterise })
    download(bytes, `${model.id}.docx`)
    setStatus('Word master downloaded. Its headings, paragraphs, captions and tables remain editable.')
  })
  const importSource = (file) => run(async () => {
    if (file.size > 35 * 1024 * 1024) throw new Error('Choose a publication source smaller than 35 MB.')
    const next = JSON.parse(await file.text())
    const problems = validatePublication(next)
    if (problems.length) throw new Error(problems.join(' '))
    if (next.profile.brandId !== brand.id) throw new Error(`This publication belongs to ${next.profile.brandId}. Open that brand before importing it.`)
    // Render once before adopting it, so an invalid image leaves the previous draft intact.
    publicationHtml(ctx, next)
    setImported(next); setPaper(next.paper); setPurpose(next.purpose)
    if (next.affiliation) {
      setValues((current) => ({ ...current, affiliation: next.affiliation }))
      try { writeAffiliation(brand.id, next.affiliation) } catch (problem) { setError(problem.message) }
    }
    setStatus('Publication source opened. Download Word to edit its content, or export the source for another workflow.')
  })
  const uploadFigure = (file) => run(async () => {
    if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Choose a PNG or JPEG screenshot.')
    if (file.size > 8 * 1024 * 1024) throw new Error('Choose a screenshot smaller than 8 MB.')
    const src = await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('The screenshot could not be read.')); reader.readAsDataURL(file)
    })
    updateFigure('src', src)
  })
  const print = () => run(async () => {
    const target = frame.current?.contentWindow
    if (!target) throw new Error('Wait for the document preview to finish loading.')
    await target.document.fonts.ready
    target.focus(); target.print()
  })
  if (!model || !guide) return <div className="view"><section className="panel"><h2>Document profile needs attention</h2><p role="alert" className="notice notice--error">{composed.error ?? 'This brand has an invalid document profile. Check its documentation overrides in the definition.'}</p></section></div>
  return <div className="view documents-view">
    <section className="panel documents-head">
      <div><h2>Write a document with {brand.name}</h2>
        <p className="muted">Choose an editable starter, add your content, and download a Word master. The preview uses the same content and brand profile.</p>
        <p className="caption">Identity v{guide.version} · Document layouts v{guide.profile.status.documentationVersion}</p>
      </div>
      <div className="documents-actions">
        <button className="button button--quiet" type="button" disabled={!fonts || busy} onClick={() => sourceInput.current?.click()}>Open document source</button>
        <input ref={sourceInput} type="file" accept=".json,application/json" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) importSource(file) }} />
        <button className="button" type="button" disabled={!fonts || busy || Boolean(preview.error || composed.error)} onClick={word}>{busy ? 'Working…' : 'Download Word'}</button>
      </div>
    </section>
    <div ref={dock.ref} className={`documents-workspace ${dock.className}`}>
      <section className="panel documents-controls" aria-label="Document settings" {...dock.panel('edit')}>
        <h3>Document settings</h3>
        {imported && <p className="notice">An imported document is open. <button type="button" className="link" onClick={() => { setImported(null); setError(null); setStatus('') }}>Start a new example</button></p>}
        <label className="field"><span className="field__label">Document purpose</span><Select disabled={Boolean(imported)} value={purpose} onChange={setPurpose} options={DOCUMENT_PURPOSES.map((item) => ({ value: item.id, label: item.label }))} /></label>
        <p className="muted">{DOCUMENT_PURPOSES.find((item) => item.id === purpose)?.description}</p>
        <div className="field"><span className="field__label">Paper size</span>{imported ? <span>{paper === 'a4' ? 'A4' : 'US Letter'}</span> : <Segmented label="Paper size" value={paper} onChange={setPaper} options={[{ value: 'letter', label: 'US Letter' }, { value: 'a4', label: 'A4' }]} />}</div>
        {/* Optional sections fold away, so the content fields come sooner; each says what it holds. */}
        <details className="documents-details" open={namedOnArrival}>
          <summary><span>Department naming</span><span className="documents-details__meta">{activeAffiliation.department?.trim() || 'Optional'}</span></summary>
          <div className="documents-details__body">
            <p className="muted">Optional names appear as editable document text below the logo. Use the exact organizational names.</p>
            {['department', 'subdepartment'].map((key) => <label className="field" key={key}><span className="field__label">{key === 'department' ? 'Department or school' : 'Subdepartment or unit'}</span><input type="text" maxLength={180} value={activeAffiliation[key] ?? ''} onChange={(event) => updateAffiliation(key, event.target.value)} /></label>)}
            {guide.profile.affiliation && <p className="caption">Department {guide.profile.affiliation.departmentSizePt} pt · subdepartment {guide.profile.affiliation.subdepartmentSizePt} pt · automatic line wrapping. {guide.profile.affiliation.note}</p>}
          </div>
        </details>
        <h3>Document content</h3>
        {[
          ['title', 'Title', model.title], ['subtitle', 'Subtitle', model.subtitle], ['edition', 'Edition', model.edition],
          ['introduction', 'Opening paragraph', 'Explain the subject, reader and purpose.'], ['summary', 'Main point', 'State the outcome, finding or decision.'],
          ['detail', 'Product or workstream description', 'Describe the main workflow and its result.'], ['scope', 'Supported scope', 'Describe requirements and boundaries.']
        ].map(([key, label, placeholder]) => <label className="field" key={key}><span className="field__label">{label}</span>{['introduction', 'summary', 'detail', 'scope'].includes(key)
          ? <textarea disabled={Boolean(imported)} rows={3} value={values[key] ?? ''} placeholder={placeholder} onChange={(event) => update(key, event.target.value)} />
          : <input disabled={Boolean(imported)} value={values[key] ?? ''} placeholder={placeholder} onChange={(event) => update(key, event.target.value)} />}</label>)}
        <details className="documents-details">
          <summary><span>Screenshot or evidence</span><span className="documents-details__meta">{values.figure?.src ? 'Image added' : 'Placeholder'}</span></summary>
          <div className="documents-details__body">
            <label className="field"><span className="field__label">PNG or JPEG image</span><input type="file" disabled={Boolean(imported) || busy} accept="image/png,image/jpeg" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) uploadFigure(file) }} /></label>
            {['caption', 'alt', 'provenance'].map((key) => <label className="field" key={key}><span className="field__label">{{ caption: 'Figure caption', alt: 'Image description', provenance: 'Source and capture date' }[key]}</span><textarea disabled={Boolean(imported)} rows={2} value={values.figure?.[key] ?? ''} onChange={(event) => updateFigure(key, event.target.value)} /></label>)}
            {values.figure?.src && !imported && <button className="link" type="button" onClick={() => setValues((current) => ({ ...current, figure: undefined }))}>Remove screenshot</button>}
            <p className="muted">The image keeps its original colours. Example text and the labelled placeholder should be replaced before sharing a finished document.</p>
          </div>
        </details>
        <div className="documents-actions">
          <button className="button button--quiet" type="button" disabled={Boolean(composed.error)} onClick={() => download(asJson(model), `${model.id}.json`)}>Download source</button>
          <button className="button button--quiet" type="button" disabled={!preview.html || Boolean(composed.error)} onClick={() => download(preview.html, `${model.id}.html`)}>Download print view</button>
          <button className="button button--quiet" type="button" disabled={!preview.html || busy || Boolean(composed.error)} onClick={print}>Print or save PDF</button>
        </div>
        <p className="caption">For a PDF with Word’s pagination, export the edited Word master as PDF. The command-line document build can create the matching pair.</p>
      </section>
      <section className="panel documents-preview" aria-label="Document preview" {...dock.panel('preview')}>
        {(error || composed.error || preview.error) && <p className="notice notice--error" role="alert">{error || composed.error || preview.error}</p>}
        {status && <p className="notice" role="status">{status}</p>}
        {!fonts ? <p className="muted">Loading the brand’s fonts…</p> : preview.html && <DocumentFrame frame={frame} title={`${brand.name} document preview`} html={preview.html} />}
      </section>
      {dock.bar}
    </div>
    <section className="panel documents-guidance">
      <h3>Use this brand consistently</h3>
      <p>{guide.status.note}</p>
      <div className="documents-rules">{Object.entries(guide.rules).map(([key, value]) => <p key={key}><strong>{key.charAt(0).toUpperCase() + key.slice(1)}. </strong>{value}</p>)}</div>
      <p className="muted">{guide.profile.logo.clearSpaceRule} The supplied artwork keeps its proportions.</p>
      <div className="documents-actions">
        <button className="button button--quiet" type="button" onClick={() => download(asJson(guide.profile), `${brand.id}-document-profile-${paper}.json`)}>Download print profile</button>
        <button className="button button--quiet" type="button" disabled={!fonts || busy} onClick={() => run(async () => download(asJson(consumerProfile(ctx)), `${brand.id}-consumer-profile.json`))}>Export for another app</button>
      </div>
    </section>
  </div>
}
