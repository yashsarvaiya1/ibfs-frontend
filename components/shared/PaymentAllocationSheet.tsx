'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUIStore } from '@/stores/uiStore'
import { useTransaction } from '@/hooks/useTransaction'
import { useDocuments } from '@/hooks/useDocument'
import { transactionService } from '@/services/transactionService'
import type { FinancialTransaction, } from '@/models/transaction'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fmtAmount, fmtDate } from '@/lib/utils'
import { apiError } from '@/lib/apiError'
import { Minus, Plus } from 'lucide-react'

const FINANCIAL_TYPES = new Set(['bill', 'invoice', 'cn', 'dn'])

export function PaymentAllocationSheet() {
  const id = useUIStore(s => s.paymentAllocationId)
  const close = useUIStore(s => s.closePaymentAllocation)
  const { data, isLoading, isError, refetch } = useTransaction(id ?? 0)
  return <Sheet open={id !== null} onOpenChange={open => !open && close()}>
    <SheetContent side="bottom" className="rounded-t-2xl max-h-[90dvh] overflow-y-auto px-5 pb-8">
      <SheetHeader>
        <SheetTitle>Allocate payment</SheetTitle>
        <SheetDescription>Split this payment between bills or invoices. Cash stays unchanged.</SheetDescription>
      </SheetHeader>
      {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading payment…</p>}
      {isError && <div className="p-4"><p>Payment could not be loaded.</p><Button onClick={() => refetch()}>Retry</Button></div>}
      {data && id === data.id && <AllocationEditor key={data.id} payment={data} onClose={close} />}
    </SheetContent>
  </Sheet>
}

function AllocationEditor({ payment, onClose }: { payment: FinancialTransaction; onClose: () => void }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(() => (payment.allocations ?? [])
    .filter(row => FINANCIAL_TYPES.has(row.document_type))
    .map(row => ({ document: row.document, doc_id: row.doc_id, amount: String(Math.abs(Number(row.amount))) })))
  const { data, isLoading, isError } = useDocuments({ type: 'bill,invoice,cn,dn',
    contact: payment.contact ?? undefined, search, page, page_size: 20, is_active: 'true' })
  const adjustments = (payment.allocations ?? []).filter(row => row.document_type === 'interest')
    .reduce((sum, row) => sum + Number(row.amount), 0)
  const available = Math.max(0, Math.abs(Number(payment.amount)) - adjustments)
  const assigned = selected.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const valid = selected.every(row => Number.isFinite(Number(row.amount)) && Number(row.amount) > 0)
    && assigned <= available + 0.001
  const save = useMutation({
    mutationFn: () => transactionService.allocate(payment.id, selected.map(({ document, amount }) => ({ document, amount }))),
    onSuccess: () => {
      for (const key of ['transactions', 'documents', 'contacts']) qc.invalidateQueries({ queryKey: [key] })
      toast.success('Payment allocation updated')
      onClose()
    },
    onError: error => toast.error(apiError(error, 'Could not allocate payment')),
  })
  return <div className="space-y-5 pt-2">
    <div className="rounded-xl border bg-muted/30 p-4 space-y-1 text-sm">
      <p className="font-semibold">{payment.contact_name ?? 'Unassigned payment'} · {fmtDate(payment.date)}</p>
      <div className="flex justify-between"><span>{Number(payment.amount) < 0 ? 'Cash paid' : 'Cash received'}</span><strong>{fmtAmount(Math.abs(Number(payment.amount)))}</strong></div>
      {adjustments !== 0 && <div className="flex justify-between text-muted-foreground"><span>Charges / discounts</span><span>{fmtAmount(adjustments)}</span></div>}
      <div className="flex justify-between"><span>Unallocated</span><strong className={valid ? '' : 'text-destructive'}>{fmtAmount(available - assigned)}</strong></div>
      <p className="text-xs text-muted-foreground pt-1">An opposite-direction payment is treated as a refund. Allocations must belong to one contact.</p>
    </div>
    {selected.map(row => <div key={row.document} className="flex items-end gap-3">
      <div className="flex-1 space-y-1"><Label htmlFor={`allocation-${row.document}`}>{row.doc_id}</Label>
        <Input id={`allocation-${row.document}`} type="number" min="0.01" step="0.01" inputMode="decimal" value={row.amount}
          onChange={e => setSelected(current => current.map(value => value.document === row.document ? { ...value, amount: e.target.value } : value))} /></div>
      <Button variant="outline" size="icon" aria-label={`Remove ${row.doc_id}`} onClick={() => setSelected(current => current.filter(value => value.document !== row.document))}><Minus className="h-4 w-4" /></Button>
    </div>)}
    <div className="space-y-3 border-t pt-4">
      <Label htmlFor="allocation-search">Find a bill or invoice</Label>
      <Input id="allocation-search" placeholder="Search document number or contact" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
      {isLoading && <p className="text-sm text-muted-foreground">Loading documents…</p>}
      {isError && <p className="text-sm text-destructive">Could not load documents. Try searching again.</p>}
      {data?.results.filter(doc => !selected.some(row => row.document === doc.id)).map(doc => <button type="button" key={doc.id}
        className="w-full flex items-center justify-between rounded-lg border p-3 text-left hover:bg-muted transition-colors"
        onClick={() => setSelected(current => [...current, { document: doc.id, doc_id: doc.doc_id,
          amount: Math.max(0, Math.min(Number(doc.payment_status?.remaining ?? doc.total_amount ?? 0), available-assigned)).toFixed(2) }])}>
        <span><span className="font-medium text-sm">{doc.doc_id}</span><span className="block text-xs text-muted-foreground">{doc.contact_name} · {fmtDate(doc.date)} · Remaining {fmtAmount(doc.payment_status?.remaining ?? doc.total_amount)}</span></span>
        <Plus className="h-4 w-4 shrink-0" />
      </button>)}
      {data?.count === 0 && <p className="text-sm text-muted-foreground">No matching documents.</p>}
      {data && data.count > 20 && <div className="flex justify-between items-center text-sm"><Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p-1)}>Previous</Button><span>Page {page} of {Math.ceil(data.count/20)}</span><Button variant="outline" disabled={!data.next} onClick={() => setPage(p => p+1)}>Next</Button></div>}
    </div>
    <Button className="w-full" disabled={!valid || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : selected.length ? 'Save allocation' : 'Leave payment unallocated'}</Button>
  </div>
}
