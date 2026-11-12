// brandkit's app: pick or open a brand, look through it, fill in its templates, read its guide,
// and download the whole kit. Everything is made in the browser from the brand's definition.

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadBrandFonts } from '../fonts/provider.js'
import { STARTER_FONTS } from '../engine/starter.js'
import { validateBrand } from '../engine/brand.js'
import { approvedOnly, revisionsOf, withRevision } from '../engine/revisions.js'
import { TemplateStudio } from '../studio/TemplateStudio.jsx'
import { BUILT_IN, BUILT_IN_INDEX, blobSource, builtInName, menuLogoUrl, forgetBrand, librarySource, loadBuiltIn, openBrandFile, saveBrand, savedBrands, withBrandAssets } from './brands.js'
import { fetchPack, installArchive, installedPacks, openInstalled, readPackUrl, removePack, updatesFrom } from './pack-store.js'
import { addCatalog, fetchCatalogs, siteCatalogs } from './catalog.js'
import { isBundle } from '../pack/format.js'
import { registerPackPages } from './pack-pages.js'
import { useBrandDrop } from './drop.js'
import { createPrinterPackage, importPrinterPackage } from '../printer/package.js'
import { download } from '../export/render.js'
import { Overview } from './views/Overview.jsx'
import { Logos } from './views/Logos.jsx'
import { Kit } from './views/Kit.jsx'
import { Motion } from './views/Motion.jsx'
import { Colour } from './views/Colour.jsx'
import { motionUrl, viewOrOverview } from './motion.js'
import { hasDepartments } from './affiliation.js'
import { patternLibrary } from '../engine/pattern-catalog.js'
import { loadExtension } from '../extensions/index.js'
import { BrandEditor } from './views/BrandEditor.jsx'
import { NewBrand } from './views/NewBrand.jsx'
import { ManualSources } from './views/Sources.jsx'
import { BrandLogo, MenuLogo, Segmented } from './ui.jsx'
import { BrandMenu, MoreMenu } from './BrandMenu.jsx'
import { isSharedView, Shared, SHARED_VIEWS, ShareDialog, SharedMark } from './share.jsx'

// The guide pulls in the manual viewer; the manual library pulls in 156 pages' worth of data.
const Guide = lazy(() => import('./views/Guide.jsx').then((module) => ({ default: module.Guide })))
const Manuals = lazy(() => import('./views/Manuals.jsx').then((module) => ({ default: module.Manuals })))
const TemplatePrinter = lazy(() => import('./views/TemplatePrinter.jsx').then((module) => ({ default: module.TemplatePrinter })))
const Documents = lazy(() => import('./views/Documents.jsx').then((module) => ({ default: module.Documents })))
const Patterns = lazy(() => import('./views/Patterns.jsx').then((module) => ({ default: module.Patterns })))
const Web = lazy(() => import('./views/Web.jsx').then((module) => ({ default: module.Web })))
const Organization = lazy(() => import('./views/Organization.jsx').then((module) => ({ default: module.Organization })))
const BrandLibrary = lazy(() => import('./views/BrandLibrary.jsx').then((module) => ({ default: module.BrandLibrary })))
// Three.js and the vehicle models load only when the tab opens.
const Vehicles = lazy(() => import('./views/Vehicles.jsx').then((module) => ({ default: module.Vehicles })))

const VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'logos', label: 'Logos' },
  { id: 'colour', label: 'Colour' },
  { id: 'organization', label: 'Departments' },
  { id: 'patterns', label: 'Patterns' },
  // Templates holds the documents too: `documents` is its second part, kept as a view of its own
  // so a link to it still opens there, and shown under the Templates tab.
  { id: 'templates', label: 'Templates' },
  { id: 'documents', label: 'Documents', within: 'templates' },
  { id: 'web', label: 'Web' },
  // The brand's artwork placed on a car in 3D.
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'printer', label: 'Template Printer' },
  // A brand extension's own tab (UNBC's door signs), named by the extension.
  { id: 'extension', label: 'Extension' },
  { id: 'guide', label: 'Guide' },
  { id: 'motion', label: 'Motion' },
  { id: 'kit', label: 'Download kit' }
]
// The workshop's views, in the masthead's ⋯ menu rather than the tabs.
const OTHER_VIEWS = [{ id: 'brands', label: 'Brands' }, { id: 'brand', label: 'Edit brand' }, { id: 'new', label: 'New brand' }, { id: 'manuals', label: 'Manual library' }]
const ALL_VIEWS = [...VIEWS, ...OTHER_VIEWS].map((view) => view.id)

