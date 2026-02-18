// models/stockTransaction.ts

export interface StockTransaction {
  id: number
  document: number | null
  product: number
  quantity: string                  // signed — positive=IN, negative=OUT
  transaction_date: string
  rate: string | null
  notes: string | null
  // True when the linked document was soft-deleted
  // Frontend shows "Stock came from deleted Bill #101"
  // User can re-link to a new document anytime
  is_document_deleted: boolean
  created_at: string
  updated_at: string
}

export interface StockTransactionFormData {
  document?: number | null
  product: number
  quantity: string                  // signed string
  transaction_date: string
  rate?: string
  notes?: string
}
