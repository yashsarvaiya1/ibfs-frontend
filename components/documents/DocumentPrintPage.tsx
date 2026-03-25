'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDocument, useRecordPayment, useMarkPaid } from '@/hooks/useDocument'
import { useAccounts } from '@/hooks/useAccount'
import { DOC_TYPE_LABELS, MARK_PAID_TYPES } from '@/models/document'
import { documentService } from '@/services/documentService'
import { fmtDate, fmtAmount, cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SearchableSelect, type SearchableSelectOption } from '@/components/shared/common/SearchableSelect'
import { PdfViewer } from '@/components/shared/PdfViewer'
import { toast } from 'sonner'
import api from '@/lib/axios'
import {
  ArrowLeft, Download, MessageCircle,
  Phone, CheckCircle2, Clock, AlertCircle,
  IndianRupee, CreditCard, Tag, Building2,
  Calendar, Hash, User, MapPin, BadgeCheck,
  ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'

const DOC_LABELS  = DOC_TYPE_LABELS as Record<string, string>
const getDocLabel = (t: string) => DOC_LABELS[t] ?? t

const WITH_PAYMENT = new Set([
  'bill', 'invoice', 'cn', 'dn',
  'cash_payment_voucher', 'cash_receipt_voucher',
])

interface Props { id: number }

export function DocumentPrintPage({ id }: Props) {
  const router = useRouter()
  const { data: doc, isLoading } = useDocument(id)
  const { data: accountsData }   = useAccounts({ is_active: true })

  const recordPaymentMutation = useRecordPayment(id)
  const markPaidMutation      = useMarkPaid(id)

  const [waOpen,        setWaOpen]        = useState(false)
  const [selectedPhone, setSelectedPhone] = useState('')
  const [payOpen,       setPayOpen]       = useState(false)
  const [paidAmount,    setPaidAmount]    = useState('')
  const [paidAccount,   setPaidAccount]   = useState('')
  const [paidDate,      setPaidDate]      = useState(() => new Date().toISOString().split('T')[0])
  const [paidNotes,     setPaidNotes]     = useState('')
  const [infoOpen,      setInfoOpen]      = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  if (isLoading) return (
    <div className="flex flex-col gap-3 p-4" style={{ height: '100dvh' }}>
      <Skeleton className="h-14 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="flex-1 w-full rounded-2xl" />
    </div>
  )
  if (!doc) return null

  const pdfUrl      = documentService.getPdfUrl(id)
  const contact     = doc.contact_display
  const consignee   = doc.consignee_display
  const allPhones   = contact?.all_phones ?? []
  const payStatus   = WITH_PAYMENT.has(doc.type) ? doc.payment_status : null
  const txnPaid     = payStatus?.is_paid ?? false
  const manualPaid  = doc.is_paid
  const isFullyPaid = txnPaid || manualPaid
  const remaining   = payStatus ? Number(payStatus.remaining) : 0
  const isPartial   = !txnPaid && remaining < Number(payStatus?.record ?? 0) && remaining > 0
  const canMarkPaid = MARK_PAID_TYPES.includes(doc.type)
  const accounts    = accountsData?.results ?? []

  const accountOptions: SearchableSelectOption[] = accounts.map(a => ({
    value:    String(a.id),
    label:    a.name,
    sublabel: `${a.type} · ${fmtAmount(a.current_balance)}`,
  }))

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Bug #2 fix: fetch PDF as authenticated blob instead of bare anchor click
  const handleDownload = async () => {
    if (isDownloading) return
    setIsDownloading(true)
    try {
      const response = await api.get<Blob>(pdfUrl, { responseType: 'blob' })
      const blob     = new Blob([response.data], { type: 'application/pdf' })
      const url      = URL.createObjectURL(blob)
      const a        = document.createElement('a')
      a.href         = url
      a.download     = `${doc.type.toUpperCase()}_${doc.doc_id}_${doc.date}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleWhatsApp = (phone: string) => {
    // Trigger PDF download first via direct URL — on Android Chrome PWA,
    // opening a Content-Disposition:attachment URL in _blank triggers a download
    // automatically (direct user gesture path, no blob security block).
    const dlLink = document.createElement('a')
    dlLink.href = pdfUrl
    dlLink.target = '_blank'
    dlLink.rel = 'noopener noreferrer'
    document.body.appendChild(dlLink)
    dlLink.click()
    document.body.removeChild(dlLink)

    const sanitised = phone.replace(/\D/g, '')
    const intl      = sanitised.startsWith('91') ? sanitised : `91${sanitised}`
    const name      = contact?.name ?? ''
    const total     = doc.total_amount ? `₹${doc.total_amount}` : ''
    const terms     = doc.payment_terms ? `\nPayment Terms: ${doc.payment_terms}` : ''
    const msg       = [
      `Hello ${name},`,
      `Your ${getDocLabel(doc.type)} *#${doc.doc_id}* dated ${fmtDate(doc.date)} is ready.`,
      `Total Amount: *${total}*${terms}`,
      `Thank you for your business!`,
    ].join('\n')
    window.open(
      `https://api.whatsapp.com/send?phone=${intl}&text=${encodeURIComponent(msg)}`,
      '_blank', 'noopener,noreferrer',
    )
    setWaOpen(false)
  }

  const handleWhatsAppClick = () => {
    if (!contact) return
    if (allPhones.length > 1) {
      setSelectedPhone(allPhones[0]?.number ?? '')
      setWaOpen(true)
    } else {
      handleWhatsApp(contact.phone ?? '')
    }
  }

  const handleRecordPayment = async () => {
    if (!paidAmount || Number(paidAmount) <= 0) { toast.error('Enter a valid amount'); return }
    if (!paidAccount) { toast.error('Select a payment account'); return }
    try {
      await recordPaymentMutation.mutateAsync({
        amount:          paidAmount,
        payment_account: Number(paidAccount),
        date:            paidDate,
        notes:           paidNotes || undefined,
      })
      toast.success('Payment recorded')
      setPayOpen(false)
      setPaidAmount(''); setPaidAccount(''); setPaidNotes('')
    } catch { toast.error('Failed to record payment') }
  }

  const handleToggleMarkPaid = async () => {
    try {
      await markPaidMutation.mutateAsync({ is_paid: !doc.is_paid })
      toast.success(doc.is_paid ? 'Marked as unpaid' : 'Marked as paid')
    } catch { toast.error('Failed to update') }
  }

  const openRecordPayment = () => {
    setPaidAmount(remaining > 0 ? String(remaining) : String(doc.total_amount ?? ''))
    setPayOpen(true)
  }

  const PayStatusBadge = () => {
    if (!payStatus && !manualPaid) return null
    if (isFullyPaid) return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-[11px] rounded-lg">
        <CheckCircle2 className="h-3 w-3" />
        {manualPaid && !txnPaid ? 'Marked Paid' : 'Paid'}
      </Badge>
    )
    if (isPartial) return (
      <Badge className="gap-1 bg-amber-100 text-amber-700 border border-amber-200 font-semibold text-[11px] rounded-lg">
        <Clock className="h-3 w-3" /> Partial
      </Badge>
    )
    return (
      <Badge className="gap-1 bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px] rounded-lg">
        <AlertCircle className="h-3 w-3" /> Unpaid
      </Badge>
    )
  }

  return (
    <div
      className="flex flex-col bg-background overflow-hidden"
      style={{ height: '100dvh' }}
    >

      {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b bg-background z-20">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 flex flex-col items-center gap-0.5 leading-tight min-w-0">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {getDocLabel(doc.type)}
            </span>
            <PayStatusBadge />
          </div>
          <span className="text-sm font-black text-foreground">#{doc.doc_id}</span>
          {contact?.name && (
            <span className="text-[11px] text-muted-foreground font-medium truncate max-w-40">
              {contact.name}
            </span>
          )}
        </div>

        <div className="w-7 shrink-0" />
      </div>

      {/* ══ COLLAPSIBLE DOC INFO ══════════════════════════════════════════════ */}
      <div className="shrink-0 border-b bg-muted/20">
        <button
          onClick={() => setInfoOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">{fmtDate(doc.date)}</span>
            </div>
            {doc.due_date && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {/* Bug #5: show "Valid Till" for quotation, "Due" for others */}
                <span>{doc.type === 'quotation' ? 'Valid Till' : 'Due'}: {fmtDate(doc.due_date)}</span>
              </div>
            )}
            {doc.total_amount && (
              <div className="flex items-center gap-1.5 text-xs font-black text-foreground">
                <IndianRupee className="h-3.5 w-3.5 shrink-0" />
                <span>{fmtAmount(doc.total_amount)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <span className="text-[10px] text-muted-foreground font-medium">
              {infoOpen ? 'Less' : 'Details'}
            </span>
            {infoOpen
              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        </button>

        {infoOpen && (
          <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-3 border-t border-border/50">
            {contact && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {doc.type === 'bill' ? 'Supplier' : 'Customer'}
                </p>
                <p className="text-sm font-semibold text-foreground leading-tight">{contact.name}</p>
                {contact.phone && <p className="text-xs text-muted-foreground">{contact.phone}</p>}
                {contact.address && (
                  <p className="text-xs text-muted-foreground leading-snug flex items-start gap-1">
                    <MapPin className="h-3 w-3 shrink-0 mt-0.5" />{contact.address}
                  </p>
                )}
                {contact.gstin && (
                  <p className="text-[11px] font-mono font-bold text-muted-foreground flex items-center gap-1">
                    <BadgeCheck className="h-3 w-3" /> GSTIN: {contact.gstin}
                  </p>
                )}
              </div>
            )}
            {consignee && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Consignee
                </p>
                <p className="text-sm font-semibold text-foreground leading-tight">{consignee.name}</p>
                {consignee.phone && <p className="text-xs text-muted-foreground">{consignee.phone}</p>}
                {consignee.address && (
                  <p className="text-xs text-muted-foreground leading-snug flex items-start gap-1">
                    <MapPin className="h-3 w-3 shrink-0 mt-0.5" />{consignee.address}
                  </p>
                )}
              </div>
            )}
            <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-1.5 pt-1 border-t border-border/40">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />
                <span className="font-medium">Doc ID: <strong className="text-foreground">{doc.doc_id}</strong></span>
              </div>
              {doc.payment_terms && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Terms: <strong className="text-foreground">{doc.payment_terms}</strong></span>
                </div>
              )}
              {doc.notes && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="italic">"{doc.notes}"</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ PAYMENT BANNER — unpaid / partial ════════════════════════════════ */}
      {payStatus && !isFullyPaid && (
        <div className={cn(
          'shrink-0 flex items-center justify-between px-4 py-3 border-b gap-3',
          isPartial
            ? 'bg-amber-50 border-amber-200'
            : 'bg-rose-50 border-rose-200',
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
              isPartial ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600',
            )}>
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className={cn('text-sm font-bold leading-tight',
                isPartial ? 'text-amber-800' : 'text-rose-800')}>
                {isPartial ? 'Partially Paid' : 'Payment Pending'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium truncate">
                {isPartial
                  ? `${fmtAmount(payStatus.paid)} paid · ${fmtAmount(remaining)} due`
                  : `${fmtAmount(remaining)} due`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {canMarkPaid && (
              <Button size="sm" variant="outline"
                disabled={markPaidMutation.isPending}
                onClick={handleToggleMarkPaid}
                className="h-8 rounded-xl gap-1 border-muted-foreground/30 text-xs font-semibold px-2.5"
              >
                <Tag className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mark Paid</span>
              </Button>
            )}
            <Button size="sm" onClick={openRecordPayment}
              className={cn(
                'h-8 rounded-xl gap-1 text-xs font-bold px-3',
                isPartial
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white',
              )}
            >
              <CreditCard className="h-3.5 w-3.5" />
              Record
            </Button>
          </div>
        </div>
      )}

      {/* ══ FULLY PAID BANNER ════════════════════════════════════════════════ */}
      {isFullyPaid && (payStatus || manualPaid) && (
        <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-emerald-50 border-b border-emerald-200">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-800 leading-tight truncate">
                {manualPaid && !txnPaid
                  ? 'Manually marked as paid'
                  : `Fully settled · ${fmtAmount(payStatus?.paid ?? 0)}`}
              </p>
              {txnPaid && payStatus && (
                <p className="text-[11px] text-emerald-600/80 font-medium">
                  Auto-settled from transactions
                </p>
              )}
            </div>
          </div>
          {canMarkPaid && manualPaid && (
            <Button size="sm" variant="ghost"
              disabled={markPaidMutation.isPending}
              onClick={handleToggleMarkPaid}
              className="h-8 text-xs text-muted-foreground hover:text-destructive rounded-xl shrink-0 ml-2"
            >
              Unmark
            </Button>
          )}
        </div>
      )}

      {/* ══ PDF VIEWER ═══════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 min-w-0 w-full overflow-hidden">
        <PdfViewer url={pdfUrl} className="h-full w-full block" />
      </div>

      {/* ══ BOTTOM ACTION BAR ════════════════════════════════════════════════ */}
      <div className="shrink-0 border-t bg-background px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center gap-3 z-20">
        {(contact?.phone || allPhones.length > 0) ? (
          <>
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl gap-2 border-green-500/40 text-green-700 hover:bg-green-50 font-semibold"
              onClick={handleWhatsAppClick}
              disabled={isDownloading}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl gap-2 font-semibold"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Download className="h-4 w-4" />}
              {isDownloading ? 'Downloading…' : 'Download'}
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-xl gap-2 font-semibold"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            {isDownloading ? 'Downloading…' : 'Download PDF'}
          </Button>
        )}
      </div>

      {/* ══ WHATSAPP SHEET ═══════════════════════════════════════════════════ */}
      <Sheet open={waOpen} onOpenChange={setWaOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Select Recipient
            </SheetTitle>
          </SheetHeader>
          <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 mb-4">
            <Download className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <span className="leading-snug">
              The PDF will <strong>download automatically</strong>. Then open WhatsApp, go to the chat, tap the attach icon and select the file from <strong>Downloads</strong>.
            </span>
          </div>
          <div className="space-y-2">
            {allPhones.map((p, i) => (
              <button key={i} onClick={() => setSelectedPhone(p.number)}
                className={cn(
                  'w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left',
                  selectedPhone === p.number
                    ? 'border-green-500 bg-green-50/60'
                    : 'border-border bg-background hover:bg-muted/40',
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                  selectedPhone === p.number ? 'bg-green-500' : 'bg-muted',
                )}>
                  <Phone className={cn('h-4 w-4', selectedPhone === p.number ? 'text-white' : 'text-muted-foreground')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate">{p.name || contact?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    {p.number}{p.role && ` · ${p.role}`}
                  </p>
                </div>
                {selectedPhone === p.number && (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-3 w-3 text-white" />
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
              className="flex-1 h-12 rounded-2xl bg-green-600 hover:bg-green-700 gap-2 font-bold"
              disabled={!selectedPhone}
              onClick={() => handleWhatsApp(selectedPhone)}
            >
              <MessageCircle className="h-4 w-4" /> Send via WhatsApp
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ══ RECORD PAYMENT SHEET ═════════════════════════════════════════════ */}
      <Sheet open={payOpen} onOpenChange={setPayOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Record Payment
            </SheetTitle>
          </SheetHeader>
          <div className="flex items-center justify-between bg-muted/40 rounded-xl px-3.5 py-3 mb-5 border border-border/60">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                {getDocLabel(doc.type)} #{doc.doc_id}
              </p>
              <p className="text-base font-black text-foreground mt-0.5">
                {fmtAmount(doc.total_amount ?? 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium">Remaining</p>
              <p className="text-base font-black text-rose-600 mt-0.5">
                {fmtAmount(remaining > 0 ? remaining : Number(doc.total_amount ?? 0))}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Amount <span className="text-destructive">*</span>
                {remaining > 0 && (
                  <button type="button" onClick={() => setPaidAmount(String(remaining))}
                    className="ml-2 text-xs font-semibold text-primary underline underline-offset-2">
                    Full ₹{remaining}
                  </button>
                )}
              </Label>
              <Input
                type="number" placeholder="0.00" value={paidAmount}
                onChange={e => setPaidAmount(e.target.value)}
                className="h-14 text-2xl font-bold rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Account <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={accountOptions} value={paidAccount} onChange={setPaidAccount}
                placeholder="Select account" title="Select Payment Account"
                searchPlaceholder="Search accounts..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={paidDate}
                onChange={e => setPaidDate(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-xs text-muted-foreground font-normal ml-1">optional</span></Label>
              <Input
                placeholder="e.g. Paid via UPI ref #123" value={paidNotes}
                onChange={e => setPaidNotes(e.target.value)} className="h-11 rounded-xl"
              />
            </div>
            <Separator />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-2xl" onClick={() => setPayOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 h-12 rounded-2xl gap-2 font-bold"
                disabled={recordPaymentMutation.isPending}
                onClick={handleRecordPayment}
              >
                <CheckCircle2 className="h-4 w-4" />
                {recordPaymentMutation.isPending ? 'Saving...' : 'Confirm Payment'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  )
}
