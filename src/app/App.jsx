// brandkit's app: pick or open a brand, look through it, fill in its templates, read its guide,
// and download the whole kit. Everything is made in the browser from the brand's definition.

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadBrandFonts } from '../fonts/provider.js'
import { STARTER_FONTS } from '../engine/starter.js'
import { validateBrand } from '../engine/brand.js'
import { revisionsOf, withRevision } from '../engine/revisions.js'
import { TemplateStudio } from '../studio/TemplateStudio.jsx'
import { BUILT_IN, builtInName, forgetBrand, librarySource, loadBuiltIn, openBrandFile, saveBrand, savedBrands } from './brands.js'
import { Overview } from './views/Overview.jsx'
import { Logos } from './views/Logos.jsx'
import { Kit } from './views/Kit.jsx'
import { BrandEditor } from './views/BrandEditor.jsx'
import { NewBrand } from './views/NewBrand.jsx'

// The guide pulls in the manual viewer; the manual library pulls in 156 pages' worth of data.
const Guide = lazy(() => import('./views/Guide.jsx').then((module) => ({ default: module.Guide })))
const Manuals = lazy(() => import('./views/Manuals.jsx').then((module) => ({ default: module.Manuals })))

const VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'logos', label: 'Logos' },
  { id: 'templates', label: 'Templates' },
  { id: 'guide', label: 'Guide' },
  { id: 'kit', label: 'Download kit' },
  { id: 'brand', label: 'Edit brand' }
]
const OTHER_VIEWS = [{ id: 'new', label: 'New brand' }, { id: 'manuals', label: 'Manual library' }]
const ALL_VIEWS = [...VIEWS, ...OTHER_VIEWS].map((view) => view.id)

const params = () => new URLSearchParams(globalThis.location?.search ?? '')

