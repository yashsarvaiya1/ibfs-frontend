// lib/axios.ts

import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach Basic Auth credentials on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const credentials = localStorage.getItem('ibfs_credentials')
    if (credentials) {
      config.headers.Authorization = `Basic ${credentials}`
    }
  }
  return config
})

// Handle 401 globally — clear auth and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('ibfs_credentials')
      localStorage.removeItem('ibfs_auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
