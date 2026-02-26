// components/shared/StockTransactionCard.tsx
'use client'

import { StockTransaction } from '@/models/stock-transaction'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Trash2, PackagePlus, PackageMinus, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StockTransactionCardProps {
  txn: StockTransaction
  showProduct?: boolean // True on Document pages, False on Product pages
  onDelete?: (id: number) => void
}

export function StockTransactionCard({ txn, showProduct = false, onDelete }: StockTransactionCardProps) {
  const isPositive = Number(txn.quantity) > 0
  const isReceived = isPositive

  // Native date formatting (no date-fns required)
  const formattedDate = new Date(txn.date).toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric'
  })

  return (
    <Card className="p-3 mb-2 rounded-xl border bg-card hover:bg-muted/50 transition-colors shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-full shrink-0",
            isReceived ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
          )}>
            {isReceived ? <PackagePlus className="h-4 w-4" /> : <PackageMinus className="h-4 w-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {isReceived ? 'Stock In' : 'Stock Out'}
              </span>
              <Badge variant={txn.type === 'record' ? 'outline' : 'default'} className={cn(
                "text-[10px] h-4",
                txn.type === 'actual' && "bg-blue-600 hover:bg-blue-700"
              )}>
                {txn.type === 'record' ? 'Pending' : 'Moved'}
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
            isReceived ? "text-blue-600" : "text-orange-600"
          )}>
            {isReceived ? '+' : ''}{Number(txn.quantity).toString()}
          </span>
        </div>
      </div>

      {(showProduct || txn.document) && (
        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
          {showProduct && txn.product && (
            <span className="bg-muted px-2 py-0.5 rounded-md truncate max-w-[150px]">
              {txn.product_name || `Product #${txn.product}`}
            </span>
          )}
          {txn.document && (
            <span className="flex items-center gap-1 bg-primary/5 text-primary px-2 py-0.5 rounded-md font-medium truncate max-w-[150px]">
              <FileText className="h-3 w-3 shrink-0" />
              {txn.document_type ? `${txn.document_type.toUpperCase()} ` : ''}
              {txn.document_doc_id || `#${txn.document}`}
            </span>
          )}
          {txn.contact_name && (
            <span className="bg-muted px-2 py-0.5 rounded-md truncate max-w-[120px]">
              {txn.contact_name}
            </span>
          )}
        </div>
      )}

      {txn.notes && (
        <p className="text-xs italic text-muted-foreground mt-2">"{txn.notes}"</p>
      )}

      {onDelete && (
        <div className="flex justify-end gap-2 mt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" 
            onClick={() => onDelete(txn.id)}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        </div>
      )}
    </Card>
  )
}
