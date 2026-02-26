// lib/axios.ts
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

// Handle 401 globally — clear in-memory auth and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
