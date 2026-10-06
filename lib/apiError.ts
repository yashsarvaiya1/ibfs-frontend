export function apiError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string') return data
  if (!data || typeof data !== 'object' || data instanceof Blob) return fallback
  return Object.entries(data).map(([field, value]) => {
    const message = Array.isArray(value) ? value.join(' ') : typeof value === 'string' ? value : JSON.stringify(value)
    return ['error', 'detail', 'non_field_errors'].includes(field) ? message : `${field.replaceAll('_', ' ')}: ${message}`
  }).join('\n') || fallback
}
