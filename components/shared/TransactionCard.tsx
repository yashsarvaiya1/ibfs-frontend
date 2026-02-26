// components/shared/TransactionCard.tsx
'use client'

import { FinancialTransaction } from '@/models/transaction'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Trash2, Edit, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { cn, fmtAmount } from '@/lib/utils'

interface TransactionCardProps {
  txn: FinancialTransaction
  showContact?: boolean // True on global list, false on Contact Detail
  onDelete?: (id: number) => void
  onEdit?: (id: number) => void
}

export function TransactionCard({ txn, showContact = false, onDelete, onEdit }: TransactionCardProps) {
  const isPositive = Number(txn.amount) > 0
  
  // Positive amount = Received, Negative amount = Sent
  const isReceived = isPositive

  // Native date formatting (replaces date-fns)
  const formattedDate = new Date(txn.date).toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric'
  })

  return (
    <Card className="p-3 mb-2 rounded-xl border bg-card hover:bg-muted/50 transition-colors shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-full shrink-0",
            isReceived ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          )}>
            {isReceived ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {isReceived ? 'Received' : 'Sent'}
              </span>
              <Badge variant={txn.type === 'record' ? 'outline' : 'secondary'} className="text-[10px] h-4">
                {txn.type === 'record' ? 'Expected' : 'Settled'}
              </Badge>
              {txn.is_doc_deleted && (
                <Badge variant="destructive" className="text-[10px] h-4">Orphaned</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {formattedDate}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className={cn(
            "font-bold text-sm",
            isReceived ? "text-emerald-600" : "text-red-600"
          )}>
            {isReceived ? '+' : ''}{fmtAmount(txn.amount)}
          </span>
        </div>
      </div>

      {(showContact || txn.document || txn.payment_account) && (
        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
          {showContact && txn.contact && (
            <span className="bg-muted px-2 py-0.5 rounded-md truncate max-w-[120px]">
              {txn.contact_name || `Contact #${txn.contact}`}
            </span>
          )}
          {txn.payment_account && (
            <span className="bg-muted px-2 py-0.5 rounded-md truncate max-w-[120px]">
              {txn.payment_account_name || `Account #${txn.payment_account}`}
            </span>
          )}
          {txn.document && (
            <span className="flex items-center gap-1 bg-primary/5 text-primary px-2 py-0.5 rounded-md font-medium truncate max-w-[120px]">
              <FileText className="h-3 w-3 shrink-0" />
              {txn.document_type ? `${txn.document_type.toUpperCase()} #${txn.document}` : `Doc #${txn.document}`}
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
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onEdit(txn.id)}>
              <Edit className="h-3 w-3 mr-1" /> Edit
            </Button>
          )}
          {onDelete && (
            <Button 
              variant="ghost" 
              size="sm" 
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
