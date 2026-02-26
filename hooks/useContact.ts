// hooks/useContact.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactService } from '@/services/contactService'
import type { ContactCreate, ContactUpdate } from '@/models/contact'
import type { SendReceivePayload, TransactionListParams } from '@/models/transaction'
import type { DocumentListParams } from '@/services/documentService'

export const CONTACTS_KEY = ['contacts'] as const
export const contactKey     = (id: number) => ['contacts', id] as const
export const ledgerKey      = (id: number) => ['contacts', id, 'ledger'] as const
export const contactDocsKey = (id: number) => ['contacts', id, 'documents'] as const

export function useContacts(params?: { search?: string; is_active?: boolean; page?: number }) {
  return useQuery({
    queryKey: [...CONTACTS_KEY, params],
    queryFn: () => contactService.list(params),
  })
}

export function useContact(id: number) {
  return useQuery({
    queryKey: contactKey(id),
    queryFn: () => contactService.get(id),
    enabled: !!id,
  })
}

// Ledger — uses TransactionListParams minus 'contact' (contact is injected by service)
export function useContactLedger(
  id: number,
  params?: Omit<TransactionListParams, 'contact'>
) {
  return useQuery({
    queryKey: [...ledgerKey(id), params],
    queryFn: () => contactService.ledger(id, params),
    enabled: !!id,
  })
}

// Documents tab — separate from ledger, shows bills/invoices/etc for this contact
export function useContactDocuments(
  id: number,
  params?: Omit<DocumentListParams, 'contact'>
) {
  return useQuery({
    queryKey: [...contactDocsKey(id), params],
    queryFn: () => contactService.documents(id, params),
    enabled: !!id,
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ContactCreate) => contactService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONTACTS_KEY }),
  })
}

export function useUpdateContact(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ContactUpdate) => contactService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKey(id) })
      qc.invalidateQueries({ queryKey: CONTACTS_KEY })
    },
  })
}

// Send — covers plain send, expense (is_expense:true), voucher, with/without interest
export function useSend(contactId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SendReceivePayload) => contactService.send(contactId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ledgerKey(contactId) })
      qc.invalidateQueries({ queryKey: contactKey(contactId) })
      qc.invalidateQueries({ queryKey: CONTACTS_KEY })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['documents'] })  // voucher doc created on backend
    },
  })
}

// Receive — covers plain receive, voucher, with/without interest
export function useReceive(contactId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SendReceivePayload) => contactService.receive(contactId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ledgerKey(contactId) })
      qc.invalidateQueries({ queryKey: contactKey(contactId) })
      qc.invalidateQueries({ queryKey: CONTACTS_KEY })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['documents'] })  // voucher doc created on backend
    },
  })
}
