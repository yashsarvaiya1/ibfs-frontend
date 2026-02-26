// models/product.ts

export interface Product {
  id: number
  name: string
  description: string | null
  image_url: string | null
  rate: string                   // Decimal as string
  current_stock: string          // Decimal as string
  min_stock: string              // Decimal as string
  hsn_code: string | null
  unit: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Matches ProductListSerializer fields exactly
export interface ProductListItem {
  id: number
  name: string
  rate: string
  current_stock: string
  min_stock: string
  hsn_code: string | null
  unit: string
  is_active: boolean
}

export type ProductCreate = Omit<Product, 'id' | 'created_at' | 'updated_at'>
export type ProductUpdate = Partial<ProductCreate>

// Payload for POST /products/{id}/adjust_stock/
export interface AdjustStockPayload {
  quantity: string               // signed — positive or negative
  rate?: string
  notes?: string
  date?: string
}

// Payload for POST /products/{id}/set_stock/
export interface SetStockPayload {
  current_stock: string
}

// Response from GET /products/{id}/pending_moves/
// Matches inventory/views.py ProductViewSet.pending_moves exactly
export interface PendingMove {
  document_id: number
  doc_id: string
  doc_type: string
  contact: string | null
  date: string
  record_qty: string
  moved_qty: string
  remaining_qty: string
}
