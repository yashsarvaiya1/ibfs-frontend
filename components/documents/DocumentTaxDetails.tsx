'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  place: string
  reverse: boolean | null
  onPlace: (value: string) => void
  onReverse: (value: boolean | null) => void
}

export function DocumentTaxDetails({ place, reverse, onPlace, onReverse }: Props) {
  return <details className="rounded-xl border p-4">
    <summary className="cursor-pointer text-sm font-medium">Tax details <span className="font-normal text-muted-foreground">optional</span></summary>
    <div className="grid gap-4 sm:grid-cols-2 mt-4">
      <div className="space-y-1.5"><Label htmlFor="place-of-supply">Place of supply</Label><Input id="place-of-supply" maxLength={100} value={place} onChange={e => onPlace(e.target.value)} placeholder="State name and code, when applicable" /></div>
      <div className="space-y-1.5"><Label htmlFor="reverse-charge">Reverse charge</Label>
        <select id="reverse-charge" className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={reverse === null ? '' : String(reverse)} onChange={e => onReverse(e.target.value === '' ? null : e.target.value === 'true')}>
          <option value="">Not specified</option><option value="false">No</option><option value="true">Yes</option>
        </select>
      </div>
    </div>
    <p className="text-xs text-muted-foreground mt-3">Only specified values appear on the PDF. Confirm these details for the transaction.</p>
  </details>
}
