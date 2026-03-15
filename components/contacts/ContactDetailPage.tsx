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
import { cfColor, fmtAmount, fmtDate, cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowUpRight, ArrowDownLeft, ChevronRight,
  Phone, Building2, MapPin, FileText, MoreVertical,
  TrendingUp, TrendingDown, Minus, Trash2, Pencil,
  BookOpen, AlertCircle, LayoutList, Table2,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ContactEditSheet } from './ContactEditSheet'
import { SendReceiveSheet } from './SendReceiveSheet'
import { ContactLedger }    from './ContactLedger'
import { TransactionCard }  from '@/components/shared/TransactionCard'
import { DOC_TYPE_LABELS }  from '@/models/document'
import { SearchableSelect, SearchableSelectOption } from '@/components/shared/common/SearchableSelect'
import { toast } from 'sonner'


const DOC_LABELS  = DOC_TYPE_LABELS as Record<string, string>
const getDocLabel = (t: string | null | undefined): string => t ? (DOC_LABELS[t] ?? t) : ''


function computeRunningCF(openingBalance: number, txns: FinancialTransaction[]): number {
  return txns.reduce((cf, t) => {
    if (t.document_type === 'expense') return cf
    if (t.type === 'contra')           return cf
    return cf + Number(t.amount)
  }, openingBalance)
}


interface Props { id: number }


