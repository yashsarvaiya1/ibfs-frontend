'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useDocuments } from '@/hooks/useDocument'
import { useContacts } from '@/hooks/useContact'
import { useSettings } from '@/hooks/useSettings'
import { SearchableSelect } from '@/components/shared/common/SearchableSelect'
import { DOC_TYPE_LABELS, DocumentType } from '@/models/document'
import { fmtAmount, fmtDate, cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import {
  Search, ChevronRight, ChevronLeft, FileText, Trash2,
  CheckCircle2, Clock, AlertCircle,
  SlidersHorizontal, X, Check, Printer, Download, Loader2,
  ZoomIn, ZoomOut,
} from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { env } from 'next-runtime-env'
import { toast } from 'sonner'
import type { Settings } from '@/models/settings'
 
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()


// ─── Types & constants ────────────────────────────────────────────────────────

const PAGE_SIZE = 5

const BASE_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Bills',    value: 'bill' },
  { label: 'Invoices', value: 'invoice' },
]

const OPTIONAL_TYPE_OPTIONS: {
  label: string; value: DocumentType; flag: keyof Settings
}[] = [
  { label: 'PO',           value: 'po',                   flag: 'enable_po' },
  { label: 'Proforma',     value: 'pi',                   flag: 'enable_pi' },
  { label: 'Quotation',    value: 'quotation',            flag: 'enable_quotation' },
  { label: 'Challan',      value: 'challan',              flag: 'enable_challan' },
  { label: 'Credit Note',  value: 'cn',                   flag: 'enable_cn' },
  { label: 'Debit Note',   value: 'dn',                   flag: 'enable_dn' },
  { label: 'Interest',     value: 'interest',             flag: 'enable_interest' },
  { label: 'Pay Voucher',  value: 'cash_payment_voucher', flag: 'enable_vouchers' },
  { label: 'Recv Voucher', value: 'cash_receipt_voucher', flag: 'enable_vouchers' },
]

