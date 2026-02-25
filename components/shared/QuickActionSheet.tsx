// components/shared/QuickActionSheet.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useSettings } from '@/hooks/useSettings'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  FileText, Receipt, CreditCard, ClipboardList,
  Truck, RotateCcw, RotateCw, Banknote, AlertCircle,
  Package, Wallet, Users, ArrowLeftRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function QuickActionSheet() {
  const router = useRouter()
  const quickActionOpen = useUIStore((s) => s.quickActionOpen)
  const setQuickActionOpen = useUIStore((s) => s.setQuickActionOpen)
  const openTransactionSheet = useUIStore((s) => s.openTransactionSheet)
  const openDocCreateSheet = useUIStore((s) => s.openDocCreateSheet)
  const { data: settings } = useSettings()

  const close = () => setQuickActionOpen(false)
  const nav = (href: string) => { close(); router.push(href) }

  // Group 1 — Page navigation
  const pageActions = [
    { label: 'Inventory', icon: Package, action: () => nav('/inventory') },
    { label: 'Accounts',  icon: Wallet,  action: () => nav('/accounts') },
    { label: 'Contacts',  icon: Users,   action: () => nav('/contacts') },
    { label: 'Transactions', icon: ArrowLeftRight, action: () => nav('/transactions') },
  ]

  // Group 2 — Always visible doc/txn actions
  const coreActions = [
    { label: 'Bill',        icon: FileText,     action: () => { close(); openDocCreateSheet('bill') } },
    { label: 'Invoice',     icon: Receipt,      action: () => { close(); openDocCreateSheet('invoice') } },
    { label: 'Transaction', icon: CreditCard,   action: () => { close(); openTransactionSheet({}) } },
    { label: 'Expense',     icon: Banknote,     action: () => { close(); openTransactionSheet({ mode: 'send' }) } },
  ]

  // Group 3 — Settings-gated document types
  const optionalActions = [
    { label: 'Purch. Order', icon: ClipboardList, enabled: !!settings?.enable_po,
      action: () => { close(); openDocCreateSheet('po') } },
    { label: 'Proforma Inv', icon: ClipboardList, enabled: !!settings?.enable_pi,
      action: () => { close(); openDocCreateSheet('pi') } },
    { label: 'Quotation',    icon: ClipboardList, enabled: !!settings?.enable_quotation,
      action: () => { close(); openDocCreateSheet('quotation') } },
    { label: 'Challan',      icon: Truck,         enabled: !!settings?.enable_challan,
      action: () => { close(); openDocCreateSheet('challan') } },
    { label: 'Credit Note',  icon: RotateCcw,     enabled: !!settings?.enable_cn,
      action: () => { close(); openDocCreateSheet('cn') } },
    { label: 'Debit Note',   icon: RotateCw,      enabled: !!settings?.enable_dn,
      action: () => { close(); openDocCreateSheet('dn') } },
    { label: 'Interest',     icon: AlertCircle,   enabled: !!settings?.enable_interest,
      action: () => { close(); openDocCreateSheet('interest') } },
  ].filter(a => a.enabled)

  const renderGrid = (actions: { label: string; icon: React.ElementType; action: () => void }[]) => (
    <div className="grid grid-cols-4 gap-2">
      {actions.map(a => (
        <button
          key={a.label}
          onClick={a.action}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border bg-muted/40 py-3 px-1 text-center active:scale-95 transition-transform"
        >
          <a.icon className="h-5 w-5 text-primary" />
          <span className="text-[10px] font-medium leading-tight">{a.label}</span>
        </button>
      ))}
    </div>
  )

  return (
    <Sheet open={quickActionOpen} onOpenChange={setQuickActionOpen}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">Quick Actions</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">

          {/* Core actions */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Create</p>
            {renderGrid(coreActions)}
          </div>

          {/* Optional doc types */}
          {optionalActions.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Documents</p>
              {renderGrid(optionalActions)}
            </div>
          )}

          {/* Pages */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Navigate</p>
            {renderGrid(pageActions)}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
