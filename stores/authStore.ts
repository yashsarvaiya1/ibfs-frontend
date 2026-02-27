import { create } from 'zustand'

interface AuthState {
  isAuthenticated: boolean
  username:    string | null
  credentials: string | null
  login:  (username: string, password: string) => void
  logout: () => void
}

export const SESSION_KEY = 'ibfs_auth'

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  username: null,
  credentials: null,

  login: (username, password) => {
    const credentials = btoa(`${username}:${password}`)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username, credentials }))
    }
    set({ isAuthenticated: true, username, credentials })
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_KEY)
    }
    set({ isAuthenticated: false, username: null, credentials: null })
  },
}))

export const selectCredentials = (state: AuthState) => state.credentials
