// models/transaction.ts
import type { InterestLine } from './document'

export type TransactionType = 'record' | 'actual' | 'contra'

export interface FinancialTransaction {
  id:                       number
  type:                     TransactionType
  date:                     string
  amount:                   string           // Decimal string from DRF
  monthly_cumulative_delta: string           // MCD — used for running CF calc
  is_doc_deleted:           boolean
  created_at:               string
  updated_at:               string

  // FK IDs
  document:        number | null
  contact:         number | null
  payment_account: number | null

  // ── Denormalized read-only display fields (serializer annotations) ─────────
  // Backend must include these via SerializerMethodField / source on serializer
  document_type:        string | null  // e.g. 'bill', 'invoice', 'expense'
  contact_name:         string | null  // Contact.company_name or Contact.contact_name
  payment_account_name: string | null  // PaymentAccount.name

  notes: string | null
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
  contact?:         number
  account?:         number
  type?:            TransactionType
  document?:        number
  date_from?:       string
  date_to?:         string
  is_doc_deleted?:  boolean
  include_records?: boolean
  page?:            number
  page_size?:       number   // ← added
}

export interface TransactionUpdatePayload {
  amount?:          string
  date?:            string
  notes?:           string
  payment_account?: number | null
}
