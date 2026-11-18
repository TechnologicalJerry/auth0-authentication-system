import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp } from '../helpers/test-app.js';
import { verifyAccessToken } from '../../src/integrations/auth0/auth0.verifier.js';
import { usersService } from '../../src/modules/users/users.service.js';
import { permissionsService } from '../../src/modules/permissions/permissions.service.js';
import {
  MOCK_ADMIN_USER,
  MOCK_AUTH0_USER,
  createMockBearerHeader,
} from '../helpers/mock-auth0.js';
import { SYSTEM_ROLES } from '../../src/common/constants/roles.constants.js';
import { PERMISSIONS } from '../../src/common/constants/permissions.constants.js';

vi.mock('../../src/integrations/auth0/auth0.verifier.js', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../../src/modules/users/users.service.js', () => ({
  usersService: {
    syncAuth0User: vi.fn(),
  },
}));

vi.mock('../../src/modules/permissions/permissions.service.js', () => ({
  permissionsService: {
    getPermissions: vi.fn(),
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

describe('Permissions Integration Tests', () => {
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

  describe('GET /api/v1/permissions', () => {
    it('returns 403 when user lacks permissions:read', async () => {
      vi.mocked(verifyAccessToken).mockResolvedValueOnce({
        payload: { sub: MOCK_AUTH0_USER.sub },
        user: MOCK_AUTH0_USER,
      });

      vi.mocked(usersService.syncAuth0User).mockResolvedValueOnce({
        id: 'usr-1',
        auth0UserId: MOCK_AUTH0_USER.sub,
        email: 'user@example.com',
        status: 'ACTIVE',
        roles: [SYSTEM_ROLES.USER],
        permissions: ['users:read'],
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/permissions',
        headers: createMockBearerHeader(),
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns catalog of permissions for authorized caller', async () => {
      vi.mocked(verifyAccessToken).mockResolvedValueOnce({
        payload: { sub: MOCK_ADMIN_USER.sub },
        user: MOCK_ADMIN_USER,
      });

      vi.mocked(usersService.syncAuth0User).mockResolvedValueOnce({
        id: 'admin-1',
        auth0UserId: MOCK_ADMIN_USER.sub,
        email: 'admin@example.com',
        status: 'ACTIVE',
        roles: [SYSTEM_ROLES.ADMIN],
        permissions: [PERMISSIONS.PERMISSIONS_READ],
      });

      vi.mocked(permissionsService.getPermissions).mockResolvedValueOnce([
        { id: 'p-1', name: 'users:read', description: 'Read users', createdAt: new Date().toISOString() },
        { id: 'p-2', name: 'roles:read', description: 'Read roles', createdAt: new Date().toISOString() },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/permissions',
        headers: createMockBearerHeader(),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
    });
  });
});
