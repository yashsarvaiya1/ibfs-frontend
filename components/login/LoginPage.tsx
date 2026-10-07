'use client'

import { LoadingState } from '@/components/shared/common/LoadingState'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, isSessionRestoreBlocked } from '@/stores/authStore'
import { sessionService } from '@/services/sessionService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import Image from 'next/image'

export function LoginPage() {
  const router          = useRouter()
  const login           = useAuthStore((s) => s.login)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const attemptStarted = useRef(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  
  // Fetch settings directly — useSettings() is auth-guarded so won't fire here
  const [logoUrl]   = useState<string | null>(null)

  useEffect(() => {
    if (isSessionRestoreBlocked()) return
    if (useAuthStore.getState().isAuthenticated) { router.replace('/'); return }
    let active = true
    sessionService.status().then(session => {
      if (!active || attemptStarted.current || isSessionRestoreBlocked()) return
      if (session.authenticated) { login(session.username!, session.csrf_token); router.replace('/') }
    }).catch(() => { /* Keep sign-in usable while the server is unavailable. */ })
    return () => { active = false }
  }, [login, router])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.error('Enter username and password')
      return
    }
    attemptStarted.current = true
    setLoading(true)
    try {
      await sessionService.login(username.trim(), password)
      setPassword('')
      router.replace('/')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        toast.error('Invalid username or password')
      } else {
        toast.error('Connection failed — check server')
      }
    } finally {
      setLoading(false)
    }
  }

  if (isAuthenticated) return <LoadingState fullScreen label="Opening your workspace…" />

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="mb-8 text-center">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="Logo"
            width={64}
            height={64}
            className="rounded-2xl mx-auto mb-4 object-contain"
            unoptimized
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
            <Button type="submit" className="w-full" loading={loading}>
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
