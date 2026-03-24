'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fmtAmount, cn } from '@/lib/utils'
import { DOC_TYPE_LABELS } from '@/models/document'
import { FinancialTransaction } from '@/models/transaction'
import { ExternalLink, ChevronLeft, ChevronRight, X } from 'lucide-react'

const DOC_LABELS = DOC_TYPE_LABELS as Record<string, string>
const getDocLabel = (t: string | null | undefined): string => t ? (DOC_LABELS[t] ?? t) : ''

const PAGE_SIZE = 15

function fmtShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const [, mm, dd] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(dd)} ${months[parseInt(mm) - 1]}`
}

// ─── Exported MCD engine helper ───────────────────────────────────────────────
// Mirrors backend compute_opening_balance_for_print exactly.
// Use in ContactDetailPage for printQueryParams too.

export function computeOpeningBalanceAt(
  allTxns:               FinancialTransaction[],
  contactOpeningBalance: number,
  dateFrom:              string,   // 'YYYY-MM-DD'
): number {
  const [yr, mo] = dateFrom.split('-').map(Number)
  const moStr     = String(mo).padStart(2, '0')
  const monthStart = `${yr}-${moStr}-01`

  // Step 1: cross-month — last MCD per month strictly before dateFrom's month
  const beforeMonth = allTxns
    .filter(t => t.date < monthStart)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const monthLastMcd: Record<string, number> = {}
  for (const txn of beforeMonth) {
    const d   = new Date(txn.date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    monthLastMcd[key] = Number((txn as any).monthly_cumulative_delta ?? 0)
  }
  const crossMonthBase =
    contactOpeningBalance +
    Object.values(monthLastMcd).reduce((a, b) => a + b, 0)

  // Step 2: intra-month — CF-affecting txns in same month but strictly before dateFrom
  const sameMonthBefore = allTxns.filter(
    t => t.date >= monthStart && t.date < dateFrom
  )
  const intraMonthSum = sameMonthBefore.reduce((sum, txn) => {
    const isExpense = txn.document_type === 'expense'
    const isContra  = txn.type === 'contra'
    if (isExpense || isContra) return sum
    return sum + Number(txn.amount)
  }, 0)

  return crossMonthBase + intraMonthSum
}


// ─── Component ────────────────────────────────────────────────────────────────

interface ContactLedgerProps {
  transactions:   FinancialTransaction[]
  openingBalance: number                 // contact.opening_balance (raw)
  onEditTxn?:     (txn: FinancialTransaction) => void
}

export function ContactLedger({ transactions, openingBalance, onEditTxn }: ContactLedgerProps) {
  const router = useRouter()

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [page,     setPage]     = useState(1)

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [dateFrom, dateTo])

  // ── MCD-based opening balance for current window ──────────────────────────
  // If dateFrom set: CF just before dateFrom's month (IBFS Part 11)
  // If no dateFrom: contact.opening_balance as-is
  const computedOpeningBalance = useMemo(() => {
    if (!dateFrom) return openingBalance
    return computeOpeningBalanceAt(transactions, openingBalance, dateFrom)
  }, [transactions, openingBalance, dateFrom])

  // ── Filter by date range ──────────────────────────────────────────────────
  const filteredTxns = useMemo(() =>
    [...transactions]
      .filter(t => {
        if (dateFrom && t.date < dateFrom) return false
        if (dateTo   && t.date > dateTo)   return false
        return true
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [transactions, dateFrom, dateTo],
  )

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredTxns.length / PAGE_SIZE))
  const hasPrev    = page > 1
  const hasNext    = page < totalPages
  const pageTxns   = filteredTxns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Opening balance for current page ─────────────────────────────────────
  // = computedOpeningBalance + sum of CF-affecting txns on all pages before this page
  const pageOpeningBalance = useMemo(() => {
    let running = computedOpeningBalance
    const beforePage = filteredTxns.slice(0, (page - 1) * PAGE_SIZE)
    for (const txn of beforePage) {
      const isExpense = txn.document_type === 'expense'
      const isContra  = txn.type === 'contra'
      if (!isExpense && !isContra) running += Number(txn.amount)
    }
    return running
  }, [computedOpeningBalance, filteredTxns, page])

  // ── Build ledger rows for current page ────────────────────────────────────
  const ledgerRows = useMemo(() => {
    let running = pageOpeningBalance
    return pageTxns.map(txn => {
      const isExpense = txn.document_type === 'expense'
      const isContra  = txn.type === 'contra'
      const affectsCF = !isExpense && !isContra
      const amt = Number(txn.amount)
      if (affectsCF) running += amt
      return { ...txn, numericAmount: amt, runningBalance: running, affectsCF }
    })
  }, [pageTxns, pageOpeningBalance])

  // Show opening balance row only on page 1
  const showOpeningRow = page === 1 && (computedOpeningBalance !== 0 || !!dateFrom)

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

  const dateRangeInvalid = !!(dateFrom && dateTo && dateFrom > dateTo)

  return (
    <div className="space-y-2">

      {/* ── Date filter bar ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="flex-1 h-8 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-0"
            placeholder="From"
          />
          <span className="text-xs text-muted-foreground shrink-0">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="flex-1 h-8 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-0"
            placeholder="To"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo('') }}
            className="flex items-center gap-1 h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors shrink-0"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {dateRangeInvalid && (
        <p className="text-[11px] text-destructive font-semibold ml-1">
          ⚠️ "From" date is after "To" date
        </p>
      )}

      {/* ── Ledger table ─────────────────────────────────────────────────── */}
      <Card className="rounded-xl shadow-sm border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-135">

            {/* Header */}
            <div className="grid grid-cols-[70px_1fr_90px_90px_110px] gap-x-3 px-3 py-2.5 bg-muted/60 border-b text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              <div>Date</div>
              <div>Particulars</div>
              <div className="text-right">Debit (Dr)</div>
              <div className="text-right">Credit (Cr)</div>
              <div className="text-right">Balance</div>
            </div>

            <CardContent className="p-0 divide-y divide-border/50">

              {/* Opening Balance row — page 1 only, MCD-computed */}
              {showOpeningRow && (
                <div className="grid grid-cols-[70px_1fr_90px_90px_110px] gap-x-3 px-3 py-3 text-xs items-center bg-primary/5">
                  <div className="text-muted-foreground font-medium text-[11px]">
                    {dateFrom ? fmtShortDate(dateFrom) : '—'}
                  </div>
                  <div>
                    <span className="font-bold text-primary/80 text-[11px]">Opening Balance</span>
                  </div>
                  <div className="text-right font-bold text-red-600/80 tabular-nums">
                    {computedOpeningBalance > 0 ? fmtAmount(computedOpeningBalance) : ''}
                  </div>
                  <div className="text-right font-bold text-emerald-600/80 tabular-nums">
                    {computedOpeningBalance < 0 ? fmtAmount(Math.abs(computedOpeningBalance)) : ''}
                  </div>
                  <div className={cn(
                    'text-right font-black text-[11px] tabular-nums',
                    computedOpeningBalance > 0 ? 'text-red-600'
                    : computedOpeningBalance < 0 ? 'text-emerald-600'
                    : 'text-muted-foreground',
                  )}>
                    {fmtAmount(Math.abs(computedOpeningBalance))}
                    {computedOpeningBalance !== 0 && (
                      <span className="text-[9px] font-normal ml-1">
                        {computedOpeningBalance > 0 ? 'Dr' : 'Cr'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Empty state for filtered range */}
              {filteredTxns.length === 0 && (
                <div className="px-3 py-8 text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    No transactions in this range
                  </p>
                  {(dateFrom || dateTo) && (
                    <button
                      onClick={() => { setDateFrom(''); setDateTo('') }}
                      className="mt-2 text-xs font-bold text-primary underline underline-offset-2"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
              )}

              {/* Transaction rows */}
              {ledgerRows.map(row => {
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
                      onEditTxn && isActual
                        ? 'cursor-pointer hover:bg-muted/25 active:bg-muted/40'
                        : 'cursor-default',
                    )}
                  >
                    <div className="text-muted-foreground font-semibold text-[11px] tabular-nums">
                      {fmtShortDate(row.date)}
                    </div>

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
                            onClick={e => {
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
                        <p className="text-[10px] text-muted-foreground truncate max-w-35">
                          {row.notes}
                        </p>
                      )}
                    </div>

                    {/* Debit */}
                    <div className="text-right font-bold tabular-nums text-red-600/90">
                      {isExpense
                        ? <span className="text-amber-500">{fmtAmount(absAmt)}</span>
                        : isDebit ? fmtAmount(absAmt) : ''}
                    </div>

                    {/* Credit */}
                    <div className="text-right font-bold tabular-nums text-emerald-600/90">
                      {!isDebit && !isExpense ? fmtAmount(absAmt) : ''}
                    </div>

                    {/* Running balance */}
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

            {/* Closing balance */}
            {ledgerRows.length > 0 && (() => {
              const finalBal = ledgerRows[ledgerRows.length - 1].runningBalance
              const absFinal = Math.abs(finalBal)
              const suffix   = finalBal > 0 ? 'Dr' : finalBal < 0 ? 'Cr' : ''
              return (
                <div className="grid grid-cols-[70px_1fr_90px_90px_110px] gap-x-3 px-3 py-3 border-t-2 border-border bg-muted/40 text-xs items-center">
                  <div className="text-muted-foreground font-bold text-[10px] uppercase col-span-4 tracking-wider">
                    Closing Balance
                    {totalPages > 1 && (
                      <span className="ml-2 normal-case font-normal text-muted-foreground/60">
                        (page {page} of {totalPages})
                      </span>
                    )}
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

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="outline" size="sm"
            className="h-8 gap-1.5 rounded-xl text-xs"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={!hasPrev}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </Button>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-bold tabular-nums">{page} / {totalPages}</span>
            <span className="text-[10px] text-muted-foreground">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredTxns.length)} of {filteredTxns.length}
            </span>
          </div>
          <Button
            variant="outline" size="sm"
            className="h-8 gap-1.5 rounded-xl text-xs"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={!hasNext}
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

    </div>
  )
}
