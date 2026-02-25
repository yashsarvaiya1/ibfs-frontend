// components/documents/DocumentDetailPage.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import {
  useDocument, useStockPreview,
  useRecordPayment, useDeleteDocument
} from '@/hooks/useDocument'
import { useSettings } from '@/hooks/useSettings'
import { useAccounts } from '@/hooks/useAccount'
import { DOC_TYPE_LABELS, DeleteStrategy } from '@/models/document'
import { fmtAmount, fmtDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  MoreVertical, Banknote, Package,
  Trash2, ExternalLink, TrendingUp, TrendingDown, Plus, X
} from 'lucide-react'
import { toast } from 'sonner'
import { MoveStockSheet } from './MoveStockSheet'

// Safe label lookup
const DOC_LABELS = DOC_TYPE_LABELS as Record<string, string>
const getDocLabel = (t: string | null | undefined) => t ? (DOC_LABELS[t] ?? t) : ''

interface InterestLine { name: string; amount: string; type: 'charge' | 'discount' }

// Outgoing doc types — payment is money OUT (user pays)
const OUTGOING_TYPES = new Set(['bill', 'cn', 'cash_payment_voucher'])

interface Props { id: number }

export function DocumentDetailPage({ id }: Props) {
  const router       = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)

  const { data: doc,          isLoading }  = useDocument(id)
  const { data: stockPreview }             = useStockPreview(id)
  const { data: settings }                 = useSettings()
  const { data: accountsData }             = useAccounts({ is_active: true })
  const accounts = accountsData?.results ?? []

  const recordPayment  = useRecordPayment(id)
  const deleteDocument = useDeleteDocument(id)

  // ── Sheet states ──────────────────────────────────────────────────────────
  const [paymentSheet,   setPaymentSheet]  = useState(false)
  const [moveStockSheet, setMoveStockSheet] = useState(false)
  const [deleteSheet,    setDeleteSheet]   = useState(false)

  // ── Payment form state ────────────────────────────────────────────────────
  const [payAmount,    setPayAmount]   = useState('')
  const [payAccount,   setPayAccount]  = useState('')
  const [payDate,      setPayDate]     = useState(new Date().toISOString().split('T')[0])
  const [payNotes,     setPayNotes]    = useState('')
  const [addInterest,  setAddInterest] = useState(false)
  const [interestLines, setInterestLines] = useState<InterestLine[]>([
    { name: '', amount: '', type: 'charge' }
  ])

  // ── Delete state ──────────────────────────────────────────────────────────
  const [deleteStrategy, setDeleteStrategy] = useState<DeleteStrategy>('revert')

  useEffect(() => {
    if (doc) setPageTitle(`${getDocLabel(doc.type)} #${doc.doc_id}`)
  }, [doc, setPageTitle])

  // Interest line helpers
  const addInterestLine    = () =>
    setInterestLines(p => [...p, { name: '', amount: '', type: 'charge' }])
  const removeInterestLine = (i: number) =>
    setInterestLines(p => p.filter((_, idx) => idx !== i))
  const updateInterestLine = (i: number, f: keyof InterestLine, v: string) =>
    setInterestLines(p => p.map((l, idx) => idx === i ? { ...l, [f]: v } : l))

  // Interest net preview
  const interestNet = interestLines.reduce((s, l) => {
    const amt = Number(l.amount) || 0
    return s + (l.type === 'charge' ? amt : -amt)
  }, 0)

  if (isLoading) return <DocDetailSkeleton />
  if (!doc)      return null

  const txns        = doc.transactions ?? []
  const isOutgoing  = OUTGOING_TYPES.has(doc.type)

  // Paid = sum of actual txns (take absolute value — sign depends on direction)
  const totalPaid   = txns
    .filter(t => t.type === 'actual')
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  const totalAmount = Number(doc.total_amount ?? 0)
  const balance     = totalAmount - totalPaid

  const hasStock       = (stockPreview?.length ?? 0) > 0
  const hasPendingStock = stockPreview?.some(s => Number(s.remaining_qty) > 0)
  const showMoveStock  = hasStock && (!settings?.auto_stock || hasPendingStock)

  // ── Handle payment submit ─────────────────────────────────────────────────
  const handleRecordPayment = async () => {
    if (!payAmount || !payAccount) {
      toast.error('Amount and account required'); return
    }
    const payload: any = {
      amount:          payAmount,
      payment_account: Number(payAccount),
      date:            payDate,
      notes:           payNotes || undefined,
    }
    if (addInterest) {
      const validLines = interestLines.filter(l => l.name && l.amount)
      if (validLines.length > 0) {
        payload.interest_lines = validLines.map(l => ({
          name:   l.name,
          amount: Number(l.amount),
          type:   l.type,
        }))
      }
    }
    try {
      await recordPayment.mutateAsync(payload)
      toast.success('Payment recorded')
      setPaymentSheet(false)
      setPayAmount(''); setPayAccount(''); setPayNotes('')
      setAddInterest(false)
      setInterestLines([{ name: '', amount: '', type: 'charge' }])
    } catch { toast.error('Failed to record payment') }
  }

  const handleDelete = async () => {
    try {
      await deleteDocument.mutateAsync(deleteStrategy)
      toast.success('Document deleted')
      router.back()
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="pb-10">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary">{getDocLabel(doc.type)}</Badge>
              {!doc.is_active && <Badge variant="destructive">Deleted</Badge>}
            </div>
            <h1 className="text-xl font-bold">#{doc.doc_id}</h1>
            <p className="text-sm text-muted-foreground">{fmtDate(doc.date)}</p>
            {doc.due_date && (
              <p className="text-xs text-muted-foreground">Due: {fmtDate(doc.due_date)}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {doc.contact && (
                <DropdownMenuItem onClick={() => router.push(`/contacts/${doc.contact}`)}>
                  <ExternalLink className="mr-2 h-4 w-4" /> View Contact
                </DropdownMenuItem>
              )}
              {doc.is_active && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteSheet(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Document
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Separator />

      {/* ── Payment Summary ─────────────────────────────────────────────── */}
      {doc.total_amount && (
        <div className="px-4 py-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Document Amount</span>
                <span className="font-semibold">{fmtAmount(doc.total_amount)}</span>
              </div>
              {totalPaid > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isOutgoing ? 'Paid' : 'Received'}
                  </span>
                  <span className="text-green-600 font-semibold">
                    −{fmtAmount(totalPaid)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold">Balance Due</span>
                <span className={`font-bold text-base ${balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {balance <= 0 ? '✓ Settled' : fmtAmount(balance)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Action Buttons ──────────────────────────────────────────────── */}
      {doc.is_active && (
        <div className="px-4 pb-4 flex gap-3">
          {balance > 0 && (
            <Button className="flex-1 gap-2" onClick={() => setPaymentSheet(true)}>
              <Banknote className="h-4 w-4" />
              {isOutgoing ? 'Record Payment' : 'Record Receipt'}
            </Button>
          )}
          {showMoveStock && (
            <Button variant="outline" className="flex-1 gap-2"
              onClick={() => setMoveStockSheet(true)}>
              <Package className="h-4 w-4" /> Move Stock
            </Button>
          )}
        </div>
      )}

      <Separator />

      {/* ── Line Items ──────────────────────────────────────────────────── */}
      {doc.line_items.length > 0 && (
        <>
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Items</h2>
          </div>
          <div className="px-4 space-y-2">
            {doc.line_items.map((item, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.name}</p>
                      {item.hsn && (
                        <p className="text-xs text-muted-foreground">HSN: {item.hsn}</p>
                      )}
                    </div>
                    <p className="font-semibold text-sm ml-2">
                      {item.amount ? fmtAmount(item.amount) : '—'}
                    </p>
                  </div>
                  {(item.quantity || item.rate) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.quantity} × ₹{item.rate}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
            {doc.charges.map((c, i) => (
              <div key={i} className="flex justify-between text-sm px-1">
                <span className="text-muted-foreground">{c.name}</span>
                <span>+{fmtAmount(c.amount)}</span>
              </div>
            ))}
            {Number(doc.discount) > 0 && (
              <div className="flex justify-between text-sm px-1 text-green-600">
                <span>Discount</span>
                <span>−{fmtAmount(doc.discount)}</span>
              </div>
            )}
            {doc.taxes.map((t, i) => (
              <div key={i} className="flex justify-between text-sm px-1">
                <span className="text-muted-foreground">{t.name} ({t.percentage}%)</span>
                <span>+{fmtAmount((Number(doc.total_amount ?? 0) * t.percentage) / 100)}</span>
              </div>
            ))}
          </div>
          <Separator className="mt-4" />
        </>
      )}

      {/* ── Stock Preview ────────────────────────────────────────────────── */}
      {hasStock && (
        <>
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Stock
            </h2>
          </div>
          <div className="px-4 space-y-2 pb-4">
            {stockPreview!.map((s) => (
              <Card key={s.product_id}>
                <CardContent className="p-3">
                  <p className="font-medium text-sm">{s.product_name}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    <span>Expected: {s.record_qty}</span>
                    <span>Moved: {s.moved_qty}</span>
                    <span className={
                      Number(s.remaining_qty) > 0
                        ? 'text-orange-500 font-semibold'
                        : 'text-green-500 font-semibold'
                    }>
                      {Number(s.remaining_qty) > 0
                        ? `Pending: ${s.remaining_qty}`
                        : '✓ Done'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Separator />
        </>
      )}

      {/* ── Transaction History ──────────────────────────────────────────── */}
      {txns.length > 0 && (
        <>
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Transactions
            </h2>
          </div>
          <div className="px-4 space-y-2 pb-4">
            {/* Record first, then actuals — sorted by type then date */}
            {[...txns]
              .sort((a, b) => {
                // record before actual, then by date
                if (a.type !== b.type) return a.type === 'record' ? -1 : 1
                return new Date(a.date).getTime() - new Date(b.date).getTime()
              })
              .map((txn) => {
                const amt = Number(txn.amount)
                return (
                  <Card key={txn.id}>
                    <CardContent className="p-3 flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge
                            variant={txn.type === 'actual' ? 'default' : 'secondary'}
                            className="text-[10px] h-4 capitalize"
                          >
                            {txn.type}
                          </Badge>
                          {txn.payment_account && (
                            <span className="text-[10px] text-muted-foreground">
                              via account #{txn.payment_account}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{fmtDate(txn.date)}</p>
                        {txn.notes && (
                          <p className="text-xs text-muted-foreground truncate">{txn.notes}</p>
                        )}
                      </div>
                      <p className={`font-bold text-sm ml-3 ${amt >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {amt >= 0 ? '+' : ''}{fmtAmount(amt)}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </>
      )}

      {doc.notes && (
        <div className="px-4 pt-2 pb-4">
          <p className="text-xs text-muted-foreground">Note: {doc.notes}</p>
        </div>
      )}

      {/* ── Record Payment Sheet ─────────────────────────────────────────── */}
      <Sheet open={paymentSheet} onOpenChange={setPaymentSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[92vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">
              {isOutgoing ? 'Record Payment' : 'Record Receipt'}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">

            {/* Amount */}
            <div className="space-y-1.5">
              <Label>
                {isOutgoing ? 'Amount Paid' : 'Amount Received'}
                <span className="text-xs text-muted-foreground ml-2 font-normal">
                  total money exchanged
                </span>
              </Label>
              <Input
                type="number"
                placeholder={balance > 0 ? `Balance: ₹${balance.toFixed(2)}` : '0.00'}
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                className="text-lg h-12"
              />
            </div>

            {/* Account */}
            <div className="space-y-1.5">
              <Label>Account <span className="text-destructive">*</span></Label>
              <Select value={payAccount || '__none__'} onValueChange={v => setPayAccount(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.name} — {a.type} — {fmtAmount(a.current_balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder="e.g. Partial payment"
                value={payNotes}
                onChange={e => setPayNotes(e.target.value)}
              />
            </div>

            {/* ── Interest toggle ────────────────────────────────────────── */}
            <div
              onClick={() => setAddInterest(v => !v)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer
                ${addInterest ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}`}
            >
              <Checkbox
                checked={addInterest}
                onCheckedChange={(v) => setAddInterest(!!v)}
                onClick={e => e.stopPropagation()}
              />
              <div>
                <p className="text-sm font-medium">Add Interest / Adjustment</p>
                <p className="text-xs text-muted-foreground">
                  Creates a separate record — does not change payment amount above
                </p>
              </div>
            </div>

            {/* Interest lines */}
            {addInterest && (
              <div className="space-y-3 rounded-xl border p-3 bg-muted/20">
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5">
                  <span className="mt-0.5">💡</span>
                  <span>
                    <strong>Charge</strong> = extra owed (late fee, penalty) ·{' '}
                    <strong>Discount</strong> = amount waived
                  </span>
                </div>

                {interestLines.map((line, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="e.g. Late fee"
                        className="flex-1 text-sm"
                        value={line.name}
                        onChange={e => updateInterestLine(i, 'name', e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="₹"
                        className="w-28 text-sm"
                        value={line.amount}
                        onChange={e => updateInterestLine(i, 'amount', e.target.value)}
                      />
                      {interestLines.length > 1 && (
                        <button onClick={() => removeInterestLine(i)}>
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateInterestLine(i, 'type', 'charge')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors
                          ${line.type === 'charge'
                            ? 'bg-red-50 border-red-300 text-red-600'
                            : 'bg-muted border-border text-muted-foreground'}`}
                      >
                        <TrendingUp className="h-3 w-3" /> Charge
                      </button>
                      <button
                        onClick={() => updateInterestLine(i, 'type', 'discount')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors
                          ${line.type === 'discount'
                            ? 'bg-green-50 border-green-300 text-green-600'
                            : 'bg-muted border-border text-muted-foreground'}`}
                      >
                        <TrendingDown className="h-3 w-3" /> Discount
                      </button>
                    </div>
                  </div>
                ))}

                <Button variant="ghost" size="sm" className="gap-1 h-7" onClick={addInterestLine}>
                  <Plus className="h-3.5 w-3.5" /> Add Line
                </Button>

                {/* Net preview */}
                {interestNet !== 0 && Number(payAmount) > 0 && (
                  <div className="text-xs text-muted-foreground pt-1 border-t space-y-1">
                    <div className="flex justify-between">
                      <span>Interest record ({isOutgoing ? 'send' : 'receive'})</span>
                      <span className={interestNet > 0 && !isOutgoing ? 'text-red-500' : 'text-green-600'}>
                        {isOutgoing
                          ? (interestNet >= 0 ? `+${fmtAmount(interestNet)}` : `${fmtAmount(interestNet)}`)
                          : (interestNet >= 0 ? `−${fmtAmount(interestNet)}` : `+${fmtAmount(Math.abs(interestNet))}`)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full h-12"
              onClick={handleRecordPayment}
              disabled={recordPayment.isPending}
            >
              {recordPayment.isPending ? 'Recording...' : isOutgoing ? 'Confirm Payment' : 'Confirm Receipt'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Move Stock Sheet ─────────────────────────────────────────────── */}
      {moveStockSheet && (
        <MoveStockSheet
          docId={id}
          stockPreview={stockPreview ?? []}
          open={moveStockSheet}
          onClose={() => setMoveStockSheet(false)}
        />
      )}

      {/* ── Delete Sheet ─────────────────────────────────────────────────── */}
      <Sheet open={deleteSheet} onOpenChange={setDeleteSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left text-destructive">Delete Document</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose how to handle existing transactions linked to this document.
            </p>
            <div className="space-y-2">
              {([
                {
                  value: 'revert',
                  label: 'Revert & Delete',
                  desc:  'Delete all linked transactions and reverse account balances'
                },
                {
                  value: 'manual',
                  label: 'Keep as Manual',
                  desc:  'Keep transactions but unlink from document — become standalone entries'
                },
                {
                  value: 'orphan',
                  label: 'Keep as Orphan',
                  desc:  'Keep all records as-is, just mark document deleted'
                },
              ] as { value: DeleteStrategy; label: string; desc: string }[]).map(opt => (
                <div
                  key={opt.value}
                  onClick={() => setDeleteStrategy(opt.value)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                    deleteStrategy === opt.value
                      ? 'border-destructive bg-destructive/5'
                      : 'border-border bg-background'
                  }`}
                >
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </div>
              ))}
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDelete}
              disabled={deleteDocument.isPending}
            >
              {deleteDocument.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function DocDetailSkeleton() {
  return (
    <div className="px-4 py-4 space-y-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
    </div>
  )
}
