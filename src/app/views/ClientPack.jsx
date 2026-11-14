import { useEffect, useMemo, useRef, useState } from 'react'
import { loadBrandFonts } from '../../fonts/provider.js'
import { download, rasterise, zip } from '../../export/render.js'
import { createHandoverTemplate, handoverProblems } from '../../handover/record.js'
import { BRAND_SECTIONS, PACK_DOCUMENTS, TABLE_STYLES, WELCOME_COVER_VARIANTS, WELCOME_SECTIONS, composePack, packHtml, packIndex, preparePack } from '../../handover/pack.js'
import { WELCOME_COVER_TEXT } from '../../handover/cover.js'
import { Segmented, Select } from '../ui.jsx'
import { useEditPreviewDock } from '../../ui/EditPreviewDock.jsx'
import { DocumentFrame } from './Documents.jsx'

// A client pack, built as it is chosen: the brand open in the app is the client; another brand
// (First Form) is the provider. Every choice (documents, sections, cover, tables, paper) and every
// fact is kept in one handover record, in this browser, so the same record builds the same pack
// with the command line (`brandkit handover`). The preview redraws a moment after each change.

const today = () => new Date().toISOString().slice(0, 10)
const lines = (list) => (list ?? []).join('\n')
const unlines = (text) => text.split('\n')
const ids = (list) => list.map((item) => item.id)
const TABLE_LABELS = { grid: 'Grid (boxed)', ruled: 'Ruled', ledger: 'Ledger', panel: 'Panel', accent: 'Accent header' }
const ACCESS = [['unconfirmed', 'To confirm'], ['invitation', 'Account invitation'], ['password', 'Password sign-in'], ['sso', 'Organization sign-in (SSO)'], ['passwordless', 'Passwordless sign-in'], ['managed-only', 'Changes through the provider']]
const EMPTY_TASK = { title: '', steps: [], confirmation: '', tutorialUrl: '' }
const EMPTY_SERVICE = { name: '', accountOwner: '', managedBy: '', clientAccess: '', billedBy: '', renewalDate: '', costText: '', scope: '' }

const startRecord = (brand) => {
  const record = createHandoverTemplate()
  return { ...record, id: `${brand.id}-website-pack`, kind: 'client', preparedAt: today(), client: { ...record.client, name: brand.name, brandId: brand.id }, pack: { cover: 'on' } }
}

/** The record as built: both brand ids follow the brands chosen, and blank list lines are dropped. */
const effective = (record, client, provider, issue) => {
  const clean = (list) => list.map((item) => item.trim()).filter(Boolean)
  return {
    ...record,
    // Issuing a pack is the record's ready state.
    status: issue ? 'ready' : record.status,
    provider: { ...record.provider, brandId: provider.id, name: record.provider.name || provider.name },
    client: { ...record.client, brandId: client.id, name: record.client.name || client.name },
    access: { ...record.access, setupInstructions: clean(record.access.setupInstructions) },
    tasks: record.tasks.map((task) => ({ ...task, steps: clean(task.steps) })),
    care: { ...record.care, included: clean(record.care.included) },
    nextSteps: clean(record.nextSteps), notes: clean(record.notes)
  }
}

/** One value at a path, replaced without touching the rest. */
const assign = (target, [key, ...rest], value) => Array.isArray(target)
  ? target.map((item, i) => (i === key ? (rest.length ? assign(item, rest, value) : value) : item))
  : { ...target, [key]: rest.length ? assign(target?.[key] ?? {}, rest, value) : value }

const Section = ({ title, meta, open, children }) => (
  <details className="documents-details" open={open}>
    <summary><span>{title}</span>{meta != null && <span className="documents-details__meta">{meta}</span>}</summary>
    <div className="documents-details__body">{children}</div>
  </details>
)
const Text = ({ label, value, onChange, area, hint, placeholder }) => (
  <label className="field"><span className="field__label">{label}</span>
    {area ? <textarea rows={area === true ? 3 : area} value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      : <input value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}
    {hint && <span className="field__hint">{hint}</span>}
  </label>
)
const Checks = ({ items, chosen, onChange, disabled = () => false }) => (
  <div className="pack-checks">{items.map((item) => (
    <label key={item.id} className="pack-check">
      <input type="checkbox" checked={chosen.includes(item.id)} disabled={disabled(item)} onChange={(event) => onChange(event.target.checked ? ids(items).filter((id) => id === item.id || chosen.includes(id)) : chosen.filter((id) => id !== item.id))} />
      <span><strong>{item.label}</strong>{item.description && <small>{item.description}</small>}</span>
    </label>
  ))}</div>
)

