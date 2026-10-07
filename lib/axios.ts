// lib/axios.ts
import axios from 'axios'
import { useNetworkStore } from '@/stores/networkStore'
import { clearOffline } from '@/lib/offline/vault'
import { useAuthStore } from '@/stores/authStore'

export function getApiBase(): string {
  return '/api'
}

const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
})

// ✅ baseURL injected at request time — reads runtime env, not build-time
api.interceptors.request.use((config) => {
  useNetworkStore.getState().start()
  const base = getApiBase()
  const url = config.url ?? ''
  // Preview links already use app-root API/media URLs. Do not prefix them again.
  config.baseURL = url === base || url.startsWith(`${base}/`) || url.startsWith('/media/') ? '' : base

  const token = useAuthStore.getState().csrfToken
  if (token && !['get','head','options'].includes(config.method?.toLowerCase() ?? 'get')) config.headers['X-CSRFToken'] = token
  return config
})

api.interceptors.response.use(
  (response) => { useNetworkStore.getState().finish(); return response },
  (error) => {
    useNetworkStore.getState().finish()
    if (error.response?.status === 401) {
      const { isAuthenticated, logout } = useAuthStore.getState()
      if (isAuthenticated) {
        logout()
        if (typeof window !== 'undefined') {
          void clearOffline().catch(() => { /* Key is locked even when storage access is unavailable. */ }).finally(() => { window.location.href = '/login' })
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
