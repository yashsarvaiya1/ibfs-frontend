// stores/uiStore.ts
'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { DocumentType } from '@/models/document'

interface UIStore {
  // ── Page title ──────────────────────────────────────────────────────────────
  pageTitle: string
  setPageTitle: (title: string) => void

  // ── Quick Action Sheet ───────────────────────────────────────────────────────
  quickActionOpen: boolean
  setQuickActionOpen: (v: boolean) => void

  // ── Document Create Sheet ────────────────────────────────────────────────────
  docCreateSheetOpen: boolean
  docCreateType: DocumentType | null
  docCreateContactId: number | null
  openDocCreateSheet: (type: DocumentType, contactId?: number) => void
  closeDocCreateSheet: () => void

  // ── Move Stock Sheet ─────────────────────────────────────────────────────────
  moveStockSheetOpen: boolean
  moveStockDocumentId: number | null
  openMoveStockSheet: (documentId: number) => void
  closeMoveStockSheet: () => void

  // ── Delete Document Sheet ────────────────────────────────────────────────────
  deleteDocSheetOpen: boolean
  deleteDocId: number | null
  openDeleteDocSheet: (id: number) => void
  closeDeleteDocSheet: () => void

  // ── Record Payment Sheet ─────────────────────────────────────────────────────
  recordPaymentSheetOpen: boolean
  recordPaymentDocId: number | null
  openRecordPaymentSheet: (docId: number) => void
  closeRecordPaymentSheet: () => void

  // ── Add Details Sheet (Fast Bill → full mode) ─────────────────────────────
  addDetailsSheetOpen: boolean
  addDetailsDocId: number | null
  openAddDetailsSheet: (docId: number) => void
  closeAddDetailsSheet: () => void

  // ── Transaction Sheet ────────────────────────────────────────────────────────
  transactionSheetOpen: boolean
  transactionSheetMode: 'send' | 'receive'
  transactionSheetContactId: number | null
  openTransactionSheet: (mode: 'send' | 'receive', contactId?: number) => void
  closeTransactionSheet: () => void

  // ── Default Payment Account (persisted) ──────────────────────────────────────
  defaultAccountId: number | null
  setDefaultAccountId: (id: number | null) => void

  // ── Contact Ledger: show/hide record txns (persisted) ────────────────────────
  ledgerShowRecords: boolean
  setLedgerShowRecords: (v: boolean) => void

  // ── Contact Detail: active tab (persisted) ────────────────────────────────────
  contactDetailTab: 'ledger' | 'documents'
  setContactDetailTab: (tab: 'ledger' | 'documents') => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // ── Page title ────────────────────────────────────────────────────────────
      pageTitle: 'Home',
      setPageTitle: (title) => set({ pageTitle: title }),

      // ── Quick Action Sheet ────────────────────────────────────────────────────
      quickActionOpen: false,
      setQuickActionOpen: (v) => set({ quickActionOpen: v }),

      // ── Document Create Sheet ─────────────────────────────────────────────────
      docCreateSheetOpen: false,
      docCreateType: null,
      docCreateContactId: null,
      openDocCreateSheet: (type, contactId) =>
        set({
          docCreateSheetOpen: true,
          docCreateType: type,
          docCreateContactId: contactId ?? null,
        }),
      closeDocCreateSheet: () =>
        set({ docCreateSheetOpen: false, docCreateType: null, docCreateContactId: null }),

      // ── Move Stock Sheet ──────────────────────────────────────────────────────
      moveStockSheetOpen: false,
      moveStockDocumentId: null,
      openMoveStockSheet: (documentId) =>
        set({ moveStockSheetOpen: true, moveStockDocumentId: documentId }),
      closeMoveStockSheet: () =>
        set({ moveStockSheetOpen: false, moveStockDocumentId: null }),

      // ── Delete Document Sheet ─────────────────────────────────────────────────
      deleteDocSheetOpen: false,
      deleteDocId: null,
      openDeleteDocSheet: (id) => set({ deleteDocSheetOpen: true, deleteDocId: id }),
      closeDeleteDocSheet: () => set({ deleteDocSheetOpen: false, deleteDocId: null }),

      // ── Record Payment Sheet ──────────────────────────────────────────────────
      recordPaymentSheetOpen: false,
      recordPaymentDocId: null,
      openRecordPaymentSheet: (docId) =>
        set({ recordPaymentSheetOpen: true, recordPaymentDocId: docId }),
      closeRecordPaymentSheet: () =>
        set({ recordPaymentSheetOpen: false, recordPaymentDocId: null }),

      // ── Add Details Sheet ─────────────────────────────────────────────────────
      addDetailsSheetOpen: false,
      addDetailsDocId: null,
      openAddDetailsSheet: (docId) =>
        set({ addDetailsSheetOpen: true, addDetailsDocId: docId }),
      closeAddDetailsSheet: () =>
        set({ addDetailsSheetOpen: false, addDetailsDocId: null }),

      // ── Transaction Sheet ─────────────────────────────────────────────────────
      transactionSheetOpen: false,
      transactionSheetMode: 'send',
      transactionSheetContactId: null,
      openTransactionSheet: (mode, contactId) =>
        set({
          transactionSheetOpen: true,
          transactionSheetMode: mode,
          transactionSheetContactId: contactId ?? null,
        }),
      closeTransactionSheet: () =>
        set({ transactionSheetOpen: false, transactionSheetContactId: null }),

      // ── Persisted preferences ─────────────────────────────────────────────────
      defaultAccountId: null,
      setDefaultAccountId: (id) => set({ defaultAccountId: id }),

      ledgerShowRecords: false,
      setLedgerShowRecords: (v) => set({ ledgerShowRecords: v }),

      contactDetailTab: 'ledger',
      setContactDetailTab: (tab) => set({ contactDetailTab: tab }),
    }),
    {
      name: 'ibfs_ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        defaultAccountId: state.defaultAccountId,
        ledgerShowRecords: state.ledgerShowRecords,
        contactDetailTab: state.contactDetailTab,
      }),
    }
  )
)
