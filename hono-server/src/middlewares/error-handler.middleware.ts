import type { Context, ErrorHandler, NotFoundHandler } from 'hono';
import { ZodError } from 'zod';
import { AppError } from '../common/utils/app-error.util.js';
import { formatErrorResponse } from '../common/utils/response.util.js';
import { HTTP_STATUS, type HttpStatus } from '../common/constants/http-status.constants.js';
import { ErrorCode } from '../common/enums/error-code.enum.js';
import { logger } from '../services/logger.service.js';

export const errorHandler: ErrorHandler = (err: Error, c: Context) => {
  const requestId = (c.get('requestId') as string) || c.req.header('x-request-id');
  const path = c.req.path;

  // 1. Handle custom AppError
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err, path, requestId }, 'Non-operational AppError encountered');
    } else {
      logger.warn({ err: err.message, code: err.code, path, requestId }, 'Operational error occurred');
    }

    const payload = formatErrorResponse(
      err.message,
      err.statusCode,
      err.code,
      err.details,
      path,
      requestId,
    );

    return c.json(payload, err.statusCode as any);
  }

  // 2. Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    logger.warn({ issues: formattedErrors, path, requestId }, 'Validation error occurred');

    const payload = formatErrorResponse(
      'Validation failed',
      HTTP_STATUS.BAD_REQUEST,
      ErrorCode.VALIDATION_ERROR,
      formattedErrors,
      path,
      requestId,
    );

    return c.json(payload, HTTP_STATUS.BAD_REQUEST as any);
  }

  // 3. Fallback: Unexpected internal server error (500)
  logger.error({ err, path, requestId }, 'Unhandled internal server error');

  const payload = formatErrorResponse(
    'An unexpected internal server error occurred.',
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    ErrorCode.INTERNAL_SERVER_ERROR,
    undefined,
    path,
    requestId,
  );

  return c.json(payload, HTTP_STATUS.INTERNAL_SERVER_ERROR as any);
};

export const notFoundHandler: NotFoundHandler = (c: Context) => {
  const requestId = (c.get('requestId') as string) || c.req.header('x-request-id');
  const path = c.req.path;
  const method = c.req.method;

  const payload = formatErrorResponse(
    `Route ${method} ${path} not found`,
    HTTP_STATUS.NOT_FOUND,
    ErrorCode.ROUTE_NOT_FOUND,
    undefined,
    path,
    requestId,
  );

  return c.json(payload, HTTP_STATUS.NOT_FOUND as any);
};
