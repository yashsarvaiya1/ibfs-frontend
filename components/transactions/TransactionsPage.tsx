// components/transactions/TransactionsPage.tsx
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransaction'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TransactionCard } from '@/components/shared/TransactionCard'
import { cn } from '@/lib/utils'
import { SlidersHorizontal, X } from 'lucide-react'
import { toast } from 'sonner'
import type { TransactionType } from '@/models/transaction' 

const TYPE_FILTERS = [
  { label: 'All',      value: '' },
  { label: 'Expected', value: 'record' },
  { label: 'Settled',  value: 'actual' },
  { label: 'Contra',   value: 'contra' },
]

export function TransactionsPage() {
  const { setPageTitle, globalTxnFilter, setGlobalTxnFilter } = useUIStore()

  useEffect(() => { setPageTitle('Transactions') }, [setPageTitle])

  const searchParams  = useSearchParams()
  const contactFilter = searchParams.get('contact')
  const accountFilter = searchParams.get('account')

  // Date range filter — local state (not persisted, resets on nav)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [showDates, setShowDates] = useState(false)

  const { data, isLoading } = useTransactions({
    type:      (globalTxnFilter || undefined) as TransactionType | undefined,
    contact:   contactFilter ? Number(contactFilter) : undefined,
    account:   accountFilter ? Number(accountFilter) : undefined,
    date_from: dateFrom || undefined,
    date_to:   dateTo   || undefined,
  })

  const deleteMutation = useDeleteTransaction()

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Transaction deleted')
    } catch {
      toast.error('Failed to delete transaction')
    }
  }

  const txns          = data?.results ?? []
  const hasDateFilter = dateFrom || dateTo

  return (
    <div className="pb-6">

      {/* ── Type filter chips ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setGlobalTxnFilter(f.value)}
              className={cn(
                'shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all',
                globalTxnFilter === f.value
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Date range toggle */}
        <button
          type="button"
          onClick={() => setShowDates(p => !p)}
          className={cn(
            'shrink-0 p-2 rounded-full border transition-colors',
            (showDates || hasDateFilter)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:bg-muted'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Date range inputs ─────────────────────────────────────────── */}
      {showDates && (
        <div className="px-4 pb-3 flex gap-2 items-center">
          <div className="flex-1 space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">From</p>
            <Input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">To</p>
            <Input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          {hasDateFilter && (
            <button
              type="button"
              className="mt-5 shrink-0 p-1.5 rounded-full bg-muted hover:bg-muted/80"
              onClick={() => { setDateFrom(''); setDateTo('') }}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      {/* ── Active context banner (contact / account filter from URL) ─── */}
      {(contactFilter || accountFilter) && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary flex items-center justify-center gap-1">
          {contactFilter && <span>Contact #{contactFilter}</span>}
          {contactFilter && accountFilter && <span>·</span>}
          {accountFilter && <span>Account #{accountFilter}</span>}
        </div>
      )}

      {/* ── Active date range badge ───────────────────────────────────── */}
      {hasDateFilter && (
        <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300 flex-1">
            {dateFrom && `From ${dateFrom}`}
            {dateFrom && dateTo && ' → '}
            {dateTo && `To ${dateTo}`}
          </span>
          <button
            type="button"
            onClick={() => { setDateFrom(''); setDateTo('') }}
            className="text-amber-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Transaction list ──────────────────────────────────────────── */}
      <div className="px-4 space-y-1">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl w-full mb-2" />
          ))
        ) : txns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <span className="text-xl">📄</span>
            </div>
            <p className="text-muted-foreground text-sm font-medium">No transactions found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-50">
              Try changing your filters or checking a different account.
            </p>
            {(globalTxnFilter || hasDateFilter) && (
              <Button
                variant="outline" size="sm"
                className="mt-4 text-xs"
                onClick={() => {
                  setGlobalTxnFilter('')
                  setDateFrom('')
                  setDateTo('')
                }}
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          txns.map(txn => (
            <TransactionCard
              key={txn.id}
              txn={txn}
              showContact={!contactFilter}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}
