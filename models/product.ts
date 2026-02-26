// models/product.ts

export interface Product {
  id: number
  name: string
  description: string | null
  image_url: string | null
  rate: string
  current_stock: string
  min_stock: string
  hsn_code: string | null
  unit: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductListItem {
  id: number
  name: string
  rate: string
  current_stock: string
  min_stock: string
  hsn_code: string | null         // now included from backend fix
  unit: string
  is_active: boolean
}

export type ProductCreate = Omit<Product, 'id' | 'created_at' | 'updated_at'>
export type ProductUpdate = Partial<ProductCreate>

export interface AdjustStockPayload {
  quantity: string
  rate?: string
  notes?: string
  date?: string
}

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
