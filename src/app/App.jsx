// brandkit's app: pick or open a brand, look through it, fill in its templates, read its guide,
// and download the whole kit. Everything is made in the browser from the brand's definition.

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadBrandFonts } from '../fonts/provider.js'
import { STARTER_FONTS } from '../engine/starter.js'
import { validateBrand } from '../engine/brand.js'
import { approvedOnly, revisionsOf, withRevision } from '../engine/revisions.js'
import { TemplateStudio } from '../studio/TemplateStudio.jsx'
import { BUILT_IN, builtInName, menuLogoUrl, forgetBrand, librarySource, loadBuiltIn, openBrandFile, saveBrand, savedBrands } from './brands.js'
import { Overview } from './views/Overview.jsx'
import { Logos } from './views/Logos.jsx'
import { Kit } from './views/Kit.jsx'
import { Motion } from './views/Motion.jsx'
import { Colour } from './views/Colour.jsx'
import { motionUrl, viewOrOverview } from './motion.js'
import { BrandEditor } from './views/BrandEditor.jsx'
import { NewBrand } from './views/NewBrand.jsx'
import { ManualSources } from './views/Sources.jsx'
import { BrandLogo, MenuLogo } from './ui.jsx'
import { BrandMenu, MoreMenu } from './BrandMenu.jsx'
import { isSharedView, Shared, SHARED_VIEWS, ShareDialog, SharedMark } from './share.jsx'

// The guide pulls in the manual viewer; the manual library pulls in 156 pages' worth of data.
const Guide = lazy(() => import('./views/Guide.jsx').then((module) => ({ default: module.Guide })))
const Manuals = lazy(() => import('./views/Manuals.jsx').then((module) => ({ default: module.Manuals })))

const VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'logos', label: 'Logos' },
  { id: 'colour', label: 'Colour' },
  { id: 'templates', label: 'Templates' },
  { id: 'guide', label: 'Guide' },
  { id: 'motion', label: 'Motion' },
  { id: 'kit', label: 'Download kit' },
  { id: 'brand', label: 'Edit brand' }
]
const OTHER_VIEWS = [{ id: 'new', label: 'New brand' }, { id: 'manuals', label: 'Manual library' }]
const ALL_VIEWS = [...VIEWS, ...OTHER_VIEWS].map((view) => view.id)

// A shared link (see ./share.jsx) is read once, on arrival, and kept in the address from then on.
const SHARED = isSharedView()
const TABS = SHARED ? VIEWS.filter((view) => SHARED_VIEWS.includes(view.id)) : VIEWS
const OPEN_VIEWS = SHARED ? SHARED_VIEWS : ALL_VIEWS

const params = () => new URLSearchParams(globalThis.location?.search ?? '')

