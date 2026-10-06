'use client'
import type { useDocumentTotals } from '@/hooks/useDocumentTotals'
import { fmtAmount } from '@/lib/utils'
import { apiError } from '@/lib/apiError'

export function DocumentTotalsSummary({ preview }: { preview: ReturnType<typeof useDocumentTotals> }) {
  const totals = preview.ready ? preview.data : undefined
  return <div className="rounded-xl border bg-muted/20 p-4 space-y-2" aria-live="polite" data-testid="document-totals">
    {totals ? <>{[['Items before discount', totals.gross_subtotal], ['Item discounts', -Number(totals.item_discount_total)], ['Items subtotal', totals.subtotal], ['Charges', totals.charges_total], ['Overall discount', -Number(totals.discount)], ['Taxable amount', totals.taxable_amount], ['Tax', totals.tax_total]].map(([label, value]) => <div key={String(label)} className="flex justify-between text-sm text-muted-foreground"><span>{label}</span><span>{fmtAmount(value as string | number)}</span></div>)}</> : <p role={preview.isError ? 'alert' : 'status'} className="text-sm text-muted-foreground">{preview.isError ? apiError(preview.error, 'Could not calculate totals. Review item taxes, charges and discount.') : 'Calculating total…'}</p>}
    <div className="flex justify-between font-bold border-t pt-2"><span>Grand Total</span><span data-testid="grand-total">{totals ? fmtAmount(totals.total) : '—'}</span></div>
  </div>
}
