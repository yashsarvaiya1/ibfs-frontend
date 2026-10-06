'use client'
import type { Tax, SupplyCategory } from '@/models/document'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ItemTaxes({ taxes, onChange, label, category, onCategory }: { taxes: Tax[]; onChange: (taxes: Tax[]) => void; label: string; category?: SupplyCategory | null; onCategory?: (category: SupplyCategory | null) => void }) {
  return <div className="space-y-2 rounded-lg border p-3">
    <p className="text-xs font-medium">Taxes for {label}</p>
    {onCategory && <select aria-label={`Supply classification ${label}`} className="w-full h-9 rounded-md border bg-background px-2 text-xs" value={category ?? ''} onChange={event => onCategory(event.target.value as SupplyCategory || null)}><option value="">Use document classification</option><option value="taxable">Taxable domestic</option><option value="nil_rated">Nil rated</option><option value="exempt">Exempt</option><option value="non_gst">Non GST</option><option value="export">Export</option><option value="import">Import</option></select>}
    {taxes.map((tax, index) => <div className="flex gap-2 items-center" key={index}>
      <Input aria-label={`Tax name ${label} ${index + 1}`} value={tax.name} placeholder="CGST / SGST / IGST / Cess" onChange={e => onChange(taxes.map((t, i) => i === index ? { ...t, name: e.target.value } : t))} />
      <Input aria-label={`Tax percentage ${label} ${index + 1}`} type="number" min="0" max="100" step="0.01" className="w-24" value={tax.percentage} onChange={e => onChange(taxes.map((t, i) => i === index ? { ...t, percentage: Number(e.target.value) } : t))} />
      <span className="text-xs">%</span><Button variant="ghost" size="sm" type="button" aria-label={`Remove tax ${label} ${index + 1}`} onClick={() => onChange(taxes.filter((_, i) => i !== index))}>×</Button>
    </div>)}
    <Button type="button" variant="outline" size="sm" onClick={() => onChange([...taxes, { name: '', percentage: 0 }])}>Add item tax</Button>
  </div>
}
