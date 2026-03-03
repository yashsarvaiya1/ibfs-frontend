'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDocument } from '@/hooks/useDocument'
import { useAccounts } from '@/hooks/useAccount'
import { DOC_TYPE_LABELS } from '@/models/document'
import { fmtDate, fmtAmount } from '@/lib/utils'
import api from '@/lib/axios'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SearchableSelect, type SearchableSelectOption } from '@/components/shared/common/SearchableSelect'
import { toast } from 'sonner'
import {
  ArrowLeft, Printer, Download, MessageCircle,
  Phone, CheckCircle2, Clock, AlertCircle,
  IndianRupee, CreditCard,
} from 'lucide-react'

// Import your custom PdfViewer component
import { PdfViewer } from '@/components/shared/PdfViewer' 

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DOC_LABELS = DOC_TYPE_LABELS as Record<string, string>
const getDocLabel = (t: string) => DOC_LABELS[t] ?? t

function getPdfUrl(id: number): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/+$/, '')
  return `${base}/documents/${id}/print/`
}

const WITH_PAYMENT = new Set(['bill', 'invoice', 'cn', 'dn', 'cash_payment_voucher', 'cash_receipt_voucher'])

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecordPaymentPayload {
  amount: number
  payment_account: number
  date: string
  notes?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { id: number }

export function DocumentPrintPage({ id }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: doc, isLoading } = useDocument(id)
  const { data: accountsData } = useAccounts({ is_active: true })

  // WhatsApp sheet state
  const [waOpen, setWaOpen] = useState(false)
  const [selectedPhone, setSelectedPhone] = useState('')

  // Mark Paid sheet state
  const [paidOpen, setPaidOpen] = useState(false)
  const [paidAmount, setPaidAmount] = useState('')
  const [paidAccount, setPaidAccount] = useState('')
  const [paidDate, setPaidDate] = useState(() => new Date().toISOString().split('T')[0])
  const [paidNotes, setPaidNotes] = useState('')

  // ── Record payment mutation ────────────────────────────────────────────────
  const recordPayment = useMutation({
    mutationFn: (payload: RecordPaymentPayload) =>
        api.post(`/documents/${id}/record_payment/`, payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] })
      toast.success('Payment recorded')
      setPaidOpen(false)
      setPaidAmount('')
      setPaidAccount('')
      setPaidNotes('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Failed to record payment'),
  })

  // ── Derived ────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex flex-col h-screen gap-3 p-4">
      <Skeleton className="h-14 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="flex-1 w-full rounded-2xl" />
    </div>
  )
  if (!doc) return null

  const pdfUrl = getPdfUrl(id)
  const contact = doc.contact_display
  const allPhones = contact?.all_phones ?? []
  const hasMultiPhone = allPhones.length > 1
  const payStatus = WITH_PAYMENT.has(doc.type) ? doc.payment_status : null
  const isPaid = payStatus?.is_paid ?? false
  const remaining = payStatus ? Number(payStatus.remaining) : 0
  const isPartial = !isPaid && remaining < Number(payStatus?.record ?? 0) && remaining > 0

  const accounts = accountsData?.results ?? []
  const accountOptions: SearchableSelectOption[] = accounts.map(a => ({
    value: String(a.id),
    label: a.name,
    sublabel: `${a.type} · ${fmtAmount(a.current_balance)}`,
  }))

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = `${doc.type.toUpperCase()}_${doc.doc_id}_${doc.date}.pdf`
    a.target = '_blank'
    a.click()
  }

  const handlePrint = () => window.open(pdfUrl, '_blank', 'noopener,noreferrer')

  const handleWhatsApp = (phone: string) => {
    handleDownload()
    const sanitised = phone.replace(/\D/g, '')
    const intl = sanitised.startsWith('91') ? sanitised : `91${sanitised}`
    const name = contact?.name ?? ''
    const total = doc.total_amount ? `₹${doc.total_amount}` : ''
    const terms = doc.payment_terms ? `\nPayment Terms: ${doc.payment_terms}` : ''
    const msg = `Hello ${name},\nYour ${getDocLabel(doc.type)} ${doc.doc_id} dated ${fmtDate(doc.date)} is ready.\nTotal Amount: ${total}${terms}\nThank you for your business!`
    window.open(`https://api.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer')
    setWaOpen(false)
  }

  const handleWhatsAppClick = () => {
    if (!contact) return
    if (hasMultiPhone) { setSelectedPhone(allPhones[0]?.number ?? ''); setWaOpen(true) }
    else handleWhatsApp(contact.phone ?? '')
  }

  const handleMarkPaid = () => {
    if (!paidAmount || Number(paidAmount) <= 0) { toast.error('Enter a valid amount'); return }
    if (!paidAccount) { toast.error('Select a payment account'); return }
    recordPayment.mutate({
      amount: Number(paidAmount),
      payment_account: Number(paidAccount),
      date: paidDate,
      notes: paidNotes || undefined,
    })
  }

  const openMarkPaid = () => {
    setPaidAmount(remaining > 0 ? String(remaining) : String(doc.total_amount ?? ''))
    setPaidOpen(true)
  }

  // ── Payment status pill ────────────────────────────────────────────────────
  const PayStatusBadge = () => {
    if (!payStatus) return null
    if (isPaid) return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold">
        <CheckCircle2 className="h-3 w-3" /> Paid
      </Badge>
    )
    if (isPartial) return (
      <Badge className="gap-1 bg-amber-100 text-amber-700 border-amber-200 font-semibold">
        <Clock className="h-3 w-3" /> Partial
      </Badge>
    )
    return (
      <Badge className="gap-1 bg-rose-100 text-rose-700 border-rose-200 font-semibold">
        <AlertCircle className="h-3 w-3" /> Unpaid
      </Badge>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">

      {/* ── Top action bar ─────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur z-10 gap-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="flex flex-col items-center gap-1 leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {getDocLabel(doc.type)}
            </span>
            <PayStatusBadge />
          </div>
          <span className="text-sm font-black">#{doc.doc_id}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {contact?.phone && (
            <Button size="sm" variant="outline"
              className="gap-1.5 h-9 rounded-lg border-green-500/40 text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
              onClick={handleWhatsAppClick}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5 h-9 rounded-lg" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <Button size="sm" className="gap-1.5 h-9 rounded-lg shadow-sm shadow-primary/20" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
        </div>
      </div>

      {/* ── Payment status banner ───────────────────────────────────────────── */}
      {payStatus && !isPaid && (
        <div className={`shrink-0 flex items-center justify-between px-4 py-3 border-b gap-4
          ${isPartial
            ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40'
            : 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/40'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0
              ${isPartial ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}
            >
              <IndianRupee className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-bold leading-tight
                ${isPartial ? 'text-amber-800 dark:text-amber-300' : 'text-rose-800 dark:text-rose-300'}`}
              >
                {isPartial ? 'Partially Paid' : 'Payment Pending'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isPartial
                  ? `₹${payStatus.paid} paid · ₹${remaining} remaining`
                  : `₹${remaining} due`
                }
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={openMarkPaid}
            className={`shrink-0 gap-1.5 h-9 rounded-lg font-semibold
              ${isPartial
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/20'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20'
              }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Mark Paid
          </Button>
        </div>
      )}

      {/* Fully Paid banner */}
      {payStatus && isPaid && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Fully paid · ₹{payStatus.paid}
          </p>
        </div>
      )}

      {/* ── PDF Preview Section (Updated) ─────────────────────────────────── */}
      <div className="flex-1 bg-muted/30 overflow-hidden relative">
        <PdfViewer 
          url={pdfUrl} 
          className="h-full w-full" 
        />
      </div>

      {/* ── WhatsApp selector sheet ───────────────────────────────────── */}
      <Sheet open={waOpen} onOpenChange={setWaOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Select Recipient
            </SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground mb-4">
            PDF will be downloaded automatically. Attach it in WhatsApp after it opens.
          </p>
          <div className="space-y-2">
            {allPhones.map((p, i) => (
              <button
                key={i}
                onClick={() => setSelectedPhone(p.number)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                  selectedPhone === p.number
                    ? 'border-green-500 bg-green-50/60 dark:bg-green-950/30'
                    : 'border-border bg-background hover:bg-muted/40'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  selectedPhone === p.number ? 'bg-green-500' : 'bg-muted'
                }`}>
                  <Phone className={`h-4 w-4 ${selectedPhone === p.number ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{p.name || contact?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.number}{p.role && ` · ${p.role}`}
                  </p>
                </div>
                {selectedPhone === p.number && (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <Button variant="outline" className="flex-1 h-12 rounded-2xl" onClick={() => setWaOpen(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 h-12 rounded-2xl bg-green-600 hover:bg-green-700 gap-2 shadow-lg shadow-green-600/20"
              disabled={!selectedPhone}
              onClick={() => handleWhatsApp(selectedPhone)}
            >
              <MessageCircle className="h-4 w-4" />
              Send on WhatsApp
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Mark Paid sheet ─────────────────────────────────────────────────── */}
      <Sheet open={paidOpen} onOpenChange={setPaidOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Record Payment
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-1.5 mb-4">
            <Label>
              Amount <span className="text-destructive">*</span>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => setPaidAmount(String(remaining))}
                  className="ml-2 text-xs font-semibold text-primary underline underline-offset-2"
                >
                  Full ₹{remaining}
                </button>
              )}
            </Label>
            <Input
              type="number"
              placeholder="0.00"
              value={paidAmount}
              onChange={e => setPaidAmount(e.target.value)}
              className="h-14 text-2xl font-bold rounded-xl"
            />
          </div>

          <div className="space-y-1.5 mb-4">
            <Label>Payment Account <span className="text-destructive">*</span></Label>
            <SearchableSelect
              options={accountOptions}
              value={paidAccount}
              onChange={setPaidAccount}
              placeholder="Select account"
              title="Select Payment Account"
              searchPlaceholder="Search accounts..."
            />
          </div>

          <div className="space-y-1.5 mb-4">
            <Label>Date</Label>
            <Input
              type="date"
              value={paidDate}
              onChange={e => setPaidDate(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-1.5 mb-6">
            <Label>Notes <span className="text-xs text-muted-foreground font-normal ml-1">optional</span></Label>
            <Input
              placeholder="e.g. Paid via UPI ref #123"
              value={paidNotes}
              onChange={e => setPaidNotes(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12 rounded-2xl" onClick={() => setPaidOpen(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 h-12 rounded-2xl gap-2 shadow-lg shadow-primary/20"
              disabled={recordPayment.isPending}
              onClick={handleMarkPaid}
            >
              <CheckCircle2 className="h-4 w-4" />
              {recordPayment.isPending ? 'Saving...' : 'Record Payment'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  )
}