// A shared link (see ./share.jsx) is read once, on arrival, and kept in the address from then on.
const SHARED = isSharedView()
const TABS = SHARED ? VIEWS.filter((view) => SHARED_VIEWS.includes(view.id)) : VIEWS
const OPEN_VIEWS = SHARED ? SHARED_VIEWS : ALL_VIEWS

/**
 * Whether a brand has anything for a view: a tab for a brand with nothing in it is not shown, and
 * arriving on one goes to the overview. `extensionView` is undefined while the brand's extension
 * loads, so nothing is decided about its tab until then.
 */
const hasPatterns = (brand) => { try { return patternLibrary(brand).patterns.length > 0 } catch { return false } }
// Until the brand arrives only the tabs every brand has are shown, so the row does not fill with
// tabs the brand turns out not to have and then lose them.
const ALWAYS = ['overview', 'logos', 'colour', 'templates', 'web', 'kit']
const offers = (view, { brand, motionLink, extensionView }) => {
  if (!brand) return ALWAYS.includes(view)
  switch (view) {
    case 'motion': return Boolean(motionLink)
    case 'organization': return hasDepartments(brand)
    case 'patterns': return hasPatterns(brand)
    case 'guide': return Boolean(brand.guide?.pages?.length)
    // The printer is for card designs: a brand with a printer package (a card set up) has it.
    case 'printer': return Boolean(brand.printer?.packages?.length)
    case 'extension': return extensionView !== null
    // A logo to put on the car: a family, or a signature not set for one department.
    case 'vehicles': return Boolean(brand.families?.length || brand.signatures?.some((signature) => !signature.departmental))
    default: return true
  }
}

