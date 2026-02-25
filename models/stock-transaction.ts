// models/stock-transaction.ts

export type StockTransactionType = 'record' | 'actual'

export interface StockTransaction {
  id: number
  type: StockTransactionType
  document: number | null
  product: number
  quantity: string               // signed Decimal as string
  date: string
  rate: string | null
  notes: string | null
  is_doc_deleted: boolean
  created_at: string
  updated_at: string
}

export interface AdjustStockGlobalPayload {
  product: number
  quantity: string
  rate?: string
  notes?: string
  date?: string
}
