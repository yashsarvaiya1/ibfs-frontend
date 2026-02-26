// app/documents/[id]/edit/page.tsx
import { DocumentEditPage } from '@/components/documents/DocumentEditPage'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditDocumentRoute({ params }: Props) {
  const { id } = await params
  return <DocumentEditPage id={Number(id)} />
}
