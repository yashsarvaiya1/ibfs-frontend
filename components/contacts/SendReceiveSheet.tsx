// components/contacts/SendReceiveSheet.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSend, useReceive } from '@/hooks/useContact'
import { useAccounts } from '@/hooks/useAccount'
import { useSettings } from '@/hooks/useSettings'
import { useDocuments } from '@/hooks/useDocument'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { X, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { fmtAmount } from '@/lib/utils'
import { DOC_TYPE_LABELS } from '@/models/document'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────
interface InterestLine { name: string; amount: string; type: 'charge' | 'discount' }
interface VoucherLine  { name: string; amount: string }

interface Props {
  contactId: number
  open:      boolean
  mode:      'send' | 'receive'
  onClose:   () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const NONE_VAL = '__none__'
const safeVal  = (v: string | null | undefined) => v || NONE_VAL
const realVal  = (v: string) => v === NONE_VAL ? '' : v

export function SendReceiveSheet({ contactId, open, mode, onClose }: Props) {
  const { data: accounts } = useAccounts({ is_active: true })
  const { data: settings } = useSettings()
  const { data: docsData } = useDocuments({ contact: contactId })

  // ── Form state ──────────────────────────────────────────────────────────────
  const [amount,    setAmount]    = useState('')
  const [accountId, setAccountId] = useState('')
  const [date,      setDate]      = useState(new Date().toISOString().split('T')[0])
  const [notes,     setNotes]     = useState('')
  const [linkedDoc, setLinkedDoc] = useState('')

  const [isExpense,    setIsExpense]    = useState(false)
  const [addInterest,  setAddInterest]  = useState(false)

  const [interestLines, setInterestLines] = useState<InterestLine[]>([
    { name: '', amount: '', type: 'charge' },
  ])
  const [voucherLines, setVoucherLines] = useState<VoucherLine[]>([
    { name: '', amount: '' },
  ])

  const sendMutation    = useSend(contactId)
  const receiveMutation = useReceive(contactId)
  const isPending       = sendMutation.isPending || receiveMutation.isPending

  const docs            = docsData?.results ?? []
  const selectedAccount = accounts?.results.find(a => a.id.toString() === accountId)
  const isCash          = selectedAccount?.type === 'cash'
  const showVoucherLines = settings?.enable_vouchers && isCash && !isExpense

  // FIX 3: added `mode` to dependency array so form resets when sheet is
  // reused across send ↔ receive without unmounting (prevents isExpense stale state)
  useEffect(() => {
    if (!open) return
    setAmount(''); setAccountId(''); setNotes(''); setLinkedDoc('')
    setIsExpense(false); setAddInterest(false)
    setDate(new Date().toISOString().split('T')[0])
    setInterestLines([{ name: '', amount: '', type: 'charge' }])
    setVoucherLines([{ name: '', amount: '' }])
  }, [open, mode]) // ← mode added

  // ── Interest line helpers ───────────────────────────────────────────────────
  const addInterestLine    = () =>
    setInterestLines(p => [...p, { name: '', amount: '', type: 'charge' }])
  const removeInterestLine = (i: number) =>
    setInterestLines(p => p.filter((_, idx) => idx !== i))
  const updateInterestLine = (i: number, field: keyof InterestLine, value: string) =>
    setInterestLines(p => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l))

  // ── Voucher / Expense line helpers ──────────────────────────────────────────
  const addVoucherLine    = () => setVoucherLines(p => [...p, { name: '', amount: '' }])
  const removeVoucherLine = (i: number) =>
    setVoucherLines(p => p.filter((_, idx) => idx !== i))
  const updateVoucherLine = (i: number, field: keyof VoucherLine, value: string) =>
    setVoucherLines(p => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l))

  // ── CF Impact Preview ───────────────────────────────────────────────────────
  const interestNet = useMemo(() => {
    if (!addInterest) return 0
    return interestLines.reduce((s, l) => {
      const amt = Number(l.amount) || 0
      return s + (l.type === 'charge' ? amt : -amt)
    }, 0)
  }, [addInterest, interestLines])

  const actualAmount   = Number(amount) || 0
  const signedActual   = mode === 'receive' ? actualAmount : -actualAmount
  const interestRecord = addInterest
    ? interestNet * (mode === 'receive' ? -1 : 1)
    : 0
  const netCFChange    = signedActual + interestRecord

  // ── Voucher total ───────────────────────────────────────────────────────────
  const voucherTotal = voucherLines.reduce((s, l) => s + (Number(l.amount) || 0), 0)

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!accountId) { toast.error('Select an account'); return }

    // Expense mode
    if (isExpense) {
      const total = voucherLines.reduce((s, l) => s + (Number(l.amount) || 0), 0)
      if (total <= 0) { toast.error('Add at least one expense item'); return }
      try {
        await sendMutation.mutateAsync({
          amount:          total.toString(),
          payment_account: Number(accountId),
          date,
          is_expense:      true,
          line_items:      voucherLines
            .filter(l => l.name)
            .map(l => ({ name: l.name, amount: Number(l.amount) })),
        })
        toast.success('Expense recorded')
        onClose()
      } catch { toast.error('Failed to record expense') }
      return
    }

    // Normal send/receive
    const payAmount = showVoucherLines ? voucherTotal.toString() : amount

    if (!payAmount || Number(payAmount) <= 0) {
      toast.error('Enter a valid amount'); return
    }

    const payload: any = {
      amount:          payAmount,
      payment_account: Number(accountId),
      date,
      notes:           notes || undefined,
      document:        linkedDoc ? Number(linkedDoc) : undefined,
    }

    if (showVoucherLines) {
      payload.line_items = voucherLines
        .filter(l => l.name && l.amount)
        .map(l => ({ name: l.name, amount: Number(l.amount) }))
    }

    if (addInterest) {
      const validLines = interestLines.filter(l => l.name && l.amount)
      if (validLines.length > 0) {
        payload.interest_lines = validLines.map(l => ({
          name:   l.name,
          amount: Number(l.amount),
          type:   l.type,
        }))
      }
    }

    try {
      if (mode === 'send') {
        await sendMutation.mutateAsync(payload)
      } else {
        await receiveMutation.mutateAsync(payload)
      }
      toast.success(mode === 'send' ? 'Payment sent' : 'Payment received')
      onClose()
    } catch { toast.error('Transaction failed') }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pb-10 max-h-[92vh] overflow-y-auto"
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">
            {isExpense
              ? 'Record Expense'
              : mode === 'send' ? 'Send Payment' : 'Receive Payment'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">

          {/* ── Expense toggle (Send only) ──────────────────────────────── */}
          {mode === 'send' && (
            <div
              onClick={() => setIsExpense(v => !v)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer
                ${isExpense ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}`}
            >
              <Checkbox
                id="expense"
                checked={isExpense}
                onCheckedChange={(v) => setIsExpense(!!v)}
                onClick={e => e.stopPropagation()}
              />
              <div>
                <p className="text-sm font-medium">Mark as Expense</p>
                <p className="text-xs text-muted-foreground">
                  Money leaves account — contact CF is not affected
                </p>
              </div>
            </div>
          )}

          {/* ── Amount field ────────────────────────────────────────────── */}
          {!isExpense && !showVoucherLines && (
            <div className="space-y-1.5">
              <Label>
                {mode === 'receive' ? 'Amount Received' : 'Amount Sent'}
                <span className="text-xs text-muted-foreground ml-2 font-normal">
                  total money exchanged
                </span>
              </Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="text-lg h-12"
              />
            </div>
          )}

          {/* ── Voucher / Expense line items ─────────────────────────────── */}
          {(isExpense || showVoucherLines) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  {isExpense ? 'Expense Items' : 'Line Items'}
                  {showVoucherLines && !isExpense && (
                    <span className="text-xs text-muted-foreground ml-1">(Cash Voucher)</span>
                  )}
                </Label>
                <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={addVoucherLine}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              {voucherLines.map((line, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    placeholder="Description"
                    className="flex-1"
                    value={line.name}
                    onChange={e => updateVoucherLine(i, 'name', e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="₹"
                    className="w-28"
                    value={line.amount}
                    onChange={e => updateVoucherLine(i, 'amount', e.target.value)}
                  />
                  {voucherLines.length > 1 && (
                    <button onClick={() => removeVoucherLine(i)} className="flex-shrink-0">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
              {(isExpense || showVoucherLines) && voucherTotal > 0 && (
                <div className="flex justify-end text-sm font-medium text-muted-foreground pr-9">
                  Total: {fmtAmount(voucherTotal)}
                </div>
              )}
            </div>
          )}

          {/* ── Account ─────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Account <span className="text-destructive">*</span></Label>
            <Select value={safeVal(accountId)} onValueChange={v => setAccountId(realVal(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts?.results.map(a => (
                  <SelectItem key={a.id} value={a.id.toString()}>
                    {a.name} — {a.type} — {fmtAmount(a.current_balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Date ────────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* ── Link document ───────────────────────────────────────────── */}
          {!isExpense && docs.length > 0 && (
            <div className="space-y-1.5">
              <Label>
                Link Document
                <span className="text-xs text-muted-foreground ml-1">(optional)</span>
              </Label>
              <Select value={safeVal(linkedDoc)} onValueChange={v => setLinkedDoc(realVal(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VAL}>None</SelectItem>
                  {docs.map(d => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.doc_id} — {DOC_TYPE_LABELS[d.type]}
                      {d.total_amount ? ` — ${fmtAmount(d.total_amount)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ── Notes ───────────────────────────────────────────────────── */}
          {!isExpense && (
            <div className="space-y-1.5">
              <Label>Notes <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder="Add a note..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          )}

          {/* ── Interest / Adjustment section ───────────────────────────── */}
          {!isExpense && (
            <div className="space-y-3">
              <div
                onClick={() => setAddInterest(v => !v)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left cursor-pointer
                  ${addInterest ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}`}
              >
                <Checkbox
                  id="interest"
                  checked={addInterest}
                  onCheckedChange={(v) => setAddInterest(!!v)}
                  onClick={e => e.stopPropagation()}
                />
                <div>
                  <p className="text-sm font-medium">Add Interest / Adjustment</p>
                  <p className="text-xs text-muted-foreground">
                    Creates a separate record entry — does not change payment amount above
                  </p>
                </div>
              </div>

              {addInterest && (
                <div className="space-y-3 rounded-xl border p-3 bg-muted/20">

                  {/* Header hint */}
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5">
                    <span className="mt-0.5">💡</span>
                    <span>
                      <strong>Charge</strong> = extra amount owed (late fee, penalty)
                      &nbsp;·&nbsp;
                      <strong>Discount</strong> = amount waived (early payment, goodwill)
                    </span>
                  </div>

                  {/* Interest line rows */}
                  <div className="space-y-2">
                    {interestLines.map((line, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex gap-2 items-center">
                          <Input
                            placeholder="e.g. Late fee, Processing charge"
                            className="flex-1 text-sm"
                            value={line.name}
                            onChange={e => updateInterestLine(i, 'name', e.target.value)}
                          />
                          <Input
                            type="number"
                            placeholder="₹"
                            className="w-28 text-sm"
                            value={line.amount}
                            onChange={e => updateInterestLine(i, 'amount', e.target.value)}
                          />
                          {interestLines.length > 1 && (
                            <button onClick={() => removeInterestLine(i)} className="flex-shrink-0">
                              <X className="h-4 w-4 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2 ml-0.5">
                          <button
                            onClick={() => updateInterestLine(i, 'type', 'charge')}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors
                              ${line.type === 'charge'
                                ? 'bg-red-50 border-red-300 text-red-600'
                                : 'bg-muted border-border text-muted-foreground'}`}
                          >
                            <TrendingUp className="h-3 w-3" /> Charge
                          </button>
                          <button
                            onClick={() => updateInterestLine(i, 'type', 'discount')}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors
                              ${line.type === 'discount'
                                ? 'bg-green-50 border-green-300 text-green-600'
                                : 'bg-muted border-border text-muted-foreground'}`}
                          >
                            <TrendingDown className="h-3 w-3" /> Discount
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button variant="ghost" size="sm" className="gap-1 h-7" onClick={addInterestLine}>
                    <Plus className="h-3.5 w-3.5" /> Add Line
                  </Button>

                  {/* ── CF Impact Preview ────────────────────────────────── */}
                  {(actualAmount > 0 || voucherTotal > 0) && (
                    <>
                      <Separator />
                      <div className="space-y-2 text-sm">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          CF Impact Preview
                        </p>

                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            {mode === 'receive' ? 'Payment In (actual)' : 'Payment Out (actual)'}
                          </span>
                          <span className={mode === 'receive' ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                            {mode === 'receive' ? '+' : '−'}
                            {fmtAmount(showVoucherLines ? voucherTotal : actualAmount)}
                          </span>
                        </div>

                        {interestLines.filter(l => l.name && Number(l.amount) > 0).map((l, i) => {
                          const lineAmt = Number(l.amount)
                          const lineNet = l.type === 'charge' ? lineAmt : -lineAmt
                          const lineRec = lineNet * (mode === 'receive' ? -1 : 1)
                          const isNeg   = lineRec < 0
                          return (
                            <div key={i} className="flex justify-between items-center">
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                {l.name || 'Interest'}
                                <Badge variant="outline" className="text-[10px] h-4">record</Badge>
                              </span>
                              <span className={isNeg ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                                {isNeg ? '−' : '+'}{fmtAmount(Math.abs(lineRec))}
                              </span>
                            </div>
                          )
                        })}

                        <Separator />

                        <div className="flex justify-between items-center font-semibold">
                          <span>Net CF Change</span>
                          <span className={netCFChange >= 0 ? 'text-red-500' : 'text-green-600'}>
                            {netCFChange >= 0 ? '+' : ''}
                            {fmtAmount(netCFChange)}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Red = we owe them more · Green = they owe us more
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Submit ──────────────────────────────────────────────────── */}
          <Button
            className="w-full h-12 text-base"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending
              ? 'Processing...'
              : isExpense
                ? 'Record Expense'
                : mode === 'send' ? 'Confirm Send' : 'Confirm Receive'}
          </Button>

        </div>
      </SheetContent>
    </Sheet>
  )
}
