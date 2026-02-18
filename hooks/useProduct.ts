// hooks/useProduct.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productService } from '@/services/productService'
import { ProductFormData } from '@/models/product'
import { toast } from 'sonner'

const KEY = 'products'

export function useProducts(params?: { page?: number; search?: string }) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => productService.list(params).then((r) => r.data),
  })
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => productService.get(id).then((r) => r.data),
    enabled: !!id,
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
