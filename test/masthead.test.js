import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Resvg } from '@resvg/resvg-js'
import { mastheadArt, menuLogo } from '../src/app/masthead.js'
import { logoDocument } from '../src/engine/artwork.js'

const fixedBrand = {
  id: 'fixed', name: 'Fixed identity',
  colours: { green: '#006633', black: '#000000', white: '#FFFFFF' },
  colourways: {
    primary: { all: 'green', ground: 'white' },
    black: { all: 'black', ground: 'white' },
    reverse: { all: 'white', ground: 'green' }
  },
  defaultColourway: 'primary',
  logoPolicy: { allowedColours: ['green', 'black', 'white'], allowInheritedColour: false, standaloneSymbol: false },
  signatures: [{
    id: 'complete', padding: 10,
    elements: [{
      type: 'art', bounds: [0, 0, 180, 40],
      markup: '<path d="M0 0H40V40H0ZM10 10V30H30V10Z" fill="{symbol}" fill-rule="evenodd"/>'
        + '<path d="M60 5H180V35H60Z" fill="{type}"/>'
        + '<path d="M60 39H180" fill="none" stroke="{type}" stroke-width="2"/>'
    }]
  }]
}

test('fixed-colour masthead keeps the complete artwork and its declared ground in a dark interface', () => {
  const { svg } = mastheadArt(fixedBrand)
  assert.doesNotMatch(svg, /currentColor/i)
  assert.match(svg, /fill="#000000"/)
  assert.match(svg, /stroke="#000000"/)
  assert.match(svg, /<rect width="100%" height="100%" fill="#FFFFFF"\/>/)
  const original = logoDocument({ brand: fixedBrand }, { signature: 'complete', colourway: 'black' })
  assert.equal(svg.match(/viewBox="([^"]+)"/)[1], original.match(/viewBox="([^"]+)"/)[1])
  // Rendering on a dark host must look exactly like the original on its approved white ground:
  // full wordmark, clear space, strokes and the compound-path hole are all retained.
  const rendered = new Resvg(svg, { background: '#181B20' }).render()
  const expected = new Resvg(original, { background: '#FFFFFF' }).render()
  assert.equal(rendered.width, 200)
  assert.equal(rendered.height, 60)
  assert.deepEqual(rendered.pixels, expected.pixels)
})

test('menu assets retain fixed colours and their declared backdrop', () => {
  const svg = menuLogo(fixedBrand)
  assert.doesNotMatch(svg, /currentColor|<title>|<desc>/i)
  assert.match(svg, /<svg aria-hidden="true"/)
  assert.match(svg, /<rect width="100%" height="100%" fill="#FFFFFF"\/>/)
  assert.match(svg, /fill="#000000"/)
  assert.match(svg, /stroke="#000000"/)
})

test('a monochrome colourway without a declared ground does not override the source default', () => {
  const brand = structuredClone(fixedBrand)
  delete brand.colourways.black.ground
  const { svg } = mastheadArt(brand)
  assert.match(svg, /fill="#006633"/)
  assert.match(svg, /<rect width="100%" height="100%" fill="#FFFFFF"\/>/)
  assert.doesNotMatch(svg, /currentColor|fill="#000000"/i)
  delete brand.colourways.primary.ground
  assert.doesNotMatch(mastheadArt(brand).svg, /<rect/, 'no unapproved background is invented')
})

test('ordinary brands keep inheriting the interface ink without a new backdrop', () => {
  const brand = structuredClone(fixedBrand)
  delete brand.logoPolicy
  assert.equal(mastheadArt(brand).svg, logoDocument({ brand }, { signature: 'complete', colour: 'currentColor' }))
  assert.match(menuLogo(brand), /fill="currentColor"/)
  assert.doesNotMatch(menuLogo(brand), /<rect/)
})
