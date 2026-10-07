// components/shared/common/AppShell.tsx
'use client'

import { LoadingState } from './LoadingState'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useVerifyAuth } from '@/hooks/useVerifyAuth'
import { DesktopNav } from '@/components/shared/common/DesktopNav'
import { Header } from '@/components/shared/common/Header'
import { BottomNav } from '@/components/shared/common/BottomNav'
import { QuickActionSheet } from '@/components/shared/common/QuickActionSheet'
import { DocCreateSheet } from '@/components/shared/DocCreateSheet'
import { TransactionSheet } from '@/components/shared/TransactionSheet'
import { DeleteDocSheet } from '@/components/shared/DeleteDocSheet'
import { RecordPaymentSheet } from '@/components/shared/RecordPaymentSheet'
import { AddDetailsSheet } from '@/components/shared/AddDetailsSheet'
import { GlobalMoveStockSheet } from '@/components/documents/GlobalMoveStockSheet'
import { PaymentAllocationSheet } from '@/components/shared/PaymentAllocationSheet'
import { AdjustStockSheet } from '@/components/shared/AdjustStockSheet'

export function AppShell({ children }: { children: React.ReactNode }) {
  const router          = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasHydrated     = useAuthStore((s) => s._hasHydrated)

  // Validate in the background so saved files remain accessible on slow connections.
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
  if (!hasHydrated || !isAuthenticated) return <LoadingState fullScreen label="Opening sign in…" />

  return (
    <div className="flex h-dvh bg-background overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-background focus:p-3">Skip to content</a>
      <DesktopNav />
      <div className="flex flex-col flex-1 min-w-0">
      <Header />
      <main id="main-content" className="flex-1 overflow-y-auto pb-20 lg:pb-6">
        <div className="w-full max-w-[1440px] mx-auto lg:px-5 lg:py-4">{children}</div>
      </main>
      <BottomNav />
      </div>

      <QuickActionSheet />
      <DocCreateSheet />
      <TransactionSheet />
      <DeleteDocSheet />
      <RecordPaymentSheet />
      <AddDetailsSheet />
      <AdjustStockSheet />
      <GlobalMoveStockSheet />
      <PaymentAllocationSheet />
    </div>
  )
}
