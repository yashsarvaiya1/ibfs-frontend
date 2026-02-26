'use client'

import { useState, useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useRecordPayment, useDocument } from '@/hooks/useDocument'
import { useAccounts } from '@/hooks/useAccount'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/shared/SearchableSelect'
import { fmtAmount } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { InterestLine } from '@/models/document'
import { Switch } from '@/components/ui/switch'

interface LocalInterestLine {
  name:   string
  amount: string
  type:   'charge' | 'discount'
}

export function RecordPaymentSheet() {
  const {
    recordPaymentSheetOpen,
    recordPaymentDocId,
    closeRecordPaymentSheet,
  } = useUIStore()

  const docId = recordPaymentDocId ?? 0

  const { data: doc }      = useDocument(docId)
  const { data: accounts } = useAccounts({ is_active: true })
  const recordPayment      = useRecordPayment(docId)

  const [amount,        setAmount]        = useState('')
  const [accountId,     setAccountId]     = useState('')
  const [date,          setDate]          = useState('')
  const [notes,         setNotes]         = useState('')
  const [addInterest,   setAddInterest]   = useState(false)
  const [interestLines, setInterestLines] = useState<LocalInterestLine[]>([])

  // Reset on open
  useEffect(() => {
    if (!recordPaymentSheetOpen) return
    setDate(new Date().toISOString().split('T')[0])
    setAmount('')
    setAccountId('')
    setNotes('')
    setAddInterest(false)
    setInterestLines([])

    // Pre-fill amount from remaining balance
    if (doc?.payment_status?.remaining) {
      const rem = Number(doc.payment_status.remaining)
      if (rem > 0) setAmount(Math.abs(rem).toString())
    }
  }, [recordPaymentSheetOpen, doc])

  const accountOptions = (accounts?.results ?? []).map(a => ({
    value:    a.id.toString(),
    label:    a.name,
    sublabel: a.type,
    meta:     fmtAmount(a.current_balance),
  }))

  const interestNet = interestLines.reduce((sum, l) => {
    const a = Number(l.amount) || 0
    return sum + (l.type === 'charge' ? a : -a)
  }, 0)

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount');  return }
    if (!accountId)                      { toast.error('Select an account');    return }

    const payload = {
      amount,
      payment_account: Number(accountId),
      date,
      notes: notes || undefined,
      interest_lines: addInterest && interestLines.length > 0
        ? interestLines
            .filter(l => l.name && Number(l.amount) > 0)
            .map(l => ({ name: l.name, amount: Number(l.amount), type: l.type }) as InterestLine)
        : undefined,
    }

    try {
      await recordPayment.mutateAsync(payload)
      toast.success('Payment recorded')
      closeRecordPaymentSheet()
    } catch {
      toast.error('Failed to record payment')
    }
  }

  const remaining = doc?.payment_status?.remaining
    ? Number(doc.payment_status.remaining)
    : null

  return (
    <Sheet open={recordPaymentSheetOpen} onOpenChange={(open) => !open && closeRecordPaymentSheet()}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">Record Payment</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Document summary */}
          {doc && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <div>
                <p className="text-xs text-muted-foreground">Document</p>
                <p className="text-sm font-semibold">{doc.doc_id}</p>
              </div>
              {remaining !== null && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className={`text-sm font-bold ${remaining > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {fmtAmount(Math.abs(remaining))}
                  </p>
                </div>
              )}
              {doc.payment_status?.is_paid && (
                <Badge variant="secondary" className="text-emerald-600 border-emerald-300 bg-emerald-50">
                  Paid
                </Badge>
              )}
            </div>
          )}

          {/* Amount */}
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

          {/* Account */}
          <div className="space-y-1.5">
            <Label>Account <span className="text-destructive">*</span></Label>
            <SearchableSelect
              options={accountOptions}
              value={accountId}
              onChange={setAccountId}
              placeholder="Select account"
              title="Payment Account"
              searchPlaceholder="Search accounts..."
              clearable
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input placeholder="Add a note..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {/* Interest toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div>
              <p className="text-sm font-medium">Add Interest / Adjustment</p>
              {addInterest && interestNet !== 0 && (
                <p className="text-xs text-muted-foreground">
                  Net: <span className={interestNet > 0 ? 'text-red-500' : 'text-emerald-600'}>
                    {interestNet > 0 ? '+' : ''}{fmtAmount(interestNet)}
                  </span>
                </p>
              )}
            </div>
            <Switch
              checked={addInterest}
              onCheckedChange={(v) => {
                setAddInterest(v)
                if (v && interestLines.length === 0) {
                  setInterestLines([{ name: '', amount: '', type: 'charge' }])
                }
              }}
            />
          </div>

          {/* Interest lines */}
          {addInterest && (
            <div className="space-y-2 pl-1">
              {interestLines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Name (e.g. Interest)"
                    value={line.name}
                    onChange={e =>
                      setInterestLines(prev => prev.map((l, idx) =>
                        idx === i ? { ...l, name: e.target.value } : l
                      ))
                    }
                  />
                  <Input
                    className="w-24"
                    type="number"
                    placeholder="0"
                    value={line.amount}
                    onChange={e =>
                      setInterestLines(prev => prev.map((l, idx) =>
                        idx === i ? { ...l, amount: e.target.value } : l
                      ))
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setInterestLines(prev => prev.map((l, idx) =>
                        idx === i ? { ...l, type: l.type === 'charge' ? 'discount' : 'charge' } : l
                      ))
                    }
                    className={`text-[11px] font-semibold px-2 py-1 rounded-lg border shrink-0 ${
                      line.type === 'charge'
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    }`}
                  >
                    {line.type === 'charge' ? 'Charge' : 'Discount'}
                  </button>
                  <button type="button" onClick={() =>
                    setInterestLines(prev => prev.filter((_, idx) => idx !== i))
                  }>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
              <Button
                type="button" variant="outline" size="sm"
                className="w-full gap-1.5"
                onClick={() => setInterestLines(prev => [...prev, { name: '', amount: '', type: 'charge' }])}
              >
                <Plus className="h-4 w-4" /> Add Line
              </Button>
            </div>
          )}

          <Button className="w-full h-12" onClick={handleSubmit} disabled={recordPayment.isPending}>
            {recordPayment.isPending ? 'Recording...' : 'Confirm Payment'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
