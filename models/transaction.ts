// models/transaction.ts
import type { InterestLine } from './document'

export type TransactionType = 'record' | 'actual' | 'contra'

export interface FinancialTransaction {
  id:                       number
  type:                     TransactionType
  date:                     string
  amount:                   string
  document:                 number | null
  contact:                  number | null
  payment_account:          number | null
  notes:                    string | null
  monthly_cumulative_delta: string
  created_at:               string
  updated_at:               string
  document_type:            string | null
  doc_id:                   string | null
  is_document_deleted:      boolean
  contact_name:             string | null
  payment_account_name:     string | null
  payment_account_type:     'bank' | 'upi' | 'cash' | null
}

export type { InterestLine }

export interface SendReceivePayload {
  amount:           string
  payment_account?: number
  date?:            string
  notes?:           string
  document?:        number
  is_expense?:      boolean
  line_items?:      { name: string; amount: number }[]
  interest_lines?:  InterestLine[]
}

export interface LinkDocumentPayload {
  document: number | null
}

// ── List / filter params ───────────────────────────────────────────────────────
export interface TransactionListParams {
  contact?:             number
  account?:             number
  type?:                TransactionType
  doc_type?:            string          // TV-02: filter by related document type
  document?:            number
  date_from?:           string
  date_to?:             string
  is_document_deleted?: boolean
  include_records?:     boolean
  page?:                number
  page_size?:           number
  ordering?:  string          // GD-03
}

// ── Contact ledger params ─────────────────────────────────────────────────────
export interface LedgerParams {
  date_from?:   string
  date_to?:     string
  type?:        TransactionType
  account?:     number                  // TV-02
  page?:        number
  page_size?:   number                  // GD-03
}

// ── REMOVED: AccountTransactionsParams — lives in models/account.ts ───────────

export interface TransactionUpdatePayload {
  amount?:          string
  date?:            string
  notes?:           string
  payment_account?: number | null
}

// ── Print params (TV-06) ──────────────────────────────────────────────────────
export interface TransactionPrintParams extends TransactionListParams {
  /**
   * TV-06: 'ledger' → Dr/Cr running-balance format.
   *        'list'   → plain table (default).
   */
  view?:                  'ledger' | 'list'

  /**
   * TV-05: CF before filtered window — from LedgerResponse.opening_balance_at.
   */
  opening_balance_at?:    string

  /**
   * For account statement PDFs.
   * From AccountTransactionsResponse.balance_before_period.
   */
  balance_before_period?: string
}
