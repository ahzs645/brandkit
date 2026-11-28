// What a template is made of: one line per element, in drawing order, naming the brand's own
// colours, fonts, logos and patterns it uses, so the parts of a design can be read at a glance.
import { colour, colourName } from '../../engine/brand.js'
import './template-elements.css'

const TYPES = {
  background: 'Background', text: 'Text', paragraph: 'Paragraph', lines: 'Text lines', flow: 'Text flow',
  logo: 'Logo', symbol: 'Symbol', motif: 'Motif', pattern: 'Pattern', illustration: 'Illustration',
  dots: 'Dots', path: 'Shape', rect: 'Rectangle', line: 'Rule', polyline: 'Line', printGuides: 'Print guides'
}

const round = (value) => (Number.isFinite(value) ? Math.round(value * 10) / 10 : value)
const titleCase = (value) => String(value).replaceAll('-', ' ').replace(/^./, (letter) => letter.toUpperCase())

/** The brand's font for a key (`display`, `body` …): family and weight, as people know it. */
const fontLabel = (brand, key) => {
  const font = brand.fonts?.[key]
  return font ? `${font.family}${font.weight && font.weight !== 400 ? ` ${font.weight}` : ''}` : key
}

/** The colours an element paints with: the brand's colour keys, or plain values. */
const coloursOf = (element) => [element.fill, element.colour, element.stroke]
  .filter((value) => value && value !== 'none' && typeof value === 'string')

/** The words and numbers that say what this element is. */
const details = (brand, element) => {
  const parts = []
  switch (element.type) {
    case 'text':
    case 'paragraph':
      if (element.font) parts.push(fontLabel(brand, element.font))
      if (element.size) parts.push(`${round(element.size)} px`)
      if (element.caps) parts.push('capitals')
      if (element.maxLines) parts.push(`up to ${element.maxLines} lines`)
      break
    case 'lines': parts.push(`${element.lines?.length ?? 0} lines`); if (element.size) parts.push(`${round(element.size)} px`); break
    case 'flow': parts.push(`${element.items?.length ?? 0} items`); break
    case 'logo':
      parts.push([element.family, element.layout].filter(Boolean).map(titleCase).join(', ') || 'Primary logo')
      if (element.width) parts.push(`${round(element.width)} px wide`)
      else if (element.height) parts.push(`${round(element.height)} px tall`)
      break
    case 'symbol': if (element.height) parts.push(`${round(element.height)} px`); break
    case 'motif': if (element.id) parts.push(titleCase(element.id)); break
    case 'pattern': parts.push(titleCase(element.pattern ?? element.id ?? 'pattern')); break
    case 'illustration': parts.push(titleCase(element.illustration ?? 'illustration')); break
    case 'dots': parts.push(`${element.dots?.length ?? 0} dots`); if (element.opacity != null && element.opacity < 1) parts.push(`${Math.round(element.opacity * 100)}% opacity`); break
    case 'path': case 'line': case 'polyline': case 'rect':
      if (element.strokeWidth) parts.push(`${round(element.strokeWidth)} px stroke`)
      if (element.dash) parts.push('dashed')
      if (element.type === 'rect' && element.width) parts.push(`${round(element.width)} × ${round(element.height)}`)
      break
    case 'printGuides': parts.push('trim and safe area'); break
    default: break
  }
  return parts
}

const Swatch = ({ brand, value }) => {
  const hex = colour(brand, value) ?? (/^#/.test(value) ? value : null)
  // A role (ink, paper …) is named by the colour it stands for.
  const key = brand.colours?.[value] ? value : brand.colours?.[brand.roles?.[value]] ? brand.roles[value] : null
  const name = key ? colourName(brand, key) : value
  return <span className="template-elements__colour"><span className="template-elements__swatch" style={{ background: hex ?? 'transparent' }} aria-hidden="true" />{name}</span>
}

export const TemplateElements = ({ brand, template }) => {
  const elements = template.elements ?? []
  if (!elements.length) return null
  return (
    <section className="template-elements" aria-labelledby={`elements-${template.id}`}>
      <h3 id={`elements-${template.id}`}>Elements <span className="template-elements__count">{elements.length}</span></h3>
      <ol className="template-elements__list">
        {elements.map((element, index) => {
          const text = element.type === 'text' || element.type === 'paragraph' ? element.text : null
          const editable = (element.type === 'text' || element.type === 'paragraph') && element.id && !element.locked
          return (
            <li key={index} className="template-elements__item">
              <span className="template-elements__type">{TYPES[element.type] ?? titleCase(element.type)}</span>
              <span className="template-elements__what">
                {text && <span className="template-elements__text">“{text}”</span>}
                {details(brand, element).map((part) => <span key={part}>{part}</span>)}
                {coloursOf(element).map((value) => <Swatch key={value} brand={brand} value={value} />)}
              </span>
              {editable && <span className="template-elements__tag">Editable</span>}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
