// The brand's Astryx theme, shown the way theme tools show "use this in your app": the theme on a
// few familiar controls in light and dark, the tokens it sets, its contrast checks as rows, the
// setup as numbered steps with copyable snippets, and every generated file in tabs. All of it comes
// from the export itself (engine/astryx.js); nothing here imports Astryx. The preview is drawn with
// plain CSS from the token values over Astryx's pinned default surfaces, so it is a close sketch,
// not Astryx's components (examples/astryx renders the real ones).

import { useId, useMemo, useRef, useState } from 'react'
import { ASTRYX_DEFAULTS, ASTRYX_VERSION, astryxReadme, astryxThemeConfig, astryxThemeModule, astryxThemeReport } from '../../engine/astryx.js'
import { luminance } from '../../engine/brand.js'
import { planKit } from '../../engine/kit.js'
import { KIT_PACKS } from '../../engine/packs.js'
import { download } from '../../export/render.js'
import './astryx-setup.css'

const MODES = [{ id: 'light', label: 'Light', index: 0 }, { id: 'dark', label: 'Dark', index: 1 }]
const EXAMPLE = 'https://github.com/ahzs645/brandkit/tree/main/examples/astryx'
const UPSTREAM = `https://github.com/meta/astryx/tree/v${ASTRYX_VERSION}`

const FILES = [
  { id: 'theme', name: 'theme.js', type: 'text/javascript', about: 'Import this in your app. It passes the definition to Astryx’s defineTheme and exports brandTheme.' },
  { id: 'config', name: 'theme.json', type: 'application/json', about: 'The same definition as data, for a validated import or your own build step.' },
  { id: 'report', name: 'report.json', type: 'application/json', about: 'The source colour, any adjusted shades, every contrast check, font notices and limits.' },
  { id: 'readme', name: 'README.md', type: 'text/markdown', about: 'The setup guide that travels with the theme in the kit.' }
]

// The colour tokens the theme sets, in the order a reader meets them in the preview.
const COLOUR_TOKENS = [
  ['--color-accent', 'Primary buttons, checked controls, selection outlines'],
  ['--color-on-accent', 'Text and icons on accent fills'],
  ['--color-accent-muted', 'Selected rows and tinted backgrounds'],
  ['--color-text-accent', 'Links and accent text'],
  ['--color-icon-accent', 'Accent icons'],
  ['--focus-outline-color', 'Keyboard focus ring']
]

const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
// A check passes on every background it lists; the row shows the hardest one.
const hardest = (check) => check.backgrounds.reduce((worst, background) => (contrast(check.foreground, background) < contrast(check.foreground, worst) ? background : worst))
const ratioText = (value) => `${(Math.floor(value * 100) / 100).toFixed(2)}:1`
const fenced = (markdown, language) => new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\`\`\``).exec(markdown)?.[1] ?? ''
const isFontNotice = (text) => /^(body|heading|Body font weight|Heading font weight)\b/.test(text)
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

const save = (name, content, type) => download(new Blob([content], { type }), name)

const CopyButton = ({ text, label = 'Copy', name }) => {
  const [done, setDone] = useState(false)
  const timer = useRef(0)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setDone(false), 1500)
    } catch { setDone(false) }
  }
  return <button type="button" className="button button--quiet astryx-setup__copy" onClick={copy} aria-label={name ? `${label} ${name}` : undefined}>
    <span aria-live="polite">{done ? 'Copied' : label}</span>
  </button>
}

/** A labelled, bounded code block: its file or place on top, a copy button beside it. */
const Snippet = ({ label, code }) => <div className="astryx-snippet">
  <div className="astryx-snippet__head"><span>{label}</span><CopyButton text={code} name={label} /></div>
  <pre tabIndex={0} aria-label={label}><code>{code.replace(/\n$/, '')}</code></pre>
</div>

