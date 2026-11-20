import { useEffect, useRef, useState } from 'react'
import { deleteProject, listProjects, loadProject, saveProject } from './mockup-project-store.js'
import './mockup-projects.css'

/** A shared library UI. Product adapters validate incoming data before accepting onOpen. */
export const MockupProjects = ({ brandId, kind, project, onOpen, disabled = false, onStatus, defaultName = 'Untitled design', resetKey = 0 }) => {
  const [name, setName] = useState(defaultName)
  const [records, setRecords] = useState([])
  const [current, setCurrent] = useState(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const [removeId, setRemoveId] = useState(null)
  const session = useRef(0)
  const refresh = async (isCurrent = () => true) => {
    const items = await listProjects(brandId, kind)
    if (isCurrent()) setRecords(items)
  }
  useEffect(() => {
    const token = ++session.current
    setCurrent(null); setName(defaultName); setRemoveId(null); setProblem(''); setBusy(false)
    listProjects(brandId, kind).then((items) => { if (token === session.current) setRecords(items) }, (error) => { if (token === session.current) setProblem(error.message) })
    return () => { if (session.current === token) session.current++ }
  }, [brandId, kind, defaultName, resetKey])
  const perform = async (action) => {
    const token = session.current
    const isCurrent = () => token === session.current
    setBusy(true); setProblem('')
    try { await action(isCurrent) } catch (error) { if (isCurrent()) { setProblem(error.message); onStatus?.(error.message, true) } } finally { if (isCurrent()) setBusy(false) }
  }
  const save = (update) => perform(async (isCurrent) => {
    const result = await saveProject({ ...(update ? { id: current.id, expectedRevision: current.revision } : {}), brandId, kind, name, project })
    if (!isCurrent()) return
    setCurrent(result); await refresh(isCurrent)
    if (isCurrent()) onStatus?.(`“${result.name}” saved${update ? ` as revision ${result.revision}` : ' to projects'}.`, false)
  })
  const open = (id) => perform(async (isCurrent) => {
    const record = await loadProject(id)
    if (!isCurrent()) return
    if (!record) throw new Error('That saved project was removed. Refresh the list to see current projects.')
    if (record.brandId !== brandId || record.kind !== kind) throw new Error('That project belongs to another brand or category.')
    const accepted = await onOpen(record.project)
    if (!isCurrent()) return
    if (accepted === false) throw new Error('This saved project could not be opened. Your current work is unchanged.')
    setCurrent(record); setName(record.name); onStatus?.(`“${record.name}” opened.`, false)
  })
  return <section className="mockup-projects" aria-label="Saved projects">
    <div className="mockup-projects__heading"><h2>Saved projects</h2><button type="button" className="button button--quiet" disabled={busy || disabled} onClick={() => perform(refresh)}>Refresh</button></div>
    <label className="field"><span className="field__label">Project name</span><input aria-label="Project name" value={name} maxLength={100} disabled={busy || disabled} onChange={(event) => setName(event.target.value)} /></label>
    <div className="mockup-projects__actions">
      <button type="button" className="button" disabled={disabled || busy || !project || !name.trim()} onClick={() => save(false)}>Save as new</button>
      <button type="button" className="button button--quiet" disabled={disabled || busy || !project || !current || !name.trim()} onClick={() => save(true)}>Update saved</button>
    </div>
    {current && <p className="field__hint">Editing {current.name} · revision {current.revision}. Updates are explicit; Save as new keeps another alternative.</p>}
    {problem && <p role="alert" className="mockup-projects__error">{problem}</p>}
    <div className="mockup-projects__list">
      {records.map((record) => <div key={record.id} className="mockup-projects__record" data-project-id={record.id}>
        <button type="button" className="mockup-projects__open" disabled={busy || disabled} onClick={() => open(record.id)}><strong>{record.name}</strong><span>Revision {record.revision} · {new Date(record.updatedAt).toLocaleDateString()}</span></button>
        {removeId === record.id ? <div className="mockup-projects__remove"><span>Remove saved copy?</span><button type="button" disabled={busy || disabled} onClick={() => perform(async (isCurrent) => { await deleteProject(record.id, record.revision); if (!isCurrent()) return; if (current?.id === record.id) setCurrent(null); setRemoveId(null); await refresh(isCurrent) })}>Remove</button><button type="button" disabled={busy || disabled} onClick={() => setRemoveId(null)}>Keep</button></div>
          : <button type="button" className="button button--quiet" aria-label={`Remove ${record.name}`} disabled={busy || disabled} onClick={() => setRemoveId(record.id)}>×</button>}
      </div>)}
      {!records.length && !problem && <p className="field__hint">Save separate vehicles, garments, and client alternatives here.</p>}
    </div>
    <p className="field__hint">Saved on this browser. Download JSON for a portable backup or to move to another device.</p>
  </section>
}
