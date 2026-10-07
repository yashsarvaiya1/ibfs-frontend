import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoadingState({ label = 'Loading…', fullScreen = false, className }: { label?: string; fullScreen?: boolean; className?: string }) {
  return <div role="status" aria-live="polite" className={cn('flex items-center justify-center gap-3 text-sm text-muted-foreground', fullScreen ? 'min-h-dvh bg-background flex-col' : 'py-8', className)}><LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin motion-reduce:animate-none text-primary" /><span>{label}</span></div>
}
