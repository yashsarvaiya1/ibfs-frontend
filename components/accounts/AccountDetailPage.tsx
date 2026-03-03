'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import {
  useAccount,
  useTransfer,
  useAdjustBalance,
  useSetBalance,
  useAccounts,
} from '@/hooks/useAccount'
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransaction'
import { fmtAmount } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeftRight, SlidersHorizontal,
  MoreVertical, Pencil, Landmark, Smartphone, Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import type { AccountType } from '@/models/account'
import type { SetBalancePayload } from '@/models/account'
import { TransactionCard } from '@/components/shared/TransactionCard'

const ACCOUNT_ICONS: Record<AccountType, typeof Landmark> = {
  bank: Landmark,
  upi:  Smartphone,
  cash: Wallet,
}

interface Props { id: number }

export function AccountDetailPage({ id }: Props) {
  const setPageTitle = useUIStore((s) => s.setPageTitle)

  const { data: account,      isLoading } = useAccount(id)
  const { data: txnsData }                = useTransactions({ account: id })
  const { data: allAccountsData }         = useAccounts({ is_active: true })

  const txns          = txnsData?.results ?? []
  const otherAccounts = (allAccountsData?.results ?? []).filter(a => a.id !== id)

  const [transferOpen,    setTransferOpen]    = useState(false)
  const [adjustOpen,      setAdjustOpen]      = useState(false)
  const [editBalanceOpen, setEditBalanceOpen] = useState(false)

  const [toAccountId,    setToAccountId]    = useState('')
  const [transferAmount, setTransferAmount] = useState('')

  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustNotes,  setAdjustNotes]  = useState('')

  const [directBalance, setDirectBalance] = useState('')

  const transferMutation   = useTransfer()
  const adjustMutation     = useAdjustBalance(id)
  const setBalanceMutation = useSetBalance(id)
  const deleteMutation     = useDeleteTransaction()

  useEffect(() => {
    if (account) setPageTitle(account.name)
  }, [account, setPageTitle])

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
    } catch {
      toast.error('Transfer failed')
    }
  }

  const handleAdjust = async () => {
    if (!adjustAmount || Number(adjustAmount) === 0) {
      toast.error('Enter a non-zero amount'); return
    }
    try {
      await adjustMutation.mutateAsync({
        amount: adjustAmount,
        notes:  adjustNotes || undefined,
      })
      toast.success('Balance adjusted')
      setAdjustOpen(false)
      setAdjustAmount(''); setAdjustNotes('')
    } catch {
      toast.error('Adjustment failed')
    }
  }

  const handleSetBalance = async () => {
    if (directBalance === '') { toast.error('Enter a balance'); return }
    try {
      const payload: SetBalancePayload = { current_balance: directBalance }
      await setBalanceMutation.mutateAsync(payload)
      toast.success('Balance updated')
      setEditBalanceOpen(false)
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleDeleteTxn = async (txnId: number) => {
    try {
      await deleteMutation.mutateAsync(txnId)
      toast.success('Transaction deleted')
    } catch {
      toast.error('Failed to delete transaction')
    }
  }

  return (
    <div className="pb-10">
      {/* ── Balance card ──────────────────────────────────────────────────── */}
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
                    variant="ghost"
                    size="icon"
                    className="text-primary-foreground hover:bg-primary-foreground/20 -mr-2"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setDirectBalance(account.current_balance)
                      setEditBalanceOpen(true)
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit Balance Directly
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
          variant="outline"
          className="h-12 gap-2 rounded-xl"
          onClick={() => {
            setTransferAmount(''); setToAccountId('')
            setTransferOpen(true)
          }}
        >
          <ArrowLeftRight className="h-4 w-4" /> Transfer
        </Button>
        <Button
          variant="outline"
          className="h-12 gap-2 rounded-xl"
          onClick={() => {
            setAdjustAmount(''); setAdjustNotes('')
            setAdjustOpen(true)
          }}
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
          <p className="text-center text-muted-foreground text-sm py-8">
            No transactions yet
          </p>
        ) : (
          txns.map(txn => (
            <TransactionCard
              key={txn.id}
              txn={txn}
              showContact={true}
              onDelete={handleDeleteTxn}
            />
          ))
        )}
      </div>

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
                <p className="text-xs text-muted-foreground">
                  Available: {fmtAmount(account.current_balance)}
                </p>
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
                    <SelectItem value="__none__" disabled>
                      No other accounts
                    </SelectItem>
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
                type="number"
                placeholder="0.00"
                value={transferAmount}
                onChange={e => setTransferAmount(e.target.value)}
                className="text-lg h-12 rounded-xl"
              />
            </div>

            {Number(transferAmount) > 0 && (
              <div className="flex justify-between text-sm font-medium px-3 py-2.5 rounded-xl bg-primary/5 text-primary border border-primary/10 mt-2">
                <span>Balance after transfer</span>
                <span className={cn(
                  'font-bold',
                  Number(transferAmount) > balance && 'text-red-500'
                )}>
                  {fmtAmount(balance - Number(transferAmount))}
                </span>
              </div>
            )}

            <Button
              className="w-full h-12 text-md mt-2 rounded-xl"
              onClick={handleTransfer}
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
                type="number"
                placeholder="+178 or -500"
                value={adjustAmount}
                onChange={e => setAdjustAmount(e.target.value)}
                className="text-lg h-12 rounded-xl"
              />
            </div>

            {adjustAmount !== '' && Number(adjustAmount) !== 0 && (
              <div className="flex justify-between text-sm font-medium px-3 py-2.5 rounded-xl bg-primary/5 text-primary border border-primary/10 mt-2">
                <span>Balance after</span>
                <span className="font-bold">{fmtAmount(balance + Number(adjustAmount))}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>
                Note
                <span className="text-xs text-muted-foreground ml-1">(optional)</span>
              </Label>
              <Input
                placeholder="e.g. Banking interest, correction"
                value={adjustNotes}
                onChange={e => setAdjustNotes(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <Button
              className="w-full h-12 text-md mt-2 rounded-xl"
              onClick={handleAdjust}
              disabled={adjustMutation.isPending}
            >
              {adjustMutation.isPending ? 'Adjusting...' : 'Confirm Adjustment'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Direct balance edit sheet ─────────────────────────────────────── */}
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
              className="w-full h-12 text-md mt-2 rounded-xl"
              onClick={handleSetBalance}
              disabled={setBalanceMutation.isPending}
            >
              {setBalanceMutation.isPending ? 'Saving...' : 'Set Balance'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