const writeUrl = (changes, { keep = [] } = {}) => {
  const url = new URL(globalThis.location.href)
  for (const key of [...url.searchParams.keys()]) if (!['brand', 'view', 'revision', ...keep].includes(key)) url.searchParams.delete(key)
  for (const [key, value] of Object.entries(changes)) {
    if (value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
  }
  globalThis.history.replaceState(null, '', url)
}

/** @font-face rules for a brand's web fonts, so specimens and live text use the real faces. */
const useWebFonts = (brand, source) => {
  useEffect(() => {
    if (!brand || !source) return undefined
    const seen = new Set()
    const rules = Object.values(brand.fonts ?? {}).map((face) => {
      const file = face.web ?? face.file
      const url = file && source.url(file)
      if (!url || seen.has(`${face.family}-${face.weight}-${face.style}`)) return ''
      seen.add(`${face.family}-${face.weight}-${face.style}`)
      return `@font-face{font-family:"${face.family}";src:url("${url}");font-weight:${face.weight ?? 400};font-style:${face.style ?? 'normal'};font-display:swap}`
    }).join('\n')
    const style = document.createElement('style')
    style.dataset.brandFonts = brand.id
    style.textContent = rules
    document.head.appendChild(style)
    return () => style.remove()
  }, [brand?.id, brand?.fonts, source])
}

export const App = () => {
  const [view, setView] = useState(() => (ALL_VIEWS.includes(params().get('view')) ? params().get('view') : 'overview'))
  // A proposed revision, shown everywhere in place of the approved identity while it is chosen.
  const [revisionId, setRevisionId] = useState(() => params().get('revision'))
  const [opened, setOpened] = useState({})
  const [saved, setSaved] = useState(savedBrands)
  const [current, setCurrent] = useState(null)
  const [fonts, setFonts] = useState(null)
  const [libraryFonts, setLibraryFonts] = useState(null)
  const [error, setError] = useState(null)
  const fileInput = useRef(null)

  const brandIds = [...new Set([...BUILT_IN, ...Object.keys(saved), ...Object.keys(opened)])]

  const select = useCallback(async (id, { keepView = false } = {}) => {
    setError(null)
    if (!keepView) setRevisionId(null)
    try {
      let next
      if (opened[id]) next = { ...opened[id], brand: structuredClone(opened[id].brand) }
      else if (saved[id]) next = { brand: structuredClone(saved[id]), source: librarySource() }
      else next = await loadBuiltIn(BUILT_IN.includes(id) ? id : BUILT_IN[0])
      setCurrent({ ...next, original: structuredClone(next.brand) })
      // On arrival the address may point into a guide or manual; a later switch of brand starts fresh.
      writeUrl({ brand: next.brand.id }, { keep: keepView ? ['book', 'page', 'guide'] : [] })
      try { localStorage.setItem('brandkit:last', next.brand.id) } catch { /* fine */ }
    } catch (problem) {
      setError(problem.message)
    }
  }, [opened, saved])

  useEffect(() => {
    const wanted = params().get('brand') ?? (() => { try { return localStorage.getItem('brandkit:last') } catch { return null } })()
    select(wanted && (BUILT_IN.includes(wanted) || savedBrands()[wanted]) ? wanted : BUILT_IN[0], { keepView: true })
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const base = current?.brand
  const revisions = revisionsOf(base)
  const activeRevision = revisions.some((entry) => entry.id === revisionId) ? revisionId : null
  const brand = useMemo(() => (base && activeRevision ? withRevision(base, activeRevision) : base), [base, activeRevision])
  const chooseRevision = (id) => {
    setRevisionId(id || null)
    writeUrl({ revision: id || null }, { keep: ['view'] })
  }
  const source = current?.source
  const fontKey = brand ? JSON.stringify(brand.fonts) : ''
  useEffect(() => {
    if (!brand || !source) return undefined
    let live = true
    setFonts(null)
    loadBrandFonts(brand, source.read).then((provider) => { if (live) setFonts(provider) })
    return () => { live = false }
    // Reload only when the faces change, not on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand?.id, fontKey, source])
  useEffect(() => {
    if (view !== 'new' || libraryFonts) return
    loadBrandFonts({ fonts: STARTER_FONTS }, librarySource().read).then(setLibraryFonts)
  }, [view, libraryFonts])
  useWebFonts(brand, source)

  const go = (next) => {
    setView(next)
    writeUrl({ view: next === 'overview' ? null : next })
    globalThis.scrollTo?.({ top: 0 })
  }

  const open = async (file) => {
    setError(null)
    try {
      const result = await openBrandFile(file)
      const problems = validateBrand(result.brand)
      if (problems.length) throw new Error(`That brand.json has problems: ${problems.join(' ')}`)
      setOpened((all) => ({ ...all, [result.brand.id]: result }))
      setCurrent({ ...result, original: structuredClone(result.brand) })
      writeUrl({ brand: result.brand.id })
      go('overview')
    } catch (problem) {
      setError(problem.message)
    }
  }

  const update = (next) => setCurrent((state) => ({ ...state, brand: next }))
  const save = () => {
    saveBrand(base)
    setSaved(savedBrands())
    setCurrent((state) => ({ ...state, original: structuredClone(state.brand) }))
  }
  const create = (made) => {
    saveBrand(made)
    setSaved(savedBrands())
    setCurrent({ brand: made, source: librarySource(), original: structuredClone(made) })
    writeUrl({ brand: made.id })
    go('overview')
  }
  const changed = useMemo(() => base && current?.original && JSON.stringify(base) !== JSON.stringify(current.original), [base, current?.original])

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead__row">
          <a className="wordmark" href={import.meta.env.BASE_URL} aria-label="brandkit home">
            <svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" /><g fill="var(--page)"><circle cx="22" cy="22" r="8" /><circle cx="42" cy="22" r="8" /><circle cx="22" cy="42" r="8" /><rect x="34" y="34" width="16" height="16" rx="3" /></g></svg>
            brandkit
          </a>
          <label className="brand-picker">
            <span className="visually-hidden">Brand</span>
            <select value={brand?.id ?? ''} onChange={(event) => select(event.target.value)}>
              {brandIds.map((id) => <option key={id} value={id}>{BUILT_IN.includes(id) ? builtInName(id) : saved[id]?.name ?? opened[id]?.brand?.name ?? id}{saved[id] && !BUILT_IN.includes(id) ? ' (saved)' : opened[id] ? ' (opened)' : ''}</option>)}
            </select>
          </label>
          {revisions.length > 0 && (
            <label className="brand-picker">
              <span className="visually-hidden">Revision</span>
              <select value={activeRevision ?? ''} onChange={(event) => chooseRevision(event.target.value)}>
                <option value="">Approved v{base.displayVersion ?? base.version}</option>
                {revisions.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} · {entry.status ?? 'proposed'} v{entry.displayVersion ?? entry.version}</option>)}
              </select>
            </label>
          )}
          {activeRevision && <span className="badge badge--revision" title="Every view is showing this revision instead of the approved identity">{brand.revision.status} revision</span>}
          {changed && <span className="badge" title="Edited since it was loaded">edited</span>}
          <div className="masthead__actions">
            <button type="button" className="button button--quiet" onClick={() => fileInput.current?.click()}>Open…</button>
            <input ref={fileInput} type="file" accept=".json,.zip,application/json,application/zip" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) open(file) }} />
            {OTHER_VIEWS.map((entry) => <button key={entry.id} type="button" className="button button--quiet" aria-pressed={view === entry.id} onClick={() => go(entry.id)}>{entry.label}</button>)}
            <a className="button button--quiet" href="https://github.com/ahzs645/brandkit">GitHub</a>
          </div>
        </div>
        <nav className="tabs" aria-label="Sections">
          {VIEWS.map((entry) => <button key={entry.id} type="button" aria-current={view === entry.id ? 'page' : undefined} onClick={() => go(entry.id)}>{entry.label}</button>)}
        </nav>
      </header>

      {error && <p className="notice notice--error" role="alert">{error}</p>}

      <main className="main">
        {!brand ? <p className="muted">Loading…</p> : (
          <Suspense fallback={<p className="muted">Loading…</p>}>
            {view === 'overview' && <Overview brand={brand} base={base} fonts={fonts} go={go} revision={activeRevision} onRevision={chooseRevision} />}
            {view === 'logos' && <Logos brand={brand} fonts={fonts} />}
            {view === 'templates' && <div className="view"><TemplateStudio key={brand.id} brand={brand} fonts={fonts} /></div>}
            {view === 'guide' && <Guide brand={brand} fonts={fonts} />}
            {view === 'kit' && <Kit brand={brand} fonts={fonts} source={source} />}
            {view === 'brand' && <BrandEditor brand={base} onChange={update} onSave={save} saved={Boolean(saved[brand.id]) && !changed}
              canReset={changed} onReset={() => setCurrent((state) => ({ ...state, brand: structuredClone(state.original) }))} />}
            {view === 'new' && <NewBrand fonts={libraryFonts} existing={brandIds} onCreate={create} />}
            {view === 'manuals' && <Manuals />}
          </Suspense>
        )}
        {view === 'brand' && saved[brand?.id] && !BUILT_IN.includes(brand?.id) && (
          <p className="muted footnote"><button type="button" className="link" onClick={() => { forgetBrand(brand.id); setSaved(savedBrands()); select(BUILT_IN[0]) }}>Remove {brand.id} from this browser</button></p>
        )}
      </main>
      <footer className="footer muted">
        brandkit makes every file in your browser; nothing is uploaded. The ddcnorth kit is reproduced byte for byte from its brand.json.
      </footer>
    </div>
  )
}
