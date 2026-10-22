// The Motion tab's list, tokens and easing curves; the one list of colours, its contrast, print
// values and tints; and the example motion libraries for the two BC identities.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { easingPath, isLogoStudy, motionGroups, stageCss, tokenRows, tokensCss, tokensJson } from '../src/app/motion.js'
import { cmykLabel, cmykOf, colourEntries, contrast, editableRoles, grade, printValues, rolePairs, tint, tintsOf } from '../src/app/colours.js'
import { planKit } from '../src/engine/kit.js'
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

test('motion tokens as CSS custom properties and W3C design tokens', () => {
  const tokens = { durations: { quick: 200 }, easings: { settle: 'cubic-bezier(.2,.7,.2,1)', linear: 'linear' }, stagger: { field: [20, 30], loaderStep: 200 }, distance: 24 }
  assert.equal(tokensCss(tokens, 'ddc'), ':root {\n  --ddc-quick: 200ms;\n  --ddc-ease-settle: cubic-bezier(.2,.7,.2,1);\n  --ddc-ease-linear: linear;\n  --ddc-stagger-field-min: 20ms;\n  --ddc-stagger-field-max: 30ms;\n  --ddc-stagger-loader-step: 200ms;\n  --ddc-distance: 24px;\n}\n')
  const { motion } = JSON.parse(tokensJson(tokens))
  assert.deepEqual(motion.duration.quick, { $type: 'duration', $value: { value: 200, unit: 'ms' } })
  assert.deepEqual(motion.easing.settle, { $type: 'cubicBezier', $value: [0.2, 0.7, 0.2, 1] })
  assert.deepEqual(motion.easing.linear.$value, [0, 0, 1, 1])
  assert.equal(motion.stagger.field.max.$value.value, 30)
  assert.equal(motion.distance.$type, 'dimension')
})

test('contrast and its WCAG grades, print values and tints', () => {
  assert.equal(contrast('#000000', '#FFFFFF'), 21)
  assert.equal(contrast('#777777', '#777777'), 1)
  assert.deepEqual([7, 4.5, 3, 2.9].map(grade), ['AAA', 'AA', 'AA large', 'Fail'])
  assert.deepEqual(cmykOf('#000000'), [0, 0, 0, 100])
  assert.equal(cmykLabel(cmykOf('#FFFFFF')), 'C0 M0 Y0 K0')
  assert.equal(cmykLabel(cmykOf('#FF0000')), 'M100 Y100')
  assert.equal(tint('#000000', 20), '#CCCCCC')
  assert.equal(tint('#0B2B4A', 100), '#0B2B4A')
  const hydro = read('bc-hydro-1983')
  // A recipe from the manual wins over a conversion, and a Pantone is named.
  assert.deepEqual(printValues(hydro, 'green', hydro.colours.green), { pantone: 'Pantone 376', cmyk: 'C50 Y100', converted: false })
  assert.equal(printValues(hydro, 'grey', hydro.colours.grey).converted, true)
  const ddc = read('ddcnorth')
  const pairs = rolePairs(ddc)
  assert.equal(pairs.length, 6)
  assert.ok(pairs.every((pair) => pair.ratio >= 4.5), 'every ddcnorth role pair reads at AA')
  const steps = tintsOf(ddc, ddc.colours.midnight)
  assert.deepEqual(steps.map((step) => step.percent), [100, 80, 60, 40, 20])
  assert.equal(steps[0].text, ddc.colours.white, 'reverse text on full midnight')
  assert.equal(steps.at(-1).text, ddc.colours.black, 'ink on a 20% tint')
})

test('the BC identities carry example motion libraries, drawn from their own artwork', () => {
  for (const [id, count] of [['bc-hydro-1983', 7], ['bc-province-1977', 5]]) {
    const brand = read(id)
    const { motion } = brand
    assert.equal(motion.studies.length, count, id)
    assert.match(motion.note, /predates screen motion/)
    assert.ok(motion.studies.some(isLogoStudy), `${id} has logo studies`)
    const folder = new URL(`../brands/${id}/`, import.meta.url)
    const page = readFileSync(new URL(motion.page, folder), 'utf8')
    for (const study of motion.studies) assert.match(page, new RegExp(`class="stage stage--[a-z-]+ play" data-study="${study.id}"`), `${id}/${study.id}`)
    assert.ok(!page.includes('<text'), `${id}: type is outlined, so every study draws the same anywhere`)
    const css = readFileSync(new URL(motion.css, folder), 'utf8')
    assert.match(css, /prefers-reduced-motion: reduce/)
    for (const path of ['motion/index.html', 'motion/motion.css', 'motion/motion-tokens.json', 'motion/README.md']) {
      assert.ok(brand.files.includes(path), `${id}: ${path} in files`)
      assert.ok(planKit(brand).some((entry) => entry.path.endsWith(path)), `${id}: ${path} in the kit`)
    }
  }
})

test('each built-in brand has its menu logo, as scripts/menu-logos.mjs draws it', async () => {
  const { menuLogo } = await import('../src/app/masthead.js')
  const { loadBrandFontsFromDisk } = await import('../src/fonts/node.js')
  const { readdirSync, existsSync } = await import('node:fs')
  const root = new URL('../brands/', import.meta.url)
  for (const id of readdirSync(root).filter((entry) => existsSync(new URL(`${entry}/brand.json`, root)))) {
    const folder = new URL(`${id}/`, root)
    const brand = read(id)
    const drawn = menuLogo(brand, await loadBrandFontsFromDisk(brand, folder.pathname))
    assert.equal(readFileSync(new URL('logo-menu.svg', folder), 'utf8'), drawn, `${id}: run node scripts/menu-logos.mjs`)
    assert.ok(!drawn.includes('<text'), `${id}: type outlined`)
  }
})
