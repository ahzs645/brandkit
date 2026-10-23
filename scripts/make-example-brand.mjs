// Regenerates brands/northwind/brand.json: an example brand made entirely by the starter, to show
// that nothing in the engine is particular to ddcnorth.
//
//   node scripts/make-example-brand.mjs

import { extendBrandPatterns } from './brands/pattern-collections.mjs'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createStarterBrand, STARTER_FONTS } from '../src/engine/starter.js'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'

const folder = new URL('../brands/northwind/', import.meta.url).pathname
mkdirSync(folder, { recursive: true })
const fonts = await loadBrandFontsFromDisk({ fonts: STARTER_FONTS }, folder)
const brand = createStarterBrand({ name: 'northwind', tagline: 'Steady progress, clearly made.', parent: 'nw' }, fonts)
await extendBrandPatterns(brand, folder)
writeFileSync(`${folder}brand.json`, `${JSON.stringify(brand, null, 2)}\n`)
console.log(`brands/northwind/brand.json: ${brand.families.length} families, ${brand.templates.length} templates, ${brand.guide.pages.length} guide pages`)
