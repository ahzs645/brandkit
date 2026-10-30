// A brand's motion library, in brandkit's own interface: its studies in a list like the template
// studio's, the chosen one playing on the stage with its timing and use beside it, and the tokens,
// rules and guardrails every study shares. The library page itself (`motion.page`) is a link away.

import { useEffect, useState } from 'react'
import { colour, isDark } from '../../engine/brand.js'
import { download, zip } from '../../export/render.js'
import { easingPath, motionGroups, motionUrl, tokenRows, tokensCss, tokensJson } from '../motion.js'
import { animatedSvg, CssStage, StudyStage, useMotionLibrary, useReducedMotion } from '../motion-player.jsx'
import { MotionExport } from '../MotionExport.jsx'
import { Field, Select } from '../ui.jsx'

export { motionUrl }

/** A study's swatch in the list when its page draws it with a script: the ground it plays on. */
const groundOf = (brand, study) => (study.background ? colour(brand, study.background) : null)

const capital = (text) => String(text).charAt(0).toUpperCase() + String(text).slice(1)
const loops = (study) => Boolean(study.loop) || /\bloop\b/.test(study.timing ?? '')
const kindLabel = (study) => [study.kind && capital(study.kind), loops(study) && 'loops'].filter(Boolean).join(' · ')

const Thumb = ({ brand, library, study }) => {
  if (library?.mode === 'css') return <CssStage library={library} id={study.id} className="motion-thumb__art" design={420} label="" />
  const ground = groundOf(brand, study) ?? 'var(--page)'
  return <span className="motion-thumb__swatch" style={{ background: ground, color: isDark(ground) ? '#fff' : '#000' }}>{loops(study) ? '↻' : '▸'}</span>
}

/** A button that copies text and says so for a moment. */
const CopyButton = ({ text, children }) => {
  const [done, setDone] = useState(false)
  useEffect(() => { if (!done) return undefined; const timer = setTimeout(() => setDone(false), 1800); return () => clearTimeout(timer) }, [done])
  return <button type="button" className="button button--quiet" onClick={() => navigator.clipboard?.writeText(text).then(() => setDone(true))}>{done ? '✓ Copied' : children}</button>
}

