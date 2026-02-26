'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useSettings } from '@/hooks/useSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import api from '@/lib/axios'
import Image from 'next/image'

export function LoginPage() {
  const router          = useRouter()
  const login           = useAuthStore((s) => s.login)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  // If already authenticated (e.g. back navigation), redirect immediately
  useEffect(() => {
    if (isAuthenticated) router.replace('/')
  }, [isAuthenticated, router])

  // Try fetching settings for header_image — unauthenticated, so may return null
  // We attempt it anyway for white-label branding; failure is silent
  const { data: settings } = useSettings()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.error('Enter username and password')
      return
    }
    setLoading(true)
    try {
      // Verify credentials against a lightweight endpoint before storing in memory
      const encoded = btoa(`${username}:${password}`)
      await api.get('/contacts/', {
        headers: { Authorization: `Basic ${encoded}` },
        params: { page: 1, page_size: 1 },
      })
      login(username, password)
      router.replace('/')
    } catch (err: any) {
      if (err?.response?.status === 401) {
        toast.error('Invalid username or password')
      } else {
        toast.error('Connection failed — check server')
      }
    } finally {
      setLoading(false)
    }
  }

  if (isAuthenticated) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">

      {/* Logo — uses header_image from Settings if available */}
      <div className="mb-8 text-center">
        {settings?.header_image ? (
          <Image
            src={settings.header_image}
            alt="Logo"
            width={64}
            height={64}
            className="rounded-2xl mx-auto mb-4 object-contain"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-primary-foreground">IB</span>
          </div>
        )}
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
              {loading ? 'Signing in…' : 'Sign In'}
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
