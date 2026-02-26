// app/documents/new/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useCreateDocument, useDocuments, useDocument } from '@/hooks/useDocument'
import { useSettings } from '@/hooks/useSettings'
import { useContacts } from '@/hooks/useContact'
import { useProducts } from '@/hooks/useProduct'
import { useAccounts } from '@/hooks/useAccount'
import {
  DocumentType, DOC_TYPE_LABELS,
  LineItem, Charge, Tax, DocumentCreate
} from '@/models/document'
import { getContactDisplayName } from '@/models/contact'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { X, Plus, ChevronDown, ChevronUp, FileText, Package, Link as LinkIcon } from 'lucide-react'
import { fmtAmount } from '@/lib/utils'
import { SearchableSelect, type SearchableSelectOption } from '@/components/shared/SearchableSelect'

// ─── Safe label lookup ────────────────────────────────────────────────────────
const DOC_LABELS = DOC_TYPE_LABELS as Record<string, string>
const getDocLabel = (t: string | null | undefined) => t ? (DOC_LABELS[t] ?? t) : ''

// ─── Constants ────────────────────────────────────────────────────────────────
const WITH_LINE_ITEMS: DocumentType[] = ['bill', 'invoice', 'po', 'pi', 'quotation', 'challan', 'cn', 'dn']
const WITH_REFERENCE: DocumentType[] = ['po', 'pi', 'quotation', 'cn', 'dn', 'challan', 'bill', 'invoice']
const WITH_CONSIGNEE: DocumentType[] = ['challan', 'invoice', 'bill']
const WITH_PAYMENT:   DocumentType[] = ['bill', 'invoice', 'cn', 'dn']
const IS_VOUCHER:     DocumentType[] = ['cash_payment_voucher', 'cash_receipt_voucher']
const FAST_BILL_TYPES: DocumentType[] = ['bill', 'invoice']

const REF_DOC_TYPES: Partial<Record<DocumentType, DocumentType[]>> = {
  cn:      ['invoice'],
  dn:      ['bill'],
  challan: ['bill', 'invoice', 'cn', 'dn'],
  po:      ['quotation'],
  pi:      ['quotation'],
  bill:    ['po'],
  invoice: ['pi'],
}

// ─── Line item types ──────────────────────────────────────────────────────────
interface LineItemRow extends LineItem { _key: string }

// ─── Line item picker sheet ───────────────────────────────────────────────────
interface LineItemPickerProps {
  open: boolean
  items: LineItem[]
  onConfirm: (selected: LineItem[]) => void
  onClose: () => void
}

