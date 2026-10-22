// No regression for the other brands with fixed wordmarks: First Form and northwind render as they
// did at the overtheedge-brand branch's base (3a7cd38), every vector and text file of their kits.
// The manifest is made by scripts/golden-base.mjs --brands; see docs/PLANS.md, OTE-003.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { compareRenders, computeBrandRenders } from '../scripts/golden-base.mjs'

const golden = JSON.parse(readFileSync(new URL('./fixtures/base-3a7cd38-brands.json', import.meta.url), 'utf8'))
const root = new URL('..', import.meta.url).pathname

test('First Form and northwind render as at 3a7cd38', async () => {
  const now = await computeBrandRenders(root, Object.keys(golden))
  for (const id of Object.keys(golden)) {
    assert.deepEqual(compareRenders(golden[id], now[id]), { changed: [], missing: [], added: [] }, id)
  }
})
