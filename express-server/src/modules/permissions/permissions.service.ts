import { permissionsRepository } from './permissions.repository.js';
import { rolesRepository } from '../roles/roles.repository.js';
import { AppError } from '../../common/utils/app-error.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';
import { ErrorCode } from '../../common/enums/error-code.enum.js';
import type {
  PermissionResponseDto,
  RolePermissionsResponseDto,
  PermissionRecord,
} from './permissions.types.js';

export class PermissionsService {
  async getPermissions(): Promise<PermissionResponseDto[]> {
    const permissions = await permissionsRepository.findAll();
    return permissions.map((p) => this.mapToDto(p));
  }

  async getRolePermissions(roleId: string): Promise<RolePermissionsResponseDto> {
    const role = await rolesRepository.findById(roleId);
    if (!role) {
      throw new AppError('Role not found', HTTP_STATUS.NOT_FOUND, ErrorCode.ROLE_NOT_FOUND);
    }

    const permissions = await permissionsRepository.findByRoleId(roleId);

    return {
      roleId: role.id,
      roleName: role.name,
      permissions: permissions.map((p) => this.mapToDto(p)),
    };
  }

  async updateRolePermissions(roleId: string, permissionIds: string[]): Promise<RolePermissionsResponseDto> {
    const role = await rolesRepository.findById(roleId);
    if (!role) {
      throw new AppError('Role not found', HTTP_STATUS.NOT_FOUND, ErrorCode.ROLE_NOT_FOUND);
    }

    // Validate that all specified permission IDs exist
    if (permissionIds.length > 0) {
      const existingPermissions = await permissionsRepository.findByIds(permissionIds);
      if (existingPermissions.length !== permissionIds.length) {
        throw new AppError(
          'One or more specified permission IDs do not exist',
          HTTP_STATUS.BAD_REQUEST,
          ErrorCode.PERMISSION_NOT_FOUND,
        );
      }
    }

    await permissionsRepository.updateRolePermissions(roleId, permissionIds);

    return this.getRolePermissions(roleId);
  }

  private mapToDto(permission: PermissionRecord): PermissionResponseDto {
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      createdAt: permission.createdAt.toISOString(),
      updatedAt: permission.updatedAt.toISOString(),
    };
  }
}

export const permissionsService = new PermissionsService();

