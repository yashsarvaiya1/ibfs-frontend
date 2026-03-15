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
  // ✅ Resolved display fields — backend now returns these directly
  document_type:            string | null   // e.g. "bill", "invoice"
  doc_id:                   string | null   // e.g. "INV-0001"
  is_document_deleted:      boolean
  contact_name:             string | null   // resolved from contact FK
  payment_account_name:     string | null   // resolved from payment_account FK
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

export interface TransactionListParams {
  contact?:             number
  account?:             number
  type?:                TransactionType
  document?:            number
  date_from?:           string
  date_to?:             string
  is_document_deleted?: boolean
  include_records?:     boolean
  page?:                number
  page_size?:           number
}

export interface TransactionUpdatePayload {
  amount?:          string
  date?:            string
  notes?:           string
  payment_account?: number | null
}
