// components/inventory/ProductDetailPage.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import {
  useProduct,
  useUpdateProduct,
  useAdjustStock,
  usePendingMoves,
} from '@/hooks/useProduct'

import { useStockTransactions } from '@/hooks/useStock' 
import { fmtAmount, fmtDate, cn } from '@/lib/utils'
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
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { StockTransactionCard } from '@/components/shared/StockTransactionCard'

interface Props { id: number }

export function ProductDetailPage({ id }: Props) {
  const router       = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)

  const { data: product,     isLoading } = useProduct(id)
  const { data: stockTxnsData }          = useStockTransactions({ product: id })
  const { data: pendingMoves }           = usePendingMoves(id)

  const stockTxns = stockTxnsData?.results ?? []
  const moves   = pendingMoves ?? []

  // BUG 12 FIX: Separate pending vs fully stocked
  const pending = moves.filter(m => Number(m.remaining_qty) > 0)
  const completed = moves.filter(m => Number(m.remaining_qty) <= 0)

  const [editSheet,   setEditSheet]   = useState(false)
  const [adjustSheet, setAdjustSheet] = useState(false)
  const [adjustMode,  setAdjustMode]  = useState<'add' | 'remove'>('add')

  // ── Edit state ──────────────────────────────────────────────────────────────
  const [editName,     setEditName]     = useState('')
  const [editRate,     setEditRate]     = useState('')
  const [editUnit,     setEditUnit]     = useState('')
  const [editMinStock, setEditMinStock] = useState('')
  const [editHsn,      setEditHsn]      = useState('')
  const [editDesc,     setEditDesc]     = useState('')
  const [editStock,    setEditStock]    = useState('') // BUG 11 FIX: Direct Stock Edit

  // ── Adjust state ────────────────────────────────────────────────────────────
  const [adjustQty,   setAdjustQty]   = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [adjustRate,  setAdjustRate]  = useState('')

  const updateProduct = useUpdateProduct(id)
  const adjustStock   = useAdjustStock(id)

  useEffect(() => {
    if (product) {
      setPageTitle(product.name)
      setEditName(product.name)
      setEditRate(product.rate)
      setEditUnit(product.unit)
      setEditMinStock(product.min_stock)
      setEditHsn(product.hsn_code ?? '')
      setEditDesc(product.description ?? '')
      setEditStock(product.current_stock) // Initialize direct stock value
    }
  }, [product, setPageTitle])

  if (isLoading) return (
    <div className="px-4 py-4 space-y-3">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
    </div>
  )
  if (!product) return null

  const isLow = Number(product.current_stock) <= Number(product.min_stock)

  const handleUpdate = async () => {
    if (!editName.trim() || !editRate) { toast.error('Name and rate required'); return }
    try {
      await updateProduct.mutateAsync({
        name:          editName,
        rate:          editRate,
        unit:          editUnit,
        min_stock:     editMinStock,
        hsn_code:      editHsn || null,
        description:   editDesc || null,
        current_stock: editStock, // BUG 11 FIX: Send direct stock overwrite (no s.txn created)
      })
      toast.success('Product updated')
      setEditSheet(false)
    } catch {
      toast.error('Update failed')
    }
  }

  const handleAdjust = async () => {
    if (!adjustQty || Number(adjustQty) <= 0) {
      toast.error('Enter a valid quantity'); return
    }
    const signed = adjustMode === 'add' ? adjustQty : `-${adjustQty}`
    try {
      await adjustStock.mutateAsync({
        quantity: signed,
        rate:     adjustRate  || undefined,
        notes:    adjustNotes || undefined,
        date:     new Date().toISOString().split('T')[0],
      })
      toast.success(`Stock ${adjustMode === 'add' ? 'added' : 'removed'}`)
      setAdjustSheet(false)
      setAdjustQty(''); setAdjustNotes(''); setAdjustRate('')
    } catch {
      toast.error('Adjustment failed')
    }
  }

  const openAdjustSheet = (mode: 'add' | 'remove') => {
    setAdjustMode(mode)
    setAdjustQty('')
    setAdjustNotes('')
    setAdjustRate('')
    setAdjustSheet(true)
  }

  return (
    <div className="pb-10">

      {/* ── Product Header ────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{product.name}</h1>
            {product.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{product.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="rounded-md">{product.unit}</Badge>
              {product.hsn_code && (
                <Badge variant="outline" className="rounded-md">HSN: {product.hsn_code}</Badge>
              )}
              {isLow && (
                <Badge variant="destructive" className="gap-1 rounded-md">
                  <AlertTriangle className="h-3 w-3" /> Low Stock
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setEditSheet(true)}>
                Edit Details & Stock
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/transactions?product=${id}`)}>
                View All Transactions
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Stock Stats ───────────────────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Current Stock</p>
              <p className={cn("text-xl font-bold mt-1", isLow ? "text-orange-500" : "")}>
                {product.current_stock}
              </p>
              <p className="text-[10px] text-muted-foreground">{product.unit}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Rate</p>
              <p className="text-base font-bold mt-1">{fmtAmount(product.rate)}</p>
              <p className="text-[10px] text-muted-foreground">per {product.unit}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Min Alert</p>
              <p className="text-base font-bold mt-1">{product.min_stock}</p>
              <p className="text-[10px] text-muted-foreground">{product.unit}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Adjust Buttons (Bug #11 Part 2) ─────────────────────────────── */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-3">
        <Button className="h-11 gap-2 rounded-xl" onClick={() => openAdjustSheet('add')}>
          <TrendingUp className="h-4 w-4" /> Add Stock
        </Button>
        <Button
          variant="outline"
          className="h-11 gap-2 rounded-xl"
          onClick={() => openAdjustSheet('remove')}
        >
          <TrendingDown className="h-4 w-4" /> Remove Stock
        </Button>
      </div>

      <Separator />

      {/* ── Stock Movements (Bug #12 FIX) ─────────────────────────────────── */}
      {moves.length > 0 && (
        <>
          <div className="px-4 pt-5 pb-2">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Document Movements
            </h2>
          </div>
          <div className="px-4 space-y-3">
            
            {/* Pending Section */}
            {pending.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-orange-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> ACTION REQUIRED
                </p>
                {pending.map(move => (
                  <Card
                    key={move.document_id}
                    className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 cursor-pointer rounded-xl shadow-sm"
                    onClick={() => router.push(`/documents/${move.document_id}`)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            {move.doc_type.toUpperCase()} #{move.doc_id}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {move.contact ?? 'No contact'} · {fmtDate(move.date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Remaining</p>
                          <p className="text-sm font-bold text-orange-600">
                            {move.remaining_qty} {product.unit}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Completed Section */}
            {completed.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> FULFILLED
                </p>
                {completed.map(move => (
                  <Card
                    key={move.document_id}
                    className="border-emerald-100 bg-emerald-50/50 dark:bg-emerald-950/10 cursor-pointer rounded-xl opacity-75 hover:opacity-100 transition-opacity"
                    onClick={() => router.push(`/documents/${move.document_id}`)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground/80">
                            {move.doc_type.toUpperCase()} #{move.doc_id}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {move.contact ?? 'No contact'}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-[10px] h-5 bg-emerald-100/50 text-emerald-700 border-emerald-200">
                            Moved
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <Separator className="mt-5" />
        </>
      )}

      {/* ── Stock Transaction History ─────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-2">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Ledger History
        </h2>
      </div>
      <div className="px-4 space-y-2 pb-4">
        {stockTxns.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            No stock history yet
          </p>
        ) : (
          stockTxns.map(txn => (
            <StockTransactionCard 
              key={txn.id} 
              txn={txn} 
              showProduct={false} 
            />
          ))
        )}
      </div>

      {/* ── Edit Product Sheet (Bug #11 FIX) ────────────────────────────── */}
      <Sheet open={editSheet} onOpenChange={setEditSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[90vh] overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left">Edit Product</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rate (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" value={editRate} onChange={e => setEditRate(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input value={editUnit} onChange={e => setEditUnit(e.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>
            
            {/* BUG 11: Direct Stock Overwrite */}
            <div className="p-3 bg-muted/40 rounded-xl border border-border/50 mb-2">
               <div className="space-y-1.5">
                <Label className="flex justify-between">
                  <span>Direct Stock Edit</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Doesn't create record</span>
                </Label>
                <Input type="number" value={editStock} onChange={e => setEditStock(e.target.value)} className="h-11 rounded-xl bg-background" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min Stock Alert</Label>
                <Input type="number" value={editMinStock} onChange={e => setEditMinStock(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>HSN Code</Label>
                <Input value={editHsn} onChange={e => setEditHsn(e.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>
            <Button className="w-full h-12 text-md mt-2 rounded-xl" onClick={handleUpdate} disabled={updateProduct.isPending}>
              {updateProduct.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Adjust Stock Sheet ────────────────────────────────────────────── */}
      <Sheet open={adjustSheet} onOpenChange={v => { setAdjustSheet(v); if (!v) { setAdjustQty(''); setAdjustNotes(''); setAdjustRate('') }}}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left">
              {adjustMode === 'add' ? 'Add Stock (Actual)' : 'Remove Stock (Actual)'}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
              <span className="text-sm text-muted-foreground">Current Stock</span>
              <span className={`font-bold ${isLow ? 'text-orange-500' : ''}`}>
                {product.current_stock} {product.unit}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label>Quantity ({product.unit}) <span className="text-destructive ml-1">*</span></Label>
              <Input type="number" placeholder="0" min={0} value={adjustQty} onChange={e => setAdjustQty(e.target.value)} className="h-11 rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label>Rate per {product.unit} <span className="text-xs text-muted-foreground ml-1">(optional)</span></Label>
              <Input type="number" placeholder={product.rate} value={adjustRate} onChange={e => setAdjustRate(e.target.value)} className="h-11 rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label>Notes <span className="text-xs text-muted-foreground ml-1">(optional)</span></Label>
              <Input placeholder="e.g. Manual physical count correction" value={adjustNotes} onChange={e => setAdjustNotes(e.target.value)} className="h-11 rounded-xl" />
            </div>

            {Number(adjustQty) > 0 && (
              <div className="flex justify-between text-sm font-medium px-3 py-2.5 rounded-xl bg-primary/5 text-primary border border-primary/10 mt-2">
                <span>New Stock Level</span>
                <span className={adjustMode === 'remove' && Number(adjustQty) > Number(product.current_stock) ? 'text-red-500' : ''}>
                  {adjustMode === 'add'
                    ? Number(product.current_stock) + Number(adjustQty)
                    : Number(product.current_stock) - Number(adjustQty)
                  } {product.unit}
                </span>
              </div>
            )}

            <Button className="w-full h-12 text-md mt-2 rounded-xl" onClick={handleAdjust} disabled={adjustStock.isPending}>
              {adjustStock.isPending ? 'Adjusting...' : `Confirm ${adjustMode === 'add' ? 'Add' : 'Remove'}`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
