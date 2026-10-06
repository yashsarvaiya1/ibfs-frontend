'use client'

import { useUIStore } from '@/stores/uiStore'
import { useStockPreview } from '@/hooks/useDocument'
import { MoveStockSheet } from './MoveStockSheet'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

export function GlobalMoveStockSheet() {
  const open = useUIStore(s => s.moveStockSheetOpen)
  const docId = useUIStore(s => s.moveStockDocumentId) ?? 0
  const close = useUIStore(s => s.closeMoveStockSheet)
  const query = useStockPreview(docId, open)
  if (!open) return null
  if (!query.data) return <Sheet open onOpenChange={value => { if (!value) close() }}>
    <SheetContent side="bottom" className="rounded-t-2xl p-6">
      <SheetHeader><SheetTitle>Move stock</SheetTitle></SheetHeader>
      <p className="my-4 text-sm text-muted-foreground">{query.isError ? 'Could not load pending stock.' : 'Loading pending stock...'}</p>
      {query.isError && <Button onClick={() => query.refetch()}>Try again</Button>}
    </SheetContent>
  </Sheet>
  return <MoveStockSheet docId={docId} stockPreview={query.data} open={open} onClose={close} />
}
