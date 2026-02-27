import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'


const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})


// Read credentials from in-memory Zustand store — never localStorage
api.interceptors.request.use((config) => {
  const credentials = useAuthStore.getState().credentials
  if (credentials) {
    config.headers.Authorization = `Basic ${credentials}`
  }
  return config
})


// Handle 401 globally — clear auth, stop all retries, redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const { credentials, logout } = useAuthStore.getState()

      // Only logout + redirect if we were actually logged in
      // Prevents redirect loop on the /login page itself
      if (credentials) {
        logout()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)    // ← always reject, never retry
  }
)


export default api
