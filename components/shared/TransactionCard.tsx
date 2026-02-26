// components/shared/TransactionCard.tsx
'use client'

import { FinancialTransaction } from '@/models/transaction'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Trash2, Edit, FileText, ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react'
import { cn, fmtAmount } from '@/lib/utils'

interface TransactionCardProps {
  txn:          FinancialTransaction
  showContact?: boolean
  // Optional running CF — only passed in contact ledger view
  // Sign convention: positive = Red (we owe them), negative = Green (they owe us)
  runningCf?:   number
  onDelete?:    (id: number) => void
  onEdit?:      (id: number) => void
}

function getTxnLabel(txn: FinancialTransaction): string {
  if (txn.type === 'contra')  return 'Transfer'
  if (txn.is_doc_deleted)     return 'Orphaned'
  if (txn.document) {
    // Use display name from backend if available, else derive from type string
    const t = txn.document_type ?? ''
    if (t) return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    return 'Document'
  }
  if (txn.type === 'record')  return 'Pending'
  return Number(txn.amount) >= 0 ? 'Received' : 'Sent'
}

export function TransactionCard({
  txn,
  showContact = false,
  runningCf,
  onDelete,
  onEdit,
}: TransactionCardProps) {
  const amount     = Number(txn.amount)
  const isPositive = amount > 0
  const isPending  = txn.type === 'record'
  const isContra   = txn.type === 'contra'
  const label      = getTxnLabel(txn)

  const formattedDate = new Date(txn.date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  // Icon selection
  const Icon = isContra
    ? RefreshCw
    : isPositive
      ? ArrowDownLeft
      : ArrowUpRight

  // Amount color — contra is neutral, pending is muted
  const amountColor = isPending || isContra
    ? 'text-muted-foreground'
    : isPositive
      ? 'text-emerald-600'
      : 'text-red-500'

  // Icon bg
  const iconBg = isPending || isContra
    ? 'bg-muted text-muted-foreground'
    : isPositive
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'

  return (
    <Card className={cn(
      'p-3 mb-2 rounded-xl border bg-card hover:bg-muted/50 transition-colors shadow-sm',
      txn.is_doc_deleted && 'opacity-50',
    )}>
      {/* Top row — icon + label + amount */}
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-full shrink-0', iconBg)}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm">{label}</span>

              {isPending && (
                <Badge variant="outline" className="text-[10px] h-4 border-amber-400 text-amber-600">
                  Pending
                </Badge>
              )}
              {txn.type === 'actual' && !txn.is_doc_deleted && !isPending && (
                <Badge variant="secondary" className="text-[10px] h-4">
                  Settled
                </Badge>
              )}
              {txn.is_doc_deleted && (
                <Badge variant="destructive" className="text-[10px] h-4">Orphaned</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">{formattedDate}</p>
          </div>
        </div>

        {/* Amount + optional running CF */}
        <div className="text-right shrink-0">
          <span className={cn('font-bold text-sm tabular-nums', amountColor)}>
            {!isPending && !isContra && (isPositive ? '+' : '')}
            {fmtAmount(amount)}
          </span>
          {/* Running CF — only in ledger context */}
          {runningCf !== undefined && (
            <p className={cn(
              'text-[11px] font-medium tabular-nums mt-0.5',
              runningCf > 0  ? 'text-red-500'
              : runningCf < 0 ? 'text-emerald-600'
              : 'text-muted-foreground',
            )}>
              {fmtAmount(runningCf)}
            </p>
          )}
        </div>
      </div>

      {/* Meta row — contact, account, document ref */}
      {(showContact || txn.document || txn.payment_account) && (
        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
          {showContact && txn.contact && (
            <span className="bg-muted px-2 py-0.5 rounded-md truncate max-w-30">
              {txn.contact_name ?? `Contact #${txn.contact}`}
            </span>
          )}
          {txn.payment_account && (
            <span className="bg-muted px-2 py-0.5 rounded-md truncate max-w-30">
              {txn.payment_account_name ?? `Account #${txn.payment_account}`}
            </span>
          )}
          {txn.document && (
            <span className="flex items-center gap-1 bg-primary/5 text-primary px-2 py-0.5 rounded-md font-medium truncate max-w-35">
              <FileText className="h-3 w-3 shrink-0" />
              {txn.document_type
                ? `${txn.document_type.toUpperCase()} #${txn.document}`
                : `Doc #${txn.document}`}
            </span>
          )}
        </div>
      )}

      {txn.notes && (
        <p className="text-xs italic text-muted-foreground mt-2">"{txn.notes}"</p>
      )}

      {(onEdit || onDelete) && (
        <div className="flex justify-end gap-2 mt-2">
          {onEdit && (
            <Button
              variant="ghost" size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onEdit(txn.id)}
            >
              <Edit className="h-3 w-3 mr-1" /> Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost" size="sm"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(txn.id)}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
