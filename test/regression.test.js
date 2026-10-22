// No regression: the approved ddcnorth kit and the 2.2 rising proposal render as they did at the
// branch's base (a2eeb09), apart from the files that must change when a revision is added.
// The manifest is made by scripts/golden-base.mjs; see docs/PLANS.md, BK-010.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { compareRenders, computeManifest } from '../scripts/golden-base.mjs'

const golden = JSON.parse(readFileSync(new URL('./fixtures/base-a2eeb09.json', import.meta.url), 'utf8'))
const root = new URL('..', import.meta.url).pathname

test('the approved and rising kits render as at the base, with only the allowed differences', async () => {
  const now = await computeManifest(root)
  const keyChanges = Object.keys(golden.keys).filter((key) => now.keys[key] !== golden.keys[key])
  assert.deepEqual(keyChanges, ['revisions'], 'only `revisions` changes in brand.json')
  assert.deepEqual(Object.keys(now.keys).filter((key) => !(key in golden.keys)), [], 'no new top-level keys')

  const approved = compareRenders(golden.approved, now.approved)
  // CHANGELOG.md is the brand's change log, which records the proposal as it records 2.2.
  assert.deepEqual(approved.changed.sort(), ['CHANGELOG.md', 'revisions/rising/brand.json', 'source/brand.json'])
  assert.deepEqual(approved.missing, [])
  assert.ok(approved.added.length > 0 && approved.added.every((path) => path.startsWith('revisions/data-design-connection/')), approved.added.join(', '))

  const rising = compareRenders(golden.rising, now.rising)
  assert.deepEqual(rising.changed.sort(), ['CHANGELOG.md', 'source/brand.json'])
  assert.deepEqual(rising.missing, [])
  assert.deepEqual(rising.added, [])
})

test('the comparison reports a changed render, a missing path and an extra one', () => {
  const expected = { 'a.svg': '1', 'b.svg': '2' }
  assert.deepEqual(compareRenders(expected, { 'a.svg': '1', 'b.svg': 'x' }), { changed: ['b.svg'], missing: [], added: [] })
  assert.deepEqual(compareRenders(expected, { 'a.svg': '1' }), { changed: [], missing: ['b.svg'], added: [] })
  assert.deepEqual(compareRenders(expected, { ...expected, 'c.svg': '3' }), { changed: [], missing: [], added: ['c.svg'] })
})
