// components/accounts/AccountsPage.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { usePaymentAccounts } from '@/hooks/usePaymentAccount'
import { ACCOUNT_TYPE_LABELS } from '@/models/paymentAccount'
import { AccountFormSheet } from '@/components/accounts/AccountFormSheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Plus, ChevronRight, Landmark, Smartphone, Wallet } from 'lucide-react'
import { ComponentType } from 'react'

const ACCOUNT_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  bank: Landmark,
  upi:  Smartphone,
  cash: Wallet,
}

const ACCOUNT_COLORS: Record<string, string> = {
  bank: 'bg-blue-100 text-blue-600',
  upi:  'bg-purple-100 text-purple-600',
  cash: 'bg-emerald-100 text-emerald-600',
}

export function AccountsPage() {
  const router = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  const hasHydrated  = useAuthStore((s) => s._hasHydrated)

  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    setPageTitle('Accounts')
  }, [setPageTitle])

  const { data, isLoading } = usePaymentAccounts()
  const accounts = data?.results ?? []

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + parseFloat(acc.current_balance), 0
  )

  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-30 bg-background border-b px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">All Accounts</span>
        <Button size="icon" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Total balance card */}
      {!isLoading && accounts.length > 0 && (
        <div className="mx-4 mt-4 rounded-2xl bg-primary text-primary-foreground px-5 py-4">
          <p className="text-xs font-medium opacity-70 mb-1">Total Balance</p>
          <p className="text-3xl font-bold tracking-tight">
            {totalBalance < 0 ? '−' : ''}₹{Math.abs(totalBalance).toLocaleString('en-IN')}
          </p>
          <p className="text-xs opacity-60 mt-1">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* List */}
      <div className="divide-y mt-4">
        {!hasHydrated || isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <AccountSkeleton key={i} />)
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <Wallet className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">No accounts yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add your bank, UPI or cash account
            </p>
            <Button className="mt-4" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </div>
        ) : (
          accounts.map((account) => {
            const Icon       = ACCOUNT_ICONS[account.account_type] ?? Wallet
            const colorClass = ACCOUNT_COLORS[account.account_type] ?? 'bg-muted text-muted-foreground'
            const balance    = parseFloat(account.current_balance)

            return (
              <button
                key={account.id}
                onClick={() => router.push(`/accounts/${account.id}`)}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-muted/50 active:bg-muted transition-colors text-left"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{account.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {ACCOUNT_TYPE_LABELS[account.account_type]}
                    </Badge>
                    {account.account_type === 'bank' && account.account_number && (
                      <span className="text-xs text-muted-foreground">
                        ····{account.account_number.slice(-4)}
                      </span>
                    )}
                    {account.account_type === 'upi' && account.upi_id && (
                      <span className="text-xs text-muted-foreground truncate max-w-30">
                        {account.upi_id}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <p className={`text-base font-semibold ${balance >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                    {balance < 0 ? '−' : ''}₹{Math.abs(balance).toLocaleString('en-IN')}
                  </p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            )
          })
        )}
      </div>

      <AccountFormSheet open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}

function AccountSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <Skeleton className="w-11 h-11 rounded-xl" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-5 w-20" />
    </div>
  )
}
