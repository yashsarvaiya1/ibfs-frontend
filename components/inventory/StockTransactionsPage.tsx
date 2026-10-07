'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUIStore } from '@/stores/uiStore'
import { useStockTransactions } from '@/hooks/useStock'
import { stockService } from '@/services/stockService'
import type { StockTransaction, StockTransactionType } from '@/models/stock-transaction'
import { StockTransactionCard } from '@/components/shared/StockTransactionCard'
import { PrintSheet } from '@/components/shared/PrintSheet'
import { PageControls } from '@/components/shared/common/PageControls'
import { SearchableSelect } from '@/components/shared/common/SearchableSelect'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiError } from '@/lib/apiError'

export function StockTransactionsPage() {
  const params = useSearchParams()
  const title = useUIStore(s=>s.setPageTitle)
  useEffect(()=>title('Stock history'),[title])
  const [product,setProduct] = useState(params.get('product') ?? '')
  const [type,setType] = useState<StockTransactionType | ''>('')
  const [dateFrom,setDateFrom] = useState('')
  const [dateTo,setDateTo] = useState('')
  const [page,setPage] = useState(1)
  const [edit,setEdit] = useState<StockTransaction | null>(null)
  const [print,setPrint] = useState(false)
  const filters = { product:product ? Number(product) : undefined, type:type || undefined, date_from:dateFrom || undefined, date_to:dateTo || undefined }
  const {data,isLoading,isError,refetch} = useStockTransactions({...filters,page,page_size:20})
  useEffect(()=>setPage(1),[product,type,dateFrom,dateTo])
  return <div className="px-4 py-4 space-y-4">
    <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Stock history</h1><Button variant="outline" onClick={()=>setPrint(true)}>Print history</Button></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SearchableSelect resource="products" options={[]} value={product} onChange={setProduct} placeholder="All products" clearable />
      <select aria-label="Movement type" className="rounded-xl border px-3 h-10 bg-background" value={type} onChange={e=>setType(e.target.value as StockTransactionType | '')}><option value="">All entries</option><option value="actual">Physical movements</option><option value="record">Expected movements</option></select>
      <Input aria-label="From date" type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
      <Input aria-label="To date" type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
    </div>
    <p className="text-xs text-muted-foreground">Expected entries belong to their document. Edit physical movements here to correct their quantity, date or notes.</p>
    {isLoading && <p className="text-sm text-muted-foreground py-8">Loading history…</p>}
    {isError && <Button variant="outline" onClick={()=>refetch()}>Could not load history. Retry</Button>}
    <div className="space-y-2">{data?.results.map(txn=><StockTransactionCard key={txn.id} txn={txn} onEdit={txn.type==='actual' ? setEdit : undefined} />)}</div>
    {data?.count===0 && <p className="py-12 text-center text-sm text-muted-foreground">No matching movements.</p>}
    <PageControls page={page} count={data?.count ?? 0} onChange={setPage} />
    <Sheet open={!!edit} onOpenChange={open=>!open && setEdit(null)}><SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8 max-h-[90dvh] overflow-y-auto"><SheetHeader><SheetTitle>Edit stock movement</SheetTitle><SheetDescription>Corrections also update current stock and document movement progress.</SheetDescription></SheetHeader>{edit && <StockEditor key={edit.id} txn={edit} close={()=>setEdit(null)} />}</SheetContent></Sheet>
    <PrintSheet open={print} onClose={()=>setPrint(false)} title="Stock history" endpoint="stock-transactions/print/" queryParams={filters} />
  </div>
}

function StockEditor({txn,close}:{txn:StockTransaction;close:()=>void}) {
  const [quantity,setQuantity] = useState(txn.quantity)
  const [date,setDate] = useState(txn.date)
  const [notes,setNotes] = useState(txn.notes ?? '')
  const [confirmDelete,setConfirmDelete] = useState(false)
  const qc = useQueryClient()
  const done = () => { for(const key of ['stock-transactions','products','documents']) qc.invalidateQueries({queryKey:[key]});close() }
  const save = useMutation({mutationFn:()=>stockService.update(txn.id,{quantity,date,notes}),onSuccess:()=>{toast.success('Movement updated');done()},onError:error=>toast.error(apiError(error,'Could not update movement'))})
  const remove = useMutation({mutationFn:()=>stockService.delete(txn.id),onSuccess:()=>{toast.success('Movement reversed and deleted');done()},onError:error=>toast.error(apiError(error,'Could not delete movement'))})
  return <div className="space-y-4 pt-3">
    <p className="text-sm font-medium">{txn.product_name} {txn.doc_id && `· ${txn.doc_id}`}</p>
    <div className="space-y-1"><Label htmlFor="stock-quantity">Signed quantity (+ receive / − dispatch)</Label><Input id="stock-quantity" type="number" step="0.01" value={quantity} onChange={e=>setQuantity(e.target.value)} /></div>
    <div className="space-y-1"><Label htmlFor="stock-date">Date</Label><Input id="stock-date" type="date" value={date} onChange={e=>setDate(e.target.value)} /></div>
    <div className="space-y-1"><Label htmlFor="stock-notes">Notes</Label><Input id="stock-notes" value={notes} onChange={e=>setNotes(e.target.value)} /></div>
    <Button className="w-full" disabled={!quantity || !date || !Number.isFinite(Number(quantity)) || save.isPending || remove.isPending} onClick={()=>save.mutate()}>{save.isPending?'Saving…':'Save correction'}</Button>
    {confirmDelete ? <div className="rounded-xl border border-destructive/30 p-4 space-y-3"><p className="text-sm">Delete this movement and reverse its stock effect?</p><div className="flex gap-2"><Button variant="destructive" loading={remove.isPending} onClick={()=>remove.mutate()}>Reverse and delete</Button><Button variant="outline" onClick={()=>setConfirmDelete(false)}>Cancel</Button></div></div> : <Button variant="ghost" className="text-destructive w-full" onClick={()=>setConfirmDelete(true)}>Delete movement</Button>}
  </div>
}
