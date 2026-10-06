import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AuthState {
  isAuthenticated:boolean
  username:string | null
  csrfToken:string | null
  _hasHydrated:boolean
  login:(username:string, csrfToken?:string)=>void
  logout:()=>void
  setCsrfToken:(token:string)=>void
  setHasHydrated:(value:boolean)=>void
}
const safeSessionStorage = {
  getItem:(name:string)=>typeof window==='undefined' ? null : sessionStorage.getItem(name),
  setItem:(name:string,value:string)=>{if(typeof window!=='undefined')sessionStorage.setItem(name,value)},
  removeItem:(name:string)=>{if(typeof window!=='undefined')sessionStorage.removeItem(name)},
}
export const useAuthStore = create<AuthState>()(persist(set=>({
  isAuthenticated:false,username:null,csrfToken:null,_hasHydrated:false,
  login:(username,csrfToken)=>set({isAuthenticated:true,username,...(csrfToken ? {csrfToken} : {})}),
  logout:()=>set({isAuthenticated:false,username:null,csrfToken:null}),
  setCsrfToken:csrfToken=>set({csrfToken}),
  setHasHydrated:_hasHydrated=>set({_hasHydrated}),
}),{
  name:'ibfs-auth',version:2,storage:createJSONStorage(()=>safeSessionStorage),
  partialize:state=>({isAuthenticated:state.isAuthenticated,username:state.username}),
  // Discard legacy Base64 passwords when upgrading the web app.
  migrate:()=>({isAuthenticated:false,username:null}),
  onRehydrateStorage:()=>state=>state?.setHasHydrated(true),
}))
