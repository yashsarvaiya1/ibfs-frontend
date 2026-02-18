// models/product.ts

export interface Product {
  id: number
  name: string
  description: string | null
  image_url: string | null
  rate: string | null
  current_stock: string
  minimum_stock: string | null
  hsn_code: string | null
  unit: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductFormData {
  name: string
  description?: string
  image_url?: string
  rate?: string
  current_stock?: string
  minimum_stock?: string
  hsn_code?: string
  unit?: string
}

export const isLowStock = (product: Product): boolean => {
  if (!product.minimum_stock) return false
  return parseFloat(product.current_stock) < parseFloat(product.minimum_stock)
}
