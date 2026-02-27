'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, SESSION_KEY } from '@/stores/authStore'
import { Header } from '@/components/shared/Header'
import { BottomNav } from '@/components/shared/BottomNav'
import { QuickActionSheet } from '@/components/shared/QuickActionSheet'
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

  // Rehydrate once on client
  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return
    try {
      const { username, credentials } = JSON.parse(raw)
      if (username && credentials) {
        useAuthStore.setState({ isAuthenticated: true, username, credentials })
      }
    } catch {
      // ignore
    }
  }, [])

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
