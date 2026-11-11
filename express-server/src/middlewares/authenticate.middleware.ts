import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../integrations/auth0/auth0.verifier.js';
import { usersService } from '../modules/users/users.service.js';
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
 * Authentication middleware that:
 * 1. Requires and extracts a valid Auth0 access token
 * 2. Cryptographically verifies token against Auth0 JWKS
 * 3. Sets `req.auth` to the verified token identity
 * 4. Synchronizes/retrieves the local `ApplicationUser` record
 * 5. Verifies account status (active, non-blocked)
 * 6. Sets `req.currentUser` with internal ID, roles, and permissions
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

    // Synchronize application user and resolve roles/permissions
    const currentUser = await usersService.syncAuth0User(user);
    req.currentUser = currentUser;

    next();
  } catch (error) {
    next(error);
  }
}
