'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import {
  useTransactions,
  useDeleteTransaction,
  useUpdateTransaction,
  usePrintTransactions,
} from '@/hooks/useTransaction'
import { useContact } from '@/hooks/useContact'
import { useAccounts } from '@/hooks/useAccount'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TransactionCard } from '@/components/shared/TransactionCard'
import { SearchableSelect, SearchableSelectOption } from '@/components/shared/common/SearchableSelect'
import { cn, fmtAmount, fmtDate } from '@/lib/utils'
import { SlidersHorizontal, X, Printer, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { FinancialTransaction, TransactionType } from '@/models/transaction'
import { DOC_TYPE_LABELS } from '@/models/document'


const DOC_LABELS  = DOC_TYPE_LABELS as Record<string, string>
const getDocLabel = (t: string | null | undefined) => t ? (DOC_LABELS[t] ?? t) : ''

const TYPE_FILTERS = [
  { label: 'All',      value: '' },
  { label: 'Expected', value: 'record' },
  { label: 'Settled',  value: 'actual' },
  { label: 'Contra',   value: 'contra' },
]


export function TransactionsPage() {
  const router = useRouter()
  const { setPageTitle, globalTxnFilter, setGlobalTxnFilter } = useUIStore()

  useEffect(() => { setPageTitle('Transactions') }, [setPageTitle])

  const searchParams  = useSearchParams()
  const contactFilter = searchParams.get('contact')
  const accountFilter = searchParams.get('account')

  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')
  const [showDates,  setShowDates]  = useState(false)

  // ── Transaction edit state ─────────────────────────────────────────────────
  const [editTxn,       setEditTxn]       = useState<FinancialTransaction | null>(null)
  const [confirmDel,    setConfirmDel]    = useState(false)
  const [txnAmount,     setTxnAmount]     = useState('')
  const [txnDate,       setTxnDate]       = useState('')
  const [txnNotes,      setTxnNotes]      = useState('')
  const [txnAccountId,  setTxnAccountId]  = useState('')

  // ── Populate edit form ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!editTxn) return
    setTxnAmount(String(Math.abs(Number(editTxn.amount))))
    setTxnDate(editTxn.date)
    setTxnNotes(editTxn.notes ?? '')
    setTxnAccountId(editTxn.payment_account ? String(editTxn.payment_account) : '')
  }, [editTxn])

  // ── Data ───────────────────────────────────────────────────────────────────
  const activeParams = {
    type:      (globalTxnFilter || undefined) as TransactionType | undefined,
    contact:   contactFilter ? Number(contactFilter) : undefined,
    account:   accountFilter ? Number(accountFilter) : undefined,
    date_from: dateFrom || undefined,
    date_to:   dateTo   || undefined,
  }

  const { data, isLoading }         = useTransactions(activeParams)
  const contactId = contactFilter ? Number(contactFilter) : undefined
  const { data: contactData } = useContact(contactId)
  const { data: allAccountsData }   = useAccounts({ is_active: true })

  const deleteMutation   = useDeleteTransaction(activeParams.contact)
  const updateMutation   = useUpdateTransaction()
  const printMutation    = usePrintTransactions()

  const txns = data?.results ?? []

  const allAccounts = allAccountsData?.results ?? []
  const accountOptions: SearchableSelectOption[] = allAccounts.map(a => ({
    value:    String(a.id),
    label:    a.name,
    sublabel: `${a.type} · ${fmtAmount(a.current_balance)}`,
  }))

  // Resolve display name for the contact filter banner
  const contactDisplayName = contactData
    ? (contactData.company_name || contactData.contact_name)
    : contactFilter ? `Contact #${contactFilter}` : ''

  const hasDateFilter = !!(dateFrom || dateTo)

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleEdit = (txn: FinancialTransaction) => {
    if (txn.type === 'record') {
      if (txn.document) {
        router.push(`/documents/${txn.document}`)
      } else {
        toast.info('No linked document to edit')
      }
      return
    }
    if (txn.type === 'contra') {
      toast.info('Transfer transactions are managed via the Transfers page')
      return
    }
    setEditTxn(txn)
  }

  const handleDeletePrompt = (id: number) => {
    const found = txns.find(t => t.id === id)
    if (!found) return
    if (found.type === 'record') {
      toast.error('Record transactions can only be deleted via document deletion')
      return
    }
    if (found.type === 'contra') {
      toast.error('Transfer transactions cannot be deleted individually')
      return
    }
    setEditTxn(found)
    setConfirmDel(true)
  }

  const handleUpdateTxn = async () => {
    if (!editTxn || !txnAmount || Number(txnAmount) <= 0) {
      toast.error('Enter a valid amount'); return
    }
    const origSign  = Number(editTxn.amount) >= 0 ? 1 : -1
    const newAmount = String(origSign * Number(txnAmount))
    try {
      await updateMutation.mutateAsync({
        id:              editTxn.id,
        amount:          newAmount,
        date:            txnDate,
        notes:           txnNotes || undefined,
        payment_account: txnAccountId ? Number(txnAccountId) : undefined,
      })
      toast.success('Transaction updated')
      setEditTxn(null)
    } catch { toast.error('Failed to update transaction') }
  }

  const handleConfirmDelete = async () => {
    if (!editTxn) return
    try {
      await deleteMutation.mutateAsync(editTxn.id)
      toast.success('Transaction deleted')
      setConfirmDel(false)
      setEditTxn(null)
    } catch { toast.error('Failed to delete transaction') }
  }

  const handlePrint = async () => {
    try {
      toast.loading('Generating PDF...', { id: 'print-txns' })
      const blob = await printMutation.mutateAsync(activeParams)
      const url = window.URL.createObjectURL(blob as Blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = `Transactions_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('PDF Downloaded', { id: 'print-txns' })
    } catch {
      toast.error('Failed to generate PDF', { id: 'print-txns' })
    }
  }

  return (
    <div className="pb-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <h2 className="text-sm font-semibold">All Transactions</h2>
        <Button
          variant="outline" size="sm"
          onClick={handlePrint}
          disabled={printMutation.isPending || txns.length === 0}
          className="h-8"
        >
          <Printer className="h-3.5 w-3.5 mr-2" />
          {printMutation.isPending ? 'Generating...' : 'Print PDF'}
        </Button>
      </div>

      {/* ── Type filter chips ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setGlobalTxnFilter(f.value)}
              className={cn(
                'shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all',
                globalTxnFilter === f.value
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowDates(p => !p)}
          className={cn(
            'shrink-0 p-2 rounded-full border transition-colors',
            showDates || hasDateFilter
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:bg-muted',
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Date range inputs ────────────────────────────────────────────────── */}
      {showDates && (
        <div className="px-4 pb-3 flex gap-2 items-center">
          <div className="flex-1 space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">From</p>
            <Input
              type="date" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">To</p>
            <Input
              type="date" value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          {hasDateFilter && (
            <button
              type="button"
              className="mt-5 shrink-0 p-1.5 rounded-full bg-muted hover:bg-muted/80"
              onClick={() => { setDateFrom(''); setDateTo('') }}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      {/* ── Active context banner — shows resolved contact/account NAME ───────── */}
      {(contactFilter || accountFilter) && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary flex items-center justify-center gap-1.5 flex-wrap">
          {contactFilter && (
            <span className="flex items-center gap-1">
              <span className="opacity-60">Contact:</span>
              {/* Show name once loaded, show skeleton while loading */}
              {contactData
                ? <span className="font-bold">{contactDisplayName}</span>
                : <span className="inline-block w-24 h-3.5 bg-primary/20 rounded animate-pulse" />
              }
            </span>
          )}
          {contactFilter && accountFilter && <span className="opacity-40">·</span>}
          {accountFilter && (
            <span className="flex items-center gap-1">
              <span className="opacity-60">Account:</span>
              <span className="font-bold">
                {allAccounts.find(a => a.id === Number(accountFilter))?.name ?? `#${accountFilter}`}
              </span>
            </span>
          )}
        </div>
      )}

      {/* ── Active date range badge ──────────────────────────────────────────── */}
      {hasDateFilter && (
        <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300 flex-1">
            {dateFrom && `From ${dateFrom}`}
            {dateFrom && dateTo && ' → '}
            {dateTo && `To ${dateTo}`}
          </span>
          <button
            type="button"
            onClick={() => { setDateFrom(''); setDateTo('') }}
            className="text-amber-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Transaction list ─────────────────────────────────────────────────── */}
      <div className="px-4 space-y-1 mt-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl w-full mb-2" />
          ))
        ) : txns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <span className="text-xl">📄</span>
            </div>
            <p className="text-muted-foreground text-sm font-medium">No transactions found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-50">
              Try changing your filters or checking a different account.
            </p>
            {(globalTxnFilter || hasDateFilter) && (
              <Button
                variant="outline" size="sm"
                className="mt-4 text-xs"
                onClick={() => {
                  setGlobalTxnFilter('')
                  setDateFrom('')
                  setDateTo('')
                }}
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          txns.map(txn => (
            <TransactionCard
              key={txn.id}
              txn={txn}
              showContact={!contactFilter}
              onEdit={() => handleEdit(txn)}
              onDelete={handleDeletePrompt}
            />
          ))
        )}
      </div>

      {/* ── Edit Transaction sheet ─────────────────────────────────────────── */}
      <Sheet open={!!editTxn && !confirmDel} onOpenChange={v => { if (!v) setEditTxn(null) }}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[90vh] overflow-y-auto">
          {editTxn && (
            <>
              <SheetHeader className="mb-5">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-left flex items-center gap-2">
                    <Pencil className="h-4 w-4" /> Edit Transaction
                  </SheetTitle>
                  <button
                    onClick={() => setConfirmDel(true)}
                    className="flex items-center gap-1.5 text-xs text-destructive font-bold px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </SheetHeader>

              {/* Txn summary pill */}
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
                  <p className="text-xs font-medium text-muted-foreground">
                    {editTxn.contact_name && (
                      <span className="font-semibold text-foreground mr-1">{editTxn.contact_name}</span>
                    )}
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
                    Linked to a document. Editing the amount here may cause a
                    discrepancy with the document total.
                  </span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>
                    Amount
                    <span className="text-[10px] text-muted-foreground ml-2 font-normal uppercase tracking-wider">
                      ({Number(editTxn.amount) >= 0 ? 'Dr / outgoing' : 'Cr / incoming'} — sign preserved)
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
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Notes
                    <span className="text-xs text-muted-foreground ml-1 font-normal">(optional)</span>
                  </Label>
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
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Delete confirm dialog ────────────────────────────────────────────── */}
      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
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
                <p className="text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 leading-tight">
                  ⚠️ The account balance will be reversed automatically.
                </p>
                {editTxn?.document && !editTxn.is_document_deleted && (
                  <p className="text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 leading-tight">
                    ⚠️ Linked to a document. The document balance will become unpaid again.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-11 rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="h-11 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
