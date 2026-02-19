// components/accounts/AccountStatement.tsx

'use client'

import { useState } from 'react'
import { useAccountStatement } from '@/hooks/usePaymentAccount'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react'

interface Props {
  accountId: number
}

function parseLocalDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${day} ${months[parseInt(month) - 1]} ${year}`
}

export function AccountStatement({ accountId }: Props) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAccountStatement(accountId, { page })

  const transactions = data?.results ?? []
  const hasNext      = !!data?.next
  const hasPrev      = !!data?.previous
  const totalCount   = data?.count ?? 0

  if (isLoading) {
    return (
      <div className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">No transactions yet</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="divide-y">
        {transactions.map((txn) => {
          const amount    = parseFloat(txn.amount)
          const isContra  = txn.transaction_type === 'contra'
          const isIn      = amount > 0

          const Icon = isContra
            ? ArrowLeftRight
            : isIn ? ArrowDownLeft : ArrowUpRight

          const iconColor = isContra
            ? 'bg-muted text-muted-foreground'
            : isIn
              ? 'bg-green-100 text-green-600'
              : 'bg-red-100 text-red-500'

          const label = isContra
            ? 'Transfer'
            : isIn ? 'Money In' : 'Money Out'

          return (
            <div key={txn.id} className="flex items-center gap-3 px-4 py-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{label}</p>
                  {txn.is_document_deleted && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 text-orange-500 border-orange-300">
                      Deleted ref
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {parseLocalDate(txn.transaction_date)}
                  {txn.notes && ` · ${txn.notes}`}
                </p>
              </div>

              <p className={`text-sm font-semibold shrink-0 ${
                isContra
                  ? amount >= 0 ? 'text-green-600' : 'text-red-500'
                  : isIn ? 'text-green-600' : 'text-red-500'
              }`}>
                {amount < 0 ? '−' : '+'}₹{Math.abs(amount).toLocaleString('en-IN')}
              </p>
            </div>
          )
        })}
      </div>

      {(hasNext || hasPrev) && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={!hasPrev}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">{totalCount} transactions</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNext}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
