// models/transaction.ts

export type TransactionType = 'record' | 'payment' | 'contra'

export interface FinancialTransaction {
  id: number
  transaction_type: TransactionType
  transaction_date: string        // YYYY-MM-DD
  amount: string                  // signed decimal string
  document: number | null
  contact: number | null
  payment_account: number | null
  notes: string | null
  monthly_cumulative_delta: string
  // True when the linked document was soft-deleted
  // Frontend shows "Payment was for Bill #101 (deleted)"
  // User can re-link to a new document anytime
  is_document_deleted: boolean
  created_at: string
  updated_at: string
}

export interface FinancialTransactionFormData {
  transaction_type: TransactionType
  transaction_date: string
  amount: string                  // signed — positive or negative
  document?: number | null
  contact?: number | null
  payment_account?: number | null
  notes?: string
}

export interface TransactionFilters {
  contact?: number
  type?: TransactionType
  account?: number
  date_from?: string
  date_to?: string
  page?: number
}

// ── Interest + Payment combined creation payload ──────────────────────────────
// When user adds interest while recording a payment:
// Step 1 → backend creates Interest document + its record txn
// Step 2 → backend creates payment txn for (original amount + interest)
export interface CreatePaymentWithInterestPayload {
  // Payment transaction fields
  transaction_date: string
  contact: number
  payment_account: number
  notes?: string
  document?: number | null          // reference document (bill/invoice etc.)

  // Base payment amount (signed)
  payment_amount: string

  // Interest block — optional
  interest?: {
    description: string             // e.g. "Late payment fee"
    amount: string                  // always positive, stored as signed by backend
    document_date: string           // date of interest document
  }
}

// ── Document payment summary (used in payment form) ──────────────────────────
// Shows how much is paid vs remaining for a linked document
export interface DocumentPaymentSummary {
  document_id: number
  document_total: number            // grand total of the document
  total_paid: number                // sum of all payment txns for this document
  remaining: number                 // document_total - total_paid (can be negative if overpaid)
  is_overpaid: boolean
}
