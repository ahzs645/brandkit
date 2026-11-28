import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DOCUMENT_PURPOSES, documentationGuide, publicationModel, validatePublication } from '../../engine/documentation.js'
import { checkPublication, publicationDocx, publicationPrintHtml } from '../../export/publication.js'
import { hasPublications, publicationDocuments, publicationKinds, publicationStyle, publicationStyles, publicationsOf, resolvePublication, starterPublication } from '../../engine/publications.js'
import { brandFaces } from '../../export/brand-faces.js'
import { documentSnapshot, pdfFor, wordFor } from '../../export/document-pdf.js'
import { printPdf } from '../../export/print-pdf.js'
import { download, rasterise } from '../../export/render.js'
import { readAffiliation, writeAffiliation } from '../affiliation.js'
import { Segmented } from '../ui.jsx'
import { useEditPreviewDock } from '../../ui/EditPreviewDock.jsx'
import { PdfPages } from '../../ui/PdfPages.jsx'
import { PdfThumb } from '../../ui/PdfThumb.jsx'

const asJson = (value) => `${JSON.stringify(value, null, 2)}\n`

// The gallery's first-page pictures, per brand object (an edited brand is a new object, so it draws
// afresh) and kept while the brand is: coming back to Documents shows them at once.
const thumbnails = new WeakMap()
const thumbnailsFor = (brand) => {
  if (!thumbnails.has(brand)) thumbnails.set(brand, new Map())
  return thumbnails.get(brand)
}
const PAPER_RATIO = { letter: 215.9 / 279.4, a4: 210 / 297, slide: 16 / 9 }
// The writer of designed publications (document-kit, plates, lockups), loaded when one is first drawn.
const designedWriter = () => import('../../export/designed-publication.js')

