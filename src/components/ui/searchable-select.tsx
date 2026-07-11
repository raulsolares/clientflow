'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, X, Search } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
  /** Show a "—" option for "none" at the top */
  includeNone?: boolean
  noneLabel?: string
  noneValue?: string
  disabled?: boolean
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  emptyMessage = 'Sin resultados',
  className = '',
  includeNone = false,
  noneLabel = 'Ninguno',
  noneValue = '',
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightIdx, setHighlightIdx] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find(o => o.value === value)?.label || ''

  const filtered = includeNone
    ? [noneValue, ...options.map(o => o.value)]
      .filter(v => {
        if (v === noneValue) return true
        const label = options.find(o => o.value === v)?.label || ''
        return label.toLowerCase().includes(search.toLowerCase())
      })
    : options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )

  const getLabel = useCallback((val: string) => {
    if (includeNone && val === noneValue) return noneLabel
    return options.find(o => o.value === val)?.label || val
  }, [options, includeNone, noneValue, noneLabel])

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Scroll highlighted into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return
    const items = listRef.current.querySelectorAll('[data-index]')
    const el = items[highlightIdx] as HTMLElement
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [highlightIdx, isOpen])

  function handleSelect(val: string) {
    onChange(val)
    setIsOpen(false)
    setSearch('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIdx(prev => Math.min(prev + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIdx(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[highlightIdx] !== undefined) {
          handleSelect(filtered[highlightIdx])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
    }
  }

  function clearValue(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(noneValue)
    setSearch('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger / input */}
      <div
        className={`flex h-10 w-full items-center rounded-lg border border-input bg-[hsl(0,0%,13%)] px-3 text-sm transition-all duration-200 ${
          isOpen
            ? 'border-ring ring-2 ring-ring ring-offset-2 ring-offset-background'
            : 'hover:border-border/80'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        onClick={() => {
          if (disabled) return
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
      >
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setHighlightIdx(0) }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        ) : (
          <span className={`flex-1 truncate ${value ? 'text-foreground' : 'text-muted-foreground'}`}>
            {value ? selectedLabel : placeholder}
          </span>
        )}

        <div className="flex items-center gap-1 ml-2">
          {value && !isOpen && (
            <button
              onClick={clearValue}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              tabIndex={-1}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl p-1 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <Search className="mx-auto h-5 w-5 text-muted-foreground/40 mb-1" />
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
          ) : (
            filtered.map((val, idx) => {
              const label = getLabel(val)
              const isSelected = val === value
              const isHighlighted = idx === highlightIdx
              return (
                <button
                  key={val}
                  data-index={idx}
                  onClick={() => handleSelect(val)}
                  onMouseEnter={() => setHighlightIdx(idx)}
                  className={`flex w-full items-center rounded-lg px-3 py-2.5 text-sm text-left transition-all ${
                    isHighlighted
                      ? 'bg-accent/60'
                      : 'hover:bg-accent/30'
                  }`}
                >
                  <span className={`flex-1 truncate ${
                    isSelected ? 'font-semibold text-lime-light' : 'text-foreground'
                  }`}>
                    {label}
                  </span>
                  {isSelected && (
                    <svg className="h-4 w-4 text-lime-light shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
