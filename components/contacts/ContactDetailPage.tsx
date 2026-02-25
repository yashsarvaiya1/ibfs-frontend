// components/contacts/ContactDetailPage.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useContact, useContactLedger } from '@/hooks/useContact'
import { useDocuments } from '@/hooks/useDocument'
import { useAccounts } from '@/hooks/useAccount'
import { useUpdateTransaction, useDeleteTransaction } from '@/hooks/useTransaction'
import { getContactDisplayName } from '@/models/contact'
import { FinancialTransaction } from '@/models/transaction'
import { cfColor, fmtAmount, fmtDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from '@/components/ui/sheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowUpRight, ArrowDownLeft, ChevronRight,
  Phone, Building2, MapPin, FileText, MoreVertical,
  TrendingUp, TrendingDown, Minus, Trash2, Pencil
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ContactEditSheet } from './ContactEditSheet'
import { SendReceiveSheet } from './SendReceiveSheet'
import { DOC_TYPE_LABELS } from '@/models/document'
import { SearchableSelect, SearchableSelectOption } from '@/components/shared/SearchableSelect'
import { toast } from 'sonner'

// ─── Safe label lookup ────────────────────────────────────────────────────────
const DOC_LABELS = DOC_TYPE_LABELS as Record<string, string>
const getDocLabel = (t: string | null | undefined): string =>
  t ? (DOC_LABELS[t] ?? t) : ''

// ─── CF Calculation ───────────────────────────────────────────────────────────
function computeRunningCF(openingBalance: number, txns: any[]): number {
  if (txns.length === 0) return openingBalance
  const monthMap = new Map<string, number>()
  for (const t of txns) {
    if (t.document_type === 'expense') continue
    const key = (t.date as string).slice(0, 7)
    monthMap.set(key, Number(t.monthly_cumulative_delta))
  }
  const monthlySum = Array.from(monthMap.values()).reduce((s, v) => s + v, 0)
  return openingBalance + monthlySum
}

interface Props { id: number }

