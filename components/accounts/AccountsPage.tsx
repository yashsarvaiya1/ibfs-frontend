// components/accounts/AccountsPage.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useAccounts } from '@/hooks/useAccount'
import { useCreateAccount } from '@/hooks/useAccount'
import { fmtAmount } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, ChevronRight, Landmark, Smartphone, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { AccountType } from '@/models/account'

const ACCOUNT_ICONS = { bank: Landmark, upi: Smartphone, cash: Wallet }

export function AccountsPage() {
  const router = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  useEffect(() => setPageTitle('Accounts'), [setPageTitle])

  const { data, isLoading } = useAccounts()
  const accounts = data?.results ?? []
  const [createOpen, setCreateOpen] = useState(false)

  // Create sheet state
  const [type, setType] = useState<AccountType>('bank')
  const [name, setName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [upiId, setUpiId] = useState('')
  const [balance, setBalance] = useState('')
  const createAccount = useCreateAccount()

  const resetForm = () => { setName(''); setAccountNumber(''); setIfsc(''); setUpiId(''); setBalance('') }

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Account name is required'); return }
    try {
      await createAccount.mutateAsync({
        type, name,
        account_number: type === 'bank' ? accountNumber || null : null,
        ifsc_code: type === 'bank' ? ifsc || null : null,
        upi_id: type === 'upi' ? upiId || null : null,
        current_balance: balance || '0',
        is_active: true,
      })
      toast.success('Account created')
      setCreateOpen(false)
      resetForm()
    } catch { toast.error('Failed to create account') }
  }

  const totalBalance = accounts.reduce((s, a) => s + Number(a.current_balance), 0)

  return (
    <div className="px-4 py-4 space-y-4">

      {/* Total */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-4">
          <p className="text-sm opacity-80">Total Balance</p>
          <p className="text-3xl font-bold mt-1">{fmtAmount(totalBalance)}</p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">All Accounts</h2>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Account
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((acc) => {
            const Icon = ACCOUNT_ICONS[acc.type]
            return (
              <Card key={acc.id} className="cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() => router.push(`/accounts/${acc.id}`)}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{acc.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{acc.type}
                      {acc.account_number && ` · ${acc.account_number.slice(-4).padStart(acc.account_number.length, '•')}`}
                      {acc.upi_id && ` · ${acc.upi_id}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold">{fmtAmount(acc.current_balance)}</p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Sheet */}
      <Sheet open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) resetForm() }}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">New Account</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <Tabs value={type} onValueChange={v => setType(v as AccountType)}>
              <TabsList className="w-full">
                <TabsTrigger value="bank" className="flex-1">Bank</TabsTrigger>
                <TabsTrigger value="upi" className="flex-1">UPI</TabsTrigger>
                <TabsTrigger value="cash" className="flex-1">Cash</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="space-y-1.5">
              <Label>Account Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Axis Bank" value={name} onChange={e => setName(e.target.value)} />
            </div>
            {type === 'bank' && (
              <>
                <div className="space-y-1.5">
                  <Label>Account Number <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Input placeholder="Account number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>IFSC Code <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Input placeholder="IFSC code" value={ifsc} onChange={e => setIfsc(e.target.value)} />
                </div>
              </>
            )}
            {type === 'upi' && (
              <div className="space-y-1.5">
                <Label>UPI ID <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Input placeholder="name@upi" value={upiId} onChange={e => setUpiId(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Opening Balance</Label>
              <Input type="number" placeholder="0.00" value={balance} onChange={e => setBalance(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={createAccount.isPending}>
              {createAccount.isPending ? 'Creating...' : 'Create Account'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
