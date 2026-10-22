// The masthead's menus: the brand switcher (the brand's own logo, which opens a list of brands and,
// for a brand with proposed revisions, the revisions to show), and the overflow menu that holds
// the workshop's actions on a phone. Both are buttons that open a styled popover menu: arrow keys
// move through it, Escape or a click outside closes it.

import { useEffect, useId, useRef, useState } from 'react'

/** Open state, closed by Escape or a click outside `root`; focus returns to the trigger. */
const usePopover = () => {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const outside = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }
    const key = (event) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', key)
    // The first chosen item, or the first item, takes focus as the menu opens.
    const items = [...(root.current?.querySelectorAll('[role^="menuitem"]') ?? [])]
    ;(items.find((item) => item.getAttribute('aria-checked') === 'true') ?? items[0])?.focus()
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key) }
  }, [open])
  /** Up, down, Home and End move between the menu's items. */
  const onKeyDown = (event) => {
    const items = [...root.current.querySelectorAll('[role^="menuitem"]')]
    const at = items.indexOf(document.activeElement)
    const to = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 }[event.key]
    if (to === undefined) return
    event.preventDefault()
    items[(to + items.length) % items.length]?.focus()
  }
  return { open, setOpen, root, trigger, onKeyDown }
}

const Check = ({ on }) => <span className="menu__check" aria-hidden="true">{on ? '✓' : ''}</span>

/**
 * The brand switcher. `brands` is `[{ id, name, note, logo }]` (`logo` shown in place of the name); `revisions` is `[{ id, label, note }]`,
 * with the approved identity as `id: ''`. `tag` marks the trigger on a phone, where the masthead
 * has no room for badges (the revision being shown).
 */
export const BrandMenu = ({ logo, current, brands, onBrand, revisions = [], revision = '', onRevision, tag }) => {
  const { open, setOpen, root, trigger, onKeyDown } = usePopover()
  const id = useId()
  const pick = (action) => { setOpen(false); action(); trigger.current?.focus() }
  return (
    <div className="menu brand-menu" ref={root}>
      <button ref={trigger} type="button" className="brand-menu__trigger" aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} title="Choose a brand">
        {logo}
        <span className="visually-hidden">{current}, choose a brand</span>
        {tag && <span className="brand-menu__tag">{tag}</span>}
        <span className="brand-menu__caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div id={id} className="menu__panel" role="menu" aria-label="Brands" onKeyDown={onKeyDown}>
          <p className="menu__heading" role="presentation">Brands</p>
          {brands.map((entry) => (
            <button key={entry.id} type="button" role="menuitemradio" aria-checked={entry.id === current} className="menu__item" onClick={() => pick(() => onBrand(entry.id))}>
              <Check on={entry.id === current} />
              <span className="menu__label">{entry.logo ?? entry.name}<span className="visually-hidden">{entry.logo ? entry.name : ''}</span></span>
              {entry.note && <span className="menu__note">{entry.note}</span>}
            </button>
          ))}
          {revisions.length > 1 && (
            <>
              <p className="menu__heading" role="presentation">Revision</p>
              {revisions.map((entry) => (
                <button key={entry.id || 'approved'} type="button" role="menuitemradio" aria-checked={entry.id === revision} className="menu__item" onClick={() => pick(() => onRevision(entry.id))}>
                  <Check on={entry.id === revision} />
                  <span className="menu__label">{entry.label}</span>
                  {entry.note && <span className="menu__note">{entry.note}</span>}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** A "more" menu: `items` are `{ label, onSelect }` or `{ label, href }`. */
export const MoreMenu = ({ items, label = 'More' }) => {
  const { open, setOpen, root, trigger, onKeyDown } = usePopover()
  const id = useId()
  return (
    <div className="menu more-menu" ref={root}>
      <button ref={trigger} type="button" className="button button--quiet more-menu__trigger" aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <span aria-hidden="true">⋯</span><span className="visually-hidden">{label}</span>
      </button>
      {open && (
        <div id={id} className="menu__panel menu__panel--end" role="menu" aria-label={label} onKeyDown={onKeyDown}>
          {items.map((item) => (item.href
            ? <a key={item.label} role="menuitem" className="menu__item" href={item.href} onClick={() => setOpen(false)}><span className="menu__label">{item.label}</span></a>
            : <button key={item.label} type="button" role="menuitem" className="menu__item" aria-current={item.current || undefined} onClick={() => { setOpen(false); item.onSelect() }}><span className="menu__label">{item.label}</span></button>))}
        </div>
      )}
    </div>
  )
}
