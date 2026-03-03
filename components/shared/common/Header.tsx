'use client'

import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useSettings } from '@/hooks/useSettings'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuSeparator,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, ArrowLeft, Settings, ArrowLeftRight } from 'lucide-react'
import Image from 'next/image'

export function Header() {
  const pageTitle = useUIStore((s) => s.pageTitle)
  const username  = useAuthStore((s) => s.username)
  const logout    = useAuthStore((s) => s.logout)
  const router    = useRouter()
  const pathname  = usePathname()
  const { data: settings } = useSettings()

  const isRoot = pathname === '/'
  const handleLogout = () => { logout(); router.replace('/login') }

  const logoUrl = settings?.header_image_url ?? null

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">

        <div className="flex items-center gap-2">
          {!isRoot && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -ml-1"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo"
                width={24}
                height={24}
                className="rounded object-contain"
                unoptimized
              />
            ) : (
              <span className="text-sm font-semibold text-primary">IBFS</span>
            )}
          </button>

          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-sm font-medium truncate max-w-40">{pageTitle}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full shrink-0">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
              {username}
            </div>
            <DropdownMenuItem onClick={() => router.push('/transactions')}>
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              All Transactions
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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
