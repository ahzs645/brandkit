// The Motion tab's list, tokens and easing curves, and the one list of colours the overview and
// the brand editor show.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { easingPath, isLogoStudy, motionGroups, stageCss, tokenRows } from '../src/app/motion.js'
import { colourEntries, editableRoles } from '../src/app/colours.js'
import { withRevision } from '../src/engine/revisions.js'

const read = (id) => JSON.parse(readFileSync(new URL(`../brands/${id}/brand.json`, import.meta.url), 'utf8'))

test('motion groups follow the brand’s own groups, or each study’s group', () => {
  const ddc = withRevision(read('ddcnorth'), 'data-design-connection').motion
  const groups = motionGroups(ddc)
  assert.deepEqual(groups.map((group) => group.id), ddc.groups.map((group) => group.id))
  assert.equal(groups.flatMap((group) => group.studies).length, ddc.studies.length)
  const firstform = read('firstform').motion
  assert.deepEqual(motionGroups(firstform).map((group) => group.label), ['Logo', 'Loading', 'Interface'])
  assert.deepEqual(firstform.studies.filter(isLogoStudy).map((study) => study.id), ['assemble', 'build', 'draw', 'turn'])
  assert.deepEqual(motionGroups({ groups: [{ id: 'a', kinds: ['A'] }], studies: [{ id: 'x', kind: 'A' }, { id: 'y', kind: 'B' }] }).map((group) => group.id), ['a', 'other'])
})

test('motion tokens, easing curves and stage styles', () => {
  assert.deepEqual(tokenRows({ durations: { quick: 200 }, stagger: { field: [20, 30], loaderStep: 200 }, distance: 24 }),
    [['quick', '200 ms', 200], ['stagger · field', '20–30 ms', null], ['stagger · loaderStep', '200 ms', null], ['distance', '24 px', null]])
  assert.equal(easingPath('cubic-bezier(.2, .7, .2, 1)'), 'M0 100C20 30 20 0 100 0')
  assert.equal(easingPath('linear'), 'M0 100C0 100 100 0 100 0')
  assert.equal(stageCss(":root { --a: 1ms; }\n@font-face { font-family: 'X'; src: url(x.ttf); }\n.b { c: d; }"), ':host { --a: 1ms; }\n\n.b { c: d; }')
})

test('one list of colours: each palette colour with its roles, then roles with a colour of their own', () => {
  const brand = read('ddcnorth')
  const entries = colourEntries(brand)
  assert.equal(entries.length, Object.keys(brand.colours).length + 2)
  assert.deepEqual(entries.find((entry) => entry.key === 'midnight'), { key: 'midnight', name: 'Midnight', hex: '#0B2B4A', own: false, roles: ['primary'] })
  assert.deepEqual(entries.filter((entry) => entry.own).map(({ key, hex, roles }) => [key, hex, roles]), [['line', '#D9DCDF', ['line']], ['rule', '#CFD2D4', ['rule']]])
  // Every role is on exactly one entry.
  assert.deepEqual(entries.flatMap((entry) => entry.roles).sort(), Object.keys(brand.roles).sort())
  assert.deepEqual(editableRoles({ colours: { a: '#000000' }, roles: { ink: 'a', line: '#EEEEEE', other: 'ink' } }), ['ink', 'line'])
  const firstform = colourEntries(read('firstform'))
  assert.deepEqual(firstform.find((entry) => entry.key === 'black').roles, ['ink', 'primary'])
  assert.ok(!firstform.some((entry) => entry.own))
})
