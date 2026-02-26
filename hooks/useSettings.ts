// hooks/useSettings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsService } from '@/services/settingsService'
import type { SettingsUpdate } from '@/models/settings'

export const SETTINGS_KEY = ['settings'] as const

export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: settingsService.get,
    // 5 minutes — low-frequency change but NOT Infinity since
    // toggling auto_transaction/auto_stock must reflect immediately
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SettingsUpdate) => settingsService.update(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  })
}
