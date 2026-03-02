'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
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

  // No rehydration — auth lives in Zustand memory only (per spec)
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) return null

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
