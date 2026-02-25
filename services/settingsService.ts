// services/settingsService.ts
import api from '@/lib/axios'
import { Settings, SettingsUpdate } from '@/models/settings'

export const settingsService = {
  get: () =>
    api.get<Settings>('/settings/').then(r => r.data),

  update: (data: SettingsUpdate) =>
    api.post<Settings>('/settings/', data).then(r => r.data),
}
