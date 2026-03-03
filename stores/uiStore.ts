// stores/uiStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { DocumentType } from '@/models/document'

// Quick Action sub-types — each renders a different sheet body
export type QuickActionType = 'expense' | 'interest' | 'transfer'

interface UIStore {
  // ── Page title ───────────────────────────────────────────────────────────────
  pageTitle: string
  setPageTitle: (title: string) => void

  // ── Quick Action Sheet ───────────────────────────────────────────────────────
  quickActionOpen:  boolean
  quickActionType:  QuickActionType | null
  openQuickAction:  (type?: QuickActionType) => void  // type optional — nav opens full grid
  closeQuickAction: () => void

  // ── Document Create Sheet ────────────────────────────────────────────────────
  docCreateSheetOpen:   boolean
  docCreateType:        DocumentType | null
  docCreateContactId:   number | null
  openDocCreateSheet:   (type: DocumentType, contactId?: number) => void
  closeDocCreateSheet:  () => void

  // ── Move Stock Sheet ─────────────────────────────────────────────────────────
  moveStockSheetOpen:   boolean
  moveStockDocumentId:  number | null
  moveStockSource:      'document' | 'product' | null
  openMoveStockSheet:   (documentId: number, source?: 'document' | 'product') => void
  closeMoveStockSheet:  () => void

  // ── Delete Document Sheet ────────────────────────────────────────────────────
  deleteDocSheetOpen:  boolean
  deleteDocId:         number | null
  openDeleteDocSheet:  (id: number) => void
  closeDeleteDocSheet: () => void

  // ── Record Payment Sheet ─────────────────────────────────────────────────────
  recordPaymentSheetOpen:  boolean
  recordPaymentDocId:      number | null
  openRecordPaymentSheet:  (docId: number) => void
  closeRecordPaymentSheet: () => void

  // ── Add Details Sheet (Fast Bill → full mode) ────────────────────────────────
  addDetailsSheetOpen:  boolean
  addDetailsDocId:      number | null
  openAddDetailsSheet:  (docId: number) => void
  closeAddDetailsSheet: () => void

  // ── Send / Receive Sheet ─────────────────────────────────────────────────────
  transactionSheetOpen:     boolean
  transactionSheetMode:     'send' | 'receive'
  transactionSheetContactId: number | null
  openTransactionSheet:     (mode: 'send' | 'receive', contactId?: number) => void
  closeTransactionSheet:    () => void

  // ── Transfer Funds Sheet (spec B2) ───────────────────────────────────────────
  transferSheetOpen:  boolean
  openTransferSheet:  () => void
  closeTransferSheet: () => void

  // ── Adjust Balance Sheet (spec B3) ───────────────────────────────────────────
  adjustBalanceSheetOpen:  boolean
  adjustBalanceAccountId:  number | null
  openAdjustBalanceSheet:  (accountId: number) => void
  closeAdjustBalanceSheet: () => void

  // ── Adjust Stock Sheet (spec 3.3 — product page) ─────────────────────────────
  adjustStockSheetOpen:  boolean
  adjustStockProductId:  number | null
  adjustStockMode:       'add' | 'remove'
  openAdjustStockSheet:  (productId: number, mode?: 'add' | 'remove') => void
  closeAdjustStockSheet: () => void

  // ── Persisted user preferences ────────────────────────────────────────────────
  defaultAccountId:    number | null
  setDefaultAccountId: (id: number | null) => void

  ledgerShowRecords:    boolean
  setLedgerShowRecords: (v: boolean) => void

  contactDetailTab:    'ledger' | 'documents'
  setContactDetailTab: (tab: 'ledger' | 'documents') => void

  // ── Global transaction type filter (TransactionsPage) ────────────────────────
  // '' = All, 'record' = Expected, 'actual' = Settled, 'contra' = Contra
  globalTxnFilter:    string
  setGlobalTxnFilter: (v: string) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // ── Page title ──────────────────────────────────────────────────────────
      pageTitle:    'Home',
      setPageTitle: (title) => set({ pageTitle: title }),

      // ── Quick Action Sheet ──────────────────────────────────────────────────
      quickActionOpen:  false,
      quickActionType:  null,
      openQuickAction:  (type) => set({ quickActionOpen: true, quickActionType: type ?? null }),
      closeQuickAction: () => set({ quickActionOpen: false, quickActionType: null }),

