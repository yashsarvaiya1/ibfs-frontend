// hooks/useProduct.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productService } from '@/services/productService'
import type {
  ProductCreate, ProductUpdate,
  AdjustStockPayload, SetStockPayload,
} from '@/models/product'

export const PRODUCTS_KEY    = ['products'] as const
export const productKey      = (id: number) => ['products', id] as const
export const pendingMovesKey = (id: number) => ['products', id, 'pending_moves'] as const

export function useProducts(params?: {
  search?: string
  is_active?: boolean
  low_stock?: boolean
  page?: number
}) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, params],
    queryFn: () => productService.list(params),
  })
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: productKey(id),
    queryFn: () => productService.get(id),
    enabled: !!id,
  })
}

export function usePendingMoves(id: number) {
  return useQuery({
    queryKey: pendingMovesKey(id),
    queryFn: () => productService.pendingMoves(id),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProductCreate) => productService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  })
}

export function useUpdateProduct(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProductUpdate) => productService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKey(id) })
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY })
    },
  })
}

// Creates actual s.txn + updates current_stock — quantity is signed
export function useAdjustStock(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AdjustStockPayload) => productService.adjustStock(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKey(id) })
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY })
      qc.invalidateQueries({ queryKey: pendingMovesKey(id) })
      qc.invalidateQueries({ queryKey: ['stock-transactions'] })
    },
  })
}

// Direct overwrite — NO s.txn created (spec 3.3 Direct Edit)
export function useSetStock(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SetStockPayload) => productService.setStock(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKey(id) })
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY })
    },
  })
}

// Move stock from product page — triggers per-document partial move
export function useMoveStockFromProduct(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { document_id: number; quantity: number; date?: string }) =>
      productService.moveStockFromProduct(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKey(id) })
      qc.invalidateQueries({ queryKey: pendingMovesKey(id) })
      qc.invalidateQueries({ queryKey: PRODUCTS_KEY })
      qc.invalidateQueries({ queryKey: ['documents'] }) // document stock_status updates
      qc.invalidateQueries({ queryKey: ['stock-transactions'] })
    },
  })
}
