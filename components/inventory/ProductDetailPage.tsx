'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import {
  useProduct,
  useUpdateProduct,
  usePendingMoves,
} from '@/hooks/useProduct'
import {
  useStockTransactions,
  useDeleteStockTransaction,
} from '@/hooks/useStock'
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
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreVertical, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, MoveRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { StockTransactionCard } from '@/components/shared/StockTransactionCard'
import { AdjustStockSheet }     from '@/components/shared/AdjustStockSheet'    // ← ADD
import type { StockTransaction } from '@/models/stock-transaction'              // ← ADD


interface Props { id: number }


export function ProductDetailPage({ id }: Props) {
  const router = useRouter()
  const {
    setPageTitle,
    openAdjustStockSheet,
    openMoveStockSheet,
  } = useUIStore()

  const { data: product,  isLoading } = useProduct(id)
  const { data: stockData }           = useStockTransactions({ product: id })
  const { data: pendingMoves }        = usePendingMoves(id)

  const stockTxns = stockData?.results ?? []
  const moves     = pendingMoves ?? []
  const pending   = moves.filter(m => Number(m.remaining_qty) > 0)
  const completed = moves.filter(m => Number(m.remaining_qty) <= 0)

  // ── Product edit sheet ─────────────────────────────────────────────────────
  const [editSheet,    setEditSheet]    = useState(false)
  const [editName,     setEditName]     = useState('')
  const [editRate,     setEditRate]     = useState('')
  const [editUnit,     setEditUnit]     = useState('')
  const [editMinStock, setEditMinStock] = useState('')
  const [editHsn,      setEditHsn]      = useState('')
  const [editDesc,     setEditDesc]     = useState('')
  const [editStock,    setEditStock]    = useState('')

  const updateProduct = useUpdateProduct(id)

  // ── Stock txn edit / delete ────────────────────────────────────────────────
  const [editStockTxn,   setEditStockTxn]   = useState<StockTransaction | null>(null)
  const [deleteTarget,   setDeleteTarget]   = useState<StockTransaction | null>(null)
  const [confirmDelOpen, setConfirmDelOpen] = useState(false)

  const deleteMut = useDeleteStockTransaction(deleteTarget?.id ?? 0)

  useEffect(() => {
    if (product) {
      setPageTitle(product.name)
      setEditName(product.name)
      setEditRate(product.rate)
      setEditUnit(product.unit)
      setEditMinStock(product.min_stock)
      setEditHsn(product.hsn_code ?? '')
      setEditDesc(product.description ?? '')
      setEditStock(product.current_stock)
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
        current_stock: editStock,
      })
      toast.success('Product updated')
      setEditSheet(false)
    } catch {
      toast.error('Update failed')
    }
  }

  // ── Stock txn handlers ─────────────────────────────────────────────────────
  const handleEditStockTxn = (txnId: number) => {
    const txn = stockTxns.find(t => t.id === txnId)
    if (!txn) return
    setEditStockTxn(txn)
  }

  const handleDeletePrompt = (txnId: number) => {
    const txn = stockTxns.find(t => t.id === txnId)
    if (!txn) return
    setDeleteTarget(txn)
    setConfirmDelOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync()
      toast.success('Stock transaction deleted')
      setConfirmDelOpen(false)
      setDeleteTarget(null)
    } catch {
      toast.error('Delete failed')
    }
  }


  return (
    <div className="pb-10">

      {/* ── Product header ────────────────────────────────────────────────── */}
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

      {/* ── Stock stats ───────────────────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Current Stock</p>
              <p className={cn('text-xl font-bold mt-1', isLow && 'text-orange-500')}>
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

      {/* ── Adjust buttons ────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-3">
        <Button
          className="h-11 gap-2 rounded-xl"
          onClick={() => openAdjustStockSheet(id, 'add')}
        >
          <TrendingUp className="h-4 w-4" /> Add Stock
        </Button>
        <Button
          variant="outline"
          className="h-11 gap-2 rounded-xl"
          onClick={() => openAdjustStockSheet(id, 'remove')}
        >
          <TrendingDown className="h-4 w-4" /> Remove Stock
        </Button>
      </div>

      <Separator />

      {/* ── Document movements ───────────────────────────────────────────── */}
      {moves.length > 0 && (
        <>
          <div className="px-4 pt-5 pb-2">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Document Movements
            </h2>
          </div>
          <div className="px-4 space-y-3">

            {pending.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-orange-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> ACTION REQUIRED
                </p>
                {pending.map(move => (
                  <Card
                    key={move.document_id}
                    className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 rounded-xl shadow-sm"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="flex-1 text-left"
                          onClick={() => router.push(`/documents/${move.document_id}`)}
                        >
                          <p className="text-sm font-semibold">
                            {move.doc_type.toUpperCase()} #{move.doc_id}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {move.contact ?? 'No contact'} · {fmtDate(move.date)}
                          </p>
                          <p className="text-xs font-bold text-orange-600 mt-1">
                            {move.remaining_qty} {product.unit} remaining
                          </p>
                        </button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 h-8 text-xs gap-1.5 rounded-lg border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100"
                          onClick={() => openMoveStockSheet(move.document_id, 'product')}
                        >
                          <MoveRight className="h-3.5 w-3.5" /> Move
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {completed.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> FULFILLED
                </p>
                {completed.map(move => (
                  <Card
                    key={move.document_id}
                    className="border-emerald-100 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
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
                        <Badge variant="outline" className="text-[10px] h-5 bg-emerald-100/50 text-emerald-700 border-emerald-200">
                          Moved
                        </Badge>
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

      {/* ── Stock transaction ledger ──────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-2 flex items-center justify-between">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Ledger History
        </h2>
        {stockTxns.some(t => t.type === 'actual') && (
          <p className="text-[10px] text-muted-foreground">Tap Moved entries to edit</p>
        )}
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
              // ✅ Wire onEdit and onDelete — only rendered for actual type by the card
              onEdit={handleEditStockTxn}
              onDelete={handleDeletePrompt}
            />
          ))
        )}
      </div>

      {/* ── Product edit sheet ────────────────────────────────────────────── */}
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
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="space-y-1.5">
                <Label className="flex justify-between items-center">
                  <span>Direct Stock Override</span>
                  <span className="text-[10px] text-amber-700 font-normal">⚠️ No transaction created</span>
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
            <Button
              className="w-full h-12 mt-2 rounded-xl"
              onClick={handleUpdate}
              disabled={updateProduct.isPending}
            >
              {updateProduct.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ✅ Stock txn edit — AdjustStockSheet in edit mode */}
      <AdjustStockSheet
        editTxn={editStockTxn}
        onEditClose={() => setEditStockTxn(null)}
      />

      {/* ✅ Stock txn delete confirmation */}
      <AlertDialog open={confirmDelOpen} onOpenChange={setConfirmDelOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black">Delete Stock Transaction?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2.5 text-sm font-medium pt-2">
                <p>
                  Permanently delete this{' '}
                  <strong className="text-foreground">
                    {deleteTarget
                      ? `${Number(deleteTarget.quantity) > 0 ? 'Stock In' : 'Stock Out'} of ${Math.abs(Number(deleteTarget.quantity))} ${product.unit}`
                      : ''}
                  </strong>
                  {deleteTarget ? ` on ${fmtDate(deleteTarget.date)}` : ''}.
                </p>
                <p className="text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 leading-tight">
                  ⚠️ Product current stock will be reversed automatically.
                </p>
                {deleteTarget?.is_document_deleted === false && deleteTarget?.document && (
                  <p className="text-muted-foreground bg-muted/50 p-2 rounded-lg border leading-tight text-xs">
                    This transaction is linked to a document. The document record will remain — only this actual movement is deleted.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-11 rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMut.isPending}
              className="h-11 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              {deleteMut.isPending ? 'Deleting...' : 'Yes, Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
