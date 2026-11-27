// Editing a brand's product family: the family's settings, its products, the lockup variants and
// directions being compared, and what has been decided. The Products view previews the draft as it
// changes; nothing is kept until it is saved with the brand (or into the revision it belongs to).

import { useRef, useState } from 'react'
import { PRODUCT_ARRANGEMENTS, PRODUCT_SEPARATORS, PRODUCT_TILE_STYLES } from '../../engine/brand.js'
import { newProduct, productSlug, productTemplateFrom } from '../../engine/product-templates.js'
import { productsOf } from '../../engine/products.js'
import { download } from '../../export/render.js'
import { saveProductTemplate } from '../product-library.js'
import { grade, ratioLabel } from '../colours.js'
import { colour, contrast } from '../../engine/brand.js'

const ARRANGEMENT_LABELS = { endorsed: 'Endorsed', label: 'Label', 'product-led': 'Product-led', compact: 'Compact' }
const TILE_LABELS = { symbol: 'Symbol on primary, accent band', icon: 'On the accent', paper: 'On paper' }
const SEPARATOR_LABELS = { rule: 'Rule in the accent', neutral: 'Quiet neutral rule', space: 'Space only' }
const HEX = /^#[0-9a-f]{6}$/i

const Text = ({ label, value, onChange, placeholder, hint, wide, ...rest }) => (
  <label className={`field${wide ? ' field--wide' : ''}`}>
    <span className="field__label">{label}</span>
    <input type="text" value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} {...rest} />
    {hint && <span className="field__hint">{hint}</span>}
  </label>
)
const Choice = ({ label, value, options, onChange }) => (
  <label className="field">
    <span className="field__label">{label}</span>
    <select value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>
)
const Num = ({ label, value, onChange, step = 0.01, placeholder }) => (
  <label className="field">
    <span className="field__label">{label}</span>
    <input type="number" step={step} value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value === '' ? undefined : Number(event.target.value))} />
  </label>
)
const Check = ({ label, checked, onChange }) => (
  <label className="wordmark-toggle"><input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>
)

/** Sets a key, removing it when the value is empty, so the saved JSON keeps only what was said. */
const put = (target, key, value) => {
  if (value === undefined || value === '' || value === null) delete target[key]
  else target[key] = value
}
const tidy = (target, key) => { if (target[key] && typeof target[key] === 'object' && !Object.keys(target[key]).length) delete target[key] }

const move = (list, index, by) => {
  const next = [...list]
  const [item] = next.splice(index, 1)
  next.splice(Math.max(0, Math.min(next.length, index + by)), 0, item)
  return next
}

/** A colour field: a picker and its hex, or (for an optional tone) empty for the computed one. */
const ColourField = ({ label, value, computed, onChange, optional }) => {
  const shown = HEX.test(value ?? '') ? value : computed
  return (
    <label className="field product-editor__colour">
      <span className="field__label">{label}</span>
      <span className="product-editor__colour-row">
        <input type="color" value={HEX.test(shown ?? '') ? shown : '#000000'} aria-label={`${label} picker`} onChange={(event) => onChange(event.target.value.toUpperCase())} />
        <input type="text" value={value ?? ''} placeholder={optional ? `${computed ?? ''} (computed)` : '#RRGGBB'} onChange={(event) => onChange(event.target.value.trim() || undefined)} />
      </span>
    </label>
  )
}

const Ratio = ({ value, against }) => <span className="product-editor__ratio" title={`${ratioLabel(value)} ${against}`}><span className={`grade grade--${String(grade(value)).toLowerCase().replace(/\s+/g, '-')}`}>{grade(value)}</span> {ratioLabel(value)}</span>

