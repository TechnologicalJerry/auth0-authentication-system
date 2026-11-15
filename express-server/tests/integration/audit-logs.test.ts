import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app.js';
import { auth0Verifier } from '../../src/integrations/auth0/auth0.verifier.js';
import { usersService } from '../../src/modules/users/users.service.js';
import { auditLogsService } from '../../src/modules/audit-logs/audit-logs.service.js';
import {
  MOCK_AUTH0_USER,
  MOCK_ADMIN_USER,
  createMockBearerHeader,
} from '../helpers/mock-auth0.js';

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

vi.mock('../../src/modules/audit-logs/audit-logs.service.js', () => ({
  auditLogsService: {
    getAuditLogs: vi.fn(),
    getAuditLogById: vi.fn(),
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

describe('Audit Logs Integration Tests', () => {
  const app = getTestApp();

  const mockLogEntry = {
    id: 'audit-log-1',
    actorUserId: 'user-db-123',
    action: 'ROLE_ASSIGNED',
    resource: 'user_role',
    resourceId: 'u1:r1',
    status: 'SUCCESS',
    metadata: { roleName: 'MANAGER' },
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    createdAt: '2026-11-14T00:00:00.000Z',
    actorUser: {
      id: 'user-db-123',
      email: 'admin@example.com',
      auth0UserId: 'auth0|admin',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/audit-logs', () => {
    it('returns 401 Unauthorized when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/audit-logs');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 Forbidden when user lacks audit-logs:read', async () => {
      vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_AUTH0_USER);
      vi.mocked(usersService.syncUserFromToken).mockResolvedValue({ id: 'u-1' } as any);
      vi.mocked(usersService.getUserContext).mockResolvedValue({
        id: 'u-1',
        auth0UserId: MOCK_AUTH0_USER.sub,
        email: 'user@example.com',
        status: 'ACTIVE',
        isActive: true,
        roles: ['USER'],
        permissions: ['dashboard:read'],
      });

      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set(createMockBearerHeader());

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 OK with paginated audit logs when authorized', async () => {
      vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_ADMIN_USER);
      vi.mocked(usersService.syncUserFromToken).mockResolvedValue({ id: 'admin-1' } as any);
      vi.mocked(usersService.getUserContext).mockResolvedValue({
        id: 'admin-1',
        auth0UserId: MOCK_ADMIN_USER.sub,
        email: 'admin@example.com',
        status: 'ACTIVE',
        isActive: true,
        roles: ['ADMIN'],
        permissions: ['audit-logs:read'],
      });
      vi.mocked(auditLogsService.getAuditLogs).mockResolvedValue({
        data: [mockLogEntry],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set(createMockBearerHeader('admin-token'));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].action).toBe('ROLE_ASSIGNED');
    });
  });

  describe('GET /api/v1/audit-logs/:id', () => {
    it('returns specific audit log entry when authorized', async () => {
      vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_ADMIN_USER);
      vi.mocked(usersService.syncUserFromToken).mockResolvedValue({ id: 'admin-1' } as any);
      vi.mocked(usersService.getUserContext).mockResolvedValue({
        id: 'admin-1',
        auth0UserId: MOCK_ADMIN_USER.sub,
        email: 'admin@example.com',
        status: 'ACTIVE',
        isActive: true,
        roles: ['ADMIN'],
        permissions: ['audit-logs:read'],
      });
      vi.mocked(auditLogsService.getAuditLogById).mockResolvedValue(mockLogEntry);

      const res = await request(app)
        .get('/api/v1/audit-logs/audit-log-1')
        .set(createMockBearerHeader('admin-token'));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('audit-log-1');
    });
  });
});

