'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useCreateDocument, useDocuments, useDocument, useStandaloneInterest } from '@/hooks/useDocument'
import { useSettings } from '@/hooks/useSettings'
import { useContacts } from '@/hooks/useContact'
import { useProducts } from '@/hooks/useProduct'
import { useAccounts } from '@/hooks/useAccount'
import {
  DocumentType, DOC_TYPE_LABELS, LineItem, Charge, Tax, DocumentCreate,
} from '@/models/document'
import { getContactDisplayName } from '@/models/contact'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import {
  X, Plus, ChevronDown, ChevronUp, FileText, Package,
  Link as LinkIcon, TrendingUp, TrendingDown,
} from 'lucide-react'
import { fmtAmount } from '@/lib/utils'
import { SearchableSelect, type SearchableSelectOption } from '@/components/shared/common/SearchableSelect'
import { UploadInput }      from '@/components/shared/common/UploadInput'
import { FilePreviewSheet } from '@/components/shared/FilePreviewSheet'

const DOC_LABELS  = DOC_TYPE_LABELS as Record<string, string>
const getDocLabel = (t: string | null | undefined) => t ? (DOC_LABELS[t] ?? t) : ''

// ── Document type constants ───────────────────────────────────────────────────
const WITH_LINE_ITEMS:     DocumentType[] = ['bill', 'invoice', 'po', 'pi', 'quotation', 'challan', 'cn', 'dn']
const WITH_REFERENCE:      DocumentType[] = ['po', 'pi', 'quotation', 'cn', 'dn', 'challan', 'bill', 'invoice']
const WITH_CONSIGNEE:      DocumentType[] = ['challan', 'invoice', 'bill']
const WITH_PAYMENT:        DocumentType[] = ['bill', 'invoice', 'cn', 'dn']
const IS_VOUCHER:          DocumentType[] = ['cash_payment_voucher', 'cash_receipt_voucher']
const FAST_BILL_TYPES:     DocumentType[] = ['bill', 'invoice']
const CONTACT_REQUIRED:    DocumentType[] = ['bill', 'invoice', 'cn', 'dn', 'cash_payment_voucher', 'cash_receipt_voucher']
const IS_EXPENSE_TYPE:     DocumentType[] = ['expense', 'interest']
const AUTO_COPY_REF_TYPES: DocumentType[] = ['cn', 'dn']

// ✅ Now supports multiple ref types per doc type
// bill can come from: po, quotation, or another bill
// invoice can come from: pi, quotation, or another invoice
const REF_DOC_TYPE_OPTIONS: Partial<Record<DocumentType, DocumentType[]>> = {
  cn:      ['invoice'],
  dn:      ['bill'],
  challan: ['bill', 'invoice'],
  po:      ['quotation'],
  pi:      ['quotation'],
  bill:    ['po', 'quotation', 'bill'],
  invoice: ['pi', 'quotation', 'invoice'],
}

// ── Local row types ───────────────────────────────────────────────────────────
interface LineItemRow extends LineItem { key: string }
interface ExpenseRow  { key: string; name: string; amount: string }
interface InterestRow { key: string; name: string; amount: string; type: 'charge' | 'discount' }


