// services/documentService.ts
import api from '@/lib/axios'
import {
  Document, DocumentCreate, DocumentListItem,
  RecordPaymentPayload, MoveStockPayload,
  StockPreviewItem, DeleteStrategy
} from '@/models/document'
import { PaginatedResponse } from '@/models/pagination'

export const documentService = {
  list: (params?: { type?: string; contact?: number; page?: number; search?: string }) =>
    api.get<PaginatedResponse<DocumentListItem>>('/documents/', { params }).then(r => r.data),

  get: (id: number) =>
    api.get<Document>(`/documents/${id}/`).then(r => r.data),

  create: (data: DocumentCreate) =>
    api.post<Document>('/documents/', data).then(r => r.data),

  update: (id: number, data: Partial<DocumentCreate>) =>
    api.patch<Document>(`/documents/${id}/`, data).then(r => r.data),

  recordPayment: (id: number, data: RecordPaymentPayload) =>
    api.post(`/documents/${id}/record_payment/`, data).then(r => r.data),

  moveStock: (id: number, data: MoveStockPayload) =>
    api.post(`/documents/${id}/move_stock/`, data).then(r => r.data),

  stockPreview: (id: number) =>
    api.get<StockPreviewItem[]>(`/documents/${id}/stock_preview/`).then(r => r.data),

  addDetails: (id: number, data: { line_items: import('@/models/document').LineItem[] }) =>
    api.post<Document>(`/documents/${id}/add_details/`, data).then(r => r.data),

  deleteDocument: (id: number, strategy: DeleteStrategy) =>
    api.post(`/documents/${id}/delete_document/`, { strategy }).then(r => r.data),
}
