import { jwtVerify, errors } from 'jose';
import { getJWKSClient } from './auth0.client.js';
import { mapClaimsToUser } from './auth0.claim-mapper.js';
import { appConfig } from '../../config/app.config.js';
import { logger } from '../../services/logger.service.js';
import { AppError } from '../../common/utils/app-error.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';
import { ErrorCode } from '../../common/enums/error-code.enum.js';
import type { TokenVerificationResult } from './auth0.types.js';

/**
 * Verifies an Auth0-issued JWT access token.
 *
 * Performs full cryptographic verification including:
 * - Signature validation against Auth0 JWKS public keys
 * - Algorithm restriction (prevents algorithm confusion)
 * - Issuer validation
 * - Audience validation
 * - Expiration and not-before checks
 * - Clock tolerance allowance
 *
 * @throws AppError on any verification failure
 */
export async function verifyAccessToken(token: string): Promise<TokenVerificationResult> {
  const { auth0 } = appConfig;
  const jwks = getJWKSClient();

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: auth0.issuerBaseUrl,
      audience: auth0.audience,
      algorithms: auth0.algorithms,
      clockTolerance: auth0.clockTolerance,
      ...(auth0.tokenMaxAge !== undefined && { maxTokenAge: auth0.tokenMaxAge }),
    });

    if (!payload.sub) {
      throw new AppError(
        'Token missing required subject claim',
        HTTP_STATUS.UNAUTHORIZED,
        ErrorCode.INVALID_TOKEN,
      );
    }

    const user = mapClaimsToUser(payload);

    logger.debug({ sub: user.sub }, 'Access token verified successfully');

    return { payload, user };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw mapJoseError(error);
  }
}

/**
 * Maps jose library errors to application-specific AppError instances.
 * Ensures no raw cryptographic details leak to API consumers.
 */
function mapJoseError(error: unknown): AppError {
  if (error instanceof errors.JWTExpired) {
    logger.debug('Token verification failed: token expired');
    return new AppError(
      'Access token has expired',
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.TOKEN_EXPIRED,
    );
  }

  if (error instanceof errors.JWTClaimValidationFailed) {
    return mapClaimValidationError(error);
  }

  if (error instanceof errors.JWSSignatureVerificationFailed) {
    logger.warn('Token verification failed: invalid signature');
    return new AppError(
      'Invalid access token',
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.INVALID_TOKEN,
    );
  }

  if (error instanceof errors.JWKSNoMatchingKey) {
    logger.warn('Token verification failed: no matching JWKS key');
    return new AppError(
      'Invalid access token',
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.INVALID_TOKEN,
    );
  }

  if (error instanceof errors.JWKSTimeout) {
    logger.error({ err: error }, 'JWKS endpoint timed out');
    return new AppError(
      'Authentication service temporarily unavailable',
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      ErrorCode.AUTHENTICATION_SERVICE_UNAVAILABLE,
    );
  }

  if (error instanceof errors.JOSEError) {
    logger.error({ err: error }, 'JOSE error during token verification');
    return new AppError(
      'Invalid access token',
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.INVALID_TOKEN,
    );
  }

  logger.error({ err: error }, 'Unexpected error during token verification');
  return new AppError(
    'Authentication failed',
    HTTP_STATUS.UNAUTHORIZED,
    ErrorCode.INVALID_TOKEN,
    { isOperational: false, cause: error instanceof Error ? error : undefined },
  );
}

function mapClaimValidationError(error: errors.JWTClaimValidationFailed): AppError {
  const claim = error.claim;

  if (claim === 'iss') {
    logger.debug('Token verification failed: untrusted issuer');
    return new AppError(
      'Token issuer is not trusted',
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.INVALID_TOKEN_ISSUER,
    );
  }

  if (claim === 'aud') {
    logger.debug('Token verification failed: invalid audience');
    return new AppError(
      'Token is not intended for this API',
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.INVALID_TOKEN_AUDIENCE,
    );
  }

  if (claim === 'nbf') {
    logger.debug('Token verification failed: token not yet active');
    return new AppError(
      'Token is not yet active',
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.TOKEN_NOT_ACTIVE,
    );
  }

  logger.debug({ claim }, 'Token verification failed: claim validation error');
  return new AppError(
    'Token validation failed',
    HTTP_STATUS.UNAUTHORIZED,
    ErrorCode.INVALID_TOKEN,
  );
}
