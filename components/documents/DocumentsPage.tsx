// components/documents/DocumentsPage.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useDocuments } from '@/hooks/useDocument'
import { useSettings } from '@/hooks/useSettings'
import { DOC_TYPE_LABELS, DocumentType } from '@/models/document'
import { fmtAmount, fmtDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const BASE_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Bills', value: 'bill' },
  { label: 'Invoices', value: 'invoice' },
]

const OPTIONAL_FILTERS: { label: string; value: DocumentType; flag: keyof import('@/models/settings').Settings }[] = [
  { label: 'PO', value: 'po', flag: 'enable_po' },
  { label: 'Proforma', value: 'pi', flag: 'enable_pi' },
  { label: 'Quotation', value: 'quotation', flag: 'enable_quotation' },
  { label: 'Challan', value: 'challan', flag: 'enable_challan' },
  { label: 'Credit Note', value: 'cn', flag: 'enable_cn' },
  { label: 'Debit Note', value: 'dn', flag: 'enable_dn' },
  { label: 'Voucher', value: 'cash_payment_voucher', flag: 'enable_vouchers' },
  { label: 'Interest', value: 'interest', flag: 'enable_interest' },
]

export function DocumentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  useEffect(() => setPageTitle('Documents'), [setPageTitle])

  const { data: settings } = useSettings()
  const [activeType, setActiveType] = useState(searchParams.get('type') ?? '')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useDocuments({
    type: activeType || undefined,
    search: search || undefined,
    contact: searchParams.get('contact') ? Number(searchParams.get('contact')) : undefined,
  })

  const docs = data?.results ?? []

  const visibleFilters = [
    ...BASE_FILTERS,
    ...OPTIONAL_FILTERS.filter(f => settings?.[f.flag]),
    { label: 'Expense', value: 'expense' },
  ]

  const TYPE_BADGE_COLORS: Record<string, string> = {
    bill: 'bg-orange-100 text-orange-700',
    invoice: 'bg-blue-100 text-blue-700',
    po: 'bg-purple-100 text-purple-700',
    pi: 'bg-indigo-100 text-indigo-700',
    cn: 'bg-green-100 text-green-700',
    dn: 'bg-red-100 text-red-700',
    challan: 'bg-yellow-100 text-yellow-700',
    expense: 'bg-gray-100 text-gray-700',
    interest: 'bg-pink-100 text-pink-700',
  }

  return (
    <div className="pb-6">

      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by doc ID, contact..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Type Filter Chips */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
        {visibleFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveType(f.value)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              activeType === f.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))
        ) : docs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">No documents found</p>
          </div>
        ) : (
          docs.map((doc) => (
            <Card
              key={doc.id}
              className="cursor-pointer active:scale-[0.99] transition-transform"
              onClick={() => router.push(`/documents/${doc.id}`)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      TYPE_BADGE_COLORS[doc.type] ?? 'bg-muted text-muted-foreground'
                    )}>
                      {DOC_TYPE_LABELS[doc.type]}
                    </span>
                    {!doc.is_active && (
                      <Badge variant="destructive" className="text-[10px] h-4">Deleted</Badge>
                    )}
                  </div>
                  <p className="font-semibold text-sm">#{doc.doc_id}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(doc.date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">
                    {doc.total_amount ? fmtAmount(doc.total_amount) : '—'}
                  </p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
