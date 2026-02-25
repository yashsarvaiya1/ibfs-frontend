// components/documents/DocumentNewPage.tsx
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
  LineItem, Charge, Tax
} from '@/models/document'
import { getContactDisplayName } from '@/models/contact'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from '@/components/ui/sheet'
import { toast } from 'sonner'
import {
  X, Plus, ChevronDown, ChevronUp, FileText
} from 'lucide-react'
import { fmtAmount } from '@/lib/utils'
import {
  SearchableSelect,
  type SearchableSelectOption
} from '@/components/shared/SearchableSelect'

// ─── Safe label lookup ────────────────────────────────────────────────────────
const DOC_LABELS = DOC_TYPE_LABELS as Record<string, string>
const getDocLabel = (t: string | null | undefined) => t ? (DOC_LABELS[t] ?? t) : ''

// ─── Constants ────────────────────────────────────────────────────────────────
const WITH_LINE_ITEMS: DocumentType[] = [
  'bill', 'invoice', 'po', 'pi', 'quotation', 'challan', 'cn', 'dn'
]
const WITH_REFERENCE: DocumentType[] = [
  'po', 'pi', 'quotation', 'cn', 'dn', 'challan'
]
const WITH_CONSIGNEE: DocumentType[] = ['challan','invoice']
const WITH_PAYMENT:   DocumentType[] = ['bill', 'invoice', 'cn', 'dn']
const IS_VOUCHER:     DocumentType[] = [
  'cash_payment_voucher', 'cash_receipt_voucher'
]