/** The variant settings that differ from the family's lockup. */
const VariantSettings = ({ brand, spec = {}, onChange, base = false }) => {
  const same = base ? 'Default' : 'As the family'
  const fonts = Object.keys(brand.fonts ?? {})
  const set = (mutate) => { const next = structuredClone(spec); mutate(next); next.name && tidy(next, 'name'); onChange(next) }
  return (
    <div className="product-editor__grid">
      <Choice label="Separator" value={spec.separator ?? ''} options={[{ value: '', label: base ? 'Rule in the accent (default)' : 'As the family' }, ...PRODUCT_SEPARATORS.map((id) => ({ value: id, label: SEPARATOR_LABELS[id] }))]} onChange={(value) => set((next) => put(next, 'separator', value))} />
      <Choice label="Name face" value={spec.name?.font ?? ''} options={[{ value: '', label: same }, ...fonts.map((id) => ({ value: id, label: brand.fonts[id]?.family ? `${id} · ${brand.fonts[id].family}` : id }))]} onChange={(value) => set((next) => { next.name = { ...next.name }; put(next.name, 'font', value) })} />
      <Num label="Name size (× logo height)" value={spec.name?.size} placeholder={base ? '0.6' : 'family'} onChange={(value) => set((next) => { next.name = { ...next.name }; put(next.name, 'size', value) })} />
      <Num label="Name tracking (em)" value={spec.name?.tracking} step={0.001} placeholder={base ? 'headline tracking' : 'family'} onChange={(value) => set((next) => { next.name = { ...next.name }; put(next.name, 'tracking', value) })} />
      <Choice label="Name colour" value={spec.name?.colour ?? ''} options={[{ value: '', label: 'The logo’s colour' }, { value: 'accent', label: 'The accent’s text tone' }]} onChange={(value) => set((next) => { next.name = { ...next.name }; put(next.name, 'colour', value) })} />
      <div className="product-editor__checks">
        <Check label="Capitals" checked={spec.name?.caps} onChange={(value) => set((next) => { next.name = { ...next.name }; put(next.name, 'caps', value || undefined) })} />
        <Check label="Name under the logo" checked={spec.stack} onChange={(value) => set((next) => put(next, 'stack', value || undefined))} />
      </div>
    </div>
  )
}

