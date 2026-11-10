import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Middleware that assigns a unique correlation ID to each request.
 * If the client sends an X-Request-ID header, it will be reused.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers[REQUEST_ID_HEADER] as string | undefined) ?? randomUUID();
  req.id = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

// Extend the Express Request interface to include `id`
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}
