import { HTTP_STATUS, type HttpStatus } from '../constants/http-status.constants.js';
import type { ApiResponse, ApiErrorResponse } from '../interfaces/api-response.interface.js';

export function formatSuccessResponse<T>(
  data: T,
  message = 'Success',
  statusCode: HttpStatus = HTTP_STATUS.OK,
  meta?: Record<string, unknown>,
): ApiResponse<T> {
  return {
    success: true,
    statusCode,
    message,
    data,
    ...(meta && { meta }),
    timestamp: new Date().toISOString(),
  };
}

export function formatErrorResponse(
  message: string,
  statusCode: HttpStatus,
  errorCode: string,
  errors?: unknown,
  path?: string,
  requestId?: string,
): ApiErrorResponse {
  return {
    success: false,
    statusCode,
    errorCode,
    message,
    ...(errors !== undefined && { errors }),
    ...(path && { path }),
    ...(requestId && { requestId }),
    timestamp: new Date().toISOString(),
  };
}
