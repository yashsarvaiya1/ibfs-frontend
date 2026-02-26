// components/shared/Header.tsx
'use client'

import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useSettings } from '@/hooks/useSettings'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, ArrowLeft } from 'lucide-react'
import Image from 'next/image'

export function Header() {
  const pageTitle  = useUIStore((s) => s.pageTitle)
  const username   = useAuthStore((s) => s.username)
  const logout     = useAuthStore((s) => s.logout)
  const router     = useRouter()
  const pathname   = usePathname()
  const { data: settings } = useSettings()

  const isRoot = pathname === '/'
  const handleLogout = () => { logout(); router.replace('/login') }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">

        {/* Left — back button on sub-pages, logo+breadcrumb */}
        <div className="flex items-center gap-2">
          {!isRoot && (
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 -ml-1"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {/* Logo — header_image from settings, fallback to text */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          >
            {settings?.header_image ? (
              <Image
                src={settings.header_image}
                alt="Logo"
                width={24}
                height={24}
                className="rounded object-contain"
              />
            ) : (
              <span className="text-sm font-semibold text-primary">IBFS</span>
            )}
          </button>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-sm font-medium truncate max-w-40">{pageTitle}</span>
        </div>

        {/* Right — user dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full shrink-0">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">{username}</div>
            <DropdownMenuItem onClick={() => router.push('/transactions')}>
              All Transactions
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  )
}