export const ProductEditor = ({ brand, draft, onDraft, problems, dirty, saveLabel, onSave, onDiscard, onRemove, onTemplatesChanged }) => {
  const [message, setMessage] = useState(null)
  const templateName = useRef(null)
  const edit = (mutate) => { const next = structuredClone(draft); mutate(next); onDraft(next) }
  const preview = { ...brand, products: draft }
  const resolved = productsOf(preview)
  const paper = colour(brand, 'paper')
  const variants = draft.variants ?? []
  const directions = draft.directions ?? []
  const arrangements = draft.lockup?.arrangements ?? PRODUCT_ARRANGEMENTS
  const tiles = draft.tile?.styles ?? PRODUCT_TILE_STYLES
  const parents = [
    ...(brand.families ?? []).map((entry) => ({ value: `family:${entry.id}`, label: `${entry.label ?? entry.id} (logo family)` })),
    ...(brand.signatures ?? []).map((entry) => ({ value: `signature:${entry.id}`, label: `${entry.label ?? entry.id} (signature)` }))
  ]
  const parentValue = draft.parent?.signature ? `signature:${draft.parent.signature}` : `family:${draft.parent?.family ?? brand.families?.[0]?.id ?? ''}`

  /** Choosing a direction or variant marks the others archived; choosing none clears the marks. */
  const decide = (key, list, id) => edit((next) => {
    put(next, key, id || undefined)
    for (const entry of next[list] ?? []) put(entry, 'status', id ? (entry.id === id ? 'chosen' : 'archived') : undefined)
    if (key === 'direction') {
      const variant = next.directions?.find((entry) => entry.id === id)?.variant
      if (variant && next.variants?.some((entry) => entry.id === variant)) {
        next.variant = variant
        for (const entry of next.variants) entry.status = entry.id === variant ? 'chosen' : 'archived'
      }
    }
    if (id) next.decision = { ...(next.decision ?? {}), date: next.decision?.date ?? new Date().toISOString().slice(0, 10) }
  })

  const asTemplate = (products) => productTemplateFrom(preview, { label: templateName.current?.value?.trim() || undefined, products })
  const keepTemplate = (products) => {
    try {
      const template = asTemplate(products)
      saveProductTemplate(template)
      onTemplatesChanged?.()
      setMessage(`Kept “${template.label}” in this browser. Any brand can now start a family from it.`)
    } catch (problem) { setMessage(problem.message) }
  }
  const exportTemplate = (products) => {
    const template = asTemplate(products)
    download(JSON.stringify(template, null, 2), `${template.id}.product-family.json`)
  }

  return (
    <section className="panel product-editor" aria-labelledby="product-editor-h">
      <div className="panel__head panel__head--row">
        <div>
          <h2 id="product-editor-h">Edit the family {dirty && <span className="badge">unsaved</span>}</h2>
          <p className="muted">The preview below follows every change. {saveLabel}.</p>
        </div>
        <div className="product-editor__actions">
          <button type="button" className="button" disabled={!dirty || problems.length > 0} onClick={onSave}>Save with the brand</button>
          <button type="button" className="button button--quiet" disabled={!dirty} onClick={onDiscard}>Discard changes</button>
        </div>
      </div>
      {problems.length > 0 && <div className="notice notice--error" role="alert">Not saved until these are fixed: {problems.join(' ')}</div>}

      <details open>
        <summary><h3>Family</h3></summary>
        <div className="product-editor__grid">
          <Text label="Tab name" value={draft.label} placeholder="Products" onChange={(value) => edit((next) => put(next, 'label', value))} />
          <Text label="Status" value={draft.status} placeholder="proposed" onChange={(value) => edit((next) => put(next, 'status', value))} />
          {parents.length > 1 && <Choice label="Parent logo" value={parentValue} options={parents} onChange={(value) => edit((next) => { const [kind, id] = value.split(':'); next.parent = { [kind]: id } })} />}
          <Text label="Full name pattern" value={draft.naming?.fullName} placeholder="{parent} {name}" hint="Used where a product has no full name: {parent}, {brand}, {name}." onChange={(value) => edit((next) => { next.naming = { ...next.naming }; put(next.naming, 'fullName', value); tidy(next, 'naming') })} />
          <Text wide label="Note" value={draft.note} onChange={(value) => edit((next) => put(next, 'note', value))} />
          <Text wide label="Positioning line" value={draft.positioning?.line} placeholder="One line the whole family shares." onChange={(value) => edit((next) => { next.positioning = { ...next.positioning, line: value }; if (!value) delete next.positioning })} />
        </div>
        <div className="product-editor__offers">
          <fieldset><legend>Arrangements on offer</legend>
            {PRODUCT_ARRANGEMENTS.map((id) => <Check key={id} label={ARRANGEMENT_LABELS[id]} checked={arrangements.includes(id)} onChange={(on) => edit((next) => {
              const list = PRODUCT_ARRANGEMENTS.filter((entry) => (entry === id ? on : arrangements.includes(entry)))
              if (!list.length) return
              next.lockup = { ...next.lockup, arrangements: list }
            })} />)}
          </fieldset>
          <fieldset><legend>App icon styles</legend>
            {PRODUCT_TILE_STYLES.map((id) => <Check key={id} label={TILE_LABELS[id]} checked={tiles.includes(id)} onChange={(on) => edit((next) => {
              const list = PRODUCT_TILE_STYLES.filter((entry) => (entry === id ? on : tiles.includes(entry)))
              if (!list.length) return
              next.tile = { ...next.tile, styles: list }
            })} />)}
          </fieldset>
        </div>
        <h4>How names are set</h4>
        <VariantSettings base brand={brand} spec={draft.lockup} onChange={(spec) => edit((next) => { next.lockup = { ...spec, ...(draft.lockup?.arrangements && { arrangements: draft.lockup.arrangements }) } })} />
      </details>

      <details open>
        <summary><h3>Products <span className="muted">({draft.items.length})</span></h3></summary>
        <ol className="product-editor__items">
          {draft.items.map((item, index) => {
            const tones = resolved[index] ?? {}
            return (
              <li key={`${item.id}-${index}`} className="product-editor__item" style={{ '--accent': tones.accent }}>
                <div className="product-editor__grid">
                  <Text label="Name" value={item.name} onChange={(value) => edit((next) => { next.items[index].name = value })} />
                  <Text label="Id" value={item.id} hint="Names its files and CSS variables." onChange={(value) => edit((next) => { next.items[index].id = productSlug(value) })} />
                  <Text label="Full name" value={item.fullName} placeholder={tones.fullName ?? item.name} onChange={(value) => edit((next) => put(next.items[index], 'fullName', value))} />
                  <Text label="Descriptor" value={item.descriptor} onChange={(value) => edit((next) => put(next.items[index], 'descriptor', value))} />
                  <Text label="Role" value={item.role} placeholder="product" onChange={(value) => edit((next) => put(next.items[index], 'role', value))} />
                  <Text label="Status" value={item.status} placeholder="proposed" onChange={(value) => edit((next) => put(next.items[index], 'status', value))} />
                  <ColourField label="Accent" value={item.accent} computed={tones.accent} onChange={(value) => edit((next) => { next.items[index].accent = value ?? '' })} />
                  <Text label="Accent name" value={item.accentName} placeholder="Blue" onChange={(value) => edit((next) => put(next.items[index], 'accentName', value))} />
                </div>
                <details className="product-editor__tones">
                  <summary>Tones: text <code>{tones.accentText}</code> {tones.accentText && <Ratio value={contrast(tones.accentText, paper)} against="on paper" />} · on dark <code>{tones.accentOnDark}</code> · on the accent <code>{tones.onAccent}</code> {tones.onAccent && <Ratio value={contrast(tones.onAccent, tones.accent)} against="on the accent" />}</summary>
                  <div className="product-editor__grid">
                    <ColourField optional label="Text tone (on paper)" value={item.accentText} computed={tones.accentText} onChange={(value) => edit((next) => put(next.items[index], 'accentText', value))} />
                    <ColourField optional label="Beside a reversed logo" value={item.accentOnDark} computed={tones.accentOnDark} onChange={(value) => edit((next) => put(next.items[index], 'accentOnDark', value))} />
                    <ColourField optional label="Drawn on the accent" value={item.onAccent} computed={tones.onAccent} onChange={(value) => edit((next) => put(next.items[index], 'onAccent', value))} />
                  </div>
                </details>
                <div className="product-editor__row-actions">
                  <button type="button" className="button button--quiet" disabled={index === 0} onClick={() => edit((next) => { next.items = move(next.items, index, -1) })} aria-label={`Move ${item.name} up`}>↑</button>
                  <button type="button" className="button button--quiet" disabled={index === draft.items.length - 1} onClick={() => edit((next) => { next.items = move(next.items, index, 1) })} aria-label={`Move ${item.name} down`}>↓</button>
                  <button type="button" className="button button--quiet" disabled={draft.items.length === 1} onClick={() => edit((next) => { next.items.splice(index, 1) })}>Remove</button>
                </div>
              </li>
            )
          })}
        </ol>
        <button type="button" className="button button--quiet" onClick={() => edit((next) => { next.items.push(newProduct('New product', { taken: next.items.map((entry) => entry.id), status: 'proposed' })) })}>+ Add a product</button>
      </details>

      <details>
        <summary><h3>Endorsed variants <span className="muted">({variants.length})</span></h3></summary>
        <p className="muted">Ways of setting the endorsed lockup, each a few settings over the family’s. Choose one to use it everywhere; the rest are kept as archived options.</p>
        <Choice label="Variant in use" value={draft.variant ?? ''} options={[{ value: '', label: 'None chosen (compare them all)' }, ...variants.map((entry) => ({ value: entry.id, label: entry.label }))]} onChange={(value) => decide('variant', 'variants', value)} />
        <ol className="product-editor__items">
          {variants.map((variant, index) => (
            <li key={`${variant.id}-${index}`} className="product-editor__item">
              <div className="product-editor__grid">
                <Text label="Label" value={variant.label} onChange={(value) => edit((next) => { next.variants[index].label = value })} />
                <Text label="Id" value={variant.id} onChange={(value) => edit((next) => { const id = productSlug(value); for (const entry of next.directions ?? []) if (entry.variant === variant.id) entry.variant = id; if (next.variant === variant.id) next.variant = id; next.variants[index].id = id })} />
                <Text wide label="Summary" value={variant.summary} onChange={(value) => edit((next) => put(next.variants[index], 'summary', value))} />
              </div>
              <VariantSettings brand={brand} spec={variant.lockup} onChange={(spec) => edit((next) => { next.variants[index].lockup = spec })} />
              <div className="product-editor__row-actions">
                {variant.status && <span className="badge">{variant.status}</span>}
                <button type="button" className="button button--quiet" onClick={() => edit((next) => {
                  next.variants.splice(index, 1)
                  if (next.variant === variant.id) delete next.variant
                  for (const entry of next.directions ?? []) if (entry.variant === variant.id) delete entry.variant
                  if (!next.variants.length) delete next.variants
                })}>Remove</button>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="button button--quiet" onClick={() => edit((next) => { const taken = (next.variants ?? []).map((entry) => entry.id); next.variants = [...(next.variants ?? []), { id: newProduct('variant', { taken }).id, label: `Variant ${taken.length + 1}`, lockup: {} }] })}>+ Add a variant</button>
      </details>

      <details>
        <summary><h3>Directions and decision <span className="muted">({directions.length})</span></h3></summary>
        <p className="muted">A direction pairs an arrangement, an app icon style and (for endorsed) a variant. Choosing one is the decision: the kit then carries that direction and the compact form alone.</p>
        <div className="product-editor__grid">
          <Choice label="Chosen direction" value={draft.direction ?? ''} options={[{ value: '', label: 'None yet (compare)' }, ...directions.map((entry) => ({ value: entry.id, label: entry.label }))]} onChange={(value) => decide('direction', 'directions', value)} />
          <Text label="Decided on" value={draft.decision?.date} placeholder="YYYY-MM-DD" onChange={(value) => edit((next) => { next.decision = { ...next.decision }; put(next.decision, 'date', value); tidy(next, 'decision') })} />
          <Text wide label="Decision" value={draft.decision?.summary} placeholder="What was chosen, and what is archived." onChange={(value) => edit((next) => { next.decision = { ...next.decision }; put(next.decision, 'summary', value); tidy(next, 'decision') })} />
        </div>
        <ol className="product-editor__items">
          {directions.map((direction, index) => (
            <li key={`${direction.id}-${index}`} className="product-editor__item">
              <div className="product-editor__grid">
                <Text label="Label" value={direction.label} onChange={(value) => edit((next) => { next.directions[index].label = value })} />
                <Text label="Id" value={direction.id} onChange={(value) => edit((next) => { const id = productSlug(value); if (next.direction === direction.id) next.direction = id; next.directions[index].id = id })} />
                <Choice label="Arrangement" value={direction.arrangement} options={arrangements.map((id) => ({ value: id, label: ARRANGEMENT_LABELS[id] }))} onChange={(value) => edit((next) => { next.directions[index].arrangement = value })} />
                <Choice label="App icon" value={direction.tile} options={tiles.map((id) => ({ value: id, label: TILE_LABELS[id] }))} onChange={(value) => edit((next) => { next.directions[index].tile = value })} />
                {direction.arrangement === 'endorsed' && variants.length > 0 && <Choice label="Variant" value={direction.variant ?? ''} options={[{ value: '', label: 'Family settings' }, ...variants.map((entry) => ({ value: entry.id, label: entry.label }))]} onChange={(value) => edit((next) => put(next.directions[index], 'variant', value))} />}
                <Text wide label="Summary" value={direction.summary} onChange={(value) => edit((next) => put(next.directions[index], 'summary', value))} />
              </div>
              <div className="product-editor__row-actions">
                {direction.status && <span className="badge">{direction.status}</span>}
                <button type="button" className="button button--quiet" onClick={() => edit((next) => { next.directions.splice(index, 1); if (next.direction === direction.id) delete next.direction; if (!next.directions.length) delete next.directions })}>Remove</button>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="button button--quiet" onClick={() => edit((next) => { const taken = (next.directions ?? []).map((entry) => entry.id); next.directions = [...(next.directions ?? []), { id: newProduct('direction', { taken }).id, label: `Direction ${taken.length + 1}`, arrangement: arrangements[0], tile: tiles[0] }] })}>+ Add a direction</button>
      </details>

      <details>
        <summary><h3>Reuse this family</h3></summary>
        <p className="muted">A template keeps how this family is drawn (lettering, variants, directions, icons, naming) without the parent logo, so another brand can start from it. Products can go with it as starters.</p>
        <div className="product-editor__grid">
          <label className="field field--wide"><span className="field__label">Template name</span><input ref={templateName} type="text" placeholder={`${brand.name} ${draft.label ?? 'products'}`} /></label>
        </div>
        <div className="product-editor__actions">
          <button type="button" className="button button--quiet" onClick={() => keepTemplate(false)}>Keep as a template</button>
          <button type="button" className="button button--quiet" onClick={() => keepTemplate(true)}>Keep with its products</button>
          <button type="button" className="button button--quiet" onClick={() => exportTemplate(true)}>Export template (.json)</button>
          <button type="button" className="button button--quiet" onClick={() => download(JSON.stringify(draft, null, 2), `${brand.id}-products.json`)}>Download family (.json)</button>
          {onRemove && <button type="button" className="button button--quiet" onClick={onRemove}>Remove the family from {brand.name}</button>}
        </div>
        {message && <p className="notice" role="status">{message}</p>}
      </details>
    </section>
  )
}
