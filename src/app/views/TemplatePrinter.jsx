// The Template Printer, rendered here as a component (vendor/template-printer, the same one its
// own website renders), not framed: a brand template opens in it as a package, and a package
// the printer saves can be added back to the brand.
import { useEffect, useState } from 'react'
import { TemplatePrinter as Printer } from '../../../vendor/template-printer/frontend/src/embed'
import '../../../vendor/template-printer/frontend/src/embed/template-printer.css'
import { PRINTER_WEBSITE, printerWebsiteUrl } from '../../printer/bridge.js'
import { Select } from '../ui.jsx'

export const TemplatePrinter = ({ brand, source, request, ready, onPrint, onImport }) => {
  // The package open in the printer: one sent from Templates, a brand preset, or none (its library).
  const [open, setOpen] = useState(request ?? null)
  const [selected, setSelected] = useState(brand.templates[0]?.id ?? '')
  const [saved, setSaved] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const template = brand.templates.find((entry) => entry.id === selected)
  useEffect(() => { if (request) setOpen(request) }, [request])
  useEffect(() => { if (!brand.templates.some((entry) => entry.id === selected)) setSelected(brand.templates[0]?.id ?? '') }, [brand.templates, selected])
  const run = async (task) => { setBusy(true); setError(null); try { await task() } catch (problem) { setError(problem.message) } finally { setBusy(false) } }
  let website
  try { website = printerWebsiteUrl(null, { website: brand.printer?.website }) } catch { website = PRINTER_WEBSITE }
  return (
    <div className="view printer">
      <section className="panel printer__head">
        <div>
          <h2>Template Printer</h2>
          <p className="muted">Design and fill cards, manage people, print both sides and calibrate your printer. Templates, people and settings stay in this browser.</p>
        </div>
        <div className="printer__controls">
          <label className="field printer__template"><span className="field__label">Brand template</span>
            <Select value={selected} onChange={setSelected} options={brand.templates.map((entry) => ({ value: entry.id, label: entry.label ?? entry.id }))} />
          </label>
          <button type="button" className="button" disabled={busy || !template || !ready} onClick={() => run(() => onPrint(template))}>Open in the printer</button>
          {(brand.printer?.packages ?? []).map((preset) => <button key={preset.id} type="button" className="button button--quiet" disabled={busy} onClick={() => run(async () => {
            setOpen({ bytes: new Uint8Array(await source.read(preset.file)), id: crypto.randomUUID() })
          })}>Open {preset.name.toLowerCase()}</button>)}
          <a className="button button--quiet" href={website} target="_blank" rel="noopener noreferrer">Printer website ↗</a>
        </div>
        {saved && (
          <p className="notice printer__saved" role="status">
            The printer saved <strong>{saved.filename}</strong>.
            <button type="button" className="button" disabled={busy} onClick={() => run(async () => { await onImport(saved.bytes); setSaved(null) })}>Add it to {brand.name}’s templates</button>
            <button type="button" className="link" onClick={() => setSaved(null)}>Dismiss</button>
          </p>
        )}
        {error && <p className="notice notice--error" role="alert">{error}</p>}
      </section>
      <div className="printer__stage">
        <Printer initialPackage={open?.bytes} packageLabel="brandkit" shareUrl={website}
          onExportPackage={(bytes, filename) => setSaved({ bytes, filename })} />
      </div>
    </div>
  )
}
