import { useEffect, useMemo, useRef, useState } from 'react'
import { icon, pattern, symbolDocument } from '../../engine/artwork.js'
import { patternLibrary } from '../../engine/pattern-catalog.js'
import { renderTemplate } from '../../engine/templates.js'
import { Downloads, Select, SvgImage } from '../ui.jsx'
import { useShared } from '../share.jsx'

const FILTER_FROM = 12

// Pattern names come from several sources; shown in one case so a gallery reads as one list.
const sentence = (text) => (text ? String(text).charAt(0).toUpperCase() + String(text).slice(1) : text)

const safely = (draw) => {
  try { return { svg: draw(), error: null } }
  catch (error) { return { svg: null, error: error.message } }
}

const templateHref = (brand, id, shared) => {
  const params = new URLSearchParams({ brand: brand.id, view: 'templates', template: id })
  const revision = new URLSearchParams(globalThis.location?.search ?? '').get('revision')
  if (shared) params.set('share', '1')
  else if (revision) params.set('revision', revision)
  return `?${params}`
}

const Motif = ({ brand, item }) => {
  const art = useMemo(() => safely(() => {
    if (item.kind === 'icon') {
      const spec = brand.icons?.items?.find((entry) => entry.id === item.id)
      if (!spec) throw new Error('The referenced icon is unavailable.')
      return icon({ brand }, spec)
    }
    return symbolDocument({ brand }, { symbolId: item.symbolId, colourKey: brand.roles?.ink ?? 'ink' })
  }), [brand, item])
  return <figure className="patterns-motif">
    <div className="patterns-motif__art">{art.svg && <SvgImage svg={art.svg} alt={sentence(item.label)} />}</div>
    <figcaption><strong>{sentence(item.label)}</strong>{item.reason && <span>{item.reason}</span>}{art.error && <span className="error">{art.error}</span>}</figcaption>
  </figure>
}

