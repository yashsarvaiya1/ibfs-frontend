// components/shared/TransactionSheet.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useAccounts } from '@/hooks/useAccount'
import { useContacts } from '@/hooks/useContact'
import { useSend, useReceive } from '@/hooks/useContact'
import { useDocuments } from '@/hooks/useDocument'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fmtAmount, fmtDate } from '@/lib/utils'
import { DOC_TYPE_LABELS } from '@/models/document'
import { toast } from 'sonner'
import { Search, X, FileText, User, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Contact Picker ───────────────────────────────────────────────────────────

interface ContactPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (id: string, name: string) => void
}

function ContactPicker({ open, onClose, onSelect }: ContactPickerProps) {
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
        <SheetHeader className="mb-3 flex-shrink-0">
          <SheetTitle className="text-left">Select Contact</SheetTitle>
        </SheetHeader>

        <div className="relative mb-3 flex-shrink-0">
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
                onClick={() => { onSelect(c.id.toString(), c.company_name || c.contact_name); onClose() }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border bg-muted/30 active:scale-[0.99] transition-transform text-left"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.company_name || c.contact_name}</p>
                  {c.company_name && (
                    <p className="text-xs text-muted-foreground truncate">{c.contact_name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Document Picker ──────────────────────────────────────────────────────────

interface DocPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (id: string) => void
  contactId: string
}

function DocPicker({ open, onClose, onSelect, contactId }: DocPickerProps) {
  const [search, setSearch] = useState('')
  const { data } = useDocuments({ contact: contactId ? Number(contactId) : undefined })
  const docs = data?.results ?? []

  const filtered = useMemo(() =>
    docs.filter(d =>
      d.doc_id.toLowerCase().includes(search.toLowerCase()) ||
      DOC_TYPE_LABELS[d.type].toLowerCase().includes(search.toLowerCase())
    ),
    [docs, search]
  )

  useEffect(() => { if (!open) setSearch('') }, [open])

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6 h-[70vh] flex flex-col gap-0">
        <SheetHeader className="mb-3 flex-shrink-0">
          <SheetTitle className="text-left">Select Document</SheetTitle>
        </SheetHeader>

        <div className="relative mb-3 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search by doc ID or type..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5">
          {docs.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              No documents for this contact
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No match found</p>
          ) : (
            filtered.map(doc => (
              <button
                key={doc.id}
                onClick={() => { onSelect(doc.id.toString()); onClose() }}
                className="w-full flex items-center justify-between p-3 rounded-xl border bg-muted/30 active:scale-[0.99] transition-transform text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] h-4">
                        {DOC_TYPE_LABELS[doc.type]}
                      </Badge>
                      <span className="text-sm font-medium">#{doc.doc_id}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(doc.date)}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold ml-3 flex-shrink-0">
                  {doc.total_amount ? fmtAmount(doc.total_amount) : '—'}
                </p>
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

  const { data: accounts } = useAccounts({ is_active: true })
  const { data: allContacts } = useContacts({ is_active: true })

  const [mode, setMode] = useState<'send' | 'receive'>('send')
  const [contactId, setContactId] = useState('')
  const [contactName, setContactName] = useState('')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedDocId, setSelectedDocId] = useState('')
  const [selectedDocLabel, setSelectedDocLabel] = useState('')

  // Sub-sheet open state — independent from main sheet
  const [contactPickerOpen, setContactPickerOpen] = useState(false)
  const [docPickerOpen, setDocPickerOpen] = useState(false)

  const sendMutation = useSend(Number(contactId))
  const receiveMutation = useReceive(Number(contactId))
  const isPending = sendMutation.isPending || receiveMutation.isPending

  // Reset on open
  useEffect(() => {
    if (transactionSheetOpen) {
      setMode(transactionSheetMode ?? 'send')
      setAmount(''); setAccountId(''); setNotes('')
      setSelectedDocId(''); setSelectedDocLabel('')
      setDate(new Date().toISOString().split('T')[0])

      if (transactionSheetContactId) {
        const contact = allContacts?.results.find(c => c.id === transactionSheetContactId)
        setContactId(transactionSheetContactId.toString())
        setContactName(contact?.company_name || contact?.contact_name || `Contact #${transactionSheetContactId}`)
      } else {
        setContactId('')
        setContactName('')
      }
    }
  }, [transactionSheetOpen, transactionSheetMode, transactionSheetContactId, allContacts])

  const handleContactSelect = (id: string, name: string) => {
    setContactId(id)
    setContactName(name)
    // Clear doc if contact changes
    setSelectedDocId('')
    setSelectedDocLabel('')
  }

  const { data: docsData } = useDocuments({
    contact: contactId ? Number(contactId) : undefined,
  })

  const handleDocSelect = (id: string) => {
    setSelectedDocId(id)
    const doc = docsData?.results.find(d => d.id.toString() === id)
    if (doc) {
      setSelectedDocLabel(`${DOC_TYPE_LABELS[doc.type]} #${doc.doc_id}`)
    }
  }

  const handleSubmit = async () => {
    if (!contactId) { toast.error('Select a contact'); return }
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return }
    if (!accountId) { toast.error('Select an account'); return }

    const payload = {
      amount,
      payment_account: Number(accountId),
      date,
      notes: notes || undefined,
      document: selectedDocId ? Number(selectedDocId) : undefined,
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

  return (
    <>
      {/* Main Sheet */}
      <Sheet open={transactionSheetOpen} onOpenChange={closeTransactionSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[92vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">New Transaction</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">

            {/* Send / Receive */}
            <Tabs value={mode} onValueChange={v => setMode(v as 'send' | 'receive')}>
              <TabsList className="w-full">
                <TabsTrigger value="send" className="flex-1">Send</TabsTrigger>
                <TabsTrigger value="receive" className="flex-1">Receive</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Contact picker — tap to open search sheet */}
            {!transactionSheetContactId && (
              <div className="space-y-1.5">
                <Label>Contact <span className="text-destructive">*</span></Label>
                {contactId ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl border bg-muted/40">
                    <User className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="flex-1 text-sm font-medium">{contactName}</span>
                    <button onClick={() => { setContactId(''); setContactName(''); setSelectedDocId('') }}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setContactPickerOpen(true)}
                    className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed text-muted-foreground text-sm hover:border-primary hover:text-primary transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Tap to search contacts...
                  </button>
                )}
              </div>
            )}

            {/* Contact display when pre-filled */}
            {transactionSheetContactId && contactName && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{contactName}</span>
              </div>
            )}

            {/* Document picker — only if contact selected */}
            {contactId && (
              <div className="space-y-1.5">
                <Label>
                  Link Document
                  <span className="text-xs text-muted-foreground ml-1">(optional)</span>
                </Label>
                {selectedDocId ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl border bg-muted/40">
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="flex-1 text-sm font-medium">{selectedDocLabel}</span>
                    <button onClick={() => { setSelectedDocId(''); setSelectedDocLabel('') }}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDocPickerOpen(true)}
                    className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed text-muted-foreground text-sm hover:border-primary hover:text-primary transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    {(docsData?.results?.length ?? 0) > 0
                      ? 'Tap to link a document...'
                      : 'No documents for this contact'}
                  </button>
                )}
              </div>
            )}

            {/* Amount */}
            <div className="space-y-1.5">
              <Label>Amount <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            {/* Account */}
            <div className="space-y-1.5">
              <Label>Account <span className="text-destructive">*</span></Label>
              <Select value={accountId} onValueChange={setAccountId}>
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
                Notes <span className="text-xs text-muted-foreground">(optional)</span>
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
                : mode === 'send' ? 'Confirm Send' : 'Confirm Receive'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Contact Picker — separate sheet, independent state */}
      <ContactPicker
        open={contactPickerOpen}
        onClose={() => setContactPickerOpen(false)}
        onSelect={handleContactSelect}
      />

      {/* Doc Picker — separate sheet, independent state */}
      <DocPicker
        open={docPickerOpen}
        onClose={() => setDocPickerOpen(false)}
        onSelect={handleDocSelect}
        contactId={contactId}
      />
    </>
  )
}
