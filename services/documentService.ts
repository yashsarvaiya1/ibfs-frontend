// services/documentService.ts
import api from '@/lib/axios'
import type {
  Document,
  DocumentListItem,
  DocumentCreate,
  DocumentUpdate,
  RecordPaymentPayload,
  MoveStockPayload,
  StockPreviewItem,
  DeleteDocumentPayload,
} from '@/models/document'
import type { PaginatedResponse } from '@/models/pagination'

// Exported so contactService + other consumers can reuse this type
export interface DocumentListParams {
  type?: string
  contact?: number
  date_from?: string
  date_to?: string
  reference?: number
  search?: string
  page?: number
  page_size?: number
  is_active?: boolean 
}

// Re-export so contactService can import DocumentListItem from this file
export type { DocumentListItem }

export const documentService = {
  list: (params?: DocumentListParams) =>
    api.get<PaginatedResponse<DocumentListItem>>('/documents/', { params }).then(r => r.data),

  get: (id: number) =>
    api.get<Document>(`/documents/${id}/`).then(r => r.data),

  create: (data: DocumentCreate) =>
    api.post<Document>('/documents/', data).then(r => r.data),

  update: (id: number, data: DocumentUpdate) =>
    api.patch<Document>(`/documents/${id}/`, data).then(r => r.data),

  recordPayment: (id: number, data: RecordPaymentPayload) =>
    api.post(`/documents/${id}/record_payment/`, data).then(r => r.data),

  moveStock: (id: number, data: MoveStockPayload) =>
    api.post(`/documents/${id}/move_stock/`, data).then(r => r.data),

  stockPreview: (id: number) =>
    api.get<StockPreviewItem[]>(`/documents/${id}/stock_preview/`).then(r => r.data),

  addDetails: (id: number, data: { line_items: DocumentCreate['line_items'] }) =>
    api.post<Document>(`/documents/${id}/add_details/`, data).then(r => r.data),

  deleteDocument: (id: number, data: DeleteDocumentPayload) =>
    api.post(`/documents/${id}/delete_document/`, data).then(r => r.data),
}
