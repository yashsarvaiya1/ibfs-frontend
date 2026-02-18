// stores/uiStore.ts

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Pre-selected context for transaction sheet
// Set before opening the sheet — cleared after closing
export interface TransactionSheetContext {
  contactId?: number        // pre-selected contact
  documentId?: number       // pre-selected document (e.g. opened from Bill detail)
  paymentAccountId?: number // pre-selected account
}

interface UIState {
  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Quick action sheet (FAB bottom center)
  quickActionOpen: boolean
  setQuickActionOpen: (open: boolean) => void

  // Transaction sheet context
  // Allows any page to pre-fill the payment form before opening it
  transactionSheetOpen: boolean
  transactionSheetContext: TransactionSheetContext
  openTransactionSheet: (context?: TransactionSheetContext) => void
  closeTransactionSheet: () => void

  // Page title — set by each page on mount
  pageTitle: string
  setPageTitle: (title: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      // Quick action
      quickActionOpen: false,
      setQuickActionOpen: (open) => set({ quickActionOpen: open }),

      // Transaction sheet
      transactionSheetOpen: false,
      transactionSheetContext: {},
      openTransactionSheet: (context = {}) =>
        set({ transactionSheetOpen: true, transactionSheetContext: context }),
      closeTransactionSheet: () =>
        set({ transactionSheetOpen: false, transactionSheetContext: {} }),

      // Page title
      pageTitle: 'Dashboard',
      setPageTitle: (title) => set({ pageTitle: title }),
    }),
    {
      name: 'ibfs_ui',
      storage: createJSONStorage(() => localStorage),
      // Only persist sidebarOpen — everything else resets on load
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen }),
    }
  )
)
