// models/transaction.ts

export type TransactionType = 'record' | 'actual' | 'contra'

export interface FinancialTransaction {
  id: number
  type: TransactionType
  date: string
  amount: string                 // signed Decimal as string
  document: number | null
  document_type: string | null 
  contact: number | null
  payment_account: number | null
  notes: string | null
  monthly_cumulative_delta: string
  is_doc_deleted: boolean
  created_at: string
  updated_at: string
}

export interface SendReceivePayload {
  amount: string
  payment_account: number
  date?: string
  notes?: string
  document?: number              // optional doc linkage
  is_expense?: boolean
  line_items?: { name: string; amount: number }[]
  interest_lines?: {
    name: string
    amount: number
    type: 'charge' | 'discount'
  }[]
}

export interface LinkDocumentPayload {
  document: number | null
}
