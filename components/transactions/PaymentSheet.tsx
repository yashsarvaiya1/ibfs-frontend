'use client'

import { useEffect, useState } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { usePaymentAccounts } from '@/hooks/usePaymentAccount'
import { useContacts } from '@/hooks/useContact'
import { useDocuments } from '@/hooks/useDocument'
import { useCreatePaymentWithInterest } from '@/hooks/useTransaction'
import { useDocumentPaymentSummary } from '@/hooks/useDocument'
import { getContactDisplayName } from '@/models/contact'
import { DOCUMENT_TYPE_LABELS, PAYMENT_SIGN, calculateDocumentTotal } from '@/models/document'
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
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface InterestItem {
  description: string
  amount: string
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export function PaymentSheet() {
  const { transactionSheetOpen, transactionSheetContext, closeTransactionSheet } = useUIStore()
  const createPayment = useCreatePaymentWithInterest()

  // Pre-filled from context (e.g. opened from Contact or Document detail)
  const { contactId, documentId, paymentAccountId } = transactionSheetContext

  // Form state
  const [selectedContact, setSelectedContact] = useState<number | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [notes, setNotes] = useState('')
  const [interestOpen, setInterestOpen] = useState(false)
  const [interestItems, setInterestItems] = useState<InterestItem[]>([])
  const [interestDate, setInterestDate] = useState(today())
  const [contactSearch, setContactSearch] = useState('')

  // Data
  const { data: accountsData } = usePaymentAccounts()
  const { data: contactsData } = useContacts(
    contactSearch ? { search: contactSearch } : undefined
  )
  const { data: documentsData } = useDocuments(
    selectedContact ? { contact: selectedContact } : undefined
  )
  const { data: paymentSummary } = useDocumentPaymentSummary(selectedDocument)

  const accounts = accountsData?.results ?? []
  const contacts = contactsData?.results ?? []
  const documents = documentsData?.results ?? []

  // Reset form when sheet opens/closes
  useEffect(() => {
    if (transactionSheetOpen) {
      setSelectedContact(contactId ?? null)
      setSelectedAccount(paymentAccountId ?? null)
      setSelectedDocument(documentId ?? null)
      setAmount('')
      setDate(today())
      setNotes('')
      setInterestOpen(false)
      setInterestItems([])
      setInterestDate(today())
      setContactSearch('')
    }
  }, [transactionSheetOpen, contactId, documentId, paymentAccountId])

  // Auto-fill amount from document remaining balance
  useEffect(() => {
    if (paymentSummary && selectedDocument) {
      const doc = documents.find((d) => d.id === selectedDocument)
      if (!doc) return
      const sign = PAYMENT_SIGN[doc.document_type]
      if (sign && paymentSummary.remaining > 0) {
        setAmount((paymentSummary.remaining * sign).toFixed(2))
      }
    }
  }, [paymentSummary, selectedDocument, documents])

  const totalInterest = interestItems.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0), 0
  )

  const addInterestItem = () =>
    setInterestItems((prev) => [...prev, { description: '', amount: '' }])

  const removeInterestItem = (i: number) =>
    setInterestItems((prev) => prev.filter((_, idx) => idx !== i))

  const updateInterestItem = (i: number, key: keyof InterestItem, value: string) =>
    setInterestItems((prev) =>
      prev.map((item, idx) => idx === i ? { ...item, [key]: value } : item)
    )

  const handleSubmit = async () => {
    if (!selectedContact) { toast.error('Select a contact'); return }
    if (!selectedAccount) { toast.error('Select a payment account'); return }
    if (!amount || isNaN(parseFloat(amount))) { toast.error('Enter a valid amount'); return }

    const hasInterest = interestOpen && interestItems.length > 0 && totalInterest > 0

    await createPayment.mutateAsync({
      transaction_date: date,
      contact: selectedContact,
      payment_account: selectedAccount,
      payment_amount: amount,
      document: selectedDocument ?? null,
      notes: notes || undefined,
      interest: hasInterest ? {
        description: interestItems.map((i) => i.description).filter(Boolean).join(', ') || 'Interest charges',
        amount: totalInterest.toFixed(2),
        document_date: interestDate,
      } : undefined,
    })

    closeTransactionSheet()
  }

  return (
    <Sheet open={transactionSheetOpen} onOpenChange={closeTransactionSheet}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[95vh] overflow-y-auto px-4 pb-8"
      >
        <SheetHeader className="mb-5">
          <SheetTitle>Record Payment</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">

          {/* Contact */}
          <div className="space-y-1.5">
            <Label>Contact</Label>
            {selectedContact ? (
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5 bg-muted/40">
                <span className="text-sm font-medium">
                  {contacts.find((c) => c.id === selectedContact)
                    ? getContactDisplayName(contacts.find((c) => c.id === selectedContact)!)
                    : `Contact #${selectedContact}`}
                </span>
                <button
                  onClick={() => { setSelectedContact(null); setSelectedDocument(null) }}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Search contact..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                />
                {contacts.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                    {contacts.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedContact(c.id); setContactSearch('') }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50"
                      >
                        {getContactDisplayName(c)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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

          {/* Payment Account */}
          <div className="space-y-1.5">
            <Label>Payment Account</Label>
            <Select
              value={selectedAccount?.toString() ?? ''}
              onValueChange={(v) => setSelectedAccount(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{acc.name}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {ACCOUNT_TYPE_LABELS[acc.account_type]}
                      </Badge>
                      <span className="text-muted-foreground text-xs ml-auto">
                        ₹{parseFloat(acc.current_balance).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Link Document (optional) */}
          {selectedContact && documents.length > 0 && (
            <div className="space-y-1.5">
              <Label>Link Document <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select
                value={selectedDocument?.toString() ?? 'none'}
                onValueChange={(v) => setSelectedDocument(v === 'none' ? null : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No document</SelectItem>
                  {documents.map((doc) => {
                    const total = calculateDocumentTotal(doc)
                    return (
                      <SelectItem key={doc.id} value={doc.id.toString()}>
                        <span>{DOCUMENT_TYPE_LABELS[doc.document_type]}</span>
                        {doc.document_number && <span> #{doc.document_number}</span>}
                        <span className="text-muted-foreground text-xs ml-2">
                          ₹{total.toLocaleString('en-IN')}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>

              {/* Payment summary for selected document */}
              {paymentSummary && selectedDocument && (
                <div className="rounded-lg bg-muted/40 px-3 py-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Document Total</span>
                    <span>₹{paymentSummary.document_total.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Already Paid</span>
                    <span className="text-green-600">₹{paymentSummary.total_paid.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Remaining</span>
                    <span className={paymentSummary.is_overpaid ? 'text-orange-500' : 'text-primary'}>
                      {paymentSummary.is_overpaid ? 'Overpaid' : `₹${paymentSummary.remaining.toLocaleString('en-IN')}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input
              type="number"
              placeholder="e.g. 5000 or -5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Positive = money IN to you · Negative = money OUT from you
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              placeholder="e.g. Partial payment for March"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Separator />

          {/* Interest toggle */}
          <button
            onClick={() => setInterestOpen((v) => !v)}
            className="w-full flex items-center justify-between py-1 text-sm font-medium text-orange-600"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Add Interest / Late Fee
              {totalInterest > 0 && (
                <Badge className="bg-orange-100 text-orange-600 border-orange-200 text-[10px] px-1.5">
                  +₹{totalInterest.toLocaleString('en-IN')}
                </Badge>
              )}
            </div>
            {interestOpen
              ? <ChevronUp className="h-4 w-4" />
              : <ChevronDown className="h-4 w-4" />
            }
          </button>

          {/* Interest items */}
          {interestOpen && (
            <div className="space-y-3 pl-1">
              <div className="space-y-1.5">
                <Label>Interest Date</Label>
                <Input
                  type="date"
                  value={interestDate}
                  onChange={(e) => setInterestDate(e.target.value)}
                />
              </div>

              {interestItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="e.g. Late payment fee"
                      value={item.description}
                      onChange={(e) => updateInterestItem(i, 'description', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) => updateInterestItem(i, 'amount', e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive mt-1 shrink-0"
                    onClick={() => removeInterestItem(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInterestItem}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Charge
              </Button>

              {totalInterest > 0 && (
                <div className="flex justify-between text-sm font-medium px-1">
                  <span>Total Interest</span>
                  <span className="text-orange-600">+₹{totalInterest.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Submit */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={createPayment.isPending}
          >
            {createPayment.isPending ? 'Recording...' : 'Record Payment'}
          </Button>

        </div>
      </SheetContent>
    </Sheet>
  )
}
