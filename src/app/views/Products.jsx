// A brand's product family (brand.products): each product's name set beside the parent logo, which
// is embedded exactly as the Logos tab draws it. What changes from product to product is the name,
// the descriptor, the accent and (where a family has them) the pictogram; the arrangement, the colour and the tile style are
// chosen once for the whole family, so every product is seen the same way.

import { useMemo, useRef, useState } from 'react'
import { colour, colourName, isDark, paintOptions, validateBrand } from '../../engine/brand.js'
import { svgDocument } from '../../engine/artwork.js'
import {
  defaultProductArrangement, defaultProductTile, hasProducts, productArrangements, productDirections, productDocument, productFamilyKey, productLockup,
  productParent, productParentLockup, productPictogram, productTile, productTileStyles, productVariant, productVariants, productsOf
} from '../../engine/products.js'
import { applyProductTemplate, productFamilyHome, withProductFamily } from '../../engine/product-templates.js'
import { contrast, grade, ratioLabel } from '../colours.js'
import { forgetProductTemplate, productTemplates, readProductTemplateFile, saveProductTemplate } from '../product-library.js'
import { Downloads, Field, Segmented, SvgImage } from '../ui.jsx'
import { ProductEditor } from './ProductEditor.jsx'

const ARRANGEMENT_LABELS = { endorsed: 'Endorsed', label: 'Label', 'product-led': 'Product-led', compact: 'Compact' }
const ARRANGEMENT_USES = {
  endorsed: 'The parent logo, a rule in the product’s accent, then the product’s name on the logo’s baseline.',
  label: 'The parent logo with the product named beneath its lettering, in the label face.',
  'product-led': 'A tile in the product’s accent and the product’s name lead; the parent logo signs off beneath, at its own size.',
  compact: 'The symbol, the rule and the name, for spaces narrower than the full logo’s minimum width.'
}
// The `icon` tile carries a product's pictogram; in a family without pictograms it is the symbol on the accent.
const tileLabels = (brand) => ({ symbol: 'Symbol', icon: productsOf(brand).some((item) => productPictogram(brand, item)) ? 'Pictogram' : 'Accent', paper: 'Paper' })

const slug = (value) => String(value).toLowerCase().replace(/\s+/g, '-')
const Grade = ({ value }) => <span className={`grade grade--${slug(value)}`}>{value}</span>

/** A ground that shows a logo painted this way: white, or the primary colour under a light logo. */
const groundFor = (brand, paint) => {
  if (paint.colourway) return colour(brand, paint.ground ?? brand.colourways?.[paint.colourway]?.ground ?? 'reverse')
  return isDark(colour(brand, paint.colour)) ? '#ffffff' : colour(brand, 'primary')
}

/** A colour as a ground with what is drawn `on` it, or, given a `ground`, as text on that ground. */
const Swatch = ({ label, hex, on, ground, ratio, against }) => (
  <div className="product-swatch">
    <span className="product-swatch__fill" style={ground ? { background: ground, color: hex } : { background: hex, color: on }}>Aa</span>
    <span className="product-swatch__text"><strong>{label}</strong><code>{hex}</code></span>
    {ratio != null && <span className="product-swatch__score" title={`${ratioLabel(ratio)} ${against}`}><Grade value={grade(ratio)} /><code>{ratioLabel(ratio)}</code></span>}
  </div>
)

