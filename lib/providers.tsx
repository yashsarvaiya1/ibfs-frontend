// lib/providers.tsx
'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useAuthStore } from '@/stores/authStore'

// Private — only used inside Providers below
function HydrationGate({ children }: { children: React.ReactNode }) {
  const hasHydrated = useAuthStore((s) => s._hasHydrated)

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
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

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationGate>
        {children}
      </HydrationGate>
      {/* DevTools render outside the gate — always accessible */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
