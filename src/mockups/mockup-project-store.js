// Named vehicle and clothing projects share one transactional browser store. Draft recovery is
// deliberately separate: opening a saved project never happens implicitly on a later reload.
const DATABASE = 'brandkit-mockup-projects'
const STORE = 'projects'
export const PROJECT_KINDS = Object.freeze(['vehicle', 'apparel'])
export const MAX_PROJECT_BYTES = 25 * 1024 * 1024

const requiredText = (value, name, maximum) => {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum || /[\u0000-\u001f]/.test(value)) throw new Error(`Enter a valid ${name} (up to ${maximum} characters).`)
  return value.trim()
}

export const projectMetadata = ({ brandId, kind, name }) => {
  if (!PROJECT_KINDS.includes(kind)) throw new Error('Unknown mockup category.')
  return { brandId: requiredText(brandId, 'brand ID', 200), kind, name: requiredText(name, 'project name', 100) }
}

const openDatabase = () => new Promise((resolve, reject) => {
  if (!globalThis.indexedDB) { reject(new Error('Saved projects are unavailable in this browser. Download the project JSON to keep a copy.')); return }
  const request = indexedDB.open(DATABASE, 1)
  let blocked = false
  request.onupgradeneeded = () => {
    const store = request.result.createObjectStore(STORE, { keyPath: 'id' })
    store.createIndex('brandKind', ['brandId', 'kind'])
  }
  request.onsuccess = () => { if (blocked) { request.result.close(); return }; request.result.onversionchange = () => request.result.close(); resolve(request.result) }
  request.onerror = () => reject(new Error('Saved projects could not be opened. Download the project JSON to keep a copy.'))
  request.onblocked = () => { blocked = true; reject(new Error('Close other Brandkit tabs and try opening saved projects again.')) }
})

const transact = async (mode, run) => {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode)
    let result
    let problem
    transaction.oncomplete = () => { db.close(); resolve(result) }
    transaction.onabort = () => { db.close(); reject(problem ?? transaction.error ?? new Error('The project could not be saved. Download its JSON to keep a copy.')) }
    transaction.onerror = () => { /* onabort reports the final result; never claim success early. */ }
    try {
      run(transaction.objectStore(STORE), (value) => { result = value }, (error) => { problem = error; transaction.abort() })
    } catch (error) { problem = error; transaction.abort() }
  })
}

export const listProjects = async (brandId, kind) => {
  const metadata = projectMetadata({ brandId, kind, name: 'Listing' })
  return transact('readonly', (store, finish) => {
    const request = store.index('brandKind').getAll([metadata.brandId, metadata.kind])
    request.onsuccess = () => finish(request.result.map(({ project, ...metadata }) => metadata).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
  })
}

export const loadProject = async (id) => transact('readonly', (store, finish) => {
  const request = store.get(requiredText(id, 'project ID', 200))
  request.onsuccess = () => finish(request.result ?? null)
})

export const saveProject = async ({ id, brandId, kind, name, project, expectedRevision }) => {
  const metadata = projectMetadata({ brandId, kind, name })
  if (!project || typeof project !== 'object' || Array.isArray(project) || typeof project.schema !== 'string') throw new Error('This project has no valid saved format.')
  const json = JSON.stringify(project)
  if (new Blob([json]).size > MAX_PROJECT_BYTES) throw new Error('This project is too large for the saved library. Download its JSON instead.')
  // Only serializable data belongs in a project; the renderers and DOM never enter the store.
  const snapshot = JSON.parse(json)
  const projectId = id ? requiredText(id, 'project ID', 200) : globalThis.crypto.randomUUID()
  return transact('readwrite', (store, finish, fail) => {
    const request = store.get(projectId)
    request.onsuccess = () => {
      const previous = request.result
      if (previous && (previous.brandId !== metadata.brandId || previous.kind !== metadata.kind)) { fail(new Error('That saved project belongs to a different brand or category.')); return }
      if (id && (!previous || expectedRevision !== previous.revision)) { fail(new Error('This project changed in another tab or was removed. Reopen it, or save your work as a new project.')); return }
      const now = new Date().toISOString()
      const record = { ...metadata, id: projectId, createdAt: previous?.createdAt ?? now, updatedAt: now, revision: (previous?.revision ?? 0) + 1, project: snapshot }
      store.put(record)
      finish(record)
    }
  })
}

export const deleteProject = async (id, expectedRevision) => transact('readwrite', (store, finish, fail) => {
  const projectId = requiredText(id, 'project ID', 200)
  const request = store.get(projectId)
  request.onsuccess = () => {
    const current = request.result
    if (!current) { finish(false); return }
    if (expectedRevision !== current.revision) { fail(new Error('This project changed in another tab. Refresh the list before removing it.')); return }
    store.delete(projectId)
    finish(true)
  }
})
