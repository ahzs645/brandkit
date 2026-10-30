// brandkit's shared interface parts, used by the app and by the packages it exports (the template
// studio), with their own styles so a host gets them styled without the app's stylesheet.

import { useEffect, useId, useRef, useState } from 'react'
import './menu-button.css'

/**
 * A button that opens a menu of actions: the less used of a set, kept one press away so the one
 * most people want stands alone. The menu pattern from ARIA: arrow keys, Home and End move through
 * it, Escape closes it and returns to the button, as does a press anywhere else.
 *
 * `items` are `{ label, hint, onSelect, href, disabled }`, or `{ heading }` to start a group. The
 * menu is fixed to the viewport, placed below the button or above it where there is more room,
 * and kept on screen, so a scrolling container or a narrow phone does not cut it off.
 */
export const MenuButton = ({ label, items, disabled, className = '', align = 'end', ...aria }) => {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState(null)
  const button = useRef(null)
  const panel = useRef(null)

  const measure = () => {
    const box = button.current?.getBoundingClientRect()
    if (!box) return
    const width = Math.min(320, innerWidth - 16)
    const below = innerHeight - box.bottom - 12
    const above = box.top - 12
    const up = below < 260 && above > below
    const left = align === 'end' ? box.right - width : box.left
    setPlace({ width, left: Math.max(8, Math.min(left, innerWidth - width - 8)), ...(up ? { bottom: innerHeight - box.top + 6, maxHeight: Math.min(480, above) } : { top: box.bottom + 6, maxHeight: Math.min(480, below) }) })
  }
  const show = () => { measure(); setOpen(true) }
  const close = (focus) => { setOpen(false); if (focus) button.current?.focus() }
  const entries = () => [...(panel.current?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])') ?? [])]

  useEffect(() => {
    if (!open) return undefined
    entries()[0]?.focus()
    const outside = (event) => { if (!button.current?.contains(event.target) && !panel.current?.contains(event.target)) close() }
    const moved = (event) => { if (!panel.current?.contains(event.target)) measure() }
    document.addEventListener('pointerdown', outside)
    addEventListener('scroll', moved, true)
    addEventListener('resize', measure)
    return () => { document.removeEventListener('pointerdown', outside); removeEventListener('scroll', moved, true); removeEventListener('resize', measure) }
  }, [open])

  const onKeyDown = (event) => {
    const list = entries()
    const at = list.indexOf(document.activeElement)
    const moves = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: list.length - 1 }
    if (event.key in moves) { event.preventDefault(); list[(moves[event.key] + list.length) % list.length]?.focus() }
    else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true) }
    else if (event.key === 'Tab') close()
  }
  const select = (item) => (event) => {
    if (item.disabled) { event.preventDefault(); return }
    close(!item.href)
    item.onSelect?.()
  }

  return (
    <span className="ui-menu">
      <button ref={button} type="button" className={className} disabled={disabled} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => { if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); show() } }} {...aria}>
        {label}<span className="ui-menu__caret" aria-hidden="true">▾</span>
      </button>
      {open && place && (
        <div ref={panel} id={id} role="menu" className="ui-menu__panel" style={place} aria-label={aria['aria-label'] ?? (typeof label === 'string' ? label : undefined)} onKeyDown={onKeyDown}>
          {items.filter(Boolean).map((item, index) => {
            if (item.heading) return <div key={`heading-${index}`} role="presentation" className="ui-menu__heading">{item.heading}</div>
            const content = <><span className="ui-menu__label">{item.label}</span>{item.hint && <span className="ui-menu__hint">{item.hint}</span>}</>
            return item.href
              ? <a key={item.label} role="menuitem" tabIndex={-1} className="ui-menu__item" href={item.href} target="_blank" rel="noopener noreferrer" aria-disabled={item.disabled || undefined} onClick={select(item)}>{content}</a>
              : <button key={item.label} type="button" role="menuitem" tabIndex={-1} className="ui-menu__item" aria-disabled={item.disabled || undefined} onClick={select(item)}>{content}</button>
          })}
        </div>
      )}
    </span>
  )
}
