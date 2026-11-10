import type { EnvConfig } from './env.config.js';

export interface Auth0Config {
  /** Auth0 tenant domain (e.g., "example.auth0.com") */
  domain: string;
  /** Full issuer URL (e.g., "https://example.auth0.com/") */
  issuerBaseUrl: string;
  /** API identifier registered in Auth0 */
  audience: string;
  /** Application client ID (optional, needed for Management API) */
  clientId?: string;
  /** Application client secret (optional, needed for Management API) */
  clientSecret?: string;
  /** Allowed JWT signing algorithms */
  algorithms: string[];
  /** JWKS endpoint URI */
  jwksUri: string;
  /** Clock tolerance for token expiration checks (seconds) */
  clockTolerance: number;
  /** Maximum accepted token age (seconds) */
  tokenMaxAge?: number;
  /** Custom claim namespace for extracting roles from access tokens */
  rolesClaimNamespace?: string;
}

export function createAuth0Config(env: EnvConfig): Auth0Config {
  const domain = env.AUTH0_DOMAIN;
  const issuerBaseUrl = env.AUTH0_ISSUER_BASE_URL ?? `https://${domain}/`;
  const jwksUri = env.AUTH0_JWKS_URI ?? `https://${domain}/.well-known/jwks.json`;

  return {
    domain,
    issuerBaseUrl,
    audience: env.AUTH0_AUDIENCE,
    clientId: env.AUTH0_CLIENT_ID,
    clientSecret: env.AUTH0_CLIENT_SECRET,
    algorithms: env.AUTH0_ALGORITHMS.split(',').map((a) => a.trim()),
    jwksUri,
    clockTolerance: env.AUTH0_CLOCK_TOLERANCE,
    tokenMaxAge: env.AUTH0_TOKEN_MAX_AGE,
    rolesClaimNamespace: env.AUTH0_ROLES_CLAIM_NAMESPACE,
  };
}
