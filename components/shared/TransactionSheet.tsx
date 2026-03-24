'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useAccounts } from '@/hooks/useAccount'
import { useContacts, useSend, useReceive } from '@/hooks/useContact'
import { useDocuments } from '@/hooks/useDocument'
import { useSettings } from '@/hooks/useSettings'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { SearchableSelect } from '@/components/shared/common/SearchableSelect'
import type { SearchableSelectGroup } from '@/components/shared/common/SearchableSelect'
import { fmtAmount, fmtDate } from '@/lib/utils'
import { DOC_TYPE_LABELS } from '@/models/document'
import type { SendReceivePayload } from '@/models/transaction'
import { toast } from 'sonner'
import { Plus, Trash2, Search, X, FileText, User, ChevronRight } from 'lucide-react'

// ─── Interest line item ───────────────────────────────────────────────────────

interface InterestLine {
  name:   string
  amount: string
  type:   'charge' | 'discount'
}

function InterestLinesModal({
  open,
  onClose,
  lines,
  onChange,
  mainMode,
}: {
  open:     boolean
  onClose:  () => void
  lines:    InterestLine[]
  onChange: (lines: InterestLine[]) => void
  mainMode: 'send' | 'receive'
}) {
  const addLine = () =>
    onChange([...lines, { name: '', amount: '', type: 'charge' }])

  const updateLine = (i: number, patch: Partial<InterestLine>) =>
    onChange(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))

  const removeLine = (i: number) =>
    onChange(lines.filter((_, idx) => idx !== i))

  const net = lines.reduce((sum, l) => {
    const a = Number(l.amount) || 0
    return sum + (l.type === 'charge' ? a : -a)
  }, 0)

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[80vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">Interest / Adjustment</SheetTitle>
        </SheetHeader>

        <p className="text-xs text-muted-foreground mb-3">
          {mainMode === 'receive'
            ? 'Actual is positive — Interest record will be negative (reduces balance).'
            : 'Actual is negative — Interest record will be positive (increases balance).'}
        </p>

        <div className="space-y-2 mb-4">
          {lines.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                className="flex-1"
                placeholder="Name (e.g. Interest)"
                value={line.name}
                onChange={e => updateLine(i, { name: e.target.value })}
              />
              <Input
                className="w-24"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={line.amount}
                onChange={e => updateLine(i, { amount: e.target.value })}
              />
              <button
                type="button"
                onClick={() =>
                  updateLine(i, { type: line.type === 'charge' ? 'discount' : 'charge' })
                }
                className={`text-[11px] font-semibold px-2 py-1 rounded-lg border shrink-0 transition-colors ${
                  line.type === 'charge'
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                }`}
              >
                {line.type === 'charge' ? 'Charge' : 'Discount'}
              </button>
              <button type="button" onClick={() => removeLine(i)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addLine} className="w-full mb-4 gap-2">
          <Plus className="h-4 w-4" /> Add Line
        </Button>

        {lines.length > 0 && (
          <div className="flex justify-between text-sm font-semibold border-t pt-3 mb-4">
            <span>Net Interest Record</span>
            <span className={net >= 0 ? 'text-red-500' : 'text-emerald-600'}>
              {net >= 0 ? '+' : ''}{fmtAmount(net)}
            </span>
          </div>
        )}

        <Button className="w-full" onClick={onClose}>Done</Button>
      </SheetContent>
    </Sheet>
  )
}

// ─── Expense line item ────────────────────────────────────────────────────────

interface ExpenseLine {
  name:   string
  amount: string
}

// ─── Contact Picker ───────────────────────────────────────────────────────────

