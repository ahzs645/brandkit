import test from 'node:test'
import assert from 'node:assert/strict'
import { readMockupDraft } from '../src/mockups/mockup-draft.js'

// This adapter tests preservation decisions and failed-copy paths. It is not a persistence
// substitute: actual IndexedDB/browser durability is qualified in the browser acceptance work.
const storageOf = (entries = []) => {
  const values = new Map(entries)
  return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
}
const key = 'brandkit-apparel-draft:northwind'
const validate = (input) => {
  if (input.schema !== 'supported/1') throw new Error('Unsupported format.')
  return { schema: input.schema, layers: input.layers }
}

test('a supported draft is parsed and validated without creating a recovery copy', () => {
  const raw = '{"schema":"supported/1","layers":[1,2]}'
  const storage = storageOf([[key, raw]])
  const result = readMockupDraft({ key, validate, storage })
  assert.deepEqual(result, { project: { schema: 'supported/1', layers: [1, 2] }, storageKey: key, recovery: null })
  assert.equal(storage.values.size, 1)
  assert.equal(storage.getItem(key), raw)
})

test('a missing draft starts clean without inventing a recovery warning', () => {
  assert.deepEqual(readMockupDraft({ key, validate, storage: storageOf() }), { project: null, storageKey: key, recovery: null })
})

test('malformed and newer-schema draft input is preserved exactly before replacement is allowed', () => {
  for (const raw of ['{ truncated', '{"schema":"future/5","layers":[{"original":"retain all data"}]}', '']) {
    const storage = storageOf([[key, raw]])
    const result = readMockupDraft({ key, validate, storage })
    assert.equal(result.project, null)
    assert.equal(result.storageKey, key)
    assert.equal(result.recovery.raw, raw)
    assert.ok(result.recovery.key.startsWith(`${key}:recovery:`))
    assert.equal(storage.getItem(result.recovery.key), raw)
    assert.equal(storage.getItem(key), raw, 'reading never rewrites the original slot')
    storage.setItem(key, '{"schema":"supported/1","layers":[]}')
    assert.equal(storage.getItem(result.recovery.key), raw, 'a later new draft leaves the recovery copy intact')
  }
})

test('a recovery-key collision cannot overwrite an earlier recovery copy', () => {
  const storage = storageOf([[key, '{ newer broken data']])
  let sawCollision = false
  const originalGet = storage.getItem
  storage.getItem = (asked) => {
    if (asked.startsWith(`${key}:recovery:`) && !sawCollision) {
      sawCollision = true
      storage.setItem(asked, 'older preserved input')
    }
    return originalGet(asked)
  }
  const result = readMockupDraft({ key, validate, storage })
  assert.ok(sawCollision)
  assert.equal(storage.getItem(result.recovery.key), '{ newer broken data')
  assert.equal([...storage.values.values()].filter((value) => value === 'older preserved input').length, 1)
})

test('failed or unverifiable recovery copies disable autosave and preserve downloadable original input', () => {
  for (const kind of ['quota', 'lost-write', 'read-back']) {
    const raw = '{ unreadable original'
    const storage = storageOf([[key, raw]])
    const originalGet = storage.getItem
    storage.setItem = () => { if (kind === 'quota') throw new Error('Quota exceeded') }
    let recoveryReads = 0
    storage.getItem = (asked) => {
      if (asked !== key && ++recoveryReads > 1 && kind === 'read-back') throw new Error('Storage unavailable')
      return originalGet(asked)
    }
    const result = readMockupDraft({ key, validate, storage })
    assert.equal(result.storageKey, null, kind)
    assert.equal(result.project, null)
    assert.equal(result.recovery.raw, raw)
    assert.equal(result.recovery.key, null)
    assert.equal(storage.getItem(key), raw)
    assert.match(result.recovery.message, /Automatic draft saving is paused/)
  }
})

test('unreadable browser storage does not authorize overwriting an unknown existing draft', () => {
  const result = readMockupDraft({ key, validate, storage: { getItem: () => { throw new Error('Access denied') } } })
  assert.equal(result.storageKey, null)
  assert.equal(result.recovery.raw, null)
  assert.match(result.recovery.message, /could not read/)
})
