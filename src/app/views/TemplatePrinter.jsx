import { useEffect, useRef, useState } from 'react'
import { connectPrinter, createPrinterSession, printerUrl } from '../template-printer.js'
import { PrinterWebsite } from '../../studio/PrinterWebsite.jsx'

export const TemplatePrinter = ({ brand, source, request, ready, onPrint, onPackage, onImport }) => {
  const base = new URL(import.meta.env.BASE_URL, globalThis.location.origin).href
  const [session, setSession] = useState(() => request ?? { url: printerUrl(base), token: 'library' })
  const [selected, setSelected] = useState(brand.templates[0]?.id ?? '')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const frame = useRef(null)
  const popups = useRef([])
  const input = useRef(null)
  const template = brand.templates.find((entry) => entry.id === selected)
  useEffect(() => { if (request) setSession(request) }, [request])
  useEffect(() => { if (!brand.templates.some((template) => template.id === selected)) setSelected(brand.templates[0]?.id ?? '') }, [brand.templates, selected])
  useEffect(() => session.bytes ? connectPrinter({ session, targets: () => [frame.current?.contentWindow, ...popups.current] }) : undefined, [session])
  const open = (packagePath) => setSession({ url: printerUrl(base, packagePath), token: crypto.randomUUID() })
  const run = async (task) => { setBusy(true); setError(null); try { await task() } catch (problem) { setError(problem.message) } finally { setBusy(false) } }
  return (
    <div className="view printer">
      <section className="panel printer__intro">
        <div>
          <h1>Template Printer</h1>
          <p className="muted">Design and fill cards, manage people, print both sides, and calibrate your printer. Your templates, fonts and records stay in this browser.</p>
        </div>
        <div className="downloads">
          {(brand.printer?.packages ?? []).map((preset) => <button key={preset.id} type="button" className="button" disabled={busy} onClick={() => run(async () => {
            const bytes = await source.read(preset.file)
            setSession(createPrinterSession(base, bytes, { label: 'brandkit' }))
          })}>Open {preset.name.toLowerCase()}</button>)}
          <button type="button" className="button button--quiet" onClick={() => open()}>Open library</button>
          <button type="button" className="button button--quiet" disabled={busy} onClick={() => input.current?.click()}>Import package into {brand.name}</button>
          <a className="button button--quiet" href={session.url} target="_blank" rel={session.bytes ? undefined : 'noopener'} onClick={(event) => {
            if (!session.bytes) return
            event.preventDefault()
            const popup = window.open(session.url, '_blank')
            if (popup) popups.current.push(popup)
          }}>Open in new tab ↗</a>
          <input ref={input} type="file" accept=".zip,application/zip" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) run(() => onImport(file)) }} />
        </div>
      </section>
      <div className="panel printer__intro">
        <label className="field"><span className="field__label">Brand template</span><select aria-label="Brand template" value={selected} onChange={(event) => setSelected(event.target.value)}>{brand.templates.map((template) => <option key={template.id} value={template.id}>{template.label ?? template.id}</option>)}</select></label>
        <button type="button" className="button" disabled={busy || !selected || !ready} onClick={() => run(() => onPrint(template))}>Edit &amp; print selected</button>
        <p className="muted printer__hint">Fields, fonts, both sides and variants travel together. Use the printer’s Share → Download package to bring an edited design back into this brand.</p>
        <PrinterWebsite key={selected} website={brand.printer?.website}
          sourceUrl={brand.printer?.packages?.find((entry) => entry.id === template?.printer?.packageId)?.sourceUrl}
          disabled={busy || !template || !ready} onDownload={() => run(() => onPackage(template))} />
      </div>
      {error && <p className="notice notice--error" role="alert">{error}</p>}
      <iframe ref={frame} key={session.token} className="printer__frame" title="Template Printer" src={session.url} allow="camera; fullscreen" />
    </div>
  )
}
