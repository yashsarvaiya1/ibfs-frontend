'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useDocuments } from '@/hooks/useDocument'
import { useSettings } from '@/hooks/useSettings'
import { DOC_TYPE_LABELS, DocumentType, MARK_PAID_TYPES } from '@/models/document'
import { fmtAmount, fmtDate, cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import {
  Search, ChevronRight, FileText, Trash2,
  CheckCircle2, Clock, AlertCircle, SlidersHorizontal, X, Check,
} from 'lucide-react'
import type { Settings } from '@/models/settings'


// ── Filter config ─────────────────────────────────────────────────────────────
const BASE_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Bills',    value: 'bill' },
  { label: 'Invoices', value: 'invoice' },
]

const OPTIONAL_TYPE_OPTIONS: { label: string; value: DocumentType; flag: keyof Settings }[] = [
  { label: 'PO',           value: 'po',                   flag: 'enable_po' },
  { label: 'Proforma',     value: 'pi',                   flag: 'enable_pi' },
  { label: 'Quotation',    value: 'quotation',            flag: 'enable_quotation' },
  { label: 'Challan',      value: 'challan',              flag: 'enable_challan' },
  { label: 'Credit Note',  value: 'cn',                   flag: 'enable_cn' },
  { label: 'Debit Note',   value: 'dn',                   flag: 'enable_dn' },
  { label: 'Interest',     value: 'interest',             flag: 'enable_interest' },
  { label: 'Pay Voucher',  value: 'cash_payment_voucher', flag: 'enable_vouchers' },
  { label: 'Recv Voucher', value: 'cash_receipt_voucher', flag: 'enable_vouchers' },
]

