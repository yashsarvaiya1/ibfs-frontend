// services/settingsService.ts
import api from '@/lib/axios'
import type { Settings, SettingsUpdate } from '@/models/settings'

export const settingsService = {
  get: () =>
    api.get<Settings>('/settings/').then(r => r.data),

  // PATCH — partial update on singleton (pk=1 always)
  update: (data: SettingsUpdate) =>
    api.patch<Settings>('/settings/', data).then(r => r.data),
}
