import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app.js';
import { auth0Verifier } from '../../src/integrations/auth0/auth0.verifier.js';
import { usersService } from '../../src/modules/users/users.service.js';
import { rolesService } from '../../src/modules/roles/roles.service.js';
import { AppError } from '../../src/common/utils/app-error.util.js';
import { HTTP_STATUS } from '../../src/common/constants/http-status.constants.js';
import { ErrorCode } from '../../src/common/enums/error-code.enum.js';
import {
  MOCK_AUTH0_USER,
  MOCK_SUPER_ADMIN_USER,
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
    updateProfileByAuth0Id: vi.fn(),
  },
}));

vi.mock('../../src/modules/roles/roles.service.js', () => ({
  rolesService: {
    assignRoleToUser: vi.fn(),
    revokeRoleFromUser: vi.fn(),
    deleteRole: vi.fn(),
    updateRole: vi.fn(),
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

describe('Security: RBAC Escalation & Tampering Defense', () => {
  const app = getTestApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prevents privilege escalation via PATCH /users/me by stripping role/permission mutations', async () => {
    vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_AUTH0_USER);
    vi.mocked(usersService.syncUserFromToken).mockResolvedValue({ id: 'u-1' } as any);
    vi.mocked(usersService.getUserContext).mockResolvedValue({
      id: 'u-1',
      auth0UserId: MOCK_AUTH0_USER.sub,
      email: 'user@example.com',
      status: 'ACTIVE',
      isActive: true,
      roles: ['USER'],
      permissions: [],
    });
    vi.mocked(usersService.updateProfileByAuth0Id).mockResolvedValue({
      id: 'u-1',
      auth0UserId: MOCK_AUTH0_USER.sub,
      email: 'user@example.com',
      givenName: 'NormalUser',
      status: 'ACTIVE',
      isActive: true,
      roles: ['USER'],
      permissions: [],
      createdAt: '2026-11-14T00:00:00.000Z',
      updatedAt: '2026-11-14T00:00:00.000Z',
    } as any);

    await request(app)
      .patch('/api/v1/users/me')
      .set(createMockBearerHeader())
      .send({
        givenName: 'NormalUser',
        // Attack payload trying to grant admin rights
        roles: ['SUPER_ADMIN'],
        permissions: ['*'],
        isSystem: true,
      });

    // The service must ONLY receive sanitized fields allowed by the Zod schema
    expect(usersService.updateProfileByAuth0Id).toHaveBeenCalledWith(
      MOCK_AUTH0_USER.sub,
      { givenName: 'NormalUser' },
    );
  });

  it('rejects unprivileged user attempt to assign roles (403 Forbidden)', async () => {
    vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_AUTH0_USER);
    vi.mocked(usersService.syncUserFromToken).mockResolvedValue({ id: 'u-1' } as any);
    vi.mocked(usersService.getUserContext).mockResolvedValue({
      id: 'u-1',
      auth0UserId: MOCK_AUTH0_USER.sub,
      email: 'user@example.com',
      status: 'ACTIVE',
      isActive: true,
      roles: ['USER'],
      permissions: [], // missing roles:assign
    });

    const res = await request(app)
      .post('/api/v1/users/victim-id/roles')
      .set(createMockBearerHeader())
      .send({ roleId: 'role-superadmin' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(rolesService.assignRoleToUser).not.toHaveBeenCalled();
  });

  it('prevents SUPER_ADMIN from accidentally revoking their own SUPER_ADMIN role (lockout defense)', async () => {
    vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_SUPER_ADMIN_USER);
    vi.mocked(usersService.syncUserFromToken).mockResolvedValue({ id: 'super-db-id' } as any);
    vi.mocked(usersService.getUserContext).mockResolvedValue({
      id: 'super-db-id',
      auth0UserId: MOCK_SUPER_ADMIN_USER.sub,
      email: 'superadmin@example.com',
      status: 'ACTIVE',
      isActive: true,
      roles: ['SUPER_ADMIN'],
      permissions: ['*'],
    });

    vi.mocked(rolesService.revokeRoleFromUser).mockRejectedValue(
      new AppError(
        'You cannot revoke your own SUPER_ADMIN role',
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN,
      ),
    );

    const res = await request(app)
      .delete('/api/v1/users/super-db-id/roles/role-superadmin')
      .set(createMockBearerHeader('superadmin-token'));

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('prevents deletion of protected system roles', async () => {
    vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue(MOCK_SUPER_ADMIN_USER);
    vi.mocked(usersService.syncUserFromToken).mockResolvedValue({ id: 'super-db-id' } as any);
    vi.mocked(usersService.getUserContext).mockResolvedValue({
      id: 'super-db-id',
      auth0UserId: MOCK_SUPER_ADMIN_USER.sub,
      email: 'superadmin@example.com',
      status: 'ACTIVE',
      isActive: true,
      roles: ['SUPER_ADMIN'],
      permissions: ['*'],
    });

    vi.mocked(rolesService.deleteRole).mockRejectedValue(
      new AppError(
        'System roles cannot be deleted',
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.SYSTEM_ROLE_PROTECTED,
      ),
    );

    const res = await request(app)
      .delete('/api/v1/roles/role-superadmin')
      .set(createMockBearerHeader('superadmin-token'));

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SYSTEM_ROLE_PROTECTED');
  });
});

