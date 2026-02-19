// components/accounts/ContraSheet.tsx

'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionService } from '@/services/transactionService'
import { usePaymentAccounts } from '@/hooks/usePaymentAccount'
import { ACCOUNT_TYPE_LABELS } from '@/models/paymentAccount'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowDown } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  defaultSourceId?: number
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export function ContraSheet({ open, onClose, defaultSourceId }: Props) {
  const qc = useQueryClient()
  const { data } = usePaymentAccounts()
  const accounts = data?.results ?? []

  const [sourceId, setSourceId] = useState<string>('')
  const [destId,   setDestId]   = useState<string>('')
  const [amount,   setAmount]   = useState('')
  const [date,     setDate]     = useState(today())
  const [notes,    setNotes]    = useState('')

  useEffect(() => {
    if (open) {
      setSourceId(defaultSourceId?.toString() ?? '')
      setDestId('')
      setAmount('')
      setDate(today())
      setNotes('')
    }
  }, [open, defaultSourceId])

  // Two regular transaction creates — source negative, dest positive
  const contraTransfer = useMutation({
    mutationFn: async () => {
      const amt      = parseFloat(amount)
      const dateVal  = date
      const notesVal = notes || undefined

      await transactionService.create({
        transaction_type:  'contra',
        payment_account:   Number(sourceId),
        amount:            (-amt).toFixed(2),
        transaction_date:  dateVal,
        notes:             notesVal,
        contact:           null,
        document:          null,
      })

      await transactionService.create({
        transaction_type:  'contra',
        payment_account:   Number(destId),
        amount:            amt.toFixed(2),
        transaction_date:  dateVal,
        notes:             notesVal,
        contact:           null,
        document:          null,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['payment-accounts'] })
      toast.success('Transfer recorded')
      onClose()
    },
    onError: () => toast.error('Transfer failed'),
  })

  const handleSubmit = () => {
    if (!sourceId)                 { toast.error('Select source account'); return }
    if (!destId)                   { toast.error('Select destination account'); return }
    if (sourceId === destId)       { toast.error('Source and destination must be different'); return }
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return }
    contraTransfer.mutate()
  }

  const sourceAccount = accounts.find((a) => a.id.toString() === sourceId)
  const destAccount   = accounts.find((a) => a.id.toString() === destId)

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto px-4 pb-8">
        <SheetHeader className="mb-5">
          <SheetTitle>Transfer Between Accounts</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">

          {/* Source */}
          <div className="space-y-1.5">
            <Label>From</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select source account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem
                    key={acc.id}
                    value={acc.id.toString()}
                    disabled={acc.id.toString() === destId}
                  >
                    {acc.name} · {ACCOUNT_TYPE_LABELS[acc.account_type]} · ₹{parseFloat(acc.current_balance).toLocaleString('en-IN')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sourceAccount && (
              <p className="text-xs text-muted-foreground px-1">
                Available: ₹{parseFloat(sourceAccount.current_balance).toLocaleString('en-IN')}
              </p>
            )}
          </div>

          {/* Arrow divider */}
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <Label>To</Label>
            <Select value={destId} onValueChange={setDestId}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem
                    key={acc.id}
                    value={acc.id.toString()}
                    disabled={acc.id.toString() === sourceId}
                  >
                    {acc.name} · {ACCOUNT_TYPE_LABELS[acc.account_type]} · ₹{parseFloat(acc.current_balance).toLocaleString('en-IN')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {destAccount && (
              <p className="text-xs text-muted-foreground px-1">
                Current: ₹{parseFloat(destAccount.current_balance).toLocaleString('en-IN')}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input
              type="number"
              placeholder="e.g. 10000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {sourceAccount && amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
              <p className={`text-xs px-1 ${
                parseFloat(sourceAccount.current_balance) - parseFloat(amount) < 0
                  ? 'text-red-500'
                  : 'text-muted-foreground'
              }`}>
                {sourceAccount.name} after: ₹{(
                  parseFloat(sourceAccount.current_balance) - parseFloat(amount)
                ).toLocaleString('en-IN')}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              placeholder="e.g. Weekly cash withdrawal"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={contraTransfer.isPending}
          >
            {contraTransfer.isPending ? 'Transferring...' : 'Transfer'}
          </Button>

        </div>
      </SheetContent>
    </Sheet>
  )
}
