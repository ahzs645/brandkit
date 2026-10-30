// brandkit's shared interface parts, used by the app and by the packages it exports (the template
// studio), with their own styles so a host gets them styled without the app's stylesheet.

import { useEffect, useId, useRef, useState } from 'react'
import './select.css'

/**
 * A styled dropdown in place of a native <select>: a select-only combobox (the ARIA pattern), so
 * focus stays on the button while arrow keys move through the list. Typing finds an option by any
 * part of its label, which is how a long list (88 departments) is searched.
 *
 * `options` are `{ value, label, disabled, group, title }` or plain strings; consecutive options
 * with the same `group` are listed under it. Inside a <label> (as Field makes) the label names it.
 * `trigger` replaces the button's content (a role chip), `className` styles the button.
 */
export const Select = ({ value, options, onChange, disabled, className = '', trigger, placeholder = 'Choose…', ...aria }) => {
  const id = useId()
  const items = options.map((option) => (typeof option === 'string' ? { value: option, label: option } : option))
  const selected = items.findIndex((item) => item.value === value)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [query, setQuery] = useState('')
  const [place, setPlace] = useState(null)
  const button = useRef(null)
  const list = useRef(null)
  const typed = useRef({ text: '', timer: 0 })

  const measure = () => {
    const box = button.current?.getBoundingClientRect()
    if (!box) return
    const below = innerHeight - box.bottom - 12
    const above = box.top - 12
    const up = below < 220 && above > below
    setPlace({ left: Math.max(8, Math.min(box.left, innerWidth - Math.max(box.width, 220) - 8)), minWidth: box.width, ...(up ? { bottom: innerHeight - box.top + 6, maxHeight: Math.min(420, above) } : { top: box.bottom + 6, maxHeight: Math.min(420, below) }) })
  }
  const show = (at = selected) => {
    if (disabled) return
    measure()
    setActive(at >= 0 ? at : items.findIndex((item) => !item.disabled))
    setOpen(true)
  }
  const close = () => { setOpen(false); setQuery('') }
  const choose = (index) => {
    const item = items[index]
    if (!item || item.disabled) return
    close()
    if (item.value !== value) onChange(item.value)
  }
  useEffect(() => {
    if (!open) return undefined
    const outside = (event) => { if (!button.current?.contains(event.target) && !list.current?.contains(event.target)) close() }
    const moved = (event) => { if (!list.current?.contains(event.target)) measure() }
    document.addEventListener('pointerdown', outside)
    addEventListener('scroll', moved, true)
    addEventListener('resize', measure)
    return () => { document.removeEventListener('pointerdown', outside); removeEventListener('scroll', moved, true); removeEventListener('resize', measure) }
  }, [open])
  useEffect(() => { if (open) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }) }, [open, active])

  const step = (from, by) => {
    for (let at = from + by, n = 0; n < items.length; at += by, n += 1) {
      const index = (at + items.length) % items.length
      if (!items[index].disabled) return index
    }
    return from
  }
  const find = (char) => {
    clearTimeout(typed.current.timer)
    const text = typed.current.text + char.toLocaleLowerCase()
    typed.current = { text, timer: setTimeout(() => { typed.current.text = ''; setQuery('') }, 900) }
    setQuery(text)
    const start = active < 0 ? 0 : active
    const order = items.map((_, n) => (start + (text.length === 1 ? n + 1 : n)) % items.length)
    // Labels that start with the text first, then labels that contain it anywhere.
    const match = order.find((index) => !items[index].disabled && String(items[index].label).toLocaleLowerCase().startsWith(text))
      ?? order.find((index) => !items[index].disabled && String(items[index].label).toLocaleLowerCase().includes(text))
    return match
  }
  const onKeyDown = (event) => {
    const { key } = event
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) { event.preventDefault(); show() }
      else if (key.length === 1 && /\S/.test(key) && !event.metaKey && !event.ctrlKey) { const match = find(key); if (match !== undefined) choose(match) }
      return
    }
    const moves = { ArrowDown: () => step(active, 1), ArrowUp: () => step(active, -1), Home: () => step(-1, 1), End: () => step(items.length, -1), PageDown: () => Math.min(items.length - 1, active + 8), PageUp: () => Math.max(0, active - 8) }
    if (moves[key]) { event.preventDefault(); setActive(moves[key]()); return }
    if (key === 'Enter' || (key === ' ' && !typed.current.text)) { event.preventDefault(); choose(active); return }
    if (key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return }
    if (key === 'Tab') { choose(active); return }
    if (key.length === 1 && !event.metaKey && !event.ctrlKey) { event.preventDefault(); const match = find(key); if (match !== undefined) setActive(match) }
  }

  const current = items[selected]
  let lastGroup
  return (
    <span className={`select${open ? ' select--open' : ''}`}>
      <button ref={button} type="button" role="combobox" className={`select__button ${className}`} disabled={disabled}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
        title={current?.title} onClick={(event) => { event.preventDefault(); open ? close() : show() }} onKeyDown={onKeyDown} {...aria}>
        {trigger ?? <><span className="select__value">{current?.label ?? <span className="select__placeholder">{placeholder}</span>}</span><span className="select__caret" aria-hidden="true">▾</span></>}
      </button>
      {open && place && (
        <ul ref={list} id={`${id}-list`} role="listbox" className="select__list" style={place} aria-label={aria['aria-label']}
          onMouseDown={(event) => event.preventDefault()}>
          {query && <li role="presentation" className="select__query">Finding “{query}”</li>}
          {items.map((item, index) => {
            const heading = item.group && item.group !== lastGroup ? <li key={`group-${index}`} role="presentation" className="select__group">{item.group}</li> : null
            lastGroup = item.group
            return [heading, (
              <li key={String(item.value)} id={`${id}-${index}`} data-index={index} role="option" aria-selected={index === selected} aria-disabled={item.disabled || undefined}
                className={`select__option${index === active ? ' select__option--active' : ''}`} title={item.title}
                onMouseMove={() => { if (!item.disabled && active !== index) setActive(index) }}
                onClick={(event) => { event.preventDefault(); choose(index); button.current?.focus() }}>
                <span className="select__check" aria-hidden="true" /><span>{item.label}</span>
              </li>
            )]
          })}
        </ul>
      )}
    </span>
  )
}
