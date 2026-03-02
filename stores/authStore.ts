// stores/authStore.ts
import { create } from 'zustand'

interface AuthState {
  isAuthenticated: boolean
  username:    string | null
  credentials: string | null
  login:  (username: string, password: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  username: null,
  credentials: null,

  login: (username, password) => {
    const credentials = btoa(`${username}:${password}`)
    // In-memory only — per spec "In-memory session post-login"
    // No sessionStorage, no localStorage — credentials live in Zustand only
    set({ isAuthenticated: true, username, credentials })
  },

  logout: () => {
    set({ isAuthenticated: false, username: null, credentials: null })
  },
}))

export const selectCredentials = (state: AuthState) => state.credentials
