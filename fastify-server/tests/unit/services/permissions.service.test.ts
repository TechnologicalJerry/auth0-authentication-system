import { describe, it, expect, vi, beforeEach } from 'vitest';
import { permissionsService } from '../../../src/modules/permissions/permissions.service.js';
import { permissionsRepository } from '../../../src/modules/permissions/permissions.repository.js';
import { rolesRepository } from '../../../src/modules/roles/roles.repository.js';
import { authCacheService } from '../../../src/infrastructure/cache/auth-cache.service.js';
import { AppError } from '../../../src/common/utils/app-error.util.js';
import { ErrorCode } from '../../../src/common/enums/error-code.enum.js';

vi.mock('../../../src/modules/permissions/permissions.repository.js', () => ({
  permissionsRepository: {
    findAll: vi.fn(),
    findByIds: vi.fn(),
    findByRoleId: vi.fn(),
    setRolePermissions: vi.fn(),
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateRolePermissions', () => {
    it('throws ROLE_NOT_FOUND when target role does not exist', async () => {
      vi.mocked(rolesRepository.findById).mockResolvedValueOnce(null);

      await expect(
        permissionsService.updateRolePermissions('non-existent-role', ['perm-1']),
      ).rejects.toThrowError(expect.objectContaining({ code: ErrorCode.ROLE_NOT_FOUND }));
    });

    it('throws INVALID_PERMISSION_IDS when permission IDs are invalid', async () => {
      vi.mocked(rolesRepository.findById).mockResolvedValueOnce({
        id: 'role-1',
        name: 'CUSTOM_ROLE',
      } as any);

      vi.mocked(permissionsRepository.findByIds).mockResolvedValueOnce([
        { id: 'perm-1', name: 'users:read', description: 'Read users', createdAt: new Date() },
      ]);

      await expect(
        permissionsService.updateRolePermissions('role-1', ['perm-1', 'perm-missing']),
      ).rejects.toThrowError(
        expect.objectContaining({ code: ErrorCode.INVALID_PERMISSION_IDS }),
      );
    });

    it('updates role permissions and invalidates auth caches', async () => {
      vi.mocked(rolesRepository.findById).mockResolvedValueOnce({
        id: 'role-1',
        name: 'CUSTOM_ROLE',
      } as any);

      const validPerms = [
        { id: 'perm-1', name: 'users:read', description: 'Read users', createdAt: new Date() },
      ];
      vi.mocked(permissionsRepository.findByIds).mockResolvedValueOnce(validPerms);
      vi.mocked(permissionsRepository.findByRoleId).mockResolvedValueOnce(validPerms);

      const result = await permissionsService.updateRolePermissions('role-1', ['perm-1'], 'admin-1');

      expect(permissionsRepository.setRolePermissions).toHaveBeenCalledWith('role-1', ['perm-1']);
      expect(authCacheService.invalidateAll).toHaveBeenCalled();
      expect(result.permissions).toHaveLength(1);
    });
  });
});
