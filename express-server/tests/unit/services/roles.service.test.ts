import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rolesService } from '../../../src/modules/roles/roles.service.js';
import { rolesRepository } from '../../../src/modules/roles/roles.repository.js';
import { usersRepository } from '../../../src/modules/users/users.repository.js';
import { authCacheService } from '../../../src/infrastructure/cache/auth-cache.service.js';
import { auditLogsService } from '../../../src/modules/audit-logs/audit-logs.service.js';
import { AppError } from '../../../src/common/utils/app-error.util.js';
import { HTTP_STATUS } from '../../../src/common/constants/http-status.constants.js';
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
  },
}));

vi.mock('../../../src/modules/audit-logs/audit-logs.service.js', () => ({
  auditLogsService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('RolesService', () => {
  const mockDate = new Date();
  const mockRole = {
    id: 'role-123',
    name: 'CUSTOM_OPERATOR',
    description: 'Custom operator role',
    isSystem: false,
    isActive: true,
    createdAt: mockDate,
    updatedAt: mockDate,
    permissions: [{ id: 'perm-1', action: 'read', resource: 'reports' }],
    _count: { userRoles: 0 },
  };

  const mockSystemRole = {
    id: 'role-superadmin',
    name: SYSTEM_ROLES.SUPER_ADMIN,
    description: 'Super administrator',
    isSystem: true,
    isActive: true,
    createdAt: mockDate,
    updatedAt: mockDate,
    permissions: [{ id: 'perm-all', action: '*', resource: '*' }],
    _count: { userRoles: 1 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRoles', () => {
    it('returns formatted list of roles with user counts and permissions', async () => {
      vi.mocked(rolesRepository.findAll).mockResolvedValue([mockRole]);

      const result = await rolesService.getRoles();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('role-123');
      expect(result[0].userCount).toBe(0);
      expect(result[0].permissions).toHaveLength(1);
    });
  });

  describe('getRoleById', () => {
    it('returns role when found', async () => {
      vi.mocked(rolesRepository.findById).mockResolvedValue(mockRole);

      const result = await rolesService.getRoleById('role-123');

      expect(result.id).toBe('role-123');
      expect(result.name).toBe('CUSTOM_OPERATOR');
    });

    it('throws 404 AppError when role is not found', async () => {
      vi.mocked(rolesRepository.findById).mockResolvedValue(null);

      await expect(rolesService.getRoleById('missing-role')).rejects.toThrow(AppError);
    });
  });

  describe('createRole', () => {
    it('creates custom role, writes audit log, and returns created role', async () => {
      vi.mocked(rolesRepository.findByName).mockResolvedValue(null);
      vi.mocked(rolesRepository.create).mockResolvedValue(mockRole as any);
      vi.mocked(rolesRepository.findById).mockResolvedValue(mockRole);

      const result = await rolesService.createRole({
        name: 'CUSTOM_OPERATOR',
        description: 'Custom operator role',
        permissionIds: ['perm-1'],
      }, 'actor-user-id');

      expect(rolesRepository.create).toHaveBeenCalledWith({
        name: 'CUSTOM_OPERATOR',
        description: 'Custom operator role',
        isSystem: false,
        permissionIds: ['perm-1'],
      });
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ROLE_CREATED', resource: 'role' }),
      );
      expect(result.name).toBe('CUSTOM_OPERATOR');
    });

    it('throws 409 Conflict if role name already exists', async () => {
      vi.mocked(rolesRepository.findByName).mockResolvedValue(mockRole as any);

      await expect(
        rolesService.createRole({ name: 'CUSTOM_OPERATOR', description: 'Dupe' }),
      ).rejects.toThrow(AppError);
      expect(rolesRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateRole', () => {
    it('updates role and invalidates all cached auth contexts', async () => {
      vi.mocked(rolesRepository.findById).mockResolvedValue(mockRole);
      vi.mocked(rolesRepository.findByName).mockResolvedValue(null);
      vi.mocked(rolesRepository.update).mockResolvedValue(mockRole as any);

      await rolesService.updateRole('role-123', { description: 'Updated desc' }, 'actor-1');

      expect(rolesRepository.update).toHaveBeenCalledWith('role-123', { description: 'Updated desc' });
      expect(authCacheService.invalidateAll).toHaveBeenCalled();
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ROLE_UPDATED' }),
      );
    });

    it('prevents renaming a system role (403 Forbidden)', async () => {
      vi.mocked(rolesRepository.findById).mockResolvedValue(mockSystemRole);

      await expect(
        rolesService.updateRole('role-superadmin', { name: 'RENAMED_SUPER_ADMIN' }),
      ).rejects.toMatchObject({
        statusCode: HTTP_STATUS.FORBIDDEN,
        errorCode: ErrorCode.SYSTEM_ROLE_PROTECTED,
      });
    });
  });

  describe('deleteRole', () => {
    it('deletes custom unassigned role and invalidates cache', async () => {
      vi.mocked(rolesRepository.findById).mockResolvedValue(mockRole);
      vi.mocked(rolesRepository.delete).mockResolvedValue(mockRole as any);

      await rolesService.deleteRole('role-123', 'admin-id');

      expect(rolesRepository.delete).toHaveBeenCalledWith('role-123');
      expect(authCacheService.invalidateAll).toHaveBeenCalled();
    });

    it('prevents deleting a system role (403 Forbidden)', async () => {
      vi.mocked(rolesRepository.findById).mockResolvedValue(mockSystemRole);

      await expect(rolesService.deleteRole('role-superadmin')).rejects.toMatchObject({
        statusCode: HTTP_STATUS.FORBIDDEN,
        errorCode: ErrorCode.SYSTEM_ROLE_PROTECTED,
      });
      expect(rolesRepository.delete).not.toHaveBeenCalled();
    });

    it('prevents deleting a role that has active user assignments (400 Bad Request)', async () => {
      const roleWithUsers = { ...mockRole, _count: { userRoles: 3 } };
      vi.mocked(rolesRepository.findById).mockResolvedValue(roleWithUsers);

      await expect(rolesService.deleteRole('role-123')).rejects.toMatchObject({
        statusCode: HTTP_STATUS.BAD_REQUEST,
      });
      expect(rolesRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('assignRoleToUser', () => {
    const mockUser = {
      id: 'user-abc',
      auth0UserId: 'auth0|user-abc',
      email: 'user@example.com',
      isActive: true,
    };

    it('assigns role to user, invalidates user auth cache, and logs audit', async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(mockUser as any);
      vi.mocked(rolesRepository.findById).mockResolvedValue(mockRole);
      vi.mocked(rolesRepository.findUserRole).mockResolvedValue(null);
      vi.mocked(rolesRepository.assignRoleToUser).mockResolvedValue({
        userId: 'user-abc',
        roleId: 'role-123',
        assignedAt: mockDate,
      } as any);

      const result = await rolesService.assignRoleToUser('user-abc', 'role-123', 'admin-id');

      expect(rolesRepository.assignRoleToUser).toHaveBeenCalledWith('user-abc', 'role-123');
      expect(authCacheService.invalidateUser).toHaveBeenCalledWith(mockUser.auth0UserId);
      expect(result.userId).toBe('user-abc');
      expect(result.roleName).toBe('CUSTOM_OPERATOR');
    });

    it('rejects assignment of inactive role', async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(mockUser as any);
      vi.mocked(rolesRepository.findById).mockResolvedValue({ ...mockRole, isActive: false });

      await expect(
        rolesService.assignRoleToUser('user-abc', 'role-123'),
      ).rejects.toMatchObject({
        statusCode: HTTP_STATUS.BAD_REQUEST,
      });
    });

    it('rejects duplicate role assignment (409 Conflict)', async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(mockUser as any);
      vi.mocked(rolesRepository.findById).mockResolvedValue(mockRole);
      vi.mocked(rolesRepository.findUserRole).mockResolvedValue({ userId: 'user-abc', roleId: 'role-123' } as any);

      await expect(
        rolesService.assignRoleToUser('user-abc', 'role-123'),
      ).rejects.toMatchObject({
        statusCode: HTTP_STATUS.CONFLICT,
        errorCode: ErrorCode.DUPLICATE_ROLE_ASSIGNMENT,
      });
    });
  });

  describe('revokeRoleFromUser', () => {
    const mockUser = {
      id: 'super-user-id',
      auth0UserId: 'auth0|super-user',
      email: 'super@example.com',
    };

    it('prevents self-revocation of SUPER_ADMIN role (lockout prevention)', async () => {
      vi.mocked(usersRepository.findById).mockResolvedValue(mockUser as any);
      vi.mocked(rolesRepository.findById).mockResolvedValue(mockSystemRole);
      vi.mocked(rolesRepository.findUserRole).mockResolvedValue({
        userId: 'super-user-id',
        roleId: 'role-superadmin',
      } as any);

      await expect(
        rolesService.revokeRoleFromUser('super-user-id', 'role-superadmin', 'super-user-id'),
      ).rejects.toMatchObject({
        statusCode: HTTP_STATUS.FORBIDDEN,
        errorCode: ErrorCode.FORBIDDEN,
      });
      expect(rolesRepository.removeRoleFromUser).not.toHaveBeenCalled();
    });

    it('revokes role successfully when not self-revoking super admin', async () => {
      const standardUser = { id: 'other-user-id', auth0UserId: 'auth0|other' };
      vi.mocked(usersRepository.findById).mockResolvedValue(standardUser as any);
      vi.mocked(rolesRepository.findById).mockResolvedValue(mockRole);
      vi.mocked(rolesRepository.findUserRole).mockResolvedValue({
        userId: 'other-user-id',
        roleId: 'role-123',
      } as any);
      vi.mocked(rolesRepository.removeRoleFromUser).mockResolvedValue({} as any);

      await rolesService.revokeRoleFromUser('other-user-id', 'role-123', 'admin-id');

      expect(rolesRepository.removeRoleFromUser).toHaveBeenCalledWith('other-user-id', 'role-123');
      expect(authCacheService.invalidateUser).toHaveBeenCalledWith(standardUser.auth0UserId);
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ROLE_REVOKED' }),
      );
    });
  });
});
