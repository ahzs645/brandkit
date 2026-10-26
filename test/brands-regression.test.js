// No regression for the other brands with fixed wordmarks: First Form and northwind render as they
// did at the overtheedge-brand branch's base (3a7cd38), every vector and text file of their kits.
// The manifest is made by scripts/golden-base.mjs --brands; see docs/PLANS.md, OTE-003.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { compareRenders, computeBrandRenders } from '../scripts/golden-base.mjs'

const golden = JSON.parse(readFileSync(new URL('./fixtures/base-3a7cd38-brands.json', import.meta.url), 'utf8'))
const root = new URL('..', import.meta.url).pathname
const documentAdditions = (id) => [
  'guidelines/documentation.md', 'source/consumer-profile.json',
  'source/document-profile-letter.json', 'source/document-profile-a4.json',
  ...['product', 'report', 'brief', 'portfolio'].flatMap((purpose) => ['letter', 'a4'].flatMap((paper) =>
    ['html', 'json'].map((extension) => `documents/${id}-publication-${purpose}-${paper}.${extension}`)))
]

test('First Form and northwind retain their original renders alongside named pattern additions', async () => {
  const now = await computeBrandRenders(root, Object.keys(golden))
  for (const id of Object.keys(golden)) {
    const brand = JSON.parse(readFileSync(`${root}/brands/${id}/brand.json`, 'utf8'))
    const delta = compareRenders(golden[id], now[id])
    // First Form's web tokens now carry its specified 600 heading weight. Its artwork
    // must still match every original hash; documentation is an explicitly enumerated addition.
    assert.deepEqual(delta.changed, ['source/brand.json', ...(id === 'firstform' ? ['web/tokens.json'] : [])], `${id}: only the definition and corrected type tokens change`)
    assert.deepEqual(delta.missing, [], `${id}: all original exports remain`)
    const added = [
      ...documentAdditions(id),
      'guidelines/pattern-studies.svg',
      ...brand.patternCollection.patterns.map(key => `patterns/${key}.svg`),
      ...brand.patternCollection.templates.map(key => `templates/${key}.svg`),
      ...Object.keys(brand.symbols ?? {}).filter(key => key.startsWith('explore-')).flatMap(key => brand.logoColours.map(ink => `symbol/${id}-symbol-${key}-${ink === 'currentColor' ? 'currentcolor' : ink}.svg`))
    ]
    assert.deepEqual(delta.added.sort(), added.sort(), `${id}: only explicitly named studies and document exports are added`)
  }
})