export function ContactDetailPage({ id }: Props) {
  const router       = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  const openDocSheet = useUIStore((s) => s.openDocCreateSheet)

  const { data: contact, isLoading }                = useContact(id)
  const { data: ledger,  isLoading: loadingLedger } = useContactLedger(id)
  const { data: docsData }                          = useDocuments({ contact: id })
  const { data: accountsData }                      = useAccounts({ is_active: true })

  const updateTxn = useUpdateTransaction(id)
  const deleteTxn = useDeleteTransaction(id)

  const [editOpen,  setEditOpen]  = useState(false)
  const [activeTab, setActiveTab] = useState<'ledger' | 'docs'>('ledger')
  const [ledgerView, setLedgerView] = useState<'ledger' | 'list'>('ledger')

  const [srSheet, setSrSheet] = useState<{ open: boolean; mode: 'send' | 'receive' }>({
    open: false, mode: 'send',
  })

  const [editTxn,        setEditTxn]        = useState<FinancialTransaction | null>(null)
  const [confirmDelOpen, setConfirmDelOpen] = useState(false)
  const [txnAmount,      setTxnAmount]      = useState('')
  const [txnDate,        setTxnDate]        = useState('')
  const [txnNotes,       setTxnNotes]       = useState('')
  const [txnAccountId,   setTxnAccountId]   = useState('')

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

  const docs     = docsData?.results    ?? []
  const txns     = ledger               ?? []
  const accounts = accountsData?.results ?? []

  const accountMap = useMemo(() =>
    Object.fromEntries(accounts.map(a => [a.id, a.name])),
    [accounts],
  )

  const runningCF = useMemo(() => {
    if (!contact) return 0
    return computeRunningCF(Number(contact.opening_balance ?? 0), txns)
  }, [contact, txns])

  const txnsWithRunningCF = useMemo(() => {
    const sorted = [...txns].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
    let running = Number(contact?.opening_balance ?? 0)
    return sorted.map(txn => {
      const affectsCF = txn.document_type !== 'expense' && txn.type !== 'contra'
      if (affectsCF) running += Number(txn.amount)
      return { ...txn, runningCf: running }
    })
  }, [txns, contact])

  const accountOptions: SearchableSelectOption[] = [
    { value: '', label: 'None', sublabel: 'No account' },
    ...accounts.map(a => ({
      value:    String(a.id),
      label:    a.name,
      sublabel: `${a.type} · ${fmtAmount(a.current_balance)}`,
    })),
  ]

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEditTxn = (txn: FinancialTransaction) => {
    if (txn.type !== 'actual') {
      toast.info('Only settled (actual) transactions can be edited')
      return
    }
    setEditTxn(txn)
  }

  const handleDeletePrompt = (txnId: number) => {
    const found = txns.find(t => t.id === txnId)
    if (!found) return
    setEditTxn(found)
    setConfirmDelOpen(true)
  }

  const handleUpdateTxn = async () => {
    if (!editTxn || !txnAmount || Number(txnAmount) <= 0) {
      toast.error('Enter a valid amount'); return
    }
    const origSign  = Number(editTxn.amount) >= 0 ? 1 : -1
    const newAmount = String(origSign * Number(txnAmount))
    try {
      await updateTxn.mutateAsync({
        id:              editTxn.id,
        amount:          newAmount,
        date:            txnDate,
        notes:           txnNotes || undefined,
        payment_account: txnAccountId ? Number(txnAccountId) : undefined,
      })
      toast.success('Transaction updated')
      setEditTxn(null)
    } catch { toast.error('Failed to update') }
  }

  const handleDeleteTxn = async () => {
    if (!editTxn) return
    try {
      await deleteTxn.mutateAsync(editTxn.id)
      toast.success('Transaction deleted')
      setConfirmDelOpen(false)
      setEditTxn(null)
    } catch { toast.error('Failed to delete') }
  }

  if (isLoading) return <ContactDetailSkeleton />
  if (!contact)  return null

  return (
    <div className="pb-10">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-foreground/90 tracking-tight truncate">
                {getContactDisplayName(contact)}
              </h1>
              {!contact.is_active && (
                <Badge variant="destructive" className="text-[10px] h-5 rounded-md px-1.5 shrink-0">
                  Deleted
                </Badge>
              )}
            </div>
            {contact.company_name && (
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {contact.contact_name}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 bg-muted/50 -mr-2 shrink-0">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Contact
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/transactions?contact=${id}`)}>
                <BookOpen className="mr-2 h-4 w-4" /> All Transactions
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Contact meta */}
        <div className="grid gap-2 text-sm font-medium text-muted-foreground bg-muted/30 p-3 rounded-xl border border-muted">
          <div className="flex items-center gap-2.5">
            <Phone className="h-4 w-4 text-primary/70 shrink-0" />
            <span>{contact.phone}</span>
          </div>
          {contact.address && (
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 mt-0.5 text-primary/70 shrink-0" />
              <span className="leading-tight">{contact.address}</span>
            </div>
          )}
          {contact.gstin && (
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-primary/70 shrink-0" />
              <span className="uppercase tracking-wider">{contact.gstin}</span>
            </div>
          )}
        </div>

        {/* Running CF card */}
        <Card className={cn(
          'border-2 shadow-sm rounded-2xl',
          runningCF > 0  ? 'border-red-200 bg-red-50/50'
          : runningCF < 0 ? 'border-emerald-200 bg-emerald-50/50'
          : 'border-border',
        )}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Total Ledger Balance
              </p>
              <p className={cn('text-3xl font-black tracking-tight', cfColor(runningCF))}>
                {fmtAmount(Math.abs(runningCF))}
              </p>
              <p className="text-sm font-medium text-muted-foreground mt-1.5 flex items-center gap-1">
                {runningCF > 0
                  ? <><TrendingUp   className="h-4 w-4 text-red-500"           /> You owe them</>
                  : runningCF < 0
                    ? <><TrendingDown className="h-4 w-4 text-emerald-500"     /> They owe you</>
                    : <><Minus        className="h-4 w-4 text-muted-foreground" /> Fully settled</>
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Send / Receive */}
        {contact.is_active && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-12 gap-2 rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold text-md"
              onClick={() => setSrSheet({ open: true, mode: 'send' })}
            >
              <ArrowUpRight className="h-5 w-5" /> Send
            </Button>
            <Button
              variant="outline"
              className="h-12 gap-2 rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold text-md"
              onClick={() => setSrSheet({ open: true, mode: 'receive' })}
            >
              <ArrowDownLeft className="h-5 w-5" /> Receive
            </Button>
          </div>
        )}

        {/* Quick doc create */}
        {contact.is_active && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="sm" variant="secondary"
              className="gap-1.5 h-10 rounded-lg text-xs font-bold shadow-sm"
              onClick={() => openDocSheet('bill', id)}
            >
              <FileText className="h-3.5 w-3.5" /> Create Bill
            </Button>
            <Button
              size="sm" variant="secondary"
              className="gap-1.5 h-10 rounded-lg text-xs font-bold shadow-sm"
              onClick={() => openDocSheet('invoice', id)}
            >
              <FileText className="h-3.5 w-3.5" /> Create Invoice
            </Button>
          </div>
        )}
      </div>

      <Separator className="my-6" />

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'ledger' | 'docs')} className="w-full">
          <TabsList className="w-full h-12 bg-muted/60 p-1 rounded-xl mb-4">
            <TabsTrigger
              value="ledger"
              className="flex-1 h-full text-sm font-bold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Ledger Book
            </TabsTrigger>
            <TabsTrigger
              value="docs"
              className="flex-1 h-full text-sm font-bold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Documents ({docs.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Ledger Tab ────────────────────────────────────────────── */}
          <TabsContent value="ledger" className="space-y-3 outline-none">
            {loadingLedger ? (
              <Skeleton className="h-75 w-full rounded-xl" />
            ) : (
              <>
                {/* View mode toggle */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {ledgerView === 'ledger'
                      ? 'Scroll horizontally for details'
                      : 'Use ⋮ menu on each row to edit or delete'}
                  </span>
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setLedgerView('ledger')}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all',
                        ledgerView === 'ledger'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Table2 className="h-3.5 w-3.5" />
                      Ledger
                    </button>
                    <button
                      onClick={() => setLedgerView('list')}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all',
                        ledgerView === 'list'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <LayoutList className="h-3.5 w-3.5" />
                      List
                    </button>
                  </div>
                </div>

                {/* Ledger View */}
                {ledgerView === 'ledger' && (
                  <ContactLedger
                    transactions={txns}
                    openingBalance={Number(contact.opening_balance ?? 0)}
                    onEditTxn={handleEditTxn}
                  />
                )}

                {/* List View */}
                {ledgerView === 'list' && (
                  <div className="space-y-2">
                    {txnsWithRunningCF.length === 0 ? (
                      <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
                        <p className="text-sm font-medium text-muted-foreground">No transactions yet</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Send / Receive or create a document to get started
                        </p>
                      </div>
                    ) : (
                      txnsWithRunningCF.map((txn) => (
                        <TransactionCard
                          key={txn.id}
                          txn={txn}
                          runningCf={
                            txn.document_type !== 'expense' && txn.type !== 'contra'
                              ? txn.runningCf
                              : undefined
                          }
                          accountName={
                            txn.payment_account
                              ? (accountMap[txn.payment_account] ?? `Account #${txn.payment_account}`)
                              : undefined
                          }
                          onEdit={() => handleEditTxn(txn)}
                          onDelete={handleDeletePrompt}
                        />
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Documents Tab ─────────────────────────────────────────── */}
          <TabsContent value="docs" className="space-y-3 outline-none">
            {docs.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
                <p className="text-sm font-medium text-muted-foreground">No documents found</p>
              </div>
            ) : (
              docs.map((doc) => (
                <Card
                  key={doc.id}
                  className="cursor-pointer active:scale-[0.99] transition-all rounded-xl shadow-sm border-border/80 hover:bg-muted/20"
                  onClick={() => router.push(`/documents/${doc.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider rounded-md px-1.5 border border-border">
                          {getDocLabel(doc.type)}
                        </Badge>
                        <span className="text-sm font-bold text-foreground/90 truncate">
                          #{doc.doc_id}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground mt-1.5">
                        {fmtDate(doc.date)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
                      <p className="text-base font-black">
                        {doc.total_amount ? fmtAmount(doc.total_amount) : '—'}
                      </p>
                      <div className="flex items-center text-primary text-[10px] font-bold mt-1">
                        View Details <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            {docs.length > 5 && (
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl font-bold mt-2"
                onClick={() => router.push(`/documents?contact=${id}`)}
              >
                View All {docs.length} Documents
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Sheets ────────────────────────────────────────────────────── */}
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

      {/* ── Transaction edit sheet ────────────────────────────────────── */}
      <Sheet open={!!editTxn && !confirmDelOpen} onOpenChange={v => { if (!v) setEditTxn(null) }}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[90vh] overflow-y-auto">
          {editTxn && (
            <>
              <SheetHeader className="mb-5">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-left flex items-center gap-2">
                    <Pencil className="h-4 w-4" /> Edit Transaction
                  </SheetTitle>
                  <button
                    onClick={() => setConfirmDelOpen(true)}
                    className="flex items-center gap-1.5 text-xs text-destructive font-bold px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </SheetHeader>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-muted mb-5">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider rounded-md h-5 px-1.5">
                      actual
                    </Badge>
                    {editTxn.document && (
                      <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        {getDocLabel(editTxn.document_type)} #{editTxn.document}
                      </span>
                    )}
                    {editTxn.is_document_deleted && (
                      <Badge variant="destructive" className="text-[10px] h-5 rounded-md px-1.5">
                        doc deleted
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground mt-1">
                    Recorded {fmtDate(editTxn.date)}
                  </p>
                </div>
                <p className={cn(
                  'text-lg font-black shrink-0',
                  Number(editTxn.amount) >= 0 ? 'text-red-600' : 'text-emerald-600',
                )}>
                  {Number(editTxn.amount) >= 0 ? '+' : ''}{fmtAmount(editTxn.amount)}
                </p>
              </div>

              {editTxn.document && !editTxn.is_document_deleted && (
                <div className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-5 flex gap-2 items-start">
                  <span className="mt-0.5">⚠️</span>
                  <span>
                    This is linked to a document. Editing the amount here may cause a
                    discrepancy with the document total.
                  </span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>
                    Amount
                    <span className="text-[10px] text-muted-foreground ml-2 font-normal uppercase tracking-wider">
                      ({Number(editTxn.amount) >= 0 ? 'outgoing / Dr' : 'incoming / Cr'} — sign preserved)
                    </span>
                  </Label>
                  <Input
                    type="number"
                    className="text-lg font-bold h-12 rounded-xl"
                    value={txnAmount}
                    onChange={e => setTxnAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    className="h-11 rounded-xl"
                    value={txnDate}
                    onChange={e => setTxnDate(e.target.value)}
                  />
                </div>
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
                <div className="space-y-1.5">
                  <Label>Notes <span className="text-xs text-muted-foreground ml-1 font-normal">(optional)</span></Label>
                  <Input
                    placeholder="Add a note..."
                    className="h-11 rounded-xl"
                    value={txnNotes}
                    onChange={e => setTxnNotes(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full h-12 mt-2 rounded-xl text-md font-bold"
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

      {/* ── Confirm delete dialog ──────────────────────────────────────── */}
      <AlertDialog open={confirmDelOpen} onOpenChange={setConfirmDelOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black">Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2.5 text-sm font-medium pt-2">
                <p>
                  Permanently delete this actual transaction of{' '}
                  <strong className="text-foreground">
                    {editTxn ? fmtAmount(Math.abs(Number(editTxn.amount))) : ''}
                  </strong>
                  {editTxn ? ` on ${fmtDate(editTxn.date)}` : ''}.
                </p>
                {editTxn?.payment_account && (
                  <p className="text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 leading-tight">
                    ⚠️ The linked account balance will be reversed automatically.
                  </p>
                )}
                {editTxn?.document && !editTxn.is_document_deleted && (
                  <p className="text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 leading-tight">
                    ⚠️ This is linked to a document. The document balance will become unpaid again.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-11 rounded-xl border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTxn}
              disabled={deleteTxn.isPending}
              className="h-11 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
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
    <div className="px-4 py-6 space-y-4">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <Skeleton className="h-5 w-32 rounded-md" />
      <Skeleton className="h-28 rounded-2xl mt-2" />
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
      <div className="mt-8 space-y-3">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-75 rounded-xl" />
      </div>
    </div>
  )
}
