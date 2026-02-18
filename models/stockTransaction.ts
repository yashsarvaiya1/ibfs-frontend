// models/stockTransaction.ts

export interface StockTransaction {
  id: number
  document: number | null
  product: number
  quantity: string
  transaction_date: string
  rate: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface StockTransactionFormData {
  document?: number | null
  product: number
  quantity: string
  transaction_date: string
  rate?: string
  notes?: string
}
