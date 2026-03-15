// components/shared/common/AppShell.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useVerifyAuth } from '@/hooks/useVerifyAuth'
import { Header } from '@/components/shared/common/Header'
import { BottomNav } from '@/components/shared/common/BottomNav'
import { QuickActionSheet } from '@/components/shared/common/QuickActionSheet'
import { DocCreateSheet } from '@/components/shared/DocCreateSheet'
import { TransactionSheet } from '@/components/shared/TransactionSheet'
import { DeleteDocSheet } from '@/components/shared/DeleteDocSheet'
import { RecordPaymentSheet } from '@/components/shared/RecordPaymentSheet'
import { AddDetailsSheet } from '@/components/shared/AddDetailsSheet'
import { TransferSheet } from '@/components/shared/TransferSheet'
import { AdjustBalanceSheet } from '@/components/shared/AdjustBalanceSheet'
import { AdjustStockSheet } from '@/components/shared/AdjustStockSheet'

export function AppShell({ children }: { children: React.ReactNode }) {
  const router          = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasHydrated     = useAuthStore((s) => s._hasHydrated)

  // Verify stored credentials are still valid — runs once per session
  useVerifyAuth()

  useEffect(() => {
    // Wait for sessionStorage to be read before redirecting
    if (!hasHydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [hasHydrated, isAuthenticated, router])

  // HydrationGate in Providers already shows the spinner — this just
  // prevents the shell from flashing before the redirect fires
  if (!hasHydrated || !isAuthenticated) return null

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>
      <BottomNav />

      <QuickActionSheet />
      <DocCreateSheet />
      <TransactionSheet />
      <DeleteDocSheet />
      <RecordPaymentSheet />
      <AddDetailsSheet />
      <TransferSheet />
      <AdjustBalanceSheet />
      <AdjustStockSheet />
    </div>
  )
}
