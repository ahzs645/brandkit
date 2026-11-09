// Prepare a real consumer from the same Northwind source that Brandkit ships.
// Generated fonts and artwork stay out of git; rerun after editing the brand or adapter.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { astryxThemeConfig, astryxThemeModule, astryxThemeReport } from '../../src/engine/astryx.js'
import { consumerProfile } from '../../src/engine/consumer.js'
import { brandCss } from '../../src/engine/web.js'
import { loadBrandFontsFromDisk, readAssetFromDisk } from '../../src/fonts/node.js'
import { readBrandAsset } from '../../src/assets.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const folder = fileURLToPath(new URL('../../brands/northwind/', import.meta.url))
const brand = JSON.parse(await readFile(resolve(folder, 'brand.json'), 'utf8'))
const fonts = await loadBrandFontsFromDisk(brand, folder)
if (fonts.failures.length) throw new Error(fonts.failures.map(({ key, error }) => `${key}: ${error.message}`).join('; '))
const ctx = { brand, fonts }
const generated = resolve(here, 'generated')
const publicBrand = resolve(here, 'public/brand')
await mkdir(generated, { recursive: true })
await mkdir(resolve(publicBrand, 'web'), { recursive: true })

await writeFile(resolve(generated, 'theme.js'), astryxThemeModule(ctx))
await writeFile(resolve(generated, 'theme.json'), `${JSON.stringify(astryxThemeConfig(ctx), null, 2)}\n`)
await writeFile(resolve(generated, 'report.json'), `${JSON.stringify(astryxThemeReport(ctx), null, 2)}\n`)
await writeFile(resolve(publicBrand, 'web/brand.css'), brandCss(ctx))
const profile = consumerProfile(ctx)
for (const variant of ['primary', 'reverse']) {
  await writeFile(resolve(publicBrand, `logo-${variant}.svg`), profile.logos[variant].svg)
}
const webFonts = [...new Set(Object.values(brand.fonts ?? {}).map((font) => font.web).filter(Boolean))]
for (const file of webFonts) {
  const target = resolve(publicBrand, file)
  if (!target.startsWith(publicBrand + sep)) throw new Error(`Font path leaves the generated brand folder: ${file}`)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, new Uint8Array(await readBrandAsset(brand, file, (path) => readAssetFromDisk(folder, path))))
}

// A deliberately different accent tests nested theme isolation. This is a demo scope,
// not a new approved Northwind colourway; it has no altered brand artwork.
const secondary = structuredClone(brand)
secondary.id = 'secondary-demo'
secondary.name = 'Secondary demo scope'
secondary.colours.primary = '#8A3F17'
await writeFile(resolve(generated, 'secondary-theme.js'), astryxThemeModule({ brand: secondary }))
await writeFile(resolve(generated, 'secondary-theme.json'), `${JSON.stringify(astryxThemeConfig({ brand: secondary }), null, 2)}\n`)
console.log(`Prepared ${brand.name}: two theme scopes, original outlined logos and ${webFonts.length} local web fonts.`)
