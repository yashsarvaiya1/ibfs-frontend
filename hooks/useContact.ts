// hooks/useContacts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactService } from '@/services/contactService'
import type { ContactCreate, ContactUpdate } from '@/models/contact'
import type { SendReceivePayload, LedgerParams } from '@/models/transaction'
import type { DocumentListParams } from '@/models/document'

export const CONTACTS_KEY   = ['contacts'] as const
export const contactKey     = (id: number) => ['contacts', id] as const

// Includes params in key — different filter/page combos cache independently
export const ledgerKey      = (id: number, params?: LedgerParams) =>
  ['contacts', id, 'ledger', params] as const

export const contactDocsKey = (id: number) => ['contacts', id, 'documents'] as const

export function useContacts(params?: { search?: string; is_active?: boolean; page?: number }) {
  return useQuery({
    queryKey: [...CONTACTS_KEY, params],
    queryFn: () => contactService.list(params),
  })
}

export function useContact(id: number | undefined) {
  return useQuery({
    queryKey: contactKey(id ?? 0),
    queryFn:  () => contactService.get(id!),
    enabled:  !!id,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * GET /contacts/{id}/ledger/
 * Now paginated — returns LedgerResponse:
 *   { count, total_pages, current_page, page_size, next, previous,
 *     opening_balance_at, results: FinancialTransaction[] }
 *
 * opening_balance_at = CF just before the first filtered txn (TV-05).
 * Pass this to <ContactLedger openingBalance={Number(data.opening_balance_at)} />.
 *
 * Supports filters: date_from, date_to, type, account, page, page_size (GD-03).
 */
export function useContactLedger(id: number, params?: LedgerParams) {
  return useQuery({
    queryKey: ledgerKey(id, params),
    queryFn:  () => contactService.ledger(id, params),
    enabled:  !!id,
  })
}

/**
 * Helper to invalidate all ledger cache entries for a contact regardless of params.
 * Use this in mutation onSuccess instead of invalidating a specific param combo.
 */
export function invalidateLedger(qc: ReturnType<typeof useQueryClient>, contactId: number) {
  qc.invalidateQueries({ queryKey: ['contacts', contactId, 'ledger'] })
}

// GET /documents/?contact={id} — paginated, supports filtering
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

export function useSend(contactId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SendReceivePayload) => contactService.send(contactId, data),
    onSuccess: () => {
      // Invalidate all ledger combos for this contact (partial key match)
      qc.invalidateQueries({ queryKey: ['contacts', contactId, 'ledger'] })
      qc.invalidateQueries({ queryKey: contactKey(contactId) })
      qc.invalidateQueries({ queryKey: CONTACTS_KEY })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useReceive(contactId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SendReceivePayload) => contactService.receive(contactId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts', contactId, 'ledger'] })
      qc.invalidateQueries({ queryKey: contactKey(contactId) })
      qc.invalidateQueries({ queryKey: CONTACTS_KEY })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}
