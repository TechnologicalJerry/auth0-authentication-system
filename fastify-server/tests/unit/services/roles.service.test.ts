import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rolesService } from '../../../src/modules/roles/roles.service.js';
import { rolesRepository } from '../../../src/modules/roles/roles.repository.js';
import { usersRepository } from '../../../src/modules/users/users.repository.js';
import { authCacheService } from '../../../src/infrastructure/cache/auth-cache.service.js';
import { auditLogsService } from '../../../src/modules/audit-logs/audit-logs.service.js';
import { AppError } from '../../../src/common/utils/app-error.util.js';
import { ErrorCode } from '../../../src/common/enums/error-code.enum.js';
import { SYSTEM_ROLES } from '../../../src/common/constants/roles.constants.js';

vi.mock('../../../src/modules/roles/roles.repository.js', () => ({
  rolesRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByName: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUserRole: vi.fn(),
    assignRoleToUser: vi.fn(),
    removeRoleFromUser: vi.fn(),
    getUserRoleCount: vi.fn(),
  },
}));

vi.mock('../../../src/modules/users/users.repository.js', () => ({
  usersRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../../src/infrastructure/cache/auth-cache.service.js', () => ({
  authCacheService: {
    invalidateAll: vi.fn().mockResolvedValue(undefined),
    invalidateUser: vi.fn().mockResolvedValue(undefined),
    invalidateUsers: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../src/modules/audit-logs/audit-logs.service.js', () => ({
  auditLogsService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('RolesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteRole', () => {
    it('prevents deletion of system roles', async () => {
      vi.mocked(rolesRepository.findById).mockResolvedValueOnce({
        id: 'role-1',
        name: SYSTEM_ROLES.ADMIN,
        description: 'Admin role',
        isSystem: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(rolesService.deleteRole('role-1', 'admin-user')).rejects.toThrowError(
        expect.objectContaining({ code: ErrorCode.CANNOT_DELETE_SYSTEM_ROLE }),
      );
    });

    it('prevents deletion if role is currently assigned to users', async () => {
      vi.mocked(rolesRepository.findById).mockResolvedValueOnce({
        id: 'role-custom',
        name: 'CUSTOM_ROLE',
        description: 'Custom',
        isSystem: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(rolesRepository.getUserRoleCount).mockResolvedValueOnce(5);

      await expect(rolesService.deleteRole('role-custom', 'admin-user')).rejects.toThrowError(
        expect.objectContaining({ code: ErrorCode.ROLE_IN_USE }),
      );
    });
  });

  describe('assignRolesToUser', () => {
    it('prevents non-SUPER_ADMIN actor from assigning SUPER_ADMIN role', async () => {
      vi.mocked(usersRepository.findById).mockResolvedValueOnce({
        id: 'target-user',
        auth0UserId: 'auth0|target',
        email: 'target@example.com',
      } as any);

      vi.mocked(rolesRepository.findById).mockResolvedValueOnce({
        id: 'super-admin-role-id',
        name: SYSTEM_ROLES.SUPER_ADMIN,
        isSystem: true,
      } as any);

      await expect(
        rolesService.assignRolesToUser(
          'target-user',
          ['super-admin-role-id'],
          'regular-admin-actor',
          [SYSTEM_ROLES.ADMIN],
        ),
      ).rejects.toThrowError(
        expect.objectContaining({ code: ErrorCode.SUPER_ADMIN_ASSIGNMENT_DENIED }),
      );
    });
  });
});
