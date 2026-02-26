// hooks/useContacts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactService } from '@/services/contactService'
import { ContactCreate, ContactUpdate } from '@/models/contact'
import { SendReceivePayload } from '@/models/transaction'

export const CONTACTS_KEY = ['contacts']
export const contactKey    = (id: number) => ['contacts', id]
export const ledgerKey     = (id: number) => ['contacts', id, 'ledger']
export const contactDocsKey = (id: number) => ['contacts', id, 'documents']

export function useContacts(params?: { search?: string; is_active?: boolean; page?: number }) {
  return useQuery({
    queryKey: [...CONTACTS_KEY, params],
    queryFn:  () => contactService.list(params),
  })
}

export function useContact(id: number) {
  return useQuery({
    queryKey: contactKey(id),
    queryFn:  () => contactService.get(id),
    enabled:  !!id,
  })
}

// fix: now returns PaginatedResponse, supports exclude_type for bug #15
export function useContactLedger(
  id: number,
  params?: { exclude_type?: string; page?: number }
) {
  return useQuery({
    queryKey: [...ledgerKey(id), params],
    queryFn:  () => contactService.ledger(id, params),
    enabled:  !!id,
  })
}

// new: fetch documents for a contact — bug #16 (separate Documents tab)
export function useContactDocuments(
  id: number,
  params?: { type?: string; page?: number }
) {
  return useQuery({
    queryKey: [...contactDocsKey(id), params],
    queryFn:  () => contactService.documents(id, params),
    enabled:  !!id,
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ContactCreate) => contactService.create(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: CONTACTS_KEY }),
  })
}

export function useUpdateContact(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ContactUpdate) => contactService.update(id, data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: contactKey(id) })
      qc.invalidateQueries({ queryKey: CONTACTS_KEY })
    },
  })
}

export function useSend(contactId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SendReceivePayload) => contactService.send(contactId, data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ledgerKey(contactId) })
      qc.invalidateQueries({ queryKey: contactKey(contactId) })
      qc.invalidateQueries({ queryKey: CONTACTS_KEY })
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useReceive(contactId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SendReceivePayload) => contactService.receive(contactId, data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ledgerKey(contactId) })
      qc.invalidateQueries({ queryKey: contactKey(contactId) })
      qc.invalidateQueries({ queryKey: CONTACTS_KEY })
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
