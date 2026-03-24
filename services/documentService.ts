// services/documentService.ts
import api from '@/lib/axios'
import type {
  Document,
  DocumentListItem,
  DocumentCreate,
  DocumentUpdate,
  RecordPaymentPayload,
  MarkPaidPayload,
  MoveStockPayload,
  StockPreviewItem,
  DeleteDocumentPayload,
  AddDetailsPayload,
  StandaloneInterestPayload,
  ReferenceData,
  BulkPrintPayload,
  DocumentListParams,
} from '@/models/document'
import type { PaginatedResponse } from '@/models/pagination'

export type { DocumentListItem }
export type { DocumentListParams }

export const documentService = {
  list: (params?: DocumentListParams) =>
    api
      .get<PaginatedResponse<DocumentListItem>>('/documents/', { params })
      .then(r => r.data),

  get: (id: number) =>
    api.get<Document>(`/documents/${id}/`).then(r => r.data),

  create: (data: DocumentCreate) =>
    api.post<Document>('/documents/', data).then(r => r.data),

  update: (id: number, data: DocumentUpdate) =>
    api.patch<Document>(`/documents/${id}/`, data).then(r => r.data),

  markPaid: (id: number, data: MarkPaidPayload) =>
    api.post<Document>(`/documents/${id}/mark_paid/`, data).then(r => r.data),

  recordPayment: (id: number, data: RecordPaymentPayload) =>
    api.post(`/documents/${id}/record_payment/`, data).then(r => r.data),

  moveStock: (id: number, data: MoveStockPayload) =>
    api.post(`/documents/${id}/move_stock/`, data).then(r => r.data),

  stockPreview: (id: number) =>
    api
      .get<StockPreviewItem[]>(`/documents/${id}/stock_preview/`)
      .then(r => r.data),

  addDetails: (id: number, data: AddDetailsPayload) =>
    api
      .post<Document>(`/documents/${id}/add_details/`, data)
      .then(r => r.data),

  deleteDocument: (id: number, data: DeleteDocumentPayload) =>
    api.post(`/documents/${id}/delete_document/`, data).then(r => r.data),

  // Single document PDF
  print: (id: number) =>
    api
      .get(`/documents/${id}/print/`, { responseType: 'blob' })
      .then(r => r.data),

  getPdfUrl: (id: number): string => {
    const base = (
      api.defaults.baseURL ??
      process.env.NEXT_PUBLIC_API_URL ??
      ''
    ).replace(/\/+$/, '')
    return `${base}/documents/${id}/print/`
  },

  // DV-04 / DV-05: Bulk print — merged PDF
  // If payload.ids provided → selected docs; if omitted → current filters on backend
  bulkPrint: (payload?: BulkPrintPayload) =>
    api
      .post('/documents/bulk_print/', payload ?? {}, { responseType: 'blob' })
      .then(r => r.data),

  standaloneInterest: (data: StandaloneInterestPayload) =>
    api
      .post<{ interest_doc: number; ftxn: number }>(
        '/documents/standalone_interest/',
        data,
      )
      .then(r => r.data),

  referenceData: (id: number) =>
    api
      .get<ReferenceData>(`/documents/${id}/reference_data/`)
      .then(r => r.data),
}
