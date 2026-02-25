// components/transactions/TransactionsPage.tsx
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useTransactions } from '@/hooks/useTransaction'
import { useAccounts } from '@/hooks/useAccount'
import { fmtAmount, fmtDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const TYPE_FILTERS = [
  { label: 'All',     value: '' },
  { label: 'Record',  value: 'record' },
  { label: 'Actual',  value: 'actual' },
  { label: 'Contra',  value: 'contra' },
]

export function TransactionsPage() {
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  useEffect(() => setPageTitle('Transactions'), [setPageTitle])

  const searchParams = useSearchParams()
  const contactFilter = searchParams.get('contact')
  const accountFilter = searchParams.get('account')
  const [activeType, setActiveType] = useState('')

  const { data, isLoading } = useTransactions({
    type: activeType || undefined,
    contact: contactFilter ? Number(contactFilter) : undefined,
    account: accountFilter ? Number(accountFilter) : undefined,
  })

  const { data: accountsData } = useAccounts()
  const accountMap = Object.fromEntries(
    (accountsData?.results ?? []).map(a => [a.id, a.name])
  )

  const txns = data?.results ?? []

  return (
    <div className="pb-6">

      {/* Type Filter Chips */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
        {TYPE_FILTERS.map(f => (
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
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))
        ) : txns.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-12">No transactions found</p>
        ) : (
          txns.map(txn => (
            <Card key={txn.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge
                      variant={txn.type === 'actual' ? 'default' : 'secondary'}
                      className="text-[10px] h-4 capitalize"
                    >
                      {txn.type}
                    </Badge>
                    {txn.payment_account && (
                      <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {accountMap[txn.payment_account] ?? `Acc #${txn.payment_account}`}
                      </span>
                    )}
                    {txn.document && (
                      <span className="text-xs text-primary">Doc #{txn.document}</span>
                    )}
                    {txn.is_doc_deleted && (
                      <Badge variant="destructive" className="text-[10px] h-4">orphan</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{fmtDate(txn.date)}</p>
                  {txn.notes && (
                    <p className="text-xs text-muted-foreground truncate">{txn.notes}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold text-sm ${Number(txn.amount) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {Number(txn.amount) >= 0 ? '+' : ''}{fmtAmount(txn.amount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    CF: {fmtAmount(txn.monthly_cumulative_delta)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