const Tokens = ({ brand, tokens = {}, reduced }) => {
  const rows = tokenRows(tokens)
  const longest = Math.max(1, ...rows.map(([, , ms]) => ms ?? 0))
  return (
    <section className="panel">
      <div className="panel__head panel__head--row">
        <div>
          <h2>Timing and easing</h2>
          <p className="muted">Every study runs on these. Copy them as CSS custom properties, or as W3C design tokens for Figma Tokens, Style Dictionary and the like.</p>
        </div>
        <div className="downloads">
          <CopyButton text={tokensCss(tokens, brand.id)}>Copy CSS</CopyButton>
          <CopyButton text={tokensJson(tokens)}>Copy JSON</CopyButton>
        </div>
      </div>
      <table className="motion-tokens">
        <tbody>
          {rows.map(([name, value, ms]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td>{value}</td>
              <td>{ms != null && <span className="motion-tokens__bar" style={{ width: `${(ms / longest) * 100}%` }} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {Object.keys(tokens.easings ?? {}).length > 0 && (
        <div className="motion-eases">
          {Object.entries(tokens.easings).map(([name, value]) => (
            <div key={name} className="motion-ease">
              <svg viewBox="-6 -6 112 112" aria-hidden="true"><path className="motion-ease__axis" d="M0 0V100H100" /><path className="motion-ease__curve" d={easingPath(value)} /></svg>
              <div>
                <strong>{name}</strong>
                <code>{value}</code>
                <span className="motion-ease__track"><span style={{ animationTimingFunction: value, animationPlayState: reduced ? 'paused' : undefined }} /></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

const Rules = ({ motion }) => (
  <section className="panel">
    <div className="panel__head"><h2>How {motion.name ?? 'it'} moves</h2></div>
    {motion.rules?.length > 0 && (
      <ol className="motion-rules">
        {motion.rules.map((rule) => <li key={rule.title}><strong>{rule.title}</strong><span>{rule.text}</span></li>)}
      </ol>
    )}
    {motion.guardrails && (
      <div className="motion-guardrails">
        {[['do', 'Do'], ['dont', 'Don’t']].filter(([key]) => motion.guardrails[key]?.length).map(([key, label]) => (
          <div key={key} className={`motion-guardrails__list motion-guardrails__list--${key}`}>
            <h3>{label}</h3>
            <ul>{motion.guardrails[key].map((line) => <li key={line}>{line}</li>)}</ul>
          </div>
        ))}
      </div>
    )}
  </section>
)

/** The brand's motion as one zip: tokens for code, the rules and studies in a README, each study that plays without the page as an animated SVG, and the library page itself. */
const motionPack = async (brand, library, source) => {
  const { motion } = brand
  const text = (value) => new TextEncoder().encode(value)
  const files = [
    ['tokens.css', text(tokensCss(motion.tokens, brand.id))],
    ['tokens.json', text(tokensJson(motion.tokens))]
  ]
  const lines = [`# ${brand.name} motion`, '', `${motion.studies?.length ?? 0} studies, exported from brandkit. Video and GIF versions of the studies drawn in SVG are on the Motion tab.`, '']
  if (motion.rules?.length) lines.push('## Rules', '', ...motion.rules.map((rule) => `- **${rule.title}** ${rule.text}`), '')
  for (const [key, label] of [['do', 'Do'], ['dont', 'Don’t']]) if (motion.guardrails?.[key]?.length) lines.push(`## ${label}`, '', ...motion.guardrails[key].map((line) => `- ${line}`), '')
  lines.push('## Studies', '', '| Study | Kind | Timing | Use | File |', '| --- | --- | --- | --- | --- |')
  for (const study of motion.studies ?? []) {
    const svg = library?.mode === 'css' && library.stages.get(study.id)?.shapesOnly
    if (svg) files.push([`svg/${study.id}.svg`, text(animatedSvg(library, study.id))])
    lines.push(`| ${study.name}: ${study.description} | ${study.kind ?? ''} | ${study.timing ?? ''} | ${study.use ?? ''} | ${svg ? `svg/${study.id}.svg` : 'library page'} |`)
  }
  lines.push('', '`tokens.css` holds the tokens as CSS custom properties; `tokens.json` in the W3C design tokens format.', '')
  for (const path of [motion.page, motion.css].filter(Boolean)) {
    try { files.push([`library/${path.split('/').pop()}`, new Uint8Array(await source.read(path))]) } catch { /* not in this brand's files */ }
  }
  files.push(['README.md', text(lines.join('\n'))])
  download(new Blob([await zip(files, `${brand.id}-motion`)], { type: 'application/zip' }), `${brand.id}-motion.zip`)
}

export const Motion = ({ brand, source, initialStudy, onSelect }) => {
  const url = motionUrl(brand, source)
  const library = useMotionLibrary(brand, source)
  const reduced = useReducedMotion()
  const studies = brand.motion?.studies ?? []
  const [selected, setSelected] = useState(() => (studies.some((study) => study.id === initialStudy) ? initialStudy : studies[0]?.id))
  const [play, setPlay] = useState(1)
  const [paused, setPaused] = useState(false)
  const [loop, setLoop] = useState(false)
  const [packing, setPacking] = useState(false)
  useEffect(() => { if (!studies.some((study) => study.id === selected)) setSelected(studies[0]?.id) }, [studies, selected])

  if (!url) {
    return <div className="view"><p className="muted">{brand.name} has no motion library. A brand adds one by naming its page in <code>motion.page</code>.</p></div>
  }
  const study = studies.find((entry) => entry.id === selected) ?? studies[0]
  const choose = (id) => { setSelected(id); setPlay((value) => value + 1); setPaused(false); onSelect?.(id) }
  const groups = motionGroups(brand.motion)
  const svgReady = library?.mode === 'css' && library.stages.get(study?.id)?.shapesOnly
  const motion = { ...brand.motion, name: brand.name }

  return (
    <div className="view motion">
      {brand.motion.note && <p className="notice">{brand.motion.note}</p>}
      <div className="studio motion-studio">
        <nav className="studio__list" aria-label="Motion studies">
          {groups.map((group) => (
            <div key={group.id} className="studio__group">
              <h3>{group.label}</h3>
              {group.studies.map((entry) => (
                <button key={entry.id} type="button" className="studio__item motion-item" aria-pressed={entry.id === study?.id} onClick={() => choose(entry.id)}>
                  <span className="motion-thumb">{library && <Thumb brand={brand} library={library} study={entry} />}</span>
                  <span>{entry.name}<span className="studio__count">{kindLabel(entry)}</span></span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <section className="studio__stage motion-stage-panel" aria-label="Study">
          {/* A phone has no room for the list beside the stage, and a list above it would push the
              stage a screen down: there the studies are a dropdown, grouped as in the list. */}
          <div className="motion-picker">
            <Field label="Study">
              <Select value={study?.id} onChange={choose} options={groups.flatMap((group) => group.studies.map((entry) => ({ value: entry.id, label: entry.name, group: group.label })))} />
            </Field>
          </div>
          <div className="motion-canvas">
            {!library ? <p className="muted">Loading the motion library…</p> : study && (
              <StudyStage key={library.mode === 'css' ? study.id : 'frame'} library={library} id={study.id} play={play} paused={paused} loop={loop && !reduced} design={720} label={`${study.name}: ${study.description}`} />
            )}
          </div>
          <div className="studio__bar">
            <button type="button" className="button" disabled={reduced || !library} onClick={() => { setPaused(false); setPlay((value) => value + 1) }}>↺ Replay</button>
            <button type="button" className="button button--quiet" disabled={reduced || !library} aria-pressed={paused} onClick={() => setPaused((value) => !value)}>{paused ? '▶ Resume' : 'Ⅱ Pause'}</button>
            <label className="studio__toggle"><input type="checkbox" checked={loop} disabled={reduced} onChange={(event) => setLoop(event.target.checked)} /> Play on repeat</label>
            <span className="studio__downloads">
              <button type="button" className="button button--quiet" disabled={!library || packing} onClick={() => { setPacking(true); motionPack(brand, library, source).finally(() => setPacking(false)) }}>{packing ? '…' : '↓'} Motion pack</button>
              <a className="button button--quiet" href={url} target="_blank" rel="noreferrer">Open the library page ↗</a>
            </span>
          </div>
          {reduced && <p className="studio__note">Your device asks for reduced motion, so each study shows its final frame.</p>}
        </section>

        {study && (
          <aside className="studio__fields motion-about">
            <div>
              <span className="eyebrow">{groups.find((group) => group.studies.includes(study))?.label ?? study.group}</span>
              <h2>{study.name}</h2>
              <p>{study.description}</p>
            </div>
            <dl className="facts">
              {study.timing && <div><dt>Timing</dt><dd>{study.timing}</dd></div>}
              {study.use && <div><dt>Use</dt><dd>{study.use}</dd></div>}
              {study.kind && <div><dt>Kind</dt><dd>{kindLabel(study)}</dd></div>}
            </dl>
            {library?.mode === 'css' && library.stages.get(study.id)?.vector && <MotionExport key={study.id} brand={brand} library={library} study={study} />}
            {svgReady && (
              <div className="motion-about__downloads">
                <button type="button" className="button button--quiet" onClick={() => download(animatedSvg(library, study.id), `${brand.id}-motion-${study.id}.svg`)}>↓ Animated SVG</button>
                <p className="field__hint">For a web page: plays once in a browser, then holds its last frame.</p>
              </div>
            )}
            {library?.mode === 'css' && !library.stages.get(study.id)?.vector && <p className="field__hint">This study is drawn with HTML and text, so it plays here and in the library page but does not export as video.</p>}
          </aside>
        )}
      </div>

      <div className="split">
        <Tokens brand={brand} tokens={brand.motion.tokens} reduced={reduced} />
        <Rules motion={motion} />
      </div>
    </div>
  )
}
