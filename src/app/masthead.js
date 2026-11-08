// The art that stands for a brand in brandkit's own interface: the masthead logo, and the logo in
// the brand menu (pre-drawn for the built-in brands by scripts/menu-logos.mjs). A plain module, so
// that script and Node's tests can use it.

import { lockup, logoDocument, svgDocument, symbolDocument } from '../engine/artwork.js'
import { colour } from '../engine/brand.js'

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
    // Keep fixed paints fixed. A supplied monochrome colourway with its own ground remains
    // readable in either interface theme; otherwise use the source's default colourway and
    // declared ground. Never invent a background or let surrounding UI ink recolour the logo.
    const mono = Object.entries(brand.colourways ?? {}).find(([, spec]) => spec.ground && /^#0{6}$/i.test(colour(brand, spec.all) ?? ''))
    const colourway = mono?.[0] ?? brand.defaultColourway
    const signature = brand.signatures[0]
    const ctx = { brand, fonts }
    const { width, height, art } = lockup(ctx, { signature: signature.id, colourway })
    const background = colour(brand, brand.colourways?.[colourway]?.ground)
    return { svg: svgDocument(ctx, width, height, art, `${brand.name} / ${signature.label ?? signature.id} / ${colourway}`, { background }) }
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
 * inheriting ink only where the brand permits it. A logo near square (a symbol) has the brand's
 * name set beside it in the menu.
 */
export const menuLogo = (brand, fonts) => {
  const { svg } = mastheadArt(brand, fonts)
  return `${svg.replace(/<title>[\s\S]*?<\/title>|<desc>[\s\S]*?<\/desc>/g, '').replace(/<svg[^>]*>/, (tag) => tag.replace(/\s(width|height|role|aria-label)="[^"]*"/g, '').replace('<svg', '<svg aria-hidden="true"'))}\n`
}
