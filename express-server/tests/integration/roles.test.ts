import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app.js';
import { auth0Verifier } from '../../src/integrations/auth0/auth0.verifier.js';
import { usersService } from '../../src/modules/users/users.service.js';
import { rolesService } from '../../src/modules/roles/roles.service.js';
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
    consumeToken: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetMs: 60000,
      totalLimit: 100,
    }),
  },
}));

describe('Roles Integration Tests', () => {
  const app = getTestApp();

  const mockRoleDto = {
    id: 'role-audit',
    name: 'AUDITOR',
    description: 'Read-only audit inspector',
    isSystem: false,
    isActive: true,
    createdAt: '2026-11-14T00:00:00.000Z',
    updatedAt: '2026-11-14T00:00:00.000Z',
    permissions: [],
    userCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/roles', () => {
    it('returns 401 Unauthorized when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/roles');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 Forbidden when user lacks roles:read permission', async () => {
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
        .get('/api/v1/roles')
        .set(createMockBearerHeader());

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 OK with role list when user has roles:read permission', async () => {
      vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_ADMIN_USER);
      vi.mocked(usersService.syncUserFromToken).mockResolvedValue({ id: 'admin-1' } as any);
      vi.mocked(usersService.getUserContext).mockResolvedValue({
        id: 'admin-1',
        auth0UserId: MOCK_ADMIN_USER.sub,
        email: 'admin@example.com',
        status: 'ACTIVE',
        isActive: true,
        roles: ['ADMIN'],
        permissions: ['roles:read'],
      });
      vi.mocked(rolesService.getRoles).mockResolvedValue([mockRoleDto]);

      const res = await request(app)
        .get('/api/v1/roles')
        .set(createMockBearerHeader('admin-token'));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('AUDITOR');
    });
  });

  describe('POST /api/v1/roles', () => {
    it('creates new custom role when authorized with roles:create', async () => {
      vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_ADMIN_USER);
      vi.mocked(usersService.syncUserFromToken).mockResolvedValue({ id: 'admin-1' } as any);
      vi.mocked(usersService.getUserContext).mockResolvedValue({
        id: 'admin-1',
        auth0UserId: MOCK_ADMIN_USER.sub,
        email: 'admin@example.com',
        status: 'ACTIVE',
        isActive: true,
        roles: ['ADMIN'],
        permissions: ['roles:create'],
      });
      vi.mocked(rolesService.createRole).mockResolvedValue(mockRoleDto);

      const res = await request(app)
        .post('/api/v1/roles')
        .set(createMockBearerHeader('admin-token'))
        .send({
          name: 'AUDITOR',
          description: 'Read-only audit inspector',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('AUDITOR');
    });
  });

  describe('DELETE /api/v1/roles/:id', () => {
    it('deletes custom role and returns 204 No Content', async () => {
      vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_ADMIN_USER);
      vi.mocked(usersService.syncUserFromToken).mockResolvedValue({ id: 'admin-1' } as any);
      vi.mocked(usersService.getUserContext).mockResolvedValue({
        id: 'admin-1',
        auth0UserId: MOCK_ADMIN_USER.sub,
        email: 'admin@example.com',
        status: 'ACTIVE',
        isActive: true,
        roles: ['ADMIN'],
        permissions: ['roles:delete'],
      });
      vi.mocked(rolesService.deleteRole).mockResolvedValue(undefined);

      const res = await request(app)
        .delete('/api/v1/roles/role-audit')
        .set(createMockBearerHeader('admin-token'));

      expect(res.status).toBe(204);
    });
  });
});
