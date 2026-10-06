// lib/axios.ts
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { env } from 'next-runtime-env'

export function getApiBase(): string {
  return (env('NEXT_PUBLIC_API_URL') || '/api').replace(/\/+$/, '')
}

const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
})

// ✅ baseURL injected at request time — reads runtime env, not build-time
api.interceptors.request.use((config) => {
  config.baseURL = getApiBase()

  const credentials = useAuthStore.getState().credentials
  if (credentials) {
    config.headers.Authorization = `Basic ${credentials}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const { credentials, logout } = useAuthStore.getState()
      if (credentials) {
        logout()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
