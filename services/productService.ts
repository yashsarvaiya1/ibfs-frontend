// services/productService.ts

import api from '@/lib/axios'
import { Product, ProductFormData } from '@/models/product'
import { PaginatedResponse } from '@/models/pagination'

const BASE = '/inventory/products'

export const productService = {
  list: (params?: { page?: number; include_inactive?: boolean }) =>
    api.get<PaginatedResponse<Product>>(`${BASE}/`, { params }),

  get: (id: number) =>
    api.get<Product>(`${BASE}/${id}/`),

  create: (data: ProductFormData) =>
    api.post<Product>(`${BASE}/`, data),

  update: (id: number, data: Partial<ProductFormData>) =>
    api.patch<Product>(`${BASE}/${id}/`, data),

  delete: (id: number) =>
    api.delete(`${BASE}/${id}/`),
}
