import { createRemoteJWKSet } from 'jose';
import type { FlattenedJWSInput, JWSHeaderParameters, GetKeyFunction } from 'jose';
import { appConfig } from '../../config/app.config.js';
import { logger } from '../../services/logger.service.js';
import {
  JWKS_CACHE_MAX_AGE_MS,
  JWKS_COOLDOWN_MS,
  JWKS_TIMEOUT_MS,
} from './auth0.constants.js';

let jwksClient: GetKeyFunction<JWSHeaderParameters, FlattenedJWSInput> | null = null;

/**
 * Returns a cached JWKS client configured for the Auth0 tenant.
 * Uses jose's createRemoteJWKSet which handles key caching, rotation, and refresh.
 */
export function getJWKSClient(): GetKeyFunction<JWSHeaderParameters, FlattenedJWSInput> {
  if (jwksClient) {
    return jwksClient;
  }

  const { auth0 } = appConfig;
  const jwksUri = new URL(auth0.jwksUri);

  logger.info(
    { jwksUri: jwksUri.toString(), domain: auth0.domain },
    'Initializing Auth0 JWKS client',
  );

  jwksClient = createRemoteJWKSet(jwksUri, {
    cacheMaxAge: JWKS_CACHE_MAX_AGE_MS,
    cooldownDuration: JWKS_COOLDOWN_MS,
    timeoutDuration: JWKS_TIMEOUT_MS,
  });

  return jwksClient;
}
