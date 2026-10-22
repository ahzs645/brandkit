// First Form: the brand rebuilt from its PNG-only kit (scripts/brands/firstform.mjs).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { colour, planKit, renderTemplate, validateBrand } from '../src/engine/index.js'
import { guidePages, guideSheets } from '../src/engine/guide.js'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'

const folder = new URL('../brands/firstform/', import.meta.url).pathname
const brand = JSON.parse(readFileSync(`${folder}brand.json`, 'utf8'))

/** Every point of a path made only of M, L and Z commands. */
const points = (d) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(([, x, y]) => [Number(x), Number(y)])

test('First Form validates, loads its fonts, and draws every template and guide page', async () => {
  assert.deepEqual(validateBrand(brand), [])
  const fonts = await loadBrandFontsFromDisk(brand, folder)
  assert.deepEqual(fonts.failures, [])
  for (const template of brand.templates) {
    const { svg } = renderTemplate({ brand, fonts, outline: true }, template)
    assert.ok(svg.includes('</svg>') && !/NaN|undefined/.test(svg), template.id)
  }
  for (const page of [...guidePages({ brand, fonts }), ...guideSheets({ brand, fonts })]) assert.ok(!/NaN|undefined/.test(page.render()), page.id)
  const plan = planKit(brand).map((entry) => entry.path)
  assert.equal(new Set(plan).size, plan.length, 'no path twice')
  assert.ok(plan.includes('logos/outlined/firstform-horizontal-black.svg'))
  assert.ok(plan.includes('guidelines/brand-details.html'))
})

test('the mark is two identical blocks, the second turned 180° about the centre', () => {
  const [, , width, height] = brand.symbol.viewBox
  for (const paths of [brand.symbol.paths, brand.symbol.microPaths]) {
    const [upper, lower] = paths.map((path) => points(path.d))
    assert.equal(upper.length, lower.length)
    upper.forEach(([x, y], index) => {
      const [tx, ty] = lower[index]
      assert.ok(Math.abs(width - x - tx) < 0.01 && Math.abs(height - y - ty) < 0.01, `point ${index}`)
    })
    for (const [x, y] of [...upper, ...lower]) assert.ok(x >= 0 && x <= width && y >= 0 && y <= height, 'inside the canvas')
  }
})

test('First Form uses only its own palette, and every file it ships exists', () => {
  const palette = new Set(Object.values(brand.colours))
  const used = brand.templates.flatMap((template) => template.elements.flatMap((element) => [element.fill, element.colour, element.stroke].filter(Boolean)))
  for (const value of used) assert.ok(value === 'none' || palette.has(colour(brand, value)), value)
  for (const file of brand.files) assert.ok(existsSync(`${folder}${typeof file === 'string' ? file : file.from}`), JSON.stringify(file))
})
