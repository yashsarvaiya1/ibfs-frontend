'use client'

import { useUIStore } from '@/stores/uiStore'
import { useDeleteDocument } from '@/hooks/useDocument'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2, RotateCcw, Unlink } from 'lucide-react'

// Exactly 2 strategies — per spec Part 5, no third option exists
const OPTIONS = [
  {
    strategy: 'revert' as const,
    icon:     RotateCcw,
    label:    'Revert & Delete',
    desc:     'Hard-deletes all record and actual transactions. Reverses all account balances and stock changes. Clean slate.',
    color:    'text-red-600',
    bg:       'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
  },
  {
    strategy: 'manual' as const,
    icon:     Unlink,
    label:    'Keep Transactions',
    desc:     'Keeps all actual transactions intact. Document is soft-deleted — transactions will show a "Doc Deleted" warning badge. No balance or stock changes.',
    color:    'text-amber-600',
    bg:       'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
  },
]

export function DeleteDocSheet() {
  const {
    deleteDocSheetOpen,
    deleteDocId,
    closeDeleteDocSheet,
  } = useUIStore()

  const router    = useRouter()
  const docId     = deleteDocId ?? 0
  const deleteMut = useDeleteDocument(docId)

  const handleDelete = async (strategy: 'revert' | 'manual') => {
    try {
      await deleteMut.mutateAsync({ strategy })
      toast.success('Document deleted')
      closeDeleteDocSheet()
      router.back()
    } catch {
      toast.error('Delete failed')
    }
  }

  return (
    <Sheet open={deleteDocSheetOpen} onOpenChange={(open) => !open && closeDeleteDocSheet()}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
        <SheetHeader className="mb-2">
          <SheetTitle className="text-left flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" />
            Delete Document
          </SheetTitle>
        </SheetHeader>

        <p className="text-sm text-muted-foreground mb-5">
          Choose how to handle linked transactions:
        </p>

        <div className="space-y-3">
          {OPTIONS.map(({ strategy, icon: Icon, label, desc, color, bg }) => (
            <button
              key={strategy}
              disabled={deleteMut.isPending}
              onClick={() => handleDelete(strategy)}
              className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-colors hover:opacity-90 active:scale-[0.99] ${bg}`}
            >
              <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color}`} />
              <div>
                <p className={`text-sm font-semibold ${color}`}>{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          className="w-full mt-4 text-muted-foreground"
          onClick={closeDeleteDocSheet}
        >
          Cancel
        </Button>
      </SheetContent>
    </Sheet>
  )
}
