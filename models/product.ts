// models/product.ts

export interface Product {
  id: number
  name: string
  description: string | null
  image_url: string | null
  rate: string | null               // default selling/purchase rate
  current_stock: string             // signed decimal string
  minimum_stock: string | null      // low stock threshold
  hsn_code: string | null
  unit: string | null               // kg, pcs, liters, etc.
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

export const formatStock = (product: Product): string => {
  const qty = parseFloat(product.current_stock)
  return `${qty} ${product.unit || 'units'}`
}