function ContactPicker({
  open,
  onClose,
  onSelect,
}: {
  open:     boolean
  onClose:  () => void
  onSelect: (id: string, name: string) => void
}) {
  const [search, setSearch] = useState('')
  const { data } = useContacts({ is_active: true })
  const contacts = data?.results ?? []

  const filtered = useMemo(() =>
    contacts.filter(c =>
      (c.company_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      c.contact_name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    ),
    [contacts, search]
  )

  useEffect(() => { if (!open) setSearch('') }, [open])

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6 h-[75vh] flex flex-col gap-0">
        <SheetHeader className="mb-3 shrink-0">
          <SheetTitle className="text-left">Select Contact</SheetTitle>
        </SheetHeader>
        <div className="relative mb-3 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search name, company, phone..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No contacts found</p>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  onSelect(c.id.toString(), c.company_name || c.contact_name)
                  onClose()
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border bg-muted/30 active:scale-[0.99] transition-transform text-left"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.company_name || c.contact_name}</p>
                  {c.company_name && (
                    <p className="text-xs text-muted-foreground truncate">{c.contact_name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main Transaction Sheet ───────────────────────────────────────────────────

export function TransactionSheet() {
  const {
    transactionSheetOpen,
    transactionSheetMode,
    transactionSheetContactId,
    closeTransactionSheet,
  } = useUIStore()

  const { data: accounts }    = useAccounts({ is_active: true })
  const { data: allContacts } = useContacts({ is_active: true })
  const { data: settings }    = useSettings()

  // ── Form state ──────────────────────────────────────────────────────────────
  const [mode,          setMode]          = useState<'send' | 'receive'>('send')
  const [contactId,     setContactId]     = useState('')
  const [contactName,   setContactName]   = useState('')
  const [amount,        setAmount]        = useState('')
  const [accountId,     setAccountId]     = useState('')
  const [notes,         setNotes]         = useState('')
  const [date,          setDate]          = useState('')
  const [selectedDocId, setSelectedDocId] = useState('')

  // ── Toggle state ─────────────────────────────────────────────────────────────
  const [isExpense,         setIsExpense]         = useState(false)
  const [addInterest,       setAddInterest]       = useState(false)
  const [interestLines,     setInterestLines]     = useState<InterestLine[]>([])
  const [expenseLines,      setExpenseLines]      = useState<ExpenseLine[]>([{ name: '', amount: '' }])
  const [interestModalOpen, setInterestModalOpen] = useState(false)
  const [contactPickerOpen, setContactPickerOpen] = useState(false)

  const sendMutation    = useSend(contactId ? Number(contactId) : 0)
  const receiveMutation = useReceive(contactId ? Number(contactId) : 0)
  const isPending       = sendMutation.isPending || receiveMutation.isPending

  const autoTransaction = settings?.auto_transaction ?? true   // used for display info if needed
  const enableVouchers  = settings?.enable_vouchers  ?? false

  const selectedAccount = accounts?.results.find(a => a.id.toString() === accountId)
  const isCashAccount   = selectedAccount?.type === 'cash'
  const voucherMode     = enableVouchers && isCashAccount && !isExpense

  // Only fetch when contact is selected — `undefined` keeps the hook disabled
  const { data: docsData } = useDocuments(
    contactId ? { contact: Number(contactId), page_size: 50 } : undefined
  )

  // ── Document groups (Unpaid / Paid) ─────────────────────────────────────────
  const docGroups = useMemo((): SearchableSelectGroup[] => {
    const docs = docsData?.results ?? []
    if (docs.length === 0) return []

    // A doc is "effectively paid" if the manual flag is set OR transactions sum to zero
    const isPaidDoc = (d: typeof docs[0]) =>
      d.is_paid || d.payment_status?.is_paid === true

    const unpaid = docs.filter(d => !isPaidDoc(d))
    const paid   = docs.filter(d =>  isPaidDoc(d))

    const toOption = (d: typeof docs[0]) => ({
      value:    d.id.toString(),
      label:    `${DOC_TYPE_LABELS[d.type] ?? d.type.toUpperCase()} · ${d.doc_id}`,
      sublabel: fmtDate(d.date),
      meta:     d.total_amount ? fmtAmount(Number(d.total_amount)) : undefined,
    })

    const groups: SearchableSelectGroup[] = []
    if (unpaid.length > 0) groups.push({ label: 'Unpaid / Partial', options: unpaid.map(toOption) })
    if (paid.length > 0)   groups.push({ label: 'Paid',             options: paid.map(toOption) })
    return groups
  }, [docsData])

  // ── Account options ─────────────────────────────────────────────────────────
  const accountOptions = useMemo(() =>
    (accounts?.results ?? []).map(a => ({
      value:    a.id.toString(),
      label:    a.name,
      sublabel: a.type,
      meta:     fmtAmount(a.current_balance),
    })),
    [accounts]
  )

  // ── Reset on open ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!transactionSheetOpen) return
    setMode(transactionSheetMode)
    setAmount('')
    setAccountId('')
    setNotes('')
    setSelectedDocId('')
    setIsExpense(false)
    setAddInterest(false)
    setInterestLines([])
    setExpenseLines([{ name: '', amount: '' }])
    setDate(new Date().toISOString().split('T')[0])

    if (transactionSheetContactId && allContacts) {
      const c = allContacts.results.find(c => c.id === transactionSheetContactId)
      setContactId(transactionSheetContactId.toString())
      setContactName(c?.company_name || c?.contact_name || `Contact #${transactionSheetContactId}`)
    } else {
      setContactId('')
      setContactName('')
    }
  }, [transactionSheetOpen, transactionSheetMode, transactionSheetContactId, allContacts])

  const handleContactSelect = (id: string, name: string) => {
    setContactId(id)
    setContactName(name)
    setSelectedDocId('')  // clear linked doc when contact changes
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!contactId && !isExpense)  { toast.error('Select a contact');              return }
    if (!accountId)                { toast.error('Select an account');             return }

    const validExpenseLines = expenseLines.filter(l => l.name.trim() && Number(l.amount) > 0)
    const validInterestLines = interestLines.filter(l => l.name.trim() && Number(l.amount) > 0)

    if (isExpense || voucherMode) {
      if (validExpenseLines.length === 0) {
        toast.error(isExpense ? 'Add at least one expense item' : 'Add at least one item')
        return
      }
    } else {
      if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return }
    }

    const lineTotal = validExpenseLines.reduce((s, l) => s + Number(l.amount), 0)

    // Build typed payload — no `as any`
    const payload: SendReceivePayload = {
      amount:          (isExpense || voucherMode) ? lineTotal.toString() : amount,
      payment_account: Number(accountId),
      date,
      notes:           notes.trim() || undefined,
      document:        selectedDocId ? Number(selectedDocId) : undefined,
    }

    if (isExpense) {
      payload.is_expense = true
      payload.line_items = validExpenseLines.map(l => ({ name: l.name, amount: Number(l.amount) }))
    } else if (voucherMode) {
      payload.line_items = validExpenseLines.map(l => ({ name: l.name, amount: Number(l.amount) }))
    }

    if (addInterest && validInterestLines.length > 0) {
      payload.interest_lines = validInterestLines.map(l => ({
        name:   l.name,
        amount: Number(l.amount),
        type:   l.type,
      }))
    }

    try {
      if (mode === 'send') {
        await sendMutation.mutateAsync(payload)
      } else {
        await receiveMutation.mutateAsync(payload)
      }
      toast.success(mode === 'send' ? 'Payment sent' : 'Payment received')
      closeTransactionSheet()
    } catch {
      toast.error('Transaction failed')
    }
  }

  const interestNet = interestLines.reduce((sum, l) => {
    const a = Number(l.amount) || 0
    return sum + (l.type === 'charge' ? a : -a)
  }, 0)

  // ── Line item editor — shared between expense and voucher modes ─────────────
  const renderLineItems = (label: string) => (
    <div className="space-y-2">
      <Label>
        {label} <span className="text-destructive">*</span>
        {voucherMode && !isExpense && (
          <span className="text-xs text-muted-foreground ml-1">(Cash Voucher)</span>
        )}
      </Label>
      {expenseLines.map((line, i) => (
        <div key={i} className="flex gap-2">
          <Input
            className="flex-1"
            placeholder={isExpense ? 'Item name' : 'Description'}
            value={line.name}
            onChange={e =>
              setExpenseLines(prev =>
                prev.map((l, idx) => idx === i ? { ...l, name: e.target.value } : l)
              )
            }
          />
          <Input
            className="w-24"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={line.amount}
            onChange={e =>
              setExpenseLines(prev =>
                prev.map((l, idx) => idx === i ? { ...l, amount: e.target.value } : l)
              )
            }
          />
          {expenseLines.length > 1 && (
            <button
              type="button"
              onClick={() => setExpenseLines(prev => prev.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      ))}
      <Button
        type="button" variant="outline" size="sm"
        className="w-full gap-1.5"
        onClick={() => setExpenseLines(prev => [...prev, { name: '', amount: '' }])}
      >
        <Plus className="h-4 w-4" /> Add Item
      </Button>
      <div className="flex justify-between text-sm font-semibold pt-1">
        <span className="text-muted-foreground">Total</span>
        <span>{fmtAmount(expenseLines.reduce((s, l) => s + (Number(l.amount) || 0), 0))}</span>
      </div>
    </div>
  )

  return (
    <>
      <Sheet open={transactionSheetOpen} onOpenChange={(open) => !open && closeTransactionSheet()}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[92vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">New Transaction</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">

            {/* ── Send / Receive tabs ─────────────────────────────────────── */}
            <Tabs
              value={mode}
              onValueChange={v => {
                setMode(v as 'send' | 'receive')
                setIsExpense(false)
              }}
            >
              <TabsList className="w-full">
                <TabsTrigger value="send"    className="flex-1">Send</TabsTrigger>
                <TabsTrigger value="receive" className="flex-1">Receive</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* ── Expense toggle — send only ───────────────────────────────── */}
            {mode === 'send' && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                <div>
                  <p className="text-sm font-medium">Mark as Expense</p>
                  <p className="text-xs text-muted-foreground">Won't affect contact's balance</p>
                </div>
                <Switch checked={isExpense} onCheckedChange={setIsExpense} />
              </div>
            )}

            {/* ── Contact picker ───────────────────────────────────────────── */}
            {!transactionSheetContactId && (
              <div className="space-y-1.5">
                <Label>
                  Contact
                  {!isExpense && <span className="text-destructive ml-0.5">*</span>}
                  {isExpense && (
                    <span className="text-xs text-muted-foreground ml-1">(optional for expense)</span>
                  )}
                </Label>
                {contactId ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl border bg-muted/40">
                    <User className="h-4 w-4 text-primary shrink-0" />
                    <span className="flex-1 text-sm font-medium">{contactName}</span>
                    <button
                      type="button"
                      onClick={() => { setContactId(''); setContactName(''); setSelectedDocId('') }}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setContactPickerOpen(true)}
                    className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed text-muted-foreground text-sm hover:border-primary hover:text-primary transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Tap to search contacts...
                  </button>
                )}
              </div>
            )}

            {/* Pre-filled contact display */}
            {transactionSheetContactId && contactName && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{contactName}</span>
              </div>
            )}

            {/* ── Account picker ───────────────────────────────────────────── */}
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

            {/* ── Amount — 3 modes ─────────────────────────────────────────── */}
            {isExpense
              ? renderLineItems('Expense Items')
              : voucherMode
              ? renderLineItems(mode === 'send' ? 'Payment Items' : 'Receipt Items')
              : (
                <div className="space-y-1.5">
                  <Label>Amount <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
              )
            }

            {/* ── Interest / Adjustment toggle ─────────────────────────────── */}
            {!isExpense && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                <div>
                  <p className="text-sm font-medium">Add Interest / Adjustment</p>
                  {addInterest && interestNet !== 0 && (
                    <p className="text-xs text-muted-foreground">
                      Net:{' '}
                      <span className={interestNet > 0 ? 'text-red-500' : 'text-emerald-600'}>
                        {interestNet > 0 ? '+' : ''}{fmtAmount(interestNet)}
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {addInterest && (
                    <button
                      type="button"
                      className="text-xs text-primary underline"
                      onClick={() => setInterestModalOpen(true)}
                    >
                      {interestLines.length > 0 ? `Edit (${interestLines.length})` : 'Add lines'}
                    </button>
                  )}
                  <Switch
                    checked={addInterest}
                    onCheckedChange={(v) => {
                      setAddInterest(v)
                      if (v && interestLines.length === 0) {
                        setInterestLines([{ name: '', amount: '', type: 'charge' }])
                        setInterestModalOpen(true)
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* ── Document link ────────────────────────────────────────────── */}
            {contactId && !isExpense && (
              <div className="space-y-1.5">
                <Label>
                  Link Document
                  <span className="text-xs text-muted-foreground ml-1">(optional)</span>
                </Label>
                {docGroups.length > 0 ? (
                  <SearchableSelect
                    options={[]}
                    groups={docGroups}
                    value={selectedDocId}
                    onChange={setSelectedDocId}
                    placeholder="Link a document..."
                    title="Select Document"
                    searchPlaceholder="Search by type or ID..."
                    clearable
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-xl border border-dashed text-muted-foreground text-sm">
                    <FileText className="h-4 w-4 shrink-0" />
                    No documents for this contact
                  </div>
                )}
              </div>
            )}

            {/* ── Date ─────────────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            {/* ── Notes ────────────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label>
                Notes{' '}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                placeholder="Add a note..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <Button className="w-full h-12" onClick={handleSubmit} disabled={isPending}>
              {isPending
                ? 'Processing...'
                : isExpense
                  ? 'Record Expense'
                  : mode === 'send'
                    ? 'Confirm Send'
                    : 'Confirm Receive'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ContactPicker
        open={contactPickerOpen}
        onClose={() => setContactPickerOpen(false)}
        onSelect={handleContactSelect}
      />

      <InterestLinesModal
        open={interestModalOpen}
        onClose={() => setInterestModalOpen(false)}
        lines={interestLines}
        onChange={setInterestLines}
        mainMode={mode}
      />
    </>
  )
}
