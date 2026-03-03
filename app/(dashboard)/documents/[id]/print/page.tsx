import { DocumentPrintPage } from '@/components/documents/DocumentPrintPage'

interface Props { params: Promise<{ id: string }> }

export default async function Page({ params }: Props) {
  const { id } = await params
  return <DocumentPrintPage id={Number(id)} />
}
