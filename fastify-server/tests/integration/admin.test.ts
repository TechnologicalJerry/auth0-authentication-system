import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp } from '../helpers/test-app.js';
import { verifyAccessToken } from '../../src/integrations/auth0/auth0.verifier.js';
import { usersService } from '../../src/modules/users/users.service.js';
import { adminService } from '../../src/modules/admin/admin.service.js';
import {
  MOCK_ADMIN_USER,
  MOCK_AUTH0_USER,
  createMockBearerHeader,
} from '../helpers/mock-auth0.js';
import { SYSTEM_ROLES } from '../../src/common/constants/roles.constants.js';

vi.mock('../../src/integrations/auth0/auth0.verifier.js', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../../src/modules/users/users.service.js', () => ({
  usersService: {
    syncAuth0User: vi.fn(),
  },
}));

vi.mock('../../src/modules/admin/admin.service.js', () => ({
  adminService: {
    getDashboardStatistics: vi.fn(),
    getUserStatistics: vi.fn(),
    getRoleStatistics: vi.fn(),
  },
}));

vi.mock('../../src/infrastructure/redis/redis.service.js', () => ({
  redisService: {
    consumeRateLimit: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 29,
      limit: 30,
      resetTimeMs: 60000,
      retryAfterSeconds: 0,
    }),
  },
}));

describe('Admin Integration Tests', () => {
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

  describe('GET /api/v1/admin/dashboard', () => {
    it('returns 403 Forbidden when standard USER accesses dashboard', async () => {
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
        url: '/api/v1/admin/dashboard',
        headers: createMockBearerHeader(),
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns system dashboard statistics for ADMIN role', async () => {
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
        permissions: [],
      });

      vi.mocked(adminService.getDashboardStatistics).mockResolvedValueOnce({
        users: { total: 10, active: 10, suspended: 0, deactivated: 0 },
        roles: { total: 5, custom: 0 },
        auditLogs: { total: 100 },
        system: {
          nodeVersion: process.version,
          memoryUsage: { rss: '50MB', heapTotal: '30MB', heapUsed: '20MB' },
          uptime: 3600,
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/dashboard',
        headers: createMockBearerHeader(),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.users.total).toBe(10);
    });
  });
});
