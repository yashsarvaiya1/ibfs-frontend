// components/shared/QuickActionSheet.tsx

'use client'

import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  FileText,
  Receipt,
  CreditCard,
  ClipboardList,
  Truck,
  RotateCcw,
  RotateCw,
  Banknote,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'

interface QuickAction {
  label: string
  icon: React.ElementType
  href?: string
  action?: () => void
  enabled: boolean
}

export function QuickActionSheet() {
  const router = useRouter()
  const quickActionOpen = useUIStore((s) => s.quickActionOpen)
  const setQuickActionOpen = useUIStore((s) => s.setQuickActionOpen)
  const openTransactionSheet = useUIStore((s) => s.openTransactionSheet)
  const { settings } = useSettingsStore()

  const handleClose = () => setQuickActionOpen(false)

  const handleNavigate = (href: string) => {
    handleClose()
    router.push(href)
  }

  const handleTransaction = () => {
    handleClose()
    openTransactionSheet({})
  }

  const actions: QuickAction[] = [
    {
      label: 'Create Bill',
      icon: FileText,
      href: '/documents/new?type=bill',
      enabled: true,
    },
    {
      label: 'Create Invoice',
      icon: Receipt,
      href: '/documents/new?type=invoice',
      enabled: true,
    },
    {
      label: 'Add Transaction',
      icon: CreditCard,
      action: handleTransaction,
      enabled: true,
    },
    {
      label: 'Purchase Order',
      icon: ClipboardList,
      href: '/documents/new?type=po',
      enabled: settings.po_enabled,
    },
    {
      label: 'Proforma Invoice',
      icon: ClipboardList,
      href: '/documents/new?type=pi',
      enabled: settings.pi_enabled,
    },
    {
      label: 'Challan',
      icon: Truck,
      href: '/documents/new?type=challan',
      enabled: settings.challan_enabled,
    },
    {
      label: 'Credit Note',
      icon: RotateCcw,
      href: '/documents/new?type=cn',
      enabled: settings.credit_note_enabled,
    },
    {
      label: 'Debit Note',
      icon: RotateCw,
      href: '/documents/new?type=dn',
      enabled: settings.debit_note_enabled,
    },
    {
      label: 'Cash Voucher',
      icon: Banknote,
      href: '/documents/new?type=cash_voucher',
      enabled: settings.vouchers_enabled,
    },
    {
      label: 'Income Voucher',
      icon: TrendingUp,
      href: '/documents/new?type=income_voucher',
      enabled: settings.vouchers_enabled,
    },
    {
      label: 'Add Interest',
      icon: AlertCircle,
      href: '/documents/new?type=interest',
      enabled: settings.vouchers_enabled,
    },
  ]

  // Only show enabled actions — fully removed if disabled
  const visibleActions = actions.filter((a) => a.enabled)

  return (
    <Sheet open={quickActionOpen} onOpenChange={setQuickActionOpen}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">Quick Action</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-3 gap-3">
          {visibleActions.map((action) => (
            <button
              key={action.label}
              onClick={() =>
                action.action
                  ? action.action()
                  : handleNavigate(action.href!)
              }
              className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-muted/40 p-4 text-center active:scale-95 transition-transform"
            >
              <action.icon className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium leading-tight">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
