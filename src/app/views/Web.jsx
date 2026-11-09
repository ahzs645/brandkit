// Every brand's Astryx theme export, and its optional web components (brand.web.page): the page
// they compose, at desktop or phone width, and
// each on its own with its markup and styles to copy or download, picked from a list. Every
// preview is drawn at its full width and scaled to fit, so none scrolls sideways. All of them are
// set for the department chosen in Departments, or another named here.

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { hasWebPage, webComponentDocument, webComponents, webPage, webStylesheet } from '../../engine/webpage.js'
import { astryxThemeConfig, astryxThemeModule, astryxThemeReport, astryxReadme } from '../../engine/astryx.js'
import { download } from '../../export/render.js'
import { readAffiliation } from '../affiliation.js'
import { Field, Segmented, Select } from '../ui.jsx'
import { DepartmentSelect } from './Signatures.jsx'

const WIDTHS = { desktop: 1280, phone: 390 }
const PAGE = 'page'

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

// A preview draws its page at `width` px, or the room it has where that is wider, and scales it
// down where there is less: a phone sees a component as a desktop browser lays it out, not as its
// own phone layout (in which some parts, the audience tabs, hide). `exact` keeps the width as
// given, for the page template's phone width. The frame grows to its content, so a component
// shows whole without a scrollbar. Components stay in frames rather than shadow roots because
// their styles answer to the viewport: media queries and vw would read the app's window, not the
// preview's width.
const Frame = ({ title, html, width = WIDTHS.desktop, exact = false, minHeight = 80 }) => {
  const box = useRef(null)
  const [room, setRoom] = useState(0)
  const [height, setHeight] = useState(minHeight)
  useLayoutEffect(() => {
    const element = box.current
    setRoom(element.clientWidth)
    const observer = new ResizeObserver(() => setRoom(element.clientWidth))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const fit = (event) => {
    const view = event.currentTarget.contentWindow
    const body = event.currentTarget.contentDocument?.body
    if (!body) return
    const measure = () => setHeight(Math.max(minHeight, body.scrollHeight))
    measure()
    view.document.fonts?.ready.then(measure)
    // A wider room redraws the page wider, and its height changes with it.
    view.addEventListener('resize', measure)
  }
  const drawn = exact ? width : Math.max(width, room)
  const scale = room ? Math.min(1, room / drawn) : 1
  return <div ref={box} className="web-frame">
    <div className="web-frame__page" style={{ width: Math.min(room || drawn, drawn), height: Math.ceil(height * scale) }}>
      <iframe title={title} srcDoc={html} onLoad={fit} style={{ width: drawn, height, transform: scale < 1 ? `scale(${scale})` : undefined }} />
    </div>
  </div>
}

const Copy = ({ label, text }) => {
  const [done, setDone] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) } catch { setDone(false) } }
  return <button type="button" className="button button--quiet" onClick={copy}>{done ? 'Copied' : label}</button>
}

const AstryxExport = ({ brand }) => {
  const files = useMemo(() => {
    try {
      const ctx = { brand }
      return {
        theme: astryxThemeModule(ctx),
        config: `${JSON.stringify(astryxThemeConfig(ctx), null, 2)}\n`,
        report: `${JSON.stringify(astryxThemeReport(ctx), null, 2)}\n`,
        readme: astryxReadme(ctx)
      }
    } catch (problem) {
      return { error: problem.message }
    }
  }, [brand])
  const [error, setError] = useState('')
  const save = (name, content, type) => {
    setError('')
    try { download(new Blob([content], { type }), name) } catch (problem) { setError(problem.message) }
  }
  return <section className="panel astryx-export" aria-labelledby="astryx-heading">
    <div className="panel__head"><h2 id="astryx-heading">Astryx theme</h2></div>
    <p>Use {brand.name}’s accent and typography in an Astryx application. The theme supports light and dark modes.</p>
    <p className="muted">For the complete handoff, choose <strong>Website</strong> in <strong>Download kit</strong>. It includes the theme and setup guide in <code>web/astryx/</code>, alongside the brand’s fonts, CSS and logo assets.</p>
    {files.error ? <p className="notice notice--error" role="alert">The Astryx theme could not be generated: {files.error}</p> : <>
      <div className="documents-actions">
        <button type="button" className="button" onClick={() => save('theme.js', files.theme, 'text/javascript')}>Download theme</button>
        <button type="button" className="button button--quiet" onClick={() => save('theme.json', files.config, 'application/json')}>Theme JSON</button>
        <button type="button" className="button button--quiet" onClick={() => save('README.md', files.readme, 'text/markdown')}>Setup guide</button>
        <button type="button" className="button button--quiet" onClick={() => save('report.json', files.report, 'application/json')}>Compatibility report</button>
      </div>
      <p className="muted">The theme file needs Astryx in your application. Follow the setup guide to load <code>web/brand.css</code> and its font files, and review the report before using the theme.</p>
      <details className="astryx-export__source">
        <summary>View theme source</summary>
        <Copy label="Copy theme" text={files.theme} />
        <pre tabIndex={0} aria-label="Astryx theme source"><code>{files.theme}</code></pre>
      </details>
    </>}
    {error && <p className="notice notice--error" role="alert">{error}</p>}
  </section>
}

