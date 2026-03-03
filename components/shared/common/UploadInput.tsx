'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useUploadMany } from '@/hooks/useUpload'
import { Camera, Paperclip, X, Loader2, FileText, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { getMediaUrl, isImagePath, isPdfPath, getFileName } from '@/lib/media'

interface UploadInputProps {
  value:      string[]
  onChange:   (paths: string[]) => void
  context?:   'document' | 'product' | 'settings'
  maxFiles?:  number
  disabled?:  boolean
  onPreview?: (index: number) => void
}

export function UploadInput({
  value    = [],
  onChange,
  context  = 'document',
  maxFiles = 10,
  disabled = false,
  onPreview,
}: UploadInputProps) {
  const fileInputRef   = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const { uploadMany, uploading } = useUploadMany(context)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const remaining = maxFiles - value.length
    if (remaining <= 0) { toast.error(`Max ${maxFiles} files allowed`); return }
    const toUpload = Array.from(files).slice(0, remaining)
    const paths = await uploadMany(toUpload)
    if (paths.length > 0) onChange([...value, ...paths])
    if (fileInputRef.current)   fileInputRef.current.value   = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const remove = (path: string) => onChange(value.filter(p => p !== path))
  const canAdd = value.length < maxFiles && !disabled

  return (
    <div className="space-y-2">

      {/* ── Thumbnails ─────────────────────────────────────────────────── */}
      {(value.length > 0 || uploading) && (
        <div className="flex flex-wrap gap-2">
          {value.map((path, idx) => (
            <div
              key={path}
              // ✅ `group` is required for md:group-hover to work
              className="relative group w-20 h-20 rounded-xl border border-border/60 overflow-hidden bg-muted shrink-0"
            >
              {/* Preview tap area */}
              <button
                type="button"
                className="w-full h-full"
                onClick={() => onPreview?.(idx)}
              >
                {isImagePath(path) ? (
                  <Image
                    src={getMediaUrl(path)}
                    alt={getFileName(path)}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-1">
                    <FileText className={`h-6 w-6 shrink-0 ${isPdfPath(path) ? 'text-red-500' : 'text-primary'}`} />
                    <span className="text-[8px] text-muted-foreground truncate w-full text-center leading-tight px-1">
                      {getFileName(path)}
                    </span>
                  </div>
                )}
              </button>

              {/* X button — always visible on mobile, hover-only on desktop */}
              {!disabled && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); remove(path) }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/95 border border-border/60 flex items-center justify-center shadow-sm z-10
                    opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 text-foreground" />
                </button>
              )}

              {/* Eye icon overlay — preview hint on images */}
              {onPreview && isImagePath(path) && (
                <div className="absolute bottom-1 left-1 pointer-events-none">
                  <div className="w-5 h-5 rounded-full bg-black/40 flex items-center justify-center">
                    <Eye className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {uploading && (
            <div className="w-20 h-20 rounded-xl border bg-muted flex items-center justify-center shrink-0">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* ── Upload buttons ─────────────────────────────────────────────── */}
      {canAdd && (
        <div className="flex gap-2">
          <Button
            type="button" variant="outline" size="sm"
            disabled={uploading}
            onClick={() => cameraInputRef.current?.click()}
            className="gap-1.5 h-9 rounded-lg"
          >
            <Camera className="h-4 w-4" />
            Camera
          </Button>

          <Button
            type="button" variant="outline" size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5 h-9 rounded-lg"
          >
            <Paperclip className="h-4 w-4" />
            File
          </Button>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>
      )}

      {value.length >= maxFiles && !disabled && (
        <p className="text-xs text-muted-foreground">Max {maxFiles} files reached</p>
      )}
    </div>
  )
}
