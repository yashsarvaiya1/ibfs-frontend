'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useUIStore } from '@/stores/uiStore'
import { useProducts, useCreateProduct } from '@/hooks/useProduct'
import { fmtAmount } from '@/lib/utils'
import { getMediaUrl } from '@/lib/media'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { UploadInput } from '@/components/shared/common/UploadInput'
import { PrintSheet } from '@/components/shared/PrintSheet'
import {
  Search, Plus, ChevronRight, AlertTriangle, ImageIcon,
  Printer, X, CheckSquare, Square, CheckCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'


export function InventoryPage() {
  const router       = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  useEffect(() => setPageTitle('Inventory'), [setPageTitle])

  const [search,       setSearch]       = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [createOpen,   setCreateOpen]   = useState(false)

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectMode,   setSelectMode]   = useState(false)
  const [selectedIds,  setSelectedIds]  = useState<Set<number>>(new Set())

  // ── Print state ────────────────────────────────────────────────────────────
  const [printOptionsOpen, setPrintOptionsOpen] = useState(false)
  const [printSheetOpen,   setPrintSheetOpen]   = useState(false)

  const { data: lowStockData } = useProducts({ is_active: true, low_stock: true })
  const { data, isLoading }    = useProducts({
    search:    search || undefined,
    low_stock: showLowStock || undefined,
    is_active: true,
  })

  const products      = data?.results ?? []
  const lowStockCount = lowStockData?.count ?? 0

  // ── Create form state ──────────────────────────────────────────────────────
  const [name,         setName]         = useState('')
  const [description,  setDescription]  = useState('')
  const [rate,         setRate]         = useState('')
  const [unit,         setUnit]         = useState('pcs')
  const [hsn,          setHsn]          = useState('')
  const [minStock,     setMinStock]     = useState('0')
  const [openingStock, setOpeningStock] = useState('0')
  const [imageUrls,    setImageUrls]    = useState<string[]>([])

  const createProduct = useCreateProduct()

  const resetForm = () => {
    setName(''); setDescription(''); setRate(''); setUnit('pcs')
    setHsn(''); setMinStock('0'); setOpeningStock('0'); setImageUrls([])
  }

  const handleCreate = async () => {
    if (!name.trim() || !rate) { toast.error('Name and rate are required'); return }
    try {
      await createProduct.mutateAsync({
        name,
        description:   description || null,
        image_url:     imageUrls[0] ?? null,
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

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleSelectMode = useCallback(() => {
    setSelectMode(v => {
      if (v) setSelectedIds(new Set()) // clear on exit
      return !v
    })
  }, [])

  const toggleId = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(products.map(p => p.id)))
  }, [products])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const allSelected   = products.length > 0 && selectedIds.size === products.length
  const someSelected  = selectedIds.size > 0 && !allSelected

  // ── Print query params ─────────────────────────────────────────────────────
  // When products are selected — print only those; otherwise print full filtered list
  const printQueryParams = useMemo(() => {
    if (selectedIds.size > 0) {
      return { ids: Array.from(selectedIds).join(',') }
    }
    const p: Record<string, unknown> = { is_active: true }
    if (showLowStock) p.low_stock = true
    return p
  }, [selectedIds, showLowStock])

  const printTitle = useMemo(() => {
    if (selectedIds.size > 0) return `Selected Products (${selectedIds.size})`
    return showLowStock ? 'Low Stock Report' : 'Inventory Stock Report'
  }, [selectedIds, showLowStock])

  return (
    <div className="pb-24">  {/* extra bottom padding for floating bar */}

      {/* ══════════════════════════════════════════════════════════════════════
          TOOLBAR — switches between normal & select mode
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="px-4 pt-4 pb-2 space-y-3">

        {selectMode ? (
          /* ── Select mode header ─────────────────────────────────────── */
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectMode}
              className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <span className="flex-1 text-center text-sm font-bold">
              {selectedIds.size === 0
                ? 'Select Products'
                : `${selectedIds.size} selected`}
            </span>
            <button
              onClick={allSelected ? clearSelection : selectAll}
              className="flex items-center gap-1 text-xs font-semibold text-primary"
              disabled={products.length === 0}
            >
              {allSelected
                ? <><Square className="h-3.5 w-3.5" /> Deselect All</>
                : <><CheckCheck className="h-3.5 w-3.5" /> Select All</>}
            </button>
          </div>
        ) : (
          /* ── Normal mode toolbar ────────────────────────────────────── */
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
            {/* Select mode toggle */}
            <Button
              size="icon" variant="outline"
              className="h-11 w-11 rounded-xl shrink-0"
              onClick={toggleSelectMode}
              disabled={products.length === 0}
              title="Select products"
            >
              <CheckSquare className="h-4 w-4" />
            </Button>
            {/* Print all */}
            <Button
              size="icon" variant="outline"
              className="h-11 w-11 rounded-xl shrink-0"
              onClick={() => setPrintOptionsOpen(true)}
              disabled={products.length === 0}
              title="Print report"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Low stock filter — hidden in select mode */}
        {!selectMode && (
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
            {lowStockCount > 0 && ` (${lowStockCount})`}
          </button>
        )}
      </div>

      {/* ── Product list ──────────────────────────────────────────────────── */}
      <div className="px-4 space-y-2 mt-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
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
            const isLow      = Number(product.current_stock) <= Number(product.min_stock)
            const imgSrc     = product.image_url_full ?? (product.image_url ? getMediaUrl(product.image_url) : null)
            const isSelected = selectedIds.has(product.id)

            return (
              <Card
                key={product.id}
                className={cn(
                  'rounded-xl border transition-all shadow-sm',
                  selectMode
                    ? isSelected
                      ? 'border-primary bg-primary/5 shadow-none cursor-pointer'
                      : 'cursor-pointer hover:bg-muted/30'
                    : 'cursor-pointer hover:bg-muted/50'
                )}
                onClick={() => {
                  if (selectMode) { toggleId(product.id); return }
                  router.push(`/inventory/${product.id}`)
                }}
              >
                <CardContent className="p-3 flex items-center gap-3">

                  {/* ── Select checkbox OR product image ────────────── */}
                  {selectMode ? (
                    <div className={cn(
                      'shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/30 bg-background'
                    )}>
                      {isSelected && <span className="text-primary-foreground text-xs font-black">✓</span>}
                    </div>
                  ) : (
                    <div className="shrink-0 w-12 h-12 rounded-lg border border-border/60 bg-muted overflow-hidden">
                      {imgSrc ? (
                        <Image
                          src={imgSrc} alt={product.name}
                          width={48} height={48}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
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

                  {/* Stock count */}
                  <div className="flex items-center gap-3 text-right shrink-0">
                    <div>
                      <p className={cn('font-bold text-base leading-none', isLow ? 'text-orange-500' : '')}>
                        {product.current_stock}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{product.unit}</p>
                    </div>
                    {!selectMode && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </div>

                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          FLOATING SELECTION BAR — visible only in select mode
      ══════════════════════════════════════════════════════════════════════ */}
      {selectMode && (
        <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pointer-events-none">
          <div className="pointer-events-auto bg-background border rounded-2xl shadow-2xl p-3 flex items-center gap-3">

            {/* Left: count */}
            <div className="flex-1 min-w-0">
              {selectedIds.size === 0 ? (
                <p className="text-sm text-muted-foreground font-medium">Tap products to select</p>
              ) : (
                <>
                  <p className="text-sm font-bold">{selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected</p>
                  <button
                    onClick={clearSelection}
                    className="text-[11px] text-muted-foreground hover:text-destructive transition-colors font-medium"
                  >
                    Clear selection
                  </button>
                </>
              )}
            </div>

            {/* Right: print button */}
            <Button
              className="gap-2 rounded-xl h-10 px-4 shrink-0"
              disabled={selectedIds.size === 0}
              onClick={() => {
                setSelectMode(false)
                setPrintOptionsOpen(true)
              }}
            >
              <Printer className="h-4 w-4" />
              Print {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </Button>

          </div>
        </div>
      )}

      {/* ── Create Product Sheet ──────────────────────────────────────────── */}
      <Sheet open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) resetForm() }}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[92vh] overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left">New Product</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                Product Image
                <span className="text-xs text-muted-foreground font-normal ml-1">optional</span>
              </Label>
              <UploadInput value={imageUrls} onChange={setImageUrls} context="product" maxFiles={1} />
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label>Product Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Steel Rod 10mm"
                value={name} onChange={e => setName(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Description
                <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span>
              </Label>
              <Input
                placeholder="Short description..."
                value={description} onChange={e => setDescription(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rate (₹) <span className="text-destructive">*</span></Label>
                <Input
                  type="number" placeholder="0.00"
                  value={rate} onChange={e => setRate(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input
                  placeholder="pcs / kg / m"
                  value={unit} onChange={e => setUnit(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Opening Stock</Label>
                <Input
                  type="number" value={openingStock}
                  onChange={e => setOpeningStock(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Min Alert</Label>
                <Input
                  type="number" value={minStock}
                  onChange={e => setMinStock(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>
                HSN Code
                <span className="text-xs text-muted-foreground ml-1 font-normal">optional</span>
              </Label>
              <Input
                placeholder="e.g. 7214"
                value={hsn} onChange={e => setHsn(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <Button
              className="w-full h-12 rounded-xl mt-2"
              onClick={handleCreate}
              disabled={createProduct.isPending}
            >
              {createProduct.isPending ? 'Creating...' : 'Create Product'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ══════════════════════════════════════════════════════════════════════
          PRINT OPTIONS SHEET
      ══════════════════════════════════════════════════════════════════════ */}
      <Sheet open={printOptionsOpen} onOpenChange={v => {
        setPrintOptionsOpen(v)
        // If closing without printing, restore selected state
        if (!v && selectedIds.size > 0) setSelectedIds(new Set())
      }}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 max-h-[60vh]">
          <SheetHeader className="mb-5">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Printer className="h-4 w-4" /> Print Stock Report
              </SheetTitle>
              <button
                onClick={() => { setPrintOptionsOpen(false); setSelectedIds(new Set()) }}
                className="p-1.5 rounded-full hover:bg-muted/60 transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </SheetHeader>
          <div className="space-y-4">

            {/* Summary */}
            <div className="p-3 bg-muted/40 rounded-xl border border-muted space-y-1">
              {selectedIds.size > 0 ? (
                <>
                  <p className="text-sm font-bold">
                    {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Only selected products will be included in the PDF
                  </p>
                </>
              ) : showLowStock ? (
                <>
                  <p className="text-sm font-bold">
                    {products.length} low stock product{products.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Low stock filter is active — only low stock items will be printed
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold">
                    {products.length} product{products.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    All active products · snapshot of current stock levels
                  </p>
                </>
              )}
            </div>

            {/* Low stock warning */}
            {lowStockCount > 0 && !showLowStock && selectedIds.size === 0 && (
              <div className="flex items-center gap-2 p-2.5 bg-orange-50 rounded-xl border border-orange-200">
                <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                <p className="text-xs font-medium text-orange-700">
                  {lowStockCount} item{lowStockCount !== 1 ? 's' : ''} currently below minimum stock
                </p>
              </div>
            )}

            <Button
              className="w-full h-12 rounded-xl gap-2"
              onClick={() => { setPrintOptionsOpen(false); setPrintSheetOpen(true) }}
            >
              <Printer className="h-4 w-4" /> Generate PDF
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Print Sheet ───────────────────────────────────────────────────── */}
      <PrintSheet
        open={printSheetOpen}
        onClose={() => { setPrintSheetOpen(false); setSelectedIds(new Set()) }}
        title={printTitle}
        queryParams={printQueryParams}
        endpoint="products/print/"
        filename="Inventory"
        loadingText="stock report"
      />

    </div>
  )
}
  