const REF_DOC_TYPE: Partial<Record<DocumentType, DocumentType>> = {
  cn: 'invoice',
  dn: 'bill',
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

function LineItemPickerSheet({
  open, items, onConfirm, onClose
}: LineItemPickerProps) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(items.map((_, i) => i))
  )

  // Reset when items change
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
      prev.size === items.length
        ? new Set()
        : new Set(items.map((_, i) => i))
    )

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pb-10"
        style={{ maxHeight: '80vh' }}
      >
        <SheetHeader className="mb-3">
          <SheetTitle className="text-left">Copy Items from Reference</SheetTitle>
        </SheetHeader>

        {/* Select all toggle */}
        <div
          onClick={toggleAll}
          className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-muted/40 cursor-pointer"
        >
          <Checkbox
            checked={selected.size === items.length}
            onCheckedChange={toggleAll}
            onClick={e => e.stopPropagation()}
          />
          <span className="text-sm text-muted-foreground">
            {selected.size === items.length ? 'Deselect all' : 'Select all'}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {selected.size} / {items.length}
          </span>
        </div>

        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 200px)' }}>
          {items.map((item, i) => (
            <div
              key={i}
              onClick={() => toggle(i)}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                selected.has(i)
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background hover:bg-muted/40'
              }`}
            >
              <Checkbox
                checked={selected.has(i)}
                onCheckedChange={() => toggle(i)}
                onClick={e => e.stopPropagation()}
              />
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
                <p className="text-sm font-semibold shrink-0">
                  {fmtAmount(item.amount)}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={selected.size === 0}
            onClick={() => {
              onConfirm(items.filter((_, i) => selected.has(i)))
              onClose()
            }}
          >
            Copy {selected.size} Item{selected.size !== 1 ? 's' : ''}
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

  useEffect(() => {
    setPageTitle(`New ${getDocLabel(docType)}`)
  }, [docType, setPageTitle])

  const { data: settings }     = useSettings()
  const { data: contactsData } = useContacts({ is_active: true })
  const { data: productsData } = useProducts({ is_active: true })
  const { data: accountsData } = useAccounts({ is_active: true })

  const refDocType = REF_DOC_TYPE[docType]
  const { data: referenceDocs } = useDocuments(
    WITH_REFERENCE.includes(docType)
      ? (refDocType ? { type: refDocType } : {})
      : undefined
  )

  const createDocument = useCreateDocument()

  // ── Form state ──────────────────────────────────────────────────────────────
  const [contactId,        setContactId]       = useState(preContactId)
  const [consigneeId,      setConsigneeId]      = useState('')
  const [referenceId,      setReferenceId]      = useState('')
  const [date,             setDate]             = useState(
    new Date().toISOString().split('T')[0]
  )
  const [dueDate,          setDueDate]          = useState('')
  const [paymentTerms,     setPaymentTerms]     = useState('')
  const [notes,            setNotes]            = useState('')
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [discount,         setDiscount]         = useState('')
  const [voucherAmount,    setVoucherAmount]    = useState('')
  const [showCharges,      setShowCharges]      = useState(false)
  const [pickerOpen,       setPickerOpen]       = useState(false)

  const [lineItems, setLineItems] = useState<LineItemRow[]>([{
    _key: crypto.randomUUID(),
    name: '', quantity: 1, rate: 0, amount: 0, product_id: null,
  }])
  const [charges, setCharges] = useState<Charge[]>([])
  const [taxes,   setTaxes]   = useState<Tax[]>([])

  const contacts = contactsData?.results ?? []
  const products = productsData?.results ?? []
  const accounts = accountsData?.results ?? []
  const refDocs  = referenceDocs?.results ?? []

  // Fetch ref doc details when one is selected
  const { data: refDoc } = useDocument(
    referenceId ? Number(referenceId) : (null as unknown as number)
  )

  // ── Computed flags ──────────────────────────────────────────────────────────
  const isVoucher          = IS_VOUCHER.includes(docType)
  const hasLineItems       = WITH_LINE_ITEMS.includes(docType)
  const hasReference       = WITH_REFERENCE.includes(docType)
  const hasConsignee       = WITH_CONSIGNEE.includes(docType)
  const showPaymentAccount = WITH_PAYMENT.includes(docType) && !!settings?.auto_transaction

  // ── Build SearchableSelect options ─────────────────────────────────────────
  const contactOptions: SearchableSelectOption[] = contacts.map(c => ({
    value:    String(c.id),
    label:    getContactDisplayName(c),
    sublabel: c.phone,
    badge:    c.gstin ? 'GST' : undefined,
  }))

  const consigneeOptions: SearchableSelectOption[] = [
    { value: '', label: 'None', sublabel: 'No consignee' },
    ...contacts.map(c => ({
      value:    String(c.id),
      label:    getContactDisplayName(c),
      sublabel: c.phone,
    })),
  ]

  const refDocOptions: SearchableSelectOption[] = [
    { value: '', label: 'None', sublabel: 'No reference document' },
    ...refDocs.map(d => ({
      value:    String(d.id),
      label:    `#${d.doc_id}`,
      sublabel: d.date,
      badge:    getDocLabel(d.type),
      meta:     d.total_amount ? fmtAmount(d.total_amount) : undefined,
    })),
  ]

  const accountOptions: SearchableSelectOption[] = [
    { value: '', label: 'None', sublabel: 'Record only — pay later' },
    ...accounts.map(a => ({
      value:    String(a.id),
      label:    a.name,
      sublabel: `${a.type} · ${fmtAmount(a.current_balance)}`,
    })),
  ]

  const productOptions: SearchableSelectOption[] = [
    { value: '', label: 'Custom item', sublabel: 'Enter name manually' },
    ...products.map(p => ({
      value:    String(p.id),
      label:    p.name,
      sublabel: `Stock: ${p.current_stock} ${p.unit}${p.hsn_code ? ` · HSN: ${p.hsn_code}` : ''}`,
      meta:     `₹${p.rate}`,
    })),
  ]

  // ── Auto-fill when reference doc is picked ─────────────────────────────────
  useEffect(() => {
    if (!refDoc) return
    // Auto-set contact from ref doc
    if (refDoc.contact) setContactId(String(refDoc.contact))
    // Open picker if ref doc has items
    if ((refDoc.line_items?.length ?? 0) > 0) setPickerOpen(true)
  }, [refDoc])

  // ── Line item picker confirm ────────────────────────────────────────────────
  const handlePickerConfirm = (selected: LineItem[]) => {
    if (selected.length === 0) return
    setLineItems(selected.map(item => ({
      ...item,
      _key: crypto.randomUUID(),
    })))
  }

  // ── Line item helpers ───────────────────────────────────────────────────────
  const addLineItem = () =>
    setLineItems(p => [...p, {
      _key: crypto.randomUUID(),
      name: '', quantity: 1, rate: 0, amount: 0, product_id: null,
    }])

  const removeLineItem = (key: string) =>
    setLineItems(p => p.filter(l => l._key !== key))

  const updateLineItem = (
    key: string,
    field: keyof LineItemRow,
    value: string | number | null
  ) => {
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
    if (!productId) {
      updateLineItem(key, 'product_id', null)
      return
    }
    const product = products.find(p => String(p.id) === productId)
    if (!product) return
    setLineItems(p => p.map(l => {
      if (l._key !== key) return l
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

  // ── Totals ──────────────────────────────────────────────────────────────────
  const lineTotal   = lineItems.reduce((s, l) => s + (Number(l.amount) || 0), 0)
  const chargeTotal = charges.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const discountAmt = Number(discount) || 0
  const taxBase     = lineTotal + chargeTotal - discountAmt
  const taxTotal    = taxes.reduce(
    (s, t) => s + (taxBase * (Number(t.percentage) || 0)) / 100, 0
  )
  const grandTotal  = lineTotal + chargeTotal - discountAmt + taxTotal

  // ── Charges/taxes helpers ───────────────────────────────────────────────────
  const addCharge    = () => setCharges(p => [...p, { name: '', amount: 0 }])
  const removeCharge = (i: number) => setCharges(p => p.filter((_, idx) => idx !== i))
  const updateCharge = (i: number, f: keyof Charge, v: string) =>
    setCharges(p => p.map((c, idx) =>
      idx === i ? { ...c, [f]: f === 'amount' ? Number(v) : v } : c))

  const addTax    = () => setTaxes(p => [...p, { name: '', percentage: 0 }])
  const removeTax = (i: number) => setTaxes(p => p.filter((_, idx) => idx !== i))
  const updateTax = (i: number, f: keyof Tax, v: string) =>
    setTaxes(p => p.map((t, idx) =>
      idx === i ? { ...t, [f]: f === 'percentage' ? Number(v) : v } : t))

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!contactId) { toast.error('Select a contact'); return }

    const payload: any = {
      type:          docType,
      contact:       Number(contactId),
      date,
      due_date:      dueDate      || undefined,
      payment_terms: paymentTerms || undefined,
      notes:         notes        || undefined,
      reference:     referenceId  ? Number(referenceId) : undefined,
      consignee:     consigneeId  ? Number(consigneeId) : undefined,
      discount:      discountAmt,
    }

    if (isVoucher) {
      if (!voucherAmount) { toast.error('Enter amount'); return }
      payload.total_amount = voucherAmount
    } else if (hasLineItems) {
      const validItems = lineItems.filter(l => l.name.trim())
      if (validItems.length === 0) {
        toast.error('Add at least one line item'); return
      }
      payload.line_items   = validItems.map(({ _key, ...rest }) => rest)
      payload.charges      = charges.filter(c => c.name)
      payload.taxes        = taxes.filter(t => t.name)
      payload.total_amount = grandTotal.toFixed(2)
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-4 pb-10 space-y-5">

      {/* ── Contact ─────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label>Contact <span className="text-destructive">*</span></Label>
        <SearchableSelect
          options={contactOptions}
          value={contactId}
          onChange={setContactId}
          placeholder="Select contact"
          title="Select Contact"
          searchPlaceholder="Search by name or phone..."
          emptyText="No contacts found"
          error={!contactId}
        />
      </div>

      {/* ── Consignee ───────────────────────────────────────────────────── */}
      {hasConsignee && (
        <div className="space-y-1.5">
          <Label>
            Consignee
            <span className="text-xs text-muted-foreground ml-1">(optional)</span>
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

      {/* ── Reference document ──────────────────────────────────────────── */}
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
            options={refDocOptions}
            value={referenceId}
            onChange={setReferenceId}
            placeholder="Link to existing document"
            title={`Select ${refDocType ? getDocLabel(refDocType) : 'Reference Document'}`}
            searchPlaceholder="Search by doc ID or date..."
            clearable
            emptyText={`No ${refDocType ? getDocLabel(refDocType) : 'documents'} found`}
          />

          {/* Selected ref doc preview */}
          {refDoc && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border text-xs">
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium">{getDocLabel(refDoc.type)} #{refDoc.doc_id}</span>
                {refDoc.total_amount && (
                  <span className="text-muted-foreground"> · {fmtAmount(refDoc.total_amount)}</span>
                )}
                {(refDoc.line_items?.length ?? 0) > 0 && (
                  <span className="text-muted-foreground">
                    {' '}· {refDoc.line_items!.length} items
                  </span>
                )}
              </div>
              {(refDoc.line_items?.length ?? 0) > 0 && (
                <button
                  className="text-primary font-medium shrink-0 text-xs"
                  onClick={() => setPickerOpen(true)}
                >
                  Re-pick
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Dates ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Date <span className="text-destructive">*</span></Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Due Date <span className="text-xs text-muted-foreground">(opt)</span></Label>
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>
          Payment Terms
          <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <Input
          placeholder="e.g. Net 30"
          value={paymentTerms}
          onChange={e => setPaymentTerms(e.target.value)}
        />
      </div>

      <Separator />

      {/* ── Voucher mode ─────────────────────────────────────────────────── */}
      {isVoucher && (
        <div className="space-y-1.5">
          <Label>Amount <span className="text-destructive">*</span></Label>
          <Input
            type="number" placeholder="0.00"
            className="text-lg h-12"
            value={voucherAmount}
            onChange={e => setVoucherAmount(e.target.value)}
          />
        </div>
      )}

      {/* ── Line items ───────────────────────────────────────────────────── */}
      {hasLineItems && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Line Items</Label>
            <Button variant="ghost" size="sm" className="gap-1 h-7" onClick={addLineItem}>
              <Plus className="h-3.5 w-3.5" /> Add Item
            </Button>
          </div>

          {lineItems.map((item) => (
            <Card key={item._key} className="overflow-hidden">
              <CardContent className="p-3 space-y-2">

                {/* Product selector — SearchableSelect */}
                {products.length > 0 && (
                  <SearchableSelect
                    options={productOptions}
                    value={item.product_id ? String(item.product_id) : ''}
                    onChange={v => onProductSelect(item._key, v)}
                    placeholder="Pick a product (optional)"
                    title="Select Product"
                    searchPlaceholder="Search by name or HSN..."
                    clearable
                  />
                )}

                {/* Name */}
                <Input
                  placeholder="Item name"
                  value={item.name}
                  onChange={e => updateLineItem(item._key, 'name', e.target.value)}
                />

                {/* Qty / Rate / Amount */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Qty</p>
                    <Input
                      type="number" className="h-8 text-sm"
                      value={item.quantity}
                      onChange={e =>
                        updateLineItem(item._key, 'quantity', Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Rate (₹)</p>
                    <Input
                      type="number" className="h-8 text-sm"
                      value={item.rate}
                      onChange={e =>
                        updateLineItem(item._key, 'rate', Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Amount</p>
                    <Input
                      type="number" className="h-8 text-sm bg-muted"
                      readOnly value={item.amount}
                    />
                  </div>
                </div>

                {lineItems.length > 1 && (
                  <button
                    onClick={() => removeLineItem(item._key)}
                    className="flex items-center gap-1 text-xs text-destructive mt-1"
                  >
                    <X className="h-3 w-3" /> Remove item
                  </button>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Charges / Discount / Taxes toggle */}
          <button
            className="flex items-center gap-2 text-sm text-muted-foreground w-full py-2"
            onClick={() => setShowCharges(v => !v)}
          >
            {showCharges
              ? <ChevronUp className="h-4 w-4" />
              : <ChevronDown className="h-4 w-4" />}
            Charges, Discount &amp; Taxes
          </button>

          {showCharges && (
            <div className="space-y-4 pl-1">
              {/* Discount */}
              <div className="space-y-1.5">
                <Label>Discount (₹)</Label>
                <Input
                  type="number" placeholder="0.00"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                />
              </div>

              {/* Charges */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Additional Charges</Label>
                  <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={addCharge}>
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
                {charges.map((c, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="e.g. Freight" className="flex-1"
                      value={c.name}
                      onChange={e => updateCharge(i, 'name', e.target.value)}
                    />
                    <Input
                      type="number" placeholder="₹" className="w-24"
                      value={c.amount || ''}
                      onChange={e => updateCharge(i, 'amount', e.target.value)}
                    />
                    <button onClick={() => removeCharge(i)}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Taxes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Taxes</Label>
                  <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={addTax}>
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
                {taxes.map((t, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="e.g. GST 18%" className="flex-1"
                      value={t.name}
                      onChange={e => updateTax(i, 'name', e.target.value)}
                    />
                    <Input
                      type="number" placeholder="%" className="w-20"
                      value={t.percentage || ''}
                      onChange={e => updateTax(i, 'percentage', e.target.value)}
                    />
                    <button onClick={() => removeTax(i)}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total summary card */}
          <Card className="bg-muted/40">
            <CardContent className="p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>{fmtAmount(lineTotal)}</span>
              </div>
              {chargeTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Charges</span><span>+{fmtAmount(chargeTotal)}</span>
                </div>
              )}
              {discountAmt > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span><span>−{fmtAmount(discountAmt)}</span>
                </div>
              )}
              {taxTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span><span>+{fmtAmount(taxTotal)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span><span>{fmtAmount(grandTotal)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Payment account ──────────────────────────────────────────────── */}
      {showPaymentAccount && (
        <div className="space-y-1.5">
          <Label>
            Payment Account
            <span className="text-xs text-muted-foreground ml-1">
              (auto-transaction — leave empty to pay later)
            </span>
          </Label>
          <SearchableSelect
            options={accountOptions}
            value={paymentAccountId}
            onChange={setPaymentAccountId}
            placeholder="Select account (optional)"
            title="Select Payment Account"
            searchPlaceholder="Search accounts..."
            clearable
          />
        </div>
      )}

      {/* ── Notes ────────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label>
          Notes
          <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <Input
          placeholder="Internal notes..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      <Button
        className="w-full h-12 text-base"
        onClick={handleSubmit}
        disabled={createDocument.isPending}
      >
        {createDocument.isPending
          ? 'Creating...'
          : `Create ${getDocLabel(docType)}`}
      </Button>

      {/* ── Line item picker ─────────────────────────────────────────────── */}
      {(refDoc?.line_items?.length ?? 0) > 0 && (
        <LineItemPickerSheet
          open={pickerOpen}
          items={refDoc!.line_items!}
          onConfirm={handlePickerConfirm}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
