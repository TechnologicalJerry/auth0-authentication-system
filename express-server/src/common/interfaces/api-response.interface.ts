export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiErrorDetail {
  code: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: ApiErrorDetail;
  timestamp: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
