import { useState, useRef, useEffect } from 'react'
import './FilterDropdown.css'

export default function FilterDropdown({ label, options, selected, onToggle }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const hasSelections = selected.length > 0

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="filter-dropdown" ref={ref}>
      <button
        className={`filter-chip ${hasSelections ? 'filter-chip--active' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        {hasSelections && <span className="filter-chip__count">{selected.length}</span>}
        <span className={`filter-chip__arrow ${open ? 'filter-chip__arrow--open' : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="filter-dropdown__menu">
          {options.map((opt) => {
            const isChecked = selected.includes(opt)
            return (
              <label key={opt} className="filter-dropdown__option">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggle(opt)}
                  className="filter-dropdown__checkbox"
                />
                <span className="filter-dropdown__label">{opt}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
