import type { HttpStatusCode } from '../constants/http-status.constants.js';
import type { ErrorCode } from '../enums/error-code.enum.js';

export class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: HttpStatusCode,
    code: ErrorCode,
    options?: {
      isOperational?: boolean;
      details?: unknown;
      cause?: Error;
    },
  ) {
    super(message, { cause: options?.cause });
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = options?.isOperational ?? true;
    this.details = options?.details;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  public static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, 400, 'BAD_REQUEST' as ErrorCode, {
      details,
    });
  }

  public static notFound(message: string): AppError {
    return new AppError(message, 404, 'NOT_FOUND' as ErrorCode);
  }

  public static unauthorized(message: string): AppError {
    return new AppError(message, 401, 'UNAUTHORIZED' as ErrorCode);
  }

  public static forbidden(message: string): AppError {
    return new AppError(message, 403, 'FORBIDDEN' as ErrorCode);
  }

  public static internal(message: string, cause?: Error): AppError {
    return new AppError(message, 500, 'INTERNAL_SERVER_ERROR' as ErrorCode, {
      isOperational: false,
      cause,
    });
  }
}
