// services/contactService.ts

import api from '@/lib/axios'
import { Contact, ContactFormData } from '@/models/contact'
import { PaginatedResponse } from '@/models/pagination'

const BASE = '/contacts'

export const contactService = {
  list: (params?: { page?: number; include_inactive?: boolean }) =>
    api.get<PaginatedResponse<Contact>>(`${BASE}/`, { params }),

  get: (id: number) =>
    api.get<Contact>(`${BASE}/${id}/`),

  create: (data: ContactFormData) =>
    api.post<Contact>(`${BASE}/`, data),

  update: (id: number, data: Partial<ContactFormData>) =>
    api.patch<Contact>(`${BASE}/${id}/`, data),

  delete: (id: number) =>
    api.delete(`${BASE}/${id}/`),
}
