// stores/settingsStore.ts

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AppSettings {
  // Document feature flags — controls Quick Action menu visibility
  inventory_enabled: boolean
  po_enabled: boolean
  pi_enabled: boolean
  challan_enabled: boolean
  credit_note_enabled: boolean
  debit_note_enabled: boolean
  vouchers_enabled: boolean
  // Preferences
  theme: 'light' | 'dark'
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY'
  currency: 'INR'
}

interface SettingsState {
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => void
  resetSettings: () => void
}

const defaults: AppSettings = {
  inventory_enabled: false,
  po_enabled: true,
  pi_enabled: true,
  challan_enabled: true,
  credit_note_enabled: true,
  debit_note_enabled: true,
  vouchers_enabled: true,
  theme: 'light',
  date_format: 'DD/MM/YYYY',
  currency: 'INR',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaults,
      updateSettings: (updates) =>
        set((state) => ({ settings: { ...state.settings, ...updates } })),
      resetSettings: () => set({ settings: defaults }),
    }),
    {
      name: 'ibfs_settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
