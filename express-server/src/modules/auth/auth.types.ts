/**
 * Response shape for GET /api/v1/auth/me
 * Contains verified identity from the Auth0 access token.
 */
export interface AuthMeResponse {
  sub: string;
  issuer: string;
  scopes: string[];
  permissions: string[];
  roles: string[];
}

/**
 * Response shape for GET /api/v1/auth/status
 * Reports Auth0 integration configuration status without disclosing secrets.
 */
export interface AuthStatusResponse {
  provider: string;
  configured: boolean;
  domain: string;
  audience: string;
}
