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
} from '@/models/document'
import type { PaginatedResponse } from '@/models/pagination'

export interface DocumentListParams {
  type?: string
  contact?: number
  date_from?: string
  date_to?: string
  reference?: number
  search?: string
  page?: number
  page_size?: number
  is_paid?: boolean        // ✅ filter by manual paid flag
}

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

  // POST /documents/{id}/mark_paid/  ← ✅ new — just flips is_paid flag
  markPaid: (id: number, data: MarkPaidPayload) =>
    api.post<Document>(`/documents/${id}/mark_paid/`, data).then(r => r.data),

  // POST /documents/{id}/record_payment/ ← creates actual f.txn
  recordPayment: (id: number, data: RecordPaymentPayload) =>
    api.post(`/documents/${id}/record_payment/`, data).then(r => r.data),

  // POST /documents/{id}/move_stock/
  moveStock: (id: number, data: MoveStockPayload) =>
    api.post(`/documents/${id}/move_stock/`, data).then(r => r.data),

  // GET /documents/{id}/stock_preview/
  stockPreview: (id: number) =>
    api.get<StockPreviewItem[]>(`/documents/${id}/stock_preview/`).then(r => r.data),

  // POST /documents/{id}/add_details/
  addDetails: (id: number, data: AddDetailsPayload) =>
    api.post<Document>(`/documents/${id}/add_details/`, data).then(r => r.data),

  // POST /documents/{id}/delete_document/
  deleteDocument: (id: number, data: DeleteDocumentPayload) =>
    api.post(`/documents/${id}/delete_document/`, data).then(r => r.data),

  // GET /documents/{id}/print/ — returns PDF blob
  print: (id: number) =>
    api.get(`/documents/${id}/print/`, { responseType: 'blob' }).then(r => r.data),

  // ✅ Returns the direct PDF URL using the same baseURL as the axios instance
  // Use this for <PdfViewer url={...}> and download links instead of hardcoding
  getPdfUrl: (id: number): string => {
    const base = (
      api.defaults.baseURL ??
      process.env.NEXT_PUBLIC_API_URL ??
      ''
    ).replace(/\/+$/, '')
    return `${base}/documents/${id}/print/`
  },

  // POST /documents/standalone_interest/
  standaloneInterest: (data: StandaloneInterestPayload) =>
    api.post<{ interest_doc: number; ftxn: number }>('/documents/standalone_interest/', data).then(r => r.data),

  // GET /documents/{id}/reference_data/
  referenceData: (id: number) =>
    api.get<ReferenceData>(`/documents/${id}/reference_data/`).then(r => r.data),
}
