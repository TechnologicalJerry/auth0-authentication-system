import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/utils/app-error.util.js';
import { sendError } from '../common/utils/response.util.js';
import { ErrorCode } from '../common/enums/error-code.enum.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { logger } from '../services/logger.service.js';
import { appConfig } from '../config/app.config.js';

/**
 * Global error handling middleware.
 * Must be registered after all routes.
 */
export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Handle known application errors
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err }, 'Non-operational application error');
    } else {
      logger.warn({ err, statusCode: err.statusCode, code: err.code }, err.message);
    }

    sendError(res, err.statusCode, err.message, err.code, err.details);
    return;
  }

  // Handle JSON syntax errors (malformed request body)
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn({ err }, 'Malformed JSON in request body');
    sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Malformed JSON in request body',
      ErrorCode.BAD_REQUEST,
    );
    return;
  }

  // Handle unexpected errors
  logger.error({ err }, 'Unexpected error occurred');

  const message = appConfig.isProduction
    ? 'An unexpected error occurred'
    : err.message || 'An unexpected error occurred';

  sendError(
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message,
    ErrorCode.INTERNAL_SERVER_ERROR,
  );
}
