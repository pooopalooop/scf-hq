import { useState, useRef, useEffect, useMemo } from 'react'

/**
 * SearchableSelect — dark-UI combobox for player/team lookups.
 *
 * Props:
 *   value        – current display string (controlled)
 *   onChange     – (option: { value, label, sublabel }) => void
 *   options      – static array of { value, label, sublabel? }; if omitted, use onSearch
 *   onSearch     – async (query: string) => { value, label, sublabel? }[]  (for async sources)
 *   placeholder  – input placeholder text
 *   disabled     – boolean
 *   clearable    – show × clear button when a value is selected (default true)
 */
export default function SearchableSelect({
  value = '',
  onChange,
  options,
  onSearch,
  placeholder = 'Search...',
  disabled = false,
  clearable = true,
}) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [asyncResults, setAsyncResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const containerRef = useRef(null)

  // Sync query when value prop changes from outside (e.g. prefill)
  useEffect(() => { setQuery(value) }, [value])

  // Close on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Filter static options
  const filteredOptions = useMemo(() => {
    if (!options) return []
    if (!query.trim()) return options
    const q = query.toLowerCase()
    return options.filter(o =>
      o.label.toLowerCase().includes(q) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(q))
    )
  }, [options, query])

  const displayOptions = options ? filteredOptions : asyncResults

  async function handleInput(e) {
    const q = e.target.value
    setQuery(q)
    setHighlighted(0)
    setOpen(true)

    if (onSearch) {
      if (q.length < 2) { setAsyncResults([]); return }
      setLoading(true)
      try {
        const results = await onSearch(q)
        setAsyncResults(results || [])
      } catch {
        setAsyncResults([])
      } finally {
        setLoading(false)
      }
    }
  }

  function handleSelect(option) {
    setQuery(option.label)
    setOpen(false)
    onChange?.(option)
  }

  function handleClear(e) {
    e.stopPropagation()
    setQuery('')
    setAsyncResults([])
    setOpen(false)
    onChange?.(null)
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, displayOptions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && displayOptions[highlighted]) {
      e.preventDefault()
      handleSelect(displayOptions[highlighted])
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return
    const item = listRef.current.children[highlighted]
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  const showClear = clearable && query && !disabled

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => { if (!disabled) setOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="w-full bg-surface2 border border-border2 text-txt px-3 py-2.5 rounded-sm font-body text-[13px] outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ paddingRight: showClear ? '28px' : undefined }}
        />
        {showClear && (
          <button
            type="button"
            onMouseDown={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-txt3 hover:text-txt2 transition-colors cursor-pointer bg-transparent font-mono text-[14px] leading-none"
            tabIndex={-1}
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border2 rounded-sm shadow-lg z-20 max-h-[220px] overflow-y-auto">
          {loading && (
            <div className="px-3 py-2.5 font-mono text-[11px] text-txt3">Searching...</div>
          )}
          {!loading && displayOptions.length === 0 && query.length >= 2 && (
            <div className="px-3 py-2.5 font-mono text-[11px] text-txt3">No results</div>
          )}
          {!loading && query.length < 2 && !options && (
            <div className="px-3 py-2.5 font-mono text-[11px] text-txt3">Type to search...</div>
          )}
          <div ref={listRef}>
            {displayOptions.map((opt, i) => (
              <button
                key={opt.value ?? i}
                type="button"
                onMouseDown={() => handleSelect(opt)}
                style={{ padding: '8px 12px' }}
                className={`w-full text-left cursor-pointer flex justify-between items-center border-b border-border last:border-b-0 transition-colors ${
                  i === highlighted ? 'bg-surface3' : 'bg-transparent hover:bg-surface2'
                }`}
              >
                <div>
                  <div className="text-[13px] text-txt font-medium">{opt.label}</div>
                  {opt.sublabel && (
                    <div className="text-[11px] text-txt3 mt-0.5">{opt.sublabel}</div>
                  )}
                </div>
                {opt.badge && (
                  <span className="font-mono text-[10px] text-txt3 ml-3 flex-shrink-0">{opt.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
