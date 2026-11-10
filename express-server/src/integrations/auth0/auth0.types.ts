import type { JWTPayload } from 'jose';

/**
 * Represents the verified identity extracted from an Auth0 access token.
 * Only populated after cryptographic signature verification succeeds.
 */
export interface AuthenticatedUser {
  /** Auth0 user identifier (sub claim) */
  sub: string;
  /** Token issuer URL */
  issuer: string;
  /** Token audience(s) */
  audience: string | string[];
  /** OAuth 2.0 scopes from the scope claim */
  scopes: string[];
  /** Auth0 RBAC permissions (when RBAC is enabled in the Auth0 API) */
  permissions: string[];
  /** Custom roles extracted from namespaced claims (if configured) */
  roles: string[];
  /** Additional verified claims, excluding standard JWT internals */
  claims: Record<string, unknown>;
}

/**
 * Result of a successful JWT access token verification.
 */
export interface TokenVerificationResult {
  /** Verified JWT payload */
  payload: JWTPayload;
  /** Mapped authenticated user identity */
  user: AuthenticatedUser;
}

/**
 * Extend Express Request to carry authenticated user identity.
 * Only populated after authentication middleware succeeds.
 */
declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
    }
  }
}
