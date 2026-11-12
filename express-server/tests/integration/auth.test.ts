import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app.js';
import { auth0Verifier } from '../../src/integrations/auth0/auth0.verifier.js';
import { usersService } from '../../src/modules/users/users.service.js';
import { MOCK_AUTH0_USER, createMockBearerHeader } from '../helpers/mock-auth0.js';

vi.mock('../../src/integrations/auth0/auth0.verifier.js', () => ({
  auth0Verifier: {
    verifyAccessToken: vi.fn(),
  },
}));

vi.mock('../../src/modules/users/users.service.js', () => ({
  usersService: {
    syncUserFromToken: vi.fn(),
    getUserContext: vi.fn(),
  },
}));

vi.mock('../../src/infrastructure/redis/redis.service.js', () => ({
  redisService: {
    consumeToken: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetMs: 60000,
      totalLimit: 100,
    }),
  },
}));

describe('Auth Integration Tests', () => {
  const app = getTestApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/auth/status', () => {
    it('returns Auth0 configuration status without requiring authentication', async () => {
      const res = await request(app).get('/api/v1/auth/status');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        configured: true,
        audience: expect.any(String),
        domain: expect.any(String),
        issuer: expect.any(String),
      });
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 Unauthorized when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('returns 401 Unauthorized when token is invalid or malformed', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'InvalidScheme not-a-jwt');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN_FORMAT');
    });

    it('returns 200 OK with authenticated user profile when token is valid', async () => {
      vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_AUTH0_USER);
      vi.mocked(usersService.syncUserFromToken).mockResolvedValue({
        id: 'user-db-123',
        auth0UserId: MOCK_AUTH0_USER.sub,
        email: 'testuser@example.com',
        status: 'ACTIVE',
        isActive: true,
      } as any);
      vi.mocked(usersService.getUserContext).mockResolvedValue({
        id: 'user-db-123',
        auth0UserId: MOCK_AUTH0_USER.sub,
        email: 'testuser@example.com',
        status: 'ACTIVE',
        isActive: true,
        roles: ['USER'],
        permissions: ['users:read', 'dashboard:read'],
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set(createMockBearerHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sub).toBe(MOCK_AUTH0_USER.sub);
      expect(res.body.data.email).toBe('testuser@example.com');
      expect(res.body.data.roles).toContain('USER');
    });
  });
});
