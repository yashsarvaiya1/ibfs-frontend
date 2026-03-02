'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { UploadInput } from '@/components/shared/common/UploadInput'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { LogOut } from 'lucide-react'

// ─── Toggle row ───────────────────────────────────────────────────────────────

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
      <Switch checked={checked} onCheckedChange={onToggle} disabled={disabled} />
    </div>
  )
}

// ─── Image preview row ────────────────────────────────────────────────────────

interface ImageUploadRowProps {
  label:       string
  description: string
  value:       string[]
  onChange:    (urls: string[]) => void
  disabled?:   boolean
}

function ImageUploadRow({ label, description, value, onChange, disabled }: ImageUploadRowProps) {
  return (
    <div className="py-3 space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <UploadInput
        value={value}
        onChange={onChange}
        context="settings"
        maxFiles={1}
        disabled={disabled}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const router       = useRouter()
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  useEffect(() => setPageTitle('Settings'), [setPageTitle])

  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()
  const logout   = useAuthStore((s) => s.logout)
  const username = useAuthStore((s) => s.username)

  const isPending = updateSettings.isPending

  // ── Image URL state — array of 0-1 GCS URLs ────────────────────────────────
  // UploadInput works with string[], settings model stores single string
  const [headerUrls, setHeaderUrls] = useState<string[]>([])
  const [signUrls,   setSignUrls]   = useState<string[]>([])

  useEffect(() => {
    if (settings) {
      setHeaderUrls(settings.header_image ? [settings.header_image] : [])
      setSignUrls(settings.sign_image   ? [settings.sign_image]   : [])
    }
  }, [settings])

  // ── Auto-save image to settings on upload (onChange fires after GCS upload) ─
  const handleHeaderChange = useCallback(async (urls: string[]) => {
    setHeaderUrls(urls)
    try {
      await updateSettings.mutateAsync({ header_image: urls[0] ?? null })
      toast.success('Letterhead saved')
    } catch {
      toast.error('Failed to save letterhead')
    }
  }, [updateSettings])

  const handleSignChange = useCallback(async (urls: string[]) => {
    setSignUrls(urls)
    try {
      await updateSettings.mutateAsync({ sign_image: urls[0] ?? null })
      toast.success('Signature saved')
    } catch {
      toast.error('Failed to save signature')
    }
  }, [updateSettings])

  // ── Toggle ──────────────────────────────────────────────────────────────────
  const toggle = async (field: string, value: boolean) => {
    try {
      await updateSettings.mutateAsync({ [field]: value })
    } catch {
      toast.error('Failed to update setting')
    }
  }

  const handleLogout = () => { logout(); router.replace('/login') }

  if (isLoading) return (
    <div className="px-4 py-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  )

  if (!settings) return null

  return (
    <div className="px-4 py-4 pb-10 space-y-6">

      {/* ── Account info ──────────────────────────────────────────────── */}
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

      {/* ── Document types ────────────────────────────────────────────── */}
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
              description="Enable delivery challan — Bills/Invoices won't generate stock entries"
              checked={settings.enable_challan}
              onToggle={v => toggle('enable_challan', v)}
              disabled={isPending}
            />
            <ToggleRow
              label="Credit Note"
              description="Enable CN — return of sale"
              checked={settings.enable_cn}
              onToggle={v => toggle('enable_cn', v)}
              disabled={isPending}
            />
            <ToggleRow
              label="Debit Note"
              description="Enable DN — return of purchase"
              checked={settings.enable_dn}
              onToggle={v => toggle('enable_dn', v)}
              disabled={isPending}
            />
            <ToggleRow
              label="Cash Vouchers"
              description="Replace amount input with line items when Cash account is selected"
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

      {/* ── Print customization — GCS upload ──────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Print Customization
        </h2>
        <Card>
          <CardContent className="p-4 divide-y">

            {/* Letterhead */}
            <ImageUploadRow
              label="Letterhead"
              description="Shown at the top of printed documents. Upload via camera or file."
              value={headerUrls}
              onChange={handleHeaderChange}
              disabled={isPending}
            />

            {/* Signature */}
            <div className="pt-3">
              <ImageUploadRow
                label="Signature"
                description="Shown at the bottom of printed documents."
                value={signUrls}
                onChange={handleSignChange}
                disabled={isPending}
              />
            </div>

          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground mt-2 px-1">
          Images are uploaded to cloud storage. Tap the thumbnail to remove and re-upload.
        </p>
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
