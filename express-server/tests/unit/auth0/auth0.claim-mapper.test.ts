import { describe, it, expect } from 'vitest';
import {
  mapClaimsToUser,
  extractScopes,
  extractPermissions,
  extractRoles,
} from '../../../src/integrations/auth0/auth0.claim-mapper.js';
import type { JWTPayload } from 'jose';

describe('Auth0 Claim Mapper', () => {
  it('should extract space-delimited OAuth 2.0 scopes', () => {
    const payload: JWTPayload = {
      sub: 'auth0|123',
      scope: 'openid profile email read:users',
    };

    const scopes = extractScopes(payload);
    expect(scopes).toEqual(['openid', 'profile', 'email', 'read:users']);
  });

  it('should return empty array when scope is missing or empty', () => {
    expect(extractScopes({ sub: 'auth0|123' })).toEqual([]);
    expect(extractScopes({ sub: 'auth0|123', scope: '' })).toEqual([]);
  });

  it('should extract array permissions from Auth0 RBAC claims', () => {
    const payload: JWTPayload = {
      sub: 'auth0|123',
      permissions: ['users:read', 'users:update'],
    };

    const permissions = extractPermissions(payload);
    expect(permissions).toEqual(['users:read', 'users:update']);
  });

  it('should extract roles from configurable custom claims namespace', () => {
    const namespace = 'https://example.com/roles';
    const payload: JWTPayload = {
      sub: 'auth0|123',
      [namespace]: ['ADMIN', 'MANAGER'],
    };

    const roles = extractRoles(payload, namespace);
    expect(roles).toEqual(['ADMIN', 'MANAGER']);
  });

  it('should map verified JWT payload to AuthenticatedUser context', () => {
    const payload: JWTPayload = {
      sub: 'auth0|user-999',
      iss: 'https://test-tenant.auth0.com/',
      aud: 'https://api.test-domain.com',
      scope: 'openid email',
      permissions: ['users:read'],
      email: 'user@example.com',
    };

    const user = mapClaimsToUser(payload);

    expect(user.sub).toBe('auth0|user-999');
    expect(user.issuer).toBe('https://test-tenant.auth0.com/');
    expect(user.scopes).toContain('openid');
    expect(user.permissions).toContain('users:read');
    expect(user.claims['email']).toBe('user@example.com');
    // Standard JWT claims should not pollute the generic claims bag
    expect(user.claims['iss']).toBeUndefined();
    expect(user.claims['sub']).toBeUndefined();
  });
});
