'use client'

import { useState, useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useAccount, useAdjustBalance } from '@/hooks/useAccount'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fmtAmount } from '@/lib/utils'
import { SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'

export function AdjustBalanceSheet() {
  const {
    adjustBalanceSheetOpen,
    adjustBalanceAccountId,
    closeAdjustBalanceSheet,
  } = useUIStore()

  const accountId = adjustBalanceAccountId ?? 0

  const { data: account }  = useAccount(accountId)
  const adjustMut          = useAdjustBalance(accountId)

  const [amount, setAmount] = useState('')
  const [notes,  setNotes]  = useState('')
  const [date,   setDate]   = useState('')

  // Reset on open
  useEffect(() => {
    if (adjustBalanceSheetOpen) {
      setAmount('')
      setNotes('')
      setDate(new Date().toISOString().split('T')[0])
    }
  }, [adjustBalanceSheetOpen])

  const currentBalance = Number(account?.current_balance ?? 0)
  const delta          = Number(amount) || 0
  const afterBalance   = currentBalance + delta

  const handleSubmit = async () => {
    if (!amount || Number(amount) === 0) {
      toast.error('Enter a non-zero amount')
      return
    }
    try {
      await adjustMut.mutateAsync({
        amount,
        date,
        notes: notes || undefined,
      })
      toast.success('Balance adjusted')
      closeAdjustBalanceSheet()
    } catch {
      toast.error('Adjustment failed')
    }
  }

  return (
    <Sheet
      open={adjustBalanceSheetOpen}
      onOpenChange={(open) => !open && closeAdjustBalanceSheet()}
    >
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Adjust Balance
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">

          {/* Account context */}
          {account && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <div>
                <p className="text-xs text-muted-foreground">Account</p>
                <p className="text-sm font-semibold">{account.name}</p>
                <p className="text-xs capitalize text-muted-foreground">{account.type}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Current Balance</p>
                <p className="text-sm font-bold">{fmtAmount(account.current_balance)}</p>
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>
              Amount
              <span className="text-xs text-muted-foreground ml-2 font-normal">
                use − for deduction (e.g. −500)
              </span>
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="+178 or -500"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="text-lg h-12"
            />
          </div>

          {/* Balance after preview */}
          {amount !== '' && delta !== 0 && (
            <div className="flex justify-between text-sm font-medium px-3 py-2.5 rounded-xl bg-primary/5 text-primary border border-primary/10">
              <span>Balance after</span>
              <span className="font-bold">{fmtAmount(afterBalance)}</span>
            </div>
          )}

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>
              Note
              <span className="text-xs text-muted-foreground ml-1">(optional)</span>
            </Label>
            <Input
              placeholder="e.g. Banking interest, correction"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <Button
            className="w-full h-12"
            onClick={handleSubmit}
            disabled={adjustMut.isPending}
          >
            {adjustMut.isPending ? 'Adjusting...' : 'Confirm Adjustment'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
