import { useMemo, useState } from 'react'
import { VEHICLE_MODELS, lengthOf } from './vehicle-models.js'

const preferenceKey = 'brandkit-vehicle-catalogue/1'
const readPreferences = () => {
  try { return JSON.parse(localStorage.getItem(preferenceKey)) ?? {} } catch { return {} }
}
const categoryOf = (id) => id === 'truck-canopy' ? 'Pickups' : id === 'truck-service' ? 'Service vehicles' : id === 'shc' ? 'Cars' : 'SUVs'
const knownIds = (value) => Array.isArray(value) ? [...new Set(value)].filter((id) => Object.hasOwn(VEHICLE_MODELS, id)).slice(0, 20) : []

const Silhouette = ({ id }) => {
  const truck = id.startsWith('truck-')
  return <svg viewBox="0 0 220 84" fill="none" aria-hidden="true">
    <ellipse cx="112" cy="70" rx="98" ry="4" fill="currentColor" opacity=".08" />
    {truck ? <>
      <path d="M14 55V41L54 37 70 16H119L128 38H203V58H14Z" fill="currentColor" opacity=".22" stroke="currentColor" strokeWidth="1.5" />
      <path d="M61 37L75 21H94V37ZM99 21H115L120 37H99Z" fill="currentColor" opacity=".75" />
      {id === 'truck-canopy' ? <path d="M128 38V17Q128 11 137 11H197V38Z" fill="currentColor" opacity=".36" stroke="currentColor" /> : <path d="M130 19H203V58H130ZM152 19V55M180 19V55" fill="currentColor" opacity=".36" stroke="currentColor" />}
      <path d="M50 39H123M97 40V57M17 48H39M130 43H200" stroke="currentColor" opacity=".65" />
    </> : <>
      <path d={id === 'shc' ? 'M14 55L19 43 56 36 81 18H145L174 37 205 43V60H14Z' : 'M14 56V39L48 33 70 12H161L181 33 204 38V60H14Z'} fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
      <path d={id === 'shc' ? 'M65 35L84 23H111V35ZM116 23H142L160 35H116Z' : 'M57 33L75 17H111V33ZM116 17H156L169 33H116Z'} fill="currentColor" opacity=".75" />
      <path d="M111 38V59M48 42H178" stroke="currentColor" opacity=".6" />
    </>}
    {[51, 168].map((x) => <g key={x}><circle cx={x} cy="59" r="13" fill="currentColor" /><circle cx={x} cy="59" r="7" fill="var(--surface, #fff)" /><circle cx={x} cy="59" r="3" fill="currentColor" opacity=".6" /></g>)}
  </svg>
}

export const VehicleCatalog = ({ value, disabled, onChange }) => {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All vehicles')
  const [favouritesOnly, setFavouritesOnly] = useState(false)
  const [favourites, setFavourites] = useState(() => knownIds(readPreferences().favourites))
  const [recent, setRecent] = useState(() => knownIds(readPreferences().recent))
  const persist = (nextFavourites, nextRecent) => { try { localStorage.setItem(preferenceKey, JSON.stringify({ favourites: nextFavourites, recent: nextRecent })) } catch { /* Optional catalogue preferences; project saving reports its own errors. */ } }
  const matches = useMemo(() => Object.entries(VEHICLE_MODELS).filter(([id, model]) => {
    const text = `${model.label} ${model.note} ${categoryOf(id)} generic ${id.startsWith('truck') ? 'crew cab pickup work truck canopy' : ''}`.toLowerCase()
    return (!query.trim() || query.toLowerCase().trim().split(/\s+/).every((word) => text.includes(word))) && (category === 'All vehicles' || categoryOf(id) === category) && (!favouritesOnly || favourites.includes(id))
  }).sort(([a], [b]) => (recent.indexOf(a) < 0 ? 99 : recent.indexOf(a)) - (recent.indexOf(b) < 0 ? 99 : recent.indexOf(b))), [query, category, favourites, recent, favouritesOnly])
  const choose = (id) => { const next = [id, ...recent.filter((other) => other !== id)].slice(0, 10); setRecent(next); persist(favourites, next); onChange(id) }
  const toggle = (id) => { const next = favourites.includes(id) ? favourites.filter((other) => other !== id) : [...favourites, id]; setFavourites(next); persist(next, recent) }
  return <div className="vehicle-catalog" aria-label="Vehicle library">
    <label className="field"><span className="field__label">Search vehicles</span><input type="search" value={query} placeholder="Search pickup, SUV, canopy…" onChange={(event) => setQuery(event.target.value)} /></label>
    <div className="vehicle-catalog__filters"><select aria-label="Vehicle category" value={category} onChange={(event) => setCategory(event.target.value)}>{['All vehicles', 'Pickups', 'Service vehicles', 'Cars', 'SUVs'].map((label) => <option key={label}>{label}</option>)}</select><button type="button" className="button button--quiet" aria-pressed={favouritesOnly} onClick={() => setFavouritesOnly(!favouritesOnly)}>★ Favourites</button></div>
    <p className="field__hint">{matches.length} {matches.length === 1 ? 'vehicle' : 'vehicles'} · recently used first</p>
    <div className="vehicle-catalog__cards">{matches.map(([id, model]) => <div key={id} className="vehicle-catalog__card" data-selected={value === id}>
      <button type="button" disabled={disabled} className="vehicle-catalog__choose" aria-label={`Choose ${model.label}`} aria-pressed={value === id} onClick={() => choose(id)}>
        <Silhouette id={id} /><strong>{model.label}</strong><span>{id.startsWith('truck') ? 'Crew cab' : categoryOf(id)} · {lengthOf(id)} m preview</span><small>{model.build ? 'Generic geometry' : 'Imported generic model'}</small>
      </button>
      <button type="button" className="vehicle-catalog__favourite" aria-pressed={favourites.includes(id)} aria-label={`Favourite ${model.label}`} onClick={() => toggle(id)}>{favourites.includes(id) ? '★' : '☆'}</button>
    </div>)}</div>
    {!matches.length && <p className="field__hint">No vehicles match. Try another search or category.</p>}
  </div>
}
