// services/contactService.ts
import api from '@/lib/axios'
import type { Contact, ContactCreate, ContactUpdate } from '@/models/contact'
import type {
  FinancialTransaction,
  SendReceivePayload,
  LedgerParams,
} from '@/models/transaction'
import type {
  DocumentListParams,
  DocumentListItem,
} from './documentService'
import type {
  PaginatedResponse,
  LedgerResponse,
} from '@/models/pagination'

export const contactService = {
  list: (params?: { search?: string; is_active?: boolean; page?: number }) =>
    api
      .get<PaginatedResponse<Contact>>('/contacts/', { params })
      .then(r => r.data),

  get: (id: number) =>
    api.get<Contact>(`/contacts/${id}/`).then(r => r.data),

  create: (data: ContactCreate) =>
    api.post<Contact>('/contacts/', data).then(r => r.data),

  update: (id: number, data: ContactUpdate) =>
    api.patch<Contact>(`/contacts/${id}/`, data).then(r => r.data),

  remove: (id: number) =>
    api.delete(`/contacts/${id}/`),

  /**
   * GET /contacts/{id}/ledger/
   * Now paginated and enriched:
   *  - results: FinancialTransaction[]
   *  - opening_balance_at: string
   *  - total_pages, current_page, page_size
   */
  ledger: (id: number, params?: LedgerParams) =>
    api
      .get<LedgerResponse>(`/contacts/${id}/ledger/`, { params })
      .then(r => r.data),

  // GET /documents/?contact={id}
  documents: (id: number, params?: Omit<DocumentListParams, 'contact'>) =>
    api
      .get<PaginatedResponse<DocumentListItem>>(
        '/documents/',
        { params: { contact: id, ...params } },
      )
      .then(r => r.data),

  send: (id: number, data: SendReceivePayload) =>
    api.post(`/contacts/${id}/send/`, data).then(r => r.data),

  receive: (id: number, data: SendReceivePayload) =>
    api.post(`/contacts/${id}/receive/`, data).then(r => r.data),
}