// The tab takes the brand's own word for its units: the Province has ministries.
const unitsLabel = (brand) => {
  const word = brand?.departments?.label ?? 'Department'
  return /[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`
}
const params = () => new URLSearchParams(globalThis.location?.search ?? '')
const megabytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`
const svgDataUrl = (svg) => (svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null)

const writeUrl = (changes, { keep = [] } = {}) => {
  const url = new URL(globalThis.location.href)
  // A shared link that names its pack (?url=) keeps naming it, so a reload works without storage.
  for (const key of [...url.searchParams.keys()]) if (!['brand', 'view', 'revision', 'share', ...(SHARED ? ['url'] : []), ...keep].includes(key)) url.searchParams.delete(key)
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
      const quoted = (value) => JSON.stringify(String(value)).replaceAll('<', '\\3c ')
      const weight = Number.isFinite(Number(face.weight)) ? Number(face.weight) : 400
      const style = ['normal', 'italic', 'oblique'].includes(face.style) ? face.style : 'normal'
      return `@font-face{font-family:${quoted(face.family)};src:url(${quoted(url)});font-weight:${weight};font-style:${style};font-display:swap}`
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
  // Brands installed in this browser from packs (./pack-store.js), and those catalogs offer.
  const [installed, setInstalled] = useState([])
  const [catalog, setCatalog] = useState({ catalogs: [], brands: new Map(), loading: true })
  const [progress, setProgress] = useState(null)
  const catalogReady = useRef(null)
  const [current, setCurrent] = useState(null)
  const [fonts, setFonts] = useState(null)
  const [libraryFonts, setLibraryFonts] = useState(null)
  const [error, setError] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [printerSession, setPrinterSession] = useState(null)
  const fileInput = useRef(null)
  const masthead = useRef(null)
  const tabs = useRef(null)
  // Everything sticky sits under the masthead, whose height changes with the brand's logo, the
  // window's width and wrapping: it is measured, not assumed.
  useEffect(() => {
    const element = masthead.current
    if (!element || typeof ResizeObserver === 'undefined') return undefined
    // On a phone only the tabs stay: the row above them scrolls away, and --masthead-h is what stays.
    const phone = globalThis.matchMedia?.('(max-width: 600px)')
    const measure = () => {
      const height = Math.ceil(element.getBoundingClientRect().height)
      const away = phone?.matches ? (tabs.current?.offsetTop ?? 0) : 0
      document.documentElement.style.setProperty('--masthead-away', `${away}px`)
      document.documentElement.style.setProperty('--masthead-h', `${height - away}px`)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    phone?.addEventListener('change', measure)
    return () => { observer.disconnect(); phone?.removeEventListener('change', measure) }
  }, [])

  const refreshInstalled = useCallback(async () => {
    const list = await installedPacks()
    setInstalled(list)
    return list
  }, [])
  const refreshCatalog = useCallback(() => {
    const promise = fetchCatalogs().then((result) => { setCatalog({ ...result, loading: false }); return result })
    catalogReady.current = promise
    return promise
  }, [])
  useEffect(() => { refreshInstalled() }, [refreshInstalled])
  if (!catalogReady.current) {
    // A link can name a catalog to add (?catalog=); it is remembered from then on.
    const asked = params().get('catalog')
    if (asked) addCatalog(asked)
    refreshCatalog()
  }

  const installedIds = installed.map((record) => record.id)
  const offered = [...catalog.brands.values()].filter((entry) => !BUILT_IN.includes(entry.id) && !installedIds.includes(entry.id))
  const brandIds = [...new Set([...BUILT_IN, ...installedIds, ...Object.keys(saved), ...Object.keys(opened), ...offered.map((entry) => entry.id)])]

  /** Downloads a pack and keeps it in this browser, showing progress; returns its record. */
  const downloadPack = useCallback(async ({ url, name, catalog: from, etag }) => {
    setProgress({ name: name ?? 'brand', received: 0, total: null })
    try {
      const fetched = await fetchPack(url, { etag, onProgress: (received, total) => setProgress({ name: name ?? 'brand', received, total }) })
      if (fetched.notModified) return null
      setProgress({ name: name ?? 'brand', received: fetched.bytes.byteLength, total: fetched.bytes.byteLength, storing: true })
      // A bundle adds several brands; the one asked for (?brand=) or else its first is opened.
      const records = await installArchive(fetched.bytes, { url, catalog: from, etag: fetched.etag }, { refuse: BUILT_IN })
      await refreshInstalled()
      const wanted = params().get('brand')
      return records.find((record) => record.id === wanted) ?? records[0]
    } finally {
      setProgress(null)
    }
  }, [refreshInstalled])

  /** A catalog brand whose pack differs from the copy installed here, when that copy came from it. */
  const updateFor = (record) => {
    const entry = catalog.brands.get(record.id)
    return entry?.sha256 && record.packHash !== entry.sha256 && updatesFrom(record, entry) ? entry : null
  }

  /** Finds a brand wherever it is: opened, installed, saved, built in, or in a catalog (installed on the way). */
  const loadBrand = useCallback(async (id, { notices = [] } = {}) => {
    if (opened[id]) return { ...opened[id], brand: structuredClone(opened[id].brand) }
    let pack = await openInstalled(id).catch(() => null)
    // Its pages are given real addresses by the pack worker; wait (briefly) for it the first time.
    if (pack || !BUILT_IN.includes(id)) await registerPackPages()
    // A brand that is already here does not wait long on the catalogs (they only say whether it
    // has an update); one that is not has to, since a catalog is the only place it can come from.
    const here = Boolean(pack || saved[id] || BUILT_IN.includes(id))
    const catalogs = catalogReady.current ?? Promise.resolve({ brands: new Map() })
    const ready = here ? await Promise.race([catalogs, new Promise((resolve) => setTimeout(resolve, 2500, null))]) : await catalogs
    const entry = ready?.brands.get(id)
    if (pack && entry?.sha256 && pack.record.packHash !== entry.sha256 && updatesFrom(pack.record, entry)) {
      // The catalog has a newer pack: fetch it now, and keep the copy here if that fails.
      try {
        await downloadPack({ url: entry.url, name: entry.name, catalog: entry.catalog })
        pack = await openInstalled(id)
      } catch (problem) { notices.push(`Showing the copy of ${pack.record.name} kept in this browser: the update could not be downloaded (${problem.message}).`) }
    }
    if (pack) {
      const definition = saved[id] ? structuredClone(saved[id]) : pack.brand
      return { brand: definition, source: blobSource(pack.files, pack.library, pack.record.name, { id }), pack: pack.record }
    }
    if (saved[id]) return { brand: structuredClone(saved[id]), source: librarySource() }
    if (BUILT_IN.includes(id)) return loadBuiltIn(id)
    if (entry) {
      await downloadPack({ url: entry.url, name: entry.name, catalog: entry.catalog })
      const fresh = await openInstalled(id)
      if (fresh) return { brand: fresh.brand, source: blobSource(fresh.files, fresh.library, fresh.record.name, { id }), pack: fresh.record }
    }
    return null
  }, [opened, saved, downloadPack])

  const select = useCallback(async (id, { keepView = false } = {}) => {
    setError(null)
    if (!keepView) setRevisionId(null)
    try {
      const notices = []
      let next = await loadBrand(id, { notices })
      if (!next) {
        if (SHARED) throw new Error(`This link is for a brand that isn’t on this site${id ? ` (${id})` : ''}. Ask whoever sent it for a new one.`)
        if (id && id !== BUILT_IN[0]) notices.push(`${id} isn’t built in, kept in this browser, or offered by a catalog here.`)
        next = await loadBuiltIn(BUILT_IN[0])
      }
      setCurrent({ ...next, original: structuredClone(next.brand) })
      if (notices.length) setError(notices.join(' '))
      // On arrival the address may point into a guide or manual; a later switch of brand starts fresh.
      // A shared link drops anything it does not offer (a revision, a view of the workshop).
      writeUrl({ brand: next.brand.id, ...(SHARED && { revision: null, view: view === 'overview' ? null : view }) }, { keep: keepView ? ['book', 'page', 'guide', 'template', 'signature', 'study', 'pattern'] : [] })
      if (!SHARED) try { localStorage.setItem('brandkit:last', next.brand.id) } catch { /* fine */ }
    } catch (problem) {
      setError(problem.message)
    }
    // `view` only matters on arrival, for a shared link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadBrand])

  useEffect(() => {
    (async () => {
      // A link to a pack (?url=…zip): download it, keep it, and open it. A revisit with the same
      // link opens the copy kept here, after asking the host whether it has changed.
      const packUrl = readPackUrl()
      if (packUrl) {
        // A bundle's brands all share its address; prefer the one the link names.
        const fromLink = (await installedPacks()).filter((record) => record.url === packUrl)
        const kept = fromLink.find((record) => record.id === params().get('brand')) ?? fromLink[0]
        try {
          const record = await downloadPack({ url: packUrl, name: kept?.name, etag: kept?.etag })
          const id = record?.id ?? kept?.id
          if (!SHARED) { const url = new URL(globalThis.location.href); url.searchParams.delete('url'); globalThis.history.replaceState(null, '', url) }
          if (id) { await select(id, { keepView: true }); return }
        } catch (problem) {
          if (kept) { await select(kept.id, { keepView: true }); setError(`Showing the copy of ${kept.name} kept in this browser: ${problem.message}`); return }
          setError(problem.message)
          if (SHARED) return
        }
      }
      const wanted = params().get('brand') ?? (SHARED ? null : (() => { try { return localStorage.getItem('brandkit:last') } catch { return null } })())
      await select(wanted || BUILT_IN[0], { keepView: true })
    })()
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Removes a brand kept in this browser (its pack and any saved edits). */
  const forget = async (id) => {
    if (installedIds.includes(id)) await removePack(id)
    if (saved[id]) forgetBrand(id)
    setSaved(savedBrands())
    setOpened(({ [id]: _gone, ...rest }) => rest)
    await refreshInstalled()
    if (current?.brand?.id === id) select(BUILT_IN[0])
  }

  /** Every brand the manual library can link to, with the manual pages it is built from. */
  const brandIndex = useMemo(() => {
    const index = new Map(BUILT_IN_INDEX.map((entry) => [entry.id, entry]))
    for (const record of installed) if (record.pages && !index.has(record.id)) index.set(record.id, { id: record.id, name: record.name, pages: record.pages })
    for (const entry of catalog.brands.values()) if (entry.pages && !index.has(entry.id)) index.set(entry.id, { id: entry.id, name: entry.name, pages: entry.pages })
    return [...index.values()]
  }, [installed, catalog])

  /** Whether a link to a brand would open it for someone else, and the pack it should name. */
  const shareTarget = (id) => {
    if (BUILT_IN.includes(id)) return { shareable: true }
    const entry = catalog.brands.get(id)
    if (entry && siteCatalogs().includes(entry.catalog)) return { shareable: true }
    const url = installed.find((record) => record.id === id)?.url ?? entry?.url
    return url ? { shareable: true, packUrl: url } : { shareable: false }
  }

  // A shared view only ever has the approved identity, so nothing downstream can offer a revision.
  const base = useMemo(() => (SHARED ? approvedOnly(current?.brand) : current?.brand), [current?.brand])
  const revisions = revisionsOf(base)
  const activeRevision = revisions.some((entry) => entry.id === revisionId) ? revisionId : null
  const brand = useMemo(() => (base && activeRevision ? withRevision(base, activeRevision) : base), [base, activeRevision])
  const chooseRevision = (id) => {
    setRevisionId(id || null)
    writeUrl({ revision: id || null }, { keep: ['view'] })
  }
  const source = useMemo(() => brand && current?.source ? withBrandAssets(brand, current.source) : current?.source, [brand?.assets, current?.source])
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
  // The brand's extension, once loaded for this brand (null: it has none).
  const [extension, setExtension] = useState({ id: undefined, value: null })
  useEffect(() => {
    let live = true
    loadExtension(brand).then((value) => { if (live) setExtension({ id: brand?.extension ?? null, value }) }, () => { if (live) setExtension({ id: brand?.extension ?? null, value: null }) })
    return () => { live = false }
  }, [brand?.extension])
  const extensionView = extension.id === (brand?.extension ?? null) ? extension.value?.view ?? null : undefined
  const ExtensionView = useMemo(() => (extensionView ? lazy(extensionView.load) : null), [extensionView])

  const go = (next) => {
    setView(next)
    writeUrl({ view: next === 'overview' ? null : next })
    globalThis.scrollTo?.({ top: 0 })
  }
  // Motion only exists for a brand (or a chosen revision) with a motion library: arriving on it, or
  // switching brand or revision while on it, without one goes to the overview.
  const motionLink = brand ? motionUrl(brand, source) : undefined
  // On a phone the tab row scrolls: the current tab is brought into it.
  useEffect(() => { tabs.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ inline: 'center', block: 'nearest' }) }, [view, brand?.id])
  const available = useMemo(() => new Set(TABS.map((entry) => entry.id).filter((id) => offers(id, { brand, motionLink, extensionView }))), [brand, motionLink, extensionView])
  useEffect(() => {
    if (brand && (viewOrOverview(view, motionLink) !== view || TABS.some((entry) => entry.id === view) && !available.has(view))) go('overview')
  }, [brand, motionLink, view, available])

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
      // A bundle (several brands in one zip) adds every brand in it, then opens the first.
      if (/\.zip$/i.test(file.name) || /zip/i.test(file.type)) {
        const bytes = new Uint8Array(await file.arrayBuffer())
        if (isBundle(bytes)) {
          const records = await installArchive(bytes, {}, { refuse: BUILT_IN })
          await refreshInstalled()
          const ids = records.map((record) => record.id)
          setOpened((all) => Object.fromEntries(Object.entries(all).filter(([id]) => !ids.includes(id))))
          await select(ids[0])
          go('overview')
          return
        }
      }
      const result = await openBrandFile(file)
      const problems = validateBrand(result.brand)
      if (problems.length) throw new Error(`That brand.json has problems: ${problems.join(' ')}`)
      if (BUILT_IN.includes(result.brand.id)) throw new Error(`${result.brand.id} is built into brandkit; give the brand you are opening an id of its own.`)
      // A zip is kept in this browser, so the brand is still here after a reload; a brand.json on
      // its own (or a zip the browser will not store) is opened for this visit only.
      if (result.bytes) {
        try {
          await installArchive(result.bytes)
          await refreshInstalled()
          setOpened(({ [result.brand.id]: _replaced, ...rest }) => rest)
          await select(result.brand.id)
          go('overview')
          return
        } catch (problem) {
          setError(`${result.brand.name} is open, but could not be kept in this browser (${problem.message}); it will be gone after a reload.`)
        }
      }
      setOpened((all) => ({ ...all, [result.brand.id]: result }))
      setCurrent({ ...result, original: structuredClone(result.brand) })
      writeUrl({ brand: result.brand.id })
      go('overview')
    } catch (problem) {
      setError(problem.message)
    }
  }
  // A brand dragged onto the page opens as Open… opens it. Not in a shared view (it offers no
  // other brands), nor in Template Printer, whose zips are card packages rather than brands.
  const dragging = useBrandDrop({ enabled: !SHARED && view !== 'printer', onFile: open, onReject: setError })

  /** Adds a brand from a pack's address, as a ?url= link would. */
  const addFromUrl = async (url) => {
    const record = await downloadPack({ url })
    if (record) { await select(record.id); go('overview') }
  }

  const update = (next) => setCurrent((state) => ({ ...state, brand: next }))
  const printerPackage = (template, values) => {
    if (!values) try { values = JSON.parse(localStorage.getItem(`brandkit:fields:${brand.id}`) || '{}') } catch { values = {} }
    return createPrinterPackage({ brand, fonts, values }, template, { readAsset: source.read })
  }
  const printTemplate = async (template, values) => {
    const result = await printerPackage(template, values)
    setPrinterSession({ bytes: result.bytes, id: crypto.randomUUID() })
    go('printer')
  }
  const downloadPrinterPackage = async (template, values) => {
    const result = await printerPackage(template, values)
    download(result.bytes, `${brand.id}-${template.printer?.packageId ?? template.id}.zip`)
  }
  /** A package the printer saved (its bytes), or a ZIP chosen from disk, added to the brand's templates. */
  const importPrinterDesign = async (bytes) => {
    const imported = importPrinterPackage(base, bytes instanceof Blob ? await bytes.arrayBuffer() : bytes)
    saveBrand(imported.brand, { strict: true })
    update(imported.brand)
    setSaved(savedBrands())
    go('templates')
    writeUrl({ template: Object.values(imported.record.templates)[0] })
  }
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
      <header ref={masthead} className="masthead">
        {SHARED ? (
          <div className="masthead__row">
            {brand ? <SharedMark brand={brand} fonts={fonts} /> : <span className="shared-mark" />}
            {brand && <span className="badge badge--approved" title="The approved identity">v{brand.displayVersion ?? brand.version}</span>}
          </div>
        ) : (
        <div className="masthead__row">
          {/* The brand being looked at stands where the app's name would; it opens the brand menu. */}
          <BrandMenu
            logo={brand ? <BrandLogo brand={brand} fonts={fonts} /> : <span className="brand-logo" />}
            current={brand?.id}
            brands={brandIds.map((id) => {
              const record = installed.find((entry) => entry.id === id)
              const entry = catalog.brands.get(id)
              const builtIn = BUILT_IN.includes(id)
              const name = builtIn ? builtInName(id) : record?.name ?? saved[id]?.name ?? opened[id]?.brand?.name ?? entry?.name ?? id
              const group = builtIn ? 'Built in' : record || saved[id] || opened[id] ? 'In this browser' : 'Available to add'
              const own = opened[id]?.brand ?? (builtIn || record ? null : saved[id])
              const logoUrl = builtIn ? menuLogoUrl(id) : record ? svgDataUrl(record.menuLogoSvg) : entry?.menuLogo ?? null
              const note = record && updateFor(record) ? 'update' : record ? null : saved[id] && !builtIn ? 'saved' : opened[id] ? 'opened' : entry?.bytes ? megabytes(entry.bytes) : null
              return { id, name, group, note, logo: <MenuLogo id={id} url={own ? null : logoUrl} brand={own} name={name} /> }
            })}
            onManage={() => go('brands')}
            onBrand={(id) => select(id)}
            revisions={base && revisions.length ? [{ id: '', label: `Approved v${base.displayVersion ?? base.version}`, note: 'approved' }, ...revisions.map((entry) => ({ id: entry.id, label: entry.title, note: `${entry.status ?? 'proposed'} v${entry.displayVersion ?? entry.version}` }))] : []}
            revision={activeRevision ?? ''}
            onRevision={chooseRevision}
            tag={activeRevision ? <span title={`Every view is showing ${brand.revision.title}, a ${brand.revision.status} revision, instead of the approved identity`}><span className="brand-menu__status">{brand.revision.status} </span>v{brand.displayVersion ?? brand.version}</span> : null}
          />
          {changed && <span className="badge" title="Edited since it was loaded">edited</span>}
          <div className="masthead__actions">
            <button type="button" className="button" disabled={!base} onClick={() => setSharing(true)}>Share</button>
            {/* The workshop's actions, one menu at every width: the brand stays the loudest thing here. */}
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
        {(!SHARED || brand) && <nav ref={tabs} className="tabs" aria-label="Sections">
          {TABS.filter((entry) => !entry.within && available.has(entry.id) && (entry.id !== 'extension' || extensionView)).map((entry) => <button key={entry.id} type="button" aria-current={view === entry.id || TABS.find((other) => other.id === view)?.within === entry.id ? 'page' : undefined} onClick={() => go(entry.id)}>{entry.id === 'extension' ? extensionView.label : entry.id === 'organization' ? unitsLabel(brand) : entry.label}</button>)}
        </nav>}
      </header>
      {sharing && base && <ShareDialog brand={base} {...shareTarget(base.id)} edited={changed} revision={brand?.revision} view={view} onClose={() => setSharing(false)} />}

      {dragging && <div className="drop-overlay" aria-hidden="true">
        <div className="drop-overlay__panel">
          <strong>Drop to add a brand</strong>
          <span>A brand pack, a zipped folder or a brand.json.</span>
        </div>
      </div>}
      {progress && <p className="notice notice--progress" role="status">
        {progress.storing ? `Keeping ${progress.name} in this browser…` : `Downloading ${progress.name}… ${megabytes(progress.received)}${progress.total ? ` of ${megabytes(progress.total)}` : ''}`}
        {progress.total && !progress.storing ? <progress value={progress.received} max={progress.total} /> : null}
      </p>}
      {error && <p className="notice notice--error" role="alert">{error}</p>}

      <main className="main">
        {!brand ? !error && !progress && <p className="muted">Loading…</p> : (
          <Suspense fallback={<p className="muted">Loading…</p>}>
            {view === 'overview' && <Overview key={brand.id} brand={brand} base={base} fonts={fonts} source={source} revision={activeRevision} onRevision={chooseRevision} openManual={openManual} />}
            {view === 'colour' && <Colour brand={brand} />}
            {view === 'organization' && hasDepartments(brand) && <Organization key={brand.id} brand={brand} fonts={fonts} onDocuments={() => go('documents')} onTemplates={() => go('templates')} />}
            {view === 'logos' && <Logos brand={brand} fonts={fonts} source={source} openManual={openManual} />}
            {view === 'patterns' && <Patterns key={brand.id} brand={brand} fonts={fonts} source={source} initialPattern={params().get('pattern')} onSelect={(id) => writeUrl({ pattern: id })} onTemplate={(id) => openBuilt(brand.id, 'template', id)} />}
            {(view === 'templates' || view === 'documents') && <div className="section-switch">
              <Segmented label="Templates or documents" value={view} onChange={go} options={[
                { value: 'templates', label: 'Templates', title: 'Cards, stationery, social posts and slides: fill in the fields and download' },
                { value: 'documents', label: 'Documents', title: 'Reports, briefs and letters to write, as Word and print-ready pages' }
              ]} />
            </div>}
            {view === 'templates' && <div className="view">
              <TemplateStudio key={brand.id} brand={brand} fonts={fonts} resolveAsset={source.url} initialTemplate={params().get('template')} onSelect={(id) => writeUrl({ template: id })}
                onPrint={SHARED || !available.has('printer') ? undefined : printTemplate} onPrinterPackage={downloadPrinterPackage} printerWebsite={{ website: brand.printer?.website }}
              aside={(template) => (template.description || (!SHARED && template.sources)) && (
                <div className="template-about">
                  {template.description && <p>{template.description}</p>}
                  <ManualSources brand={brand} sources={template.sources} openManual={openManual} />
                </div>
              )} /></div>}
            {view === 'printer' && <TemplatePrinter brand={brand} source={source} request={printerSession} ready={Boolean(fonts)} onPrint={printTemplate} onImport={importPrinterDesign} />}
            {view === 'extension' && ExtensionView && <div className="view">
              <ExtensionView key={brand.id} brand={brand} fonts={fonts} />
            </div>}
            {view === 'web' && <Web key={brand.id} brand={brand} fonts={fonts} source={source} />}
            {view === 'vehicles' && <Vehicles key={brand.id} brand={brand} fonts={fonts} />}
            {view === 'documents' && <Documents key={brand.id} brand={brand} fonts={fonts} />}
            {view === 'guide' && <Guide brand={brand} fonts={fonts} openManual={openManual} />}
            {view === 'motion' && <Motion key={brand.id} brand={brand} source={source} initialStudy={params().get('study')} onSelect={(id) => writeUrl({ study: id })} />}
            {view === 'kit' && <Kit brand={brand} fonts={fonts} source={source} />}
            {view === 'brand' && <BrandEditor brand={base} onChange={update} onSave={save} saved={Boolean(saved[brand.id]) && !changed}
              canReset={changed} onReset={() => setCurrent((state) => ({ ...state, brand: structuredClone(state.original) }))} />}
            {view === 'new' && <NewBrand fonts={libraryFonts} existing={brandIds} onCreate={create} />}
            {view === 'manuals' && <Manuals brand={brand} openBuilt={openBuilt} brandIndex={brandIndex} />}
            {view === 'brands' && <BrandLibrary current={brand.id} installed={installed} saved={saved} catalog={catalog} builtIn={BUILT_IN.map((id) => ({ id, name: builtInName(id) }))}
              updateFor={updateFor} onOpen={(id) => { select(id); go('overview') }} onRemove={forget} onAddUrl={addFromUrl} onOpenFile={() => fileInput.current?.click()}
              onUpdate={async (entry) => { await downloadPack({ url: entry.url, name: entry.name, catalog: entry.catalog }); if (brand.id === entry.id) select(entry.id) }}
              onCatalogsChanged={refreshCatalog} />}
          </Suspense>
        )}
        {view === 'brand' && (saved[brand?.id] || installedIds.includes(brand?.id)) && !BUILT_IN.includes(brand?.id) && (
          <p className="muted footnote"><button type="button" className="link" onClick={() => forget(brand.id)}>Remove {brand.id} from this browser</button></p>
        )}
      </main>
    </div>
    </Shared.Provider>
  )
}
