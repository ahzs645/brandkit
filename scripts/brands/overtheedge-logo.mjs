// Over the Edge's logo, read from the SVG the newspaper's site serves (vendored once as
// brands/overtheedge/reference/logo-site.svg). Nothing here redraws it: the glyphs are the source's
// own path strings, grouped by word, and the bounds are measured from them.

import { readFileSync } from 'node:fs'

/**
 * The source's paths in document order, each with the chain of groups it sits in. Unnamed groups
 * are numbered among their siblings, so the three word groups inside "Main Logo" are told apart.
 */
export const readLogo = (svg) => {
  const tokens = [...svg.matchAll(/<(\/?)(g|path)\b([^>]*?)(\/?)>/g)]
  const stack = []
  const counts = [0]
  const paths = []
  for (const [, close, tag, attrs, selfClosing] of tokens) {
    if (tag === 'g') {
      if (close) { stack.pop(); counts.pop(); continue }
      const index = counts[counts.length - 1]++
      stack.push((/data-name="([^"]+)"/.exec(attrs) ?? /\bid="([^"]+)"/.exec(attrs) ?? [null, `#${index}`])[1])
      counts.push(0)
      if (selfClosing) { stack.pop(); counts.pop() }
      continue
    }
    if (close) continue
    const d = /\sd="([^"]+)"/.exec(attrs)?.[1]
    if (d) paths.push({ groups: [...stack], d, fill: /\sfill="([^"]+)"/.exec(attrs)?.[1] ?? null })
  }
  return paths
}

/** The four glyphs: the three words, and the subtext line with its apostrophe. */
export const logoGlyphs = (paths) => {
  const inMain = (index) => paths.filter((path) => path.groups.includes('Main Logo') && path.groups[path.groups.length - 1] === `#${index}`)
  const subtext = paths.filter((path) => path.groups.includes('Subtext'))
  const apostrophe = paths.filter((path) => !path.groups.includes('Subtext') && !path.groups.includes('Main Logo'))
  // In the source, the first unnamed group in "Main Logo" is THE, the second EDGE, the third OVER.
  const [the, edge, over] = [0, 1, 2].map(inMain)
  for (const [name, list, count] of [['THE', the, 3], ['EDGE', edge, 4], ['OVER', over, 4], ['subtext', subtext, 21], ['apostrophe', apostrophe, 1]]) {
    if (list.length !== count) throw new Error(`logo-site.svg: expected ${count} paths for ${name}, found ${list.length}`)
  }
  const join = (list) => list.map((path) => path.d).join('')
  return { over: join(over), the: join(the), edge: join(edge), subtext: join(subtext), apostrophe: join(apostrophe), o: over[0].d }
}

/** Bounds [x0, y0, x1, y1] of a path, by sampling each segment (curves at `steps` points). */
export const pathBounds = (d, steps = 64) => {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? []
  let i = 0
  let command = ''
  let [x, y, startX, startY] = [0, 0, 0, 0]
  let control = null
  const box = [Infinity, Infinity, -Infinity, -Infinity]
  const add = (px, py) => { box[0] = Math.min(box[0], px); box[1] = Math.min(box[1], py); box[2] = Math.max(box[2], px); box[3] = Math.max(box[3], py) }
  const num = () => Number(tokens[i++])
  const cubic = (x1, y1, x2, y2, x3, y3) => {
    for (let s = 1; s <= steps; s++) {
      const t = s / steps
      const u = 1 - t
      add(u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3)
    }
    control = [x2, y2]
    ;[x, y] = [x3, y3]
  }
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) command = tokens[i++]
    const relative = command === command.toLowerCase()
    const [ox, oy] = relative ? [x, y] : [0, 0]
    switch (command.toUpperCase()) {
      case 'M': x = ox + num(); y = oy + num(); [startX, startY] = [x, y]; add(x, y); command = relative ? 'l' : 'L'; control = null; break
      case 'L': x = ox + num(); y = oy + num(); add(x, y); control = null; break
      case 'H': x = ox + num(); add(x, y); control = null; break
      case 'V': y = oy + num(); add(x, y); control = null; break
      case 'C': cubic(ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num()); break
      case 'S': {
        const [x1, y1] = control ? [2 * x - control[0], 2 * y - control[1]] : [x, y]
        cubic(x1, y1, ox + num(), oy + num(), ox + num(), oy + num())
        break
      }
      case 'Z': [x, y] = [startX, startY]; control = null; break
      default: throw new Error(`Unsupported path command: ${command}`)
    }
  }
  return box
}

export const union = (boxes) => boxes.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])])
export const up = (value) => Math.ceil(value * 100 - 1e-9) / 100

export const loadLogo = (file) => {
  let svg
  try { svg = readFileSync(file, 'utf8') } catch { console.error(`Missing input: ${file}`); process.exit(1) }
  return { svg, glyphs: logoGlyphs(readLogo(svg)) }
}

/** The geometry of an icon as the site serves it: its shapes with only their geometric attributes. */
export const GEOMETRY = ['d', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'rx', 'points', 'x1', 'y1', 'x2', 'y2']
export const iconGeometry = (markup) => [...markup.replace(/^<svg\b[^>]*>|<\/svg>\s*$/g, '').matchAll(/<(path|circle|rect|line|polyline|ellipse)\b([^>]*?)\/?>/g)]
  .map(([, tag, attrs]) => {
    const kept = GEOMETRY.flatMap((name) => { const m = new RegExp(`\\s${name}=["']([^"']*)["']`).exec(attrs); return m ? [` ${name}="${m[1]}"`] : [] })
    return `<${tag}${kept.join('')}/>`
  }).join('')

/** The site's icons as kit icon items, `{ id, content }`, in the file's order. */
export const siteIcons = (file) => {
  let doc
  try { doc = JSON.parse(readFileSync(file, 'utf8')) } catch { console.error(`Missing input: ${file}`); process.exit(1) }
  return doc.icons.map((icon) => ({ id: icon.id, content: iconGeometry(icon.markup) }))
}