const writeUrl = (changes, { keep = [] } = {}) => {
  const url = new URL(globalThis.location.href)
  for (const key of [...url.searchParams.keys()]) if (!['brand', 'view', 'revision', 'share', ...keep].includes(key)) url.searchParams.delete(key)
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
  const [view, setView] = useState(() => (OPEN_VIEWS.includes(params().get('view')) ? params().get('view') : 'overview'))
  // A proposed revision, shown everywhere in place of the approved identity while it is chosen.
  const [revisionId, setRevisionId] = useState(() => (SHARED ? null : params().get('revision')))
  const [opened, setOpened] = useState({})
  const [saved, setSaved] = useState(savedBrands)
  const [current, setCurrent] = useState(null)
  const [fonts, setFonts] = useState(null)
  const [libraryFonts, setLibraryFonts] = useState(null)
  const [error, setError] = useState(null)
  const [sharing, setSharing] = useState(false)
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
      // A shared link drops anything it does not offer (a revision, a view of the workshop).
      writeUrl({ brand: next.brand.id, ...(SHARED && { revision: null, view: view === 'overview' ? null : view }) }, { keep: keepView ? ['book', 'page', 'guide', 'template', 'signature', 'study'] : [] })
      if (!SHARED) try { localStorage.setItem('brandkit:last', next.brand.id) } catch { /* fine */ }
    } catch (problem) {
      setError(problem.message)
    }
    // `view` only matters on arrival, for a shared link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, saved])

  useEffect(() => {
    const wanted = params().get('brand') ?? (() => { try { return localStorage.getItem('brandkit:last') } catch { return null } })()
    // A shared link names a brand built into the site; one kept in somebody's browser is not there.
    if (SHARED && !BUILT_IN.includes(wanted)) { setError(`This link is for a brand that isn’t on this site${wanted ? ` (${wanted})` : ''}. Ask whoever sent it for a new one.`); return }
    select(wanted && (BUILT_IN.includes(wanted) || savedBrands()[wanted]) ? wanted : BUILT_IN[0], { keepView: true })
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A shared view only ever has the approved identity, so nothing downstream can offer a revision.
  const base = useMemo(() => (SHARED ? approvedOnly(current?.brand) : current?.brand), [current?.brand])
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
  // Motion only exists for a brand (or a chosen revision) with a motion library: arriving on it, or
  // switching brand or revision while on it, without one goes to the overview.
  const motionLink = brand ? motionUrl(brand, source) : undefined
  useEffect(() => {
    if (brand && viewOrOverview(view, motionLink) !== view) go('overview')
  }, [brand, motionLink, view])

  // Between a brand and its manuals: a template's source page, and back from a page to a template.
  const openManual = (book, page) => {
    writeUrl({ view: 'manuals', guide: book, page })
    setView('manuals')
    globalThis.scrollTo?.({ top: 0 })
  }
  const openBuilt = (brandId, kind, id) => {
    const place = kind === 'template' ? { view: 'templates', template: id } : kind === 'signature' ? { view: 'logos', signature: id } : { view: 'guide', book: 'guide', page: id }
    writeUrl({ brand: brandId, ...place })
    setView(place.view)
    globalThis.scrollTo?.({ top: 0 })
    if (brandId !== base?.id) select(brandId, { keepView: true })
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
    <Shared.Provider value={SHARED}>
    <div className={`app${SHARED ? ' app--shared' : ''}`}>
      <header className="masthead">
        {SHARED ? (
          <div className="masthead__row">
            {brand ? <SharedMark brand={brand} /> : <span className="shared-mark" />}
            {brand && <span className="badge badge--approved" title="The approved identity">v{brand.displayVersion ?? brand.version}</span>}
          </div>
        ) : (
        <div className="masthead__row">
          {/* The brand being looked at stands where the app's name would; it opens the brand menu. */}
          <BrandMenu
            logo={brand ? <BrandLogo brand={brand} /> : <span className="brand-logo" />}
            current={brand?.id}
            brands={brandIds.map((id) => {
              const name = BUILT_IN.includes(id) ? builtInName(id) : saved[id]?.name ?? opened[id]?.brand?.name ?? id
              const own = opened[id]?.brand ?? (BUILT_IN.includes(id) ? null : saved[id])
              return { id, name, note: saved[id] && !BUILT_IN.includes(id) ? 'saved' : opened[id] ? 'opened' : null, logo: <MenuLogo url={own ? null : menuLogoUrl(id)} brand={own} name={name} /> }
            })}
            onBrand={(id) => select(id)}
            revisions={base && revisions.length ? [{ id: '', label: `Approved v${base.displayVersion ?? base.version}`, note: 'approved' }, ...revisions.map((entry) => ({ id: entry.id, label: entry.title, note: `${entry.status ?? 'proposed'} v${entry.displayVersion ?? entry.version}` }))] : []}
            revision={activeRevision ?? ''}
            onRevision={chooseRevision}
            tag={activeRevision ? <span title={`Every view is showing ${brand.revision.title}, a ${brand.revision.status} revision, instead of the approved identity`}><span className="brand-menu__status">{brand.revision.status} </span>v{brand.displayVersion ?? brand.version}</span> : null}
          />
          {changed && <span className="badge" title="Edited since it was loaded">edited</span>}
          <div className="masthead__actions">
            <button type="button" className="button" disabled={!base} onClick={() => setSharing(true)}>Share</button>
            <span className="masthead__wide">
              <button type="button" className="button button--quiet" onClick={() => fileInput.current?.click()}>Open…</button>
              {OTHER_VIEWS.map((entry) => <button key={entry.id} type="button" className="button button--quiet" aria-pressed={view === entry.id} onClick={() => go(entry.id)}>{entry.label}</button>)}
              <a className="button button--quiet" href="https://github.com/ahzs645/brandkit">GitHub</a>
            </span>
            {/* On a phone the same actions fold into one menu. */}
            <MoreMenu items={[
              { label: 'Open a brand…', onSelect: () => fileInput.current?.click() },
              ...OTHER_VIEWS.map((entry) => ({ label: entry.label, current: view === entry.id, onSelect: () => go(entry.id) })),
              { label: 'GitHub', href: 'https://github.com/ahzs645/brandkit' },
              { label: 'brandkit home', href: import.meta.env.BASE_URL }
            ]} />
            <input ref={fileInput} type="file" accept=".json,.zip,application/json,application/zip" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) open(file) }} />
          </div>
        </div>
        )}
        {(!SHARED || brand) && <nav className="tabs" aria-label="Sections">
          {TABS.filter((entry) => entry.id !== 'motion' || motionUrl(brand, source)).map((entry) => <button key={entry.id} type="button" aria-current={view === entry.id ? 'page' : undefined} onClick={() => go(entry.id)}>{entry.label}</button>)}
        </nav>}
      </header>
      {sharing && base && <ShareDialog brand={base} shareable={BUILT_IN.includes(base.id)} edited={changed} revision={brand?.revision} view={view} onClose={() => setSharing(false)} />}

      {error && <p className="notice notice--error" role="alert">{error}</p>}

      <main className="main">
        {!brand ? !error && <p className="muted">Loading…</p> : (
          <Suspense fallback={<p className="muted">Loading…</p>}>
            {view === 'overview' && <Overview brand={brand} base={base} fonts={fonts} revision={activeRevision} onRevision={chooseRevision} openManual={openManual} />}
            {view === 'colour' && <Colour brand={brand} />}
            {view === 'logos' && <Logos brand={brand} fonts={fonts} source={source} openManual={openManual} />}
            {view === 'templates' && <div className="view"><TemplateStudio key={brand.id} brand={brand} fonts={fonts} initialTemplate={params().get('template')} onSelect={(id) => writeUrl({ template: id })}
              aside={(template) => (template.description || (!SHARED && template.sources)) && (
                <div className="template-about">
                  {template.description && <p>{template.description}</p>}
                  <ManualSources brand={brand} sources={template.sources} openManual={openManual} />
                </div>
              )} /></div>}
            {view === 'guide' && <Guide brand={brand} fonts={fonts} openManual={openManual} />}
            {view === 'motion' && <Motion key={brand.id} brand={brand} source={source} initialStudy={params().get('study')} onSelect={(id) => writeUrl({ study: id })} />}
            {view === 'kit' && <Kit brand={brand} fonts={fonts} source={source} />}
            {view === 'brand' && <BrandEditor brand={base} onChange={update} onSave={save} saved={Boolean(saved[brand.id]) && !changed}
              canReset={changed} onReset={() => setCurrent((state) => ({ ...state, brand: structuredClone(state.original) }))} />}
            {view === 'new' && <NewBrand fonts={libraryFonts} existing={brandIds} onCreate={create} />}
            {view === 'manuals' && <Manuals openBuilt={openBuilt} />}
          </Suspense>
        )}
        {view === 'brand' && saved[brand?.id] && !BUILT_IN.includes(brand?.id) && (
          <p className="muted footnote"><button type="button" className="link" onClick={() => { forgetBrand(brand.id); setSaved(savedBrands()); select(BUILT_IN[0]) }}>Remove {brand.id} from this browser</button></p>
        )}
      </main>
      <footer className="footer muted">
        {SHARED
          ? `${brand?.name ?? 'This'} brand centre. Every file is made in your browser from the approved identity; nothing is uploaded.`
          : 'brandkit makes every file in your browser; nothing is uploaded. ddcnorth’s original v2.1 kit is reproduced byte for byte from its definition.'}
      </footer>
    </div>
    </Shared.Provider>
  )
}
