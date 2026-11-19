import { HTTP_STATUS, type HttpStatus } from '../constants/http-status.constants.js';
import { ErrorCode } from '../enums/error-code.enum.js';

export interface AppErrorOptions {
  isOperational?: boolean;
  details?: unknown;
  cause?: Error;
}

export class AppError extends Error {
  public readonly statusCode: HttpStatus;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: HttpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    options: AppErrorOptions = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;

    if (options.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}
