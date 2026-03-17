// stores/authStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AuthState {
  isAuthenticated: boolean
  username: string | null
  credentials: string | null  // btoa(user:pass) only — raw password never stored
  _hasHydrated: boolean
  login: (username: string, password: string) => void
  logout: () => void
  setHasHydrated: (value: boolean) => void
}

// SSR-safe wrapper — sessionStorage doesn't exist during Next.js server render
const safeSessionStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem(name)
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return
    sessionStorage.setItem(name, value)
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(name)
  },
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      username: null,
      credentials: null,
      _hasHydrated: false,

      login: (username, password) => {
        const credentials = btoa(`${username}:${password}`)
        set({ isAuthenticated: true, username, credentials })
      },

      logout: () => {
        set({ isAuthenticated: false, username: null, credentials: null })
      },

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'ibfs-auth',
      storage: createJSONStorage(() => safeSessionStorage),
      // _hasHydrated is a runtime flag — never write it to sessionStorage
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        username: state.username,
        credentials: state.credentials,
      }),
      onRehydrateStorage: () => (state) => {
        // Fires after sessionStorage is read and state is merged
        state?.setHasHydrated(true)
      },
    }
  )
)

export const selectCredentials = (state: AuthState) => state.credentials
