// components/shared/BottomNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, Plus, FileText, Settings } from 'lucide-react'

const NAV_LEFT = [
  { label: 'Home',     href: '/',          icon: LayoutDashboard },
  { label: 'Contacts', href: '/contacts',  icon: Users },
]

const NAV_RIGHT = [
  { label: 'Docs',     href: '/documents', icon: FileText },
  { label: 'Settings', href: '/settings',  icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()
  const setQuickActionOpen = useUIStore((s) => s.setQuickActionOpen)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_LEFT.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}
        <button
          onClick={() => setQuickActionOpen(true)}
          className="flex flex-col items-center justify-center -mt-5"
        >
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Plus className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">New</span>
        </button>
        {NAV_RIGHT.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </div>
    </nav>
  )
}

function NavItem({ href, label, icon: Icon, active }: {
  href: string; label: string; icon: React.ElementType; active: boolean
}) {
  return (
    <Link href={href} className={cn(
      'flex flex-col items-center justify-center gap-1 w-16 py-1 text-muted-foreground transition-colors',
      active && 'text-primary'
    )}>
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  )
}
