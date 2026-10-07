'use client'
import type { useDocumentTotals } from '@/hooks/useDocumentTotals'
import { fmtAmount } from '@/lib/utils'
import { apiError } from '@/lib/apiError'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DocumentTotalsSummary({ preview }: { preview: ReturnType<typeof useDocumentTotals> }) {
  const totals = preview.ready ? preview.data : undefined
  const discount = Number(totals?.item_discount_total ?? 0) + Number(totals?.discount ?? 0)
  const rows = totals ? [
    { label: 'Subtotal', amount: totals.gross_subtotal },
    ...(discount > 0 ? [{ label: 'Discount', amount: -discount }] : []),
    ...(Number(totals.charges_total) > 0 ? [{ label: 'Charges', amount: totals.charges_total }] : []),
    { label: 'Tax', amount: totals.tax_total },
  ] : []
  const failed = preview.state === 'error' || preview.state === 'offline'
  const message = preview.state === 'idle' ? 'Add item details to calculate the total.'
    : preview.state === 'offline' ? 'You are offline. Reconnect to calculate the total; you can save a local draft meanwhile.'
    : preview.state === 'error' ? apiError(preview.error, 'Could not calculate totals. Check your connection and retry.')
    : 'Calculating total…'
  return <div className="rounded-2xl border bg-card p-4 sm:p-5 space-y-3" aria-live="polite" data-testid="document-totals">
    {totals ? rows.map(row => <div key={row.label} className="flex justify-between gap-4 text-sm"><span className="text-muted-foreground">{row.label}</span><span className="font-medium tabular-nums">{Number(row.amount) < 0 ? '−' : ''}{fmtAmount(Math.abs(Number(row.amount)))}</span></div>) : <p role={failed ? 'alert' : 'status'} className="text-sm text-muted-foreground flex items-center gap-2">{!failed && preview.state !== 'idle' && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}{message}</p>}
    {failed && <Button type="button" variant="outline" size="sm" onClick={() => { void preview.refetch() }}>Retry calculation</Button>}
    <div className="flex justify-between items-center gap-4 border-t pt-4"><span className="font-semibold">Total</span><span className="text-xl font-bold tabular-nums tracking-tight" data-testid="grand-total">{totals ? fmtAmount(totals.total) : '—'}</span></div>
  </div>
}
