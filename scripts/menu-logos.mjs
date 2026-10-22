// Draws each built-in brand's logo for the app's brand menu, with its type outlined, into
// brands/<id>/logo-menu.svg: the masthead's art, in currentColor, so the menu can show every
// brand's real logo without loading every brand's definition. Run after changing a brand's logo;
// test/engine.test.js checks the files match what this draws.
//
//   node scripts/menu-logos.mjs

import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { loadBrandFontsFromDisk } from '../src/fonts/node.js'
import { menuLogo } from '../src/app/masthead.js'

const root = new URL('../brands/', import.meta.url)
for (const id of readdirSync(root).filter((entry) => existsSync(new URL(`${entry}/brand.json`, root))).sort()) {
  const folder = new URL(`${id}/`, root)
  const brand = JSON.parse(readFileSync(new URL('brand.json', folder), 'utf8'))
  const svg = menuLogo(brand, await loadBrandFontsFromDisk(brand, folder.pathname))
  writeFileSync(new URL('logo-menu.svg', folder), svg)
  console.log(`brands/${id}/logo-menu.svg: ${svg.length} bytes`)
}
