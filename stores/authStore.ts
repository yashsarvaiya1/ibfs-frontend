// stores/authStore.ts
// Spec: "Frontend stores credentials in memory — no persistent localStorage"
// No persist middleware. Credentials live only in JS memory for the session.
import { create } from 'zustand'

interface AuthState {
  isAuthenticated: boolean
  username: string | null
  // Encoded Basic Auth header value — kept in memory, attached to every request by axios
  credentials: string | null
  login: (username: string, password: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  username: null,
  credentials: null,

  login: (username, password) => {
    const encoded = btoa(`${username}:${password}`)
    set({ isAuthenticated: true, username, credentials: encoded })
  },

  logout: () => {
    set({ isAuthenticated: false, username: null, credentials: null })
  },
}))

// Selector — used by axios interceptor to read the current auth header
export const selectCredentials = (state: AuthState) => state.credentials
