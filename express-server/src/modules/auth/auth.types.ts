export interface AuthMeResponse {
  sub: string;
  issuer: string;
  scopes: string[];
  permissions: string[];
  roles: string[];
  user?: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

export interface AuthStatusResponse {
  provider: string;
  configured: boolean;
  domain: string;
  audience: string;
}
