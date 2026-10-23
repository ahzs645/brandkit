// ddcnorth v2.3, approved (scripts/brands/ddcnorth-accept-v23.mjs): brand.json is the v2.1
// definition with the v2.3 revision merged in, its history recorded, and the logo unchanged.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { planKit, validateBrand, withRevision } from '../src/engine/index.js'
import { motionUrl } from '../src/app/motion.js'

const folder = new URL('../brands/ddcnorth/', import.meta.url).pathname
const brand = JSON.parse(readFileSync(`${folder}brand.json`, 'utf8'))
const v21 = JSON.parse(readFileSync(`${folder}history/2.1/brand.json`, 'utf8'))
const proposed = withRevision(v21, 'data-design-connection')
// Later supporting studies are explicitly additive; all approved v2.3 entries still match
// the original proposal. Their IDs, metadata and source preservation are checked separately
// in pattern-collections.test.js.
const approvedEntries = (items) => items.filter((item) => item?.extension !== 'pattern-explorations')

test('brand.json is approved v2.3, valid, with no open revisions', () => {
  assert.equal(brand.version, '2.3-data-design-connection')
  assert.equal(brand.displayVersion, '2.3')
  assert.deepEqual(validateBrand(brand), [])
  assert.ok(!('revisions' in brand) && !('revision' in brand))
  assert.equal(brand.copy.descriptor, 'Data · Design · Connection')
  assert.match(brand.guide.frame.footer, /APPROVED 22 OCTOBER 2026$/)
  assert.ok(!JSON.stringify({ ...brand, history: null }).includes('$append'))
})

test('everything v2.3 proposed is in it, and the logo and symbol are v2.1’s', () => {
  for (const key of ['templates', 'patterns', 'sets', 'files']) assert.deepEqual(approvedEntries(brand[key]).map((item) => item.id ?? item.to ?? item), proposed[key].map((item) => item.id ?? item.to ?? item), key)
  assert.deepEqual(brand.icons.items.map((item) => item.id), proposed.icons.items.map((item) => item.id))
  assert.deepEqual(brand.guide.pages.map((page) => page.title), proposed.guide.pages.map((page) => page.title))
  assert.deepEqual(brand.motion, proposed.motion)
  for (const key of ['symbol', 'wordmark', 'families', 'lockup', 'colours', 'roles', 'logoColours', 'fonts']) assert.deepEqual(brand[key], v21[key], key)
})

test('the history: v2.1 superseded and kept, 2.2 archived with its changes, v2.3 approved', () => {
  assert.deepEqual(brand.history.map((entry) => [entry.id ?? entry.displayVersion, entry.status]), [['2.1', 'superseded'], ['rising', 'archived'], ['data-design-connection', 'approved']])
  assert.ok(existsSync(`${folder}${brand.history[0].definition}`))
  const rising = v21.revisions.find((entry) => entry.id === 'rising')
  assert.deepEqual(brand.history[1].changes, rising.changes, 'the archived proposal can be proposed again')
  assert.ok(!('changes' in brand.history[2]), 'the approved changes are the definition now')
})

test('nothing outside the history still calls it a proposal', () => {
  const { history: _history, ...rest } = brand
  const wording = JSON.stringify(rest).match(/[^"]{0,30}\b[Pp]ropos(?:ed|al)\b[^"]{0,30}/g) ?? []
  assert.deepEqual(wording.filter((line) => !/proposals/i.test(line)), [])
  for (const path of ['motion/index.html', 'docs/brand-details.html', 'motion/README.md']) assert.ok(!/proposed v2\.3/i.test(readFileSync(`${folder}${path}`, 'utf8')), path)
})

test('the kit carries the motion library and the new work at its top level, and no revisions', () => {
  const plan = planKit(brand)
  const paths = plan.map((entry) => entry.path)
  assert.equal(new Set(paths).size, paths.length, 'no path twice')
  assert.ok(!paths.some((path) => path.startsWith('revisions/')))
  for (const path of ['motion/index.html', 'motion/motion.css', 'guidelines/brand-details.html', 'templates/slide-finding.svg']) assert.ok(paths.includes(path), path)
  // The logo files are the same artwork v2.1 drew.
  const byPath = (list, path) => list.find((entry) => entry.path === path)
  for (const path of ['logos/outlined/ddcnorth-horizontal-black.svg', 'symbol/ddcnorth-symbol-black.svg']) {
    const now = byPath(plan, path)
    const then = byPath(planKit(v21), path)
    assert.ok(now && then, path)
    assert.equal(now.make({ brand }), then.make({ brand: v21 }), path)
  }
})

test('the Motion tab opens for the approved brand', () => {
  const source = { url: (path) => (existsSync(`${folder}${path}`) ? `/brands/ddcnorth/${path}` : null) }
  assert.equal(motionUrl(brand, source), '/brands/ddcnorth/motion/index.html')
})
