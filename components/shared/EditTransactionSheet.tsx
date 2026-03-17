// components/shared/EditTransactionSheet.tsx
'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/shared/common/SearchableSelect'
import { useAccounts } from '@/hooks/useAccount'
import { useUpdateTransaction } from '@/hooks/useTransaction'
import { fmtAmount } from '@/lib/utils'
import { toast } from 'sonner'
import type { FinancialTransaction } from '@/models/transaction'

interface Props {
  txn:       FinancialTransaction | null
  open:      boolean
  onClose:   () => void
  contactId?: number   // if provided, ledger queries are also invalidated
}

export function EditTransactionSheet({ txn, open, onClose, contactId }: Props) {
  const { data: accountsData } = useAccounts({ is_active: true })
  const updateMutation = useUpdateTransaction(contactId)

  const [amount,  setAmount]  = useState('')
  const [date,    setDate]    = useState('')
  const [notes,   setNotes]   = useState('')
  const [account, setAccount] = useState('')

  // Pre-fill on open
  useEffect(() => {
    if (open && txn) {
      setAmount(txn.amount)
      setDate(txn.date)
      setNotes(txn.notes ?? '')
      setAccount(txn.payment_account?.toString() ?? '')
    }
  }, [open, txn])

  const allAccounts = accountsData?.results ?? []
  const accountOptions = allAccounts.map(a => ({
    value:    a.id.toString(),
    label:    a.name,
    sublabel: a.type,
    meta:     fmtAmount(a.current_balance),
  }))

  const handleSave = async () => {
    if (!txn) return
    if (!amount || Number(amount) === 0) {
      toast.error('Enter a valid amount')
      return
    }
    try {
      await updateMutation.mutateAsync({
        id:              txn.id,
        amount,
        date,
        notes:           notes || undefined,
        payment_account: account ? Number(account) : null,
      })
      toast.success('Transaction updated')
      onClose()
    } catch {
      toast.error('Failed to update transaction')
    }
  }

  if (!txn) return null

  const originalAmount = Number(txn.amount)
  const newAmount      = Number(amount) || 0
  const amountChanged  = newAmount !== originalAmount

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="text-left">Edit Transaction</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Record transaction warning — shown when editing an actual
              that has a companion record txn (document-linked) */}
          {txn.document && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              <span className="text-base mt-0.5">ℹ️</span>
              <span className="leading-relaxed">
                This payment is linked to <strong>{txn.doc_id ?? 'a document'}</strong>.
                Editing the amount here only updates this payment transaction.
                To change the document total, edit the document itself.
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>
              Amount
              <span className="text-xs text-muted-foreground ml-1 font-normal">(signed)</span>
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="h-12 text-lg rounded-xl"
            />
            {amountChanged && (
              <p className="text-xs text-muted-foreground px-1">
                Was {fmtAmount(originalAmount)} → now {fmtAmount(newAmount)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Payment Account</Label>
            <SearchableSelect
              options={accountOptions}
              value={account}
              onChange={setAccount}
              placeholder="Select account"
              title="Payment Account"
              clearable
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              placeholder="Add a note..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button variant="outline" className="h-12 rounded-xl" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="h-12 rounded-xl"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