      // ── Document Create Sheet ───────────────────────────────────────────────
      docCreateSheetOpen:  false,
      docCreateType:       null,
      docCreateContactId:  null,
      openDocCreateSheet:  (type, contactId) =>
        set({ docCreateSheetOpen: true, docCreateType: type, docCreateContactId: contactId ?? null }),
      closeDocCreateSheet: () =>
        set({ docCreateSheetOpen: false, docCreateType: null, docCreateContactId: null }),

      // ── Move Stock Sheet ────────────────────────────────────────────────────
      moveStockSheetOpen:  false,
      moveStockDocumentId: null,
      moveStockSource:     null,
      openMoveStockSheet:  (documentId, source = 'document') =>
        set({ moveStockSheetOpen: true, moveStockDocumentId: documentId, moveStockSource: source }),
      closeMoveStockSheet: () =>
        set({ moveStockSheetOpen: false, moveStockDocumentId: null, moveStockSource: null }),

      // ── Delete Document Sheet ───────────────────────────────────────────────
      deleteDocSheetOpen:  false,
      deleteDocId:         null,
      openDeleteDocSheet:  (id) => set({ deleteDocSheetOpen: true, deleteDocId: id }),
      closeDeleteDocSheet: () => set({ deleteDocSheetOpen: false, deleteDocId: null }),

      // ── Record Payment Sheet ────────────────────────────────────────────────
      recordPaymentSheetOpen:  false,
      recordPaymentDocId:      null,
      openRecordPaymentSheet:  (docId) => set({ recordPaymentSheetOpen: true, recordPaymentDocId: docId }),
      closeRecordPaymentSheet: () => set({ recordPaymentSheetOpen: false, recordPaymentDocId: null }),

      // ── Add Details Sheet ───────────────────────────────────────────────────
      addDetailsSheetOpen:  false,
      addDetailsDocId:      null,
      openAddDetailsSheet:  (docId) => set({ addDetailsSheetOpen: true, addDetailsDocId: docId }),
      closeAddDetailsSheet: () => set({ addDetailsSheetOpen: false, addDetailsDocId: null }),

      // ── Send / Receive Sheet ────────────────────────────────────────────────
      transactionSheetOpen:      false,
      transactionSheetMode:      'send',
      transactionSheetContactId: null,
      openTransactionSheet:      (mode, contactId) =>
        set({ transactionSheetOpen: true, transactionSheetMode: mode, transactionSheetContactId: contactId ?? null }),
      closeTransactionSheet:     () =>
        set({ transactionSheetOpen: false, transactionSheetMode: 'send', transactionSheetContactId: null }),

      // ── Transfer Funds Sheet ────────────────────────────────────────────────
      transferSheetOpen:  false,
      openTransferSheet:  () => set({ transferSheetOpen: true }),
      closeTransferSheet: () => set({ transferSheetOpen: false }),

      // ── Adjust Balance Sheet ────────────────────────────────────────────────
      adjustBalanceSheetOpen:  false,
      adjustBalanceAccountId:  null,
      openAdjustBalanceSheet:  (accountId) =>
        set({ adjustBalanceSheetOpen: true, adjustBalanceAccountId: accountId }),
      closeAdjustBalanceSheet: () =>
        set({ adjustBalanceSheetOpen: false, adjustBalanceAccountId: null }),

      // ── Adjust Stock Sheet ──────────────────────────────────────────────────
      adjustStockSheetOpen:  false,
      adjustStockProductId:  null,
      adjustStockMode:       'add',
      openAdjustStockSheet:  (productId, mode = 'add') =>
        set({ adjustStockSheetOpen: true, adjustStockProductId: productId, adjustStockMode: mode }),
      closeAdjustStockSheet: () =>
        set({ adjustStockSheetOpen: false, adjustStockProductId: null, adjustStockMode: 'add' }),

      // ── Persisted preferences ───────────────────────────────────────────────
      defaultAccountId:    null,
      setDefaultAccountId: (id) => set({ defaultAccountId: id }),

      ledgerShowRecords:    false,
      setLedgerShowRecords: (v) => set({ ledgerShowRecords: v }),

      contactDetailTab:    'ledger',
      setContactDetailTab: (tab) => set({ contactDetailTab: tab }),

      globalTxnFilter:    '',
      setGlobalTxnFilter: (v) => set({ globalTxnFilter: v }),
    }),
    {
      name:    'ibfs_ui',
      storage: createJSONStorage(() => localStorage),
      // Only persist user preferences — never UI open/close state
      partialize: (state) => ({
        defaultAccountId: state.defaultAccountId,
        ledgerShowRecords: state.ledgerShowRecords,
        contactDetailTab: state.contactDetailTab,
        globalTxnFilter:  state.globalTxnFilter,
      }),
    },
  ),
)