/** Buttons in a row as tabs: arrow keys, Home and End move between them. */
const Tabs = ({ label, items, value, onChange, idBase }) => {
  const move = (event, index) => {
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: items.length - 1 }[event.key]
    if (next == null) return
    event.preventDefault()
    const item = items[(next + items.length) % items.length]
    onChange(item.id)
    document.getElementById(`${idBase}-tab-${item.id}`)?.focus()
  }
  return <div className="segmented astryx-tabs" role="tablist" aria-label={label}>
    {items.map((item, index) => <button key={item.id} type="button" role="tab" id={`${idBase}-tab-${item.id}`} aria-controls={`${idBase}-panel`} aria-selected={value === item.id} tabIndex={value === item.id ? 0 : -1} onKeyDown={(event) => move(event, index)} onClick={() => onChange(item.id)}>{item.label}</button>)}
  </div>
}

/**
 * The theme on familiar controls, in one mode. Values come straight from the tokens; the page,
 * card, overlay and text colours are Astryx's defaults, which the theme leaves alone.
 */
const Preview = ({ brand, mode, tokens }) => {
  const defaults = ASTRYX_DEFAULTS[mode.id]
  const value = (token) => tokens[token]?.[mode.index]
  const style = {
    colorScheme: mode.id,
    '--ax-page': defaults.surfaces[0],
    '--ax-card': defaults.surfaces[1],
    '--ax-overlay': defaults.muted,
    '--ax-text': defaults.text[0],
    '--ax-text-2': defaults.text[1],
    '--ax-accent': value('--color-accent'),
    '--ax-on-accent': value('--color-on-accent'),
    '--ax-accent-muted': value('--color-accent-muted'),
    '--ax-text-accent': value('--color-text-accent'),
    '--ax-icon-accent': value('--color-icon-accent'),
    '--ax-focus': value('--focus-outline-color'),
    '--ax-font-body': tokens['--font-family-body'] ?? 'system-ui, sans-serif',
    '--ax-font-heading': tokens['--font-family-heading'] ?? tokens['--font-family-body'] ?? 'system-ui, sans-serif',
    '--ax-weight-body': tokens['--text-body-weight'] ?? 400,
    '--ax-weight-heading': tokens['--text-heading-1-weight'] ?? 600
  }
  return <figure className="astryx-preview">
    <figcaption><strong>{mode.label}</strong> <span className="muted">mode</span></figcaption>
    <div className="astryx-preview__page" style={style} aria-hidden="true">
      <div className="astryx-preview__card">
        <p className="astryx-preview__eyebrow">Workspace</p>
        <p className="astryx-preview__title">Project settings</p>
        <p className="astryx-preview__body">{brand.name}’s accent and type on Astryx’s default surfaces.</p>
        <div className="astryx-preview__tabs"><span data-selected="">General</span><span>Members</span><span>Billing</span></div>
        <div className="astryx-preview__field">
          <span className="astryx-preview__label">Workspace name</span>
          <span className="astryx-preview__input" data-focused="">Field research team<span className="astryx-preview__caret" /></span>
        </div>
        <div className="astryx-preview__list">
          <span data-selected=""><span>Brand files</span><span className="astryx-preview__meta">Selected</span></span>
          <span><span>Templates</span><span className="astryx-preview__meta">12 items</span></span>
        </div>
        <div className="astryx-preview__options">
          <span className="astryx-preview__check"><span className="astryx-preview__box">✓</span>Email updates</span>
          <span className="astryx-preview__check"><span className="astryx-preview__switch" />Auto-save</span>
        </div>
        <span className="astryx-preview__link">View contrast report →</span>
        <div className="astryx-preview__actions"><span className="astryx-preview__button">Save changes</span><span className="astryx-preview__button astryx-preview__button--secondary">Cancel</span></div>
      </div>
    </div>
  </figure>
}

const Swatch = ({ value, adjusted }) => <span className="astryx-token__value">
  <span className="astryx-token__chip" style={{ background: value }} />
  <code>{value}</code>
  {adjusted && <span className="astryx-token__note">adjusted from <code>{adjusted}</code></span>}
</span>

const Font = ({ family, weight }) => <span className="astryx-token__value">
  <span className="astryx-token__font" style={{ fontFamily: family, fontWeight: weight }} aria-hidden="true">Aa</span>
  <code>{family}</code>
</span>

