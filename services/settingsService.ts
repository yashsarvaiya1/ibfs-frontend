import api from '@/lib/axios'
import type { Settings, SettingsUpdate } from '@/models/settings'

export const settingsService = {
  preview: (type: 'invoice' | 'bill') =>
    api.get<Blob>('/settings/print-preview/', { params: { type }, responseType: 'blob' }).then(r => r.data),
  get: () =>
    api.get<Settings>('/settings/').then(r => r.data),

  // PATCH — partial update on singleton (pk=1 always on backend viewset)
  update: (data: SettingsUpdate) =>
    api.patch<Settings>('/settings/', data).then(r => r.data),
}
