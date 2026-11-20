// A malformed or newer draft is evidence to preserve. Never let the fallback project overwrite
// its only copy: save the exact input under a unique recovery key and verify that copy first.
export const readMockupDraft = ({ key, validate, storage }) => {
  let target, raw
  try {
    target = storage ?? globalThis.localStorage
    if (!target) throw new Error('Browser storage is unavailable.')
    raw = target.getItem(key)
  } catch {
    return {
      project: null, storageKey: null,
      recovery: { raw: null, key: null, message: 'This browser could not read the saved draft. Automatic draft saving is paused; download JSON or save a named project to keep your work.' }
    }
  }
  if (raw === null) return { project: null, storageKey: key, recovery: null }
  try {
    return { project: validate(JSON.parse(raw)), storageKey: key, recovery: null }
  } catch {
    let backupKey = null
    try {
      const nonce = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
      const base = `${key}:recovery:${Date.now()}:${nonce}`
      backupKey = base
      let suffix = 1
      while (target.getItem(backupKey) !== null) backupKey = `${base}-${suffix++}`
      target.setItem(backupKey, raw)
      if (target.getItem(backupKey) !== raw) throw new Error('Recovery copy could not be verified.')
      return {
        project: null, storageKey: key,
        recovery: { raw, key: backupKey, message: 'The previous draft could not be opened. Its original data was preserved in a separate browser recovery copy; this new draft can be edited safely.' }
      }
    } catch {
      return {
        project: null, storageKey: null,
        recovery: { raw, key: null, message: 'The previous draft could not be opened and remains unchanged. Automatic draft saving is paused because a recovery copy could not be saved. Download JSON or save a named project to keep the new design.' }
      }
    }
  }
}
