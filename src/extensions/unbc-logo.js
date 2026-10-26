// UNBC's social-media profile pictures, from the UNBC logo package (vendor/unbc-logo): the UNBC
// letters on a green panel over a white caption band, measured from the university's own avatars,
// in the square layout and the manual's circle layout (Graphics Standards Manual, Feb 2020, p. 5).
// The package sets the caption as live text; it is outlined here in the kit's Helvetica Neue 95
// Black so the file needs no font wherever it is opened.

import { findCircleCropOverflow, profileCaptionText, profileLayout, renderProfileSvg } from '../../vendor/unbc-logo/src/profile/renderProfileSvg.js'

const TEXT = /<text x="([\d.]+)" y="([\d.]+)" text-anchor="middle" font-family="[^"]*" font-size="([\d.]+)" font-weight="\d+" fill="([^"]+)">([\s\S]*?)<\/text>/g
const unescape = (value) => value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
const escape = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

export const profilePictures = {
  label: 'Social media profile pictures',
  use: 'The UNBC letters on a green panel with the unit’s name in the white band below, as on UNBC’s own accounts. Faculties drop “Faculty of”. Most platforms crop to a circle: use the circle layout there, or check the square’s warning.',
  shapes: [{ id: 'square', label: 'Square' }, { id: 'circle', label: 'Circle' }],
  size: 1080,
  caption: (name) => profileCaptionText(name),
  /** Caption lines a circular crop would clip from the square layout. */
  clipped: (name, shape) => findCircleCropOverflow(profileCaptionText(name), profileLayout(shape)),
  render: ({ fonts }, { name, shape }) => {
    const svg = renderProfileSvg({ departmentText: profileCaptionText(name), shape })
    if (!fonts?.has('black')) return svg
    return svg.replace(TEXT, (match, x, y, size, fill, text) =>
      `<path fill="${fill}" aria-label="${escape(unescape(text))}" d="${fonts.path(unescape(text), 'black', Number(size), Number(x), Number(y), 0, 'middle')}"/>`)
  }
}
