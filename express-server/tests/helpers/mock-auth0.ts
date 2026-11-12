import type { AuthenticatedUser } from '../../src/integrations/auth0/auth0.types.js';

export const MOCK_AUTH0_USER: AuthenticatedUser = {
  sub: 'auth0|test-user-12345',
  issuer: 'https://test-tenant.auth0.com/',
  audience: 'https://api.test-domain.com',
  scopes: ['openid', 'profile', 'email'],
  permissions: ['users:read', 'dashboard:read'],
  roles: ['USER'],
  claims: {
    email: 'testuser@example.com',
    email_verified: true,
    given_name: 'Test',
    family_name: 'User',
    nickname: 'tester',
    picture: 'https://example.com/avatar.jpg',
  },
};

export const MOCK_ADMIN_USER: AuthenticatedUser = {
  sub: 'auth0|admin-user-67890',
  issuer: 'https://test-tenant.auth0.com/',
  audience: 'https://api.test-domain.com',
  scopes: ['openid', 'profile', 'email'],
  permissions: [
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'roles:read',
    'roles:create',
    'roles:update',
    'roles:delete',
    'roles:assign',
    'permissions:read',
    'permissions:manage',
    'dashboard:read',
    'audit-logs:read',
  ],
  roles: ['ADMIN'],
  claims: {
    email: 'admin@example.com',
    email_verified: true,
    name: 'Administrator',
  },
};

export const MOCK_SUPER_ADMIN_USER: AuthenticatedUser = {
  sub: 'auth0|superadmin-user-00000',
  issuer: 'https://test-tenant.auth0.com/',
  audience: 'https://api.test-domain.com',
  scopes: ['openid', 'profile', 'email'],
  permissions: ['*'],
  roles: ['SUPER_ADMIN'],
  claims: {
    email: 'superadmin@example.com',
    email_verified: true,
    name: 'Root Administrator',
  },
};

/**
 * Creates a mock Bearer authorization header with a dummy token string.
 */
export function createMockBearerHeader(tokenSuffix = 'valid-token'): { Authorization: string } {
  return {
    Authorization: `Bearer mock.jwt.${tokenSuffix}`,
  };
}
