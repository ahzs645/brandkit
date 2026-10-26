// A brand's web components (brand.web.page): each previewed on its own, with its markup and
// styles to copy or download, then the page they compose, at desktop or phone width. All of
// them are set for the department chosen in Departments, or another named here.

import { useMemo, useState } from 'react'
import { webComponentDocument, webComponents, webPage, webStylesheet } from '../../engine/webpage.js'
import { download } from '../../export/render.js'
import { readAffiliation } from '../affiliation.js'
import { Field, Segmented } from '../ui.jsx'
import { DepartmentSelect } from './Signatures.jsx'

const WIDTHS = { desktop: 1280, phone: 390 }

// A downloaded file carries its fonts, so it renders the same wherever it is opened.
const embedFonts = async (brand, source) => {
  const urls = {}
  for (const key of Object.values(brand.web.page.fonts ?? {})) {
    const file = brand.fonts?.[key]?.web
    if (!file || urls[file]) continue
    const bytes = new Uint8Array(await (await fetch(source.url(file))).arrayBuffer())
    let binary = ''
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
    urls[file] = `data:font/${file.split('.').at(-1)};base64,${btoa(binary)}`
  }
  return (file) => urls[file] ?? ''
}

// A preview frame grows to its content, so a component shows whole without a scrollbar.
const Frame = ({ title, html, width, minHeight = 80 }) => {
  const [height, setHeight] = useState(minHeight)
  const fit = (event) => {
    const body = event.currentTarget.contentDocument?.body
    if (!body) return
    const measure = () => setHeight(Math.max(minHeight, body.scrollHeight))
    measure()
    event.currentTarget.contentDocument.fonts?.ready.then(measure)
  }
  return <iframe title={title} srcDoc={html} onLoad={fit} style={{ width: width ?? '100%', height }} />
}

const Copy = ({ label, text }) => {
  const [done, setDone] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) } catch { setDone(false) } }
  return <button type="button" className="button button--quiet" onClick={copy}>{done ? 'Copied' : label}</button>
}

export const Web = ({ brand, fonts, source }) => {
  const field = brand.departments?.field ?? 'department'
  const [department, setDepartment] = useState(() => readAffiliation(brand.id).department)
  const [width, setWidth] = useState('desktop')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const ctx = { brand, fonts }
  const preset = brand.departments?.items?.find((item) => item.values?.[field] === department || item.name === department)
  const fontUrl = (file) => new URL(source.url(file), location.href).href
  const components = useMemo(() => webComponents(ctx, { department }), [brand, fonts, department])
  const page = useMemo(() => webPage(ctx, { department, fontUrl }), [brand, fonts, source, department])
  const save = async (name, make) => {
    setBusy(name); setError('')
    try { download(new Blob([make(await embedFonts(brand, source))], { type: 'text/html' }), name) } catch (problem) { setError(problem.message) } finally { setBusy('') }
  }
  return <div className="view">
    <section className="panel">
      <h2>Web components</h2>
      <p className="muted">{brand.web.page.summary ?? `${brand.name}’s page parts, each with its own markup and styles over shared tokens. Take one, or the whole page; downloads carry their fonts.`}</p>
      <div className="toolbar">
        {brand.departments?.items?.length > 0 && <DepartmentSelect brand={brand} value={preset?.id ?? ''} onChange={(id) => setDepartment(brand.departments.items.find((item) => item.id === id)?.values?.[field] ?? '')} />}
        <Field label="Department as set"><input type="text" value={department.replace(/\n/g, ' ')} onChange={(event) => setDepartment(event.target.value)} placeholder="None: the full logo" /></Field>
        <Copy label="Copy all CSS" text={webStylesheet(ctx, { fontUrl })} />
      </div>
      {error && <p className="notice notice--error" role="alert">{error}</p>}
    </section>
    {components.map((component) => <section key={component.id} className="panel web-component" aria-labelledby={`web-${component.id}`}>
      <div className="web-component__head">
        <div><h3 id={`web-${component.id}`}>{component.label}</h3><p className="muted">{component.use}</p></div>
        <div className="documents-actions">
          <Copy label="Copy HTML" text={component.html} />
          <Copy label="Copy CSS" text={component.css} />
          <button type="button" className="button button--quiet" disabled={Boolean(busy)} onClick={() => save(`${brand.id}-${component.id}.html`, (url) => webComponentDocument(ctx, component.id, { department, fontUrl: url }))}>{busy === `${brand.id}-${component.id}.html` ? '…' : '↓ HTML'}</button>
        </div>
      </div>
      <Frame title={`${component.label} preview`} html={webComponentDocument(ctx, component.id, { department, fontUrl })} />
    </section>)}
    <section className="panel web-preview" aria-labelledby="web-page">
      <div className="web-component__head">
        <div><h3 id="web-page">Page template</h3><p className="muted">The components composed as a department’s page.</p></div>
        <div className="documents-actions">
          <Segmented label="Width" value={width} options={[{ value: 'desktop', label: 'Desktop' }, { value: 'phone', label: 'Phone' }]} onChange={setWidth} />
          <button type="button" className="button" disabled={Boolean(busy)} onClick={() => save(`${brand.id}-web-page.html`, (url) => webPage(ctx, { department, fontUrl: url }))}>{busy === `${brand.id}-web-page.html` ? '…' : '↓ Page HTML'}</button>
        </div>
      </div>
      <div className="web-preview__scroll"><Frame key={width} title={`${brand.name} web page preview`} html={page} width={WIDTHS[width]} minHeight={600} /></div>
    </section>
  </div>
}
