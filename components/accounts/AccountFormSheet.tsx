// components/accounts/AccountFormSheet.tsx

'use client'

import { useEffect, useState } from 'react'
import { useCreatePaymentAccount, useUpdatePaymentAccount } from '@/hooks/usePaymentAccount'
import { PaymentAccount, PaymentAccountFormData, AccountType, ACCOUNT_TYPE_LABELS } from '@/models/paymentAccount'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  open: boolean
  onClose: () => void
  account?: PaymentAccount
}

const empty: PaymentAccountFormData = {
  name:            '',
  account_type:    'bank',
  account_number:  '',
  ifsc_code:       '',
  upi_id:          '',
  current_balance: '0',
}

export function AccountFormSheet({ open, onClose, account }: Props) {
  const isEdit      = !!account
  const createAccount = useCreatePaymentAccount()
  const updateAccount = useUpdatePaymentAccount()

  const [form, setForm] = useState<PaymentAccountFormData>(empty)

  useEffect(() => {
    if (account) {
      setForm({
        name:            account.name,
        account_type:    account.account_type,
        account_number:  account.account_number ?? '',
        ifsc_code:       account.ifsc_code ?? '',
        upi_id:          account.upi_id ?? '',
        current_balance: account.current_balance,
      })
    } else {
      setForm(empty)
    }
  }, [account, open])

  const set = (key: keyof PaymentAccountFormData, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async () => {
    const payload: PaymentAccountFormData = {
      ...form,
      account_number: form.account_number || undefined,
      ifsc_code:      form.ifsc_code      || undefined,
      upi_id:         form.upi_id         || undefined,
    }
    if (isEdit && account) {
      await updateAccount.mutateAsync({ id: account.id, data: payload })
    } else {
      await createAccount.mutateAsync(payload)
    }
    onClose()
  }

  const loading = createAccount.isPending || updateAccount.isPending

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto px-4 pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle>{isEdit ? 'Edit Account' : 'New Account'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">

          <div className="space-y-1.5">
            <Label>Account Name</Label>
            <Input
              placeholder="e.g. HDFC Bank, PhonePe, Office Cash"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Account Type</Label>
            <Select
              value={form.account_type}
              onValueChange={(v) => set('account_type', v as AccountType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {ACCOUNT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.account_type === 'bank' && (
            <>
              <div className="space-y-1.5">
                <Label>Account Number <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  placeholder="e.g. 0123456789"
                  value={form.account_number}
                  onChange={(e) => set('account_number', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>IFSC Code <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  placeholder="e.g. HDFC0001234"
                  value={form.ifsc_code}
                  onChange={(e) => set('ifsc_code', e.target.value.toUpperCase())}
                />
              </div>
            </>
          )}

          {form.account_type === 'upi' && (
            <div className="space-y-1.5">
              <Label>UPI ID <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                placeholder="e.g. name@upi"
                value={form.upi_id}
                onChange={(e) => set('upi_id', e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{isEdit ? 'Current Balance' : 'Opening Balance'}</Label>
            <Input
              type="number"
              placeholder="0"
              value={form.current_balance}
              onChange={(e) => set('current_balance', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? 'Direct edit — no transaction record created'
                : 'Starting balance for this account'}
            </p>
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={loading || !form.name.trim()}
          >
            {loading
              ? isEdit ? 'Saving...' : 'Creating...'
              : isEdit ? 'Save Changes' : 'Create Account'}
          </Button>

        </div>
      </SheetContent>
    </Sheet>
  )
}
