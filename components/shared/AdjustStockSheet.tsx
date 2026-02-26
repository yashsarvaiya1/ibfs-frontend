'use client'

import { useState, useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useAdjustStock } from '@/hooks/useProduct'
import { useProduct } from '@/hooks/useProduct'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'

export function AdjustStockSheet() {
  const {
    adjustStockSheetOpen,
    adjustStockProductId,
    adjustStockMode,
    closeAdjustStockSheet,
  } = useUIStore()

  const productId = adjustStockProductId ?? 0

  const { data: product } = useProduct(productId)
  const adjustMut         = useAdjustStock(productId)

  const [qty,   setQty]   = useState('')
  const [rate,  setRate]  = useState('')
  const [notes, setNotes] = useState('')
  const [date,  setDate]  = useState('')

  useEffect(() => {
    if (adjustStockSheetOpen) {
      setQty(''); setRate(''); setNotes('')
      setDate(new Date().toISOString().split('T')[0])
    }
  }, [adjustStockSheetOpen])

  const isAdd        = adjustStockMode === 'add'
  const currentStock = Number(product?.current_stock ?? 0)
  const delta        = Number(qty) || 0
  const afterStock   = isAdd ? currentStock + delta : currentStock - delta

  const handleSubmit = async () => {
    if (!qty || Number(qty) <= 0) { toast.error('Enter a valid quantity'); return }

    // Sign: add = positive, remove = negative
    const signed = isAdd ? qty : `-${qty}`

    try {
      await adjustMut.mutateAsync({
        quantity: signed,
        rate:     rate  || undefined,
        notes:    notes || undefined,
        date,
      })
      toast.success(`Stock ${isAdd ? 'added' : 'removed'}`)
      closeAdjustStockSheet()
    } catch {
      toast.error('Stock adjustment failed')
    }
  }

  return (
    <Sheet open={adjustStockSheetOpen} onOpenChange={(open) => !open && closeAdjustStockSheet()}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left flex items-center gap-2">
            {isAdd
              ? <TrendingUp  className="h-4 w-4 text-emerald-600" />
              : <TrendingDown className="h-4 w-4 text-red-500" />
            }
            {isAdd ? 'Add Stock' : 'Remove Stock'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Product + current stock context */}
          {product && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <div>
                <p className="text-xs text-muted-foreground">Product</p>
                <p className="text-sm font-semibold">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.unit}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Current Stock</p>
                <p className={`text-sm font-bold ${
                  Number(product.current_stock) <= Number(product.min_stock)
                    ? 'text-orange-500' : ''
                }`}>
                  {product.current_stock} {product.unit}
                </p>
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label>
              Quantity ({product?.unit})
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="0"
              value={qty}
              onChange={e => setQty(e.target.value)}
              className="h-12 text-lg"
            />
          </div>

          {/* After preview */}
          {delta > 0 && product && (
            <div className="flex justify-between text-sm font-medium px-3 py-2.5 rounded-xl bg-primary/5 text-primary border border-primary/10">
              <span>Stock after</span>
              <span className={`font-bold ${afterStock < 0 ? 'text-red-500' : ''}`}>
                {afterStock} {product.unit}
              </span>
            </div>
          )}

          {/* Rate */}
          <div className="space-y-1.5">
            <Label>
              Rate per {product?.unit}
              <span className="text-xs text-muted-foreground ml-1">(optional)</span>
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder={product?.rate ?? '0.00'}
              value={rate}
              onChange={e => setRate(e.target.value)}
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input
              placeholder="e.g. Physical count correction"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <Button
            className="w-full h-12"
            onClick={handleSubmit}
            disabled={adjustMut.isPending}
          >
            {adjustMut.isPending
              ? 'Saving...'
              : `Confirm ${isAdd ? 'Add' : 'Remove'}`
            }
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
