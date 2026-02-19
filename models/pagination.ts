// models/pagination.ts

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// Helper to get total pages from a paginated response
export const getTotalPages = <T>(
  data: PaginatedResponse<T>,
  pageSize = 20
): number => Math.ceil(data.count / pageSize)

// Helper to check if more pages exist
export const hasNextPage = <T>(data: PaginatedResponse<T>): boolean =>
  data.next !== null

export const hasPrevPage = <T>(data: PaginatedResponse<T>): boolean =>
  data.previous !== null
