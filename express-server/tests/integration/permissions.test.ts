import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app.js';
import { auth0Verifier } from '../../src/integrations/auth0/auth0.verifier.js';
import { usersService } from '../../src/modules/users/users.service.js';
import { permissionsService } from '../../src/modules/permissions/permissions.service.js';
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

vi.mock('../../src/modules/permissions/permissions.service.js', () => ({
  permissionsService: {
    getPermissions: vi.fn(),
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

describe('Permissions Integration Tests', () => {
  const app = getTestApp();

  const mockPermissions = [
    {
      id: 'perm-1',
      name: 'users:read',
      description: 'Read users',
      createdAt: '2026-11-14T00:00:00.000Z',
      updatedAt: '2026-11-14T00:00:00.000Z',
    },
    {
      id: 'perm-2',
      name: 'roles:read',
      description: 'Read roles',
      createdAt: '2026-11-14T00:00:00.000Z',
      updatedAt: '2026-11-14T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/permissions', () => {
    it('returns 401 Unauthorized when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/permissions');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 Forbidden when user lacks permissions:read', async () => {
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
        .get('/api/v1/permissions')
        .set(createMockBearerHeader());

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 OK with all system permissions when authorized', async () => {
      vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_ADMIN_USER);
      vi.mocked(usersService.syncUserFromToken).mockResolvedValue({ id: 'admin-1' } as any);
      vi.mocked(usersService.getUserContext).mockResolvedValue({
        id: 'admin-1',
        auth0UserId: MOCK_ADMIN_USER.sub,
        email: 'admin@example.com',
        status: 'ACTIVE',
        isActive: true,
        roles: ['ADMIN'],
        permissions: ['permissions:read'],
      });
      vi.mocked(permissionsService.getPermissions).mockResolvedValue(mockPermissions);

      const res = await request(app)
        .get('/api/v1/permissions')
        .set(createMockBearerHeader('admin-token'));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].name).toBe('users:read');
    });
  });
});

