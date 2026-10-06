'use client'

export function PaymentAdjustmentType({ value, onChange, label }: {
  value: 'charge' | 'discount'; onChange: (value: 'charge' | 'discount') => void; label: string
}) {
  return <select aria-label={label} value={value} onChange={event => onChange(event.target.value as 'charge' | 'discount')}
    className="h-9 rounded-lg border bg-background px-2 text-xs font-medium shrink-0">
    <option value="charge">Charge</option><option value="discount">Waiver</option>
  </select>
}