const TYPE_BADGE_COLORS: Record<string, string> = {
  bill:                  'bg-orange-100 text-orange-700 border-orange-200',
  invoice:               'bg-blue-100 text-blue-700 border-blue-200',
  po:                    'bg-purple-100 text-purple-700 border-purple-200',
  pi:                    'bg-indigo-100 text-indigo-700 border-indigo-200',
  cn:                    'bg-green-100 text-green-700 border-green-200',
  dn:                    'bg-red-100 text-red-700 border-red-200',
  challan:               'bg-yellow-100 text-yellow-700 border-yellow-200',
  expense:               'bg-gray-100 text-gray-700 border-gray-200',
  interest:              'bg-pink-100 text-pink-700 border-pink-200',
  cash_payment_voucher:  'bg-teal-100 text-teal-700 border-teal-200',
  cash_receipt_voucher:  'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const HAS_BALANCE = new Set(['bill', 'invoice', 'cn', 'dn'])

type PaymentFilter = '' | 'paid' | 'unpaid' | 'partial' | 'due'

const PAYMENT_FILTERS = [
  { label: 'All',     value: '' },
  { label: 'Paid',    value: 'paid' },
  { label: 'Unpaid',  value: 'unpaid' },
  { label: 'Partial', value: 'partial' },
  { label: 'Due',     value: 'due' },
] as const

function getApiBase(): string {
  const raw = env('NEXT_PUBLIC_API_URL') ?? 'http://localhost:8000/api'
  return raw.replace(/\/$/, '')
}

function countActiveFilters(opts: {
  selectedTypes:  string[]
  dateFrom:       string
  dateTo:         string
  paymentFilter:  PaymentFilter
  showDeleted:    boolean
  filterContact:  string
}) {
  let n = 0
  if (opts.selectedTypes.length > 0) n++
  if (opts.dateFrom)                  n++
  if (opts.dateTo)                    n++
  if (opts.paymentFilter)             n++
  if (opts.showDeleted)               n++
  if (opts.filterContact)             n++
  return n
}


// ─── DocPrintSheet ────────────────────────────────────────────────────────────

interface DocPrintSheetProps {
  open:        boolean
  onClose:     () => void
  title:       string
  url:         string
  fetchBody?:  object
  method?:     'GET' | 'POST'
}

function DocPrintSheet({
  open, onClose, title, url, fetchBody, method = 'GET',
}: DocPrintSheetProps) {
  const [blobUrl,    setBlobUrl]    = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [pdfReady,   setPdfReady]   = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [numPages,   setNumPages]   = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale,      setScale]      = useState(1.0)
 
  const MIN_SCALE = 1.0
  const MAX_SCALE = 3.0
 
  const containerRef    = useRef<HTMLDivElement>(null)
  const [baseWidth,     setBaseWidth]  = useState(0)
  const pinchStartDist  = useRef<number | null>(null)
  const pinchStartScale = useRef(1.0)
 
  // Measure after sheet animation settles (350ms)
  useEffect(() => {
    if (!open) return
    const measure = () => {
      const el = containerRef.current
      if (!el) return
      const w = el.getBoundingClientRect().width
      if (w > 0) setBaseWidth(Math.floor(w))
    }
    const t = setTimeout(measure, 350)
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => { clearTimeout(t); ro.disconnect() }
  }, [open])
 
  useEffect(() => {
    if (open) {
      if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null) }
      setPdfReady(false)
      setError(null)
      setNumPages(0)
      setPageNumber(1)
      setScale(1.0)
      fetchPDF()
    } else {
      if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null) }
      setPdfReady(false)
    }
  }, [open, url]) // eslint-disable-line react-hooks/exhaustive-deps
 
  const fetchPDF = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method,
        credentials: 'include',
        ...(method === 'POST' && fetchBody
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fetchBody) }
          : {}),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      setBlobUrl(URL.createObjectURL(blob))
    } catch (err) {
      console.error('Doc PDF error:', err)
      setError('Failed to load PDF')
      toast.error('Failed to load PDF')
    } finally {
      setLoading(false)
    }
  }
 
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPageNumber(1)
  }, [])
 
  const onPageRenderSuccess = useCallback(() => {
    setPdfReady(true)
  }, [])
 
  const handlePrint = () => {
    if (!blobUrl) return
    const win = window.open(blobUrl, '_blank')
    if (win) win.onload = () => win.print()
  }
 
  const handleDownload = () => {
    if (!blobUrl) return
    const a    = document.createElement('a')
    a.href     = blobUrl
    a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
 
  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6 h-[92vh] flex flex-col">
        <SheetHeader className="mb-3 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-left">{title}</SheetTitle>
            <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-full hover:bg-muted/60 transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </SheetHeader>
 
        {/* PDF area */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 w-full overflow-auto rounded-xl border bg-muted/30 shadow-inner mb-3 relative block"
          onTouchStart={e => {
            if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX
              const dy = e.touches[0].clientY - e.touches[1].clientY
              pinchStartDist.current = Math.hypot(dx, dy)
              pinchStartScale.current = scale
            }
          }}
          onTouchMove={e => {
            // Only prevent default if pinching (2 fingers)
            if (e.touches.length === 2 && pinchStartDist.current !== null) {
              e.preventDefault()
              const dx = e.touches[0].clientX - e.touches[1].clientX
              const dy = e.touches[0].clientY - e.touches[1].clientY
              const dist = Math.hypot(dx, dy)
              const next = pinchStartScale.current * (dist / pinchStartDist.current)
              setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, next)))
            }
          }}
          onTouchEnd={() => { pinchStartDist.current = null }}
          // IMPORTANT: Changed to 'auto' or 'pan-x pan-y' to allow the browser to pan the overflow
          style={{ touchAction: scale > 1.05 ? 'pan-x pan-y' : 'auto' }}
        >
          {/* Loading & Error States remain the same... */}

          {/* react-pdf with FIXED CSS scale zoom */}
          {blobUrl && baseWidth > 0 && (
            <div 
              style={{ 
                transform: `scale(${scale})`, 
                transformOrigin: '0 0', // Top Left is essential for scroll logic
                width: baseWidth,       // Fixed width
                height: 'auto',
                display: 'block'
              }}
            >
              <Document
                file={blobUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={err => setError(`Render error: ${err.message}`)}
                loading={null}
                className="block"
              >
                <Page
                  pageNumber={pageNumber}
                  width={baseWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onRenderSuccess={onPageRenderSuccess}
                  onRenderError={err => setError(`Page error: ${err.message}`)}
                />
              </Document>
            </div>
          )}
          
          {/* Sizing Spacer: This invisible div forces the parent to scroll */}
          {scale > 1 && (
            <div 
              style={{ 
                width: baseWidth * scale, 
                height: (baseWidth * 1.41) * scale, // Adjust 1.41 if your PDF isn't A4
                pointerEvents: 'none' 
              }} 
            />
          )}
        </div>
 
        {/* Controls */}
        <div className="flex gap-2 shrink-0 items-center">
          <Button variant="outline" className="flex-1 gap-2" onClick={handlePrint} disabled={loading || !pdfReady}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          {pdfReady && numPages > 1 && (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}
                className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-25 hover:bg-muted">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[11px] font-bold tabular-nums bg-muted px-1.5 py-1 rounded-full min-w-9 text-center">
                {pageNumber}/{numPages}
              </span>
              <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}
                className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-25 hover:bg-muted">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          {pdfReady && (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setScale(s => Math.max(MIN_SCALE, +(s - 0.3).toFixed(1)))} disabled={scale <= MIN_SCALE}
                className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-25 hover:bg-muted">
                <ZoomOut className="h-4 w-4" />
              </button>
              <button onClick={() => setScale(s => Math.min(MAX_SCALE, +(s + 0.3).toFixed(1)))} disabled={scale >= MAX_SCALE}
                className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-25 hover:bg-muted">
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          )}
          <Button className="flex-1 gap-2" onClick={handleDownload} disabled={loading || !blobUrl}>
            <Download className="h-4 w-4" /> Save PDF
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}