const TokenTable = ({ config, report }) => {
  const adjusted = (mode, token) => report.adjustments.find((entry) => entry.mode === mode && entry.token === token)?.source
  const { tokens } = config
  const headingWeights = Object.keys(tokens).filter((token) => /^--text-heading-\d-weight$/.test(token))
  const other = [
    tokens['--font-family-body'] && ['--font-family-body', 'Body text', <Font family={tokens['--font-family-body']} weight={tokens['--text-body-weight']} />],
    tokens['--font-family-heading'] && ['--font-family-heading', 'Headings', <Font family={tokens['--font-family-heading']} weight={tokens[headingWeights[0]]} />],
    tokens['--text-body-weight'] && ['--text-body-weight', 'Body weight', <code>{tokens['--text-body-weight']}</code>],
    headingWeights.length > 0 && [`--text-heading-1…${headingWeights.length}-weight`, 'Heading weights', <code>{tokens[headingWeights[0]]}</code>],
    tokens['--shadow-inset-selected'] && ['--shadow-inset-selected', 'Selected-control ring (follows the accent)', <code>{tokens['--shadow-inset-selected']}</code>],
    ['--brandkit-source-accent', 'The original primary, kept as a local token', <Swatch value={config.localTokens['--brandkit-source-accent']} />]
  ].filter(Boolean)
  return <>
    <table className="astryx-tokens">
      <caption className="visually-hidden">Colour tokens in light and dark mode</caption>
      <thead><tr><th scope="col">Token</th><th scope="col">Light</th><th scope="col">Dark</th></tr></thead>
      <tbody>
        {COLOUR_TOKENS.filter(([token]) => tokens[token]).map(([token, use]) => <tr key={token}>
          <th scope="row"><code>{token}</code><span>{use}</span></th>
          {MODES.map((mode) => <td key={mode.id} data-mode={mode.label}><Swatch value={tokens[token][mode.index]} adjusted={adjusted(mode.id, token)} /></td>)}
        </tr>)}
      </tbody>
    </table>
    <table className="astryx-tokens astryx-tokens--single">
      <caption className="visually-hidden">Typography and other tokens, the same in both modes</caption>
      <thead><tr><th scope="col">Token</th><th scope="col">Both modes</th></tr></thead>
      <tbody>
        {other.map(([token, use, shown]) => <tr key={token}><th scope="row"><code>{token}</code><span>{use}</span></th><td>{shown}</td></tr>)}
      </tbody>
    </table>
  </>
}

const ContrastChecks = ({ report }) => <div className="astryx-contrast">
  {MODES.map((mode) => <div key={mode.id} className="astryx-contrast__mode">
    <h3>{mode.label} mode</h3>
    <ul>
      {report.contrast.checks.filter((check) => check.mode === mode.id).map((check) => {
        const background = hardest(check)
        return <li key={check.purpose}>
          <span className="astryx-contrast__sample" style={{ color: check.foreground, background }} aria-hidden="true">Aa</span>
          <span className="astryx-contrast__text">
            <strong>{check.purpose}</strong>
            <span className="muted"><code>{check.foreground}</code> on <code>{background}</code>{check.backgrounds.length > 1 ? `, hardest of ${check.backgrounds.length} surfaces` : ''}</span>
          </span>
          <span className="astryx-contrast__ratio">{ratioText(check.ratio)}<span className="muted"> needs {check.minimum}:1</span></span>
          <span className={`astryx-badge astryx-badge--${check.pass ? 'pass' : 'fail'}`}>{check.pass ? 'Pass' : 'Fail'}</span>
        </li>
      })}
    </ul>
  </div>)}
</div>

// What the Website kit carries, folder by folder, so step 1 says what arrives.
const kitFolders = (brand) => {
  try {
    const pack = KIT_PACKS.find((item) => item.id === 'web')
    const counts = new Map()
    for (const entry of planKit(brand, { ...pack.options, pack: 'web' })) {
      const folder = entry.path.startsWith('web/astryx/') ? 'web/astryx/' : entry.path.includes('/') ? `${entry.path.split('/')[0]}/` : 'package files'
      counts.set(folder, (counts.get(folder) ?? 0) + 1)
    }
    return [...counts]
  } catch { return [] }
}

