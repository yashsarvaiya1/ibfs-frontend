'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Plus, FileText, Package,
} from 'lucide-react'
import { useState } from 'react'

// Settings replaces the 5th slot — moved to Header menu icon
// Inventory replaces Settings in BottomNav
const NAV_LEFT = [
  { label: 'Home',      href: '/',         icon: LayoutDashboard },
  { label: 'Contacts',  href: '/contacts', icon: Users },
]
const NAV_RIGHT = [
  { label: 'Docs',      href: '/documents',  icon: FileText },
  { label: 'Inventory', href: '/inventory',  icon: Package },
]

// Quick action type picker — shown above FAB as a mini menu
// Omits 'interest' if enableinterest is OFF, 'transfer' is always available
const QA_OPTIONS = [
  { type: 'expense',  label: 'Expense',  emoji: '💸' },
  { type: 'interest', label: 'Interest', emoji: '📈' },
  { type: 'transfer', label: 'Transfer', emoji: '↔️' },
] as const

export function BottomNav() {
  const pathname        = usePathname()
  const openQuickAction = useUIStore((s) => s.openQuickAction)
  const { data: settings } = useSettings()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="flex items-center justify-around h-16 px-2">

        {NAV_LEFT.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}

        {/* FAB — opens QuickAction type picker */}
        <FabMenu
          settings={settings}
          onSelect={(type) => openQuickAction(type)}
        />

        {NAV_RIGHT.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </div>
    </nav>
  )
}

// ── FAB with popover type picker ─────────────────────────────────────────────
function FabMenu({
  settings,
  onSelect,
}: {
  settings: any
  onSelect: (type: 'expense' | 'interest' | 'transfer') => void
}) {
  const [open, setOpen] = useState(false)

  const options = QA_OPTIONS.filter((o) => {
    if (o.type === 'interest') return settings?.enable_interest !== false
    return true
  })

  return (
    <div className="relative flex flex-col items-center -mt-5">
      {/* Type picker popover — appears above FAB */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-16 z-50 bg-background border rounded-2xl shadow-xl p-2 flex flex-col gap-1 min-w-35">
            {options.map((opt) => (
              <button
                key={opt.type}
                type="button"
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-muted text-sm font-medium text-left active:bg-muted/70 transition-colors"
                onClick={() => { onSelect(opt.type); setOpen(false) }}
              >
                <span className="text-base">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="New action"
        className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <Plus className={cn('h-6 w-6 text-primary-foreground transition-transform duration-200', open && 'rotate-45')} />
      </button>
      <span className="text-[10px] text-muted-foreground mt-1">New</span>
    </div>
  )
}

// ── Shared nav item ───────────────────────────────────────────────────────────
function NavItem({
  href, label, icon: Icon, active,
}: {
  href: string; label: string; icon: React.ElementType; active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center justify-center gap-1 w-16 py-1 transition-colors',
        active ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  )
}
