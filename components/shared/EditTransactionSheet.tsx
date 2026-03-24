'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/shared/common/SearchableSelect'
import { useAccounts } from '@/hooks/useAccount'
import { useUpdateTransaction } from '@/hooks/useTransaction'
import { cn, fmtAmount, fmtDate } from '@/lib/utils'
import { DOC_TYPE_LABELS } from '@/models/document'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { FinancialTransaction } from '@/models/transaction'

const DOC_LABELS  = DOC_TYPE_LABELS as Record<string, string>
const getDocLabel = (t: string | null | undefined) => t ? (DOC_LABELS[t] ?? t) : ''

interface Props {
  txn:        FinancialTransaction | null
  open:       boolean
  onClose:    () => void
  contactId?: number   // if provided, ledger/contact queries are also invalidated
  onDelete?:  () => void  // caller handles the confirm dialog
}

export function EditTransactionSheet({ txn, open, onClose, contactId, onDelete }: Props) {
  const { data: accountsData } = useAccounts({ is_active: true })
  const updateMutation         = useUpdateTransaction(contactId)

  const [amount,  setAmount]  = useState('')
  const [date,    setDate]    = useState('')
  const [notes,   setNotes]   = useState('')
  const [account, setAccount] = useState('')

  useEffect(() => {
    if (open && txn) {
      // Always edit the absolute value — sign is preserved on save
      setAmount(String(Math.abs(Number(txn.amount))))
      setDate(txn.date)
      setNotes(txn.notes ?? '')
      setAccount(txn.payment_account?.toString() ?? '')
    }
  }, [open, txn])

  const accountOptions = (accountsData?.results ?? []).map(a => ({
    value:    a.id.toString(),
    label:    a.name,
    sublabel: a.type,
    meta:     fmtAmount(a.current_balance),
  }))

  const handleSave = async () => {
    if (!txn) return
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return }

    // Preserve the original sign
    const origSign  = Number(txn.amount) >= 0 ? 1 : -1
    const newAmount = String(origSign * Number(amount))

    try {
      await updateMutation.mutateAsync({
        id:              txn.id,
        amount:          newAmount,
        date,
        notes:           notes.trim() || undefined,
        payment_account: account ? Number(account) : null,
      })
      toast.success('Transaction updated')
      onClose()
    } catch {
      toast.error('Failed to update transaction')
    }
  }

  if (!txn) return null

  const originalAmount = Math.abs(Number(txn.amount))
  const newAmount      = Number(amount) || 0
  const amountChanged  = newAmount !== originalAmount
  const isOutgoing     = Number(txn.amount) >= 0

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-5">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-left flex items-center gap-2">
              <Pencil className="h-4 w-4" /> Edit Transaction
            </SheetTitle>
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 text-xs text-destructive font-bold px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </div>
        </SheetHeader>

        {/* ── Transaction summary pill ─────────────────────────────── */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-muted mb-5">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="default"
                className="text-[10px] uppercase font-bold tracking-wider rounded-md h-5 px-1.5"
              >
                actual
              </Badge>
              {txn.document && (
                <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  {getDocLabel(txn.document_type)} #{txn.document}
                </span>
              )}
              {txn.is_document_deleted && (
                <Badge variant="destructive" className="text-[10px] h-5 rounded-md px-1.5">
                  doc deleted
                </Badge>
              )}
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              {txn.contact_name && (
                <span className="font-semibold text-foreground mr-1">{txn.contact_name}</span>
              )}
              Recorded {fmtDate(txn.date)}
            </p>
          </div>
          {/* Fix: Math.abs prevents ₹-1,000 rendering */}
          <p className={cn(
            'text-lg font-black shrink-0 tabular-nums',
            isOutgoing ? 'text-red-600' : 'text-emerald-600',
          )}>
            {isOutgoing ? '+' : '-'}{fmtAmount(originalAmount)}
          </p>
        </div>

        {/* Document-linked warning */}
        {txn.document && !txn.is_document_deleted && (
          <div className="text-xs font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5 mb-5 flex gap-2 items-start">
            <span className="mt-0.5">⚠️</span>
            <span>
              Linked to <strong>{txn.doc_id ?? 'a document'}</strong>.
              Editing the amount here only updates this payment — edit the document to change its total.
            </span>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Amount
              <span className="text-[10px] text-muted-foreground ml-2 font-normal uppercase tracking-wider">
                ({isOutgoing ? 'Dr / outgoing' : 'Cr / incoming'} — sign preserved)
              </span>
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              className="text-lg font-bold h-12 rounded-xl"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
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
              className="h-11 rounded-xl"
              value={date}
              onChange={e => setDate(e.target.value)}
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
              searchPlaceholder="Search accounts..."
              clearable
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Notes{' '}
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              placeholder="Add a note..."
              className="h-11 rounded-xl"
              value={notes}
              onChange={e => setNotes(e.target.value)}
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
