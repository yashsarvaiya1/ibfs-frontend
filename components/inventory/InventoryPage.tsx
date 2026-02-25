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
  const router = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  useEffect(() => setPageTitle('Inventory'), [setPageTitle])

  const [search, setSearch] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useProducts({
    search: search || undefined,
    low_stock: showLowStock || undefined,
    is_active: true,
  })
  const products = data?.results ?? []
  const lowStockCount = products.filter(p => Number(p.current_stock) <= Number(p.min_stock)).length

  // Create form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [rate, setRate] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [hsn, setHsn] = useState('')
  const [minStock, setMinStock] = useState('0')
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
        name, description: description || null,
        image_url: null,
        rate,
        current_stock: openingStock,
        min_stock: minStock,
        hsn_code: hsn || null,
        unit,
        is_active: true,
      })
      toast.success('Product created')
      setCreateOpen(false)
      resetForm()
    } catch { toast.error('Failed to create product') }
  }

  return (
    <div className="pb-6">

      {/* Search + Filters */}
      <div className="px-4 pt-4 pb-2 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button size="icon" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <button
          onClick={() => setShowLowStock(!showLowStock)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
            showLowStock
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-background text-muted-foreground border-border'
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Low Stock {lowStockCount > 0 && `(${lowStockCount})`}
        </button>
      </div>

      {/* Product List */}
      <div className="px-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : products.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-12">
            {search ? 'No products found' : 'No products yet. Tap + to add one.'}
          </p>
        ) : (
          products.map(product => {
            const isLow = Number(product.current_stock) <= Number(product.min_stock)
            return (
              <Card
                key={product.id}
                className="cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() => router.push(`/inventory/${product.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold truncate">{product.name}</p>
                      {isLow && (
                        <Badge variant="destructive" className="text-[10px] h-4 flex-shrink-0">
                          Low
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fmtAmount(product.rate)} / {product.unit}
                      {product.hsn_code && ` · HSN ${product.hsn_code}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <p className={cn('font-bold text-sm', isLow ? 'text-orange-500' : '')}>
                        {product.current_stock}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{product.unit}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">New Product</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Product Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Steel Rod 10mm" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input placeholder="Description..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rate (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="0.00" value={rate} onChange={e => setRate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input placeholder="pcs / kg / m" value={unit} onChange={e => setUnit(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Opening Stock</Label>
                <Input type="number" value={openingStock} onChange={e => setOpeningStock(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Min Stock Alert</Label>
                <Input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>HSN Code <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input placeholder="e.g. 7214" value={hsn} onChange={e => setHsn(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={createProduct.isPending}>
              {createProduct.isPending ? 'Creating...' : 'Create Product'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
    