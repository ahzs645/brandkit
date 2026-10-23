// SPARK Lab's artwork, read from the original SVG. The arrow, spark and all eight letters
// retain their source coordinates and path strings; alternate arrangements only translate them.
import { readFileSync } from 'node:fs'

export const loadSparkLogo = (file) => {
  const source = readFileSync(file, 'utf8')
  const polygon = /<polygon\s+points="([^"]+)"/.exec(source)?.[1]
  const paths = [...source.matchAll(/<path\s+d="([^"]+)"/g)].map((m) => m[1])
  if (!polygon || paths.length !== 9 || !source.includes('0 0 752.33 338.18')) throw new Error('Unexpected SPARK Lab logo source')
  const points = polygon.trim().split(/[\s,]+/)
  if (points.length % 2) throw new Error('Unexpected arrow polygon coordinates')
  const arrow = `M${Array.from({ length: points.length / 2 }, (_, i) => `${points[2 * i]} ${points[2 * i + 1]}`).join('L')}Z`
  const [spark, ...letters] = paths
  const shapes = (list) => list.map((d) => `<path d="${d}"/>`).join('')
  const mark = shapes([arrow, spark])
  const words = shapes(letters)
  const horizontalWords = `<g transform="translate(-320.99 -21.36)">${shapes(letters.slice(0, 5))}</g><g transform="translate(120.35 -176.55)">${shapes(letters.slice(5))}</g>`
  const art = (markup, bounds, extra = {}) => ({ type: 'art', markup, bounds, ...extra })
  const signatures = [
    { id: 'original', label: 'Original website logo', use: 'The original orange spark and navy Spark / Lab lettering, in their website arrangement.', padding: 24, elements: [art(`<g fill="{symbol}">${mark}</g><g fill="{type}">${words}</g>`, [0, 0, 752.33, 338.18])] },
    { id: 'horizontal', label: 'Horizontal logo', use: 'A wide arrangement for headers and narrow spaces. Original letter and symbol outlines; placement adapted for the kit.', padding: 24, elements: [art(`<g fill="{symbol}" transform="scale(.48)">${mark}</g><g fill="{type}" transform="translate(170 14)">${horizontalWords}</g>`, [0, 0, 877.42, 163])] },
    { id: 'stacked', label: 'Stacked logo', use: 'A centred arrangement for covers and square formats, using the original outlines.', padding: 24, elements: [art(`<g fill="{symbol}" transform="translate(64 0)">${mark}</g><g fill="{type}" transform="translate(-320.99 340)">${words}</g>`, [0, 0, 431.34, 637.2])] },
    { id: 'wordmark', label: 'Wordmark', use: 'Original Spark / Lab lettering alone. Prefer the complete logo on first introduction.', padding: 24, elements: [art(`<g fill="{type}" transform="translate(-320.99 -21.36)">${words}</g>`, [0, 0, 431.34, 275.84])] }
  ]
  return { source, arrow, spark, letters, mark, words, horizontalWords, signatures }
}
