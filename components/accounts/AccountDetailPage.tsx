'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import {
  useAccount, useAccounts,
  useUpdateAccount, useDeleteAccount,
  useTransfer, useAdjustBalance, useSetBalance,
} from '@/hooks/useAccount'
import { useTransactions, useUpdateTransaction, useDeleteTransaction } from '@/hooks/useTransaction'
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
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeftRight, SlidersHorizontal, MoreVertical,
  Pencil, Landmark, Smartphone, Wallet, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { AccountType, SetBalancePayload } from '@/models/account'
import { FinancialTransaction } from '@/models/transaction'
import { DOC_TYPE_LABELS } from '@/models/document'
import { TransactionCard } from '@/components/shared/TransactionCard'
import { SearchableSelect, SearchableSelectOption } from '@/components/shared/common/SearchableSelect'


const DOC_LABELS  = DOC_TYPE_LABELS as Record<string, string>
const getDocLabel = (t: string | null | undefined): string => t ? (DOC_LABELS[t] ?? t) : ''

const ACCOUNT_ICONS: Record<AccountType, typeof Landmark> = {
  bank: Landmark,
  upi:  Smartphone,
  cash: Wallet,
}


interface Props { id: number }


export function AccountDetailPage({ id }: Props) {
  const router       = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)

  const { data: account,      isLoading } = useAccount(id)
  const { data: txnsData }                = useTransactions({ account: id })
  const { data: allAccountsData }         = useAccounts({ is_active: true })

  // Latest first
  const txns = [...(txnsData?.results ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id,
  )
  const otherAccounts = (allAccountsData?.results ?? []).filter(a => a.id !== id)
  const allAccounts   = allAccountsData?.results ?? []

  // ── Account action sheet states ───────────────────────────────────────────
  const [transferOpen,    setTransferOpen]    = useState(false)
  const [adjustOpen,      setAdjustOpen]      = useState(false)
  const [editBalanceOpen, setEditBalanceOpen] = useState(false)
  const [editAccountOpen, setEditAccountOpen] = useState(false)
  const [deleteConfirm,   setDeleteConfirm]   = useState(false)

  // ── Transaction edit state ────────────────────────────────────────────────
  const [editTxn,        setEditTxn]        = useState<FinancialTransaction | null>(null)
  const [confirmTxnDel,  setConfirmTxnDel]  = useState(false)
  const [txnAmount,      setTxnAmount]      = useState('')
  const [txnDate,        setTxnDate]        = useState('')
  const [txnNotes,       setTxnNotes]       = useState('')
  const [txnAccountId,   setTxnAccountId]   = useState('')

  // ── Account form state ────────────────────────────────────────────────────
  const [toAccountId,    setToAccountId]    = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [adjustAmount,   setAdjustAmount]   = useState('')
  const [adjustNotes,    setAdjustNotes]    = useState('')
  const [directBalance,  setDirectBalance]  = useState('')
  const [editName,       setEditName]       = useState('')
  const [editType,       setEditType]       = useState<AccountType>('bank')
  const [editAccNum,     setEditAccNum]     = useState('')
  const [editIfsc,       setEditIfsc]       = useState('')
  const [editUpiId,      setEditUpiId]      = useState('')

  // ── Mutations ─────────────────────────────────────────────────────────────
  const transferMutation   = useTransfer()
  const adjustMutation     = useAdjustBalance(id)
  const setBalanceMutation = useSetBalance(id)
  const updateMutation     = useUpdateAccount(id)
  const deleteMutation     = useDeleteAccount()
  const updateTxnMutation  = useUpdateTransaction()
  const deleteTxnMutation  = useDeleteTransaction()

  useEffect(() => {
    if (account) setPageTitle(account.name)
  }, [account, setPageTitle])

  useEffect(() => {
    if (editAccountOpen && account) {
      setEditName(account.name)
      setEditType(account.type as AccountType)
      setEditAccNum(account.account_number ?? '')
      setEditIfsc(account.ifsc_code ?? '')
      setEditUpiId(account.upi_id ?? '')
    }
  }, [editAccountOpen, account])

  // Populate txn edit form when editTxn changes
  useEffect(() => {
    if (!editTxn) return
    setTxnAmount(String(Math.abs(Number(editTxn.amount))))
    setTxnDate(editTxn.date)
    setTxnNotes(editTxn.notes ?? '')
    setTxnAccountId(editTxn.payment_account ? String(editTxn.payment_account) : String(id))
  }, [editTxn, id])

  const accountOptions: SearchableSelectOption[] = allAccounts.map(a => ({
    value:    String(a.id),
    label:    a.name,
    sublabel: `${a.type} · ${fmtAmount(a.current_balance)}`,
  }))

  if (isLoading) return (
    <div className="px-4 py-4 space-y-3">
      <Skeleton className="h-36 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
    </div>
  )
  if (!account) return null

  const Icon    = ACCOUNT_ICONS[account.type as AccountType] ?? Wallet
  const balance = Number(account.current_balance)

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEditTxn = (txn: FinancialTransaction) => {
    if (txn.type === 'record') {
      // Record txns are managed via the document — redirect there
      if (txn.document) {
        router.push(`/documents/${txn.document}`)
      } else {
        toast.info('This record transaction has no linked document')
      }
      return
    }
    if (txn.type === 'contra') {
      toast.info('Transfer transactions are managed via the Transfers page')
      return
    }
    // actual → open edit sheet
    setEditTxn(txn)
  }

  const handleDeleteTxnPrompt = (txnId: number) => {
    const found = txns.find(t => t.id === txnId)
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
    setConfirmTxnDel(true)
  }

  const handleUpdateTxn = async () => {
    if (!editTxn || !txnAmount || Number(txnAmount) <= 0) {
      toast.error('Enter a valid amount'); return
    }
    const origSign  = Number(editTxn.amount) >= 0 ? 1 : -1
    const newAmount = String(origSign * Number(txnAmount))
    try {
      await updateTxnMutation.mutateAsync({
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

  const handleConfirmDeleteTxn = async () => {
    if (!editTxn) return
    try {
      await deleteTxnMutation.mutateAsync(editTxn.id)
      toast.success('Transaction deleted')
      setConfirmTxnDel(false)
      setEditTxn(null)
    } catch { toast.error('Failed to delete transaction') }
  }

  const handleTransfer = async () => {
    if (!toAccountId || !transferAmount || Number(transferAmount) <= 0) {
      toast.error('Select an account and enter a valid amount'); return
    }
    try {
      await transferMutation.mutateAsync({
        from_account: id,
        to_account:   Number(toAccountId),
        amount:       transferAmount,
      })
      toast.success('Transfer successful')
      setTransferOpen(false)
      setTransferAmount(''); setToAccountId('')
    } catch { toast.error('Transfer failed') }
  }

  const handleAdjust = async () => {
    if (!adjustAmount || Number(adjustAmount) === 0) {
      toast.error('Enter a non-zero amount'); return
    }
    try {
      await adjustMutation.mutateAsync({ amount: adjustAmount, notes: adjustNotes || undefined })
      toast.success('Balance adjusted')
      setAdjustOpen(false)
      setAdjustAmount(''); setAdjustNotes('')
    } catch { toast.error('Adjustment failed') }
  }

  const handleSetBalance = async () => {
    if (directBalance === '') { toast.error('Enter a balance'); return }
    try {
      await setBalanceMutation.mutateAsync({ current_balance: directBalance } as SetBalancePayload)
      toast.success('Balance updated')
      setEditBalanceOpen(false)
    } catch { toast.error('Failed to update') }
  }

  const handleUpdateAccount = async () => {
    if (!editName.trim()) { toast.error('Account name is required'); return }
    try {
      await updateMutation.mutateAsync({
        name:           editName.trim(),
        type:           editType,
        account_number: editType === 'bank' ? (editAccNum || null) : null,
        ifsc_code:      editType === 'bank' ? (editIfsc   || null) : null,
        upi_id:         editType === 'upi'  ? (editUpiId  || null) : null,
      })
      toast.success('Account updated')
      setEditAccountOpen(false)
    } catch { toast.error('Failed to update account') }
  }

  const handleDeleteAccount = async () => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success(`"${account.name}" deleted`)
      router.replace('/accounts')
    } catch { toast.error('Failed to delete account') }
  }

  return (
    <div className="pb-10">

      {/* ── Balance card ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-4">
        <Card className="bg-primary text-primary-foreground overflow-hidden rounded-2xl shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium opacity-80 capitalize">{account.type}</span>
                </div>
                <p className="text-3xl font-bold tracking-tight">
                  {fmtAmount(account.current_balance)}
                </p>
                <p className="text-sm font-medium opacity-90 mt-1">{account.name}</p>
                {account.account_number && (
                  <p className="text-xs font-mono opacity-70 mt-1">
                    •••• {account.account_number.slice(-4)}
                  </p>
                )}
                {account.upi_id && (
                  <p className="text-xs opacity-70 mt-1">{account.upi_id}</p>
                )}
                {account.ifsc_code && (
                  <p className="text-xs opacity-70 mt-0.5 font-mono">IFSC: {account.ifsc_code}</p>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    className="text-primary-foreground hover:bg-primary-foreground/20 -mr-2"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditAccountOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setDirectBalance(account.current_balance)
                    setEditBalanceOpen(true)
                  }}>
                    <SlidersHorizontal className="mr-2 h-4 w-4" /> Set Balance Directly
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Action buttons ────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-3">
        <Button
          variant="outline" className="h-12 gap-2 rounded-xl"
          onClick={() => { setTransferAmount(''); setToAccountId(''); setTransferOpen(true) }}
        >
          <ArrowLeftRight className="h-4 w-4" /> Transfer
        </Button>
        <Button
          variant="outline" className="h-12 gap-2 rounded-xl"
          onClick={() => { setAdjustAmount(''); setAdjustNotes(''); setAdjustOpen(true) }}
        >
          <SlidersHorizontal className="h-4 w-4" /> Adjust
        </Button>
      </div>

      <Separator />

      {/* ── Transaction history ───────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-2">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Transaction History
        </h2>
      </div>
      <div className="px-4 space-y-2 pb-4">
        {txns.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">No transactions yet</p>
        ) : (
          txns.map(txn => (
            <TransactionCard
              key={txn.id}
              txn={txn}
              showContact={true}
              onEdit={() => handleEditTxn(txn)}
              onDelete={handleDeleteTxnPrompt}
            />
          ))
        )}
      </div>

      {/* ── Transaction edit sheet ────────────────────────────────────────── */}
      <Sheet open={!!editTxn && !confirmTxnDel} onOpenChange={v => { if (!v) setEditTxn(null) }}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[90vh] overflow-y-auto">
          {editTxn && (
            <>
              <SheetHeader className="mb-5">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-left flex items-center gap-2">
                    <Pencil className="h-4 w-4" /> Edit Transaction
                  </SheetTitle>
                  <button
                    onClick={() => setConfirmTxnDel(true)}
                    className="flex items-center gap-1.5 text-xs text-destructive font-bold px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </SheetHeader>

              {/* Txn summary */}
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
                  disabled={updateTxnMutation.isPending}
                >
                  {updateTxnMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Transaction delete confirm ────────────────────────────────────── */}
      <AlertDialog open={confirmTxnDel} onOpenChange={setConfirmTxnDel}>
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
            <AlertDialogCancel className="h-11 rounded-xl border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteTxn}
              disabled={deleteTxnMutation.isPending}
              className="h-11 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              {deleteTxnMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Transfer sheet ────────────────────────────────────────────────── */}
      <Sheet open={transferOpen} onOpenChange={setTransferOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left">Transfer Funds</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
              <span className="text-sm text-muted-foreground">From</span>
              <div className="text-right">
                <p className="text-sm font-semibold">{account.name}</p>
                <p className="text-xs text-muted-foreground">Available: {fmtAmount(account.current_balance)}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>To Account <span className="text-destructive">*</span></Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {otherAccounts.length === 0 ? (
                    <SelectItem value="__none__" disabled>No other accounts</SelectItem>
                  ) : (
                    otherAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.name} — {fmtAmount(a.current_balance)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount <span className="text-destructive">*</span></Label>
              <Input
                type="number" placeholder="0.00"
                value={transferAmount}
                onChange={e => setTransferAmount(e.target.value)}
                className="text-lg h-12 rounded-xl"
              />
            </div>
            {Number(transferAmount) > 0 && (
              <div className="flex justify-between text-sm font-medium px-3 py-2.5 rounded-xl bg-primary/5 text-primary border border-primary/10">
                <span>Balance after transfer</span>
                <span className={cn('font-bold', Number(transferAmount) > balance && 'text-red-500')}>
                  {fmtAmount(balance - Number(transferAmount))}
                </span>
              </div>
            )}
            <Button
              className="w-full h-12 rounded-xl" onClick={handleTransfer}
              disabled={transferMutation.isPending}
            >
              {transferMutation.isPending ? 'Transferring...' : 'Confirm Transfer'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Adjust balance sheet ──────────────────────────────────────────── */}
      <Sheet open={adjustOpen} onOpenChange={setAdjustOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left">Adjust Balance</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
              <span className="text-sm text-muted-foreground">Current Balance</span>
              <span className="font-bold">{fmtAmount(account.current_balance)}</span>
            </div>
            <div className="space-y-1.5">
              <Label>
                Amount
                <span className="text-xs text-muted-foreground ml-2 font-normal">
                  use − for deduction (e.g. −500)
                </span>
              </Label>
              <Input
                type="number" placeholder="+178 or -500"
                value={adjustAmount}
                onChange={e => setAdjustAmount(e.target.value)}
                className="text-lg h-12 rounded-xl"
              />
            </div>
            {adjustAmount !== '' && Number(adjustAmount) !== 0 && (
              <div className="flex justify-between text-sm font-medium px-3 py-2.5 rounded-xl bg-primary/5 text-primary border border-primary/10">
                <span>Balance after</span>
                <span className="font-bold">{fmtAmount(balance + Number(adjustAmount))}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Note <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                placeholder="e.g. Banking interest, correction"
                value={adjustNotes}
                onChange={e => setAdjustNotes(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <Button
              className="w-full h-12 rounded-xl" onClick={handleAdjust}
              disabled={adjustMutation.isPending}
            >
              {adjustMutation.isPending ? 'Adjusting...' : 'Confirm Adjustment'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Set balance directly sheet ────────────────────────────────────── */}
      <Sheet open={editBalanceOpen} onOpenChange={setEditBalanceOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left">Set Balance Directly</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              <span className="mt-0.5 text-base">⚠️</span>
              <span className="leading-relaxed">
                This <strong>directly overwrites</strong> the balance.
                No transaction is recorded. Use Adjust for an auditable correction.
              </span>
            </div>
            <div className="space-y-1.5">
              <Label>New Balance</Label>
              <Input
                type="number"
                value={directBalance}
                onChange={e => setDirectBalance(e.target.value)}
                className="text-lg h-12 rounded-xl"
              />
            </div>
            <Button
              className="w-full h-12 rounded-xl" onClick={handleSetBalance}
              disabled={setBalanceMutation.isPending}
            >
              {setBalanceMutation.isPending ? 'Saving...' : 'Set Balance'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Edit Account sheet ────────────────────────────────────────────── */}
      <Sheet open={editAccountOpen} onOpenChange={setEditAccountOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[90vh] overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left">Edit Account</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Account Name <span className="text-destructive">*</span></Label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="e.g. HDFC Current"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={editType} onValueChange={v => {
                setEditType(v as AccountType)
                setEditAccNum(''); setEditIfsc(''); setEditUpiId('')
              }}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editType === 'bank' && (
              <>
                <div className="space-y-1.5">
                  <Label>Account Number <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    value={editAccNum}
                    onChange={e => setEditAccNum(e.target.value)}
                    placeholder="e.g. 34455642507"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>IFSC Code <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    value={editIfsc}
                    onChange={e => setEditIfsc(e.target.value.toUpperCase())}
                    placeholder="e.g. UTIB0001234"
                    className="h-11 rounded-xl"
                  />
                </div>
              </>
            )}
            {editType === 'upi' && (
              <div className="space-y-1.5">
                <Label>UPI ID <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  value={editUpiId}
                  onChange={e => setEditUpiId(e.target.value)}
                  placeholder="e.g. name@upi"
                  className="h-11 rounded-xl"
                />
              </div>
            )}
            <Button
              className="w-full h-12 rounded-xl" onClick={handleUpdateAccount}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Delete account confirmation sheet ────────────────────────────── */}
      <Sheet open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left text-destructive">Delete Account</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
              <Trash2 className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">Delete "{account.name}"?</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This deactivates the account. All past transactions linked to it
                  remain intact and are never deleted.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline" className="h-12 rounded-xl"
                onClick={() => setDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive" className="h-12 rounded-xl"
                onClick={handleDeleteAccount}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  )
}
