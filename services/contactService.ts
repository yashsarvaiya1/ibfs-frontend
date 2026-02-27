// services/contactService.ts
import api from '@/lib/axios'
import type { Contact, ContactCreate, ContactUpdate } from '@/models/contact'
import type { FinancialTransaction, SendReceivePayload, TransactionListParams } from '@/models/transaction'
import type { DocumentListItem, DocumentListParams } from './documentService'
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

  // Ledger = financial transactions filtered by contact
  // Passes through to GET /transactions/?contact={id}
  // Backend auto-hides record txns when auto_transaction=ON unless include_records=true
  ledger: (id: number, params?: Omit<TransactionListParams, 'contact'>) =>
    api.get<PaginatedResponse<FinancialTransaction>>(
      '/transactions/', { params: { contact: id,include_records: true, ...params } }
    ).then(r => r.data),

  // Documents tab on contact page — GET /documents/?contact={id}
  documents: (id: number, params?: Omit<DocumentListParams, 'contact'>) =>
    api.get<PaginatedResponse<DocumentListItem>>(
      '/documents/', { params: { contact: id, ...params } }
    ).then(r => r.data),

  // POST /contacts/{id}/send/  — direction derived server-side
  send: (id: number, data: SendReceivePayload) =>
    api.post(`/contacts/${id}/send/`, data).then(r => r.data),

  // POST /contacts/{id}/receive/
  receive: (id: number, data: SendReceivePayload) =>
    api.post(`/contacts/${id}/receive/`, data).then(r => r.data),
}
