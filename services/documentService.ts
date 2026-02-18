// services/documentService.ts

import api from '@/lib/axios'
import { Document, DocumentFormData, DocumentType } from '@/models/document'
import { FinancialTransaction } from '@/models/transaction'
import { StockTransaction } from '@/models/stockTransaction'
import { PaginatedResponse } from '@/models/pagination'

const BASE = '/accounting/documents'

export interface DeleteResolutionPayload {
  payment_transaction_actions: Record<string, 'revert' | 'keep'>
  stock_transaction_actions: Record<string, 'revert' | 'keep'>
}

export interface LinkedEntriesResponse {
  payment_transactions: FinancialTransaction[]
  stock_transactions: StockTransaction[]
}

export const documentService = {
  list: (params?: {
    page?: number
    type?: DocumentType
    contact?: number
    include_inactive?: boolean
  }) => api.get<PaginatedResponse<Document>>(`${BASE}/`, { params }),

  get: (id: number) =>
    api.get<Document>(`${BASE}/${id}/`),

  create: (data: DocumentFormData) =>
    api.post<Document>(`${BASE}/`, data),

  update: (id: number, data: Partial<DocumentFormData>) =>
    api.patch<Document>(`${BASE}/${id}/`, data),

  // Returns 409 if linked entries exist → show resolution dialog
  delete: (id: number) =>
    api.delete(`${BASE}/${id}/`),

  // Full deletion with user choices for each linked entry
  deleteWithResolution: (id: number, payload: DeleteResolutionPayload) =>
    api.post(`${BASE}/${id}/delete_with_resolution/`, payload),
}
