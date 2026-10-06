'use client'
import type { LineItem } from '@/models/document'
import { DiscountInput } from './DiscountInput'

// Used only to convert discount entry units; posting/visible totals come from the backend.
export function taxPreviewSubtotal(items: LineItem[]) {
  return items.reduce((sum, item) => {
    const amount = Number(item.amount) || 0
    const discount = item.discount_percentage != null ? Math.round((amount * Number(item.discount_percentage) / 100 + Number.EPSILON) * 100) / 100 : Number(item.discount) || 0
    return sum + amount - discount
  }, 0)
}

export function ItemDiscount({ item, label, onChange }: { item: LineItem; label: string; onChange: (patch: Pick<LineItem, 'discount' | 'discount_percentage'>) => void }) {
  const mode = item.discount_percentage != null ? 'percentage' : 'amount'
  const amount = Number(item.amount) || 0
  const value = String(item.discount_percentage ?? item.discount ?? '')
  return <details className="rounded-lg border p-3" open={Boolean(item.discount || item.discount_percentage)}><summary className="cursor-pointer text-xs font-medium">Item discount <span className="text-muted-foreground">optional</span></summary><div className="mt-3"><DiscountInput itemLabel={label} mode={mode} value={value} subtotal={amount} onValue={value => onChange(mode === 'percentage' ? { discount_percentage: Number(value) || 0 } : { discount: value === '' ? null : Number(value), discount_percentage: null })} onMode={next => {
    if (next === 'percentage') onChange({ discount_percentage: amount > 0 ? Math.round((Number(item.discount) || 0) / amount * 1_000_000) / 10_000 : 0 })
    else onChange({ discount: Math.round(amount * (Number(item.discount_percentage) || 0)) / 100, discount_percentage: null })
  }} /></div></details>
}
