// services/settingsService.ts
import api from '@/lib/axios'
import { Settings, SettingsUpdate } from '@/models/settings'

export const settingsService = {
  get: () =>
    api.get<Settings>('/settings/').then(r => r.data),

  // fix: was api.post — should be api.patch for partial singleton update
  update: (data: SettingsUpdate) =>
    api.post<Settings>('/settings/', data).then(r => r.data),
}
