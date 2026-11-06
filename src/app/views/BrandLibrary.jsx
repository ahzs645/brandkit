// Brands: what this copy of brandkit can open, and where each comes from. The brands built into
// the app; those kept in this browser from packs (with what they take, and what sharing files
// between them saves); those the catalogs offer; and adding one from a link or a file.

import { useEffect, useState } from 'react'
import { storageUsage } from '../pack-store.js'
import { addCatalog, addedCatalogs, removeCatalog, siteCatalogs } from '../catalog.js'

const size = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)
const host = (url) => { try { return new URL(url).host } catch { return url } }
const day = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return iso } }

const Usage = ({ installed }) => {
  const [usage, setUsage] = useState(null)
  const [estimate, setEstimate] = useState(null)
  const [persisted, setPersisted] = useState(null)
  useEffect(() => {
    let live = true
    storageUsage().then((value) => { if (live) setUsage(value) })
    navigator.storage?.estimate?.().then((value) => { if (live) setEstimate(value) }, () => {})
    navigator.storage?.persisted?.().then((value) => { if (live) setPersisted(value) }, () => {})
    return () => { live = false }
  }, [installed])
  if (!usage?.brands) return null
  const saved = usage.logical - usage.stored
  return (
    <div className="brand-library__usage">
      <p>
        {usage.brands} {usage.brands === 1 ? 'brand takes' : 'brands take'} <strong>{size(usage.stored)}</strong>{estimate?.quota ? ` of about ${size(estimate.quota)}` : ''}
        {saved > 0 ? `; shared files are kept once, which saves ${size(saved)}.` : '.'}
      </p>
      {persisted === false && navigator.storage?.persist && (
        <p><button type="button" className="link" onClick={() => navigator.storage.persist().then(setPersisted)}>Keep these brands if the browser runs short of space</button></p>
      )}
    </div>
  )
}

