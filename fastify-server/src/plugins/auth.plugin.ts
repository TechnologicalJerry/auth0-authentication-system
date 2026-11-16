import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { verifyAccessToken } from '../integrations/auth0/auth0.verifier.js';
import { usersService } from '../modules/users/users.service.js';
import {
  AUTHORIZATION_HEADER,
  BEARER_PREFIX,
} from '../integrations/auth0/auth0.constants.js';
import { AppError } from '../common/utils/app-error.util.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { ErrorCode } from '../common/enums/error-code.enum.js';
import { logger } from '../services/logger.service.js';

/**
 * Extracts the raw Bearer token from the incoming Fastify request.
 */
export function extractBearerToken(request: FastifyRequest): string | null {
  const authHeader = request.headers[AUTHORIZATION_HEADER];

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
 * Required authentication preHandler hook that:
 * 1. Requires and extracts a valid Auth0 access token
 * 2. Cryptographically verifies token against Auth0 JWKS
 * 3. Sets `request.auth` to the verified token identity
 * 4. Synchronizes/retrieves local `ApplicationUser` record
 * 5. Verifies account status (active, non-blocked)
 * 6. Sets `request.currentUser` with internal ID, roles, and permissions
 */
export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const token = extractBearerToken(request);

  if (!token) {
    throw new AppError(
      'Authentication token is required',
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.AUTHENTICATION_REQUIRED,
    );
  }

  const { user } = await verifyAccessToken(token);
  request.auth = user;

  // Synchronize application user and resolve roles/permissions
  const currentUser = await usersService.syncAuth0User(user);
  request.currentUser = currentUser;
}

/**
 * Optional authentication preHandler hook.
 * Attaches verified user to request.auth and request.currentUser if a token is present, but allows unauthenticated requests.
 */
export async function optionalAuthenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers[AUTHORIZATION_HEADER];
  if (!authHeader) {
    return;
  }

  try {
    const token = extractBearerToken(request);
    if (token) {
      const { user } = await verifyAccessToken(token);
      request.auth = user;

      const currentUser = await usersService.syncAuth0User(user);
      request.currentUser = currentUser;
    }
  } catch (error) {
    logger.debug({ err: error }, 'Optional authentication attempt failed; continuing unauthenticated');
  }
}

const authPluginAsync: FastifyPluginAsync = async (fastify) => {
  // Decorate Fastify request with default undefined properties
  fastify.decorateRequest('auth', undefined);
  fastify.decorateRequest('currentUser', undefined);

  // Decorate Fastify instance with authentication preHandler hooks
  fastify.decorate('authenticate', authenticate);
  fastify.decorate('optionalAuthenticate', optionalAuthenticate);
};

export const authPlugin = fp(authPluginAsync, {
  name: 'auth-plugin',
  fastify: '5.x',
});
