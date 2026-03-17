'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import {
  useDocument, useStockPreview,
  useRecordPayment, useDeleteDocument, useMarkPaid,
} from '@/hooks/useDocument'
import { DOC_TYPE_LABELS, DeleteStrategy } from '@/models/document'
import { useDeleteTransaction } from '@/hooks/useTransaction'
import { useAccounts } from '@/hooks/useAccount'
import { fmtAmount, fmtDate, cn } from '@/lib/utils'
import { getMediaUrl, isImagePath, isPdfPath, getFileName } from '@/lib/media'
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
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuSeparator,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreVertical, Banknote, Package, Trash2,
  ExternalLink, TrendingUp, TrendingDown,
  Plus, X, FileText, Printer, Edit,
  CheckCircle2, Tag, Clock, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { MoveStockSheet }   from './MoveStockSheet'
import { TransactionCard }  from '@/components/shared/TransactionCard'
import { FilePreviewSheet } from '@/components/shared/FilePreviewSheet'

const DOC_LABELS  = DOC_TYPE_LABELS as Record<string, string>
const getDocLabel = (t: string | null | undefined) => t ? (DOC_LABELS[t] ?? t) : ''

interface InterestLine { name: string; amount: string; type: 'charge' | 'discount' }

// Types that have payment tracking (record f.txn created)
const PAYMENT_DOC_TYPES = new Set([
  'bill', 'invoice', 'cn', 'dn',
  'cash_payment_voucher', 'cash_receipt_voucher',
])
// Types where Record Payment button is shown
const RECORDABLE_TYPES = new Set(['bill', 'invoice', 'cn', 'dn'])
// Types where is_paid toggle makes sense
const MARK_PAID_TYPES  = new Set(['bill', 'invoice', 'cn', 'dn', 'po', 'pi', 'quotation'])
const OUTGOING_TYPES   = new Set(['bill', 'cn', 'cash_payment_voucher'])

interface Props { id: number }

