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
  
  // Track aspect ratio to calculate proper scroll dimensions
  const [aspectRatio, setAspectRatio] = useState(1.414) 

  const MIN_SCALE = 1.0
  const MAX_SCALE = 4.0
  const lastDist  = useRef<number | null>(null)
  const lastScale = useRef<number>(1.0)

  const containerRef = useRef<HTMLDivElement>(null)
  const [pageWidth,  setPageWidth]  = useState(0)

  useEffect(() => {
    if (!open) return
    const measure = () => {
      const el = containerRef.current
      if (!el) return
      const w = el.getBoundingClientRect().width
      if (w > 0) setPageWidth(Math.floor(w))
    }
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
  }, [open, queryKey]) 

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

        {/* Outer Scroll Container */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 w-full overflow-auto rounded-xl border bg-muted/30 shadow-inner mb-3 relative"
          style={{ touchAction: 'pan-x pan-y' }} // Re-enable native single-finger panning!
        >
          {(loading || (!pdfReady && blobUrl && pageWidth > 0)) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 z-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">
                Generating {resolvedLoadingText} PDF…
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center z-10">
              <FileWarning className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchPDF} className="gap-2">
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          )}

          {blobUrl && pageWidth > 0 && (
            /* Sizing Wrapper: Dictates physical bounds to the browser scrollbars */
            <div
              style={{
                width: pageWidth * scale,
                height: (pageWidth * aspectRatio) * scale,
                minHeight: '100%',
                position: 'relative',
              }}
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
                  e.preventDefault() // Only block native pinch, allow single finger scroll
                  const dx   = e.touches[0].clientX - e.touches[1].clientX
                  const dy   = e.touches[0].clientY - e.touches[1].clientY
                  const dist = Math.hypot(dx, dy)
                  const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, lastScale.current * (dist / lastDist.current)))
                  setScale(next)
                }
              }}
              onTouchEnd={() => { lastDist.current = null }}
            >
              {/* Scaling Wrapper: Visual scaling via GPU, no re-renders */}
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: pageWidth,
                  height: pageWidth * aspectRatio,
                }}
              >
                <Document
                  file={blobUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={err => setError(`Render error: ${err.message}`)}
                  loading={null}
                >
                  <Page
                    pageNumber={pageNumber}
                    width={pageWidth} // Locked! Never multiply this by scale
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onLoadSuccess={(page: any) => {
                       // Capture the actual PDF aspect ratio to calculate scroll bounds
                       setAspectRatio(page.originalHeight / page.originalWidth)
                    }}
                    onRenderSuccess={onPageRenderSuccess}
                    onRenderError={err => setError(`Page error: ${err.message}`)}
                  />
                </Document>
              </div>
            </div>
          )}

          {pdfReady && numPages > 1 && (
            <div className="sticky bottom-0 left-0 right-0 flex items-center gap-3 justify-center py-2 bg-background/90 border-t z-20">
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

        <div className="flex gap-2 shrink-0 mt-auto">
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
