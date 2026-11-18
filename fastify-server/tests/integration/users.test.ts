import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp } from '../helpers/test-app.js';
import { verifyAccessToken } from '../../src/integrations/auth0/auth0.verifier.js';
import { usersService } from '../../src/modules/users/users.service.js';
import { rolesService } from '../../src/modules/roles/roles.service.js';
import {
  MOCK_AUTH0_USER,
  MOCK_ADMIN_USER,
  createMockBearerHeader,
} from '../helpers/mock-auth0.js';
import { SYSTEM_ROLES } from '../../src/common/constants/roles.constants.js';

vi.mock('../../src/integrations/auth0/auth0.verifier.js', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../../src/modules/users/users.service.js', () => ({
  usersService: {
    syncAuth0User: vi.fn(),
    getUserProfile: vi.fn(),
    updateUserProfile: vi.fn(),
    listUsers: vi.fn(),
    getUserById: vi.fn(),
    updateUserStatus: vi.fn(),
  },
}));

vi.mock('../../src/modules/roles/roles.service.js', () => ({
  rolesService: {
    assignRolesToUser: vi.fn(),
  },
}));

vi.mock('../../src/infrastructure/redis/redis.service.js', () => ({
  redisService: {
    consumeRateLimit: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 99,
      limit: 100,
      resetTimeMs: 60000,
      retryAfterSeconds: 0,
    }),
  },
}));

describe('Users Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/users/me', () => {
    it('returns 401 when token is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns current user profile with roles and permissions', async () => {
      vi.mocked(verifyAccessToken).mockResolvedValueOnce({
        payload: { sub: MOCK_AUTH0_USER.sub },
        user: MOCK_AUTH0_USER,
      });

      const userContext = {
        id: 'user-db-123',
        auth0UserId: MOCK_AUTH0_USER.sub,
        email: 'test@example.com',
        status: 'ACTIVE',
        roles: [SYSTEM_ROLES.USER],
        permissions: ['users:read'],
      };

      vi.mocked(usersService.syncAuth0User).mockResolvedValueOnce(userContext);
      vi.mocked(usersService.getUserProfile).mockResolvedValueOnce(userContext as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
        headers: createMockBearerHeader(),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe('test@example.com');
    });
  });

  describe('GET /api/v1/users', () => {
    it('returns 403 Forbidden when user lacks users:read permission', async () => {
      vi.mocked(verifyAccessToken).mockResolvedValueOnce({
        payload: { sub: MOCK_AUTH0_USER.sub },
        user: MOCK_AUTH0_USER,
      });

      vi.mocked(usersService.syncAuth0User).mockResolvedValueOnce({
        id: 'user-db-123',
        auth0UserId: MOCK_AUTH0_USER.sub,
        email: 'test@example.com',
        status: 'ACTIVE',
        roles: [SYSTEM_ROLES.USER],
        permissions: [], // No users:read
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users',
        headers: createMockBearerHeader(),
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns paginated users list when caller has users:read permission', async () => {
      vi.mocked(verifyAccessToken).mockResolvedValueOnce({
        payload: { sub: MOCK_ADMIN_USER.sub },
        user: MOCK_ADMIN_USER,
      });

      vi.mocked(usersService.syncAuth0User).mockResolvedValueOnce({
        id: 'admin-db-123',
        auth0UserId: MOCK_ADMIN_USER.sub,
        email: 'admin@example.com',
        status: 'ACTIVE',
        roles: [SYSTEM_ROLES.ADMIN],
        permissions: ['users:read'],
      });

      vi.mocked(usersService.listUsers).mockResolvedValueOnce({
        users: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users',
        headers: createMockBearerHeader(),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.users).toBeDefined();
    });
  });
});
