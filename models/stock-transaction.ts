// models/stock-transaction.ts
export type StockTransactionType = 'record' | 'actual'

export interface StockTransaction {
  id:                  number
  type:                StockTransactionType
  date:                string
  quantity:            string        // Decimal string, signed
  rate:                string | null
  notes:               string | null
  is_document_deleted: boolean
  created_at:          string
  updated_at:          string
  document:            number | null
  product:             number | null
  // ✅ Display fields — backend now resolves these directly
  product_name:        string | null
  doc_id:              string | null  // e.g. "BILL-0001"
  doc_type:            string | null  // e.g. "bill"
  contact_name:        string | null
}

export interface StockTransactionListParams {
  product?:             number
  document?:            number
  type?:                StockTransactionType
  is_document_deleted?: boolean
  date_from?:           string
  date_to?:             string
  page?:                number
  page_size?:           number
}

export interface StockTransactionUpdatePayload {
  quantity?: string
  date?:     string
  rate?:     string
  notes?:    string
}

export interface GlobalAdjustStockPayload {
  product:  number
  quantity: string   // signed
  date?:    string
  rate?:    string
  notes?:   string
}