// ─── DocumentsPage ────────────────────────────────────────────────────────────

export function DocumentsPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const setPageTitle = useUIStore(s => s.setPageTitle)

  useEffect(() => setPageTitle('Documents'), [setPageTitle])

  const { data: settings }     = useSettings()
  const { data: contactsData } = useContacts()
  const allContacts             = contactsData?.results ?? []

  // ── URL params ─────────────────────────────────────────────────────────────
  const urlContact = searchParams.get('contact')
  const urlType    = searchParams.get('type')

  // ── Applied filters ────────────────────────────────────────────────────────
  const [page,          setPage]          = useState(1)
  const [search,        setSearch]        = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>(() =>
    urlType ? [urlType] : [],
  )
  const [showDeleted,   setShowDeleted]   = useState(false)
  const [dateFrom,      setDateFrom]      = useState('')
  const [dateTo,        setDateTo]        = useState('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('')
  const [filterContact, setFilterContact] = useState<string>(urlContact ?? '')

  // ── Filter sheet staged ────────────────────────────────────────────────────
  const [filterOpen,        setFilterOpen]       = useState(false)
  const [stagedTypes,       setStagedTypes]      = useState<string[]>([])
  const [stagedDateFrom,    setStagedDateFrom]   = useState('')
  const [stagedDateTo,      setStagedDateTo]     = useState('')
  const [stagedPayment,     setStagedPayment]    = useState<PaymentFilter>('')
  const [stagedShowDeleted, setStagedShowDeleted]= useState(false)
  const [stagedContact,     setStagedContact]    = useState('')

  // ── Print state ────────────────────────────────────────────────────────────
  const [bulkPrintOpen,  setBulkPrintOpen]  = useState(false)
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([])
  const [isSelectMode,   setIsSelectMode]   = useState(false)
  const [isAllPagesSelected, setIsAllPagesSelected] = useState(false) 

  const stagedPaymentApplicable =
  stagedTypes.length === 0 || stagedTypes.every(t => HAS_BALANCE.has(t))

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [
    search, selectedTypes, showDeleted, dateFrom,
    dateTo, paymentFilter, filterContact,
  ])

  // ── Filter sheet handlers ──────────────────────────────────────────────────
  const handleOpenFilter = () => {
    setStagedTypes([...selectedTypes])
    setStagedDateFrom(dateFrom)
    setStagedDateTo(dateTo)
    setStagedPayment(paymentFilter)
    setStagedShowDeleted(showDeleted)
    setStagedContact(filterContact)
    setFilterOpen(true)
  }

  const handleApplyFilters = () => {
    const paymentApplicable =
      stagedTypes.length === 0 || stagedTypes.every(t => HAS_BALANCE.has(t))
    setSelectedTypes(stagedTypes)
    setDateFrom(stagedDateFrom)
    setDateTo(stagedDateTo)
    setPaymentFilter(paymentApplicable ? stagedPayment : '')  // ← reset if incompatible
    setShowDeleted(stagedShowDeleted)
    setFilterContact(stagedContact)
    setPage(1)
    setFilterOpen(false)
  }

  const handleClearStaged = () => {
    setStagedTypes([])
    setStagedDateFrom('')
    setStagedDateTo('')
    setStagedPayment('')
    setStagedShowDeleted(false)
    setStagedContact('')
  }

  const handleResetAll = () => {
    setSelectedTypes([])
    setDateFrom('')
    setDateTo('')
    setPaymentFilter('')
    setShowDeleted(false)
    setFilterContact('')
    setPage(1)
  }

  const toggleStagedType = (val: string) =>
    setStagedTypes(prev => {
      const next = prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]
      // Adding a non-balance type → payment filter no longer valid
      if (!prev.includes(val) && !HAS_BALANCE.has(val)) setStagedPayment('')
      return next
    })

    const handleStagedPaymentChange = (val: PaymentFilter) => {
      setStagedPayment(val)
      if (val) {
        // Drop any staged types that don't support payment status
        setStagedTypes(prev => prev.filter(t => HAS_BALANCE.has(t)))
      }
    }

  // ── All type options (driven by settings) ──────────────────────────────────
  const allTypeOptions = useMemo(() => [
    ...BASE_TYPE_OPTIONS,
    ...OPTIONAL_TYPE_OPTIONS.filter(f => settings?.[f.flag]),
    { label: 'Expense', value: 'expense' },
  ], [settings])

  // ── Contact options ────────────────────────────────────────────────────────
  const contactOptions = allContacts.map(c => ({
    value:    String(c.id),
    label:    c.company_name || c.contact_name,
    sublabel: c.company_name ? c.contact_name : undefined,
  }))

  const resolvedContact     = filterContact
    ? allContacts.find(c => String(c.id) === filterContact)
    : null
  const resolvedContactName = resolvedContact
    ? resolvedContact.company_name || resolvedContact.contact_name
    : filterContact ? `Contact #${filterContact}` : ''

  // ── Query params ───────────────────────────────────────────────────────────
  const queryParams = useMemo(() => {
    const p: Record<string, unknown> = {
      search:    search    || undefined,
      contact:   filterContact ? Number(filterContact) : undefined,
      is_active: showDeleted ? 'false' : 'true',
      ordering:  '-date,-created_at',
      page,
      page_size: PAGE_SIZE,
    }

    // ── Multi-type: comma-separated → backend uses type__in ──────────────────
    if (selectedTypes.length === 1)    p.type = selectedTypes[0]
    else if (selectedTypes.length > 1) p.type = selectedTypes.join(',')

    if (dateFrom) p.date_from = dateFrom
    if (dateTo)   p.date_to   = dateTo

    // Partial is handled client-side; paid/unpaid go to backend
    if (paymentFilter === 'paid')   p.is_paid = 'true'
    if (paymentFilter === 'unpaid') p.is_paid = 'false'
    // Bug #4: due filter — backend handles via is_due=true
    if (paymentFilter === 'due')    p.is_due  = 'true'

    return p
  }, [
    search, filterContact, showDeleted, selectedTypes,
    dateFrom, dateTo, paymentFilter, page,
  ])

  const { data, isLoading } = useDocuments(queryParams)
  const allDocs    = data?.results ?? []
  const totalCount = data?.count   ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const hasPrev    = page > 1
  const hasNext    = page < totalPages

  // Client-side partial filter (only applied on current page results)
  const docs = useMemo(() => {
    if (paymentFilter !== 'partial') return allDocs
    return allDocs.filter(doc => {
      if (!HAS_BALANCE.has(doc.type)) return false
      const ps = doc.payment_status
      if (!ps)  return false
      const isPaid = doc.is_paid || ps.is_paid
      if (isPaid)  return false
      const rem   = Number(ps.remaining)
      const total = Number(doc.total_amount)
      return rem > 0 && rem < total
    })
  }, [allDocs, paymentFilter])

  // ── Counts ─────────────────────────────────────────────────────────────────
  const activeFilterCount = countActiveFilters({
    selectedTypes, dateFrom, dateTo, paymentFilter, showDeleted, filterContact,
  })
  const stagedFilterCount = countActiveFilters({
    selectedTypes: stagedTypes, dateFrom: stagedDateFrom,
    dateTo: stagedDateTo, paymentFilter: stagedPayment,
    showDeleted: stagedShowDeleted, filterContact: stagedContact,
  })
  const hasAnyFilter     = activeFilterCount > 0 || !!search
  const dateRangeInvalid = !!(
    stagedDateFrom && stagedDateTo &&
    new Date(stagedDateFrom) > new Date(stagedDateTo)
  )

  // ── Bulk print ─────────────────────────────────────────────────────────────
  const bulkPrintUrl = useMemo(() => {
    const base = `${getApiBase()}/documents/bulk_print/`
    
    // Specific docs selected → no query params needed, ids go in POST body
    if (selectedDocIds.length > 0) return base

    // Print all matching → pass active filters as query string
    // so backend's filter_queryset() picks them up exactly like the list view
    const params = new URLSearchParams()

    if (search)        params.set('search', search)
    if (filterContact) params.set('contact', filterContact)

    params.set('is_active', showDeleted ? 'false' : 'true')
    params.set('ordering', '-date,-created_at')

    if (selectedTypes.length === 1)    params.set('type', selectedTypes[0])
    else if (selectedTypes.length > 1) params.set('type', selectedTypes.join(','))

    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo)   params.set('date_to', dateTo)

    if (paymentFilter === 'paid')   params.set('is_paid', 'true')
    if (paymentFilter === 'unpaid') params.set('is_paid', 'false')
    if (paymentFilter === 'due')    params.set('is_due',  'true')

    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
  }, [
    selectedDocIds, search, filterContact, showDeleted,
    selectedTypes, dateFrom, dateTo, paymentFilter,
  ])
  const bulkPrintBody = isAllPagesSelected || selectedDocIds.length === 0
  ? {}
  : { ids: selectedDocIds } 

  const toggleSelectMode = () => {
    setIsSelectMode(v => !v)
    setSelectedDocIds([])
    setIsAllPagesSelected(false)
  }

  const toggleDocSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setIsAllPagesSelected(false)
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    )
  }

  const selectCurrentPage = () => {
    setIsAllPagesSelected(false)
    setSelectedDocIds(docs.map(d => d.id))
  }

  const selectAllPages = () => {
    setIsAllPagesSelected(true)
    setSelectedDocIds([])
  }

  const deselectAll = () => {
    setIsAllPagesSelected(false)
    setSelectedDocIds([])
  }

  const selectAll = () => setSelectedDocIds(docs.map(d => d.id))


  return (
    <div className="pb-10">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by doc ID, contact..."
              className="pl-9 h-11 rounded-xl"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Bulk print toggle */}
          <button
            onClick={toggleSelectMode}
            className={cn(
              'flex items-center justify-center h-11 w-11 rounded-xl border transition-colors shrink-0',
              isSelectMode
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
            )}
            title={isSelectMode ? 'Exit select mode' : 'Select to bulk print'}
          >
            <Printer className="h-4 w-4" />
          </button>

          {/* Filter */}
          <button
            onClick={handleOpenFilter}
            className={cn(
              'relative flex items-center justify-center h-11 w-11 rounded-xl border transition-colors shrink-0',
              activeFilterCount > 0
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Bulk print toolbar */}
        {isSelectMode && (
            <div className="mt-2 px-1 space-y-2">
              <div className="flex items-center justify-between">
                
                {/* Left: selection status */}
                <div className="flex items-center gap-2 flex-wrap">
                  {isAllPagesSelected ? (
                    <span className="text-xs font-semibold text-primary">
                      ✓ All {totalCount} documents selected
                    </span>
                  ) : selectedDocIds.length > 0 ? (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {selectedDocIds.length} of {docs.length} selected
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">
                      Tap documents to select
                    </span>
                  )}

                  {/* Deselect */}
                  {(isAllPagesSelected || selectedDocIds.length > 0) && (
                    <button
                      onClick={deselectAll}
                      className="text-xs font-bold text-muted-foreground underline underline-offset-2"
                    >
                      Deselect
                    </button>
                  )}
                </div>

                {/* Right: Print button */}
                <Button
                  size="sm" className="h-8 gap-1.5 shrink-0"
                  onClick={() => setBulkPrintOpen(true)}
                  disabled={!isAllPagesSelected && selectedDocIds.length === 0 && docs.length === 0}
                >
                  <Printer className="h-3.5 w-3.5" />
                  {isAllPagesSelected
                    ? `Print All (${totalCount})`
                    : selectedDocIds.length > 0
                    ? `Print ${selectedDocIds.length}`
                    : `Print All (${totalCount})`}
                </Button>
              </div>

              {/* Second row: page selection actions */}
              <div className="flex items-center gap-3">
                {/* Select current page */}
                {!isAllPagesSelected && selectedDocIds.length < docs.length && (
                  <button
                    onClick={selectCurrentPage}
                    className="text-xs font-bold text-primary underline underline-offset-2"
                  >
                    Select this page ({docs.length})
                  </button>
                )}

                {/* Upgrade to all pages — shown only when current page is fully selected */}
                {!isAllPagesSelected && totalPages > 1 && selectedDocIds.length === docs.length && docs.length > 0 && (
                  <button
                    onClick={selectAllPages}
                    className="text-xs font-bold text-primary underline underline-offset-2"
                  >
                    Select all {totalCount} across all pages →
                  </button>
                )}

                {/* Or directly select all pages */}
                {!isAllPagesSelected && selectedDocIds.length < docs.length && totalPages > 1 && (
                  <button
                    onClick={selectAllPages}
                    className="text-xs font-bold text-muted-foreground underline underline-offset-2"
                  >
                    Select all {totalCount}
                  </button>
                )}
              </div>
            </div>
          )}

      </div>

      {/* ── Active filter pills ──────────────────────────────────────────────── */}
      {activeFilterCount > 0 && (
        <div className="mx-4 mb-3 flex items-center gap-2 flex-wrap">
          {selectedTypes.map(t => (
            <span
              key={t}
              className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg"
            >
              {allTypeOptions.find(o => o.value === t)?.label ?? t}
              <button
                onClick={() => setSelectedTypes(prev => prev.filter(x => x !== t))}
                className="ml-0.5 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {filterContact && (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg">
              👤 {resolvedContactName}
              <button
                onClick={() => setFilterContact('')}
                className="ml-0.5 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {paymentFilter && (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg">
              {PAYMENT_FILTERS.find(p => p.value === paymentFilter)?.label}
              <button
                onClick={() => setPaymentFilter('')}
                className="ml-0.5 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {dateFrom && (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg">
              From: {fmtDate(dateFrom)}
              <button onClick={() => setDateFrom('')} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {dateTo && (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg">
              To: {fmtDate(dateTo)}
              <button onClick={() => setDateTo('')} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {showDeleted && (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 px-2.5 py-1 rounded-lg">
              Deleted
              <button onClick={() => setShowDeleted(false)} className="ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            onClick={handleResetAll}
            className="text-[11px] font-bold text-muted-foreground underline underline-offset-2 hover:text-destructive ml-auto"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Total count ──────────────────────────────────────────────────────── */}
      {!isLoading && totalCount > 0 && (
        <div className="px-4 mb-2">
          <p className="text-[11px] text-muted-foreground">
            {totalCount} document{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* ── Document list ────────────────────────────────────────────────────── */}
      <div className="px-4 space-y-2.5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : docs.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              {showDeleted ? 'No deleted documents found' : 'No documents found'}
            </p>
            {hasAnyFilter && (
              <button
                onClick={handleResetAll}
                className="mt-3 text-xs font-bold text-primary underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          docs.map(doc => {
            const payStatus  = HAS_BALANCE.has(doc.type) ? doc.payment_status : null
            const isPaid     = doc.is_paid || (payStatus?.is_paid ?? false)
            const remaining  = payStatus ? Number(payStatus.remaining) : 0
            const hasBalance = payStatus !== null && Number(doc.total_amount) > 0
            const isSelected = isAllPagesSelected || selectedDocIds.includes(doc.id)

            return (
              <Card
                key={doc.id}
                className={cn(
                  'cursor-pointer active:scale-[0.99] transition-all rounded-xl shadow-sm',
                  !doc.is_active
                    ? 'opacity-70 bg-muted/40 border-dashed'
                    : isSelected
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'hover:bg-muted/20 border-border',
                )}
                onClick={e => {
                  if (isSelectMode) {
                    toggleDocSelect(doc.id, e)
                  } else {
                    router.push(`/documents/${doc.id}`)
                  }
                }}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  {isSelectMode && (
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-border bg-background',
                    )}>
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={cn(
                        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0',
                        TYPE_BADGE_COLORS[doc.type] ?? 'bg-muted text-muted-foreground border-border',
                      )}>
                        {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                      </span>

                      {hasBalance && isPaid && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-md shrink-0">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Paid
                        </span>
                      )}
                      {hasBalance && !isPaid && remaining > 0 && remaining < Number(doc.total_amount) && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-md shrink-0">
                          <Clock className="h-2.5 w-2.5" /> Partial
                        </span>
                      )}
                      {hasBalance && !isPaid && remaining >= Number(doc.total_amount) && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded-md shrink-0">
                          <AlertCircle className="h-2.5 w-2.5" /> Unpaid
                        </span>
                      )}
                      {hasBalance && !isPaid && doc.due_date && new Date(doc.due_date) < new Date() && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded-md shrink-0">
                          <AlertCircle className="h-2.5 w-2.5" /> Due
                        </span>
                      )}
                      {!doc.is_active && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] h-5 rounded-md px-1.5 font-semibold shrink-0"
                        >
                          Deleted
                        </Badge>
                      )}
                    </div>

                    <p className="font-semibold text-sm text-foreground/90">#{doc.doc_id}</p>
                    {doc.contact_name ? (
                      <p className="text-xs text-muted-foreground truncate mt-0.5 font-medium">
                        {doc.contact_name}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/50 truncate mt-0.5 italic">
                        No contact
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {fmtDate(doc.date)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end justify-center gap-1 shrink-0">
                    <p className="text-base font-bold tracking-tight">
                      {doc.total_amount ? fmtAmount(doc.total_amount) : '—'}
                    </p>
                    {hasBalance && !isPaid && remaining > 0 && remaining < Number(doc.total_amount) && (
                      <p className="text-[10px] font-semibold text-amber-600">
                        Due {fmtAmount(remaining)}
                      </p>
                    )}
                    {!isSelectMode && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <Button
            variant="outline" size="sm"
            className="h-9 gap-1.5 rounded-xl"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={!hasPrev}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </Button>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-bold tabular-nums">{page} / {totalPages}</span>
            <span className="text-[10px] text-muted-foreground">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
            </span>
          </div>
          <Button
            variant="outline" size="sm"
            className="h-9 gap-1.5 rounded-xl"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={!hasNext}
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* ── Bulk print sheet ─────────────────────────────────────────────────── */}
      <DocPrintSheet
        open={bulkPrintOpen}
        onClose={() => setBulkPrintOpen(false)}
        title={
          isAllPagesSelected
            ? `Bulk Print — All ${totalCount} documents`
            : selectedDocIds.length > 0
            ? `Bulk Print — ${selectedDocIds.length} documents`
            : `Bulk Print — All ${totalCount} documents`
        }
        url={bulkPrintUrl}
        method="POST"
        fetchBody={bulkPrintBody}
      />

      {/* ── Filter sheet ─────────────────────────────────────────────────────── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl px-4 pb-10 max-h-[90vh] overflow-y-auto"
        >
          <SheetHeader className="mb-5">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-left flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filter Documents
              </SheetTitle>
              <button
                onClick={handleClearStaged}
                className="text-xs font-bold text-muted-foreground hover:text-destructive underline underline-offset-2 transition-colors"
              >
                Clear all
              </button>
            </div>
          </SheetHeader>

          <div className="space-y-6">

            {/* Document Type */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Document Type
                </p>
                {stagedTypes.length > 0 && (
                  <button
                    onClick={() => setStagedTypes([])}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-destructive underline underline-offset-2"
                  >
                    Deselect all ({stagedTypes.length})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {allTypeOptions.map(opt => {
                  const isSelected   = stagedTypes.includes(opt.value)
                  const isDisabled   = !!stagedPayment && !HAS_BALANCE.has(opt.value)
                  return (
                    <button
                      key={opt.value}
                      onClick={() => !isDisabled && toggleStagedType(opt.value)}
                      disabled={isDisabled}
                      title={isDisabled ? 'Not applicable when a payment filter is active' : undefined}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
                        isDisabled
                          ? 'opacity-30 cursor-not-allowed bg-muted text-muted-foreground border-border'
                          : isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 shrink-0" />}
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              {stagedPayment ? (
                <p className="text-[10px] text-amber-600 mt-2 ml-1 font-medium">
                  Only Bill, Invoice, CN & DN support payment status filters
                </p>
              ) : stagedTypes.length === 0 ? (
                <p className="text-[10px] text-muted-foreground mt-2 ml-1">
                  No type selected — showing all types
                </p>
              ) : null}
            </div>
              {stagedTypes.length === 0 && (
                <p className="text-[10px] text-muted-foreground mt-2 ml-1">
                  No type selected — showing all types
                </p>
              )}
            </div>

            <Separator />

            {/* Contact */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Contact
              </p>
              <SearchableSelect
                options={contactOptions}
                value={stagedContact}
                onChange={setStagedContact}
                placeholder="All contacts"
                title="Filter by Contact"
                searchPlaceholder="Search contacts..."
                clearable
              />
              {stagedContact && (
                <p className="text-[10px] text-muted-foreground mt-2 ml-1">
                  Showing documents for this contact only
                </p>
              )}
            </div>
              {stagedPaymentApplicable && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Payment Status
                    </p>

                    {/* 5 options: 2 rows — row1: All/Paid/Unpaid, row2: Partial/Due */}
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_FILTERS.slice(0, 3).map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleStagedPaymentChange(opt.value)}
                          className={cn(
                            'h-10 rounded-xl text-xs font-semibold border transition-all',
                            stagedPayment === opt.value
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {PAYMENT_FILTERS.slice(3).map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleStagedPaymentChange(opt.value)}
                          className={cn(
                            'h-10 rounded-xl text-xs font-semibold border transition-all',
                            stagedPayment === opt.value
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {stagedPayment && (
                      <p className="text-[10px] text-muted-foreground mt-2 ml-1">
                        {stagedPayment === 'partial'
                          ? 'Partial is filtered client-side after fetch'
                          : stagedPayment === 'due'
                          ? 'Documents with a passed due date and outstanding balance'
                          : 'Non-applicable document types have been hidden'}
                      </p>
                    )}
                  </div>
                </>
              )}
          <Separator />
          <div>
            {/* Date Range */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Date Range
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">From</label>
                  <input
                    type="date"
                    value={stagedDateFrom}
                    onChange={e => setStagedDateFrom(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">To</label>
                  <input
                    type="date"
                    value={stagedDateTo}
                    onChange={e => setStagedDateTo(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              {dateRangeInvalid && (
                <p className="text-[11px] text-destructive mt-2 ml-1 font-semibold">
                  ⚠️ "From" date is after "To" date
                </p>
              )}
              {(stagedDateFrom || stagedDateTo) && !dateRangeInvalid && (
                <button
                  onClick={() => { setStagedDateFrom(''); setStagedDateTo('') }}
                  className="mt-2 text-[11px] font-semibold text-muted-foreground hover:text-destructive underline underline-offset-2"
                >
                  Clear dates
                </button>
              )}
            </div>

            <Separator />

            {/* Document Status */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Document Status
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setStagedShowDeleted(false)}
                  className={cn(
                    'h-10 rounded-xl text-xs font-semibold border transition-all',
                    !stagedShowDeleted
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
                  )}
                >
                  Active
                </button>
                <button
                  onClick={() => setStagedShowDeleted(true)}
                  className={cn(
                    'h-10 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5',
                    stagedShowDeleted
                      ? 'bg-destructive/10 text-destructive border-destructive/30 shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted/50',
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Deleted
                </button>
              </div>
            </div>

          </div>

          <div className="flex gap-3 mt-8">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-2xl font-semibold"
              onClick={() => setFilterOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-12 rounded-2xl font-bold shadow-md shadow-primary/20"
              onClick={handleApplyFilters}
              disabled={dateRangeInvalid}
            >
              Apply
              {stagedFilterCount > 0 && (
                <span className="ml-2 bg-primary-foreground/20 text-primary-foreground text-[10px] font-black px-1.5 py-0.5 rounded-md">
                  {stagedFilterCount}
                </span>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  )
}
