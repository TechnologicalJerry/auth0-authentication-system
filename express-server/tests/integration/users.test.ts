import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app.js';
import { auth0Verifier } from '../../src/integrations/auth0/auth0.verifier.js';
import { usersService } from '../../src/modules/users/users.service.js';
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
    getProfileByAuth0Id: vi.fn(),
    updateProfileByAuth0Id: vi.fn(),
    getUsers: vi.fn(),
    getUserById: vi.fn(),
    updateUser: vi.fn(),
    updateUserStatus: vi.fn(),
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

describe('Users Integration Tests', () => {
  const app = getTestApp();

  const mockUserProfile = {
    id: 'user-db-123',
    auth0UserId: MOCK_AUTH0_USER.sub,
    email: 'testuser@example.com',
    givenName: 'Test',
    familyName: 'User',
    status: 'ACTIVE',
    isActive: true,
    roles: ['USER'],
    permissions: ['users:read', 'dashboard:read'],
    createdAt: '2026-11-14T00:00:00.000Z',
    updatedAt: '2026-11-14T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/users/me', () => {
    it('returns current user profile for authenticated requester', async () => {
      vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_AUTH0_USER);
      vi.mocked(usersService.syncUserFromToken).mockResolvedValue(mockUserProfile as any);
      vi.mocked(usersService.getUserContext).mockResolvedValue({
        id: mockUserProfile.id,
        auth0UserId: mockUserProfile.auth0UserId,
        email: mockUserProfile.email,
        status: 'ACTIVE',
        isActive: true,
        roles: ['USER'],
        permissions: ['dashboard:read'],
      });
      vi.mocked(usersService.getProfileByAuth0Id).mockResolvedValue(mockUserProfile as any);

      const res = await request(app)
        .get('/api/v1/users/me')
        .set(createMockBearerHeader());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('testuser@example.com');
      expect(usersService.getProfileByAuth0Id).toHaveBeenCalledWith(MOCK_AUTH0_USER.sub);
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    it('updates current user self-editable profile fields', async () => {
      vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_AUTH0_USER);
      vi.mocked(usersService.syncUserFromToken).mockResolvedValue(mockUserProfile as any);
      vi.mocked(usersService.getUserContext).mockResolvedValue({
        id: mockUserProfile.id,
        auth0UserId: mockUserProfile.auth0UserId,
        email: mockUserProfile.email,
        status: 'ACTIVE',
        isActive: true,
        roles: ['USER'],
        permissions: [],
      });
      vi.mocked(usersService.updateProfileByAuth0Id).mockResolvedValue({
        ...mockUserProfile,
        givenName: 'UpdatedGiven',
      } as any);

      const res = await request(app)
        .patch('/api/v1/users/me')
        .set(createMockBearerHeader())
        .send({ givenName: 'UpdatedGiven' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.givenName).toBe('UpdatedGiven');
      expect(usersService.updateProfileByAuth0Id).toHaveBeenCalledWith(
        MOCK_AUTH0_USER.sub,
        { givenName: 'UpdatedGiven' },
      );
    });
  });

  describe('GET /api/v1/users (Permission Protected)', () => {
    it('returns 403 Forbidden when user lacks users:read permission', async () => {
      vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_AUTH0_USER);
      vi.mocked(usersService.syncUserFromToken).mockResolvedValue(mockUserProfile as any);
      vi.mocked(usersService.getUserContext).mockResolvedValue({
        id: mockUserProfile.id,
        auth0UserId: mockUserProfile.auth0UserId,
        email: mockUserProfile.email,
        status: 'ACTIVE',
        isActive: true,
        roles: ['USER'],
        permissions: ['dashboard:read'], // lacks users:read
      });

      const res = await request(app)
        .get('/api/v1/users')
        .set(createMockBearerHeader());

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns paginated users when authorized with users:read permission', async () => {
      vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_ADMIN_USER);
      vi.mocked(usersService.syncUserFromToken).mockResolvedValue(mockUserProfile as any);
      vi.mocked(usersService.getUserContext).mockResolvedValue({
        id: 'admin-db-id',
        auth0UserId: MOCK_ADMIN_USER.sub,
        email: 'admin@example.com',
        status: 'ACTIVE',
        isActive: true,
        roles: ['ADMIN'],
        permissions: ['users:read', 'users:update'],
      });
      vi.mocked(usersService.getUsers).mockResolvedValue({
        data: [mockUserProfile as any],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const res = await request(app)
        .get('/api/v1/users')
        .set(createMockBearerHeader('admin-token'));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('returns user by id when requester has users:read', async () => {
      vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_ADMIN_USER);
      vi.mocked(usersService.syncUserFromToken).mockResolvedValue(mockUserProfile as any);
      vi.mocked(usersService.getUserContext).mockResolvedValue({
        id: 'admin-db-id',
        auth0UserId: MOCK_ADMIN_USER.sub,
        email: 'admin@example.com',
        status: 'ACTIVE',
        isActive: true,
        roles: ['ADMIN'],
        permissions: ['users:read'],
      });
      vi.mocked(usersService.getUserById).mockResolvedValue(mockUserProfile as any);

      const res = await request(app)
        .get('/api/v1/users/user-db-123')
        .set(createMockBearerHeader('admin-token'));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('user-db-123');
    });
  });
});
