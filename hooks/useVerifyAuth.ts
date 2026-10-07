import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { sessionService } from '@/services/sessionService'

export function useVerifyAuth() {
  const hydrated = useAuthStore(s => s._hasHydrated)
  const authenticated = useAuthStore(s => s.isAuthenticated)
  useEffect(() => {
    if (!hydrated) return
    let active = true
    const request = authenticated && navigator.onLine ? sessionService.status() : Promise.resolve(null)
    request.then(session => {
      if (active && session && !session.authenticated) useAuthStore.getState().logout()
    }).catch(() => { /* Retain locally saved access when the server is unreachable. */ })
    return () => { active = false }
  }, [hydrated, authenticated])
}
