// hooks/useVerifyAuth.ts
import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/axios'

/**
 * Fires once per app session after hydration.
 * Silently self-heals stale credentials (e.g. server password changed)
 * by hitting the lightest endpoint — GET /settings/.
 * If 401 comes back, logs the user out cleanly.
 */
export function useVerifyAuth() {
  const hasHydrated    = useAuthStore((s) => s._hasHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const credentials    = useAuthStore((s) => s.credentials)
  const logout         = useAuthStore((s) => s.logout)
  const verified       = useRef(false)

  useEffect(() => {
    if (!hasHydrated) return
    if (!isAuthenticated || !credentials) return
    if (verified.current) return

    verified.current = true

    api.get('/settings/').catch((err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) logout()
    })
  }, [hasHydrated, isAuthenticated, credentials, logout])
}
