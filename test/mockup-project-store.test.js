import test from 'node:test'
import assert from 'node:assert/strict'
import { MAX_PROJECT_BYTES, projectMetadata, listProjects, loadProject, saveProject } from '../src/mockups/mockup-project-store.js'

test('saved project metadata is trimmed, independent, and restricted to the two product kinds', () => {
  const input = { brandId: ' northwind ', kind: 'vehicle', name: '  Pickup option A  ', revision: 99, project: { untrusted: true } }
  assert.deepEqual(projectMetadata(input), { brandId: 'northwind', kind: 'vehicle', name: 'Pickup option A' })
  assert.equal(input.name, '  Pickup option A  ')
  assert.deepEqual(projectMetadata({ brandId: 'northwind', kind: 'apparel', name: 'Hoodie — navy' }),
    { brandId: 'northwind', kind: 'apparel', name: 'Hoodie — navy' })
  assert.throws(() => projectMetadata({ ...input, kind: 'other' }), /Unknown mockup category/)
})

test('empty or control-character project names are rejected before storage', () => {
  for (const name of ['', '   ', 'one\ntwo', 'one\u0000two', 'A'.repeat(101), null, 7]) {
    assert.throws(() => projectMetadata({ brandId: 'northwind', kind: 'vehicle', name }), /valid project name/)
  }
  assert.equal(projectMetadata({ brandId: 'northwind', kind: 'vehicle', name: 'A'.repeat(100) }).name.length, 100)
  for (const brandId of ['', ' ', 'brand\tname', 'B'.repeat(201), null]) {
    assert.throws(() => projectMetadata({ brandId, kind: 'apparel', name: 'A' }), /valid brand ID/)
  }
})

test('invalid library and save requests fail without opening IndexedDB', async () => {
  await assert.rejects(listProjects('', 'vehicle'), /valid brand ID/)
  await assert.rejects(listProjects('northwind', 'other'), /Unknown mockup category/)
  const metadata = { brandId: 'northwind', kind: 'vehicle', name: 'A' }
  for (const project of [undefined, null, [], 'serialized', {}, { schema: 2 }]) {
    await assert.rejects(saveProject({ ...metadata, project }), /no valid saved format/)
  }
})

test('oversized or cyclic data cannot be reported as a saved project', async () => {
  const metadata = { brandId: 'northwind', kind: 'apparel', name: 'Large upload' }
  await assert.rejects(saveProject({ ...metadata, project: { schema: 'brandkit-apparel-mockup/1', payload: 'x'.repeat(MAX_PROJECT_BYTES) } }), /too large/)
  const cyclic = { schema: 'brandkit-apparel-mockup/1' }
  cyclic.self = cyclic
  await assert.rejects(saveProject({ ...metadata, project: cyclic }), /circular|cyclic/i)
})

test('a browser without IndexedDB gives a portable-backup recovery message', { skip: Boolean(globalThis.indexedDB) }, async () => {
  await assert.rejects(listProjects('northwind', 'vehicle'), /Download the project JSON/)
  await assert.rejects(loadProject('missing-project'), /Download the project JSON/)
})

// Revision races, real write failures, brand isolation and durable reload belong in the browser
// acceptance test against real IndexedDB. No in-memory imitation is used to claim persistence.
