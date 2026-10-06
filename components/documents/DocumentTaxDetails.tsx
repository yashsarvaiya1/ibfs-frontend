'use client'

import type { TaxMode, SupplyCategory } from '@/models/document'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  mode?: TaxMode
  category?: SupplyCategory | ''
  supplierNumber?: string
  allowItem?: boolean
  onMode?: (value: TaxMode) => void
  onCategory?: (value: SupplyCategory | '') => void
  onSupplierNumber?: (value: string) => void
  place: string
  reverse: boolean | null
  onPlace: (value: string) => void
  onReverse: (value: boolean | null) => void
}

export function DocumentTaxDetails({ place, reverse, onPlace, onReverse, mode, category, supplierNumber, allowItem, onMode, onCategory, onSupplierNumber }: Props) {
  return <details className="rounded-xl border p-4">
    <summary className="cursor-pointer text-sm font-medium">Tax details <span className="font-normal text-muted-foreground">optional</span></summary>
    <div className="grid gap-4 sm:grid-cols-2 mt-4">
      <div className="space-y-1.5"><Label htmlFor="place-of-supply">Place of supply</Label><Input id="place-of-supply" maxLength={100} value={place} onChange={e => onPlace(e.target.value)} placeholder="State name and code, when applicable" /></div>
      <div className="space-y-1.5"><Label htmlFor="reverse-charge">Reverse charge</Label>
        <select id="reverse-charge" className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={reverse === null ? '' : String(reverse)} onChange={e => onReverse(e.target.value === '' ? null : e.target.value === 'true')}>
          <option value="">Not specified</option><option value="false">No</option><option value="true">Yes</option>
        </select>
      </div>
      {onMode && <div className="space-y-1.5"><Label htmlFor="tax-mode">Tax rates</Label><select id="tax-mode" className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={mode} onChange={e => onMode(e.target.value as TaxMode)}><option value="document">Same rates for all items</option><option value="item" disabled={!allowItem}>Different rates per item</option></select><p className="text-xs text-muted-foreground">Per-item mode distributes charges and discount proportionally. Switching to shared rates uses the first item’s rates; review the total.</p></div>}
      {onCategory && <div className="space-y-1.5"><Label htmlFor="supply-category">Supply classification</Label><select id="supply-category" className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={category} onChange={e => onCategory(e.target.value as SupplyCategory | '')}><option value="">Not specified</option><option value="taxable">Taxable domestic</option><option value="nil_rated">Nil rated</option><option value="exempt">Exempt</option><option value="non_gst">Non GST</option><option value="export">Export</option><option value="import">Import</option></select></div>}
      {onSupplierNumber && <div className="space-y-1.5"><Label htmlFor="supplier-number">Supplier invoice number</Label><Input id="supplier-number" value={supplierNumber} maxLength={100} onChange={e => onSupplierNumber(e.target.value)} placeholder="Number printed on the supplier’s invoice" /></div>}
    </div>
    <p className="text-xs text-muted-foreground mt-3">Only specified values appear on the PDF. Confirm these details for the transaction.</p>
  </details>
}