const Application = ({ brand, fonts, item, relation, onTemplate, shared }) => {
  const art = useMemo(() => fonts ? safely(() => renderTemplate({ brand, fonts, outline: true }, item.template).svg) : {}, [brand, fonts, item.template])
  const href = templateHref(brand, item.id, shared)
  const open = (event) => {
    if (!onTemplate || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onTemplate(item.id)
  }
  return <article className="patterns-application" data-template-id={item.id}>
    <a className="patterns-application__art" href={href} onClick={open} aria-label={`Open ${item.label} in Templates`}>
      {art.svg ? <SvgImage svg={art.svg} alt={`${item.label} template preview`} loading="lazy" /> : <span className="muted">{art.error ?? 'Loading brand fonts…'}</span>}
    </a>
    <div className="patterns-application__body">
      <h3><a href={href} onClick={open}>{item.label}</a></h3>
      {item.template.description && <p>{item.template.description}</p>}
      {relation && <span className="patterns-tag">{relation.relationship === 'family' ? 'From this pattern family' : 'Uses the selected pattern'}</span>}
      {relation?.reason && <p className="patterns-relationship">{relation.reason}</p>}
    </div>
  </article>
}

/** A single home for every registered pattern and its documented uses. */
export const Patterns = ({ brand, fonts, source, initialPattern, onSelect, onTemplate }) => {
  const shared = useShared()
  const library = useMemo(() => {
    try { return patternLibrary(brand) }
    catch (error) { return { patterns: [], applications: [], groups: [], resources: [], notes: [], error: error.message } }
  }, [brand])
  const [selectedId, setSelectedId] = useState(initialPattern)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')
  const [kind, setKind] = useState('all')
  const [relatedOnly, setRelatedOnly] = useState(false)
  // A short library reads at a glance: search and filters only add to it from a dozen patterns.
  const filterable = library.patterns.length >= FILTER_FROM
  const detail = useRef(null)
  const drawn = useMemo(() => new Map(library.patterns.map((entry) => [entry.id, safely(() => pattern({ brand }, entry.spec))])), [brand, library.patterns])
  const kinds = useMemo(() => [...new Map(library.patterns.map((entry) => [entry.kind, entry.kindLabel])).entries()], [library.patterns])
  const visible = useMemo(() => {
    const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
    return library.patterns.filter((entry) => {
      const searchable = [entry.id, entry.name, entry.description, entry.groupLabel, entry.kindLabel, ...entry.sourceNotes,
        ...entry.motifs.map((item) => item.label), ...entry.applications.map((item) => item.label)].join(' ').toLocaleLowerCase()
      return (group === 'all' || entry.groupId === group) && (kind === 'all' || entry.kind === kind) && words.every((word) => searchable.includes(word))
    })
  }, [library.patterns, query, group, kind])
  const selected = visible.find((entry) => entry.id === selectedId) ?? visible[0]
  const selectedArt = selected && drawn.get(selected.id)
  const relatedIds = useMemo(() => new Set(selected?.applications.map((item) => item.id) ?? []), [selected])
  const applications = relatedOnly ? library.applications.filter((item) => relatedIds.has(item.id)) : library.applications

  useEffect(() => {
    if (selected && selected.id !== selectedId) {
      setSelectedId(selected.id)
      onSelect?.(selected.id)
    }
  }, [selected, selectedId, onSelect])
  useEffect(() => { if (!relatedIds.size) setRelatedOnly(false) }, [relatedIds])

  const choose = (id) => {
    setSelectedId(id)
    onSelect?.(id)
    if (globalThis.matchMedia?.('(max-width: 850px)').matches) requestAnimationFrame(() => detail.current?.scrollIntoView({ block: 'start', behavior: globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }))
  }
  const clear = () => { setQuery(''); setGroup('all'); setKind('all') }

  return <div className="view patterns-view">
    {library.error && <p className="notice notice--error" role="alert">{library.error}</p>}

    <div className="patterns-browser">
      <section className="panel patterns-gallery-panel" aria-label="Pattern library">
        {filterable && <div className="patterns-filters">
          <label className="field patterns-search"><span className="visually-hidden">Search patterns</span><input type="search" value={query} placeholder="Search patterns" onChange={(event) => setQuery(event.target.value)} /></label>
          <label className="field"><span className="visually-hidden">Collection</span><Select value={group} onChange={setGroup} options={[{ value: 'all', label: 'All collections' }, ...library.groups.map((entry) => ({ value: entry.id, label: `${entry.label} (${entry.count})` }))]} /></label>
          <label className="field"><span className="visually-hidden">Composition</span><Select value={kind} onChange={setKind} options={[{ value: 'all', label: 'All compositions' }, ...kinds.map(([id, label]) => ({ value: id, label }))]} /></label>
        </div>}
        {filterable && (query || group !== 'all' || kind !== 'all') && <div className="patterns-results"><p role="status">Showing {visible.length} of {library.patterns.length} patterns</p><button type="button" className="link" onClick={clear}>Clear filters</button></div>}
        {visible.length ? <ul className="patterns-gallery" aria-label="Patterns">
          {visible.map((entry) => <li className="pattern-card" key={entry.id} data-pattern-id={entry.id}>
            <button type="button" aria-label={`View ${sentence(entry.name)}`} aria-pressed={selected?.id === entry.id} aria-controls="pattern-detail" onClick={() => choose(entry.id)}>
              <span className="pattern-card__art">{drawn.get(entry.id).svg ? <SvgImage svg={drawn.get(entry.id).svg} alt="" loading="lazy" /> : <span className="error">Preview unavailable</span>}</span>
              <span className="pattern-card__label"><strong>{sentence(entry.name)}</strong><span>{entry.kindLabel}</span></span>
            </button>
          </li>)}
        </ul> : <p className="patterns-empty">{library.patterns.length ? 'No patterns match these filters. Clear the filters to see the whole library.' : 'This brand has no registered patterns yet.'}</p>}
      </section>

      {selected && <section ref={detail} id="pattern-detail" className="panel patterns-detail" aria-labelledby="pattern-title" data-pattern-id={selected.id}>
        <p className="eyebrow">{selected.groupLabel}</p>
        <h2 id="pattern-title">{sentence(selected.name)}</h2>
        <div className="patterns-detail__art">{selectedArt.svg ? <SvgImage svg={selectedArt.svg} alt={`${sentence(selected.name)}, preview`} /> : <p className="notice notice--error" role="alert">{selectedArt.error}</p>}</div>
        <div className="patterns-detail__exports">
          <span>{selected.spec.width} × {selected.spec.height} px</span>
          {selectedArt.svg && <Downloads key={selected.id} name={`${brand.id}-${selected.id}`} make={() => selectedArt.svg} width={Math.min(4096, Math.max(1024, selected.spec.width * 2))} formats={['svg', 'png']} />}
        </div>
        {selected.description && <p className="patterns-description">{selected.description}</p>}
        <dl className="patterns-facts"><div><dt>Composition</dt><dd>{selected.kindLabel}</dd></div></dl>
        {selected.motifs.length > 0 && <div className="patterns-motifs"><h3>Shapes used in this pattern</h3>{selected.motifs.map((item) => <Motif key={`${item.kind}-${item.id}`} brand={brand} item={item} />)}</div>}
        {selected.applications.length > 0 && <a className="patterns-detail__applications" href="#patterns-applications" onClick={() => setRelatedOnly(true)}>See {selected.applications.length} related application{selected.applications.length === 1 ? '' : 's'} ↓</a>}
      </section>}
    </div>

    {library.applications.length > 0 && <section className="panel patterns-applications" id="patterns-applications" aria-labelledby="patterns-applications-title">
      <div className="panel__head panel__head--row"><div><h2 id="patterns-applications-title">Patterns in use</h2></div>
        {relatedIds.size > 0 && <label className="patterns-related"><input type="checkbox" checked={relatedOnly} onChange={(event) => setRelatedOnly(event.target.checked)} /> Related to {sentence(selected.name)}</label>}
      </div>
      <div className="patterns-application-grid">{applications.map((item) => <Application key={item.id} brand={brand} fonts={fonts} item={item} relation={selected?.applications.find((relation) => relation.id === item.id)} onTemplate={onTemplate} shared={shared} />)}</div>
    </section>}

  </div>
}
