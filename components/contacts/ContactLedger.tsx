'use client'
import { LoadingState } from '@/components/shared/common/LoadingState'

import { useState } from 'react'
import Link from 'next/link'
import { useContactLedger } from '@/hooks/useContact'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fmtAmount, fmtDate, cn } from '@/lib/utils'
import type { FinancialTransaction } from '@/models/transaction'

export function ContactLedger({ contactId, openingBalance, onEditTxn, onRangeChange }: {
  contactId: number; openingBalance: number; onEditTxn?: (txn: FinancialTransaction) => void
  onRangeChange?: (range: { from: string; to: string }) => void
}) {
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { data, isLoading, isError, refetch } = useContactLedger(contactId, {
    page, page_size: 25, date_from: dateFrom || undefined, date_to: dateTo || undefined,
  })
  return <div className="space-y-3">
    <div className="flex items-center flex-wrap gap-2">
      <Input aria-label="Ledger from date" className="w-auto flex-1 min-w-0" type="date" value={dateFrom} onChange={e => {setDateFrom(e.target.value);setPage(1);onRangeChange?.({from:e.target.value,to:dateTo})}} />
      <span className="text-muted-foreground">to</span>
      <Input aria-label="Ledger to date" className="w-auto flex-1 min-w-0" type="date" value={dateTo} onChange={e => {setDateTo(e.target.value);setPage(1);onRangeChange?.({from:dateFrom,to:e.target.value})}} />
      {(dateFrom || dateTo) && <Button variant="outline" onClick={() => {setDateFrom('');setDateTo('');setPage(1);onRangeChange?.({from:'',to:''})}}>Clear</Button>}
    </div>
    {dateFrom && dateTo && dateFrom > dateTo && <p className="text-sm text-destructive">From date must be before To date.</p>}
    {isLoading ? <LoadingState label="Loading ledger…" className="py-4" /> : isError ? <div className="py-8 text-center"><p>Ledger could not be loaded.</p><Button variant="outline" onClick={() => refetch()}>Retry</Button></div> : <>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-muted/60 text-xs text-muted-foreground"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Particulars</th><th className="p-3 text-right">Debit</th><th className="p-3 text-right">Credit</th><th className="p-3 text-right">Balance</th></tr></thead>
          <tbody className="divide-y">
            {page === 1 && <tr className="bg-muted/20"><td className="p-3" colSpan={4}>Opening balance</td><td className="p-3 text-right tabular-nums">{fmtAmount(Math.abs(Number(data?.opening_balance_at ?? openingBalance)))}<span className="block text-[10px]">{Number(data?.opening_balance_at ?? openingBalance) > 0 ? 'Payable' : Number(data?.opening_balance_at ?? openingBalance) < 0 ? 'Receivable' : 'Settled'}</span></td></tr>}
            {data?.results.map(txn => {
              const amount = Number(txn.amount)
              const balance = Number(txn.running_cf ?? 0)
              const affectsCf = txn.type !== 'contra' && !['expense', 'income'].includes(txn.document_type ?? '')
              return <tr key={txn.id} className="hover:bg-muted/20">
                <td className="p-3 whitespace-nowrap">{fmtDate(txn.date)}</td>
                <td className="p-3"><div className="flex items-center gap-2 flex-wrap">
                  {txn.document ? <Link className="font-medium text-primary" href={`/documents/${txn.document}`}>{txn.doc_id}</Link> : <span>{txn.type === 'actual' ? amount >= 0 ? 'Receipt' : 'Payment' : 'Entry'}</span>}
                  {txn.type === 'actual' && onEditTxn && <button className="text-xs underline text-muted-foreground" onClick={() => onEditTxn(txn)}>Edit</button>}
                </div><p className="text-xs text-muted-foreground">{txn.payment_account_name}{txn.notes && ` · ${txn.notes}`}{!affectsCf && ' · Does not affect contact balance'}</p></td>
                <td className="p-3 text-right tabular-nums">{affectsCf && amount < 0 ? fmtAmount(-amount) : '—'}</td>
                <td className="p-3 text-right tabular-nums">{affectsCf && amount > 0 ? fmtAmount(amount) : '—'}</td>
                <td className={cn('p-3 text-right tabular-nums whitespace-nowrap',balance > 0 ? 'text-red-600' : balance < 0 ? 'text-emerald-600' : '')}>{fmtAmount(Math.abs(balance))}<span className="block text-[10px]">{balance > 0 ? 'Payable' : balance < 0 ? 'Receivable' : 'Settled'}</span></td>
              </tr>
            })}
            {!data?.results.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No entries in this period.</td></tr>}
          </tbody>
        </table>
      </div>
      {data && data.total_pages > 1 && <div className="flex justify-between items-center text-sm"><Button variant="outline" disabled={!data.previous} onClick={() => setPage(p=>p-1)}>Previous</Button><span>Page {page} of {data.total_pages} · {data.count} entries</span><Button variant="outline" disabled={!data.next} onClick={() => setPage(p=>p+1)}>Next</Button></div>}
    </>}
  </div>
}
