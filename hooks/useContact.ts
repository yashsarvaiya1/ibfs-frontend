// hooks/useContact.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactService } from '@/services/contactService'
import { ContactFormData } from '@/models/contact'
import { toast } from 'sonner'

const KEY = 'contacts'

export function useContacts(params?: { page?: number; search?: string }) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => contactService.list(params).then((r) => r.data),
  })
}

export function useContact(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => contactService.get(id).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ContactFormData) => contactService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Contact created')
    },
    onError: () => toast.error('Failed to create contact'),
  })
}

export function useUpdateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ContactFormData> }) =>
      contactService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [KEY, id] })
      toast.success('Contact updated')
    },
    onError: () => toast.error('Failed to update contact'),
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => contactService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Contact deleted')
    },
    onError: () => toast.error('Failed to delete contact'),
  })
}
