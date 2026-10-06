import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { sessionService } from '@/services/sessionService'

export function useVerifyAuth() {
  const hydrated=useAuthStore(s=>s._hasHydrated)
  const authenticated=useAuthStore(s=>s.isAuthenticated)
  const verified=useRef(false)
  useEffect(()=>{
    if(!hydrated || !authenticated || verified.current)return
    verified.current=true
    sessionService.status().then(session=>{
      if(!session.authenticated)useAuthStore.getState().logout()
    }).catch(()=>{verified.current=false})
  },[hydrated,authenticated])
}
