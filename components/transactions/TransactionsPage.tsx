// components/transactions/TransactionsPage.tsx
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransaction'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { TransactionCard } from '@/components/shared/TransactionCard' // NEW Shared Component

const TYPE_FILTERS = [
  { label: 'All',    value: '' },
  { label: 'Record', value: 'record' },
  { label: 'Actual', value: 'actual' },
  { label: 'Contra', value: 'contra' },
]

export function TransactionsPage() {
  const { setPageTitle, ledgerShowRecords, setLedgerShowRecords } = useUIStore()
  
  useEffect(() => {
    setPageTitle('Transactions')
  }, [setPageTitle])

  const searchParams  = useSearchParams()
  const contactFilter = searchParams.get('contact')
  const accountFilter = searchParams.get('account')

  // We are using `ledgerShowRecords` from Zustand to persist the filter (Bug #15 / Improvement)
  // If ledgerShowRecords is false, it defaults to showing only "actual" + "contra".
  // If we want a standalone string state for this specific page but still persisted, 
  // we could add a `globalTxnFilter` to Zustand, but let's use standard local state 
  // that defaults based on the store, or write to local storage if you want it strict.
  
  // For standardizing Bug #17: Instead of 'record'/'actual' we show 'Expected'/'Settled' to the user
  const USER_FRIENDLY_FILTERS = [
    { label: 'All', value: '' },
    { label: 'Expected', value: 'record' },
    { label: 'Settled', value: 'actual' },
    { label: 'Contra', value: 'contra' },
  ]
  
  // Let's create a local persisted state just for this page's filter, 
  // distinct from the Contact Detail's `ledgerShowRecords`.
  const [activeType, setActiveType] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ibfs_global_txn_filter') || ''
    }
    return ''
  })

  useEffect(() => {
    localStorage.setItem('ibfs_global_txn_filter', activeType)
  }, [activeType])

  const { data, isLoading } = useTransactions({
    type:            activeType || undefined,
    contact:         contactFilter ? Number(contactFilter) : undefined,
    account:         accountFilter ? Number(accountFilter) : undefined,
  })

  // Delete hook integration (Bug #9 - Can't delete actual transactions)
  const deleteMutation = useDeleteTransaction()

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this transaction? This will revert the account balance.")) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const txns = data?.results ?? []

  return (
    <div className="pb-6">

      {/* ── Type Filter Chips (Improved UX for Bug #17) ────────────────── */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
        {USER_FRIENDLY_FILTERS.map(f => (
          <button
            key={f.value}
            type="button"
            onClick={() => setActiveType(f.value)}
            className={cn(
              'shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200',
              activeType === f.value
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Active filter context banner ──────────────────────────────── */}
      {(contactFilter || accountFilter) && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary flex items-center justify-center gap-1">
          {contactFilter && <span>Filtered by Contact #{contactFilter}</span>}
          {contactFilter && accountFilter && <span>·</span>}
          {accountFilter && <span>Filtered by Account #{accountFilter}</span>}
        </div>
      )}

      {/* ── List ──────────────────────────────────────────────────────── */}
      <div className="px-4 space-y-1">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl w-full mb-2" />
          ))
        ) : txns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <span className="text-muted-foreground text-xl">📄</span>
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              No transactions found
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              Try changing your filters or checking a different account.
            </p>
          </div>
        ) : (
          txns.map(txn => (
            <TransactionCard 
              key={txn.id} 
              txn={txn} 
              showContact={!contactFilter} // Only show contact pill if we aren't already filtering by it
              onDelete={handleDelete}      // Allows deleting the transaction (Bug #9)
            />
          ))
        )}
      </div>
    </div>
  )
}
