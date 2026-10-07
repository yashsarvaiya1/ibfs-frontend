import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AuthState {
  isAuthenticated:boolean
  username:string | null
  csrfToken:string | null
  restoreBlocked:boolean
  sessionRevision:number
  _hasHydrated:boolean
  login:(username:string, csrfToken?:string)=>void
  logout:()=>void
  setCsrfToken:(token:string)=>void
  setHasHydrated:(value:boolean)=>void
}
const safeSessionStorage = {
  getItem:(name:string)=>{try { return typeof window==='undefined' ? null : sessionStorage.getItem(name) } catch { return null }},
  setItem:(name:string,value:string)=>{try { if(typeof window!=='undefined')sessionStorage.setItem(name,value) } catch { /* Retain in-memory access when browser storage is unavailable. */ }},
  removeItem:(name:string)=>{try { if(typeof window!=='undefined')sessionStorage.removeItem(name) } catch { /* In-memory authentication is cleared independently. */ }},
}
export const SESSION_LOCK_KEY = 'ibfs-session-locked'
export function isSessionRestoreBlocked() {
  if (useAuthStore.getState().restoreBlocked) return true
  try { return typeof window !== 'undefined' && localStorage.getItem(SESSION_LOCK_KEY) === 'true' }
  catch { return false }
}
export const useAuthStore = create<AuthState>()(persist(set=>({
  isAuthenticated:false,username:null,csrfToken:null,restoreBlocked:false,sessionRevision:0,_hasHydrated:false,
  login:(username,csrfToken)=>{
    try { if (typeof window !== 'undefined') localStorage.removeItem(SESSION_LOCK_KEY) } catch { /* Session storage still records the local lock. */ }
    set({isAuthenticated:true,username,restoreBlocked:false,...(csrfToken ? {csrfToken} : {})})
  },
  logout:()=>{
    try { if (typeof window !== 'undefined') localStorage.setItem(SESSION_LOCK_KEY, 'true') } catch { /* Always clear in-memory authentication. */ }
    set(state=>({isAuthenticated:false,username:null,csrfToken:null,restoreBlocked:true,sessionRevision:state.sessionRevision + 1}))
  },
  setCsrfToken:csrfToken=>set({csrfToken}),
  setHasHydrated:_hasHydrated=>set({_hasHydrated}),
}),{
  name:'ibfs-auth',version:2,storage:createJSONStorage(()=>safeSessionStorage),
  partialize:state=>({isAuthenticated:state.isAuthenticated,username:state.username,restoreBlocked:state.restoreBlocked}),
  // Discard legacy Base64 passwords when upgrading the web app.
  migrate:()=>({isAuthenticated:false,username:null}),
  onRehydrateStorage:()=>state=>state?.setHasHydrated(true),
}))
