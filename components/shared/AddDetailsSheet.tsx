'use client'

import { useState } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useAddDetails, useDocument } from '@/hooks/useDocument'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { LineItem } from '@/models/document'

interface LocalLineItem {
  name:       string
  quantity:   string
  rate:       string
  product_id: string   // empty string = no product link
}

const emptyLine = (): LocalLineItem => ({ name: '', quantity: '', rate: '', product_id: '' })

export function AddDetailsSheet() {
  const {
    addDetailsSheetOpen,
    addDetailsDocId,
    closeAddDetailsSheet,
  } = useUIStore()

  const docId    = addDetailsDocId ?? 0
  const { data: doc } = useDocument(docId)
  const addDetails    = useAddDetails(docId)

  const [lines, setLines] = useState<LocalLineItem[]>([emptyLine()])

  const updateLine = (i: number, patch: Partial<LocalLineItem>) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l))

  const removeLine = (i: number) =>
    setLines(prev => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async () => {
    const validLines = lines.filter(l => l.name.trim())
    if (validLines.length === 0) { toast.error('Add at least one line item'); return }

    const payload: LineItem[] = validLines.map(l => ({
      name:       l.name.trim(),
      quantity:   l.quantity ? Number(l.quantity) : undefined,
      rate:       l.rate     ? Number(l.rate)     : undefined,
      amount:     (l.quantity && l.rate)
                    ? Number(l.quantity) * Number(l.rate)
                    : undefined,
      product_id: l.product_id ? Number(l.product_id) : null,
    }))

    try {
      await addDetails.mutateAsync(payload)
      toast.success('Details added — stock preview updated')
      setLines([emptyLine()])
      closeAddDetailsSheet()
    } catch {
      toast.error('Failed to add details')
    }
  }

  const total = lines.reduce((s, l) =>
    s + (Number(l.quantity) || 0) * (Number(l.rate) || 0), 0
  )

  return (
    <Sheet open={addDetailsSheetOpen} onOpenChange={(open) => !open && closeAddDetailsSheet()}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">Add Line Items</SheetTitle>
        </SheetHeader>

        {doc && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 mb-4">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Document</p>
              <p className="text-sm font-semibold">{doc.doc_id}</p>
            </div>
            {doc.total_amount && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-sm font-bold">{doc.total_amount}</p>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground mb-3">
          Adding line items will generate pending stock entries for products. 
          Use the Move Stock button after saving to physically move stock.
        </p>

        <div className="space-y-3 mb-3">
          {lines.map((line, i) => (
            <div key={i} className="p-3 rounded-xl border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Item {i + 1}
                </Label>
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(i)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              <Input
                placeholder="Item name *"
                value={line.name}
                onChange={e => updateLine(i, { name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Qty"
                  value={line.quantity}
                  onChange={e => updateLine(i, { quantity: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Rate"
                  value={line.rate}
                  onChange={e => updateLine(i, { rate: e.target.value })}
                />
              </div>
              <Input
                type="number"
                placeholder="Product ID (optional — links to inventory)"
                value={line.product_id}
                onChange={e => updateLine(i, { product_id: e.target.value })}
              />
              {line.quantity && line.rate && (
                <p className="text-xs text-right text-muted-foreground">
                  = {(Number(line.quantity) * Number(line.rate)).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button" variant="outline" size="sm"
          className="w-full gap-1.5 mb-4"
          onClick={() => setLines(prev => [...prev, emptyLine()])}
        >
          <Plus className="h-4 w-4" /> Add Item
        </Button>

        {total > 0 && (
          <div className="flex justify-between text-sm font-bold px-3 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 mb-4">
            <span>Line Items Total</span>
            <span>{total.toLocaleString()}</span>
          </div>
        )}

        <Button
          className="w-full h-12"
          onClick={handleSubmit}
          disabled={addDetails.isPending}
        >
          {addDetails.isPending ? 'Saving...' : 'Save & Generate Stock Entries'}
        </Button>
      </SheetContent>
    </Sheet>
  )
}
