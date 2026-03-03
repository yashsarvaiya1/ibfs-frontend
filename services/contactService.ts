import api from '@/lib/axios'
import type { Contact, ContactCreate, ContactUpdate } from '@/models/contact'
import type { FinancialTransaction, SendReceivePayload, TransactionListParams } from '@/models/transaction'
import type { DocumentListParams, DocumentListItem } from './documentService'
import type { PaginatedResponse } from '@/models/pagination'

export const contactService = {
  list: (params?: { search?: string; is_active?: boolean; page?: number }) =>
    api.get<PaginatedResponse<Contact>>('/contacts/', { params }).then(r => r.data),

  get: (id: number) =>
    api.get<Contact>(`/contacts/${id}/`).then(r => r.data),

  create: (data: ContactCreate) =>
    api.post<Contact>('/contacts/', data).then(r => r.data),

  update: (id: number, data: ContactUpdate) =>
    api.patch<Contact>(`/contacts/${id}/`, data).then(r => r.data),

  remove: (id: number) =>
    api.delete(`/contacts/${id}/`),

  // GET /contacts/{id}/ledger/ — dedicated backend action, returns full non-paginated list
  // ordered by date, created_at. Use this for the contact ledger page.
  ledger: (id: number) =>
    api.get<FinancialTransaction[]>(`/contacts/${id}/ledger/`).then(r => r.data),

  // GET /documents/?contact={id} — paginated document list filtered by contact
  documents: (id: number, params?: Omit<DocumentListParams, 'contact'>) =>
    api.get<PaginatedResponse<DocumentListItem>>(
      '/documents/', { params: { contact: id, ...params } }
    ).then(r => r.data),

  // POST /contacts/{id}/send/
  send: (id: number, data: SendReceivePayload) =>
    api.post(`/contacts/${id}/send/`, data).then(r => r.data),

  // POST /contacts/{id}/receive/
  receive: (id: number, data: SendReceivePayload) =>
    api.post(`/contacts/${id}/receive/`, data).then(r => r.data),
}
