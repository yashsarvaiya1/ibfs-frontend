'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useDocument, useUpdateDocument, useDocuments } from '@/hooks/useDocument'
import { useContacts } from '@/hooks/useContact'
import { useProducts } from '@/hooks/useProduct'
import {
  DocumentType, DOC_TYPE_LABELS,
  LineItem, Charge, Tax, DocumentUpdate,
} from '@/models/document'
import { getContactDisplayName } from '@/models/contact'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  X, Plus, ChevronDown, ChevronUp,
  Package, AlertCircle, Paperclip,
  TrendingUp, TrendingDown, Info, Link as LinkIcon,
} from 'lucide-react'
import { fmtAmount, fmtDate, cn } from '@/lib/utils'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/components/shared/common/SearchableSelect'
import { UploadInput }     from '@/components/shared/common/UploadInput'
import { FilePreviewSheet } from '@/components/shared/FilePreviewSheet'

const DOC_LABELS  = DOC_TYPE_LABELS as Record<string, string>
const getDocLabel = (t: string | null | undefined) => t ? (DOC_LABELS[t] ?? t) : ''

// ── Type classification ──────────────────────────────────────────────────────
const WITH_LINE_ITEMS: DocumentType[] = ['bill', 'invoice', 'po', 'pi', 'quotation', 'challan', 'cn', 'dn']
const WITH_CONSIGNEE:  DocumentType[] = ['challan', 'invoice', 'bill']
const IS_VOUCHER:      DocumentType[] = ['cash_payment_voucher', 'cash_receipt_voucher']
const CONTACT_REQUIRED: DocumentType[] = ['bill', 'invoice', 'cn', 'dn', 'cash_payment_voucher', 'cash_receipt_voucher']
const IS_EXPENSE_TYPE: DocumentType[] = ['expense', 'interest']

// ── Local row types ──────────────────────────────────────────────────────────
interface LineItemRow extends LineItem { key: string }
interface SimpleRow   { key: string; name: string; amount: string }

