// services/productService.ts
import api from '@/lib/axios'
import { Product, ProductCreate, ProductUpdate, ProductListItem, AdjustStockPayload, PendingMove } from '@/models/product'
import { PaginatedResponse } from '@/models/pagination'

export const productService = {
  list: (params?: { search?: string; is_active?: boolean; low_stock?: boolean; page?: number }) =>
    api.get<PaginatedResponse<ProductListItem>>('/products/', { params }).then(r => r.data),

  get: (id: number) =>
    api.get<Product>(`/products/${id}/`).then(r => r.data),

  create: (data: ProductCreate) =>
    api.post<Product>('/products/', data).then(r => r.data),

  update: (id: number, data: ProductUpdate) =>
    api.patch<Product>(`/products/${id}/`, data).then(r => r.data),

  adjustStock: (id: number, data: AdjustStockPayload) =>
    api.post(`/products/${id}/adjust_stock/`, data).then(r => r.data),

  setStock: (id: number, current_stock: string) =>
    api.post<Product>(`/products/${id}/set_stock/`, { current_stock }).then(r => r.data),

  pendingMoves: (id: number) =>
    api.get<PendingMove[]>(`/products/${id}/pending_moves/`).then(r => r.data),

  moveStockFromProduct: (id: number, data: { document_id: number; quantity: number; date?: string }) =>
    api.post(`/products/${id}/move_stock_from_product/`, data).then(r => r.data),
}
