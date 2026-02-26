// components/inventory/InventoryPage.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useProducts, useCreateProduct } from '@/hooks/useProduct'
import { fmtAmount } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Search, Plus, ChevronRight, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function InventoryPage() {
  const router       = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  useEffect(() => setPageTitle('Inventory'), [setPageTitle])

  const [search,       setSearch]       = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [createOpen,   setCreateOpen]   = useState(false)

  const { data: allData } = useProducts({ is_active: true })
  const { data, isLoading } = useProducts({
    search:    search || undefined,
    low_stock: showLowStock || undefined, 
    is_active: true,
  })

  const products = data?.results ?? []

  const lowStockCount = (allData?.results ?? []).filter(
    p => Number(p.current_stock) <= Number(p.min_stock)
  ).length

  // ── Create form ────────────────────────────────────────────────────────────
  const [name,         setName]         = useState('')
  const [description,  setDescription]  = useState('')
  const [rate,         setRate]         = useState('')
  const [unit,         setUnit]         = useState('pcs')
  const [hsn,          setHsn]          = useState('')
  const [minStock,     setMinStock]     = useState('0')
  const [openingStock, setOpeningStock] = useState('0')

  const createProduct = useCreateProduct()

  const resetForm = () => {
    setName(''); setDescription(''); setRate(''); setUnit('pcs')
    setHsn(''); setMinStock('0'); setOpeningStock('0')
  }

  const handleCreate = async () => {
    if (!name.trim() || !rate) { toast.error('Name and rate are required'); return }
    try {
      await createProduct.mutateAsync({
        name,
        description:   description || null,
        image_url:     null,
        rate,
        current_stock: openingStock,
        min_stock:     minStock,
        hsn_code:      hsn || null,
        unit,
        is_active:     true,
      })
      toast.success('Product created')
      setCreateOpen(false)
      resetForm()
    } catch {
      toast.error('Failed to create product')
    }
  }

  return (
    <div className="pb-6">
      {/* Search + Filters */}
      <div className="px-4 pt-4 pb-2 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-9 h-11 rounded-xl"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button size="icon" className="h-11 w-11 rounded-xl shrink-0" onClick={() => setCreateOpen(true)}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <button
          onClick={() => setShowLowStock(v => !v)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors w-full justify-center',
            showLowStock
              ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
              : 'bg-orange-50/50 text-orange-700 border-orange-200'
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          {showLowStock ? 'Showing Low Stock' : 'Filter Low Stock'} 
          {lowStockCount > 0 && `(${lowStockCount})`}
        </button>
      </div>

      {/* Product List */}
      <div className="px-4 space-y-2 mt-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : products.length === 0 ? (
          <div className="text-center text-muted-foreground py-16 flex flex-col items-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <span className="text-2xl">📦</span>
            </div>
            <p className="text-sm font-medium">
              {showLowStock ? 'No low stock items 🎉' : search ? 'No products found' : 'No products yet'}
            </p>
          </div>
        ) : (
          products.map(product => {
            const isLow = Number(product.current_stock) <= Number(product.min_stock)
            return (
              <Card
                key={product.id}
                className="cursor-pointer rounded-xl border hover:bg-muted/50 transition-colors shadow-sm"
                onClick={() => router.push(`/inventory/${product.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate text-sm">{product.name}</p>
                      {isLow && (
                        <Badge variant="destructive" className="text-[10px] h-4 shrink-0 px-1.5">Low</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fmtAmount(product.rate)} / {product.unit}
                      {product.hsn_code && ` · HSN ${product.hsn_code}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-right shrink-0">
                    <div>
                      <p className={cn('font-bold text-base leading-none', isLow ? 'text-orange-500' : '')}>
                        {product.current_stock}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{product.unit}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Create Product Sheet */}
      <Sheet open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) resetForm() }}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[90vh] overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left">New Product</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Product Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Steel Rod 10mm" value={name} onChange={e => setName(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-xs text-muted-foreground ml-1">(optional)</span></Label>
              <Input placeholder="Description..." value={description} onChange={e => setDescription(e.target.value)} className="h-11" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rate (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="0.00" value={rate} onChange={e => setRate(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input placeholder="pcs / kg / m" value={unit} onChange={e => setUnit(e.target.value)} className="h-11" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Opening Stock</Label>
                <Input type="number" value={openingStock} onChange={e => setOpeningStock(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>Min Alert</Label>
                <Input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} className="h-11" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>HSN Code <span className="text-xs text-muted-foreground ml-1">(optional)</span></Label>
              <Input placeholder="e.g. 7214" value={hsn} onChange={e => setHsn(e.target.value)} className="h-11" />
            </div>
            <Button className="w-full h-12 text-md mt-2" onClick={handleCreate} disabled={createProduct.isPending}>
              {createProduct.isPending ? 'Creating...' : 'Create Product'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
