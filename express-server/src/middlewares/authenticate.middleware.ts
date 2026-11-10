import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../integrations/auth0/auth0.verifier.js';
import { AppError } from '../common/utils/app-error.util.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { ErrorCode } from '../common/enums/error-code.enum.js';
import { AUTHORIZATION_HEADER, BEARER_PREFIX } from '../integrations/auth0/auth0.constants.js';

/**
 * Extracts the Bearer token from the Authorization header.
 *
 * @throws AppError if the header is missing, malformed, or empty
 */
export function extractBearerToken(req: Request): string {
  const authHeader = req.headers[AUTHORIZATION_HEADER];

  if (!authHeader) {
    throw new AppError(
      'Authorization header is required',
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.AUTHENTICATION_REQUIRED,
    );
  }

  if (typeof authHeader !== 'string') {
    throw new AppError(
      'Invalid Authorization header format',
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.INVALID_AUTHORIZATION_HEADER,
    );
  }

  if (!authHeader.startsWith(BEARER_PREFIX)) {
    throw new AppError(
      'Authorization header must use the Bearer scheme',
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.INVALID_AUTHORIZATION_HEADER,
    );
  }

  const token = authHeader.slice(BEARER_PREFIX.length).trim();

  if (!token) {
    throw new AppError(
      'Bearer token is empty',
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.INVALID_AUTHORIZATION_HEADER,
    );
  }

  return token;
}

/**
 * Authentication middleware that requires a valid Auth0 access token.
 *
 * - Reads the Authorization header
 * - Requires the Bearer authentication scheme
 * - Verifies the access token against Auth0 JWKS
 * - Attaches the verified user identity to `req.auth`
 * - Passes control to the next middleware only on successful verification
 *
 * Use this middleware to protect routes that require authentication.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearerToken(req);
    const { user } = await verifyAccessToken(token);
    req.auth = user;
    next();
  } catch (error) {
    next(error);
  }
}
