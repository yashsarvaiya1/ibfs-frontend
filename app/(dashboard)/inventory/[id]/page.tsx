// app/(dashboard)/inventory/[id]/page.tsx
import { ProductDetailPage } from '@/components/inventory/ProductDetailPage'
export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProductDetailPage id={Number(id)} />
}
