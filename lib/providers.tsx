// lib/providers.tsx
'use client'

import { LoadingState } from '@/components/shared/common/LoadingState'
import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { clearOffline } from '@/lib/offline/vault'
import { useAuthStore, isSessionRestoreBlocked, SESSION_LOCK_KEY } from '@/stores/authStore'

// Private — only used inside Providers below
function HydrationGate({ children }: { children: React.ReactNode }) {
  const hasHydrated = useAuthStore((s) => s._hasHydrated)

  if (!hasHydrated) {
    return <LoadingState fullScreen label="Opening IBFS…" />
  }

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,        // data is fresh for 30s — avoids unnecessary refetches
            gcTime: 5 * 60 * 1000,       // keep unused cache for 5 mins
            refetchOnWindowFocus: true,  // re-fetch when user tabs back in
            refetchOnMount: true,        // always fetch fresh on mount
            retry: (failureCount, error: unknown) => {
              const status = (error as { response?: { status?: number } })?.response?.status
              // Never retry auth errors — stops hammering on 401/403
              if (status === 401 || status === 403) return false
              return failureCount < 2
            },
          },
        },
      })
  )

  useEffect(()=>useAuthStore.subscribe((state,previous)=>{
    if(previous.isAuthenticated && !state.isAuthenticated){queryClient.cancelQueries();queryClient.clear(); void clearOffline().catch(() => { /* Browser storage may be unavailable. */ })}
  }),[queryClient])

  useEffect(() => {
    const lock = () => { if (isSessionRestoreBlocked()) useAuthStore.getState().logout() }
    const onStorage = (event: StorageEvent) => { if (event.key === SESSION_LOCK_KEY && event.newValue === 'true') lock() }
    lock()
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <HydrationGate>
        {children}
      </HydrationGate>
      {/* DevTools render outside the gate — always accessible */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
    </ThemeProvider>
  )
}
