'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, FileText, Package, Plus } from 'lucide-react'

const NAV_LEFT = [
  { label: 'Home',     href: '/',        icon: LayoutDashboard },
  { label: 'Contacts', href: '/contacts', icon: Users },
]
const NAV_RIGHT = [
  { label: 'Docs',      href: '/documents', icon: FileText },
  { label: 'Inventory', href: '/inventory', icon: Package },
]

export function BottomNav() {
  const pathname        = usePathname()
  const openQuickAction = useUIStore((s) => s.openQuickAction)

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

        <div className="flex flex-col items-center -mt-5">
          <button
            type="button"
            onClick={() => openQuickAction()}  // no type — sheet shows full grid
            aria-label="Quick Action"
            className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6 text-primary-foreground" />
          </button>
          <span className="text-[10px] text-muted-foreground mt-1">Quick</span>
        </div>

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
