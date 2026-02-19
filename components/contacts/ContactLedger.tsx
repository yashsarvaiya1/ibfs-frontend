'use client'

import { useEffect } from 'react'
import { useTransactions } from '@/hooks/useTransaction'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { FileText, CreditCard } from 'lucide-react'

interface Props {
  contactId: number
  openingBalance: string
  onBalanceCalculated?: (balance: number) => void
}

function parseLocalDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${day} ${months[parseInt(month) - 1]} ${year}`
}

export function ContactLedger({ contactId, openingBalance, onBalanceCalculated }: Props) {
  const { data, isLoading } = useTransactions({
    contact: contactId,
    page_size: 1000,
  } as any)

  // Only record + payment — no contra in ledger
  const transactions = (data?.results ?? []).filter(
    (t) => t.transaction_type === 'record' || t.transaction_type === 'payment'
  )

  const opening = parseFloat(openingBalance)

  const finalBalance = transactions.reduce(
    (sum, txn) => sum + parseFloat(txn.amount),
    opening
  )

  // ── FIX: useEffect — never call setState of parent during render ──────────
  useEffect(() => {
    if (!isLoading && onBalanceCalculated) {
      onBalanceCalculated(finalBalance)
    }
  }, [finalBalance, isLoading, onBalanceCalculated])

  if (isLoading) {
    return (
      <div className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-3 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    )
  }

  let running = opening

  return (
    <div className="divide-y">
      {/* Opening balance row */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
        <p className="text-sm font-medium">Opening Balance</p>
        <p className={`text-sm font-semibold ${opening >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {opening < 0 ? '−' : '+'}₹{Math.abs(opening).toLocaleString('en-IN')}
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No transactions yet</p>
        </div>
      ) : (
        transactions.map((txn) => {
          const amount = parseFloat(txn.amount)
          running += amount
          const isPayment = txn.transaction_type === 'payment'

          return (
            <div key={txn.id} className="flex items-center gap-3 px-4 py-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                amount >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {isPayment
                  ? <CreditCard className={`h-4 w-4 ${amount >= 0 ? 'text-green-600' : 'text-red-500'}`} />
                  : <FileText className={`h-4 w-4 ${amount >= 0 ? 'text-green-600' : 'text-red-500'}`} />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {isPayment ? 'Payment' : 'Document Entry'}
                  </p>
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

              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold ${amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {amount < 0 ? '−' : '+'}₹{Math.abs(amount).toLocaleString('en-IN')}
                </p>
                <p className={`text-xs font-medium ${running >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  ₹{Math.abs(running).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
