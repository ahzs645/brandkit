import { useMemo, useState } from 'react'
import { VEHICLE_MODELS, lengthOf } from './vehicle-models.js'

const preferenceKey = 'brandkit-vehicle-catalogue/1'
const readPreferences = () => {
  try { return JSON.parse(localStorage.getItem(preferenceKey)) ?? {} } catch { return {} }
}
const categoryOf = (id) => ({ Pickup: 'Pickups', Car: 'Cars', SUV: 'SUVs', 'Service vehicle': 'Service vehicles' })[VEHICLE_MODELS[id]?.category] ?? 'Cars'
const knownIds = (value) => Array.isArray(value) ? [...new Set(value)].filter((id) => Object.hasOwn(VEHICLE_MODELS, id) && !VEHICLE_MODELS[id].legacy).slice(0, 20) : []

export const VehicleCatalog = ({ value, disabled, onChange }) => {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All vehicles')
  const [favouritesOnly, setFavouritesOnly] = useState(false)
  const [favourites, setFavourites] = useState(() => knownIds(readPreferences().favourites))
  const [recent, setRecent] = useState(() => knownIds(readPreferences().recent))
  const persist = (nextFavourites, nextRecent) => { try { localStorage.setItem(preferenceKey, JSON.stringify({ favourites: nextFavourites, recent: nextRecent })) } catch { /* Optional catalogue preferences; project saving reports its own errors. */ } }
  const matches = useMemo(() => Object.entries(VEHICLE_MODELS).filter(([id, model]) => {
    const text = `${model.label} ${model.note} ${categoryOf(id)} ${model.creator} ${model.cab ?? ''}`.toLowerCase()
    return !model.legacy && (!query.trim() || query.toLowerCase().trim().split(/\s+/).every((word) => text.includes(word))) && (category === 'All vehicles' || categoryOf(id) === category) && (!favouritesOnly || favourites.includes(id))
  }).sort(([a], [b]) => (recent.indexOf(a) < 0 ? 99 : recent.indexOf(a)) - (recent.indexOf(b) < 0 ? 99 : recent.indexOf(b))), [query, category, favourites, recent, favouritesOnly])
  const choose = (id) => { const next = [id, ...recent.filter((other) => other !== id)].slice(0, 10); setRecent(next); persist(favourites, next); onChange(id) }
  const toggle = (id) => { const next = favourites.includes(id) ? favourites.filter((other) => other !== id) : [...favourites, id]; setFavourites(next); persist(next, recent) }
  return <div className="vehicle-catalog" aria-label="Vehicle library">
    <label className="field"><span className="field__label">Search vehicles</span><input type="search" value={query} placeholder="Search pickup, SUV, hatchback…" onChange={(event) => setQuery(event.target.value)} /></label>
    <div className="vehicle-catalog__filters"><select aria-label="Vehicle category" value={category} onChange={(event) => setCategory(event.target.value)}>{['All vehicles', 'Pickups', 'Cars', 'SUVs'].map((label) => <option key={label}>{label}</option>)}</select><button type="button" className="button button--quiet" aria-pressed={favouritesOnly} onClick={() => setFavouritesOnly(!favouritesOnly)}>★ Favourites</button></div>
    <p className="field__hint">{matches.length} {matches.length === 1 ? 'vehicle' : 'vehicles'} · recently used first</p>
    <div className="vehicle-catalog__cards">{matches.map(([id, model]) => <div key={id} className="vehicle-catalog__card" data-selected={value === id}>
      <button type="button" disabled={disabled} className="vehicle-catalog__choose" aria-label={`Choose ${model.label}`} aria-pressed={value === id} onClick={() => choose(id)}>
        <img src={model.thumbnail} alt={`${model.label}, rendered from its original 3D model`} loading="lazy" /><strong>{model.label}</strong><span>{model.cab ?? categoryOf(id)} · {lengthOf(id)} m preview</span><small>Imported 3D · {model.creator}</small>
      </button>
      <button type="button" className="vehicle-catalog__favourite" aria-pressed={favourites.includes(id)} aria-label={`Favourite ${model.label}`} onClick={() => toggle(id)}>{favourites.includes(id) ? '★' : '☆'}</button>
    </div>)}</div>
    {!matches.length && <p className="field__hint">No vehicles match. Try another search or category.</p>}
  </div>
}
