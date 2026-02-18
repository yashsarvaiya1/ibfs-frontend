// stores/uiStore.ts

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UIState {
  sidebarOpen: boolean
  quickActionOpen: boolean
  pageTitle: string
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setQuickActionOpen: (open: boolean) => void
  setPageTitle: (title: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      quickActionOpen: false,
      pageTitle: 'Dashboard',

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setQuickActionOpen: (open) => set({ quickActionOpen: open }),
      setPageTitle: (title) => set({ pageTitle: title }),
    }),
    {
      name: 'ibfs_ui',
      storage: createJSONStorage(() => localStorage),
      // Only persist sidebarOpen — rest reset on every load
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen }),
    }
  )
)
