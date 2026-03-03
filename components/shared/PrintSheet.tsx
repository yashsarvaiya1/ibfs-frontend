'use client'

import { useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Printer, X } from 'lucide-react'
import { toast } from 'sonner'

interface PrintSheetProps {
  open:     boolean
  onClose:  () => void
  title:    string        // e.g. "Transaction Report" | "Ledger — Smit"
  children: React.ReactNode  // already-rendered list or ledger view
}

export function PrintSheet({ open, onClose, title, children }: PrintSheetProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (!printRef.current) return
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank')
    if (!win) { toast.error('Allow popups to print'); return }
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; padding: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 11px; }
            th { background: #f5f5f5; font-weight: 600; }
            .positive { color: #dc2626; }
            .negative { color: #16a34a; }
            .section-header { background: #f0f0f0; font-weight: 700; padding: 6px 8px; margin-top: 12px; font-size: 12px; }
            .summary-row { font-weight: 700; background: #fafafa; }
            h1 { font-size: 16px; margin-bottom: 4px; }
            .meta { font-size: 11px; color: #666; margin-bottom: 12px; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pb-6 h-[92vh] flex flex-col"
      >
        <SheetHeader className="mb-3 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-left">{title}</SheetTitle>
            <button onClick={onClose}>
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </SheetHeader>

        {/* Preview area — white background simulating paper */}
        <div className="flex-1 overflow-y-auto rounded-xl border bg-white text-black text-xs">
          <div ref={printRef} className="p-4">
            {children}
          </div>
        </div>

        <div className="pt-4 shrink-0">
          <Button className="w-full gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
