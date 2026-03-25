'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Printer, X, Loader2, Download, FileWarning, RefreshCw, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { env } from 'next-runtime-env'
import { toast } from 'sonner'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

type PrintView = 'ledger' | 'list'

interface PrintSheetProps {
  open:         boolean
  onClose:      () => void
  title:        string
  queryParams:  Record<string, unknown>
  view?:        PrintView
  endpoint?:    string
  filename?:    string
  loadingText?: string
}

function getApiBase(): string {
  const raw = env('NEXT_PUBLIC_API_URL') ?? 'http://localhost:8000/api'
  return raw.replace(/\/$/, '')
}

export function PrintSheet({
  open,
  onClose,
  title,
  queryParams,
  view,
  endpoint    = 'transactions/print/',
  filename,
  loadingText,
}: PrintSheetProps) {
  const [blobUrl,    setBlobUrl]    = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [pdfReady,   setPdfReady]   = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [numPages,   setNumPages]   = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale,      setScale]      = useState(1.0)

  const MIN_SCALE = 1.0
  const MAX_SCALE = 4.0
  const lastDist  = useRef<number | null>(null)
  const lastScale = useRef<number>(1.0)

  const containerRef = useRef<HTMLDivElement>(null)
  const [pageWidth,  setPageWidth]  = useState(0)

  // Measure container width — delayed to let Sheet slide-up animation finish
  // before we read getBoundingClientRect (which returns 0 during animation)
  useEffect(() => {
    if (!open) return
    const measure = () => {
      const el = containerRef.current
      if (!el) return
      const w = el.getBoundingClientRect().width
      if (w > 0) setPageWidth(Math.floor(w))
    }
    // 350ms covers the Sheet open animation on all devices
    const t = setTimeout(measure, 350)
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => { clearTimeout(t); ro.disconnect() }
  }, [open])

  const queryKey = useMemo(
    () => JSON.stringify({ ...queryParams, view }),
    [queryParams, view],
  )

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
  }, [open, queryKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPDF = async () => {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams()
      const merged = view ? { ...queryParams, view } : { ...queryParams }
      Object.entries(merged).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.append(k, String(v))
      })
      const url = `${getApiBase()}/${endpoint}?${q.toString()}`
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      setBlobUrl(URL.createObjectURL(blob))
    } catch (err) {
      console.error('PDF error:', err)
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
    if (!blobUrl) { toast.error('Preview not ready'); return }
    // Open blob URL in a new tab and trigger print — works on desktop
    const win = window.open(blobUrl, '_blank')
    if (win) {
      win.onload = () => win.print()
    }
  }

  const handleDownload = () => {
    if (!blobUrl) return
    const a    = document.createElement('a')
    a.href     = blobUrl
    const date = new Date().toISOString().split('T')[0]
    a.download = filename
      ? `${filename}_${date}.pdf`
      : view === 'ledger'
        ? `Ledger_${date}.pdf`
        : `Transactions_${date}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const resolvedLoadingText = loadingText
    ?? (view === 'ledger' ? 'ledger' : 'transactions')

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6 h-[92vh] flex flex-col">
        <SheetHeader className="mb-3 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle>{title}</SheetTitle>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-full hover:bg-muted/60 transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </SheetHeader>

        {/* PDF render area */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 w-full overflow-auto rounded-xl border bg-muted/30 shadow-inner mb-3 relative"
          onTouchStart={e => {
            if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX
              const dy = e.touches[0].clientY - e.touches[1].clientY
              lastDist.current  = Math.hypot(dx, dy)
              lastScale.current = scale
            }
          }}
          onTouchMove={e => {
            if (e.touches.length === 2 && lastDist.current !== null) {
              e.preventDefault()
              const dx   = e.touches[0].clientX - e.touches[1].clientX
              const dy   = e.touches[0].clientY - e.touches[1].clientY
              const dist = Math.hypot(dx, dy)
              const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, lastScale.current * (dist / lastDist.current)))
              setScale(next)
            }
          }}
          onTouchEnd={() => { lastDist.current = null }}
          style={{ touchAction: scale > 1 ? 'none' : 'pan-x pan-y' }}
        >
          {/* Loading spinner */}
          {(loading || (!pdfReady && blobUrl && pageWidth > 0)) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 z-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">
                Generating {resolvedLoadingText} PDF…
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <FileWarning className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchPDF} className="gap-2">
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          )}

          {/* react-pdf — works on iOS Safari and Android Chrome (no iframe blob URLs) */}
          {blobUrl && pageWidth > 0 && (
            <Document
              file={blobUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={err => {
                setError(`Render error: ${err.message}`)
              }}
              loading={null}
              className="flex justify-center py-4"
            >
              <Page
                pageNumber={pageNumber}
                width={Math.floor(pageWidth * scale)}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onRenderSuccess={onPageRenderSuccess}
                onRenderError={err => setError(`Page error: ${err.message}`)}
              />
            </Document>
          )}

          {/* Page controls inside scroll area — only for multi-page */}
          {pdfReady && numPages > 1 && (
            <div className="sticky bottom-0 flex items-center gap-3 justify-center py-2 bg-background/90 border-t">
              <button
                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="w-9 h-9 rounded-full border flex items-center justify-center disabled:opacity-20 hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[11px] font-bold tabular-nums bg-muted px-2.5 py-1 rounded-full">
                {pageNumber} / {numPages}
              </span>
              <button
                onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
                className="w-9 h-9 rounded-full border flex items-center justify-center disabled:opacity-20 hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline" className="flex-1 gap-2"
            onClick={handlePrint} disabled={loading || !pdfReady}
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
          {pdfReady && (
            <>
              <button
                onClick={() => setScale(s => Math.max(MIN_SCALE, +(s - 0.5).toFixed(1)))}
                disabled={scale <= MIN_SCALE}
                className="w-11 h-11 rounded-xl border flex items-center justify-center disabled:opacity-20 hover:bg-muted transition-colors shrink-0"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => setScale(s => Math.min(MAX_SCALE, +(s + 0.5).toFixed(1)))}
                disabled={scale >= MAX_SCALE}
                className="w-11 h-11 rounded-xl border flex items-center justify-center disabled:opacity-20 hover:bg-muted transition-colors shrink-0"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </>
          )}
          <Button
            className="flex-1 gap-2"
            onClick={handleDownload} disabled={loading || !blobUrl}
          >
            <Download className="h-4 w-4" /> Save PDF
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
