import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { unzipSync, strFromU8 } from 'fflate'
import { printerUrl } from '../src/printer/bridge.js'
const STAFF_CARD_PACKAGE = 'templates/staff-card.zip'

test('printer and preset URLs follow the host deployment prefix', () => {
  for (const path of ['/', '/brandkit/', '/renamed-project/']) {
    const base = `https://example.com${path}`
    const empty = new URL(printerUrl(base))
    const preset = new URL(printerUrl(base, STAFF_CARD_PACKAGE))
    assert.equal(empty.pathname, `${path}template-printer/`)
    assert.equal(empty.search, '')
    assert.equal(preset.pathname, empty.pathname)
    assert.equal(preset.searchParams.get('url'), `${base}${STAFF_CARD_PACKAGE}`)
  }
})

test('staff-card package is the original with both sides, fields and fonts intact', () => {
  const bytes = readFileSync(new URL('../brands/overtheedge/templates/staff-card.zip', import.meta.url))
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '1528ad01b4039be80ba833ccb9eb45e6eb542803970586d7679a35e4b8410457')
  const files = unzipSync(bytes)
  const manifest = JSON.parse(strFromU8(files['manifest.json']))
  assert.equal(manifest.format, 'template-printer-package')
  assert.equal(manifest.version, 1)
  assert.equal(manifest.name, 'Staff Card')
  for (const side of Object.values(manifest.sides)) assert.ok(files[side.file]?.length)
  assert.equal(manifest.sides.front.fields.length, 2)
  assert.equal(manifest.fonts.length, 2)
  for (const font of manifest.fonts) assert.ok(files[font.file]?.length)
  assert.equal(manifest.sampleData['fullname-first-linebreak-last_1'], 'Hyunseo Kim')
})
