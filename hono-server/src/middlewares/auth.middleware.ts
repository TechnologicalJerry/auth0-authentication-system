import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { verifyAccessToken } from '../integrations/auth0/auth0.verifier.js';
import {
  AUTHORIZATION_HEADER,
  BEARER_PREFIX,
} from '../integrations/auth0/auth0.constants.js';
import type { AuthenticatedUser } from '../integrations/auth0/auth0.types.js';
import { AppError } from '../common/utils/app-error.util.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { ErrorCode } from '../common/enums/error-code.enum.js';
import { logger } from '../services/logger.service.js';

export interface AuthVariables {
  auth?: AuthenticatedUser;
}

/**
 * Extracts the raw Bearer token from the incoming Hono request.
 */
export function extractBearerToken(c: Context): string | null {
  const authHeader = c.req.header(AUTHORIZATION_HEADER);

  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  if (!authHeader.startsWith(BEARER_PREFIX)) {
    throw new AppError(
      'Invalid authorization header format. Expected Bearer <token>',
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.INVALID_TOKEN_FORMAT,
    );
  }

  const token = authHeader.slice(BEARER_PREFIX.length).trim();
  if (token.length === 0) {
    throw new AppError(
      'Bearer token must not be empty',
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.INVALID_TOKEN_FORMAT,
    );
  }

  return token;
}

/**
 * Mandatory authentication middleware for Hono:
 * 1. Extracts Bearer token
 * 2. Cryptographically verifies token against Auth0 JWKS
 * 3. Populates c.set('auth', user)
 */
export const authenticate = createMiddleware<{
  Variables: AuthVariables;
}>(async (c, next) => {
  const token = extractBearerToken(c);

  if (!token) {
    throw new AppError(
      'Authentication token is required',
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.AUTHENTICATION_REQUIRED,
    );
  }

  const { user } = await verifyAccessToken(token);
  c.set('auth', user);

  logger.debug({ sub: user.sub }, 'User successfully authenticated via Bearer token');
  await next();
});

/**
 * Optional authentication middleware:
 * Populates c.set('auth', user) if a valid Bearer token is provided.
 * Does not reject requests that lack an Authorization header.
 */
export const optionalAuthenticate = createMiddleware<{
  Variables: AuthVariables;
}>(async (c, next) => {
  const token = extractBearerToken(c);

  if (token) {
    const { user } = await verifyAccessToken(token);
    c.set('auth', user);
  }

  await next();
});
