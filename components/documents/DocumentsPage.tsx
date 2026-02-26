// components/documents/DocumentsPage.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useDocuments } from '@/hooks/useDocument'
import { useSettings } from '@/hooks/useSettings'
import { DOC_TYPE_LABELS, DocumentType } from '@/models/document'
import { fmtAmount, fmtDate, cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, ChevronRight, FileText, Trash2 } from 'lucide-react'
import type { Settings } from '@/models/settings'

// ── Filter config ───────────────────────────────────────────────────────────
const BASE_FILTERS: { label: string; value: string }[] = [
  { label: 'All',      value: '' },
  { label: 'Bills',    value: 'bill' },
  { label: 'Invoices', value: 'invoice' },
  // FIX 3: vouchers moved to OPTIONAL_FILTERS — only show when enable_vouchers is ON
]

const OPTIONAL_FILTERS: {
  label: string
  value: DocumentType
  flag: keyof Settings
}[] = [
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

// ── Type badge colours ──────────────────────────────────────────────────────
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

export function DocumentsPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const setPageTitle = useUIStore((s) => s.setPageTitle)

  useEffect(() => setPageTitle('Documents'), [setPageTitle])

  const { data: settings } = useSettings()

  const [activeType,   setActiveType]   = useState(searchParams.get('type') ?? '')
  const [search,       setSearch]       = useState('')
  const [showDeleted,  setShowDeleted]  = useState(false)

  const { data, isLoading } = useDocuments({
    type:      activeType || undefined,
    search:    search || undefined,
    contact:   searchParams.get('contact') ? Number(searchParams.get('contact')) : undefined,
    is_active: showDeleted ? false : true,
  } as any)

  const docs = data?.results ?? []

  // FIX 2: memoised — only rebuilds when settings changes, not on every search keystroke
  const visibleFilters = useMemo(() => [
    ...BASE_FILTERS,
    ...OPTIONAL_FILTERS.filter(f => settings?.[f.flag]),
    // expense always shown — core path per spec
    { label: 'Expense', value: 'expense' },
  ], [settings])

  return (
    <div className="pb-10">

      {/* Search */}
      <div className="px-4 pt-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by doc ID, contact..."
            className="pl-9 h-11 rounded-xl"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Type Filter Chips */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-4 no-scrollbar items-center">
        {visibleFilters.map(f => (
          <button
            key={f.value}
            onClick={() => {
              setActiveType(f.value)
              setShowDeleted(false)
            }}
            className={cn(
              'shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors',
              activeType === f.value && !showDeleted
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
            )}
          >
            {f.label}
          </button>
        ))}

        <div className="h-6 w-px bg-border mx-1 shrink-0" />
        <button
          onClick={() => {
            setShowDeleted(true)
            setActiveType('')
          }}
          className={cn(
            'shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors',
            showDeleted
              ? 'bg-destructive/10 text-destructive border-destructive/30 shadow-sm'
              : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
          )}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Deleted
        </button>
      </div>

      {/* List */}
      <div className="px-4 space-y-2.5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : docs.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              {showDeleted ? 'No deleted documents found' : 'No documents found'}
            </p>
          </div>
        ) : (
          docs.map(doc => (
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
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn(
                      'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border',
                      TYPE_BADGE_COLORS[doc.type] ?? 'bg-muted text-muted-foreground border-border',
                    )}>
                      {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                    </span>
                    {!doc.is_active && (
                      <Badge variant="destructive" className="text-[10px] h-5 rounded-md px-1.5 font-semibold">
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
                    <p className="text-xs text-muted-foreground/50 truncate mt-0.5 italic">
                      No contact
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(doc.date)}</p>
                </div>
                <div className="flex flex-col items-end justify-center gap-1.5 shrink-0">
                  <p className="text-base font-bold tracking-tight">
                    {doc.total_amount ? fmtAmount(doc.total_amount) : '—'}
                  </p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
