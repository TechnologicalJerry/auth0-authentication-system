import type { EnvConfig } from './env.config.js';

export interface Auth0Config {
  domain: string;
  issuerBaseUrl: string;
  audience: string;
  clientId?: string;
  clientSecret?: string;
  algorithms: string[];
  jwksUri: string;
  clockTolerance: number;
  tokenMaxAge?: number;
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
