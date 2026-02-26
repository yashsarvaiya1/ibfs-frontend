// models/stock-transaction.ts
export type StockTransactionType = 'record' | 'actual'

export interface StockTransaction {
  id:             number
  type:           StockTransactionType
  date:           string
  quantity:       string        // Decimal string, signed
  rate:           string | null
  notes:          string | null
  is_doc_deleted: boolean
  created_at:     string
  updated_at:     string

  // FK IDs
  document: number | null
  product:  number | null

  // Denormalized read-only display fields (serializer annotations)
  product_name:    string | null
  document_type:   string | null
  document_doc_id: string | null
  contact_name:    string | null
}

export interface StockTransactionListParams {
  product?:        number
  document?:       number
  type?:           StockTransactionType
  is_doc_deleted?: boolean
  date_from?:      string
  date_to?:        string
  page?:           number
  page_size?:      number
}

export interface StockTransactionUpdatePayload {
  quantity?: string
  date?:     string
  rate?:     string
  notes?:    string
}

// Global adjust — product is a body field (no URL context)
// Named differently from product.ts AdjustStockPayload (which uses URL product id)
export interface GlobalAdjustStockPayload {
  product:  number
  quantity: string   // signed
  date?:    string
  rate?:    string
  notes?:   string
}
