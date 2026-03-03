'use client'

import type { StockTransaction } from '@/models/stock-transaction'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Trash2, Edit, PackagePlus, PackageMinus, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StockTransactionCardProps {
  txn:          StockTransaction
  productName?: string
  documentRef?: string
  contactName?: string
  onDelete?:    (id: number) => void
  onEdit?:      (id: number) => void   // ← ADD THIS
}

export function StockTransactionCard({
  txn,
  productName,
  documentRef,
  contactName,
  onDelete,
  onEdit,
}: StockTransactionCardProps) {
  const isPositive = Number(txn.quantity) > 0
  const canAct     = txn.type === 'actual'

  const formattedDate = new Date(txn.date).toLocaleDateString('en-IN', {
    month: 'short', day: '2-digit', year: 'numeric',
  })

  return (
    <Card className="p-3 mb-2 rounded-xl border bg-card hover:bg-muted/50 transition-colors shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            'p-1.5 rounded-full shrink-0',
            isPositive ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
          )}>
            {isPositive
              ? <PackagePlus  className="h-4 w-4" />
              : <PackageMinus className="h-4 w-4" />
            }
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">
                {isPositive ? 'Stock In' : 'Stock Out'}
              </span>
              <Badge
                variant={txn.type === 'record' ? 'outline' : 'default'}
                className={cn(
                  'text-[10px] h-4',
                  txn.type === 'actual' && 'bg-blue-600 hover:bg-blue-700'
                )}
              >
                {txn.type === 'record' ? 'Pending' : 'Moved'}
              </Badge>
              {txn.is_document_deleted && (
                <Badge variant="destructive" className="text-[10px] h-4">
                  Doc Deleted
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">{formattedDate}</p>
          </div>
        </div>

        <div className="text-right">
          <span className={cn(
            'font-bold text-sm',
            isPositive ? 'text-blue-600' : 'text-orange-600'
          )}>
            {isPositive ? '+' : ''}{Number(txn.quantity).toString()}
          </span>
          {txn.rate && (
            <p className="text-[11px] text-muted-foreground">@ {txn.rate}</p>
          )}
        </div>
      </div>

      {(productName || txn.document || contactName) && (
        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
          {productName && (
            <span className="bg-muted px-2 py-0.5 rounded-md truncate max-w-[150px]">
              {productName}
            </span>
          )}
          {txn.document && (
            <span className="flex items-center gap-1 bg-primary/5 text-primary px-2 py-0.5 rounded-md font-medium truncate max-w-[150px]">
              <FileText className="h-3 w-3 shrink-0" />
              {documentRef ?? `#${txn.document}`}
            </span>
          )}
          {contactName && (
            <span className="bg-muted px-2 py-0.5 rounded-md truncate max-w-[120px]">
              {contactName}
            </span>
          )}
        </div>
      )}

      {txn.notes && (
        <p className="text-xs italic text-muted-foreground mt-2">"{txn.notes}"</p>
      )}

      {/* Actions — only for actual type */}
      {canAct && (onEdit || onDelete) && (
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
