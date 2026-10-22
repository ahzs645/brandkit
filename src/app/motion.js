// The Motion tab's rules, in a plain module so Node's test runner can import them.

/** The URL of the brand's motion library page, when the brand has one and its files hold it. */
export const motionUrl = (brand, source) => (brand?.motion?.page && source?.url(brand.motion.page)) || null

/** The view to show: Motion falls back to the overview for a brand (or revision) without a library. */
export const viewOrOverview = (view, url) => (view === 'motion' && !url ? 'overview' : view)

/**
 * The studies in the groups the list shows them in: the brand's own `motion.groups` (each naming
 * the study kinds it holds) when it has them, otherwise each study's `group`, in order of appearance.
 */
export const motionGroups = (motion) => {
  const studies = motion?.studies ?? []
  if (motion?.groups?.length) {
    const groups = motion.groups.map((group) => ({ id: group.id, label: group.label ?? group.id, studies: studies.filter((study) => group.kinds?.includes(study.kind)) }))
    const placed = new Set(groups.flatMap((group) => group.studies))
    const rest = studies.filter((study) => !placed.has(study))
    return [...groups, ...(rest.length ? [{ id: 'other', label: 'Other', studies: rest }] : [])].filter((group) => group.studies.length)
  }
  const groups = new Map()
  for (const study of studies) {
    const label = study.group ?? 'Studies'
    if (!groups.has(label)) groups.set(label, { id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label, studies: [] })
    groups.get(label).studies.push(study)
  }
  return [...groups.values()]
}

/** A logo study: one the Logos tab plays. A brand marks them `kind: "logo"` or puts them in a Logo group. */
export const isLogoStudy = (study) => study?.kind === 'logo' || study?.group === 'Logo'

/**
 * A library page's styles, ready for a study shown on its own: `@font-face` rules dropped (the
 * app loads the brand's faces itself) and `:root` custom properties moved to the shadow host.
 */
export const stageCss = (css) => String(css ?? '').replace(/@font-face\s*\{[^}]*\}/g, '').replace(/:root\b/g, ':host')

/** An SVG path for a CSS easing, drawn in a 100 × 100 box with y up; anything but a cubic-bezier is a straight line. */
export const easingPath = (value) => {
  const match = /cubic-bezier\(([^)]+)\)/.exec(String(value))
  const [x1, y1, x2, y2] = match ? match[1].split(',').map(Number) : [0, 0, 1, 1]
  const p = (x, y) => `${Math.round(x * 1000) / 10} ${Math.round((100 - y * 100) * 10) / 10}`
  return `M0 100C${p(x1, y1)} ${p(x2, y2)} 100 0`
}

/**
 * The brand's motion tokens as rows of [name, value, milliseconds or null]: durations first, then
 * staggers and distances, however the brand nests them (`stagger: 80`, `stagger: { field: [20, 30] }`).
 */
export const tokenRows = (tokens = {}) => {
  const unit = (key) => (/distance/i.test(key) ? 'px' : 'ms')
  const format = (key, value) => (Array.isArray(value) ? `${value.join('–')} ${unit(key)}` : `${value} ${unit(key)}`)
  const rows = Object.entries(tokens.durations ?? {}).map(([key, value]) => [key, `${value} ms`, value])
  for (const [key, value] of Object.entries(tokens)) {
    if (key === 'durations' || key === 'easings') continue
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [inner, entry] of Object.entries(value)) rows.push([`${key} · ${inner}`, format(inner, entry), null])
    } else rows.push([key, format(key, value), null])
  }
  return rows
}

const ms = (value) => `${value}ms`
const tokenName = (value) => String(value).replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9]+/g, '-')
const bezier = (value) => /cubic-bezier\(([^)]+)\)/.exec(String(value))?.[1].split(',').map(Number) ?? (value === 'linear' ? [0, 0, 1, 1] : null)

/**
 * The tokens as CSS custom properties, for pasting into a stylesheet: durations, easings, then
 * staggers and distances (a range becomes a -min and a -max).
 */
export const tokensCss = (tokens = {}, prefix = 'motion') => {
  const lines = Object.entries(tokens.durations ?? {}).map(([key, value]) => `  --${prefix}-${tokenName(key)}: ${ms(value)};`)
  lines.push(...Object.entries(tokens.easings ?? {}).map(([key, value]) => `  --${prefix}-ease-${tokenName(key)}: ${value};`))
  const unit = (key, value) => (/distance/i.test(key) ? `${value}px` : ms(value))
  const add = (name, key, value) => {
    if (Array.isArray(value)) lines.push(`  --${prefix}-${name}-min: ${unit(key, value[0])};`, `  --${prefix}-${name}-max: ${unit(key, value.at(-1))};`)
    else lines.push(`  --${prefix}-${name}: ${unit(key, value)};`)
  }
  for (const [key, value] of Object.entries(tokens)) {
    if (key === 'durations' || key === 'easings') continue
    if (value && typeof value === 'object' && !Array.isArray(value)) for (const [inner, entry] of Object.entries(value)) add(`${tokenName(key)}-${tokenName(inner)}`, inner, entry)
    else add(tokenName(key), key, value)
  }
  return `:root {\n${lines.join('\n')}\n}\n`
}

/**
 * The tokens in the W3C design tokens format (DTCG), which token tools read: `duration` and
 * `cubicBezier` types, under `motion`. Staggers and distances are durations and dimensions.
 */
export const tokensJson = (tokens = {}) => {
  const group = (entries, make) => Object.fromEntries(entries.map(([key, value]) => [key, make(key, value)]))
  const duration = (value) => ({ $type: 'duration', $value: { value, unit: 'ms' } })
  const other = (key, value) => (/distance/i.test(key) ? { $type: 'dimension', $value: { value, unit: 'px' } } : duration(value))
  const extra = (key, value) => (Array.isArray(value)
    ? { min: other(key, value[0]), max: other(key, value.at(-1)) }
    : value && typeof value === 'object' ? group(Object.entries(value), extra) : other(key, value))
  const motion = {
    duration: group(Object.entries(tokens.durations ?? {}), (key, value) => duration(value)),
    easing: group(Object.entries(tokens.easings ?? {}), (key, value) => ({ $type: 'cubicBezier', $value: bezier(value) ?? value }))
  }
  for (const [key, value] of Object.entries(tokens)) if (key !== 'durations' && key !== 'easings') motion[key] = extra(key, value)
  return `${JSON.stringify({ motion }, null, 2)}\n`
}
