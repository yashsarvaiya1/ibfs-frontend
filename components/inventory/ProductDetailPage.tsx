// components/inventory/ProductDetailPage.tsx
'use client'

import { useEffect, useState } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useProduct, useUpdateProduct, useAdjustStock } from '@/hooks/useProduct'
import { useStockTransactions } from '@/hooks/useStock'
import { usePendingMoves } from '@/hooks/useProduct'
import { fmtAmount, fmtDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MoreVertical, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface Props { id: number }

export function ProductDetailPage({ id }: Props) {
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  const { data: product, isLoading } = useProduct(id)
  const { data: stockTxnsData } = useStockTransactions({ product: id })
  const { data: pendingMoves } = usePendingMoves(id)

  const stockTxns = stockTxnsData?.results ?? []
  const pending = pendingMoves ?? []

  const [editSheet, setEditSheet] = useState(false)
  const [adjustSheet, setAdjustSheet] = useState(false)
  const [adjustMode, setAdjustMode] = useState<'add' | 'remove'>('add')

  // Edit state
  const [editName, setEditName] = useState('')
  const [editRate, setEditRate] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [editMinStock, setEditMinStock] = useState('')
  const [editHsn, setEditHsn] = useState('')
  const [editDesc, setEditDesc] = useState('')

  // Adjust state
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [adjustRate, setAdjustRate] = useState('')

  const updateProduct = useUpdateProduct(id)
  const adjustStock = useAdjustStock(id)

  useEffect(() => {
    if (product) {
      setPageTitle(product.name)
      setEditName(product.name)
      setEditRate(product.rate)
      setEditUnit(product.unit)
      setEditMinStock(product.min_stock)
      setEditHsn(product.hsn_code ?? '')
      setEditDesc(product.description ?? '')
    }
  }, [product, setPageTitle])

  if (isLoading) return <div className="px-4 py-4 space-y-3"><Skeleton className="h-32 rounded-xl" /></div>
  if (!product) return null

  const isLow = Number(product.current_stock) <= Number(product.min_stock)

  const handleUpdate = async () => {
    if (!editName.trim() || !editRate) { toast.error('Name and rate required'); return }
    try {
      await updateProduct.mutateAsync({
        name: editName, rate: editRate, unit: editUnit,
        min_stock: editMinStock, hsn_code: editHsn || null,
        description: editDesc || null,
      })
      toast.success('Product updated')
      setEditSheet(false)
    } catch { toast.error('Update failed') }
  }

  const handleAdjust = async () => {
    if (!adjustQty || Number(adjustQty) <= 0) { toast.error('Enter a valid quantity'); return }
    const signed = adjustMode === 'add' ? adjustQty : `-${adjustQty}`
    try {
      await adjustStock.mutateAsync({
        quantity: signed,
        rate: adjustRate || undefined,
        notes: adjustNotes || undefined,
        date: new Date().toISOString().split('T')[0],
      })
      toast.success(`Stock ${adjustMode === 'add' ? 'added' : 'removed'}`)
      setAdjustSheet(false)
      setAdjustQty(''); setAdjustNotes(''); setAdjustRate('')
    } catch { toast.error('Adjustment failed') }
  }

  return (
    <div className="pb-10">

      {/* Product Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{product.name}</h1>
            {product.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{product.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">{product.unit}</Badge>
              {product.hsn_code && <Badge variant="outline">HSN: {product.hsn_code}</Badge>}
              {isLow && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Low Stock</Badge>}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditSheet(true)}>Edit Product</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stock Stats */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Current Stock</p>
              <p className={`text-xl font-bold mt-1 ${isLow ? 'text-orange-500' : ''}`}>
                {product.current_stock}
              </p>
              <p className="text-[10px] text-muted-foreground">{product.unit}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Rate</p>
              <p className="text-base font-bold mt-1">{fmtAmount(product.rate)}</p>
              <p className="text-[10px] text-muted-foreground">per {product.unit}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Min Alert</p>
              <p className="text-base font-bold mt-1">{product.min_stock}</p>
              <p className="text-[10px] text-muted-foreground">{product.unit}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Adjust Buttons */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-3">
        <Button
          className="h-12 gap-2"
          onClick={() => { setAdjustMode('add'); setAdjustSheet(true) }}
        >
          <TrendingUp className="h-4 w-4" /> Add Stock
        </Button>
        <Button
          variant="outline"
          className="h-12 gap-2"
          onClick={() => { setAdjustMode('remove'); setAdjustSheet(true) }}
        >
          <TrendingDown className="h-4 w-4" /> Remove Stock
        </Button>
      </div>

      <Separator />

      {/* Pending Moves from Documents */}
      {pending.length > 0 && (
        <>
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Pending Stock Moves
            </h2>
          </div>
          <div className="px-4 space-y-2">
            {pending.map((move) => (
              <Card key={move.document_id} className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {move.doc_type.toUpperCase()} #{move.doc_id}
                      </p>
                      <p className="text-xs text-muted-foreground">{move.contact ?? 'No contact'} · {fmtDate(move.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="text-sm font-bold text-orange-500">{move.remaining_qty} {product.unit}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Separator className="mt-4" />
        </>
      )}

      {/* Stock Transaction History */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">History</h2>
      </div>
      <div className="px-4 space-y-2">
        {stockTxns.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">No stock history yet</p>
        ) : (
          stockTxns.map(txn => (
            <Card key={txn.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={txn.type === 'actual' ? 'default' : 'secondary'} className="text-[10px] h-4">
                      {txn.type}
                    </Badge>
                    {txn.document && <span className="text-xs text-primary">Doc #{txn.document}</span>}
                    {txn.is_doc_deleted && <Badge variant="destructive" className="text-[10px] h-4">orphan</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(txn.date)}</p>
                  {txn.notes && <p className="text-xs text-muted-foreground">{txn.notes}</p>}
                </div>
                <p className={`font-bold text-sm ${Number(txn.quantity) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Number(txn.quantity) >= 0 ? '+' : ''}{txn.quantity} {product.unit}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Sheet */}
      <Sheet open={editSheet} onOpenChange={setEditSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[90vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">Edit Product</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rate (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" value={editRate} onChange={e => setEditRate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input value={editUnit} onChange={e => setEditUnit(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min Stock Alert</Label>
                <Input type="number" value={editMinStock} onChange={e => setEditMinStock(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>HSN Code</Label>
                <Input value={editHsn} onChange={e => setEditHsn(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={handleUpdate} disabled={updateProduct.isPending}>
              {updateProduct.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Adjust Stock Sheet */}
      <Sheet open={adjustSheet} onOpenChange={setAdjustSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">
              {adjustMode === 'add' ? 'Add Stock' : 'Remove Stock'}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Quantity ({product.unit})</Label>
              <Input
                type="number"
                placeholder="0"
                value={adjustQty}
                onChange={e => setAdjustQty(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rate per {product.unit} <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input
                type="number"
                placeholder={product.rate}
                value={adjustRate}
                onChange={e => setAdjustRate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder="e.g. Manual correction"
                value={adjustNotes}
                onChange={e => setAdjustNotes(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleAdjust} disabled={adjustStock.isPending}>
              {adjustStock.isPending ? 'Adjusting...' : `Confirm ${adjustMode === 'add' ? 'Add' : 'Remove'}`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