export const BrandLibrary = ({ current, builtIn, installed, saved, catalog, updateFor, onOpen, onRemove, onUpdate, onAddUrl, onOpenFile, onCatalogsChanged }) => {
  const [link, setLink] = useState('')
  const [catalogLink, setCatalogLink] = useState('')
  const [busy, setBusy] = useState(null)
  const [problem, setProblem] = useState(null)
  const installedIds = new Set(installed.map((record) => record.id))
  const builtInIds = new Set(builtIn.map((entry) => entry.id))
  const madeHere = Object.values(saved).filter((brand) => !installedIds.has(brand.id) && !builtInIds.has(brand.id))
  const offered = [...catalog.brands.values()].filter((entry) => !installedIds.has(entry.id) && !builtInIds.has(entry.id))
  const site = siteCatalogs()
  const added = addedCatalogs()

  const run = async (key, action) => {
    setBusy(key)
    setProblem(null)
    try { await action() } catch (error) { setProblem(error.message) } finally { setBusy(null) }
  }

  return (
    <div className="view brand-library">
      <header className="panel">
        <h2>Brands</h2>
        <p className="muted">Each brand is one zip, kept in this browser and ready offline until you remove it.</p>
      </header>
      {problem && <p className="notice notice--error" role="alert">{problem}</p>}

      <section className="panel">
        <h2>In this browser</h2>
        <Usage installed={installed} />
        {installed.length || madeHere.length ? (
          <ul className="brand-library__list">
            {installed.map((record) => {
              const update = updateFor(record)
              return (
                <li key={record.id} className="brand-library__row">
                  <div>
                    <strong>{record.name}</strong>{record.id === current && <span className="badge">open</span>}{saved[record.id] && <span className="badge" title="Edits saved in this browser are shown in place of the pack's definition">edited</span>}
                    <span className="muted brand-library__meta">
                      {record.brandVersion ? `v${record.brandVersion} · ` : ''}{size(record.packBytes ?? record.bytes)} · {record.url ? `from ${host(record.url)}` : 'from a file'} · {day(record.updatedAt)}
                    </span>
                  </div>
                  <div className="brand-library__actions">
                    {update && <button type="button" className="button" disabled={busy !== null} onClick={() => run(`update-${record.id}`, () => onUpdate(update))}>{busy === `update-${record.id}` ? 'Updating…' : `Update${update.bytes ? ` (${size(update.bytes)})` : ''}`}</button>}
                    {record.id !== current && <button type="button" className="button button--quiet" onClick={() => onOpen(record.id)}>Open</button>}
                    <button type="button" className="button button--quiet" disabled={busy !== null} onClick={() => { if (globalThis.confirm?.(`Remove ${record.name} from this browser?${saved[record.id] ? ' Your saved edits go too.' : ''}`) !== false) run(`remove-${record.id}`, () => onRemove(record.id)) }}>Remove</button>
                  </div>
                </li>
              )
            })}
            {madeHere.map((brand) => (
              <li key={brand.id} className="brand-library__row">
                <div>
                  <strong>{brand.name}</strong>{brand.id === current && <span className="badge">open</span>}
                  <span className="muted brand-library__meta">made or edited here · its definition only, with brandkit’s own fonts</span>
                </div>
                <div className="brand-library__actions">
                  {brand.id !== current && <button type="button" className="button button--quiet" onClick={() => onOpen(brand.id)}>Open</button>}
                  <button type="button" className="button button--quiet" onClick={() => { if (globalThis.confirm?.(`Remove ${brand.name} from this browser?`) !== false) run(`remove-${brand.id}`, () => onRemove(brand.id)) }}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="muted">Nothing yet.</p>}
      </section>

      <section className="panel">
        <h2>Available to add</h2>
        {catalog.loading ? <p className="muted">Reading the catalogs…</p> : offered.length ? (
          <ul className="brand-library__list">
            {offered.map((entry) => (
              <li key={entry.id} className="brand-library__row">
                <div>
                  <strong>{entry.name}</strong>
                  <span className="muted brand-library__meta">{entry.brandVersion ? `v${entry.brandVersion} · ` : ''}{entry.bytes ? `${size(entry.bytes)} · ` : ''}{entry.catalogName ?? host(entry.catalog)}</span>
                  {entry.description && <span className="brand-library__about">{entry.description}</span>}
                </div>
                <div className="brand-library__actions">
                  <button type="button" className="button" disabled={busy !== null} onClick={() => run(`add-${entry.id}`, () => onOpen(entry.id))}>{busy === `add-${entry.id}` ? 'Adding…' : 'Add and open'}</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="muted">{catalog.catalogs.length ? 'Every brand the catalogs offer is already here.' : 'No catalog is set up for this site. Add one below to see the brands it offers.'}</p>}
      </section>

      <section className="panel">
        <h2>Add a brand</h2>
        <div className="brand-library__dropzone">
          <p><strong>Drag a brand onto this page</strong>, or <button type="button" className="link" onClick={onOpenFile}>choose a file</button>.</p>
          <p className="muted">A brand pack, a zipped folder or kit, or a brand.json for this visit.</p>
        </div>
        <form className="brand-library__form" onSubmit={(event) => { event.preventDefault(); if (link.trim()) run('link', async () => { await onAddUrl(link.trim()); setLink('') }) }}>
          <input type="url" required placeholder="https://…/brand.zip" value={link} onChange={(event) => setLink(event.target.value)} aria-label="A brand pack’s address" />
          <button type="submit" className="button" disabled={busy !== null}>{busy === 'link' ? 'Adding…' : 'Add from link'}</button>
        </form>
      </section>

      <section className="panel">
        <h2>Catalogs</h2>
        <ul className="brand-library__list">
          {catalog.catalogs.map((entry) => (
            <li key={entry.url} className="brand-library__row">
              <div>
                <strong>{entry.name ?? host(entry.url)}</strong>
                <span className="muted brand-library__meta">
                  {entry.packs.length} {entry.packs.length === 1 ? 'brand' : 'brands'} · {site.includes(entry.url) ? 'this site’s' : 'added here'}
                  {entry.error ? ` · ${entry.stale && entry.packs.length ? 'offline, last copy shown' : `unavailable (${entry.error})`}` : ''}
                </span>
              </div>
              {added.includes(entry.url) && <div className="brand-library__actions">
                <button type="button" className="button button--quiet" onClick={() => { removeCatalog(entry.url); onCatalogsChanged() }}>Remove</button>
              </div>}
            </li>
          ))}
        </ul>
        <form className="brand-library__form" onSubmit={(event) => { event.preventDefault(); if (catalogLink.trim()) { addCatalog(catalogLink.trim()); setCatalogLink(''); onCatalogsChanged() } }}>
          <input type="url" required placeholder="https://…/catalog.json" value={catalogLink} onChange={(event) => setCatalogLink(event.target.value)} aria-label="A catalog’s address" />
          <button type="submit" className="button button--quiet">Add catalog</button>
        </form>
      </section>

      <section className="panel">
        <h2>Built in</h2>
        <ul className="brand-library__list">
          {builtIn.map((entry) => (
            <li key={entry.id} className="brand-library__row">
              <div><strong>{entry.name}</strong>{entry.id === current && <span className="badge">open</span>}<span className="muted brand-library__meta">ships with brandkit</span></div>
              {entry.id !== current && <div className="brand-library__actions"><button type="button" className="button button--quiet" onClick={() => onOpen(entry.id)}>Open</button></div>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
