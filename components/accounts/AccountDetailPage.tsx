// components/accounts/AccountDetailPage.tsx
'use client'

import { useEffect, useState } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useAccount, useUpdateAccount, useTransfer, useAdjustBalance, useSetBalance } from '@/hooks/useAccount'
import { useTransactions } from '@/hooks/useTransaction'
import { useAccounts } from '@/hooks/useAccount'
import { fmtAmount, fmtDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeftRight, SlidersHorizontal, MoreVertical, Pencil } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface Props { id: number }

export function AccountDetailPage({ id }: Props) {
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  const { data: account, isLoading } = useAccount(id)
  const { data: txnsData } = useTransactions({ account: id })
  const { data: allAccounts } = useAccounts()
  const txns = txnsData?.results ?? []

  const [transferOpen, setTransferOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [editBalanceOpen, setEditBalanceOpen] = useState(false)

  // Transfer state
  const [toAccountId, setToAccountId] = useState('')
  const [transferAmount, setTransferAmount] = useState('')

  // Adjust state
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')

  // Direct balance edit
  const [directBalance, setDirectBalance] = useState('')

  const transferMutation = useTransfer()
  const adjustMutation = useAdjustBalance(id)
  const setBalanceMutation = useSetBalance(id)

  useEffect(() => {
    if (account) setPageTitle(account.name)
  }, [account, setPageTitle])

  if (isLoading) return <div className="px-4 py-4 space-y-3"><Skeleton className="h-32 rounded-xl" /></div>
  if (!account) return null

  const otherAccounts = allAccounts?.results.filter(a => a.id !== id) ?? []

  const handleTransfer = async () => {
    if (!toAccountId || !transferAmount) { toast.error('Fill all fields'); return }
    try {
      await transferMutation.mutateAsync({
        from_account: id,
        to_account: Number(toAccountId),
        amount: transferAmount,
      })
      toast.success('Transfer successful')
      setTransferOpen(false)
      setTransferAmount(''); setToAccountId('')
    } catch { toast.error('Transfer failed') }
  }

  const handleAdjust = async () => {
    if (!adjustAmount) { toast.error('Enter amount'); return }
    try {
      await adjustMutation.mutateAsync({ amount: adjustAmount, notes: adjustNotes || undefined })
      toast.success('Balance adjusted')
      setAdjustOpen(false)
      setAdjustAmount(''); setAdjustNotes('')
    } catch { toast.error('Adjustment failed') }
  }

  const handleSetBalance = async () => {
    if (!directBalance) { toast.error('Enter balance'); return }
    try {
      await setBalanceMutation.mutateAsync(directBalance)
      toast.success('Balance updated')
      setEditBalanceOpen(false)
    } catch { toast.error('Failed to update') }
  }

  return (
    <div className="px-4 py-4 space-y-4 pb-8">

      {/* Balance Card */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-80 capitalize">{account.type} Account</p>
              <p className="text-3xl font-bold mt-1">{fmtAmount(account.current_balance)}</p>
              <p className="text-sm opacity-70 mt-1">{account.name}</p>
              {account.account_number && (
                <p className="text-xs opacity-60 mt-0.5">•••• {account.account_number.slice(-4)}</p>
              )}
              {account.upi_id && (
                <p className="text-xs opacity-60 mt-0.5">{account.upi_id}</p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setDirectBalance(account.current_balance); setEditBalanceOpen(true) }}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit Balance Directly
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-12 gap-2" onClick={() => setTransferOpen(true)}>
          <ArrowLeftRight className="h-4 w-4" /> Transfer
        </Button>
        <Button variant="outline" className="h-12 gap-2" onClick={() => setAdjustOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" /> Adjust
        </Button>
      </div>

      {/* Transaction History */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Transaction History
        </h2>
        <div className="space-y-2">
          {txns.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No transactions yet</p>}
          {txns.map((txn) => (
            <Card key={txn.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] h-4 capitalize">{txn.type}</Badge>
                    {txn.document && <span className="text-xs text-primary">Doc #{txn.document}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(txn.date)}</p>
                  {txn.notes && <p className="text-xs text-muted-foreground">{txn.notes}</p>}
                </div>
                <p className={`text-sm font-bold ${Number(txn.amount) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Number(txn.amount) >= 0 ? '+' : ''}{fmtAmount(txn.amount)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Transfer Sheet */}
      <Sheet open={transferOpen} onOpenChange={setTransferOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">Transfer Funds</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-muted/40 text-sm">
              From: <span className="font-semibold">{account.name}</span>
            </div>
            <div className="space-y-1.5">
              <Label>To Account</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {otherAccounts.map(a => (
                    <SelectItem key={a.id} value={a.id.toString()}>{a.name} — {fmtAmount(a.current_balance)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" placeholder="0.00" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleTransfer} disabled={transferMutation.isPending}>
              {transferMutation.isPending ? 'Transferring...' : 'Confirm Transfer'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Adjust Sheet */}
      <Sheet open={adjustOpen} onOpenChange={setAdjustOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">Adjust Balance</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount <span className="text-xs text-muted-foreground">(use − for deduction)</span></Label>
              <Input type="number" placeholder="+178 or -500" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Note <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input placeholder="e.g. Banking interest" value={adjustNotes} onChange={e => setAdjustNotes(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleAdjust} disabled={adjustMutation.isPending}>
              {adjustMutation.isPending ? 'Adjusting...' : 'Confirm Adjustment'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Direct Balance Edit Sheet */}
      <Sheet open={editBalanceOpen} onOpenChange={setEditBalanceOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">Set Balance Directly</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground mb-4">This directly overwrites the balance. No transaction is recorded.</p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>New Balance</Label>
              <Input type="number" value={directBalance} onChange={e => setDirectBalance(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleSetBalance} disabled={setBalanceMutation.isPending}>
              {setBalanceMutation.isPending ? 'Saving...' : 'Set Balance'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