// The preview frame takes its document's height, so the page scrolls rather than a box within it
// (a phone showed 591px of a 4,048px document). The document's own narrow-screen styles reflow it
// to a phone's width; anything still wider (a wide table) is scaled down to fit rather than cut.
// Its height is the root element's box, not its scrollHeight, which never drops below the frame's
// own height and so would only ever grow.
export const DocumentFrame = ({ frame, title, html }) => {
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
export const Documents = ({ brand, fonts, source }) => {
  const catalog = brand.documentation?.recipes
  const recipes = Array.isArray(catalog) ? catalog.filter((entry) => typeof entry?.label === 'string' && typeof entry.file === 'string' && source?.has(entry.file)) : []
  const recipeInput = useRef(null)
  const [paper, setPaper] = useState('letter')
  const [purpose, setPurpose] = useState(() => DOCUMENT_PURPOSES.some((item) => item.id === brand.documentation?.defaultPurpose) ? brand.documentation.defaultPurpose : 'product')
  const [values, setValues] = useState(() => ({ affiliation: readAffiliation(brand.id) }))
  // Arriving with a saved department (from Departments' Use in documents), its names start open.
  const [imported, setImported] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('')
  const sourceInput = useRef(null)
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
  // One snapshot of the document as it stands: its Word file, and that Word file laid out as the PDF
  // the preview shows and "Download PDF" and "Print" use (src/export/document-pdf.js).
  const faces = useMemo(() => (fonts ? brandFaces(ctx) : []), [ctx, fonts])
  const preview = useMemo(() => {
    if (!fonts || !model) return { snapshot: null, error: null }
    try { checkPublication(ctx, model) } catch (problem) { return { snapshot: null, error: problem.message } }
    return { snapshot: documentSnapshot({ word: () => publicationDocx(ctx, model, { png: rasterise }), title: model.title ?? brand.name, faces, name: model.id }), error: null }
  }, [ctx, model, fonts, faces, brand.name])
  // A recipe document, when one is open: it takes the preview's place until it is closed.
  const [recipeView, setRecipeView] = useState(null)
  // The gallery draws its thumbnails once the document's own pages have been laid out (or a few
  // seconds have passed), so they queue behind it in the layout worker rather than ahead of it.
  const [galleryReady, setGalleryReady] = useState(false)
  useEffect(() => {
    if (!fonts) return undefined
    const timer = setTimeout(() => setGalleryReady(true), 4000)
    return () => clearTimeout(timer)
  }, [fonts])
  // A designed publication from the brand's publication system, when one is open, in the chosen style.
  const designed = hasPublications(brand)
  // The gallery's style: '' shows each document as designed (its own style, else the brand's first);
  // choosing one previews every document in it. An opened document keeps its own choice in designView.
  const [designStyle, setDesignStyle] = useState('')
  const styleFor = (doc) => designStyle || doc.style || publicationStyle(brand)?.id || null
  const [designView, setDesignView] = useState(null)
  const read = useCallback(async (path) => {
    if (!source?.has?.(path)) throw new Error(`${brand.name} does not carry ${path}, which the publication shows.`)
    const bytes = await source.read(path)
    return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  }, [source, brand.name])
  const designSnapshotOf = useCallback((doc, style) => documentSnapshot({
    word: async () => (await designedWriter()).designedPublicationDocx(ctx, doc, { style, png: rasterise, read }),
    title: doc.title, faces, name: `${doc.id}-${style}`
  }), [ctx, read, faces])
  const designPreview = useMemo(() => {
    if (!designView || !fonts) return { snapshot: null, error: null }
    try { resolvePublication(brand, designView.doc, { style: designView.style }) } catch (problem) { return { snapshot: null, error: problem.message } }
    return { snapshot: designSnapshotOf(designView.doc, designView.style), error: null }
  }, [designView, fonts, brand, designSnapshotOf])
  const updateDesign = (key, value) => setDesignView((current) => ({ ...current, doc: { ...current.doc, [key]: value } }))
  const designPrintView = () => run(async () => download(new TextEncoder().encode(await (await designedWriter()).designedPublicationHtml(ctx, designView.doc, { style: designView.style, png: rasterise, read })), `${designView.doc.id}-${designView.style}.html`))
  const shown = recipeView?.snapshot ?? designPreview.snapshot ?? preview.snapshot
  const active = designView ? designPreview.snapshot : preview.snapshot
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
  const word = (snapshot = preview.snapshot) => run(async () => {
    download(await wordFor(snapshot), `${snapshot.name}.docx`)
    setStatus('Word master downloaded. Its headings, paragraphs, captions and tables remain editable.')
  })
  const pdf = (snapshot = preview.snapshot) => run(async () => {
    download((await pdfFor(snapshot)).bytes, `${snapshot.name}.pdf`)
    setStatus('PDF downloaded: the Word master laid out page for page, as the preview shows it.')
  })
  // A recipe job opened as a document of its own: the preview shows its pages, and its Word file and
  // PDF come from that one snapshot.
  const recipeSnapshot = (json) => {
    const job = JSON.parse(json)
    const name = job?.recipe?.id ?? 'recipe'
    return documentSnapshot({
      word: async () => (await import('../../recipes/browser.js')).browserRecipeDocx(ctx, job),
      title: job?.recipe?.name ?? name, faces, name
    })
  }
  const openRecipe = (json, entry = null) => {
    const snapshot = recipeSnapshot(json)
    setDesignView(null)
    setRecipeView({ snapshot, label: snapshot.title, entry })
    dock.show?.('preview')
    return snapshot
  }
  const exportRecipe = async (json) => {
    const snapshot = openRecipe(json)
    download(await wordFor(snapshot), snapshot.name + '.docx')
    setStatus('Recipe exported with ' + brand.name + '. Its pages are in the preview.')
  }
  const importSource = (file) => run(async () => {
    if (file.size > 35 * 1024 * 1024) throw new Error('Choose a publication source smaller than 35 MB.')
    const next = JSON.parse(await file.text())
    const problems = validatePublication(next)
    if (problems.length) throw new Error(problems.join(' '))
    if (next.profile.brandId !== brand.id) throw new Error(`This publication belongs to ${next.profile.brandId}. Open that brand before importing it.`)
    // Check it as the writers read it before adopting it, so an invalid image leaves the previous draft intact.
    checkPublication(ctx, next)
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
  // The PDF itself prints (or is saved as PDF): the same file as the preview and the download.
  const print = () => run(async () => {
    const snapshot = shown
    if (!snapshot) throw new Error('Wait for the document preview to finish loading.')
    await printPdf((await pdfFor(snapshot)).bytes, snapshot.title)
  })
  const printView = () => run(async () => download(await publicationPrintHtml(ctx, model, { png: rasterise }), `${model.id}.html`))
  if (!model || !guide) return <div className="view"><section className="panel"><h2>Document profile needs attention</h2><p role="alert" className="notice notice--error">{composed.error ?? 'This brand has an invalid document profile. Check its documentation overrides in the definition.'}</p></section></div>
  return <div className="view documents-view">
    <section className="panel documents-head">
      <div><h2>Write a document with {brand.name}</h2>
      </div>
      <div className="documents-actions">
        <button className="button button--quiet" type="button" disabled={!fonts || busy} onClick={() => recipeInput.current?.click()}>Generate Word from recipe</button>
        <input ref={recipeInput} type="file" accept=".json,application/json" hidden onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) run(async () => exportRecipe(await file.text()))
        }} />
        <button className="button button--quiet" type="button" disabled={!fonts || busy} onClick={() => sourceInput.current?.click()}>Open document source</button>
        <input ref={sourceInput} type="file" accept=".json,application/json" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) importSource(file) }} />
        <button className="button button--quiet" type="button" disabled={!active || busy || (!designView && Boolean(composed.error))} onClick={() => pdf(active)}>Download PDF</button>
        <button className="button" type="button" disabled={!active || busy || (!designView && Boolean(composed.error))} onClick={() => word(active)}>{busy ? 'Working…' : 'Download Word'}</button>
      </div>
    </section>
    <section className="panel documents-gallery" aria-label="Documents to write">
      {[
        ...(designed ? [{ group: publicationsOf(brand)?.label ?? 'Publication system', styled: true, items: [
          ...publicationDocuments(brand).map((doc) => ({ doc, description: `${doc.label ?? publicationKinds(brand).find((kind) => kind.id === doc.kind)?.name ?? doc.kind} · ${doc.pages.length} ${publicationKinds(brand).find((kind) => kind.id === doc.kind)?.format === 'slide' ? 'slide' : 'page'}${doc.pages.length === 1 ? '' : 's'}` })),
          // A kind no document shows yet starts from its skeleton.
          ...publicationKinds(brand).filter((kind) => !publicationDocuments(brand).some((doc) => doc.kind === kind.id)).map((kind) => ({ doc: starterPublication(brand, kind.id), description: kind.description ?? `A new ${kind.name.toLowerCase()} from its skeleton.` }))
        ].map(({ doc, description }) => {
          const kind = publicationKinds(brand).find((entry) => entry.id === doc.kind)
          return {
            key: `publication:${doc.id}`, label: doc.title.replace(/\*/g, ''), description, ratio: kind?.format === 'slide' ? PAPER_RATIO.slide : PAPER_RATIO.letter,
            pressed: !recipeView && designView?.id === doc.id, disabled: !fonts,
            make: () => designSnapshotOf(doc, styleFor(doc)), thumb: `publication:${doc.id}:${styleFor(doc)}`,
            choose: () => { setRecipeView(null); setDesignView({ id: doc.id, doc: structuredClone(doc), style: styleFor(doc) }); setStatus(''); setError(null) }
          }
        }) }] : []),
        { group: 'Documents', items: DOCUMENT_PURPOSES.map((item) => ({
          key: `purpose:${item.id}`, label: item.label, description: item.description, ratio: PAPER_RATIO[paper],
          pressed: !recipeView && !designView && purpose === item.id, disabled: Boolean(imported) && purpose !== item.id,
          make: () => documentSnapshot({ word: () => publicationDocx(ctx, publicationModel(brand, { paper, purpose: item.id }), { png: rasterise }), title: item.label, faces, name: `${brand.id}-${item.id}` }),
          thumb: `purpose:${item.id}:${paper}`,
          choose: () => { setRecipeView(null); setDesignView(null); setPurpose(item.id); setStatus(''); setError(null) }
        })) },
        { group: 'Brand recipes', items: recipes.map((entry) => ({
          key: `recipe:${entry.file}`, label: entry.label, description: entry.description ?? 'A document made from data by the brand’s recipe.', ratio: PAPER_RATIO.letter,
          pressed: recipeView?.entry?.file === entry.file, disabled: !fonts,
          make: async () => recipeSnapshot(new TextDecoder().decode(await source.read(entry.file))),
          thumb: `recipe:${entry.file}`,
          choose: () => run(async () => { openRecipe(new TextDecoder().decode(await source.read(entry.file)), entry) })
        })) }
      ].filter(({ items }) => items.length).map(({ group, items, styled }, index, groups) => <div key={group} className="documents-gallery__group">
        {groups.length > 1 && <div className="documents-gallery__head"><h3>{group}</h3>
          {styled && <Segmented label="Publication style" value={designStyle} onChange={setDesignStyle} options={[{ value: '', label: 'As designed', title: 'Each document in its own style' }, ...publicationStyles(brand).map((style) => ({ value: style.id, label: style.name, title: [style.label, style.status, style.summary].filter(Boolean).join(' · ') }))]} />}
        </div>}
        <div className="documents-gallery__list">
          {items.map((item) => <button key={item.key} type="button" className="documents-gallery__item" aria-pressed={item.pressed} disabled={item.disabled} title={item.description}
            onClick={() => { if (!item.pressed) { item.choose(); if (dock.compact) dock.show?.('preview') } }}>
            <PdfThumb make={item.make} cache={thumbnailsFor(brand)} cacheKey={fonts ? item.thumb : null} ready={Boolean(fonts) && galleryReady} ratio={item.ratio} />
            <span className="documents-gallery__label">{item.label}</span>
            <span className="documents-gallery__description">{item.description}</span>
          </button>)}
        </div>
      </div>)}
    </section>
    <div ref={dock.ref} className={`documents-workspace ${dock.className}`}>
      {designView ? <section className="panel documents-controls" aria-label="Publication settings" {...dock.panel('edit')}>
        <h3>{designView.doc.title.replace(/\*/g, '')}</h3>
        <p className="muted">{(() => { try { const resolved = resolvePublication(brand, designView.doc, { style: designView.style }); return `${designView.doc.label ?? resolved.kind.name} · ${resolved.owner.name} · ${resolved.paper.label}${resolved.slide ? '' : `, ${resolved.paper.orientation}`} · ${designView.doc.pages.length} ${resolved.slide ? 'slides' : 'pages'}` } catch { return '' } })()}</p>
        <div className="field"><span className="field__label">Style</span><Segmented label="Publication style" value={designView.style} onChange={(style) => setDesignView((current) => ({ ...current, style }))} options={publicationStyles(brand).map((style) => ({ value: style.id, label: style.name, title: style.summary }))} /></div>
        {publicationStyles(brand).find((style) => style.id === designView.style)?.summary && <p className="muted">{publicationStyles(brand).find((style) => style.id === designView.style).summary}</p>}
        <h3>Document content</h3>
        {[['title', 'Title'], ['short', 'Short title (running heads)'], ['edition', 'Edition']].map(([key, label]) => <label className="field" key={key}><span className="field__label">{label}</span>
          <input value={designView.doc[key] ?? ''} onChange={(event) => updateDesign(key, event.target.value)} /></label>)}
        <p className="muted">Pages, blocks and their words are the brand’s <code>publications.documents</code> in brand.json. The Word file is the master to edit; the PDF and the print view come from the same document.</p>
        <div className="documents-actions">
          <button className="button button--quiet" type="button" onClick={() => download(asJson(designView.doc), `${designView.doc.id}.json`)}>Download source</button>
          <button className="button button--quiet" type="button" disabled={!designPreview.snapshot || busy} onClick={designPrintView}>Download print view</button>
          <button className="button button--quiet" type="button" disabled={!shown || busy} onClick={print}>Print or save PDF</button>
          <button className="link" type="button" onClick={() => setDesignView(null)}>Back to the document</button>
        </div>
      </section> : <section className="panel documents-controls" aria-label="Document settings" {...dock.panel('edit')}>
        <h3>Document settings</h3>
        {imported && <p className="notice">An imported document is open. <button type="button" className="link" onClick={() => { setImported(null); setError(null); setStatus('') }}>Start a new example</button></p>}
        <p className="muted"><strong>{DOCUMENT_PURPOSES.find((item) => item.id === purpose)?.label}.</strong> {DOCUMENT_PURPOSES.find((item) => item.id === purpose)?.description}</p>
        <div className="field"><span className="field__label">Paper size</span>{imported ? <span>{paper === 'a4' ? 'A4' : 'US Letter'}</span> : <Segmented label="Paper size" value={paper} onChange={setPaper} options={[{ value: 'letter', label: 'US Letter' }, { value: 'a4', label: 'A4' }]} />}</div>
        {/* Each optional section says what it holds beside its heading. */}
        <section className="documents-details">
          <h4 className="documents-details__head"><span>Department naming</span><span className="documents-details__meta">{activeAffiliation.department?.trim() || 'Optional'}</span></h4>
          <div className="documents-details__body">
            <p className="muted">Optional names appear as editable document text below the logo. Use the exact organizational names.</p>
            {['department', 'subdepartment'].map((key) => <label className="field" key={key}><span className="field__label">{key === 'department' ? 'Department or school' : 'Subdepartment or unit'}</span><input type="text" maxLength={180} value={activeAffiliation[key] ?? ''} onChange={(event) => updateAffiliation(key, event.target.value)} /></label>)}
          </div>
        </section>
        <h3>Document content</h3>
        {[
          ['title', 'Title', model.title], ['subtitle', 'Subtitle', model.subtitle], ['edition', 'Edition', model.edition],
          ['introduction', 'Opening paragraph', 'Explain the subject, reader and purpose.'], ['summary', 'Main point', 'State the outcome, finding or decision.'],
          ['detail', 'Product or workstream description', 'Describe the main workflow and its result.'], ['scope', 'Supported scope', 'Describe requirements and boundaries.']
        ].map(([key, label, placeholder]) => <label className="field" key={key}><span className="field__label">{label}</span>{['introduction', 'summary', 'detail', 'scope'].includes(key)
          ? <textarea disabled={Boolean(imported)} rows={3} value={values[key] ?? ''} placeholder={placeholder} onChange={(event) => update(key, event.target.value)} />
          : <input disabled={Boolean(imported)} value={values[key] ?? ''} placeholder={placeholder} onChange={(event) => update(key, event.target.value)} />}</label>)}
        <section className="documents-details">
          <h4 className="documents-details__head"><span>Screenshot or evidence</span><span className="documents-details__meta">{values.figure?.src ? 'Image added' : 'Placeholder'}</span></h4>
          <div className="documents-details__body">
            <label className="field"><span className="field__label">PNG or JPEG image</span><input type="file" disabled={Boolean(imported) || busy} accept="image/png,image/jpeg" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) uploadFigure(file) }} /></label>
            {['caption', 'alt', 'provenance'].map((key) => <label className="field" key={key}><span className="field__label">{{ caption: 'Figure caption', alt: 'Image description', provenance: 'Source and capture date' }[key]}</span><textarea disabled={Boolean(imported)} rows={2} value={values.figure?.[key] ?? ''} onChange={(event) => updateFigure(key, event.target.value)} /></label>)}
            {values.figure?.src && !imported && <button className="link" type="button" onClick={() => setValues((current) => ({ ...current, figure: undefined }))}>Remove screenshot</button>}
            <p className="muted">The image keeps its original colours. Example text and the labelled placeholder should be replaced before sharing a finished document.</p>
          </div>
        </section>
        <div className="documents-actions">
          <button className="button button--quiet" type="button" disabled={Boolean(composed.error)} onClick={() => download(asJson(model), `${model.id}.json`)}>Download source</button>
          <button className="button button--quiet" type="button" disabled={!preview.snapshot || busy || Boolean(composed.error)} onClick={printView}>Download print view</button>
          <button className="button button--quiet" type="button" disabled={!shown || busy || Boolean(composed.error)} onClick={print}>Print or save PDF</button>
        </div>
      </section>}
      <section className="panel documents-preview" aria-label="Document preview" {...dock.panel('preview')}>
        {(error || (designView ? designPreview.error : composed.error || preview.error)) && <p className="notice notice--error" role="alert">{error || (designView ? designPreview.error : composed.error || preview.error)}</p>}
        {status && <p className="notice" role="status">{status}</p>}
        {recipeView && <div className="notice documents-recipe-view" role="status">
          <span>Recipe document: <strong>{recipeView.label}</strong></span>
          <span className="documents-actions">
            <button className="button button--quiet" type="button" disabled={busy} onClick={() => pdf(recipeView.snapshot)}>PDF</button>
            <button className="button button--quiet" type="button" disabled={busy} onClick={() => word(recipeView.snapshot)}>Word</button>
            {typeof recipeView.entry?.sampleData === 'string' && source?.has(recipeView.entry.sampleData) &&
              <a className="button button--quiet" href={source.url(recipeView.entry.sampleData)} download={recipeView.entry.sampleData.split('/').at(-1)}>Sample data</a>}
            <button className="link" type="button" onClick={() => setRecipeView(null)}>Back to the document</button>
          </span>
        </div>}
        {!fonts ? <p className="muted">Loading the brand’s fonts…</p> : shown && <PdfPages snapshot={shown} label={`${recipeView?.label ?? designView?.doc.title.replace(/\*/g, '') ?? brand.name} pages as printed`} onView={() => setGalleryReady(true)} />}
      </section>
      {dock.bar}
    </div>
  </div>
}
