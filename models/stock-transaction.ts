export type StockTransactionType = 'record' | 'actual'

export interface StockTransaction {
  id:                  number
  type:                StockTransactionType
  date:                string
  quantity:            string        // Decimal string, signed
  rate:                string | null
  notes:               string | null
  is_document_deleted: boolean       // correctly matches backend
  created_at:          string
  updated_at:          string

  document: number | null
  product:  number | null
}

export interface StockTransactionListParams {
  product?:            number
  document?:           number
  type?:               StockTransactionType
  is_document_deleted?: boolean
  date_from?:          string
  date_to?:            string
  page?:               number
  page_size?:          number
}

export interface StockTransactionUpdatePayload {
  quantity?: string
  date?:     string
  rate?:     string
  notes?:    string
}

// Global adjust — POST /stock-transactions/adjust/
export interface GlobalAdjustStockPayload {
  product:  number
  quantity: string   // signed
  date?:    string
  rate?:    string
  notes?:   string
}
