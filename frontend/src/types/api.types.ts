export interface ApiResponse<T = void> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: PaginationData;
}

export interface PaginationData {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiError {
  success: boolean;
  message: string;
}