// ── Line Item Picker Sheet ────────────────────────────────────────────────────
interface LineItemPickerProps {
  open: boolean
  items: LineItem[]
  onConfirm: (selected: LineItem[]) => void
  onClose: () => void
}
function LineItemPickerSheet({ open, items, onConfirm, onClose }: LineItemPickerProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set(items.map((_, i) => i)))
  useEffect(() => { setSelected(new Set(items.map((_, i) => i))) }, [items])

  const toggle    = (i: number) => setSelected(prev => {
    const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next
  })
  const toggleAll = () => setSelected(prev =>
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
          <span className="text-sm font-medium">{selected.size === items.length ? 'Deselect all' : 'Select all'}</span>
          <span className="text-xs text-muted-foreground ml-auto bg-muted px-2 py-1 rounded-md">{selected.size}</span>
        </div>
        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 200px)' }}>
          {items.map((item, i) => (
            <div key={i} onClick={() => toggle(i)}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                ${selected.has(i) ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/40'}`}>
              <Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} onClick={e => e.stopPropagation()} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.name}</p>
                {item.quantity != null && item.rate != null && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.quantity} × {item.rate}{item.hsn ? ` · HSN ${item.hsn}` : ''}
                  </p>
                )}
              </div>
              {item.amount != null && <p className="text-sm font-semibold shrink-0">{fmtAmount(item.amount)}</p>}
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-4 pt-2 border-t border-border/50">
          <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 h-12 rounded-xl" disabled={selected.size === 0}
            onClick={() => { onConfirm(items.filter((_, i) => selected.has(i))); onClose() }}>
            Copy {selected.size} Item{selected.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Product Multi-Picker Sheet ────────────────────────────────────────────────
function ProductMultiPickerSheet({ open, products, onConfirm, onClose }: {
  open: boolean
  products: any[]
  onConfirm: (s: any[]) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [search,   setSearch]   = useState('')

  useEffect(() => { if (open) { setSelected(new Set()); setSearch('') } }, [open])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.hsn_code && p.hsn_code.toLowerCase().includes(search.toLowerCase()))
  )
  const toggle = (id: number) => setSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
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
        <Input placeholder="Search inventory..." value={search}
          onChange={e => setSearch(e.target.value)} className="mb-3 h-11 rounded-xl" />
        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {filtered.length === 0
            ? <p className="text-center text-sm text-muted-foreground py-10 bg-muted/30 rounded-xl border border-dashed">No products found</p>
            : filtered.map(p => (
                <div key={p.id} onClick={() => toggle(p.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                    ${selected.has(p.id) ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/40'}`}>
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} onClick={e => e.stopPropagation()} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Stock {p.current_stock} {p.unit} · ₹{p.rate}
                    </p>
                  </div>
                </div>
              ))
          }
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export function DocumentNewPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const setPageTitle = useUIStore(s => s.setPageTitle)

  const docType      = (searchParams.get('type') ?? 'bill') as DocumentType
  const preContactId = searchParams.get('contact') ?? ''

  useEffect(() => { setPageTitle(`New ${getDocLabel(docType)}`) }, [docType, setPageTitle])

  const { data: settings }     = useSettings()
  const { data: contactsData } = useContacts({ is_active: true })
  const { data: productsData } = useProducts({ is_active: true })
  const { data: accountsData } = useAccounts({ is_active: true })

  // ✅ Multiple ref doc types supported — user picks which type to browse
  const refDocTypeOptions = REF_DOC_TYPE_OPTIONS[docType] ?? []
  const hasMultipleRefTypes = refDocTypeOptions.length > 1
  const [selectedRefDocType, setSelectedRefDocType] = useState<DocumentType | ''>(
    refDocTypeOptions[0] ?? ''
  )

  const shouldFetchRefDocs = WITH_REFERENCE.includes(docType) && !!selectedRefDocType
  const { data: referenceDocs } = useDocuments(
    shouldFetchRefDocs ? { type: selectedRefDocType as DocumentType } : undefined
  )

  const isInterestOrExpense = docType === 'interest' || docType === 'expense'
  const { data: allDocsData } = useDocuments(
    isInterestOrExpense ? { page_size: 50 } : undefined
  )

  const createDocument     = useCreateDocument()
  const standaloneInterest = useStandaloneInterest()

  // ── Form state ──────────────────────────────────────────────────────────────
  const [contactId,        setContactId]       = useState(preContactId)
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
  const [attachmentUrls,   setAttachmentUrls]   = useState<string[]>([])
  const [billMode,         setBillMode]         = useState<'fast' | 'detailed'>(
    FAST_BILL_TYPES.includes(docType) ? 'fast' : 'detailed'
  )
  const [showCharges,       setShowCharges]       = useState(false)
  const [pickerOpen,        setPickerOpen]        = useState(false)
  const [productPickerOpen, setProductPickerOpen] = useState(false)
  const [previewOpen,       setPreviewOpen]       = useState(false)
  const [previewIndex,      setPreviewIndex]      = useState(0)

  const [lineItems, setLineItems] = useState<LineItemRow[]>([
    { key: crypto.randomUUID(), name: '', quantity: 1, rate: 0, amount: 0, product_id: null },
  ])
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([
    { key: crypto.randomUUID(), name: '', amount: '' },
  ])
  const [interestRows, setInterestRows] = useState<InterestRow[]>([
    { key: crypto.randomUUID(), name: '', amount: '', type: 'charge' },
  ])
  const [interestDirection, setInterestDirection] = useState<'pay' | 'receive'>('pay')
  const [interestLinkedDoc, setInterestLinkedDoc] = useState('')

  const [charges, setCharges] = useState<Charge[]>([])
  const [taxes,   setTaxes]   = useState<Tax[]>([])

  const contacts = contactsData?.results ?? []
  const products = productsData?.results ?? []
  const accounts = accountsData?.results ?? []
  const refDocs  = shouldFetchRefDocs ? (referenceDocs?.results ?? []) : []
  const allDocs  = allDocsData?.results ?? []

  const refDocId    = referenceId       ? Number(referenceId)       : undefined
  const linkedDocId = interestLinkedDoc ? Number(interestLinkedDoc) : undefined
  const { data: refDoc }    = useDocument(refDocId    as number)
  const { data: linkedDoc } = useDocument(linkedDocId as number)

  // ── Computed flags ──────────────────────────────────────────────────────────
  const isVoucher      = IS_VOUCHER.includes(docType)
  const hasLineItems   = WITH_LINE_ITEMS.includes(docType)
  const hasReference   = WITH_REFERENCE.includes(docType) && refDocTypeOptions.length > 0
  const hasConsignee   = WITH_CONSIGNEE.includes(docType)
  const isFastBillType = FAST_BILL_TYPES.includes(docType)
  const isFastMode     = isFastBillType && billMode === 'fast'
  const isExpenseType  = IS_EXPENSE_TYPE.includes(docType)

  const showPaymentAccount =
    (WITH_PAYMENT.includes(docType) && !!settings?.auto_transaction)
    || IS_VOUCHER.includes(docType)
    || docType === 'expense'

  // ── Interest CF preview ─────────────────────────────────────────────────────
  const interestNet = useMemo(() => {
    if (docType !== 'interest') return 0
    return interestRows.reduce((s, r) => {
      const amt = Number(r.amount) || 0
      return s + (r.type === 'charge' ? amt : -amt)
    }, 0)
  }, [docType, interestRows])

  const interestCFImpact = interestDirection === 'pay' ? interestNet : -interestNet

  // ── Select options ──────────────────────────────────────────────────────────
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
      value: String(d.id), label: d.doc_id, sublabel: d.date,
      badge: getDocLabel(d.type), meta: d.total_amount ? fmtAmount(d.total_amount) : undefined,
    })),
  ]
  const accountOptions: SearchableSelectOption[] = [
    { value: '', label: 'None', sublabel: 'Record only / pay later' },
    ...accounts.map(a => ({
      value: String(a.id), label: a.name,
      sublabel: `${a.type} · ${fmtAmount(a.current_balance)}`,
    })),
  ]
  const productOptions: SearchableSelectOption[] = [
    { value: '', label: 'Custom item', sublabel: 'Enter name manually' },
    ...products.map(p => ({
      value: String(p.id), label: p.name,
      sublabel: `Stock ${p.current_stock} ${p.unit}${p.hsn_code ? ` · HSN ${p.hsn_code}` : ''}`,
      meta: p.rate,
    })),
  ]
  const allDocOptions: SearchableSelectOption[] = [
    { value: '', label: 'None', sublabel: 'No linked document' },
    ...allDocs.map(d => ({
      value: String(d.id), label: d.doc_id, sublabel: d.date,
      badge: getDocLabel(d.type), meta: d.total_amount ? fmtAmount(d.total_amount) : undefined,
    })),
  ]

  // ── Side effects ────────────────────────────────────────────────────────────

  // ✅ Reset referenceId when user switches ref doc type tab
  useEffect(() => { setReferenceId('') }, [selectedRefDocType])

  // ✅ MAIN COPY EFFECT — fires when a ref doc is selected
  // Rules:
  //  - contact      → only if contactId is empty
  //  - consignee    → only if consigneeId is empty
  //  - paymentAcct  → only if paymentAccountId is empty
  //  - line_items   → always replace (with picker for cn/dn, direct for others)
  //  - taxes        → only if taxes array is empty
  //  - charges      → only if charges array is empty
  //  - discount     → only if discount is empty
  //  - paymentTerms → only if paymentTerms is empty
  //  - dueDate      → only if dueDate is empty
  //  - notes        → only if notes is empty
  useEffect(() => {
    if (!refDoc) return

    // Contact — never override if already set
    if (!contactId && refDoc.contact) {
      setContactId(String(refDoc.contact))
    }

    // Consignee — never override if already set
    if (!consigneeId && refDoc.consignee) {
      setConsigneeId(String(refDoc.consignee))
    }

    // For cn/dn: open picker so user selects which items to copy
    if (AUTO_COPY_REF_TYPES.includes(docType) && (refDoc.line_items?.length ?? 0) > 0) {
      setLineItems([{ key: crypto.randomUUID(), name: '', quantity: 1, rate: 0, amount: 0, product_id: null }])
      setPickerOpen(true)
      return // skip direct line item copy below
    }

    // For all other doc types: copy line items directly
    if ((refDoc.line_items?.length ?? 0) > 0) {
      setPickerOpen(true) // still show picker so user can deselect items
    }

    // Taxes — only if none set yet
    if (taxes.length === 0 && (refDoc.taxes?.length ?? 0) > 0) {
      setTaxes(refDoc.taxes!)
      if (!showCharges) setShowCharges(true)
    }

    // Charges — only if none set yet
    if (charges.length === 0 && (refDoc.charges?.length ?? 0) > 0) {
      setCharges(refDoc.charges!)
      if (!showCharges) setShowCharges(true)
    }

    // Discount — only if not set yet
    if (!discount && refDoc.discount && Number(refDoc.discount) > 0) {
      setDiscount(String(refDoc.discount))
      if (!showCharges) setShowCharges(true)
    }

    // Payment terms — only if not set yet
    if (!paymentTerms && refDoc.payment_terms) {
      setPaymentTerms(refDoc.payment_terms)
    }

    // Due date — only if not set yet
    if (!dueDate && refDoc.due_date) {
      setDueDate(refDoc.due_date)
    }

    // Notes — only if not set yet
    if (!notes && refDoc.notes) {
      setNotes(refDoc.notes)
    }

    // Switch to detailed mode if we got line items
    if ((refDoc.line_items?.length ?? 0) > 0 && isFastBillType) {
      setBillMode('detailed')
    }
  }, [refDoc?.id])

  useEffect(() => {
    if (!linkedDoc) return
    if (!contactId && linkedDoc.contact) setContactId(String(linkedDoc.contact))
  }, [linkedDoc?.id])

  // ── Line item handlers ──────────────────────────────────────────────────────
  const handlePickerConfirm = (selected: LineItem[]) => {
    if (selected.length === 0) return
    setLineItems(selected.map(item => ({ ...item, key: crypto.randomUUID() })))
    if (isFastBillType) setBillMode('detailed')
  }
  const handleProductPickerConfirm = (selected: any[]) => {
    if (selected.length === 0) return
    const newItems = selected.map(p => ({
      key: crypto.randomUUID(), product_id: p.id, name: p.name,
      quantity: 1, rate: Number(p.rate), amount: Number(p.rate), hsn: p.hsn_code ?? undefined,
    }))
    setLineItems(prev => {
      const filtered = prev.filter(l => l.name.trim() !== '' || l.product_id !== null)
      return [...filtered, ...newItems]
    })
  }

  const addLineItem    = () => setLineItems(p => [...p, { key: crypto.randomUUID(), name: '', quantity: 1, rate: 0, amount: 0, product_id: null }])
  const removeLineItem = (key: string) => setLineItems(p => p.filter(l => l.key !== key))
  const updateLineItem = (key: string, field: keyof LineItemRow, value: string | number | null) =>
    setLineItems(p => p.map(l => {
      if (l.key !== key) return l
      const updated = { ...l, [field]: value }
      if (field === 'quantity' || field === 'rate') updated.amount = Number(updated.quantity ?? 0) * Number(updated.rate ?? 0)
      return updated
    }))
  const onProductSelect = (key: string, productId: string) => {
    if (!productId) { updateLineItem(key, 'product_id', null); return }
    const product = products.find(p => String(p.id) === productId)
    if (!product) return
    setLineItems(p => p.map(l => {
      if (l.key !== key) return l
      const qty = Number(l.quantity) || 1
      return { ...l, product_id: product.id, name: product.name, rate: Number(product.rate), amount: qty * Number(product.rate), hsn: product.hsn_code ?? undefined }
    }))
  }

  // ── Expense row handlers ────────────────────────────────────────────────────
  const addExpenseRow    = () => setExpenseRows(p => [...p, { key: crypto.randomUUID(), name: '', amount: '' }])
  const removeExpenseRow = (key: string) => setExpenseRows(p => p.filter(r => r.key !== key))
  const updateExpenseRow = (key: string, field: 'name' | 'amount', value: string) =>
    setExpenseRows(p => p.map(r => r.key !== key ? r : { ...r, [field]: value }))

  // ── Interest row handlers ───────────────────────────────────────────────────
  const addInterestRow    = () => setInterestRows(p => [...p, { key: crypto.randomUUID(), name: '', amount: '', type: 'charge' }])
  const removeInterestRow = (key: string) => setInterestRows(p => p.filter(r => r.key !== key))
  const updateInterestRow = (key: string, field: keyof InterestRow, value: string) =>
    setInterestRows(p => p.map(r => r.key !== key ? r : { ...r, [field]: value }))

  // ── Charge / Tax handlers ───────────────────────────────────────────────────
  const addCharge    = () => setCharges(p => [...p, { name: '', amount: 0 }])
  const removeCharge = (i: number) => setCharges(p => p.filter((_, idx) => idx !== i))
  const updateCharge = (i: number, f: keyof Charge, v: string) =>
    setCharges(p => p.map((c, idx) => idx === i ? { ...c, [f]: f === 'amount' ? Number(v) : v } : c))
  const addTax    = () => setTaxes(p => [...p, { name: '', percentage: 0 }])
  const removeTax = (i: number) => setTaxes(p => p.filter((_, idx) => idx !== i))
  const updateTax = (i: number, f: keyof Tax, v: string) =>
    setTaxes(p => p.map((t, idx) => idx === i ? { ...t, [f]: f === 'percentage' ? Number(v) : v } : t))

  // ── Totals ──────────────────────────────────────────────────────────────────
  const lineTotal    = lineItems.reduce((s, l) => s + Number(l.amount), 0)
  const expenseTotal = expenseRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const chargeTotal  = charges.reduce((s, c) => s + Number(c.amount), 0)
  const discountAmt  = Number(discount) || 0
  const taxBase      = lineTotal + chargeTotal - discountAmt
  const taxTotal     = taxes.reduce((s, t) => s + (taxBase * Number(t.percentage) / 100), 0)
  const grandTotal   = lineTotal + chargeTotal - discountAmt + taxTotal

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (CONTACT_REQUIRED.includes(docType) && !contactId) {
      toast.error('Select a contact'); return
    }

    if (docType === 'interest') {
      const validRows = interestRows.filter(r => r.name.trim() && Number(r.amount) > 0)
      if (validRows.length === 0) { toast.error('Add at least one interest entry'); return }
      const toggle = interestDirection === 'pay' ? 'we_pay' : 'we_receive'
      try {
        const result = await standaloneInterest.mutateAsync({
          contact:    contactId         ? Number(contactId)         : undefined,
          reference:  interestLinkedDoc ? Number(interestLinkedDoc) : undefined,
          date,
          line_items: validRows.map(r => ({ name: r.name, amount: Number(r.amount), type: r.type })),
          toggle,
        })
        toast.success('Interest document created')
        router.replace(`/documents/${result.interest_doc}`)
      } catch (e: any) {
        toast.error(e?.response?.data?.error ?? e?.response?.data?.detail ?? 'Failed to create interest')
      }
      return
    }

    const payload: DocumentCreate = {
      type:            docType,
      contact:         contactId  ? Number(contactId)  : undefined,
      date,
      due_date:        dueDate      || undefined,
      payment_terms:   paymentTerms || undefined,
      notes:           notes        || undefined,
      reference:       referenceId  ? Number(referenceId) : undefined,
      consignee:       consigneeId  ? Number(consigneeId) : undefined,
      discount:        discountAmt,
      attachment_urls: attachmentUrls,
    }

    if (docType === 'expense') {
      const validRows = expenseRows.filter(r => r.name.trim() && Number(r.amount) > 0)
      if (validRows.length === 0) { toast.error('Add at least one entry with a name and amount'); return }
      if (!paymentAccountId)      { toast.error('Select a payment account'); return }
      payload.line_items      = validRows.map(r => ({ name: r.name, amount: Number(r.amount) }))
      payload.total_amount    = expenseTotal
      payload.payment_account = Number(paymentAccountId)
      payload.reference       = interestLinkedDoc ? Number(interestLinkedDoc) : undefined

    } else if (isVoucher) {
      if (!voucherAmount || Number(voucherAmount) === 0) { toast.error('Enter amount'); return }
      if (!paymentAccountId)                             { toast.error('Select a payment account'); return }
      payload.total_amount    = voucherAmount
      payload.payment_account = Number(paymentAccountId)

    } else if (hasLineItems) {
      if (isFastMode) {
        if (!fastAmount || Number(fastAmount) === 0) { toast.error('Enter a total amount'); return }
        payload.total_amount = fastAmount
        payload.line_items   = []
      } else {
        const validItems = lineItems.filter(l => l.name.trim())
        if (validItems.length === 0) { toast.error('Add at least one line item'); return }
        payload.line_items   = validItems.map(({ key, rate, amount, ...rest }) =>
          docType === 'challan' ? rest : { ...rest, rate, amount }
        )
        payload.charges      = charges.filter(c => c.name)
        payload.taxes        = taxes.filter(t => t.name)
        payload.total_amount = grandTotal.toFixed(2)
      }
      if (showPaymentAccount && paymentAccountId) {
        payload.payment_account = Number(paymentAccountId)
      }
    }

    try {
      const doc = await createDocument.mutateAsync(payload)
      toast.success(`${getDocLabel(docType)} created`)
      router.replace(`/documents/${doc.id}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Failed to create document')
    }
  }

  // ── Attachments helper ──────────────────────────────────────────────────────
  const renderAttachmentsSection = () => (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
        Attachments
        <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span>
      </Label>
      <UploadInput
        value={attachmentUrls}
        onChange={setAttachmentUrls}
        context="document"
        maxFiles={10}
        onPreview={(idx) => { setPreviewIndex(idx); setPreviewOpen(true) }}
      />
    </div>
  )

  const isSubmitting = createDocument.isPending || standaloneInterest.isPending

  // ── Reference Document Section (reusable render) ────────────────────────────
  const renderReferenceSection = () => {
    if (!hasReference) return null
    return (
      <div className="space-y-2">
        <Label>
          Reference Document
          <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span>
        </Label>

        {/* ✅ Doc type tab switcher — shown only when multiple ref types exist */}
        {hasMultipleRefTypes && (
          <div className="flex gap-1.5 flex-wrap">
            {refDocTypeOptions.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedRefDocType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  selectedRefDocType === type
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {getDocLabel(type)}
              </button>
            ))}
          </div>
        )}

        {(docType === 'cn' || docType === 'dn') && (
          <p className="text-xs text-muted-foreground">
            {docType === 'cn'
              ? 'Select the Invoice being returned — contact and items auto-fill'
              : 'Select the Bill being returned — contact and items auto-fill'}
          </p>
        )}

        <SearchableSelect
          options={refDocOptions}
          value={referenceId}
          onChange={setReferenceId}
          placeholder={selectedRefDocType ? `Select ${getDocLabel(selectedRefDocType)}` : 'Select reference doc'}
          title="Reference Document"
          searchPlaceholder="Search by doc ID or date..."
          clearable
          emptyText={selectedRefDocType ? `No ${getDocLabel(selectedRefDocType)} documents found` : 'No documents found'}
        />

        {/* ✅ Ref doc summary card — shows what will be / was copied */}
        {refDoc && (
          <div className="rounded-xl border bg-muted/30 p-3 space-y-2 mt-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-foreground/90">
                  {getDocLabel(refDoc.type)} {refDoc.doc_id}
                </span>
                {refDoc.total_amount && (
                  <span className="text-xs text-muted-foreground"> · {fmtAmount(refDoc.total_amount)}</span>
                )}
              </div>
              {(refDoc.line_items?.length ?? 0) > 0 && (
                <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 shrink-0"
                  onClick={() => setPickerOpen(true)}>
                  Re-copy Items
                </Button>
              )}
            </div>

            {/* What was auto-copied — helpful confirmation */}
            <div className="flex flex-wrap gap-1.5">
              {refDoc.contact && !preContactId && (
                <Badge variant="secondary" className="text-[10px] h-5">✓ Contact</Badge>
              )}
              {refDoc.consignee && (
                <Badge variant="secondary" className="text-[10px] h-5">✓ Consignee</Badge>
              )}
              {(refDoc.line_items?.length ?? 0) > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  ✓ {refDoc.line_items!.length} Items
                </Badge>
              )}
              {(refDoc.taxes?.length ?? 0) > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">✓ Taxes</Badge>
              )}
              {(refDoc.charges?.length ?? 0) > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">✓ Charges</Badge>
              )}
              {refDoc.discount && Number(refDoc.discount) > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">✓ Discount</Badge>
              )}
              {refDoc.payment_terms && (
                <Badge variant="secondary" className="text-[10px] h-5">✓ Terms</Badge>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-4 pb-10 space-y-6">

      {/* Contact */}
      <div className="space-y-1.5">
        <Label>
          Contact{' '}
          {CONTACT_REQUIRED.includes(docType)
            ? <span className="text-destructive">*</span>
            : <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span>}
        </Label>
        <SearchableSelect
          options={contactOptions}
          value={contactId}
          onChange={setContactId}
          placeholder="Select contact"
          title="Select Contact"
          searchPlaceholder="Search by name or phone..."
          emptyText="No contacts found"
          clearable={!CONTACT_REQUIRED.includes(docType)}
          error={CONTACT_REQUIRED.includes(docType) && !contactId}
        />
      </div>

      {/* Date */}
      <div className="space-y-1.5">
        <Label>Date <span className="text-destructive">*</span></Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 rounded-xl" />
      </div>

      <Separator />

      {/* EXPENSE MODE */}
      {docType === 'expense' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Expense Entries
              </Label>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs rounded-lg px-2.5 bg-muted/40" onClick={addExpenseRow}>
                <Plus className="h-3.5 w-3.5" /> Add Row
              </Button>
            </div>
            {expenseRows.map(row => (
              <div key={row.key} className="flex gap-2 items-center">
                <Input placeholder="e.g. Rent, Electricity, Salary..."
                  value={row.name} onChange={e => updateExpenseRow(row.key, 'name', e.target.value)}
                  className="flex-1 h-11 rounded-xl" />
                <Input type="number" placeholder="0.00"
                  value={row.amount} onChange={e => updateExpenseRow(row.key, 'amount', e.target.value)}
                  className="w-32 h-11 rounded-xl font-semibold" />
                {expenseRows.length > 1 && (
                  <button onClick={() => removeExpenseRow(row.key)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <div className="flex justify-between items-center px-3 py-2.5 bg-muted/40 rounded-xl border">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-lg font-black">{fmtAmount(expenseTotal)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Link Document
              <span className="text-xs text-muted-foreground ml-1 font-normal">optional — auto-fills contact</span>
            </Label>
            <SearchableSelect
              options={allDocOptions} value={interestLinkedDoc} onChange={setInterestLinkedDoc}
              placeholder="Link to an existing document" title="Select Document"
              searchPlaceholder="Search by doc ID, date..." clearable emptyText="No documents found"
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Payment Account <span className="text-destructive">*</span>
              <span className="text-xs text-muted-foreground ml-1 font-normal">account to be debited</span>
            </Label>
            <SearchableSelect
              options={accountOptions} value={paymentAccountId} onChange={setPaymentAccountId}
              placeholder="Select account" title="Select Payment Account"
              searchPlaceholder="Search accounts..." clearable
            />
          </div>

          {renderAttachmentsSection()}

          <div className="space-y-1.5">
            <Label>Notes <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span></Label>
            <Input placeholder="Internal remarks..." value={notes}
              onChange={e => setNotes(e.target.value)} className="h-11 rounded-xl" />
          </div>
        </div>
      )}

      {/* INTEREST MODE */}
      {docType === 'interest' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Payment Direction <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Which way is money flowing for this interest adjustment?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setInterestDirection('pay')}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all
                  ${interestDirection === 'pay'
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : 'border-border bg-muted/30 text-muted-foreground'}`}>
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm font-semibold">We Pay</span>
                <span className="text-[10px] text-center leading-tight opacity-80">
                  Interest we owe — CF goes up (red)
                </span>
              </button>
              <button type="button" onClick={() => setInterestDirection('receive')}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all
                  ${interestDirection === 'receive'
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : 'border-border bg-muted/30 text-muted-foreground'}`}>
                <TrendingDown className="h-5 w-5" />
                <span className="text-sm font-semibold">We Receive</span>
                <span className="text-[10px] text-center leading-tight opacity-80">
                  Interest owed to us — CF goes down (green)
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5">
            <span className="mt-0.5">💡</span>
            <span>
              <strong>Charge</strong> = extra amount to be applied (late fee, penalty) ·{' '}
              <strong>Discount</strong> = amount waived (early payment, goodwill)
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Interest Entries
              </Label>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs rounded-lg px-2.5 bg-muted/40"
                onClick={addInterestRow}>
                <Plus className="h-3.5 w-3.5" /> Add Row
              </Button>
            </div>
            {interestRows.map(row => (
              <div key={row.key} className="space-y-2 p-3 rounded-xl border bg-muted/20">
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="e.g. Late fee, Processing charge, Early payment..."
                    value={row.name} onChange={e => updateInterestRow(row.key, 'name', e.target.value)}
                    className="flex-1 h-10 text-sm"
                  />
                  <Input
                    type="number" placeholder="0.00"
                    value={row.amount} onChange={e => updateInterestRow(row.key, 'amount', e.target.value)}
                    className="w-28 h-10 text-sm font-semibold"
                  />
                  {interestRows.length > 1 && (
                    <button onClick={() => removeInterestRow(row.key)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => updateInterestRow(row.key, 'type', 'charge')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors
                      ${row.type === 'charge'
                        ? 'bg-red-50 border-red-300 text-red-600'
                        : 'bg-muted border-border text-muted-foreground'}`}>
                    <TrendingUp className="h-3 w-3" /> Charge
                  </button>
                  <button type="button" onClick={() => updateInterestRow(row.key, 'type', 'discount')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors
                      ${row.type === 'discount'
                        ? 'bg-green-50 border-green-300 text-green-600'
                        : 'bg-muted border-border text-muted-foreground'}`}>
                    <TrendingDown className="h-3 w-3" /> Discount
                  </button>
                </div>
              </div>
            ))}
          </div>

          {interestRows.some(r => Number(r.amount) > 0) && (
            <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                CF Impact Preview
              </p>
              {interestRows.filter(r => r.name && Number(r.amount) > 0).map((r, i) => {
                const amt    = Number(r.amount)
                const net    = r.type === 'charge' ? amt : -amt
                const impact = interestDirection === 'pay' ? net : -net
                // const isPos  = impact > 0

                const isPos =
                  (interestDirection === 'pay'     && r.type === 'charge') ||
                  (interestDirection === 'receive' && r.type === 'discount')
                return (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      {r.name || 'Entry'}
                      <Badge variant="outline" className="text-[10px] h-4">{r.type}</Badge>
                    </span>
                    <span className={isPos ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                      {isPos ? '+' : '−'}{fmtAmount(Math.abs(impact))}
                    </span>
                  </div>
                )
              })}
              <Separator />
              <div className="flex justify-between items-center font-semibold text-sm">
                <span>Net CF Change</span>
                <span className={interestCFImpact > 0 ? 'text-red-500' : 'text-green-600'}>
                  {interestCFImpact > 0 ? '+' : '−'}{fmtAmount(Math.abs(interestCFImpact))}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Red = we owe them more · Green = they owe us more
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>
              Link Document
              <span className="text-xs text-muted-foreground ml-1 font-normal">optional — inherits contact if selected</span>
            </Label>
            <SearchableSelect
              options={allDocOptions} value={interestLinkedDoc} onChange={setInterestLinkedDoc}
              placeholder="Link to an existing document" title="Select Document"
              searchPlaceholder="Search by doc ID, date..." clearable emptyText="No documents found"
            />
          </div>

          {renderAttachmentsSection()}

          <div className="space-y-1.5">
            <Label>Notes <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span></Label>
            <Input placeholder="Internal remarks..." value={notes}
              onChange={e => setNotes(e.target.value)} className="h-11 rounded-xl" />
          </div>
        </div>
      )}

      {/* FAST / DETAILED toggle */}
      {!isExpenseType && isFastBillType && (
        <Tabs value={billMode} onValueChange={v => setBillMode(v as 'fast' | 'detailed')} className="w-full">
          <TabsList className="w-full h-11 bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="fast"
              className="flex-1 h-full text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Fast Amount Only
            </TabsTrigger>
            <TabsTrigger value="detailed"
              className="flex-1 h-full text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Detailed Items
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* FAST MODE */}
      {!isExpenseType && isFastMode && (
        <div className="space-y-6">
          <div className="space-y-1.5 bg-primary/5 border border-primary/10 p-4 rounded-xl">
            <Label className="text-primary font-semibold">
              Total Amount <span className="text-destructive">
              *</span>
            </Label>
            <Input
              type="number" placeholder="0.00" value={fastAmount}
              onChange={e => setFastAmount(e.target.value)}
              className="h-14 text-2xl font-bold rounded-xl border-primary/20"
            />
          </div>

          {/* Reference doc for fast mode */}
          {renderReferenceSection()}

          {/* Consignee */}
          {hasConsignee && (
            <div className="space-y-1.5">
              <Label>Consignee <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span></Label>
              <SearchableSelect
                options={consigneeOptions} value={consigneeId} onChange={setConsigneeId}
                placeholder="Select consignee" title="Select Consignee"
                searchPlaceholder="Search contacts..." clearable
              />
            </div>
          )}

          {/* Payment account */}
          {showPaymentAccount && (
            <div className="space-y-1.5">
              <Label>Payment Account <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span></Label>
              <SearchableSelect
                options={accountOptions} value={paymentAccountId} onChange={setPaymentAccountId}
                placeholder="Select account" title="Select Payment Account"
                searchPlaceholder="Search accounts..." clearable
              />
            </div>
          )}

          {/* Due date + payment terms */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Due Date <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span></Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Terms <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span></Label>
              <Input placeholder="e.g. Net 30" value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)} className="h-11 rounded-xl" />
            </div>
          </div>

          {renderAttachmentsSection()}

          <div className="space-y-1.5">
            <Label>Notes <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span></Label>
            <Input placeholder="Internal remarks..." value={notes}
              onChange={e => setNotes(e.target.value)} className="h-11 rounded-xl" />
          </div>
        </div>
      )}

      {/* DETAILED LINE ITEMS MODE */}
      {!isExpenseType && !isFastMode && hasLineItems && (
        <div className="space-y-6">

          {/* Reference doc */}
          {renderReferenceSection()}

          {/* Consignee */}
          {hasConsignee && (
            <div className="space-y-1.5">
              <Label>Consignee <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span></Label>
              <SearchableSelect
                options={consigneeOptions} value={consigneeId} onChange={setConsigneeId}
                placeholder="Select consignee" title="Select Consignee"
                searchPlaceholder="Search contacts..." clearable
              />
            </div>
          )}

          {/* Line items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Line Items
              </Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm"
                  className="h-8 gap-1.5 text-xs rounded-lg px-2.5 bg-muted/40"
                  onClick={() => setProductPickerOpen(true)}>
                  <Package className="h-3.5 w-3.5" /> Products
                </Button>
                <Button variant="ghost" size="sm"
                  className="h-8 gap-1.5 text-xs rounded-lg px-2.5 bg-muted/40"
                  onClick={addLineItem}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
            </div>

            {lineItems.map((item, idx) => (
              <Card key={item.key} className="border border-border/60 shadow-none rounded-xl overflow-hidden">
                <CardContent className="p-3 space-y-2">
                  {/* Row header */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground w-5 shrink-0">
                      #{idx + 1}
                    </span>
                    {docType !== 'challan' && (
                      <SearchableSelect
                        options={productOptions}
                        value={item.product_id ? String(item.product_id) : ''}
                        onChange={v => onProductSelect(item.key, v)}
                        placeholder="Product (optional)"
                        title="Select Product"
                        searchPlaceholder="Search products..."
                        clearable
                        className="flex-1"
                      />
                    )}
                    {lineItems.length > 1 && (
                      <button onClick={() => removeLineItem(item.key)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Name */}
                  <Input
                    placeholder="Item name / description"
                    value={item.name}
                    onChange={e => updateLineItem(item.key, 'name', e.target.value)}
                    className="h-10 rounded-lg text-sm"
                  />

                  {/* Qty × Rate = Amount */}
                  {docType !== 'challan' && (
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 space-y-0.5">
                        <p className="text-[10px] text-muted-foreground font-medium px-0.5">Qty</p>
                        <Input
                          type="number" placeholder="1"
                          value={item.quantity ?? ''}
                          onChange={e => updateLineItem(item.key, 'quantity', Number(e.target.value))}
                          className="h-10 rounded-lg text-sm text-center font-medium"
                        />
                      </div>
                      <span className="text-muted-foreground text-sm mt-4">×</span>
                      <div className="flex-1 space-y-0.5">
                        <p className="text-[10px] text-muted-foreground font-medium px-0.5">Rate</p>
                        <Input
                          type="number" placeholder="0.00"
                          value={item.rate ?? ''}
                          onChange={e => updateLineItem(item.key, 'rate', Number(e.target.value))}
                          className="h-10 rounded-lg text-sm font-medium"
                        />
                      </div>
                      <span className="text-muted-foreground text-sm mt-4">=</span>
                      <div className="flex-1 space-y-0.5">
                        <p className="text-[10px] text-muted-foreground font-medium px-0.5">Amount</p>
                        <Input
                          type="number" placeholder="0.00"
                          value={item.amount ?? ''}
                          onChange={e => updateLineItem(item.key, 'amount', Number(e.target.value))}
                          className="h-10 rounded-lg text-sm font-bold"
                        />
                      </div>
                    </div>
                  )}

                  {/* HSN */}
                  {docType !== 'challan' && (
                    <Input
                      placeholder="HSN code (optional)"
                      value={item.hsn ?? ''}
                      onChange={e => updateLineItem(item.key, 'hsn', e.target.value)}
                      className="h-9 rounded-lg text-xs text-muted-foreground"
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charges / Taxes / Discount toggle */}
          {docType !== 'challan' && (
            <button
              type="button"
              onClick={() => setShowCharges(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-dashed border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors text-sm font-medium text-muted-foreground"
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Charges, Taxes & Discount
                {(charges.length > 0 || taxes.length > 0 || discountAmt > 0) && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {charges.length + taxes.length + (discountAmt > 0 ? 1 : 0)}
                  </Badge>
                )}
              </span>
              {showCharges
                ? <ChevronUp className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />}
            </button>
          )}

          {showCharges && docType !== 'challan' && (
            <div className="space-y-4 p-4 rounded-xl border bg-muted/10">

              {/* Charges */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Extra Charges
                  </Label>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2 bg-muted/40 rounded-lg"
                    onClick={addCharge}>
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
                {charges.map((c, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input placeholder="e.g. Freight, Packing..."
                      value={c.name} onChange={e => updateCharge(i, 'name', e.target.value)}
                      className="flex-1 h-10 rounded-lg text-sm" />
                    <Input type="number" placeholder="0.00"
                      value={c.amount || ''} onChange={e => updateCharge(i, 'amount', e.target.value)}
                      className="w-28 h-10 rounded-lg text-sm font-semibold" />
                    <button onClick={() => removeCharge(i)}
                      className="p-1.5 text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {charges.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No charges added</p>
                )}
              </div>

              <Separator />

              {/* Discount */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Discount (flat ₹)
                </Label>
                <Input
                  type="number" placeholder="0.00"
                  value={discount} onChange={e => setDiscount(e.target.value)}
                  className="h-10 rounded-lg text-sm font-semibold"
                />
              </div>

              <Separator />

              {/* Taxes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Taxes (%)
                  </Label>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2 bg-muted/40 rounded-lg"
                    onClick={addTax}>
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
                {taxes.map((t, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input placeholder="e.g. GST 18%, IGST..."
                      value={t.name} onChange={e => updateTax(i, 'name', e.target.value)}
                      className="flex-1 h-10 rounded-lg text-sm" />
                    <Input type="number" placeholder="0" min={0} max={100}
                      value={t.percentage || ''} onChange={e => updateTax(i, 'percentage', e.target.value)}
                      className="w-20 h-10 rounded-lg text-sm font-semibold" />
                    <button onClick={() => removeTax(i)}
                      className="p-1.5 text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {taxes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No taxes added</p>
                )}
              </div>
            </div>
          )}

          {/* Grand Total card */}
          {docType !== 'challan' && (
            <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
              {lineTotal > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Items subtotal</span>
                  <span className="font-medium">{fmtAmount(lineTotal)}</span>
                </div>
              )}
              {chargeTotal > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Charges</span>
                  <span className="font-medium">+ {fmtAmount(chargeTotal)}</span>
                </div>
              )}
              {discountAmt > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Discount</span>
                  <span className="font-medium text-green-600">− {fmtAmount(discountAmt)}</span>
                </div>
              )}
              {taxTotal > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tax</span>
                  <span className="font-medium">+ {fmtAmount(taxTotal)}</span>
                </div>
              )}
              {(chargeTotal > 0 || discountAmt > 0 || taxTotal > 0) && <Separator />}
              <div className="flex justify-between items-center">
                <span className="text-base font-bold">Grand Total</span>
                <span className="text-xl font-black text-primary">{fmtAmount(grandTotal)}</span>
              </div>
            </div>
          )}

          {/* Payment account */}
          {showPaymentAccount && (
            <div className="space-y-1.5">
              <Label>Payment Account <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span></Label>
              <SearchableSelect
                options={accountOptions} value={paymentAccountId} onChange={setPaymentAccountId}
                placeholder="Select account" title="Select Payment Account"
                searchPlaceholder="Search accounts..." clearable
              />
            </div>
          )}

          {/* Due date + payment terms */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Due Date <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span></Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Terms <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span></Label>
              <Input placeholder="e.g. Net 30" value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)} className="h-11 rounded-xl" />
            </div>
          </div>

          {renderAttachmentsSection()}

          <div className="space-y-1.5">
            <Label>Notes <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span></Label>
            <Input placeholder="Internal remarks..." value={notes}
              onChange={e => setNotes(e.target.value)} className="h-11 rounded-xl" />
          </div>
        </div>
      )}

      {/* NON-LINE-ITEM DOCS — vouchers, po, pi, quotation, challan ref only */}
      {!isExpenseType && !hasLineItems && !isVoucher && (
        <div className="space-y-6">
          {renderReferenceSection()}

          {renderAttachmentsSection()}

          <div className="space-y-1.5">
            <Label>Notes <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span></Label>
            <Input placeholder="Internal remarks..." value={notes}
              onChange={e => setNotes(e.target.value)} className="h-11 rounded-xl" />
          </div>
        </div>
      )}

      {/* VOUCHER MODE */}
      {isVoucher && (
        <div className="space-y-6">
          <div className="space-y-1.5 bg-primary/5 border border-primary/10 p-4 rounded-xl">
            <Label className="text-primary font-semibold">
              Amount <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number" placeholder="0.00" value={voucherAmount}
              onChange={e => setVoucherAmount(e.target.value)}
              className="h-14 text-2xl font-bold rounded-xl border-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Payment Account <span className="text-destructive">*</span></Label>
            <SearchableSelect
              options={accountOptions} value={paymentAccountId} onChange={setPaymentAccountId}
              placeholder="Select account" title="Select Payment Account"
              searchPlaceholder="Search accounts..." clearable
            />
          </div>

          {renderAttachmentsSection()}

          <div className="space-y-1.5">
            <Label>Notes <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span></Label>
            <Input placeholder="Internal remarks..." value={notes}
              onChange={e => setNotes(e.target.value)} className="h-11 rounded-xl" />
          </div>
        </div>
      )}

      {/* ── SUBMIT BUTTON ─────────────────────────────────────────────────────── */}
      <Button
        className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 gap-2"
        disabled={isSubmitting}
        onClick={handleSubmit}
      >
        {isSubmitting
          ? 'Creating...'
          : `Create ${getDocLabel(docType)}`}
      </Button>

      {/* ── SHEETS ────────────────────────────────────────────────────────────── */}
      <LineItemPickerSheet
        open={pickerOpen}
        items={refDoc?.line_items ?? []}
        onConfirm={handlePickerConfirm}
        onClose={() => setPickerOpen(false)}
      />

      <ProductMultiPickerSheet
        open={productPickerOpen}
        products={products}
        onConfirm={handleProductPickerConfirm}
        onClose={() => setProductPickerOpen(false)}
      />

      <FilePreviewSheet
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        files={attachmentUrls}
        initialIndex={previewIndex}
      />

    </div>
  )
}
