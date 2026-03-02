'use client'

import { useState, useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useAccounts, useTransfer } from '@/hooks/useAccount'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/shared/common/SearchableSelect'
import { fmtAmount } from '@/lib/utils'
import { toast } from 'sonner'
import { ArrowDown } from 'lucide-react'

export function TransferSheet() {
  const { transferSheetOpen, closeTransferSheet } = useUIStore()

  const { data: accounts } = useAccounts({ is_active: true })
  const transferMut        = useTransfer()

  const [fromId,  setFromId]  = useState('')
  const [toId,    setToId]    = useState('')
  const [amount,  setAmount]  = useState('')

  // Reset on open
  useEffect(() => {
    if (transferSheetOpen) {
      setFromId(''); setToId(''); setAmount('')
    }
  }, [transferSheetOpen])

  const allAccounts = accounts?.results ?? []

  const accountOptions = allAccounts.map(a => ({
    value:    a.id.toString(),
    label:    a.name,
    sublabel: a.type,
    meta:     fmtAmount(a.current_balance),
  }))

  // Exclude the selected "from" account from "to" options and vice versa
  const toOptions   = accountOptions.filter(a => a.value !== fromId)
  const fromOptions = accountOptions.filter(a => a.value !== toId)

  const fromAccount = allAccounts.find(a => a.id.toString() === fromId)
  const toAccount   = allAccounts.find(a => a.id.toString() === toId)

  const handleTransfer = async () => {
    if (!fromId || !toId)                    { toast.error('Select both accounts');         return }
    if (!amount || Number(amount) <= 0)      { toast.error('Enter a valid amount');         return }

    try {
      await transferMut.mutateAsync({
        from_account: Number(fromId),
        to_account:   Number(toId),
        amount,
      })
      toast.success('Transfer successful')
      closeTransferSheet()
    } catch {
      toast.error('Transfer failed')
    }
  }

  const afterFrom = fromAccount
    ? Number(fromAccount.current_balance) - Number(amount || 0)
    : null

  return (
    <Sheet open={transferSheetOpen} onOpenChange={(open) => !open && closeTransferSheet()}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">Transfer Funds</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>From Account <span className="text-destructive">*</span></Label>
            <SearchableSelect
              options={fromOptions}
              value={fromId}
              onChange={(v) => { setFromId(v); if (v === toId) setToId('') }}
              placeholder="Select source account"
              title="From Account"
              clearable
            />
          </div>

          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>To Account <span className="text-destructive">*</span></Label>
            <SearchableSelect
              options={toOptions}
              value={toId}
              onChange={(v) => { setToId(v); if (v === fromId) setFromId('') }}
              placeholder="Select destination account"
              title="To Account"
              clearable
            />
          </div>

          <div className="space-y-1.5">
            <Label>Amount <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="h-12 text-lg"
            />
          </div>

          {/* Transfer preview */}
          {Number(amount) > 0 && fromAccount && toAccount && (
            <div className="rounded-xl border bg-muted/30 p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{fromAccount.name} after</span>
                <span className={`font-bold ${afterFrom! < 0 ? 'text-red-500' : ''}`}>
                  {fmtAmount(afterFrom!)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{toAccount.name} after</span>
                <span className="font-bold">
                  {fmtAmount(Number(toAccount.current_balance) + Number(amount))}
                </span>
              </div>
            </div>
          )}

          <Button
            className="w-full h-12"
            onClick={handleTransfer}
            disabled={transferMut.isPending}
          >
            {transferMut.isPending ? 'Transferring...' : 'Confirm Transfer'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
