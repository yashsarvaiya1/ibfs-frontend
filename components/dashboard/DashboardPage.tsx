'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useAccounts } from '@/hooks/useAccount'
import { useProducts } from '@/hooks/useProduct'
import { useTransactions } from '@/hooks/useTransaction'
import { fmtAmount, fmtDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, TrendingUp, TrendingDown, Landmark } from 'lucide-react'
import { TransactionCard } from '@/components/shared/TransactionCard'
import Link from 'next/link'

export function DashboardPage() {
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  useEffect(() => setPageTitle('Home'), [setPageTitle])

  const { data: accountsData, isLoading: loadingAccounts } = useAccounts({ is_active: true })
  const { data: productsData }  = useProducts({ low_stock: true })
  // Only actual txns — page_size 5 — newest first (backend returns -date order)
  const { data: recentTxns, isLoading: loadingTxns } = useTransactions({
    type: 'actual',
    page: 1,
    page_size: 5,
  })

  const accounts       = accountsData?.results ?? []
  const lowStockCount  = productsData?.count ?? 0
  const recentActivity = recentTxns?.results ?? []

  const totalBalance  = accounts.reduce((s, a) => s + Number(a.current_balance), 0)

  // Inflow / outflow from the 5 most recent — scoped label so user isn't misled
  const recentInflow  = recentActivity
    .filter(t => Number(t.amount) > 0)
    .reduce((s, t) => s + Number(t.amount), 0)
  const recentOutflow = recentActivity
    .filter(t => Number(t.amount) < 0)
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)

  return (
    <div className="px-4 py-4 space-y-6 pb-10">

      {/* ── Payment Accounts ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Accounts</h2>
          <Link href="/accounts" className="text-xs text-primary font-medium">See all</Link>
        </div>

        <Card className="bg-primary text-primary-foreground mb-3 rounded-2xl shadow-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs opacity-70 font-medium">Total Balance</p>
              <p className="text-3xl font-bold mt-1 tracking-tight">{fmtAmount(totalBalance)}</p>
            </div>
            <Landmark className="h-9 w-9 opacity-30" />
          </CardContent>
        </Card>

        {loadingAccounts ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[1, 2].map(i => <Skeleton key={i} className="h-20 w-36 rounded-xl shrink-0" />)}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {accounts.map((acc) => (
              <Link key={acc.id} href={`/accounts/${acc.id}`}>
                <Card className="shrink-0 w-36 cursor-pointer active:scale-95 transition-transform rounded-xl shadow-sm">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground capitalize font-medium">{acc.type}</p>
                    <p className="text-sm font-semibold truncate mt-0.5">{acc.name}</p>
                    <p className="text-base font-bold mt-1">{fmtAmount(acc.current_balance)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Quick Stats ──────────────────────────────────────────────────── */}
      <section className="grid grid-cols-3 gap-3">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Recent In</p>
            <p className="text-sm font-bold text-emerald-600 mt-0.5">{fmtAmount(recentInflow)}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-red-600" />
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Recent Out</p>
            <p className="text-sm font-bold text-red-600 mt-0.5">{fmtAmount(recentOutflow)}</p>
          </CardContent>
        </Card>

        <Link href="/inventory?low_stock=true">
          <Card className={`rounded-xl shadow-sm cursor-pointer active:scale-95 transition-transform ${lowStockCount > 0 ? 'border-orange-200 bg-orange-50/50' : ''}`}>
            <CardContent className="p-3 text-center">
              <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">Low Stock</p>
              <p className={`text-sm font-bold mt-0.5 ${lowStockCount > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                {lowStockCount} items
              </p>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* ── Recent Activity ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Activity</h2>
          <Link href="/transactions" className="text-xs text-primary font-medium">See all</Link>
        </div>

        {loadingTxns ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-lg">💸</span>
            </div>
            <p className="text-sm font-medium">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentActivity.map(txn => (
              <TransactionCard key={txn.id} txn={txn} showContact />
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
