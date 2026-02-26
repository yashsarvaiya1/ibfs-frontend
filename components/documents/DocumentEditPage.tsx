// components/documents/DocumentEditPage.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useDocument, useUpdateDocument } from '@/hooks/useDocument'
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { X, Plus, ChevronDown, ChevronUp, FileText, Package, Link as LinkIcon, AlertCircle } from 'lucide-react'
import { fmtAmount } from '@/lib/utils'
import { SearchableSelect, type SearchableSelectOption } from '@/components/shared/SearchableSelect'
import { Skeleton } from '@/components/ui/skeleton'

const DOC_LABELS = DOC_TYPE_LABELS as Record<string, string>
const getDocLabel = (t: string | null | undefined) => t ? (DOC_LABELS[t] ?? t) : ''

const WITH_LINE_ITEMS: DocumentType[] = ['bill', 'invoice', 'po', 'pi', 'quotation', 'challan', 'cn', 'dn']
const WITH_REFERENCE: DocumentType[] = ['po', 'pi', 'quotation', 'cn', 'dn', 'challan', 'bill', 'invoice']
const WITH_CONSIGNEE: DocumentType[] = ['challan', 'invoice', 'bill']

interface LineItemRow extends LineItem { _key: string }

// Reuse Product Multi Picker
function ProductMultiPickerSheet({ open, products, onConfirm, onClose }: {
  open: boolean, products: any[], onConfirm: (s: any[]) => void, onClose: () => void
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
        <Input placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} className="mb-3 h-11 rounded-xl" />
        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10 bg-muted/30 rounded-xl border border-dashed">No products found</p>
          ) : (
            filtered.map(p => (
              <div key={p.id} onClick={() => toggle(p.id)} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selected.has(p.id) ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/40'}`}>
                <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} onClick={e => e.stopPropagation()} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Stock: {p.current_stock} {p.unit} · ₹{p.rate}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-3 mt-4 pt-2 border-t border-border/50">
          <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 h-12 rounded-xl" disabled={selected.size === 0} onClick={() => { onConfirm(products.filter(p => selected.has(p.id))); onClose() }}>
            Add {selected.size} Item{selected.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function DocumentEditPage({ id }: { id: number }) {
  const router       = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)

  const { data: doc, isLoading: docLoading } = useDocument(id)
  const updateDocument = useUpdateDocument(id)

  const { data: settings }     = useSettings()
  const { data: contactsData } = useContacts({ is_active: true })
  const { data: productsData } = useProducts({ is_active: true })
  const { data: accountsData } = useAccounts({ is_active: true })

  // ── Form state ──────────────────────────────────────────────────────────────
  const [contactId,        setContactId]        = useState('')
  const [consigneeId,      setConsigneeId]      = useState('')
  const [referenceId,      setReferenceId]      = useState('')
  const [date,             setDate]             = useState('')
  const [dueDate,          setDueDate]          = useState('')
  const [paymentTerms,     setPaymentTerms]     = useState('')
  const [notes,            setNotes]            = useState('')
  const [discount,         setDiscount]         = useState('')
  const [attachmentUrls,   setAttachmentUrls]   = useState<string[]>([])
  const [currentLink,      setCurrentLink]      = useState('')
  
  // Track fast amount for fallback
  const [fastAmountOverride, setFastAmountOverride] = useState('')

  const [showCharges,       setShowCharges]       = useState(false)
  const [productPickerOpen, setProductPickerOpen] = useState(false)

  const [lineItems, setLineItems] = useState<LineItemRow[]>([])
  const [charges, setCharges] = useState<Charge[]>([])
  const [taxes,   setTaxes]   = useState<Tax[]>([])

  // ── Populate state when doc loads ──────────────────────────────────────────
  useEffect(() => {
    if (!doc) return
    setPageTitle(`Edit ${getDocLabel(doc.type)} #${doc.doc_id}`)

    setContactId(doc.contact ? String(doc.contact) : '')
    setConsigneeId(doc.consignee ? String(doc.consignee) : '')
    setReferenceId(doc.reference ? String(doc.reference) : '')
    setDate(doc.date)
    setDueDate(doc.due_date || '')
    setPaymentTerms(doc.payment_terms || '')
    setNotes(doc.notes || '')
    setDiscount(doc.discount ? String(doc.discount) : '')
    setAttachmentUrls(doc.attachment_urls || [])
    
    // Check if it was previously a Fast Mode document without line items
    if (doc.line_items.length === 0 && Number(doc.total_amount) > 0) {
        setFastAmountOverride(String(doc.total_amount))
        setLineItems([{ _key: crypto.randomUUID(), name: '', quantity: 1, rate: 0, amount: 0, product_id: null }])
    } else {
        setLineItems(doc.line_items.length > 0 
            ? doc.line_items.map(l => ({ ...l, _key: crypto.randomUUID() })) 
            : [{ _key: crypto.randomUUID(), name: '', quantity: 1, rate: 0, amount: 0, product_id: null }]
        )
    }

    setCharges(doc.charges || [])
    setTaxes(doc.taxes || [])

    if ((doc.charges?.length ?? 0) > 0 || (doc.taxes?.length ?? 0) > 0 || Number(doc.discount) > 0) {
      setShowCharges(true)
    }
  }, [doc, setPageTitle])

  if (docLoading || !doc) {
    return (
      <div className="px-4 py-6 space-y-4">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl mt-4" />
        <Skeleton className="h-32 w-full rounded-xl mt-4" />
      </div>
    )
  }

  const docType = doc.type
  const contacts = contactsData?.results ?? []
  const products = productsData?.results ?? []

  const hasLineItems = WITH_LINE_ITEMS.includes(docType)
  const hasConsignee = WITH_CONSIGNEE.includes(docType)

  // ── SearchableSelect options ────────────────────────────────────────────────
  const contactOptions: SearchableSelectOption[] = contacts.map(c => ({
    value: String(c.id), label: getContactDisplayName(c),
    sublabel: c.phone, badge: c.gstin ? 'GST' : undefined,
  }))

  const consigneeOptions: SearchableSelectOption[] = [
    { value: '', label: 'None', sublabel: 'No consignee' },
    ...contacts.map(c => ({ value: String(c.id), label: getContactDisplayName(c), sublabel: c.phone })),
  ]

  const productOptions: SearchableSelectOption[] = [
    { value: '', label: 'Custom item', sublabel: 'Enter name manually' },
    ...products.map(p => ({
      value: String(p.id), label: p.name,
      sublabel: `Stock: ${p.current_stock} ${p.unit}${p.hsn_code ? ` · HSN: ${p.hsn_code}` : ''}`,
      meta: `₹${p.rate}`,
    })),
  ]

  // Attachments Handlers
  const handleAddAttachment = () => {
    if (currentLink.trim() === '') return
    setAttachmentUrls(prev => [...prev, currentLink.trim()])
    setCurrentLink('')
  }
  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachmentUrls(prev => prev.filter((_, index) => index !== indexToRemove))
  }

  // ── Line item helpers ────────────────────────────────────────────────────────
  const handleProductPickerConfirm = (selected: any[]) => {
    if (selected.length === 0) return
    const newItems = selected.map(p => ({
      _key: crypto.randomUUID(), product_id: p.id,
      name: p.name, quantity: 1, rate: Number(p.rate), amount: Number(p.rate),
      hsn: p.hsn_code ?? undefined,
    }))
    setLineItems(prev => {
      const filtered = prev.filter(l => l.name.trim() !== '' || l.product_id !== null)
      return [...filtered, ...newItems]
    })
  }

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

  // ── Totals ───────────────────────────────────────────────────────────────────
  const lineTotal   = lineItems.reduce((s, l) => s + (Number(l.amount) || 0), 0)
  const chargeTotal = charges.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const discountAmt = Number(discount) || 0
  const taxBase     = lineTotal + chargeTotal - discountAmt
  const taxTotal    = taxes.reduce((s, t) => s + (taxBase * (Number(t.percentage) || 0)) / 100, 0)
  const grandTotal  = lineTotal + chargeTotal - discountAmt + taxTotal

  // ── Charge/Tax helpers ───────────────────────────────────────────────────────
  const addCharge    = () => setCharges(p => [...p, { name: '', amount: 0 }])
  const removeCharge = (i: number) => setCharges(p => p.filter((_, idx) => idx !== i))
  const updateCharge = (i: number, f: keyof Charge, v: string) => setCharges(p => p.map((c, idx) => idx === i ? { ...c, [f]: f === 'amount' ? Number(v) : v } : c))

  const addTax    = () => setTaxes(p => [...p, { name: '', percentage: 0 }])
  const removeTax = (i: number) => setTaxes(p => p.filter((_, idx) => idx !== i))
  const updateTax = (i: number, f: keyof Tax, v: string) => setTaxes(p => p.map((t, idx) => idx === i ? { ...t, [f]: f === 'percentage' ? Number(v) : v } : t))

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!contactId) { toast.error('Select a contact'); return }

    const payload: Partial<DocumentCreate> = {
      contact:       Number(contactId),
      date,
      due_date:      dueDate      || undefined,
      payment_terms: paymentTerms || undefined,
      notes:         notes        || undefined,
      reference:     referenceId  ? Number(referenceId) : undefined,
      consignee:     consigneeId  ? Number(consigneeId) : undefined,
      discount:      discountAmt,
      attachment_urls: attachmentUrls,
    }

    if (hasLineItems) {
      const validItems = lineItems.filter(l => l.name.trim())
      
      // Converting Fast -> Detailed if they added items
      if (validItems.length > 0) {
        payload.line_items = validItems.map(({ _key, rate, amount, ...rest }) =>
          docType === 'challan' ? rest : { ...rest, rate, amount }
        )
        payload.charges      = charges.filter(c => c.name)
        payload.taxes        = taxes.filter(t => t.name)
        payload.total_amount = grandTotal.toFixed(2)
      } else if (fastAmountOverride) {
          // Keep it as a fast amount if no items added
          payload.line_items = []
          payload.total_amount = fastAmountOverride
      } else {
          toast.error('Add at least one line item or provide an amount'); return
      }
    }

    try {
      await updateDocument.mutateAsync(payload)
      toast.success('Document updated successfully')
      router.back()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Failed to update document')
    }
  }

  return (
    <div className="px-4 py-4 pb-10 space-y-6">

       {/* Warning about editing impacts */}
       <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <p className="font-medium leading-snug">
          Updating the document will automatically recalculate associated Stock and Financial ledgers.
        </p>
      </div>

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label>Contact <span className="text-destructive">*</span></Label>
        <SearchableSelect
          options={contactOptions} value={contactId} onChange={setContactId}
          placeholder="Select contact" title="Select Contact"
          searchPlaceholder="Search by name or phone..."
        />
      </div>

      {/* ── Date ─────────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label>Date <span className="text-destructive">*</span></Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 rounded-xl" />
      </div>

      <Separator />

      {/* Detailed Fields */}
      <div className="space-y-6">

        {hasConsignee && (
          <div className="space-y-1.5">
            <Label>Consignee <span className="text-xs text-muted-foreground ml-1">(optional)</span></Label>
            <SearchableSelect options={consigneeOptions} value={consigneeId} onChange={setConsigneeId} placeholder="Select consignee" title="Select Consignee" searchPlaceholder="Search contacts..." clearable />
          </div>
        )}

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

        {/* Override for Fast mode fallback */}
        {hasLineItems && lineItems.filter(l => l.name.trim()).length === 0 && Number(fastAmountOverride) > 0 && (
           <div className="space-y-1.5 bg-primary/5 border border-primary/10 p-4 rounded-xl mb-4">
             <Label className="text-primary font-semibold">Total Amount (Fast Mode)</Label>
             <Input type="number" placeholder="0.00" className="text-3xl h-16 font-black rounded-xl border-primary/20 bg-background mt-1" value={fastAmountOverride} onChange={e => setFastAmountOverride(e.target.value)} />
             <p className="text-xs text-muted-foreground mt-2">Add Line Items below to convert this into a detailed document with inventory tracking.</p>
           </div>
        )}

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
              <Card key={item._key} className="overflow-hidden rounded-xl border border-border/80 shadow-sm transition-all focus-within:border-primary/50">
                <CardContent className="p-3 space-y-3">
                  {products.length > 0 && (
                    <SearchableSelect options={productOptions} value={item.product_id ? String(item.product_id) : ''} onChange={v => onProductSelect(item._key, v)} placeholder="Link to inventory product (optional)" title="Select Product" searchPlaceholder="Search by name or HSN..." clearable />
                  )}
                  <Input placeholder="Item name / description" value={item.name} onChange={e => updateLineItem(item._key, 'name', e.target.value)} className="h-10 bg-muted/20" />
                  <div className={`grid gap-3 ${docType === 'challan' ? 'grid-cols-1' : 'grid-cols-3'}`}>
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Qty</p>
                      <Input type="number" className="h-10 font-medium" value={item.quantity} onChange={e => updateLineItem(item._key, 'quantity', Number(e.target.value))} />
                    </div>
                    {docType !== 'challan' && (
                      <>
                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Rate (₹)</p>
                          <Input type="number" className="h-10 font-medium" value={item.rate} onChange={e => updateLineItem(item._key, 'rate', Number(e.target.value))} />
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
                      <button onClick={() => removeLineItem(item._key)} className="flex items-center gap-1.5 text-xs font-medium text-destructive/80 hover:text-destructive transition-colors py-1"><X className="h-3.5 w-3.5" /> Remove Row</button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Taxes & Charges */}
            {docType !== 'challan' && (
              <div className="pt-2">
                <button className="flex items-center justify-between w-full p-3 rounded-xl border bg-muted/20 text-sm font-medium text-muted-foreground hover:bg-muted/40 transition-colors" onClick={() => setShowCharges(v => !v)}>
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
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addCharge}><Plus className="h-3 w-3" /> Add Charge</Button>
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
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addTax}><Plus className="h-3 w-3" /> Add Tax</Button>
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
                {lineItems.filter(l => l.name.trim()).length > 0 && (
                  <Card className="mt-4 bg-muted/30 border-transparent">
                    <CardContent className="p-4 space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground font-medium"><span>Subtotal</span><span>{fmtAmount(lineTotal)}</span></div>
                      {chargeTotal > 0 && <div className="flex justify-between text-muted-foreground font-medium"><span>Charges</span><span>+{fmtAmount(chargeTotal)}</span></div>}
                      {discountAmt > 0 && <div className="flex justify-between text-emerald-600 font-medium"><span>Discount</span><span>−{fmtAmount(discountAmt)}</span></div>}
                      {taxTotal > 0 && <div className="flex justify-between text-muted-foreground font-medium"><span>Tax</span><span>+{fmtAmount(taxTotal)}</span></div>}
                      <Separator className="my-2" />
                      <div className="flex justify-between font-black text-xl text-foreground"><span>Total</span><span>{fmtAmount(grandTotal)}</span></div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* Attachments Section */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1.5"><LinkIcon className="h-3.5 w-3.5 text-muted-foreground" /> Attachments</Label>
          <div className="flex gap-2">
            <Input placeholder="https://drive.google.com/..." value={currentLink} onChange={e => setCurrentLink(e.target.value)} className="h-11 rounded-xl flex-1" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttachment(); } }} />
            <Button variant="secondary" className="h-11 px-4 rounded-xl shrink-0 font-semibold" onClick={handleAddAttachment} disabled={!currentLink.trim()}>Add</Button>
          </div>
          {attachmentUrls.length > 0 && (
            <div className="space-y-2 mt-2">
              {attachmentUrls.map((url, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm truncate font-medium text-foreground/80">{url}</span>
                  </div>
                  <button onClick={() => handleRemoveAttachment(index)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label>Notes <span className="text-xs text-muted-foreground ml-1 font-normal">(optional)</span></Label>
          <Input placeholder="Internal remarks..." value={notes} onChange={e => setNotes(e.target.value)} className="h-11 rounded-xl" />
        </div>
      </div>

      <div className="pt-4 pb-8 flex gap-3">
         <Button variant="outline" className="flex-1 h-14 rounded-2xl" onClick={() => router.back()}>Cancel</Button>
         <Button className="flex-1 h-14 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20" onClick={handleSubmit} disabled={updateDocument.isPending}>
           {updateDocument.isPending ? 'Saving...' : 'Save Changes'}
         </Button>
      </div>

      <ProductMultiPickerSheet open={productPickerOpen} products={products} onConfirm={handleProductPickerConfirm} onClose={() => setProductPickerOpen(false)} />
    </div>
  )
}
