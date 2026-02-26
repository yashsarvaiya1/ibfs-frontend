// components/documents/MoveStockSheet.tsx
'use client'

import { useState, useEffect } from 'react'
import { useMoveStock } from '@/hooks/useDocument'
import { StockPreviewItem } from '@/models/document'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCheck } from 'lucide-react'
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

  useEffect(() => {
    setQuantities(
      Object.fromEntries(stockPreview.map(s => [s.product_id, s.remaining_qty]))
    )
  }, [stockPreview])

  const handleMove = async () => {
    const items = stockPreview
      .filter(s => Number(quantities[s.product_id]) > 0)
      .map(s => ({
        product_id: s.product_id,
        quantity:   Number(quantities[s.product_id]),
      }))

    if (items.length === 0) { toast.error('No quantities to move'); return }

    try {
      await moveStock.mutateAsync({ items })
      toast.success('Stock moved successfully')
      onClose()
    } catch {
      toast.error('Failed to move stock')
    }
  }

  // Helper to instantly max out all remaining stock
  const handleMoveAll = () => {
    const maxed = Object.fromEntries(stockPreview.map(s => [s.product_id, s.remaining_qty]))
    setQuantities(maxed)
  }

  const totalPending = stockPreview.reduce((s, item) => s + Number(item.remaining_qty), 0)
  const totalQueued = stockPreview.reduce((s, item) => s + (Number(quantities[item.product_id]) || 0), 0)

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pb-10 max-h-[85vh] overflow-y-auto"
      >
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between pr-6">
            <SheetTitle className="text-left">Move Stock</SheetTitle>
            {totalPending > 0 && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 rounded-lg" onClick={handleMoveAll}>
                <CheckCheck className="h-3.5 w-3.5" /> Move All
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-3">
          {stockPreview.map(s => {
            const remaining = Number(s.remaining_qty)
            const queued    = Number(quantities[s.product_id]) || 0
            const isDone    = remaining === 0

            return (
              <Card key={s.product_id} className={isDone ? 'opacity-50 bg-muted/40 border-dashed' : 'rounded-xl shadow-sm'}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-sm leading-tight pr-2">{s.product_name}</p>
                    <span className={`text-xs font-bold shrink-0 ${isDone ? 'text-green-600' : 'text-orange-600'}`}>
                      {isDone ? '✓ Done' : `${remaining} remaining`}
                    </span>
                  </div>

                  <div className="flex gap-4 text-[11px] text-muted-foreground bg-muted/50 p-1.5 rounded-md">
                    <span>Expected: <strong className="text-foreground">{s.record_qty}</strong></span>
                    <span>Moved: <strong className="text-foreground">{s.moved_qty}</strong></span>
                  </div>

                  {!isDone && (
                    <div className="flex items-center gap-3 pt-1">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
                        Qty to Move
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={remaining}
                        className="w-24 h-9 font-bold text-center rounded-lg border-primary/30 focus-visible:ring-primary/20"
                        value={quantities[s.product_id] ?? ''}
                        onChange={e => {
                          const v = Math.min(Math.max(0, Number(e.target.value)), remaining)
                          setQuantities(prev => ({ ...prev, [s.product_id]: v.toString() }))
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {totalQueued > 0 && (
            <div className="flex justify-between text-sm font-bold px-3 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 mt-2">
              <span>Total to move</span>
              <span>{totalQueued} units</span>
            </div>
          )}

          <Button
            className="w-full h-12 rounded-xl text-md mt-2"
            onClick={handleMove}
            disabled={moveStock.isPending || totalQueued === 0}
          >
            {moveStock.isPending ? 'Moving...' : `Confirm Move${totalQueued > 0 ? ` (${totalQueued})` : ''}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
