import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp } from '../helpers/test-app.js';
import { verifyAccessToken } from '../../src/integrations/auth0/auth0.verifier.js';
import { usersService } from '../../src/modules/users/users.service.js';
import { rolesService } from '../../src/modules/roles/roles.service.js';
import {
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
    updateUserProfile: vi.fn(),
  },
}));

vi.mock('../../src/modules/roles/roles.service.js', () => ({
  rolesService: {
    assignRolesToUser: vi.fn(),
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

describe('Security: RBAC Escalation & Tampering Defense', () => {
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

  it('prevents privilege escalation via PATCH /users/me by ignoring injected roles', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce({
      payload: { sub: MOCK_AUTH0_USER.sub },
      user: MOCK_AUTH0_USER,
    });

    vi.mocked(usersService.syncAuth0User).mockResolvedValueOnce({
      id: 'u-1',
      auth0UserId: MOCK_AUTH0_USER.sub,
      email: 'user@example.com',
      status: 'ACTIVE',
      roles: [SYSTEM_ROLES.USER],
      permissions: ['users:read'],
    });

    vi.mocked(usersService.updateUserProfile).mockResolvedValueOnce({
      id: 'u-1',
      auth0UserId: MOCK_AUTH0_USER.sub,
      email: 'user@example.com',
      firstName: 'Hacked',
      lastName: null,
      displayName: 'Hacked',
      profilePicture: null,
      isActive: true,
      isBlocked: false,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      roles: [SYSTEM_ROLES.USER], // Remains USER
      permissions: ['users:read'],
    });

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: createMockBearerHeader(),
      payload: {
        firstName: 'Hacked',
        roles: [SYSTEM_ROLES.SUPER_ADMIN], // Malicious payload attempting to escalate
      },
    });

    expect(res.statusCode).toBe(200);
    // updateUserProfile should only be invoked with authorized mutable profile fields
    expect(usersService.updateUserProfile).toHaveBeenCalledWith(
      'u-1',
      expect.not.objectContaining({ roles: expect.anything() }),
    );
  });

  it('blocks standard user from calling PUT /users/:id/roles', async () => {
    vi.mocked(verifyAccessToken).mockResolvedValueOnce({
      payload: { sub: MOCK_AUTH0_USER.sub },
      user: MOCK_AUTH0_USER,
    });

    vi.mocked(usersService.syncAuth0User).mockResolvedValueOnce({
      id: 'u-1',
      auth0UserId: MOCK_AUTH0_USER.sub,
      email: 'user@example.com',
      status: 'ACTIVE',
      roles: [SYSTEM_ROLES.USER],
      permissions: [], // No roles:assign permission
    });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/users/u-1/roles',
      headers: createMockBearerHeader(),
      payload: {
        roleIds: ['some-superadmin-role-id'],
      },
    });

    expect(res.statusCode).toBe(403);
  });
});
