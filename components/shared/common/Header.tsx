'use client'

import { useNetworkStore } from '@/stores/networkStore'
import { LoaderCircle } from 'lucide-react'

import { useUIStore } from '@/stores/uiStore'
import { useSettings } from '@/hooks/useSettings'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Settings } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import Image from 'next/image'

export function Header() {
  const pending = useNetworkStore(s => s.pending)
  const pageTitle = useUIStore((s) => s.pageTitle)
  const router    = useRouter()
  const pathname  = usePathname()
  const { data: settings } = useSettings()

  const isRoot = pathname === '/'
  const logoUrl = settings?.header_image_url ?? null

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">

        <div className="flex items-center gap-2 min-w-0">
          {!isRoot && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -ml-1"
              aria-label="Go back"
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
          <span className="text-sm font-medium truncate max-w-[min(40vw,20rem)]">{pageTitle}</span>
        </div>

        <div className="flex items-center gap-1">
          {pending > 0 && <span role="status" aria-label="Loading" className="flex items-center"><LoaderCircle aria-hidden="true" className="h-4 w-4 text-primary animate-spin motion-reduce:animate-none" /></span>}
          <ThemeToggle />
          <Button variant="ghost" size="icon" aria-label="Settings" className="h-9 w-9 shrink-0" onClick={() => router.push('/settings')}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>

      </div>
    </header>
  )
}
