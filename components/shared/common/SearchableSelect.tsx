'use client'

import { useState, useEffect } from 'react'
import { Search, Check, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchableSelectOption {
  value:         string
  label:         string
  sublabel?:     string
  badge?:        string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  meta?:         string
  disabled?:     boolean
}

// Optional grouped mode — renders labeled sections with dividers
export interface SearchableSelectGroup {
  label:   string
  options: SearchableSelectOption[]
}

interface SearchableSelectProps {
  options:            SearchableSelectOption[]   // flat list (used when no groups)
  groups?:            SearchableSelectGroup[]    // optional grouped mode
  value:              string
  onChange:           (value: string) => void
  placeholder?:       string
  label?:             string
  emptyText?:         string
  clearable?:         boolean
  title?:             string
  searchPlaceholder?: string
  className?:         string
  triggerClassName?:  string
  disabled?:          boolean
  error?:             boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SearchableSelect({
  options,
  groups,
  value,
  onChange,
  placeholder       = 'Select...',
  label,
  emptyText         = 'No results found',
  clearable         = false,
  title,
  searchPlaceholder = 'Search...',
  className,
  triggerClassName,
  disabled          = false,
  error             = false,
}: SearchableSelectProps) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')

  // Flatten groups + options to find selected item label
  const allOptions: SearchableSelectOption[] = groups
    ? groups.flatMap(g => g.options)
    : options

  const selected = allOptions.find(o => o.value === value)

  useEffect(() => { if (!open) setQuery('') }, [open])

  const q = query.trim().toLowerCase()

  // Filter within groups or flat list
  const filteredGroups: SearchableSelectGroup[] | null = groups
    ? groups
        .map(g => ({
          ...g,
          options: q
            ? g.options.filter(o =>
                o.label.toLowerCase().includes(q) ||
                o.sublabel?.toLowerCase().includes(q) ||
                o.badge?.toLowerCase().includes(q)
              )
            : g.options,
        }))
        .filter(g => g.options.length > 0)   // hide empty groups
    : null

  const filteredFlat: SearchableSelectOption[] = !groups
    ? q
      ? options.filter(o =>
          o.label.toLowerCase().includes(q) ||
          o.sublabel?.toLowerCase().includes(q) ||
          o.badge?.toLowerCase().includes(q)
        )
      : options
    : []

  const isEmpty = groups
    ? (filteredGroups?.length ?? 0) === 0
    : filteredFlat.length === 0

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

      {/* ── Trigger ──────────────────────────────────────────────────────── */}
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
          error ? 'border-destructive' : 'border-input hover:border-ring',
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
            <Badge variant={selected.badgeVariant ?? 'secondary'} className="text-[10px] h-5">
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

      {/* ── Sheet ────────────────────────────────────────────────────────── */}
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
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                autoFocus
                placeholder={searchPlaceholder}
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl border-muted"
              />
              {query && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setQuery('')}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </SheetHeader>

          <div className="overflow-y-auto pb-10" style={{ maxHeight: 'calc(85vh - 130px)' }}>
            {isEmpty ? (
              <div className="text-center py-10 text-sm text-muted-foreground">{emptyText}</div>
            ) : groups ? (
              // ── Grouped mode ─────────────────────────────────────────────
              <div>
                {filteredGroups!.map((group, gi) => (
                  <div key={group.label}>
                    {/* Group divider label */}
                    <div className={cn(
                      'px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40',
                      gi > 0 && 'border-t',
                    )}>
                      {group.label}
                      <span className="ml-1.5 font-normal normal-case">
                        ({group.options.length})
                      </span>
                    </div>
                    <div className="divide-y divide-border/50">
                      {group.options.map(opt => (
                        <OptionRow
                          key={opt.value}
                          opt={opt}
                          isSelected={opt.value === value}
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // ── Flat mode ────────────────────────────────────────────────
              <div className="divide-y divide-border/50">
                {filteredFlat.map(opt => (
                  <OptionRow
                    key={opt.value}
                    opt={opt}
                    isSelected={opt.value === value}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ── Shared option row ─────────────────────────────────────────────────────────
function OptionRow({
  opt,
  isSelected,
  onSelect,
}: {
  opt:        SearchableSelectOption
  isSelected: boolean
  onSelect:   (opt: SearchableSelectOption) => void
}) {
  return (
    <button
      type="button"
      disabled={opt.disabled}
      onClick={() => onSelect(opt)}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors focus:outline-none',
        opt.disabled
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-muted/60 active:bg-muted',
        isSelected && 'bg-primary/5'
      )}
    >
      <div className={cn(
        'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
        isSelected ? 'bg-primary border-primary' : 'border-border'
      )}>
        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', isSelected ? 'font-semibold' : 'font-medium')}>
          {opt.label}
        </p>
        {opt.sublabel && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{opt.sublabel}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {opt.badge && (
          <Badge variant={opt.badgeVariant ?? 'secondary'} className="text-[10px] h-5">
            {opt.badge}
          </Badge>
        )}
        {opt.meta && (
          <span className="text-sm font-semibold text-muted-foreground">{opt.meta}</span>
        )}
      </div>
    </button>
  )
}
