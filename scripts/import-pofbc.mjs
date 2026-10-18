// Brings the British Columbia artwork brandkit's two BC example brands are built on in from a
// PofBC checkout (github.com/ahzs645/PofBC), where it was reconstructed:
//
//   brands/bc-hydro-1983/artwork.json      the four signatures and both symbols, BC Hydro, 1983
//   brands/bc-province-1977/artwork.json   the Provincial Symbol and the ministries of 1976–1986
//
// The artwork is copied as PofBC draws it. Colours become roles ({ink}, {upper}, {lower}) so a
// colourway can paint them; the type in BC Hydro's signatures is already outlined (TeX Gyre
// Termes, fitted letter by letter to the manual), so it is fixed artwork here, as the manual says
// a signature must be. scripts/assemble-bc-brands.mjs then writes each brand.json from it.
//
//   node scripts/import-pofbc.mjs /path/to/PofBC

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const pofbc = resolve(process.argv[2] ?? '../PofBC')
const from = (path) => import(pathToFileURL(resolve(pofbc, path)).href)
const out = (brand, data) => {
  const folder = new URL(`../brands/${brand}/`, import.meta.url)
  mkdirSync(folder, { recursive: true })
  writeFileSync(new URL('artwork.json', folder), `${JSON.stringify(data, null, 1)}\n`)
  console.log(`brands/${brand}/artwork.json`)
}

// BC Hydro.
const { renderHydroSvg, symbolMarkup } = await from('src/hydro/renderHydroSvg.js')
const { hydroDefaults, HYDRO_TYPES } = await from('src/hydro/hydroLayout.js')
const ROLES = { '#000000': '{ink}', '#00af00': '{upper}', '#0069a2': '{lower}' }
const roles = (markup) => markup
  .replace(/\s(fill|stroke)="(#[0-9a-f]{6})"/gi, (match, attribute, hex) => ` ${attribute}="${ROLES[hex.toLowerCase()] ?? hex}"`)
  .replace(/\sid="[^"]*"/g, '')
const signatures = {}
for (const type of ['standard', 'gas', 'rail', 'authority']) {
  const settings = { ...hydroDefaults(type), mode: 'colour', background: 'transparent' }
  const { svg, scene } = renderHydroSvg(settings, { metadata: false, prefix: 'bch' })
  const body = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/<title[^>]*>.*?<\/title>/, '')
  const pad = settings.padding
  const { x, y, width, height } = scene.view
  // Where the logotype sits, in signature units: its baseline, the left of its first letter and
  // its cap height (Termes capitals are 662/1000 em), so a template can set "a 36 point signature"
  // and hang it from its baseline or the "B", as the manual measures it.
  const first = type === 'authority'
    ? /data-text="British Columbia Hydro" transform="matrix\(([-\d.]+) [-\d.]+ [-\d.]+ ([-\d.]+) ([-\d.]+) ([-\d.]+)\)"[^>]*><path transform="translate\(0 0\) scale\(([-\d.]+)\)"/.exec(body)
    : /data-text="B" transform="matrix\(([-\d.]+) [-\d.]+ [-\d.]+ ([-\d.]+) ([-\d.]+) ([-\d.]+)\)"/.exec(body)
  const [, , sy, tx, ty, inner = 1] = first.map(Number)
  const metrics = { font: 'body', baseline: ty, logotypeX: tx, capHeight: sy * Number(inner) * 662 }
  signatures[type] = { label: HYDRO_TYPES[type], markup: roles(body), bounds: [x + pad, y + pad, x + width - pad, y + height - pad], metrics }
}
const symbolFor = (variant) => {
  const settings = { ...hydroDefaults(variant === 'gas' ? 'gas' : 'standard'), mode: 'colour' }
  const { scene } = renderHydroSvg(settings, { metadata: false })
  const symbol = { ...scene.symbols[0], x: 0, y: 0, size: 1000 }
  return roles(symbolMarkup(symbol, 'bch-symbol').replace(/^<g[^>]*transform="[^"]*">/, '<g>'))
}
out('bc-hydro-1983', {
  source: 'PofBC src/hydro (renderHydroSvg), reconstructed from the BC Hydro Graphic Standards Manual, 1983',
  symbols: {
    ring: { viewBox: [0, 0, 1000, 1000], markup: symbolFor('circle') },
    gas: { viewBox: [0, -720, 1000, 1720], markup: symbolFor('gas') }
  },
  signatures
})

// The Province.
const { PROVINCIAL_MARK } = await from('src/assets/markup.js')
const { MINISTRY_EPISODES } = await from('src/ministries/ministryHistory.js')
const ministries = MINISTRY_EPISODES
  .filter((episode) => episode.from <= 1986 && (episode.to == null || episode.to >= 1976))
  .sort((a, b) => a.name.localeCompare(b.name) || a.from - b.from)
  .map((episode) => ({ name: episode.name, from: episode.from, to: episode.to ?? null }))
out('bc-province-1977', {
  source: 'PofBC src/assets/markup.js (the Provincial Symbol, crest and ring) and src/ministries (ministry history)',
  symbol: { viewBox: [0, 0, PROVINCIAL_MARK.viewBox.width, PROVINCIAL_MARK.viewBox.height], markup: PROVINCIAL_MARK.inner },
  ministries
})
