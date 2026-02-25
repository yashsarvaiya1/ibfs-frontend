// components/shared/AppShell.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { BottomNav } from '@/components/shared/BottomNav'
import { Header } from '@/components/shared/Header'
import { QuickActionSheet } from '@/components/shared/QuickActionSheet'
import { TransactionSheet } from '@/components/shared/TransactionSheet'
import { DocCreateSheet } from '@/components/shared/DocCreateSheet'

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const loginDate = useAuthStore((s) => s.loginDate)
  const logout = useAuthStore((s) => s.logout)

  const isSessionValid =
    isAuthenticated &&
    loginDate != null &&
    Date.now() - loginDate <= SESSION_DURATION

  useEffect(() => {
    if (!hasHydrated) return
    if (!isSessionValid) {
      logout()
      router.replace('/login')
    }
  }, [hasHydrated, isSessionValid, logout, router])

  if (!hasHydrated) return null
  if (!isSessionValid) return null

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>
      <BottomNav />
      <QuickActionSheet />
      <TransactionSheet />
      <DocCreateSheet />
    </div>
  )
}
