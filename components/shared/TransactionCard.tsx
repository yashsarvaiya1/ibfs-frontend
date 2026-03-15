'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { fmtAmount, fmtDate, cn } from '@/lib/utils'
import { DOC_TYPE_LABELS } from '@/models/document'
import { FinancialTransaction } from '@/models/transaction'
import { MoreVertical, Pencil, Trash2, ExternalLink } from 'lucide-react'

const DOC_LABELS = DOC_TYPE_LABELS as Record<string, string>
const getDocLabel = (t: string | null | undefined): string =>
  t ? (DOC_LABELS[t] ?? t) : ''

export interface TransactionCardProps {
  txn:          FinancialTransaction
  runningCf?:   number                           // optional running balance (Dr/Cr)
  accountName?: string                           // resolved payment account name
  contactName?: string                           // explicit contact name string
  showContact?: boolean                          // auto-show txn.contact_name if available
  onEdit?:      () => void                       // caller closes over txn — NO id arg
  onDelete?:    (id: number) => void | Promise<void>
  className?:   string
}

export function TransactionCard({
  txn,
  runningCf,
  accountName,
  contactName,
  showContact = false,
  onEdit,
  onDelete,
  className,
}: TransactionCardProps) {
  const router  = useRouter()
  const amount  = Number(txn.amount)
  const isIncoming = amount < 0   // negative = they owe us / incoming
  const canEdit = txn.type === 'actual'
  const hasMenu = !!(onEdit || onDelete)

  // Resolve contact display: explicit prop wins, then txn.contact_name if showContact
  const resolvedContact =
    contactName ??
    (showContact && 'contact_name' in txn && txn.contact_name
      ? (txn as FinancialTransaction & { contact_name?: string }).contact_name
      : undefined)

  const typeBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
    actual:  'default',
    record:  'secondary',
    contra:  'outline',
  }

  return (
    <Card
      className={cn(
        'rounded-xl border-border/60 shadow-sm transition-all',
        className,
      )}
    >
      <CardContent className="p-3.5">
        <div className="flex items-start gap-2">

          {/* ── Left: meta ───────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Row 1: type badge · doc link · doc-deleted badge · contact */}
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <Badge
                variant={typeBadgeVariant[txn.type] ?? 'outline'}
                className="text-[9px] uppercase font-bold tracking-wider rounded-md h-4 px-1.5 shrink-0"
              >
                {txn.type}
              </Badge>

              {txn.document && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    router.push(`/documents/${txn.document}`)
                  }}
                  className="flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md hover:bg-primary/20 transition-colors"
                >
                  {getDocLabel(txn.document_type)} #{txn.document}
                  <ExternalLink className="h-2.5 w-2.5 ml-0.5 shrink-0" />
                </button>
              )}

              {txn.is_document_deleted && (
                <Badge variant="destructive" className="text-[9px] h-4 rounded-md px-1.5 shrink-0">
                  doc deleted
                </Badge>
              )}

              {resolvedContact && (
                <span className="text-[10px] font-semibold text-muted-foreground truncate">
                  {resolvedContact}
                </span>
              )}
            </div>

            {/* Row 2: date · account */}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <span>{fmtDate(txn.date)}</span>
              {accountName && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="truncate">{accountName}</span>
                </>
              )}
            </div>

            {/* Row 3: notes */}
            {txn.notes && (
              <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate italic">
                {txn.notes}
              </p>
            )}
          </div>

          {/* ── Right: amount · running CF · menu ────────────────────── */}
          <div className="flex flex-col items-end gap-0.5 shrink-0">

            <div className="flex items-center gap-0.5">
              <p className={cn(
                'text-base font-black tabular-nums',
                isIncoming ? 'text-emerald-600' : 'text-red-600',
              )}>
                {amount >= 0 ? '+' : ''}{fmtAmount(amount)}
              </p>

              {/* 3-dot menu — only shown if at least one action is provided */}
              {hasMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground -mr-1.5"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {onEdit && (
                      <DropdownMenuItem
                        onClick={onEdit}
                        disabled={!canEdit}
                        className={cn(!canEdit && 'opacity-50 cursor-not-allowed')}
                      >
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Edit
                        {!canEdit && (
                          <span className="ml-auto text-[9px] text-muted-foreground capitalize">
                            {txn.type}
                          </span>
                        )}
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(txn.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Running CF balance */}
            {runningCf !== undefined && (
              <p className={cn(
                'text-[10px] font-bold tabular-nums',
                runningCf > 0
                  ? 'text-red-500'
                  : runningCf < 0
                    ? 'text-emerald-500'
                    : 'text-muted-foreground',
              )}>
                {fmtAmount(Math.abs(runningCf))}
                <span className="font-normal text-[9px] ml-0.5">
                  {runningCf > 0 ? 'Dr' : runningCf < 0 ? 'Cr' : ''}
                </span>
              </p>
            )}

          </div>
        </div>
      </CardContent>
    </Card>
  )
}
