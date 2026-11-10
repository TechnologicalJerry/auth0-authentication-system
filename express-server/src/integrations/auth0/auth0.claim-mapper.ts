import type { JWTPayload } from 'jose';
import type { AuthenticatedUser } from './auth0.types.js';
import { appConfig } from '../../config/app.config.js';

/** Standard JWT claims that should not be forwarded into the generic claims bag */
const STANDARD_JWT_CLAIMS = new Set([
  'iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti',
  'scope', 'permissions', 'azp',
]);

/**
 * Maps verified JWT payload claims to an AuthenticatedUser.
 *
 * This function must only be called with payloads that have already been
 * cryptographically verified. It does not perform any token validation.
 */
export function mapClaimsToUser(payload: JWTPayload): AuthenticatedUser {
  const rolesNamespace = appConfig.auth0.rolesClaimNamespace;

  return {
    sub: payload.sub!,
    issuer: payload.iss ?? '',
    audience: payload.aud ?? '',
    scopes: extractScopes(payload),
    permissions: extractPermissions(payload),
    roles: extractRoles(payload, rolesNamespace),
    claims: extractAdditionalClaims(payload, rolesNamespace),
  };
}

/**
 * Extracts OAuth 2.0 scopes from the space-delimited scope claim.
 */
export function extractScopes(payload: JWTPayload): string[] {
  const scope = payload['scope'];
  if (typeof scope === 'string' && scope.length > 0) {
    return scope.split(' ').filter(Boolean);
  }
  return [];
}

/**
 * Extracts Auth0 RBAC permissions.
 * Only present when RBAC is enabled for the API in Auth0.
 */
export function extractPermissions(payload: JWTPayload): string[] {
  const permissions = payload['permissions'];
  if (Array.isArray(permissions)) {
    return permissions.filter((p): p is string => typeof p === 'string');
  }
  return [];
}

/**
 * Extracts roles from a configurable namespaced custom claim.
 * Returns empty array when namespace is not configured or claim is absent.
 */
export function extractRoles(
  payload: JWTPayload,
  namespace: string | undefined,
): string[] {
  if (!namespace) {
    return [];
  }

  const roles = payload[namespace];
  if (Array.isArray(roles)) {
    return roles.filter((r): r is string => typeof r === 'string');
  }
  return [];
}

/**
 * Collects non-standard claims for application use,
 * excluding JWT internals and already-extracted fields.
 */
function extractAdditionalClaims(
  payload: JWTPayload,
  rolesNamespace: string | undefined,
): Record<string, unknown> {
  const claims: Record<string, unknown> = {};
  const excluded = new Set(STANDARD_JWT_CLAIMS);

  if (rolesNamespace) {
    excluded.add(rolesNamespace);
  }

  for (const [key, value] of Object.entries(payload)) {
    if (!excluded.has(key)) {
      claims[key] = value;
    }
  }

  return claims;
}