// ── Product multi-picker sheet ───────────────────────────────────────────────
function ProductMultiPickerSheet({
  open, products, onConfirm, onClose,
}: {
  open: boolean
  products: any[]
  onConfirm: (s: any[]) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [search,   setSearch]   = useState('')

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
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-md">
              {selected.size} selected
            </span>
          </SheetTitle>
        </SheetHeader>
        <Input
          placeholder="Search inventory..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="mb-3 h-11 rounded-xl"
        />
        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10 bg-muted/30 rounded-xl border border-dashed">
              No products found
            </p>
          ) : filtered.map(p => (
            <div key={p.id} onClick={() => toggle(p.id)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                selected.has(p.id) ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/40'
              )}>
              <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)}
                onClick={e => e.stopPropagation()} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Stock {p.current_stock} {p.unit} · ₹{p.rate}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-4 pt-2 border-t">
          <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 h-12 rounded-xl" disabled={selected.size === 0}
            onClick={() => { onConfirm(products.filter(p => selected.has(p.id))); onClose() }}>
            Add {selected.size} Item{selected.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function DocumentEditPage({ id }: { id: number }) {
  const router       = useRouter()
  const setPageTitle = useUIStore(s => s.setPageTitle)

  const { data: doc,          isLoading: docLoading } = useDocument(id)
  const updateDocument = useUpdateDocument(id)
  const { data: contactsData } = useContacts({ is_active: true })
  const { data: productsData } = useProducts({ is_active: true })

  // ✅ For reference picker — fetch all active docs
  const { data: allDocsData } = useDocuments({ ordering: '-date', page_size: 200, is_active: true } as any)

  // ── Form state ──────────────────────────────────────────────────────────────
  const [contactId,          setContactId]          = useState('')
  const [consigneeId,        setConsigneeId]        = useState('')
  const [referenceId,        setReferenceId]        = useState('')
  const [date,               setDate]               = useState('')
  const [dueDate,            setDueDate]            = useState('')
  const [paymentTerms,       setPaymentTerms]       = useState('')
  const [notes,              setNotes]              = useState('')
  const [discount,           setDiscount]           = useState('')
  const [attachmentUrls,     setAttachmentUrls]     = useState<string[]>([])
  const [fastAmountOverride, setFastAmountOverride] = useState('')
  const [voucherAmount,      setVoucherAmount]      = useState('')
  const [showCharges,        setShowCharges]        = useState(false)
  const [productPickerOpen,  setProductPickerOpen]  = useState(false)
  const [lineItems,          setLineItems]          = useState<LineItemRow[]>([])
  const [simpleRows, setSimpleRows] = useState<{ key: string; name: string; amount: string; type: string }[]>(
    [{ key: crypto.randomUUID(), name: '', amount: '', type: 'charge' }]
  )
  const [charges,            setCharges]            = useState<Charge[]>([])
  const [taxes,              setTaxes]              = useState<Tax[]>([])
  const [previewOpen,        setPreviewOpen]        = useState(false)
  const [previewIndex,       setPreviewIndex]       = useState(0)

  // Page title
  useEffect(() => {
    if (!doc) return
    setPageTitle(`Edit ${getDocLabel(doc.type)} ${doc.doc_id}`)
  }, [doc?.id, doc?.doc_id, doc?.type, setPageTitle])

  // Populate form from doc
  useEffect(() => {
    if (!doc) return
    setContactId(doc.contact    ? String(doc.contact)    : '')
    setConsigneeId(doc.consignee ? String(doc.consignee) : '')
    setReferenceId(doc.reference ? String(doc.reference) : '')
    setDate(doc.date)
    setDueDate(doc.due_date ?? '')
    setPaymentTerms(doc.payment_terms ?? '')
    setNotes(doc.notes ?? '')
    setDiscount(doc.discount ? String(doc.discount) : '')
    setAttachmentUrls(doc.attachment_urls ?? [])
    setVoucherAmount(doc.total_amount ? String(doc.total_amount) : '')

    if (IS_EXPENSE_TYPE.includes(doc.type as DocumentType)) {
      const items = doc.line_items ?? []
      setSimpleRows(
        items.length > 0
          ? items.map(l => ({
              key:    crypto.randomUUID(),
              name:   l.name,
              amount: String(l.amount ?? ''),
              type:   (l as any).type ?? 'charge',   // ← add this
            }))
          : [{ key: crypto.randomUUID(), name: '', amount: '', type: 'charge' }]
      )
    } else {
      const items = doc.line_items ?? []
      if (items.length === 0 && Number(doc.total_amount) > 0) {
        // fast mode — doc has total but no line items
        setFastAmountOverride(String(doc.total_amount))
        setLineItems([{ key: crypto.randomUUID(), name: '', quantity: 1, rate: 0, amount: 0, product_id: null }])
      } else {
        setLineItems(
          items.length > 0
            ? items.map(l => ({ ...l, key: crypto.randomUUID() }))
            : [{ key: crypto.randomUUID(), name: '', quantity: 1, rate: 0, amount: 0, product_id: null }]
        )
      }
      setCharges(doc.charges ?? [])
      setTaxes(doc.taxes ?? [])
      if ((doc.charges?.length ?? 0) > 0 || (doc.taxes?.length ?? 0) > 0 || Number(doc.discount) > 0) {
        setShowCharges(true)
      }
    }
  }, [doc?.id])

  // Loading state
  if (docLoading || !doc) {
    return (
      <div className="px-4 py-6 space-y-4">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  const docType        = doc.type
  const contacts       = contactsData?.results ?? []
  const products       = productsData?.results ?? []
  const allDocs        = allDocsData?.results  ?? []

  const isExpense      = docType === 'expense'
  const isInterest     = docType === 'interest'
  const isSimple       = isExpense || isInterest
  const isVoucher      = IS_VOUCHER.includes(docType as DocumentType)
  const hasLineItems   = WITH_LINE_ITEMS.includes(docType as DocumentType)
  const hasConsignee   = WITH_CONSIGNEE.includes(docType as DocumentType)

  // ── Select options ───────────────────────────────────────────────────────────
  const contactOptions: SearchableSelectOption[] = contacts.map(c => ({
    value:   String(c.id),
    label:   getContactDisplayName(c),
    sublabel: c.phone,
    badge:   c.gstin ? 'GST' : undefined,
  }))

  const consigneeOptions: SearchableSelectOption[] = [
    { value: '', label: 'None', sublabel: 'No consignee' },
    ...contacts.map(c => ({ value: String(c.id), label: getContactDisplayName(c), sublabel: c.phone })),
  ]

  const productOptions: SearchableSelectOption[] = [
    { value: '', label: 'Custom item', sublabel: 'Enter name manually' },
    ...products.map(p => ({
      value:   String(p.id),
      label:   p.name,
      sublabel: `Stock ${p.current_stock} ${p.unit}${p.hsn_code ? ` · HSN ${p.hsn_code}` : ''}`,
      meta:    p.rate,
    })),
  ]

  // ✅ Reference options — available for ALL doc types
  const referenceOptions: SearchableSelectOption[] = [
    { value: '', label: 'None', sublabel: 'No reference document' },
    ...allDocs
      .filter(d => d.id !== doc.id) // exclude self
      .map(d => ({
        value:    String(d.id),
        label:    `${getDocLabel(d.type)} #${d.doc_id}`,
        sublabel: `${fmtDate(d.date)}${d.contact_name ? ` · ${d.contact_name}` : ''}`,
      })),
  ]

  // ── Simple row handlers (expense / interest) ─────────────────────────────────
  const addSimpleRow = () =>
    setSimpleRows(p => [...p, { key: crypto.randomUUID(), name: '', amount: '', type: 'charge' }])

  const removeSimpleRow = (key: string) =>
    setSimpleRows(p => p.filter(r => r.key !== key))

  const updateSimpleRow = (key: string, field: 'name' | 'amount' | 'type', value: string) =>
    setSimpleRows(p => p.map(r => r.key !== key ? r : { ...r, [field]: value }))

  const simpleTotal = simpleRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  // ── Line item handlers (regular docs) ────────────────────────────────────────
  const handleProductPickerConfirm = (selected: any[]) => {
    const newItems: LineItemRow[] = selected.map(p => ({
      key:        crypto.randomUUID(),
      product_id: p.id,
      name:       p.name,
      quantity:   1,
      rate:       Number(p.rate),
      amount:     Number(p.rate),
      hsn:        p.hsn_code ?? undefined,
    }))
    setLineItems(prev => {
      const filtered = prev.filter(l => l.name.trim() !== '' || l.product_id != null)
      return [...filtered, ...newItems]
    })
  }

  const addLineItem    = () =>
    setLineItems(p => [...p, { key: crypto.randomUUID(), name: '', quantity: 1, rate: 0, amount: 0, product_id: null }])
  const removeLineItem = (key: string) => setLineItems(p => p.filter(l => l.key !== key))
  const updateLineItem = (key: string, field: keyof LineItemRow, value: string | number | null) =>
    setLineItems(p => p.map(l => {
      if (l.key !== key) return l
      const updated = { ...l, [field]: value }
      if (field === 'quantity' || field === 'rate') {
        updated.amount = (Number(updated.quantity) || 0) * (Number(updated.rate) || 0)
      }
      return updated
    }))

  const onProductSelect = (key: string, productId: string) => {
    if (!productId) { updateLineItem(key, 'product_id', null); return }
    const product = products.find(p => String(p.id) === productId)
    if (!product) return
    setLineItems(p => p.map(l => {
      if (l.key !== key) return l
      const qty = Number(l.quantity) || 1
      return {
        ...l,
        product_id: product.id,
        name:       product.name,
        rate:       Number(product.rate),
        amount:     qty * Number(product.rate),
        hsn:        product.hsn_code ?? undefined,
      }
    }))
  }

  // ── Totals ───────────────────────────────────────────────────────────────────
  const lineTotal    = lineItems.reduce((s, l) => s + (Number(l.amount) || 0), 0)
  const chargeTotal  = charges.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const discountAmt  = Number(discount) || 0
  const taxBase      = lineTotal + chargeTotal - discountAmt
  const taxTotal     = taxes.reduce((s, t) => s + (taxBase * (Number(t.percentage) || 0)) / 100, 0)
  const grandTotal   = lineTotal + chargeTotal - discountAmt + taxTotal

  // ── Charge / Tax handlers ────────────────────────────────────────────────────
  const addCharge    = () => setCharges(p => [...p, { name: '', amount: 0 }])
  const removeCharge = (i: number) => setCharges(p => p.filter((_, idx) => idx !== i))
  const updateCharge = (i: number, f: keyof Charge, v: string) =>
    setCharges(p => p.map((c, idx) => idx !== i ? c : { ...c, [f]: f === 'amount' ? Number(v) : v }))

  const addTax    = () => setTaxes(p => [...p, { name: '', percentage: 0 }])
  const removeTax = (i: number) => setTaxes(p => p.filter((_, idx) => idx !== i))
  const updateTax = (i: number, f: keyof Tax, v: string) =>
    setTaxes(p => p.map((t, idx) => idx !== i ? t : { ...t, [f]: f === 'percentage' ? Number(v) : v }))

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (CONTACT_REQUIRED.includes(docType as DocumentType) && !contactId) {
      toast.error('Select a contact'); return
    }

    const payload: DocumentUpdate = {
      contact:         contactId    ? Number(contactId)    : null,
      consignee:       consigneeId  ? Number(consigneeId)  : null,
      reference:       referenceId  ? Number(referenceId)  : null,  // ✅ always included
      date,
      due_date:        dueDate       || undefined,
      payment_terms:   paymentTerms  || undefined,
      notes:           notes         || undefined,
      discount:        discountAmt,
      attachment_urls: attachmentUrls,
    }

    if (isSimple) {
      // expense / interest
      const validRows = simpleRows.filter(r => r.name.trim() && Number(r.amount) > 0)
      if (validRows.length === 0) { toast.error('Add at least one entry with a name and amount'); return }
      payload.line_items    = validRows.map(r => ({ name: r.name, amount: Number(r.amount) }))
      payload.total_amount  = simpleTotal.toFixed(2)
    } else if (isVoucher) {
      if (!voucherAmount || Number(voucherAmount) <= 0) { toast.error('Enter amount'); return }
      payload.total_amount = voucherAmount
    } else if (hasLineItems) {
      const validItems = lineItems.filter(l => l.name.trim())
      if (validItems.length > 0) {
        payload.line_items = validItems.map(({ key, ...rest }) =>
          docType === 'challan'
            ? { name: rest.name, hsn: rest.hsn, quantity: rest.quantity, product_id: rest.product_id }
            : { name: rest.name, hsn: rest.hsn, quantity: rest.quantity, rate: rest.rate, amount: rest.amount, product_id: rest.product_id }
        )
        payload.charges      = charges.filter(c => c.name)
        payload.taxes        = taxes.filter(t => t.name)
        payload.total_amount = grandTotal.toFixed(2)
      } else if (fastAmountOverride && Number(fastAmountOverride) > 0) {
        payload.line_items   = []
        payload.total_amount = fastAmountOverride
      } else {
        toast.error('Add at least one line item or provide an amount'); return
      }
    }

    try {
      await updateDocument.mutateAsync(payload)
      toast.success('Document updated')
      router.back()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Failed to update document')
    }
  }

  // ── Shared render helpers ────────────────────────────────────────────────────
  const renderAttachments = () => (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
        Attachments
        <span className="text-xs text-muted-foreground font-normal ml-1">optional</span>
      </Label>
      <UploadInput
        value={attachmentUrls}
        onChange={setAttachmentUrls}
        context="document"
        maxFiles={10}
        onPreview={idx => { setPreviewIndex(idx); setPreviewOpen(true) }}
      />
    </div>
  )

  const renderNotes = () => (
    <div className="space-y-1.5">
      <Label>
        Notes
        <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span>
      </Label>
      <Input
        placeholder="Internal remarks..."
        value={notes}
        onChange={e => setNotes(e.target.value)}
        className="h-11 rounded-xl"
      />
    </div>
  )

  // ✅ Reference picker — shared, shown for ALL doc types
  const renderReference = () => (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
        Reference Document
        <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span>
      </Label>
      <SearchableSelect
        options={referenceOptions}
        value={referenceId}
        onChange={setReferenceId}
        placeholder="Link to another document"
        title="Select Reference Document"
        searchPlaceholder="Search by doc ID, type or contact..."
        clearable
      />
      {isSimple && referenceId && (
        <p className="text-[11px] text-muted-foreground px-1 flex items-center gap-1">
          <Info className="h-3 w-3 shrink-0" />
          Links this {isInterest ? 'interest' : 'expense'} to its source document
        </p>
      )}
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-4 pb-10 space-y-6">

      {/* Warning */}
      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <p className="font-medium leading-snug">
          Updating this document will automatically recalculate associated financial and stock ledgers.
        </p>
      </div>

      {/* Contact — always shown */}
      <div className="space-y-1.5">
        <Label>
          Contact
          {CONTACT_REQUIRED.includes(docType as DocumentType)
            ? <span className="text-destructive"> *</span>
            : <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span>
          }
        </Label>
        <SearchableSelect
          options={contactOptions}
          value={contactId}
          onChange={setContactId}
          placeholder="Select contact"
          title="Select Contact"
          searchPlaceholder="Search by name or phone..."
          clearable={!CONTACT_REQUIRED.includes(docType as DocumentType)}
          error={CONTACT_REQUIRED.includes(docType as DocumentType) && !contactId}
        />
      </div>

      {/* Date — always shown */}
      <div className="space-y-1.5">
        <Label>Date <span className="text-destructive">*</span></Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 rounded-xl" />
      </div>

      {/* ✅ Reference Document — shown for ALL types including interest/expense */}
      {renderReference()}

      <Separator />

      {/* ═══════════════════════════════════════════════════════════════════════
          INTEREST EDIT
      ═══════════════════════════════════════════════════════════════════════ */}
      {isInterest && (
        <div className="space-y-6">
          {/* Direction read-only info */}
          <div className="flex items-start gap-3 p-3 bg-muted/40 border rounded-xl text-sm">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-snug">
              Interest direction (<strong>We Pay / We Receive</strong>) cannot be changed after creation.
              Only entry names, amounts, notes, and attachments can be updated.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Interest Entries
              </Label>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs rounded-lg px-2.5 bg-muted/40"
                onClick={addSimpleRow}>
                <Plus className="h-3.5 w-3.5" /> Add Row
              </Button>
            </div>
            {simpleRows.map(row => (
              <div key={row.key} className="flex gap-2 items-center">
                <Input placeholder="e.g. Late fee, Processing charge..."
                  value={row.name} onChange={e => updateSimpleRow(row.key, 'name', e.target.value)}
                  className="flex-1 h-11 rounded-xl" />
                <Input type="number" placeholder="0.00"
                  value={row.amount} onChange={e => updateSimpleRow(row.key, 'amount', e.target.value)}
                  className="w-32 h-11 rounded-xl font-semibold" />
                {simpleRows.length > 1 && (
                  <button onClick={() => removeSimpleRow(row.key)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <div className="flex justify-between items-center px-3 py-2.5 bg-muted/40 rounded-xl border">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-lg font-black">{fmtAmount(simpleTotal)}</span>
            </div>
          </div>

          {renderAttachments()}
          {renderNotes()}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          EXPENSE EDIT
      ═══════════════════════════════════════════════════════════════════════ */}
      {isExpense && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Expense Entries
              </Label>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs rounded-lg px-2.5 bg-muted/40"
                onClick={addSimpleRow}>
                <Plus className="h-3.5 w-3.5" /> Add Row
              </Button>
            </div>
            {simpleRows.map(row => (
              <div key={row.key} className="flex gap-2 items-center">
                <Input placeholder="e.g. Rent, Electricity, Salary..."
                  value={row.name} onChange={e => updateSimpleRow(row.key, 'name', e.target.value)}
                  className="flex-1 h-11 rounded-xl" />
                <Input type="number" placeholder="0.00"
                  value={row.amount} onChange={e => updateSimpleRow(row.key, 'amount', e.target.value)}
                  className="w-32 h-11 rounded-xl font-semibold" />
                {simpleRows.length > 1 && (
                  <button onClick={() => removeSimpleRow(row.key)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <div className="flex justify-between items-center px-3 py-2.5 bg-muted/40 rounded-xl border">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-lg font-black">{fmtAmount(simpleTotal)}</span>
            </div>
          </div>

          {renderAttachments()}
          {renderNotes()}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          VOUCHER EDIT
      ═══════════════════════════════════════════════════════════════════════ */}
      {isVoucher && (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label>Amount <span className="text-destructive">*</span></Label>
            <Input type="number" placeholder="0.00"
              className="text-2xl font-bold h-14 rounded-xl px-4"
              value={voucherAmount} onChange={e => setVoucherAmount(e.target.value)} />
          </div>
          {renderAttachments()}
          {renderNotes()}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          REGULAR DOC EDIT — bill, invoice, po, pi, cn, dn, challan, quotation
      ═══════════════════════════════════════════════════════════════════════ */}
      {!isSimple && !isVoucher && (
        <div className="space-y-6">

          {/* Consignee */}
          {hasConsignee && (
            <div className="space-y-1.5">
              <Label>
                Consignee
                <span className="text-xs text-muted-foreground ml-1">optional</span>
              </Label>
              <SearchableSelect
                options={consigneeOptions}
                value={consigneeId}
                onChange={setConsigneeId}
                placeholder="Select consignee"
                title="Select Consignee"
                searchPlaceholder="Search contacts..."
                clearable
              />
            </div>
          )}

          {/* Due date + Payment terms */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Due Date <span className="text-xs text-muted-foreground font-normal">opt</span></Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Terms <span className="text-xs text-muted-foreground font-normal">opt</span></Label>
              <Input placeholder="e.g. Net 30" value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)} className="h-11 rounded-xl" />
            </div>
          </div>

          {/* Fast-mode total (only when no line items yet) */}
          {hasLineItems && lineItems.filter(l => l.name.trim().length > 0).length === 0 && Number(fastAmountOverride) > 0 && (
            <div className="space-y-1.5 bg-primary/5 border border-primary/10 p-4 rounded-xl">
              <Label className="text-primary font-semibold">Total Amount (Fast Mode)</Label>
              <Input type="number" placeholder="0.00"
                className="text-3xl h-16 font-black rounded-xl border-primary/20 bg-background mt-1 tracking-tight"
                value={fastAmountOverride} onChange={e => setFastAmountOverride(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-2">
                Add line items below to convert to a detailed document with inventory tracking.
              </p>
            </div>
          )}

          {/* Line Items */}
          {hasLineItems && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Line Items
                </Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm"
                    className="h-8 gap-1.5 text-xs rounded-lg px-2.5 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => setProductPickerOpen(true)}>
                    <Package className="h-3.5 w-3.5" /> Bulk Add
                  </Button>
                  <Button variant="ghost" size="sm"
                    className="h-8 gap-1.5 text-xs rounded-lg px-2.5 bg-muted/40"
                    onClick={addLineItem}>
                    <Plus className="h-3.5 w-3.5" /> Empty Row
                  </Button>
                </div>
              </div>

              {lineItems.map((item, idx) => (
                <Card key={item.key}
                  className="overflow-hidden rounded-xl border border-border/80 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                        #{idx + 1}
                      </span>
                      {lineItems.length > 1 && (
                        <button onClick={() => removeLineItem(item.key)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Product link */}
                    {products.length > 0 && (
                      <SearchableSelect
                        options={productOptions}
                        value={item.product_id ? String(item.product_id) : ''}
                        onChange={v => onProductSelect(item.key, v)}
                        placeholder="Link to inventory product (optional)"
                        title="Select Product"
                        searchPlaceholder="Search by name or HSN..."
                        clearable
                      />
                    )}

                    {/* Name */}
                    <Input placeholder="Item name / description"
                      value={item.name} onChange={e => updateLineItem(item.key, 'name', e.target.value)}
                      className="h-10 bg-muted/20" />

                    {/* HSN */}
                    <Input placeholder="HSN Code (optional)"
                      value={item.hsn ?? ''} onChange={e => updateLineItem(item.key, 'hsn', e.target.value || null)}
                      className="h-9 bg-muted/20 text-sm font-mono tracking-wider" />

                    {/* Qty / Rate / Amount */}
                    {docType !== 'challan' && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Qty</p>
                          <Input type="number" className="h-10 font-medium"
                            value={item.quantity}
                            onChange={e => updateLineItem(item.key, 'quantity', Number(e.target.value))} />
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Rate ₹</p>
                          <Input type="number" className="h-10 font-medium"
                            value={item.rate}
                            onChange={e => updateLineItem(item.key, 'rate', Number(e.target.value))} />
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Amount ₹</p>
                          <Input type="number" className="h-10 font-bold"
                            value={item.amount}
                            onChange={e => updateLineItem(item.key, 'amount', Number(e.target.value))} />
                        </div>
                      </div>
                    )}
                    {docType === 'challan' && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Qty</p>
                        <Input type="number" className="h-10 font-medium"
                          value={item.quantity}
                          onChange={e => updateLineItem(item.key, 'quantity', Number(e.target.value))} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Charges / Discount / Taxes toggle */}
              <button onClick={() => setShowCharges(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-dashed text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                <span className="flex items-center gap-2">
                  {showCharges ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  Charges, Discount & Taxes
                </span>
                {showCharges && (charges.length > 0 || taxes.length > 0 || discountAmt > 0) && (
                  <span className="text-primary font-bold">
                    {charges.length + taxes.length} item{(charges.length + taxes.length) !== 1 ? 's' : ''}
                  </span>
                )}
              </button>

              {showCharges && (
                <div className="space-y-4 p-4 rounded-xl bg-muted/20 border">
                  {/* Charges */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                        Charges
                      </Label>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 rounded-lg" onClick={addCharge}>
                        <Plus className="h-3 w-3" /> Add
                      </Button>
                    </div>
                    {charges.map((c, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input placeholder="Charge name" value={c.name}
                          onChange={e => updateCharge(i, 'name', e.target.value)}
                          className="flex-1 h-10 rounded-lg" />
                        <Input type="number" placeholder="₹" value={c.amount}
                          onChange={e => updateCharge(i, 'amount', e.target.value)}
                          className="w-24 h-10 font-bold rounded-lg" />
                        <button onClick={() => removeCharge(i)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Discount */}
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                      Discount (₹)
                    </Label>
                    <Input type="number" placeholder="0.00" value={discount}
                      onChange={e => setDiscount(e.target.value)}
                      className="h-10 rounded-lg font-semibold" />
                  </div>

                  {/* Taxes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                        Taxes
                      </Label>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 rounded-lg" onClick={addTax}>
                        <Plus className="h-3 w-3" /> Add
                      </Button>
                    </div>
                    {taxes.map((t, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input placeholder="Tax name (e.g. GST)" value={t.name}
                          onChange={e => updateTax(i, 'name', e.target.value)}
                          className="flex-1 h-10 rounded-lg" />
                        <Input type="number" placeholder="%" value={t.percentage}
                          onChange={e => updateTax(i, 'percentage', e.target.value)}
                          className="w-20 h-10 font-bold rounded-lg" />
                        <button onClick={() => removeTax(i)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Grand total preview */}
                  <div className="space-y-1.5 pt-2 border-t">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span><span>{fmtAmount(lineTotal)}</span>
                    </div>
                    {chargeTotal > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Charges</span><span>+{fmtAmount(chargeTotal)}</span>
                      </div>
                    )}
                    {discountAmt > 0 && (
                      <div className="flex justify-between text-xs text-emerald-600">
                        <span>Discount</span><span>−{fmtAmount(discountAmt)}</span>
                      </div>
                    )}
                    {taxTotal > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Tax</span><span>+{fmtAmount(taxTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-sm pt-1 border-t">
                      <span>Grand Total</span><span>{fmtAmount(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {renderAttachments()}
          {renderNotes()}
        </div>
      )}

      {/* Submit */}
      <div className="pt-4 pb-8 flex gap-3">
        <Button variant="outline" className="flex-1 h-14 rounded-2xl" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button className="flex-1 h-14 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20"
          onClick={handleSubmit} disabled={updateDocument.isPending}>
          {updateDocument.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Product multi-picker */}
      <ProductMultiPickerSheet
        open={productPickerOpen}
        products={products}
        onConfirm={handleProductPickerConfirm}
        onClose={() => setProductPickerOpen(false)}
      />

      {/* Attachment preview */}
      <FilePreviewSheet
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        files={attachmentUrls}
        initialIndex={previewIndex}
        onRemove={path => {
          setAttachmentUrls(prev => prev.filter(p => p !== path))
          if (previewIndex >= attachmentUrls.length - 1) setPreviewIndex(0)
        }}
      />
    </div>
  )
}
