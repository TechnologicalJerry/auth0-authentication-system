import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app.js';
import { auth0Verifier } from '../../src/integrations/auth0/auth0.verifier.js';
import { usersService } from '../../src/modules/users/users.service.js';
import { adminService } from '../../src/modules/admin/admin.service.js';
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

vi.mock('../../src/modules/admin/admin.service.js', () => ({
  adminService: {
    getDashboardStatistics: vi.fn(),
    getUserStatistics: vi.fn(),
    getRoleStatistics: vi.fn(),
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

describe('Admin Integration Tests', () => {
  const app = getTestApp();

  const mockDashboardData = {
    totalUsers: 150,
    activeUsers: 145,
    totalRoles: 5,
    systemRoles: 5,
    customRoles: 0,
    timestamp: '2026-11-14T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/admin/dashboard', () => {
    it('returns 401 Unauthorized when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 Forbidden when user does not have ADMIN or SUPER_ADMIN role', async () => {
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
        .get('/api/v1/admin/dashboard')
        .set(createMockBearerHeader());

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_ROLE');
    });

    it('returns 200 OK with admin statistics when user has ADMIN role', async () => {
      vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_ADMIN_USER);
      vi.mocked(usersService.syncUserFromToken).mockResolvedValue({ id: 'admin-1' } as any);
      vi.mocked(usersService.getUserContext).mockResolvedValue({
        id: 'admin-1',
        auth0UserId: MOCK_ADMIN_USER.sub,
        email: 'admin@example.com',
        status: 'ACTIVE',
        isActive: true,
        roles: ['ADMIN'],
        permissions: ['*'],
      });
      vi.mocked(adminService.getDashboardStatistics).mockResolvedValue(mockDashboardData as any);

      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set(createMockBearerHeader('admin-token'));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalUsers).toBe(150);
      expect(res.body.data.totalRoles).toBe(5);
    });
  });

  describe('GET /api/v1/admin/users/statistics', () => {
    it('returns user breakdown statistics for admin', async () => {
      vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_ADMIN_USER);
      vi.mocked(usersService.syncUserFromToken).mockResolvedValue({ id: 'admin-1' } as any);
      vi.mocked(usersService.getUserContext).mockResolvedValue({
        id: 'admin-1',
        auth0UserId: MOCK_ADMIN_USER.sub,
        email: 'admin@example.com',
        status: 'ACTIVE',
        isActive: true,
        roles: ['ADMIN'],
        permissions: ['*'],
      });
      vi.mocked(adminService.getUserStatistics).mockResolvedValue({
        total: 100,
        byStatus: { ACTIVE: 95, SUSPENDED: 5 },
      } as any);

      const res = await request(app)
        .get('/api/v1/admin/users/statistics')
        .set(createMockBearerHeader('admin-token'));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(100);
    });
  });

  describe('GET /api/v1/admin/roles/statistics', () => {
    it('returns role distribution statistics for admin', async () => {
      vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_ADMIN_USER);
      vi.mocked(usersService.syncUserFromToken).mockResolvedValue({ id: 'admin-1' } as any);
      vi.mocked(usersService.getUserContext).mockResolvedValue({
        id: 'admin-1',
        auth0UserId: MOCK_ADMIN_USER.sub,
        email: 'admin@example.com',
        status: 'ACTIVE',
        isActive: true,
        roles: ['ADMIN'],
        permissions: ['*'],
      });
      vi.mocked(adminService.getRoleStatistics).mockResolvedValue({
        roles: [{ roleName: 'USER', count: 80 }],
      } as any);

      const res = await request(app)
        .get('/api/v1/admin/roles/statistics')
        .set(createMockBearerHeader('admin-token'));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.roles).toHaveLength(1);
    });
  });
});

