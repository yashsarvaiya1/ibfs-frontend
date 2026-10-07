import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { sessionService } from '@/services/sessionService'

export function useVerifyAuth() {
  const hydrated = useAuthStore(s => s._hasHydrated)
  const authenticated = useAuthStore(s => s.isAuthenticated)
  const [checking, setChecking] = useState(true)
  useEffect(() => {
    if (!hydrated) return
    let active = true
    const request = authenticated && navigator.onLine ? sessionService.status() : Promise.resolve(null)
    request.then(session => {
      if (active && session && !session.authenticated) useAuthStore.getState().logout()
    }).catch(() => { /* Retain locally saved access when the server is unreachable. */ })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [hydrated, authenticated])
  return checking
}
