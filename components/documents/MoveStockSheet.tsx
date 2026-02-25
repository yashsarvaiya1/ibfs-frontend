// components/documents/MoveStockSheet.tsx
'use client'

import { useState } from 'react'
import { useMoveStock } from '@/hooks/useDocument'
import { StockPreviewItem } from '@/models/document'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

interface Props {
  docId: number
  stockPreview: StockPreviewItem[]
  open: boolean
  onClose: () => void
}

export function MoveStockSheet({ docId, stockPreview, open, onClose }: Props) {
  const moveStock = useMoveStock(docId)

  const [quantities, setQuantities] = useState<Record<number, string>>(
    Object.fromEntries(stockPreview.map(s => [s.product_id, s.remaining_qty]))
  )

  const handleMove = async () => {
    const items = stockPreview
      .filter(s => Number(quantities[s.product_id]) > 0)
      .map(s => ({
        product_id: s.product_id,
        quantity: Number(quantities[s.product_id]),
      }))

    if (items.length === 0) { toast.error('No quantities to move'); return }

    try {
      await moveStock.mutateAsync({ items })
      toast.success('Stock moved successfully')
      onClose()
    } catch { toast.error('Failed to move stock') }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">Move Stock</SheetTitle>
        </SheetHeader>
        <div className="space-y-3">
          {stockPreview.map(s => (
            <Card key={s.product_id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-sm">{s.product_name}</p>
                  <p className="text-xs text-muted-foreground">Remaining: {s.remaining_qty}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Qty to Move (max: {s.remaining_qty})</Label>
                  <Input
                    type="number"
                    max={Number(s.remaining_qty)}
                    value={quantities[s.product_id] ?? ''}
                    onChange={e => {
                      const v = Math.min(Number(e.target.value), Number(s.remaining_qty))
                      setQuantities(prev => ({ ...prev, [s.product_id]: v.toString() }))
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          <Button className="w-full" onClick={handleMove} disabled={moveStock.isPending}>
            {moveStock.isPending ? 'Moving...' : 'Confirm Move'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
