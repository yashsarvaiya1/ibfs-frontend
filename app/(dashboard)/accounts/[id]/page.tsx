// app/(dashboard)/accounts/[id]/page.tsx
import { AccountDetailPage } from '@/components/accounts/AccountDetailPage'
export default async function AccountDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AccountDetailPage id={Number(id)} />
}
