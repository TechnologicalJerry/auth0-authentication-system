import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../integrations/auth0/auth0.verifier.js';
import { extractBearerToken } from './authenticate.middleware.js';
import { AUTHORIZATION_HEADER } from '../integrations/auth0/auth0.constants.js';

/**
 * Optional authentication middleware.
 *
 * - Allows requests without an Authorization header (anonymous access)
 * - When a token is present, verifies it and attaches the user to `req.auth`
 * - Rejects requests with an invalid token — does NOT silently downgrade
 *   a bad token to anonymous access
 *
 * Use this middleware for routes that behave differently for authenticated
 * vs anonymous users but do not require authentication.
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers[AUTHORIZATION_HEADER];

  // No auth header — allow as anonymous request
  if (!authHeader) {
    next();
    return;
  }

  // Token is present — it must be valid; never silently accept an invalid token
  try {
    const token = extractBearerToken(req);
    const { user } = await verifyAccessToken(token);
    req.auth = user;
    next();
  } catch (error) {
    next(error);
  }
}
