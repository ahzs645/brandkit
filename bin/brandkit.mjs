#!/usr/bin/env node
// brandkit from a terminal: writes a brand's vector and text files to a folder.
//
//   brandkit build path/to/brand.json [--out folder]
//   brandkit check path/to/brand.json
//
// Images and PDFs are drawn by a browser's canvas and PDF engine, so they come from the app
// (Download kit). Everything else (logos, symbols, templates, the guide as SVG, the web files,
// the fonts and documents the brand supplies) is written here, byte for byte what the app writes.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { buildKit } from '../src/engine/kit.js'
import { validateBrand } from '../src/engine/brand.js'
import { loadBrandFontsFromDisk, readAssetFromDisk } from '../src/fonts/node.js'

const [command, file, ...rest] = process.argv.slice(2)
const option = (name) => { const index = rest.indexOf(name); return index >= 0 ? rest[index + 1] : undefined }

if (!command || !file || !['build', 'check'].includes(command)) {
  console.log('usage: brandkit build <brand.json> [--out folder]\n       brandkit check <brand.json>')
  process.exit(command ? 1 : 0)
}

const path = resolve(file)
const folder = dirname(path)
const brand = JSON.parse(await readFile(path, 'utf8'))
const problems = validateBrand(brand)
if (problems.length) {
  console.error(problems.map((problem) => `  ✗ ${problem}`).join('\n'))
  process.exit(1)
}
if (command === 'check') {
  console.log(`${brand.name}: no problems found`)
  process.exit(0)
}

const fonts = await loadBrandFontsFromDisk(brand, folder)
for (const { key, file: fontFile, error } of fonts.failures) console.warn(`  ! font ${key} (${fontFile}): ${error.message}; its text stays live`)
const out = resolve(option('--out') ?? `${brand.id}-kit`)
const { files, skipped } = await buildKit({ brand, fonts }, { readAsset: (src) => readAssetFromDisk(folder, src) })
for (const [relative, bytes] of files) {
  await mkdir(dirname(join(out, relative)), { recursive: true })
  await writeFile(join(out, relative), bytes)
}
for (const { path: skippedPath, error } of skipped) console.warn(`  ! ${skippedPath}: ${error.message}`)
console.log(`${brand.name}: ${files.size} files written to ${out}`)
