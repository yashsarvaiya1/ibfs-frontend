// hooks/useSettings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsService } from '@/services/settingsService'
import { SettingsUpdate } from '@/models/settings'

export const SETTINGS_KEY = ['settings']

export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: settingsService.get,
    staleTime: Infinity,       // settings rarely change
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SettingsUpdate) => settingsService.update(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  })
}
