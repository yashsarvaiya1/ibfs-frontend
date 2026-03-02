import { useState, useCallback } from 'react'
import { uploadService } from '@/services/uploadService'
import type { UploadContext, UploadResponse } from '@/services/uploadService'

export interface UploadState {
  uploading: boolean
  error: string | null
}

// Single file upload — returns the relative PATH (e.g. "uploads/documents/abc.jpg")
// Store this path in the DB (attachment_urls, image_url).
// Use UploadResponse.url only for immediate preview display in the UI.
export function useUpload(context?: UploadContext) {
  const [state, setState] = useState<UploadState>({ uploading: false, error: null })

  const upload = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      setState({ uploading: true, error: null })
      try {
        const res = await uploadService.upload(file, context)
        setState({ uploading: false, error: null })
        return res  // caller uses res.path for DB, res.url for display
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setState({ uploading: false, error: message })
        return null
      }
    },
    [context]
  )

  return { upload, ...state }
}

// Multi-file upload — returns ordered array of relative PATHS for DB storage
// Consistent with uploadService.uploadForUrls which returns paths, not URLs
export function useUploadMany(context?: UploadContext) {
  const [state, setState] = useState<UploadState>({ uploading: false, error: null })

  const uploadMany = useCallback(
    async (files: File[]): Promise<string[]> => {
      if (!files.length) return []
      setState({ uploading: true, error: null })
      try {
        const paths = await uploadService.uploadForUrls(files, context)
        setState({ uploading: false, error: null })
        return paths  // relative paths — store directly in attachment_urls
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setState({ uploading: false, error: message })
        return []
      }
    },
    [context]
  )

  return { uploadMany, ...state }
}