function LineItemPickerSheet({ open, items, onConfirm, onClose }: LineItemPickerProps) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(items.map((_, i) => i)))

  useEffect(() => {
    setSelected(new Set(items.map((_, i) => i)))
  }, [items])

  const toggle = (i: number) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  const toggleAll = () =>
    setSelected(prev =>
      prev.size === items.length ? new Set() : new Set(items.map((_, i) => i))
    )

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10" style={{ maxHeight: '80vh' }}>
        <SheetHeader className="mb-3">
          <SheetTitle className="text-left">Copy Items from Reference</SheetTitle>
        </SheetHeader>

        <div onClick={toggleAll} className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl bg-muted/40 cursor-pointer">
          <Checkbox checked={selected.size === items.length} onCheckedChange={toggleAll} onClick={e => e.stopPropagation()} />
          <span className="text-sm font-medium">
            {selected.size === items.length ? 'Deselect all' : 'Select all'}
          </span>
          <span className="text-xs text-muted-foreground ml-auto bg-muted px-2 py-1 rounded-md">
            {selected.size} / {items.length}
          </span>
        </div>

        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 200px)' }}>
          {items.map((item, i) => (
            <div
              key={i}
              onClick={() => toggle(i)}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                selected.has(i) ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/40'
              }`}
            >
              <Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} onClick={e => e.stopPropagation()} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.name}</p>
                {(item.quantity != null || item.rate != null) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.quantity} × ₹{item.rate}
                    {item.hsn ? ` · HSN: ${item.hsn}` : ''}
                  </p>
                )}
              </div>
              {item.amount != null && (
                <p className="text-sm font-semibold shrink-0">{fmtAmount(item.amount)}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-4 pt-2 border-t border-border/50">
          <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 h-12 rounded-xl"
            disabled={selected.size === 0}
            onClick={() => { onConfirm(items.filter((_, i) => selected.has(i))); onClose() }}
          >
            Copy {selected.size} Item{selected.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Product Multi-Picker Sheet ───────────────────────────────────────────────
function ProductMultiPickerSheet({ open, products, onConfirm, onClose }: {
  open: boolean
  products: any[]
  onConfirm: (s: any[]) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open) { setSelected(new Set()); setSearch('') }
  }, [open])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.hsn_code && p.hsn_code.toLowerCase().includes(search.toLowerCase()))
  )

  const toggle = (id: number) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10" style={{ maxHeight: '90vh' }}>
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left flex justify-between items-center pr-6">
            <span>Select Products</span>
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-md">{selected.size} selected</span>
          </SheetTitle>
        </SheetHeader>

        <Input
          placeholder="Search inventory..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-3 h-11 rounded-xl"
        />

        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10 bg-muted/30 rounded-xl border border-dashed">No products found</p>
          ) : (
            filtered.map(p => (
              <div
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selected.has(p.id) ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/40'
                }`}
              >
                <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} onClick={e => e.stopPropagation()} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Stock: {p.current_stock} {p.unit} · ₹{p.rate}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-3 mt-4 pt-2 border-t">
          <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 h-12 rounded-xl"
            disabled={selected.size === 0}
            onClick={() => { onConfirm(products.filter(p => selected.has(p.id))); onClose() }}
          >
            Add {selected.size} Item{selected.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function DocumentNewPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const setPageTitle = useUIStore((s) => s.setPageTitle)

  const docType      = (searchParams.get('type') ?? 'bill') as DocumentType
  const preContactId = searchParams.get('contact') ?? ''

  useEffect(() => { setPageTitle(`New ${getDocLabel(docType)}`) }, [docType, setPageTitle])

  const { data: settings }     = useSettings()
  const { data: contactsData } = useContacts({ is_active: true })
  const { data: productsData } = useProducts({ is_active: true })
  const { data: accountsData } = useAccounts({ is_active: true })

  const refDocTypes       = REF_DOC_TYPES[docType]
  const primaryRefDocType = refDocTypes?.[0]
  const shouldFetchRefDocs = WITH_REFERENCE.includes(docType)

  const { data: referenceDocs } = useDocuments(
    shouldFetchRefDocs ? (primaryRefDocType ? { type: primaryRefDocType } : {}) : undefined
  )

  const createDocument = useCreateDocument()

  // ── Form state ──────────────────────────────────────────────────────────────
  const [contactId,        setContactId]        = useState(preContactId)
  const [consigneeId,      setConsigneeId]      = useState('')
  const [referenceId,      setReferenceId]      = useState('')
  const [date,             setDate]             = useState(new Date().toISOString().split('T')[0])
  const [dueDate,          setDueDate]          = useState('')
  const [paymentTerms,     setPaymentTerms]     = useState('')
  const [notes,            setNotes]            = useState('')
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [discount,         setDiscount]         = useState('')
  const [fastAmount,       setFastAmount]       = useState('')
  const [voucherAmount,    setVoucherAmount]    = useState('')

  // Multi-attachment Array state (replaces single string)
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([])
  const [currentLink, setCurrentLink] = useState('')

  // Fast/Detailed toggle — default to 'fast' for bill/invoice, 'detailed' for others
  const [billMode, setBillMode] = useState<'fast' | 'detailed'>(
    FAST_BILL_TYPES.includes(docType) ? 'fast' : 'detailed'
  )

  const [showCharges,       setShowCharges]       = useState(false)
  const [pickerOpen,        setPickerOpen]        = useState(false)
  const [productPickerOpen, setProductPickerOpen] = useState(false)

  const [lineItems, setLineItems] = useState<LineItemRow[]>([{
    _key: crypto.randomUUID(),
    name: '', quantity: 1, rate: 0, amount: 0, product_id: null,
  }])
  const [charges, setCharges] = useState<Charge[]>([])
  const [taxes,   setTaxes]   = useState<Tax[]>([])

  const contacts = contactsData?.results ?? []
  const products = productsData?.results ?? []
  const accounts = accountsData?.results ?? []
  const refDocs  = shouldFetchRefDocs ? (referenceDocs?.results ?? []) : []

  const refDocId = referenceId ? Number(referenceId) : undefined
  const { data: refDoc } = useDocument(refDocId as number)

  // ── Computed flags ──────────────────────────────────────────────────────────
  const isVoucher          = IS_VOUCHER.includes(docType)
  const hasLineItems       = WITH_LINE_ITEMS.includes(docType)
  const hasReference       = WITH_REFERENCE.includes(docType)
  const hasConsignee       = WITH_CONSIGNEE.includes(docType)
  const showPaymentAccount = WITH_PAYMENT.includes(docType) && !!settings?.auto_transaction
  const isFastBillType     = FAST_BILL_TYPES.includes(docType)
  const isFastMode         = isFastBillType && billMode === 'fast'

  // ── SearchableSelect options ────────────────────────────────────────────────
  const contactOptions: SearchableSelectOption[] = contacts.map(c => ({
    value: String(c.id), label: getContactDisplayName(c),
    sublabel: c.phone, badge: c.gstin ? 'GST' : undefined,
  }))

  const consigneeOptions: SearchableSelectOption[] = [
    { value: '', label: 'None', sublabel: 'No consignee' },
    ...contacts.map(c => ({ value: String(c.id), label: getContactDisplayName(c), sublabel: c.phone })),
  ]

  const refDocOptions: SearchableSelectOption[] = [
    { value: '', label: 'None', sublabel: 'No reference document' },
    ...refDocs.map(d => ({
      value: String(d.id), label: `#${d.doc_id}`, sublabel: d.date,
      badge: getDocLabel(d.type), meta: d.total_amount ? fmtAmount(d.total_amount) : undefined,
    })),
  ]

  const accountOptions: SearchableSelectOption[] = [
    { value: '', label: 'None', sublabel: 'Record only — pay later' },
    ...accounts.map(a => ({
      value: String(a.id), label: a.name,
      sublabel: `${a.type} · ${fmtAmount(a.current_balance)}`,
    })),
  ]

  const productOptions: SearchableSelectOption[] = [
    { value: '', label: 'Custom item', sublabel: 'Enter name manually' },
    ...products.map(p => ({
      value: String(p.id), label: p.name,
      sublabel: `Stock: ${p.current_stock} ${p.unit}${p.hsn_code ? ` · HSN: ${p.hsn_code}` : ''}`,
      meta: `₹${p.rate}`,
    })),
  ]

  // ── Handlers ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!refDoc) return
    if (refDoc.contact) setContactId(String(refDoc.contact))
    if ((refDoc.line_items?.length ?? 0) > 0) setPickerOpen(true)
  }, [refDoc])

  const handlePickerConfirm = (selected: LineItem[]) => {
    if (selected.length === 0) return
    setLineItems(selected.map(item => ({ ...item, _key: crypto.randomUUID() })))
    if (isFastBillType) setBillMode('detailed')
  }

  const handleProductPickerConfirm = (selected: any[]) => {
    if (selected.length === 0) return
    const newItems = selected.map(p => ({
      _key: crypto.randomUUID(), product_id: p.id,
      name: p.name, quantity: 1,
      rate: Number(p.rate), amount: Number(p.rate),
      hsn: p.hsn_code ?? undefined,
    }))
    setLineItems(prev => {
      const filtered = prev.filter(l => l.name.trim() !== '' || l.product_id !== null)
      return [...filtered, ...newItems]
    })
  }

  // File Attachments Handler
  const handleAddAttachment = () => {
    if (currentLink.trim() === '') return
    setAttachmentUrls(prev => [...prev, currentLink.trim()])
    setCurrentLink('')
  }
  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachmentUrls(prev => prev.filter((_, index) => index !== indexToRemove))
  }

  // Line item helpers
  const addLineItem = () => setLineItems(p => [...p, { _key: crypto.randomUUID(), name: '', quantity: 1, rate: 0, amount: 0, product_id: null }])
  const removeLineItem = (key: string) => setLineItems(p => p.filter(l => l._key !== key))
  const updateLineItem = (key: string, field: keyof LineItemRow, value: string | number | null) => {
    setLineItems(p => p.map(l => {
      if (l._key !== key) return l
      const updated = { ...l, [field]: value }
      if (field === 'quantity' || field === 'rate') {
        updated.amount = Number(updated.quantity ?? 0) * Number(updated.rate ?? 0)
      }
      return updated
    }))
  }
  const onProductSelect = (key: string, productId: string) => {
    if (!productId) { updateLineItem(key, 'product_id', null); return }
    const product = products.find(p => String(p.id) === productId)
    if (!product) return
    setLineItems(p => p.map(l => {
      if (l._key !== key) return l
      const qty = Number(l.quantity) || 1
      return { ...l, product_id: product.id, name: product.name, rate: Number(product.rate), amount: qty * Number(product.rate), hsn: product.hsn_code ?? undefined }
    }))
  }

  // Totals
  const lineTotal   = lineItems.reduce((s, l) => s + (Number(l.amount) || 0), 0)
  const chargeTotal = charges.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const discountAmt = Number(discount) || 0
  const taxBase     = lineTotal + chargeTotal - discountAmt
  const taxTotal    = taxes.reduce((s, t) => s + (taxBase * (Number(t.percentage) || 0)) / 100, 0)
  const grandTotal  = lineTotal + chargeTotal - discountAmt + taxTotal

  // Charge/Tax helpers
  const addCharge    = () => setCharges(p => [...p, { name: '', amount: 0 }])
  const removeCharge = (i: number) => setCharges(p => p.filter((_, idx) => idx !== i))
  const updateCharge = (i: number, f: keyof Charge, v: string) => setCharges(p => p.map((c, idx) => idx === i ? { ...c, [f]: f === 'amount' ? Number(v) : v } : c))

  const addTax    = () => setTaxes(p => [...p, { name: '', percentage: 0 }])
  const removeTax = (i: number) => setTaxes(p => p.filter((_, idx) => idx !== i))
  const updateTax = (i: number, f: keyof Tax, v: string) => setTaxes(p => p.map((t, idx) => idx === i ? { ...t, [f]: f === 'percentage' ? Number(v) : v } : t))

  // Submit
  const handleSubmit = async () => {
    if (!contactId) { toast.error('Select a contact'); return }

    const payload: DocumentCreate = {
      type:    docType,
      contact: Number(contactId),
      date,
      due_date:      dueDate      || undefined,
      payment_terms: paymentTerms || undefined,
      notes:         notes        || undefined,
      reference:     referenceId  ? Number(referenceId) : undefined,
      consignee:     consigneeId  ? Number(consigneeId) : undefined,
      discount:      discountAmt,
      attachment_urls: attachmentUrls, // Map the robust array directly
    }

    if (isVoucher) {
      if (!voucherAmount) { toast.error('Enter amount'); return }
      payload.total_amount = voucherAmount
    } else if (hasLineItems) {
      if (isFastMode) {
        if (!fastAmount || Number(fastAmount) <= 0) { toast.error('Enter a total amount'); return }
        payload.total_amount = fastAmount
        payload.line_items   = []
      } else {
        const validItems = lineItems.filter(l => l.name.trim())
        if (validItems.length === 0) { toast.error('Add at least one line item'); return }
        payload.line_items   = validItems.map(({ _key, rate, amount, ...rest }) =>
          docType === 'challan' ? rest : { ...rest, rate, amount }
        )
        payload.charges      = charges.filter(c => c.name)
        payload.taxes        = taxes.filter(t => t.name)
        payload.total_amount = grandTotal.toFixed(2)
      }
    }

    if (showPaymentAccount && paymentAccountId) {
      payload.payment_account = Number(paymentAccountId)
    }

    try {
      const doc = await createDocument.mutateAsync(payload)
      toast.success(`${getDocLabel(docType)} created`)
      router.replace(`/documents/${doc.id}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Failed to create document')
    }
  }

  // ── Reusable Attachments UI Component Function ────────────────────────────────
  const renderAttachmentsSection = () => (
    <div className="space-y-3">
      <Label className="flex items-center gap-1.5">
        <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
        Attachments
        <span className="text-xs text-muted-foreground ml-1 font-normal">(optional)</span>
      </Label>
      
      {/* Input row to add links */}
      <div className="flex gap-2">
        <Input
          placeholder="https://drive.google.com/... or click to upload later"
          value={currentLink}
          onChange={e => setCurrentLink(e.target.value)}
          className="h-11 rounded-xl flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddAttachment();
            }
          }}
        />
        <Button 
          variant="secondary" 
          className="h-11 px-4 rounded-xl shrink-0 font-semibold"
          onClick={handleAddAttachment}
          disabled={!currentLink.trim()}
        >
          Add
        </Button>
      </div>

      {/* List of current attachments */}
      {attachmentUrls.length > 0 && (
        <div className="space-y-2 mt-2">
          {attachmentUrls.map((url, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm truncate font-medium text-foreground/80">
                  {url}
                </span>
              </div>
              <button 
                onClick={() => handleRemoveAttachment(index)}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="px-4 py-4 pb-10 space-y-6">

      {/* ── Contact (always visible) ─────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label>Contact <span className="text-destructive">*</span></Label>
        <SearchableSelect
          options={contactOptions} value={contactId} onChange={setContactId}
          placeholder="Select contact" title="Select Contact"
          searchPlaceholder="Search by name or phone..."
          emptyText="No contacts found" error={!contactId}
        />
      </div>

      {/* ── Date (always visible) ────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label>Date <span className="text-destructive">*</span></Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 rounded-xl" />
      </div>

      {/* ── Mode Toggle (bill/invoice only — moved to top for fast UX) ────── */}
      {isFastBillType && (
        <Tabs value={billMode} onValueChange={v => setBillMode(v as 'fast' | 'detailed')} className="w-full">
          <TabsList className="w-full h-11 bg-muted/60 p-1 rounded-xl">
            <TabsTrigger
              value="fast"
              className="flex-1 h-full text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              ⚡ Fast (Amount Only)
            </TabsTrigger>
            <TabsTrigger
              value="detailed"
              className="flex-1 h-full text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              📋 Detailed (Items)
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <Separator />

      {/* ══════════════════════════════════════════════════════════════════
          FAST MODE — only amount + attachment URL
      ══════════════════════════════════════════════════════════════════ */}
      {isFastMode && (
        <div className="space-y-6">

          {/* Total Amount */}
          <div className="space-y-1.5 bg-primary/5 border border-primary/10 p-4 rounded-xl">
            <Label className="text-primary font-semibold">
              Total Amount <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number" placeholder="0.00"
              className="text-3xl h-16 font-black rounded-xl border-primary/20 bg-background mt-1 tracking-tight"
              value={fastAmount}
              onChange={e => setFastAmount(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground mt-1 leading-tight">
              Creates a valid {getDocLabel(docType)} instantly. Switch to{' '}
              <button
                className="font-semibold text-primary underline underline-offset-2"
                onClick={() => setBillMode('detailed')}
              >
                Detailed
              </button>{' '}
              to add line items &amp; track inventory.
            </p>
          </div>

          {/* Render Multi-Attachments */}
          {renderAttachmentsSection()}

          {/* Payment Account (if auto_transaction ON) */}
          {showPaymentAccount && (
            <div className="space-y-1.5">
              <Label>
                Payment Account
                <span className="text-xs text-muted-foreground ml-1 font-normal">(leave empty to pay later)</span>
              </Label>
              <SearchableSelect
                options={accountOptions} value={paymentAccountId} onChange={setPaymentAccountId}
                placeholder="Select account" title="Select Payment Account"
                searchPlaceholder="Search accounts..." clearable
              />
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          DETAILED MODE — all fields visible
      ══════════════════════════════════════════════════════════════════ */}
      {!isFastMode && (
        <div className="space-y-6">

          {/* Consignee */}
          {hasConsignee && (
            <div className="space-y-1.5">
              <Label>
                Consignee
                <span className="text-xs text-muted-foreground ml-1">(optional)</span>
              </Label>
              <SearchableSelect
                options={consigneeOptions} value={consigneeId} onChange={setConsigneeId}
                placeholder="Select consignee" title="Select Consignee"
                searchPlaceholder="Search contacts..." clearable
              />
            </div>
          )}

          {/* Reference Document */}
          {hasReference && (
            <div className="space-y-1.5">
              <Label>
                Reference Document
                <span className="text-xs text-muted-foreground ml-1">(optional)</span>
              </Label>
              {(docType === 'cn' || docType === 'dn') && (
                <p className="text-xs text-muted-foreground -mt-0.5">
                  {docType === 'cn'
                    ? 'Select the Invoice being returned — contact and items auto-fill'
                    : 'Select the Bill being returned — contact and items auto-fill'}
                </p>
              )}
              <SearchableSelect
                options={refDocOptions} value={referenceId} onChange={setReferenceId}
                placeholder="Link to existing document"
                title={`Select ${primaryRefDocType ? getDocLabel(primaryRefDocType) : 'Reference Document'}`}
                searchPlaceholder="Search by doc ID or date..." clearable
                emptyText={`No ${primaryRefDocType ? getDocLabel(primaryRefDocType) : 'documents'} found`}
              />
              {refDoc && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs mt-2">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-foreground/90">{getDocLabel(refDoc.type)} #{refDoc.doc_id}</span>
                    {refDoc.total_amount && (
                      <span className="text-muted-foreground"> · {fmtAmount(refDoc.total_amount)}</span>
                    )}
                    {(refDoc.line_items?.length ?? 0) > 0 && (
                      <span className="text-muted-foreground"> · {refDoc.line_items!.length} items</span>
                    )}
                  </div>
                  {(refDoc.line_items?.length ?? 0) > 0 && (
                    <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" onClick={() => setPickerOpen(true)}>
                      Copy Items
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Due Date + Payment Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Due Date <span className="text-xs text-muted-foreground font-normal">(opt)</span></Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Terms <span className="text-xs text-muted-foreground font-normal">(opt)</span></Label>
              <Input placeholder="e.g. Net 30" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className="h-11 rounded-xl" />
            </div>
          </div>

          {/* Voucher mode */}
          {isVoucher && (
            <div className="space-y-1.5">
              <Label>Amount <span className="text-destructive">*</span></Label>
              <Input
                type="number" placeholder="0.00"
                className="text-2xl font-bold h-14 rounded-xl px-4"
                value={voucherAmount} onChange={e => setVoucherAmount(e.target.value)}
              />
            </div>
          )}

          {/* Line Items */}
          {hasLineItems && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Line Items</Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-lg px-2.5 border-primary/30 text-primary hover:bg-primary/10" onClick={() => setProductPickerOpen(true)}>
                    <Package className="h-3.5 w-3.5" /> Bulk Add
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs rounded-lg px-2.5 bg-muted/40" onClick={addLineItem}>
                    <Plus className="h-3.5 w-3.5" /> Empty Row
                  </Button>
                </div>
              </div>

              {lineItems.map(item => (
                <Card key={item._key} className="overflow-hidden rounded-xl border border-border/80 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
                  <CardContent className="p-3 space-y-3">
                    {products.length > 0 && (
                      <SearchableSelect
                        options={productOptions}
                        value={item.product_id ? String(item.product_id) : ''}
                        onChange={v => onProductSelect(item._key, v)}
                        placeholder="Link to inventory product (optional)"
                        title="Select Product" searchPlaceholder="Search by name or HSN..." clearable
                      />
                    )}
                    <Input
                      placeholder="Item name / description" value={item.name}
                      onChange={e => updateLineItem(item._key, 'name', e.target.value)}
                      className="h-10 bg-muted/20"
                    />
                    <div className={`grid gap-3 ${docType === 'challan' ? 'grid-cols-1' : 'grid-cols-3'}`}>
                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Qty</p>
                        <Input type="number" className="h-10 font-medium" value={item.quantity}
                          onChange={e => updateLineItem(item._key, 'quantity', Number(e.target.value))} />
                      </div>
                      {docType !== 'challan' && (
                        <>
                          <div className="space-y-1.5">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Rate (₹)</p>
                            <Input type="number" className="h-10 font-medium" value={item.rate}
                              onChange={e => updateLineItem(item._key, 'rate', Number(e.target.value))} />
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Amount</p>
                            <Input type="number" className="h-10 font-bold bg-muted/50 border-transparent focus-visible:ring-0" readOnly value={item.amount} />
                          </div>
                        </>
                      )}
                    </div>
                    {lineItems.length > 1 && (
                      <div className="flex justify-end pt-1">
                        <button onClick={() => removeLineItem(item._key)} className="flex items-center gap-1.5 text-xs font-medium text-destructive/80 hover:text-destructive transition-colors py-1">
                          <X className="h-3.5 w-3.5" /> Remove Row
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Taxes, Discounts & Charges */}
              {docType !== 'challan' && (
                <div className="pt-2">
                  <button
                    className="flex items-center justify-between w-full p-3 rounded-xl border bg-muted/20 text-sm font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
                    onClick={() => setShowCharges(v => !v)}
                  >
                    <span>Taxes, Discounts &amp; Charges</span>
                    {showCharges ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {showCharges && (
                    <div className="space-y-5 p-4 mt-2 border rounded-xl bg-background/50">
                      <div className="space-y-1.5">
                        <Label>Overall Discount (₹)</Label>
                        <Input type="number" placeholder="0.00" value={discount} className="h-11 rounded-lg" onChange={e => setDiscount(e.target.value)} />
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Additional Charges</Label>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addCharge}>
                            <Plus className="h-3 w-3" /> Add Charge
                          </Button>
                        </div>
                        {charges.map((c, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Input placeholder="e.g. Freight" className="flex-1 h-10" value={c.name} onChange={e => updateCharge(i, 'name', e.target.value)} />
                            <Input type="number" placeholder="₹" className="w-24 h-10 font-medium" value={c.amount || ''} onChange={e => updateCharge(i, 'amount', e.target.value)} />
                            <button onClick={() => removeCharge(i)} className="p-2 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Taxes</Label>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addTax}>
                            <Plus className="h-3 w-3" /> Add Tax
                          </Button>
                        </div>
                        {taxes.map((t, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Input placeholder="e.g. IGST 18%" className="flex-1 h-10" value={t.name} onChange={e => updateTax(i, 'name', e.target.value)} />
                            <div className="relative w-24">
                              <Input type="number" placeholder="0" className="w-full h-10 font-medium pr-6" value={t.percentage || ''} onChange={e => updateTax(i, 'percentage', e.target.value)} />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                            </div>
                            <button onClick={() => removeTax(i)} className="p-2 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Total Summary */}
                  <Card className="mt-4 bg-muted/30 border-transparent">
                    <CardContent className="p-4 space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground font-medium">
                        <span>Subtotal</span><span>{fmtAmount(lineTotal)}</span>
                      </div>
                      {chargeTotal > 0 && (
                        <div className="flex justify-between text-muted-foreground font-medium">
                          <span>Charges</span><span>+{fmtAmount(chargeTotal)}</span>
                        </div>
                      )}
                      {discountAmt > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium">
                          <span>Discount</span><span>−{fmtAmount(discountAmt)}</span>
                        </div>
                      )}
                      {taxTotal > 0 && (
                        <div className="flex justify-between text-muted-foreground font-medium">
                          <span>Tax</span><span>+{fmtAmount(taxTotal)}</span>
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between font-black text-xl text-foreground">
                        <span>Total</span><span>{fmtAmount(grandTotal)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Payment Account */}
          {showPaymentAccount && (
            <div className="space-y-1.5">
              <Label>
                Payment Account
                <span className="text-xs text-muted-foreground ml-1 font-normal">(leave empty to pay later)</span>
              </Label>
              <SearchableSelect
                options={accountOptions} value={paymentAccountId} onChange={setPaymentAccountId}
                placeholder="Select account" title="Select Payment Account"
                searchPlaceholder="Search accounts..." clearable
              />
            </div>
          )}

          {/* Render Multi-Attachments for Detailed Mode too */}
          {renderAttachmentsSection()}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-xs text-muted-foreground ml-1 font-normal">(optional)</span></Label>
            <Input placeholder="Internal remarks..." value={notes} onChange={e => setNotes(e.target.value)} className="h-11 rounded-xl" />
          </div>
        </div>
      )}

      {/* ── Submit ───────────────────────────────────────────────────────── */}
      <div className="pt-2">
        <Button
          className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20"
          onClick={handleSubmit}
          disabled={createDocument.isPending}
        >
          {createDocument.isPending ? 'Creating...' : `Create ${getDocLabel(docType)}`}
        </Button>
      </div>

      {/* ── Pickers ──────────────────────────────────────────────────────── */}
      {(refDoc?.line_items?.length ?? 0) > 0 && (
        <LineItemPickerSheet
          open={pickerOpen} items={refDoc!.line_items!}
          onConfirm={handlePickerConfirm} onClose={() => setPickerOpen(false)}
        />
      )}
      <ProductMultiPickerSheet
        open={productPickerOpen} products={products}
        onConfirm={handleProductPickerConfirm} onClose={() => setProductPickerOpen(false)}
      />
    </div>
  )
}
