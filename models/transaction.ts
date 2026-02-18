// models/transaction.ts

export type TransactionType = 'record' | 'payment' | 'contra'

export interface FinancialTransaction {
  id: number
  transaction_type: TransactionType
  transaction_date: string
  amount: string
  document: number | null
  contact: number | null
  payment_account: number | null
  notes: string | null
  monthly_cumulative_delta: string
  created_at: string
  updated_at: string
}

export interface FinancialTransactionFormData {
  transaction_type: TransactionType
  transaction_date: string
  amount: string
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
