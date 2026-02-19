// components/accounts/AccountDetailPage.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { usePaymentAccount, useDeletePaymentAccount } from '@/hooks/usePaymentAccount'
import { ACCOUNT_TYPE_LABELS } from '@/models/paymentAccount'
import { AccountFormSheet } from '@/components/accounts/AccountFormSheet'
import { AccountStatement } from '@/components/accounts/AccountStatement'
import { ContraSheet } from '@/components/accounts/ContraSheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  ChevronLeft,
  Edit,
  Trash2,
  Landmark,
  Smartphone,
  Wallet,
  ArrowLeftRight,
} from 'lucide-react'
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

interface Props {
  id: number
}

export function AccountDetailPage({ id }: Props) {
  const router = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)

  const { data: account, isLoading } = usePaymentAccount(id)
  const deleteAccount = useDeletePaymentAccount()

  const [editOpen,   setEditOpen]   = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [contraOpen, setContraOpen] = useState(false)

  useEffect(() => {
    if (account) setPageTitle(account.name)
  }, [account, setPageTitle])

  const handleDelete = async () => {
    await deleteAccount.mutateAsync(id)
    router.replace('/accounts')
  }

  if (isLoading) return <AccountDetailSkeleton />
  if (!account)  return (
    <div className="flex items-center justify-center h-40">
      <p className="text-muted-foreground text-sm">Account not found</p>
    </div>
  )

  const Icon       = ACCOUNT_ICONS[account.account_type] ?? Wallet
  const colorClass = ACCOUNT_COLORS[account.account_type] ?? 'bg-muted text-muted-foreground'
  const balance    = parseFloat(account.current_balance)

  return (
    <div className="flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background z-20">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Account info card */}
      <div className="px-4 py-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${colorClass}`}>
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{account.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-xs">
                {ACCOUNT_TYPE_LABELS[account.account_type]}
              </Badge>
              {account.account_type === 'bank' && account.account_number && (
                <span className="text-xs text-muted-foreground">
                  ····{account.account_number.slice(-4)}
                </span>
              )}
              {account.account_type === 'bank' && account.ifsc_code && (
                <span className="text-xs text-muted-foreground">{account.ifsc_code}</span>
              )}
              {account.account_type === 'upi' && account.upi_id && (
                <span className="text-xs text-muted-foreground">{account.upi_id}</span>
              )}
            </div>
          </div>
        </div>

        {/* Balance + Transfer — only action on account detail per spec */}
        <div className="rounded-2xl bg-muted/50 px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-foreground' : 'text-red-500'}`}>
              {balance < 0 ? '−' : ''}₹{Math.abs(balance).toLocaleString('en-IN')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setContraOpen(true)}>
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Transfer
          </Button>
        </div>
      </div>

      {/* Statement — all payment + contra txns for this account */}
      <div className="border-t">
        <div className="px-4 py-2 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Statement
          </p>
        </div>
        <AccountStatement accountId={id} />
      </div>

      <AccountFormSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        account={account}
      />

      <ContraSheet
        open={contraOpen}
        onClose={() => setContraOpen(false)}
        defaultSourceId={id}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account?</DialogTitle>
            <DialogDescription>
              This will permanently delete {account.name}.
              All linked transactions will be unlinked but not deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={deleteAccount.isPending}
            >
              {deleteAccount.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}

function AccountDetailSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-14 h-14 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}
