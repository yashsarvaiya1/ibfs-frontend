'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fmtAmount, cn } from '@/lib/utils'
import { DOC_TYPE_LABELS } from '@/models/document'
import { FinancialTransaction } from '@/models/transaction'
import { ExternalLink } from 'lucide-react'

const DOC_LABELS = DOC_TYPE_LABELS as Record<string, string>
const getDocLabel = (t: string | null | undefined): string => t ? (DOC_LABELS[t] ?? t) : ''

function fmtShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const [, mm, dd] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(dd)} ${months[parseInt(mm) - 1]}`
}

interface ContactLedgerProps {
  transactions:   FinancialTransaction[]
  openingBalance: number
  onEditTxn?:     (txn: FinancialTransaction) => void
}

export function ContactLedger({ transactions, openingBalance, onEditTxn }: ContactLedgerProps) {
  const router = useRouter()

  const ledgerRows = useMemo(() => {
    // Backend returns ordered by date, created_at — we sort here as safety net
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    let running = openingBalance
    return sorted.map(txn => {
      // Expense and contra txns don't affect CF (MCD=0 / no contact effect)
      const affectsCF = txn.document_type !== 'expense' && txn.type !== 'contra'
      const amt = Number(txn.amount)
      if (affectsCF) running += amt
      return { ...txn, numericAmount: amt, runningBalance: running, affectsCF }
    })
  }, [transactions, openingBalance])

  const isEmpty = transactions.length === 0 && openingBalance === 0

  if (isEmpty) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
        <p className="text-sm font-medium text-muted-foreground">No ledger entries yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Send / Receive or create a document to get started
        </p>
      </div>
    )
  }

  return (
    <Card className="rounded-xl shadow-sm border-border/60 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[540px]">

          {/* ── Table Header ─────────────────────────────────────────── */}
          <div className="grid grid-cols-[70px_1fr_90px_90px_110px] gap-x-3 px-3 py-2.5 bg-muted/60 border-b text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            <div>Date</div>
            <div>Particulars</div>
            <div className="text-right">Debit (Dr)</div>
            <div className="text-right">Credit (Cr)</div>
            <div className="text-right">Balance</div>
          </div>

          <CardContent className="p-0 divide-y divide-border/50">

            {/* ── Opening Balance Row ───────────────────────────────── */}
            {openingBalance !== 0 && (
              <div className="grid grid-cols-[70px_1fr_90px_90px_110px] gap-x-3 px-3 py-3 text-xs items-center bg-primary/5">
                <div className="text-muted-foreground font-medium text-[11px]">—</div>
                <div>
                  <span className="font-bold text-primary/80 text-[11px]">Opening Balance</span>
                </div>
                {/* + opening = we owe them = Dr, − = they owe us = Cr */}
                <div className="text-right font-bold text-red-600/80 tabular-nums">
                  {openingBalance > 0 ? fmtAmount(openingBalance) : ''}
                </div>
                <div className="text-right font-bold text-emerald-600/80 tabular-nums">
                  {openingBalance < 0 ? fmtAmount(Math.abs(openingBalance)) : ''}
                </div>
                <div className={cn(
                  'text-right font-black text-[11px] tabular-nums',
                  openingBalance > 0 ? 'text-red-600' : 'text-emerald-600',
                )}>
                  {fmtAmount(Math.abs(openingBalance))}
                  <span className="text-[9px] font-normal ml-1">
                    {openingBalance > 0 ? 'Dr' : 'Cr'}
                  </span>
                </div>
              </div>
            )}

            {/* ── Transaction Rows ──────────────────────────────────── */}
            {ledgerRows.map((row) => {
              const isDebit   = row.numericAmount >= 0
              const absAmt    = Math.abs(row.numericAmount)
              const absBal    = Math.abs(row.runningBalance)
              const balSuffix = row.runningBalance > 0 ? 'Dr'
                : row.runningBalance < 0 ? 'Cr' : ''
              const isActual  = row.type === 'actual'
              const isExpense = row.document_type === 'expense'

              return (
                <div
                  key={row.id}
                  onClick={() => onEditTxn?.(row)}
                  className={cn(
                    'grid grid-cols-[70px_1fr_90px_90px_110px] gap-x-3 px-3 py-3 text-xs items-center transition-colors',
                    isExpense ? 'bg-muted/20 opacity-60' : '',
                    onEditTxn && isActual ? 'cursor-pointer hover:bg-muted/25 active:bg-muted/40' : 'cursor-default',
                  )}
                >
                  {/* Date */}
                  <div className="text-muted-foreground font-semibold text-[11px] tabular-nums">
                    {fmtShortDate(row.date)}
                  </div>

                  {/* Particulars */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant={row.type === 'actual' ? 'default' : 'secondary'}
                        className="text-[9px] h-4 px-1.5 rounded-sm uppercase tracking-wider font-bold"
                      >
                        {row.type}
                      </Badge>
                      {isExpense && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 rounded-sm text-amber-600 border-amber-300">
                          expense
                        </Badge>
                      )}
                      {row.document && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/documents/${row.document}`)
                          }}
                          className="flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md hover:bg-primary/20 transition-colors"
                        >
                          {getDocLabel(row.document_type)} #{row.document}
                          <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                        </button>
                      )}
                      {row.is_document_deleted && (
                        <Badge variant="destructive" className="text-[9px] h-4 px-1 rounded-sm">
                          doc deleted
                        </Badge>
                      )}
                    </div>
                    {row.notes && (
                      <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                        {row.notes}
                      </p>
                    )}
                  </div>

                  {/* Debit — positive amount = Dr (we owe them / money going to them) */}
                  <div className="text-right font-bold tabular-nums text-red-600/90">
                    {isDebit && !isExpense ? fmtAmount(absAmt) : ''}
                    {isExpense ? <span className="text-amber-500">{fmtAmount(absAmt)}</span> : ''}
                  </div>

                  {/* Credit — negative amount = Cr (they owe us / money coming in) */}
                  <div className="text-right font-bold tabular-nums text-emerald-600/90">
                    {!isDebit && !isExpense ? fmtAmount(absAmt) : ''}
                  </div>

                  {/* Running balance — only updates for CF-affecting txns */}
                  <div className={cn(
                    'text-right font-black tabular-nums text-[11px]',
                    row.runningBalance > 0 ? 'text-red-600'
                    : row.runningBalance < 0 ? 'text-emerald-600'
                    : 'text-muted-foreground',
                  )}>
                    {fmtAmount(absBal)}
                    {balSuffix && (
                      <span className="text-[9px] font-normal ml-1">{balSuffix}</span>
                    )}
                  </div>
                </div>
              )
            })}

          </CardContent>

          {/* ── Footer — Closing Balance ──────────────────────────────── */}
          {ledgerRows.length > 0 && (() => {
            const finalBal = ledgerRows[ledgerRows.length - 1].runningBalance
            const absFinal = Math.abs(finalBal)
            const suffix   = finalBal > 0 ? 'Dr' : finalBal < 0 ? 'Cr' : ''
            return (
              <div className="grid grid-cols-[70px_1fr_90px_90px_110px] gap-x-3 px-3 py-3 border-t-2 border-border bg-muted/40 text-xs items-center">
                <div className="text-muted-foreground font-bold text-[10px] uppercase col-span-4 tracking-wider">
                  Closing Balance
                </div>
                <div className={cn(
                  'text-right font-black text-sm tabular-nums',
                  finalBal > 0 ? 'text-red-600'
                  : finalBal < 0 ? 'text-emerald-600'
                  : 'text-muted-foreground',
                )}>
                  {fmtAmount(absFinal)}
                  {suffix && <span className="text-[9px] font-normal ml-1">{suffix}</span>}
                </div>
              </div>
            )
          })()}

        </div>
      </div>
    </Card>
  )
}
