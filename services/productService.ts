// services/productService.ts
import api from '@/lib/axios'
import type {
  Product, ProductCreate, ProductUpdate,
  ProductListItem, AdjustStockPayload,
  SetStockPayload, PendingMove,
} from '@/models/product'
import type { PaginatedResponse } from '@/models/pagination'

export const productService = {
  list: (params?: {
    search?: string
    is_active?: boolean
    low_stock?: boolean
    page?: number
  }) =>
    api.get<PaginatedResponse<ProductListItem>>('/products/', { params }).then(r => r.data),

  get: (id: number) =>
    api.get<Product>(`/products/${id}/`).then(r => r.data),

  create: (data: ProductCreate) =>
    api.post<Product>('/products/', data).then(r => r.data),

  update: (id: number, data: ProductUpdate) =>
    api.patch<Product>(`/products/${id}/`, data).then(r => r.data),

  // Creates actual s.txn, updates current_stock — quantity can be + or −
  adjustStock: (id: number, data: AdjustStockPayload) =>
    api.post(`/products/${id}/adjust_stock/`, data).then(r => r.data),

  // Direct overwrite — NO s.txn created (matches spec 3.3 Direct Edit)
  setStock: (id: number, data: SetStockPayload) =>
    api.post<Product>(`/products/${id}/set_stock/`, data).then(r => r.data),

  // GET /products/{id}/pending_moves/ — grouped by document
  pendingMoves: (id: number) =>
    api.get<PendingMove[]>(`/products/${id}/pending_moves/`).then(r => r.data),

  // Triggers process_move_stock for one product+document from product page
  moveStockFromProduct: (id: number, data: {
    document_id: number
    quantity: number
    date?: string
  }) =>
    api.post(`/products/${id}/move_stock_from_product/`, data).then(r => r.data),
}
