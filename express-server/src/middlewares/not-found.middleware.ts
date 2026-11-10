import type { Request, Response } from 'express';
import { sendError } from '../common/utils/response.util.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { ErrorCode } from '../common/enums/error-code.enum.js';

/**
 * Middleware to handle requests to undefined routes.
 * Must be registered after all route definitions and before the error middleware.
 */
export function notFoundMiddleware(req: Request, res: Response): void {
  sendError(
    res,
    HTTP_STATUS.NOT_FOUND,
    `Route ${req.method} ${req.originalUrl} not found`,
    ErrorCode.NOT_FOUND,
  );
}
