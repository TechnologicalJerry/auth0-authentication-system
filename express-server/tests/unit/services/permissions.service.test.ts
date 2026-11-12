import { describe, it, expect, vi, beforeEach } from 'vitest';
import { permissionsService } from '../../../src/modules/permissions/permissions.service.js';
import { permissionsRepository } from '../../../src/modules/permissions/permissions.repository.js';
import { rolesRepository } from '../../../src/modules/roles/roles.repository.js';
import { authCacheService } from '../../../src/infrastructure/cache/auth-cache.service.js';
import { auditLogsService } from '../../../src/modules/audit-logs/audit-logs.service.js';
import { AppError } from '../../../src/common/utils/app-error.util.js';
import { HTTP_STATUS } from '../../../src/common/constants/http-status.constants.js';
import { ErrorCode } from '../../../src/common/enums/error-code.enum.js';

vi.mock('../../../src/modules/permissions/permissions.repository.js', () => ({
  permissionsRepository: {
    findAll: vi.fn(),
    findByRoleId: vi.fn(),
    findByIds: vi.fn(),
    updateRolePermissions: vi.fn(),
  },
}));

vi.mock('../../../src/modules/roles/roles.repository.js', () => ({
  rolesRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../../src/infrastructure/cache/auth-cache.service.js', () => ({
  authCacheService: {
    invalidateAll: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../src/modules/audit-logs/audit-logs.service.js', () => ({
  auditLogsService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('PermissionsService', () => {
  const mockDate = new Date();
  const mockPermission = {
    id: 'perm-1',
    name: 'users:read',
    description: 'Read users',
    action: 'read',
    resource: 'users',
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockRole = {
    id: 'role-123',
    name: 'USER',
    description: 'Standard User',
    isSystem: true,
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPermissions', () => {
    it('returns all permissions mapped to DTO format', async () => {
      vi.mocked(permissionsRepository.findAll).mockResolvedValue([mockPermission]);

      const result = await permissionsService.getPermissions();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('perm-1');
      expect(result[0].name).toBe('users:read');
      expect(result[0].createdAt).toBe(mockDate.toISOString());
    });
  });

  describe('getRolePermissions', () => {
    it('returns role permissions for valid roleId', async () => {
      vi.mocked(rolesRepository.findById).mockResolvedValue(mockRole as any);
      vi.mocked(permissionsRepository.findByRoleId).mockResolvedValue([mockPermission]);

      const result = await permissionsService.getRolePermissions('role-123');

      expect(result.roleId).toBe('role-123');
      expect(result.roleName).toBe('USER');
      expect(result.permissions).toHaveLength(1);
    });

    it('throws 404 AppError when role does not exist', async () => {
      vi.mocked(rolesRepository.findById).mockResolvedValue(null);

      await expect(permissionsService.getRolePermissions('unknown-role')).rejects.toMatchObject({
        statusCode: HTTP_STATUS.NOT_FOUND,
        errorCode: ErrorCode.ROLE_NOT_FOUND,
      });
    });
  });

  describe('updateRolePermissions', () => {
    it('updates role permissions, invalidates cache, and logs audit', async () => {
      vi.mocked(rolesRepository.findById).mockResolvedValue(mockRole as any);
      vi.mocked(permissionsRepository.findByIds).mockResolvedValue([mockPermission]);
      vi.mocked(permissionsRepository.updateRolePermissions).mockResolvedValue(undefined);
      vi.mocked(permissionsRepository.findByRoleId).mockResolvedValue([mockPermission]);

      const result = await permissionsService.updateRolePermissions('role-123', ['perm-1'], 'admin-1');

      expect(permissionsRepository.updateRolePermissions).toHaveBeenCalledWith('role-123', ['perm-1']);
      expect(authCacheService.invalidateAll).toHaveBeenCalled();
      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ROLE_PERMISSIONS_UPDATED', resourceId: 'role-123' }),
      );
      expect(result.permissions).toHaveLength(1);
    });

    it('throws 400 Bad Request when one or more permission IDs do not exist', async () => {
      vi.mocked(rolesRepository.findById).mockResolvedValue(mockRole as any);
      vi.mocked(permissionsRepository.findByIds).mockResolvedValue([]); // returned 0 but requested 1

      await expect(
        permissionsService.updateRolePermissions('role-123', ['non-existent-perm']),
      ).rejects.toMatchObject({
        statusCode: HTTP_STATUS.BAD_REQUEST,
        errorCode: ErrorCode.PERMISSION_NOT_FOUND,
      });
      expect(permissionsRepository.updateRolePermissions).not.toHaveBeenCalled();
    });
  });
});
