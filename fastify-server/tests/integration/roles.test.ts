import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp } from '../helpers/test-app.js';
import { verifyAccessToken } from '../../src/integrations/auth0/auth0.verifier.js';
import { usersService } from '../../src/modules/users/users.service.js';
import { rolesService } from '../../src/modules/roles/roles.service.js';
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

vi.mock('../../src/modules/roles/roles.service.js', () => ({
  rolesService: {
    getRoles: vi.fn(),
    getRoleById: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
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

describe('Roles Integration Tests', () => {
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

  describe('GET /api/v1/roles', () => {
    it('returns 403 when user lacks roles:read permission', async () => {
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
        permissions: ['users:read'], // No roles:read
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/roles',
        headers: createMockBearerHeader(),
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns roles list when user holds roles:read permission', async () => {
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
        permissions: [PERMISSIONS.ROLES_READ],
      });

      vi.mocked(rolesService.getRoles).mockResolvedValueOnce([
        {
          id: 'r-1',
          name: SYSTEM_ROLES.ADMIN,
          description: 'Admin',
          isSystem: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          permissionCount: 13,
          userCount: 1,
        },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/roles',
        headers: createMockBearerHeader(),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });
  });
});
