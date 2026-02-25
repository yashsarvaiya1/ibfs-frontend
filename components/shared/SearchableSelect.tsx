// components/shared/SearchableSelect.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Check, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchableSelectOption {
  value: string           // always string — convert before passing
  label: string           // primary display text
  sublabel?: string       // secondary line (e.g. phone, balance)
  badge?: string          // small badge on the right
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  meta?: string           // extra right-side text (e.g. amount)
  disabled?: boolean
}

interface SearchableSelectProps {
  // Data
  options: SearchableSelectOption[]
  value: string           // currently selected value ('' = none)
  onChange: (value: string) => void

  // Display
  placeholder?: string
  label?: string          // shown inside trigger as prefix when selected
  emptyText?: string      // shown when no results found
  clearable?: boolean     // show X to clear selection

  // Sheet
  title?: string          // sheet header title
  searchPlaceholder?: string

  // Style
  className?: string
  triggerClassName?: string
  disabled?: boolean
  error?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  emptyText = 'No results found',
  clearable = false,
  title,
  searchPlaceholder = 'Search...',
  className,
  triggerClassName,
  disabled = false,
  error = false,
}: SearchableSelectProps) {
  const [open,   setOpen]   = useState(false)
  const [query,  setQuery]  = useState('')
  const inputRef            = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)

  // Focus search input when sheet opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
    }
  }, [open])

  const filtered = query.trim()
    ? options.filter(o => {
        const q = query.toLowerCase()
        return (
          o.label.toLowerCase().includes(q) ||
          o.sublabel?.toLowerCase().includes(q) ||
          o.badge?.toLowerCase().includes(q)
        )
      })
    : options

  const handleSelect = (opt: SearchableSelectOption) => {
    if (opt.disabled) return
    onChange(opt.value)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div className={cn('w-full', className)}>
      {/* ── Trigger ────────────────────────────────────────────────────── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
        className={cn(
          'w-full flex items-center justify-between gap-2',
          'min-h-10 px-3 py-2 rounded-xl border text-sm',
          'bg-background transition-colors text-left',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          disabled && 'opacity-50 cursor-not-allowed',
          error
            ? 'border-destructive'
            : 'border-input hover:border-ring',
          triggerClassName
        )}
      >
        <div className="flex-1 min-w-0">
          {selected ? (
            <div className="flex items-center gap-2 min-w-0">
              {label && (
                <span className="text-xs text-muted-foreground shrink-0">{label}</span>
              )}
              <span className="font-medium truncate">{selected.label}</span>
              {selected.sublabel && (
                <span className="text-xs text-muted-foreground truncate hidden sm:block">
                  · {selected.sublabel}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selected?.badge && (
            <Badge
              variant={selected.badgeVariant ?? 'secondary'}
              className="text-[10px] h-5"
            >
              {selected.badge}
            </Badge>
          )}
          {clearable && selected && (
            <div
              role="button"
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>

      {/* ── Sheet ──────────────────────────────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl px-0 pb-0"
          style={{ maxHeight: '85vh' }}
        >
          <SheetHeader className="px-4 pb-3 border-b">
            <SheetTitle className="text-left text-base">
              {title ?? placeholder}
            </SheetTitle>

            {/* Search */}
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder={searchPlaceholder}
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl border-muted"
              />
              {query && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setQuery('')}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </SheetHeader>

          {/* Options list */}
          <div className="overflow-y-auto pb-10" style={{ maxHeight: 'calc(85vh - 130px)' }}>
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filtered.map(opt => {
                  const isSelected = opt.value === value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => handleSelect(opt)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                        'focus:outline-none',
                        opt.disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-muted/60 active:bg-muted',
                        isSelected && 'bg-primary/5'
                      )}
                    >
                      {/* Check indicator */}
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
                        isSelected
                          ? 'bg-primary border-primary'
                          : 'border-border'
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>

                      {/* Label + sublabel */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm truncate',
                          isSelected ? 'font-semibold' : 'font-medium'
                        )}>
                          {opt.label}
                        </p>
                        {opt.sublabel && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {opt.sublabel}
                          </p>
                        )}
                      </div>

                      {/* Right side: badge + meta */}
                      <div className="flex items-center gap-2 shrink-0">
                        {opt.badge && (
                          <Badge
                            variant={opt.badgeVariant ?? 'secondary'}
                            className="text-[10px] h-5"
                          >
                            {opt.badge}
                          </Badge>
                        )}
                        {opt.meta && (
                          <span className="text-sm font-semibold text-muted-foreground">
                            {opt.meta}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
