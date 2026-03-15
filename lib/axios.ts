// lib/axios.ts
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

const api = axios.create({
  // process.env is evaluated at build time for NEXT_PUBLIC_ vars — safe here
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  // getState() reads Zustand's in-memory state — always current after hydration
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
      // Guard: only auto-logout if we had stored credentials
      // (prevents triggering on the login page's own credential-probe request)
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
