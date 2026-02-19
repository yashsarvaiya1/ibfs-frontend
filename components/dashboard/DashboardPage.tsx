// components/dashboard/DashboardPage.tsx

'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'

export function DashboardPage() {
  const setPageTitle = useUIStore((s) => s.setPageTitle)

  useEffect(() => {
    setPageTitle('Dashboard')
  }, [setPageTitle])

  return (
    <div className="p-4">
      <p className="text-muted-foreground text-sm">Dashboard coming soon...</p>
    </div>
  )
}
