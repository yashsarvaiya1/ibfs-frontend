import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsService } from '@/services/settingsService'
import { useAuthStore } from '@/stores/authStore'
import type { SettingsUpdate } from '@/models/settings'


export const SETTINGS_KEY = ['settings'] as const


export function useSettings() {
  const isAuthenticated = useAuthStore((s) => !!s.credentials)   // ← guard

  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn:  settingsService.get,
    enabled:  isAuthenticated,                                    // ← only fetch when logged in
    staleTime: 5 * 60 * 1000,                                    // 5 min
    retry: false,                                                 // ← never retry a 401
  })
}


export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SettingsUpdate) => settingsService.update(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  })
}
