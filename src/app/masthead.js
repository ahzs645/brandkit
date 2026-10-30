// The art that stands for a brand in brandkit's own interface: the masthead logo, and the logo in
// the brand menu (pre-drawn for the built-in brands by scripts/menu-logos.mjs). A plain module, so
// that script and Node's tests can use it.

import { logoDocument, symbolDocument } from '../engine/artwork.js'

export const aspectOf = (svg) => {
  // Vite's inlined SVGs use single quotes; generated artwork uses double quotes.
  const [, , width, height] = svg?.match(/\bviewBox\s*=\s*(["'])(.*?)\1/)?.[2].trim().split(/[\s,]+/).map(Number) ?? []
  return width && height ? width / height : null
}

/**
 * The art for a masthead: the horizontal logo; for a brand of signatures, the first that is not
 * set for a department and is wide enough to read at masthead size; failing both, the symbol,
 * with the name beside it. The Province uses its two-line logotype beside the emblem.
 */
export const mastheadArt = (brand, fonts) => {
  if (brand.logoPolicy?.allowInheritedColour === false) {
    // A brand that forbids inheriting colour still permits its black, monochrome colourway: the
    // interface draws that one, with its black taking the ink, so it stands with every other
    // brand's logo in the masthead and the menu (and turns white, also permitted, in the dark).
    const mono = Object.entries(brand.colourways ?? {}).find(([, spec]) => /^#0{6}$/i.test(brand.colours?.[spec.all] ?? ''))
    const svg = logoDocument({ brand, fonts }, { signature: brand.signatures[0].id, colourway: mono?.[0] ?? brand.defaultColourway })
    return { svg: mono ? svg.replace(/(fill|stroke)="#0{6}"/gi, '$1="currentColor"') : svg }
  }
  if (brand.families?.length) return { svg: logoDocument({ brand, fonts }, { family: brand.families[0].id, layout: 'horizontal', colourKey: 'currentColor' }) }
  if (brand.id === 'bc-province-1977') {
    return { svg: logoDocument({ brand, fonts, values: { ministry: '', 'ministry-split': '', address: '' } }, { signature: 'horizontal', colour: 'currentColor' }) }
  }
  for (const signature of brand.signatures ?? []) {
    if (signature.departmental) continue
    const svg = logoDocument({ brand, fonts }, { signature: signature.id, colour: 'currentColor' })
    if (aspectOf(svg) >= 2.5) return { svg }
  }
  return { svg: brand.symbol ? symbolDocument({ brand, fonts }, { colourKey: 'currentColor' }) : null, named: true }
}


/**
 * The brand menu's logo: the masthead art, without the size, title or description of a document,
 * drawn in currentColor. A logo near square (a symbol) has the brand's name set beside it in the menu.
 */
export const menuLogo = (brand, fonts) => {
  const { svg } = mastheadArt(brand, fonts)
  return `${svg.replace(/<title>[\s\S]*?<\/title>|<desc>[\s\S]*?<\/desc>/g, '').replace(/<svg[^>]*>/, (tag) => tag.replace(/\s(width|height|role|aria-label)="[^"]*"/g, '').replace('<svg', '<svg aria-hidden="true"'))}\n`
}
