// components/shared/UploadInput.tsx
'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useUploadMany } from '@/hooks/useUpload'
import { Camera, Paperclip, X, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface UploadInputProps {
  value:     string[]
  onChange:  (urls: string[]) => void
  context?:  'document' | 'product' | 'settings'
  maxFiles?: number
  disabled?: boolean
}

function isImage(url: string) {
  return /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(url)
}

export function UploadInput({
  value    = [],
  onChange,
  context  = 'document',
  maxFiles = 10,
  disabled = false,
}: UploadInputProps) {
  const fileInputRef   = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // context is passed at hook init — uploadMany(files[]) needs no context arg
  const { uploadMany, uploading } = useUploadMany(context)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const remaining = maxFiles - value.length
    if (remaining <= 0) {
      toast.error(`Max ${maxFiles} files allowed`)
      return
    }
    const toUpload = Array.from(files).slice(0, remaining)
    try {
      // uploadMany(files[]) — context already bound in hook
      const urls = await uploadMany(toUpload)
      if (urls.length > 0) onChange([...value, ...urls])
      // Reset so same file can be selected again
      if (fileInputRef.current)   fileInputRef.current.value   = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
    } catch {
      toast.error('Upload failed — try again')
    }
  }

  const remove = (url: string) => onChange(value.filter((u) => u !== url))
  const canAdd = value.length < maxFiles && !disabled

  return (
    <div className="space-y-2">

      {/* Previews */}
      {(value.length > 0 || uploading) && (
        <div className="flex flex-wrap gap-2">
          {value.map((url) => (
            <div
              key={url}
              className="relative group w-16 h-16 rounded-lg border overflow-hidden bg-muted shrink-0"
            >
              {isImage(url) ? (
                <img src={url} alt="attachment" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(url)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-background/90 border flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}

          {/* Upload in-progress placeholder */}
          {uploading && (
            <div className="w-16 h-16 rounded-lg border bg-muted flex items-center justify-center shrink-0">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      {canAdd && (
        <div className="flex gap-2">
          {/* capture="environment" = rear camera on mobile PWA */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => cameraInputRef.current?.click()}
            className="gap-1.5"
          >
            <Camera className="h-4 w-4" />
            Camera
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
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
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
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
