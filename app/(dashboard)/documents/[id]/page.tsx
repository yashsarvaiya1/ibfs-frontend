// app/(dashboard)/documents/[id]/page.tsx
import { DocumentDetailPage } from '@/components/documents/DocumentDetailPage'
export default async function DocumentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DocumentDetailPage id={Number(id)} />
}
