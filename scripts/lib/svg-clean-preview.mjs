// Compare the painted content of generated template SVGs without counting the optional
// rule layer or descriptive metadata as artwork changes. This is a structural comparison,
// not a pixel-similarity score or a general SVG equivalence/optimization routine.
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'

const SVG_NS = 'http://www.w3.org/2000/svg'
const nonpainted = new Set(['title', 'desc', 'metadata'])
const whitespaceSensitive = new Set(['text', 'tspan', 'textPath', 'style', 'script', 'foreignObject'])

export function cleanSvgPreview(svg) {
  const document = new DOMParser({
    onError: (level, message) => { throw new Error(`Invalid SVG (${level}): ${message}`) }
  }).parseFromString(svg, 'image/svg+xml')
  const root = document.documentElement
  if (root?.localName !== 'svg' || root.namespaceURI !== SVG_NS) throw new Error('A complete SVG document is required for preview comparison.')

  // Remove the complete node, including every nested outlined-font group. A non-greedy
  // regular expression would stop at the first </g> and leave the rest of the rules behind.
  function clean(node, keepWhitespace = false) {
    const preserve = keepWhitespace || node.namespaceURI !== SVG_NS ||
      whitespaceSensitive.has(node.localName) || node.getAttribute?.('xml:space') === 'preserve'
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 1) {
        if (child.namespaceURI === SVG_NS && (nonpainted.has(child.localName) ||
          (child.localName === 'g' && child.getAttribute('id') === 'layout-guides'))) {
          node.removeChild(child)
        } else clean(child, preserve)
      } else if (child.nodeType === 8 || (child.nodeType === 3 && !preserve && /^\s*$/.test(child.data))) {
        node.removeChild(child)
      }
    }
  }
  clean(root)
  root.removeAttribute('data-brand-version')
  return new XMLSerializer().serializeToString(root)
}