export const ClientPack = ({ brand, fonts, brands, loadBrand }) => {
  const others = brands.filter((entry) => entry.id !== brand.id)
  const storeKey = `brandkit:pack:${brand.id}`
  const [record, setRecordState] = useState(() => {
    try { const kept = JSON.parse(localStorage.getItem(storeKey)); if (kept?.schema) return kept } catch { /* start afresh */ }
    return startRecord(brand)
  })
  const setRecord = (update) => setRecordState((current) => {
    const next = typeof update === 'function' ? update(current) : update
    try { localStorage.setItem(storeKey, JSON.stringify(next)) } catch { /* kept for this visit only */ }
    return next
  })
  const set = (path, value) => setRecord((current) => assign(current, path, value))
  const [providerId, setProviderId] = useState(() => {
    try { const kept = localStorage.getItem(`${storeKey}:provider`); if (kept && others.some((entry) => entry.id === kept)) return kept } catch { /* fine */ }
    return (others.find((entry) => entry.id === 'firstform') ?? others[0])?.id ?? ''
  })
  const [provider, setProvider] = useState(null)
  const [issue, setIssue] = useState(false)
  const [built, setBuilt] = useState({ prepared: null, html: {}, error: null, busy: true })
  const [shown, setShown] = useState('welcome')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const frame = useRef(null)
  const recordInput = useRef(null)
  const figures = useRef(new Map())
  const dock = useEditPreviewDock({ label: 'Choices or preview' })

  // The provider: its definition, then its fonts.
  useEffect(() => {
    if (!providerId) return undefined
    let live = true
    setProvider(null)
    try { localStorage.setItem(`${storeKey}:provider`, providerId) } catch { /* fine */ }
    ;(async () => {
      try {
        const loaded = await loadBrand(providerId)
        if (!loaded) throw new Error(`${providerId} could not be opened.`)
        const providerFonts = await loadBrandFonts(loaded.brand, loaded.source.read)
        if (live) setProvider({ brand: loaded.brand, fonts: providerFonts })
      } catch (problem) { if (live) setBuilt((current) => ({ ...current, error: problem.message, busy: false })) }
    })()
    return () => { live = false }
  }, [providerId]) // eslint-disable-line react-hooks/exhaustive-deps

  const client = useMemo(() => (fonts ? { brand, fonts } : null), [brand, fonts])
  const asBuilt = useMemo(() => (provider ? effective(record, brand, provider.brand, issue) : null), [record, brand, provider, issue])
  const problems = useMemo(() => (asBuilt ? handoverProblems(asBuilt, { forIssue: issue }) : []), [asBuilt, issue])
  const pack = record.pack ?? {}
  const paper = pack.paper || 'letter'

  // Rebuild a moment after the last change: the publications are quick, the cover is a drawing.
  useEffect(() => {
    if (!provider || !client || !asBuilt) return undefined
    if (problems.length) { setBuilt((current) => ({ ...current, busy: false, error: null })); return undefined }
    let live = true
    setBuilt((current) => ({ ...current, busy: true }))
    const timer = setTimeout(async () => {
      try {
        const key = `${brand.id}|${paper}`
        const prepared = await preparePack({ record: asBuilt, provider, client, options: { issue }, png: rasterise, dpi: 110, figures: figures.current.get(key) })
        figures.current.set(key, prepared.figures)
        const html = { ...packHtml(prepared, { provider, client }), index: packIndex(prepared, { provider, client }) }
        if (live) setBuilt({ prepared, html, error: null, busy: false })
      } catch (problem) { if (live) setBuilt((current) => ({ ...current, error: problem.message, busy: false })) }
    }, 300)
    return () => { live = false; clearTimeout(timer) }
  }, [asBuilt, provider, client, issue, problems.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const documents = built.prepared ? [...PACK_DOCUMENTS.filter((item) => built.html[item.id]), { id: 'index', label: 'Pack index' }] : []
  const visible = documents.some((item) => item.id === shown) ? shown : documents[0]?.id
  const choices = built.prepared?.choices
  const coverOn = pack.cover === 'on' || (pack.cover !== 'off' && Boolean(record.cover?.variant))
  const docs = pack.documents ?? ids(PACK_DOCUMENTS)
  const sections = pack.sections ?? ids(WELCOME_SECTIONS)
  const brandSections = pack.brandSections ?? ids(BRAND_SECTIONS)
  const wording = { ...WELCOME_COVER_TEXT, ...Object.fromEntries(Object.entries(record.cover ?? {}).filter(([, value]) => value)) }

  const run = async (action) => {
    setBusy(true); setNotice(null)
    try { await action() } catch (problem) { setNotice({ error: true, text: problem.message }) } finally { setBusy(false) }
  }
  const downloadPack = () => run(async () => {
    const { files, manifest } = await composePack({ record: asBuilt, provider, client, options: { issue }, png: rasterise, figures: figures.current.get(`${brand.id}|${paper}`) })
    const name = record.id || `${brand.id}-website-pack`
    download(await zip(files, name), `${name}.zip`)
    setNotice({ text: `${manifest.status === 'issued' ? 'Issued' : 'Draft'} pack downloaded: ${manifest.documents.length} document${manifest.documents.length === 1 ? '' : 's'} as Word, print HTML and source, with assets and a manifest. Print each to PDF from its HTML view, or build with PDFs from the command line.` })
  })
  const openRecord = (file) => run(async () => {
    const next = JSON.parse(await file.text())
    const found = handoverProblems(next)
    if (found.length) throw new Error(`That record has problems: ${found.slice(0, 4).join('; ')}`)
    setRecord(next)
    setNotice({ text: 'Record opened. Its facts and pack choices are now in place.' })
  })
  const print = () => run(async () => {
    const target = frame.current?.contentWindow
    if (!target) throw new Error('Wait for the preview to finish loading.')
    await target.document.fonts.ready
    target.focus(); target.print()
  })
  const setPack = (key, value) => set(['pack', key], value)
  const listEditor = (key, empty, render) => (
    <>
      {record[key].map((item, i) => (
        <fieldset key={i} className="pack-item">
          <legend>{item.title || item.name || `${key === 'tasks' ? 'Task' : 'Service'} ${i + 1}`}</legend>
          {render(item, (field, value) => set([key, i, field], value))}
          <button type="button" className="link" onClick={() => setRecord((current) => ({ ...current, [key]: current[key].filter((_, j) => j !== i) }))}>Remove</button>
        </fieldset>
      ))}
      <button type="button" className="button button--quiet" onClick={() => setRecord((current) => ({ ...current, [key]: [...current[key], structuredClone(empty)] }))}>Add {key === 'tasks' ? 'a task' : 'a service'}</button>
    </>
  )

  if (!others.length) return <div className="view"><section className="panel"><h2>Add a provider brand</h2><p className="muted">A client pack is set in two brands: the provider’s (such as First Form) for the guide, and this one for its brand reference. Open or add the provider’s brand pack first.</p></section></div>

  return <div className="view documents-view">
    <section className="panel documents-head">
      <div><h2>Client pack for {brand.name}</h2>
        <p className="muted">Choose what goes in, fill in the facts, and the pack builds as you go. Prepared by {provider?.brand.name ?? '…'}.</p></div>
      <div className="documents-actions">
        <button className="button button--quiet" type="button" disabled={busy} onClick={() => recordInput.current?.click()}>Open record</button>
        <input ref={recordInput} type="file" accept=".json,application/json" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) openRecord(file) }} />
        <button className="button button--quiet" type="button" disabled={!asBuilt} onClick={() => download(`${JSON.stringify(asBuilt, null, 2)}\n`, `${record.id || brand.id}.json`)}>Download record</button>
        <button className="button" type="button" disabled={busy || !built.prepared || problems.length > 0 || built.busy} onClick={downloadPack}>{busy ? 'Building…' : 'Download pack'}</button>
      </div>
    </section>
    <div ref={dock.ref} className={`documents-workspace ${dock.className}`}>
      <section className="panel documents-controls" aria-label="Pack choices" {...dock.panel('edit')}>
        <h3>The pack</h3>
        <label className="field"><span className="field__label">Prepared by</span>
          <Select value={providerId} onChange={setProviderId} options={others.map((entry) => ({ value: entry.id, label: entry.name }))} /></label>
        <div className="field"><span className="field__label">Paper</span><Segmented label="Paper" value={paper} onChange={(value) => setPack('paper', value)} options={[{ value: 'letter', label: 'US Letter' }, { value: 'a4', label: 'A4' }]} /></div>
        <label className="pack-check"><input type="checkbox" checked={issue} onChange={(event) => setIssue(event.target.checked)} /><span><strong>Final, to issue</strong><small>Checks that every fact is filled in, and drops the draft notes.</small></span></label>

        <Section title="Documents" meta={`${docs.filter((id) => id !== 'frontCover' || coverOn).length} of ${PACK_DOCUMENTS.length}`} open>
          <Checks items={PACK_DOCUMENTS} chosen={docs} onChange={(next) => setPack('documents', next)} disabled={(item) => item.id === 'frontCover' && !coverOn} />
        </Section>

        <Section title="Cover" meta={coverOn ? WELCOME_COVER_VARIANTS.find((item) => item.id === (record.cover?.variant || 'hero'))?.label : 'None'} open>
          <label className="pack-check"><input type="checkbox" checked={coverOn} onChange={(event) => setPack('cover', event.target.checked ? 'on' : 'off')} /><span><strong>Open the welcome guide with a designed cover</strong></span></label>
          {coverOn && <>
            <label className="field"><span className="field__label">Design</span>
              <Select value={record.cover?.variant || 'hero'} onChange={(value) => set(['cover', 'variant'], value)} options={WELCOME_COVER_VARIANTS.map((item) => ({ value: item.id, label: item.label }))} /></label>
            <p className="muted">{WELCOME_COVER_VARIANTS.find((item) => item.id === (record.cover?.variant || 'hero'))?.description}</p>
            <Text label="Label" value={record.cover?.kicker} placeholder={WELCOME_COVER_TEXT.kicker} onChange={(value) => set(['cover', 'kicker'], value)} />
            <Text label="Title" area={2} value={record.cover?.title} placeholder={WELCOME_COVER_TEXT.title} onChange={(value) => set(['cover', 'title'], value)} hint="A line break starts the second line." />
            <Text label="Sentence" area={2} value={record.cover?.subtitle} placeholder={WELCOME_COVER_TEXT.subtitle} onChange={(value) => set(['cover', 'subtitle'], value)} />
            {(record.cover?.variant === 'index') && wording.sections.map((section, i) => (
              <div key={i} className="pack-pair">
                <Text label={`Contents ${i + 1}`} value={record.cover?.sections?.[i]?.title} placeholder={section.title} onChange={(value) => set(['cover', 'sections'], wording.sections.map((item, j) => (j === i ? { ...item, title: value } : (record.cover?.sections?.[j] ?? item))))} />
                <Text label="Its sentence" value={record.cover?.sections?.[i]?.description} placeholder={section.description} onChange={(value) => set(['cover', 'sections'], wording.sections.map((item, j) => (j === i ? { ...item, description: value } : (record.cover?.sections?.[j] ?? item))))} />
              </div>
            ))}
          </>}
        </Section>

        <Section title="Welcome guide sections" meta={`${sections.length} of ${WELCOME_SECTIONS.length}`}>
          <Checks items={WELCOME_SECTIONS} chosen={sections} onChange={(next) => setPack('sections', next)} />
          <p className="muted">Sections left out are not printed; those kept are numbered in order.</p>
        </Section>
        <Section title="Brand reference sections" meta={`${brandSections.length} of ${BRAND_SECTIONS.length}`}>
          <Checks items={BRAND_SECTIONS} chosen={brandSections} onChange={(next) => setPack('brandSections', next)} />
        </Section>
        <Section title="Tables" meta={pack.tableStyle ? TABLE_LABELS[pack.tableStyle] : 'Each brand’s own'}>
          <Select value={pack.tableStyle || ''} onChange={(value) => setPack('tableStyle', value)} options={[{ value: '', label: 'Each brand’s own' }, ...TABLE_STYLES.map((id) => ({ value: id, label: TABLE_LABELS[id] }))]} />
          <p className="muted">Each brand sets its own in its document settings (First Form’s are ruled). A choice here sets every document in this pack alike.</p>
        </Section>

        <h3>The facts</h3>
        <Section title="Client and website" meta={record.site.url || 'To fill in'} open>
          <Text label="Client name" value={record.client.name} onChange={(value) => set(['client', 'name'], value)} />
          <Text label="Client contact" value={record.client.contactName} onChange={(value) => set(['client', 'contactName'], value)} />
          <Text label="Contact email" value={record.client.contactEmail} onChange={(value) => set(['client', 'contactEmail'], value)} />
          <Text label="Website address" value={record.site.url} placeholder="https://" onChange={(value) => set(['site', 'url'], value)} />
          <Text label="Website name" value={record.site.name} onChange={(value) => set(['site', 'name'], value)} />
          <Text label="Launch date" value={record.site.launchDate} placeholder="YYYY-MM-DD" onChange={(value) => set(['site', 'launchDate'], value)} />
          <Text label="Prepared on" value={record.preparedAt} placeholder="YYYY-MM-DD" onChange={(value) => set(['preparedAt'], value)} />
          <Text label="Edition" value={record.version} onChange={(value) => set(['version'], value)} />
        </Section>
        <Section title="Access" meta={ACCESS.find(([id]) => id === record.access.method)?.[1]}>
          <label className="field"><span className="field__label">How they sign in</span><Select value={record.access.method} onChange={(value) => set(['access', 'method'], value)} options={ACCESS.map(([value, label]) => ({ value, label }))} /></label>
          <Text label="Sign-in address" value={record.site.loginUrl} placeholder="https://" onChange={(value) => set(['site', 'loginUrl'], value)} />
          <Text label="Username or account email" value={record.access.accountLabel} onChange={(value) => set(['access', 'accountLabel'], value)} />
          <Text label="Account role" value={record.access.role} onChange={(value) => set(['access', 'role'], value)} />
          <Text label="First-session steps" area={4} value={lines(record.access.setupInstructions)} onChange={(value) => set(['access', 'setupInstructions'], unlines(value))} hint="One step per line." />
          <Text label="If they cannot sign in" area value={record.access.recoveryInstructions} onChange={(value) => set(['access', 'recoveryInstructions'], value)} />
          <Text label="Two-step verification" area value={record.access.mfaInstructions} onChange={(value) => set(['access', 'mfaInstructions'], value)} />
          <p className="muted">Never put a password, invitation link or recovery code here: the record refuses them.</p>
        </Section>
        <Section title="Everyday tasks" meta={`${record.tasks.length}`}>
          {listEditor('tasks', EMPTY_TASK, (task, change) => <>
            <Text label="Task" value={task.title} onChange={(value) => change('title', value)} />
            <Text label="Steps" area={4} value={lines(task.steps)} onChange={(value) => change('steps', unlines(value))} hint="One step per line." />
            <Text label="How they know it worked" value={task.confirmation} onChange={(value) => change('confirmation', value)} />
          </>)}
        </Section>
        <Section title="Services" meta={`${record.services.length}`}>
          {listEditor('services', EMPTY_SERVICE, (service, change) => <>
            {[['name', 'Service'], ['accountOwner', 'Account owner'], ['managedBy', 'Managed by'], ['clientAccess', 'Their access'], ['billedBy', 'Billed by'], ['costText', 'Cost'], ['renewalDate', 'Renews']].map(([field, label]) =>
              <Text key={field} label={label} value={service[field]} onChange={(value) => change(field, value)} />)}
            <Text label="What it covers" area value={service.scope} onChange={(value) => change('scope', value)} />
          </>)}
        </Section>
        <Section title="Support and care" meta={record.provider.supportEmail || 'To fill in'}>
          <Text label="Provider name" value={record.provider.name} placeholder={provider?.brand.name} onChange={(value) => set(['provider', 'name'], value)} />
          <Text label="Support email" value={record.provider.supportEmail} onChange={(value) => set(['provider', 'supportEmail'], value)} />
          <Text label="Support page" value={record.provider.supportUrl} placeholder="https://" onChange={(value) => set(['provider', 'supportUrl'], value)} />
          <Text label="Hours" value={record.provider.hours} onChange={(value) => set(['provider', 'hours'], value)} />
          <Text label="Response target" value={record.provider.responseTarget} onChange={(value) => set(['provider', 'responseTarget'], value)} />
          <Text label="Urgent issues" value={record.provider.urgentRoute} onChange={(value) => set(['provider', 'urgentRoute'], value)} />
          <Text label="What the service includes" area={4} value={lines(record.care.included)} onChange={(value) => set(['care', 'included'], unlines(value))} hint="One item per line." />
          {[['requests', 'Requesting a change'], ['backups', 'Backups'], ['restore', 'Restoring the website'], ['dataExport', 'Exporting or moving the website'], ['rights', 'Their content, assets and data'], ['agreementRef', 'Service agreement']].map(([field, label]) =>
            <Text key={field} label={label} area={field !== 'agreementRef'} value={record.care[field]} onChange={(value) => set(['care', field], value)} />)}
        </Section>
        <Section title="Next steps and notes" meta={`${record.nextSteps.filter(Boolean).length + record.notes.filter(Boolean).length}`}>
          <Text label="Before handover is complete" area={4} value={lines(record.nextSteps)} onChange={(value) => set(['nextSteps'], unlines(value))} hint="One per line." />
          <Text label="Notes for this website" area={3} value={lines(record.notes)} onChange={(value) => set(['notes'], unlines(value))} hint="One per line." />
          <Text label="Checked by" value={record.review.checkedBy} onChange={(value) => set(['review', 'checkedBy'], value)} />
          <Text label="Checked on" value={record.review.checkedOn} placeholder="YYYY-MM-DD" onChange={(value) => set(['review', 'checkedOn'], value)} />
        </Section>
        <p><button type="button" className="link" onClick={() => { setRecord(startRecord(brand)); setNotice({ text: 'Started a new record for this client.' }) }}>Start a new record</button></p>
      </section>

      <section className="panel documents-preview" aria-label="Pack preview" {...dock.panel('preview')}>
        {documents.length > 0 && <div className="pack-tabs"><Segmented label="Document" value={visible} onChange={setShown} options={documents.map((item) => ({ value: item.id, label: item.label }))} />
          <button className="button button--quiet" type="button" disabled={busy || !built.html[visible]} onClick={print}>Print or save PDF</button></div>}
        {problems.length > 0 && <div className="notice notice--error" role="alert"><strong>{issue ? 'To issue this pack, fill in:' : 'Fix these to build the pack:'}</strong><ul>{problems.slice(0, 12).map((problem) => <li key={problem}>{problem.replace(/^handover\./, '')}</li>)}</ul></div>}
        {built.error && <p className="notice notice--error" role="alert">{built.error}</p>}
        {notice && <p className={`notice${notice.error ? ' notice--error' : ''}`} role={notice.error ? 'alert' : 'status'}>{notice.text}</p>}
        {choices && <p className="muted pack-summary">{[`${choices.documents.length} document${choices.documents.length === 1 ? '' : 's'}`, choices.coverVariant ? `${WELCOME_COVER_VARIANTS.find((item) => item.id === choices.coverVariant).label} cover` : 'no cover', `${choices.sections.length} guide sections`, choices.tableStyle ? `${TABLE_LABELS[choices.tableStyle].toLowerCase()} tables` : 'each brand’s tables', paper === 'a4' ? 'A4' : 'US Letter', issue ? 'final' : 'draft'].join(' · ')}{built.busy ? ' · updating…' : ''}</p>}
        {!provider || !client ? <p className="muted">Loading both brands and their fonts…</p> : visible && built.html[visible] && <DocumentFrame frame={frame} title={`${documents.find((item) => item.id === visible)?.label} preview`} html={built.html[visible]} />}
      </section>
      {dock.bar}
    </div>
  </div>
}
