import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productService } from '@/services/productService'
import { ProductFormData } from '@/models/product'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'

const KEY = 'products'

export function useProducts(params?: { page?: number; search?: string }) {
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => productService.list(params).then((r) => r.data),
    enabled: hasHydrated && isAuthenticated,
  })
}

export function useProduct(id: number) {
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => productService.get(id).then((r) => r.data),
    enabled: !!id && hasHydrated && isAuthenticated,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProductFormData) => productService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Product created')
    },
    onError: () => toast.error('Failed to create product'),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductFormData> }) =>
      productService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: [KEY, id] })
      toast.success('Product updated')
    },
    onError: () => toast.error('Failed to update product'),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => productService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Product deleted')
    },
    onError: () => toast.error('Failed to delete product'),
  })
}
