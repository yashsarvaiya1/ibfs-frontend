'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useUploadMany } from '@/hooks/useUpload'
import { Camera, Paperclip, X, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

interface UploadInputProps {
  value:       string[]
  onChange:    (paths: string[]) => void
  context?:    'document' | 'product' | 'settings'
  maxFiles?:   number
  disabled?:   boolean
  // Optional: parent owns FilePreviewSheet state, passes this to open it on thumb tap
  onPreview?:  (index: number) => void
}

function isImage(path: string) {
  return /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(path)
}

function toDisplayUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `${API_BASE}/media/${path}`
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
    try {
      const paths = await uploadMany(toUpload)
      if (paths.length > 0) onChange([...value, ...paths])
      if (fileInputRef.current)   fileInputRef.current.value   = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
    } catch {
      toast.error('Upload failed — try again')
    }
  }

  const remove = (path: string) => onChange(value.filter((p) => p !== path))
  const canAdd = value.length < maxFiles && !disabled

  return (
    <div className="space-y-2">

      {(value.length > 0 || uploading) && (
        <div className="flex flex-wrap gap-2">
          {value.map((path, idx) => (
            <div
              key={path}
              className="relative group w-16 h-16 rounded-lg border overflow-hidden bg-muted shrink-0"
            >
              {/* Tap area — opens preview */}
              <button
                type="button"
                className="w-full h-full"
                onClick={() => onPreview?.(idx)}
              >
                {isImage(path) ? (
                  <Image
                    src={toDisplayUrl(path)}
                    alt="attachment"
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </button>

              {/* Remove button */}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); remove(path) }}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-background/90 border flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity z-10"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}

          {uploading && (
            <div className="w-16 h-16 rounded-lg border bg-muted flex items-center justify-center shrink-0">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {canAdd && (
        <div className="flex gap-2">
          <Button
            type="button" variant="outline" size="sm"
            disabled={uploading}
            onClick={() => cameraInputRef.current?.click()}
            className="gap-1.5"
          >
            <Camera className="h-4 w-4" />
            Camera
          </Button>

          <Button
            type="button" variant="outline" size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
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
            onChange={(e) => handleFiles(e.target.files)}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {value.length >= maxFiles && !disabled && (
        <p className="text-xs text-muted-foreground">Max {maxFiles} files reached</p>
      )}
    </div>
  )
}