const TYPE_BADGE_COLORS: Record<string, string> = {
  bill:                  'bg-orange-100 text-orange-700 border-orange-200',
  invoice:               'bg-blue-100 text-blue-700 border-blue-200',
  po:                    'bg-purple-100 text-purple-700 border-purple-200',
  pi:                    'bg-indigo-100 text-indigo-700 border-indigo-200',
  cn:                    'bg-green-100 text-green-700 border-green-200',
  dn:                    'bg-red-100 text-red-700 border-red-200',
  challan:               'bg-yellow-100 text-yellow-700 border-yellow-200',
  expense:               'bg-gray-100 text-gray-700 border-gray-200',
  interest:              'bg-pink-100 text-pink-700 border-pink-200',
  cash_payment_voucher:  'bg-teal-100 text-teal-700 border-teal-200',
  cash_receipt_voucher:  'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const HAS_BALANCE = new Set(['bill', 'invoice', 'cn', 'dn'])

const PAYMENT_FILTERS = [
  { label: 'All',     value: '' },
  { label: 'Paid',    value: 'paid' },
  { label: 'Unpaid',  value: 'unpaid' },
  { label: 'Partial', value: 'partial' },
] as const

type PaymentFilter = '' | 'paid' | 'unpaid' | 'partial'


function countActiveFilters(opts: {
  selectedTypes: string[]
  dateFrom: string
  dateTo: string
  paymentFilter: PaymentFilter
  showDeleted: boolean
}) {
  let n = 0
  if (opts.selectedTypes.length > 0) n++
  if (opts.dateFrom)                  n++
  if (opts.dateTo)                    n++
  if (opts.paymentFilter)             n++
  if (opts.showDeleted)               n++
  return n
}


export function DocumentsPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const setPageTitle = useUIStore(s => s.setPageTitle)

  useEffect(() => setPageTitle('Documents'), [setPageTitle])

  const { data: settings } = useSettings()

  // ── Applied filter state (drives query) ───────────────────────────────────
  const [search,         setSearch]         = useState('')
  const [selectedTypes,  setSelectedTypes]  = useState<string[]>(() => {
    const t = searchParams.get('type')
    return t ? [t] : []
  })
  const [showDeleted,    setShowDeleted]    = useState(false)
  const [dateFrom,       setDateFrom]       = useState('')
  const [dateTo,         setDateTo]         = useState('')
  const [paymentFilter,  setPaymentFilter]  = useState<PaymentFilter>('')

  // ── Filter sheet state ────────────────────────────────────────────────────
  const [filterOpen,          setFilterOpen]          = useState(false)
  const [stagedTypes,         setStagedTypes]         = useState<string[]>([])
  const [stagedDateFrom,      setStagedDateFrom]      = useState('')
  const [stagedDateTo,        setStagedDateTo]        = useState('')
  const [stagedPayment,       setStagedPayment]       = useState<PaymentFilter>('')
  const [stagedShowDeleted,   setStagedShowDeleted]   = useState(false)

  const handleOpenFilter = () => {
    setStagedTypes([...selectedTypes])
    setStagedDateFrom(dateFrom)
    setStagedDateTo(dateTo)
    setStagedPayment(paymentFilter)
    setStagedShowDeleted(showDeleted)
    setFilterOpen(true)
  }

  const handleApplyFilters = () => {
    setSelectedTypes(stagedTypes)
    setDateFrom(stagedDateFrom)
    setDateTo(stagedDateTo)
    setPaymentFilter(stagedPayment)
    setShowDeleted(stagedShowDeleted)
    setFilterOpen(false)
  }

  const handleClearStaged = () => {
    setStagedTypes([])
    setStagedDateFrom('')
    setStagedDateTo('')
    setStagedPayment('')
    setStagedShowDeleted(false)
  }

  const handleResetAll = () => {
    setSelectedTypes([])
    setDateFrom('')
    setDateTo('')
    setPaymentFilter('')
    setShowDeleted(false)
  }

  // Toggle a type in the staged multi-select
  const toggleStagedType = (val: string) => {
    setStagedTypes(prev =>
      prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]
    )
  }

  // ── All available type options (driven by settings) ───────────────────────
  const allTypeOptions = useMemo(() => [
    ...BASE_TYPE_OPTIONS,
    ...OPTIONAL_TYPE_OPTIONS.filter(f => settings?.[f.flag]),
    { label: 'Expense', value: 'expense' },
  ], [settings])

  // ── Build query ───────────────────────────────────────────────────────────
  const queryParams = useMemo(() => {
    const p: Record<string, any> = {
      search:    search    || undefined,
      contact:   searchParams.get('contact') ? Number(searchParams.get('contact')) : undefined,
      is_active: showDeleted ? false : true,
      ordering:  '-date',
    }
    // ✅ Send multiple types as comma-separated (backend handles split)
    if (selectedTypes.length === 1)       p.type = selectedTypes[0]
    else if (selectedTypes.length > 1)    p.type = selectedTypes.join(',')

    if (dateFrom) p.date_from = dateFrom
    if (dateTo)   p.date_to   = dateTo
    if (paymentFilter === 'paid')   p.is_paid = true
    if (paymentFilter === 'unpaid') p.is_paid = false

    return p
  }, [search, searchParams, showDeleted, selectedTypes, dateFrom, dateTo, paymentFilter])

  const { data, isLoading } = useDocuments(queryParams as any)
  const allDocs = data?.results ?? []

  // Client-side partial filter
  const docs = useMemo(() => {
    if (paymentFilter !== 'partial') return allDocs
    return allDocs.filter(doc => {
      if (!HAS_BALANCE.has(doc.type)) return false
      const ps     = doc.payment_status
      if (!ps)     return false
      const isPaid = doc.is_paid || ps.is_paid
      if (isPaid)  return false
      const rem    = Number(ps.remaining)
      const total  = Number(doc.total_amount)
      return rem > 0 && rem < total
    })
  }, [allDocs, paymentFilter])

  const activeFilterCount = countActiveFilters({
    selectedTypes, dateFrom, dateTo, paymentFilter, showDeleted,
  })
  const hasAnyFilter = activeFilterCount > 0 || !!search

  // Staged filter count (for Apply button badge)
  const stagedFilterCount = countActiveFilters({
    selectedTypes: stagedTypes, dateFrom: stagedDateFrom,
    dateTo: stagedDateTo, paymentFilter: stagedPayment,
    showDeleted: stagedShowDeleted,
  })

  const dateRangeInvalid = !!(
    stagedDateFrom && stagedDateTo &&
    new Date(stagedDateFrom) > new Date(stagedDateTo)
  )

  return (
    <div className="pb-10">

      {/* ── Search + Filter button ──────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by doc ID, contact..."
            className="pl-9 h-11 rounded-xl"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={handleOpenFilter}
          className={cn(
            'relative flex items-center justify-center h-11 w-11 rounded-xl border transition-colors shrink-0',
            activeFilterCount > 0
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-black flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Active filter summary pills ─────────────────────────────────────── */}
      {activeFilterCount > 0 && (
        <div className="mx-4 mb-3 flex items-center gap-2 flex-wrap">
          {/* Selected types pills */}
          {selectedTypes.map(t => (
            <span key={t} className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg">
              {allTypeOptions.find(o => o.value === t)?.label ?? t}
              <button onClick={() => setSelectedTypes(prev => prev.filter(x => x !== t))} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {paymentFilter && (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg">
              {PAYMENT_FILTERS.find(p => p.value === paymentFilter)?.label}
              <button onClick={() => setPaymentFilter('')} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {dateFrom && (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg">
              From: {fmtDate(dateFrom)}
              <button onClick={() => setDateFrom('')} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {dateTo && (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg">
              To: {fmtDate(dateTo)}
              <button onClick={() => setDateTo('')} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {showDeleted && (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 px-2.5 py-1 rounded-lg">
              Deleted
              <button onClick={() => setShowDeleted(false)} className="ml-0.5 hover:text-destructive/70">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            onClick={handleResetAll}
            className="text-[11px] font-bold text-muted-foreground underline underline-offset-2 hover:text-destructive ml-auto"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Document list ───────────────────────────────────────────────────── */}
      <div className="px-4 space-y-2.5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : docs.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              {showDeleted ? 'No deleted documents found' : 'No documents found'}
            </p>
            {hasAnyFilter && (
              <button
                onClick={handleResetAll}
                className="mt-3 text-xs font-bold text-primary underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          docs.map(doc => {
            const payStatus  = HAS_BALANCE.has(doc.type) ? doc.payment_status : null
            const isPaid     = doc.is_paid || (payStatus?.is_paid ?? false)
            const remaining  = payStatus ? Number(payStatus.remaining) : 0
            const hasBalance = payStatus !== null && Number(doc.total_amount) > 0

            return (
              <Card
                key={doc.id}
                className={cn(
                  'cursor-pointer active:scale-[0.99] transition-all rounded-xl shadow-sm',
                  !doc.is_active
                    ? 'opacity-70 bg-muted/40 border-dashed'
                    : 'hover:bg-muted/20 border-border',
                )}
                onClick={() => router.push(`/documents/${doc.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={cn(
                        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0',
                        TYPE_BADGE_COLORS[doc.type] ?? 'bg-muted text-muted-foreground border-border',
                      )}>
                        {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                      </span>

                      {hasBalance && isPaid && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-md shrink-0">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Paid
                        </span>
                      )}
                      {hasBalance && !isPaid && remaining > 0 && remaining < Number(doc.total_amount) && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-md shrink-0">
                          <Clock className="h-2.5 w-2.5" /> Partial
                        </span>
                      )}
                      {hasBalance && !isPaid && remaining > 0 && remaining >= Number(doc.total_amount) && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded-md shrink-0">
                          <AlertCircle className="h-2.5 w-2.5" /> Unpaid
                        </span>
                      )}
                      {!doc.is_active && (
                        <Badge variant="destructive" className="text-[10px] h-5 rounded-md px-1.5 font-semibold shrink-0">
                          Deleted
                        </Badge>
                      )}
                    </div>

                    <p className="font-semibold text-sm text-foreground/90">#{doc.doc_id}</p>
                    {doc.contact_name ? (
                      <p className="text-xs text-muted-foreground truncate mt-0.5 font-medium">
                        {doc.contact_name}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/50 truncate mt-0.5 italic">No contact</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(doc.date)}</p>
                  </div>

                  <div className="flex flex-col items-end justify-center gap-1 shrink-0">
                    <p className="text-base font-bold tracking-tight">
                      {doc.total_amount ? fmtAmount(doc.total_amount) : '—'}
                    </p>
                    {hasBalance && !isPaid && remaining > 0 && remaining < Number(doc.total_amount) && (
                      <p className="text-[10px] font-semibold text-amber-600">
                        Due {fmtAmount(remaining)}
                      </p>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          FILTER SHEET
      ══════════════════════════════════════════════════════════════════════ */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[90vh] overflow-y-auto">
          <SheetHeader className="mb-5">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-left flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filter Documents
              </SheetTitle>
              <button
                onClick={handleClearStaged}
                className="text-xs font-bold text-muted-foreground hover:text-destructive underline underline-offset-2 transition-colors"
              >
                Clear all
              </button>
            </div>
          </SheetHeader>

          <div className="space-y-6">

            {/* ── Document Type (multi-select) ────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Document Type
                </p>
                {stagedTypes.length > 0 && (
                  <button
                    onClick={() => setStagedTypes([])}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-destructive underline underline-offset-2"
                  >
                    Deselect all ({stagedTypes.length})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {allTypeOptions.map(opt => {
                  const isSelected = stagedTypes.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleStagedType(opt.value)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 shrink-0" />}
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              {stagedTypes.length === 0 && (
                <p className="text-[10px] text-muted-foreground mt-2 ml-1">
                  No type selected — showing all types
                </p>
              )}
            </div>

            <Separator />

            {/* ── Payment Status ──────────────────────────────────────────── */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Payment Status
              </p>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_FILTERS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setStagedPayment(opt.value)}
                    className={cn(
                      'h-10 rounded-xl text-xs font-semibold border transition-all',
                      stagedPayment === opt.value
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {stagedPayment && (
                <p className="text-[10px] text-muted-foreground mt-2 ml-1">
                  {stagedPayment === 'partial'
                    ? 'Partial filter applied client-side after fetch'
                    : 'Only applies to Bills, Invoices, CN & DN'}
                </p>
              )}
            </div>

            <Separator />

            {/* ── Date Range ──────────────────────────────────────────────── */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Date Range
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">From</label>
                  <input
                    type="date"
                    value={stagedDateFrom}
                    onChange={e => setStagedDateFrom(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">To</label>
                  <input
                    type="date"
                    value={stagedDateTo}
                    onChange={e => setStagedDateTo(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              {dateRangeInvalid && (
                <p className="text-[11px] text-destructive mt-2 ml-1 font-semibold">
                  ⚠️ "From" date is after "To" date
                </p>
              )}
            </div>

            <Separator />

            {/* ── Document Status ─────────────────────────────────────────── */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Document Status
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setStagedShowDeleted(false)}
                  className={cn(
                    'h-10 rounded-xl text-xs font-semibold border transition-all',
                    !stagedShowDeleted
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
                  )}
                >
                  Active
                </button>
                <button
                  onClick={() => setStagedShowDeleted(true)}
                  className={cn(
                    'h-10 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5',
                    stagedShowDeleted
                      ? 'bg-destructive/10 text-destructive border-destructive/30 shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Deleted
                </button>
              </div>
            </div>

          </div>

          {/* ── Apply / Cancel ──────────────────────────────────────────────── */}
          <div className="flex gap-3 mt-8">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-2xl font-semibold"
              onClick={() => setFilterOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-12 rounded-2xl font-bold shadow-md shadow-primary/20"
              onClick={handleApplyFilters}
              disabled={dateRangeInvalid}
            >
              Apply
              {stagedFilterCount > 0 && (
                <span className="ml-2 bg-primary-foreground/20 text-primary-foreground text-[10px] font-black px-1.5 py-0.5 rounded-md">
                  {stagedFilterCount}
                </span>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  )
}
