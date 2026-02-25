// stores/uiStore.ts
import { create } from 'zustand'
import { DocumentType } from '@/models/document'

interface UIStore {
  // Page title for Header
  pageTitle: string
  setPageTitle: (title: string) => void

  // Quick Action Sheet
  quickActionOpen: boolean
  setQuickActionOpen: (v: boolean) => void

  // Transaction Sheet (Send/Receive — opened from contact page or quick action)
  transactionSheetOpen: boolean
  transactionSheetMode: 'send' | 'receive' | null
  transactionSheetContactId: number | null
  openTransactionSheet: (opts: { mode?: 'send' | 'receive'; contactId?: number }) => void
  closeTransactionSheet: () => void

  // Document Create Sheet
  docCreateSheetOpen: boolean
  docCreateType: DocumentType | null
  docCreateContactId: number | null
  openDocCreateSheet: (type: DocumentType, contactId?: number) => void
  closeDocCreateSheet: () => void

  // Move Stock Sheet
  moveStockSheetOpen: boolean
  moveStockDocumentId: number | null
  openMoveStockSheet: (documentId: number) => void
  closeMoveStockSheet: () => void

  // Delete Document Sheet
  deleteDocSheetOpen: boolean
  deleteDocId: number | null
  openDeleteDocSheet: (id: number) => void
  closeDeleteDocSheet: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  pageTitle: 'Home',
  setPageTitle: (title) => set({ pageTitle: title }),

  quickActionOpen: false,
  setQuickActionOpen: (v) => set({ quickActionOpen: v }),

  transactionSheetOpen: false,
  transactionSheetMode: null,
  transactionSheetContactId: null,
  openTransactionSheet: ({ mode, contactId }) =>
    set({
      transactionSheetOpen: true,
      transactionSheetMode: mode ?? 'send',
      transactionSheetContactId: contactId ?? null,
    }),
  closeTransactionSheet: () =>
    set({ transactionSheetOpen: false, transactionSheetMode: null, transactionSheetContactId: null }),

  docCreateSheetOpen: false,
  docCreateType: null,
  docCreateContactId: null,
  openDocCreateSheet: (type, contactId) =>
    set({ docCreateSheetOpen: true, docCreateType: type, docCreateContactId: contactId ?? null }),
  closeDocCreateSheet: () =>
    set({ docCreateSheetOpen: false, docCreateType: null, docCreateContactId: null }),

  moveStockSheetOpen: false,
  moveStockDocumentId: null,
  openMoveStockSheet: (documentId) =>
    set({ moveStockSheetOpen: true, moveStockDocumentId: documentId }),
  closeMoveStockSheet: () =>
    set({ moveStockSheetOpen: false, moveStockDocumentId: null }),

  deleteDocSheetOpen: false,
  deleteDocId: null,
  openDeleteDocSheet: (id) => set({ deleteDocSheetOpen: true, deleteDocId: id }),
  closeDeleteDocSheet: () => set({ deleteDocSheetOpen: false, deleteDocId: null }),
}))
