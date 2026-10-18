// The engine against the kit it replaces: ddcnorth v2.1 as the Python builders made it.
//
// The reference files are not part of this repository. Point DDCNORTH_KIT at an unzipped copy of
// the original kit to run these; without it they are skipped.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { planKit } from '../src/engine/kit.js'
import { brand } from './fixtures.js'

const KIT = process.env.DDCNORTH_KIT
const skip = !KIT || !existsSync(KIT) ? 'set DDCNORTH_KIT to the original kit to compare against it' : false
const ctx = { brand }

// Files the engine reproduces byte for byte.
const EXACT = /^(logos\/outlined|logos\/editable-text|symbol|patterns|icons|templates)\/[^/]+\.svg$|^web\/(app-icon|favicon)\.svg$/

// Templates added since (the application system, `extension: 'applications'`) are not in it.
const added = new Set((brand.templates ?? []).filter((template) => template.extension).map((template) => `templates/${template.id}.svg`))

test('vector artwork matches the original kit byte for byte', { skip }, () => {
  const entries = planKit(brand, { rasters: false, pdfs: false, assets: false }).filter((entry) => EXACT.test(entry.path) && !added.has(entry.path))
  assert.ok(entries.length === 48, `${entries.length} files compared`)
  const differ = []
  for (const entry of entries) {
    const reference = join(KIT, entry.path)
    if (!existsSync(reference)) { differ.push(`${entry.path}: not in the original kit`); continue }
    if (entry.make(ctx) !== readFileSync(reference, 'utf8')) differ.push(entry.path)
  }
  assert.deepEqual(differ, [])
})

test('the original kit has nothing the engine leaves out', { skip }, () => {
  const planned = new Set(planKit(brand).map((entry) => entry.path))
  const listed = readFileSync(join(KIT, 'manifest.txt'), 'utf8').split('\n')
    .map((line) => line.trim().split(/\s+/).pop()).filter((path) => path && /\.(svg|png|pdf|ico|json|css|tsx|html|gpl)$/.test(path))
  const ignored = /^(reference\/legacy-v1\/|guidelines\/(VALIDATION|browser-validation)\.json|guidelines\/(cover|asset)-preview\.png|guidelines\/font-comparison\.png|source\/)/
  const missing = listed.filter((path) => !planned.has(path) && !ignored.test(path))
  assert.deepEqual(missing, [])
})
