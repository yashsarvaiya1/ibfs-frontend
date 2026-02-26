// services/contactService.ts
import api from '@/lib/axios'
import { Contact, ContactCreate, ContactUpdate } from '@/models/contact'
import { FinancialTransaction, SendReceivePayload } from '@/models/transaction'
import { DocumentListItem } from '@/models/document'
import { PaginatedResponse } from '@/models/pagination'

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

  // fix: returns PaginatedResponse not plain array
  ledger: (id: number, params?: { exclude_type?: string; page?: number }) =>
    api.get<PaginatedResponse<FinancialTransaction>>(
      `/transactions/`, { params: { contact: id, ...params } }
    ).then(r => r.data),

  // new: fetch documents for a contact (bug #16 — separate tab)
  documents: (id: number, params?: { type?: string; page?: number }) =>
    api.get<PaginatedResponse<DocumentListItem>>(
      `/documents/`, { params: { contact: id, ...params } }
    ).then(r => r.data),

  send: (id: number, data: SendReceivePayload) =>
    api.post(`/contacts/${id}/send/`, data).then(r => r.data),

  receive: (id: number, data: SendReceivePayload) =>
    api.post(`/contacts/${id}/receive/`, data).then(r => r.data),
}
