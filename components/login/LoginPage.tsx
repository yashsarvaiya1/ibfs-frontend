// components/login/LoginPage.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import api from '@/lib/axios'

export function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const checkSession = useAuthStore((s) => s.checkSession)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  // Redirect after hydration — not during render
  useEffect(() => {
    if (!hydrated) return
    if (isAuthenticated && checkSession()) {
      router.replace('/')
    }
  }, [hydrated, isAuthenticated, checkSession, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.error('Please enter username and password')
      return
    }

    setLoading(true)
    try {
      const encoded = btoa(`${username}:${password}`)
      await api.get('/contacts/', {
        headers: { Authorization: `Basic ${encoded}` },
        params: { page: 1 },
      })
      login(username, password)
      router.replace('/')
    } catch (err: any) {
      if (err?.response?.status === 401) {
        toast.error('Invalid username or password')
      } else {
        toast.error('Connection failed. Check server.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Don't render until hydrated — prevents flicker
  if (!hydrated) return null
  if (isAuthenticated) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">

      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-primary-foreground">IB</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">IBFS</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Integrated Business Finance System
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                autoComplete="username"
                autoCapitalize="none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-8">
        Contact admin to create your account
      </p>
    </div>
  )
}
