'use client'

import { useState, useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import {
  useGlobalAdjustStock,
  useUpdateStockTransaction,
} from '@/hooks/useStock'
import { useProduct } from '@/hooks/useProduct'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import type { StockTransaction } from '@/models/stock-transaction'


interface AdjustStockSheetProps {
  editTxn?:     StockTransaction | null
  onEditClose?: () => void
}


export function AdjustStockSheet({ editTxn, onEditClose }: AdjustStockSheetProps = {}) {
  const {
    adjustStockSheetOpen,
    adjustStockProductId,
    adjustStockMode,
    closeAdjustStockSheet,
  } = useUIStore()


  // ── Mode resolution ─────────────────────────────────────────────────────────
  const isEditMode = !!editTxn
  const isOpen     = isEditMode ? !!editTxn : adjustStockSheetOpen

  // ✅ Fix: collapse null → 0 so productId is always number
  const productId: number = (isEditMode ? editTxn!.product : adjustStockProductId) ?? 0


  // ── Hooks ───────────────────────────────────────────────────────────────────
  const { data: product } = useProduct(productId)
  const adjustMut         = useGlobalAdjustStock()
  const updateMut         = useUpdateStockTransaction(editTxn?.id ?? 0)

  const isPending = adjustMut.isPending || updateMut.isPending


  // ── Form state ───────────────────────────────────────────────────────────────
  const [qty,   setQty]   = useState('')
  const [rate,  setRate]  = useState('')
  const [notes, setNotes] = useState('')
  const [date,  setDate]  = useState('')


  // ── Pre-fill on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isEditMode && editTxn) {
      setQty(Math.abs(Number(editTxn.quantity)).toString())
      setRate(editTxn.rate?.toString() ?? '')
      setNotes(editTxn.notes ?? '')
      setDate(editTxn.date)
    } else if (adjustStockSheetOpen) {
      setQty('')
      setRate('')
      setNotes('')
      setDate(new Date().toISOString().split('T')[0])
    }
  }, [isEditMode, editTxn, adjustStockSheetOpen])


  // ── Direction ────────────────────────────────────────────────────────────────
  const isAdd = isEditMode
    ? Number(editTxn!.quantity) > 0
    : adjustStockMode === 'add'

  const delta      = Number(qty) || 0
  const afterStock = isAdd
    ? Number(product?.current_stock ?? 0) + delta
    : Number(product?.current_stock ?? 0) - delta


  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleClose = () => {
    if (isEditMode) onEditClose?.()
    else closeAdjustStockSheet()
  }

  const handleSubmit = async () => {
    if (!qty || Number(qty) <= 0) { toast.error('Enter a valid quantity'); return }
    // ✅ Fix: guard against productId = 0 (no product selected / sheet not ready)
    if (!productId)               { toast.error('No product selected');    return }

    const signed = isAdd ? qty : `-${qty}`

    try {
      if (isEditMode) {
        await updateMut.mutateAsync({
          quantity: signed,
          rate:     rate  || undefined,
          notes:    notes || undefined,
          date,
        })
        toast.success('Stock transaction updated')
      } else {
        await adjustMut.mutateAsync({
          product:  productId,   // ✅ now guaranteed number, never null
          quantity: signed,
          rate:     rate  || undefined,
          notes:    notes || undefined,
          date,
        })
        toast.success(`Stock ${isAdd ? 'added' : 'removed'}`)
      }
      handleClose()
    } catch {
      toast.error(isEditMode ? 'Update failed' : 'Stock adjustment failed')
    }
  }


  return (
    <Sheet open={isOpen} onOpenChange={(v) => { if (!v) handleClose() }}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left flex items-center gap-2">
            {isAdd
              ? <TrendingUp  className="h-4 w-4 text-emerald-600" />
              : <TrendingDown className="h-4 w-4 text-red-500" />
            }
            {isEditMode
              ? `Edit Stock ${isAdd ? 'In' : 'Out'}`
              : isAdd ? 'Add Stock' : 'Remove Stock'
            }
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">

          {/* Product context */}
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

          {/* Edit mode: direction locked info badge */}
          {isEditMode && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${
              isAdd
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                : 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400'
            }`}>
              {isAdd
                ? <TrendingUp  className="h-3.5 w-3.5 shrink-0" />
                : <TrendingDown className="h-3.5 w-3.5 shrink-0" />
              }
              Direction locked — editing an existing {isAdd ? 'Stock In' : 'Stock Out'} transaction
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label>
              Quantity ({product?.unit ?? 'units'})
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

          {/* Stock after preview */}
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
              Rate per {product?.unit ?? 'unit'}
              <span className="text-xs text-muted-foreground ml-1">(optional)</span>
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder={product?.rate?.toString() ?? '0.00'}
              value={rate}
              onChange={e => setRate(e.target.value)}
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>
              Notes
              <span className="text-xs text-muted-foreground ml-1">(optional)</span>
            </Label>
            <Input
              placeholder="e.g. Physical count correction"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <Button
            className="w-full h-12"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending
              ? 'Saving...'
              : isEditMode
                ? 'Save Changes'
                : `Confirm ${isAdd ? 'Add' : 'Remove'}`
            }
          </Button>

        </div>
      </SheetContent>
    </Sheet>
  )
}
