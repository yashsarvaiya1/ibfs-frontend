// stores/authStore.ts

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AuthState {
  isAuthenticated: boolean
  username: string | null
  loginDate: number | null
  login: (username: string, password: string) => void
  logout: () => void
  checkSession: () => boolean
}

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      username: null,
      loginDate: null,

      login: (username, password) => {
        const encoded = btoa(`${username}:${password}`)
        localStorage.setItem('ibfs_credentials', encoded)
        set({ isAuthenticated: true, username, loginDate: Date.now() })
      },

      logout: () => {
        localStorage.removeItem('ibfs_credentials')
        set({ isAuthenticated: false, username: null, loginDate: null })
      },

      checkSession: () => {
        const { loginDate, logout } = get()
        if (!loginDate) return false
        if (Date.now() - loginDate > SESSION_DURATION) {
          logout()
          return false
        }
        return true
      },
    }),
    {
      name: 'ibfs_auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
