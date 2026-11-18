import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp } from '../helpers/test-app.js';
import { verifyAccessToken } from '../../src/integrations/auth0/auth0.verifier.js';
import { usersService } from '../../src/modules/users/users.service.js';
import { auditLogsService } from '../../src/modules/audit-logs/audit-logs.service.js';
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

vi.mock('../../src/modules/audit-logs/audit-logs.service.js', () => ({
  auditLogsService: {
    getAuditLogs: vi.fn(),
    getAuditLogById: vi.fn(),
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

describe('Audit Logs Integration Tests', () => {
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

  describe('GET /api/v1/audit-logs', () => {
    it('returns 403 when user lacks audit-logs:read permission', async () => {
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
        url: '/api/v1/audit-logs',
        headers: createMockBearerHeader(),
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns paginated audit logs for authorized administrator', async () => {
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
        permissions: [PERMISSIONS.AUDIT_LOGS_READ],
      });

      vi.mocked(auditLogsService.getAuditLogs).mockResolvedValueOnce({
        items: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/audit-logs',
        headers: createMockBearerHeader(),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.items).toBeDefined();
    });
  });
});
