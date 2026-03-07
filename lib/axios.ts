import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { env } from 'next-runtime-env' // Import this

const api = axios.create({
  // Use env() instead of process.env
  baseURL: env('NEXT_PUBLIC_API_URL') || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
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
