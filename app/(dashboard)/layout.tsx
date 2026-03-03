// app/(dashboard)/layout.tsx

import { AppShell } from '@/components/shared/common/AppShell'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
