import type { Response } from 'express';
import type { ApiSuccessResponse, ApiErrorResponse } from '../interfaces/api-response.interface.js';

export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T,
): void {
  const response: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  code: string,
  details?: unknown,
): void {
  const response: ApiErrorResponse = {
    success: false,
    message,
    error: {
      code,
      ...(details !== undefined && { details }),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}
