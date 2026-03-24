'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Printer, X, Loader2, Download } from 'lucide-react'
import { env } from 'next-runtime-env'
import { toast } from 'sonner'

type PrintView = 'ledger' | 'list'

interface PrintSheetProps {
  open:         boolean
  onClose:      () => void
  title:        string
  queryParams:  Record<string, unknown>
  view?:        PrintView    // transactions print only
  endpoint?:    string       // defaults to 'transactions/print/'
  filename?:    string       // download filename prefix e.g. 'Inventory' → 'Inventory_2026-03-24.pdf'
  loadingText?: string       // e.g. 'stock report'
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
  const iframeRef             = useRef<HTMLIFrameElement>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const queryKey = useMemo(
    () => JSON.stringify({ ...queryParams, view }),
    [queryParams, view],
  )

  useEffect(() => {
    if (open) {
      if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null) }
      fetchPDF()
    } else {
      if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null) }
    }
  }, [open, queryKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPDF = async () => {
    setLoading(true)
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
      toast.error('Failed to load PDF')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    if (!iframeRef.current?.contentWindow) { toast.error('Preview not ready'); return }
    iframeRef.current.contentWindow.print()
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

        <div className="flex-1 overflow-hidden rounded-xl border bg-muted/30 shadow-inner mb-3 relative min-h-0">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 z-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">
                Generating {resolvedLoadingText} PDF…
              </p>
            </div>
          )}
          {blobUrl && (
            <iframe ref={iframeRef} src={blobUrl} className="w-full h-full rounded-lg" title="PDF Preview" />
          )}
          {!blobUrl && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <p className="text-sm text-muted-foreground">Preview failed to load</p>
              <Button variant="outline" size="sm" onClick={fetchPDF}>Retry</Button>
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="flex-1 gap-2" onClick={handlePrint} disabled={loading || !blobUrl}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button className="flex-1 gap-2" onClick={handleDownload} disabled={loading || !blobUrl}>
            <Download className="h-4 w-4" /> Save PDF
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
