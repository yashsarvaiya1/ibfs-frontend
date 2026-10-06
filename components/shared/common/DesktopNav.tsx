'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, FileText, Package, Landmark, ArrowLeftRight, Settings, Plus, Boxes } from 'lucide-react'

const links = [
  { href:'/', label:'Overview', icon:LayoutDashboard },
  { href:'/documents', label:'Documents', icon:FileText },
  { href:'/contacts', label:'Contacts', icon:Users },
  { href:'/accounts', label:'Accounts', icon:Landmark },
  { href:'/transactions', label:'Transactions', icon:ArrowLeftRight },
  { href:'/inventory', label:'Inventory', icon:Package },
  { href:'/stock-transactions', label:'Stock history', icon:Boxes },
  { href:'/settings', label:'Settings', icon:Settings },
]

export function DesktopNav() {
  const pathname = usePathname()
  const quick = useUIStore(s=>s.openQuickAction)
  const { data: settings } = useSettings()
  return <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r bg-card p-5 h-dvh">
    <Link href="/" className="font-bold text-xl tracking-tight text-primary">IBFS</Link>
    <p className="text-xs text-muted-foreground mt-1 mb-7 truncate">{settings?.company_name || 'Business workspace'}</p>
    <button onClick={()=>quick()} className="flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-medium shadow-sm mb-5"><Plus className="h-4 w-4" /> Quick action</button>
    <nav aria-label="Main navigation" className="space-y-1">
      {links.map(({href,label,icon:Icon})=>{
        const active = href==='/' ? pathname==='/' : pathname===href || pathname.startsWith(`${href}/`)
        return <Link key={href} href={href} aria-current={active?'page':undefined} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',active?'bg-primary/10 text-primary font-semibold':'text-muted-foreground hover:bg-muted hover:text-foreground')}><Icon className="h-4 w-4" />{label}</Link>
      })}
    </nav>
    <p className="mt-auto text-xs text-muted-foreground leading-relaxed">Documents, payments and stock in one workspace.</p>
  </aside>
}
