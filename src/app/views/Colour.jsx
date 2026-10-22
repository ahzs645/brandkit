// A brand's colour, the way public brand guides set it out: every colour with its values for
// screen and print, the role pairs text is set in and whether they read, every text-on-ground
// pair graded against WCAG 2, and tints in steps of 20%.

import { useState } from 'react'
import { isDark, rgb } from '../../engine/brand.js'
import { download } from '../../export/render.js'
import { colourEntries, contrast, grade, printValues, ratioLabel, rolePairs, tintsOf } from '../colours.js'
import { Segmented } from '../ui.jsx'

const copy = (text) => navigator.clipboard?.writeText(text)

const slug = (value) => value.toLowerCase().replace(/\s+/g, '-')
const Grade = ({ value }) => <span className={`grade grade--${slug(value)}`}>{value}</span>

/** The palette as a CSV a designer or developer can paste into a spreadsheet. */
const paletteCsv = (brand, entries) => {
  const rows = entries.map((entry) => {
    const print = printValues(brand, entry.key, entry.hex)
    return [entry.name, entry.hex, (rgb(entry.hex) ?? []).join(' '), print.cmyk + (print.converted ? ' (converted)' : ''), print.pantone ?? '', entry.roles.join(' ')]
  })
  return [['Colour', 'Hex', 'RGB', 'CMYK', 'Pantone', 'Roles'], ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n') + '\n'
}

const Palette = ({ brand, entries }) => (
  <section className="panel">
    <div className="panel__head panel__head--row">
      <div>
        <h2>Palette</h2>
        <p className="muted">Hex and RGB for screens; CMYK and Pantone for print. Click a value to copy it.</p>
      </div>
      <button type="button" className="button button--quiet" onClick={() => download(paletteCsv(brand, entries), `${brand.id}-colours.csv`)}>↓ CSV</button>
    </div>
    <div className="colour-cards">
      {entries.map((entry) => {
        const print = printValues(brand, entry.key, entry.hex)
        const values = [['Hex', entry.hex], ['RGB', (rgb(entry.hex) ?? []).join(', ')], ['CMYK', print.cmyk, print.converted && 'Converted from RGB: ask the printer for a proof'], print.pantone && ['Spot', print.pantone]].filter(Boolean)
        return (
          <article key={`${entry.own ? 'role' : 'colour'}-${entry.key}`} className="colour-card">
            <div className="colour-card__fill" style={{ background: entry.hex, color: isDark(entry.hex) ? '#fff' : '#000' }}>
              <strong>{entry.name}</strong>
              <span>{entry.roles.join(' · ')}</span>
            </div>
            <dl>
              {values.map(([label, value, note]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd><button type="button" className="copyable" title={note || 'Copy'} onClick={() => copy(value)}>{value}{note && <sup aria-hidden="true">≈</sup>}</button></dd>
                </div>
              ))}
            </dl>
          </article>
        )
      })}
    </div>
    {brand.print?.note && <p className="caption caption--flush">{brand.print.note}</p>}
    {entries.some((entry) => printValues(brand, entry.key, entry.hex).converted) && <p className="caption caption--flush">≈ CMYK converted from the screen colour. It is a starting point, not a press match.</p>}
  </section>
)

const Roles = ({ brand }) => {
  const pairs = rolePairs(brand)
  if (!pairs.length) return null
  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Text on the brand’s grounds</h2>
        <p className="muted">The role pairs templates and guide pages set text in. AA needs 4.5 : 1 for body text and 3 : 1 for large text (18 pt, or 14 pt bold).</p>
      </div>
      <div className="role-pairs">
        {pairs.map((pair) => (
          <div key={`${pair.text}-${pair.ground}`} className="role-pair">
            <span className="role-pair__sample" style={{ background: pair.back, color: pair.fore }}>Aa</span>
            <span className="role-pair__text"><strong>{pair.text} on {pair.ground}</strong><span>{pair.use}</span></span>
            <span className="role-pair__score"><Grade value={pair.grade} /><code>{ratioLabel(pair.ratio)}</code></span>
          </div>
        ))}
      </div>
    </section>
  )
}

const Matrix = ({ entries }) => {
  const [passing, setPassing] = useState(false)
  return (
    <section className="panel">
      <div className="panel__head panel__head--row">
        <div>
          <h2>Every pair</h2>
          <p className="muted">Each colour as text (rows) on each as a ground (columns).</p>
        </div>
        <Segmented label="Show" value={passing ? 'passing' : 'all'} options={[{ value: 'all', label: 'All pairs' }, { value: 'passing', label: 'AA and better' }]} onChange={(value) => setPassing(value === 'passing')} />
      </div>
      <div className="contrast-scroll">
        <table className="contrast">
          <thead>
            <tr><th scope="col"><span className="visually-hidden">Text</span></th>{entries.map((ground) => <th key={ground.key} scope="col"><span className="contrast__dot" style={{ background: ground.hex }} />{ground.name}</th>)}</tr>
          </thead>
          <tbody>
            {entries.map((text) => (
              <tr key={text.key}>
                <th scope="row"><span className="contrast__dot" style={{ background: text.hex }} />{text.name}</th>
                {entries.map((ground) => {
                  if (text.key === ground.key && text.own === ground.own) return <td key={ground.key} className="contrast__same" />
                  const ratio = contrast(text.hex, ground.hex)
                  const value = grade(ratio)
                  const hidden = passing && ratio < 4.5
                  return (
                    <td key={ground.key} style={hidden ? undefined : { background: ground.hex, color: text.hex }} className={hidden ? 'contrast__hidden' : undefined} title={`${text.name} on ${ground.name}: ${ratioLabel(ratio)}, ${value}`}>
                      {!hidden && <><b>Aa</b><span className={`contrast__badge contrast__badge--${slug(value)}`}>{value === 'AA large' ? 'AA18' : value}</span></>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const Tints = ({ brand, entries }) => {
  const [key, setKey] = useState(entries.find((entry) => brand.roles?.primary === entry.key)?.key ?? entries[0]?.key)
  const entry = entries.find((item) => item.key === key) ?? entries[0]
  if (!entry) return null
  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Tints</h2>
        <p className="muted">Steps of 20% over white, each with the ink or reverse that reads better on it. Check text on a tint as you would on the colour.</p>
      </div>
      <div className="chips">
        {entries.filter((item) => !item.own).map((item) => <button key={item.key} type="button" className="chip" aria-pressed={item.key === entry.key} title={item.name} style={{ background: item.hex }} onClick={() => setKey(item.key)} />)}
      </div>
      <div className="tints">
        {tintsOf(brand, entry.hex).map((step) => (
          <button key={step.percent} type="button" className="tint" style={{ background: step.hex, color: step.text }} onClick={() => copy(step.hex)} title="Copy hex value">
            <strong>{step.percent}%</strong>
            <code>{step.hex}</code>
            <span><Grade value={step.grade} /> {ratioLabel(step.ratio)}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

export const Colour = ({ brand }) => {
  const entries = colourEntries(brand)
  return (
    <div className="view">
      <Palette brand={brand} entries={entries} />
      <div className="split">
        <Roles brand={brand} />
        <Tints brand={brand} entries={entries} />
      </div>
      <Matrix entries={entries} />
    </div>
  )
}
