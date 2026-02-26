// services/uploadService.ts
import api from '@/lib/axios'

export type UploadContext = 'document' | 'product' | 'settings'

export interface UploadResponse {
  url: string          // public GCS URL returned by backend
  filename: string     // original filename
  size: number         // bytes
  content_type: string
}

export const uploadService = {
  // Upload a single file — returns the GCS public URL
  // POST /upload/  (multipart/form-data)
  upload: (file: File, context?: UploadContext): Promise<UploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    if (context) formData.append('context', context)

    return api
      .post<UploadResponse>('/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => r.data)
  },

  // Upload multiple files in parallel — returns ordered array of URLs
  uploadMany: (files: File[], context?: UploadContext): Promise<UploadResponse[]> =>
    Promise.all(files.map(f => uploadService.upload(f, context))),

  // Convenience: upload and return only the URL strings (most common use case)
  uploadForUrls: async (files: File[], context?: UploadContext): Promise<string[]> => {
    const results = await uploadService.uploadMany(files, context)
    return results.map(r => r.url)
  },
}