export function ContactDetailPage({ id }: Props) {
  const router       = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  const openDocSheet = useUIStore((s) => s.openDocCreateSheet)

  const { data: contact, isLoading }               = useContact(id)
  const { data: ledger,  isLoading: loadingLedger } = useContactLedger(id)
  const { data: docsData }                          = useDocuments({ contact: id })
  const { data: accountsData }                      = useAccounts({ is_active: true })

  const updateTxn = useUpdateTransaction(id)
  const deleteTxn = useDeleteTransaction(id)

  // ── Sheet states ──────────────────────────────────────────────────────────
  const [editOpen,  setEditOpen]  = useState(false)
  const [srSheet,   setSrSheet]   = useState<{ open: boolean; mode: 'send' | 'receive' }>({
    open: false, mode: 'send',
  })

  // ── Transaction edit state ────────────────────────────────────────────────
  const [editTxn,         setEditTxn]         = useState<FinancialTransaction | null>(null)
  const [confirmDelOpen,  setConfirmDelOpen]   = useState(false)
  const [txnAmount,       setTxnAmount]        = useState('')
  const [txnDate,         setTxnDate]          = useState('')
  const [txnNotes,        setTxnNotes]         = useState('')
  const [txnAccountId,    setTxnAccountId]     = useState('')

  // Sync edit form when txn selected
  useEffect(() => {
    if (!editTxn) return
    setTxnAmount(String(Math.abs(Number(editTxn.amount))))
    setTxnDate(editTxn.date)
    setTxnNotes(editTxn.notes ?? '')
    setTxnAccountId(editTxn.payment_account ? String(editTxn.payment_account) : '')
  }, [editTxn])

  useEffect(() => {
    if (contact) setPageTitle(getContactDisplayName(contact))
  }, [contact, setPageTitle])

  const docs     = docsData?.results  ?? []
  const txns     = ledger             ?? []
  const accounts = accountsData?.results ?? []

  const runningCF = useMemo(() => {
    if (!contact) return 0
    return computeRunningCF(Number(contact.opening_balance ?? 0), txns)
  }, [contact, txns])

  const accountOptions: SearchableSelectOption[] = [
    { value: '', label: 'None', sublabel: 'No account' },
    ...accounts.map(a => ({
      value:    String(a.id),
      label:    a.name,
      sublabel: `${a.type} · ${fmtAmount(a.current_balance)}`,
    })),
  ]

  // ── Txn edit handlers ─────────────────────────────────────────────────────
  const handleUpdateTxn = async () => {
    if (!editTxn || !txnAmount || Number(txnAmount) <= 0) {
      toast.error('Enter a valid amount'); return
    }
    const origAmt = Number(editTxn.amount)
    // Preserve original sign — user edits magnitude only
    const newAmount = String(origAmt >= 0 ? Number(txnAmount) : -Number(txnAmount))
    try {
      await updateTxn.mutateAsync({
        id:              editTxn.id,
        amount:          newAmount,
        date:            txnDate,
        notes:           txnNotes || undefined,
        payment_account: txnAccountId ? Number(txnAccountId) : null,
      })
      toast.success('Transaction updated')
      setEditTxn(null)
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleDeleteTxn = async () => {
    if (!editTxn) return
    try {
      await deleteTxn.mutateAsync(editTxn.id)
      toast.success('Transaction deleted')
      setConfirmDelOpen(false)
      setEditTxn(null)
    } catch {
      toast.error('Failed to delete')
    }
  }

  if (isLoading) return <ContactDetailSkeleton />
  if (!contact)  return null

  return (
    <div className="pb-10">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{getContactDisplayName(contact)}</h1>
            {contact.company_name && (
              <p className="text-sm text-muted-foreground">{contact.contact_name}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                Edit Contact
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/transactions?contact=${id}`)}>
                View All Transactions
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Contact meta */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            <span>{contact.phone}</span>
          </div>
          {contact.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{contact.address}</span>
            </div>
          )}
          {contact.gstin && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span>{contact.gstin}</span>
            </div>
          )}
        </div>

        {/* ── Running CF card ─────────────────────────────────────────── */}
        <Card className={`border-2 ${
          runningCF > 0
            ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20'
            : runningCF < 0
            ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20'
            : 'border-border'
        }`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Running Balance</p>
              <p className={`text-3xl font-bold tracking-tight ${cfColor(runningCF)}`}>
                {fmtAmount(Math.abs(runningCF))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {runningCF > 0 ? '↑ You owe them'
                  : runningCF < 0 ? '↓ They owe you'
                  : '✓ Fully settled'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              runningCF > 0  ? 'bg-red-100 dark:bg-red-900/30'
              : runningCF < 0 ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-muted'
            }`}>
              {runningCF > 0
                ? <TrendingUp   className="h-6 w-6 text-red-500" />
                : runningCF < 0
                ? <TrendingDown className="h-6 w-6 text-green-500" />
                : <Minus        className="h-6 w-6 text-muted-foreground" />}
            </div>
          </CardContent>
        </Card>

        {/* ── Send / Receive ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12 gap-2"
            onClick={() => setSrSheet({ open: true, mode: 'send' })}>
            <ArrowUpRight className="h-4 w-4 text-red-500" /> Send
          </Button>
          <Button variant="outline" className="h-12 gap-2"
            onClick={() => setSrSheet({ open: true, mode: 'receive' })}>
            <ArrowDownLeft className="h-4 w-4 text-green-500" /> Receive
          </Button>
        </div>

        {/* ── Quick doc create ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="secondary" className="gap-1.5"
            onClick={() => openDocSheet('bill', id)}>
            <FileText className="h-3.5 w-3.5" /> New Bill
          </Button>
          <Button size="sm" variant="secondary" className="gap-1.5"
            onClick={() => openDocSheet('invoice', id)}>
            <FileText className="h-3.5 w-3.5" /> New Invoice
          </Button>
        </div>
      </div>

      <Separator />

      {/* ── Recent Documents ────────────────────────────────────────────── */}
      {docs.length > 0 && (
        <>
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Documents
            </h2>
            <button className="text-xs text-primary"
              onClick={() => router.push(`/documents?contact=${id}`)}>
              See All
            </button>
          </div>
          <div className="px-4 space-y-2">
            {docs.slice(0, 3).map((doc) => (
              <Card key={doc.id}
                className="cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() => router.push(`/documents/${doc.id}`)}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] h-4">
                        {getDocLabel(doc.type)}
                      </Badge>
                      <span className="text-sm font-medium">#{doc.doc_id}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtDate(doc.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <p className="text-sm font-semibold">
                      {doc.total_amount ? fmtAmount(doc.total_amount) : '—'}
                    </p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Separator className="mt-4" />
        </>
      )}

      {/* ── Ledger ──────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Ledger
        </h2>
        <span className="text-xs text-muted-foreground">tap to edit</span>
      </div>

      {loadingLedger ? (
        <div className="px-4 space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="px-4 space-y-2">

          {/* Opening balance row */}
          {Number(contact.opening_balance ?? 0) !== 0 && (
            <Card className="bg-muted/30">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Opening Balance</p>
                  <p className="text-[10px] text-muted-foreground">Starting point</p>
                </div>
                <p className={`text-sm font-bold ${cfColor(contact.opening_balance)}`}>
                  {Number(contact.opening_balance) >= 0 ? '+' : ''}
                  {fmtAmount(contact.opening_balance)}
                </p>
              </CardContent>
            </Card>
          )}

          {txns.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              No transactions yet
            </p>
          )}

          {/* Newest first */}
          {[...txns].reverse().map((txn) => {
            const isExpense = txn.document_type === 'expense'
            const amt       = Number(txn.amount)
            const cfNow     = Number(contact.opening_balance ?? 0)
                            + Number(txn.monthly_cumulative_delta)

            return (
              <Card
                key={txn.id}
                className={`cursor-pointer active:scale-[0.99] transition-transform ${
                  isExpense ? 'opacity-70' : ''
                }`}
                onClick={() => setEditTxn(txn)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">

                    {/* Left */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant={txn.type === 'actual' ? 'default' : 'secondary'}
                          className="text-[10px] h-4"
                        >
                          {txn.type}
                        </Badge>
                        {isExpense && (
                          <Badge variant="outline"
                            className="text-[10px] h-4 text-orange-600 border-orange-300">
                            expense
                          </Badge>
                        )}
                        {txn.is_doc_deleted && (
                          <Badge variant="destructive" className="text-[10px] h-4">
                            orphan
                          </Badge>
                        )}
                        {txn.document && (
                          <span className="text-[10px] text-primary">
                            {getDocLabel(txn.document_type)} #{txn.document}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{fmtDate(txn.date)}</p>
                      {txn.notes && (
                        <p className="text-xs text-muted-foreground truncate">
                          {txn.notes}
                        </p>
                      )}
                    </div>

                    {/* Right */}
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${
                        amt >= 0 ? 'text-red-500' : 'text-green-600'
                      }`}>
                        {amt >= 0 ? '+' : ''}{fmtAmount(amt)}
                      </p>
                      {isExpense ? (
                        <p className="text-[10px] mt-0.5 text-muted-foreground">
                          no CF impact
                        </p>
                      ) : (
                        <p className={`text-[10px] mt-0.5 ${cfColor(cfNow)}`}>
                          CF {cfNow >= 0 ? '+' : ''}{fmtAmount(cfNow)}
                        </p>
                      )}
                    </div>

                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Sheets ──────────────────────────────────────────────────────── */}
      <ContactEditSheet
        contact={contact}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
      <SendReceiveSheet
        contactId={id}
        open={srSheet.open}
        mode={srSheet.mode}
        onClose={() => setSrSheet({ open: false, mode: 'send' })}
      />

      {/* ── Transaction edit sheet ───────────────────────────────────────── */}
      <Sheet open={!!editTxn} onOpenChange={v => { if (!v) setEditTxn(null) }}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl px-4 pb-10 max-h-[90vh] overflow-y-auto"
        >
          {editTxn && (
            <>
              <SheetHeader className="mb-4">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-left flex items-center gap-2">
                    <Pencil className="h-4 w-4" /> Edit Transaction
                  </SheetTitle>
                  <button
                    onClick={() => setConfirmDelOpen(true)}
                    className="flex items-center gap-1.5 text-xs text-destructive font-medium px-2 py-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </SheetHeader>

              {/* Transaction summary */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border mb-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={editTxn.type === 'actual' ? 'default' : 'secondary'}
                      className="text-[10px] h-4"
                    >
                      {editTxn.type}
                    </Badge>
                    {editTxn.document && (
                      <span className="text-[10px] text-primary">
                        {getDocLabel(editTxn.document_type)} #{editTxn.document}
                      </span>
                    )}
                    {editTxn.is_doc_deleted && (
                      <Badge variant="destructive" className="text-[10px] h-4">orphan</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {fmtDate(editTxn.date)}
                  </p>
                </div>
                <p className={`text-sm font-bold ${
                  Number(editTxn.amount) >= 0 ? 'text-red-500' : 'text-green-600'
                }`}>
                  {Number(editTxn.amount) >= 0 ? '+' : ''}
                  {fmtAmount(editTxn.amount)}
                </p>
              </div>

              {/* Warn if linked to active document */}
              {editTxn.document && !editTxn.is_doc_deleted && (
                <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-4">
                  ⚠️ Linked to a document — editing may cause mismatch with document total.
                </div>
              )}

              <div className="space-y-4">

                {/* Amount */}
                <div className="space-y-1.5">
                  <Label>
                    Amount
                    <span className="text-xs text-muted-foreground ml-1 font-normal">
                      ({Number(editTxn.amount) >= 0 ? 'outgoing' : 'incoming'} — sign preserved)
                    </span>
                  </Label>
                  <Input
                    type="number"
                    className="text-lg h-12"
                    value={txnAmount}
                    onChange={e => setTxnAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={txnDate}
                    onChange={e => setTxnDate(e.target.value)}
                  />
                </div>

                {/* Account — only for actual */}
                {editTxn.type === 'actual' && (
                  <div className="space-y-1.5">
                    <Label>Payment Account</Label>
                    <SearchableSelect
                      options={accountOptions}
                      value={txnAccountId}
                      onChange={setTxnAccountId}
                      placeholder="Select account"
                      title="Select Account"
                      searchPlaceholder="Search accounts..."
                      clearable
                    />
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label>
                    Notes
                    <span className="text-xs text-muted-foreground ml-1">(optional)</span>
                  </Label>
                  <Input
                    placeholder="Add a note..."
                    value={txnNotes}
                    onChange={e => setTxnNotes(e.target.value)}
                  />
                </div>

                <Separator />

                <Button
                  className="w-full h-12"
                  onClick={handleUpdateTxn}
                  disabled={updateTxn.isPending}
                >
                  {updateTxn.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Confirm delete dialog ────────────────────────────────────────── */}
      <AlertDialog open={confirmDelOpen} onOpenChange={setConfirmDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Permanently delete this{' '}
                  <strong>{editTxn?.type}</strong> of{' '}
                  <strong>{editTxn ? fmtAmount(editTxn.amount) : ''}</strong>
                  {editTxn ? ` on ${fmtDate(editTxn.date)}` : ''}.
                </p>
                {editTxn?.type === 'actual' && editTxn.payment_account && (
                  <p className="text-amber-600 dark:text-amber-400">
                    ⚠️ Account balance will be reversed automatically.
                  </p>
                )}
                {editTxn?.document && !editTxn.is_doc_deleted && (
                  <p className="text-amber-600 dark:text-amber-400">
                    ⚠️ Linked to a document — that document's balance will
                    become unpaid again.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTxn}
              disabled={deleteTxn.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteTxn.isPending ? 'Deleting...' : 'Yes, Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}

function ContactDetailSkeleton() {
  return (
    <div className="px-4 py-4 space-y-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-28 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
    </div>
  )
}