export const Web = (props) => <div className="view">
  <AstryxExport brand={props.brand} />
  {hasWebPage(props.brand) && <BrandWebPage {...props} />}
</div>

const BrandWebPage = ({ brand, fonts, source }) => {
  const field = brand.departments?.field ?? 'department'
  const [department, setDepartment] = useState(() => readAffiliation(brand.id).department)
  const [width, setWidth] = useState('desktop')
  const [selected, setSelected] = useState(PAGE)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const ctx = { brand, fonts }
  const preset = brand.departments?.items?.find((item) => item.values?.[field] === department || item.name === department)
  const fontUrl = (file) => new URL(source.url(file), location.href).href
  const components = useMemo(() => webComponents(ctx, { department }), [brand, fonts, department])
  const page = useMemo(() => webPage(ctx, { department, fontUrl }), [brand, fonts, source, department])
  const component = components.find((entry) => entry.id === selected)
  const save = async (name, make) => {
    setBusy(name); setError('')
    try { download(new Blob([make(await embedFonts(brand, source))], { type: 'text/html' }), name) } catch (problem) { setError(problem.message) } finally { setBusy('') }
  }
  return <div className="view">
    <section className="panel">
      <div className="panel__head"><h2>Website components</h2></div>
      <div className="web-toolbar">
        {brand.departments?.items?.length > 0 && <DepartmentSelect brand={brand} value={preset?.id ?? ''} onChange={(id) => setDepartment(brand.departments.items.find((item) => item.id === id)?.values?.[field] ?? '')} />}
        <Field label="Department as set"><input type="text" value={department.replace(/\n/g, ' ')} onChange={(event) => setDepartment(event.target.value)} placeholder="None: the full logo" /></Field>
        <Copy label="Copy all CSS" text={webStylesheet(ctx, { fontUrl })} />
      </div>
      {error && <p className="notice notice--error" role="alert">{error}</p>}
    </section>
    <div className="studio web-studio">
      <nav className="studio__list" aria-label="Web components">
        <div className="studio__group"><h3>Page</h3><button type="button" className="studio__item web-item" aria-pressed={selected === PAGE} onClick={() => setSelected(PAGE)}>Page template</button></div>
        <div className="studio__group"><h3>Components</h3>{components.map((entry) => <button key={entry.id} type="button" className="studio__item web-item" aria-pressed={selected === entry.id} onClick={() => setSelected(entry.id)}>{entry.label}</button>)}</div>
      </nav>
      {/* The list above; a phone has the same choices as a dropdown. */}
      <section className="studio__stage" aria-labelledby="web-shown">
        <div className="web-picker"><Select aria-label="Web component" value={selected} onChange={setSelected} options={[{ value: PAGE, label: 'Page template', group: 'Page' }, ...components.map((entry) => ({ value: entry.id, label: entry.label, group: 'Components' }))]} /></div>
        {component ? <>
          <div className="web-component__head">
            <h3 id="web-shown">{component.label}</h3>
            <div className="documents-actions">
              <Copy label="Copy HTML" text={component.html} />
              <Copy label="Copy CSS" text={component.css} />
              <button type="button" className="button button--quiet" disabled={Boolean(busy)} onClick={() => save(`${brand.id}-${component.id}.html`, (url) => webComponentDocument(ctx, component.id, { department, fontUrl: url }))}>{busy === `${brand.id}-${component.id}.html` ? '…' : '↓ HTML'}</button>
            </div>
          </div>
          <Frame key={component.id} title={`${component.label} preview`} html={webComponentDocument(ctx, component.id, { department, fontUrl })} />
        </> : <>
          <div className="web-component__head">
            <h3 id="web-shown">Page template</h3>
            <div className="documents-actions">
              <Segmented label="Width" value={width} options={[{ value: 'desktop', label: 'Desktop' }, { value: 'phone', label: 'Phone' }]} onChange={setWidth} />
              <button type="button" className="button" disabled={Boolean(busy)} onClick={() => save(`${brand.id}-web-page.html`, (url) => webPage(ctx, { department, fontUrl: url }))}>{busy === `${brand.id}-web-page.html` ? '…' : '↓ Page HTML'}</button>
            </div>
          </div>
          <Frame key={width} title={`${brand.name} web page preview`} html={page} width={WIDTHS[width]} exact minHeight={600} />
        </>}
      </section>
    </div>
  </div>
}
