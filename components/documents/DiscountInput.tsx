'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function DiscountInput({ mode, value, subtotal, onMode, onValue, itemLabel }: { itemLabel?: string; mode: 'amount' | 'percentage'; value: string; subtotal: number; onMode: (mode: 'amount' | 'percentage') => void; onValue: (value: string) => void }) {
  function change(next: 'amount' | 'percentage') {
    if (next === mode) return
    const amount = Number(value) || 0
    onValue(value ? String(next === 'amount' ? Math.round(subtotal * amount) / 100 : subtotal > 0 ? Math.round(amount / subtotal * 1_000_000) / 10_000 : 0) : '')
    onMode(next)
  }
  return <div className="space-y-2"><div className="flex items-center justify-between gap-2"><Label htmlFor={itemLabel ? `discount-${itemLabel.replaceAll(' ', '-')}` : 'document-discount'}>{itemLabel ? `Discount ${itemLabel}` : 'Discount'}</Label><div className="flex gap-1" aria-label="Discount type"><Button type="button" size="sm" variant={mode === 'amount' ? 'default' : 'outline'} aria-pressed={mode === 'amount'} aria-label={itemLabel ? `Amount ₹ ${itemLabel}` : undefined} onClick={() => change('amount')}>Amount ₹</Button><Button type="button" size="sm" variant={mode === 'percentage' ? 'default' : 'outline'} aria-pressed={mode === 'percentage'} aria-label={itemLabel ? `Percentage % ${itemLabel}` : undefined} onClick={() => change('percentage')}>Percentage %</Button></div></div><Input id={itemLabel ? `discount-${itemLabel.replaceAll(' ', '-')}` : 'document-discount'} type="number" min="0" max={mode === 'percentage' ? 100 : undefined} step={mode === 'percentage' ? '0.0001' : '0.01'} placeholder="0" value={value} onChange={e => onValue(e.target.value)} /><p className="text-xs text-muted-foreground">{itemLabel ? 'Applied to this item before overall discount and tax.' : `${mode === 'percentage' ? 'Percentage of items subtotal after item discounts, before charges and tax.' : 'Deducted before tax.'} Overall charges and discounts are distributed proportionally in per-item tax mode.`}</p></div>
}
