'use client'

import Link from 'next/link'
import { fmtAmount, fmtDate } from '@/lib/utils'
import type { FinancialTransaction } from '@/models/transaction'

export function AccountLedger({ transactions, openingBalance, page, onEdit }: {
  transactions: FinancialTransaction[]; openingBalance?: string; page: number
  onEdit: (transaction: FinancialTransaction) => void
}) {
  const balance = (value: string | undefined) => {
    if (value == null) return '—'
    const amount = Number(value)
    return `${fmtAmount(Math.abs(amount))}${amount > 0 ? ' Dr' : amount < 0 ? ' Cr' : ''}`
  }
  return <div className="overflow-x-auto rounded-xl border bg-card" data-testid="account-ledger">
    <table className="w-full min-w-[600px] text-sm">
      <thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Particulars</th><th className="p-3 text-right">Debit (in)</th><th className="p-3 text-right">Credit (out)</th><th className="p-3 text-right">Balance</th></tr></thead>
      <tbody className="divide-y">
        {page === 1 && <tr className="bg-muted/20"><td colSpan={4} className="p-3">Opening balance</td><td className="p-3 text-right tabular-nums whitespace-nowrap">{balance(openingBalance)}</td></tr>}
        {transactions.map(txn => <tr key={txn.id}>
          <td className="p-3 whitespace-nowrap">{fmtDate(txn.date)}</td>
          <td className="p-3"><div className="flex flex-wrap items-center gap-2">
            {txn.document ? <Link href={`/documents/${txn.document}`} className="font-medium text-primary">{txn.doc_id}</Link> : <span>{txn.type === 'contra' ? 'Self transfer' : Number(txn.amount) >= 0 ? 'Receipt' : 'Payment'}</span>}
            {txn.type === 'actual' && <button onClick={() => onEdit(txn)} className="text-xs text-muted-foreground underline">Edit</button>}
          </div><p className="text-xs text-muted-foreground">{txn.contact_name}{txn.notes && `${txn.contact_name ? ' · ' : ''}${txn.notes}`}</p></td>
          <td className="p-3 text-right tabular-nums">{Number(txn.amount) > 0 ? fmtAmount(txn.amount) : '—'}</td>
          <td className="p-3 text-right tabular-nums">{Number(txn.amount) < 0 ? fmtAmount(-Number(txn.amount)) : '—'}</td>
          <td className="p-3 text-right font-medium tabular-nums whitespace-nowrap">{balance(txn.running_balance)}</td>
        </tr>)}
        {!transactions.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No entries in this period.</td></tr>}
      </tbody>
    </table>
  </div>
}
