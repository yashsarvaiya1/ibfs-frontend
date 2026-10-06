'use client'
import type { useDocumentTotals } from '@/hooks/useDocumentTotals'
import { fmtAmount } from '@/lib/utils'
import { apiError } from '@/lib/apiError'
import { Button } from '@/components/ui/button'

export function DocumentTotalsSummary({ preview }: { preview: ReturnType<typeof useDocumentTotals> }) {
  const totals = preview.ready ? preview.data : undefined
  const failed = preview.state === 'error' || preview.state === 'offline'
  const message = preview.state === 'idle' ? 'Add item details to calculate the total.'
    : preview.state === 'offline' ? 'You are offline. Reconnect to calculate the total; you can save a local draft meanwhile.'
    : preview.state === 'error' ? apiError(preview.error, 'Could not calculate totals. Check your connection and retry.')
    : 'Calculating total…'
  return <div className="rounded-xl border bg-muted/20 p-4 space-y-2" aria-live="polite" data-testid="document-totals">
    {totals ? <>{[['Items before discount', totals.gross_subtotal], ['Item discounts', -Number(totals.item_discount_total)], ['Items subtotal', totals.subtotal], ['Charges', totals.charges_total], ['Overall discount', -Number(totals.discount)], ['Taxable amount', totals.taxable_amount], ['Tax', totals.tax_total]].map(([label, value]) => <div key={String(label)} className="flex justify-between text-sm text-muted-foreground"><span>{label}</span><span>{fmtAmount(value as string | number)}</span></div>)}</> : <p role={failed ? 'alert' : 'status'} className="text-sm text-muted-foreground">{message}</p>}
    {failed && <Button type="button" variant="outline" size="sm" onClick={() => { void preview.refetch() }}>Retry calculation</Button>}
    <div className="flex justify-between font-bold border-t pt-2"><span>Grand Total</span><span data-testid="grand-total">{totals ? fmtAmount(totals.total) : '—'}</span></div>
  </div>
}
