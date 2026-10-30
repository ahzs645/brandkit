import { useMemo, useState } from 'react'
import { buildKit, planKit } from '../../engine/kit.js'
import { paintOptions } from '../../engine/brand.js'
import { createBrowserRenderer, download, zip } from '../../export/render.js'
import { formatBytes } from '../../engine/web.js'
import { isSupportFile, KIT_PACKS } from '../../engine/packs.js'
import { hasSubLogos, readAffiliation, writeAffiliation } from '../affiliation.js'
import { Field, Select } from '../ui.jsx'

// The kit is chosen in three steps: what the person is making (the pack decides every format),
// whose logo it carries, then one download. "Everything" stays one click away for designers.
const FOCUSED = KIT_PACKS.filter((pack) => pack.id !== 'complete')
const EVERYTHING = KIT_PACKS.find((pack) => pack.id === 'complete')
const SOURCE = 'Source & package files'
const FOLDED = new Set(['Build sources', 'References', 'Package files', 'Revisions'])
const FORMAT_ORDER = ['SVG', 'PNG', 'PDF']
const SAVED = '~saved'

const single = (text) => String(text ?? '').replace(/\s+/g, ' ').trim()
const plural = (word) => (/[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`)
const extensionOf = (path) => (/\.([a-z0-9]+)$/i.exec(path)?.[1] ?? '').toUpperCase()
const byFormat = (a, b) => ((FORMAT_ORDER.indexOf(a) + 1 || 99) - (FORMAT_ORDER.indexOf(b) + 1 || 99)) || a.localeCompare(b)

// Official Word and PowerPoint originals sit beside the generated ones; the rest of the package
// (the definition, references, revisions) is one group, listed in full only for Everything.
const displayGroup = (entry) => (entry.path.startsWith('official-templates/') ? 'Office documents' : FOLDED.has(entry.group) ? SOURCE : entry.group)

/**
 * A group's files as rows of artwork: one row per thing, its colours and formats beside it, so
 * 24 logo files read as eight logos. Sizes and colour suffixes come off the file name, and format
 * folders (png/, pdf/) off the path. The whole department folder folds into one row per signature.
 */
const rowsOf = (entries, colours, departments, chosen) => {
  const rows = new Map()
  const names = [...colours].sort((a, b) => b.length - a.length)
  for (const entry of entries) {
    const parts = entry.path.split('/')
    let stem = parts.pop().replace(/\.[^.]+$/, '').replace(/-\d+$/, '')
    const colour = names.find((name) => stem.endsWith(`-${name}`))
    if (colour) stem = stem.slice(0, -colour.length - 1)
    let dirs = parts.slice(1).filter((part) => !['png', 'pdf', 'outlined', 'svg'].includes(part)).map((part) => part.replaceAll('-', ' '))
    if (entry.unit) dirs = [entry.unit === chosen ? departments.items.find((item) => item.id === chosen).name : `all ${departments.items.length} ${plural((departments.label ?? 'department').toLowerCase())}`]
    const key = [...dirs, stem].join('/')
    const row = rows.get(key) ?? { name: [...dirs, stem.replaceAll('-', ' ')].join(' / '), colours: [], formats: [] }
    if (colour && !row.colours.includes(colour)) row.colours.push(colour)
    const format = extensionOf(entry.path)
    if (format && !row.formats.includes(format)) row.formats.push(format)
    rows.set(key, row)
  }
  return [...rows.values()].map((row) => ({ ...row, formats: row.formats.sort(byFormat) }))
}

const departmentGroups = (items) => items.map((item) => ({ value: item.id, label: `${item.name}${item.years ? ` (${item.years})` : ''}`, group: item.group }))

/** The whole kit: what it will contain, then every file made here and zipped. */
export const Kit = (props) => <KitView key={`${props.brand.id}:${props.brand.revision?.id ?? ''}`} {...props} />

const KitView = ({ brand, fonts, source }) => {
  const departments = brand.departments
  const subLogos = hasSubLogos(brand)
  const field = departments?.field ?? 'department'
  const [pack, setPack] = useState('logos')
  const [saved, setSaved] = useState(() => readAffiliation(brand.id))
  const unitOf = (name) => single(name) && departments?.items?.find((item) => single(item.name) === single(name) || single(item.values?.[field]) === single(name))
  const [unitId, setUnitId] = useState(() => (subLogos && saved.department ? unitOf(saved.department)?.id ?? SAVED : ''))
  const [all, setAll] = useState(false)
  const [open, setOpen] = useState(() => new Set())
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const unit = departments?.items?.find((item) => item.id === unitId)
  const department = [unit?.id, all && '*'].filter(Boolean)
  const optionsFor = (id) => ({ ...KIT_PACKS.find((item) => item.id === id).options, pack: id, department })
  const counts = useMemo(() => Object.fromEntries(KIT_PACKS.map((item) => [item.id, planKit(brand, optionsFor(item.id)).length])), [brand, unitId, all])
  const plan = useMemo(() => planKit(brand, optionsFor(pack)), [brand, pack, unitId, all])
  const chosen = KIT_PACKS.find((item) => item.id === pack)
  const everything = pack === 'complete'

  // Word starters are headed with the saved unit names, wherever they were saved.
  const named = Boolean(brand.organization && (saved.department || saved.subdepartment))
  const values = unit || named ? { ...(named ? { ...saved, affiliation: saved } : {}), ...unit?.values } : undefined

  const colours = useMemo(() => new Set([...paintOptions(brand).map((paint) => paint.id), ...(brand.logoColours ?? []), ...(brand.rasterColours ?? []), ...Object.keys(brand.colours ?? {})].map((key) => key === 'currentColor' ? 'currentcolor' : key)), [brand])
  const folded = (entry) => !everything && (displayGroup(entry) === SOURCE || isSupportFile(entry))
  const extras = plan.filter(folded)
  const groups = [...plan.filter((entry) => !folded(entry)).reduce((map, entry) => map.set(displayGroup(entry), [...(map.get(displayGroup(entry)) ?? []), entry]), new Map())]
    .sort(([a], [b]) => (a === SOURCE) - (b === SOURCE))

  const choosePack = (id) => { setPack(id); setResult(null) }
  const chooseUnit = (id) => {
    setError(null); setResult(null)
    if (id === SAVED) return setUnitId(id)
    const item = departments.items.find((entry) => entry.id === id)
    // A subdepartment belongs to its department, so choosing another department drops it.
    const next = { department: item?.name ?? '', subdepartment: item && item.name === saved.department ? saved.subdepartment : '' }
    try { setSaved(writeAffiliation(brand.id, next)) } catch (problem) { setError(problem.message) }
    setUnitId(id)
  }
  const toggleGroup = (group, isOpen) => setOpen((current) => {
    if (current.has(group) === isOpen) return current
    const next = new Set(current)
    if (isOpen) next.add(group); else next.delete(group)
    return next
  })

  const build = async () => {
    setError(null)
    setResult(null)
    setProgress({ done: 0, total: plan.length, path: '' })
    const started = performance.now()
    try {
      const options = optionsFor(pack)
      const { files, skipped } = await buildKit({ brand, fonts, values }, {
        ...options,
        renderer: createBrowserRenderer(),
        readAsset: options.assets ? source.read : undefined,
        onProgress: (done, total, path) => setProgress({ done, total, path })
      })
      setProgress({ done: plan.length, total: plan.length, path: 'Zipping…' })
      const stem = brand.revision ? `${brand.id}-${brand.revision.id}` : brand.id
      const name = `${stem}-${everything ? 'brand-kit' : `${pack}-kit`}${unit ? `-${unit.id}` : ''}`
      const archive = await zip(files, name)
      download(archive, `${name}.zip`)
      setResult({ count: files.size, bytes: archive.length, skipped, seconds: (performance.now() - started) / 1000 })
    } catch (problem) {
      setError(problem.message)
    } finally {
      setProgress(null)
    }
  }

  const unitLabel = (departments?.label ?? 'Department').toLowerCase()
  const step = subLogos ? 3 : 2
  return (
    <div className="view">
      <section className="panel kit">
        <div className="kit-intro">
          <h2>The {brand.name} kit{brand.revision ? `, with the ${brand.revision.title.toLowerCase()} (${brand.revision.status})` : ''}</h2>
          <p className="muted">Every file is made in this browser from brand.json; nothing is uploaded.</p>
        </div>

        <fieldset className="kit-step" disabled={Boolean(progress)}>
          <legend><span className="kit-step__number">1</span> What do you need?</legend>
          <div className="kit-packs">
            {FOCUSED.map((item) => (
              <label key={item.id} className="kit-card">
                <input type="radio" name="kit-pack" value={item.id} checked={pack === item.id} onChange={() => choosePack(item.id)} />
                <span className="kit-card__name">{item.label}</span>
                <span className="kit-card__description">{item.description}</span>
                <span className="kit-card__count">{counts[item.id]} files</span>
              </label>
            ))}
          </div>
          <label className="kit-everything">
            <input type="radio" name="kit-pack" value="complete" checked={everything} onChange={() => choosePack('complete')} />
            <span>{EVERYTHING.label} ({counts.complete} files, for designers and archives)</span>
          </label>
        </fieldset>

        {subLogos && (
          <fieldset className="kit-step" disabled={Boolean(progress)}>
            <legend><span className="kit-step__number">2</span> Your {unitLabel}</legend>
            <div className="kit-unit">
              <Field label={departments.label ?? 'Department'} hint={unit ? `Its logo comes in this pack’s formats${brand.organization ? ', and the Word starters are headed with its name' : ''}. Saved in this browser for documents and templates.` : 'Choose one to add its logo to the kit; it is saved in this browser for documents and templates.'}>
                <Select value={unitId} disabled={Boolean(progress)} onChange={chooseUnit} options={[
                  { value: '', label: 'None — main logo only' },
                  ...(unitId === SAVED ? [{ value: SAVED, label: `${saved.department} (names documents; no listed logo)` }] : []),
                  ...departmentGroups(departments.items)
                ]} />
              </Field>
              <label className="kit-check">
                <input type="checkbox" checked={all || everything} disabled={everything} onChange={(event) => { setAll(event.target.checked); setResult(null) }} />
                <span>All {departments.items.length} {plural(unitLabel)} as SVG, for communications staff</span>
              </label>
            </div>
          </fieldset>
        )}
        {!subLogos && named && <p className="muted kit-named">Word starters are headed with {[saved.department, saved.subdepartment].filter(Boolean).join(', ')}, as saved in Departments.</p>}

        <div className="kit-step kit-action">
          <span className="kit-step__label"><span className="kit-step__number">{step}</span> Download</span>
          <button type="button" className="button button--large kit-download" disabled={Boolean(progress) || !fonts} onClick={build}>
            {progress ? 'Building…' : `Download ${chosen.label}${unit ? ` for ${unit.name}` : ''} — ${plan.length} files`}
          </button>
          {progress && (
            <div className="progress" role="status">
              <div className="progress__bar"><span style={{ width: `${(100 * progress.done) / Math.max(1, progress.total)}%` }} /></div>
              <span className="progress__label">{progress.done} of {progress.total} · {progress.path}</span>
            </div>
          )}
          {result && (
            <p className="muted" role="status">{result.count} files, {formatBytes(result.bytes)} zipped, in {result.seconds.toFixed(1)} s.{result.skipped.length ? ` ${result.skipped.length} could not be made: ${result.skipped.map((entry) => `${entry.path} (${entry.error.message})`).join('; ')}` : ''}</p>
          )}
          {!fonts && <p className="notice">The brand’s fonts are still loading; the guide and template images need them to set text as outlines.</p>}
          {error && <p className="notice notice--error" role="alert">{error}</p>}
        </div>
      </section>

      <section className="panel kit-inside">
        <h3>What’s inside</h3>
        {groups.map(([group, entries]) => {
          const isOpen = open.has(group)
          return (
            <details key={group} className="plan-group" open={isOpen} onToggle={(event) => toggleGroup(group, event.currentTarget.open)}>
              <summary>
                <span className="plan-group__name">{group}</span>
                <span className="muted">· {entries.length} {entries.length === 1 ? 'file' : 'files'} · {[...new Set(entries.map((entry) => extensionOf(entry.path)))].sort(byFormat).join(', ')}</span>
              </summary>
              {isOpen && (
                <ul className="plan-list">
                  {rowsOf(entries, colours, departments, unit?.id).map((row) => (
                    <li key={row.name}>
                      <span className="plan-row__name">{row.name}</span>
                      {row.colours.length > 0 && <span className="plan-row__colours">{row.colours.join(' · ')}</span>}
                      <span className="plan-row__formats">{row.formats.join(' ')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          )
        })}
        {extras.length > 0 && <p className="muted plan-extras">Plus {extras.length} source and package {extras.length === 1 ? 'file' : 'files'} (index.html, brand.json{extras.some((entry) => entry.path.startsWith('reference/')) ? ', the identity record' : ''}) so the folder opens and explains itself.</p>}
      </section>
    </div>
  )
}