const ProductCard = ({ brand, fonts, item, arrangement, variant, paint, descriptor, tile, ground }) => {
  const ctx = { brand, fonts }
  const paper = colour(brand, 'paper')
  const options = { product: item.id, arrangement, colourKey: paint.colour, colourway: paint.colourway, descriptor, variant }
  const makeLockup = () => productDocument(ctx, options)
  const makeTile = () => productTile(ctx, { product: item.id, style: tile })
  const pictogram = productPictogram(brand, item)
  const pictogramSvg = pictogram ? svgDocument(ctx, pictogram.size, pictogram.size, pictogram.markup, `${item.name} pictogram`) : null
  const showTile = Boolean(tile) && brand.web?.icons !== false
  return (
    <article className="product-card" aria-labelledby={`product-${item.id}`}>
      <div className="product-card__art" style={{ background: ground }}>
        <SvgImage svg={makeLockup()} alt={`${brand.name} ${item.name}, ${ARRANGEMENT_LABELS[arrangement].toLowerCase()} lockup`} />
      </div>
      <div className="product-card__body">
        <div className="product-card__head">
          <h3 id={`product-${item.id}`}><span className="product-card__dot" style={{ background: item.accent }} />{item.fullName ?? item.name}</h3>
          <span className="product-card__tags">
            {item.role && <span className="product-card__role">{item.role}</span>}
            {item.status && item.status !== 'approved' && <span className="badge">{item.status}</span>}
          </span>
        </div>
        {item.descriptor && <p className="muted">{item.descriptor}</p>}
        <div className="product-card__marks">
          {showTile && <figure><SvgImage svg={makeTile()} alt={`${item.name} app tile, ${tileLabels(brand)[tile].toLowerCase()}`} className="product-card__tile" /><figcaption>Tile</figcaption></figure>}
          {pictogramSvg && <figure><span className="product-card__pictogram" style={{ color: item.accentText }} dangerouslySetInnerHTML={{ __html: pictogramSvg.replace(/<svg /, '<svg aria-hidden="true" ').replace(/\s(width|height)="[^"]*"/g, '') }} /><figcaption>Pictogram</figcaption></figure>}
          <div className="product-card__swatches">
            <Swatch label={item.accentName ?? 'Accent'} hex={item.accent} on={item.onAccent} ratio={contrast(item.onAccent, item.accent)} against="for what is drawn on the accent" />
            <Swatch label="As text" hex={item.accentText} ground={paper} ratio={contrast(item.accentText, paper)} against="on paper" />
          </div>
        </div>
        <dl className="product-card__downloads">
          <div><dt>Lockup</dt><dd><Downloads make={makeLockup} name={[brand.id, item.id, arrangement, ...(variant && arrangement === 'endorsed' ? [variant] : []), paint.id].join('-')} width={2048} /></dd></div>
          {showTile && <div><dt>Tile</dt><dd><Downloads make={makeTile} name={[brand.id, item.id, 'tile', tile].join('-')} width={1024} formats={['svg', 'png']} /></dd></div>}
        </dl>
      </div>
    </article>
  )
}

const FamilyView = ({ brand, fonts }) => {
  const products = brand.products
  const ctx = { brand, fonts }
  const items = useMemo(() => productsOf(brand), [brand])
  const arrangements = productArrangements(brand)
  const directions = productDirections(brand)
  const tiles = brand.web?.icons === false ? [] : productTileStyles(brand)
  const paints = paintOptions(brand).filter((paint) => paint.raster)
  const [directionId, setDirectionId] = useState(products.direction ?? directions[0]?.id ?? '')
  const variants = productVariants(brand)
  const [picked, setArrangement] = useState(() => directions.find((entry) => entry.id === directionId)?.arrangement ?? defaultProductArrangement(brand))
  const [pickedTile, setTile] = useState(() => directions.find((entry) => entry.id === directionId)?.tile ?? defaultProductTile(brand))
  const [pickedVariant, setVariant] = useState(() => productVariant(brand)?.id ?? '')
  const [paintId, setPaintId] = useState(paints[0]?.id)
  const [descriptor, setDescriptor] = useState(false)
  const paint = paints.find((entry) => entry.id === paintId) ?? paints[0]
  // While the family is being edited what was picked may stop being offered; the first on offer stands in.
  const arrangement = arrangements.includes(picked) ? picked : arrangements[0]
  const tile = tiles.includes(pickedTile) ? pickedTile : tiles[0]
  const variantId = variants.some((entry) => entry.id === pickedVariant) ? pickedVariant : ''
  // `null` asks for the family's own settings, with no variant over them.
  const variant = variantId || null
  const usesVariant = variants.length > 0 && (arrangement === 'endorsed' || arrangement === 'compact')
  // A direction is a named set; changing any part of it by hand leaves no direction chosen.
  const direction = directions.find((entry) => entry.id === directionId && entry.arrangement === arrangement && (!tiles.length || entry.tile === tile) && (!entry.variant || entry.variant === variantId))
  const chooseDirection = (id) => {
    const next = directions.find((entry) => entry.id === id)
    setDirectionId(id)
    if (next) { setArrangement(next.arrangement); if (tiles.includes(next.tile)) setTile(next.tile); if (next.variant) setVariant(next.variant) }
  }
  const parent = productParent(brand)
  const ground = groundFor(brand, paint)
  const parentSvg = () => {
    const { width, height, art } = productParentLockup(ctx, { colour: paint.colourway ? undefined : colour(brand, paint.colour), colourway: paint.colourway })
    return svgDocument(ctx, width, height, art, `${brand.name} / parent logo`)
  }
  // Every lockup at one scale, so the family is compared as it would sit on a page.
  const family = useMemo(() => {
    const drawn = items.map((item) => {
      const size = productLockup(ctx, { product: item.id, arrangement, colour: paint.colourway ? undefined : colour(brand, paint.colour), colourway: paint.colourway, descriptor, variant })
      return { item, width: size.width, svg: productDocument(ctx, { product: item.id, arrangement, colourKey: paint.colour, colourway: paint.colourway, descriptor, variant }) }
    })
    const widest = Math.max(...drawn.map((entry) => entry.width))
    return drawn.map((entry) => ({ ...entry, share: entry.width / widest }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, fonts, items, arrangement, paint, descriptor, variant])
  const chosen = products.direction ? directions.find((entry) => entry.id === products.direction) : null
  // An approved family is stated as fact: no status badge, no decision record, no options not taken.
  const approved = products.status === 'approved'
  const badge = (status) => status && status !== 'approved' && <span className="badge">{status}</span>
  const lockupName = (usesVariant && variants.find((entry) => entry.id === variantId)?.label) || ARRANGEMENT_LABELS[arrangement]

  return (
    <>
      <section className="panel products-intro">
        <div className="products-intro__text">
          <div className="panel__head">
            <h2>{products.label ?? 'Products'} {badge(products.status)}</h2>
            {products.note && <p className="muted">{products.note}</p>}
          </div>
          <dl className="products-intro__facts">
            <div><dt>Parent logo</dt><dd>{parent.label}, unchanged</dd></div>
            <div><dt>Lockup</dt><dd>{lockupName}</dd></div>
            <div><dt>Products</dt><dd>{items.length}</dd></div>
            <div><dt>Each adds</dt><dd>A name, {items.some((item) => item.descriptor) ? 'a descriptor, ' : ''}an accent{productsOf(brand).some((item) => productPictogram(brand, item)) ? ', a pictogram' : ''}</dd></div>
          </dl>
          {/* While a family is still being compared, say what the kit carries. */}
          {!approved && directions.length > 1 && <p className="muted">{chosen ? `Chosen direction: ${chosen.label}. The kit carries that arrangement${arrangements.includes('compact') && chosen.arrangement !== 'compact' ? ' and the compact one' : ''} for every product.` : 'No direction is chosen yet, so the kit carries every arrangement on offer for comparison.'}</p>}
        </div>
        <figure className="asset-card products-intro__parent">
          <div className="asset-card__art" style={{ background: ground }}><SvgImage svg={parentSvg()} alt={`${brand.name} parent logo`} /></div>
          <figcaption><span>Parent identity — fixed</span></figcaption>
        </figure>
      </section>

      <section className="panel toolbar toolbar--panel products-controls" aria-label="How the family is shown">
        {directions.length > 1 && <Field label="Direction">
          <Segmented label="Direction" value={direction?.id ?? ''} options={directions.map((entry) => ({ value: entry.id, label: chosen && entry.id !== chosen.id ? `${entry.label} (archived)` : entry.label, title: entry.summary }))} onChange={chooseDirection} />
        </Field>}
        {arrangements.length > 1 && <Field label="Arrangement">
          <Segmented label="Arrangement" value={arrangement} options={arrangements.map((id) => ({ value: id, label: ARRANGEMENT_LABELS[id], title: ARRANGEMENT_USES[id] }))} onChange={setArrangement} />
        </Field>}
        {usesVariant && variants.length > 1 && <Field label="Endorsed variant">
          <Segmented label="Endorsed variant" value={variantId} options={[...(products.variant ? [] : [{ value: '', label: 'Family settings' }]), ...variants.map((entry) => ({ value: entry.id, label: products.variant && entry.id !== products.variant ? `${entry.label} (archived)` : entry.label, title: entry.summary }))]} onChange={setVariant} />
        </Field>}
        {paints.length > 1 && <Field label="Logo colour">
          <Segmented label="Logo colour" value={paint.id} options={paints.map((entry) => ({ value: entry.id, label: entry.colourway ? entry.label : colourName(brand, entry.colour) }))} onChange={setPaintId} />
        </Field>}
        {tiles.length > 1 && <Field label="Tile">
          <Segmented label="Tile" value={tile} options={tiles.map((id) => ({ value: id, label: tileLabels(brand)[id] }))} onChange={setTile} />
        </Field>}
        {items.some((item) => item.descriptor) && <label className="wordmark-toggle"><input type="checkbox" checked={descriptor} onChange={(event) => setDescriptor(event.target.checked)} /><span>Descriptor</span></label>}
      </section>

      <section className="panel" aria-labelledby="products-family">
        <div className="panel__head">
          <h2 id="products-family">The family at a glance</h2>
          <p className="muted">All {items.length} at one scale. The parent logo is the same artwork in each.</p>
        </div>
        <div className={`products-family products-family--${arrangement}`} style={{ background: ground }}>
          {family.map(({ item, svg, share }) => <SvgImage key={item.id} svg={svg} alt={`${brand.name} ${item.name}`} style={{ width: `${(share * 100).toFixed(2)}%` }} />)}
        </div>
      </section>

      <section className="panel products-key" aria-labelledby="products-key">
        <div className="products-key__part">
          <h2 id="products-key">Family key</h2>
          <p className="muted">Every accent as a short bar, in product order, where the whole family is meant rather than one product.</p>
          <div className="products-key__art"><SvgImage svg={productFamilyKey(ctx)} alt={`${brand.name} family key: ${items.map((item) => item.name).join(', ')}`} /></div>
          <Downloads make={() => productFamilyKey(ctx)} name={`${brand.id}-family-key`} width={1024} formats={['svg', 'png']} />
        </div>
        {(products.positioning?.line || (products.decision && !approved)) && <div className="products-key__part">
          {products.positioning?.line && <>
            <h2>Positioning {badge(products.positioning.status)}</h2>
            <p className="products-key__line">{products.positioning.line}</p>
          </>}
          {products.decision && !approved && <>
            <h2>Decision {products.decision.date && <span className="muted">· {products.decision.date}</span>}</h2>
            {products.decision.summary && <p>{products.decision.summary}</p>}
            <p className="muted">{[chosen && `Direction: ${chosen.label}`, products.variant && `Variant: ${variants.find((entry) => entry.id === products.variant)?.label ?? products.variant}`].filter(Boolean).join(' · ')}</p>
          </>}
        </div>}
      </section>

      <div className="product-grid">
        {items.map((item) => <ProductCard key={item.id} brand={brand} fonts={fonts} item={item} arrangement={arrangement} variant={variant} paint={paint} descriptor={descriptor} tile={tiles.includes(tile) ? tile : tiles[0]} ground={ground} />)}
      </div>
    </>
  )
}

/** Starting a family: from a built-in template, one kept in this browser, or a template file. */
const StartFamily = ({ brand, onStart, version, onTemplatesChanged }) => {
  const [problem, setProblem] = useState(null)
  const file = useRef(null)
  const templates = useMemo(() => productTemplates(), [version])
  const start = (template) => {
    try { onStart(applyProductTemplate(brand, template)) } catch (error) { setProblem(error.message) }
  }
  const importFile = async (chosen) => {
    if (!chosen) return
    try {
      const template = await readProductTemplateFile(chosen)
      if (!template.builtIn) { try { saveProductTemplate(template) } catch { /* used once without being kept */ } }
      onTemplatesChanged()
      start(template)
    } catch (error) { setProblem(error.message) }
  }
  return (
    <section className="panel products-start" aria-labelledby="products-start-h">
      <div className="panel__head">
        <h2 id="products-start-h">{hasProducts(brand) ? 'Start again from a template' : `Give ${brand.name} a product family`}</h2>
        <p className="muted">A template sets how the family is drawn: the lockup, its variants and directions, the app icons and the naming. The {brand.name} logo stays the parent, unchanged{hasProducts(brand) ? '; the products already here are kept' : ''}. Nothing is kept until you save.</p>
      </div>
      <ul className="products-start__list">
        {templates.map((template) => (
          <li key={template.id} className="products-start__item">
            <div>
              <strong>{template.label}</strong> {template.builtIn ? <span className="badge badge--approved">built in</span> : <span className="badge">kept here</span>}
              {template.summary && <p className="muted">{template.summary}</p>}
              {template.products?.length > 0 && <p className="muted">Starts with {template.products.map((item) => item.name).join(', ')}.</p>}
            </div>
            <div className="products-start__actions">
              <button type="button" className="button" onClick={() => start(template)}>Use</button>
              {!template.builtIn && <button type="button" className="button button--quiet" onClick={() => { forgetProductTemplate(template.id); onTemplatesChanged() }}>Forget</button>}
            </div>
          </li>
        ))}
      </ul>
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={(event) => { importFile(event.target.files?.[0]); event.target.value = '' }} />
      <button type="button" className="button button--quiet" onClick={() => file.current?.click()}>Open a template file…</button>
      {problem && <p className="notice notice--error" role="alert">{problem}</p>}
    </section>
  )
}

/**
 * The Products tab: the family as it is drawn, and (where the brand can be edited) an editor whose
 * draft the view previews. Saving puts the family into the brand, or into the revision it is
 * proposed in, and keeps the brand in this browser as any edit is kept.
 */
export const Products = ({ brand, base, fonts, revision, editable = false, onSave }) => {
  const [draft, setDraft] = useState(null)
  const [starting, setStarting] = useState(false)
  const [templatesVersion, setTemplatesVersion] = useState(0)
  const lastGood = useRef(null)
  const home = productFamilyHome(base, revision)
  const saved = brand.products ?? null
  const editing = Boolean(draft)
  const candidate = editing ? { ...brand, products: draft } : brand
  const problems = editing ? validateBrand(candidate) : []
  // A draft with a mistake in it is not drawn; the last one that was stays on screen.
  if (!problems.length) lastGood.current = candidate
  const shown = problems.length && lastGood.current ? lastGood.current : candidate
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(saved)
  const where = home ? `Saving puts it in the ${base.revisions.find((entry) => entry.id === home)?.title ?? home} revision, so the approved identity is unchanged` : `Saving keeps it in ${base?.name ?? brand.name}'s definition in this browser; download the brand or its kit to take it elsewhere`

  const save = () => {
    onSave(withProductFamily(base, draft, { revision: home }))
    setDraft(null)
  }
  const remove = () => {
    if (!globalThis.confirm?.(`Remove the product family from ${brand.name}? It can be started again from a template.`)) return
    onSave(withProductFamily(base, null, { revision: home }))
    setDraft(null)
  }
  const start = (products) => { setDraft(products); setStarting(false) }

  return (
    <div className="view products-view">
      {editable && (editing || hasProducts(brand)) && <div className="products-bar">
        {!editing && hasProducts(brand) && <button type="button" className="button" onClick={() => setDraft(structuredClone(saved))}>Edit the family</button>}
        {editing && <button type="button" className="button button--quiet" onClick={() => setDraft(null)}>Close the editor{dirty ? ' (discard)' : ''}</button>}
        {hasProducts(brand) && <button type="button" className="button button--quiet" aria-expanded={starting} onClick={() => setStarting((open) => !open)}>Templates…</button>}
      </div>}
      {editable && (starting || (!hasProducts(brand) && !editing)) && <StartFamily brand={brand} onStart={start} version={templatesVersion} onTemplatesChanged={() => setTemplatesVersion((count) => count + 1)} />}
      {!hasProducts(shown) && !editable && <section className="panel"><p className="muted">{brand.name} has no product family.</p></section>}
      {editing && <ProductEditor brand={brand} draft={draft} onDraft={setDraft} problems={problems} dirty={dirty} saveLabel={where}
        onSave={save} onDiscard={() => setDraft(saved ? structuredClone(saved) : null)} onRemove={saved ? remove : null}
        onTemplatesChanged={() => setTemplatesVersion((count) => count + 1)} />}
      {hasProducts(shown) && <FamilyView brand={shown} fonts={fonts} />}
    </div>
  )
}
