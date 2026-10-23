// ddcnorth v2.3, approved: data, design, connection.
//
// Makes brands/ddcnorth/brand.json from the v2.1 definition kept in history/2.1/brand.json: the
// v2.3 revision merged in (withRevision, the same merge the app and kits use to preview it), its
// wording turned from a proposal into the identity, and no open revisions. What happened is
// recorded in `history`: v2.1 superseded, the 2.2 rising proposal archived (its changes kept, so
// it can be proposed again), and v2.3 approved. The v2.1 definition is left as it is, so the
// original kit can still be rebuilt from it byte for byte (test/parity.test.js).
//
//   npm run make:ddcnorth-v23   (proposes v2.3 in the v2.1 definition, then runs this)

import { extendBrandPatterns } from './pattern-collections.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { withRevision } from '../../src/engine/revisions.js'
import { updateManifest } from './common.mjs'

const root = new URL('../../brands/ddcnorth/', import.meta.url)
const HISTORY = 'history/2.1/brand.json'
const base = JSON.parse(readFileSync(new URL(HISTORY, root), 'utf8'))
const ACCEPTED = 'data-design-connection'
const ARCHIVED = 'rising'
const DATE = '2026-10-22'

const proposal = base.revisions.find((revision) => revision.id === ACCEPTED)
const archived = base.revisions.find((revision) => revision.id === ARCHIVED)
if (!proposal || !archived) throw new Error(`${HISTORY} needs the ${ACCEPTED} and ${ARCHIVED} revisions`)

const merged = withRevision(base, ACCEPTED)
delete merged.revision
delete merged.revisions

// What said "proposed" now says what is: v2.3 is the identity.
const REWORDED = [
  [' Part of the proposed v2.3. ', ' New in v2.3. '],
  ['A proposal for v2.3: ', 'New in v2.3: '],
  [' / PROPOSED 22 OCTOBER 2026', ' / APPROVED 22 OCTOBER 2026']
]
let text = JSON.stringify(merged)
for (const [from, to] of REWORDED) {
  if (!text.includes(from)) throw new Error(`Nothing to reword: ${from}`)
  text = text.split(from).join(to)
}
const brand = JSON.parse(text)
const left = JSON.stringify(brand).match(/[^"]{0,40}\b[Pp]ropos(?:ed|al)\b[^"]{0,40}/g)?.filter((line) => !/PROPOSALS|proposals/i.test(line)) ?? []
if (left.length) throw new Error(`Proposal wording left in the approved definition:\n${left.join('\n')}`)

brand.status = 'v2.3 approved 22 October 2026: the descriptor Data · Design · Connection, a data language, patterns, templates, icons and motion, on v2.1’s equal dot spacing. The logo and symbol are unchanged.'
const { changes: _merged, ...approvedRecord } = proposal
brand.history = [
  { version: base.version, displayVersion: base.displayVersion, status: 'superseded', date: '2026-10-10', summary: base.status, definition: HISTORY },
  { ...archived, status: 'archived', archived: DATE, note: 'Archived when v2.3 was approved. Its changes are kept here, so it can be proposed again as a revision of v2.3.' },
  { ...approvedRecord, status: 'approved', approved: DATE, note: 'Merged into this definition.' }
]

await extendBrandPatterns(brand, root)
writeFileSync(new URL('brand.json', root), `${JSON.stringify(brand, null, 2)}\n`)
updateManifest(brand)
console.log(`brands/ddcnorth/brand.json: v${brand.displayVersion}, approved; ${brand.templates.length} templates, ${brand.patterns.length} patterns, ${brand.guide.pages.length} guide pages, ${brand.motion.studies.length} motion studies; ${brand.history.length} history entries`)
