// components/dashboard/DashboardPage.tsx
'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useAccounts } from '@/hooks/useAccount'
import { useContacts } from '@/hooks/useContact'
import { useProducts } from '@/hooks/useProduct'
import { useTransactions } from '@/hooks/useTransaction'
import { cfColor, cfLabel, fmtAmount, fmtDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'

export function DashboardPage() {
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  useEffect(() => setPageTitle('Home'), [setPageTitle])

  const { data: accountsData, isLoading: loadingAccounts } = useAccounts({ is_active: true })
  const { data: contactsData } = useContacts({ is_active: true })
  const { data: productsData } = useProducts({ low_stock: true })
  const { data: recentTxns } = useTransactions({ page: 1 })

  const accounts = accountsData?.results ?? []
  const contacts = contactsData?.results ?? []
  const lowStockCount = productsData?.count ?? 0
  const recentActivity = recentTxns?.results ?? []

  const totalReceivable = contacts
    .filter((c) => Number(c.opening_balance) < 0)
    .reduce((sum, c) => sum + Math.abs(Number(c.opening_balance)), 0)

  const totalPayable = contacts
    .filter((c) => Number(c.opening_balance) > 0)
    .reduce((sum, c) => sum + Number(c.opening_balance), 0)

  return (
    <div className="px-4 py-4 space-y-6">

      {/* Payment Accounts */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Accounts</h2>
          <Link href="/accounts" className="text-xs text-primary">See all</Link>
        </div>
        {loadingAccounts ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[1,2].map(i => <Skeleton key={i} className="h-20 w-36 rounded-xl flex-shrink-0" />)}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {accounts.map((acc) => (
              <Link key={acc.id} href={`/accounts/${acc.id}`}>
                <Card className="flex-shrink-0 w-36 cursor-pointer active:scale-95 transition-transform">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground capitalize">{acc.type}</p>
                    <p className="text-sm font-semibold truncate">{acc.name}</p>
                    <p className="text-base font-bold mt-1">{fmtAmount(acc.current_balance)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Quick Stats */}
      <section className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingDown className="h-4 w-4 text-green-500 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Receivable</p>
            <p className="text-sm font-bold text-green-500">₹{totalReceivable.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 text-red-500 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Payable</p>
            <p className="text-sm font-bold text-red-500">₹{totalPayable.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Low Stock</p>
            <p className="text-sm font-bold text-yellow-500">{lowStockCount} items</p>
          </CardContent>
        </Card>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Activity</h2>
          <Link href="/transactions" className="text-xs text-primary">See all</Link>
        </div>
        <div className="space-y-2">
          {recentActivity.slice(0, 5).map((txn) => (
            <Card key={txn.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium capitalize">{txn.type}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(txn.date)}</p>
                </div>
                <p className={`text-sm font-bold ${Number(txn.amount) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Number(txn.amount) >= 0 ? '+' : ''}{fmtAmount(txn.amount)}
                </p>
              </CardContent>
            </Card>
          ))}
          {recentActivity.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
          )}
        </div>
      </section>

    </div>
  )
}
