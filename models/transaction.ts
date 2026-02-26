// models/transaction.ts

export type TransactionType = 'record' | 'actual' | 'contra'

export interface FinancialTransaction {
  id: number
  type: TransactionType
  date: string
  amount: string                   // signed Decimal as string
  document: number | null
  document_type: string | null
  contact: number | null
  contact_name: string | null      // fix: denormalized from backend
  payment_account: number | null
  payment_account_name: string | null  // fix: denormalized from backend
  notes: string | null
  monthly_cumulative_delta: string
  is_doc_deleted: boolean
  created_at: string
  updated_at: string
}

export interface InterestLine {
  name: string
  amount: number
  type: 'charge' | 'discount'
}

export interface SendReceivePayload {
  amount: string
  payment_account?: number
  date?: string
  notes?: string
  document?: number               // optional doc linkage
  is_expense?: boolean
  line_items?: { name: string; amount: number }[]
  interest_lines?: InterestLine[]
  attachment_urls?: string[]      // Added for bug #5 (Expense/Vouchers from Contact Page)
}

export interface LinkDocumentPayload {
  document: number | null
}

export interface TransactionListParams {
  contact?: number
  account?: number
  type?: string
  exclude_type?: string           // fix for bug #15 — filter out record txns
  document?: number
  page?: number
}
