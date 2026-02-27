'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useSettings } from '@/hooks/useSettings'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  FileText, Receipt, ClipboardList, Truck,
  RotateCcw, RotateCw, Banknote, AlertCircle,
  Package, Wallet, Users, ArrowLeftRight, Settings,
} from 'lucide-react'
import type { DocumentType } from '@/models/document'


interface ActionItem {
  label:  string
  icon:   React.ComponentType<{ className?: string }>
  action: () => void
}


export function QuickActionSheet() {
  const router = useRouter()

  const quickActionOpen    = useUIStore((s) => s.quickActionOpen)
  const closeQuickAction   = useUIStore((s) => s.closeQuickAction)
  const openDocCreateSheet = useUIStore((s) => s.openDocCreateSheet)
  const { data: settings } = useSettings()

  const close = () => closeQuickAction()

  // Navigate and close sheet
  const nav = (href: string) => {
    close()
    router.push(href)
  }

  // Document types → DocCreateSheet (bill, invoice, po, etc.)
  const doc = (type: DocumentType) => {
    close()
    openDocCreateSheet(type)
  }

  // expense / interest → direct navigation to /documents/new?type=...
  // This fixes the redirect issue — no intermediate sheet reopening
  const newDoc = (type: 'expense' | 'interest') => {
    close()
    router.push(`/documents/new?type=${type}`)
  }


  // ── Group 1: Core actions ─────────────────────────────────────────────────
  const coreActions: ActionItem[] = [
    { label: 'Bill',     icon: FileText,    action: () => doc('bill') },
    { label: 'Invoice',  icon: Receipt,     action: () => doc('invoice') },
    { label: 'Expense',  icon: Banknote,    action: () => newDoc('expense') },   // ← fixed
    ...(settings?.enable_interest !== false
      ? [{ label: 'Interest', icon: AlertCircle, action: () => newDoc('interest') }]  // ← fixed
      : []
    ),
  ]

  // ── Group 2: Settings-gated document types ────────────────────────────────
  const optionalActions = ([
    settings?.enable_po        && { label: 'Purch. Order', icon: ClipboardList, action: () => doc('po') },
    settings?.enable_pi        && { label: 'Proforma Inv', icon: ClipboardList, action: () => doc('pi') },
    settings?.enable_quotation && { label: 'Quotation',    icon: ClipboardList, action: () => doc('quotation') },
    settings?.enable_challan   && { label: 'Challan',      icon: Truck,         action: () => doc('challan') },
    settings?.enable_cn        && { label: 'Credit Note',  icon: RotateCcw,     action: () => doc('cn') },
    settings?.enable_dn        && { label: 'Debit Note',   icon: RotateCw,      action: () => doc('dn') },
  ] as (ActionItem | false)[]).filter((x): x is ActionItem => Boolean(x))

  // ── Group 3: Navigation shortcuts (Settings added) ────────────────────────
  const pageActions: ActionItem[] = [
    { label: 'Accounts',     icon: Wallet,         action: () => nav('/accounts') },
    { label: 'Transactions', icon: ArrowLeftRight, action: () => nav('/transactions') },
    { label: 'Inventory',    icon: Package,        action: () => nav('/inventory') },
    { label: 'Settings',     icon: Settings,       action: () => nav('/settings') },
  ]

  const renderGrid = (actions: ActionItem[]) => (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
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
    <Sheet open={quickActionOpen} onOpenChange={(open) => { if (!open) close() }}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-left">Quick Actions</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Create</p>
            {renderGrid(coreActions)}
          </div>

          {optionalActions.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Documents</p>
              {renderGrid(optionalActions)}
            </div>
          )}

          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Navigate</p>
            {renderGrid(pageActions)}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
