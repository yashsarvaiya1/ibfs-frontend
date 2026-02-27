import api from '@/lib/axios'

export type UploadContext = 'document' | 'product' | 'settings'

export interface UploadResponse {
  path: string   // "uploads/settings/abc.jpg" — store this in DB
  url:  string   // "http://localhost:8000/media/uploads/settings/abc.jpg"
}

export const uploadService = {
  upload: (file: File, context?: UploadContext): Promise<UploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    const subfolder = contextToSubfolder(context)

    return api
      .post<UploadResponse>('/upload/file/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params:  { type: subfolder },
      })
      .then(r => r.data)
  },

  uploadMany: (files: File[], context?: UploadContext): Promise<UploadResponse[]> =>
    Promise.all(files.map(f => uploadService.upload(f, context))),

  // CRITICAL: return r.path (relative path), not r.url
  uploadForUrls: async (files: File[], context?: UploadContext): Promise<string[]> => {
    const results = await uploadService.uploadMany(files, context)
    return results.map(r => r.path)  // "uploads/settings/abc.jpg"
  },
}

function contextToSubfolder(context?: UploadContext): string {
  switch (context) {
    case 'product':  return 'products'
    case 'settings': return 'settings'
    default:         return 'documents'
  }
}
