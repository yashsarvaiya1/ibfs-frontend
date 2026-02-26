'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { Header }              from '@/components/shared/Header'
import { BottomNav }           from '@/components/shared/BottomNav'
import { QuickActionSheet }    from '@/components/shared/QuickActionSheet'
import { DocCreateSheet }      from '@/components/shared/DocCreateSheet'
import { TransactionSheet }    from '@/components/shared/TransactionSheet'
import { DeleteDocSheet }      from '@/components/shared/DeleteDocSheet'
import { RecordPaymentSheet }  from '@/components/shared/RecordPaymentSheet'
import { AddDetailsSheet }     from '@/components/shared/AddDetailsSheet'
import { TransferSheet }       from '@/components/shared/TransferSheet'
import { AdjustBalanceSheet }  from '@/components/shared/AdjustBalanceSheet'
import { AdjustStockSheet }    from '@/components/shared/AdjustStockSheet'

export function AppShell({ children }: { children: React.ReactNode }) {
  const router          = useRouter()
  // In-memory auth — no hydration wait, no loginDate, no session duration
  // If isAuthenticated is false, credentials were never set this session → go to login
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, router])

  // Prevents flash of protected content on hard refresh
  if (!isAuthenticated) return null

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>
      <BottomNav />

      {/* ── Global Sheets — mounted once at app root ─────────────────────── */}
      {/* Triggered via uiStore open* actions from any page */}
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
