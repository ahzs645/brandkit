// Optional, data-only adapter. Astryx is installed by the consuming application, not Brandkit.
// Keep the semantic contract pinned: its defaults are inputs to the contrast checks below.
import { colour, luminance, rgb } from './brand.js'

export const ASTRYX_VERSION = '0.7.11'
export const ASTRYX_REPORT_SCHEMA = 'brandkit/astryx-report/1'
const upstream = `https://github.com/meta/astryx/tree/v${ASTRYX_VERSION}`
const json = (value) => `${JSON.stringify(value, null, 2)}\n`
const modes = ['light', 'dark']

// v0.7.11 packages/core/src/theme/tokens.stylex.ts. Inverted/media backgrounds are
// separate contexts, not suitable targets for this ordinary application theme.
const DEFAULTS = {
  light: { surfaces: ['#F1F4F7', '#FFFFFF'], muted: '#0536590C', text: ['#0A1317', '#4E606F'], tintBase: '#FFFFFF' },
  dark: { surfaces: ['#111112', '#1F1F22', '#28292C'], muted: '#1111127F', text: ['#DFE2E5', '#AAAFB5'], tintBase: '#1F1F22' }
}
const hex = (channels) => `#${channels.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('').toUpperCase()}`
const mix = (foreground, background, opacity) => hex(rgb(foreground).map((value, i) => value * opacity + rgb(background)[i] * (1 - opacity)))
const composite = (value, background) => mix(value.slice(0, 7), background, parseInt(value.slice(7), 16) / 255)
const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05)
const minimumRatio = (foreground, backgrounds) => Math.min(...backgrounds.map((background) => ratio(foreground, background)))
// Astryx's runtime style registry is keyed by name. Include output content so a
// second revision/options set cannot silently reuse a previous theme's CSS.
const fingerprint = (value) => {
  let hash = 0xcbf29ce484222325n
  for (const character of JSON.stringify(value)) hash = ((hash ^ BigInt(character.codePointAt(0))) * 0x100000001b3n) & 0xffffffffffffffffn
  return hash.toString(16).padStart(16, '0')
}
const hasDeclaredColour = (brand, value, seen = new Set()) => {
  if (typeof value !== 'string' || seen.has(value)) return false
  if (/^#[a-f0-9]{6}$/i.test(value) || brand.colours?.[value]) return true
  seen.add(value)
  return hasDeclaredColour(brand, brand.roles?.[value], seen)
}

const checkedColour = (brand, value, label) => {
  const resolved = colour(brand, value)
  if (typeof resolved !== 'string' || !/^#[a-f0-9]{6}$/i.test(resolved)) throw new Error(`${label} must resolve to a six-digit hex colour.`)
  return resolved.toUpperCase()
}

// Preserve the seed when it meets the target; otherwise make the smallest of 255
// steps towards black/white that does. This changes UI tokens, never logo paints.
const readable = (seed, backgrounds, minimum, mode) => {
  if (minimumRatio(seed, backgrounds) >= minimum) return seed
  const end = mode === 'light' ? '#000000' : '#FFFFFF'
  for (let step = 1; step <= 255; step++) {
    const candidate = mix(end, seed, step / 255)
    if (minimumRatio(candidate, backgrounds) >= minimum) return candidate
  }
  throw new Error(`Cannot make an Astryx ${mode} accent readable on its default surfaces.`)
}

const onAccent = (brand, background) => {
  const candidates = [colour(brand, 'reverse'), colour(brand, 'ink'), '#FFFFFF', '#000000']
  return candidates.find((value) => typeof value === 'string' && /^#[a-f0-9]{6}$/i.test(value) && ratio(value, background) >= 4.5).toUpperCase()
}

const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong'])
const usableFamily = (value) => typeof value === 'string' && value.trim() && !/[\u0000-\u001f\u007f]/.test(value)
// Family names are data, not CSS. Always quote specific names, including numeric
// names and CSS-wide keywords; only actual generic-family keywords stay unquoted.
// Escaping angle brackets also keeps a copied SSR <style> from acquiring markup.
const familyCss = (family, quoted = false) => !quoted && GENERIC_FAMILIES.has(family.toLowerCase())
  ? family.toLowerCase()
  : `"${family.replace(/["\\<>]/g, (character) => ({ '"': '\\"', '\\': '\\\\', '<': '\\3C ', '>': '\\3E ' })[character])}"`

// Parse a plain CSS font stack, preserving quoted commas/apostrophes and escaped
// code points. Functions/comments are intentionally not evaluated: a dynamic host
// stack cannot be resolved into this data-only handoff and gets a reported fallback.
const parseFontStack = (stack) => {
  if (stack == null || stack === '') return []
  if (typeof stack !== 'string') throw new Error('not a string')
  const families = []
  let index = 0
  const space = () => { while (/\s/u.test(stack[index] ?? '') && index < stack.length) index++ }
  const escaped = () => {
    index++
    if (index >= stack.length || /[\n\r\f]/.test(stack[index])) throw new Error('incomplete escape')
    const match = /^[0-9a-f]{1,6}/i.exec(stack.slice(index))
    if (!match) return stack[index++]
    index += match[0].length
    if (/\s/u.test(stack[index] ?? '')) {
      if (stack[index] === '\r' && stack[index + 1] === '\n') index++
      index++
    }
    const code = parseInt(match[0], 16)
    if (!code || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) throw new Error('invalid escaped code point')
    return String.fromCodePoint(code)
  }
  while (index < stack.length) {
    space()
    const quote = ['"', "'"].includes(stack[index]) ? stack[index++] : undefined
    let family = ''
    if (quote) {
      while (index < stack.length && stack[index] !== quote) family += stack[index] === '\\' ? escaped() : stack[index++]
      if (stack[index++] !== quote) throw new Error('unclosed string')
      space()
      if (index < stack.length && stack[index] !== ',') throw new Error('trailing text after string')
    } else {
      while (index < stack.length && stack[index] !== ',') {
        if (stack[index] === '\\') family += escaped()
        else {
          if ('"\'(){}[];/<>'.includes(stack[index])) throw new Error('not a plain family list')
          family += stack[index++]
        }
      }
      family = family.trim().replace(/\s+/gu, ' ')
    }
    if (!usableFamily(family)) throw new Error('empty or malformed family')
    families.push({ family, quoted: Boolean(quote) })
    if (index < stack.length) {
      index++
      space()
      if (index === stack.length) throw new Error('trailing comma')
    }
  }
  return families
}
const fontRole = (brand, key, role, warnings) => {
  const face = brand.fonts?.[key] ?? (key === 'display' ? brand.fonts?.body : undefined)
  if (!face) return undefined
  // Respect the established downstream font contract. A bundled rendering font
  // can be licensed for artwork/print only; consumerFamily is the host's choice.
  const requested = face.consumerFamily ?? face.family
  if (!usableFamily(requested)) {
    warnings.push(`${role}: the requested consumer font family is missing or malformed; the Astryx default is retained.`)
    return undefined
  }
  const family = requested.trim()
  let parts
  try { parts = parseFontStack(face.stack) } catch {
    parts = []
    warnings.push(`${role}: the fallback stack is not a plain font-family list; system-ui and sans-serif are used instead.`)
  }
  const excluded = [family.toLowerCase(), ...(face.consumerFamily && typeof face.family === 'string' ? [face.family.trim().toLowerCase()] : [])]
  const fallbacks = parts.filter((part) => !excluded.includes(part.family.toLowerCase())).map((part) => familyCss(part.family, part.quoted)).join(', ') || 'system-ui, sans-serif'
  if (face.consumerFamily && face.consumerFamily !== face.family) warnings.push(`${role}: uses ${family} as declared for consumers, not the bundled ${face.family} artwork font. The host must provide ${family} or use its fallback.`)
  else if (!face.web) warnings.push(`${role}: ${family} has no web font file; load a licensed font in the host or accept its fallback.`)
  return { family, fallbacks, css: `${familyCss(family)}, ${fallbacks}` }
}
const fontWeight = (value, label, warnings) => {
  if (value == null) return undefined
  const weight = String(value)
  if (!/^(?:[1-9]\d{0,2}|1000|normal|bold)$/.test(weight)) {
    warnings.push(`${label}: ${weight} is not a single CSS font weight; the Astryx default is retained.`)
    return undefined
  }
  return weight
}

const build = ({ brand } = {}, options = {}) => {
  if (!brand || typeof brand.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(brand.id)) throw new Error('An Astryx export needs a Brandkit definition with a valid id.')
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new Error('Astryx options must be an object.')
  for (const key of Object.keys(options)) if (key !== 'accent') throw new Error(`Unknown Astryx option: ${key}.`)
  if (options.accent != null && (typeof options.accent !== 'object' || Array.isArray(options.accent))) throw new Error('Astryx accent must contain light and/or dark colour references.')
  for (const key of Object.keys(options.accent ?? {})) if (!modes.includes(key)) throw new Error(`Unknown Astryx accent mode: ${key}.`)
  const sourceAccent = checkedColour(brand, 'primary', 'The brand primary role')
  const warnings = []
  const sourceAccentOrigin = hasDeclaredColour(brand, 'primary') ? 'brand-definition' : 'brandkit-default'
  if (sourceAccentOrigin === 'brandkit-default') warnings.push(`No explicit primary colour resolves from the definition; uses Brandkit's fallback ${sourceAccent}. Choose an approved accent before adopting this theme.`)
  const checks = []
  const adjustments = []
  const values = {}
  for (const mode of modes) {
    const defaults = DEFAULTS[mode]
    const backgrounds = [...new Set([...defaults.surfaces, ...defaults.surfaces.map((surface) => composite(defaults.muted, surface))])]
    const seed = checkedColour(brand, options.accent?.[mode] ?? sourceAccent, `The ${mode} accent`)
    const accent = readable(seed, backgrounds, 3, mode)
    const on = onAccent(brand, accent)
    // An opaque, conservative tint has the same contrast in cards and portals.
    // Selected rows can use upstream primary OR secondary text on this surface.
    let tintOpacity = mode === 'light' ? 0.1 : 0.12
    let muted = mix(accent, defaults.tintBase, tintOpacity)
    while (Math.min(...defaults.text.map((text) => ratio(text, muted))) < 4.5 && tintOpacity > 0) {
      tintOpacity = Math.max(0, tintOpacity - 0.01)
      muted = mix(accent, defaults.tintBase, tintOpacity)
    }
    const text = readable(seed, [...backgrounds, muted], 4.5, mode)
    values[mode] = {
      '--color-accent': accent,
      '--color-on-accent': on,
      '--color-accent-muted': muted,
      '--color-text-accent': text,
      '--color-icon-accent': text,
      '--focus-outline-color': text
    }
    for (const token of ['--color-accent', '--color-text-accent']) if (values[mode][token] !== seed) {
      adjustments.push({ mode, token, source: seed, value: values[mode][token], reason: token === '--color-accent' ? 'Control boundary contrast on default surfaces' : 'Normal text contrast on default and selected surfaces' })
    }
    const check = (purpose, foreground, backgroundList, minimum) => {
      const measured = minimumRatio(foreground, backgroundList)
      // Math.pow's last bits may differ between browser and Node runtimes. Keep
      // reports reproducible and conservative; evaluate pass at full precision.
      checks.push({
        mode, purpose, foreground, backgrounds: backgroundList, minimum,
        ratio: Math.floor(measured * 1e6) / 1e6, pass: measured >= minimum
      })
    }
    check('Accent control boundary', accent, backgrounds, 3)
    check('Text on accent control', on, [accent], 4.5)
    check('Accent text and icons', text, [...backgrounds, muted], 4.5)
    check('Focus outline', text, backgrounds, 3)
    defaults.text.forEach((foreground, index) => check(`Selected surface ${index ? 'secondary' : 'primary'} text`, foreground, [muted], 4.5))
  }
  const tokens = Object.fromEntries(Object.keys(values.light).map((key) => [key, [values.light[key], values.dark[key]]]))
  // This non-color token must be a scalar; tuples of whole shadows are invalid
  // light-dark() CSS in Astryx. Resolve its color via a real semantic color token.
  tokens['--shadow-inset-selected'] = 'inset 0px 0px 0px 2px var(--color-accent)'
  const typography = {}
  const body = fontRole(brand, 'body', 'body', warnings)
  const heading = fontRole(brand, 'display', 'heading', warnings)
  if (body) { typography.body = body; tokens['--font-family-body'] = body.css }
  if (heading) { typography.heading = heading; tokens['--font-family-heading'] = heading.css }
  const bodyWeight = fontWeight(brand.typography?.body?.weight ?? brand.fonts?.body?.weight, 'Body font weight', warnings)
  const headingWeight = fontWeight(brand.typography?.headlines?.weight ?? brand.fonts?.display?.weight, 'Heading font weight', warnings)
  if (bodyWeight) tokens['--text-body-weight'] = bodyWeight
  if (headingWeight) for (let level = 1; level <= 6; level++) tokens[`--text-heading-${level}-weight`] = headingWeight
  const definition = {
    tokens,
    localTokens: { '--brandkit-source-accent': sourceAccent }
  }
  const config = { name: `brandkit-${brand.id.replace(/-+/g, '-').replace(/-$/, '')}-${fingerprint(definition)}`, ...definition }
  const report = {
    schema: ASTRYX_REPORT_SCHEMA,
    brand: { id: brand.id, name: brand.name, version: brand.version ?? null },
    target: { package: '@astryxdesign/core', version: ASTRYX_VERSION, source: upstream, react: '>=19', stylex: '^0.19.0' },
    sourceAccent,
    sourceAccentOrigin,
    accentInputs: Object.fromEntries(modes.map((mode) => [mode, checkedColour(brand, options.accent?.[mode] ?? sourceAccent, `The ${mode} accent`)])),
    config,
    typography,
    adjustments,
    contrast: { method: 'WCAG 2 relative luminance; normal text 4.5:1, control boundaries and focus 3:1; reported ratios rounded down to six decimal places', checks, allPassed: checks.every((check) => check.pass) },
    warnings,
    scope: [
      'Accent controls, accent text/icons, selected surfaces, focus outlines and body/heading typography.',
      'Astryx default neutral surfaces, status colours, component sizing, spacing, radii, motion and code font remain inherited.',
      'Contrast checks cover the pinned ordinary light/dark surfaces and muted overlays; not inverted/media, custom surfaces, disabled, hover, forced-colour or every component state.',
      'Load permitted consumer fonts and approved logo variants separately; theme export does not fetch assets or recolour artwork.',
      'This is a generated UI theme, not an approval of the brand or an application-wide accessibility audit.'
    ]
  }
  return { config, report }
}

/** JSON-safe input to Astryx defineTheme(). Options may supply light/dark colour references. */
export const astryxThemeConfig = (ctx, options) => build(ctx, options).config
export const astryxThemeReport = (ctx, options) => build(ctx, options).report

/** Import in a client application, or precompile with the pinned Astryx theme CLI for SSR. */
export const astryxThemeModule = (ctx, options) => `// Generated by Brandkit for @astryxdesign/core ${ASTRYX_VERSION}.\n// Load permitted consumer fonts separately. See README.md and report.json.\nimport { defineTheme } from '@astryxdesign/core/theme';\n\nexport const brandTheme = defineTheme(${json(astryxThemeConfig(ctx, options)).trim()});\nexport default brandTheme;\n`

export const astryxReadme = (ctx, options) => {
  const report = astryxThemeReport(ctx, options)
  return `# ${String(ctx.brand.name).replace(/[\r\n]/g, ' ')} — Astryx theme

Generated for @astryxdesign/core ${ASTRYX_VERSION}. Theme name: \`${report.config.name}\`.
The full definition is in theme.json; theme.js passes the same object to defineTheme().
report.json records the source, derived colours, contrast checks and font notices.

## Install in a React application

Use React and React DOM 19 or later, with one copy of each. Astryx's CLI requires Node 22.13 or later.

\`\`\`sh
npm install @astryxdesign/core@${ASTRYX_VERSION} @stylexjs/stylex@^0.19.0
npm install -D @astryxdesign/cli@${ASTRYX_VERSION}
\`\`\`

Keep the kit's web/ and fonts/ directories together, or rewrite font URLs when moving them.
Import the prebuilt component CSS and the theme. For a brand whose consumer families match its
bundled, web-licensed fonts, also import web/brand.css to load those fonts. If report.json notes
a separate consumerFamily, load that intended face in the host instead of the artwork font.

\`\`\`jsx
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './brand-kit/web/brand.css';
import { Theme } from '@astryxdesign/core/theme';
import { Button } from '@astryxdesign/core/Button';
import { brandTheme } from './brand-kit/web/astryx/theme.js';

export function App() {
  return <Theme theme={brandTheme} mode="system">
    <Button variant="primary" label="Continue" />
  </Theme>;
}
\`\`\`

The supplied theme module uses runtime CSS injection. For server rendering and a flash-free
initial paint, precompile it with Astryx's theme build command and import BOTH of the generated
JavaScript and CSS outputs using the filenames/exports printed by that command. Those exports
are named from the theme name, not necessarily brandTheme. A client Providers module can import
the built theme object and CSS, then pass the object to Theme. Do not pass a name string to
Theme or serialize its runtime object across a React server/client boundary. Follow Astryx's
pinned SSR guide for initial html theme/mode attributes and hydration.

theme.json is also suitable for a trusted data import: validate it in the host, then call
defineTheme(config). Brandkit's existing web/tokens.json and source/consumer-profile.json
are separate formats and are not inputs to defineTheme(). This export does not register a
theme in Astryx's sandbox/integrations folder or implement a reverse Astryx-to-Brandkit import.

## What is mapped

The primary brand colour seeds light and dark accent controls, text, icons, selected backgrounds
and focus. Separate UI shades are derived when contrast needs them. The original primary stays
in --brandkit-source-accent. Review report.json before approving those derived shades.
Body and heading families follow consumerFamily when set, otherwise the supplied family. Print type sizes,
tracking, label fonts and logo geometry are not interpreted as component design tokens.
Astryx keeps its default surfaces, status colours, spacing, sizes, radii, motion and code face.

For a deliberately chosen dark accent, regenerate programmatically:

\`\`\`js
import { astryxThemeConfig } from 'brandkit/astryx';
const config = astryxThemeConfig({ brand }, { accent: { light: 'primary', dark: '#8BCDBE' } });
\`\`\`

Different brand IDs receive different theme names; an output fingerprint also changes the name
when the colours or typography change, avoiding stale runtime CSS after an edit.
Keep Theme around the workspace subtree and
use Astryx's own portal components so dialogs retain its theme context. Unmount or change that
provider on a workspace switch.

## Artwork and validation

Use supplied complete SVGs or the portable consumer profile, preserving the viewBox, aspect
ratio, approved paint/background, clear space and minimum size. A UI theme does not authorize
recolouring a fixed institutional logo or cropping it into a new icon. Fonts must be loaded
under their supplied names and used according to their licences.

The report checks ordinary light/dark surfaces from v${ASTRYX_VERSION}, including selected surfaces.
It does not establish compliance for every application, custom/inverted/media surface, hover,
disabled or forced-colour state. Test real components, keyboard focus and portals after
integration. Recheck the token contract and these defaults when upgrading Astryx.

Upstream: ${upstream}
Theme contract: ${upstream.replace('/tree/', '/blob/')}/packages/core/src/theme/types.ts
Default tokens: ${upstream.replace('/tree/', '/blob/')}/packages/core/src/theme/tokens.stylex.ts
Brandkit guide: https://github.com/ahzs645/brandkit/blob/main/docs/astryx-integration.md
`
}
