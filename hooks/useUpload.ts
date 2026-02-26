// hooks/useUpload.ts
import { useState, useCallback } from 'react'
import { uploadService } from '@/services/uploadService'
import type { UploadContext, UploadResponse } from '@/services/uploadService'

export interface UploadState {
  uploading: boolean
  error: string | null
}

// Single file upload — returns the GCS URL string on success
export function useUpload(context?: UploadContext) {
  const [state, setState] = useState<UploadState>({ uploading: false, error: null })

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setState({ uploading: true, error: null })
      try {
        const res = await uploadService.upload(file, context)
        setState({ uploading: false, error: null })
        return res.url
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

// Multi-file upload — returns ordered array of GCS URL strings
export function useUploadMany(context?: UploadContext) {
  const [state, setState] = useState<UploadState>({ uploading: false, error: null })

  const uploadMany = useCallback(
    async (files: File[]): Promise<string[]> => {
      if (!files.length) return []
      setState({ uploading: true, error: null })
      try {
        const urls = await uploadService.uploadForUrls(files, context)
        setState({ uploading: false, error: null })
        return urls
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