export function DocumentDetailPage({ id }: Props) {
  const router       = useRouter()
  const setPageTitle = useUIStore(s => s.setPageTitle)

  const { data: doc,         isLoading } = useDocument(id)
  const { data: stockPreview }           = useStockPreview(id)
  const { data: accountsData }           = useAccounts({ is_active: true })
  const accounts = accountsData?.results ?? []

  const recordPayment     = useRecordPayment(id)
  const deleteDocument    = useDeleteDocument(id)
  const deleteTxnMutation = useDeleteTransaction()
  const markPaidMutation  = useMarkPaid(id)   // ✅ added

  const [paymentSheet,   setPaymentSheet]   = useState(false)
  const [moveStockSheet, setMoveStockSheet] = useState(false)
  const [deleteSheet,    setDeleteSheet]    = useState(false)
  const [previewOpen,    setPreviewOpen]    = useState(false)
  const [previewIndex,   setPreviewIndex]   = useState(0)

  const [payAmount,     setPayAmount]     = useState('')
  const [payAccount,    setPayAccount]    = useState('')
  const [payDate,       setPayDate]       = useState(new Date().toISOString().split('T')[0])
  const [payNotes,      setPayNotes]      = useState('')
  const [addInterest,   setAddInterest]   = useState(false)
  const [interestLines, setInterestLines] = useState<InterestLine[]>([
    { name: '', amount: '', type: 'charge' },
  ])
  const [deleteStrategy, setDeleteStrategy] = useState<DeleteStrategy>('revert')

  useEffect(() => {
    if (doc) setPageTitle(`${getDocLabel(doc.type)} #${doc.doc_id}`)
  }, [doc?.id, doc?.doc_id, doc?.type, setPageTitle])

  const addInterestLine    = () => setInterestLines(p => [...p, { name: '', amount: '', type: 'charge' }])
  const removeInterestLine = (i: number) => setInterestLines(p => p.filter((_, idx) => idx !== i))
  const updateInterestLine = (i: number, f: keyof InterestLine, v: string) =>
    setInterestLines(p => p.map((l, idx) => idx === i ? { ...l, [f]: v } : l))

  const interestNet = interestLines.reduce((s, l) => {
    const amt = Number(l.amount) || 0
    return s + (l.type === 'charge' ? amt : -amt)
  }, 0)

  if (isLoading) return <DocDetailSkeleton />
  if (!doc)      return null

  const txns         = doc.transactions ?? []
  const isOutgoing   = OUTGOING_TYPES.has(doc.type)
  const isPayable    = PAYMENT_DOC_TYPES.has(doc.type)
  const isRecordable = RECORDABLE_TYPES.has(doc.type)
  const canMarkPaid  = MARK_PAID_TYPES.has(doc.type)

  // ✅ Use backend payment_status if available — most accurate
  const payStatus   = isPayable ? (doc.payment_status ?? null) : null
  // remaining from backend (string), fallback to manual calc
  const remaining   = payStatus ? Number(payStatus.remaining ?? 0) : 0
  const totalAmount = Number(doc.total_amount ?? 0)

  // ✅ is_paid: either backend auto-set (txn settled) OR manual flag
  const txnPaid    = payStatus?.is_paid ?? false   // auto from transactions
  const manualPaid = doc.is_paid ?? false           // manual toggle
  const isFullyPaid = txnPaid || manualPaid

  // ✅ balance for display — use remaining from payment_status, not raw txn calc
  const balance    = isPayable ? Math.max(0, remaining) : 0
  const totalPaid  = txns
    .filter(t => t.type === 'actual')
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)

  const lineItems      = doc.line_items      ?? []
  const charges        = doc.charges         ?? []
  const taxes          = doc.taxes           ?? []
  const attachmentUrls = doc.attachment_urls ?? []

  const lineSubtotal = lineItems.reduce((s, l) => s + (Number(l.amount) || 0), 0)
  const chargeTotal  = charges.reduce((s, c)   => s + (Number(c.amount) || 0), 0)
  const taxBase      = lineSubtotal + chargeTotal - Number(doc.discount ?? 0)

  // ✅ Move Stock: only when there are items with remaining > 0
  const hasStock      = (stockPreview?.length ?? 0) > 0
  const hasPending    = stockPreview?.some(s => Number(s.remaining_qty) > 0) ?? false

  const payAmountNum        = Number(payAmount) || 0
  const originalDebtSettled = payAmountNum - interestNet

  const handleOpenPaymentSheet = () => {
    setPayAmount(balance > 0 ? balance.toFixed(2) : '')
    setPayDate(new Date().toISOString().split('T')[0])
    setPayNotes(''); setPayAccount('')
    setAddInterest(false)
    setInterestLines([{ name: '', amount: '', type: 'charge' }])
    setPaymentSheet(true)
  }

  const handleRecordPayment = async () => {
    if (!payAmount || !payAccount) { toast.error('Amount and account required'); return }
    const payload: Parameters<typeof recordPayment.mutateAsync>[0] = {
      amount:          payAmount,
      payment_account: Number(payAccount),
      date:            payDate,
      notes:           payNotes || undefined,
    }
    if (addInterest) {
      const validLines = interestLines.filter(l => l.name && l.amount)
      if (validLines.length > 0) {
        payload.interest_lines = validLines.map(l => ({
          name: l.name, amount: Number(l.amount), type: l.type,
        }))
      }
    }
    try {
      await recordPayment.mutateAsync(payload)
      toast.success('Payment recorded')
      setPaymentSheet(false)
    } catch { toast.error('Failed to record payment') }
  }

  // ✅ Mark Paid toggle — just flips is_paid flag, no transaction
  const handleToggleMarkPaid = async () => {
    try {
      await markPaidMutation.mutateAsync({ is_paid: !doc.is_paid })
      toast.success(!doc.is_paid ? 'Marked as paid' : 'Marked as unpaid')
    } catch { toast.error('Failed to update') }
  }

  const handleDelete = async () => {
    try {
      await deleteDocument.mutateAsync({ strategy: deleteStrategy })
      toast.success('Document deleted')
      router.back()
    } catch { toast.error('Failed to delete') }
  }

  const handleDeleteTxn = (txnId: number) => {
    toast('Delete this transaction?', {
      description: 'This will revert the account balance.',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await deleteTxnMutation.mutateAsync(txnId)
            toast.success('Transaction deleted')
          } catch { toast.error('Failed to delete transaction') }
        },
      },
      cancel: { label: 'Cancel', onClick: () => {} },
    })
  }

  // ✅ Payment status badge
  const PayStatusBadge = () => {
    if (!isPayable) return null
    if (isFullyPaid) return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold rounded-md">
        <CheckCircle2 className="h-3 w-3" />
        {manualPaid && !txnPaid ? 'Marked Paid' : 'Paid'}
      </Badge>
    )
    if (balance > 0 && balance < totalAmount) return (
      <Badge className="gap-1 bg-amber-100 text-amber-700 border-amber-200 font-semibold rounded-md">
        <Clock className="h-3 w-3" /> Partial
      </Badge>
    )
    if (balance >= totalAmount && totalAmount > 0) return (
      <Badge className="gap-1 bg-rose-100 text-rose-700 border-rose-200 font-semibold rounded-md">
        <AlertCircle className="h-3 w-3" /> Unpaid
      </Badge>
    )
    return null
  }

  return (
    <div className="pb-10">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="secondary" className="rounded-md uppercase tracking-wider text-[10px]">
                {getDocLabel(doc.type)}
              </Badge>
              <PayStatusBadge />
              {!doc.is_active && (
                <Badge variant="destructive" className="rounded-md">Deleted</Badge>
              )}
            </div>
            <h1 className="text-2xl font-black text-foreground/90 tracking-tight">#{doc.doc_id}</h1>
            <p className="text-sm font-medium text-muted-foreground mt-0.5">{fmtDate(doc.date)}</p>
            {doc.due_date && (
              <p className="text-xs text-muted-foreground/80 mt-0.5">Due: {fmtDate(doc.due_date)}</p>
            )}
            {doc.payment_terms && (
              <p className="text-xs text-muted-foreground/80 mt-0.5">Terms: {doc.payment_terms}</p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {doc.is_active && (
              <Button
                variant="outline" size="sm"
                className="h-9 px-3 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 gap-1.5"
                onClick={() => router.push(`/documents/${doc.id}/edit`)}
              >
                <Edit className="h-4 w-4" /> Edit
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 bg-muted/50 -mr-2">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => router.push(`/documents/${doc.id}/print`)}>
                  <Printer className="mr-2 h-4 w-4" /> Print / Download PDF
                </DropdownMenuItem>
                {doc.is_active && (
                  <DropdownMenuItem onClick={() => router.push(`/documents/${doc.id}/edit`)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Details
                  </DropdownMenuItem>
                )}
                {/* ✅ Mark Paid quick action in dropdown */}
                {doc.is_active && canMarkPaid && !isFullyPaid && (
                  <DropdownMenuItem onClick={handleToggleMarkPaid} disabled={markPaidMutation.isPending}>
                    <Tag className="mr-2 h-4 w-4" /> Mark as Paid
                  </DropdownMenuItem>
                )}
                {doc.is_active && canMarkPaid && isFullyPaid && manualPaid && (
                  <DropdownMenuItem onClick={handleToggleMarkPaid} disabled={markPaidMutation.isPending}>
                    <Tag className="mr-2 h-4 w-4" /> Unmark Paid
                  </DropdownMenuItem>
                )}
                {doc.contact && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push(`/contacts/${doc.contact}`)}>
                      <ExternalLink className="mr-2 h-4 w-4" /> View Contact
                    </DropdownMenuItem>
                  </>
                )}
                {doc.reference && (
                  <DropdownMenuItem onClick={() => router.push(`/documents/${doc.reference}`)}>
                    <ExternalLink className="mr-2 h-4 w-4" /> View Reference
                  </DropdownMenuItem>
                )}
                {doc.is_active && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteSheet(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Document
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Attachments */}
        {attachmentUrls.length > 0 && (
          <div className="mt-4 space-y-2">
            {attachmentUrls.some(p => isImagePath(p)) && (
              <div className="flex flex-wrap gap-2">
                {attachmentUrls.map((path, idx) => {
                  if (!isImagePath(path)) return null
                  return (
                    <button key={idx} type="button"
                      onClick={() => { setPreviewIndex(idx); setPreviewOpen(true) }}
                      className="w-20 h-20 rounded-xl overflow-hidden border border-border/60 bg-muted shrink-0 hover:opacity-90 transition-opacity"
                    >
                      <Image src={getMediaUrl(path)} alt={`attachment ${idx + 1}`}
                        width={80} height={80} className="w-full h-full object-cover" unoptimized />
                    </button>
                  )
                })}
              </div>
            )}
            {attachmentUrls.map((path, idx) => {
              if (isImagePath(path)) return null
              return (
                <button key={idx} type="button"
                  onClick={() => { setPreviewIndex(idx); setPreviewOpen(true) }}
                  className="w-full flex items-center gap-3 h-11 px-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors text-left"
                >
                  <FileText className={cn('h-4 w-4 shrink-0', isPdfPath(path) ? 'text-red-500' : 'text-primary')} />
                  <span className="text-sm font-medium text-foreground/80 truncate flex-1">{getFileName(path)}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      <Separator />

      {/* ── Payment Summary ──────────────────────────────────────────────────── */}
      {totalAmount > 0 && (
        <div className="px-4 py-4">
          <Card className="rounded-xl shadow-sm border-border/80">
            <CardContent className="p-4 space-y-2.5">
              <div className="flex justify-between text-sm font-medium text-muted-foreground">
                <span>Total Amount</span>
                <span className="text-foreground font-semibold">{fmtAmount(doc.total_amount)}</span>
              </div>
              {isPayable && totalPaid > 0 && (
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-muted-foreground">{isOutgoing ? 'Paid' : 'Received'}</span>
                  <span className="text-emerald-600">−{fmtAmount(totalPaid)}</span>
                </div>
              )}
              {isPayable && (
                <>
                  <Separator className="my-1" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground/80 uppercase tracking-wider text-xs">
                      Balance Due
                    </span>
                    <span className={cn('font-black text-lg',
                      isFullyPaid ? 'text-emerald-600'
                        : balance < totalAmount && balance > 0 ? 'text-amber-600'
                        : 'text-red-600'
                    )}>
                      {isFullyPaid ? '✓ Settled' : fmtAmount(balance)}
                    </span>
                  </div>
                </>
              )}

              {/* ✅ Mark Paid toggle inline in summary card */}
              {doc.is_active && canMarkPaid && (
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-foreground/80">Mark as Paid</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {manualPaid
                          ? 'Manually marked — no transaction created'
                          : txnPaid
                          ? 'Auto-settled from transactions'
                          : 'Flag as paid without recording a transaction'}
                      </p>
                    </div>
                    {txnPaid ? (
                      // Auto-settled, show read-only
                      <Badge className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" /> Auto Settled
                      </Badge>
                    ) : (
                      <button
                        onClick={handleToggleMarkPaid}
                        disabled={markPaidMutation.isPending}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                          manualPaid
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                        )}
                      >
                        <Tag className="h-3.5 w-3.5" />
                        {markPaidMutation.isPending ? '...' : manualPaid ? 'Unmark' : 'Mark Paid'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Action Buttons ───────────────────────────────────────────────────── */}
      {doc.is_active && (
        <div className="px-4 pb-4 flex gap-3">
          {/* ✅ Show Record Payment only when balance > 0 AND not manually settled */}
          {isRecordable && balance > 0 && !isFullyPaid && (
            <Button
              className="flex-1 h-12 gap-2 rounded-xl shadow-md shadow-primary/20"
              onClick={handleOpenPaymentSheet}
            >
              <Banknote className="h-4 w-4" />
              {isOutgoing ? 'Record Payment' : 'Record Receipt'}
            </Button>
          )}
          {/* ✅ Move Stock: only when pending qty exists */}
          {hasStock && hasPending && (
            <Button
              variant="outline"
              className="flex-1 h-12 gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => setMoveStockSheet(true)}
            >
              <Package className="h-4 w-4" /> Move Stock
            </Button>
          )}
        </div>
      )}

      <Separator />

      {/* ── Line Items ───────────────────────────────────────────────────────── */}
      {lineItems.length > 0 && (
        <>
          <div className="px-4 pt-5 pb-2">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Items</h2>
          </div>
          <div className="px-4 space-y-2.5">
            {lineItems.map((item, i) => (
              <Card key={i} className="rounded-xl shadow-sm border-border/60">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight text-foreground/90">{item.name}</p>
                      {item.hsn && (
                        <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider mt-1">
                          HSN: {item.hsn}
                        </p>
                      )}
                    </div>
                    <p className="font-bold text-sm ml-3 shrink-0">
                      {item.amount ? fmtAmount(item.amount) : '—'}
                    </p>
                  </div>
                  {(item.quantity != null || item.rate != null) && (
                    <p className="text-xs text-muted-foreground font-medium mt-1.5 bg-muted/40 inline-block px-2 py-0.5 rounded-md">
                      {item.quantity} × ₹{item.rate}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="pt-2 px-1 space-y-2">
              {charges.map((c, i) => (
                <div key={i} className="flex justify-between text-sm font-medium">
                  <span className="text-muted-foreground">{c.name}</span>
                  <span>+{fmtAmount(c.amount)}</span>
                </div>
              ))}
              {Number(doc.discount) > 0 && (
                <div className="flex justify-between text-sm font-medium text-emerald-600">
                  <span>Discount</span>
                  <span>−{fmtAmount(doc.discount)}</span>
                </div>
              )}
              {taxes.map((t, i) => (
                <div key={i} className="flex justify-between text-sm font-medium">
                  <span className="text-muted-foreground">{t.name} ({t.percentage}%)</span>
                  <span>+{fmtAmount((taxBase * t.percentage) / 100)}</span>
                </div>
              ))}
            </div>
          </div>
          <Separator className="mt-5" />
        </>
      )}

      {/* ── Stock Movements ──────────────────────────────────────────────────── */}
      {hasStock && (
        <>
          <div className="px-4 pt-5 pb-2">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Stock Movements
            </h2>
          </div>
          <div className="px-4 space-y-2.5 pb-4">
            {stockPreview!.map(s => {
              const remaining = Number(s.remaining_qty)
              const isDone    = remaining === 0
              return (
                <Card key={s.product_id} className="rounded-xl shadow-sm border-border/60">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-sm text-foreground/90">{s.product_name}</p>
                      {isDone && (
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 ml-2 shrink-0">
                          ✓ Done
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground font-medium">
                      <span className="bg-muted/50 px-1.5 py-0.5 rounded">
                        Expected: <strong>{s.record_qty}</strong>
                      </span>
                      <span className="bg-muted/50 px-1.5 py-0.5 rounded">
                        Moved: <strong>{s.moved_qty}</strong>
                      </span>
                      {!isDone && (
                        <span className="bg-orange-100/60 text-orange-600 px-1.5 py-0.5 rounded-md">
                          Pending: <strong>{s.remaining_qty}</strong>
                        </span>
                      )}
                    </div>
                    {/* ✅ Per-product move button */}
                    {doc.is_active && !isDone && (
                      <Button
                        variant="outline" size="sm"
                        className="mt-2.5 h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 rounded-lg"
                        onClick={() => setMoveStockSheet(true)}
                      >
                        <Package className="h-3.5 w-3.5" /> Move Stock
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <Separator />
        </>
      )}

      {/* ── Transaction History ───────────────────────────────────────────────── */}
      {txns.length > 0 && (
        <>
          <div className="px-4 pt-5 pb-2">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Ledger Transactions
            </h2>
          </div>
          <div className="px-4 space-y-2.5 pb-4">
            {[...txns]
              .sort((a, b) => {
                if (a.type !== b.type) return a.type === 'record' ? -1 : 1
                return new Date(a.date).getTime() - new Date(b.date).getTime()
              })
              .map(txn => (
                <TransactionCard
                  key={txn.id} txn={txn}
                  showContact={false} onDelete={handleDeleteTxn}
                />
              ))}
          </div>
        </>
      )}

      {doc.notes && (
        <div className="px-4 pt-4 pb-6">
          <div className="bg-muted/30 border border-muted p-3 rounded-xl">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Internal Note
            </p>
            <p className="text-sm font-medium text-foreground/80">{doc.notes}</p>
          </div>
        </div>
      )}

      {/* ── Record Payment Sheet ─────────────────────────────────────────────── */}
      <Sheet open={paymentSheet} onOpenChange={setPaymentSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[92vh] overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left">
              {isOutgoing ? 'Record Payment' : 'Record Receipt'}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                {isOutgoing ? 'Amount Paid' : 'Amount Received'}
                <span className="text-xs text-muted-foreground ml-2 font-normal">total money exchanged</span>
              </Label>
              <Input
                type="number"
                placeholder={balance > 0 ? `Balance: ₹${balance.toFixed(2)}` : '0.00'}
                value={payAmount} onChange={e => setPayAmount(e.target.value)}
                className="text-lg h-12 rounded-xl font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Account <span className="text-destructive">*</span></Label>
              <Select
                value={payAccount || '__none__'}
                onValueChange={v => setPayAccount(v === '__none__' ? '' : v)}
              >
                <SelectTrigger className="h-11 rounded-xl font-medium">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name} — {a.type} — {fmtAmount(a.current_balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                className="h-11 rounded-xl font-medium" />
            </div>

            <div className="space-y-1.5">
              <Label>Notes <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span></Label>
              <Input placeholder="e.g. Partial payment via UPI" value={payNotes}
                onChange={e => setPayNotes(e.target.value)} className="h-11 rounded-xl" />
            </div>

            {/* Interest / Adjustment */}
            <div
              onClick={() => setAddInterest(v => !v)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer',
                addInterest ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-muted/30 hover:bg-muted/50'
              )}
            >
              <Checkbox checked={addInterest} onCheckedChange={v => setAddInterest(!!v)}
                onClick={e => e.stopPropagation()} />
              <div>
                <p className="text-sm font-semibold text-foreground/90">Add Interest / Adjustment</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                  Creates a separate record — does not change payment amount above
                </p>
              </div>
            </div>

            {addInterest && (
              <div className="space-y-3 rounded-xl border p-3 bg-muted/20">
                <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                  <span className="mt-0.5">💡</span>
                  <span className="leading-tight">
                    <strong>Charge</strong> = extra owed (late fee, penalty)<br />
                    <strong>Discount</strong> = amount waived (early payment)
                  </span>
                </div>
                {interestLines.map((line, i) => (
                  <div key={i} className="space-y-2 pb-2 border-b border-border/50 last:border-0 last:pb-0">
                    <div className="flex gap-2 items-center">
                      <Input placeholder="e.g. Late fee" className="flex-1 text-sm h-10 rounded-lg"
                        value={line.name} onChange={e => updateInterestLine(i, 'name', e.target.value)} />
                      <Input type="number" placeholder="₹" className="w-24 text-sm h-10 font-bold rounded-lg"
                        value={line.amount} onChange={e => updateInterestLine(i, 'amount', e.target.value)} />
                      {interestLines.length > 1 && (
                        <button onClick={() => removeInterestLine(i)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(['charge', 'discount'] as const).map(type => (
                        <button key={type} onClick={() => updateInterestLine(i, 'type', type)}
                          className={cn(
                            'flex flex-1 justify-center items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                            line.type === type
                              ? type === 'charge'
                                ? 'bg-red-50 border-red-300 text-red-600 shadow-sm'
                                : 'bg-emerald-50 border-emerald-300 text-emerald-600 shadow-sm'
                              : 'bg-muted border-transparent text-muted-foreground hover:bg-muted/70'
                          )}>
                          {type === 'charge'
                            ? <><TrendingUp className="h-3.5 w-3.5" /> Charge</>
                            : <><TrendingDown className="h-3.5 w-3.5" /> Discount</>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm"
                  className="w-full gap-1 h-8 rounded-lg text-xs font-semibold bg-background border border-dashed"
                  onClick={addInterestLine}>
                  <Plus className="h-3 w-3" /> Add Another Line
                </Button>
                {payAmountNum > 0 && (
                  <div className="pt-3 border-t space-y-2 text-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Payment Preview
                    </p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isOutgoing ? 'Payment Sent' : 'Payment Received'}</span>
                      <span className="font-medium">{fmtAmount(payAmountNum)}</span>
                    </div>
                    {interestLines.filter(l => l.name && Number(l.amount) > 0).map((l, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          {l.name}
                          <Badge variant="outline" className={cn('text-[10px] h-4',
                            l.type === 'charge' ? 'text-red-600 border-red-200' : 'text-green-600 border-green-200')}>
                            {l.type}
                          </Badge>
                        </span>
                        <span className={l.type === 'charge' ? 'text-red-500' : 'text-green-600'}>
                          {l.type === 'charge' ? '+' : '−'}{fmtAmount(Number(l.amount))}
                        </span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Original Debt Settled</span>
                      <span className="text-primary">{fmtAmount(Math.max(0, originalDebtSettled))}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20"
              onClick={handleRecordPayment} disabled={recordPayment.isPending}>
              {recordPayment.isPending ? 'Recording...' : isOutgoing ? 'Confirm Payment' : 'Confirm Receipt'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Move Stock Sheet — always mounted, open controlled ───────────────── */}
      <MoveStockSheet
        docId={id}
        stockPreview={stockPreview ?? []}
        open={moveStockSheet}
        onClose={() => setMoveStockSheet(false)}
      />

      {/* ── Delete Sheet ──────────────────────────────────────────────────────── */}
      <Sheet open={deleteSheet} onOpenChange={setDeleteSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left text-destructive font-black">Delete Document</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <p className="text-[13px] font-medium text-muted-foreground/80 leading-relaxed bg-muted/30 p-3 rounded-xl border border-muted">
              Choose how to handle existing transactions linked to this document.
            </p>
            <div className="space-y-2">
              {([
                { value: 'revert' as DeleteStrategy, label: 'Revert & Delete',
                  desc: 'Hard-delete all linked transactions and reverse account & stock balances' },
                { value: 'manual' as DeleteStrategy, label: 'Keep as Manual',
                  desc: 'Delete record txns only — keep actual txns as standalone entries' },
              ]).map(opt => (
                <div key={opt.value} onClick={() => setDeleteStrategy(opt.value)}
                  className={cn('w-full text-left p-4 rounded-xl border transition-all cursor-pointer',
                    deleteStrategy === opt.value
                      ? 'border-destructive bg-destructive/5 shadow-sm'
                      : 'border-border bg-background hover:bg-muted/30')}>
                  <p className={cn('font-bold text-sm',
                    deleteStrategy === opt.value ? 'text-destructive' : 'text-foreground')}>
                    {opt.label}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-1 leading-tight">{opt.desc}</p>
                </div>
              ))}
            </div>
            <Button variant="destructive"
              className="w-full h-12 font-bold rounded-xl shadow-lg shadow-destructive/20"
              onClick={handleDelete} disabled={deleteDocument.isPending}>
              {deleteDocument.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <FilePreviewSheet
        open={previewOpen} onClose={() => setPreviewOpen(false)}
        files={attachmentUrls} initialIndex={previewIndex}
      />
    </div>
  )
}

function DocDetailSkeleton() {
  return (
    <div className="px-4 py-6 space-y-4">
      <Skeleton className="h-6 w-32 rounded-lg" />
      <Skeleton className="h-10 w-48 rounded-xl" />
      <Skeleton className="h-32 rounded-xl mt-4" />
      <div className="flex gap-3 mt-4">
        <Skeleton className="h-12 flex-1 rounded-xl" />
        <Skeleton className="h-12 flex-1 rounded-xl" />
      </div>
    </div>
  )
}