export const AstryxSetup = ({ brand }) => {
  const idBase = useId().replace(/:/g, '')
  const [file, setFile] = useState('theme')
  const [error, setError] = useState('')
  const result = useMemo(() => {
    try {
      const ctx = { brand }
      const config = astryxThemeConfig(ctx)
      const report = astryxThemeReport(ctx)
      const readme = astryxReadme(ctx)
      return {
        config, report, readme,
        files: { theme: astryxThemeModule(ctx), config: `${JSON.stringify(config, null, 2)}\n`, report: `${JSON.stringify(report, null, 2)}\n`, readme }
      }
    } catch (problem) {
      return { error: problem.message }
    }
  }, [brand])
  const folders = useMemo(() => kitFolders(brand), [brand])
  const saveFile = (entry) => {
    setError('')
    try { save(entry.name, result.files[entry.id], entry.type) } catch (problem) { setError(problem.message) }
  }

  const head = <div className="panel__head">
    <h2 id={`${idBase}-heading`}>Astryx theme</h2>
    <p className="muted">{brand.name}’s accent and typography as a theme for <a href={UPSTREAM} target="_blank" rel="noreferrer">Astryx</a> {ASTRYX_VERSION}, Meta’s React design system, in light and dark mode.</p>
  </div>
  if (result.error) return <section className="panel astryx-setup" aria-labelledby={`${idBase}-heading`}>
    {head}
    <p className="notice notice--error" role="alert">The Astryx theme could not be generated: {result.error}</p>
  </section>

  const { config, report, readme, files } = result
  const checks = report.contrast.checks
  const passed = checks.filter((check) => check.pass).length
  const fontNotices = report.warnings.filter(isFontNotice)
  const otherNotices = report.warnings.filter((text) => !isFontNotice(text))
  const install = fenced(readme, 'sh')
  const app = fenced(readme, 'jsx')
  const ssr = `npx @astryxdesign/cli@${ASTRYX_VERSION} theme build ./brand-kit/web/astryx/theme.js\n`
  const shown = FILES.find((entry) => entry.id === file)
  const adjustedWays = MODES.filter((mode) => report.adjustments.some((entry) => entry.mode === mode.id)).map((mode) => (mode.id === 'light' ? 'darker in light mode' : 'lighter in dark mode')).join(' and ')
  const families = [report.typography.body?.family, report.typography.heading?.family].filter((family, index, all) => family && all.indexOf(family) === index)

  return <section className="astryx-setup" aria-labelledby={`${idBase}-heading`}>
    <div className="panel">
      <div className="astryx-setup__intro">
        {head}
        <div className="documents-actions">
          <button type="button" className="button" onClick={() => saveFile(FILES[0])}>Download theme</button>
        </div>
      </div>
      <ul className="astryx-setup__facts" aria-label="Theme summary">
        <li><span className="astryx-badge">Astryx {ASTRYX_VERSION}</span></li>
        <li><span className="astryx-badge">Light and dark</span></li>
        <li><span className={`astryx-badge astryx-badge--${report.contrast.allPassed ? 'pass' : 'fail'}`}>{passed} of {checks.length} contrast checks pass</span></li>
        {report.adjustments.length > 0 && <li><span className="astryx-badge">{plural(report.adjustments.length, 'shade')} adjusted for contrast</span></li>}
        {families.length > 0 && <li><span className="astryx-badge">{families.join(' + ')}</span></li>}
      </ul>
      {otherNotices.map((text) => <p key={text} className="notice astryx-setup__notice">{text}</p>)}
      <div className="astryx-previews">
        {MODES.map((mode) => <Preview key={mode.id} brand={brand} mode={mode} tokens={config.tokens} />)}
      </div>
      <p className="muted astryx-setup__small">A sketch drawn from the exported tokens over Astryx’s default surfaces, not Astryx’s own components. Brandkit’s <a href={EXAMPLE} target="_blank" rel="noreferrer">example app</a> renders the real ones with this theme.</p>
    </div>

    <div className="panel">
      <div className="panel__head">
        <h2>Set up in a React app</h2>
        <p className="muted">Five steps from the kit to a themed app. The same guide is in the kit as <code>web/astryx/README.md</code>.</p>
      </div>
      <ol className="astryx-steps">
        <li>
          <h3>Download the Website kit</h3>
          <p>In <strong>Download kit</strong>, choose <strong>Website</strong> (or <strong>Everything</strong>). Unzip it into your app as <code>brand-kit/</code>, keeping <code>web/</code> and <code>fonts/</code> side by side so the font URLs in <code>web/brand.css</code> still resolve.</p>
          {folders.length > 0 && <ul className="astryx-kit" aria-label="What the Website kit contains">
            {folders.map(([folder, count]) => <li key={folder} data-key={folder === 'web/astryx/' || folder === 'fonts/' ? '' : undefined}><code>{folder}</code><span className="muted">{plural(count, 'file')}</span></li>)}
          </ul>}
        </li>
        <li>
          <h3>Install Astryx {ASTRYX_VERSION}</h3>
          <p>Use React and React DOM 19 or later, one copy of each. The pinned version matches the token contract this theme was checked against; Astryx’s CLI needs Node 22.13 or later.</p>
          {install && <Snippet label="Terminal" code={install} />}
        </li>
        <li>
          <h3>Load the styles, fonts and theme</h3>
          <p>Import Astryx’s reset and component CSS first, then the kit’s <code>web/brand.css</code> for the brand’s fonts, and wrap the app in <code>Theme</code> with <code>brandTheme</code>. <code>mode="system"</code> follows the visitor’s light or dark setting; pass <code>"light"</code> or <code>"dark"</code> to fix it.</p>
          {fontNotices.map((text) => <p key={text} className="notice astryx-setup__notice">{text}</p>)}
          {app && <Snippet label="src/App.jsx" code={app} />}
        </li>
        <li>
          <h3>Precompile for server rendering <span className="muted">(optional)</span></h3>
          <p>The theme module injects its CSS at runtime. For server rendering or a flash-free first paint, build it with the pinned CLI and import both the JavaScript and CSS it prints. Its export is named from the theme name, <code>{config.name}</code>, not <code>brandTheme</code>.</p>
          <Snippet label="Terminal" code={ssr} />
        </li>
        <li>
          <h3>Check it in your app</h3>
          <p>The checks below cover Astryx’s ordinary surfaces. Test your real screens too: custom or image backgrounds, hover and disabled states, keyboard focus and dialogs. Recheck when you upgrade Astryx.</p>
        </li>
      </ol>
    </div>

    <div className="panel">
      <div className="panel__head">
        <h2>Theme tokens</h2>
        <p className="muted">What <code>theme.js</code> sets. Everything else, including surfaces, status colours, spacing, radii and motion, stays Astryx’s default.</p>
      </div>
      <TokenTable config={config} report={report} />
      {adjustedWays && <p className="muted astryx-setup__small">Adjusted shades are the source colour made {adjustedWays} only as far as contrast needs. They are interface shades, not new logo colours.</p>}
    </div>

    <div className="panel">
      <div className="panel__head">
        <h2>Contrast</h2>
        <p className="muted">{passed} of {checks.length} checks pass. WCAG 2 ratios: 4.5:1 for text, 3:1 for control edges and focus rings, measured against Astryx {ASTRYX_VERSION}’s default page, card and popover surfaces.</p>
      </div>
      <ContrastChecks report={report} />
    </div>

    <div className="panel">
      <div className="panel__head">
        <h2>Files</h2>
        <p className="muted">The four files in the kit’s <code>web/astryx/</code> folder. The kit adds <code>web/brand.css</code>, the fonts and the logos.</p>
      </div>
      <Tabs label="Theme files" items={FILES.map((entry) => ({ id: entry.id, label: entry.name }))} value={file} onChange={setFile} idBase={idBase} />
      <div className="astryx-file" role="tabpanel" id={`${idBase}-panel`} aria-labelledby={`${idBase}-tab-${file}`}>
        <div className="astryx-file__head">
          <p><code>web/astryx/{shown.name}</code> <span className="muted">{shown.about}</span></p>
          <div className="documents-actions">
            <CopyButton text={files[file]} name={shown.name} />
            <button type="button" className="button button--quiet" onClick={() => saveFile(shown)}>↓ {shown.name}</button>
          </div>
        </div>
        <pre tabIndex={0} aria-label={file === 'theme' ? 'Astryx theme source' : `Astryx ${shown.name}`}><code>{files[file]}</code></pre>
      </div>
      {error && <p className="notice notice--error" role="alert">{error}</p>}
    </div>
  </section>
}
