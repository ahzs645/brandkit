// The art that stands for a brand in brandkit's own interface: the masthead logo, and the logo in
// the brand menu (pre-drawn for the built-in brands by scripts/menu-logos.mjs). A plain module, so
// that script and Node's tests can use it.

import { logoDocument, symbolDocument } from '../engine/artwork.js'

export const aspectOf = (svg) => {
  const [, , width, height] = svg?.match(/viewBox="([^"]+)"/)?.[1].split(/[\s,]+/).map(Number) ?? []
  return width && height ? width / height : null
}

/**
 * The art for a masthead: the horizontal logo; for a brand of signatures, the first that is not
 * set for a department and is wide enough to read 26 px tall; failing both, the symbol, with the
 * name beside it.
 */
export const mastheadArt = (brand, fonts) => {
  if (brand.families?.length) return { svg: logoDocument({ brand, fonts }, { family: brand.families[0].id, layout: 'horizontal', colourKey: 'currentColor' }) }
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
