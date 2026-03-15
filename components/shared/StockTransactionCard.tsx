'use client'

import type { StockTransaction } from '@/models/stock-transaction'
import { Badge }  from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card }   from '@/components/ui/card'
import { Trash2, Edit, PackagePlus, PackageMinus, FileText, ExternalLink } from 'lucide-react'
import { cn, fmtDate } from '@/lib/utils'
import { DOC_TYPE_LABELS } from '@/models/document'
import { useRouter } from 'next/navigation'

const DOC_LABELS = DOC_TYPE_LABELS as Record<string, string>

interface StockTransactionCardProps {
  txn:       StockTransaction
  onDelete?: (id: number) => void
  onEdit?:   (txn: StockTransaction) => void
}

export function StockTransactionCard({ txn, onDelete, onEdit }: StockTransactionCardProps) {
  const router     = useRouter()
  const qty        = Number(txn.quantity)
  const isPositive = qty > 0
  const isActual   = txn.type === 'actual'
  const isRecord   = txn.type === 'record'

  const Icon   = isPositive ? PackagePlus : PackageMinus
  const iconBg = isPositive
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  const qtyColor = isPositive ? 'text-blue-600' : 'text-orange-600'

  const docLabel = txn.doc_type
    ? (DOC_LABELS[txn.doc_type] ?? txn.doc_type.toUpperCase())
    : null

  const handleViewDoc = () => {
    if (txn.document) router.push(`/documents/${txn.document}`)
  }

  return (
    <Card className="px-3 py-2.5 rounded-xl border bg-card shadow-sm">

      {/* ── Row 1: icon + info + quantity ──────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className={cn('p-1.5 rounded-full shrink-0', iconBg)}>
          <Icon className="h-3.5 w-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm">{txn.product_name ?? 'Product'}</span>
            <Badge
              variant={isRecord ? 'outline' : 'secondary'}
              className={cn(
                'text-[9px] h-3.5 px-1',
                isActual && 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
                isRecord && 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50',
              )}
            >
              {isRecord ? 'Pending' : 'Moved'}
            </Badge>
            {txn.is_document_deleted && (
              <Badge variant="destructive" className="text-[9px] h-3.5 px-1">Deleted</Badge>
            )}
          </div>

          {/* Meta inline */}
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <span className="text-[11px] text-muted-foreground">{fmtDate(txn.date)}</span>

            {txn.doc_id && (
              <>
                <span className="text-[11px] text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={txn.document ? handleViewDoc : undefined}
                  className={cn(
                    'flex items-center gap-0.5 text-[11px] font-medium',
                    txn.document
                      ? 'text-primary hover:underline cursor-pointer'
                      : 'text-muted-foreground cursor-default',
                  )}
                >
                  <FileText className="h-2.5 w-2.5 shrink-0" />
                  {docLabel ? `${docLabel} · ${txn.doc_id}` : txn.doc_id}
                </button>
              </>
            )}

            {txn.contact_name && (
              <>
                <span className="text-[11px] text-muted-foreground">·</span>
                <span className="text-[11px] text-muted-foreground truncate max-w-25">
                  {txn.contact_name}
                </span>
              </>
            )}

            {txn.rate && (
              <>
                <span className="text-[11px] text-muted-foreground">·</span>
                <span className="text-[11px] text-muted-foreground">@ ₹{txn.rate}</span>
              </>
            )}
          </div>
        </div>

        {/* Quantity */}
        <span className={cn('font-bold text-sm tabular-nums shrink-0', qtyColor)}>
          {isPositive ? '+' : ''}{qty.toString()}
        </span>
      </div>

      {/* Notes */}
      {txn.notes && (
        <p className="text-[11px] italic text-muted-foreground mt-1.5 pl-7 truncate">
          {txn.notes}
        </p>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-1 mt-1.5">

        {/* Record type → show View Doc button (navigates to linked document) */}
        {isRecord && txn.document && (
          <Button
            variant="ghost" size="sm"
            className="h-6 px-2 text-[11px] text-primary hover:text-primary hover:bg-primary/10"
            onClick={handleViewDoc}
          >
            <ExternalLink className="h-3 w-3 mr-1" /> View Doc
          </Button>
        )}

        {/* Actual type → Edit + Delete */}
        {isActual && onEdit && (
          <Button
            variant="ghost" size="sm"
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(txn)}
          >
            <Edit className="h-3 w-3 mr-1" /> Edit
          </Button>
        )}
        {isActual && onDelete && (
          <Button
            variant="ghost" size="sm"
            className="h-6 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(txn.id)}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        )}

      </div>
    </Card>
  )
}
