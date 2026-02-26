'use client'

import { useEffect, useState } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { LogOut, Wallet, Users, Package, Save } from 'lucide-react'

interface ToggleRowProps {
  label:       string
  description: string
  checked:     boolean
  onToggle:    (v: boolean) => void
  disabled?:   boolean
}

function ToggleRow({ label, description, checked, onToggle, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
    </div>
  )
}

export function SettingsPage() {
  const router       = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  useEffect(() => setPageTitle('Settings'), [setPageTitle])

  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()
  const logout   = useAuthStore((s) => s.logout)
  const username = useAuthStore((s) => s.username)

  // Local state for the new URL fields (Bug #20)
  const [headerUrl, setHeaderUrl] = useState('')
  const [signUrl, setSignUrl] = useState('')

  // Sync local state when settings load
  useEffect(() => {
    if (settings) {
      setHeaderUrl(settings.header_image || '')
      setSignUrl(settings.sign_image || '')
    }
  }, [settings])

  // Type-safe toggle — key must be a boolean field of Settings
  const toggle = async (field: string, value: boolean) => {
    try {
      await updateSettings.mutateAsync({ [field]: value })
    } catch {
      toast.error('Failed to update setting')
    }
  }

  // Handle saving the custom URLs
  const saveCustomUrls = async () => {
    try {
      await updateSettings.mutateAsync({
        header_image: headerUrl,
        sign_image: signUrl
      })
      toast.success('Print customization saved')
    } catch {
      toast.error('Failed to save print customization')
    }
  }

  if (isLoading) return (
    <div className="px-4 py-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  )

  if (!settings) return null

  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  const isPending = updateSettings.isPending

  return (
    <div className="px-4 py-4 pb-10 space-y-6">

      {/* ── Account Info ──────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">
                {username?.[0]?.toUpperCase() ?? 'U'}
              </span>
            </div>
            <div>
              <p className="font-semibold">{username}</p>
              <p className="text-xs text-muted-foreground">Logged in</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Quick Links ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { label: 'Accounts',  icon: Wallet,  href: '/accounts'  },
          { label: 'Contacts',  icon: Users,   href: '/contacts'  },
          { label: 'Inventory', icon: Package, href: '/inventory' },
        ] as const).map(item => (
          <Card
            key={item.href}
            className="cursor-pointer active:scale-95 transition-transform"
            onClick={() => router.push(item.href)}
          >
            <CardContent className="p-3 flex flex-col items-center gap-2">
              <item.icon className="h-5 w-5 text-primary" />
              <p className="text-xs font-medium">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Automation ────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Automation
        </h2>
        <Card>
          <CardContent className="p-4 divide-y">
            <ToggleRow
              label="Auto Transaction"
              description="Automatically record a financial transaction when a document is created"
              checked={settings.auto_transaction}
              onToggle={v => toggle('auto_transaction', v)}
              disabled={isPending}
            />
            <ToggleRow
              label="Auto Stock"
              description="Automatically move stock when a document is created"
              checked={settings.auto_stock}
              onToggle={v => toggle('auto_stock', v)}
              disabled={isPending}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Document Types ────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Document Types
        </h2>
        <Card>
          <CardContent className="p-4 divide-y">
            <ToggleRow
              label="Purchase Orders"
              description="Enable PO document type"
              checked={settings.enable_po}
              onToggle={v => toggle('enable_po', v)}
              disabled={isPending}
            />
            <ToggleRow
              label="Proforma Invoice"
              description="Enable PI document type"
              checked={settings.enable_pi}
              onToggle={v => toggle('enable_pi', v)}
              disabled={isPending}
            />
            <ToggleRow
              label="Quotation"
              description="Enable Quotation document type"
              checked={settings.enable_quotation}
              onToggle={v => toggle('enable_quotation', v)}
              disabled={isPending}
            />
            <ToggleRow
              label="Challan"
              description="Enable delivery challan — Bills/Invoices won't move stock automatically"
              checked={settings.enable_challan}
              onToggle={v => toggle('enable_challan', v)}
              disabled={isPending}
            />
            <ToggleRow
              label="Credit Note"
              description="Enable Credit Note (CN) — return of sale"
              checked={settings.enable_cn}
              onToggle={v => toggle('enable_cn', v)}
              disabled={isPending}
            />
            <ToggleRow
              label="Debit Note"
              description="Enable Debit Note (DN) — return of purchase"
              checked={settings.enable_dn}
              onToggle={v => toggle('enable_dn', v)}
              disabled={isPending}
            />
            <ToggleRow
              label="Cash Vouchers"
              description="Replace simple amount input with line items when cash account is selected"
              checked={settings.enable_vouchers}
              onToggle={v => toggle('enable_vouchers', v)}
              disabled={isPending}
            />
            <ToggleRow
              label="Interest"
              description="Enable standalone interest/charge documents from Quick Actions"
              checked={settings.enable_interest}
              onToggle={v => toggle('enable_interest', v)}
              disabled={isPending}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Print Customization (Fixes Bug #20) ───────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Print Customization
        </h2>
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Letterhead URL (header_url)</Label>
              <Input 
                placeholder="https://example.com/header.png" 
                value={headerUrl} 
                onChange={(e) => setHeaderUrl(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Signature URL (sign_url)</Label>
              <Input 
                placeholder="https://example.com/sign.png" 
                value={signUrl} 
                onChange={(e) => setSignUrl(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <Button 
              size="sm" 
              onClick={saveCustomUrls} 
              disabled={isPending}
              className="w-full mt-2"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Images
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Logout ────────────────────────────────────────────────────── */}
      <Button
        variant="destructive"
        className="w-full h-12 gap-2"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" /> Logout
      </Button>
    </div>
  )
}
